# 06: Close Room and "Room has ended"

**What to build:** A Host can end the night deliberately. The Room panel gains a danger zone with "Close Room…", which asks in place ("Close Room BRDK? The Game ends for everyone, right now.") before doing anything. Once confirmed, the Room ends for every device at once:
- Host and Board screens show **Room has ended** (prototype variant B): dimmed Room Code Tiles, "This Room has ended", "Thanks for playing", and a link home.
- Player phones go straight to plain Room Code entry, as a fresh journey.

Reloading an ended Room's address shows the same thing. The danger zone notes that the Room otherwise ends by itself 30 minutes after everyone leaves (ticket 07). See `.scratch/concurrent-rooms/spec.md` and **Room** in `GLOSSARY.MD`.

- Close Room is a new Host-only event. The server ends the Room, sends a Room-ended notice to every socket bound to it, and unbinds them. The ending path is shared, so ticket 07's expiry reuses it.
- The server remembers ended codes until they're reused, so the role declaration on a non-live code can answer "ended" versus "no such Room". Codes are free for a new Room immediately.
- Room closing gets a log line.

**Blocked by:** 03, 04

**Status:** ready-for-agent

- [ ] Server tests: Close Room from a Host ends the Room and every socket in it receives the Room-ended notice; from a non-Host it's ignored
- [ ] Server tests: after closing, declaring a role on that code answers "ended"; a never-used code answers "no such Room"; a new Room can take the code
- [ ] Client tests (socket mocked): Close Room asks for confirmation, Cancel backs out, and confirming sends the event
- [ ] Client tests: on the Room-ended notice, or an "ended" answer on load, Host and Board pages show Room has ended, and a Player page goes to Room Code entry
- [ ] Log line on close
