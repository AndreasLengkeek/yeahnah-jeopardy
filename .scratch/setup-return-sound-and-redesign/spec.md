# Board Setup return trip, Host-controlled Board Sound, and a Board Setup redesign

Status: ready-for-agent

## Problem Statement

A Host who spots a typo in a Clue, or wants to add another Category, after Players have already started joining the Lobby currently has no way back into Board Setup — `returnToSetup` only works after Game Over, so the Host's only recourse is to make everyone rejoin from scratch or live with the mistake for the whole Game.

Separately, Board Sound today is Board-only: it plays from the Board's own device once that device's "Enable Sound" gesture has run, with no way for the Host to turn it down or off if it's too loud, annoying, or inappropriate for the room — and only one recording exists per cue, so `correct`/`incorrect` sound identical every single time a Clue is judged, all Game long.

Finally, the Board Setup screen was built before a matching visual design existed for it; the Board, Lobby, Player, and Host screens all carry the ported Claude Design look (per CLAUDE.md), but Board Setup doesn't, so it looks visually out of place next to the rest of the app.

## Solution

Extend `returnToSetup` to also work from the Lobby (not just Game Over), preserving the already-joined roster since nothing about a Player's identity or score is affected by a Board content change — only Game Over's `returnToSetup` still clears the roster, matching a genuine replay. Surface this as an "Edit Board" button that moves into the `Header` component (both from Lobby and from Game Over), matching where the new Board Setup design puts its own "Edit categories" control.

Add a single shared `boardSoundMuted` flag to `GameState`, toggled by a persistent, always-visible mute/unmute button in the Host's `Header`, in every phase. The Board's own audio-enabling gesture is unchanged and still required; the Host's mute is an independent, additional gate on top of it. Add several recorded variants for the `correct` and `incorrect` cues (the `thinking` loop and `buzz` one-shot stay single files), with one variant chosen at random each time that cue fires.

Reskin `BoardSetup.tsx` to match the newly exported Claude Design canvas for the setup screen (checked into `docs/design/`, replacing the current one) — new card style, colors, header layout, and `<textarea>`s in place of single-line `<input>`s for Clue text and Answer — while keeping every existing behavior: the 3–6 Category count picker, blank-field validation flagging, Import/Export Board Config, and the Open Lobby completeness gate. The design's own fixed 5-column, picker-less, validation-less setup screen is a visual reference only, not a feature spec, per the project's established "port the look, not the pre-engine logic" convention.

## User Stories

1. As a Host, I want to return to Board Setup from the Lobby, so that I can fix a typo or change a Clue after Players have already started joining.
2. As a Host, I want to return to Board Setup from the Lobby without losing the Players who've already joined, so that they don't have to rejoin and re-pick names or redraw Signatures.
3. As a Host, I want the Category count to be editable again once I've returned to Board Setup from the Lobby, so that I can add or remove a Category if I change my mind.
4. As a Host, I want returning to Board Setup from the Lobby to require no confirmation step, so that fixing a small mistake is fast, consistent with how "Edit Board" already works from Game Over.
5. As a Host, I want an "Edit Board" button available throughout the Lobby (not just after Game Over), so that I always have a way back into Board Setup before the Game actually starts.
6. As a Host, I want the "Edit Board" button to live in the same header spot whether I'm in the Lobby or at Game Over, so that I don't have to relearn where it is depending on when I use it.
7. As a Host, I want returning to Board Setup to remain impossible once the Game has actually started (`playing` phase), so that mid-Clue Board edits can't disrupt an active Game.
8. As a Host, I want a mute/unmute button for Board Sound, so that I can control how loud or present the sound is for the room I'm playing in.
9. As a Host, I want the mute/unmute button to be visible and in the same place in every phase of the Game (setup, lobby, playing, gameOver), so that I never have to hunt for it.
10. As a Host, I want my mute/unmute choice to immediately affect the Board's speakers, so that muting actually stops the sound from playing, not just visually indicate a preference.
11. As a Host, I want the Board's own "Enable Sound" gesture-based unlock to remain unaffected by my mute toggle, so that the two mechanisms don't fight each other (my mute doesn't bypass the browser's gesture requirement, and the gesture doesn't unmute if I've muted).
12. As a Host, I want Board Sound to default to unmuted at the start of a Game, so that sound works out of the box without an extra step, matching today's behavior.
13. As a Player or spectator watching the Board, I want the Board's correct/incorrect cues to vary between plays, so that the same clip doesn't feel repetitive over a long Game.
14. As a Host, I want the `thinking` and `buzz` cues to keep playing the same single recording every time, so that only `correct`/`incorrect` gained variety, matching the scope of this change.
15. As a developer, I want each cue's variant filenames listed explicitly in code, so that adding, removing, or renaming a variant is a deliberate code change, not implicit directory-scanning behavior.
16. As a Host, I want the Board Setup screen to visually match the rest of the app's ported design, so that the whole Host/Board experience feels like one consistent product rather than one screen looking unfinished.
17. As a Host, I want to still pick a Category count between 3 and 6 when starting a new Board, so that the redesign doesn't remove a feature I already rely on.
18. As a Host, I want blank Category names and blank Clue/Answer fields to still be flagged before I can open the Lobby, so that the redesign doesn't let me open the Lobby with an incomplete Board.
19. As a Host, I want to still Import and Export a Board Config from the redesigned setup screen, so that the redesign doesn't remove my ability to save or reuse a Board.
20. As a Host, I want Clue text and Answer fields to accept and display multi-line content via a textarea, so that longer Clues are easier to read and edit, matching the new design.

## Implementation Decisions

### Board Setup return trip

- `applyReturnToSetup` in `shared/src/gameEngine.ts` accepts `phase === 'lobby'` in addition to `phase === 'gameOver'`; it remains a no-op from `'setup'` and `'playing'`.
- When returning from `'lobby'`, `players` is left untouched (roster preserved). When returning from `'gameOver'`, the existing behavior is unchanged: `players: []`, `board: []`, `activeClue: null`.
- No new `GameAction` variant is needed — `returnToSetup` already exists; only its guard and its player-clearing behavior change, conditioned on which phase it was called from.
- See ADR-0008 for why the roster-clearing behavior deliberately differs between the two entry points.
- The `Header` component gains an optional action button (e.g. an `action?: { label: string; onClick: () => void }` prop, or equivalent), rendered as a pill button in the same visual slot the new Board Setup design uses for "Edit categories". `HostPage.tsx` passes this prop with label "Edit Board" wired to `socket.emit("returnToSetup")` whenever `state.phase === 'lobby'` or `state.phase === 'gameOver'`. The existing bottom-of-screen "Edit Board" button in `gameOverControls()` is removed in favor of this header placement; "Reset Game" stays where it is.
- No confirmation dialog is added for the Lobby case, matching the existing Game Over case.

### Board Sound mute

- `GameState` gains `boardSoundMuted: boolean`, defaulting to `false` in `initialState()`. It is not reset by `applyOpenLobby`, `applyStartGame`, `applyReturnToSetup`, or `applyResetGame` — it's a Host preference for the session, independent of Game phase transitions, matching the "no persistence beyond server memory" model already established for the rest of `GameState`.
- A new `GameAction`: `{ type: 'toggleBoardSound' }`, applied unconditionally (works in every phase) by an `applyToggleBoardSound` reducer function that flips `boardSoundMuted`.
- `viewForRole` requires no change — `boardSoundMuted` passes through to every role via the existing spread, since it's not a Host-only or Answer-shaped field.
- Server wiring in `server.ts`: `socket.on("toggleBoardSound", () => dispatch({ type: "toggleBoardSound" }))`, following the exact pattern of every other no-payload action (e.g. `openLobby`, `resetGame`).
- `useBoardAudio(state)` in `client/src/useBoardAudio.ts` gates all playback (the `thinking` loop and the one-shot cues) on `enabled && !state.boardSoundMuted`, in addition to whatever phase/Active-Clue conditions already gate each cue. `enabled` (the Board device's own gesture-unlock) and `boardSoundMuted` (the Host's toggle) are independent booleans — both must allow sound for anything to actually play.
- The Host's mute button lives in the `Header` alongside (or near) the "Edit Board" button described above, rendered in every phase (`setup`, `lobby`, `playing`, `gameOver`), always in the same position. Clicking it emits `socket.emit("toggleBoardSound")`. Its pressed/label state (e.g. "Mute"/"Unmute") reflects `state.boardSoundMuted`.

### Multiple correct/incorrect sound variants

- `useBoardAudio.ts` replaces the single `correctRef`/`incorrectRef` `HTMLAudioElement` with an explicit, hardcoded array of file paths per cue (e.g. `["/audio/correct.mp3", "/audio/correct-2.m4a"]` and `["/audio/incorrect.mp3", "/audio/incorrect-2.mp3", "/audio/incorrect-3.m4a"]`), matching whatever files are actually present in `client/public/audio/` at implementation time. `thinking` and `buzz` remain single files, unchanged.
- Each cue keeps a pool of preloaded `HTMLAudioElement`s (one per variant, all constructed once, same lifecycle as today's single elements). When the cue fires, one element from the pool is chosen at random (`Math.floor(Math.random() * pool.length)`) and played.
- The random pick only needs to vary across separate firings, not mid-playback; no crossfade or queueing behavior is needed.
- Update the file-comment block at the top of `useBoardAudio.ts` (currently documenting "four files") to describe the new per-cue variant-list convention.

### Board Setup redesign

- Replace `docs/design/Jeopardy Board.dc.html` and `docs/design/support.js` with the newly exported versions (already unzipped from `Jeopardy Web App UI.zip` at the repo root during grilling) — this keeps the "checked-in canvas is the source of truth for the ported look" convention (per CLAUDE.md) current.
- Reskin `client/src/components/BoardSetup.tsx` using the new design's setup-screen styles as the visual reference (card background, border colors, border-radius, button pill style, spacing) — see the new canvas's `setupShellStyle`, `setupBtnStyle`, `startBtnStyle`, `catNameInputStyle`, `clueTextareaStyle`, `answerTextareaStyle`, and `inputBase` style objects for the concrete values to port.
- Category name stays a single-line `<input>`; Clue text and Answer become `<textarea>`s (matching the new design), sized appropriately for multi-line Clue text.
- The category grid's column count stays dynamic (driven by `content.length`, i.e. 3–6), not hardcoded to 5 like the new design's own markup (which predates the variable Category count) — the design is a style reference, not a layout-count spec.
- Every existing prop/behavior on `BoardSetup` is preserved unchanged: `onEditCategoryName`, `onEditClue`, `onNewBoard`, `onImportBoardConfig`, `onOpenLobby`, the Category-count picker (`MIN_CATEGORIES`–`MAX_CATEGORIES`), blank-field flagging via `isBlank`/`isContentComplete`, and the Import/Export Board Config buttons.
- The redesign does not touch `Board.tsx`, `Lobby.tsx`, `ActiveClue.tsx`, `ClueCardStage.tsx`, `Scoreboard.tsx`, `GameOver.tsx`, or any Player-facing screen — those already carry the ported look and are out of scope here.

## Testing Decisions

- **`shared/src/gameEngine.test.ts`** (existing seam, pure reducer tests):
  - `returnToSetup` from `lobby`: transitions to `setup`, preserves `players` and `content`, clears `board` and `activeClue`. Update or replace the existing `it.each(["setup", "lobby", "playing"])("is a no-op from the %s phase")` test so `lobby` is no longer asserted as a no-op — split it into a no-op check for `setup`/`playing` only, plus a new positive test for `lobby`.
  - `returnToSetup` from `gameOver` keeps its existing test coverage unchanged (still clears `players`).
  - `toggleBoardSound`: flips `boardSoundMuted` from its current value, and works from every phase (no guard) — test at least one call from each phase, or parametrize like the existing `it.each` patterns in this file.
  - `initialState()` includes `boardSoundMuted: false`.
- **`client/src/useBoardAudio.test.ts`** (existing seam, `renderHook` + `HTMLMediaElement.prototype.play` spy, matching current file's style):
  - When `state.boardSoundMuted` is `true`, no cue plays even when the Active Clue's fields change the way they would otherwise trigger `buzz`/`correct`/`incorrect`, and `thinking` does not start looping during `playing`.
  - When a cue with multiple variants fires, the played element's `src` is one of that cue's known variant URLs (assert membership in the expected set, not equality with a single fixed URL like the current `buzz` tests do). Mock `Math.random` (e.g. `vi.spyOn(Math, "random")`) to assert a specific variant is chosen for a given mocked value, and that a different mocked value picks a different variant.
- **`client/src/components/Header.test.tsx`** (existing seam, `render`/`screen` from Testing Library):
  - Renders no action button when none is supplied (existing "no subtitle" precedent).
  - Renders the action button with its given label when supplied, and calls the given `onClick` when clicked.
  - Renders the mute/unmute button, reflecting muted vs. unmuted state in its accessible label, and calls its handler when clicked.
- **`client/src/components/BoardSetup.test.tsx`** (existing seam): keep all existing assertions passing (category-count picker, blank-field flags, Import/Export, Open Lobby gate) against the reskinned markup — update only the queries that must change because Clue/Answer became `<textarea>`s (the accessible `textbox` role is unchanged, so most `getByRole("textbox", { name: ... })` queries should need no change).
- No new test seam for `HostPage.tsx` wiring (`socket.emit` calls) — stays thin, untested glue, consistent with existing precedent (`downloadBoardConfig`, `handleImportFile`) rather than introducing this repo's first Host-route component test.

## Out of Scope

- Any change to `applyStartGame`, `applyOpenLobby`, or the `playing`/`gameOver` phase transitions themselves, beyond what's described above.
- A Host-local/independent audio feed separate from the Board's — Board Sound remains one shared, Board-device-only audio experience; the Host's control is a remote mute switch on it, not a second sound source.
- Persisting `boardSoundMuted` (or the Board Sound variant choice) beyond server memory — matches the existing "no persistence" model for the rest of `GameState`.
- Any change to the number or content of `thinking`/`buzz` audio files.
- Sourcing, licensing, or producing the actual new `correct`/`incorrect` audio variant files — these were already dropped into `client/public/audio/` before this spec was written.
- Redesigning the Board, Lobby, Player, Host-in-play, Scoreboard, or Game Over screens — only Board Setup's look changes here.
- Any confirmation/warning UI before returning to Board Setup from the Lobby.
- Changes to how Players join, reconnect, or edit their identity.

## Further Notes

- Domain model already updated for this work: `CONTEXT.md`'s `Board Setup` and `Lobby` entries now describe the Board Setup ↔ Lobby round trip, a new `Board Sound` glossary term has been added, and `docs/adr/0008-lobby-return-to-setup-keeps-the-roster.md` records why the roster-clearing behavior deliberately differs between the Lobby and Game Over entry points into `returnToSetup`.
- The new design export (`Jeopardy Web App UI.zip`, already unzipped to `/tmp/design-export` during grilling) additionally shows an "Edit categories" header button and repositions the existing Board screen's header — only the Board Setup-specific styles and the header action-button placement are in scope; re-verify against the live file at implementation time rather than this spec, since exact style values may need minor adjustment once seen in the running app.
- `client/public/audio/` currently contains: `buzz.mp3`, `thinking.mp3`, `correct.mp3`, `correct-2.m4a`, `incorrect.mp3`, `incorrect-2.mp3`, `incorrect-3.m4a` — confirm this exact set (or whatever's present at implementation time) before hardcoding the variant-path arrays.
