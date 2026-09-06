import type { PlayerIdentity as PlayerIdentityValue } from "@yeahnah/shared";
import { isBlankIdentity, normalizeIdentity } from "@yeahnah/shared";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { accent } from "../theme";
import { SignatureCanvas, type SignatureCanvasHandle } from "./SignatureCanvas";

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

const linkButtonStyle: CSSProperties = {
  alignSelf: "center",
  background: "transparent",
  border: 0,
  padding: 4,
  color: "#c9d2f5",
  fontSize: 13,
  textDecoration: "underline",
  cursor: "pointer",
};

type JoinMode = "draw" | "text";

// The Join form. A freehand Signature canvas is shown first, with a "type a name
// instead" link that swaps to the familiar text field. Submit stays disabled until
// there's a real result either way — at least one drawn stroke, or a non-blank trimmed
// name — reusing the shared `isBlankIdentity` rule so the client gate matches the join
// reducer's exactly.
//
// The canvas itself keeps its bitmap while text mode is showing (it's only visually
// hidden), so toggling back and forth never loses a drawing in progress.
export function JoinForm({
  onJoin,
  submitting,
  error,
}: {
  onJoin: (identity: PlayerIdentityValue) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [mode, setMode] = useState<JoinMode>("draw");
  const [name, setName] = useState("");
  const [hasDrawing, setHasDrawing] = useState(false);
  const canvasRef = useRef<SignatureCanvasHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "text") inputRef.current?.focus();
  }, [mode]);

  const canSubmit = mode === "draw" ? hasDrawing : !isBlankIdentity({ kind: "text", name });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting || !canSubmit) return;

    if (mode === "draw") {
      const image = canvasRef.current?.toDataURL() ?? "";
      if (!image) return;
      onJoin({ kind: "signature", image });
    } else {
      const identity = normalizeIdentity({ kind: "text", name });
      if (isBlankIdentity(identity)) return;
      onJoin(identity);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, width: 340, maxWidth: "100%" }}>
      <div style={{ display: mode === "draw" ? "flex" : "none", flexDirection: "column", gap: 12 }}>
        <SignatureCanvas ref={canvasRef} onContentChange={setHasDrawing} />
        <button type="button" onClick={() => setMode("text")} style={linkButtonStyle}>
          Type a name instead
        </button>
      </div>

      <div style={{ display: mode === "text" ? "flex" : "none", flexDirection: "column", gap: 12 }}>
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          maxLength={24}
          style={inputStyle}
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
        />
        <button type="button" onClick={() => setMode("draw")} style={linkButtonStyle}>
          Draw a signature instead
        </button>
      </div>

      <button type="submit" disabled={submitting || !canSubmit} style={submitButtonStyle}>
        Join
      </button>
      {error && <div style={{ color: "#ff8a7a", fontSize: 13 }}>{error}</div>}
    </form>
  );
}
