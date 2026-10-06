# Deploying to Render

The app runs on Render's free tier as one Node web service. It serves the Board, Host, and Join screens and the socket connection from a single `*.onrender.com` address. `render.yaml` at the repo root defines the service, and `.node-version` pins the Node version. ADR-0014 explains why it's set up this way.

## First-time setup

1. Push the repo to GitHub (or GitLab/Bitbucket).
2. In the [Render Dashboard](https://dashboard.render.com), choose **New → Blueprint**, click **Connect** next to the repo, name the Blueprint, and pick the `main` branch. Render reads `render.yaml` from the repo root.
3. In the review step, Render asks for `HOST_PASSCODE`. Enter the passcode the Host will type on the Host screen. Pick something you can share out loud with whoever hosts, but that Players won't guess.
4. Click **Deploy Blueprint**. The first build takes a few minutes. When it finishes, the service page shows its address, e.g. `https://yeahnah-jeopardy.onrender.com`.
5. Check it: open `/board` on the TV and `/host` on your phone. The Host screen should ask for the passcode. Players join by scanning the Board's QR code, which points at `/join` on the same address.

From then on, every push to `main` builds and deploys automatically.

## Host Passcode

- The value lives only in Render's dashboard and is never committed. Render asks for it only when the Blueprint is first created, so later changes to `render.yaml` don't change it.
- **To rotate it:** open the service, go to **Environment**, edit `HOST_PASSCODE`, and choose **Save and deploy**. This restarts the server, which ends the current Game (see below). Each Host device asks for the new passcode the next time it connects.
- If `HOST_PASSCODE` is ever missing, the server logs a loud warning at start-up and the Host is open to anyone. Make sure it's set.

## Game-night facts

- **Wake-up takes about a minute.** The free service sleeps after 15 minutes with no traffic. The first visit after that loads slowly while it wakes, so open the Board a few minutes before people arrive. Screens reconnect automatically.
- **Open screens keep it awake.** Connected Board, Host, and Player screens count as traffic, so the server won't sleep mid-game while they stay open.
- **A sleep, restart, or redeploy ends the current Game.** The Game lives only in the server's memory. Scores, the roster, and Board edits made through Board Setup are lost (export the Board Config first if you've edited it). Render may also restart free services at any time.
- **Don't push to `main` on game night.** Each push redeploys, which ends the Game.
- The free tier includes 750 instance hours a month per workspace, which is plenty for occasional game nights.

## Running the production build locally

```bash
npm ci --include=dev && npm run build   # same as the Blueprint's build command
HOST_PASSCODE=something npm start       # serves the app on :3001 (or $PORT)
```

## Fallbacks

If the free tier's cold starts get annoying, **Railway Hobby** (about $5 a month) runs the same service with no sleep. **Google Cloud Run** also works, pinned to a single instance. It cuts sockets after 60 minutes, but the screens reconnect automatically. Either option only needs the same build and start commands plus `HOST_PASSCODE`. Avoid Azure App Service Free (it allows 5 WebSockets), AWS App Runner (no WebSockets), and Vercel/Netlify (no long-lived sockets).
