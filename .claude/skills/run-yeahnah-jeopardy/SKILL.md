---
name: run-yeahnah-jeopardy
description: Build, run, and drive Yeah Nah Jeopardy (the real-time multiplayer Jeopardy party game). Use when asked to start the app, run its dev server, run its tests/typecheck, or take a screenshot / verify a change works in the real Host, Board, or Join views (including buzz racing across multiple simulated players).
---

Yeah Nah Jeopardy is an npm-workspaces monorepo (`shared` + `server` + `client`) at the repo root — one deployable web app. `server` is an Express + Socket.IO backend (all game state lives in server memory); The server holds many concurrent **Rooms** (ADR-0015), each with its own 4-letter Room Code, Host Key and Game. `client` is a Vite + React frontend: `/` is home (Room Code entry plus "Create a Room"), `/join` is Room Code entry, and each Room has three screens: `/CODE/host` (Host controls), `/CODE/board` (shared display), `/CODE/join` (Player join + buzz). Bare `/host` and `/board` redirect to `/`. Most changes are verified by `npm test` alone (see "Direct invocation" below) — reach for `claude-in-chrome`, driving multiple Chrome tabs one per role, only for the slice it can't reach: real Socket.IO wiring across concurrent players (buzz racing, live score sync) and genuinely visual checks.

## Prerequisites

Node with npm workspaces support (already used by this repo — no extra system packages needed). No `.env` files exist or are required.

## Setup

```bash
npm install   # installs and links shared/server/client workspaces
```

## Direct invocation (no browser needed) — try this first

Check this before reaching for `claude-in-chrome` at all — most changes don't need a browser:

- **`shared/src/gameEngine.ts`** (pure game-rules functions) or **`server/src/server.ts`** (Socket.IO event wiring) → `npm test` imports and calls them directly.
- **`client/src/components/*.tsx`** or **`client/src/*.ts`** helpers → `npm run test -w client` renders them with Testing Library (jsdom, no browser, no dev server, no Socket.IO): a used Tile staying unclickable, the Answer only showing once `revealed`, buzz/footer text, score color, Room panel counts, Code Tiles, and so on.
- **`client/src/routes/{Home,Host,Board,Join}Page.tsx`** → also covered by `npm run test -w client`, with `socket.ts` mocked. `client/src/test/renderAt.tsx`'s `renderAt("/BRDK/host")` renders the real route table in a `MemoryRouter`, so routing, the Room Code from the address, per-Room storage and Host Key fragments are all testable without a browser.

Reach for the browser flow only when the change is one these tests can't see:
- The real `socket.ts` connection and `useGameState` wiring against a live server.
- Genuinely visual checks — the Clue Card's zoom/flip transition, layout, colors — jsdom has no layout or paint.
- Multi-player concurrency (buzz racing, live sync across real Socket.IO connections) that a single component render can't reproduce.

```bash
npm test           # shared (215 tests) + server (134 tests) + client (196 tests), via vitest — verified passing
npm run typecheck  # shared, server, client tsc --noEmit — verified clean
```

## Run (agent path — browser-driven verification)

Start both server (`:3001`) and client (`:5173`) together from repo root:

```bash
lsof -ti:3001 -sTCP:LISTEN | xargs -r kill   # free stale port first
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill
npm run dev > /tmp/yeahnah-dev.log 2>&1 &
```

Poll for readiness (macOS has no `timeout` builtin — poll manually):

```bash
until curl -sf http://localhost:5173/ >/dev/null; do sleep 1; done
tail -n 5 /tmp/yeahnah-dev.log   # look for "Yeah Nah Jeopardy server listening on :3001"
```

Then drive it with `claude-in-chrome` (load tools via `ToolSearch("select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__find,mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__browser_batch,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__read_page")` first). One real flow, verified this session:

1. `tabs_context_mcp{createIfEmpty:true}` → get a tab, `navigate` it to `http://localhost:5173/`. Click "Hosting tonight? Create a Room →", then **Create** (leave the Room Passcode empty: with no `ROOM_PASSCODE` set, creation is open). The tab lands on `/CODE/host` as Host; read the 4-letter Room Code from the address or the Room panel.
2. `tabs_create_mcp` twice more for two Player tabs, `navigate` each straight to `http://localhost:5173/CODE/join` (skips typing the code into the Tiles). Only add a Board tab (`/CODE/board`) if the spectator view itself is what you're checking — for a plain logic/state check, Host + 2 Players is enough and one fewer tab is one fewer thing to screenshot.
3. On each join tab: `find{query:"Your name input field"}` → `form_input{ref, value:"Alice"}` (do **not** use `computer{action:"type"}` here — see Gotchas) → `find{query:"Join button"}` → `computer{action:"left_click", ref}`.
4. On the host tab: once ≥2 players joined, `find{query:"Start Game button"}` → click it. The board renders immediately on host/board tabs via the Socket.IO push — no reload needed.
5. `find{query:"$100 tile under <category> category"}` on the host tab → click it to make a Clue active. The matching Player's Buzz button lights up within the same tick.
6. On a Player tab: `find{query:"Buzz button (circular)"}` → click. Host tab shows "`<Name>` has the buzz" immediately.
7. On host: `find{query:"Reveal button"}` → click (flips the Clue Card to the Answer face) → `find{query:"Correct button"}` → click. Score updates propagate live to host, board, and every Player tab.

### Token-efficient verification

A full `computer{action:"screenshot"}` is a JPEG image and costs far more than a text response — don't call it after every step. Use it only to confirm something visual (the Clue Card actually flipped, colors/layout render correctly); use text-based checks for everything else:

- **State/logic checks** (did the score update, is the tile marked used, is the Buzz button now disabled) → `get_page_text{tabId}`. It's plain text, a fraction of the cost of a screenshot, and enough to confirm "Alice — $100" or "Waiting for the Host to select a Clue…" appeared.
- **Finding multiple elements on one page** → one `read_page{tabId, filter:"interactive"}` call up front to collect every ref you'll need (name input, Join button, Buzz button), instead of a separate `find` call per element.
- **Reserve screenshots for checkpoints** — e.g. once after `startGame` to confirm the Board rendered, once after `reveal` to confirm the Clue Card flip — not after every click in between.
- **Reserve the whole browser flow for checkpoints, not every change** — if a PR touches both a presentational component and route-level wiring, run `npm run test -w client` for the former and drive the browser once, at the end, only to confirm the wiring itself (the route passing the right props, `socket.emit` firing) — not to re-verify rendering logic the component tests already covered.

Reference screenshot from a full pass with this app (Alice buzzed and scored $100 on `World Capitals`): `.claude/skills/run-yeahnah-jeopardy/verified-run-screenshot.jpg`.

When done, close every tab you opened (`tabs_close_mcp`) and stop the dev server:

```bash
lsof -ti:3001 -sTCP:LISTEN | xargs -r kill
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill
```

## Run (human path)

```bash
npm run dev   # starts server + client via `concurrently`, Ctrl-C stops both
```

Open `http://localhost:5173/`, create a Room (any passcode works locally), then open `/CODE/board` and `/CODE/join` in separate browser windows/devices manually. To host from a second device, use the Host link (Copy) in the Room panel. Useless in a headless context — that's what the agent path above is for.

## Gotchas

- **`computer{action:"type"}` silently no-ops on the Join name field.** Clicking the input and typing does not fire React's `onChange` here — the field stays empty and `Join` stays disabled. Use `find` to get a `ref` for the textbox, then `mcp__claude-in-chrome__form_input{ref, value}`, which goes through the real input pipeline.
- **Click coordinates from one tab's screenshot don't transfer to another tab.** Tabs in this session rendered at different viewport sizes (1492×812 for a solo tab vs 1237×627 once four tabs shared the window). Prefer `find` → click by `ref` over hardcoded `(x, y)` coordinates when multiple tabs are open.
- **Production run (one address, no Vite):** `npm run build` (root) builds only the client bundle into `client/dist` (`shared` is consumed as raw TS, and the server runs via `tsx`, so neither has a build step). Then `PORT=3101 npm start` runs the server with `CLIENT_DIR=../client/dist`, serving every client route, assets, Signature images (`/rooms/CODE/signatures/…`), `/health`, and the socket from one port. Without `CLIENT_DIR` (dev, tests) the server serves no client routes.
- **macOS has no `timeout` command** (`command not found: timeout` from zsh). Use a `curl` polling loop (shown above) instead of `timeout 30 bash -c '...'`.
- **Rooms are server-memory-only** — restarting the dev server ends every Room (old tabs then show "This Room has ended" or "No Room with that code"). For a clean game, create a new Room rather than restarting. Rooms also expire on their own after 30 minutes with no Host or Player connected.
- **Tabs in one Chrome profile share localStorage.** The Host Key and Player id are remembered per Room Code, so any `/CODE/host` tab in that profile is Host of a Room created there, and two Player tabs in the same Room share one remembered Player id: reloading a Player tab reattaches it as whichever Player joined last. Avoid reloading Player tabs mid-flow.
