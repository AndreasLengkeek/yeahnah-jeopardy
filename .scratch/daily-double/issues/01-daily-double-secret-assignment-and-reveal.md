# 01: Secret Daily Double assignment & reveal on selection

**What to build:** Exactly one Tile per Board is secretly, randomly chosen as the Daily Double the moment the Board is built (Lobby opens, or a Reset Game / return-to-Setup-then-reopen-Lobby rebuild) — invisible in every broadcast game state, including the Host's own, until that specific Tile is selected. Selecting it flags the Active Clue as a Daily Double, and the Host, Board, and every Player immediately see an unmistakable "Daily Double!" signal in place of the normal waiting-for-a-Buzz state. Buzzing still works normally on this Clue in this ticket — the eventual lockout is a later ticket's job. A fresh Board rebuild always draws a new random Daily Double Tile, never reusing the same coordinate.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The Daily Double's `(categoryIndex, tileIndex)` is picked at random every time the Board is built (`openLobby` and `resetGame`), and is never exposed in any broadcast `GameState` — to any role, including `"host"` — before that Tile is selected.
- [x] Selecting the pre-picked Tile sets `isDailyDouble: true` on the resulting Active Clue; selecting any other Tile sets it `false`.
- [x] A subsequent Board rebuild draws a fresh random coordinate rather than reusing the previous one.
- [x] Buzzing remains fully functional on a Daily Double Clue in this ticket (no lockout yet).
- [x] The Host, Board, and Player views each render a clear "Daily Double!" indicator whenever the Active Clue's `isDailyDouble` is true, visually distinct from a normal Clue's waiting-for-Buzz state (exact visual polish can be minimal; later tickets build out the full designate/wager UI on top of it).
- [x] `shared/src/gameEngine.test.ts` covers: the random pick is not present on `state` in a form any `viewForRole` output would expose; selecting the picked coordinate flags `isDailyDouble: true`; selecting any other Tile flags it `false`; a rebuild produces a different pick across repeated rebuilds.
- [x] `server/src/server.test.ts` covers: no broadcast to any connected role ever exposes the secret coordinate prior to its selection.
- [x] `client/src/activeClue.test.ts` and `client/src/components/ActiveClue.test.tsx` cover: `resolveActiveClue` surfaces `isDailyDouble`, and the component renders the Daily Double indicator when it's true.
