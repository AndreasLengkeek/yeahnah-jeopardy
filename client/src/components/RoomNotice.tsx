import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formStyle, labelStyle } from "./forms";

// A plain message in place of a Room screen — no such Room, or not this Room's Host —
// with a way back to the home page.
export function RoomNotice({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...formStyle, textAlign: "center" }}>
      <div style={{ fontWeight: 800, fontSize: 20 }}>{children}</div>
      <Link to="/" style={labelStyle}>
        Back to the home page
      </Link>
    </div>
  );
}
