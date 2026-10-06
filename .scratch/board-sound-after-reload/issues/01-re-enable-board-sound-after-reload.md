# 01: Board Sound can't be re-enabled after the Board reloads

**What's broken:** If the Board tab is refreshed, or closed and reopened, mid-Game, Board Music and Board Effects stop, and there's no way to bring them back until the next Game. Found during the cloud-hosting smoke test (`.scratch/cloud-hosting/issues/05-first-deploy-smoke-test.md`).

**Blocked by:** None (can start immediately)

**Status:** resolved

## Cause

- The gesture unlock lives only in the Board tab's memory: `useBoardAudio`'s `enabled` flag (`client/src/useBoardAudio.ts`). A reload resets it to `false`, and browsers block audio on the fresh page until someone taps it.
- The "Enable Sound" button only renders in the `lobby` phase (`client/src/routes/BoardPage.tsx`). A Board reloaded during `playing`, `roundBreak` or `gameOver` never offers it, so sound stays off. The server-side mute flags are fine, since they survive the reload.

## Decisions

- **The Host can't unlock it remotely.** Browser autoplay rules need a gesture on the Board's own device, and no socket message can stand in for one. So the fix lives entirely on the Board.
- **Try to unlock automatically on load.** When the Board mounts, it tries to unlock its audio without a gesture. If the browser allows autoplay for the site (Chrome's media engagement, or a per-site "allow autoplay" setting in Safari or Firefox), sound is enabled with no tap and Board Music/Effects follow the Host's mute flags as normal. Use `navigator.getAutoplayPolicy("mediaelement")` where the browser supports it, and otherwise fall back to an unmuted `play()` attempt that pauses at once if it succeeds. Don't let an autoplay probe be heard: a successful probe of the thinking loop must not leave it playing unless the normal "should play" rule says so.
- **Fallback when the browser blocks it: tap anywhere.** In any phase, while sound is still locked after the auto attempt, a tap or click anywhere on the Board unlocks it, with a small, unobtrusive "Tap to enable sound" hint. This replaces the Lobby-only "Enable Sound" button, so the Lobby uses the same mechanism. The hint disappears once sound is enabled.
- No Host-side indicator, no changes to the server or game engine, and no browser storage.

## Acceptance

- [x] On load, if the browser permits autoplay, Board Sound is enabled with no gesture, in any phase.
- [x] If autoplay is blocked, the Board shows the "Tap to enable sound" hint in every phase, including `playing`, `roundBreak` and `gameOver`, and a tap anywhere enables sound.
- [x] Once enabled, Board Music resumes if it's unmuted and nobody holds the Buzz, and Board Effects play if unmuted. Effects that happened before the unlock aren't replayed.
- [x] The hint is hidden whenever sound is enabled, and the old Lobby-only button is gone.
- [x] Tests (`useBoardAudio` and `BoardPage`) cover the auto-unlock succeeding, the auto-unlock being blocked, and a tap enabling sound outside the Lobby.
