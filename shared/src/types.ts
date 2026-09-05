export type GamePhase = "lobby" | "playing" | "gameOver";

export interface Player {
  id: string;
  name: string;
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
  | { type: "join"; name: string }
  | { type: "startGame" }
  | { type: "selectTile"; categoryIndex: number; tileIndex: number }
  | { type: "buzz"; playerId: string }
  | { type: "reveal" }
  | { type: "judge"; correct: boolean }
  | { type: "closeClue" }
  | { type: "resetGame" };

export type JoinResult = { ok: true; playerId: string } | { ok: false; error: string };
