import type { JoinResult } from "@yeahnah/shared";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { socket } from "../socket";
import { accent, gameTitle, shellStyle, titleStyle } from "../theme";
import { useGameState } from "../useGameState";

const inputStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  fontSize: 16,
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

export function JoinPage() {
  const state = useGameState();
  const [name, setName] = useState("");
  const [joinedName, setJoinedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    socket.emit("join", trimmed, (result: JoinResult) => {
      setSubmitting(false);
      if (result.ok) {
        setJoinedName(trimmed);
      } else {
        setError(result.error);
      }
    });
  }

  const gameStarted = state !== null && state.phase !== "lobby";

  return (
    <div style={shellStyle}>
      <div style={titleStyle}>{gameTitle}</div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          textAlign: "center",
        }}
      >
        {joinedName ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 24, textTransform: "uppercase" }}>You're in, {joinedName}!</div>
            <div style={{ color: "#c9d2f5" }}>
              {gameStarted ? "The game has started — check the Board!" : "Waiting for the Host to start the Game…"}
            </div>
          </>
        ) : gameStarted ? (
          <div style={{ color: "#c9d2f5" }}>Joining has closed — the Game has already started.</div>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, width: 260 }}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              maxLength={24}
              style={inputStyle}
              autoFocus
            />
            <button type="submit" disabled={submitting || !name.trim()} style={submitButtonStyle}>
              Join
            </button>
            {error && <div style={{ color: "#ff8a7a", fontSize: 13 }}>{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
