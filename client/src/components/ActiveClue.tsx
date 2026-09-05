import type { CSSProperties, ReactNode } from "react";
import type { ActiveClueDetails } from "../activeClue";
import { accent, palette } from "../theme";
import { PlayerIdentity } from "./PlayerIdentity";

const FLIP_TRANSITION_MS = 320;
const FLIP_PERSPECTIVE_PX = 1600;

const cardStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 24,
  borderRadius: 18,
  background: palette.panel,
  minHeight: 0,
};

const headerStyle: CSSProperties = {
  flex: "none",
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  fontSize: 13,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "#dfe4ff",
};

const valueStyle: CSSProperties = {
  fontFamily: "'Zilla Slab', Georgia, serif",
  fontWeight: 700,
  fontSize: 26,
  letterSpacing: 0,
  color: accent,
};

const flipStageStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  position: "relative",
  perspective: FLIP_PERSPECTIVE_PX,
};

const faceStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  fontFamily: "'Zilla Slab', Georgia, serif",
  fontWeight: 700,
  fontSize: "clamp(28px, 5vh, 52px)",
};

const backFaceStyle: CSSProperties = {
  ...faceStyle,
  transform: "rotateY(180deg)",
  color: accent,
  fontWeight: 800,
  fontSize: "clamp(18px, 2.8vh, 30px)",
};

const statusStyle: CSSProperties = {
  flex: "none",
  textAlign: "center",
  fontSize: 14,
  color: "#c9d2f5",
};

const hostAnswerStyle: CSSProperties = {
  flex: "none",
  textAlign: "center",
  fontFamily: "'Zilla Slab', Georgia, serif",
  fontWeight: 800,
  fontSize: "clamp(16px, 2.4vh, 24px)",
  color: accent,
};

function flipCardStyle(revealed: boolean): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    transformStyle: "preserve-3d",
    WebkitTransformStyle: "preserve-3d",
    transition: `transform ${FLIP_TRANSITION_MS}ms ease`,
    transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)",
  };
}

export function ActiveClue({
  details,
  footer,
  alwaysShowAnswer,
}: {
  details: ActiveClueDetails;
  footer?: ReactNode;
  alwaysShowAnswer?: boolean;
}) {
  const { category, value, clueText, revealed, answer, buzzedPlayer, correctPlayer } = details;
  const statusText: ReactNode = buzzedPlayer ? (
    <>
      <PlayerIdentity identity={buzzedPlayer.identity} /> has the buzz
    </>
  ) : correctPlayer ? (
    <>
      <PlayerIdentity identity={correctPlayer.identity} /> got it right
    </>
  ) : (
    "Waiting for a buzz…"
  );

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <span>{category}</span>
        <span style={valueStyle}>${value.toLocaleString("en-US")}</span>
      </div>

      <div style={flipStageStyle}>
        <div style={flipCardStyle(revealed)}>
          <div style={faceStyle}>{clueText}</div>
          <div style={backFaceStyle}>{revealed && answer}</div>
        </div>
      </div>

      {alwaysShowAnswer && !revealed && <div style={hostAnswerStyle}>{answer}</div>}

      <div style={statusStyle}>{statusText}</div>

      {footer}
    </div>
  );
}
