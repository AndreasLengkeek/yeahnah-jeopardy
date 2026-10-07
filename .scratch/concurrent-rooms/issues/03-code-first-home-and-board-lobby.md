# 03: Code-first home, Room Code entry, and Board Lobby

**What to build:** The Room screens get the look chosen from the UI prototype: variant B, "Code-first tiles", on the `prototype/rooms` branch.

- **Home (`/`):** the main action is Room Code entry, drawn as four Board-Tile letter boxes, with a Join button. Below it, a quiet "Hosting tonight? Create a Room →" link expands into a Room Passcode field and a Create button, with wrong-passcode errors inline.
- **Room Code entry (`/join`):** the same Tile entry. An unknown code shows "No Room with that code".
- **Board Lobby:** the Room Code as large Board-Tiles with "Go to <host> and enter", then "or", then the Join QR code, side by side, with the Lobby roster underneath, so the code can be read from the couch.

See `.scratch/concurrent-rooms/spec.md` (Screens).

- Add a reusable Code Tiles element (letters on Board-Tile gradients in the accent colour, with a dimmed state). Tickets 06 and 08 reuse it.
- Typing accepts lower case and shows upper case, letters only, at most 4.

**Blocked by:** 01

**Status:** resolved

- [x] Client tests: the home page's Tile entry navigates to `/CODE/join` for a live Room, and shows "No Room with that code" for an unknown one
- [x] Client tests: "Hosting tonight?" reveals the Room Passcode field; Create navigates to the new Room's Host screen; a wrong passcode shows an inline error
- [x] Client tests: the Board Lobby shows the Room Code and a QR code for the Room's join address
- [x] Lower-case input is accepted and shown upper case
- [x] Looks like prototype variant B (home, join, and board-lobby screens) at phone and TV widths

## Comments

- Implemented on the integration branch `concurrent-rooms` (review fixes merged at a4d513e).
