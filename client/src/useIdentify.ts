import type { IdentifyResult, SocketRole } from "@yeahnah/shared";
import { useEffect, useState } from "react";
import { socket } from "./socket";

export type IdentifyStatus = "identifying" | IdentifyResult;

// Binds this client to Room `code` with `role` on every connection. The server sends
// the Room's state only to sockets bound to it, redacted for the role (in particular,
// withholding the Active Clue's Answer until the Host Reveals: viewForRole /
// ADR-0006). Re-announcing on each "connect" (not just at mount) means a socket that
// drops and auto-reconnects gets back into its Room, since every fresh connection
// starts bound to none. The Host screen uses useHostClaim instead, since its claim
// carries the Host Key (ADR-0015).
export function useIdentify(code: string, role: SocketRole): IdentifyStatus {
  const [status, setStatus] = useState<IdentifyStatus>("identifying");

  useEffect(() => {
    function announce() {
      socket.emit("identify", { code, role }, (result: IdentifyResult) => setStatus(result));
    }
    if (socket.connected) announce();
    socket.on("connect", announce);
    return () => {
      socket.off("connect", announce);
    };
  }, [code, role]);

  return status;
}
