# 01: Board Setup return trip from the Lobby

**What to build:** Let the Host return to Board Setup from the Lobby (not just after Game Over), editing any Category or Clue — including changing the Category count again — without losing the Players who've already joined. Surface this as an "Edit Board" button living in the `Header`, available whenever the Host is in the Lobby or at Game Over, replacing the existing bottom-of-screen "Edit Board" button on the Game Over screen.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `returnToSetup` transitions `lobby` → `setup` (in addition to the existing `gameOver` → `setup`), and remains a no-op from `setup` and `playing`.
- [ ] Returning to `setup` from `lobby` preserves `players` unchanged; returning from `gameOver` still clears `players` to `[]`, matching today's behavior (see `docs/adr/0008-lobby-return-to-setup-keeps-the-roster.md`).
- [ ] Returning to `setup` from either phase still clears `board` to `[]` and `activeClue` to `null`, and preserves `content` unchanged.
- [ ] The Category count picker, and every other Board Setup editing action, works again once back in `setup` after a Lobby round trip — nothing about the Category count is still "fixed" from the prior Board Setup episode.
- [ ] `Header` gains an "Edit Board" action button, rendered in the same visual slot as the new Board Setup design's own "Edit categories" header button, that calls a supplied handler when clicked.
- [ ] `HostPage` renders this "Edit Board" button whenever `state.phase` is `lobby` or `gameOver`, wired to emit `returnToSetup`; it does not render during `setup` or `playing`.
- [ ] The Game Over screen's old bottom-of-screen "Edit Board" button is removed; "Reset Game" stays in its current place on both the Lobby and Game Over screens.
- [ ] Clicking "Edit Board" from the Lobby (with Players already joined) requires no confirmation step, jumping straight into `setup` — consistent with the existing Game Over behavior.
- [ ] `shared/src/gameEngine.test.ts` covers: a positive `returnToSetup` test from `lobby` (asserts `players` preserved, `board`/`activeClue` cleared, `content` unchanged), updates the existing `it.each` no-op test so only `setup` and `playing` are asserted as no-ops, and keeps the existing `gameOver` → `setup` test passing unchanged.
- [ ] `client/src/components/Header.test.tsx` covers: no action button renders when none is supplied, and the action button renders with its given label and calls its handler when clicked, when supplied.
