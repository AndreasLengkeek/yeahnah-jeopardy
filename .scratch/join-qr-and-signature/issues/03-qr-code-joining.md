# 03: QR-code joining on the Board screen

**What to build:** The Board screen shows a QR code during the Lobby, encoding wherever the Board page is currently loaded from (so a Player can scan straight to the Join form), with the same URL printed as plain text underneath as a manual fallback. The QR code disappears once the Game starts, matching how joining itself closes at that point.

**Blocked by:** None (can start immediately, independent of Tickets 01/02)

**Status:** done

- [x] A new presentational component (e.g. `JoinQrCode`) takes a join URL as a prop and renders a scannable QR graphic plus the same URL as visible plain text beneath it.
- [x] The component itself does not read `window.location` — the caller (the Board route) builds the URL from `window.location.origin` plus the Join route's path and passes it in as a prop.
- [x] `BoardPage.tsx` renders this component only while `state.phase === "lobby"`; it's absent once the Game starts.
- [x] A client-side QR-code-generation dependency is added, since none of the client's current dependencies provide this.
- [x] No server-side changes and no LAN-address auto-detection are introduced — the QR is only as correct as the URL the Board page itself was loaded from. (The Host is responsible for opening the Board via their machine's LAN-reachable address rather than `localhost` for the QR to be scannable from a phone; this is an operational note, not something the code enforces.)
- [x] A new `JoinQrCode` component test covers: given a URL prop, it renders a QR graphic and the same URL as visible text.

---

**Implementation notes:**

- Added `qrcode.react@4.2.0` to `client` (renders `QRCodeSVG` — an `<svg role="img">`, easy to assert on).
- `client/src/components/JoinQrCode.tsx` — presentational; `{ url }` prop, white-framed `QRCodeSVG` + the URL as `word-break: break-all` text beneath. `aria-label="Scan to join: <url>"` gives the graphic an accessible name; muted text colour reused from `theme.subtitleStyle`.
- `client/src/routes/BoardPage.tsx` — builds `joinUrl = \`${window.location.origin}/join\`` inside the component body and renders `<JoinQrCode>` as a sibling of `<Lobby>` inside the `phase === "lobby"` branch only (no layout changes to the Lobby screen itself).
- Tests: `client/src/components/JoinQrCode.test.tsx` (2). No route-level test — the client has no `vi.mock`/route-test precedent and the ticket scoped the test to the component.
- Not done: live visual check in the running app — covered by tests + production build only.
