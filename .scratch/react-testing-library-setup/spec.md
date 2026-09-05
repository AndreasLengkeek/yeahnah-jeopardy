# React Testing Library setup for the client's presentational components

Status: ready-for-agent

## Problem Statement

Verifying a change to `client/`'s rendering today means starting the dev server and driving real Chrome tabs (via `claude-in-chrome`, per `.claude/skills/run-yeahnah-jeopardy/`) — opening a Host, two Player, and a Board tab, joining Players, and clicking through the Game to see whether a Tile, the Scoreboard, or the Clue Card render correctly. That's the only way to catch a rendering regression today, and it's slow and expensive for logic that has nothing to do with pixels: whether a used Tile stops being clickable, whether a negative score renders in the right color, whether the Clue Card shows the Answer only once revealed. The client workspace also has no test runner at all yet — `shared` and `server` both run on `vitest`, but `client/package.json` has only `dev`, `build`, and `typecheck` scripts.

## Solution

Add a `vitest` + `@testing-library/react` (jsdom environment) test setup to the `client` workspace, and use it to cover the presentational components' rendering and interaction logic directly — as plain function calls with props in, DOM out — with no browser, no Socket.IO connection, and no dev server involved. This targets exactly the layer that's cheap to get wrong and expensive to check today: `Board`, `Lobby`, `Scoreboard`, `ActiveClue`, and `Header`, plus the small pure helpers they depend on (`activeClue.ts`'s `resolveActiveClue`, `format.ts`'s `formatScore`). The three route-level views (`BoardPage`, `HostPage`, `JoinPage`) stay out of this seam — they wire `useGameState()` and `socket.emit` directly and remain covered by manual/`claude-in-chrome` verification, exactly as decided in the original `jeopardy-game` spec.

## User Stories

1. As a contributor changing `Board`, I want a test that fails when a used Tile becomes clickable again, so that I catch the regression without opening a browser.
2. As a contributor changing `Board`, I want a test that confirms clicking an unused Tile calls `onSelectTile` with the right `categoryIndex`/`tileIndex`, so that I know tile selection is wired correctly.
3. As a contributor changing `Board`, I want a test that confirms a used Tile renders with no Value text and no click handler, so that the "already played" state is verifiably correct.
4. As a contributor changing `Board`, I want a test that confirms rendering with no `onSelectTile` (the Board display's read-only mode) never attaches a click handler to any Tile, so that a future change can't accidentally make the projected Board interactive.
5. As a contributor changing `Lobby`, I want a test that confirms the joined-count text and each Player's name and score render correctly for zero, one, and multiple Players, so that the Lobby's empty and populated states are both verified.
6. As a contributor changing `Scoreboard`, I want a test that confirms a negative score renders in the negative-score color and a non-negative score renders in the accent color, so that the visual distinction Players rely on to read their standing is verifiably correct.
7. As a contributor changing `ActiveClue`, I want a test that confirms the Answer is absent when `revealed` is `false` and present when `revealed` is `true`, so that the Host-only reveal-timing guarantee is verified without a browser.
8. As a contributor changing `ActiveClue`, I want a test that confirms the "has the buzz" / "Waiting for a buzz…" text reflects `buzzedPlayer` correctly, so that Buzz-state rendering is verified.
9. As a contributor changing `ActiveClue`, I want a test that confirms an optional `footer` (the Host's Reveal/Correct/Incorrect controls) renders when supplied and is absent when omitted, so that the Board's (footer-less) and Host's (footer-supplied) uses both stay correct.
10. As a contributor changing `Header`, I want a test that confirms the `subtitle` renders only when supplied, so that the Board's (no subtitle) and Host's ("Host view") uses both stay correct.
11. As a contributor changing `resolveActiveClue` (`activeClue.ts`), I want a test that confirms it correctly looks up the Category name, Clue text, Answer, and Value from the Board/`CATS` data and resolves `buzzedPlayer` to the matching `Player` (or `null`), so that this shared derivation logic is verified once rather than indirectly through every component that uses it.
12. As a contributor changing `formatScore` (`format.ts`), I want a test that confirms positive, zero, and negative scores format with the correct sign and thousands separator, so that score display stays consistent everywhere it's used.
13. As a maintainer running `npm test` from the repo root, I want the client's new tests to run alongside `shared`'s and `server`'s, so that a single command verifies the whole monorepo.
14. As a maintainer, I want the client's test run to be fast and require no running dev server, database, or network access, so that it's cheap enough to run on every change.

## Implementation Decisions

- **New devDependencies in `client/`**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom` (as the vitest test environment). Version-match `vitest` to the `^2.1.4` already used by `shared`/`server` for consistency across the monorepo.
- **New `client/vitest.config.ts`** (or a `test` block added to `client/vite.config.ts` — implementer's choice, whichever keeps Vite's existing `plugins`/`server.proxy` config intact) setting `test.environment: "jsdom"` and `test.setupFiles` pointing at a new small setup file that imports `@testing-library/jest-dom` matchers.
- **New `client/package.json` script**: `"test": "vitest run"`, matching the exact script name and invocation style already used by `shared` and `server`.
- **Root `package.json`'s `test` script** extends to `npm run test -w shared && npm run test -w server && npm run test -w client`, so `npm test` from the repo root covers all three workspaces.
- **Test seam is the presentational components' props**: `Board`, `Lobby`, `Scoreboard`, `ActiveClue`, `Header` are rendered directly with plain prop objects (a `Category[]` Board, a `Player[]` list, an `ActiveClueDetails` object, etc. — no fixtures/factories beyond inline literals matching `@yeahnah/shared`'s existing types) and asserted on via Testing Library queries (`getByText`, `getByRole`, `queryByText` for absence) and, for `Board`'s click wiring, `@testing-library/user-event` firing a click and asserting against a `vi.fn()` passed as `onSelectTile`. No Socket.IO, no routing, no `useGameState`, no real or mocked network of any kind touches this seam.
- **`resolveActiveClue` and `formatScore` are tested as plain function calls** (already the case for `shared/gameEngine`'s tests) — call with representative inputs, assert on the returned value or string.
- **Out of the seam, deliberately**: `BoardPage`, `HostPage`, `JoinPage`, `useGameState`, and `client/src/socket.ts` are not touched by this setup. They stay covered by the existing `server/src/server.test.ts` Socket.IO wiring test (already exercises the same events these pages dispatch) plus manual/`claude-in-chrome` verification per `.claude/skills/run-yeahnah-jeopardy/SKILL.md`.

## Testing Decisions

- A good test here asserts on rendered output (text content, presence/absence of an element, a fired callback's arguments) — never on implementation details like internal component state, CSS class names, or exact inline `style` object values (the theme/palette is free to change independently of these tests).
- Modules tested: `client/src/components/Board.tsx`, `Lobby.tsx`, `Scoreboard.tsx`, `ActiveClue.tsx`, `Header.tsx`; `client/src/activeClue.ts`; `client/src/format.ts`.
- Modules explicitly not tested by this setup: `client/src/routes/*.tsx`, `client/src/useGameState.ts`, `client/src/socket.ts`, `client/src/App.tsx`.
- Prior art: `shared/src/gameEngine.test.ts` (pure-function unit tests, the style `activeClue.ts`/`format.ts` tests should follow) and `server/src/server.test.ts` (the existing precedent for "one thin seam, asserted on external behavior only" — this spec applies the same philosophy to the client's rendering layer).

## Out of Scope

- Testing `BoardPage`, `HostPage`, `JoinPage`, `useGameState`, or `client/src/socket.ts` — would require mocking the `socket.io-client` singleton, a second, more coupled seam this spec deliberately avoids (see Implementation Decisions).
- Visual regression / screenshot testing, animation or CSS assertions (e.g. the Clue Card's zoom/flip transition from ADR-0004) — jsdom has no layout or paint; that stays covered by manual/`claude-in-chrome` verification.
- Any change to the pages, hooks, or Socket.IO wiring themselves — this spec adds a test harness only, not new application behavior.
- End-to-end/browser-driven test automation (e.g. Playwright) — raised as a possible future alternative in conversation, but a separate concern from this setup.
- Reworking `.claude/skills/run-yeahnah-jeopardy/SKILL.md`'s browser-driven verification flow — this spec complements it for logic checks but doesn't replace it for visual ones.

## Further Notes

- This spec revises a decision recorded in `.scratch/jeopardy-game/spec.md`'s Testing Decisions: "No component-level tests are planned for the three React views; they're thin enough that the engine's tests plus manual verification in a browser are the intended coverage." That decision still holds for the three route-level views themselves; this spec narrows the gap by adding coverage for the presentational components they render, which the original spec didn't distinguish as a separate layer.
- Motivated by a conversation about the token cost of using `claude-in-chrome` to verify UI changes (see `.claude/skills/run-yeahnah-jeopardy/SKILL.md`'s Gotchas/verification guidance) — component tests give a much cheaper first line of defense for rendering logic, leaving the browser-driven flow for genuinely visual checks.
- Uses `CONTEXT.md`'s vocabulary throughout (Game, Board, Category, Tile, Clue, Value, Host, Player, Buzz, Active Clue, Lobby) and respects ADR-0002 (Board and Host views are split, read-only vs. interactive) in story 4's read-only-mode test.
