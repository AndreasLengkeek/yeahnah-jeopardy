export type GamePhase = "lobby" | "playing" | "gameOver";

// How a Player identifies themselves, chosen once at join time and never both: a typed
// name carries the trimmed string; a drawn Signature carries a small raster image as a
// data URL. Rendered everywhere a Player's identity is shown via the shared
// PlayerIdentity component.
export type PlayerIdentity =
  | { kind: "text"; name: string }
  | { kind: "signature"; image: string };

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
  revealed: boolean;
  buzzedPlayerId: string | null;
  excludedPlayerIds: string[];
  correctPlayerId: string | null;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  board: Category[];
  activeClue: ActiveClue | null;
}

export type GameAction =
  | { type: "join"; identity: PlayerIdentity }
  | { type: "reconnect"; playerId: string }
  | { type: "startGame" }
  | { type: "selectTile"; categoryIndex: number; tileIndex: number }
  | { type: "buzz"; playerId: string }
  | { type: "reveal" }
  | { type: "judge"; correct: boolean }
  | { type: "closeClue" }
  | { type: "setScore"; playerId: string; score: number }
  | { type: "resetGame" };

export type JoinResult = { ok: true; playerId: string } | { ok: false; error: string };
