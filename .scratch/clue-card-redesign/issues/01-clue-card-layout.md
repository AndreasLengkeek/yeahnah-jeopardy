# 01: Clue Card layout redesign — header top, larger Clue text

**What to build:** When a Clue is Active, the Clue Card (rendered identically on both the Board display and the Host control panel, since both share the same component) shows Category top-left and Value top-right in a fixed header row, with the Clue text large and centered filling the remaining space. This replaces the current layout, where Category, Value, Clue text, and (once revealed) Answer are all centered as one stacked block. This restores the layout already present in the original imported design canvas (`docs/design/Jeopardy Board.dc.html`), which the current port had drifted away from.

The Answer, when revealed, keeps rendering inline below the Clue text exactly as it does today — the flip-to-its-own-face behavior is a separate ticket (03). This ticket is layout only.

Structure the header so it's naturally separable from the Clue-text content region below it — ticket 03 will need to pin this header outside a flipping face, so avoid coupling the two in a way that would need re-architecting later.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Category and Value appear in a header row at the top of the Clue Card (Category left, Value right).
- [ ] Clue text is larger than today and fills most of the remaining space below the header.
- [ ] Layout applies identically on the Board (read-only) and Host views.
- [ ] The Answer still renders inline below the Clue text once revealed (unchanged for this ticket).
- [ ] The Board's Tile grid, when no Clue is Active, is visually unchanged.
- [ ] Verified manually in a browser; no automated test required (per the spec's Testing Decisions).
