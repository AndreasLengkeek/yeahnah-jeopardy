import { resolveActiveClue } from "../activeClue";
import { ClueCardStage } from "../components/ClueCardStage";
import { CodeTiles } from "../components/CodeTiles";
import { mutedColor } from "../components/forms";
import { GameOver } from "../components/GameOver";
import { Header } from "../components/Header";
import { JoinQrCode } from "../components/JoinQrCode";
import { Lobby } from "../components/Lobby";
import { RoomEnded } from "../components/RoomEnded";
import { RoomNotice } from "../components/RoomNotice";
import { roomPath } from "../roomRoutes";
import { Scoreboard } from "../components/Scoreboard";
import { NO_ROOM_COPY } from "../copy";
import { shellStyle, subtitleStyle } from "../theme";
import { useBoardAudio } from "../useBoardAudio";
import { useGameState } from "../useGameState";
import { useIdentify } from "../useIdentify";
import { useRoomCode } from "../useRoomCode";

export function BoardPage() {
  const code = useRoomCode();
  const identified = useIdentify(code, "board");
  const state = useGameState();
  const { enabled: soundEnabled, enableSound } = useBoardAudio(state);

  // The Board route builds its Room's join URL from wherever it was itself loaded from —
  // so the QR is only as reachable as that origin (the Host must open the Board via a LAN
  // address, not localhost, for a phone to resolve it). Deliberately no auto-detection.
  const joinUrl = `${window.location.origin}${roomPath(code, "join")}`;

  if (identified === "ended") return <RoomEnded code={code} />;

  if (identified === "noRoom") {
    return (
      <div style={shellStyle}>
        <Header />
        <RoomNotice>{NO_ROOM_COPY}</RoomNotice>
      </div>
    );
  }

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
          {/* The Room Code as big as the QR code, so it can be read from the couch. */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ ...subtitleStyle, textAlign: "center" }}>Go to {window.location.host} and enter</div>
              <CodeTiles code={code} size={96} />
            </div>
            <div style={{ color: mutedColor, fontFamily: "'Zilla Slab', Georgia, serif", fontSize: 22 }}>or</div>
            <JoinQrCode url={joinUrl} />
          </div>
          <Lobby players={state.players} />
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
