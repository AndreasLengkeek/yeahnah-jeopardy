import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyAction, initialState, viewForRole } from "@yeahnah/shared";
import type { GameState, IdentifyResult, JoinResult } from "@yeahnah/shared";
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
  async function broadcast(state: GameState) {
    await act(async () => fakeSocket.listeners.get("state")?.forEach((listener) => listener(state)));
  }

  it("keeps a joined Player on the waiting screen across Play again and a return to Board Setup", async () => {
    const gameOver = playToGameOver(lobbyWithDanaAndMarcus());
    expect(gameOver.phase).toBe("gameOver");
    const [dana] = gameOver.players;
    storePlayerId("BRDK", dana.id);
    renderAt("/BRDK/join");
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
    expect(getStoredPlayerId("BRDK")).toBe(dana.id);
  });
});
