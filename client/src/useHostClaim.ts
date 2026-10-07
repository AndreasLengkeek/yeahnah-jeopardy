import type { IdentifyResult } from "@yeahnah/shared";
import { useEffect, useState } from "react";
import { clearStoredHostKey, getStoredHostKey } from "./hostKey";
import { socket } from "./socket";

export type HostClaim = "claiming" | IdentifyResult;

// Claims Host of Room `code` on every connection, with whatever Host Key this device
// remembers for that Room (possibly none) — the Host-screen counterpart of
// useIdentify. A remembered key the Room rejects is forgotten. The Room-ended notice
// turns the claim to "ended", as useIdentify's status.
export function useHostClaim(code: string): HostClaim {
  const [claim, setClaim] = useState<HostClaim>("claiming");

  useEffect(() => {
    // A fresh connection starts bound to no Room, so the Host screen goes back to
    // "claiming" (showing nothing of the Game) until this claim is answered — never
    // rendering a redacted Board in the meantime.
    function announce() {
      setClaim("claiming");
      const hostKey = getStoredHostKey(code) ?? undefined;
      socket.emit("identify", { code, role: "host", hostKey }, (result: IdentifyResult) => {
        if (result === "rejected" && hostKey !== undefined && getStoredHostKey(code) === hostKey) {
          clearStoredHostKey(code);
        }
        setClaim(result);
      });
    }
    function ended() {
      setClaim("ended");
    }
    if (socket.connected) announce();
    socket.on("connect", announce);
    socket.on("roomEnded", ended);
    return () => {
      socket.off("connect", announce);
      socket.off("roomEnded", ended);
    };
  }, [code]);

  return claim;
}
