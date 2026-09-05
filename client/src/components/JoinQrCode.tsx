import { QRCodeSVG } from "qrcode.react";
import type { CSSProperties } from "react";
import { subtitleStyle } from "../theme";

const QR_SIZE = 200;
const FRAME_PADDING = 16;

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
};

const frameStyle: CSSProperties = {
  padding: FRAME_PADDING,
  borderRadius: 16,
  background: "#fff",
  lineHeight: 0,
};

const urlStyle: CSSProperties = {
  fontSize: 13,
  letterSpacing: ".04em",
  color: subtitleStyle.color,
  // Keep the fallback text no wider than the code above it, and let a long URL wrap
  // rather than stretch the Board layout.
  maxWidth: QR_SIZE + FRAME_PADDING * 2,
  textAlign: "center",
  wordBreak: "break-all",
};

// Presentational only: the caller passes the fully-built join URL — this component
// never touches window.location. The URL is shown as plain text beneath the code so
// a Player whose phone can't scan can still type it in.
export function JoinQrCode({ url }: { url: string }) {
  return (
    <div style={containerStyle}>
      <div style={frameStyle}>
        <QRCodeSVG value={url} size={QR_SIZE} aria-label={`Scan to join: ${url}`} />
      </div>
      <div style={urlStyle}>{url}</div>
    </div>
  );
}
