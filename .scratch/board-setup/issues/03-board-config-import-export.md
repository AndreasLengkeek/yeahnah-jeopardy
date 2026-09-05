# 03: Board Config: import and export

**What to build:** Let the Host save their authored Board to a file and load it back in later. From the Board Setup screen, an export downloads the current `content` as a Board Config file; an import reads a file back in, replacing `content` wholesale. A structurally valid file with some blank Clue text/Answers still loads successfully (the existing completeness check from ticket 02 flags the gaps inline); a file with an out-of-range Category count or an unrecognizable structure is rejected outright, with the Host's current Board left untouched.

**Blocked by:** 02 (Board Setup: author and edit a Board in-app)

**Status:** done

- [x] A pure `parseBoardConfig(raw: string)` function returns either the parsed `content` or a structural error — rejecting a Category count outside 3–6 or a shape that doesn't parse as categories/clues at all, while tolerating missing/blank text or answer fields as empty strings rather than failing.
- [x] A pure `serializeBoardConfig(content: CategoryData[])` function produces the file contents for export.
- [x] A new `importBoardConfig { content }` reducer action (valid only while `phase === "setup"`) replaces `content` wholesale with an already-parsed, already-validated payload; a structural rejection from `parseBoardConfig` leaves the Host's current Board untouched with a clear error surfaced in the UI.
- [x] The Board Setup screen (from ticket 02) gains an Export control that serializes the current `content` and triggers a file download, and an Import control that reads a file, runs it through `parseBoardConfig`, and either dispatches `importBoardConfig` or shows the structural error.
- [x] Export is available only while `phase === "setup"`.
- [x] The actual `<input type="file">` read and file-download trigger are treated as thin, untested browser-API glue, consistent with the existing precedent of `socket.ts` and the localStorage calls in `playerIdentity.ts` — only `parseBoardConfig`/`serializeBoardConfig` themselves are unit-tested.
- [x] A new test file (e.g. `shared/src/boardConfig.test.ts`) covers: a valid Board Config round-trips through `serializeBoardConfig` then `parseBoardConfig`; an out-of-range Category count is rejected; missing text/answer fields parse as blanks rather than throwing.
- [x] `shared/src/gameEngine.test.ts` covers `importBoardConfig`: a valid payload replaces `content`; a payload with blank fields succeeds (surfaced via the existing completeness check, not a separate error state); the action no-ops outside `"setup"`.
