# 02: Play a two-Round Game start to finish

**What to build:** A two-Round Game plays Round 1 exactly as a single-Round Game does today. Once Round 1's Board is fully drained, the Game pauses (a new `roundBreak` phase) instead of jumping straight to Game Over: the Host sees a "Start Double Jeopardy" button, and Board/Player screens show a plain "waiting for Double Jeopardy" state. When the Host clicks it, the Board swaps immediately to Double Jeopardy's Categories at doubled Values ($200–$1000), with every Player's score and connection status carried over unchanged. Double Jeopardy then plays out exactly like Round 1 until its Board drains, at which point the Game reaches Game Over exactly as it does today for a single-Round Game.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `GamePhase` gains `'roundBreak'`, reached only when a two-Round Game's Round 1 Board fully drains (a single-Round Game's drained Board still goes straight to `'gameOver'`, unchanged)
- [ ] `GameState` gains `round: 1 | 2` (always `1` for a single-Round Game)
- [ ] New exported `DOUBLE_JEOPARDY_VALUES = [200, 400, 600, 800, 1000]` alongside existing `VALUES`; a `valuesForRound(round)` helper is the single seam every Value-dependent call site (board building) switches through
- [ ] New reducer action `startDoubleJeopardy`: valid only from `phase === 'roundBreak'`; rebuilds `board` from `doubleJeopardyContent` at Double Jeopardy Values, sets `round: 2`, `phase: 'playing'`; preserves `players` (scores and roster) unchanged; no-op in every other phase
- [ ] Closing Double Jeopardy's last Tile (`round === 2`) always transitions to `'gameOver'`
- [ ] `HostPage.tsx` renders a "Start Double Jeopardy" action during `'roundBreak'`, and the existing "Edit Board" header action also shows during `'roundBreak'`
- [ ] `BoardPage.tsx` and `JoinPage.tsx` render a "waiting for Double Jeopardy" message during `'roundBreak'`
- [ ] Reducer tests cover: draining Round 1's Board goes to `'roundBreak'` when `twoRounds` is true, straight to `'gameOver'` when false (regression); `startDoubleJeopardy` is a no-op outside `'roundBreak'` and behaves correctly from it; Double Jeopardy's Board uses `DOUBLE_JEOPARDY_VALUES`; draining Double Jeopardy's Board always reaches `'gameOver'`
