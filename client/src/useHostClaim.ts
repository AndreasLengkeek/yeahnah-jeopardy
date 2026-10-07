import type { IdentifyResult, ReclaimHostResult } from "@yeahnah/shared";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearStoredHostKey, getStoredHostKey, storeHostKey } from "./hostKey";
import { socket } from "./socket";

export type HostClaim = "claiming" | IdentifyResult;

// Why reclaiming Host with the Room Passcode failed.
export type ReclaimFailure = Extract<ReclaimHostResult, { ok: false }>["reason"];

// Claims Host of Room `code` on every connection, with whatever Host Key this device
// remembers for that Room (possibly none) — the Host-screen counterpart of
// useIdentify. A remembered key the Room rejects is forgotten. The Room-ended notice
// turns the claim to "ended", as useIdentify's status.
//
// A Host link (`/CODE/host#<hostKey>`) hands this device the key in the fragment: it's
// remembered for the Room before the claim goes out, then cleared from the address so a
// screen share or screenshot doesn't leak it.
//
// `reclaim(passcode)` is for a device without the key (Host Key needed): the Room
// Passcode gets the Room's existing Host Key back, which is remembered, and the claim
// becomes accepted; otherwise `onFailure` hears why not.
export function useHostClaim(code: string): {
  claim: HostClaim;
  reclaim: (passcode: string, onFailure: (reason: ReclaimFailure) => void) => void;
} {
  const [claim, setClaim] = useState<HostClaim>("claiming");
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  // Declared before the claim's effect, so on first load it runs first.
  useEffect(() => {
    const linkKey = hash.slice(1);
    if (!linkKey) return;
    storeHostKey(code, decodeURIComponent(linkKey));
    navigate({ pathname, search }, { replace: true });
  }, [code, pathname, search, hash, navigate]);

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

  const reclaim = useCallback(
    (passcode: string, onFailure: (reason: ReclaimFailure) => void) => {
      socket.emit("reclaimHost", { code, passcode }, (result: ReclaimHostResult) => {
        if (!result.ok) {
          onFailure(result.reason);
          return;
        }
        storeHostKey(code, result.hostKey);
        setClaim("accepted");
      });
    },
    [code],
  );

  return { claim, reclaim };
}
