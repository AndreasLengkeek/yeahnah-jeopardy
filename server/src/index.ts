import { createGameServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3001);
const hostPasscode = process.env.HOST_PASSCODE || undefined;
const { httpServer } = createGameServer({ hostPasscode });

httpServer.listen(PORT, () => {
  console.log(`Yeah Nah Jeopardy server listening on :${PORT}`);
  if (!hostPasscode) {
    console.warn(
      [
        "",
        "!".repeat(72),
        "!!  WARNING: no HOST_PASSCODE is set. The Host is open to anyone who",
        "!!  can reach this server: they can run the Game and see every Answer.",
        "!!  Fine for local development; set HOST_PASSCODE on any public deploy.",
        "!".repeat(72),
        "",
      ].join("\n"),
    );
  }
});
