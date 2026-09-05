import { resolveActiveClue } from "../activeClue";
import { ClueCardStage } from "../components/ClueCardStage";
import { GameOver } from "../components/GameOver";
import { Header } from "../components/Header";
import { Lobby } from "../components/Lobby";
import { Scoreboard } from "../components/Scoreboard";
import { shellStyle } from "../theme";
import { useGameState } from "../useGameState";

export function BoardPage() {
  const state = useGameState();

  return (
    <div style={shellStyle}>
      <Header />
      {!state ? (
        <div>Connecting…</div>
      ) : state.phase === "lobby" ? (
        <Lobby players={state.players} />
      ) : state.phase === "gameOver" ? (
        <GameOver players={state.players} />
      ) : (
        <>
          <Scoreboard players={state.players} />
          <ClueCardStage
            board={state.board}
            activeClue={state.activeClue}
            details={state.activeClue ? resolveActiveClue(state.activeClue, state.board, state.players) : null}
          />
        </>
      )}
    </div>
  );
}
