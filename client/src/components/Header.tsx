import type { CSSProperties } from "react";
import { accent, gameTitle, subtitleStyle, titleStyle } from "../theme";

const headerStyle: CSSProperties = { position: "relative", flex: "none", minHeight: 34 };
const cornerActionsStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 8,
};
const subtitleCornerStyle: CSSProperties = { ...subtitleStyle };
const actionButtonStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: 999,
  border: `1px solid ${accent}`,
  background: "transparent",
  color: accent,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  cursor: "pointer",
};
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
  action?: { label: string; onClick: () => void };
  isBoardSoundMuted?: boolean;
  onToggleBoardSound?: () => void;
}

export function Header({ subtitle, action, isBoardSoundMuted, onToggleBoardSound }: HeaderProps) {
  return (
    <div style={headerStyle}>
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
      {(action || subtitle) && (
        <div style={cornerActionsStyle}>
          {action && (
            <button type="button" onClick={action.onClick} style={actionButtonStyle}>
              {action.label}
            </button>
          )}
          {subtitle && <div style={subtitleCornerStyle}>{subtitle}</div>}
        </div>
      )}
    </div>
  );
}
