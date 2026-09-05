import { resolveActiveClue } from "../activeClue";
import { ActiveClue } from "../components/ActiveClue";
import { Board } from "../components/Board";
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
      ) : (
        <>
          <Scoreboard players={state.players} />
          {state.activeClue ? (
            <ActiveClue details={resolveActiveClue(state.activeClue, state.board, state.players)} />
          ) : (
            <Board board={state.board} />
          )}
        </>
      )}
    </div>
  );
}
