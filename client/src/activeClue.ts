import type { ActiveClue, Category, Player } from "@yeahnah/shared";

export interface ActiveClueDetails {
  category: string;
  value: number;
  clueText: string;
  answer: string;
  revealed: boolean;
  buzzedPlayer: Player | null;
  correctPlayer: Player | null;
  isDailyDouble: boolean;
  // Gates the Clue text behind a "Daily Double!" cover screen (see ActiveClue.tsx)
  // until the Host reveals it — always true for a normal Clue.
  clueShown: boolean;
}

function resolvePlayer(playerId: string | null, players: Player[]): Player | null {
  return playerId ? (players.find((player) => player.id === playerId) ?? null) : null;
}

export function resolveActiveClue(activeClue: ActiveClue, board: Category[], players: Player[]): ActiveClueDetails {
  const category = board[activeClue.categoryIndex];
  const value = category.tiles[activeClue.tileIndex].value;

  // Clue text and Answer come straight off the ActiveClue as delivered by the server —
  // which, for a Board or Player socket, has the Answer redacted until the Host Reveals
  // (see viewForRole / ADR-0006).
  return {
    category: category.name,
    value,
    clueText: activeClue.clueText,
    answer: activeClue.answer,
    revealed: activeClue.revealed,
    buzzedPlayer: resolvePlayer(activeClue.buzzedPlayerId, players),
    correctPlayer: resolvePlayer(activeClue.correctPlayerId, players),
    isDailyDouble: activeClue.isDailyDouble,
    clueShown: activeClue.clueShown,
  };
}
