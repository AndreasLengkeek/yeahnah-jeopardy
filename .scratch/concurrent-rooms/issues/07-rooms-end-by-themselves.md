# 07: Rooms end by themselves

**What to build:** Abandoned Rooms free their slot without anyone pressing Close Room. A Room ends once no Host or Player device has been connected to it for 30 minutes. A Board screen left on a TV doesn't count, so it can't keep a Room alive forever. A Room also ends once 4 hours pass with no Host action, even if devices are still connected. A Host whose phone died mid-Game still has their Room while the Players are connected. An ended Room looks exactly like a closed one (ticket 06). See `.scratch/concurrent-rooms/spec.md` (Ending Rooms and time), ADR-0015, and **Room** in `GLOSSARY.MD`.

- The factory takes an injectable clock (defaulting to real time) and returns a sweep operation that ends every Room past either limit. The process entry point runs it about once a minute. Creating the Room and every accepted Host event count as Host actions.
- Expiry goes through ticket 06's ending path. Each expiry is logged with its reason (empty for 30 minutes, or no Host action for 4 hours).

**Blocked by:** 06

**Status:** resolved

- [x] Server tests (clock advanced, sweep called): a Room with no Host or Player sockets ends at 30 minutes and not before; its sockets get the Room-ended notice
- [x] Server tests: a Room with only a Board socket connected still ends at 30 minutes
- [x] Server tests: a Player reconnecting resets the 30-minute countdown
- [x] Server tests: a Room with Players connected but no Host action ends at 4 hours, and a Host action resets that clock
- [x] The entry point runs the sweep on an interval; expiry log lines give the reason

## Comments

- Implemented on the integration branch `concurrent-rooms` (review fixes merged at a4d513e).
