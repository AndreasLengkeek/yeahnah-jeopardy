# 03: Host Passcode — server gating and Host screen prompt

**What to build:** When a Host Passcode is configured, only devices that have proven it can act as Host. Opening the Host screen on a new device shows a passcode prompt; a wrong passcode shows an error, the right one opens the Host screen and is remembered on that device so refreshes and reconnects don't ask again. A remembered passcode that's since been changed is forgotten and the prompt shown. The server ignores every Host action from, and withholds unrevealed Answers from, any device that hasn't proven it. Players and the Board never need it. With no Host Passcode configured, everything works exactly as today, plus a prominent start-up warning. See `.scratch/cloud-hosting/spec.md`, ADR-0014, and **Host Passcode** in `CONTEXT.md`.

- The Host Passcode is an option on the game server factory (create the options object if ticket 02 hasn't landed yet; reuse it if it has), read from `HOST_PASSCODE` by the process entry point only.
- The existing role-declaration event takes an optional passcode and an acknowledgement (accepted/rejected). Claiming `host` succeeds only if no Host Passcode is configured or it matches; rejected connections keep the default Player view. `board`/`player` claims never need it.
- Host-only events = every event except role declaration, join, reconnect, edit identity, buzz, submit wager. From an unaccepted connection they're silently ignored (no state change, no broadcast). Gating lives in the socket layer, not the game engine.
- No separate "is a passcode required?" check: the Host screen always claims `host` with its remembered passcode (possibly none) on every connect, and shows the prompt only on rejection.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Server tests: claiming `host` with the correct passcode is accepted and receives the Answer of an unrevealed Active Clue
- [ ] Server tests: claiming `host` with a wrong or missing passcode is rejected and receives the redacted view
- [ ] Server tests: a representative spread of Host actions (a Board Setup edit, opening the Lobby, starting the Game, selecting a Tile, judging, setting a score, resetting) from an unaccepted connection changes nothing
- [ ] Server tests: join, buzz, submit wager, and claiming `board` work without a passcode while one is configured
- [ ] Server tests: with no passcode configured, claiming `host` is accepted and all existing tests pass unchanged
- [ ] Server logs a prominent warning on start-up when no Host Passcode is configured
- [ ] Host screen tests (socket mocked): prompt appears on rejection; submitting re-claims with the passcode and remembers it on acceptance; a rejected remembered passcode is forgotten and the prompt shown; no prompt when accepted first try
- [ ] Without the passcode, the Host screen shows only the prompt — no Board, Clues, Answers, or Board Setup
- [ ] After a dropped connection, the Host screen reclaims the Host role automatically using the remembered passcode
