# 02: Players stay joined across Play again and Back to Board Setup

**What to build:** Now that a Room outlives a Game, the group shouldn't have to rejoin between Games. When the Host resets for another Game, every joined Player stays in the fresh Lobby at $0, and late arrivals can still join. When the Host goes Back to Board Setup after Game Over to edit the Board, the Players stay joined through the round trip too. Each Player's phone stays on its "waiting" screen rather than dropping back to the join form. See `.scratch/concurrent-rooms/spec.md` (Game engine changes) and **Game** and **Board Setup** in `GLOSSARY.MD`.

- These are game-rule changes in the engine only, with no Room dependency. Reset keeps the roster with every score set to $0, from any phase it's allowed in today. Return to Board Setup from Game Over keeps the roster at $0, as the Lobby round trip already does (ADR-0008).
- The Player page's "roster cleared, back to the join form" behaviour stays as a safety net, but no longer fires on these paths.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Engine tests: reset after Game Over keeps every Player at $0 in a fresh Lobby, and a new Player can still join
- [ ] Engine tests: reset from the other phases it's allowed in keeps the roster at $0
- [ ] Engine tests: Back to Board Setup from Game Over keeps every Player at $0
- [ ] Existing engine tests that expected an empty roster after reset are updated
- [ ] Player page test (socket mocked): a joined Player stays on the waiting screen across a reset and a return to Board Setup
