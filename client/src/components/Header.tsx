import { gameTitle, subtitleStyle, titleStyle } from "../theme";

export function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flex: "none" }}>
      <div style={titleStyle}>{gameTitle}</div>
      {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
    </div>
  );
}
