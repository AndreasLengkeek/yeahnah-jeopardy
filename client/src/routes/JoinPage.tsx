import type { JoinResult, PlayerIdentity as PlayerIdentityValue } from "@yeahnah/shared";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { resolveActiveClue } from "../activeClue";
import { GameOver } from "../components/GameOver";
import { JoinForm } from "../components/JoinForm";
import { PlayerIdentity } from "../components/PlayerIdentity";
import { formatScore } from "../format";
import { clearStoredPlayerId, getStoredPlayerId, storePlayerId } from "../playerIdentity";
import { socket } from "../socket";
import { accent, gameTitle, shellStyle, titleStyle } from "../theme";
import { useGameState } from "../useGameState";
import { useIdentify } from "../useIdentify";

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

const editLinkStyle: CSSProperties = {
  background: "transparent",
  border: 0,
  padding: 4,
  color: "#c9d2f5",
  fontSize: 13,
  textDecoration: "underline",
  cursor: "pointer",
};

// Fills the same space the Buzz button/status normally occupy while the Host's Daily
// Double cover screen is up — matches the signal Host/Board show via the shared
// ActiveClue component (see client/src/components/ActiveClue.tsx).
const dailyDoubleStyle: CSSProperties = {
  fontFamily: "'Zilla Slab', Georgia, serif",
  fontWeight: 800,
  fontSize: 22,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  color: accent,
};

export function JoinPage() {
  useIdentify("player");
  const state = useGameState();
  const [joinedIdentity, setJoinedIdentity] = useState<PlayerIdentityValue | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reconnecting, setReconnecting] = useState(() => getStoredPlayerId() !== null);
  const [editing, setEditing] = useState(false);

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
      setJoinedIdentity(null);
      setPlayerId(null);
      clearStoredPlayerId();
    }
  }, [state, playerId]);

  function handleJoin(identity: PlayerIdentityValue) {
    setSubmitting(true);
    setError(null);
    socket.emit("join", identity, (result: JoinResult) => {
      setSubmitting(false);
      if (result.ok) {
        storePlayerId(result.playerId);
        setJoinedIdentity(identity);
        setPlayerId(result.playerId);
      } else {
        setError(result.error);
      }
    });
  }

  function handleEditIdentity(identity: PlayerIdentityValue) {
    if (!playerId) return;
    setSubmitting(true);
    setError(null);
    socket.emit("editIdentity", playerId, identity, (result: JoinResult) => {
      setSubmitting(false);
      if (result.ok) {
        setJoinedIdentity(identity);
        setEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  const inSetup = state?.phase === "setup";
  const gameStarted = state !== null && state.phase !== "lobby" && state.phase !== "setup";
  const me = state && playerId ? state.players.find((player) => player.id === playerId) : undefined;
  // A fresh join already has the identity it submitted before the state broadcast
  // confirming it arrives; a reconnect has no local identity to fall back on, so it
  // waits on `me`.
  const displayIdentity = joinedIdentity ?? me?.identity ?? null;
  const activeClue = state?.activeClue ?? null;
  const clueDetails = state && activeClue ? resolveActiveClue(activeClue, state.board, state.players) : null;
  const iHaveTheBuzz = activeClue?.buzzedPlayerId === playerId;
  const otherBuzzedPlayer = iHaveTheBuzz ? undefined : clueDetails?.buzzedPlayer;
  const iAmExcluded = !!(playerId && activeClue?.excludedPlayerIds.includes(playerId));
  // A Daily Double's Clue stays behind its cover screen until the Host reveals it —
  // nothing to Buzz on yet (see gameEngine.ts's showDailyDoubleClue).
  const dailyDoubleCovered = !!activeClue?.isDailyDouble && !activeClue.clueShown;
  const canBuzz =
    gameStarted && activeClue !== null && activeClue.buzzedPlayerId === null && !iAmExcluded && !dailyDoubleCovered;

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
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 24,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {displayIdentity && <PlayerIdentity identity={displayIdentity} />}
                {me && <span style={{ color: accent }}> — {formatScore(me.score)}</span>}
                {!gameStarted && !editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setEditing(true);
                    }}
                    style={editLinkStyle}
                  >
                    Edit
                  </button>
                )}
              </div>
              {!gameStarted ? (
                editing ? (
                  <>
                    <JoinForm onJoin={handleEditIdentity} submitting={submitting} error={error} />
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setEditing(false);
                      }}
                      style={editLinkStyle}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <div style={{ color: "#c9d2f5" }}>Waiting for the Host to start the Game…</div>
                )
              ) : dailyDoubleCovered ? (
                <div style={dailyDoubleStyle}>Daily Double!</div>
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
                    {iHaveTheBuzz ? (
                      "You have the buzz!"
                    ) : otherBuzzedPlayer ? (
                      <>
                        <PlayerIdentity identity={otherBuzzedPlayer.identity} /> has the buzz
                      </>
                    ) : iAmExcluded ? (
                      "You already answered — waiting for someone else…"
                    ) : activeClue ? (
                      "Buzz in!"
                    ) : (
                      "Waiting for the Host to select a Clue…"
                    )}
                  </div>
                </>
              )}
            </>
          )
        ) : gameStarted ? (
          <div style={{ color: "#c9d2f5" }}>Joining has closed — the Game has already started.</div>
        ) : (
          <JoinForm onJoin={handleJoin} submitting={submitting} error={error} />
        )}
      </div>
    </div>
  );
}
