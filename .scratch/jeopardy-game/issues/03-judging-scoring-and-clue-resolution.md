# 03: Judging, scoring, and Clue resolution

**What to build:** The Host can judge a buzzed-in Player's answer, updating scores and Tile state, including the real-Jeopardy dynamic of reopening a Clue for the remaining Players after a wrong answer, and closing out a Clue when nobody buzzes at all.

**Blocked by:** 02 (Tile selection, Active Clue, and Buzz racing)

**Status:** ready-for-agent

- [ ] After an Answer is revealed, the Host control panel offers correct/incorrect controls for the buzzed-in Player.
- [ ] Marking correct awards the Clue's Value to that Player's score, marks the Tile used, and clears the Active Clue, returning all screens to the Board.
- [ ] Marking incorrect deducts the Clue's Value from that Player's score, excludes them from buzzing again on this Clue, and reopens the Clue for the remaining Players to buzz.
- [ ] If every joined Player has been excluded on the current Clue, the Host can close it with no further score change.
- [ ] The Host can close a Clue with no score change when nobody has buzzed at all.
- [ ] Every Player's current score (including negative scores) is visible on the Board display, the Host control panel, and that Player's own phone at all times.
- [ ] `shared/gameEngine`'s `judge` and `closeClue` actions are unit tested directly: correct scoring + Tile-used + Active Clue cleared; incorrect scoring + exclusion + Clue stays Active; `closeClue` with no Buzz; both actions rejected with no Active Clue.
