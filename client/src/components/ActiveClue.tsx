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
};

const buzzFaceStyle: CSSProperties = {
  ...faceStyle,
  color: accent,
  fontWeight: 800,
  animation: "buzzFlash 900ms ease-in-out infinite",
};

const statusStyle: CSSProperties = {
  flex: "none",
  textAlign: "center",
  fontSize: 14,
  color: "#c9d2f5",
};

// Deliberately loud — a Daily Double is a one-off moment the Host and every Player
// need to notice immediately, filling the whole Clue Card until the Host reveals it.
const dailyDoubleCoverStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const dailyDoubleTitleStyle: CSSProperties = {
  fontFamily: "'Zilla Slab', Georgia, serif",
  fontWeight: 800,
  fontSize: "clamp(32px, 6vh, 64px)",
  letterSpacing: ".04em",
  textTransform: "uppercase",
  color: accent,
  textAlign: "center",
  animation: "buzzFlash 900ms ease-in-out infinite",
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
  const { category, value, clueText, revealed, answer, buzzedPlayer, correctPlayer, isDailyDouble, clueShown } =
    details;
  const { wageringPlayer, wager } = details;

  // A Daily Double's Clue text stays behind a full-card cover screen until the Host
  // reveals it (see gameEngine.ts's showDailyDoubleClue) — nothing to Buzz on, no
  // waiting-for-a-buzz status, just the one unmistakable signal.
  if (isDailyDouble && !clueShown) {
    return (
      <div style={cardStyle}>
        <div style={dailyDoubleCoverStyle}>
          <div style={dailyDoubleTitleStyle}>Daily Double!</div>
        </div>
        {footer}
      </div>
    );
  }

  // Once the Host reveals a Daily Double but no Wager has landed yet, Board and Player
  // see a "so-and-so is wagering…" banner instead of the normal waiting-for-Buzz state —
  // reusing the same banner mechanism the Buzz flow uses below. Takes priority over any
  // buzz status, since buzzing isn't meant to happen during this window.
  const wagering = isDailyDouble && wager === null;

  // Once someone holds the Buzz — or a Daily Double is awaiting its Wager — Board and
  // Player hide the Clue text behind a big banner instead. The Host keeps seeing the
  // Clue text throughout (alwaysShowAnswer is only ever true for the Host's own card).
  const hideClueBehindBanner = (wagering || !!buzzedPlayer) && !alwaysShowAnswer;

  const wageringBanner: ReactNode = wageringPlayer ? (
    <>
      <PlayerIdentity identity={wageringPlayer.identity} /> is wagering…
    </>
  ) : (
    "Choosing a wagerer…"
  );

  const buzzBanner: ReactNode = buzzedPlayer && (
    <>
      <PlayerIdentity identity={buzzedPlayer.identity} /> has the buzz
    </>
  );

  const banner: ReactNode = wagering ? wageringBanner : buzzBanner;

  const statusText: ReactNode = hideClueBehindBanner ? null : wagering ? (
    wageringBanner
  ) : buzzedPlayer ? (
    buzzBanner
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
          <div style={hideClueBehindBanner ? buzzFaceStyle : faceStyle}>{hideClueBehindBanner ? banner : clueText}</div>
          <div style={backFaceStyle}>{revealed && answer}</div>
        </div>
      </div>

      {alwaysShowAnswer && !revealed && <div style={hostAnswerStyle}>{answer}</div>}

      {statusText && <div style={statusStyle}>{statusText}</div>}

      {footer}
    </div>
  );
}
