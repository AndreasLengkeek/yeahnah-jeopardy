# QR-code joining, and drawn Signatures as an alternative to typing a name

Status: ready-for-agent

## Problem Statement

Joining a Game today has two rough edges. First, there's no way for a Player to discover the Join URL at all — the Host has to read out an IP address for everyone to type into their phone's browser. Second, the only way to identify yourself is typing a plain text name into a box, which is functional but not very fun for a party game.

## Solution

This spec covers two independent additions to the join experience, bundled together because both came out of the same discussion:

1. **QR-code joining**: the Board screen shows a QR code during the Lobby, encoding wherever the Board page itself is currently loaded from, with the same URL printed as plain text underneath as a manual fallback.
2. **Signatures**: a Player can draw a freehand Signature instead of typing a name. The Join form shows the drawing canvas first, with a "type a name instead" link to fall back to the familiar text field. Whichever a Player chooses becomes their identity everywhere it's shown — there's no "both."

## User Stories

### QR-code joining

1. As a Host, I want the Board screen to display a QR code during the Lobby, so that Players can scan their way straight to the Join page instead of being told an IP address.
2. As a Player, I want to scan a QR code on the shared screen and land directly on the Join form, so that I don't have to type a URL on my phone.
3. As a Host or Player, I want the same URL printed as plain text under the QR code, so that joining still works if someone's camera won't cooperate.
4. As a Host, I want the QR code to disappear once the Game starts, matching how joining itself closes at that point.
5. As a Host, I want the QR code to encode wherever the Board page is actually loaded from, so that it stays correct without any extra configuration on my part — understanding that I need to open the Board via my machine's LAN address rather than `localhost` for it to be scannable from a phone.

### Signatures

6. As a Player, I want to draw a freehand Signature on the Join form instead of typing a name, so that identifying myself is more fun than filling in a text box.
7. As a Player, I want a "type a name instead" option on the Join form, so that I can still use a plain text name if I don't want to draw.
8. As a Player, I want my choice — drawn or typed — to be the one and only way my identity appears from then on, so that there's no confusing mix of "sometimes an image, sometimes text" for the same Player.
9. As a Player who drew a Signature, I want it to appear as a small image everywhere my name would otherwise be shown — the Scoreboard, the Lobby roster, the "you have the buzz" status line on other Players' screens, the Game Over winner announcement — so that my identity is consistent across every screen.
10. As a Player who typed a name instead, I want everything to work exactly as it does today, so that opting out of drawing costs me nothing.
11. As a Player drawing a Signature, I want to be blocked from joining with a completely blank canvas, so that I can't accidentally join with no identity at all, mirroring how a blank typed name is already rejected today.
12. As a Player who typed a name, I want the existing duplicate-name rejection to still apply against other typed names, exactly as it does today.
13. As a Player who drew a Signature, I want no duplicate check to apply to my drawing, so that I'm never blocked from joining just because my doodle looks similar to someone else's.
14. As a Player, I want my chosen identity (drawn or typed) to survive a reconnect exactly like a typed name does today, so that refreshing my phone doesn't change who I am in the Game.
15. As a Host, I want a buzzed-in Player's Signature (or name) to render correctly in the judging view, so that judging isn't disrupted by the new identity type.
16. As a developer, I want every spot that used to interpolate `player.name` as raw text to instead render through one shared identity component, so that adding a new display location later can't accidentally forget to handle a drawn Signature.

## Implementation Decisions

### QR-code joining

- A new presentational component (e.g. `JoinQrCode`) renders on `BoardPage.tsx`, shown only while `state.phase === "lobby"`. It takes the join URL as a prop rather than reading `window.location` itself, keeping it a pure, easily tested component; the caller builds that URL from `window.location.origin` plus the Join route's path.
- Renders a scannable QR graphic plus the same URL as plain, visible text beneath it.
- Requires adding a client-side QR-code-generation dependency — there's no reasonable way to hand-roll QR encoding, and none of the client's current dependencies provide it.
- No server involvement and no LAN-address auto-detection: the QR is only as correct as the URL the Board page itself was loaded from. This means the Host is responsible for opening the Board via their machine's LAN-reachable address rather than `localhost` — worth a short on-screen or documented note for the Host, since nothing in the app enforces or corrects this.

### Signatures

- `Player`'s `name: string` field is replaced by an identity that's either a typed name or a drawn Signature — never both. A "text" identity carries the trimmed name string exactly as today; a "signature" identity carries a small downscaled raster image (e.g. a capped-size PNG/WebP data URL) captured from the drawing canvas at submit time.
- The `join` action's payload changes from a bare name string to this identity. The existing rejection rules extend naturally: a blank/whitespace-only text identity is rejected exactly as today; a signature identity captured from a completely untouched/blank canvas is rejected the same way. Duplicate-identity rejection only compares two text identities by exact trimmed match — a signature identity is never checked against anything else for uniqueness, and never blocks or is blocked by another signature.
- Reconnect logic is unaffected — it's purely `playerId`-keyed, so whichever identity a Player joined with comes back unchanged on reconnect, the same way a typed name does today.
- A new shared identity-rendering component (e.g. `PlayerIdentity`) replaces every current raw `player.name` interpolation: the Scoreboard's name tag, the Lobby roster tiles, the Join page's own buzz-status line ("X has the buzz" — shown live on every other Player's phone), and the Game Over winner announcement. It renders the typed name as text, or the Signature as a small inline image, from one place.
- The Join form's drawing canvas is shown first, with a "type a name instead" link that swaps to today's text input. Submitting requires a non-blank result either way (a drawn stroke, or a non-blank trimmed name), mirroring the existing disabled-until-non-blank submit rule.
- The actual canvas-drawing interaction and the export-to-downscaled-image step are thin, browser-API-bound glue — not unit-tested, consistent with the existing precedent of `socket.ts` and the localStorage calls in `playerIdentity.ts` being untested wrappers around a pure, tested core.

## Testing Decisions

Tests exercise external behavior (state in/out, or rendered output), never internals — matching the existing suite's style throughout.

- **`shared/src/gameEngine.test.ts`** (extend): plain `GameState` in/out, no mocks, same pattern as the existing `gameEngine: join` describe block. New coverage: joining with a text identity behaves exactly as today (blank rejected, duplicate rejected, whitespace trimmed); joining with a signature identity succeeds even when another Player already holds a pixel-identical image; a signature identity captured from a blank canvas is rejected; two Players can hold visually identical signatures without either being blocked.
- **`server/src/server.test.ts`** (extend): existing real socket.io round-trip pattern (`createGameServer`, real `socket.io-client` sockets). The `join` emission in existing tests now sends an identity payload instead of a bare string; add a round-trip case joining with a signature identity end-to-end, asserting the broadcast state carries it correctly.
- **New `client/src/components/PlayerIdentity.test.tsx`**: existing presentational-component pattern (render with props, assert output, no live socket) — a text identity renders as visible text; a signature identity renders an image with the expected source.
- **New `client/src/components/JoinQrCode.test.tsx`**: same presentational pattern — given a URL prop, renders a QR graphic and the same URL as visible text.
- Existing component tests that currently assert on `player.name` directly (`Scoreboard.test.tsx`, `Lobby.test.tsx`, `GameOver.test.tsx`) are updated to render through the new shared identity component instead, keeping their existing assertions about what's visible on screen.
- No test coverage for the raw canvas-drawing/export mechanics themselves, per the untested-glue decision above.

## Out of Scope

- Server-side LAN address detection for the QR code — the URL is only ever whatever the Board page itself was loaded from; no new server logic enumerates network interfaces.
- Any perceptual or visual similarity checking between drawn Signatures — only exact-match duplicate rejection for typed names is preserved, and it never applies to Signatures.
- Changing a Player's identity after joining (renaming, redrawing) — a Player's identity is fixed once they join, exactly as a typed name is today.
- Any accessibility affordance (e.g. alt text) specifically for Signatures beyond what the app already does for images in general.
- Visual/styling specifics of the drawing canvas (size, stroke color/thickness, clear/undo controls) — left to implementation.
- Any change to how reconnect works.

## Further Notes

- `CONTEXT.md` already has a **Signature** term and an updated **Player** definition from the grilling session that produced this spec — no further glossary work needed.
- No ADR was written for this spec. Two real trade-offs were made (no similarity-checking for Signatures; trusting `window.location` over server-side LAN detection for the QR code), but both are easily reversible later without a deeper rearchitecture, so neither clears the "hard to reverse" bar for an ADR.
- QR-code joining and Signatures are independent of each other technically; they're combined into this one spec only because they came out of the same grilling session, at the user's preference for tracking them as one piece of work.
