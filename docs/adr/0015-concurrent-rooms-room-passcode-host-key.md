# Concurrent Rooms: Room Passcode to create, Host Key to host

Several Games now need to run side by side, so the server holds many **Rooms** at once, each identified by a 4-letter Room Code and holding one Game at a time. This supersedes ADR-0001's one-Game-at-a-time rule and ADR-0014's single Host Passcode. Creating a Room needs the operator's **Room Passcode**, the env secret that replaces `HOST_PASSCODE`. Each Room gets its own server-issued **Host Key**, which the creating device remembers and passes to other Host devices through a Host link. Every Room still lives in one process's memory on one Render instance, so a restart or deploy ends every Room at once.

We chose an operator-gated middle ground over fully public Room creation. The server stays private to people the operator trusts, so there are no rate limits and no account system, and per-Player tokens can stay deferred (`.scratch/cloud-hosting/issues/01-player-impersonation.md`). Hosts are still isolated from each other's Rooms. Opening up later only means making the Room Passcode optional. The Host Key and Room isolation already work without it.

## Considered Options

- **Public Room creation (anyone can create a Room):** deferred. It brings abuse limits, cleanup pressure, and Player impersonation between strangers all at once.
- **Operator-only, with the one passcode also acting as Host of every Room:** rejected. Any Host could act in any other Room.
- **Host-chosen per-Room passcode:** rejected in favour of a random server-issued key. A Host shouldn't have to invent or type a secret, and a human-chosen one is weaker.
- **Shared state such as Redis or a socket.io adapter, for more than one instance:** not needed at this scale. In-memory caps guard the single instance instead.

## Consequences

- **The Room Passcode doubles as an escape hatch.** It reclaims Host of any live Room whose Host Key was lost, and hands back the *existing* key rather than rotating it, so the other Host devices keep working. With no Room Passcode configured (local dev), anyone can create Rooms and reclaim Host, with a start-up warning.
- **A Room ends in three ways:** the Host closes it, no Host or Player device has been connected for 30 minutes (a Board screen doesn't count), or 4 hours pass with no Host action.
- **Codes are reused immediately once a Room ends, with no cool-down.** A device that was offline when its Room ended can reload into a different Room that now has the same code. This is accepted: the Board withholds Answers and a stray phone only sees a join form.
- **Capacity is capped:** 20 live Rooms, 12 Players per Room (new joins only, so reconnects always succeed), plus server-side caps on Signature size and text length. Signature images leave the state broadcast and are fetched once per device, so broadcasts stay small as Rooms multiply.
- **Auto-deploy is turned off.** Deploying is manual, so a merge doesn't end everyone's Game mid-night.
