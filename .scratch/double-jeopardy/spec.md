# Double Jeopardy

Status: ready-for-agent

## Problem Statement

Every Game today is a single Board played once through at $100–$500 Values, then straight to Game Over. That flattens the game compared to real Jeopardy, where a second, higher-stakes Round — Double Jeopardy — gives the Board a second act with fresh Categories, doubled Values, and a second shot at a comeback via an extra Daily Double. Without it, there's no way to play a longer, escalating game, and no way to reuse the "one Board, one playthrough" format for a bigger event.

## Solution

Let the Host choose, during Board Setup, whether the Game has one Round or two. A single-Round Game plays exactly as it does today — no visible change at all. A two-Round Game has the Host author a second, entirely separate set of Categories for Double Jeopardy in the same Board Setup pass as Round 1's (same Category count, own five Clues each), and both Rounds' Daily Doubles (1 in Round 1, 2 in Double Jeopardy) are drawn at that same moment, before the Lobby even opens — kept secret from everyone, including the Host, exactly like today. Round 1 plays out exactly as today; once its last Tile closes, the Host — not the game automatically — starts Double Jeopardy with an explicit action, which swaps in the second Category set at doubled Values ($200–$1000) and carries scores over unchanged. Double Jeopardy then plays out exactly like Round 1 until its Board drains, at which point the Game reaches Game Over as it does today.

## User Stories

1. As a Host, I want to choose during Board Setup whether the Game has one Round or two, so that I can pick a quick single-Round game or a longer two-Round game as the occasion calls for.
2. As a Host, when I choose one Round, I want the Game to behave exactly as it does today — no Round language, no extra prompts, no behavior change — so that existing games aren't disrupted by this feature existing.
3. As a Host, when I choose two Rounds, I want to author an entirely separate set of Categories and Clues for Double Jeopardy, so that the second Round feels like a fresh Board rather than a value re-skin of the first.
4. As a Host, I want Double Jeopardy's Category count to always match Round 1's, so that I only make that decision once per Game instead of twice.
5. As a Host, I want to author both Rounds' content in the same Board Setup pass, before the Lobby opens, so that I don't have to break away from editing partway through the Game to write Double Jeopardy's Clues.
6. As a Host, I want the "every Category name and every Clue filled in" completeness gate that unlocks Open Lobby to also cover Double Jeopardy's content when it's enabled, so that I can't open the Lobby with an unfinished second Round waiting to surprise Players later.
7. As a Host, I want Double Jeopardy's Values to be $200–$1000 (double Round 1's $100–$500, Tile for Tile), so that the stakes escalate the same way they do on the real show.
8. As a Host, I want Double Jeopardy to have its own 2 Daily Doubles (versus Round 1's 1), so that the higher-stakes Round also carries the higher-stakes risk mechanic the real show uses.
9. As a Host, I want every Daily Double for the whole Game — Round 1's and Double Jeopardy's — drawn at the same moment Board Setup completes and the Lobby opens, so that the secrecy rule (kept from everyone, including me, until selected) is one consistent event instead of two.
10. As a Host, I want Double Jeopardy's Daily Doubles to stay exactly as secret as Round 1's — invisible to me and everyone else until their Tile is selected — so that starting Double Jeopardy doesn't leak information I wasn't supposed to have.
11. As a Host, I want Round 1 to play exactly as a single-Round Game does today — same Tile selection, Buzz race, judging, and Daily Double flow — so that nothing about the moment-to-moment play changes just because a second Round is coming.
12. As a Host, once every Tile on Round 1's Board is closed, I want to see a clear "Start Double Jeopardy" action instead of the Game automatically jumping ahead, so that I control the pacing of the transition (e.g., to recap scores or take a break).
13. As a Host, I want that transition action to only appear (and only be actionable) once Round 1's Board is fully drained, so that I can't accidentally skip ahead of Round 1 while Tiles remain.
14. As a Host, when I start Double Jeopardy, I want the Board to swap to Double Jeopardy's Categories and Values immediately, so that Players see the new Round the moment I trigger it.
15. As a Host, I want every Player's score to carry over unchanged from Round 1 into Double Jeopardy, so that Double Jeopardy is a continuation of the same competition, not a fresh start.
16. As a Host, I want the roster (who's joined, connection status) to carry over unchanged into Double Jeopardy, so that starting the second Round doesn't require anyone to rejoin.
17. As a Host, I want Double Jeopardy's Daily Double Wager ceiling to be its own $1000 top Value (not Round 1's $500), so that a Player wagering in Double Jeopardy can stake up to what that Round's Board actually prints.
18. As a Player, I want my Daily Double Wager ceiling in Round 1 to stay $500 even after I know Double Jeopardy exists, so that Round 1's stakes aren't quietly inflated by a Round I haven't reached yet.
19. As a Host, once Double Jeopardy's Board is fully drained, I want the Game to reach Game Over exactly as it does today for a single-Round Game, so that the ending feels identical regardless of how many Rounds were played.
20. As a Host, I want "Reset Game" and "Edit Board" (return to Setup) to work the same way they do today for a two-Round Game — whichever Round is in progress, resetting rebuilds fresh Boards and fresh Daily Doubles for both Rounds from the same authored content, and returning to Setup reopens both Rounds' content for editing, so that these existing escape hatches don't need special-casing for Double Jeopardy.
21. As a Host, if I return to Board Setup and then reopen the Lobby, I want both Rounds' Daily Doubles freshly redrawn (same as Round 1's already are today), so that replaying a two-Round Board Config doesn't put every Daily Double back in the same place.
22. As a Host authoring a Board Config export, I want it to include Double Jeopardy's content when the Game has two Rounds, so that I can save and reshare a complete two-Round Board, not just Round 1.
23. As a Host importing a Board Config that has no Double Jeopardy content (an old export, or one authored as single-Round), I want it to import cleanly as a single-Round Game, so that every Board Config ever exported keeps working with no migration step.
24. As a Host importing a Board Config that does have Double Jeopardy content, I want it to import as a two-Round Game with that content pre-loaded, so that importing a complete two-Round Board doesn't force me to re-author Double Jeopardy by hand.
25. As a Board viewer or Player, I want the Board, Values, and Category names I see to always match whichever Round is actually in progress, so that I'm never looking at stale Round 1 content during Double Jeopardy or vice versa.
26. As a Board viewer or Player, during the gap between Round 1 ending and the Host starting Double Jeopardy, I want a clear "waiting for Double Jeopardy" state instead of a blank or frozen-looking Board, so that I understand the Game is paused on purpose, not stalled or broken.

## Implementation Decisions

- **`GamePhase`** (`shared/src/types.ts`) gains `'roundBreak'`, ordered between `'playing'` and `'gameOver'`. Reached only from a two-Round Game whose Round 1 Board has just fully drained (see `resolveBoard` below); a single-Round Game's drained Board goes straight to `'gameOver'` exactly as today.
- **`GameState`** gains:
  - `twoRounds: boolean` — chosen at Board Setup (see `setTwoRounds` below), `false` by default, fixed once the Lobby opens (mirrors how Category count is already fixed for the Lobby's lifetime).
  - `round: 1 | 2` — which Round is currently being played (or was played, once in `gameOver`). Always `1` for a single-Round Game.
  - `doubleJeopardyContent: CategoryData[] | null` — Double Jeopardy's authored Categories/Clues, editable during Board Setup exactly like `content` (Round 1's, unchanged in name and shape). `null` whenever `twoRounds` is `false`; seeded to `blankContent(content.length)` the moment `twoRounds` flips to `true`, mirroring `applyNewBoard`'s blanking behavior.
  - `doubleJeopardyDailyDouble` and `doubleJeopardyDailyDouble2: DailyDoubleCoordinate | null` — Double Jeopardy's two secret Daily Double picks, drawn at the same moment as Round 1's `dailyDouble` (`applyOpenLobby`/`applyResetGame`), independently of each other (guard against picking the same coordinate twice — redraw the second pick until it differs from the first). Never exposed via `viewForRole` to any role, same rule as `dailyDouble` today.
- **`VALUES` in `trivia.ts`** stays as today's Round 1 constant (`[100, 200, 300, 400, 500]`); a new exported `DOUBLE_JEOPARDY_VALUES = [200, 400, 600, 800, 1000]` sits alongside it. A new helper `valuesForRound(round: 1 | 2): number[]` (in `gameEngine.ts`) is the one seam every Value-dependent call site switches through: `buildBoard(content, round)` now takes the Round to pick the right Value list; `wagerRange`/`DAILY_DOUBLE_WAGER_CEILING` become `wagerRange(player, round)` and `dailyDoubleWagerCeiling(round)` (500 for Round 1, 1000 for Double Jeopardy), used by `applySubmitWager` keyed off `state.round`.
- **New `GameAction`s**, handled in `applyAction`:
  - `setTwoRounds { value: boolean }`: setup-only no-op guard (`state.phase !== 'setup'` ⇒ no-op). Setting `true` seeds `doubleJeopardyContent` with blank content at the current Category count if not already present; setting `false` clears it back to `null`. Toggling back and forth before Open Lobby is always safe (matches `applyNewBoard`'s blank-content precedent) — no attempt to preserve partially-authored Double Jeopardy content across an off/on toggle, since it was blank to start with in the same session.
  - `editDoubleJeopardyCategoryName { categoryIndex, name }` and `editDoubleJeopardyClue { categoryIndex, tileIndex, field, value }`: setup-only, otherwise identical to `applyEditCategoryName`/`applyEditClue` but targeting `doubleJeopardyContent` instead of `content`. A no-op whenever `doubleJeopardyContent` is `null` (i.e., `twoRounds` is `false`).
  - `startDoubleJeopardy`: valid only when `state.phase === 'roundBreak'`. Rebuilds `board` from `doubleJeopardyContent` at Double Jeopardy Values, draws the two Double Jeopardy Daily Doubles into `dailyDouble`/`dailyDouble2` fields actually consulted during play (see below on collapsing the field names), sets `round: 2`, `phase: 'playing'`. A no-op in every other phase.
- **`applyOpenLobby`** gains: when `state.twoRounds`, also validate `isContentComplete(state.doubleJeopardyContent!)` before allowing the transition (user story 6) — Open Lobby's gate becomes "Round 1 complete, and Double Jeopardy complete if enabled." Draws Round 1's `dailyDouble` as today, plus (when `twoRounds`) Double Jeopardy's two coordinates, stored but not yet active (Round 1 plays first regardless).
- **Collapsing "current Round's Daily Double(s)" into one active shape**: rather than the reducer branching on `state.round` every time it needs "the Daily Double(s) for whichever Round is live," `GameState` keeps exactly the fields needed to build `board`/pick coordinates *per Round* (`dailyDouble` for Round 1, a `doubleJeopardyDailyDoubles: DailyDoubleCoordinate[]` pair for Double Jeopardy, each independently redrawable), and `applySelectTile`'s `isDailyDouble` check switches on `state.round` to pick which set to compare against (`state.round === 1 ? [state.dailyDouble] : state.doubleJeopardyDailyDoubles`). This keeps the "never exposed via viewForRole" invariant identical for both Rounds' secrets with no new redaction logic needed beyond extending the existing null-out in `viewForRole`.
- **`resolveBoard`** (private helper backing `applyCloseClue`): when the just-closed board is fully drained, the next phase becomes `'gameOver'` unless `state.twoRounds && state.round === 1`, in which case it becomes `'roundBreak'` instead. Draining Double Jeopardy's board (`state.round === 2`) always goes to `'gameOver'`, twoRounds or not.
- **`applyResetGame`**: rebuilds Round 1's `board`/`dailyDouble` from `content` exactly as today, resets `round: 1`, `phase: 'lobby'`, and (when `twoRounds`) redraws both Double Jeopardy Daily Double coordinates fresh too, though Double Jeopardy's `board` itself isn't rebuilt until `startDoubleJeopardy` runs again naturally.
- **`applyReturnToSetup`**: unchanged in shape, but now also leaves `doubleJeopardyContent`/`twoRounds` intact for further editing (same as `content` is preserved today), clearing only derived/secret state (`board`, `activeClue`, `dailyDouble`, the Double Jeopardy Daily Double coordinates) back to their setup-phase defaults.
- **`boardConfig.ts`**: `serializeBoardConfig`/`parseBoardConfig` take an optional second parameter/field for Double Jeopardy's `CategoryData[]`. Proposed file shape: `{ round1: CategoryData[], doubleJeopardy?: CategoryData[] }` — note this changes the top-level JSON shape from today's bare array to an object; `parseBoardConfig` must still accept a bare array (today's format) as an implicit `{ round1: <that array> }` for backward compatibility (user story 23), and only produce the new object shape going forward via `serializeBoardConfig`. `doubleJeopardy`, when present, is validated with the same per-Category/per-Clue rules as `round1`, at the same Category count.
- **`BoardSetup.tsx`**: gains a "Double Jeopardy" toggle (checkbox or pill button) next to the existing Category-count control, wired to `setTwoRounds`. When on, a second, visually distinct panel (reusing the exact same category/clue editing markup as Round 1's, parameterized by which content array and edit-action pair it's bound to) renders below Round 1's, labeled "Double Jeopardy" and showing `$200`–`$1000` Value labels instead of `$100`–`$500`. The existing completeness message/gate extends to mention Double Jeopardy when incomplete.
- **`HostPage.tsx`**: gains a `state.phase === 'roundBreak'` branch rendering a simple "Start Double Jeopardy" button (styled like the existing pill buttons) that emits `startDoubleJeopardy`; the existing "Edit Board"/`returnToSetup` header action extends to also show during `'roundBreak'` (same escape hatch as `'lobby'`/`'gameOver'` today).
- **`BoardPage.tsx`/`JoinPage.tsx`**: gain a `state.phase === 'roundBreak'` branch showing a plain "waiting for Double Jeopardy" message (parallel to how `'lobby'`/`'gameOver'` already get their own branch), addressing user story 26.
- **Server wiring** (`server/src/server.ts`): new socket events `setTwoRounds`, `editDoubleJeopardyCategoryName`, `editDoubleJeopardyClue`, `startDoubleJeopardy`, dispatched 1:1 exactly like every existing action.

## Testing Decisions

Tests exercise external behavior (state in/out, or rendered output), never internals — matching the existing suite's style throughout.

- **`shared/src/gameEngine.test.ts`** (extend): plain `GameState` in/out, no mocks, same pattern as existing describe blocks. New coverage:
  - `setTwoRounds` toggles `twoRounds` and seeds/clears `doubleJeopardyContent` accordingly; no-op outside `'setup'`.
  - `editDoubleJeopardyCategoryName`/`editDoubleJeopardyClue` mutate `doubleJeopardyContent` the same way their Round-1 counterparts mutate `content`; no-op when `doubleJeopardyContent` is `null`.
  - `openLobby` is blocked when `twoRounds` is true and `doubleJeopardyContent` is incomplete, even if Round 1's `content` is complete; succeeds once both are complete, drawing Round 1's and both Double Jeopardy Daily Double coordinates.
  - The two Double Jeopardy Daily Double coordinates are never equal to each other after a draw.
  - Closing Round 1's last Tile transitions to `'roundBreak'` when `twoRounds` is true, and straight to `'gameOver'` when `twoRounds` is false (regression coverage for today's behavior).
  - `startDoubleJeopardy` is a no-op outside `'roundBreak'`; from `'roundBreak'`, it rebuilds `board` from `doubleJeopardyContent` at `DOUBLE_JEOPARDY_VALUES`, sets `round: 2`, `phase: 'playing'`, and preserves `players` (scores and roster) unchanged.
  - Selecting a Tile during Double Jeopardy checks against the Double Jeopardy Daily Double coordinates, not Round 1's.
  - `wagerRange`/the Daily Double Wager ceiling resolve to $500 during Round 1 and $1000 during Double Jeopardy for the same Player score.
  - Closing Double Jeopardy's last Tile always transitions to `'gameOver'`.
  - `resetGame` on a two-Round Game resets to `round: 1`, `phase: 'lobby'`, rebuilds Round 1's board, and redraws fresh Double Jeopardy Daily Double coordinates.
  - `returnToSetup` preserves `doubleJeopardyContent`/`twoRounds` for further editing.
- **`shared/src/boardConfig.test.ts`** (extend): plain string in/out.
  - `parseBoardConfig` accepts today's bare-array format as Round-1-only content (backward compatibility).
  - `parseBoardConfig` accepts the new `{ round1, doubleJeopardy }` object shape, validating `doubleJeopardy` with the same per-Category/per-Clue rules as `round1`.
  - `serializeBoardConfig` round-trips a two-Round Board Config through `parseBoardConfig` unchanged.
- **`shared/src/gameView.test.ts`** (extend): asserts the Double Jeopardy Daily Double coordinates are never present in any role's view (host, board, player), extending the existing `dailyDouble`-redaction coverage.
- **`client/src/components/BoardSetup.test.tsx`** (extend): existing render-with-props/assert-output pattern. New coverage: the Double Jeopardy toggle and its content panel render/hide correctly, and Open Lobby stays disabled while Double Jeopardy content is incomplete.
- **`server/src/server.test.ts`** (extend): existing real socket.io round-trip pattern. New coverage: `setTwoRounds`, `editDoubleJeopardyCategoryName`/`editDoubleJeopardyClue`, and `startDoubleJeopardy` each produce a broadcast state reflecting the change, following the same 1:1 wiring assertion style already used for other actions.
- **Out of unit-test scope**: `HostPage.tsx`'s "Start Double Jeopardy" button and `BoardPage.tsx`/`JoinPage.tsx`'s `'roundBreak'` waiting message are plain route wiring with no existing test coverage precedent (phase-branch rendering in these files isn't unit-tested today) — verify manually via the `run-yeahnah-jeopardy` skill instead of adding new test files for them.

## Out of Scope

- Final Jeopardy (a third, single-Clue, all-wager Round) — not requested, not part of this spec.
- Any per-Round Category count (Double Jeopardy always matches Round 1's count).
- Authoring Double Jeopardy's content after Round 1 has started (no mid-game editing pass) — everything is authored upfront in Board Setup.
- Any automatic transition into Double Jeopardy — always an explicit Host action.
- Migrating old single-array Board Config exports on disk — `parseBoardConfig`'s backward-compatible parsing handles them at import time; no batch migration tooling.
- Any change to Board Sound cues for the Round transition — reuses whatever ambient/none state already applies to `'lobby'`/`'gameOver'`-adjacent phases (no new cue).
- Any Scoreboard/Game Over screen changes to show a per-Round score breakdown — final scores display exactly as today, with no Round-by-Round history.

## Further Notes

- `CONTEXT.md`'s **Game**, **Round**, **Category**, **Board Config**, and **Daily Double** entries were already updated during the grilling session that produced this spec — no further glossary work needed.
- ADR-0012 (Double Jeopardy's shape: manual trigger, upfront authoring, 2 Daily Doubles) and ADR-0013 (per-Round Wager ceiling, superseding ADR-0010) capture the two most non-obvious decisions baked into this spec — implementers should read those alongside this spec, not just this file in isolation.
- The Board Config JSON shape change (bare array → `{ round1, doubleJeopardy? }` object) is the one breaking-looking change here; backward-compat parsing of the bare-array format keeps every existing exported Board Config working, so this should not be treated as a migration concern.
