import { createGameServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3001);
// Set in production to the built client (e.g. `client/dist`) so this one process serves
// the whole app; left unset in dev, where Vite serves the client.
const CLIENT_DIR = process.env.CLIENT_DIR || undefined;
const { httpServer } = createGameServer({ clientDir: CLIENT_DIR });

httpServer.listen(PORT, () => {
  console.log(`Yeah Nah Jeopardy server listening on :${PORT}`);
  if (CLIENT_DIR) console.log(`Serving the built client from ${CLIENT_DIR}`);
});
