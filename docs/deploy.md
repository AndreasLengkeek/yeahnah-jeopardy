# Deploying to Render

The app runs on Render's free tier as one Node web service. It serves the Board, Host, and Join screens and the socket connection from a single `*.onrender.com` address. `render.yaml` at the repo root defines the service, and `.node-version` pins the Node version. ADR-0014 explains why it's set up this way, and ADR-0015 how Rooms change it.

## First-time setup

1. Push the repo to GitHub (or GitLab/Bitbucket).
2. In the [Render Dashboard](https://dashboard.render.com), choose **New → Blueprint**, click **Connect** next to the repo, name the Blueprint, and pick the `main` branch. Render reads `render.yaml` from the repo root.
3. In the review step, Render asks for `ROOM_PASSCODE`. Enter the passcode a Host types to create a Room. Pick something you can share out loud with whoever hosts, but that Players won't guess.
4. Click **Deploy Blueprint**. The first build takes a few minutes. When it finishes, the service page shows its address, e.g. `https://yeahnah-jeopardy.onrender.com`.
5. Check it: open the address on your phone and create a Room with the Room Passcode. You land on that Room's Host screen (`/CODE/host`). Open `/CODE/board` on the TV. Players join by scanning the Board's QR code, which points at `/CODE/join`, or by typing the Room Code on the home page.

Deploys are manual: pushing to `main` doesn't deploy. To deploy, open the service and choose **Manual Deploy → Deploy latest commit**.

## Room Passcode

- The value lives only in Render's dashboard and is never committed. Render asks for it only when the Blueprint is first created, so later changes to `render.yaml` don't change it.
- **To rotate it:** open the service, go to **Environment**, edit `ROOM_PASSCODE`, and choose **Save and deploy**. This restarts the server, which ends every Room (see below).
- If `ROOM_PASSCODE` is ever missing, the server logs a loud warning at start-up and anyone can create Rooms. Make sure it's set.
- **Moving from `HOST_PASSCODE`:** an existing service still has the old `HOST_PASSCODE` variable. Add `ROOM_PASSCODE` under **Environment** (and delete `HOST_PASSCODE`) *before* deploying the Rooms change.

## Game-night facts

- **Wake-up takes about a minute.** The free service sleeps after 15 minutes with no traffic. The first visit after that loads slowly while it wakes, so open the Board a few minutes before people arrive. Screens reconnect automatically.
- **Open screens keep it awake.** Connected Board, Host, and Player screens count as traffic, so the server won't sleep mid-game while they stay open.
- **A sleep, restart, or redeploy ends every Room.** Rooms live only in the server's memory. Scores, the roster, and Board edits made through Board Setup are lost (export the Board Config first if you've edited it). Render may also restart free services at any time.
- **Don't deploy on game night.** Each deploy ends every Room.
- The free tier includes 750 instance hours a month per workspace, which is plenty for occasional game nights.

## Running the production build locally

```bash
npm ci --omit=dev && npm run build      # same as the Blueprint's build command
ROOM_PASSCODE=something npm start       # serves the app on :3001 (or $PORT)
```
