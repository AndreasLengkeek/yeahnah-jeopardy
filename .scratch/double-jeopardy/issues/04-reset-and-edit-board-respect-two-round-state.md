# 04: Reset and Edit Board respect two-Round state

**What to build:** For a two-Round Game, "Reset Game" and "Edit Board" (return to Setup) work the same way they already do today, extended to cover both Rounds' state instead of just Round 1's. Resetting rebuilds Round 1's Board fresh and redraws every Daily Double for the whole Game (Round 1's and both of Double Jeopardy's), so replaying the same Board Config never puts a Daily Double back in the same place twice. Returning to Setup keeps both Rounds' authored content intact for further editing, clearing only derived/secret state.

**Blocked by:** 01, 02, 03

**Status:** ready-for-agent

- [ ] `resetGame` resets `round` to `1`, `phase` to `'lobby'`, rebuilds Round 1's `board` from `content`, and redraws fresh coordinates for Round 1's Daily Double and both of Double Jeopardy's — Double Jeopardy's `board` itself is not rebuilt until `startDoubleJeopardy` runs again
- [ ] `returnToSetup` leaves `doubleJeopardyContent` and `twoRounds` untouched, clearing only `board`, `activeClue`, and every Daily Double coordinate back to their setup-phase defaults (matching how `content` is already preserved today)
- [ ] Reducer tests cover: `resetGame` on a two-Round Game resets to `round: 1`/`phase: 'lobby'`, rebuilds Round 1's board, and redraws fresh Double Jeopardy Daily Double coordinates (varying across repeated resets); `returnToSetup` preserves `doubleJeopardyContent`/`twoRounds` across the round trip
