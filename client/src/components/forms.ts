import type { CSSProperties } from "react";
import { accent, errorColor } from "../theme";

// Form styling shared by the home page, Room Code entry, the Room notices and the Player
// forms (Join, Wager). The code-first screens (prototype variant B) use the centred
// column, pills and text input at the bottom; the plain form styles above them serve the
// Room notices and the Player forms.

export const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: 340,
  maxWidth: "100%",
  alignSelf: "center",
  marginTop: 40,
};

export const labelStyle: CSSProperties = {
  fontSize: 12,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "#c9d2f5",
  textAlign: "center",
};

export const inputStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  fontSize: 16,
};

// The full-width primary button under a Player form (Join, Wager).
export const submitButtonStyle: CSSProperties = { ...pillStyle("primary"), padding: "14px 16px" };

export const errorStyle: CSSProperties = { color: errorColor, fontSize: 13, textAlign: "center" };

export const mutedColor = "#c9d2f5";

// The code-first screens' centred column: everything stacked in the middle of the page.
export const centeredStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 24,
  textAlign: "center",
};

export const screenTitleStyle: CSSProperties = {
  fontFamily: "'Zilla Slab', Georgia, serif",
  fontSize: 28,
  fontWeight: 700,
};

export function pillStyle(kind: "primary" | "ghost"): CSSProperties {
  return {
    padding: "14px 24px",
    borderRadius: 999,
    border: kind === "primary" ? 0 : "1px solid rgba(255,255,255,.3)",
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    background: kind === "primary" ? accent : "transparent",
    color: kind === "primary" ? "#07103f" : "rgba(255,255,255,.85)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

export const textInputStyle: CSSProperties = { ...inputStyle, width: "100%", boxSizing: "border-box", minWidth: 0 };

export const quietLinkStyle: CSSProperties = {
  background: "none",
  border: 0,
  color: mutedColor,
  textDecoration: "underline",
  cursor: "pointer",
  fontSize: 14,
};
