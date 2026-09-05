# 04: Game Over and reset

**What to build:** The Game recognizes when the Board is fully cleared and shows a Game Over state with final scores and a winner, and the Host can reset to a fresh Lobby at any point — whether the Board finished naturally or the Host wants to bail out early.

**Blocked by:** 03 (Judging, scoring, and Clue resolution)

**Status:** ready-for-agent

- [ ] Once all 25 Tiles have been used, all screens automatically show a Game Over state.
- [ ] The Game Over state shows every Player's final score and identifies the winner (highest score).
- [ ] From the Host control panel, a reset action is available both on Game Over and at any point mid-Game.
- [ ] Resetting returns all screens to a fresh Lobby: empty Player roster, joining open again.
- [ ] A Player who rejoins after a reset starts at $0, independent of their score in the prior Game.
- [ ] `shared/gameEngine`'s `resetGame` action and Game Over detection are unit tested directly: Game Over triggers exactly when the 25th Tile is marked used; `resetGame` is accepted from the lobby, playing, and gameOver phases and produces an empty-roster Lobby state.
