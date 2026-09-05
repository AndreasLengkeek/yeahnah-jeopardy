import type { CategoryData } from "./trivia.js";

// "setup" is the Host's Board-authoring phase, before the Lobby opens. Ordered first.
export type GamePhase = "setup" | "lobby" | "playing" | "gameOver";

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
  clueText: string;
  answer: string;
  revealed: boolean;
  buzzedPlayerId: string | null;
  excludedPlayerIds: string[];
  correctPlayerId: string | null;
}

// A socket's self-declared role, sent once via the `identify` event at connection.
// It gates which view of GameState the server sends that socket (see viewForRole /
// ADR-0006); there is no authentication behind it.
export type SocketRole = "host" | "board" | "player";

export interface GameState {
  phase: GamePhase;
  players: Player[];
  // The Host-authored Categories and Clues, editable only while `phase === "setup"`.
  // Seeded from the bundled example on first boot; `board` is derived from its
  // category names when the Lobby opens.
  content: CategoryData[];
  board: Category[];
  activeClue: ActiveClue | null;
}

export type ClueField = "text" | "answer";

export type GameAction =
  | { type: "join"; name: string }
  | { type: "reconnect"; playerId: string }
  | { type: "newBoard"; categoryCount: number }
  | { type: "editCategoryName"; categoryIndex: number; name: string }
  | { type: "editClue"; categoryIndex: number; tileIndex: number; field: ClueField; value: string }
  | { type: "openLobby" }
  | { type: "startGame" }
  | { type: "selectTile"; categoryIndex: number; tileIndex: number }
  | { type: "buzz"; playerId: string }
  | { type: "reveal" }
  | { type: "judge"; correct: boolean }
  | { type: "closeClue" }
  | { type: "returnToSetup" }
  | { type: "resetGame" };

export type JoinResult = { ok: true; playerId: string } | { ok: false; error: string };
