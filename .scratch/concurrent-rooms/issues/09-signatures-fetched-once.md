# 09: Signatures fetched once instead of on every broadcast

**What to build:** A Buzz should cost a few KB per device, not resend every Player's Signature. Signatures still appear everywhere they do today (Lobby, Scoreboard, Buzz status, Wager banner), but each device downloads each one once. See `.scratch/concurrent-rooms/spec.md` (Payload size).

- In the view each socket receives, a Signature identity carries a Room-scoped, versioned image address instead of its data URL. The version changes whenever that Player redraws. The server serves the image at that address over plain HTTP with long-lived caching. Full data URLs stay in server memory only.
- The Player identity component keeps rendering the value as an image source, so it should need little or no change.
- Only Players of that Room can be fetched at that Room's address.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Server tests: state broadcasts carry an image address, not the data URL, for a Signature Player
- [ ] Server tests: an HTTP request to that address returns the image with caching headers; a different Room's code or an unknown Player returns 404
- [ ] Server tests: redrawing a Signature changes the address
- [ ] Client tests: a Signature Player still renders as an image in the Lobby and Scoreboard
