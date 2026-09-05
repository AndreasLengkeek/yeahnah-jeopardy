import type { CSSProperties } from "react";
import { Board } from "../components/Board";
import { Header } from "../components/Header";
import { Lobby } from "../components/Lobby";
import { socket } from "../socket";
import { accent, shellStyle } from "../theme";
import { useGameState } from "../useGameState";

function startButtonStyle(enabled: boolean): CSSProperties {
  return {
    padding: "14px 28px",
    borderRadius: 999,
    border: 0,
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    background: enabled ? accent : "rgba(255,255,255,.12)",
    color: enabled ? "#07103f" : "rgba(255,255,255,.5)",
    cursor: enabled ? "pointer" : "default",
  };
}

export function HostPage() {
  const state = useGameState();

  if (!state) {
    return (
      <div style={shellStyle}>
        <Header subtitle="Host view" />
        <div>Connecting…</div>
      </div>
    );
  }

  const canStart = state.phase === "lobby" && state.players.length >= 2;

  return (
    <div style={shellStyle}>
      <Header subtitle="Host view" />
      {state.phase === "lobby" ? (
        <>
          <Lobby players={state.players} />
          <div style={{ display: "flex", justifyContent: "center", flex: "none" }}>
            <button disabled={!canStart} onClick={() => socket.emit("startGame")} style={startButtonStyle(canStart)}>
              Start Game
            </button>
          </div>
        </>
      ) : (
        <Board board={state.board} />
      )}
    </div>
  );
}
