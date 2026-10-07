import type { RoomInfo } from "@yeahnah/shared";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { roomPath } from "../roomRoutes";
import { accent, palette, subtitleStyle } from "../theme";

// The Host screen's Room panel (prototype variant C on `prototype/rooms`): the Room
// Code and join address, who's here now, and a way to open the Board. Each part is a
// RoomPanelSection; later sections (the Host link, the danger zone) slot in the same way.

const muted = "#c9d2f5";

const panelStyle: CSSProperties = {
  boxSizing: "border-box",
  padding: 18,
  borderRadius: 16,
  background: palette.header,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  paddingBottom: 16,
  borderBottom: "1px solid rgba(255,255,255,.1)",
};

const codeStyle: CSSProperties = {
  fontFamily: "'Zilla Slab', Georgia, serif",
  fontSize: 44,
  fontWeight: 700,
  color: accent,
  letterSpacing: ".14em",
};

const ghostButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.3)",
  fontWeight: 800,
  fontSize: 12,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,.85)",
  textDecoration: "none",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const stripStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  width: "100%",
  padding: "8px 16px",
  borderRadius: 12,
  border: 0,
  background: palette.header,
  color: muted,
  fontSize: 12,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  cursor: "pointer",
};

export function RoomPanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={sectionStyle}>
      <div style={subtitleStyle}>{title}</div>
      {children}
    </section>
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function HereNow({ info }: { info: RoomInfo | null }) {
  if (!info) return <div style={{ color: muted, fontSize: 14 }}>Counting…</div>;
  const rows: Array<[string, string]> = [
    ["👑", plural(info.hosts, "Host device", "Host devices")],
    ["📺", plural(info.boards, "Board", "Boards")],
    ["📱", plural(info.players, "Player", "Players")],
  ];
  return (
    <div style={{ fontSize: 14, lineHeight: 1.7 }}>
      {rows.map(([icon, label]) => (
        <div key={label}>
          <span aria-hidden="true">{icon} </span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

interface RoomPanelProps {
  code: string;
  info: RoomInfo | null;
  // Further RoomPanelSections, shown after the built-in ones.
  children?: ReactNode;
}

function PanelBody({ code, info, children, style }: RoomPanelProps & { style: CSSProperties }) {
  return (
    <aside aria-label="Room" style={{ ...panelStyle, ...style }}>
      <RoomPanelSection title="Room">
        <div style={codeStyle}>{code}</div>
        <div style={{ color: muted, fontSize: 13 }}>Players join at {`${window.location.host}/join`}</div>
      </RoomPanelSection>
      <RoomPanelSection title="Here now">
        <HereNow info={info} />
        <a href={roomPath(code, "board")} target="_blank" rel="noopener" style={ghostButtonStyle}>
          Open Board ↗
        </a>
      </RoomPanelSection>
      {children}
    </aside>
  );
}

// `collapsed`: during play the panel folds into a slim strip showing the Room Code,
// expanding on demand, so the Clue controls keep their space. It folds back each time
// play resumes.
export function RoomPanel({ collapsed, ...props }: RoomPanelProps & { collapsed: boolean }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [collapsed]);

  if (!collapsed) return <PanelBody {...props} style={{ width: 300, maxWidth: "100%", flex: "none" }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "none" }}>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} style={stripStyle}>
        <span>
          Room <strong style={{ color: accent, fontSize: 16, letterSpacing: ".14em" }}>{props.code}</strong>
        </span>
        <span aria-hidden="true">{expanded ? "Hide ▴" : "More ▾"}</span>
      </button>
      {expanded && <PanelBody {...props} style={{ width: "100%" }} />}
    </div>
  );
}
