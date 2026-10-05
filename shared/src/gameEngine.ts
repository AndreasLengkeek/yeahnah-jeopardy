import { identitiesMatch, isBlankIdentity, normalizeIdentity } from './playerIdentity.js';
import { CATS, DOUBLE_JEOPARDY_VALUES, VALUES } from './trivia.js';
import type { CategoryData } from './trivia.js';
import type {
  ActiveClue,
  Category,
  ClueField,
  DailyDoubleCoordinate,
  GameAction,
  GameState,
  Player,
  PlayerIdentity,
} from './types.js';

const CLUES_PER_CATEGORY = VALUES.length;

// The Host-authored Category count is fixed once chosen, anywhere in this range. Shared
// with the client so the editor's count picker and the reducer agree on one range.
export const MIN_CATEGORIES = 3;
export const MAX_CATEGORIES = 6;

// A Daily Double Wager's floor and, alongside the wagering Player's own score, its
// ceiling — see `wagerRange`. Each Round's ceiling mirrors that Round's own static top
// Tile Value rather than tracking VALUES directly, since a Wager ceiling is a game rule
// of its own, not derived from however many Values the Board happens to be seeded with
// (see ADR-0010) — and never the other Round's ceiling, even once Double Jeopardy
// exists.
export const MIN_WAGER = 5;
export const DAILY_DOUBLE_WAGER_CEILING = 500;
export const DOUBLE_JEOPARDY_DAILY_DOUBLE_WAGER_CEILING = 1000;

export function valuesForRound(round: 1 | 2): number[] {
  return round === 1 ? VALUES : DOUBLE_JEOPARDY_VALUES;
}

// The current Round's Daily Double Wager ceiling: $500 during Round 1, $1000 during
// Double Jeopardy — see `wagerRange`.
export function dailyDoubleWagerCeiling(round: 1 | 2): number {
  return round === 1 ? DAILY_DOUBLE_WAGER_CEILING : DOUBLE_JEOPARDY_DAILY_DOUBLE_WAGER_CEILING;
}

// The inclusive bounds a Daily Double Wager must fall within: $5 at the low end, and
// the greater of the wagering Player's current score or the current Round's ceiling at
// the high end (so a Player below the ceiling, including at $0 or negative, can still
// Wager up to it). Shared by the reducer's validation and the client's Wager-entry
// control, so both agree on the same range.
export function wagerRange(player: Player, round: 1 | 2): { min: number; max: number } {
  return { min: MIN_WAGER, max: Math.max(player.score, dailyDoubleWagerCeiling(round)) };
}

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
function buildBoard(content: CategoryData[], round: 1 | 2): Category[] {
  return content.map((category) => ({
    name: category.name,
    tiles: valuesForRound(round).map((value) => ({ value, used: false })),
  }));
}

function contentForRound(state: GameState): CategoryData[] {
  return state.round === 1 ? state.content : state.doubleJeopardyContent ?? [];
}

// Draws a fresh random Daily Double coordinate for a just-built Board — every Tile on
// it is equally likely, and every call (openLobby, resetGame) draws independently, so a
// rebuild never reuses the previous pick on purpose (it's simply not consulted).
function pickDailyDouble(board: Category[]): DailyDoubleCoordinate {
  const categoryIndex = Math.floor(Math.random() * board.length);
  const tileIndex = Math.floor(Math.random() * board[categoryIndex].tiles.length);
  return { categoryIndex, tileIndex };
}

function sameCoordinate(a: DailyDoubleCoordinate, b: DailyDoubleCoordinate): boolean {
  return a.categoryIndex === b.categoryIndex && a.tileIndex === b.tileIndex;
}

// Draws Double Jeopardy's two independent secret Daily Double coordinates, redrawing
// the second on collision so they never land on the same Tile. Shaped by
// Round 1's just-built `board` — Double Jeopardy's own Board (categories/tile count)
// always matches it, and isn't built until `startDoubleJeopardy`, so this draws
// against that shape ahead of time rather than deferring the draw.
function pickDoubleJeopardyDailyDoubles(board: Category[]): [DailyDoubleCoordinate, DailyDoubleCoordinate] {
  const first = pickDailyDouble(board);
  let second = pickDailyDouble(board);
  while (sameCoordinate(first, second)) {
    second = pickDailyDouble(board);
  }
  return [first, second];
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
    boardMusicMuted: false,
    boardEffectsMuted: false,
    dailyDouble: null,
    doubleJeopardyDailyDoubles: null,
    twoRounds: false,
    round: 1,
    doubleJeopardyContent: null,
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'join':
      return applyJoin(state, action.identity);
    case 'editIdentity':
      return applyEditIdentity(state, action.playerId, action.identity);
    case 'reconnect':
      return applyReconnect(state, action.playerId);
    case 'newBoard':
      return applyNewBoard(state, action.categoryCount);
    case 'editCategoryName':
      return applyEditCategoryName(state, action.categoryIndex, action.name);
    case 'editClue':
      return applyEditClue(state, action.categoryIndex, action.tileIndex, action.field, action.value);
    case 'setTwoRounds':
      return applySetTwoRounds(state, action.value);
    case 'editDoubleJeopardyCategoryName':
      return applyEditDoubleJeopardyCategoryName(state, action.categoryIndex, action.name);
    case 'editDoubleJeopardyClue':
      return applyEditDoubleJeopardyClue(state, action.categoryIndex, action.tileIndex, action.field, action.value);
    case 'importBoardConfig':
      return applyImportBoardConfig(state, action.content);
    case 'openLobby':
      return applyOpenLobby(state);
    case 'toggleBoardMusic':
      return applyToggleBoardMusic(state);
    case 'toggleBoardEffects':
      return applyToggleBoardEffects(state);
    case 'startGame':
      return applyStartGame(state);
    case 'startDoubleJeopardy':
      return applyStartDoubleJeopardy(state);
    case 'selectTile':
      return applySelectTile(state, action.categoryIndex, action.tileIndex);
    case 'showDailyDoubleClue':
      return applyShowDailyDoubleClue(state);
    case 'designateWagerer':
      return applyDesignateWagerer(state, action.playerId);
    case 'submitWager':
      return applySubmitWager(state, action.playerId, action.amount);
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

function applyToggleBoardMusic(state: GameState): GameState {
  return { ...state, boardMusicMuted: !state.boardMusicMuted };
}

function applyToggleBoardEffects(state: GameState): GameState {
  return { ...state, boardEffectsMuted: !state.boardEffectsMuted };
}

function applyJoin(state: GameState, identity: PlayerIdentity): GameState {
  const normalized = normalizeIdentity(identity);
  if (isBlankIdentity(normalized)) return state;
  if (state.phase !== 'lobby') return state;
  if (state.players.some((player) => identitiesMatch(player.identity, normalized))) return state;

  const player: Player = { id: crypto.randomUUID(), identity: normalized, score: 0, connected: true };
  return { ...state, players: [...state.players, player] };
}

// Lets a Player who already joined revise their name or Signature (or switch between
// the two) any time before the Host starts the Game — same blank and duplicate-name
// rules as a fresh join, checked against every other Player, not themself.
function applyEditIdentity(state: GameState, playerId: string, identity: PlayerIdentity): GameState {
  const normalized = normalizeIdentity(identity);
  if (isBlankIdentity(normalized)) return state;
  if (state.phase !== 'lobby') return state;
  if (!state.players.some((player) => player.id === playerId)) return state;
  if (state.players.some((player) => player.id !== playerId && identitiesMatch(player.identity, normalized))) {
    return state;
  }

  return {
    ...state,
    players: state.players.map((player) => (player.id === playerId ? { ...player, identity: normalized } : player)),
  };
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

  return {
    ...state,
    content: blankContent(categoryCount),
    // Double Jeopardy's Category count always matches Round 1's — reseed it blank at
    // the new count so the two panels never drift apart.
    doubleJeopardyContent: state.twoRounds ? blankContent(categoryCount) : state.doubleJeopardyContent,
  };
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

// Turns Double Jeopardy authoring on or off. Turning on seeds `doubleJeopardyContent`
// blank at Round 1's current Category count (mirroring applyNewBoard's blanking
// behavior); turning off drops it back to null with no attempt to preserve partially-
// authored content across the toggle.
function applySetTwoRounds(state: GameState, value: boolean): GameState {
  if (state.phase !== 'setup') return state;

  return {
    ...state,
    twoRounds: value,
    doubleJeopardyContent: value ? blankContent(state.content.length) : null,
  };
}

// Mirrors applyEditCategoryName, but targets doubleJeopardyContent — a no-op whenever
// that's null (i.e., twoRounds is false).
function applyEditDoubleJeopardyCategoryName(state: GameState, categoryIndex: number, name: string): GameState {
  if (state.phase !== 'setup') return state;
  if (!state.doubleJeopardyContent?.[categoryIndex]) return state;

  return {
    ...state,
    doubleJeopardyContent: state.doubleJeopardyContent.map((category, index) =>
      index === categoryIndex ? { ...category, name } : category,
    ),
  };
}

// Mirrors applyEditClue, but targets doubleJeopardyContent — a no-op whenever that's
// null (i.e., twoRounds is false).
function applyEditDoubleJeopardyClue(
  state: GameState,
  categoryIndex: number,
  tileIndex: number,
  field: ClueField,
  value: string,
): GameState {
  if (state.phase !== 'setup') return state;
  if (!state.doubleJeopardyContent?.[categoryIndex]?.clues[tileIndex]) return state;

  return {
    ...state,
    doubleJeopardyContent: state.doubleJeopardyContent.map((category, index) =>
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

  return {
    ...state,
    content,
    // Double Jeopardy's Category count always matches Round 1's — reseed it blank at
    // the imported count so the two panels never drift apart.
    doubleJeopardyContent: state.twoRounds ? blankContent(content.length) : state.doubleJeopardyContent,
  };
}

function applyOpenLobby(state: GameState): GameState {
  if (state.phase !== 'setup') return state;
  if (!isContentComplete(state.content)) return state;
  if (state.twoRounds && !isContentComplete(state.doubleJeopardyContent!)) return state;

  const board = buildBoard(state.content, 1);
  return {
    ...state,
    phase: 'lobby',
    board,
    dailyDouble: pickDailyDouble(board),
    doubleJeopardyDailyDoubles: state.twoRounds ? pickDoubleJeopardyDailyDoubles(board) : null,
    round: 1,
  };
}

function applyStartGame(state: GameState): GameState {
  if (state.phase !== 'lobby') return state;
  if (state.players.length < 2) return state;

  return { ...state, phase: 'playing' };
}

function applyStartDoubleJeopardy(state: GameState): GameState {
  if (state.phase !== 'roundBreak') return state;
  if (!state.doubleJeopardyContent) return state;

  return {
    ...state,
    phase: 'playing',
    round: 2,
    board: buildBoard(state.doubleJeopardyContent, 2),
    activeClue: null,
    dailyDouble: null,
  };
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
  const content = contentForRound(state);
  const clue = content[categoryIndex].clues[tileIndex];
  const coordinate = { categoryIndex, tileIndex };
  const isDailyDouble =
    state.round === 1
      ? state.dailyDouble !== null && sameCoordinate(state.dailyDouble, coordinate)
      : state.doubleJeopardyDailyDoubles !== null &&
        state.doubleJeopardyDailyDoubles.some((dd) => sameCoordinate(dd, coordinate));
  const activeClue: ActiveClue = {
    categoryIndex,
    tileIndex,
    clueText: clue.text,
    answer: clue.answer,
    revealed: false,
    buzzedPlayerId: null,
    excludedPlayerIds: [],
    correctPlayerId: null,
    isDailyDouble,
    // A normal Clue's text is visible the instant it's selected, same as always. A
    // Daily Double's stays behind the cover screen until the Host explicitly reveals
    // it via `showDailyDoubleClue`.
    clueShown: !isDailyDouble,
    wageringPlayerId: null,
    wager: null,
  };
  return { ...state, activeClue };
}

// Flips a Daily Double Clue's cover screen open, revealing its Clue text to every role
// (see ActiveClue.clueShown). A no-op once already shown, on a normal Clue, or with no
// Active Clue at all — matching the reducer's reject-by-no-op convention throughout.
function applyShowDailyDoubleClue(state: GameState): GameState {
  if (!state.activeClue) return state;
  if (!state.activeClue.isDailyDouble) return state;
  if (state.activeClue.clueShown) return state;

  return { ...state, activeClue: { ...state.activeClue, clueShown: true } };
}

// Points a Daily Double's Wager at any Player in the roster, connected or not — the
// Host may freely re-pick right up until a Wager actually lands (a mis-click fix, not
// a locked-in competitive act). A no-op with no Active Clue, on a normal Clue, once a
// Wager already exists, or for a playerId matching nobody in the roster.
function applyDesignateWagerer(state: GameState, playerId: string): GameState {
  if (!state.activeClue) return state;
  if (!state.activeClue.isDailyDouble) return state;
  if (state.activeClue.wager !== null) return state;
  if (!state.players.some((player) => player.id === playerId)) return state;

  return { ...state, activeClue: { ...state.activeClue, wageringPlayerId: playerId } };
}

// Locks in the designated Player's final Wager on a Daily Double, once — validated
// against `wagerRange` (see above). A no-op with no Active Clue, when playerId doesn't
// match the currently designated Player (including no designation at all), once a
// Wager already exists, or when amount falls outside the Player's computed range.
// Never clamps or rewrites an out-of-range amount; it's simply rejected.
function applySubmitWager(state: GameState, playerId: string, amount: number): GameState {
  const clue = state.activeClue;
  if (!clue) return state;
  if (clue.wageringPlayerId !== playerId) return state;
  if (clue.wager !== null) return state;

  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return state;

  const { min, max } = wagerRange(player, state.round);
  if (!Number.isFinite(amount) || amount < min || amount > max) return state;

  return { ...state, activeClue: { ...clue, wager: amount } };
}

function applyBuzz(state: GameState, playerId: string): GameState {
  if (!state.activeClue) return state;
  if (state.activeClue.buzzedPlayerId !== null) return state;
  if (!state.players.some((player) => player.id === playerId)) return state;
  if (state.activeClue.excludedPlayerIds.includes(playerId)) return state;
  if (state.activeClue.revealed) return state;
  if (state.activeClue.correctPlayerId !== null) return state;
  // Buzzing is a no-op for the entire lifetime of a Daily Double Clue — from
  // selection through Close — since there's never a Buzz race for one; only the
  // designated wagerer (via designateWagerer/submitWager) can act on it.
  if (state.activeClue.isDailyDouble) return state;

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

  if (clue.isDailyDouble) {
    // Judging is blocked until a Wager has actually been submitted — the same "who
    // currently must be judged" gate a normal Clue applies via buzzedPlayerId.
    if (clue.wager === null || clue.wageringPlayerId === null) return state;

    const wageringPlayerId = clue.wageringPlayerId;
    const wager = clue.wager;
    const players = state.players.map((player) =>
      player.id === wageringPlayerId ? { ...player, score: player.score + (correct ? wager : -wager) } : player,
    );

    // A Daily Double auto-reveals on either outcome — correct or incorrect — since
    // nobody else ever gets a turn at it, diverging from a normal wrong Buzz (see
    // ADR-0011). That also makes it immediately closable via the existing
    // clue.revealed branch in canCloseClue, with no excludedPlayerIds re-attempt loop.
    return {
      ...state,
      players,
      activeClue: { ...clue, revealed: true, correctPlayerId: correct ? wageringPlayerId : clue.correctPlayerId },
    };
  }

  if (clue.buzzedPlayerId === null) return state;

  const buzzedPlayerId = clue.buzzedPlayerId;
  const value = state.board[clue.categoryIndex].tiles[clue.tileIndex].value;
  const players = state.players.map((player) =>
    player.id === buzzedPlayerId ? { ...player, score: player.score + (correct ? value : -value) } : player,
  );

  if (correct) {
    // A correct answer ends the attempt loop the same way an explicit Reveal does, so
    // it also flips the Clue Card public-facing — the Host shouldn't need a separate
    // Reveal click once someone's already won the Clue.
    return {
      ...state,
      players,
      activeClue: { ...clue, buzzedPlayerId: null, revealed: true, correctPlayerId: buzzedPlayerId },
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

// Back to Board Setup with the same `content` pre-loaded for editing. From the Lobby,
// the roster stays put (the Host is only resuming Board Setup); from Game Over, the
// roster is dropped as part of a true replay. In both cases any derived Board and the
// Active Clue are cleared, to be rebuilt when the Lobby reopens.
function applyReturnToSetup(state: GameState): GameState {
  if (state.phase !== 'lobby' && state.phase !== 'gameOver') return state;

  return {
    ...state,
    phase: 'setup',
    players: state.phase === 'lobby' ? state.players : [],
    board: [],
    activeClue: null,
    dailyDouble: null,
    doubleJeopardyDailyDoubles: null,
    round: 1,
  };
}

// The "reuse the same Board" replay path: keep `content` as-is, rebuild `board` with
// fresh Tiles, clear the roster and any Active Clue, and drop back to the Lobby. Not a
// way out of Board Setup — `openLobby`'s completeness gate is the only sanctioned
// `setup` → `lobby` transition — so it's a no-op while still in `setup`.
function applyResetGame(state: GameState): GameState {
  if (state.phase === 'setup') return state;

  const board = buildBoard(state.content, 1);
  return {
    phase: 'lobby',
    players: [],
    content: state.content,
    board,
    activeClue: null,
    boardMusicMuted: state.boardMusicMuted,
    boardEffectsMuted: state.boardEffectsMuted,
    dailyDouble: pickDailyDouble(board),
    doubleJeopardyDailyDoubles: state.twoRounds ? pickDoubleJeopardyDailyDoubles(board) : null,
    twoRounds: state.twoRounds,
    round: 1,
    doubleJeopardyContent: state.doubleJeopardyContent,
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
  if (!isBoardComplete(board)) return { board, phase: state.phase };

  return {
    board,
    phase: state.twoRounds && state.round === 1 ? 'roundBreak' : 'gameOver',
  };
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
