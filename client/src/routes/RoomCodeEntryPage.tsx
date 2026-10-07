import { useLocation } from "react-router-dom";
import { centeredStyle } from "../components/forms";
import { NO_ROOM_COPY } from "../copy";
import { RoomCodeForm } from "../components/RoomCodeForm";
import { gameTitle, shellStyle, titleStyle } from "../theme";

// What a Room's join page passes along when it sends the Player back here.
export type RoomCodeEntryState = { noRoom?: boolean };

// Room Code entry (`/join`): where a Player without the Join QR code types the code, and
// where a join page whose code isn't live sends them back to.
export function RoomCodeEntryPage() {
  const { state } = useLocation() as { state: RoomCodeEntryState | null };

  return (
    <div style={shellStyle}>
      <div style={titleStyle}>{gameTitle}</div>
      <div style={centeredStyle}>
        <RoomCodeForm error={state?.noRoom ? NO_ROOM_COPY : null} />
      </div>
    </div>
  );
}
