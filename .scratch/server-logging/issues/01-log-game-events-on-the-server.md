# 01: Log Game events on the server

**What to build:** Server logging that leaves a readable trail of a Game in the Render log. Today the server only logs at start-up (`server/src/index.ts`), so a deployed Game leaves nothing to look back on. Requested during the cloud-hosting smoke test (`.scratch/cloud-hosting/issues/05-first-deploy-smoke-test.md`).

**Blocked by:** None (can start immediately)

**Status:** resolved

## Decisions

- **Events:** only these get logged: Player join, Game start, picking a Clue, Buzz, judging, score changes, Game over, and reset. Everything else, including Board Setup edits, other connects/disconnects and mute toggles, stays unlogged.
- **Player disconnect (added after the first pass):** a joined Player's socket dropping logs `[game] "Sam" disconnected`. The server remembers which Player each socket joined or reconnected as. Sockets that never joined (Board, Host) and Players no longer in the roster log nothing.
- **Player reconnect (added after the first pass):** an accepted `reconnect` logs `[game] "Sam" reconnected`, once per new connection. A repeat `reconnect` from a socket already attached to that Player isn't logged, because React's StrictMode sends two on each page load in dev. The Join page now re-sends `reconnect` every time its socket comes back, not just when the page loads, so a phone that sleeps and wakes is logged, and its next disconnect is tracked too.
- **No Answers or Clue text:** a judge line says whether the Player was right or wrong, never what the Answer was. A Clue pick names its Category and value only.
- **Format:** plain `console.log` lines with a `[game]` prefix. No logger library, no levels, no env var. Examples:
  - `[game] Player "Sam" joined (3 players)`
  - `[game] Game started (3 players)`
  - `[game] Clue picked: Animals for $400`
  - `[game] "Sam" buzzed in`
  - `[game] "Sam" judged correct (+$400, now $1200)`
  - `[game] "Sam" judged incorrect (-$400, now $400)`
  - `[game] Host set "Sam"'s score to $800`
  - `[game] Game over — winner "Sam" ($2400)`
  - `[game] Game reset`
- **Signature Players** have no name, so refer to them by a short form of their id (for example, `Player a1b2c3`).

## Implementation notes

- `dispatch()` in `server/src/server.ts` is the single choke point every action passes through, and it already knows whether the action changed state. Log there, only for accepted actions, by comparing the state before and after (for example, phase going to `gameOver`, a score changing after `judge`). Game over is a phase change, not its own action, so detect it that way. Double Jeopardy's start can share the "Game start" style line if that's simple, but it's optional.
- Keep the message formatting in a small pure function, (previous state, action, next state) → line or `null`, so it's easy to unit-test without sockets.

## Acceptance

- [x] Each listed event produces exactly one `[game]` line in the format above. Rejected or no-op actions produce none.
- [x] No log line ever contains Answer text, Clue text or the Host Passcode.
- [x] Unlisted actions (Board Setup edits, mute toggles, reveal, close Clue, etc.) produce no log line.
- [x] The formatter has unit tests covering each event, including a signature Player and a judge in both directions.
- [x] Existing server tests stay quiet, with logging stubbed or silenced.
