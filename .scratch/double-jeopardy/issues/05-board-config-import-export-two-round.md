# 05: Board Config import/export for two-Round Boards

**What to build:** Exporting a Board Config for a two-Round Game includes both Rounds' Categories/Clues; importing that file loads both Rounds' content and turns Double Jeopardy on. Every Board Config ever exported before this feature existed — a bare array of Categories — still imports cleanly as a single-Round Game, with no migration step required.

**Blocked by:** 01

**Status:** done

- [x] `serializeBoardConfig` produces `{ round1: CategoryData[], doubleJeopardy?: CategoryData[] }`, including `doubleJeopardy` only when the Game has two Rounds
- [x] `parseBoardConfig` accepts the new object shape, validating `doubleJeopardy` (when present) with the same per-Category/per-Clue rules as `round1`, at the same Category count
- [x] `parseBoardConfig` still accepts today's bare-array format, treating it as Round-1-only content (implicit `{ round1: <that array> }`) with `twoRounds` left off
- [x] `BoardSetup.tsx`'s Import/Export wiring uses the updated parse/serialize shape, turning Double Jeopardy on automatically when an imported Board Config includes `doubleJeopardy` content
- [x] `boardConfig.test.ts` coverage: parsing today's bare-array format still works; parsing the new two-Round object shape works; a two-Round Board Config round-trips through serialize → parse unchanged
