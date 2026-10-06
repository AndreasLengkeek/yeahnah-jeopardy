import { createHash, timingSafeEqual } from "node:crypto";
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
  IdentifyResult,
  JoinResult,
  PlayerIdentity,
  SocketRole,
} from "@yeahnah/shared";

export interface GameServerOptions {
  // Directory of the built client to serve statically (ticket 02); absent → none.
  clientDir?: string;
  // The Host Passcode (ADR-0014). Absent (or empty) → the Host is open to anyone.
  hostPasscode?: string;
}

// Compares fixed-length digests so the check doesn't leak the passcode's length or
// a matching prefix through timing.
function passcodeMatches(supplied: unknown, expected: string): boolean {
  if (typeof supplied !== "string") return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(supplied), digest(expected));
}

export function createGameServer(options: GameServerOptions = {}) {
  const hostPasscode = options.hostPasscode || undefined;
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

    // Claiming `host` needs the Host Passcode (when one is configured); a rejected
    // claim falls back to the default view. Sent on every connect, so a dropped Host
    // reclaims its role with the passcode its device remembered.
    socket.on("identify", (role: SocketRole, passcode?: unknown, ack?: (result: IdentifyResult) => void) => {
      const accepted = role !== "host" || hostPasscode === undefined || passcodeMatches(passcode, hostPasscode);
      const granted = accepted ? role : DEFAULT_ROLE;
      roles.set(socket.id, granted);
      socket.emit("state", viewForRole(state, granted));
      if (typeof ack === "function") ack(accepted ? "accepted" : "rejected");
    });

    // Registers a Host-only event: silently ignored (no state change, no broadcast)
    // from a socket that hasn't been accepted as Host while a Host Passcode is set.
    // With no passcode configured every socket may act as Host, exactly as before.
    function onHostEvent<Args extends unknown[]>(event: string, handler: (...args: Args) => void): void {
      socket.on(event, (...args: Args) => {
        if (hostPasscode !== undefined && roles.get(socket.id) !== "host") return;
        handler(...args);
      });
    }

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

    socket.on("editIdentity", (playerId: string, identity: PlayerIdentity, ack?: (result: JoinResult) => void) => {
      const wasLobby = state.phase === "lobby";
      if (!dispatch({ type: "editIdentity", playerId, identity })) {
        const error = !wasLobby
          ? "The game has already started."
          : identity.kind === "signature"
            ? "That signature didn't come through — try drawing again."
            : "That name is already taken.";
        ack?.({ ok: false, error });
        return;
      }

      ack?.({ ok: true, playerId });
    });

    onHostEvent("newBoard", (categoryCount: number) => {
      dispatch({ type: "newBoard", categoryCount });
    });

    onHostEvent("editCategoryName", (categoryIndex: number, name: string) => {
      dispatch({ type: "editCategoryName", categoryIndex, name });
    });

    onHostEvent("editClue", (categoryIndex: number, tileIndex: number, field: ClueField, value: string) => {
      dispatch({ type: "editClue", categoryIndex, tileIndex, field, value });
    });

    onHostEvent("setTwoRounds", (value: boolean) => {
      dispatch({ type: "setTwoRounds", value });
    });

    onHostEvent("editDoubleJeopardyCategoryName", (categoryIndex: number, name: string) => {
      dispatch({ type: "editDoubleJeopardyCategoryName", categoryIndex, name });
    });

    onHostEvent(
      "editDoubleJeopardyClue",
      (categoryIndex: number, tileIndex: number, field: ClueField, value: string) => {
        dispatch({ type: "editDoubleJeopardyClue", categoryIndex, tileIndex, field, value });
      },
    );

    onHostEvent("importBoardConfig", (content: CategoryData[]) => {
      dispatch({ type: "importBoardConfig", content });
    });

    onHostEvent("openLobby", () => {
      dispatch({ type: "openLobby" });
    });

    onHostEvent("toggleBoardMusic", () => {
      dispatch({ type: "toggleBoardMusic" });
    });

    onHostEvent("toggleBoardEffects", () => {
      dispatch({ type: "toggleBoardEffects" });
    });

    onHostEvent("startGame", () => {
      dispatch({ type: "startGame" });
    });

    onHostEvent("startDoubleJeopardy", () => {
      dispatch({ type: "startDoubleJeopardy" });
    });

    onHostEvent("selectTile", (categoryIndex: number, tileIndex: number) => {
      dispatch({ type: "selectTile", categoryIndex, tileIndex });
    });

    onHostEvent("showDailyDoubleClue", () => {
      dispatch({ type: "showDailyDoubleClue" });
    });

    onHostEvent("designateWagerer", (playerId: string) => {
      dispatch({ type: "designateWagerer", playerId });
    });

    socket.on("submitWager", (playerId: string, amount: number) => {
      dispatch({ type: "submitWager", playerId, amount });
    });

    socket.on("buzz", (playerId: string) => {
      dispatch({ type: "buzz", playerId });
    });

    onHostEvent("reveal", () => {
      dispatch({ type: "reveal" });
    });

    onHostEvent("judge", (correct: boolean) => {
      dispatch({ type: "judge", correct });
    });

    onHostEvent("closeClue", () => {
      dispatch({ type: "closeClue" });
    });

    onHostEvent("setScore", (playerId: string, score: number) => {
      dispatch({ type: "setScore", playerId, score });
    });

    onHostEvent("returnToSetup", () => {
      dispatch({ type: "returnToSetup" });
    });

    onHostEvent("resetGame", () => {
      dispatch({ type: "resetGame" });
    });
  });

  return { app, httpServer, io };
}
