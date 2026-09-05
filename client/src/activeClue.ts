import { CATS } from "@yeahnah/shared";
import type { ActiveClue, Category, Player } from "@yeahnah/shared";

export interface ActiveClueDetails {
  category: string;
  value: number;
  clueText: string;
  answer: string;
  revealed: boolean;
  buzzedPlayer: Player | null;
  correctPlayer: Player | null;
}

function resolvePlayer(playerId: string | null, players: Player[]): Player | null {
  return playerId ? (players.find((player) => player.id === playerId) ?? null) : null;
}

export function resolveActiveClue(activeClue: ActiveClue, board: Category[], players: Player[]): ActiveClueDetails {
  const category = CATS[activeClue.categoryIndex];
  const clue = category.clues[activeClue.tileIndex];
  const value = board[activeClue.categoryIndex].tiles[activeClue.tileIndex].value;

  return {
    category: category.name,
    value,
    clueText: clue.text,
    answer: clue.answer,
    revealed: activeClue.revealed,
    buzzedPlayer: resolvePlayer(activeClue.buzzedPlayerId, players),
    correctPlayer: resolvePlayer(activeClue.correctPlayerId, players),
  };
}
