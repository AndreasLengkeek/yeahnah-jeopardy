# 02: Zoom transition, Tile ↔ Clue Card

**What to build:** Selecting a Tile animates the Clue Card zooming in from that Tile's on-screen position on the Board until it fills the screen. Leaving a resolved Active Clue (returning to the Board) reverses the zoom, animating the Clue Card back down toward roughly that Tile's position. Applies identically on the Board display and the Host control panel.

The animation is purely presentational, layered on state the client already receives — it never gates game state or blocks interactivity. Host action buttons (e.g. Reveal) and buzzed-player status remain clickable and visible throughout; clicking Reveal mid-animation still takes effect immediately, since the server already committed the state change.

Target roughly 250–400ms for the transition — quick and snappy, not a cinematic wait. Exact easing/duration is an implementation-time call within that range.

**Blocked by:** None (can start immediately) — this wraps the Board ↔ Clue Card transition boundary and doesn't depend on the Clue Card's internal layout (ticket 01) or its reveal behavior (ticket 03).

**Status:** ready-for-agent

- [ ] Selecting an unused Tile zooms the Clue Card in from that Tile's Board position to fullscreen.
- [ ] Leaving a resolved Active Clue reverse-zooms the Clue Card back down toward the Board.
- [ ] Transition duration is roughly 250–400ms, not a long cinematic wait.
- [ ] Host action buttons and buzzed-player status remain visible and clickable throughout the animation — no control is blocked or delayed by an in-progress transition.
- [ ] Applies identically on both the Board and Host views.
- [ ] Verified manually in a browser. If a pure geometry/transform helper (e.g. source-rect → destination-rect) naturally falls out of the implementation, it may optionally get a small unit test — not mandated.
