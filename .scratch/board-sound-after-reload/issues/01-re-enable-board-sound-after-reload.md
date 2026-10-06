# 01: Board Sound can't be re-enabled after the Board reloads

**What's broken:** If the Board tab is refreshed, or closed and reopened, mid-Game, Board Music (and Board Effects) stop and there's no way to bring them back until the next Game. Found during the cloud-hosting smoke test (`.scratch/cloud-hosting/issues/05-first-deploy-smoke-test.md`).

**Blocked by:** None (can start immediately)

**Status:** needs-triage

## Cause

- The gesture unlock lives only in the Board tab's memory: `useBoardAudio`'s `enabled` flag (`client/src/useBoardAudio.ts`). A reload resets it to `false`, and browsers block audio on the fresh page until someone taps it again.
- The "Enable Sound" button only renders in the `lobby` phase (`client/src/routes/BoardPage.tsx`). A Board reloaded during `playing`, `roundBreak` or `gameOver` never offers it, so sound stays off. The server-side mute flags are fine, since they survive the reload.

## Suggested fix (needs a UX call)

Offer the gesture unlock in every phase while sound isn't enabled, not just the Lobby. Options:

- Show the same "Enable Sound" button in every phase (for example, in the Header or a corner of the Board).
- Make a tap anywhere on the Board unlock sound while it's locked, with a small "Tap to enable sound" hint.

Autoplay can't be forced after a reload, so someone has to tap the Board once either way.

## Acceptance

- [ ] After a reload in any phase, the Board offers a way to enable sound.
- [ ] One tap restores Board Music (if unmuted, and nobody holds the Buzz) and Board Effects (if unmuted).
- [ ] The prompt disappears once sound is enabled and doesn't show on a Board that already has sound.
- [ ] `useBoardAudio` / `BoardPage` tests cover enabling sound outside the Lobby.
