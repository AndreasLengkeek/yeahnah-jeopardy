# Clue Card zoom, layout, and reveal flip

Status: ready-for-agent

## Problem Statement

Right now, selecting a Tile just swaps the Board grid out for the Active Clue display with no transition — an abrupt cut rather than a moment. Once there, the Category, Value, Clue text, and Answer are all centered in one stacked block, so the Clue text (the thing everyone actually needs to read, often from across a room on a projector) doesn't get much room, and the Answer just appears inline once revealed rather than feeling like a distinct reveal. For a party game meant to feel like a game show, the experience is flatter and less exciting than it should be.

## Solution

Give the Active Clue its own fullscreen presentation — the **Clue Card** — with real motion and a clearer layout. Selecting a Tile zooms the Clue Card in from that Tile's position on the Board until it fills the screen; leaving a resolved Clue reverse-zooms it back down. On the Clue Card itself, Category and Value sit in their own row at the top, out of the way, so the Clue text can run larger and fill most of the card. When the Host reveals the Answer, the Clue Card flips over to its Answer face rather than the Answer just appearing inline. Buzzed-player status and the Host's action buttons stay fixed and clickable throughout — the animation is polish layered on top of state that's already committed on the server, never a gate on it.

## User Stories

1. As a Host, I want the Clue Card to zoom in from the selected Tile's position on the Board until it fills the screen, so that selecting a Tile feels like a deliberate, exciting transition rather than an abrupt swap.
2. As anyone viewing the Board display, I want to see the same zoom-in transition on the projector, so that the Board feels as polished as the Host's own view.
3. As a Host, I want the Clue Card to zoom back down into its Board position when I leave a resolved Clue, so that the transition feels symmetric and I land back on the Board where I expect to.
4. As anyone viewing the Clue Card, I want the Category and Value shown in their own row at the top, so that they're clearly visible without competing with the Clue text for space.
5. As anyone viewing the Clue Card, I want the Clue text to be larger and fill more of the card, so that it's easy to read at a distance, e.g. on a projector.
6. As a Host, I want the Answer to appear on its own face of the Clue Card rather than sharing space with the Clue text, so that the Clue and Answer don't visually compete before I choose to reveal.
7. As anyone viewing the Clue Card, I want the card to visibly flip over when the Host reveals the Answer, so that the reveal feels like a deliberate game-show moment rather than text just appearing in place.
8. As anyone viewing the Clue Card after a reveal, I want the Category and Value to still be visible on the Answer face in the same position, so that I don't lose context on which Clue is being judged.
9. As a Host, I want my action buttons (Reveal, and eventually Correct/Incorrect) and the buzzed-player status to stay fixed in place and clickable throughout the zoom and flip animations, so that I'm never blocked from acting by an animation still in progress.
10. As a Host, I want clicking Reveal to take effect immediately regardless of animation state, so that a slow animation frame never desyncs the display from the game state the server already committed.
11. As anyone viewing the Board when no Clue is Active, I want the Tile grid to look and behave exactly as it does today, so that this redesign is scoped to the Active Clue experience and doesn't alter Board browsing.
12. As a Player, I want my phone view to be completely unaffected by this redesign, so that Buzzing in stays simple and fast no matter what's changing on the Board or Host screens.
13. As a Host or Board viewer, I want the zoom and flip animations to be quick rather than a long cinematic wait, so that gameplay pace isn't slowed down by transitions.
14. As a Host or Board viewer, I want the existing visual language (Cobalt & Mint theme, yellow accent, embossed Tile style) to stay consistent between the Board's Tiles and the zoomed Clue Card, so the whole app still feels like one cohesive game.

## Implementation Decisions

- **Purely client-side, purely presentational.** No changes to `shared/gameEngine`, `GameState`/`ActiveClue` shape, or the server's Socket.io wiring. This spec is layered entirely on state the client already receives (`activeClue.revealed`, `board`, `players`) — consistent with `ADR-0002`'s principle that the Board/Host split (and, by extension, any animation on top of it) is presentational only, never a second source of truth.
- **New domain term, no new state.** "Clue Card" is now defined in root `CONTEXT.md`, distinct from `Tile`: the Clue Card is the fullscreen display of the Active Clue; a Tile is a Board grid cell. Use "Clue Card" in code and docs rather than reusing "tile" for the fullscreen clue display.
- **Zoom transition.** Selecting a Tile animates the Clue Card in from that Tile's on-screen position/size to fullscreen; leaving a resolved Clue reverses it. This requires the Board (or its parent) to expose the selected Tile's bounding rect to whatever renders the transition — likely a FLIP-style approach (capture the source rect, then animate transform from source to destination). The Board grid's own Tile styling/behavior is otherwise unchanged.
- **Clue Card layout.** Category (top-left) and Value (top-right) sit in a fixed header row at the top of the card; the Clue/Answer text fills the remaining space, large and centered. This restores the layout already present in the original imported design canvas (`docs/design/Jeopardy Board.dc.html`), which the current port (`ActiveClue.tsx`) had drifted away from by centering everything as one stacked block.
- **Flip mechanics — single Clue Card, two faces** (see `ADR-0004`). The same card that zoomed in from the Board flips (front → back) to reveal the Answer, rather than a second card appearing. The Category/Value header, buzzed-player status text, and the Host's action buttons are fixed chrome outside the flipping face — they don't rotate, are never hidden mid-animation, and stay clickable throughout.
- **Applies to both Board and Host views identically**, per `ADR-0002` — both already derive from the same broadcast `GameState`; only the Host's additional footer controls differ, as they do today. The Player phone view (`JoinPage.tsx`) is untouched — it has no Board/Clue Card rendering today and this spec doesn't add any.
- **Timing.** Target roughly 250–400ms for both the zoom and the flip — snappy, not cinematic. Exact duration/easing is an implementation-time call as long as it stays in that range; nothing about it blocks or delays Host controls or game state.
- **Future compatibility.** The Host's judging controls (Correct/Incorrect) from the not-yet-built judging ticket (`03-judging-scoring-and-clue-resolution`) should land in the same fixed-chrome footer area as the Reveal button, per `ADR-0004` — this spec's card structure is designed so that ticket doesn't need to revisit it.

## Testing Decisions

- No changes to `shared/gameEngine` or the server, so no new engine/server unit tests are needed for this spec.
- No component-level automated tests are required for the zoom/flip visual behavior — consistent with this project's existing precedent (the original spec's Testing Decisions: "No component-level tests are planned for the three React views... manual verification in a browser"). Verify manually in a browser: tile-to-fullscreen zoom-in, reverse zoom-out on leaving a resolved Clue, the Category/Value-top layout with larger Clue text, the flip to the Answer face on reveal, and that Host controls and buzzed-player status remain visible and clickable throughout every animation.
- If the implementation extracts a pure geometry/transform helper (e.g. a FLIP-technique function computing a zoom transform from a source rect to a destination rect), that's a reasonable candidate for a small unit test since it's pure input → output — but this isn't a mandated seam; only add it if the implementation naturally produces such a pure function.
- Prior art: `shared/gameEngine.test.ts` and `server/src/server.test.ts` are the project's existing test precedent; neither applies here since no engine or server code changes.

## Out of Scope

- Any change to `shared/gameEngine`, `GameState`/`ActiveClue` shape, or server Socket.io wiring.
- The Player phone view (`JoinPage.tsx`) — untouched by this spec.
- The Host's judging controls (Correct/Incorrect) themselves — that's ticket `03-judging-scoring-and-clue-resolution`, not yet implemented. This spec only reserves their eventual position (fixed footer chrome, per `ADR-0004`).
- Board grid Tile styling or behavior when no Clue is Active — unchanged.
- A Host-facing settings UI for animation speed/style, or themes/tile styles beyond the already-wired "Cobalt & Mint" / "Embossed" look (carried over from the original spec's Out of Scope).

## Further Notes

- This spec builds directly on `CONTEXT.md`'s new "Clue Card" entry, `ADR-0004`, and the original imported design canvas now checked in at `docs/design/Jeopardy Board.dc.html` (+ `support.js`) with a pointer from `CLAUDE.md` — read it before touching Clue Card layout, since it's the source of truth for the original look this spec restores and extends.
- The original canvas's Reveal button was already labeled "Flip tile — show answer," even though nothing flipped — this spec finally builds what that copy always implied.
- `prefers-reduced-motion` / an animation-speed toggle wasn't raised during scoping. If it turns out to matter, treat it as a follow-up rather than something this spec already decided.
