import type { Player } from "@yeahnah/shared";
import { formatScore } from "../format";
import { accent, palette } from "../theme";
import { winningPlayers } from "../winner";

export function GameOver({ players }: { players: Player[] }) {
  const winners = winningPlayers(players);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winnerNames = winners.map((player) => player.name).join(" & ");

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: ".18em", textTransform: "uppercase", color: "#dfe4ff" }}>Game Over</div>
      {winnerNames && (
        <div style={{ fontFamily: "'Zilla Slab', Georgia, serif", fontWeight: 700, fontSize: "clamp(22px, 3.6vh, 40px)", color: accent }}>
          {winners.length > 1 ? `${winnerNames} tie!` : `${winnerNames} wins!`}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 640 }}>
        {sorted.map((player) => (
          <div
            key={player.id}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 999,
              background: palette.card,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            {player.name}
            <span style={{ color: player.score < 0 ? "#ff8a7a" : accent }}>{formatScore(player.score)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
