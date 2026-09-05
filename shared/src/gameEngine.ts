import { identitiesMatch, isBlankIdentity, normalizeIdentity } from './playerIdentity.js';
import { CATS, VALUES } from './trivia.js';
import type { CategoryData } from './trivia.js';
import type { ActiveClue, Category, ClueField, GameAction, GameState, Player, PlayerIdentity } from './types.js';

const CLUES_PER_CATEGORY = VALUES.length;

// The Host-authored Category count is fixed once chosen, anywhere in this range. Shared
// with the client so the editor's count picker and the reducer agree on one range.
export const MIN_CATEGORIES = 3;
export const MAX_CATEGORIES = 6;

// A deep copy of the bundled example, so edits during Board Setup never mutate the
// shared fixture module.
function seedContent(): CategoryData[] {
  return CATS.map((category) => ({
    name: category.name,
    clues: category.clues.map((clue) => ({ text: clue.text, answer: clue.answer })),
  }));
}

function blankContent(categoryCount: number): CategoryData[] {
  return Array.from({ length: categoryCount }, () => ({
    name: '',
    clues: Array.from({ length: CLUES_PER_CATEGORY }, () => ({ text: '', answer: '' })),
  }));
}

// The played Board: one column of five Value Tiles per authored Category, all unused.
// Derived from `content`'s category names when the Lobby opens (and rebuilt fresh on
// replay), never edited directly.
function buildBoard(content: CategoryData[]): Category[] {
  return content.map((category) => ({
    name: category.name,
    tiles: VALUES.map((value) => ({ value, used: false })),
  }));
}

// A field counts as filled only once it holds non-whitespace content. Shared by the
// Lobby gate below and the editor's per-field blank flags, so both agree on "blank".
export function isBlank(value: string): boolean {
  return value.trim() === '';
}

// Every Category has a non-blank name and every Clue non-blank text and answer — the
// gate for opening the Lobby, and the same check the editor uses to flag blank fields.
export function isContentComplete(content: CategoryData[]): boolean {
  return content.every(
    (category) =>
      !isBlank(category.name) && category.clues.every((clue) => !isBlank(clue.text) && !isBlank(clue.answer)),
  );
}

export function initialState(): GameState {
  return {
    phase: 'setup',
    players: [],
    content: seedContent(),
    board: [],
    activeClue: null,
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'join':
      return applyJoin(state, action.identity);
    case 'reconnect':
      return applyReconnect(state, action.playerId);
    case 'newBoard':
      return applyNewBoard(state, action.categoryCount);
    case 'editCategoryName':
      return applyEditCategoryName(state, action.categoryIndex, action.name);
    case 'editClue':
      return applyEditClue(state, action.categoryIndex, action.tileIndex, action.field, action.value);
    case 'importBoardConfig':
      return applyImportBoardConfig(state, action.content);
    case 'openLobby':
      return applyOpenLobby(state);
    case 'startGame':
      return applyStartGame(state);
    case 'selectTile':
      return applySelectTile(state, action.categoryIndex, action.tileIndex);
    case 'buzz':
      return applyBuzz(state, action.playerId);
    case 'reveal':
      return applyReveal(state);
    case 'judge':
      return applyJudge(state, action.correct);
    case 'closeClue':
      return applyCloseClue(state);
    case 'setScore':
      return applySetScore(state, action.playerId, action.score);
    case 'returnToSetup':
      return applyReturnToSetup(state);
    case 'resetGame':
      return applyResetGame(state);
    default:
      return state;
  }
}

function applyJoin(state: GameState, identity: PlayerIdentity): GameState {
  const normalized = normalizeIdentity(identity);
  if (isBlankIdentity(normalized)) return state;
  if (state.phase !== 'lobby') return state;
  if (state.players.some((player) => identitiesMatch(player.identity, normalized))) return state;

  const player: Player = { id: crypto.randomUUID(), identity: normalized, score: 0, connected: true };
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

// --- Board Setup: authoring `content` before the Lobby opens. All of these are
// no-ops outside `phase === "setup"`, matching the reducer's reject-by-returning-
// -unchanged-state convention.

function applyNewBoard(state: GameState, categoryCount: number): GameState {
  if (state.phase !== 'setup') return state;
  if (!Number.isInteger(categoryCount) || categoryCount < MIN_CATEGORIES || categoryCount > MAX_CATEGORIES) {
    return state;
  }

  return { ...state, content: blankContent(categoryCount) };
}

function applyEditCategoryName(state: GameState, categoryIndex: number, name: string): GameState {
  if (state.phase !== 'setup') return state;
  if (!state.content[categoryIndex]) return state;

  return {
    ...state,
    content: state.content.map((category, index) => (index === categoryIndex ? { ...category, name } : category)),
  };
}

function applyEditClue(
  state: GameState,
  categoryIndex: number,
  tileIndex: number,
  field: ClueField,
  value: string,
): GameState {
  if (state.phase !== 'setup') return state;
  if (!state.content[categoryIndex]?.clues[tileIndex]) return state;

  return {
    ...state,
    content: state.content.map((category, index) =>
      index === categoryIndex
        ? {
            ...category,
            clues: category.clues.map((clue, clueIndex) =>
              clueIndex === tileIndex ? { ...clue, [field]: value } : clue,
            ),
          }
        : category,
    ),
  };
}

// Replaces `content` wholesale with an already-parsed, already-validated payload (see
// parseBoardConfig in boardConfig.ts) — a Board Config Import. Blank fields are
// tolerated here too, surfaced via the same isContentComplete check openLobby uses,
// not a separate error state.
function applyImportBoardConfig(state: GameState, content: CategoryData[]): GameState {
  if (state.phase !== 'setup') return state;

  return { ...state, content };
}

function applyOpenLobby(state: GameState): GameState {
  if (state.phase !== 'setup') return state;
  if (!isContentComplete(state.content)) return state;

  return { ...state, phase: 'lobby', board: buildBoard(state.content) };
}

function applyStartGame(state: GameState): GameState {
  if (state.phase !== 'lobby') return state;
  if (state.players.length < 2) return state;

  return { ...state, phase: 'playing' };
}

function applySelectTile(state: GameState, categoryIndex: number, tileIndex: number): GameState {
  if (state.phase !== 'playing') return state;
  if (state.activeClue !== null) return state;

  const tile = state.board[categoryIndex]?.tiles[tileIndex];
  if (!tile || tile.used) return state;

  // The reducer always copies the true Clue text and Answer onto the Active Clue,
  // read from the authored `content` (which `board` is built from 1:1, so the guard
  // above covers these indices too). Withholding the Answer from Board/Player sockets
  // before Reveal is a transmission concern handled by viewForRole (ADR-0006), not a
  // reducer rule.
  const clue = state.content[categoryIndex].clues[tileIndex];
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

// Overwrites one Player's score with the exact value the Host typed on the Scoreboard —
// no delta math, no clamping, negatives allowed. This is purely a Player.score write:
// activeClue (buzz, exclusions, correctPlayerId, revealed) and every other slice of state
// are left untouched, so a correction can never reopen or alter an unrelated Clue, and it
// behaves identically in "playing" and "gameOver". A playerId matching nobody in the
// roster is a no-op, consistent with the reducer's handling of other invalid actions.
function applySetScore(state: GameState, playerId: string, score: number): GameState {
  if (!state.players.some((player) => player.id === playerId)) return state;

  return {
    ...state,
    players: state.players.map((player) => (player.id === playerId ? { ...player, score } : player)),
  };
}

function applyCloseClue(state: GameState): GameState {
  const clue = state.activeClue;
  if (!clue) return state;
  if (!canCloseClue(clue, state.players)) return state;

  return { ...state, activeClue: null, ...resolveBoard(state, markTileUsed(state.board, clue)) };
}

// Back to Board Setup from Game Over with the same `content` pre-loaded for editing;
// the roster and any derived Board are dropped, to be rebuilt when the Lobby reopens.
function applyReturnToSetup(state: GameState): GameState {
  if (state.phase !== 'gameOver') return state;

  return { ...state, phase: 'setup', players: [], board: [], activeClue: null };
}

// The "reuse the same Board" replay path: keep `content` as-is, rebuild `board` with
// fresh Tiles, clear the roster and any Active Clue, and drop back to the Lobby. Not a
// way out of Board Setup — `openLobby`'s completeness gate is the only sanctioned
// `setup` → `lobby` transition — so it's a no-op while still in `setup`.
function applyResetGame(state: GameState): GameState {
  if (state.phase === 'setup') return state;

  return {
    phase: 'lobby',
    players: [],
    content: state.content,
    board: buildBoard(state.content),
    activeClue: null,
  };
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
function resolveBoard(state: GameState, board: Category[]): Pick<GameState, 'board' | 'phase'> {
  return { board, phase: isBoardComplete(board) ? 'gameOver' : state.phase };
}

function markTileUsed(board: Category[], clue: ActiveClue): Category[] {
  return board.map((category, categoryIndex) =>
    categoryIndex === clue.categoryIndex
      ? {
          ...category,
          tiles: category.tiles.map((tile, tileIndex) =>
            tileIndex === clue.tileIndex ? { ...tile, used: true } : tile,
          ),
        }
      : category,
  );
}
