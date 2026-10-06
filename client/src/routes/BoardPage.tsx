import { resolveActiveClue } from "../activeClue";
import { ClueCardStage } from "../components/ClueCardStage";
import { GameOver } from "../components/GameOver";
import { Header } from "../components/Header";
import { JoinQrCode } from "../components/JoinQrCode";
import { Lobby } from "../components/Lobby";
import { Scoreboard } from "../components/Scoreboard";
import { shellStyle } from "../theme";
import { useBoardAudio } from "../useBoardAudio";
import { useGameState } from "../useGameState";
import { useIdentify } from "../useIdentify";

export function BoardPage() {
  useIdentify("board");
  const state = useGameState();
  const { enabled: soundEnabled, enableSound } = useBoardAudio(state);

  // The Board route builds the join URL from wherever it was itself loaded from — so the
  // QR is only as reachable as that origin (the Host must open the Board via a LAN address,
  // not localhost, for a phone to resolve it). Deliberately no auto-detection. `/join`
  // mirrors the route in App.tsx; there's no shared route-constant module to point at.
  const joinUrl = `${window.location.origin}/join`;

  // While Board Sound is still locked (the browser blocked the auto-unlock), a tap anywhere
  // on the Board is the gesture that unlocks it — in any phase, so a Board reloaded
  // mid-Game can get its sound back.
  return (
    <div style={shellStyle} onClick={soundEnabled ? undefined : enableSound}>
      <Header subtitle={soundEnabled ? undefined : "Tap to enable sound"} />
      {!state ? (
        <div>Connecting…</div>
      ) : state.phase === "setup" ? (
        <div>The Host is setting up the Board…</div>
      ) : state.phase === "lobby" ? (
        <>
          <Lobby players={state.players} />
          <JoinQrCode url={joinUrl} />
        </>
      ) : state.phase === "roundBreak" ? (
        <div>Waiting for Double Jeopardy…</div>
      ) : state.phase === "gameOver" ? (
        <GameOver players={state.players} />
      ) : (
        <>
          <ClueCardStage
            board={state.board}
            activeClue={state.activeClue}
            details={state.activeClue ? resolveActiveClue(state.activeClue, state.board, state.players) : null}
          />
          <Scoreboard players={state.players} />
        </>
      )}
    </div>
  );
}
