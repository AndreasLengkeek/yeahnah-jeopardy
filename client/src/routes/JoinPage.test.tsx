import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyAction, initialState, viewForRole } from "@yeahnah/shared";
import type { IdentifyResult, JoinResult } from "@yeahnah/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in socket that records listeners, so tests can play the server's part.
const fakeSocket = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    connected: true,
    listeners,
    emit: vi.fn(),
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    }),
    off: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(listener);
    }),
  };
});

vi.mock("../socket", () => ({ socket: fakeSocket }));

import { getStoredPlayerId, storePlayerId } from "../playerIdentity";
import { renderAt } from "../test/renderAt";

const emitted = (event: string) => fakeSocket.emit.mock.calls.filter(([name]) => name === event);
const reconnectEmits = () => emitted("reconnect");
const textDana = { kind: "text", name: "Dana" } as const;

beforeEach(() => {
  fakeSocket.listeners.clear();
  fakeSocket.emit.mockReset();
  localStorage.clear();
  // Acknowledge every reconnect as accepted, the way the server does for a known Player.
  fakeSocket.emit.mockImplementation((event: string, playerId: unknown, ack?: unknown) => {
    if (event === "reconnect" && typeof ack === "function") ack({ ok: true, playerId });
  });
});

describe("JoinPage in its Room", () => {
  it("identifies as a Player of the Room in its address", () => {
    renderAt("/brdk/join");

    expect(emitted("identify").map(([, claim]) => claim)).toEqual([{ code: "BRDK", role: "player" }]);
  });

  it("reattaches only the Player this device joined this Room as", () => {
    storePlayerId("QZTM", "player-in-qztm");
    renderAt("/BRDK/join");
    expect(reconnectEmits()).toEqual([]);

    storePlayerId("BRDK", "player-in-brdk");
    renderAt("/BRDK/join");
    expect(reconnectEmits().map(([, playerId]) => playerId)).toEqual(["player-in-brdk"]);
  });

  it("remembers a new join under this Room's code", async () => {
    const user = userEvent.setup();
    renderAt("/BRDK/join");
    const lobby = viewForRole(applyAction(initialState(), { type: "openLobby" }), "player");
    act(() => fakeSocket.listeners.get("state")?.forEach((listener) => listener(lobby)));

    await user.click(screen.getByRole("button", { name: /type a name instead/i }));
    await user.type(screen.getByPlaceholderText("Your name"), "Dana");
    await user.click(screen.getByRole("button", { name: "Join" }));
    const [, , ack] = emitted("join")[0];
    const withDana = { ...lobby, players: [{ id: "dana-id", identity: textDana, score: 0, connected: true }] };
    act(() => fakeSocket.listeners.get("state")?.forEach((listener) => listener(withDana)));
    act(() => (ack as (result: JoinResult) => void)({ ok: true, playerId: "dana-id" }));

    expect(getStoredPlayerId("BRDK")).toBe("dana-id");
    expect(getStoredPlayerId("QZTM")).toBeNull();
  });

  it("says so when no Room has the code", () => {
    renderAt("/BRDK/join");
    const [, , ack] = emitted("identify")[0];
    act(() => (ack as (result: IdentifyResult) => void)("noRoom"));

    expect(screen.getByText("No Room with that code")).toBeInTheDocument();
  });
});

describe("JoinPage reattaching a joined Player", () => {
  it("reattaches on load, and again each time a dropped connection comes back", async () => {
    storePlayerId("BRDK", "player-1");
    renderAt("/BRDK/join");
    expect(reconnectEmits().map(([, playerId]) => playerId)).toEqual(["player-1"]);

    await act(async () => fakeSocket.listeners.get("connect")?.forEach((listener) => listener()));

    expect(reconnectEmits().map(([, playerId]) => playerId)).toEqual(["player-1", "player-1"]);
  });

  it("doesn't reattach on a new connection when no Player has joined from this device", async () => {
    renderAt("/BRDK/join");
    await act(async () => fakeSocket.listeners.get("connect")?.forEach((listener) => listener()));

    expect(reconnectEmits()).toEqual([]);
  });
});
