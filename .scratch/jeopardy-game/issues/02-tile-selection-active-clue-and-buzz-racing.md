# 02: Tile selection, Active Clue, and Buzz racing

**What to build:** The Host can select a Tile to bring up its Clue for everyone, and Players can race to Buzz in from their phones, with the server resolving who wins the Buzz and locking out everyone else.

**Blocked by:** 01 (Lobby, join, and game start)

**Status:** done

- [x] From the Host control panel, selecting an unused Tile makes its Clue the Active Clue, shown (Category, Value, Clue text) on the Board display and Host control panel.
- [x] Once a Clue is Active, every joined Player's phone shows an enabled Buzz button.
- [x] The first Player's Buzz the server receives wins; every other Player's Buzz is rejected/locked out for that Clue.
- [x] A locked-out Player's phone shows which Player currently holds the Buzz.
- [x] The Host control panel shows which Player has buzzed in.
- [x] The Host control panel's "reveal" control is disabled until a Player has buzzed, and shows the Answer (on the Board display and Host control panel) once used.
- [x] `shared/gameEngine`'s `selectTile`, `buzz`, and `reveal` actions are unit tested directly: selecting only an unused Tile succeeds, `buzz` acceptance/lockout ordering, `buzz` rejected with no Active Clue, `reveal` rejected before any Buzz.
