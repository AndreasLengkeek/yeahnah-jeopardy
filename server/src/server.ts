import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { applyAction, initialState } from "@yeahnah/shared";
import type { GameAction, GameState, JoinResult } from "@yeahnah/shared";

export function createGameServer() {
  let state: GameState = initialState();

  const app = express();
  app.use(cors());
  app.get("/health", (_req, res) => res.json({ ok: true }));

  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  // Mirrors the engine's applyAction 1:1: apply, broadcast if it actually changed
  // anything, and report back whether it did.
  function dispatch(action: GameAction): boolean {
    const next = applyAction(state, action);
    if (next === state) return false;

    state = next;
    io.emit("state", state);
    return true;
  }

  io.on("connection", (socket) => {
    socket.emit("state", state);

    socket.on("join", (name: string, ack?: (result: JoinResult) => void) => {
      const wasLobby = state.phase === "lobby";
      if (!dispatch({ type: "join", name })) {
        const error = wasLobby ? "That name is already taken." : "The game has already started.";
        ack?.({ ok: false, error });
        return;
      }

      const player = state.players[state.players.length - 1];
      ack?.({ ok: true, playerId: player.id });
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
  });

  return { app, httpServer, io };
}
