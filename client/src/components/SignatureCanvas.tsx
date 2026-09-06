import type { CSSProperties, ForwardedRef, PointerEvent as ReactPointerEvent } from "react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { accent } from "../theme";

export interface SignatureCanvasHandle {
  // Exports the current drawing as a small, downscaled PNG data URL — or an empty string
  // if the canvas is untouched, so a blank Signature never reaches the join reducer.
  toDataURL: () => string;
}

const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 170;
// Longest edge of the exported image. The drawing is scaled down to fit inside this so
// the Signature that rides along with every `join` payload stays a few KB, not a
// full-resolution PNG.
const EXPORT_MAX_EDGE = 180;

const canvasStyle: CSSProperties = {
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  maxWidth: "100%",
  // Keeps the drawing area proportional if maxWidth shrinks it below CANVAS_WIDTH.
  aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(255,255,255,.06)",
  touchAction: "none",
  cursor: "crosshair",
};

function clearButtonStyle(enabled: boolean): CSSProperties {
  return {
    alignSelf: "flex-end",
    background: "transparent",
    border: 0,
    padding: 0,
    color: enabled ? accent : "rgba(255,255,255,.4)",
    fontSize: 12,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    cursor: enabled ? "pointer" : "default",
  };
}

// The freehand drawing surface for the Join form. This is browser-API-bound glue —
// pointer events in, a downscaled PNG out — and is deliberately left unit-untested, the
// same call made for `socket.ts` and the localStorage wrappers in `playerIdentity.ts`.
// All of its testable logic (does the form let you submit?) lives in `JoinForm`, which
// only consumes the `onContentChange` signal and the `toDataURL` handle.
export const SignatureCanvas = forwardRef(function SignatureCanvas(
  // `onContentChange` fires whenever the canvas crosses between blank and non-blank, so
  // the surrounding form can gate its submit button without reaching into the canvas.
  { onContentChange }: { onContentChange?: (hasContent: boolean) => void },
  ref: ForwardedRef<SignatureCanvasHandle>,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasContentRef = useRef(false);
  const [hasContent, setHasContent] = useState(false);
  // A snapshot taken just before the most recent stroke started, plus whether the
  // canvas had content at that point — restored wholesale by Undo. Single-level: a new
  // stroke overwrites this snapshot, so only the most recent stroke is ever undoable.
  const undoRef = useRef<{ snapshot: ImageData; hadContent: boolean } | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  function context() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function markContent(next: boolean) {
    if (hasContentRef.current === next) return;
    hasContentRef.current = next;
    setHasContent(next);
    onContentChange?.(next);
  }

  function pointFromEvent(canvas: HTMLCanvasElement, event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  function startStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = context();
    if (!canvas || !ctx) return;
    undoRef.current = {
      snapshot: ctx.getImageData(0, 0, canvas.width, canvas.height),
      hadContent: hasContentRef.current,
    };
    setCanUndo(true);
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;

    const { x, y } = pointFromEvent(canvas, event);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Nudge so a single tap still paints a visible dot, which counts as a stroke.
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    markContent(true);
  }

  function extendStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = context();
    if (!drawingRef.current || !canvas || !ctx) return;
    const { x, y } = pointFromEvent(canvas, event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture(event.pointerId);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = context();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingRef.current = false;
    undoRef.current = null;
    setCanUndo(false);
    markContent(false);
  }

  function undo() {
    const canvas = canvasRef.current;
    const ctx = context();
    if (!canvas || !ctx || !undoRef.current) return;
    ctx.putImageData(undoRef.current.snapshot, 0, 0);
    const hadContent = undoRef.current.hadContent;
    undoRef.current = null;
    setCanUndo(false);
    drawingRef.current = false;
    markContent(hadContent);
  }

  useImperativeHandle(ref, () => ({
    toDataURL: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasContentRef.current) return "";

      const scale = Math.min(1, EXPORT_MAX_EDGE / Math.max(CANVAS_WIDTH, CANVAS_HEIGHT));
      const out = document.createElement("canvas");
      out.width = Math.round(CANVAS_WIDTH * scale);
      out.height = Math.round(CANVAS_HEIGHT * scale);
      const outCtx = out.getContext("2d");
      if (!outCtx) return "";
      outCtx.drawImage(canvas, 0, 0, out.width, out.height);
      return out.toDataURL("image/png");
    },
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onPointerDown={startStroke}
        onPointerMove={extendStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        style={canvasStyle}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 16 }}>
        <button type="button" onClick={undo} disabled={!canUndo} style={clearButtonStyle(canUndo)}>
          Undo
        </button>
        <button type="button" onClick={clear} disabled={!hasContent} style={clearButtonStyle(hasContent)}>
          Clear
        </button>
      </div>
    </div>
  );
});
