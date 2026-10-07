import { Header } from "../components/Header";
import { RoomCodeForm } from "../components/RoomCodeForm";
import { shellStyle } from "../theme";

// Room Code entry (`/join`): where a Player without the Join QR code types the code.
export function RoomCodeEntryPage() {
  return (
    <div style={shellStyle}>
      <Header />
      <RoomCodeForm />
    </div>
  );
}
