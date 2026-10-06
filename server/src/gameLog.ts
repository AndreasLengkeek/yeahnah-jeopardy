import type { GameAction, GameState, Player } from "@yeahnah/shared";

// Turns one accepted Game action into a readable `[game]` line for the server log, or
// null when the action isn't one worth logging. Only ever names Players, Categories,
// Values and scores — never Clue text, an Answer, or a Signature's image. A rejected
// (no-op) action leaves the state untouched, so it logs nothing.
export function describeGameEvent(prev: GameState, action: GameAction, next: GameState): string | null {
  if (next === prev) return null;
  const line = describe(prev, action, next);
  return line === null ? null : `[game] ${line}`;
}

function describe(prev: GameState, action: GameAction, next: GameState): string | null {
  switch (action.type) {
    case "join": {
      const player = next.players[next.players.length - 1];
      const who = player.identity.kind === "text" ? `Player ${label(player)}` : label(player);
      return `${who} joined (${playerCount(next)})`;
    }
    case "startGame":
      return `Game started (${playerCount(next)})`;
    case "startDoubleJeopardy":
      return `Double Jeopardy started (${playerCount(next)})`;
    case "selectTile": {
      const category = next.board[action.categoryIndex];
      return `Clue picked: ${category.name} for ${money(category.tiles[action.tileIndex].value)}`;
    }
    case "buzz":
      return `${label(playerById(next, action.playerId))} buzzed in`;
    case "judge": {
      // The judged Player is whoever's score moved — the buzzed Player on a normal
      // Clue, the wagerer on a Daily Double.
      const judged = next.players.find((player, index) => player.score !== prev.players[index].score);
      if (!judged) return null;
      const delta = judged.score - playerById(prev, judged.id).score;
      const verdict = action.correct ? "correct" : "incorrect";
      return `${label(judged)} judged ${verdict} (${delta < 0 ? "-" : "+"}${money(Math.abs(delta))}, now ${money(judged.score)})`;
    }
    case "setScore":
      return `Host set ${label(playerById(next, action.playerId))}'s score to ${money(action.score)}`;
    case "closeClue":
      // Game over is the last Clue closing, not an action of its own.
      return prev.phase !== "gameOver" && next.phase === "gameOver" ? gameOver(next) : null;
    case "resetGame":
      return "Game reset";
    default:
      return null;
  }
}

function gameOver(state: GameState): string {
  const top = Math.max(...state.players.map((player) => player.score));
  const leaders = state.players.filter((player) => player.score === top).map(label);
  return leaders.length === 1
    ? `Game over — winner ${leaders[0]} (${money(top)})`
    : `Game over — tie between ${leaders.slice(0, -1).join(", ")} and ${leaders[leaders.length - 1]} (${money(top)})`;
}

// A typed name in quotes (escaped, so a name can't forge a log line), or a short form
// of a Signature Player's id, since a Signature has no text to show.
function label(player: Player): string {
  return player.identity.kind === "text" ? JSON.stringify(player.identity.name) : `Player ${player.id.slice(0, 6)}`;
}

function playerById(state: GameState, playerId: string): Player {
  return state.players.find((player) => player.id === playerId)!;
}

function playerCount(state: GameState): string {
  return `${state.players.length} ${state.players.length === 1 ? "player" : "players"}`;
}

function money(amount: number): string {
  return amount < 0 ? `-$${-amount}` : `$${amount}`;
}
