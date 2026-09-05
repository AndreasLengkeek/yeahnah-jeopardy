import type { Player } from "@yeahnah/shared";
import { formatScore } from "../format";
import { accent, palette } from "../theme";

export function Lobby({ players }: { players: Player[] }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: ".18em", textTransform: "uppercase", color: "#dfe4ff" }}>
        Waiting in the Lobby — {players.length} joined
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 640 }}>
        {players.length === 0 && <div style={{ opacity: 0.6 }}>No players yet</div>}
        {players.map((player) => (
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
            <span style={{ color: accent }}>{formatScore(player.score)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
