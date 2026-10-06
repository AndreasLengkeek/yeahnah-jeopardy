# 04: Render blueprint and setup guide

**What to build:** Everything needed for the repo to deploy to Render's free tier with no dashboard guesswork: a checked-in Render blueprint and a short setup guide. See `.scratch/cloud-hosting/spec.md` and ADR-0014.

- Blueprint: one free-tier web service, single instance; build command installs dependencies and builds the client; start command runs the production server (from ticket 02) pointed at the built client; health check on the existing health endpoint; auto-deploy from `main`; a pinned Node version; `HOST_PASSCODE` declared as a secret whose value is entered in the dashboard, never committed. Uses the platform's `*.onrender.com` address — no custom domain.
- Setup guide (in the repo's docs): first-time Render setup from the blueprint, setting/rotating the Host Passcode, and the operational facts — the first visit after idle takes ~1 minute to wake; a sleep, restart, or redeploy ends the current Game; don't push to `main` during game night. Mention fallbacks (Railway Hobby, Google Cloud Run) in a line or two.

**Blocked by:** 02 (Serve the built client from the game server), 03 (Host Passcode)

**Status:** done

- [x] Render blueprint checked in with all of the above, and no secret values in it
- [x] Node version pinned for the deploy (and consistent with local tooling)
- [x] Setup guide covers first-time setup, the Host Passcode, wake-up delay, and Game loss on sleep/redeploy
- [x] Running the blueprint's build and start commands locally (with `HOST_PASSCODE` set) serves the app with the passcode enforced

## Comments

- `render.yaml` (checked against render.com/docs/blueprint-spec): one `free` web service in `singapore` (closest region to NZ/AU), `numInstances: 1`, `npm ci --include=dev && npm run build`, `npm start`, `healthCheckPath: /health`, `branch: main` with `autoDeployTrigger: commit` (the current name for the deprecated `autoDeploy`), and `HOST_PASSCODE` with `sync: false`. Render only prompts for `sync: false` values when the Blueprint is first created, so rotating the passcode happens in the dashboard (covered in the guide).
- Node is pinned to major 26 via `.node-version` (which Render reads ahead of `engines`) and `engines: ">=26 <27"` in the root `package.json`. Local tooling is Homebrew Node 26.8.1 with no version manager. Render's own default is 24.x.
- Render sets `NODE_ENV=production` only at runtime, so a plain install already gets devDependencies. `--include=dev` keeps the client build working if that ever changes.
- Guide: `docs/deploy.md`.
- Removed `cors()` and socket.io's `cors: { origin: "*" }`, plus the `cors`/`@types/cors` deps. The client connects same-origin (`io()`), and in dev Vite proxies `/socket.io`. A new server test asserts that no cross-origin access is granted. Checked `npm run dev`: the polling handshake and a Host claim both work through the Vite proxy.
- Local acceptance: ran the Blueprint's build and start commands with `HOST_PASSCODE` set and `PORT=3401`. `/host`, `/board`, `/join` returned the entry page, `/health` returned JSON, and assets were served. A Host claim was rejected with a wrong or missing passcode and accepted with the right one. Still to do: an actual deploy (ticket 05).
- For ticket 05: on the first deploy, check the build log to confirm Render resolved `.node-version` `26` to a 26.x release. Render resolves ranges with `node-version-alias`, so a bare major should work. If it doesn't, pin a full version.
- Left alone: `server`'s `@types/node` is still `^22` while the runtime is Node 26. Types only, no runtime effect.
- Follow-up: moved `vite` and `@vitejs/plugin-react` into the client's `dependencies`, so the build no longer needs devDependencies. The Blueprint's build command is now `npm ci --omit=dev && npm run build`. Verified in a clean copy: a production-only install (no `vitest`/`tsc`) builds the client, and `npm start` serves it with `HOST_PASSCODE` enforced.
