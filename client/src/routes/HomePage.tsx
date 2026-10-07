import type { CreateRoomResult } from "@yeahnah/shared";
import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { centeredStyle, errorStyle, pillStyle, quietLinkStyle, textInputStyle } from "../components/forms";
import { RoomCodeForm } from "../components/RoomCodeForm";
import { WRONG_PASSCODE_COPY } from "../copy";
import { hostKeys } from "../roomStorage";
import { roomPath } from "../roomRoutes";
import { socket } from "../socket";
import { gameTitle, shellStyle, titleStyle } from "../theme";

// Home (`/`), code-first: joining a Room by its code is the one main action. Hosting is a
// quiet link that opens the Room Passcode field — create a Room and land on its Host
// screen, already its Host.
export function HomePage() {
  const navigate = useNavigate();
  const [hosting, setHosting] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function createRoom(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    socket.emit("createRoom", passcode, (result: CreateRoomResult) => {
      setCreating(false);
      if (!result.ok) {
        setError(
          result.reason === "atCapacity"
            ? "Every Room slot is taken right now — try again in a bit."
            : WRONG_PASSCODE_COPY,
        );
        return;
      }
      hostKeys.set(result.code, result.hostKey);
      navigate(roomPath(result.code, "host"));
    });
  }

  return (
    <div style={shellStyle}>
      <div style={titleStyle}>{gameTitle}</div>
      <div style={centeredStyle}>
        <RoomCodeForm />
        <div
          style={{
            marginTop: 32,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {!hosting ? (
            <button type="button" onClick={() => setHosting(true)} style={quietLinkStyle}>
              Hosting tonight? Create a Room →
            </button>
          ) : (
            <form onSubmit={createRoom} style={{ display: "flex", gap: 8, width: 360, maxWidth: "100%" }}>
              <input
                type="password"
                aria-label="Room Passcode"
                placeholder="Room Passcode"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                autoFocus
                style={{ ...textInputStyle, flex: 1 }}
              />
              <button type="submit" disabled={creating} style={pillStyle("ghost")}>
                Create
              </button>
            </form>
          )}
          {error && (
            <div role="alert" style={errorStyle}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
