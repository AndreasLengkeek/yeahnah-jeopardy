# Real-time multiplayer Jeopardy game

Status: ready-for-agent

## Problem Statement

The user has an imported Claude Design canvas ("Jeopardy Board.dc.html", project "Jeopardy Web App UI") that fully specifies the look and single-device demo logic of a Jeopardy-style party game, but it only runs inside Claude's design tool and only supports one person tapping through it alone (the Host simulates every Player's Buzz by tapping their name). The user wants to actually host this game for real people on their own phones at a local get-together: a shared Board on a TV/projector, a private Host control panel, and everyone else buzzing in live from their own device.

## Solution

Build a real-time multiplayer web app, run entirely on the Host's local network with no external hosting or accounts. The Host starts a small local server and opens two screens: a public Board display (safe to project) and a private Host control panel. Players join from their phones by visiting a URL and typing a name into the Lobby. Once at least two Players have joined, the Host starts the Game; the group plays through the ported categories and clues with live Buzz-in racing, Host-judged scoring, and a Game Over screen the Host can reset from at any time to start a new Game without restarting the server.

## User Stories

1. As a Host, I want to start a local server and open a Board display URL, so that I can show it on a TV/projector for everyone to see.
2. As a Host, I want to open a separate Host control panel URL on my own device, so that I can judge Buzzes and reveal Answers without Players seeing controls or early reveals.
3. As a Player, I want to open a join URL on my phone and enter a name, so that I can join the Game from my own device.
4. As a Player, I want to be rejected with a clear message if I pick a name that's already taken in the Lobby, so that I can pick a different one and avoid confusion on the Board.
5. As a Player, I want to see myself appear in the Lobby once I've joined, so that I know I'm ready to play.
6. As a Host, I want to see the list of joined Players in the Lobby, so that I know when enough people are ready to start.
7. As a Host, I want the "Start Game" action to be disabled until at least two Players have joined, so that I can't start a Game that can't meaningfully be played.
8. As a Player, I want joining to close once the Host starts the Game, so that no one can jump in mid-Game without a score.
9. As a Host, I want the Board to show five Categories and a 5x5 grid of Tiles with their Values, so that everyone can see what's available to play.
10. As a Host, I want to select an unused Tile, so that its Clue becomes the Active Clue and is shown to everyone.
11. As anyone viewing the Board, I want to see the Active Clue's Category, Value, and Clue text once a Tile is selected, so that I know what's being played.
12. As a Player, I want a Buzz button that's enabled the moment a Clue becomes Active, so that I can race to answer.
13. As a Player, I want my Buzz to be locked out the instant another Player's Buzz reaches the server first, so that only one Player answers at a time.
14. As a Player who's locked out, I want to see which Player currently has the Buzz, so that I understand why my button is disabled.
15. As a Host, I want to see which Player has buzzed in, so that I know who to expect an answer from.
16. As a Host, I want a "reveal" control that shows the Answer once someone has buzzed, so that I and everyone else can check their answer.
17. As a Host, I want to mark the buzzed Player's answer as correct or incorrect, so that their score updates accordingly.
18. As a Host, I want a correct answer to award the Clue's Value to the Player and mark the Tile used, so that the Game can move on to a new Clue.
19. As a Host, I want an incorrect answer to deduct the Clue's Value from the Player and reopen the Clue for the remaining Players to buzz, so that the game matches real Jeopardy's play-until-someone's-right dynamic.
20. As a Host, I want a Player who's already answered incorrectly on this Clue excluded from buzzing again on the same Clue, so that the same wrong Player can't keep guessing.
21. As a Host, I want to close out a Clue with no score change when nobody buzzes at all, so that I can move the Game along when a Clue stumps everyone.
22. As a Host, I want to return to the Board after a Clue resolves, so that I can select the next Tile.
23. As a Player, I want my score (including negative scores) visible at all times, so that I can track how I'm doing.
24. As a Player whose phone loses connection or reloads mid-Game, I want to rejoin as the same Player with my existing score intact, so that a network blip doesn't cost me my progress.
25. As a Host, I want the Game to detect when all 25 Tiles have been used, so that it can show a Game Over screen automatically.
26. As anyone viewing the Board, I want the Game Over screen to show final scores and the winner, so that we know who won.
27. As a Host, I want to reset the Game back to a fresh Lobby at any point — whether the Board is fully cleared or not — so that we can start a new Game or bail out early without restarting the server.
28. As a Host, I want the reset Lobby to require Players to (re)join fresh with $0 scores, so that a new Game starts clean.
29. As anyone using the app, I want the Board's look (title "Yeah Nah Jeopardy," Cobalt & Mint theme, yellow accent, embossed Tiles) fixed and consistent across every screen, so that Board, Host panel, and Player phones all feel like one cohesive game.
30. As a Host, I want the app to run entirely on my local network with no external hosting or accounts required, so that I can play at a moment's notice without setup friction.

## Implementation Decisions

**Monorepo layout** (npm workspaces): `client/` (Vite + React + TypeScript), `server/` (Node + Express + Socket.io + TypeScript), `shared/` (the game engine plus the ported design data and types).

**The game engine is the one seam** (`shared/gameEngine`): a pure reducer, `applyAction(state, action) -> state`, with no Socket.io, Express, or React inside it. Almost every test in this spec targets it directly.

- State (conceptually): Game phase (`lobby` | `playing` | `gameOver`); Players (id, name, score, connected); Board (5 Categories x 5 Tiles, each Tile holding a Value and a used flag); Active Clue (which Tile, revealed flag, the buzzed Player's id if any, the set of Players already excluded for having answered this Clue wrong).
- Actions: `join(name)`, `startGame()`, `selectTile(categoryIndex, tileIndex)`, `buzz(playerId)`, `reveal()`, `judge(correct: boolean)`, `closeClue()` (Host moves on with no Buzz or gives up), `resetGame()`, `reconnect(playerId)`.
- Validation the engine itself enforces (invalid actions are rejected/no-ops, not merely discouraged in the UI): `join` rejected on a duplicate name or once the Game has started; `startGame` rejected with fewer than 2 Players; `buzz` rejected from a Player excluded on the current Clue, with no Active Clue, or once another Player already holds the Buzz; `reveal`/`judge` rejected with no Active Clue (and `judge` additionally rejected with no buzzed Player); `judge(false)` clears the buzzed Player, adds them to the Clue's excluded set, and leaves the Clue Active for the remaining Players; `judge(true)` awards the Value, marks the Tile used, and clears the Active Clue; `resetGame()` is valid from any phase and returns to a fresh Lobby with an empty Player list.
- Categories, Clues, Values, and the six THEMES are ported verbatim from the imported design's `CATS`/`VALUES`/`THEMES` data into `shared/`. Board size stays fixed at 5x5. Only "Cobalt & Mint," accent `#f2c14e`, "Embossed" tile style, and title "Yeah Nah Jeopardy" are wired up for display; the other themes/accents/tile-style are carried over as unused data (cheap to keep, not exposed as a setting).

**Server** (`server/`): one in-memory Game instance (module-level, not per-request) wrapping the engine. Socket.io events mirror the engine's actions 1:1 — the server has no game-rule logic of its own, only "receive event → call `applyAction` → broadcast resulting state to every connected socket (Board, Host, all Players)." No database and no persistence beyond process memory (ADR-0001) — a server restart ends the Game.

**Client** (`client/`): three thin views, each rendering the broadcast state and dispatching actions, with no game logic duplicated client-side:
- Board display: read-only, safe to project (ADR-0002).
- Host control panel: dispatches `selectTile`/`reveal`/`judge`/`closeClue`/`resetGame`; kept on the Host's own device, never projected (ADR-0002).
- Player phone: a join form pre-Game (dispatches `join`), then a Buzz button plus the Player's own name and score post-join (dispatches `buzz`, and `reconnect` on reload using a persisted id).

**Buzz race resolution**: whichever Player's `buzz` action the server's Socket.io layer receives first for the current Active Clue wins; no client-side timestamping or latency compensation (ADR-0003).

**Reconnection**: at `join`, the server issues the Player an id that their browser persists (e.g. `localStorage`); on reload, the client calls `reconnect(playerId)` to reattach to their existing score. Valid only for a Player who joined before the Game started — it can't be used to create a new Player after the Lobby has closed.

## Testing Decisions

- Nearly all tests are unit tests against `shared/gameEngine`'s `applyAction`, asserting only on the resulting state and on whether an action was accepted or rejected — never on internal helper functions. Cover, at minimum: duplicate-name and post-start `join` rejection; `startGame` below the 2-Player minimum; `buzz` locking and exclusion-after-wrong; both `judge` outcomes; `closeClue` with no Buzz; Game Over detection once all 25 Tiles are used; `resetGame` from every phase; `reconnect` reattaching an existing Player's score and rejecting a not-yet-joined id.
- One thin end-to-end test exercises the Socket.io wiring itself — a real `socket.io-client` connecting and dispatching a couple of events, asserting the broadcast state matches — enough to catch a transport wiring regression, not to re-verify rules already covered by the engine's unit tests.
- No component-level tests are planned for the three React views; they're thin enough that the engine's tests plus manual verification in a browser are the intended coverage for this spec.
- No prior art exists in this repo yet (greenfield) — follow `CONTEXT.md`'s vocabulary and the numbered ADRs as the precedent for later work instead.

## Out of Scope

- Multi-round play (Double Jeopardy, Final Jeopardy).
- Multiple concurrent Games, room/join codes, or public internet hosting (ADR-0001).
- Host-authored or editable categories and clues — the ported design content is hardcoded for v1.
- Auto-checked text-answer judging — the Host judges manually.
- Host manual score correction (fixing a mis-click) — flagged as a future feature, not built now.
- A Host-facing theme/accent-color/tile-style settings UI — the design's flexibility is preserved as unused data only.
- Any authentication, accounts, or persistence beyond the server process's memory.
- Spectator-only views, QR-code join flows, or any join mechanism beyond visiting a URL and typing a name.

## Further Notes

- The imported Claude Design canvas ("Jeopardy Board.dc.html", Design-Canvas format, project "Jeopardy Web App UI") is the source of truth for the Board's look and the CATS/VALUES/THEMES data — port its values rather than redesigning them.
- `CONTEXT.md` and `docs/adr/0001`–`0003` capture the vocabulary and hard-to-reverse decisions this spec builds on (Game, Board, Category, Tile, Clue, Value, Host, Player, Buzz, Active Clue, Lobby). Keep using that vocabulary rather than drifting to synonyms.
- This is a multi-session build — `/to-tickets` should split it at minimum along: (1) the game engine and its full test suite, (2) server/Socket.io wiring, (3) Board display view, (4) Host control panel view, (5) Player phone view plus join/reconnect flow, (6) Game Over/reset flow — with the engine as the first, ungated ticket everything else blocks on.
