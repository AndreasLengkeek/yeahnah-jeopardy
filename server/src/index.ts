import { createGameServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3001);
const { httpServer } = createGameServer();

httpServer.listen(PORT, () => {
  console.log(`Yeah Nah Jeopardy server listening on :${PORT}`);
});
