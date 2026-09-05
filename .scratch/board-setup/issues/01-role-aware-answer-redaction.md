# 01: Server-side Answer redaction by socket role (ADR-0006)

**What to build:** Lay the wire-security foundation this spec depends on, using today's static fixture content so it's fully demonstrable before any Host-authored content exists. Each socket declares its role (Host, Board, or Player) once at connection. The server stops broadcasting one identical `GameState` to everyone and instead sends each socket a view appropriate to its role: the Host always receives the Active Clue's Answer the moment it becomes Active (matching today's behavior), but a Board or Player socket never receives it until the Host Reveals. `ActiveClue` gains `clueText`/`answer` fields (populated from the existing `trivia.ts` fixture at `selectTile` time) so this redaction has something real to work on, and the client stops reading Clue content from a static import.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `ActiveClue` gains `clueText: string` and `answer: string`, populated from the existing `CATS` fixture (by `categoryIndex`/`tileIndex`) at `selectTile` time — the reducer always stores the true Answer here.
- [x] A new pure function (e.g. `viewForRole(state, role)`) returns `state` unchanged for the `"host"` role; for `"board"` or `"player"`, it redacts `activeClue.answer` whenever `activeClue` exists and `revealed` is `false`.
- [x] Each socket declares its role once at connection (e.g. an `identify` event carrying `"host" | "board" | "player"`), mirroring the existing `join`/`reconnect` event pattern. An unidentified socket defaults to the most restrictive (`"player"`) view until it identifies.
- [x] The server tracks each connected socket's declared role and, on every `dispatch()`, emits `viewForRole(state, role)` per-socket instead of the current single `io.emit("state", state)` broadcast.
- [x] `HostPage.tsx`, `BoardPage.tsx`, and `JoinPage.tsx` each emit the `identify` event with their respective role on connect.
- [x] `client/src/activeClue.ts`'s `resolveActiveClue` no longer imports `CATS`; it reads `clueText`/`answer` directly off the `ActiveClue` it's given.
- [x] A new test file (e.g. `shared/src/gameView.test.ts`) covers `viewForRole` with plain objects in/out: Host view always includes the true `answer`; Board/Player view has `answer` absent/redacted while `revealed` is `false` and present once `revealed` is `true`.
- [x] `server/src/server.test.ts` is extended with real socket.io round-trip coverage: a socket identifying as `"board"` or `"player"` never receives the Answer in any `"state"` broadcast before a `reveal`, while a socket identifying as `"host"` always does; the Board/Player socket receives it in the broadcast immediately following `reveal`.
