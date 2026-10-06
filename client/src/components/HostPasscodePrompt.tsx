import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { accent } from "../theme";

const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: 340,
  maxWidth: "100%",
  alignSelf: "center",
  marginTop: 40,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "#c9d2f5",
  textAlign: "center",
};

const inputStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  fontSize: 16,
};

const submitButtonStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 999,
  border: 0,
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  background: accent,
  color: "#07103f",
  cursor: "pointer",
};

// Shown in place of the whole Host screen until this device proves the Host Passcode
// (ADR-0014). Styled to match the Join form.
export function HostPasscodePrompt({
  onSubmit,
  wrongPasscode,
}: {
  onSubmit: (passcode: string) => void;
  wrongPasscode: boolean;
}) {
  const [passcode, setPasscode] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (passcode) onSubmit(passcode);
  }

  return (
    <form onSubmit={submit} style={formStyle}>
      <label htmlFor="host-passcode" style={labelStyle}>
        Host Passcode
      </label>
      <input
        id="host-passcode"
        type="password"
        value={passcode}
        onChange={(event) => setPasscode(event.target.value)}
        autoFocus
        style={inputStyle}
      />
      <button type="submit" disabled={!passcode} style={submitButtonStyle}>
        Enter
      </button>
      {wrongPasscode && (
        <div role="alert" style={{ color: "#ff8a7a", fontSize: 13 }}>
          That isn't the Host Passcode. Try again.
        </div>
      )}
    </form>
  );
}
