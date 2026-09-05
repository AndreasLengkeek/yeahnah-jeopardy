# 01: Player identity: text or Signature replaces plain name

**What to build:** `Player`'s plain `name` string becomes an identity that's either a typed name or a drawn Signature — never both. The `join` reducer action and its socket event carry this identity instead of a bare string. Duplicate-name rejection still applies, but only between two text identities; a signature identity captured from a completely blank/untouched canvas is rejected, mirroring how a blank name is rejected today. A new shared identity-rendering component replaces every place that currently interpolates `player.name` as raw text, so the whole system is signature-shaped underneath even before any drawing UI exists — joining by typing a name still works exactly as it does today, just round-tripping through the new shape.

**Blocked by:** None (can start immediately)

**Status:** done (implemented in 101f9b1)

- [x] `Player`'s `name: string` field is replaced by an identity that's either a text identity (a trimmed name string) or a signature identity (a small raster image).
- [x] The `join` `GameAction`'s payload carries this identity instead of a bare name string; the server's `join` socket event is updated to match.
- [x] A blank/whitespace-only text identity is rejected, exactly as a blank name is today.
- [x] A signature identity with no actual drawn content (blank/empty image) is rejected the same way.
- [x] Duplicate-identity rejection in the reducer's join logic compares two text identities by exact trimmed match only; a signature identity is never checked against anything else for uniqueness, and never blocks or is blocked by another signature — including two Players holding pixel-identical images.
- [x] Reconnect is unaffected: whichever identity a Player joined with (text or signature) comes back unchanged on reconnect, the same way a typed name does today.
- [x] A new shared `PlayerIdentity`-style component renders a text identity as visible text, or a signature identity as a small inline image, from one place.
- [x] Every current raw `player.name` interpolation is replaced by this shared component: the Scoreboard's name tag, the Lobby roster tiles, `ActiveClue`'s buzzed-player and correct-player sentences ("X has the buzz" / "X got it right"), the Join page's own buzz-status line ("X has the buzz," shown live on every other Player's phone), and the Game Over winner announcement.
- [x] The Game Over screen's tie-winner case (multiple Players tied for the win) renders each winner's identity as its own element joined by "&"/"and" text, rather than the current approach of string-joining `player.name` values — since a signature can't be concatenated into a string the way a name can.
- [x] `shared/src/gameEngine.test.ts` covers: joining with a text identity behaves exactly as today (blank rejected, duplicate rejected, whitespace trimmed); joining with a signature identity succeeds even when another Player already holds a pixel-identical image; a signature identity from a blank canvas is rejected; two Players can hold visually identical signatures without either being blocked.
- [x] `server/src/server.test.ts` is updated so its existing `join` emissions send an identity payload instead of a bare string, and gains a round-trip case joining with a signature identity end-to-end.
- [x] A new `PlayerIdentity` component test covers: a text identity renders as visible text; a signature identity renders an image with the expected source.
- [x] Existing component tests that currently assert on `player.name` directly (`Scoreboard.test.tsx`, `Lobby.test.tsx`, `GameOver.test.tsx`, `ActiveClue.test.tsx`) are updated to render through the new shared identity component, keeping their existing assertions about what's visible on screen.
