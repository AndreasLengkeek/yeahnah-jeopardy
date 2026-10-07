import { canCloseClue } from "@yeahnah/shared";
import type { ActiveClue as ActiveClueState, GameState, Player } from "@yeahnah/shared";
import type { CSSProperties, ReactNode } from "react";
import { resolveActiveClue } from "../activeClue";
import { BoardSetup } from "../components/BoardSetup";
import { ClueCardStage } from "../components/ClueCardStage";
import { GameOver } from "../components/GameOver";
import { Header } from "../components/Header";
import { RoomEnded } from "../components/RoomEnded";
import { RoomNotice } from "../components/RoomNotice";
import { Lobby } from "../components/Lobby";
import { PlayerIdentity } from "../components/PlayerIdentity";
import { RoomPanel } from "../components/RoomPanel";
import { Scoreboard } from "../components/Scoreboard";
import { socket } from "../socket";
import { accent, shellStyle } from "../theme";
import { useGameState } from "../useGameState";
import { useHostClaim } from "../useHostClaim";
import { useRoomCode } from "../useRoomCode";
import { useRoomInfo } from "../useRoomInfo";

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

function wagererButtonStyle(selected: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    borderRadius: 999,
    border: selected ? `1px solid ${accent}` : "1px solid rgba(255,255,255,.3)",
    fontWeight: 700,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    background: selected ? accent : "transparent",
    color: selected ? "#07103f" : "rgba(255,255,255,.8)",
    cursor: "pointer",
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

// Outside play, the main column sits beside the Room panel, which wraps underneath it
// on a narrow screen.
const besidePanelStyle: CSSProperties = { display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" };
const mainColumnStyle: CSSProperties = { flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 20 };

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

export function hostFooter(activeClue: ActiveClueState, players: Player[]): ReactNode {
  // A Daily Double's Clue text stays behind its cover screen until the Host explicitly
  // shows it — takes priority over every other footer state, since nothing else (no
  // Buzz, no Reveal) can have happened yet while it's still covered.
  if (activeClue.isDailyDouble && !activeClue.clueShown) {
    return (
      <div style={centeredRowStyle}>
        <button onClick={() => socket.emit("showDailyDoubleClue")} style={pillButtonStyle(true)}>
          Show Clue
        </button>
      </div>
    );
  }

  // Once the Daily Double's Wager hasn't landed yet, the Host picks (or re-picks) any
  // joined Player, connected or not, instead of the normal Buzz/Reveal/Judge controls —
  // takes priority over everything below, since none of that can happen yet.
  if (activeClue.isDailyDouble && activeClue.wager === null) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => socket.emit("designateWagerer", player.id)}
            style={wagererButtonStyle(activeClue.wageringPlayerId === player.id)}
          >
            <PlayerIdentity identity={player.identity} />
          </button>
        ))}
      </div>
    );
  }

  // A Daily Double never has a Buzz to key off of — its Wager stands in for the
  // "who currently must be judged" gate a normal Clue gets from buzzedPlayerId.
  const awaitingJudgment = activeClue.isDailyDouble
    ? activeClue.wager !== null && !activeClue.revealed
    : activeClue.buzzedPlayerId !== null;

  if (awaitingJudgment) {
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
  const code = useRoomCode();
  const roomInfo = useRoomInfo();
  const claim = useHostClaim(code);
  const state = useGameState();
  const toggleBoardMusic = () => socket.emit("toggleBoardMusic");
  const toggleBoardEffects = () => socket.emit("toggleBoardEffects");
  const closeRoom = () => socket.emit("closeRoom");

  if (claim === "ended") return <RoomEnded code={code} />;

  // Until this device is accepted as Host, nothing of the Game is rendered — the
  // state it holds meanwhile is only the redacted Player view anyway (ADR-0015).
  if (claim === "rejected" || claim === "noRoom") {
    return (
      <div style={shellStyle}>
        <Header subtitle="Host view" />
        <RoomNotice>
          {claim === "noRoom" ? "No Room with that code" : `This device isn't the Host of Room ${code}`}
        </RoomNotice>
      </div>
    );
  }

  if (claim !== "accepted" || !state) {
    return (
      <div style={shellStyle}>
        <Header subtitle="Host view" />
        <div>Connecting…</div>
      </div>
    );
  }

  const headerAction =
    state.phase === "lobby" || state.phase === "roundBreak" || state.phase === "gameOver"
      ? { label: "Edit Board", onClick: () => socket.emit("returnToSetup") }
      : undefined;

  return (
    <div style={shellStyle}>
      <Header
        subtitle="Host view"
        action={headerAction}
        isBoardMusicMuted={state.boardMusicMuted}
        onToggleBoardMusic={toggleBoardMusic}
        isBoardEffectsMuted={state.boardEffectsMuted}
        onToggleBoardEffects={toggleBoardEffects}
      />
      {state.phase === "playing" ? (
        <>
          <RoomPanel code={code} info={roomInfo} onCloseRoom={closeRoom} collapsed />
          <ClueCardStage
            board={state.board}
            activeClue={state.activeClue}
            details={state.activeClue ? resolveActiveClue(state.activeClue, state.board, state.players) : null}
            onSelectTile={(categoryIndex, tileIndex) => socket.emit("selectTile", categoryIndex, tileIndex)}
            footer={state.activeClue ? hostFooter(state.activeClue, state.players) : undefined}
            alwaysShowAnswer
          />
          {resetGameButton()}
          <Scoreboard
            players={state.players}
            onEditScore={(playerId, score) => socket.emit("setScore", playerId, score)}
          />
        </>
      ) : (
        <div style={besidePanelStyle}>
          <div style={mainColumnStyle}>{betweenPlay(state)}</div>
          <RoomPanel code={code} info={roomInfo} onCloseRoom={closeRoom} collapsed={false} />
        </div>
      )}
    </div>
  );
}

// The Host screen's main column outside play (Board Setup, the Lobby, the round break
// and Game Over), shown beside the full Room panel.
function betweenPlay(state: GameState): ReactNode {
  const canStart = state.phase === "lobby" && state.players.length >= 2;
  return (
    <>
      {state.phase === "setup" ? (
        <BoardSetup
          content={state.content}
          onEditCategoryName={(categoryIndex, name) => socket.emit("editCategoryName", categoryIndex, name)}
          onEditClue={(categoryIndex, tileIndex, field, value) =>
            socket.emit("editClue", categoryIndex, tileIndex, field, value)
          }
          onNewBoard={(categoryCount) => socket.emit("newBoard", categoryCount)}
          onImportBoardConfig={(content) => socket.emit("importBoardConfig", content)}
          onOpenLobby={() => socket.emit("openLobby")}
          twoRounds={state.twoRounds}
          doubleJeopardyContent={state.doubleJeopardyContent}
          onSetTwoRounds={(value) => socket.emit("setTwoRounds", value)}
          onEditDoubleJeopardyCategoryName={(categoryIndex, name) =>
            socket.emit("editDoubleJeopardyCategoryName", categoryIndex, name)
          }
          onEditDoubleJeopardyClue={(categoryIndex, tileIndex, field, value) =>
            socket.emit("editDoubleJeopardyClue", categoryIndex, tileIndex, field, value)
          }
        />
      ) : state.phase === "lobby" ? (
        <>
          <Lobby players={state.players} />
          <div style={centeredRowWithGapStyle}>
            <button disabled={!canStart} onClick={() => socket.emit("startGame")} style={pillButtonStyle(canStart)}>
              Start Game
            </button>
            <button onClick={() => socket.emit("resetGame")} style={resetButtonStyle}>
              Reset Game
            </button>
          </div>
        </>
      ) : state.phase === "roundBreak" ? (
        <>
          <div style={{ color: "#c9d2f5", textAlign: "center" }}>Round 1 is complete.</div>
          <div style={centeredRowWithGapStyle}>
            <button onClick={() => socket.emit("startDoubleJeopardy")} style={pillButtonStyle(true)}>
              Start Double Jeopardy
            </button>
            <button onClick={() => socket.emit("resetGame")} style={resetButtonStyle}>
              Reset Game
            </button>
          </div>
          <Scoreboard
            players={state.players}
            onEditScore={(playerId, score) => socket.emit("setScore", playerId, score)}
          />
        </>
      ) : (
        <>
          <GameOver players={state.players} />
          {resetGameButton()}
        </>
      )}
    </>
  );
}
