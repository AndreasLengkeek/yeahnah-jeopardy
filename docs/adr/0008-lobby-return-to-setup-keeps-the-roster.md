# Returning to Board Setup from the Lobby keeps the roster; from Game Over it doesn't

`returnToSetup` now works from two phases, and it treats the roster differently in each: from the Lobby it preserves `players` (they haven't done anything wrong — only the Board content is changing, and Players don't hold any per-Board data), while from Game Over it still clears `players: []` (a genuine replay, where starting a new roster is the point). A future reader seeing one call clear the roster and the other not might assume a bug; it's deliberate; the two entry points model different intents even though they share an action name.

_Superseded in part by ADR-0015: now that a Room outlives a Game, returning to Board Setup from Game Over also keeps the roster (every score back to $0), as Play again does. Players only leave a roster when its Room ends._
