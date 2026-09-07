# 01: Author a two-Round Board in Setup

**What to build:** During Board Setup, the Host can toggle "Double Jeopardy" on for the Game. When on, a second, entirely separate Category/Clue-authoring panel appears below Round 1's — same Category count as Round 1, its own five Clues per Category, Value labels shown as $200–$1000 instead of $100–$500. Open Lobby stays disabled until every Category name and every Clue (text and answer) is filled in for Round 1, and, when Double Jeopardy is on, for Double Jeopardy too. Toggling Double Jeopardy off before opening the Lobby drops its authored content; toggling it back on starts that panel blank again. A single-Round Game (toggle left off) behaves and looks exactly as Board Setup does today — no visible change.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `GameState` gains `twoRounds: boolean` (default `false`) and `doubleJeopardyContent: CategoryData[] | null` (default `null`)
- [ ] New setup-only reducer action `setTwoRounds { value: boolean }`: turning on seeds `doubleJeopardyContent` with blank content at Round 1's current Category count; turning off clears it back to `null`; no-op outside `phase === 'setup'`
- [ ] New setup-only reducer actions `editDoubleJeopardyCategoryName` and `editDoubleJeopardyClue`, mirroring `editCategoryName`/`editClue` but targeting `doubleJeopardyContent`; no-op whenever `doubleJeopardyContent` is `null`
- [ ] `openLobby`'s completeness gate additionally requires `doubleJeopardyContent` to be complete whenever `twoRounds` is `true`; unaffected when `twoRounds` is `false`
- [ ] `BoardSetup.tsx` gains a Double Jeopardy toggle and, when on, a second category/clue-editing panel reusing the existing editing markup, labeled "Double Jeopardy" with $200–$1000 Value labels, and the incompleteness message extends to mention Double Jeopardy when relevant
- [ ] Server wiring: new socket events `setTwoRounds`, `editDoubleJeopardyCategoryName`, `editDoubleJeopardyClue`, each dispatched 1:1 like existing actions
- [ ] Reducer tests cover: toggling seeds/clears `doubleJeopardyContent`; edits mutate the right content array; `openLobby` is blocked when Double Jeopardy content is incomplete and Round 1's is complete, and succeeds once both are complete
- [ ] Component test coverage for the toggle/panel showing, hiding, and gating Open Lobby
