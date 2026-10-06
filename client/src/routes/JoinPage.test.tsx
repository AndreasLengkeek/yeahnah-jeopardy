import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { clearStoredPlayerId, storePlayerId } from "../playerIdentity";
import { JoinPage } from "./JoinPage";

const reconnectEmits = () => fakeSocket.emit.mock.calls.filter(([event]) => event === "reconnect");

describe("JoinPage reattaching a joined Player", () => {
  beforeEach(() => {
    fakeSocket.listeners.clear();
    fakeSocket.emit.mockReset();
    // Acknowledge every reconnect as accepted, the way the server does for a known Player.
    fakeSocket.emit.mockImplementation((event: string, playerId: unknown, ack?: unknown) => {
      if (event === "reconnect" && typeof ack === "function") ack({ ok: true, playerId });
    });
  });

  afterEach(() => {
    clearStoredPlayerId();
  });

  it("reattaches on load, and again each time a dropped connection comes back", async () => {
    storePlayerId("player-1");
    render(<JoinPage />);
    expect(reconnectEmits().map(([, playerId]) => playerId)).toEqual(["player-1"]);

    await act(async () => fakeSocket.listeners.get("connect")?.forEach((listener) => listener()));

    expect(reconnectEmits().map(([, playerId]) => playerId)).toEqual(["player-1", "player-1"]);
  });

  it("doesn't reattach on a new connection when no Player has joined from this device", async () => {
    render(<JoinPage />);
    await act(async () => fakeSocket.listeners.get("connect")?.forEach((listener) => listener()));

    expect(reconnectEmits()).toEqual([]);
  });
});
