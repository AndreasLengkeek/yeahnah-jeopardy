import { useParams } from "react-router-dom";

// The Room Code from a Room screen's address (`/:code/…`), upper case whatever was typed.
export function useRoomCode(): string {
  const { code = "" } = useParams();
  return code.toUpperCase();
}
