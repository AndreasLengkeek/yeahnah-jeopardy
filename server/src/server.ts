import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import express from "express";
import { Server, type Socket } from "socket.io";
import {
  applyAction,
  initialState,
  MAX_NAME_LENGTH,
  nameTooLong,
  normalizeIdentity,
  signatureTooBig,
  viewForRole,
} from "@yeahnah/shared";
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
  ReclaimHostClaim,
  ReclaimHostResult,
  RoomInfo,
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
  /** The most live Rooms at once; creating another is refused as at capacity. */
  maxRooms?: number;
  /** The most Players one Room's roster holds; a new join past it is refused as full
   * (a joined Player's reconnect never is). */
  maxPlayersPerRoom?: number;
  /** The clock Rooms expire by, in milliseconds (defaults to real time). */
  now?: () => number;
}

const DEFAULT_MAX_ROOMS = 20;
const DEFAULT_MAX_PLAYERS_PER_ROOM = 12;

// A Room ends by itself once no Host or Player device has been connected for this
// long (a Board left on a TV doesn't count, so it can't keep a Room alive forever).
const EMPTY_ROOM_LIMIT_MS = 30 * 60 * 1000;
// ...or once this long passes with no Host action, even with devices still connected.
const HOST_IDLE_LIMIT_MS = 4 * 60 * 60 * 1000;

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
  // The connected devices counted in Room info, by the role each was accepted as. A
  // rejected Host claim is a member (on the Player view) but no device here.
  devices: Map<Socket, SocketRole>;
  // The Room info last sent to its Host sockets, to send again only on a change.
  roomInfo: RoomInfo;
  // Each Signature Player's current image version, keyed by playerId, so a drawing is
  // hashed once rather than on every broadcast.
  signatureVersions: Map<string, { image: string; version: string }>;
  // Since when no Host or Player device has been connected, or undefined while one is.
  emptySince: number | undefined;
  // When the Room's Host last acted: creation, a Host device accepted (by Host Key or
  // reclaim), or an accepted Host event.
  lastHostAction: number;
}

// Signature images leave the state broadcast: each view carries this address in place
// of the data URL, and the HTTP route serves the image there. The version is a digest
// of the drawing, so a redraw changes the address and any one address can be cached
// forever.
const signaturePath = (code: string, playerId: string, version: string) =>
  `/rooms/${code}/signatures/${encodeURIComponent(playerId)}/${version}`;

// Only the raster images a canvas exports are served, so a crafted "Signature" can't
// put an HTML page (or anything else) on this origin.
const SIGNATURE_DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

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
  const maxRooms = options.maxRooms ?? DEFAULT_MAX_ROOMS;
  const maxPlayersPerRoom = options.maxPlayersPerRoom ?? DEFAULT_MAX_PLAYERS_PER_ROOM;
  const now = options.now ?? Date.now;

  // Every live Room, keyed by its upper-case Room Code.
  const rooms = new Map<string, Room>();
  // The codes of Rooms that have ended, so a role declared on one can be told "ended"
  // rather than "no such Room". A code leaves here as soon as a new Room takes it.
  const endedCodes = new Set<string>();
  // How to let go of each connected socket's Room binding when that Room ends.
  const releaseOnRoomEnd = new Map<Socket, () => void>();

  function newRoomCode(): string {
    for (;;) {
      let code = "";
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      if (!rooms.has(code)) return code;
    }
  }

  // Room Codes match whatever their case.
  function normalizeCode(code: unknown): string | undefined {
    return typeof code === "string" ? code.trim().toUpperCase() : undefined;
  }

  // A Signature Player's current image version (see `signaturePath`).
  function signatureVersion(room: Room, playerId: string, image: string): string {
    const cached = room.signatureVersions.get(playerId);
    if (cached?.image === image) return cached.version;
    const version = createHash("sha256").update(image).digest("base64url").slice(0, 16);
    room.signatureVersions.set(playerId, { image, version });
    return version;
  }

  // The Room's Game as every socket sees it before role redaction: each Signature's
  // data URL swapped for its image address, so a broadcast stays a few KB however many
  // Players drew one. Full data URLs stay in server memory only.
  function publicGame(room: Room): GameState {
    const { game } = room;
    if (!game.players.some((player) => player.identity.kind === "signature")) return game;
    return {
      ...game,
      players: game.players.map((player) => {
        if (player.identity.kind !== "signature") return player;
        const version = signatureVersion(room, player.id, player.identity.image);
        return { ...player, identity: { kind: "signature", image: signaturePath(room.code, player.id, version) } };
      }),
    };
  }

  const app = express();
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // A Room's Signature images, at the addresses its broadcasts carry: only that Room's
  // current Players, at their current version; anything else 404s. Registered before
  // the client's catch-all so the entry page never answers for an image.
  app.get("/rooms/:code/signatures/:playerId/:version", (req, res) => {
    const room = rooms.get(req.params.code);
    const identity = room?.game.players.find((player) => player.id === req.params.playerId)?.identity;
    const image = identity?.kind === "signature" ? identity.image : undefined;
    const match = image ? SIGNATURE_DATA_URL.exec(image) : null;
    if (!room || !image || !match || signatureVersion(room, req.params.playerId, image) !== req.params.version) {
      res.sendStatus(404);
      return;
    }
    res.set({
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(Buffer.from(match[2], "base64"));
  });

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
    const game = publicGame(room);
    for (const [socket, role] of room.members) socket.emit("state", viewForRole(game, role));
  }

  // Sends the Room's device counts to its Host sockets — and only those — when they've
  // changed since last sent. A `newcomer` just accepted as Host gets them regardless,
  // since it has never seen them.
  function syncRoomInfo(room: Room, newcomer?: Socket): void {
    const info: RoomInfo = { hosts: 0, boards: 0, players: 0 };
    for (const role of room.devices.values()) {
      if (role === "host") info.hosts++;
      else if (role === "board") info.boards++;
      else info.players++;
    }
    const changed =
      info.hosts !== room.roomInfo.hosts ||
      info.boards !== room.roomInfo.boards ||
      info.players !== room.roomInfo.players;
    room.roomInfo = info;
    if (info.hosts + info.players > 0) room.emptySince = undefined;
    else room.emptySince ??= now();
    if (changed) {
      for (const [socket, role] of room.members) if (role === "host") socket.emit("roomInfo", info);
    } else if (newcomer && room.members.get(newcomer) === "host") {
      newcomer.emit("roomInfo", info);
    }
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

  // Ends a Room, for any reason: `how` finishes its log line ("closed by the Host",
  // "expired after …"). The Room's Game is discarded and its code is free for a new
  // Room at once, but remembered as ended. Every socket bound to it gets the Room-ended
  // notice and is unbound, so its next event acts on no Room.
  function endRoom(room: Room, how: string): void {
    if (rooms.get(room.code) !== room) return;
    rooms.delete(room.code);
    endedCodes.add(room.code);
    log(room, `[room] Room ${how}`);
    for (const socket of room.members.keys()) {
      socket.emit("roomEnded");
      releaseOnRoomEnd.get(socket)?.();
    }
    room.members.clear();
    room.devices.clear();
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
      bound.devices.delete(socket);
      syncRoomInfo(bound);
      if (playerId) log(bound, describePlayerConnection(bound.game, playerId, "disconnected"));
      bound = undefined;
      playerId = undefined;
    }

    // Its Room ended: nothing left to leave, or to log a disconnect from.
    releaseOnRoomEnd.set(socket, () => {
      bound = undefined;
      playerId = undefined;
    });

    socket.on("createRoom", (passcode: unknown, ack?: (result: CreateRoomResult) => void) => {
      if (typeof ack !== "function") return;
      if (roomPasscode !== undefined && !secretMatches(passcode, roomPasscode)) {
        ack({ ok: false, reason: "wrongPasscode" });
        return;
      }
      if (rooms.size >= maxRooms) {
        ack({ ok: false, reason: "atCapacity" });
        return;
      }

      const room: Room = {
        code: newRoomCode(),
        hostKey: randomBytes(18).toString("base64url"),
        game: initialState(),
        members: new Map(),
        devices: new Map(),
        roomInfo: { hosts: 0, boards: 0, players: 0 },
        signatureVersions: new Map(),
        emptySince: now(),
        lastHostAction: now(),
      };
      rooms.set(room.code, room);
      endedCodes.delete(room.code);
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
      const code = normalizeCode(claim?.code);
      const room = code === undefined ? undefined : rooms.get(code);
      if (room !== bound) unbind();
      if (!room) {
        reply(code !== undefined && endedCodes.has(code) ? "ended" : "noRoom");
        return;
      }

      const role: SocketRole = claim?.role === "host" || claim?.role === "board" ? claim.role : "player";
      const accepted = role !== "host" || secretMatches(claim?.hostKey, room.hostKey);
      bind(room, role, accepted);
      reply(accepted ? "accepted" : "rejected");
    });

    // Binds this socket to `room` as `role` — or, if that claim wasn't accepted, on the
    // default view and counted as no device — and sends it the Room's state.
    function bind(room: Room, role: SocketRole, accepted: boolean): void {
      const granted = accepted ? role : DEFAULT_ROLE;
      bound = room;
      room.members.set(socket, granted);
      if (accepted) room.devices.set(socket, role);
      else room.devices.delete(socket);
      if (accepted && role === "host") room.lastHostAction = now();
      socket.emit("state", viewForRole(publicGame(room), granted));
      syncRoomInfo(room, socket);
    }

    // A device that lost a Room's Host Key gets it back with the Room Passcode (open to
    // anyone when none is configured). It's the Room's existing key, so every other Host
    // device keeps working; this socket is accepted as Host straight away.
    socket.on("reclaimHost", (claim: ReclaimHostClaim | undefined, ack?: (result: ReclaimHostResult) => void) => {
      if (typeof ack !== "function") return;
      const code = normalizeCode(claim?.code);
      const room = code === undefined ? undefined : rooms.get(code);
      if (!room) {
        ack({ ok: false, reason: "noRoom" });
        return;
      }
      if (roomPasscode !== undefined && !secretMatches(claim?.passcode, roomPasscode)) {
        ack({ ok: false, reason: "wrongPasscode" });
        return;
      }

      if (room !== bound) unbind();
      bind(room, "host", true);
      log(room, "[room] Host reclaimed");
      ack({ ok: true, hostKey: room.hostKey });
    });

    socket.on("disconnect", () => {
      unbind();
      releaseOnRoomEnd.delete(socket);
    });

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
    // from a socket that hasn't been accepted as Host of its bound Room. An accepted one
    // is a Host action, restarting the Room's 4 hours.
    function onHostEvent<Args extends unknown[]>(event: string, handler: (room: Room, ...args: Args) => void): void {
      socket.on(event, (...args: Args) => {
        if (!bound || bound.members.get(socket) !== "host") return;
        bound.lastHostAction = now();
        handler(bound, ...args);
      });
    }

    // Why the engine refused a join or identity edit, in the Player's terms.
    function identityRefusal(wasLobby: boolean, identity: PlayerIdentity): Extract<JoinResult, { ok: false }> {
      if (!wasLobby) return { ok: false, error: "The game has already started." };
      const normalized = normalizeIdentity(identity);
      if (signatureTooBig(normalized)) {
        return { ok: false, reason: "signatureTooBig", error: "That drawing is too big — try a simpler drawing." };
      }
      if (nameTooLong(normalized)) {
        return { ok: false, error: `That name is too long — keep it to ${MAX_NAME_LENGTH} characters.` };
      }
      return {
        ok: false,
        error:
          identity.kind === "signature"
            ? "That signature didn't come through — try drawing again."
            : "That name is already taken.",
      };
    }

    onRoomEvent("join", (room, identity: PlayerIdentity, ack?: (result: JoinResult) => void) => {
      const wasLobby = room.game.phase === "lobby";
      if (wasLobby && room.game.players.length >= maxPlayersPerRoom) {
        ack?.({ ok: false, reason: "roomFull", error: "This Room is full." });
        return;
      }
      if (!dispatch(room, { type: "join", identity })) {
        ack?.(identityRefusal(wasLobby, identity));
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
        ack?.(identityRefusal(wasLobby, identity));
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

    onHostEvent("closeRoom", (room) => {
      endRoom(room, "closed by the Host");
    });
  });

  // Ends every Room past a time limit, through the same path as Close Room. The entry
  // point runs it about once a minute; tests advance the clock and call it directly.
  function sweep(): void {
    const time = now();
    for (const room of [...rooms.values()]) {
      if (room.emptySince !== undefined && time - room.emptySince >= EMPTY_ROOM_LIMIT_MS) {
        endRoom(room, "expired: empty for 30 minutes");
      } else if (time - room.lastHostAction >= HOST_IDLE_LIMIT_MS) {
        endRoom(room, "expired: no Host action for 4 hours");
      }
    }
  }

  return { app, httpServer, io, sweep };
}
