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

export interface GameState {
  phase: GamePhase;
  players: Player[];
  board: Category[];
}

export type GameAction =
  | { type: "join"; name: string }
  | { type: "startGame" };

export type JoinResult = { ok: true; playerId: string } | { ok: false; error: string };
