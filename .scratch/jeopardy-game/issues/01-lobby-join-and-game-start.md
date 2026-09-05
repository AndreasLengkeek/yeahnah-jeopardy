# 01: Lobby, join, and game start

**What to build:** Scaffold the monorepo (client/server/shared workspaces) and deliver the first end-to-end slice: a Host runs the server and opens a Board display and a Host control panel; Players join from their phones by name into the Lobby; the Host starts the Game once enough Players have joined, at which point the Board itself becomes visible everywhere.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Running the server locally serves a Board display route, a Host control panel route, and a Player join route.
- [x] A Player visiting the join route can enter a name and appear in the Lobby on the Board display and Host control panel.
- [x] Joining with a name already taken in the current Lobby is rejected with a clear message; the Player can retry with a different name.
- [x] The Host control panel's "Start Game" action is disabled until at least 2 Players have joined.
- [x] Starting the Game closes joining (a new Player visiting the join route can no longer join) and transitions all connected screens from Lobby to the Playing phase.
- [x] Once Playing, the Board display and Host control panel show 5 Categories and a 5x5 grid of Tiles with their Values, all unused — matching the ported design's CATS/VALUES data.
- [x] All screens render with the fixed look from the imported design: title "Yeah Nah Jeopardy", Cobalt & Mint theme, yellow (#f2c14e) accent, embossed Tile style.
- [x] `shared/gameEngine`'s `join` and `startGame` actions are unit tested directly, covering: valid join, duplicate-name rejection, join-after-start rejection, `startGame` rejected below 2 Players, valid `startGame`.
