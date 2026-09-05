import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { applyAction, initialState } from "@yeahnah/shared";
import type { GameState } from "@yeahnah/shared";

export function createGameServer() {
  let state: GameState = initialState();

  const app = express();
  app.use(cors());
  app.get("/health", (_req, res) => res.json({ ok: true }));

  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.emit("state", state);

    socket.on("join", (name: string, ack?: (result: { ok: boolean; playerId?: string; error?: string }) => void) => {
      const next = applyAction(state, { type: "join", name });
      if (next === state) {
        const error = state.phase !== "lobby" ? "The game has already started." : "That name is already taken.";
        ack?.({ ok: false, error });
        return;
      }

      state = next;
      const player = state.players[state.players.length - 1];
      ack?.({ ok: true, playerId: player.id });
      io.emit("state", state);
    });

    socket.on("startGame", () => {
      const next = applyAction(state, { type: "startGame" });
      if (next === state) return;

      state = next;
      io.emit("state", state);
    });
  });

  return { app, httpServer, io };
}
