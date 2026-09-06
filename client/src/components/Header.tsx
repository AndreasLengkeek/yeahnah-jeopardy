import type { CSSProperties } from "react";
import { gameTitle, subtitleStyle, titleStyle } from "../theme";

const subtitleCornerStyle: CSSProperties = { ...subtitleStyle, position: "absolute", top: 0, right: 0 };

export function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div style={{ position: "relative", flex: "none" }}>
      <div style={titleStyle}>{gameTitle}</div>
      {subtitle && <div style={subtitleCornerStyle}>{subtitle}</div>}
    </div>
  );
}
