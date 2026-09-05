import { CATS, VALUES } from "./trivia.js";
import type { ActiveClue, Category, GameAction, GameState, Player } from "./types.js";

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
    activeClue: null,
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "join":
      return applyJoin(state, action.name);
    case "startGame":
      return applyStartGame(state);
    case "selectTile":
      return applySelectTile(state, action.categoryIndex, action.tileIndex);
    case "buzz":
      return applyBuzz(state, action.playerId);
    case "reveal":
      return applyReveal(state);
    default:
      return state;
  }
}

function applyJoin(state: GameState, name: string): GameState {
  const trimmedName = name.trim();
  if (!trimmedName) return state;
  if (state.phase !== "lobby") return state;
  if (state.players.some((player) => player.name === trimmedName)) return state;

  const player: Player = { id: crypto.randomUUID(), name: trimmedName, score: 0, connected: true };
  return { ...state, players: [...state.players, player] };
}

function applyStartGame(state: GameState): GameState {
  if (state.phase !== "lobby") return state;
  if (state.players.length < 2) return state;

  return { ...state, phase: "playing" };
}

function applySelectTile(state: GameState, categoryIndex: number, tileIndex: number): GameState {
  if (state.phase !== "playing") return state;
  if (state.activeClue !== null) return state;

  const tile = state.board[categoryIndex]?.tiles[tileIndex];
  if (!tile || tile.used) return state;

  const activeClue: ActiveClue = { categoryIndex, tileIndex, revealed: false, buzzedPlayerId: null };
  return { ...state, activeClue };
}

function applyBuzz(state: GameState, playerId: string): GameState {
  if (!state.activeClue) return state;
  if (state.activeClue.buzzedPlayerId !== null) return state;
  if (!state.players.some((player) => player.id === playerId)) return state;

  return { ...state, activeClue: { ...state.activeClue, buzzedPlayerId: playerId } };
}

function applyReveal(state: GameState): GameState {
  if (!state.activeClue) return state;
  if (state.activeClue.buzzedPlayerId === null) return state;
  if (state.activeClue.revealed) return state;

  return { ...state, activeClue: { ...state.activeClue, revealed: true } };
}
