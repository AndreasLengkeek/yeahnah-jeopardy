import { ACCENT_COLOR, BOARD_THEME, GAME_TITLE, THEMES } from "@yeahnah/shared";
import type { CSSProperties } from "react";

export const palette = THEMES[BOARD_THEME];
export const accent = ACCENT_COLOR;
export const gameTitle = GAME_TITLE;
// Errors, negative scores and the danger zone.
export const errorColor = "#ff8a7a";

export const shellStyle: CSSProperties = {
  minHeight: "100vh",
  boxSizing: "border-box",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: 20,
  background: palette.shell,
  color: "#fff",
};

export const titleStyle: CSSProperties = {
  fontFamily: "'Zilla Slab', Georgia, serif",
  fontWeight: 700,
  fontSize: "clamp(22px, 3vw, 34px)",
  letterSpacing: ".16em",
  textTransform: "uppercase",
  textAlign: "center",
  color: accent,
};

export const subtitleStyle: CSSProperties = {
  fontSize: 12,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "#c9d2f5",
};
