import { Board } from "../components/Board";
import { Header } from "../components/Header";
import { Lobby } from "../components/Lobby";
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
        <Board board={state.board} />
      )}
    </div>
  );
}
