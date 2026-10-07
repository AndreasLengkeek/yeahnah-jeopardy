import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { roomPath } from "../roomRoutes";
import { formStyle, inputStyle, labelStyle, submitButtonStyle } from "./forms";

// Room Code entry: takes a Player to the typed Room's join page. Lower case is fine —
// codes are shown, and matched, upper case.
export function RoomCodeForm() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const normalized = code.replace(/[^a-z]/gi, "").toUpperCase();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (normalized) navigate(roomPath(normalized, "join"));
  }

  return (
    <form onSubmit={submit} style={formStyle}>
      <label htmlFor="room-code" style={labelStyle}>
        Room Code
      </label>
      <input
        id="room-code"
        value={normalized}
        onChange={(event) => setCode(event.target.value)}
        maxLength={4}
        autoCapitalize="characters"
        autoComplete="off"
        style={{ ...inputStyle, textAlign: "center", letterSpacing: ".3em" }}
      />
      <button type="submit" disabled={!normalized} style={submitButtonStyle}>
        Join
      </button>
    </form>
  );
}
