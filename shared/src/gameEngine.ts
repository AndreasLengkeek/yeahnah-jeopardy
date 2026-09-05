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
    case "reconnect":
      return applyReconnect(state, action.playerId);
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
    case "resetGame":
      return initialState();
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

// Reattaches a Player who joined before the Game started to their existing identity —
// same id, score, and roster position — rather than minting a new Player. An id that
// doesn't match anyone currently in the roster (never joined, or the roster was cleared
// by a reset) is rejected; the caller falls back to a normal join attempt.
function applyReconnect(state: GameState, playerId: string): GameState {
  if (!state.players.some((player) => player.id === playerId)) return state;

  return {
    ...state,
    players: state.players.map((player) => (player.id === playerId ? { ...player, connected: true } : player)),
  };
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

  // The reducer always copies the true Clue text and Answer onto the Active Clue
  // (today from the bundled CATS fixture, which `board` mirrors 1:1, so the guard
  // above covers these indices too). Withholding the Answer from Board/Player sockets
  // before Reveal is a transmission concern handled by viewForRole (ADR-0006), not a
  // reducer rule.
  const clue = CATS[categoryIndex].clues[tileIndex];
  const activeClue: ActiveClue = {
    categoryIndex,
    tileIndex,
    clueText: clue.text,
    answer: clue.answer,
    revealed: false,
    buzzedPlayerId: null,
    excludedPlayerIds: [],
    correctPlayerId: null,
  };
  return { ...state, activeClue };
}

function applyBuzz(state: GameState, playerId: string): GameState {
  if (!state.activeClue) return state;
  if (state.activeClue.buzzedPlayerId !== null) return state;
  if (!state.players.some((player) => player.id === playerId)) return state;
  if (state.activeClue.excludedPlayerIds.includes(playerId)) return state;
  if (state.activeClue.revealed) return state;
  if (state.activeClue.correctPlayerId !== null) return state;

  return { ...state, activeClue: { ...state.activeClue, buzzedPlayerId: playerId } };
}

function applyReveal(state: GameState): GameState {
  if (!state.activeClue) return state;
  if (state.activeClue.buzzedPlayerId !== null) return state;
  if (state.activeClue.revealed) return state;

  return { ...state, activeClue: { ...state.activeClue, revealed: true } };
}

function applyJudge(state: GameState, correct: boolean): GameState {
  const clue = state.activeClue;
  if (!clue) return state;
  if (clue.buzzedPlayerId === null) return state;

  const buzzedPlayerId = clue.buzzedPlayerId;
  const value = state.board[clue.categoryIndex].tiles[clue.tileIndex].value;
  const players = state.players.map((player) =>
    player.id === buzzedPlayerId ? { ...player, score: player.score + (correct ? value : -value) } : player,
  );

  if (correct) {
    return {
      ...state,
      players,
      activeClue: { ...clue, buzzedPlayerId: null, correctPlayerId: buzzedPlayerId },
    };
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

  return { ...state, activeClue: null, ...resolveBoard(state, markTileUsed(state.board, clue)) };
}

// Nobody is currently buzzed in, and one of: nobody has attempted this Clue yet, every
// joined Player has been excluded from it, it's already been publicly revealed, or someone
// has already answered it correctly — the cases where the Host may close it (see
// 03-judging-scoring-and-clue-resolution.md, and ADR-0005 for the revealed case). A correct
// answer never changes score on Close — that already happened at judge time.
export function canCloseClue(clue: ActiveClue, players: Player[]): boolean {
  if (clue.buzzedPlayerId !== null) return false;
  if (clue.revealed) return true;
  if (clue.correctPlayerId !== null) return true;

  const noneBuzzed = clue.excludedPlayerIds.length === 0;
  const allExcluded = clue.excludedPlayerIds.length >= players.length;
  return noneBuzzed || allExcluded;
}

function isBoardComplete(board: Category[]): boolean {
  return board.every((category) => category.tiles.every((tile) => tile.used));
}

// A Tile resolving (judged correct, or closed) always marks it used and checks whether that
// was the Board's last remaining Tile — the two call sites share this transition.
function resolveBoard(state: GameState, board: Category[]): Pick<GameState, "board" | "phase"> {
  return { board, phase: isBoardComplete(board) ? "gameOver" : state.phase };
}

function markTileUsed(board: Category[], clue: ActiveClue): Category[] {
  return board.map((category, categoryIndex) =>
    categoryIndex === clue.categoryIndex
      ? { ...category, tiles: category.tiles.map((tile, tileIndex) => (tileIndex === clue.tileIndex ? { ...tile, used: true } : tile)) }
      : category,
  );
}
