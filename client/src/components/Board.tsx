import type { Category } from "@yeahnah/shared";
import type { CSSProperties } from "react";
import { accent, palette } from "../theme";

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "13px 9px",
  borderRadius: 12,
  fontWeight: 800,
  fontSize: 15,
  lineHeight: 1.15,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  background: palette.header,
  color: palette.headerFg,
};

function tileStyle(used: boolean, interactive: boolean): CSSProperties {
  return {
    border: 0,
    borderRadius: 14,
    background: used ? palette.used : `linear-gradient(${palette.tile[0]}, ${palette.tile[1]})`,
    boxShadow: used ? "none" : "inset 0 1px 0 rgba(255,255,255,.28), 0 3px 0 rgba(0,0,0,.3)",
    color: accent,
    fontFamily: "'Zilla Slab', Georgia, serif",
    fontWeight: 700,
    fontSize: "clamp(22px, 3.2vh, 42px)",
    letterSpacing: ".01em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: interactive ? "pointer" : "default",
  };
}

export function Board({
  board,
  onSelectTile,
  registerTile,
}: {
  board: Category[];
  onSelectTile?: (categoryIndex: number, tileIndex: number) => void;
  registerTile?: (categoryIndex: number, tileIndex: number, el: HTMLDivElement | null) => void;
}) {
  const rows = board[0]?.tiles.length ?? 0;

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: `repeat(${board.length}, 1fr)`,
        gridTemplateRows: `auto repeat(${rows}, 1fr)`,
        gap: 7,
        minHeight: 0,
      }}
    >
      {board.map((category) => (
        <div key={category.name} style={headerStyle}>
          {category.name}
        </div>
      ))}
      {Array.from({ length: rows }, (_, row) =>
        board.map((category, categoryIndex) => {
          const tile = category.tiles[row];
          const interactive = !!onSelectTile && !tile.used;
          return (
            <div
              key={`${category.name}-${row}`}
              ref={registerTile ? (el) => registerTile(categoryIndex, row, el) : undefined}
              style={tileStyle(tile.used, interactive)}
              onClick={interactive ? () => onSelectTile(categoryIndex, row) : undefined}
            >
              {tile.used ? "" : `$${tile.value.toLocaleString("en-US")}`}
            </div>
          );
        }),
      )}
    </div>
  );
}
