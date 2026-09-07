# 03: Daily Doubles and Wagers scale per Round

**What to build:** Double Jeopardy gets its own 2 Daily Doubles (versus Round 1's 1), independently and randomly placed, kept exactly as secret from everyone — including the Host — as Round 1's already is, until each is selected. A Daily Double's Wager ceiling matches its own Round's static top Value: $500 during Round 1, $1000 during Double Jeopardy — never the other Round's, and never inflated in Round 1 just because Double Jeopardy exists.

**Blocked by:** 02

**Status:** done

- [x] `GameState` gains Double Jeopardy's two secret Daily Double coordinates, drawn independently (redraw on collision so they never land on the same Tile), at the same moment Round 1's `dailyDouble` is drawn (Lobby opening / Reset Game) — not deferred to `startDoubleJeopardy`
- [x] `applySelectTile`'s `isDailyDouble` check switches on `state.round`: Round 1 compares against `dailyDouble`, Double Jeopardy against the two Double Jeopardy coordinates
- [x] `wagerRange`/the Daily Double Wager ceiling become a function of the current Round: $500 during Round 1, $1000 during Double Jeopardy, for the same underlying "greater of score or ceiling" rule
- [x] `viewForRole` never exposes the Double Jeopardy Daily Double coordinates to any role (host, board, player) before their Tile is selected, matching the existing rule for `dailyDouble`
- [x] Reducer tests cover: the two Double Jeopardy coordinates are never equal after a draw; selecting a Tile during Double Jeopardy checks the right coordinate set; Wager ceiling resolves to $500 in Round 1 and $1000 in Double Jeopardy for an identical Player score
- [x] `gameView.test.ts` coverage extended: Double Jeopardy Daily Double coordinates never appear in any role's broadcast view before selection
