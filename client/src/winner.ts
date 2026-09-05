import type { Player } from "@yeahnah/shared";

export function winningPlayers(players: Player[]): Player[] {
  if (players.length === 0) return [];

  const highest = Math.max(...players.map((player) => player.score));
  return players.filter((player) => player.score === highest);
}
