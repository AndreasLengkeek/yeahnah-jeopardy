# 02: Draw a Signature on the Join form

**What to build:** The Join form shows a freehand drawing canvas first, with a "type a name instead" link that falls back to the existing text field. Drawing something and submitting captures the canvas as a small, downscaled raster image and joins with it as a signature identity — which then renders correctly everywhere Ticket 1 wired up (Scoreboard, Lobby roster, buzz/correct sentences, winner announcement). Submitting is blocked until there's either a non-blank drawing or (if toggled to text mode) a non-blank trimmed name, mirroring today's disabled-until-non-blank submit rule.

**Blocked by:** 01 (Player identity: text or Signature replaces plain name)

**Status:** ready-for-agent

- [ ] The Join form presents a drawing canvas by default, with a visible "type a name instead" link/toggle that swaps to today's text input.
- [ ] Submitting from the canvas exports the drawing to a small, capped-size downscaled raster image and joins using a signature identity carrying that image.
- [ ] Submitting from the text field (after toggling) joins using a text identity, exactly as today.
- [ ] Submit is disabled until there's a non-blank result either way: at least one drawn stroke on the canvas, or a non-blank trimmed name in text mode.
- [ ] A completely blank/untouched canvas cannot be submitted (matches the blank-signature rejection from Ticket 1, enforced client-side too for immediate feedback).
- [ ] The canvas offers a way to clear/redo a drawing before submitting.
- [ ] After joining with a drawn Signature, the Player's identity renders as their drawing everywhere Ticket 1's shared identity component is used — Scoreboard, Lobby roster, buzz/correct sentences on other Players' screens, and the winner announcement if they win.
- [ ] The actual canvas-drawing interaction and the export-to-downscaled-image step are treated as thin, browser-API-bound glue and are not unit-tested, consistent with the existing precedent of `socket.ts` and the localStorage calls in `playerIdentity.ts`.
- [ ] A component-level test for the Join form's submit-enablement logic covers: disabled with a blank canvas and no typed name; enabled once a stroke exists; enabled once a non-blank name is typed in text mode.
