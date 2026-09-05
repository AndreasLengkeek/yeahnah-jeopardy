import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { applyAction, initialState, viewForRole } from "@yeahnah/shared";
import type {
  CategoryData,
  ClueField,
  GameAction,
  GameState,
  JoinResult,
  PlayerIdentity,
  SocketRole,
} from "@yeahnah/shared";

export function createGameServer() {
  let state: GameState = initialState();

  const app = express();
  app.use(cors());
  app.get("/health", (_req, res) => res.json({ ok: true }));

  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  // The view a socket gets until (and unless) it declares something less restrictive.
  const DEFAULT_ROLE: SocketRole = "player";

  // Each connected socket's self-declared role, set via the `identify` event.
  const roles = new Map<string, SocketRole>();

  // Sends the current state to every connected socket, redacted per that socket's
  // declared role (ADR-0006) — replacing the old single io.emit("state", state).
  function broadcastState(): void {
    for (const [id, socket] of io.sockets.sockets) {
      socket.emit("state", viewForRole(state, roles.get(id) ?? DEFAULT_ROLE));
    }
  }

  // Mirrors the engine's applyAction 1:1: apply, broadcast if it actually changed
  // anything, and report back whether it did.
  function dispatch(action: GameAction): boolean {
    const next = applyAction(state, action);
    if (next === state) return false;

    state = next;
    broadcastState();
    return true;
  }

  io.on("connection", (socket) => {
    roles.set(socket.id, DEFAULT_ROLE);
    socket.emit("state", viewForRole(state, DEFAULT_ROLE));

    socket.on("identify", (role: SocketRole) => {
      roles.set(socket.id, role);
      socket.emit("state", viewForRole(state, role));
    });

    socket.on("disconnect", () => {
      roles.delete(socket.id);
    });

    socket.on("join", (identity: PlayerIdentity, ack?: (result: JoinResult) => void) => {
      const wasLobby = state.phase === "lobby";
      if (!dispatch({ type: "join", identity })) {
        const error = !wasLobby
          ? "The game has already started."
          : identity.kind === "signature"
            ? "That signature didn't come through — try drawing again."
            : "That name is already taken.";
        ack?.({ ok: false, error });
        return;
      }

      const player = state.players[state.players.length - 1];
      ack?.({ ok: true, playerId: player.id });
    });

    socket.on("reconnect", (playerId: string, ack?: (result: JoinResult) => void) => {
      if (!dispatch({ type: "reconnect", playerId })) {
        ack?.({ ok: false, error: "We couldn't find that session — please join again." });
        return;
      }

      ack?.({ ok: true, playerId });
    });

    socket.on("newBoard", (categoryCount: number) => {
      dispatch({ type: "newBoard", categoryCount });
    });

    socket.on("editCategoryName", (categoryIndex: number, name: string) => {
      dispatch({ type: "editCategoryName", categoryIndex, name });
    });

    socket.on("editClue", (categoryIndex: number, tileIndex: number, field: ClueField, value: string) => {
      dispatch({ type: "editClue", categoryIndex, tileIndex, field, value });
    });

    socket.on("importBoardConfig", (content: CategoryData[]) => {
      dispatch({ type: "importBoardConfig", content });
    });

    socket.on("openLobby", () => {
      dispatch({ type: "openLobby" });
    });

    socket.on("startGame", () => {
      dispatch({ type: "startGame" });
    });

    socket.on("selectTile", (categoryIndex: number, tileIndex: number) => {
      dispatch({ type: "selectTile", categoryIndex, tileIndex });
    });

    socket.on("buzz", (playerId: string) => {
      dispatch({ type: "buzz", playerId });
    });

    socket.on("reveal", () => {
      dispatch({ type: "reveal" });
    });

    socket.on("judge", (correct: boolean) => {
      dispatch({ type: "judge", correct });
    });

    socket.on("closeClue", () => {
      dispatch({ type: "closeClue" });
    });

    socket.on("setScore", (playerId: string, score: number) => {
      dispatch({ type: "setScore", playerId, score });
    });

    socket.on("returnToSetup", () => {
      dispatch({ type: "returnToSetup" });
    });

    socket.on("resetGame", () => {
      dispatch({ type: "resetGame" });
    });
  });

  return { app, httpServer, io };
}
