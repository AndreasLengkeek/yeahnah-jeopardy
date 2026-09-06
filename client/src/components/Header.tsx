import type { CSSProperties } from "react";
import { accent, gameTitle, subtitleStyle, titleStyle } from "../theme";

const subtitleCornerStyle: CSSProperties = { ...subtitleStyle, position: "absolute", top: 0, right: 0 };
const muteButtonStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  padding: "8px 14px",
  borderRadius: 999,
  border: `1px solid ${accent}`,
  background: "transparent",
  color: accent,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  cursor: "pointer",
};

interface HeaderProps {
  subtitle?: string;
  isBoardSoundMuted?: boolean;
  onToggleBoardSound?: () => void;
}

export function Header({ subtitle, isBoardSoundMuted, onToggleBoardSound }: HeaderProps) {
  return (
    <div style={{ position: "relative", flex: "none", minHeight: 34 }}>
      {onToggleBoardSound && typeof isBoardSoundMuted === "boolean" && (
        <button
          aria-pressed={isBoardSoundMuted}
          onClick={onToggleBoardSound}
          style={muteButtonStyle}
          type="button"
        >
          {isBoardSoundMuted ? "Unmute Board Sound" : "Mute Board Sound"}
        </button>
      )}
      <div style={titleStyle}>{gameTitle}</div>
      {subtitle && <div style={subtitleCornerStyle}>{subtitle}</div>}
    </div>
  );
}
