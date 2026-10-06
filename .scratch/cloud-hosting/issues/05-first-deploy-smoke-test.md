# 05: First deploy and remote smoke test

**What to build:** The first real public deploy, verified end-to-end by the Host from outside the home network. Requires a Render account and dashboard access, so it's a human ticket. Follow the setup guide from ticket 04.

**Blocked by:** 04 (Render blueprint and setup guide)

**Status:** resolved

- [x] Repo connected to Render via the blueprint; `HOST_PASSCODE` set in the dashboard
- [x] Deploy succeeds and the health check passes
- [x] From a phone on mobile data (off the home wifi), scanning the Board's Join QR code lands on the public join page
- [x] Opening `/host` on a new device asks for the Host Passcode; the wrong one is refused, the right one is remembered across a refresh
- [x] A short Game plays through remotely, including a Buzz and a judged Clue
- [x] After ~15+ minutes idle, the next visit wakes the service within about a minute
- [x] Any surprises noted under `## Comments` here (and the setup guide updated)

## Comments

- Bug found: closing or refreshing the Board stops Board Sound, and it can't be re-enabled outside the Lobby. Logged as `.scratch/board-sound-after-reload/issues/01-re-enable-board-sound-after-reload.md`.
- Request: more detailed server logging (Player joins, Game start, etc.). Logged as `.scratch/server-logging/issues/01-log-game-events-on-the-server.md`.
- Idle check, first try: after almost an hour, a refresh was still fast and the Board and Players were still there, so the service never slept. Most likely an open Board, Host or Join tab on some device kept a socket connection alive, which counts as traffic. To re-test: confirm the instance type is Free, close every tab on every device (including phones), then wait 20+ minutes.
