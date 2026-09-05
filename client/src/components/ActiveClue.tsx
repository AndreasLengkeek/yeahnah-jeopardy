import type { ReactNode } from "react";
import type { ActiveClueDetails } from "../activeClue";
import { accent, palette } from "../theme";

export function ActiveClue({ details, footer }: { details: ActiveClueDetails; footer?: ReactNode }) {
  const { category, value, clueText, revealed, answer, buzzedPlayer } = details;

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
        padding: 24,
        borderRadius: 18,
        background: palette.panel,
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: ".18em", textTransform: "uppercase", color: "#dfe4ff" }}>
        {category} — ${value.toLocaleString("en-US")}
      </div>
      <div style={{ fontFamily: "'Zilla Slab', Georgia, serif", fontWeight: 700, fontSize: "clamp(22px, 3.6vh, 40px)" }}>
        {clueText}
      </div>
      {revealed && (
        <div style={{ fontSize: "clamp(18px, 2.8vh, 30px)", fontWeight: 800, color: accent }}>{answer}</div>
      )}
      <div style={{ fontSize: 14, color: "#c9d2f5" }}>
        {buzzedPlayer ? `${buzzedPlayer.name} has the buzz` : "Waiting for a buzz…"}
      </div>
      {footer}
    </div>
  );
}
