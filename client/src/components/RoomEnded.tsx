import { Link } from "react-router-dom";
import { accent, gameTitle, shellStyle, titleStyle } from "../theme";
import { CodeTiles } from "./CodeTiles";
import { centeredStyle, mutedColor } from "./forms";

// Room has ended (prototype variant B): what the Host and Board screens show once their
// Room is closed or expires, or when loaded at an ended Room's address. Player screens
// skip it and go straight to Room Code entry.
export function RoomEnded({ code }: { code: string }) {
  return (
    <div style={shellStyle}>
      <div style={titleStyle}>{gameTitle}</div>
      <div style={centeredStyle}>
        <CodeTiles code={code} size={68} dim />
        <div style={{ fontFamily: "'Zilla Slab', Georgia, serif", fontSize: 30, fontWeight: 700 }}>
          This Room has ended
        </div>
        <div style={{ color: mutedColor }}>Thanks for playing.</div>
        <Link to="/" style={{ color: accent }}>
          Back to the home page
        </Link>
      </div>
    </div>
  );
}
