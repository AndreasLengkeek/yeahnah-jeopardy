import type { CSSProperties } from "react";
import { accent } from "../theme";

// Plain form styling shared by the home page, Room Code entry and the Room notices.
// Ticket 03 replaces these screens' look with the code-first Tile design.

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

export const submitButtonStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 999,
  border: 0,
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  background: accent,
  color: "#07103f",
  cursor: "pointer",
};

export const errorStyle: CSSProperties = { color: "#ff8a7a", fontSize: 13, textAlign: "center" };
