# 01: Host manual score correction

**What to build:** Let the Host edit any Player's score directly from the Scoreboard. The Host picks a Player and types an exact new integer score (any value, including negative — no confirmation step), and it takes effect immediately, broadcasting to every connected client the same way any other score change does. This works at any point the Scoreboard is visible — mid-Clue (even while someone currently holds the Buzz), between Clues, or after Game Over — and never touches Clue, Buzz, or attempt-loop state. The Board's own Scoreboard rendering stays exactly as it is today: read-only, no edit affordance.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [x] A new `setScore { playerId, score }` `GameAction` is handled by the reducer (`applyAction` in `shared/src/gameEngine.ts`), overwriting the target Player's `score` with the given integer verbatim (no delta math, no clamping).
- [x] `setScore` is a no-op (state unchanged) when `playerId` doesn't match any Player in the roster.
- [x] `setScore` leaves `activeClue` (buzzed player, excluded players, correctPlayerId, revealed) completely untouched, regardless of whether a Clue is currently active or mid-attempt.
- [x] `setScore` works identically whether `state.phase` is `"playing"` or `"gameOver"`.
- [x] The server (`server/src/server.ts`) wires a new `setScore` socket event to dispatch the action, following the same 1:1 pattern as `judge`/`reveal`/`closeClue`.
- [x] `Scoreboard.tsx` gains an optional `onEditScore` callback prop; when provided, each Player's score renders as an inline-editable control (commit on enter/blur, no confirmation dialog); when omitted, the component renders exactly as it does today, read-only.
- [x] `HostPage.tsx` passes an `onEditScore` handler that emits the `setScore` socket event; `BoardPage.tsx` does not pass the prop, so the Board's Scoreboard stays read-only.
- [x] The Game Over screen's winner reflects a corrected score with no special-casing needed, since it's derived reactively from `state.players`.
- [x] `shared/src/gameEngine.test.ts` covers: `setScore` replaces the target score (including negative values); no-ops for an unknown `playerId`; leaves `activeClue` untouched when applied mid-Clue; works in both `"playing"` and `"gameOver"`.
- [x] `server/src/server.test.ts` covers: emitting `setScore` over a real socket produces a broadcast state with the target Player's updated score.
- [x] `client/src/components/Scoreboard.test.tsx` covers: with no `onEditScore` prop, scores render read-only (regression check); with `onEditScore` provided, a score renders as an editable control and committing a value calls `onEditScore` with the right `playerId` and parsed number.

## Comments

**Implemented** (commit `71379db`, branch `score-correction`). Full suite green: 53 shared / 5 server / 49 client. Typecheck clean.

Two-axis `/code-review` findings addressed:
- Extracted a `scoreColor(score)` helper in `Scoreboard.tsx` (was duplicated across the read-only and editable branches).
- `EditableScore.commit()` now only commits on a strict `/^-?\d+$/` match, so `"3.9"`, `"12x"`, `""`, `"-"` are discarded rather than silently coerced by `parseInt` — closer to the spec's "exact integer".
- Dropped the unspecified `parsed !== player.score` guard (scope creep); a re-typed identical value just flows through as a normal (idempotent) score write.
