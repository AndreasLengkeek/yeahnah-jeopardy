import { canCloseClue } from "@yeahnah/shared";
import type { ActiveClue as ActiveClueState, Player } from "@yeahnah/shared";
import type { CSSProperties, ReactNode } from "react";
import { resolveActiveClue } from "../activeClue";
import { ClueCardStage } from "../components/ClueCardStage";
import { GameOver } from "../components/GameOver";
import { Header } from "../components/Header";
import { Lobby } from "../components/Lobby";
import { Scoreboard } from "../components/Scoreboard";
import { socket } from "../socket";
import { accent, shellStyle } from "../theme";
import { useGameState } from "../useGameState";
import { useIdentify } from "../useIdentify";

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

const resetButtonStyle: CSSProperties = {
  padding: "14px 28px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.3)",
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  background: "transparent",
  color: "rgba(255,255,255,.8)",
  cursor: "pointer",
};

const centeredRowStyle: CSSProperties = { display: "flex", justifyContent: "center", flex: "none" };
const centeredRowWithGapStyle: CSSProperties = { ...centeredRowStyle, gap: 16 };

function resetGameButton(): ReactNode {
  return (
    <div style={centeredRowStyle}>
      <button onClick={() => socket.emit("resetGame")} style={resetButtonStyle}>
        Reset Game
      </button>
    </div>
  );
}

function closeClueButton(): ReactNode {
  return (
    <button onClick={() => socket.emit("closeClue")} style={pillButtonStyle(true)}>
      Close Clue
    </button>
  );
}

function hostFooter(activeClue: ActiveClueState, players: Player[]): ReactNode {
  if (activeClue.buzzedPlayerId !== null) {
    return (
      <div style={centeredRowWithGapStyle}>
        <button onClick={() => socket.emit("judge", true)} style={pillButtonStyle(true)}>
          Correct
        </button>
        <button onClick={() => socket.emit("judge", false)} style={pillButtonStyle(true)}>
          Incorrect
        </button>
      </div>
    );
  }

  if (!activeClue.revealed) {
    return (
      <div style={centeredRowWithGapStyle}>
        <button onClick={() => socket.emit("reveal")} style={pillButtonStyle(true)}>
          Reveal
        </button>
        {canCloseClue(activeClue, players) && closeClueButton()}
      </div>
    );
  }

  return <div style={centeredRowStyle}>{closeClueButton()}</div>;
}

export function HostPage() {
  useIdentify("host");
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
          <div style={centeredRowStyle}>
            <button disabled={!canStart} onClick={() => socket.emit("startGame")} style={pillButtonStyle(canStart)}>
              Start Game
            </button>
          </div>
        </>
      ) : state.phase === "gameOver" ? (
        <>
          <GameOver players={state.players} />
          {resetGameButton()}
        </>
      ) : (
        <>
          <Scoreboard players={state.players} />
          <ClueCardStage
            board={state.board}
            activeClue={state.activeClue}
            details={state.activeClue ? resolveActiveClue(state.activeClue, state.board, state.players) : null}
            onSelectTile={(categoryIndex, tileIndex) => socket.emit("selectTile", categoryIndex, tileIndex)}
            footer={state.activeClue ? hostFooter(state.activeClue, state.players) : undefined}
            alwaysShowAnswer
          />
          {resetGameButton()}
        </>
      )}
    </div>
  );
}
