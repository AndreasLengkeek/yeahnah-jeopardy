// Ported verbatim from the imported Claude Design canvas ("Jeopardy Board.dc.html",
// project "Jeopardy Web App UI"). Theme palettes are the source of truth from that
// design — do not redesign them here.

export interface ThemePalette {
  shell: string;
  header: string;
  headerFg: string;
  tile: [string, string];
  tileFlat: string;
  hover: string;
  used: string;
  panel: string;
  card: string;
  accent: string;
}

export const THEMES: Record<string, ThemePalette> = {
  "Classic Navy": { shell: "#050a2a", header: "#0d1442", headerFg: "#fff", tile: ["#2a52f0", "#1735c4"], tileFlat: "#1e42e0", hover: "#3d63ff", used: "#0a0f30", panel: "#1638d8", card: "#0d1442", accent: "#f2c14e" },
  "Studio Teal": { shell: "#04211f", header: "#0a3230", headerFg: "#fff", tile: ["#0e7c72", "#08574f"], tileFlat: "#0b6b62", hover: "#149a8d", used: "#062724", panel: "#0b6b62", card: "#0a3230", accent: "#ffd166" },
  "Deep Plum": { shell: "#1d0a2b", header: "#2c1140", headerFg: "#fff", tile: ["#6f2bb0", "#4d1c7d"], tileFlat: "#5e2496", hover: "#8a3ad3", used: "#250f36", panel: "#5e2496", card: "#2c1140", accent: "#f6c9ff" },
  "Ink & Coral": { shell: "#14161c", header: "#22252e", headerFg: "#fff", tile: ["#2f3542", "#232833"], tileFlat: "#2a303c", hover: "#3d4553", used: "#1a1d24", panel: "#2a303c", card: "#22252e", accent: "#ff7a5c" },
  "Cobalt & Mint": { shell: "#071a33", header: "#0c2647", headerFg: "#fff", tile: ["#1c62c9", "#12459a"], tileFlat: "#1755b3", hover: "#2a7ae8", used: "#0a1f3b", panel: "#1755b3", card: "#0c2647", accent: "#8ff0c8" },
  "Sunset Brick": { shell: "#26100c", header: "#3a1a13", headerFg: "#fff", tile: ["#b8442a", "#8c3120"], tileFlat: "#a63b25", hover: "#d65535", used: "#2e130e", panel: "#a63b25", card: "#3a1a13", accent: "#ffd9a0" },
};

// Fixed for v1 per spec: only this theme/accent combination is wired up for display.
// The rest of THEMES is carried over as unused data (cheap to keep), not exposed as a setting.
export const GAME_TITLE = "Yeah Nah Jeopardy";
export const BOARD_THEME = "Cobalt & Mint";
export const ACCENT_COLOR = "#f2c14e";
