import { CodeTiles } from "./CodeTiles";
import { centeredStyle, mutedColor, pillStyle, screenTitleStyle } from "./forms";

// Room full (prototype variant B): the Room's code on dimmed Tiles, so the Player can see
// it's the right Room and not a problem with their phone, and a nudge to ask the Host.
export function RoomFull({
  code,
  playerCount,
  onTryAgain,
}: {
  code: string;
  playerCount: number;
  onTryAgain: () => void;
}) {
  return (
    <div style={centeredStyle}>
      <CodeTiles code={code} size={68} dim />
      <h1 style={{ ...screenTitleStyle, margin: 0 }}>Room full</h1>
      <p style={{ margin: 0, maxWidth: 340, color: mutedColor }}>
        Room {code} already has {playerCount} Players. Ask the Host if someone can drop out, then try again.
      </p>
      <button type="button" onClick={onTryAgain} style={pillStyle("ghost")}>
        Try again
      </button>
    </div>
  );
}
