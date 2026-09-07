import type { CategoryData } from './trivia.js';

// "setup" is the Host's Board-authoring phase, before the Lobby opens. Ordered first.
export type GamePhase = 'setup' | 'lobby' | 'playing' | 'gameOver';

// How a Player identifies themselves, chosen once at join time and never both: a typed
// name carries the trimmed string; a drawn Signature carries a small raster image as a
// data URL. Rendered everywhere a Player's identity is shown via the shared
// PlayerIdentity component.
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
}

// The Board's secretly pre-picked Daily Double Tile, chosen fresh every time the Board
// is built (openLobby / resetGame). Never present in a viewForRole output for any role,
// including "host" — it only becomes visible indirectly, via ActiveClue.isDailyDouble,
// once that Tile is selected.
export interface DailyDoubleCoordinate {
  categoryIndex: number;
  tileIndex: number;
}

// A socket's self-declared role, sent once via the `identify` event at connection.
// It gates which view of GameState the server sends that socket (see viewForRole /
// ADR-0006); there is no authentication behind it.
export type SocketRole = 'host' | 'board' | 'player';

export interface GameState {
  phase: GamePhase;
  players: Player[];
  // The Host-authored Categories and Clues, editable only while `phase === "setup"`.
  // Seeded from the bundled example on first boot; `board` is derived from its
  // category names when the Lobby opens.
  content: CategoryData[];
  board: Category[];
  activeClue: ActiveClue | null;
  boardSoundMuted: boolean;
  // The secret Daily Double pick for the current `board` — see DailyDoubleCoordinate.
  // null only while there's no Board yet (phase "setup").
  dailyDouble: DailyDoubleCoordinate | null;
}

export type ClueField = 'text' | 'answer';

export type GameAction =
  | { type: 'join'; identity: PlayerIdentity }
  | { type: 'editIdentity'; playerId: string; identity: PlayerIdentity }
  | { type: 'reconnect'; playerId: string }
  | { type: 'newBoard'; categoryCount: number }
  | { type: 'editCategoryName'; categoryIndex: number; name: string }
  | { type: 'editClue'; categoryIndex: number; tileIndex: number; field: ClueField; value: string }
  | { type: 'importBoardConfig'; content: CategoryData[] }
  | { type: 'openLobby' }
  | { type: 'toggleBoardSound' }
  | { type: 'startGame' }
  | { type: 'selectTile'; categoryIndex: number; tileIndex: number }
  | { type: 'buzz'; playerId: string }
  | { type: 'reveal' }
  | { type: 'judge'; correct: boolean }
  | { type: 'closeClue' }
  | { type: 'setScore'; playerId: string; score: number }
  | { type: 'returnToSetup' }
  | { type: 'resetGame' };

export type JoinResult = { ok: true; playerId: string } | { ok: false; error: string };
