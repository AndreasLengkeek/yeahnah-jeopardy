import type { JoinResult, PlayerIdentity as PlayerIdentityValue } from "@yeahnah/shared";
import { wagerRange } from "@yeahnah/shared";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { resolveActiveClue } from "../activeClue";
import { GameOver } from "../components/GameOver";
import { JoinForm } from "../components/JoinForm";
import { PlayerIdentity } from "../components/PlayerIdentity";
import { RoomFull } from "../components/RoomFull";
import { WagerForm } from "../components/WagerForm";
import { formatScore } from "../format";
import { playerIds } from "../roomStorage";
import { socket } from "../socket";
import { accent, gameTitle, shellStyle, titleStyle } from "../theme";
import { useGameState } from "../useGameState";
import { useIdentify } from "../useIdentify";
import { useRoomCode } from "../useRoomCode";
import type { RoomCodeEntryState } from "./RoomCodeEntryPage";

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
  const code = useRoomCode();
  const identified = useIdentify(code, "player");
  const state = useGameState();
  const [joinedIdentity, setJoinedIdentity] = useState<PlayerIdentityValue | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reconnecting, setReconnecting] = useState(() => playerIds.get(code) !== null);
  const [editing, setEditing] = useState(false);
  const [roomFull, setRoomFull] = useState(false);

  // On mount, a Player whose browser persisted an identifier from a previous join to
  // this Room attempts to reattach to it — covering both a reload and a dropped
  // connection. An unrecognized or post-Lobby-closed id falls back to the normal join
  // form below.
  useEffect(() => {
    const storedPlayerId = playerIds.get(code);
    if (!storedPlayerId) return;

    socket.emit("reconnect", storedPlayerId, (result: JoinResult) => {
      if (result.ok) {
        setPlayerId(result.playerId);
      } else {
        playerIds.clear(code);
      }
      setReconnecting(false);
    });
  }, [code]);

  // A socket that drops and auto-reconnects (a phone waking up) arrives as a fresh,
  // anonymous connection — re-announce the Player on each new "connect" so the server
  // knows which Player this socket is again.
  useEffect(() => {
    if (!playerId) return;
    function reattach() {
      socket.emit("reconnect", playerId);
    }
    socket.on("connect", reattach);
    return () => {
      socket.off("connect", reattach);
    };
  }, [playerId]);

  useEffect(() => {
    if (identified === "ended") playerIds.clear(code);
  }, [identified, code]);

  // Safety net: Play again and Back to Board Setup keep the roster, so this shouldn't
  // fire on those paths — but if a joined Player ever goes missing from the Lobby or
  // Board Setup roster, send them back to the join form to rejoin fresh.
  useEffect(() => {
    const rosterCleared = state?.phase === "lobby" || state?.phase === "setup";
    if (state && playerId && rosterCleared && !state.players.some((player) => player.id === playerId)) {
      setJoinedIdentity(null);
      setPlayerId(null);
      playerIds.clear(code);
    }
  }, [state, playerId, code]);

  function handleJoin(identity: PlayerIdentityValue) {
    setSubmitting(true);
    setError(null);
    socket.emit("join", identity, (result: JoinResult) => {
      setSubmitting(false);
      if (result.ok) {
        playerIds.set(code, result.playerId);
        setJoinedIdentity(identity);
        setPlayerId(result.playerId);
      } else if (result.reason === "roomFull") {
        setRoomFull(true);
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
  const inRoundBreak = state?.phase === "roundBreak";
  const gameStarted =
    state !== null && state.phase !== "lobby" && state.phase !== "setup" && state.phase !== "roundBreak";
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
  // Once a Daily Double's Clue is shown but no Wager has landed yet, the designated
  // Player Wagers instead of Buzzing — everyone else sees a banner naming them (same
  // signal as Board/Host's ActiveClue banner, see components/ActiveClue.tsx).
  const wagering = !!activeClue?.isDailyDouble && activeClue.wager === null && !dailyDoubleCovered;
  const iAmWagering = wagering && activeClue?.wageringPlayerId === playerId;
  const canBuzz =
    gameStarted &&
    activeClue !== null &&
    activeClue.buzzedPlayerId === null &&
    !iAmExcluded &&
    // A Daily Double never has a Buzz race — locked out for its entire lifetime, from
    // selection through Close, not just while covered or awaiting a Wager (see
    // gameEngine.ts's applyBuzz).
    !activeClue.isDailyDouble;

  // A code with no live Room sends the Player back to Room Code entry to try another.
  // Their Room ending sends them there too, as a fresh journey: no error, and nothing
  // remembered of the Room.
  if (identified === "ended") return <Navigate to="/join" replace />;
  if (identified === "noRoom") {
    return <Navigate to="/join" replace state={{ noRoom: true } satisfies RoomCodeEntryState} />;
  }

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
        {roomFull && !playerId ? (
          <RoomFull code={code} playerCount={state?.players.length ?? 0} onTryAgain={() => setRoomFull(false)} />
        ) : reconnecting ? (
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
              {inRoundBreak ? (
                <div style={{ color: "#c9d2f5" }}>Waiting for Double Jeopardy…</div>
              ) : !gameStarted ? (
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
              ) : wagering ? (
                iAmWagering && me ? (
                  <WagerForm
                    min={wagerRange(me, state?.round ?? 1).min}
                    max={wagerRange(me, state?.round ?? 1).max}
                    onSubmit={(amount) => socket.emit("submitWager", playerId, amount)}
                  />
                ) : (
                  <div style={dailyDoubleStyle}>
                    {clueDetails?.wageringPlayer ? (
                      <>
                        <PlayerIdentity identity={clueDetails.wageringPlayer.identity} /> is wagering…
                      </>
                    ) : (
                      "Choosing a wagerer…"
                    )}
                  </div>
                )
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
        ) : inRoundBreak ? (
          <div style={{ color: "#c9d2f5" }}>Waiting for Double Jeopardy…</div>
        ) : gameStarted ? (
          <div style={{ color: "#c9d2f5" }}>Joining has closed — the Game has already started.</div>
        ) : (
          <JoinForm onJoin={handleJoin} submitting={submitting} error={error} />
        )}
      </div>
    </div>
  );
}
