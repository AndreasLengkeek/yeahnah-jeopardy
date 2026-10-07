import { createGameServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3001);
// Set in production to the built client (e.g. `client/dist`) so this one process serves
// the whole app; left unset in dev, where Vite serves the client.
const CLIENT_DIR = process.env.CLIENT_DIR || undefined;
const roomPasscode = process.env.ROOM_PASSCODE || undefined;
const { httpServer } = createGameServer({ clientDir: CLIENT_DIR, roomPasscode });

httpServer.listen(PORT, () => {
  console.log(`Yeah Nah Jeopardy server listening on :${PORT}`);
  if (CLIENT_DIR) console.log(`Serving the built client from ${CLIENT_DIR}`);
  if (!roomPasscode) {
    console.warn(
      [
        "",
        "!".repeat(72),
        "!!  WARNING: no ROOM_PASSCODE is set. Anyone who can reach this server",
        "!!  can create Rooms on it.",
        "!!  Fine for local development; set ROOM_PASSCODE on any public deploy.",
        "!".repeat(72),
        "",
      ].join("\n"),
    );
  }
});
