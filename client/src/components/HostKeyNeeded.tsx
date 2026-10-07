import { useState, type FormEvent } from "react";
import { NO_ROOM_COPY, WRONG_PASSCODE_COPY } from "../copy";
import type { ReclaimFailure } from "../useHostClaim";
import { CodeTiles } from "./CodeTiles";
import { centeredStyle, errorStyle, mutedColor, pillStyle, screenTitleStyle, textInputStyle } from "./forms";

const failureCopy: Record<ReclaimFailure, string> = {
  wrongPasscode: WRONG_PASSCODE_COPY,
  noRoom: NO_ROOM_COPY,
};

// The Host screen for a device without the Room's Host Key (prototype variant B on
// `prototype/rooms`): the Room Code, a hint to open the Host link, and the Room Passcode
// escape hatch. Nothing of the Game shows here.
export function HostKeyNeeded({
  code,
  onReclaim,
}: {
  code: string;
  onReclaim: (passcode: string, onFailure: (reason: ReclaimFailure) => void) => void;
}) {
  const [passcode, setPasscode] = useState("");
  const [reclaiming, setReclaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reclaim(event: FormEvent) {
    event.preventDefault();
    setReclaiming(true);
    setError(null);
    onReclaim(passcode, (reason) => {
      setReclaiming(false);
      setError(failureCopy[reason]);
    });
  }

  return (
    <div style={{ ...centeredStyle, gap: 20 }}>
      <CodeTiles code={code} size={48} />
      <div style={{ ...screenTitleStyle, fontSize: 26 }}>You're not hosting this Room here</div>
      <div style={{ color: mutedColor, maxWidth: 380 }}>
        Open the Host link on this device, or prove you run the server:
      </div>
      <form onSubmit={reclaim} style={{ display: "flex", gap: 8, width: 360, maxWidth: "100%" }}>
        <input
          type="password"
          aria-label="Room Passcode"
          placeholder="Room Passcode"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          style={{ ...textInputStyle, flex: 1 }}
        />
        <button type="submit" disabled={reclaiming} style={pillStyle("primary")}>
          Reclaim
        </button>
      </form>
      {error && (
        <div role="alert" style={errorStyle}>
          {error}
        </div>
      )}
    </div>
  );
}
