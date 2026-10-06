# 04: Render blueprint and setup guide

**What to build:** Everything needed for the repo to deploy to Render's free tier with no dashboard guesswork: a checked-in Render blueprint and a short setup guide. See `.scratch/cloud-hosting/spec.md` and ADR-0014.

- Blueprint: one free-tier web service, single instance; build command installs dependencies and builds the client; start command runs the production server (from ticket 02) pointed at the built client; health check on the existing health endpoint; auto-deploy from `main`; a pinned Node version; `HOST_PASSCODE` declared as a secret whose value is entered in the dashboard, never committed. Uses the platform's `*.onrender.com` address — no custom domain.
- Setup guide (in the repo's docs): first-time Render setup from the blueprint, setting/rotating the Host Passcode, and the operational facts — the first visit after idle takes ~1 minute to wake; a sleep, restart, or redeploy ends the current Game; don't push to `main` during game night. Mention fallbacks (Railway Hobby, Google Cloud Run) in a line or two.

**Blocked by:** 02 (Serve the built client from the game server), 03 (Host Passcode)

**Status:** ready-for-agent

- [ ] Render blueprint checked in with all of the above, and no secret values in it
- [ ] Node version pinned for the deploy (and consistent with local tooling)
- [ ] Setup guide covers first-time setup, the Host Passcode, wake-up delay, and Game loss on sleep/redeploy
- [ ] Running the blueprint's build and start commands locally (with `HOST_PASSCODE` set) serves the app with the passcode enforced
