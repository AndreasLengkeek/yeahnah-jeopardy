## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (root `CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

### Design source

The imported Claude Design canvas is checked in at `docs/design/Jeopardy Board.dc.html` (plus its runtime, `docs/design/support.js`), mirroring claude.ai/design project "Jeopardy Web App UI". It's the source of truth for the Board's original look and the CATS/VALUES/THEMES data — read it before redesigning any Board, Host, or Player screen so changes build on the ported look rather than guessing at it. It predates the game engine, so its Component state/logic (used tiles, active clue, buzz, scoring) is reference only, not authoritative — `shared/gameEngine` is authoritative for game rules.
