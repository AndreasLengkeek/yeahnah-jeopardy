import type { Player } from "@yeahnah/shared";
import { useState } from "react";
import { formatScore } from "../format";
import { accent, palette } from "../theme";

const scoreColor = (score: number) => (score < 0 ? "#ff8a7a" : accent);

type ScoreboardProps = {
  players: Player[];
  // When provided, each score becomes an inline-editable control that commits the typed
  // integer on Enter or blur — no confirmation step. Omit it (the Board) for a read-only
  // Scoreboard identical to the display-only version.
  onEditScore?: (playerId: string, score: number) => void;
};

export function Scoreboard({ players, onEditScore }: ScoreboardProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", flex: "none" }}>
      {players.map((player) => (
        <div
          key={player.id}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            background: palette.card,
          }}
        >
          <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{player.name}</span>
          {onEditScore ? (
            <EditableScore player={player} onCommit={(score) => onEditScore(player.id, score)} />
          ) : (
            <span style={{ fontWeight: 800, color: scoreColor(player.score) }}>{formatScore(player.score)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function EditableScore({ player, onCommit }: { player: Player; onCommit: (score: number) => void }) {
  // `draft` is null while the field just mirrors the live score, and a string while the
  // Host is typing. Committing parses that string to an integer and clears the draft so
  // the field snaps back to whatever score the server broadcasts.
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    // Only an exact integer (optional leading minus) commits — "3.9", "12x", "", "-" are
    // discarded silently and the field snaps back to the live score. No range limit: any
    // integer, positive or negative, is a valid correction.
    const trimmed = draft.trim();
    if (/^-?\d+$/.test(trimmed)) onCommit(Number.parseInt(trimmed, 10));
    setDraft(null);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={`${player.name} score`}
      value={draft ?? String(player.score)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      style={{
        width: 72,
        font: "inherit",
        fontWeight: 800,
        textAlign: "right",
        color: scoreColor(player.score),
        background: "rgba(255,255,255,.08)",
        border: "1px solid rgba(255,255,255,.25)",
        borderRadius: 8,
        padding: "2px 6px",
      }}
    />
  );
}
