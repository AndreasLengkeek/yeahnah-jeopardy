import { isContentComplete } from "@yeahnah/shared";
import type { CategoryData, ClueField } from "@yeahnah/shared";
import type { CSSProperties } from "react";
import { useState } from "react";
import { accent, palette } from "../theme";

const CATEGORY_COUNT_OPTIONS = [3, 4, 5, 6];

const panelStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
  flex: "none",
};

const columnsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const categoryCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
  borderRadius: 14,
  background: palette.card,
};

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const invalidInputStyle: CSSProperties = { ...inputStyle, borderColor: "#ff8a7a" };

const flagStyle: CSSProperties = {
  fontSize: 12,
  color: "#ff8a7a",
  letterSpacing: ".04em",
};

const clueRowStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };

function pillButtonStyle(enabled: boolean): CSSProperties {
  return {
    padding: "12px 24px",
    borderRadius: 999,
    border: 0,
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    background: enabled ? accent : "rgba(255,255,255,.12)",
    color: enabled ? "#07103f" : "rgba(255,255,255,.5)",
    cursor: enabled ? "pointer" : "default",
  };
}

const selectStyle: CSSProperties = {
  ...inputStyle,
  width: "auto",
};

function blank(value: string): boolean {
  return value.trim() === "";
}

export function BoardSetup({
  content,
  onEditCategoryName,
  onEditClue,
  onNewBoard,
  onOpenLobby,
}: {
  content: CategoryData[];
  onEditCategoryName: (categoryIndex: number, name: string) => void;
  onEditClue: (categoryIndex: number, tileIndex: number, field: ClueField, value: string) => void;
  onNewBoard: (categoryCount: number) => void;
  onOpenLobby: () => void;
}) {
  const [newCount, setNewCount] = useState(4);
  const complete = isContentComplete(content);

  return (
    <div style={panelStyle}>
      <div style={toolbarStyle}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          New blank board
          <select
            aria-label="Category count"
            value={newCount}
            onChange={(event) => setNewCount(Number(event.target.value))}
            style={selectStyle}
          >
            {CATEGORY_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count} categories
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => onNewBoard(newCount)} style={pillButtonStyle(true)}>
          Start New Board
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" disabled={!complete} onClick={onOpenLobby} style={pillButtonStyle(complete)}>
          Open Lobby
        </button>
      </div>

      {!complete && (
        <div style={flagStyle} role="status">
          Fill in every Category name and every Clue before opening the Lobby.
        </div>
      )}

      <div style={columnsStyle}>
        {content.map((category, categoryIndex) => (
          <div key={categoryIndex} style={categoryCardStyle}>
            <input
              aria-label={`Category ${categoryIndex + 1} name`}
              value={category.name}
              placeholder="Category name"
              onChange={(event) => onEditCategoryName(categoryIndex, event.target.value)}
              style={blank(category.name) ? invalidInputStyle : inputStyle}
            />
            {blank(category.name) && <span style={flagStyle}>Category name required</span>}

            {category.clues.map((clue, tileIndex) => (
              <div key={tileIndex} style={clueRowStyle}>
                <input
                  aria-label={`Category ${categoryIndex + 1} clue ${tileIndex + 1} text`}
                  value={clue.text}
                  placeholder={`Clue ${tileIndex + 1} text`}
                  onChange={(event) => onEditClue(categoryIndex, tileIndex, "text", event.target.value)}
                  style={blank(clue.text) ? invalidInputStyle : inputStyle}
                />
                <input
                  aria-label={`Category ${categoryIndex + 1} clue ${tileIndex + 1} answer`}
                  value={clue.answer}
                  placeholder={`Clue ${tileIndex + 1} answer`}
                  onChange={(event) => onEditClue(categoryIndex, tileIndex, "answer", event.target.value)}
                  style={blank(clue.answer) ? invalidInputStyle : inputStyle}
                />
                {(blank(clue.text) || blank(clue.answer)) && (
                  <span style={flagStyle}>
                    {blank(clue.text) && blank(clue.answer)
                      ? "Clue text and answer required"
                      : blank(clue.text)
                        ? "Clue text required"
                        : "Answer required"}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
