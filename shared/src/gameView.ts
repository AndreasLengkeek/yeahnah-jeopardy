import type { GameState, SocketRole } from './types.js';

// ADR-0006: instead of broadcasting one identical GameState to every socket, the
// server sends each socket a view appropriate to its declared role.
//
// The Host receives the full state (players, board, activeClue, content) but never the
// secret Daily Double coordinates — that stays off the wire for every role until the
// moment its Tile is selected reveals it indirectly via ActiveClue.isDailyDouble. A
// Board or Player socket also never receives the Host-authored `content` (they only
// need Category names via `board` and the Active Clue's `clueText`), and receives the
// Active Clue's Answer only once the Host has Revealed it.
export function viewForRole(state: GameState, role: SocketRole): GameState {
  if (role === 'host') return { ...state, dailyDouble: null, doubleJeopardyDailyDoubles: null };

  const redactAnswer = state.activeClue !== null && !state.activeClue.revealed;

  return {
    ...state,
    content: [],
    doubleJeopardyContent: null,
    dailyDouble: null,
    doubleJeopardyDailyDoubles: null,
    activeClue: redactAnswer ? { ...state.activeClue!, answer: '' } : state.activeClue,
  };
}

