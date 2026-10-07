import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import express from "express";
import { Server, type Socket } from "socket.io";
import { applyAction, initialState, viewForRole } from "@yeahnah/shared";
import type {
  CategoryData,
  ClueField,
  CreateRoomResult,
  GameAction,
  GameState,
  IdentifyClaim,
  IdentifyResult,
  JoinResult,
  PlayerIdentity,
  SocketRole,
} from "@yeahnah/shared";
import { describeGameEvent, describePlayerConnection } from "./gameLog.js";

export interface GameServerOptions {
  /** The built client's directory (e.g. `client/dist`). When set, the server serves its
   * static files and falls back to its entry page for every client-side route; when
   * absent (tests, dev — where Vite serves the client), no static serving at all. */
  clientDir?: string;
  /** The Room Passcode (ADR-0015). Absent (or empty) → anyone may create a Room. */
  roomPasscode?: string;
}

// Consonants only, so a code never spells a word, and without Y (a part-time vowel).
// Dropping the vowels also drops I and O, the letters most easily misread as 1 and 0.
const ROOM_CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";
const ROOM_CODE_LENGTH = 4;

// A Room (ADR-0015): one Game, the Host Key that proves Host of it, and every socket
// bound to it with the role it was granted there.
interface Room {
  code: string;
  hostKey: string;
  game: GameState;
  members: Map<Socket, SocketRole>;
}

// The view a socket bound to a Room falls back to when its Host claim is rejected.
const DEFAULT_ROLE: SocketRole = "player";

// Compares fixed-length digests so the check doesn't leak the secret's length or a
// matching prefix through timing. Used for both the Room Passcode and Host Keys.
function secretMatches(supplied: unknown, expected: string): boolean {
  if (typeof supplied !== "string") return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(supplied), digest(expected));
}

export function createGameServer(options: GameServerOptions = {}) {
  const roomPasscode = options.roomPasscode || undefined;

  // Every live Room, keyed by its upper-case Room Code.
  const rooms = new Map<string, Room>();

  function newRoomCode(): string {
    for (;;) {
      let code = "";
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      if (!rooms.has(code)) return code;
    }
  }

  // Room Codes match whatever their case.
  function roomByCode(code: unknown): Room | undefined {
    return typeof code === "string" ? rooms.get(code.trim().toUpperCase()) : undefined;
  }

  const app = express();
  app.get("/health", (_req, res) => res.json({ ok: true }));

  if (options.clientDir) {
    const clientDir = resolve(options.clientDir);
    const entryPage = join(clientDir, "index.html");
    app.use(express.static(clientDir));
    // Client-side routes (/, /join, /BRDK/host, …) all load the same entry page, so a
    // refresh on any of them boots the app rather than 404ing. Paths with a file
    // extension are assets, so a missing one (e.g. a stale hash after a redeploy) 404s
    // instead of getting HTML back. Socket.io handles its own /socket.io path before
    // Express sees the request.
    app.get("*", (req, res, next) => {
      if (extname(req.path)) return next();
      res.sendFile(entryPage);
    });
  }

  const httpServer = createServer(app);
  // No CORS: the client, socket, and health endpoint share one origin (and Vite proxies
  // the socket in dev), so no other origin needs access.
  const io = new Server(httpServer);

  // Sends a Room's current state to every socket bound to it — and only to those —
  // each redacted per the role it was granted there (ADR-0006).
  function broadcastState(room: Room): void {
    for (const [socket, role] of room.members) socket.emit("state", viewForRole(room.game, role));
  }

  // Every log line names the Room it happened in.
  function log(room: Room, line: string | null): void {
    if (line) console.log(`[${room.code}] ${line}`);
  }

  // Mirrors the engine's applyAction 1:1 for one Room: apply, broadcast (and log, for
  // the events worth logging) if it actually changed anything, and report back whether
  // it did.
  function dispatch(room: Room, action: GameAction): boolean {
    const next = applyAction(room.game, action);
    if (next === room.game) return false;

    log(room, describeGameEvent(room.game, action, next));
    room.game = next;
    broadcastState(room);
    return true;
  }

  io.on("connection", (socket) => {
    // The Room this socket is bound to — at most one — and the Player it last joined or
    // reconnected as there, so its disconnect can be logged. A socket bound to no Room
    // (e.g. the home page's) can only create one.
    let bound: Room | undefined;
    let playerId: string | undefined;

    function unbind(): void {
      if (!bound) return;
      bound.members.delete(socket);
      if (playerId) log(bound, describePlayerConnection(bound.game, playerId, "disconnected"));
      bound = undefined;
      playerId = undefined;
    }

    socket.on("createRoom", (passcode: unknown, ack?: (result: CreateRoomResult) => void) => {
      if (typeof ack !== "function") return;
      if (roomPasscode !== undefined && !secretMatches(passcode, roomPasscode)) {
        ack({ ok: false, reason: "wrongPasscode" });
        return;
      }

      const room: Room = {
        code: newRoomCode(),
        hostKey: randomBytes(18).toString("base64url"),
        game: initialState(),
        members: new Map(),
      };
      rooms.set(room.code, room);
      log(room, "[room] Room created");
      ack({ ok: true, code: room.code, hostKey: room.hostKey });
    });

    // Binds this socket to a Room with a role. Claiming `host` needs that Room's Host
    // Key; a rejected claim stays bound to the Room on the default view. Re-sent on
    // every connect, so a dropped Host reclaims its role with the Host Key its device
    // remembered.
    socket.on("identify", (claim: IdentifyClaim | undefined, ack?: (result: IdentifyResult) => void) => {
      const reply = (result: IdentifyResult) => {
        if (typeof ack === "function") ack(result);
      };
      const room = roomByCode(claim?.code);
      if (room !== bound) unbind();
      if (!room) {
        reply("noRoom");
        return;
      }

      const role: SocketRole = claim?.role === "host" || claim?.role === "board" ? claim.role : "player";
      const accepted = role !== "host" || secretMatches(claim?.hostKey, room.hostKey);
      const granted = accepted ? role : DEFAULT_ROLE;
      bound = room;
      room.members.set(socket, granted);
      socket.emit("state", viewForRole(room.game, granted));
      reply(accepted ? "accepted" : "rejected");
    });

    socket.on("disconnect", unbind);

    // Registers a Game event that acts on this socket's bound Room. From a socket bound
    // to no Room it changes nothing; an acknowledgement, if asked for, says so.
    function onRoomEvent<Args extends unknown[]>(event: string, handler: (room: Room, ...args: Args) => void): void {
      socket.on(event, (...args: Args) => {
        if (bound) {
          handler(bound, ...args);
          return;
        }
        const ack = args[args.length - 1];
        if (typeof ack === "function") ack({ ok: false, error: "There's no Room with that code." });
      });
    }

    // Registers a Host-only event: silently ignored (no state change, no broadcast)
    // from a socket that hasn't been accepted as Host of its bound Room.
    function onHostEvent<Args extends unknown[]>(event: string, handler: (room: Room, ...args: Args) => void): void {
      socket.on(event, (...args: Args) => {
        if (bound && bound.members.get(socket) === "host") handler(bound, ...args);
      });
    }

    function identityError(wasLobby: boolean, identity: PlayerIdentity): string {
      return !wasLobby
        ? "The game has already started."
        : identity.kind === "signature"
          ? "That signature didn't come through — try drawing again."
          : "That name is already taken.";
    }

    onRoomEvent("join", (room, identity: PlayerIdentity, ack?: (result: JoinResult) => void) => {
      const wasLobby = room.game.phase === "lobby";
      if (!dispatch(room, { type: "join", identity })) {
        ack?.({ ok: false, error: identityError(wasLobby, identity) });
        return;
      }

      const player = room.game.players[room.game.players.length - 1];
      playerId = player.id;
      ack?.({ ok: true, playerId: player.id });
    });

    onRoomEvent("reconnect", (room, id: string, ack?: (result: JoinResult) => void) => {
      const alreadyAttached = playerId === id;
      if (!dispatch(room, { type: "reconnect", playerId: id })) {
        ack?.({ ok: false, error: "We couldn't find that session — please join again." });
        return;
      }

      playerId = id;
      if (!alreadyAttached) log(room, describePlayerConnection(room.game, id, "reconnected"));
      ack?.({ ok: true, playerId: id });
    });

    onRoomEvent("editIdentity", (room, id: string, identity: PlayerIdentity, ack?: (result: JoinResult) => void) => {
      const wasLobby = room.game.phase === "lobby";
      if (!dispatch(room, { type: "editIdentity", playerId: id, identity })) {
        ack?.({ ok: false, error: identityError(wasLobby, identity) });
        return;
      }

      ack?.({ ok: true, playerId: id });
    });

    onHostEvent("newBoard", (room, categoryCount: number) => {
      dispatch(room, { type: "newBoard", categoryCount });
    });

    onHostEvent("editCategoryName", (room, categoryIndex: number, name: string) => {
      dispatch(room, { type: "editCategoryName", categoryIndex, name });
    });

    onHostEvent("editClue", (room, categoryIndex: number, tileIndex: number, field: ClueField, value: string) => {
      dispatch(room, { type: "editClue", categoryIndex, tileIndex, field, value });
    });

    onHostEvent("setTwoRounds", (room, value: boolean) => {
      dispatch(room, { type: "setTwoRounds", value });
    });

    onHostEvent("editDoubleJeopardyCategoryName", (room, categoryIndex: number, name: string) => {
      dispatch(room, { type: "editDoubleJeopardyCategoryName", categoryIndex, name });
    });

    onHostEvent(
      "editDoubleJeopardyClue",
      (room, categoryIndex: number, tileIndex: number, field: ClueField, value: string) => {
        dispatch(room, { type: "editDoubleJeopardyClue", categoryIndex, tileIndex, field, value });
      },
    );

    onHostEvent("importBoardConfig", (room, content: CategoryData[]) => {
      dispatch(room, { type: "importBoardConfig", content });
    });

    onHostEvent("openLobby", (room) => {
      dispatch(room, { type: "openLobby" });
    });

    onHostEvent("toggleBoardMusic", (room) => {
      dispatch(room, { type: "toggleBoardMusic" });
    });

    onHostEvent("toggleBoardEffects", (room) => {
      dispatch(room, { type: "toggleBoardEffects" });
    });

    onHostEvent("startGame", (room) => {
      dispatch(room, { type: "startGame" });
    });

    onHostEvent("startDoubleJeopardy", (room) => {
      dispatch(room, { type: "startDoubleJeopardy" });
    });

    onHostEvent("selectTile", (room, categoryIndex: number, tileIndex: number) => {
      dispatch(room, { type: "selectTile", categoryIndex, tileIndex });
    });

    onHostEvent("showDailyDoubleClue", (room) => {
      dispatch(room, { type: "showDailyDoubleClue" });
    });

    onHostEvent("designateWagerer", (room, id: string) => {
      dispatch(room, { type: "designateWagerer", playerId: id });
    });

    onRoomEvent("submitWager", (room, id: string, amount: number) => {
      dispatch(room, { type: "submitWager", playerId: id, amount });
    });

    onRoomEvent("buzz", (room, id: string) => {
      dispatch(room, { type: "buzz", playerId: id });
    });

    onHostEvent("reveal", (room) => {
      dispatch(room, { type: "reveal" });
    });

    onHostEvent("judge", (room, correct: boolean) => {
      dispatch(room, { type: "judge", correct });
    });

    onHostEvent("closeClue", (room) => {
      dispatch(room, { type: "closeClue" });
    });

    onHostEvent("setScore", (room, id: string, score: number) => {
      dispatch(room, { type: "setScore", playerId: id, score });
    });

    onHostEvent("returnToSetup", (room) => {
      dispatch(room, { type: "returnToSetup" });
    });

    onHostEvent("resetGame", (room) => {
      dispatch(room, { type: "resetGame" });
    });
  });

  return { app, httpServer, io };
}
