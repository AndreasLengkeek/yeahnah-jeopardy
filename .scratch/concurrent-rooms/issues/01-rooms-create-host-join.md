# 01: Rooms — create, host, and join by Room Code

**What to build:** The server stops holding one Game and holds many **Rooms**, each with its own Room Code, Host Key, and Game. Someone holding the Room Passcode creates a Room from the home page and lands on that Room's Host screen (`/CODE/host`), already its Host. Opening `/CODE/board` shows that Room's Board, with a Join QR code for `/CODE/join`. Players join by scanning it, or by typing the Room Code at `/` or `/join`. Two Rooms run side by side without ever seeing or touching each other. The screens are deliberately plain here; ticket 03 gives them their real look. See `.scratch/concurrent-rooms/spec.md`, ADR-0015, and **Room**, **Room Code**, **Room Passcode**, and **Host Key** in `GLOSSARY.MD`.

- The game server factory holds a registry of Rooms keyed by Room Code. Each Room has its own Game state, run through the unchanged engine. Room Codes are 4 letters from a consonant-only alphabet with confusable letters removed, matched case-insensitively. Host Keys are random and server-issued.
- A new create-Room event carries the Room Passcode and acknowledges with either the Room Code and Host Key, or a wrong-passcode refusal. With no Room Passcode configured, creation is open.
- The role-declaration event also carries the Room Code, and the Host Key replaces the old passcode. It binds the socket to that Room and acknowledges accepted, rejected (wrong or missing Host Key, which falls back to the Player view), or no Room. Every Game and Host event acts on the bound Room only. Broadcasts go only to that Room's sockets, redacted by role as today. Host gating is always on.
- Client routes:
  - `/` is home (Room Code entry plus Create a Room);
  - `/join` is Room Code entry;
  - `/:code/host`, `/:code/board` and `/:code/join` are a Room's screens;
  - bare `/host` and `/board` redirect to `/`, as does the catch-all.

  The remembered Host Key and Player id are stored per Room Code, replacing the single remembered Host Passcode and Player id. A rejected Host claim shows the existing prompt-style screen ("this device isn't the Host"); ticket 05 adds reclaiming.
- The `HOST_PASSCODE` environment variable and factory option become `ROOM_PASSCODE`. The start-up warning when it's unset says anyone can create Rooms. The Render blueprint renames the secret and **turns auto-deploy off in this same ticket**, so this change can't auto-deploy before the operator has set `ROOM_PASSCODE`.
- Game and connection log lines are prefixed with the Room Code. Room creation gets its own log line.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Server tests: creating a Room with the right Room Passcode returns a Room Code and Host Key; the wrong passcode is refused; with none configured, creation is open
- [x] Server tests: claiming Host of a Room with its Host Key is accepted and receives Answers; a wrong or missing Host Key is rejected and receives the redacted view; claiming on a code with no live Room answers "no Room"
- [x] Server tests: two Rooms side by side — Host actions, joins and Buzzes in one never change the other, neither Room's sockets receive the other's broadcasts, and Room A's Host Key doesn't work in Room B
- [x] Every existing socket wiring test passes, moved inside a created Room
- [x] Client tests (socket mocked): home creates a Room and navigates to its Host screen; Room Code entry navigates to `/CODE/join`; the Host, Board and Join pages identify with the Room Code from the address; remembered Host Keys and Player ids are scoped per Room Code
- [x] The Board's Join QR code encodes `<origin>/<code>/join`
- [x] Bare `/host` and `/board` redirect to `/`
- [x] Log lines carry the Room Code; the start-up warning mentions Room creation
- [x] The Render blueprint uses `ROOM_PASSCODE` and has auto-deploy off

## Comments

- Implemented on the integration branch `concurrent-rooms` (review fixes merged at a4d513e).
