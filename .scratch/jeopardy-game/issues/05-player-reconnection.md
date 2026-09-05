# 05: Player reconnection

**What to build:** A Player whose phone drops connection or reloads mid-Game can rejoin as themselves — same identity, same score — instead of losing their place.

**Blocked by:** 01 (Lobby, join, and game start)

**Status:** done

- [x] At join, a Player's browser persists an identifier for their Player.
- [x] Reloading the join/phone page after joining reattaches the Player to their existing identity and score, rather than creating a new Player or requiring rejoining.
- [x] Reconnection is only accepted for a Player who joined before the Game started; an unrecognized or post-Lobby-closed identifier is rejected and falls back to a normal join attempt (subject to Ticket 01's join-after-start rejection).
- [x] `shared/gameEngine`'s `reconnect` action is unit tested directly: reattaching a known Player id preserves their score and connected state; an unknown id is rejected.
