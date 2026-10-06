# 02: Serve the built client from the game server

**What to build:** A production way to run the app as one service: after building, a single start command runs the game server, which serves the built client from the same address as the socket connection. Opening (or refreshing) `/host`, `/board`, `/join`, or any other client route loads the app; `/health` still answers. Local `npm run dev` is unchanged. See `.scratch/cloud-hosting/spec.md` (Implementation Decisions: one service, configuration injected, production runs TypeScript directly).

- The game server factory takes an options object; the built client's directory is its first option. When absent, no static serving (tests and dev unchanged). Only the process entry point reads it from the environment.
- The production server runs its TypeScript directly with `tsx` (moved to the server's runtime dependencies), because the shared package points at its TypeScript source and has no build step.
- The root build script currently fails (it calls a build in the shared package, which has none); fix it so it builds what production needs (the client bundle).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The game server factory accepts an options object with an optional built-client directory
- [x] With a client directory configured, HTTP requests for `/`, `/host`, `/board`, and `/join` return the client's entry page; static assets are served; `/health` still answers — covered by tests at the existing server test seam using a stub directory
- [x] With no client directory configured, behaviour is exactly as today (existing tests pass unchanged)
- [x] The root build succeeds and produces the client bundle
- [x] A production start command runs the server via `tsx` against the built client; manually verified that the whole app plays from one local address (e.g. port 3001) with no Vite dev server running
- [x] `npm run dev`, `npm test`, and `npm run typecheck` still pass/work

## Comments

- Done on branch `cloud-hosting/02-serve-built-client`. `npm run build` builds only the client (`client/dist`); `npm start` runs `server` via `tsx` with `CLIENT_DIR=../client/dist`. Manually verified on port 3101 (not 3001, to avoid colliding with a parallel worktree): `/`, `/host`, `/board`, `/join`, a refresh of `/board` mid-Clue, assets, `/health`, and the socket all served from one address; played a Clue end to end (Open Lobby, join, Start Game, select Tile, Buzz, Correct) with no Vite running. `npm run dev` still serves via Vite with the proxied socket, and the server serves no client routes there.
- Paths with a file extension never fall back to the entry page, so a missing or stale asset 404s instead of returning HTML.
- For the blueprint ticket: the `start` script sets `CLIENT_DIR` inline with POSIX `VAR=x cmd` syntax and a path relative to `server/`. That works under `npm start` on Render (Linux) but not from a Windows shell. The blueprint can call `npm start`, or set `CLIENT_DIR` itself and run `tsx` directly.
- Left for later: `app.use(cors())` and socket.io's `cors: { origin: "*" }` only exist for the old cross-origin dev setup and aren't needed on the single-origin deploy. That's out of this ticket's scope; worth revisiting with ticket 03/04.
