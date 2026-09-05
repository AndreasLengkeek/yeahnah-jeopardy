# Host manual score correction

Status: ready-for-agent

## Problem Statement

Judging a Buzz is a one-shot decision — the Host taps Correct or Incorrect, and today there's no way to undo a mis-click. A mis-tap, a mis-read of who buzzed in, or any other scoring mistake sticks for the rest of the Game (and shows up wrong on the Game Over screen) unless the Host restarts the whole Game.

## Solution

Let the Host directly set any Player's score to any value, right from the Scoreboard, at any time it's visible — mid-Clue, between Clues, or after Game Over. It's a plain inline edit with no confirmation step, matching the low-friction feel of the Host's other judging controls, and it never touches Clue or Buzz state — only the Player's score number changes.

## User Stories

1. As a Host, I want to edit a Player's score directly from the Scoreboard, so that I can fix a mis-judged Buzz without restarting the Game.
2. As a Host, I want to type an exact new score rather than nudge it up or down, so that I can fix any kind of mistake in one edit, not just the most recent one.
3. As a Host, I want to set a score to any integer, including negative numbers, so that the correction isn't artificially constrained beyond what scores can already reach through normal play.
4. As a Host, I want to edit a score without a confirmation step, so that correcting a mistake feels as immediate as tapping Correct or Incorrect.
5. As a Host, I want to edit a score at any point during play — even while a Clue is actively mid-attempt, with someone currently buzzed in or other Players already excluded — so that I don't have to wait for the Clue to resolve before fixing an unrelated mistake.
6. As a Host, I want to edit a score after the Game has reached Game Over, so that I can still fix a mistake that wasn't noticed until after the final Clue was closed.
7. As a Host, I want editing a score to never change Buzz state, excluded Players, or which Clue is Active, so that a score fix can't accidentally reopen or alter an unrelated Clue.
8. As a Board viewer, I want to see a Player's corrected score update the same way any other score change does, so that the shared display always reflects the true, current scores.
9. As a Player, I want a Host's score correction to be reflected the moment it happens, so that my own score is always accurate on my screen.
10. As a Board viewer or Player, I want to never see an edit control on the Scoreboard, so that only the Host can change scores.
11. As a Host, if the correction changes who's currently leading, I want the Game Over screen's winner to reflect the corrected score, so that the declared winner is always based on the true final scores.

## Implementation Decisions

- **New `GameAction`**: `setScore { playerId: string; score: number }` in `shared/src/types.ts`, handled by a new `applySetScore` case in `shared/src/gameEngine.ts`'s `applyAction`. Replaces the matching Player's `score` with the given value verbatim (no delta math, no clamping, negative allowed). No-ops (returns unchanged state) if `playerId` doesn't match any Player in `state.players` — consistent with the reducer's existing pattern for invalid actions. Valid regardless of `phase` or `activeClue` state (no gating condition) except during `"lobby"`/`"setup"`, where there is no Scoreboard and thus no way to trigger it from the UI — the reducer itself doesn't need a phase check since the client control simply won't be rendered there.
- **Server wiring**: a new `setScore` socket event in `server/src/server.ts`, dispatched 1:1 exactly like `judge`, `reveal`, etc. — `socket.on("setScore", (playerId: string, score: number) => dispatch({ type: "setScore", playerId, score }))`.
- **`Scoreboard.tsx`** gains an optional `onEditScore?: (playerId: string, score: number) => void` prop. When provided, each Player's score renders as an inline-editable control (click or focus to edit, commit on enter/blur, no confirmation dialog); when omitted, the component renders exactly as it does today, read-only. `HostPage.tsx` passes a handler that emits `socket.emit("setScore", playerId, score)`; `BoardPage.tsx` doesn't pass the prop at all, so the Board's rendering is unaffected.
- No changes to `ActiveClue`, `Tile`, or any judging/reveal/close logic — this is purely a `Player.score` write, fully decoupled from Clue state, matching the "Host" glossary amendment already made in `CONTEXT.md`.

## Testing Decisions

Tests exercise external behavior (state in/out, or rendered output), never internals — matching the existing suite's style throughout.

- **`shared/src/gameEngine.test.ts`** (extend): plain `GameState` in/out, no mocks, same pattern as existing describe blocks (e.g. `gameEngine: join`). New coverage: `setScore` replaces the target Player's score with the given value, including negative values; it's a no-op for an unknown `playerId`; it leaves `activeClue` (buzzed/excluded/correct/revealed state) completely untouched when applied mid-Clue; it works identically whether `phase` is `"playing"` or `"gameOver"`.
- **`server/src/server.test.ts`** (extend): existing real socket.io round-trip pattern (`createGameServer`, connect real sockets). New coverage: emitting `setScore` produces a broadcast state where the target Player's score matches the new value, following the same 1:1 wiring assertion style already used for `judge`/`reveal`/`closeClue`.
- **`client/src/components/Scoreboard.test.tsx`** (extend): existing presentational-component pattern (render with props, assert output / simulate interaction, no live socket). New coverage: with no `onEditScore` prop, scores render read-only exactly as before (regression check); with `onEditScore` provided, a score renders as an editable control and committing a new value calls `onEditScore` with the right `playerId` and parsed number.
- No new test files or seams — this feature only extends the three existing suites above.

## Out of Scope

- Any confirmation, undo, or audit trail for a correction — once applied, the new score simply is the score, same as any other score change.
- Reversing or altering Clue/Buzz/attempt-loop state as part of a correction — this is a pure `Player.score` overwrite, never a "re-judge."
- Any constraint on the typed value beyond being a valid integer (no $100-multiple rule, no min/max bound).
- Exposing score editing during `"lobby"` or `"setup"` — the Scoreboard isn't shown in those phases, so there's no surface for it.
- A new domain term — this is captured as an amendment to the existing **Host** glossary entry in `CONTEXT.md`, not a new concept.

## Further Notes

- `CONTEXT.md`'s **Host** entry already reflects this capability (updated during the grilling session that produced this spec) — no further glossary work needed.
- The Game Over screen's winner is derived reactively from `state.players`, so a correction applied from the Game Over screen naturally flows through to an updated winner without any special-casing.
