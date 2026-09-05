import type { JoinResult } from "@yeahnah/shared";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { resolveActiveClue } from "../activeClue";
import { GameOver } from "../components/GameOver";
import { formatScore } from "../format";
import { clearStoredPlayerId, getStoredPlayerId, storePlayerId } from "../playerIdentity";
import { socket } from "../socket";
import { accent, gameTitle, shellStyle, titleStyle } from "../theme";
import { useGameState } from "../useGameState";
import { useIdentify } from "../useIdentify";

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

function buzzButtonStyle(enabled: boolean): CSSProperties {
  return {
    width: 200,
    height: 200,
    borderRadius: "50%",
    border: 0,
    fontWeight: 800,
    fontSize: 22,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    background: enabled ? accent : "rgba(255,255,255,.12)",
    color: enabled ? "#07103f" : "rgba(255,255,255,.5)",
    cursor: enabled ? "pointer" : "default",
  };
}

export function JoinPage() {
  useIdentify("player");
  const state = useGameState();
  const [name, setName] = useState("");
  const [joinedName, setJoinedName] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reconnecting, setReconnecting] = useState(() => getStoredPlayerId() !== null);

  // On mount, a Player whose browser persisted an identifier from a previous join
  // attempts to reattach to it — covering both a reload and a dropped connection. An
  // unrecognized or post-Lobby-closed id falls back to the normal join form below.
  useEffect(() => {
    const storedPlayerId = getStoredPlayerId();
    if (!storedPlayerId) return;

    socket.emit("reconnect", storedPlayerId, (result: JoinResult) => {
      if (result.ok) {
        setPlayerId(result.playerId);
      } else {
        clearStoredPlayerId();
      }
      setReconnecting(false);
    });
  }, []);

  // A reset (→ Lobby) or the Host returning to Board Setup clears the roster — once a
  // Player who had joined no longer appears in the Game, send them back to the join
  // form to rejoin fresh.
  useEffect(() => {
    const rosterCleared = state?.phase === "lobby" || state?.phase === "setup";
    if (state && playerId && rosterCleared && !state.players.some((player) => player.id === playerId)) {
      setJoinedName(null);
      setPlayerId(null);
      clearStoredPlayerId();
    }
  }, [state, playerId]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    socket.emit("join", trimmed, (result: JoinResult) => {
      setSubmitting(false);
      if (result.ok) {
        storePlayerId(result.playerId);
        setJoinedName(trimmed);
        setPlayerId(result.playerId);
      } else {
        setError(result.error);
      }
    });
  }

  const inSetup = state?.phase === "setup";
  const gameStarted = state !== null && state.phase !== "lobby" && state.phase !== "setup";
  const me = state && playerId ? state.players.find((player) => player.id === playerId) : undefined;
  // A fresh join already knows the typed name before the state broadcast confirming it
  // arrives; a reconnect has no local name to fall back on, so it waits on `me`.
  const displayName = joinedName ?? me?.name ?? "";
  const activeClue = state?.activeClue ?? null;
  const clueDetails = state && activeClue ? resolveActiveClue(activeClue, state.board, state.players) : null;
  const iHaveTheBuzz = activeClue?.buzzedPlayerId === playerId;
  const otherBuzzedPlayer = iHaveTheBuzz ? undefined : clueDetails?.buzzedPlayer;
  const iAmExcluded = !!(playerId && activeClue?.excludedPlayerIds.includes(playerId));
  const canBuzz = gameStarted && activeClue !== null && activeClue.buzzedPlayerId === null && !iAmExcluded;

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
        {reconnecting ? (
          <div style={{ color: "#c9d2f5" }}>Reconnecting…</div>
        ) : inSetup ? (
          <div style={{ color: "#c9d2f5" }}>The Host is still setting up the Board…</div>
        ) : playerId ? (
          state?.phase === "gameOver" ? (
            <GameOver players={state.players} />
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: 24, textTransform: "uppercase" }}>
                {displayName}
                {me && <span style={{ color: accent }}> — {formatScore(me.score)}</span>}
              </div>
              {!gameStarted ? (
                <div style={{ color: "#c9d2f5" }}>Waiting for the Host to start the Game…</div>
              ) : (
                <>
                  <button
                    disabled={!canBuzz}
                    onClick={() => socket.emit("buzz", playerId)}
                    style={buzzButtonStyle(canBuzz)}
                  >
                    Buzz
                  </button>
                  <div style={{ color: "#c9d2f5" }}>
                    {iHaveTheBuzz
                      ? "You have the buzz!"
                      : otherBuzzedPlayer
                        ? `${otherBuzzedPlayer.name} has the buzz`
                        : iAmExcluded
                          ? "You already answered — waiting for someone else…"
                          : activeClue
                            ? "Buzz in!"
                            : "Waiting for the Host to select a Clue…"}
                  </div>
                </>
              )}
            </>
          )
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
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
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
