# 05: Host link and reclaiming Host

**What to build:** A Host can host from more than one device, and can get back in after losing the Host Key.

- **Sharing Host:** the Room panel gains a "Hosting from another device" section with the Host link, a Copy button, and a warning that anyone holding the link can run the Game (so it shouldn't go on the Board). Opening the Host link on another device makes it a Host of that Room and remembers the Host Key there, and the key disappears from the address bar.
- **Reclaiming Host:** a device opening a Room's Host screen without its Host Key sees **Host Key needed**: the Room Code Tiles, "You're not hosting this Room here", a hint to open the Host link, and a Room Passcode field with Reclaim. Reclaiming hands back the Room's existing Host Key, so every other Host device keeps working.

See `.scratch/concurrent-rooms/spec.md`, ADR-0015 (Consequences), and **Host Key** and **Room Passcode** in `GLOSSARY.MD`.

- The Host link is `/:code/host#<hostKey>`. On load, the Host page moves the fragment's key into per-Room storage and strips the fragment.
- A new reclaim event carries the Room Code and the Room Passcode, and acknowledges with the existing Host Key or a refusal. With no Room Passcode configured, reclaiming is open, as the start-up warning says (update its text).
- Nothing of the Game renders behind Host Key needed.

**Blocked by:** 04

**Status:** resolved

- [x] Server tests: reclaiming with the right Room Passcode returns the same Host Key and the socket is accepted as Host; a wrong passcode is refused; other Host sockets keep working
- [x] Server tests: with no Room Passcode configured, reclaiming succeeds
- [x] Client tests (socket mocked): opening a Host link stores the key for that Room and strips the fragment; the Host claim uses it
- [x] Client tests: a rejected Host claim shows Host Key needed and nothing of the Game; Reclaim with the right passcode stores the returned key and shows the Host screen; a wrong passcode shows an error
- [x] Client tests: the panel shows the Host link with Copy and the warning
- [x] The start-up warning mentions open reclaiming when no Room Passcode is set

## Comments

- Implemented on the integration branch `concurrent-rooms` (review fixes merged at a4d513e).
