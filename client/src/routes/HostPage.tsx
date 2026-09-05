import { canCloseClue } from "@yeahnah/shared";
import type { ActiveClue as ActiveClueState, Player } from "@yeahnah/shared";
import type { CSSProperties, ReactNode } from "react";
import { resolveActiveClue } from "../activeClue";
import { ActiveClue } from "../components/ActiveClue";
import { Board } from "../components/Board";
import { Header } from "../components/Header";
import { Lobby } from "../components/Lobby";
import { Scoreboard } from "../components/Scoreboard";
import { socket } from "../socket";
import { accent, shellStyle } from "../theme";
import { useGameState } from "../useGameState";

function pillButtonStyle(enabled: boolean): CSSProperties {
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

function hostFooter(activeClue: ActiveClueState, players: Player[]): ReactNode {
  if (activeClue.buzzedPlayerId && !activeClue.revealed) {
    return (
      <button onClick={() => socket.emit("reveal")} style={pillButtonStyle(true)}>
        Reveal
      </button>
    );
  }

  if (activeClue.buzzedPlayerId && activeClue.revealed) {
    return (
      <div style={{ display: "flex", gap: 16 }}>
        <button onClick={() => socket.emit("judge", true)} style={pillButtonStyle(true)}>
          Correct
        </button>
        <button onClick={() => socket.emit("judge", false)} style={pillButtonStyle(true)}>
          Incorrect
        </button>
      </div>
    );
  }

  if (canCloseClue(activeClue, players)) {
    return (
      <button onClick={() => socket.emit("closeClue")} style={pillButtonStyle(true)}>
        Close Clue
      </button>
    );
  }

  return null;
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
            <button disabled={!canStart} onClick={() => socket.emit("startGame")} style={pillButtonStyle(canStart)}>
              Start Game
            </button>
          </div>
        </>
      ) : (
        <>
          <Scoreboard players={state.players} />
          {state.activeClue ? (
            <ActiveClue
              details={resolveActiveClue(state.activeClue, state.board, state.players)}
              footer={hostFooter(state.activeClue, state.players)}
            />
          ) : (
            <Board board={state.board} onSelectTile={(categoryIndex, tileIndex) => socket.emit("selectTile", categoryIndex, tileIndex)} />
          )}
        </>
      )}
    </div>
  );
}
