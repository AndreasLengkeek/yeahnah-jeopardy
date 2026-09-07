# 03: Judging a Daily Double — wager-based scoring, dual auto-reveal, and Buzz lockout

**What to build:** The Host's existing Correct/Incorrect controls now judge a submitted Wager on a Daily Double Clue exactly as they judge any other Clue — except the amount added to or subtracted from the wagering Player's score is their Wager, not the Tile's printed Value. Either outcome — correct or incorrect — immediately auto-reveals the Answer to everyone (extending the existing correct-auto-reveal behavior to the incorrect case too, since a Daily Double never has another Player waiting for a fair shot at it), and the Clue becomes immediately closable with no re-attempt loop. This ticket also finally locks out Buzzing entirely for the whole lifetime of a Daily Double Clue — from the moment it's selected through to Close — completing the feature end-to-end exactly as speced.

**Blocked by:** 2 (Host designates a wagerer; Player submits a Wager)

**Status:** done

- [x] Judging a Daily Double Clue correct adds the submitted Wager (not the Tile's Value) to the wagering Player's score; judging it incorrect subtracts the Wager.
- [x] Both outcomes set the Clue's `revealed` state to true in the same step that scores it — diverging from a normal wrong Buzz, which keeps the Answer hidden for the next Player.
- [x] Judging a Daily Double is blocked (no-op) until a Wager has actually been submitted.
- [x] Once judged (either outcome), the Daily Double Clue is immediately closable, with no dependency on any exclusion/re-attempt loop.
- [x] Buzzing is a no-op for the entire duration of a Daily Double Clue, from selection through Close, superseding the interim behavior from ticket 1.
- [x] The Host's existing Correct/Incorrect footer control is reused unchanged for a Daily Double, now appearing once a Wager is submitted rather than once someone's buzzed.
- [x] The Player's Buzz button is hidden or disabled for the entire duration of any Daily Double Clue, for every Player.
- [x] `shared/src/gameEngine.test.ts` covers: correct/incorrect judging on a Daily Double scores by Wager, not Value; both outcomes set `revealed: true`; judging is blocked until a Wager exists; the Clue is immediately closable after either outcome; `buzz` is a no-op whenever the Active Clue `isDailyDouble` is true, for any Player, at any point in its lifetime.
- [x] `client/src/components/ActiveClue.test.tsx` covers: once a Wager is submitted, the header shows the Wager amount in place of the Tile's Value.
