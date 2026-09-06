# 04: Board Setup screen redesign

**What to build:** Reskin the Board Setup screen to match the newly exported Claude Design canvas, so it visually matches the rest of the ported app look, while keeping every existing Board Setup behavior unchanged.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `docs/design/Jeopardy Board.dc.html` and `docs/design/support.js` are replaced with the newly exported versions (already unzipped from `Jeopardy Web App UI.zip` at the repo root), keeping the "checked-in canvas is the source of truth for the ported look" convention current.
- [ ] `BoardSetup.tsx`'s card style, colors, border-radius, button pill style, and spacing are reskinned to match the new design's setup-screen styles.
- [ ] Category name stays a single-line input; Clue text and Answer become multi-line textareas, sized appropriately for longer Clue text.
- [ ] The category grid's column count stays dynamic (driven by the current Category count, 3–6) — not hardcoded to a fixed column count the way the new design's own markup is (which predates the variable Category count).
- [ ] Every existing `BoardSetup` prop and behavior is preserved: editing a Category name, editing a Clue's text/answer, starting a new blank Board at a chosen Category count (3–6), importing/exporting a Board Config, and the Open Lobby completeness gate (including blank-field flagging).
- [ ] No other screen (Board, Lobby, Player, Host-in-play, Scoreboard, Game Over) is touched by this reskin.
- [ ] `client/src/components/BoardSetup.test.tsx`'s existing assertions all still pass against the reskinned markup, updating only the queries that must change because Clue/Answer became textareas (the accessible `textbox` role queries should not need to change).
