import type { CreateRoomResult } from "@yeahnah/shared";
import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { errorStyle, formStyle, inputStyle, labelStyle, submitButtonStyle } from "../components/forms";
import { Header } from "../components/Header";
import { RoomCodeForm } from "../components/RoomCodeForm";
import { storeHostKey } from "../hostKey";
import { roomPath } from "../roomRoutes";
import { socket } from "../socket";
import { shellStyle } from "../theme";

// Home (`/`): join a Room by its code, or — holding the Room Passcode — create one and
// land on its Host screen, already its Host.
export function HomePage() {
  const navigate = useNavigate();
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
        setError("That isn't the Room Passcode. Try again.");
        return;
      }
      storeHostKey(result.code, result.hostKey);
      navigate(roomPath(result.code, "host"));
    });
  }

  return (
    <div style={shellStyle}>
      <Header />
      <RoomCodeForm />
      <form onSubmit={createRoom} style={formStyle}>
        <label htmlFor="room-passcode" style={labelStyle}>
          Room Passcode
        </label>
        <input
          id="room-passcode"
          type="password"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          style={inputStyle}
        />
        <button type="submit" disabled={creating} style={submitButtonStyle}>
          Create a Room
        </button>
        {error && (
          <div role="alert" style={errorStyle}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
