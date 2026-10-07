# Players can act as other Players

Status: needs-triage

`buzz` and `submitWager` accept a `playerId` from the client, and every Player's id is in the state broadcast to all devices — so anyone with dev tools can Buzz or Wager as someone else. Knowingly accepted for the public single-Game deploy (ADR-0014), where only invited friends know the URL.

**Pick up when:** a Player reports being Buzzed or Wagered as, or Room creation opens to the public (no Room Passcode) — strangers running their own Rooms make this real. Concurrent Rooms alone don't: each socket is bound to its own Room, so a Player can only ever be impersonated by someone in the same Room. Likely shape: a private per-Player token issued at join, required on Player actions, never broadcast.
