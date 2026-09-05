import type { GameState, SocketRole } from "./types.js";

// ADR-0006: instead of broadcasting one identical GameState to every socket, the
// server sends each socket a view appropriate to its declared role.
//
// The Host receives the full state. A Board or Player socket never receives the
// Host-authored `content` (they only need Category names via `board` and the Active
// Clue's `clueText`), and receives the Active Clue's Answer only once the Host has
// Revealed it.
export function viewForRole(state: GameState, role: SocketRole): GameState {
  if (role === "host") return state;

  const redactAnswer = state.activeClue !== null && !state.activeClue.revealed;

  return {
    ...state,
    content: [],
    activeClue: redactAnswer ? { ...state.activeClue!, answer: "" } : state.activeClue,
  };
}
