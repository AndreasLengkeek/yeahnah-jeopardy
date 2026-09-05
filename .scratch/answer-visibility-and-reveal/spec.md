# Host answer visibility separated from public Reveal

Status: ready-for-agent

## Problem Statement

Today, judging a buzzed-in Player requires the Host to first publicly reveal the Answer — the same `revealed` flag that flips the Clue Card on the Board (and would on a Player's screen) is also the only thing that unlocks the Correct/Incorrect buttons. That means marking someone Incorrect already shows the Answer to everyone, spoiling the Clue for the remaining Players before they've had their own turn to buzz.

Separately, there's no way to give up on a Clue gracefully when nobody buzzes at all. Reveal today requires someone to already be buzzed in, so a Clue that stalls out with nobody attempting it can only be closed silently — the Host has no way to show the Answer to the room before moving on.

## Solution

Split "the Host can see the Answer" from "the Answer has been publicly revealed." The Host sees a Clue's Answer the moment it becomes the Active Clue, on their own screen only, and can judge a Buzz as Correct or Incorrect immediately — no public reveal required. "Reveal" becomes its own Host-triggered action, available whenever nobody currently holds the Buzz, that flips the Clue Card to its Answer face for the Board (and Players). Firing it ends that Clue's attempt loop: no further Buzz is accepted, and the Host can Close the Clue immediately with no score change, regardless of how many Players have or haven't been excluded.

## User Stories

1. As a Host, I want to see the Clue's Answer as soon as I select a Tile, so that I'm ready to judge whoever buzzes without needing to look anything up.
2. As a Host, I want the Answer visible only on my own screen, never on the Board or a Player's screen, so that Players still get a fair, unspoiled shot at the Clue.
3. As a Host, I want to mark a buzzed-in Player's answer Correct or Incorrect immediately, without first revealing the Answer to the Board, so that judging never spoils the Clue for Players who haven't buzzed yet.
4. As a Host, when I mark a Player Incorrect, I want the Clue to reopen for the remaining Players exactly as it does today, so that they still get their fair shot, never having seen the Answer.
5. As a Host, I want to publicly reveal the Answer whenever nobody currently holds the Buzz, so that I can show everyone the Answer once the Clue has stalled out.
6. As a Host, once I've revealed the Answer publicly, I want no further Buzz to be accepted on that Clue, so that nobody buzzes in after the Answer is already on screen.
7. As a Host, once I've revealed the Answer publicly, I want to Close the Clue immediately with no score change, regardless of how many Players have already been excluded, so that I'm never stuck waiting on Players who have nothing left to attempt.
8. As a Host, I want to still be able to Close a Clue silently without ever revealing it publicly (today's behavior), so that I can skip a Clue quickly when I don't want the ceremony of a Reveal.
9. As a Host, I want the Reveal button offered even in the "some Players excluded, nobody currently buzzed" limbo, so that I have an escape hatch instead of being stuck waiting on a straggler.
10. As a Board viewer, I want the Clue Card to only flip to the Answer face when the Host explicitly Reveals it, so that I never see the Answer before the Host chooses to show it.
11. As a Player, I want my Buzz to stop being accepted once the Host has revealed the Answer, so that I don't waste a Buzz on a Clue that's already been given away.
12. As a Host, I want the Reveal button offered only when nobody currently holds the Buzz, so that I can't accidentally reveal the Answer to the Board while judging someone's live guess.
13. As a Host, I want Correct/Incorrect controls to appear the instant a Player buzzes in, so that I'm never blocked from judging by having to Reveal first.
14. As a Host, I want my own Clue Card to never physically flip when I see the Answer, so that the flip animation stays a meaningful, one-time public spectacle reserved for the actual Reveal moment.
15. As anyone viewing the Board or Host screen, I want this to build on the existing Clue Card flip mechanics (`ADR-0004`) rather than introduce a second visual concept, so the Host and public experience stay visually consistent.
16. As a Host, I want reaching the Board's last Tile via a post-Reveal Close (nobody got it) to correctly end the Game exactly as a judged or silently-closed Tile does today, so that Game-over detection doesn't regress for this path.

## Implementation Decisions

- **`shared/gameEngine.ts` — `applyJudge`**: remove the `if (!clue.revealed) return state;` guard. Judging (Correct or Incorrect) now requires only `clue.buzzedPlayerId !== null` — it no longer cares whether the Answer was ever publicly revealed.
- **`shared/gameEngine.ts` — `applyReveal`**: invert the precondition. Reveal is legal only when `clue.buzzedPlayerId === null && !clue.revealed` — nobody currently buzzed, and it hasn't already been revealed. It no longer requires a prior Buzz, and it's no longer blocked by any number of prior exclusions.
- **`shared/gameEngine.ts` — `applyBuzz`**: add a rejection when `clue.revealed` is true, alongside the existing "already buzzed" and "excluded" rejections — once revealed, no further Buzz is accepted for that Clue.
- **`shared/gameEngine.ts` — `canCloseClue`**: extend so it also returns `true` whenever `clue.revealed` is true, in addition to the existing "nobody's attempted" / "everybody's excluded" cases. A public Reveal always makes the Clue closeable, regardless of exclusion count.
- **No `GameState`/`ActiveClue` shape change.** `revealed` stays a single boolean, but its meaning narrows to "the public, Board-facing flip has happened." It's no longer read anywhere as a proxy for "the Host can see the Answer" — the Host's visibility is a client-side display decision, not new engine state.
- **`client/src/components/ActiveClue.tsx`**: add a new optional prop (e.g. `alwaysShowAnswer`), passed only by `HostPage`. When set, the Answer renders as a persistent element alongside the Clue face — not on the flip's back face — while the flip transform itself stays driven solely by `details.revealed`. This means the Host's own Clue Card never physically flips, even though it always shows the Answer. `BoardPage` doesn't pass this prop, so Board (and any future Player Clue Card) rendering is unchanged.
- **`client/src/routes/HostPage.tsx` — `hostFooter`**: restructure the state machine:
  - `buzzedPlayerId !== null` → always show Correct/Incorrect (no more gating on `revealed`).
  - `buzzedPlayerId === null && !revealed` → show "Reveal" any time nobody currently holds the Buzz (fresh Clue, mid-way through exclusions, or all-excluded) — alongside "Close Clue" whenever `canCloseClue` is already true (unchanged from today, e.g. a fresh Clue or every Player excluded).
  - `buzzedPlayerId === null && revealed` → show only "Close Clue" (per the updated `canCloseClue`, this is always true once revealed).
- **No server changes.** `server/src/server.ts` already forwards `reveal`/`judge`/`buzz`/`closeClue` unchanged to the engine; none of this needed a server-level answer/redaction concern since every client's bundle already ships every Answer (`shared/src/trivia.ts`'s `CATS`) — visibility has only ever been a UI gate, not a confidentiality boundary.

## Testing Decisions

- Good tests here assert on `applyAction`'s resulting `GameState` (external behavior of the reducer), not on internal helper calls — matching the existing style in `shared/src/gameEngine.test.ts`.
- **Primary seam: `shared/src/gameEngine.test.ts`** (extend directly, calling `applyAction`/`initialState`, no mocking — existing pattern):
  - Update the existing `"rejects judge before the Answer is revealed"` case — this requirement is gone; replace with a case asserting judge (both Correct and Incorrect) succeeds immediately after a Buzz with `revealed: false`.
  - Update the existing `"rejects reveal before any buzz"` case — behavior inverts; replace with a case asserting reveal succeeds with no Buzz and no prior exclusions.
  - Add: reveal succeeds after some (not all) Players have been excluded, with nobody currently buzzed.
  - Add: reveal is rejected while `buzzedPlayerId !== null`.
  - Add: reveal is rejected if `revealed` is already `true`.
  - Add: buzz is rejected once `revealed` is `true`.
  - Add: `closeClue` succeeds immediately once `revealed` is `true`, even with only one of several eligible Players excluded (not all) — extending `canCloseClue`'s existing test coverage.
  - Add: a `closeClue` reached via reveal-with-no-buzz on the Board's last remaining Tile still transitions `phase` to `"gameOver"` (extends the existing `"gameEngine: game over"` describe block).
- **Secondary seam: `client/src/components/ActiveClue.test.tsx`** (extend directly, existing RTL pattern):
  - The Answer renders when `alwaysShowAnswer` is `true` and `revealed` is `false`.
  - The Answer isn't duplicated when both `alwaysShowAnswer` and `revealed` are `true`.
  - `alwaysShowAnswer` defaults to not showing the Answer when omitted (Board's existing "hides the answer when not revealed" case stays passing unchanged).
- **No new automated seam for `HostPage.tsx`'s footer wiring** — consistent with today, where the Host's Reveal/Correct/Incorrect button wiring has no dedicated test. Verify manually in a browser (per the `run-yeahnah-jeopardy` skill): buzz → judge immediately without revealing (confirm the Board never flips) → Incorrect reopens the Clue for a remaining Player who still hasn't seen the Answer; separately, a Clue nobody buzzes on offers Reveal → Board flips to the Answer face → Close Clue becomes available and ends the Clue with no score change.
- Prior art: `shared/src/gameEngine.test.ts` and `client/src/components/ActiveClue.test.tsx` are the direct precedents being extended; `server/src/server.test.ts` needs no changes since the server layer is untouched.

## Out of Scope

- Any server-side Answer redaction or per-role payload filtering — not needed, since no confidentiality boundary is being introduced; this is a UI-visibility change layered on data every client already has.
- Any change to the Player's own screen beyond the Buzz cutoff once revealed — Players have no Clue Card today (`JoinPage.tsx` only reads `buzzedPlayerId`/`excludedPlayerIds`), and this spec doesn't add one.
- A public/Board-facing indicator that a wrong guess just occurred — the existing per-Player buzz-lockout already communicates this implicitly; no new UI signal is added.
- Any change to scoring math or Tile-used marking beyond what naturally follows from `applyJudge`/`applyReveal`/`canCloseClue`'s updated preconditions — those stay as implemented in `.scratch/jeopardy-game/issues/03-judging-scoring-and-clue-resolution.md`.
- Any Host control to reverse or "un-reveal" a Clue once publicly revealed.
- Timing/animation changes to the existing zoom/flip mechanics (`ADR-0004`, `.scratch/clue-card-redesign/issues/03-reveal-flip.md`) — this spec only changes *when* the flip is legal, not how it looks or how long it takes.

## Further Notes

- Builds directly on this session's `CONTEXT.md` updates (Clue, Buzz, Host, Clue Card, and the new Reveal entry) and `docs/adr/0005-reveal-ends-attempt-loop.md` — read both before implementing, since they record the reasoning behind the precondition changes above.
- Supersedes one checkbox from `.scratch/jeopardy-game/issues/03-judging-scoring-and-clue-resolution.md`: "After an Answer is revealed, the Host control panel offers correct/incorrect controls for the buzzed-in Player" is replaced by this spec's stories 3 and 13 (judging no longer waits on a reveal at all).
