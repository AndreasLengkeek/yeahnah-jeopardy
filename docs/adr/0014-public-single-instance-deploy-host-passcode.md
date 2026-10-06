# Public single-instance deploy, Host gated by a passcode

Supersedes the "local network, nothing public-facing" half of ADR-0001; its one-Game-at-a-time half still stands until concurrent Games get their own ADR. Players now need to join from outside the Host's wifi (and the Host shouldn't need a laptop running a dev server), so the app is deployed publicly as a single always-one-instance Node service on Render's free tier, serving both the built client and the socket server from one origin. Because the Game lives in memory and Render free spins down after idle, a sleep or redeploy ends the Game — accepted, since game nights are occasional and active connections keep it awake during play. A public URL means anyone could open `/host`, so every Host action (including receiving Answers) is gated server-side by a Host Passcode configured as an operator secret; when none is configured (local dev / LAN play) the Host stays open with a console warning.

## Considered Options

- **Tunnel from the Host's own machine** (Cloudflare quick tunnel, ngrok, Tailscale Funnel): free and no deploy, but the Host still has to run the server on game night, and the URL changes or carries an interstitial.
- **Big clouds**: AWS App Runner is closed to new customers and never supported WebSockets; Fargate needs a paid load balancer; Azure App Service Free caps at 5 WebSockets. Google Cloud Run would work (and is the fallback) but needs a billing account and CLI setup for no gain here.
- **Railway Hobby ($5/mo)**: no sleep, equally low-maintenance — kept as the switch-to option if cold starts become annoying.
- **Host-chosen passcode on first `/host` visit**: rejected for now — a stranger could claim it first after a wake-up. Host credentials set at Game creation belong with concurrent Games.

## Consequences

- Players remain impersonable: `buzz` and `submitWager` trust a client-supplied player id, and every id is broadcast in shared state. Accepted while only invited friends know the URL; tracked in `.scratch/cloud-hosting/issues/01-player-impersonation.md`.
- Buzz resolution across the internet is less fair than on one wifi; ADR-0003 is unchanged and its revisit trigger still applies.
