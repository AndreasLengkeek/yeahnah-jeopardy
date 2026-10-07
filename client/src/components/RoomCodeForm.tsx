import { normalizeRoomCode, ROOM_CODE_LENGTH } from "@yeahnah/shared";
import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { roomPath } from "../roomRoutes";
import { CodeTiles } from "./CodeTiles";
import { errorStyle, pillStyle, screenTitleStyle } from "./forms";

// Room Code entry, code-first: the typed code shows in Board Tiles, and Join takes
// the Player to that Room's join page. Lower case is fine — codes are letters only, shown
// and matched upper case. An invisible input lies over the Tiles, so tapping them brings
// up the keyboard.
export function RoomCodeForm({ error }: { error?: string | null }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (code) navigate(roomPath(code, "join"));
  }

  return (
    <form
      onSubmit={submit}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, maxWidth: "100%" }}
    >
      <div style={screenTitleStyle}>Enter your Room Code</div>
      <label style={{ position: "relative", cursor: "text" }}>
        <CodeTiles code={code} size={68} label={null} />
        <input
          aria-label="Room Code"
          value={code}
          onChange={(event) =>
            setCode(
              normalizeRoomCode(event.target.value)
                .replace(/[^A-Z]/g, "")
                .slice(0, ROOM_CODE_LENGTH),
            )
          }
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          // 16px keeps iOS from zooming in on focus.
          style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, fontSize: 16 }}
        />
      </label>
      {error && (
        <div role="alert" style={errorStyle}>
          {error}
        </div>
      )}
      <button type="submit" disabled={!code} style={{ ...pillStyle("primary"), minWidth: 220 }}>
        Join
      </button>
    </form>
  );
}
