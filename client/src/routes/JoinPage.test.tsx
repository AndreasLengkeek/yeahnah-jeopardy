import { act, render, screen } from "@testing-library/react";
import { applyAction, initialState, type GameState } from "@yeahnah/shared";
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

import { clearStoredPlayerId, getStoredPlayerId, storePlayerId } from "../playerIdentity";
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

// Plays a Game from the Lobby through to Game Over with the real engine, closing every
// Tile unanswered (the Daily Double neutralized so every Tile is a plain Clue).
function playToGameOver(lobby: GameState): GameState {
  let state: GameState = { ...applyAction(lobby, { type: "startGame" }), dailyDouble: null };
  state.board.forEach((category, categoryIndex) =>
    category.tiles.forEach((_tile, tileIndex) => {
      state = applyAction(state, { type: "selectTile", categoryIndex, tileIndex });
      state = applyAction(state, { type: "closeClue" });
    }),
  );
  return state;
}

function lobbyWithDanaAndMarcus(): GameState {
  let state = applyAction(initialState(), { type: "openLobby" });
  state = applyAction(state, { type: "join", identity: { kind: "text", name: "Dana" } });
  return applyAction(state, { type: "join", identity: { kind: "text", name: "Marcus" } });
}

describe("JoinPage across successive Games", () => {
  beforeEach(() => {
    fakeSocket.listeners.clear();
    fakeSocket.emit.mockReset();
    fakeSocket.emit.mockImplementation((event: string, playerId: unknown, ack?: unknown) => {
      if (event === "reconnect" && typeof ack === "function") ack({ ok: true, playerId });
    });
  });

  afterEach(() => {
    clearStoredPlayerId();
  });

  async function broadcast(state: GameState) {
    await act(async () => fakeSocket.listeners.get("state")?.forEach((listener) => listener(state)));
  }

  it("keeps a joined Player on the waiting screen across Play again and a return to Board Setup", async () => {
    const gameOver = playToGameOver(lobbyWithDanaAndMarcus());
    expect(gameOver.phase).toBe("gameOver");
    const [dana] = gameOver.players;
    storePlayerId(dana.id);
    render(<JoinPage />);
    await broadcast(gameOver);

    const playAgain = applyAction(gameOver, { type: "resetGame" });
    await broadcast(playAgain);

    expect(screen.getByText("Waiting for the Host to start the Game…")).toBeInTheDocument();
    expect(screen.getByText("Dana")).toBeInTheDocument();

    const backInSetup = applyAction(playToGameOver(playAgain), { type: "returnToSetup" });
    await broadcast(backInSetup);
    expect(screen.getByText("The Host is still setting up the Board…")).toBeInTheDocument();

    await broadcast(applyAction(backInSetup, { type: "openLobby" }));

    expect(screen.getByText("Waiting for the Host to start the Game…")).toBeInTheDocument();
    expect(screen.getByText("Dana")).toBeInTheDocument();
    expect(getStoredPlayerId()).toBe(dana.id);
  });
});
