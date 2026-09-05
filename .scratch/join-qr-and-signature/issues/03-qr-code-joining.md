# 03: QR-code joining on the Board screen

**What to build:** The Board screen shows a QR code during the Lobby, encoding wherever the Board page is currently loaded from (so a Player can scan straight to the Join form), with the same URL printed as plain text underneath as a manual fallback. The QR code disappears once the Game starts, matching how joining itself closes at that point.

**Blocked by:** None (can start immediately, independent of Tickets 01/02)

**Status:** ready-for-agent

- [ ] A new presentational component (e.g. `JoinQrCode`) takes a join URL as a prop and renders a scannable QR graphic plus the same URL as visible plain text beneath it.
- [ ] The component itself does not read `window.location` — the caller (the Board route) builds the URL from `window.location.origin` plus the Join route's path and passes it in as a prop.
- [ ] `BoardPage.tsx` renders this component only while `state.phase === "lobby"`; it's absent once the Game starts.
- [ ] A client-side QR-code-generation dependency is added, since none of the client's current dependencies provide this.
- [ ] No server-side changes and no LAN-address auto-detection are introduced — the QR is only as correct as the URL the Board page itself was loaded from. (The Host is responsible for opening the Board via their machine's LAN-reachable address rather than `localhost` for the QR to be scannable from a phone; this is an operational note, not something the code enforces.)
- [ ] A new `JoinQrCode` component test covers: given a URL prop, it renders a QR graphic and the same URL as visible text.
