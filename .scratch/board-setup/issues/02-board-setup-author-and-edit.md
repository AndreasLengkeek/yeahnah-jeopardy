# 02: Board Setup: author and edit a Board in-app

**What to build:** A new "setup" phase that runs before the Lobby, where the Host authors a Board's Categories and Clues. It opens pre-loaded with a complete, editable default Board (today's bundled fixture) — the Host can play it as-is, edit any field, or start a brand-new blank Board by choosing a Category count from 3 to 6 (fixed once chosen, no resizing later). Every Category needs a name and every Clue needs text and an Answer before the Host can open the Lobby; incomplete fields are flagged inline rather than blocking entry to Setup itself. After a Game ends, the Host can return to Board Setup with that same Board pre-loaded to tweak it, or just replay it as-is via Reset. Import/export of a Board Config file is a separate, later ticket — not covered here.

**Blocked by:** 01 (Server-side Answer redaction by socket role)

**Status:** ready-for-agent

- [ ] A new `"setup"` phase is added to `GamePhase`, ordered before `"lobby"`. `initialState()` now starts in `"setup"`.
- [ ] A new `content: CategoryData[]` field on `GameState` holds the Board's authored Categories and Clues (`{ name, clues: [{ text, answer }] }`, always exactly 5 clues per category) for the lifetime of the Game. `initialState()` seeds it from the existing `trivia.ts` fixture.
- [ ] `content` is editable only while `phase === "setup"`; all new actions below are no-ops in any other phase.
- [ ] `newBoard { categoryCount }` replaces `content` with a blank Board of the given size (3–6 categories, 5 blank clues each); rejected (state unchanged) if `categoryCount` is outside 3–6.
- [ ] `editCategoryName { categoryIndex, name }` and `editClue { categoryIndex, tileIndex, field, value }` update `content` in place.
- [ ] `openLobby` transitions `"setup"` → `"lobby"`, building `board` (`{ name, tiles: [{ value, used }] }`) from `content`'s category names. Rejected unless every category has a non-blank name and every clue has non-blank text and answer.
- [ ] `selectTile`/`ActiveClue` population cuts over from ticket 01's temporary `trivia.ts`-backed lookup to reading `clueText`/`answer` from `content` instead.
- [ ] `returnToSetup` is valid only from `"gameOver"`, transitioning back to `"setup"` with `content` left unchanged (pre-loaded for editing).
- [ ] `resetGame`'s behavior changes: it now transitions to `"lobby"` (not `"setup"`), keeping `content` and its derived `board` unchanged while resetting players/activeClue — this is the "reuse the same Board" replay path.
- [ ] There's no separate validation-error data structure — an incomplete field (from hand-editing) is simply a blank string in `content`; the same completeness check gating `openLobby` is what the editor uses to flag which fields are still incomplete.
- [ ] The Host-facing Board Setup screen renders: the pre-loaded default Board, editable Category names and Clue text/Answer fields, a control to start a new blank Board (with a Category-count picker, 3–6), inline flags on incomplete fields, and an "Open Lobby" control disabled until the Board is complete.
- [ ] The Game Over screen gains a visible control to return to Board Setup (invoking `returnToSetup`), alongside the existing Reset (reuse-as-is) path.
- [ ] `shared/src/gameEngine.test.ts` covers: `newBoard` with valid/invalid counts; `editCategoryName`/`editClue` mutate `content`; `openLobby` blocked while incomplete and succeeds once complete, correctly building `board`; `resetGame` after `gameOver` reuses `content` unchanged; `returnToSetup` after `gameOver` returns to `"setup"` with `content` still pre-loaded; all new actions no-op outside `"setup"` (where applicable).
- [ ] New client component tests for the Board Setup screen, following the existing presentational-component pattern (`Lobby.test.tsx`, `Board.test.tsx`): rendering incomplete-field indicators, and the Lobby-transition control being disabled until complete.
