import {
  MAX_CATEGORIES,
  MIN_CATEGORIES,
  isBlank,
  isContentComplete,
  parseBoardConfig,
  serializeBoardConfig,
} from "@yeahnah/shared";
import type { CategoryData, ClueField } from "@yeahnah/shared";
import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import { accent, palette } from "../theme";

const CATEGORY_COUNT_OPTIONS = Array.from(
  { length: MAX_CATEGORIES - MIN_CATEGORIES + 1 },
  (_, index) => MIN_CATEGORIES + index,
);

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

const outlineButtonStyle: CSSProperties = {
  padding: "12px 24px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.3)",
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  background: "transparent",
  color: "rgba(255,255,255,.8)",
  cursor: "pointer",
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  width: "auto",
};

// Browser-API glue only: triggers a download of the serialized Board Config. Thin and
// untested, matching the precedent of socket.ts and playerIdentity.ts's localStorage calls.
function downloadBoardConfig(content: CategoryData[]): void {
  const blob = new Blob([serializeBoardConfig(content)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "board-config.json";
  link.click();
  URL.revokeObjectURL(url);
}

export function BoardSetup({
  content,
  onEditCategoryName,
  onEditClue,
  onNewBoard,
  onImportBoardConfig,
  onOpenLobby,
}: {
  content: CategoryData[];
  onEditCategoryName: (categoryIndex: number, name: string) => void;
  onEditClue: (categoryIndex: number, tileIndex: number, field: ClueField, value: string) => void;
  onNewBoard: (categoryCount: number) => void;
  onImportBoardConfig: (content: CategoryData[]) => void;
  onOpenLobby: () => void;
}) {
  const [newCount, setNewCount] = useState(4);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const complete = isContentComplete(content);

  // Browser-API glue only: reads the chosen file's text. Thin and untested, matching
  // the precedent of socket.ts and playerIdentity.ts's localStorage calls.
  async function handleImportFile(file: File): Promise<void> {
    const raw = await file.text();
    const result = parseBoardConfig(raw);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }

    setImportError(null);
    onImportBoardConfig(result.content);
  }

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
        <button type="button" onClick={() => downloadBoardConfig(content)} style={outlineButtonStyle}>
          Export Board
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={outlineButtonStyle}>
          Import Board
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleImportFile(file);
          }}
        />
        <div style={{ flex: 1 }} />
        <button type="button" disabled={!complete} onClick={onOpenLobby} style={pillButtonStyle(complete)}>
          Open Lobby
        </button>
      </div>

      {importError && (
        <div style={flagStyle} role="alert">
          {importError}
        </div>
      )}

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
              style={isBlank(category.name) ? invalidInputStyle : inputStyle}
            />
            {isBlank(category.name) && <span style={flagStyle}>Category name required</span>}

            {category.clues.map((clue, tileIndex) => (
              <div key={tileIndex} style={clueRowStyle}>
                <input
                  aria-label={`Category ${categoryIndex + 1} clue ${tileIndex + 1} text`}
                  value={clue.text}
                  placeholder={`Clue ${tileIndex + 1} text`}
                  onChange={(event) => onEditClue(categoryIndex, tileIndex, "text", event.target.value)}
                  style={isBlank(clue.text) ? invalidInputStyle : inputStyle}
                />
                <input
                  aria-label={`Category ${categoryIndex + 1} clue ${tileIndex + 1} answer`}
                  value={clue.answer}
                  placeholder={`Clue ${tileIndex + 1} answer`}
                  onChange={(event) => onEditClue(categoryIndex, tileIndex, "answer", event.target.value)}
                  style={isBlank(clue.answer) ? invalidInputStyle : inputStyle}
                />
                {(isBlank(clue.text) || isBlank(clue.answer)) && (
                  <span style={flagStyle}>
                    {isBlank(clue.text) && isBlank(clue.answer)
                      ? "Clue text and answer required"
                      : isBlank(clue.text)
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
