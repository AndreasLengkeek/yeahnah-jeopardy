import {
  DOUBLE_JEOPARDY_VALUES,
  MAX_CATEGORIES,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CLUE_FIELD_LENGTH,
  MIN_CATEGORIES,
  VALUES,
  isBlank,
  isContentComplete,
  parseBoardConfig,
  serializeBoardConfig,
} from "@yeahnah/shared";
import type { CategoryData, ClueField } from "@yeahnah/shared";
import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import { accent, errorColor, palette } from "../theme";

const CATEGORY_COUNT_OPTIONS = Array.from(
  { length: MAX_CATEGORIES - MIN_CATEGORIES + 1 },
  (_, index) => MIN_CATEGORIES + index,
);

const panelStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  overflowY: "auto",
};

const headerCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  flex: "none",
  padding: 16,
  borderRadius: 18,
  background: palette.card,
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 12,
};

const titleStyle: CSSProperties = {
  fontFamily: "'Zilla Slab', Georgia, serif",
  fontWeight: 700,
  fontSize: 22,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: accent,
};

const headerActionsStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
};

const columnsStyle: CSSProperties = {
  display: "grid",
  gap: 14,
  minHeight: 0,
  alignItems: "start",
};

const categoryCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  borderRadius: 14,
  background: palette.card,
  minWidth: 0,
};

const inputBaseStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 8,
  background: "rgba(0,0,0,.2)",
  color: "#fff",
  fontFamily: "Archivo, Helvetica, sans-serif",
  padding: "6px 8px",
};

const categoryInputStyle: CSSProperties = {
  ...inputBaseStyle,
  fontWeight: 800,
  fontSize: 14,
  textTransform: "uppercase",
  letterSpacing: ".03em",
  textAlign: "center",
};

const clueTextareaStyle: CSSProperties = {
  ...inputBaseStyle,
  fontSize: 12.5,
  lineHeight: 1.35,
  minHeight: 72,
  resize: "vertical",
};

const answerTextareaStyle: CSSProperties = {
  ...inputBaseStyle,
  fontSize: 12.5,
  lineHeight: 1.35,
  minHeight: 44,
  resize: "vertical",
  color: accent,
};

const invalidInputStyle: CSSProperties = {
  ...inputBaseStyle,
  borderColor: errorColor,
  boxShadow: "0 0 0 1px rgba(255,138,122,.15)",
};

const invalidCategoryInputStyle: CSSProperties = { ...categoryInputStyle, ...invalidInputStyle };
const invalidClueTextareaStyle: CSSProperties = { ...clueTextareaStyle, ...invalidInputStyle };
const invalidAnswerTextareaStyle: CSSProperties = { ...answerTextareaStyle, ...invalidInputStyle };

const flagStyle: CSSProperties = {
  fontSize: 12,
  color: errorColor,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};

const statusStyle: CSSProperties = {
  fontSize: 12,
  color: "#dfe4ff",
  letterSpacing: ".12em",
  textTransform: "uppercase",
};

const countControlStyle: CSSProperties = {
  ...statusStyle,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const clueRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  background: "rgba(255,255,255,.05)",
  borderRadius: 10,
  padding: 8,
};

const clueValueStyle: CSSProperties = {
  fontFamily: "'Zilla Slab', Georgia, serif",
  fontWeight: 700,
  fontSize: 12,
  color: accent,
};

function pillButtonStyle(enabled: boolean): CSSProperties {
  return {
    padding: "10px 18px",
    borderRadius: 999,
    border: 0,
    fontFamily: "Archivo, Helvetica, sans-serif",
    fontWeight: 700,
    fontSize: 12.5,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    background: enabled ? accent : "rgba(255,255,255,.12)",
    color: enabled ? "#07103f" : "rgba(255,255,255,.5)",
    cursor: enabled ? "pointer" : "default",
  };
}

const outlineButtonStyle: CSSProperties = {
  padding: "10px 18px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.25)",
  fontFamily: "Archivo, Helvetica, sans-serif",
  fontWeight: 700,
  fontSize: 12.5,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
};

const selectStyle: CSSProperties = {
  ...inputBaseStyle,
  width: 88,
};

// Browser-API glue only: triggers a download of the serialized Board Config. Thin,
// matching the precedent of socket.ts and playerIdentity.ts's localStorage calls.
function downloadBoardConfig(content: CategoryData[], doubleJeopardyContent: CategoryData[] | null): void {
  const blob = new Blob([serializeBoardConfig(content, doubleJeopardyContent)], { type: "application/json" });
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
  twoRounds,
  doubleJeopardyContent,
  onSetTwoRounds,
  onEditDoubleJeopardyCategoryName,
  onEditDoubleJeopardyClue,
}: {
  content: CategoryData[];
  onEditCategoryName: (categoryIndex: number, name: string) => void;
  onEditClue: (categoryIndex: number, tileIndex: number, field: ClueField, value: string) => void;
  onNewBoard: (categoryCount: number) => void;
  onImportBoardConfig: (content: CategoryData[]) => void;
  onOpenLobby: () => void;
  twoRounds: boolean;
  doubleJeopardyContent: CategoryData[] | null;
  onSetTwoRounds: (value: boolean) => void;
  onEditDoubleJeopardyCategoryName: (categoryIndex: number, name: string) => void;
  onEditDoubleJeopardyClue: (categoryIndex: number, tileIndex: number, field: ClueField, value: string) => void;
}) {
  const [newCount, setNewCount] = useState(4);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const complete = isContentComplete(content);
  const doubleJeopardyComplete = !twoRounds || isContentComplete(doubleJeopardyContent!);
  const canOpenLobby = complete && doubleJeopardyComplete;

  // Browser-API glue only: reads the chosen file's text. Thin, matching the precedent
  // of socket.ts and playerIdentity.ts's localStorage calls.
  async function handleImportFile(file: File): Promise<void> {
    const raw = await file.text();
    const result = parseBoardConfig(raw);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }

    setImportError(null);
    onSetTwoRounds(Boolean(result.doubleJeopardy));
    onImportBoardConfig(result.content);
    if (!result.doubleJeopardy) return;

    for (const [categoryIndex, category] of result.doubleJeopardy.entries()) {
      onEditDoubleJeopardyCategoryName(categoryIndex, category.name);
      for (const [tileIndex, clue] of category.clues.entries()) {
        onEditDoubleJeopardyClue(categoryIndex, tileIndex, "text", clue.text);
        onEditDoubleJeopardyClue(categoryIndex, tileIndex, "answer", clue.answer);
      }
    }
  }

  return (
    <div style={panelStyle}>
      <div style={headerCardStyle}>
        <div style={headerRowStyle}>
          <div style={titleStyle}>Set Up Categories</div>
          <div style={headerActionsStyle}>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={outlineButtonStyle}>
              Import Board
            </button>
            <button
              type="button"
              onClick={() => downloadBoardConfig(content, twoRounds ? doubleJeopardyContent : null)}
              style={outlineButtonStyle}
            >
              Export Board
            </button>
            <button type="button" disabled={!canOpenLobby} onClick={onOpenLobby} style={pillButtonStyle(canOpenLobby)}>
              Open Lobby
            </button>
          </div>
        </div>

        <div style={toolbarStyle}>
          <label style={countControlStyle}>
            <span>New blank board</span>
            <select
              aria-label="Category count"
              value={newCount}
              onChange={(event) => setNewCount(Number(event.target.value))}
              style={selectStyle}
            >
              {CATEGORY_COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => onNewBoard(newCount)} style={pillButtonStyle(true)}>
            Start New Board
          </button>
          <label style={countControlStyle}>
            <input
              type="checkbox"
              aria-label="Double Jeopardy"
              checked={twoRounds}
              onChange={(event) => onSetTwoRounds(event.target.checked)}
            />
            <span>Double Jeopardy</span>
          </label>
        </div>

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

        {importError && (
          <div style={flagStyle} role="alert">
            {importError}
          </div>
        )}

        {!canOpenLobby && (
          <div style={statusStyle} role="status">
            Fill in every Category name and every Clue before opening the Lobby
            {!complete && !doubleJeopardyComplete
              ? " for Round 1 and Double Jeopardy."
              : !doubleJeopardyComplete
                ? " for Double Jeopardy."
                : "."}
          </div>
        )}
      </div>

      <CategoryEditor
        content={content}
        values={VALUES}
        onEditCategoryName={onEditCategoryName}
        onEditClue={onEditClue}
      />

      {twoRounds && doubleJeopardyContent && (
        <div style={panelStyle}>
          <div style={titleStyle}>Double Jeopardy</div>
          <CategoryEditor
            content={doubleJeopardyContent}
            values={DOUBLE_JEOPARDY_VALUES}
            onEditCategoryName={onEditDoubleJeopardyCategoryName}
            onEditClue={onEditDoubleJeopardyClue}
            labelPrefix="Double Jeopardy "
          />
        </div>
      )}
    </div>
  );
}

// The Category/Clue-editing grid, shared between Round 1's and Double Jeopardy's
// panels — parameterized by which content array, Value labels, and edit actions it's
// bound to. `labelPrefix` keeps the two panels' aria-labels unique when both render at
// once (defaults to none, for Round 1's panel).
function CategoryEditor({
  content,
  values,
  onEditCategoryName,
  onEditClue,
  labelPrefix = "",
}: {
  content: CategoryData[];
  values: number[];
  onEditCategoryName: (categoryIndex: number, name: string) => void;
  onEditClue: (categoryIndex: number, tileIndex: number, field: ClueField, value: string) => void;
  labelPrefix?: string;
}) {
  return (
    <div style={{ ...columnsStyle, gridTemplateColumns: `repeat(${content.length}, minmax(0, 1fr))` }}>
      {content.map((category, categoryIndex) => (
        <div key={categoryIndex} style={categoryCardStyle}>
          <input
            aria-label={`${labelPrefix}Category ${categoryIndex + 1} name`}
            value={category.name}
            placeholder="Category name"
            maxLength={MAX_CATEGORY_NAME_LENGTH}
            onChange={(event) => onEditCategoryName(categoryIndex, event.target.value)}
            style={isBlank(category.name) ? invalidCategoryInputStyle : categoryInputStyle}
          />
          {isBlank(category.name) && <span style={flagStyle}>Category name required</span>}

          {category.clues.map((clue, tileIndex) => (
            <div key={tileIndex} style={clueRowStyle}>
              <div style={clueValueStyle}>${values[tileIndex]}</div>
              <textarea
                aria-label={`${labelPrefix}Category ${categoryIndex + 1} clue ${tileIndex + 1} text`}
                value={clue.text}
                placeholder={`Clue ${tileIndex + 1} text`}
                maxLength={MAX_CLUE_FIELD_LENGTH}
                onChange={(event) => onEditClue(categoryIndex, tileIndex, "text", event.target.value)}
                rows={3}
                style={isBlank(clue.text) ? invalidClueTextareaStyle : clueTextareaStyle}
              />
              <textarea
                aria-label={`${labelPrefix}Category ${categoryIndex + 1} clue ${tileIndex + 1} answer`}
                value={clue.answer}
                placeholder={`Clue ${tileIndex + 1} answer`}
                maxLength={MAX_CLUE_FIELD_LENGTH}
                onChange={(event) => onEditClue(categoryIndex, tileIndex, "answer", event.target.value)}
                rows={2}
                style={isBlank(clue.answer) ? invalidAnswerTextareaStyle : answerTextareaStyle}
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
  );
}
