import type { SocketRole } from "@yeahnah/shared";
import { useEffect } from "react";
import { socket } from "./socket";

// Declares this client's role to the server on every connection. The server uses it
// to decide which view of GameState this socket receives — in particular, whether the
// Active Clue's Answer is withheld until the Host Reveals (see viewForRole / ADR-0006).
// Re-announcing on each "connect" (not just at mount) means a Host or Board socket that
// drops and auto-reconnects reclaims its role rather than silently reverting to the
// restrictive default the server assigns every fresh connection.
export function useIdentify(role: SocketRole): void {
  useEffect(() => {
    function announce() {
      socket.emit("identify", role);
    }
    if (socket.connected) announce();
    socket.on("connect", announce);
    return () => {
      socket.off("connect", announce);
    };
  }, [role]);
}
