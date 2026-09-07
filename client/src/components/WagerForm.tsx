import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { formatScore } from "../format";
import { accent } from "../theme";

const inputStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  fontSize: 16,
  textAlign: "center",
};

const submitButtonStyle: CSSProperties = {
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

const disabledSubmitButtonStyle: CSSProperties = {
  ...submitButtonStyle,
  background: "rgba(255,255,255,.12)",
  color: "rgba(255,255,255,.5)",
  cursor: "default",
};

// The designated Player's Wager-entry control on a Daily Double — shows the $5 minimum
// and their computed maximum (see wagerRange in gameEngine.ts) before they submit, and
// rejects (never clamps) an out-of-range typed amount by simply disabling Submit.
export function WagerForm({ min, max, onSubmit }: { min: number; max: number; onSubmit: (amount: number) => void }) {
  const [value, setValue] = useState(String(min));

  const amount = Number(value);
  const canSubmit = value.trim() !== "" && Number.isFinite(amount) && amount >= min && amount <= max;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit(amount);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, width: 260, maxWidth: "100%" }}>
      <div style={{ color: "#c9d2f5", fontSize: 13 }}>
        Wager between {formatScore(min)} and {formatScore(max)}
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        style={inputStyle}
      />
      <button type="submit" disabled={!canSubmit} style={canSubmit ? submitButtonStyle : disabledSubmitButtonStyle}>
        Submit Wager
      </button>
    </form>
  );
}
