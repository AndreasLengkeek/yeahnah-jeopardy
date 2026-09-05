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
    case "judge":
      return applyJudge(state, action.correct);
    case "closeClue":
      return applyCloseClue(state);
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

  const activeClue: ActiveClue = { categoryIndex, tileIndex, revealed: false, buzzedPlayerId: null, excludedPlayerIds: [] };
  return { ...state, activeClue };
}

function applyBuzz(state: GameState, playerId: string): GameState {
  if (!state.activeClue) return state;
  if (state.activeClue.buzzedPlayerId !== null) return state;
  if (!state.players.some((player) => player.id === playerId)) return state;
  if (state.activeClue.excludedPlayerIds.includes(playerId)) return state;

  return { ...state, activeClue: { ...state.activeClue, buzzedPlayerId: playerId } };
}

function applyReveal(state: GameState): GameState {
  if (!state.activeClue) return state;
  if (state.activeClue.buzzedPlayerId === null) return state;
  if (state.activeClue.revealed) return state;

  return { ...state, activeClue: { ...state.activeClue, revealed: true } };
}

function applyJudge(state: GameState, correct: boolean): GameState {
  const clue = state.activeClue;
  if (!clue) return state;
  if (clue.buzzedPlayerId === null) return state;
  if (!clue.revealed) return state;

  const buzzedPlayerId = clue.buzzedPlayerId;
  const value = state.board[clue.categoryIndex].tiles[clue.tileIndex].value;
  const players = state.players.map((player) =>
    player.id === buzzedPlayerId ? { ...player, score: player.score + (correct ? value : -value) } : player,
  );

  if (correct) {
    return { ...state, players, board: markTileUsed(state.board, clue), activeClue: null };
  }

  return {
    ...state,
    players,
    activeClue: {
      ...clue,
      buzzedPlayerId: null,
      revealed: false,
      excludedPlayerIds: [...clue.excludedPlayerIds, buzzedPlayerId],
    },
  };
}

function applyCloseClue(state: GameState): GameState {
  const clue = state.activeClue;
  if (!clue) return state;
  if (!canCloseClue(clue, state.players)) return state;

  return { ...state, board: markTileUsed(state.board, clue), activeClue: null };
}

// Nobody is currently buzzed in, and either nobody has attempted this Clue yet or every
// joined Player has been excluded from it — the two cases where the Host may close it
// with no score change (see 03-judging-scoring-and-clue-resolution.md).
export function canCloseClue(clue: ActiveClue, players: Player[]): boolean {
  if (clue.buzzedPlayerId !== null) return false;

  const noneBuzzed = clue.excludedPlayerIds.length === 0;
  const allExcluded = clue.excludedPlayerIds.length >= players.length;
  return noneBuzzed || allExcluded;
}

function markTileUsed(board: Category[], clue: ActiveClue): Category[] {
  return board.map((category, categoryIndex) =>
    categoryIndex === clue.categoryIndex
      ? { ...category, tiles: category.tiles.map((tile, tileIndex) => (tileIndex === clue.tileIndex ? { ...tile, used: true } : tile)) }
      : category,
  );
}
