# Players can act as other Players

Status: needs-triage

`buzz` and `submitWager` accept a `playerId` from the client, and every Player's id is in the state broadcast to all devices — so anyone with dev tools can Buzz or Wager as someone else. Knowingly accepted for the public single-Game deploy (ADR-0014), where only invited friends know the URL.

**Pick up when:** a Player reports being Buzzed or Wagered as, or concurrent Games (Phase 2) start — strangers running their own Games make this real. Likely shape: a private per-Player token issued at join, required on Player actions, never broadcast.
