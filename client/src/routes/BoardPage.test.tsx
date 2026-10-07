import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyAction, initialState, viewForRole } from "@yeahnah/shared";
import type { GameAction, GameState, IdentifyResult } from "@yeahnah/shared";
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

import { renderAt } from "../test/renderAt";

function setAutoplayPolicy(policy: string | undefined) {
  if (policy === undefined) {
    delete (navigator as { getAutoplayPolicy?: unknown }).getAutoplayPolicy;
  } else {
    Object.defineProperty(navigator, "getAutoplayPolicy", { value: () => policy, configurable: true });
  }
}

function gameIn(phase: "lobby" | "playing" | "roundBreak" | "gameOver"): GameState {
  const actions: GameAction[] = [{ type: "openLobby" }];
  if (phase !== "lobby") {
    actions.push(
      { type: "join", identity: { kind: "text", name: "Ann" } },
      { type: "join", identity: { kind: "text", name: "Bo" } },
      { type: "startGame" },
    );
  }
  let state = actions.reduce(applyAction, initialState());
  if (phase === "roundBreak" || phase === "gameOver") state = { ...state, phase };
  return viewForRole(state, "board");
}

async function loadBoard(state: GameState, path = "/BRDK/board") {
  renderAt(path);
  await act(async () => fakeSocket.listeners.get("state")?.forEach((listener) => listener(state)));
}

describe("BoardPage in its Room", () => {
  beforeEach(() => {
    fakeSocket.listeners.clear();
    fakeSocket.emit.mockReset();
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("identifies as the Board of the Room in its address, with no credential", async () => {
    await loadBoard(gameIn("lobby"), "/brdk/board");

    const claims = fakeSocket.emit.mock.calls.filter(([event]) => event === "identify").map(([, claim]) => claim);
    expect(claims).toEqual([{ code: "BRDK", role: "board" }]);
  });

  it("shows a Join QR code for its own Room's join page in the Lobby", async () => {
    await loadBoard(gameIn("lobby"));

    expect(screen.getByRole("img", { name: `Scan to join: ${window.location.origin}/BRDK/join` })).toBeInTheDocument();
  });

  it("says so when no Room has the code", async () => {
    renderAt("/BRDK/board");
    const [, , ack] = fakeSocket.emit.mock.calls.find(([event]) => event === "identify")!;
    await act(async () => (ack as (result: IdentifyResult) => void)("noRoom"));

    expect(screen.getByText("No Room with that code")).toBeInTheDocument();
  });
});

const hint = () => screen.queryByText("Tap to enable sound");

describe("BoardPage Board Sound unlock", () => {
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fakeSocket.listeners.clear();
    playSpy = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setAutoplayPolicy(undefined);
  });

  it("enables sound on load with no hint when the browser allows autoplay", async () => {
    setAutoplayPolicy("allowed");
    await loadBoard(gameIn("playing"));

    expect(hint()).not.toBeInTheDocument();
    expect(
      playSpy.mock.instances.some((audio) => (audio as HTMLAudioElement).src.endsWith("/audio/thinking.mp3")),
    ).toBe(true);
  });

  it.each(["lobby", "playing", "roundBreak", "gameOver"] as const)(
    "shows the tap hint in the %s phase when autoplay is blocked",
    async (phase) => {
      setAutoplayPolicy("disallowed");
      await loadBoard(gameIn(phase));

      expect(hint()).toBeInTheDocument();
    },
  );

  it("shows the tap hint when the play() probe is blocked", async () => {
    playSpy.mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    await loadBoard(gameIn("playing"));

    expect(hint()).toBeInTheDocument();
  });

  it("enables sound and hides the hint after a tap anywhere mid-Game", async () => {
    setAutoplayPolicy("disallowed");
    const user = userEvent.setup();
    await loadBoard(gameIn("playing"));

    await user.click(screen.getByText("Ann"));

    expect(hint()).not.toBeInTheDocument();
    expect(
      playSpy.mock.instances.some((audio) => (audio as HTMLAudioElement).src.endsWith("/audio/thinking.mp3")),
    ).toBe(true);
  });

  it("no longer offers the Lobby-only Enable Sound button", async () => {
    setAutoplayPolicy("disallowed");
    await loadBoard(gameIn("lobby"));

    expect(screen.queryByRole("button", { name: "Enable Sound" })).not.toBeInTheDocument();
  });
});
