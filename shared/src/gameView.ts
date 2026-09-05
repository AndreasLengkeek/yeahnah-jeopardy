import type { GameState, SocketRole } from "./types.js";

// ADR-0006: instead of broadcasting one identical GameState to every socket, the
// server sends each socket a view appropriate to its declared role. The Host always
// receives the Active Clue's true Answer the moment it becomes Active; a Board or
// Player socket receives it only once the Host has Revealed it.
export function viewForRole(state: GameState, role: SocketRole): GameState {
  if (role === "host") return state;
  if (!state.activeClue || state.activeClue.revealed) return state;

  return {
    ...state,
    activeClue: { ...state.activeClue, answer: "" },
  };
}
