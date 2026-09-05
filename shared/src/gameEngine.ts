import { CATS, VALUES } from "./data.js";
import type { Category, GameAction, GameState, Player } from "./types.js";

function buildBoard(): Category[] {
  return CATS.map((category) => ({
    name: category.name,
    tiles: VALUES.map((value) => ({ value, used: false })),
  }));
}

export function initialState(): GameState {
  return {
    phase: "lobby",
    players: [],
    board: buildBoard(),
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "join":
      return applyJoin(state, action.name);
    case "startGame":
      return applyStartGame(state);
    default:
      return state;
  }
}

function applyJoin(state: GameState, name: string): GameState {
  if (state.phase !== "lobby") return state;
  if (state.players.some((player) => player.name === name)) return state;

  const player: Player = { id: crypto.randomUUID(), name, score: 0, connected: true };
  return { ...state, players: [...state.players, player] };
}

function applyStartGame(state: GameState): GameState {
  if (state.phase !== "lobby") return state;
  if (state.players.length < 2) return state;

  return { ...state, phase: "playing" };
}
