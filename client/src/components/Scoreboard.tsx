import type { Player } from "@yeahnah/shared";
import { formatScore } from "../format";
import { accent, palette } from "../theme";
import { PlayerIdentity } from "./PlayerIdentity";

export function Scoreboard({ players }: { players: Player[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", flex: "none" }}>
      {players.map((player) => (
        <div
          key={player.id}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            background: palette.card,
          }}
        >
          <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
            <PlayerIdentity identity={player.identity} />
          </span>
          <span style={{ fontWeight: 800, color: player.score < 0 ? "#ff8a7a" : accent }}>
            {formatScore(player.score)}
          </span>
        </div>
      ))}
    </div>
  );
}
