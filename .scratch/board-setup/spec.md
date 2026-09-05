# Board Setup: Host-authored Board Config with import/export

Status: ready-for-agent

## Problem Statement

Today's Board is a single hardcoded fixture (`shared/src/trivia.ts`) — every Game is played on the same five Categories and Clues, and the only way to change them is to edit source code and redeploy. A Host who wants to run this game with their own trivia (a themed party, a work quiz, a different set of Categories each time) has no way to do that.

There's also no durable way to keep a set of Categories and Clues around between plays. Without a database, a Host who spends time writing good Clues has nowhere to save that work except by not closing the tab.

## Solution

Add a **Board Setup** phase that runs before the Lobby opens: the Host authors a Board's Categories and Clues in-app — either starting from a pre-loaded example, starting a new blank Board of their chosen size, or importing a previously saved **Board Config** file — edits it until every field is filled in, and only then opens the Lobby for Players to join. At any point during Board Setup the Host can export the current content back out to a Board Config file. The file is the only persistence: there's no server-side board library, matching the existing "Game holds no state beyond server memory" model.

Because Clue text and Answers are now Host-authored content loaded into `GameState` at runtime rather than a fixture both server and client independently import at build time, they must travel over the wire — which means the server must now decide who receives a Clue's Answer and when, rather than relying on it never being sent in the first place (see ADR-0006).

## User Stories

1. As a Host, I want to see a complete, playable Board pre-loaded the moment I open Board Setup, so that I can start a Game immediately without authoring anything if I just want to play the built-in example.
2. As a Host, I want to edit any Category's name in that pre-loaded Board, so that I can replace the example content with my own theme.
3. As a Host, I want to edit any Clue's text and Answer in that pre-loaded Board, so that I can replace individual Clues without discarding the rest.
4. As a Host, I want to start a brand-new blank Board instead of editing the pre-loaded one, so that I can author a Board entirely from scratch.
5. As a Host starting a new blank Board, I want to choose how many Categories it has, from 3 to 6, so that I can match a shorter or a full-length Jeopardy-style board.
6. As a Host, I want the Category count I chose to be fixed for that Board — no adding or removing columns later, even while still in Board Setup — so that the editing experience stays simple and I don't lose authored Clues to an accidental resize.
7. As a Host who wants a different Category count than what's currently loaded, I want to start a new blank Board (or import a file) rather than resize the current one, so that the fixed-count rule stays simple and consistent.
8. As a Host, I want every Board — pre-loaded, newly created, or imported — to always have exactly five Clues per Category at the standard $200–$1000 value progression, so that Values stay standard and only content is mine to author.
9. As a Host, I want to export my current Board's content to a file at any point while I'm in Board Setup, so that I can save my work and reuse or share it later.
10. As a Host, I want to import a previously exported Board Config file, so that I can resume editing a Board I saved earlier or reuse one I've built before.
11. As a Host importing a file with some blank or missing Clue text/Answers, I want the import to still succeed, with the incomplete fields flagged inline in the editor, so that I can fix just the gaps rather than starting over.
12. As a Host importing a file whose Category count is outside 3–6, or whose structure is unrecognizable, I want the import rejected with a clear message and my current Board left untouched, so that a bad file can't silently corrupt my work in progress.
13. As a Host, I want to be blocked from opening the Lobby until every Category has a name and every Clue has both text and an Answer, so that Players never land on a Tile with nothing behind it.
14. As a Host, I want to see clearly which specific fields are still incomplete, so that I know exactly what's left before I can open the Lobby.
15. As a Host, once I open the Lobby, I want the Board's content and Category count locked, so that Players joining and the Game itself are working against a Board that can't shift underneath them.
16. As a Host, I want Board Setup to feel like the same kind of screen as the rest of the Host's tools, not a totally separate app, so that authoring a Board doesn't feel bolted on.
17. As a Host, after a Game ends, I want the next Game to reuse the same Board by default (fresh Tiles, fresh scores), so that I don't have to redo setup just to play again.
18. As a Host, after a Game ends, I want a visible way back into Board Setup with that same Board pre-loaded for editing, so that I can tweak or replace it before the next play without losing what I already had.
19. As a Host, I want to see every Clue's Answer as soon as I select its Tile, exactly as I can today, so that authoring my own content doesn't change how I judge a Buzz.
20. As a Board viewer, I want to never receive a Clue's Answer before the Host Reveals it, so that a technically curious Player can't spoil themselves by inspecting network traffic.
21. As a Player, I want to never receive a Clue's Answer before the Host Reveals it, for the same reason.
22. As a Board viewer or Player, I want Category names and Values to still be visible on the Board grid before any Tile is selected, exactly as today, so that browsing the Board feels unchanged.
23. As a Host, I want my own Board Setup screen to be the only place Board content can be edited, so that Players never see an "editing" view of the Board.
24. As a developer, I want the rule for who receives a Clue's Answer to be enforced by the server, not just hidden by client UI, so that the protection holds even against a client that ignores the intended UI.

## Implementation Decisions

- **New `GamePhase`**: `"setup"` is added before `"lobby"` in `shared/src/types.ts`'s `GamePhase` union. `initialState()` now starts in `"setup"` instead of `"lobby"`.
- **Authored content lives in `GameState`**: a new `content: CategoryData[]` field (same shape as today's `CATS`: `{ name, clues: [{ text, answer }] }`, always exactly 5 clues per category) holds the Board's authored Categories and Clues for the lifetime of the Game. It's editable only while `phase === "setup"`, and is what `trivia.ts`'s `CATS`/`VALUES` fixture now seeds `initialState()` with, rather than being imported directly by the engine or the client.
- **`board: Category[]` is unchanged in shape** (`{ name, tiles: [{ value, used }] }`) — Category names and Values remain always-visible to everyone, matching today. It's derived from `content`'s category names once Board Setup ends.
- **`ActiveClue` gains `clueText: string` and `answer: string`**, populated from `content[categoryIndex].clues[tileIndex]` at `selectTile` time. The reducer always stores the true Answer here — redaction for transmission is a separate concern (see below), not a reducer rule.
- **New `GameAction` variants**, all only valid while `phase === "setup"` (no-op otherwise, matching the reducer's existing pattern of returning unchanged state on an invalid action):
  - `newBoard { categoryCount: number }` — replaces `content` with a blank Board of the given size (3–6 categories, 5 blank clues each). Rejected if `categoryCount` is outside 3–6.
  - `editCategoryName { categoryIndex, name }`
  - `editClue { categoryIndex, tileIndex, field: "text" | "answer", value }`
  - `importBoardConfig { content }` — replaces `content` wholesale with an already-parsed, already-shape-validated Board Config. Rejected (state unchanged) if the category count is outside 3–6 or the structure doesn't parse as categories/clues at all. A structurally valid import with blank text/answer fields succeeds, loading those fields as empty strings.
  - `openLobby` — transitions `"setup"` → `"lobby"`. Rejected unless every category has a non-blank name and every clue has non-blank text and answer (a generalization of the existing `isBoardComplete` pattern, applied to authored content instead of played Tiles). Builds `board` from `content`'s category names on success.
  - `returnToSetup` — valid only from `"gameOver"`; transitions back to `"setup"` with `content` unchanged (pre-loaded for editing), matching "Board Setup opens pre-loaded" behavior on the return trip too.
  - `resetGame` (existing action) — now transitions to `"lobby"` (not `"setup"`), keeping `content` and its derived `board` shape unchanged, resetting players/activeClue — this is the "reuse the same Board" replay path.
- **No separate validation-error data structure.** An incomplete field (whether from hand-editing or a partially-filled import) is simply a blank string in `content`; the same completeness check that gates `openLobby` also drives which fields the editor highlights inline. Import only has one true rejection case: structural (bad category count or unparseable shape) — never a per-field one.
- **Parsing/serialization as pure functions** in `shared/`: `parseBoardConfig(raw: string): { ok: true; content: CategoryData[] } | { ok: false; error: string }` and `serializeBoardConfig(content: CategoryData[]): string`. These are the only parts of import/export that carry logic; the actual `<input type="file">` read and file-download trigger on the client are thin, untested glue, consistent with `socket.ts` and `playerIdentity.ts`'s existing localStorage calls.
- **Role-aware transmission (ADR-0006)**: a new pure function, e.g. `viewForRole(state: GameState, role: "host" | "board" | "player"): GameState`, in `shared/`. For `"host"`, returns state unchanged. For `"board"`/`"player"`, strips `content` entirely (never needed by those roles — they only ever see Category names via `board` and the Active Clue's `clueText`) and, when `activeClue` exists and `revealed` is `false`, redacts `activeClue.answer`.
- **Socket role declaration**: each socket declares its role once at connection (e.g. an `identify` event carrying `"host" | "board" | "player"`, mirroring the existing `join`/`reconnect` event pattern). The server tracks role per socket id and, on every `dispatch()`, emits `viewForRole(state, role)` per-socket instead of the current single `io.emit("state", state)` broadcast. This is new server infrastructure — today no socket has any declared identity at all. It's a self-declared role with no authentication behind it, at the same trust level as today's unauthenticated action dispatch (see Out of Scope).
- **`CONTEXT.md` already updated** with `Board Setup`, `Board Config`, and the revised `Board` definition (variable 3–6 Categories). No further glossary work needed for this spec.

## Testing Decisions

Tests should exercise external behavior (state in/out, or wire payloads), never internal implementation — consistent with the existing suite's style.

- **`shared/src/gameEngine.test.ts`** (extend): plain `GameState` in/out, no mocks — same pattern as existing describe blocks. New coverage: `newBoard` with valid/invalid counts; `editCategoryName`/`editClue` mutate `content`; `openLobby` blocked while incomplete and succeeds once complete, building `board` correctly; `importBoardConfig` accepts a valid file, accepts a file with blank fields (flagging via the completeness check, not a separate error state), and rejects an out-of-range category count or unparseable shape; `resetGame` after `gameOver` reuses `content` unchanged; `returnToSetup` after `gameOver` returns to `"setup"` with `content` still pre-loaded.
- **New `shared/src/boardConfig.test.ts`** (or similar): `parseBoardConfig`/`serializeBoardConfig` round-trip a valid Board Config; reject out-of-range category counts; tolerate missing text/answer fields as blanks rather than throwing.
- **New `shared/src/gameView.test.ts`** (or similar, for `viewForRole`): plain objects in/out. Host view includes `content` and the true `activeClue.answer`. Board/Player view never includes `content`, and `activeClue.answer` is absent/redacted pre-Reveal and present once `revealed` is `true`.
- **`server/src/server.test.ts`** (extend): existing real socket.io round-trip pattern (`createGameServer`, connect real `socket.io-client` sockets against an ephemeral port). New coverage: a socket that identifies as `"board"` or `"player"` never receives `content` or a pre-Reveal `answer` in any `"state"` broadcast, while a socket identifying as `"host"` always does; the Board/Player socket does receive the `answer` in the broadcast immediately following a `reveal`. Also extend the existing 1:1 action-to-socket-event wiring coverage for the new Board Setup events (`newBoard`, `editCategoryName`, `editClue`, `importBoardConfig`, `openLobby`, `returnToSetup`).
- **New client component tests** for the Board Setup editor screen(s), under `client/src/components/`, following the existing presentational-component pattern (`Lobby.test.tsx`, `Board.test.tsx`, etc.): rendered directly with props/mock dispatch callbacks, no live socket, asserting things like inline error rendering for incomplete fields and the Lobby-transition control being disabled until complete.
- Actual browser File API calls (reading an `<input type="file">`, triggering a download) stay untested plumbing, matching the existing precedent of `socket.ts` and the localStorage calls in `playerIdentity.ts` not being under test — only the pure parse/serialize functions they wrap are tested.

## Out of Scope

- True multi-room / concurrent Games — this remains a single Game at a time, matching the existing `Game` definition in `CONTEXT.md`.
- Configurable Values or a row count other than 5 — the standard $200–$1000 progression is fixed; only Category count (3–6) and content are Host-authored.
- Resizing Category count after creation, even while still in Board Setup — starting a new blank Board or importing a file is the only way to change it.
- A server-side board library or history of previously used boards — the Board Config file is the sole persistence mechanism; nothing is saved server-side beyond the current process's memory.
- Exporting outside Board Setup (mid-Lobby, mid-Game, or from `gameOver`) — export is only available while `phase === "setup"`.
- Any authentication or access control behind the new socket role declaration — a socket can currently already dispatch any action regardless of which client route it came from, and this spec doesn't change that trust model, only adds a role label used for view redaction.
- Multi-round structure (e.g. a Double Jeopardy-style second board) — this spec is about authoring a single Board's content, not multi-round play.

## Further Notes

- ADR-0005 accepted that the Host seeing the Answer immediately was a display-only concern because "every client's JS bundle already ships every Answer" — that premise is exactly what this spec removes (Clue content is no longer a build-time fixture), which is why ADR-0006 exists and why this spec's server-side redaction work is required, not optional hardening.
- The bundled example content in `trivia.ts` stops being imported directly by `gameEngine.ts` or the client; it becomes the seed data `initialState()` uses to populate `content` on first boot. `CATS`/`VALUES`' shape is otherwise unchanged.
- `client/src/activeClue.ts`'s `resolveActiveClue` currently reads Clue text/Answer from the static `CATS` import by index. That import goes away; it reads `clueText`/`answer` directly off the (now role-appropriate) `ActiveClue` it's given instead.
