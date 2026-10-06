# 02: Serve the built client from the game server

**What to build:** A production way to run the app as one service: after building, a single start command runs the game server, which serves the built client from the same address as the socket connection. Opening (or refreshing) `/host`, `/board`, `/join`, or any other client route loads the app; `/health` still answers. Local `npm run dev` is unchanged. See `.scratch/cloud-hosting/spec.md` (Implementation Decisions: one service, configuration injected, production runs TypeScript directly).

- The game server factory takes an options object; the built client's directory is its first option. When absent, no static serving (tests and dev unchanged). Only the process entry point reads it from the environment.
- The production server runs its TypeScript directly with `tsx` (moved to the server's runtime dependencies), because the shared package points at its TypeScript source and has no build step.
- The root build script currently fails (it calls a build in the shared package, which has none); fix it so it builds what production needs (the client bundle).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The game server factory accepts an options object with an optional built-client directory
- [ ] With a client directory configured, HTTP requests for `/`, `/host`, `/board`, and `/join` return the client's entry page; static assets are served; `/health` still answers — covered by tests at the existing server test seam using a stub directory
- [ ] With no client directory configured, behaviour is exactly as today (existing tests pass unchanged)
- [ ] The root build succeeds and produces the client bundle
- [ ] A production start command runs the server via `tsx` against the built client; manually verified that the whole app plays from one local address (e.g. port 3001) with no Vite dev server running
- [ ] `npm run dev`, `npm test`, and `npm run typecheck` still pass/work
