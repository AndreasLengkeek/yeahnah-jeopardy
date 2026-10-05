import type { CSSProperties } from "react";
import { accent, gameTitle, subtitleStyle, titleStyle } from "../theme";

const headerStyle: CSSProperties = { position: "relative", flex: "none", minHeight: 34 };
const cornerActionsStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 8,
};
const subtitleCornerStyle: CSSProperties = { ...subtitleStyle };
const actionButtonStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: 999,
  border: `1px solid ${accent}`,
  background: "transparent",
  color: accent,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const soundTogglesStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  display: "flex",
  gap: 8,
};
const soundToggleStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 34,
  height: 34,
  padding: 0,
  borderRadius: 999,
  border: `1px solid ${accent}`,
  background: "transparent",
  color: accent,
  cursor: "pointer",
};

// Icon paths for the two Board Sound parts, drawn on a 24×24 stroke grid.
const musicIconPath = "M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z";
const effectsIconPath = "M11 5 6 9H2v6h4l5 4V5z M15.5 8.5a5 5 0 0 1 0 7 M19 5a10 10 0 0 1 0 14";

function SoundToggle({
  part,
  iconPath,
  isMuted,
  onToggle,
}: {
  part: string;
  iconPath: string;
  isMuted: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      aria-label={isMuted ? `Unmute ${part}` : `Mute ${part}`}
      aria-pressed={isMuted}
      onClick={onToggle}
      style={{ ...soundToggleStyle, opacity: isMuted ? 0.55 : 1 }}
      type="button"
    >
      <svg
        aria-hidden="true"
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={iconPath} />
        {isMuted && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}

interface HeaderProps {
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  isBoardMusicMuted?: boolean;
  onToggleBoardMusic?: () => void;
  isBoardEffectsMuted?: boolean;
  onToggleBoardEffects?: () => void;
}

export function Header({
  subtitle,
  action,
  isBoardMusicMuted,
  onToggleBoardMusic,
  isBoardEffectsMuted,
  onToggleBoardEffects,
}: HeaderProps) {
  return (
    <div style={headerStyle}>
      {onToggleBoardMusic &&
        typeof isBoardMusicMuted === "boolean" &&
        onToggleBoardEffects &&
        typeof isBoardEffectsMuted === "boolean" && (
          <div style={soundTogglesStyle}>
            <SoundToggle
              part="Board Music"
              iconPath={musicIconPath}
              isMuted={isBoardMusicMuted}
              onToggle={onToggleBoardMusic}
            />
            <SoundToggle
              part="Board Effects"
              iconPath={effectsIconPath}
              isMuted={isBoardEffectsMuted}
              onToggle={onToggleBoardEffects}
            />
          </div>
        )}
      <div style={titleStyle}>{gameTitle}</div>
      {(action || subtitle) && (
        <div style={cornerActionsStyle}>
          {action && (
            <button type="button" onClick={action.onClick} style={actionButtonStyle}>
              {action.label}
            </button>
          )}
          {subtitle && <div style={subtitleCornerStyle}>{subtitle}</div>}
        </div>
      )}
    </div>
  );
}
