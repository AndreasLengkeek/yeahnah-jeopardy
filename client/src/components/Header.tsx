import type { CSSProperties } from "react";
import { accent, gameTitle, subtitleStyle, titleStyle } from "../theme";

const headerStyle: CSSProperties = { position: "relative", flex: "none" };
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

export function Header({ subtitle, action }: { subtitle?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={headerStyle}>
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
