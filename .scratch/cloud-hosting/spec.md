# Cloud Hosting (Phase 1: public single-Game deploy)

Status: ready-for-agent

## Problem Statement

Today a Game only works if the Host runs the dev server on their own machine and every Player is on the same wifi. That rules out Players joining from their own homes (e.g. over a video call), and makes every game night start with "open a terminal, run the dev server, find the LAN IP". There's also no production build at all — the server never serves the client, and the root build doesn't even succeed — so there's nothing to deploy. And the moment the app is reachable from the internet, anyone who sees the Join QR code can swap `/join` for `/host` and take over the Game, including seeing every Answer.

## Solution

Deploy the app publicly as a single Node service on Render's free tier, with the server serving both the built client and the socket connection from one address — so the Board's Join QR code, built from whatever address the Board was opened at, just works. Gate every Host action behind a Host Passcode the operator sets as a secret on Render: the Host screen asks for it once per device, remembers it, and the server refuses Host actions (and withholds Answers) from any device that hasn't proven it. When no Host Passcode is configured — local development, wifi-only play — the Host stays open exactly as today, with a console warning. Still exactly one Game at a time (ADR-0001's single-Game rule stands; see ADR-0014); running several Games side by side is Phase 2.

## User Stories

1. As a Host, I want to open the game from a public web address, so that I don't need to run a dev server on my laptop on game night.
2. As a Player, I want to join from my own home over the internet, so that I can play remotely (e.g. over a video call) without being on the Host's wifi.
3. As a Player, I want to scan the Board's Join QR code and land on the public join page, so that joining remotely works the same as joining in the living room.
4. As a Player, I want to type the address shown under the QR code if my phone can't scan, so that I can still join.
5. As a Host, I want the Board, Host, and Join screens all served from the same address, so that there's only one thing to bookmark and nothing to configure.
6. As a Host, I want refreshing any screen (Board, Host, Join) on its own address to load the app rather than a "not found" page, so that a mid-game refresh doesn't break anything.
7. As a Host, I want the first visit on game night to wake the server automatically, so that I don't need to log into a dashboard to start it — waiting about a minute is fine.
8. As a Host, I want the server to stay awake for the whole game night while screens are connected, so that the Game isn't lost between Clues or Rounds.
9. As a Host, I want to be asked for the Host Passcode the first time I open the Host screen on a device, so that strangers who find the address can't run my Game.
10. As a Host, I want my device to remember the Host Passcode once I've entered it correctly, so that a refresh or reconnect mid-game doesn't make me type it again.
11. As a Host, I want to be Host from more than one device at once (e.g. phone and laptop) using the same Host Passcode, so that I can switch devices without kicking myself out.
12. As a Host, I want a clear message when I enter the wrong Host Passcode, so that I know to try again rather than wondering why nothing works.
13. As a Host, when the Host Passcode has been changed since my device remembered it, I want to be asked for the new one instead of being silently stuck, so that rotating the passcode never locks me out of my own Host screen.
14. As a Host, I want my Host screen to reclaim its Host role automatically after a dropped connection, using the remembered Host Passcode, so that network blips don't interrupt the Game.
15. As a Host, I want someone without the Host Passcode who opens the Host screen to see nothing but the passcode prompt, so that they can't see Answers, the Board's Clues, or Board Setup.
16. As a Host, I want the server to ignore any Host action from a device that hasn't proven the Host Passcode — selecting Tiles, judging, Revealing, Closing, setting scores, starting the Game or Double Jeopardy, designating the Daily Double wagerer, toggling Board Music or Board Effects, resetting, returning to Board Setup, and every Board Setup edit or Board Config import — so that bypassing the Host screen doesn't bypass the passcode.
17. As a Host, I want a device that hasn't proven the Host Passcode to never receive Answers before they're Revealed, even if it claims to be the Host, so that the Answer-withholding rule (ADR-0006) can't be sidestepped.
18. As a Player, I want to join, reconnect, change my name or Signature, Buzz, and submit a Wager without any passcode, so that joining stays as quick as scanning a QR code.
19. As a Host, I want the Board screen on the TV to open without a passcode, so that setting up the TV is still just opening an address — it never receives Answers before Reveal anyway.
20. As a developer, I want the Host to stay open when no Host Passcode is configured, so that local development and wifi-only play work exactly as today.
21. As a developer, I want a loud console warning when the server starts without a Host Passcode, so that I notice if a public deploy is missing one.
22. As a developer, I want the Host Passcode to be set as a secret in Render's dashboard rather than committed to the repo, so that it never leaks through git.
23. As a developer, I want pushing to `main` to deploy automatically, so that shipping a change takes no extra steps.
24. As a developer, I want the deploy configuration checked into the repo, so that recreating the service (or moving to another host) doesn't depend on remembering dashboard clicks.
25. As a developer, I want a short setup guide covering first-time Render setup, setting the Host Passcode, and what sleeping and redeploys mean for a live Game, so that I (or someone else) can redo it months from now.
26. As a developer, I want the production server to run on a pinned Node version, so that a platform default change doesn't break the deploy.
27. As a developer, I want Render's health check to use the existing health endpoint, so that a broken deploy is caught before it takes traffic.
28. As a Host, I want to know that a redeploy or server sleep ends the current Game (same as restarting the server does today), so that I don't push changes during game night.
29. As a developer, I want `npm run dev` to keep working exactly as before (Vite dev server proxying to the socket server), so that the deploy doesn't change my local workflow.

## Implementation Decisions

- **One service, one address.** In production the Node server serves the built client's static files and falls back to the client's entry page for every client-side route (`/board`, `/host`, `/join`, and the catch-all), alongside the existing socket server and health endpoint. Development is unchanged: Vite serves the client and proxies the socket connection.
- **Configuration is injected into the server factory.** The game server factory gains an options object carrying the Host Passcode (optional) and the built client's directory (optional; when absent, no static serving — which keeps tests and dev unchanged). The process entry point reads these from environment variables (e.g. `HOST_PASSCODE`) and passes them in; the factory itself never reads the environment.
- **Claiming the Host role carries the Host Passcode.** The existing role-declaration event (the one the Host, Board, and Join screens send on every connect) takes an optional passcode and an acknowledgement callback answering accepted or rejected. Claiming `host` succeeds only if no Host Passcode is configured or the supplied one matches; on rejection the connection keeps the default Player view. Claiming `board` or `player` never needs a passcode.
- **Server-side gating of Host actions.** The server keeps, per connection, whether it has been accepted as Host. Every Host-only event is silently ignored (no state change, no broadcast) from a connection that isn't. Host-only events are everything except: role declaration, join, reconnect, edit identity, buzz, and submit wager. Gating lives in the socket layer, not the game engine — the engine stays pure game rules.
- **No separate "is a passcode required?" check.** The Host screen always claims `host` with whatever passcode the device has remembered (possibly none). Accepted → render the Host screen. Rejected → show the passcode prompt; if a remembered passcode was rejected, forget it. When no Host Passcode is configured the claim is always accepted, so the prompt never appears.
- **The Host screen remembers the passcode per device** in browser storage once accepted, and re-sends it on every reconnect as part of the existing re-announce-on-connect behaviour, so a dropped connection reclaims the Host role without prompting.
- **Unconfigured server warns.** On start-up with no Host Passcode, the server logs a prominent warning that the Host is open to anyone who can reach it.
- **Production runs TypeScript directly.** The shared package points at its TypeScript source and has no build step, so the production server is started with `tsx` (moved to the server's runtime dependencies) rather than compiled output. The root build only needs to produce the client bundle; the broken root build script is fixed to match.
- **Render via a checked-in blueprint.** A Render blueprint declares one free-tier web service (single instance), the build command (install + build the client), the start command (run the server with `tsx`, pointing it at the built client), the health check path (existing health endpoint), auto-deploy from `main`, a pinned Node version, and the Host Passcode as a secret whose value is entered in the dashboard rather than in the repo. The platform's own `*.onrender.com` address is used; no custom domain.
- **Join QR code is unchanged.** It already builds the join address from the Board's own origin, which on the deploy is the public address.
- **Decisions recorded elsewhere:** ADR-0014 (public single-instance deploy, Host gated by passcode; supersedes the local-network half of ADR-0001). ADR-0003 (buzz resolution without latency compensation) is deliberately unchanged. The Host Passcode is defined in the glossary.

## Testing Decisions

- Good tests here exercise external behaviour only: what a real socket client can and can't do and what state it receives, and what a real HTTP request gets back — never the internal map of which connection is authorised.
- **Server socket seam (primary).** Extend the existing socket wiring tests, which start a real game server on a random port and drive it with real socket.io clients. Cover:
  - claiming `host` with the correct passcode is accepted and then receives Answers for an unrevealed Active Clue;
  - claiming `host` with a wrong or missing passcode is rejected and still receives the redacted (Player) view;
  - Host actions (a representative spread: a Board Setup edit, opening the Lobby, starting the Game, selecting a Tile, judging, setting a score, resetting) from an unaccepted connection produce no state change;
  - Player actions (join, buzz, submit wager) and claiming `board` work without any passcode while one is configured;
  - with no passcode configured, claiming `host` is accepted and Host actions work exactly as today (all existing tests keep passing unchanged in this mode);
  - static serving: given a directory containing a stub entry page, HTTP requests for `/`, `/host`, `/board`, and `/join` return it, and the health endpoint still answers.
  Prior art: the existing socket wiring tests' connect/next-state helpers and role-declaring connections.
- **Host screen seam.** React Testing Library tests with the socket module mocked, in the style of the existing Host page tests. Cover: the prompt appears when the Host claim is rejected; submitting the passcode re-claims with it and remembers it on acceptance; a remembered passcode that's rejected is forgotten and the prompt shown; with the claim accepted on first try, no prompt appears.
- **Not automatically tested:** the Render blueprint and the setup guide — verified by an actual deploy, joining from a phone off the home wifi, and confirming `/host` asks for the passcode.

## Out of Scope

- Running several Games side by side, each with its own Host and Players (rooms or join codes, per-Game Host credentials set when a Game is created, cleaning up abandoned Games, abuse limits) — Phase 2, with its own design session.
- Preventing a Player from acting as another Player (Buzz or Wager under someone else's id) — knowingly accepted; tracked in `.scratch/cloud-hosting/issues/01-player-impersonation.md`.
- Latency-fair Buzz resolution for remote Players — ADR-0003 unchanged; revisit only if playtesting shows it.
- Keeping a Game alive across a server sleep, restart, or redeploy (no persistence) — game state stays in memory only.
- A custom domain, a paid always-on tier, rate limiting passcode attempts, and any login or account system.
- Choosing the Host Passcode on the Host screen at first visit instead of as an operator secret (rejected; see ADR-0014).

## Further Notes

- Fallback platforms if Render free disappoints: Railway Hobby (~$5/mo, no sleep) or Google Cloud Run (single instance, 60-minute socket cap with automatic reconnect). Both run the same Node service, so switching is a config change. Avoid Azure App Service Free (5-WebSocket cap), AWS App Runner (closed to new customers, no WebSockets), and Vercel/Netlify (no long-lived sockets or single-instance guarantee).
- Socket.io's automatic reconnect plus the Host screen's re-announce-on-connect is what makes both a Render wake-up hiccup and a Cloud Run 60-minute cut harmless, as long as the process itself stays up.
