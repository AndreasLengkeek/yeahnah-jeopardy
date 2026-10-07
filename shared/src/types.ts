import type { CategoryData } from './trivia.js';

// "setup" is the Host's Board-authoring phase, before the Lobby opens. "roundBreak"
// pauses a two-Round Game between Round 1 and Double Jeopardy. Ordered by play flow.
export type GamePhase = 'setup' | 'lobby' | 'playing' | 'roundBreak' | 'gameOver';

// How a Player identifies themselves, chosen once at join time and never both: a typed
// name carries the trimmed string; a drawn Signature carries a small raster image as a
// data URL. In the state the server broadcasts, a Signature's `image` is instead a
// Room-scoped, versioned image address the server serves over HTTP (ADR-0015), so each
// device fetches each Signature once. Either way it's an image source, rendered
// everywhere a Player's identity is shown via the shared PlayerIdentity component.
export type PlayerIdentity = { kind: 'text'; name: string } | { kind: 'signature'; image: string };

export interface Player {
  id: string;
  identity: PlayerIdentity;
  score: number;
  connected: boolean;
}

export interface Tile {
  value: number;
  used: boolean;
}

export interface Category {
  name: string;
  tiles: Tile[];
}

export interface ActiveClue {
  categoryIndex: number;
  tileIndex: number;
  clueText: string;
  answer: string;
  revealed: boolean;
  buzzedPlayerId: string | null;
  excludedPlayerIds: string[];
  correctPlayerId: string | null;
  // Set from the secretly pre-picked Daily Double coordinate (see GameState.dailyDouble)
  // the moment this Tile is selected — the only place that secret ever surfaces.
  isDailyDouble: boolean;
  // Gates the Clue text/Answer behind a "Daily Double!" cover screen until the Host
  // manually reveals it (see `showDailyDoubleClue`). Always `true` on selection for a
  // normal Clue — this only ever starts `false` for a Daily Double.
  clueShown: boolean;
  // The Player the Host has picked to Wager on a Daily Double (see `designateWagerer`).
  // Freely re-pointed at a different Player up until `wager` lands, at which point it's
  // locked. Always null on a normal Clue.
  wageringPlayerId: string | null;
  // The designated Player's final Wager amount on a Daily Double (see `submitWager`).
  // Null until a valid Wager has been submitted, then never changes again for this
  // Clue. Always null on a normal Clue.
  wager: number | null;
}

// The Board's secretly pre-picked Daily Double Tile, chosen fresh every time the Board
// is built (openLobby / resetGame). Never present in a viewForRole output for any role,
// including "host" — it only becomes visible indirectly, via ActiveClue.isDailyDouble,
// once that Tile is selected.
export interface DailyDoubleCoordinate {
  categoryIndex: number;
  tileIndex: number;
}

// A socket's role in its Room, declared via the `identify` event on every connection.
// It gates which view of GameState the server sends that socket (see viewForRole /
// ADR-0006). `board` and `player` are taken on trust; `host` is granted only when the
// claim carries that Room's Host Key (ADR-0015).
export type SocketRole = 'host' | 'board' | 'player';

// What a socket sends with `identify`: which Room it's in (by Room Code, any case), the
// role it claims there, and — for `host` — the Host Key this device remembers.
export interface IdentifyClaim {
  code: string;
  role: SocketRole;
  hostKey?: string;
}

// The server's answer to an `identify` claim. A rejected claim (only ever a `host`
// claim with a wrong or missing Host Key) leaves the socket bound to the Room on the
// Player view; `noRoom` means no live Room has that code, and the socket is bound to
// nothing.
export type IdentifyResult = 'accepted' | 'rejected' | 'noRoom';

// The server's answer to `createRoom`: the new Room's code and its Host Key, or why
// no Room was created.
export type CreateRoomResult = { ok: true; code: string; hostKey: string } | { ok: false; reason: 'wrongPasscode' };

// What the server sends a Room's Host sockets (and only those), as the `roomInfo` event,
// whenever the Room's connected devices change: how many Host devices, Board screens
// and Player devices are connected right now. Kept apart from GameState so the engine
// stays pure. A rejected Host claim counts as none of these.
export interface RoomInfo {
  hosts: number;
  boards: number;
  players: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  // The Host-authored Categories and Clues, editable only while `phase === "setup"`.
  // Seeded from the bundled example on first boot; `board` is derived from its
  // category names when the Lobby opens.
  content: CategoryData[];
  board: Category[];
  activeClue: ActiveClue | null;
  boardMusicMuted: boolean;
  boardEffectsMuted: boolean;
  // The secret Daily Double pick for the current `board` — see DailyDoubleCoordinate.
  // null only while there's no Board yet (phase "setup").
  dailyDouble: DailyDoubleCoordinate | null;
  // Double Jeopardy's two secret Daily Double picks, drawn independently of each other
  // (redrawn on collision so they never land on the same Tile) at the same moment
  // `dailyDouble` is drawn — Lobby opening / Reset Game — not deferred to
  // `startDoubleJeopardy`. Never present in a viewForRole output for any role, exactly
  // like `dailyDouble`. `null` whenever `twoRounds` is `false`, or before there's a
  // Board yet (phase "setup").
  doubleJeopardyDailyDoubles: [DailyDoubleCoordinate, DailyDoubleCoordinate] | null;
  // Whether this Game has a second, Double Jeopardy Round — chosen during Board Setup
  // via `setTwoRounds`, `false` by default.
  twoRounds: boolean;
  // Which Round is currently in progress (or most recently finished, in gameOver).
  // A single-Round Game stays at 1 for its whole lifetime.
  round: 1 | 2;
  // Double Jeopardy's authored Categories/Clues, editable during Board Setup exactly
  // like `content`. `null` whenever `twoRounds` is `false`; seeded blank the moment
  // `twoRounds` flips to `true` (see applySetTwoRounds).
  doubleJeopardyContent: CategoryData[] | null;
}

export type ClueField = 'text' | 'answer';

export type GameAction =
  | { type: 'join'; identity: PlayerIdentity }
  | { type: 'editIdentity'; playerId: string; identity: PlayerIdentity }
  | { type: 'reconnect'; playerId: string }
  | { type: 'newBoard'; categoryCount: number }
  | { type: 'editCategoryName'; categoryIndex: number; name: string }
  | { type: 'editClue'; categoryIndex: number; tileIndex: number; field: ClueField; value: string }
  | { type: 'setTwoRounds'; value: boolean }
  | { type: 'editDoubleJeopardyCategoryName'; categoryIndex: number; name: string }
  | {
      type: 'editDoubleJeopardyClue';
      categoryIndex: number;
      tileIndex: number;
      field: ClueField;
      value: string;
    }
  | { type: 'importBoardConfig'; content: CategoryData[] }
  | { type: 'openLobby' }
  | { type: 'toggleBoardMusic' }
  | { type: 'toggleBoardEffects' }
  | { type: 'startGame' }
  | { type: 'startDoubleJeopardy' }
  | { type: 'selectTile'; categoryIndex: number; tileIndex: number }
  | { type: 'showDailyDoubleClue' }
  | { type: 'designateWagerer'; playerId: string }
  | { type: 'submitWager'; playerId: string; amount: number }
  | { type: 'buzz'; playerId: string }
  | { type: 'reveal' }
  | { type: 'judge'; correct: boolean }
  | { type: 'closeClue' }
  | { type: 'setScore'; playerId: string; score: number }
  | { type: 'returnToSetup' }
  | { type: 'resetGame' };

export type JoinResult = { ok: true; playerId: string } | { ok: false; error: string };
