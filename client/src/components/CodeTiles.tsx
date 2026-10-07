import { ROOM_CODE_LENGTH } from "@yeahnah/shared";
import type { CSSProperties } from "react";
import { accent, palette } from "../theme";

// The Page gutter (shellStyle's 24px each side) plus a little slack: the Tiles shrink to
// fit a phone's width rather than overflow it, and grow no bigger than `size`.
const TILES_ACROSS = ROOM_CODE_LENGTH + (ROOM_CODE_LENGTH - 1) * 0.12;

// A Room Code drawn as Board Tiles, one per letter: accent letters on the Board-Tile gradient, or
// greyed out on used-Tile grey when `dim` (a full or ended Room). Pads to a full code, so
// a half-typed code shows its empty slots. `size` is a Tile's width in px at most.
export function CodeTiles({
  code,
  size = 64,
  dim = false,
  label = `Room Code ${code}`,
}: {
  code: string;
  size?: number;
  dim?: boolean;
  // What a screen reader hears; null when something else (the entry's input) speaks for it.
  label?: string | null;
}) {
  const letters = code.padEnd(ROOM_CODE_LENGTH, " ").slice(0, ROOM_CODE_LENGTH).split("");
  const tile = `min(${size}px, calc((100vw - 64px) / ${TILES_ACROSS}))`;
  const rowStyle = { "--tile": tile, display: "flex", gap: "calc(var(--tile) * .12)" } as CSSProperties;
  const tileStyle: CSSProperties = {
    width: "var(--tile)",
    height: "calc(var(--tile) * 1.15)",
    borderRadius: "calc(var(--tile) * .12)",
    display: "grid",
    placeItems: "center",
    background: dim ? palette.used : `linear-gradient(180deg, ${palette.tile[0]}, ${palette.tile[1]})`,
    boxShadow: "inset 0 -4px 0 rgba(0,0,0,.25)",
    fontFamily: "'Zilla Slab', Georgia, serif",
    fontWeight: 700,
    fontSize: "calc(var(--tile) * .6)",
    color: dim ? "rgba(255,255,255,.25)" : accent,
  };

  return (
    <div style={rowStyle} {...(label === null ? { "aria-hidden": true } : { role: "img", "aria-label": label })}>
      {letters.map((letter, i) => (
        <div key={i} style={tileStyle}>
          {letter}
        </div>
      ))}
    </div>
  );
}
