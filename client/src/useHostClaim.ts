import type { IdentifyResult } from "@yeahnah/shared";
import { useCallback, useEffect, useState } from "react";
import { clearStoredHostPasscode, getStoredHostPasscode, storeHostPasscode } from "./hostPasscode";
import { socket } from "./socket";

export type HostClaim =
  | { status: "claiming" }
  | { status: "accepted" }
  // `wrongPasscode` marks a rejection of a passcode the Host just typed, as opposed to
  // the device having none remembered (or a remembered one that's since changed).
  | { status: "prompt"; wrongPasscode: boolean };

// Claims the Host role on every connection — the Host-screen counterpart of
// useIdentify. There's no separate "is a passcode required?" check: the claim always
// carries whatever passcode this device remembers (possibly none), and only a
// rejection brings up the prompt. A remembered passcode that's rejected (it's been
// changed since) is forgotten; a typed one is remembered once accepted.
export function useHostClaim(): { claim: HostClaim; submitPasscode: (passcode: string) => void } {
  const [claim, setClaim] = useState<HostClaim>({ status: "claiming" });

  const claimWith = useCallback((passcode: string | undefined, source: "remembered" | "typed") => {
    socket.emit("identify", "host", passcode, (result: IdentifyResult) => {
      if (result === "accepted") {
        if (passcode !== undefined) storeHostPasscode(passcode);
        setClaim({ status: "accepted" });
        return;
      }

      if (passcode !== undefined && getStoredHostPasscode() === passcode) clearStoredHostPasscode();
      setClaim({ status: "prompt", wrongPasscode: source === "typed" });
    });
  }, []);

  useEffect(() => {
    // Every fresh connection starts on the redacted Player view, so the Host screen
    // goes back to "claiming" (showing nothing of the Game) until this claim is
    // answered — never rendering a redacted Board, or a Game the passcode no longer
    // unlocks, in the meantime.
    function announce() {
      setClaim({ status: "claiming" });
      claimWith(getStoredHostPasscode() ?? undefined, "remembered");
    }
    if (socket.connected) announce();
    socket.on("connect", announce);
    return () => {
      socket.off("connect", announce);
    };
  }, [claimWith]);

  const submitPasscode = useCallback((passcode: string) => claimWith(passcode, "typed"), [claimWith]);

  return { claim, submitPasscode };
}
