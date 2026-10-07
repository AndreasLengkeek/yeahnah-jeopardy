import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CATS, DOUBLE_JEOPARDY_VALUES } from "@yeahnah/shared";
import type {
  CreateRoomResult,
  GameState,
  IdentifyResult,
  JoinResult,
  PlayerIdentity,
  SocketRole,
} from "@yeahnah/shared";
import { io as ioClient, type Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { createGameServer } from "./server.js";

const textIdentity = (name: string): PlayerIdentity => ({ kind: "text", name });
const byName = (players: GameState["players"], name: string) =>
  players.find((player) => player.identity.kind === "text" && player.identity.name === name)!;

// Drives a fresh Game to the point where (0, 0) is the Active Clue, unrevealed.
// Returns the post-selectTile "state" payload each connection received, driver first.
// The server now boots into "setup", so the Lobby has to be opened first (the seeded
// example Board is complete, so openLobby succeeds immediately).
async function selectFirstClue(
  driver: { socket: Socket; nextState: () => Promise<GameState> },
  listeners: Array<{ nextState: () => Promise<GameState> }>,
): Promise<GameState[]> {
  const all = [driver, ...listeners];
  const drain = () => Promise.all(all.map((c) => c.nextState()));

  driver.socket.emit("openLobby");
  await drain();
  driver.socket.emit("join", textIdentity("Dana"));
  await drain();
  driver.socket.emit("join", textIdentity("Marcus"));
  await drain();
  driver.socket.emit("startGame");
  await drain();
  driver.socket.emit("selectTile", 0, 0);
  return drain();
}

async function fillDoubleJeopardyContent(host: { socket: Socket; nextState: () => Promise<GameState> }) {
  host.socket.emit("setTwoRounds", true);
  await host.nextState();

  for (let categoryIndex = 0; categoryIndex < CATS.length; categoryIndex++) {
    host.socket.emit("editDoubleJeopardyCategoryName", categoryIndex, `DJ ${categoryIndex}`);
    await host.nextState();
    for (let tileIndex = 0; tileIndex < CATS[categoryIndex].clues.length; tileIndex++) {
      host.socket.emit(
        "editDoubleJeopardyClue",
        categoryIndex,
        tileIndex,
        "text",
        `DJ clue ${categoryIndex}-${tileIndex}`,
      );
      await host.nextState();
      host.socket.emit(
        "editDoubleJeopardyClue",
        categoryIndex,
        tileIndex,
        "answer",
        `DJ answer ${categoryIndex}-${tileIndex}`,
      );
      await host.nextState();
    }
  }
}

async function sweepBoardToRoundBreak(
  driver: { socket: Socket; nextState: () => Promise<GameState> },
  listeners: Array<{ nextState: () => Promise<GameState> }>,
): Promise<GameState[]> {
  const all = [driver, ...listeners];
  const drain = () => Promise.all(all.map((c) => c.nextState()));

  for (let categoryIndex = 0; categoryIndex < 5; categoryIndex++) {
    for (let tileIndex = 0; tileIndex < 5; tileIndex++) {
      driver.socket.emit("selectTile", categoryIndex, tileIndex);
      await drain();
      driver.socket.emit("closeClue");
      const states = await drain();
      if (states[0].phase === "roundBreak") return states;
    }
  }

  throw new Error("Round 1 never reached roundBreak while sweeping the Board");
}

// The Daily Double coordinate is secretly randomized, so a hardcoded Tile pick may
// occasionally land on it. Since 03 permanently locks Buzzing out of a Daily Double
// Clue's entire lifetime (superseding 01's reveal-then-buzz interim behavior), tests
// that want ordinary Buzz/judge wiring select the first non-Daily-Double Tile they
// find instead, closing any Daily Double Clue they land on along the way.
async function selectFirstNonDailyDoubleTile(
  driver: { socket: Socket; nextState: () => Promise<GameState> },
  listeners: Array<{ nextState: () => Promise<GameState> }>,
): Promise<{ states: GameState[]; categoryIndex: number; tileIndex: number }> {
  const all = [driver, ...listeners];
  const drain = () => Promise.all(all.map((c) => c.nextState()));

  for (let categoryIndex = 0; categoryIndex < 5; categoryIndex++) {
    for (let tileIndex = 0; tileIndex < 5; tileIndex++) {
      driver.socket.emit("selectTile", categoryIndex, tileIndex);
      const states = await drain();
      if (!states[0].activeClue?.isDailyDouble) return { states, categoryIndex, tileIndex };

      driver.socket.emit("closeClue");
      await drain();
    }
  }

  throw new Error("Every Tile came back flagged as the Daily Double while sweeping the Board");
}

// Sweeps every Tile on the seeded 5x5 Board (closing each miss — immediately
// closable, since nobody's buzzed) until the one Tile that comes back flagged as the
// secretly pre-picked Daily Double is found, leaving it as the Active Clue.
async function selectUntilDailyDouble(
  driver: { socket: Socket; nextState: () => Promise<GameState> },
  listeners: Array<{ nextState: () => Promise<GameState> }>,
): Promise<GameState[]> {
  const all = [driver, ...listeners];
  const drain = () => Promise.all(all.map((c) => c.nextState()));

  for (let categoryIndex = 0; categoryIndex < 5; categoryIndex++) {
    for (let tileIndex = 0; tileIndex < 5; tileIndex++) {
      driver.socket.emit("selectTile", categoryIndex, tileIndex);
      const states = await drain();
      if (states[0].activeClue?.isDailyDouble) return states;

      driver.socket.emit("closeClue");
      await drain();
    }
  }

  throw new Error("No Daily Double Tile found while sweeping the Board");
}

describe("socket.io wiring (inside a created Room)", () => {
  let httpServer: ReturnType<typeof createGameServer>["httpServer"];
  let url: string;
  let sockets: Socket[] = [];
  // Silences the server's log lines, and lets a test inspect them.
  let consoleLog: MockInstance<typeof console.log>;
  // The Room every test in this block plays in.
  let room: Extract<CreateRoomResult, { ok: true }>;

  beforeEach(async () => {
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    ({ httpServer } = createGameServer());
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${port}`;
    const creator = ioClient(url);
    sockets.push(creator);
    room = await new Promise((resolve) => creator.emit("createRoom", undefined, resolve));
    consoleLog.mockClear();
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.close());
    sockets = [];
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    consoleLog.mockRestore();
  });

  // Declares `role` in the test's Room — a Host with the Room's Host Key unless the
  // claim says otherwise — and resolves once the claim is acknowledged. "state" pushes
  // are buffered from the moment the socket is created, so the post-identify view is
  // the first one `nextState` returns.
  async function connect(
    role: SocketRole,
    { hostKey }: { hostKey?: string } = role === "host" ? { hostKey: room.hostKey } : {},
  ): Promise<{ socket: Socket; nextState: () => Promise<GameState>; result: IdentifyResult }> {
    const socket = ioClient(url);
    sockets.push(socket);

    const queue: GameState[] = [];
    const waiters: Array<(state: GameState) => void> = [];
    socket.on("state", (state: GameState) => {
      const waiter = waiters.shift();
      if (waiter) waiter(state);
      else queue.push(state);
    });
    const nextState = () =>
      queue.length > 0 ? Promise.resolve(queue.shift()!) : new Promise<GameState>((r) => waiters.push(r));

    const result = await new Promise<IdentifyResult>((resolve) =>
      socket.emit("identify", { code: room.code, role, hostKey }, resolve),
    );
    return { socket, nextState, result };
  }

  it("broadcasts resulting state to every connected socket as actions are dispatched", async () => {
    const dana = await connect("host");
    expect((await dana.nextState()).phase).toBe("setup"); // post-identify view

    dana.socket.emit("openLobby");
    expect((await dana.nextState()).phase).toBe("lobby");

    dana.socket.emit("join", textIdentity("Dana"));
    expect((await dana.nextState()).players.map((p) => p.identity)).toEqual([textIdentity("Dana")]);

    const marcus = await connect("player");
    await marcus.nextState(); // post-identify view, already includes Dana

    marcus.socket.emit("join", textIdentity("Marcus"));
    expect((await dana.nextState()).players).toHaveLength(2);

    dana.socket.emit("startGame");
    const started = await dana.nextState();
    expect(started.phase).toBe("playing");
    const danaId = byName(started.players, "Dana").id;

    const {
      states: [selected],
    } = await selectFirstNonDailyDoubleTile(dana, []);
    expect(selected.activeClue?.isDailyDouble).toBe(false);

    dana.socket.emit("buzz", danaId);
    expect((await dana.nextState()).activeClue?.buzzedPlayerId).toBe(danaId);

    dana.socket.emit("judge", true);
    const judged = await dana.nextState();
    expect(judged.activeClue).toMatchObject({ buzzedPlayerId: null, correctPlayerId: danaId });
    expect(judged.players.find((p) => p.id === danaId)?.score).toBeGreaterThan(0);

    dana.socket.emit("closeClue");
    const closed = await dana.nextState();
    expect(closed.activeClue).toBeNull();
  });

  it.each([
    { event: "toggleBoardMusic" as const, flag: "boardMusicMuted" as const },
    { event: "toggleBoardEffects" as const, flag: "boardEffectsMuted" as const },
  ])("wires $event through to every socket role without redacting it", async ({ event, flag }) => {
    const host = await connect("host");
    await host.nextState();
    const board = await connect("board");
    await board.nextState();
    const player = await connect("player");
    await player.nextState();

    host.socket.emit(event);
    const [hostMuted, boardMuted, playerMuted] = await Promise.all([
      host.nextState(),
      board.nextState(),
      player.nextState(),
    ]);

    expect(hostMuted[flag]).toBe(true);
    expect(boardMuted[flag]).toBe(true);
    expect(playerMuted[flag]).toBe(true);
  });

  describe("Signature images", () => {
    const PIXEL_PNG =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const REDRAWN_PNG =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const signature: PlayerIdentity = { kind: "signature", image: `data:image/png;base64,${PIXEL_PNG}` };
    const redrawn: PlayerIdentity = { kind: "signature", image: `data:image/png;base64,${REDRAWN_PNG}` };

    // Opens the Lobby and joins `identity` from a fresh Player socket. The Host's and
    // Player's next states are the post-join broadcast.
    async function joinAs(identity: PlayerIdentity) {
      const host = await connect("host");
      await host.nextState();
      host.socket.emit("openLobby");
      await host.nextState();
      const player = await connect("player");
      await player.nextState();
      const ack = await new Promise<JoinResult>((resolve) => player.socket.emit("join", identity, resolve));
      expect(ack.ok).toBe(true);
      const playerId = (ack as Extract<JoinResult, { ok: true }>).playerId;
      return { host, player, playerId };
    }

    const imageOf = (state: GameState) => {
      const identity = state.players[0].identity;
      if (identity.kind !== "signature") throw new Error("expected a Signature");
      return identity.image;
    };

    it("broadcasts a Room-scoped image address for a Signature, not its data URL", async () => {
      const { host, player, playerId } = await joinAs(signature);

      const views = await Promise.all([host.nextState(), player.nextState()]);

      for (const view of views) {
        expect(imageOf(view)).toMatch(new RegExp(`^/rooms/${room.code}/signatures/${playerId}/`));
        expect(JSON.stringify(view)).not.toContain(PIXEL_PNG);
      }
    });

    it("serves the Signature image at its address with long-lived caching", async () => {
      const { host } = await joinAs(signature);
      const address = imageOf(await host.nextState());

      const response = await fetch(url + address);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
      expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
      expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from(PIXEL_PNG, "base64"));
    });

    it("gives a reconnecting device the same image address", async () => {
      const { host, playerId } = await joinAs(signature);
      const address = imageOf(await host.nextState());

      const reconnected = await connect("player");
      await reconnected.nextState();
      reconnected.socket.emit("reconnect", playerId);

      expect(imageOf(await reconnected.nextState())).toBe(address);
    });

    it("404s the image under another Room's code or for an unknown Player", async () => {
      const { host, playerId } = await joinAs(signature);
      const address = imageOf(await host.nextState());
      const version = address.split("/").pop();
      const other = await new Promise<Extract<CreateRoomResult, { ok: true }>>((resolve) =>
        sockets[0].emit("createRoom", undefined, resolve),
      );

      const responses = await Promise.all([
        fetch(`${url}/rooms/${other.code}/signatures/${playerId}/${version}`),
        fetch(`${url}/rooms/${room.code}/signatures/no-such-player/${version}`),
        fetch(`${url}/rooms/ZZZZ/signatures/${playerId}/${version}`),
      ]);

      expect(responses.map((response) => response.status)).toEqual([404, 404, 404]);
    });

    it("changes the address when the Player redraws, and retires the old one", async () => {
      const { host, player, playerId } = await joinAs(signature);
      const before = imageOf(await host.nextState());
      await player.nextState();

      const ack = await new Promise<JoinResult>((resolve) =>
        player.socket.emit("editIdentity", playerId, redrawn, resolve),
      );
      expect(ack.ok).toBe(true);
      const after = imageOf(await host.nextState());

      expect(after).not.toBe(before);
      expect(after).toMatch(new RegExp(`^/rooms/${room.code}/signatures/${playerId}/`));
      const [oldResponse, newResponse] = await Promise.all([fetch(url + before), fetch(url + after)]);
      expect(oldResponse.status).toBe(404);
      expect(Buffer.from(await newResponse.arrayBuffer())).toEqual(Buffer.from(REDRAWN_PNG, "base64"));
    });

    it("never serves a Signature that isn't a canvas image", async () => {
      const page: PlayerIdentity = {
        kind: "signature",
        image: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      };
      const { host } = await joinAs(page);
      const address = imageOf(await host.nextState());

      expect(address).toMatch(new RegExp(`^/rooms/${room.code}/signatures/`));
      expect((await fetch(url + address)).status).toBe(404);
    });

    it("leaves typed names untouched", async () => {
      const { host } = await joinAs(textIdentity("Aroha"));

      expect((await host.nextState()).players[0].identity).toEqual(textIdentity("Aroha"));
    });
  });

  it("lets a joined Player edit their identity before the Game starts, broadcasting the change", async () => {
    const dana = await connect("host");
    await dana.nextState();
    dana.socket.emit("openLobby");
    await dana.nextState();

    const joinAck = await new Promise<JoinResult>((resolve) => {
      dana.socket.emit("join", textIdentity("Dana"), resolve);
    });
    expect(joinAck.ok).toBe(true);
    const danaId = (joinAck as Extract<JoinResult, { ok: true }>).playerId;
    await dana.nextState();

    const editAck = await new Promise<JoinResult>((resolve) => {
      dana.socket.emit("editIdentity", danaId, textIdentity("Danielle"), resolve);
    });
    expect(editAck.ok).toBe(true);

    const broadcast = await dana.nextState();
    expect(broadcast.players[0].identity).toEqual(textIdentity("Danielle"));
  });

  it("reopens a Clue after an incorrect judgement and lets the Host close it once everyone is excluded", async () => {
    const dana = await connect("host");
    await dana.nextState();
    dana.socket.emit("openLobby");
    await dana.nextState();
    dana.socket.emit("join", textIdentity("Dana"));
    await dana.nextState();
    dana.socket.emit("join", textIdentity("Marcus"));
    const withMarcus = await dana.nextState();
    const danaId = byName(withMarcus.players, "Dana").id;
    const marcusId = byName(withMarcus.players, "Marcus").id;

    dana.socket.emit("startGame");
    await dana.nextState();

    const { categoryIndex, tileIndex } = await selectFirstNonDailyDoubleTile(dana, []);

    dana.socket.emit("buzz", danaId);
    await dana.nextState();

    dana.socket.emit("judge", false);
    const afterDana = await dana.nextState();
    expect(afterDana.activeClue?.buzzedPlayerId).toBeNull();
    expect(afterDana.activeClue?.excludedPlayerIds).toEqual([danaId]);
    expect(afterDana.players.find((p) => p.id === danaId)?.score).toBeLessThan(0);

    dana.socket.emit("buzz", marcusId);
    await dana.nextState();
    dana.socket.emit("judge", false);
    await dana.nextState();

    dana.socket.emit("closeClue");
    const closed = await dana.nextState();
    expect(closed.activeClue).toBeNull();
    expect(closed.board[categoryIndex].tiles[tileIndex].used).toBe(true);
  });

  it("reattaches a known Player id to a fresh socket connection, and rejects an unknown one", async () => {
    const dana = await connect("host");
    await dana.nextState();
    dana.socket.emit("openLobby");
    await dana.nextState();
    const joinAck = await new Promise<JoinResult>((resolve) => {
      dana.socket.emit("join", textIdentity("Dana"), resolve);
    });
    await dana.nextState();
    const danaId = (joinAck as Extract<JoinResult, { ok: true }>).playerId;

    // Simulates Dana's phone reloading: a brand-new socket connection reconnecting
    // with the id her browser persisted at join.
    const reconnected = await connect("player");
    await reconnected.nextState();

    const ack = await new Promise<JoinResult>((resolve) => {
      reconnected.socket.emit("reconnect", danaId, resolve);
    });
    expect(ack).toEqual({ ok: true, playerId: danaId });

    const badAck = await new Promise<JoinResult>((resolve) => {
      reconnected.socket.emit("reconnect", "not-a-real-player", resolve);
    });
    expect(badAck.ok).toBe(false);
  });

  it("broadcasts a corrected score when the Host emits setScore, without touching Clue state", async () => {
    const dana = await connect("host");
    await dana.nextState();
    dana.socket.emit("openLobby");
    await dana.nextState();
    dana.socket.emit("join", textIdentity("Dana"));
    await dana.nextState();
    dana.socket.emit("join", textIdentity("Marcus"));
    const withMarcus = await dana.nextState();
    const danaId = byName(withMarcus.players, "Dana").id;

    dana.socket.emit("startGame");
    await dana.nextState();
    await selectFirstNonDailyDoubleTile(dana, []);
    dana.socket.emit("buzz", danaId);
    const buzzed = await dana.nextState();
    expect(buzzed.activeClue?.buzzedPlayerId).toBe(danaId);

    dana.socket.emit("setScore", danaId, -350);
    const corrected = await dana.nextState();

    expect(corrected.players.find((p) => p.id === danaId)?.score).toBe(-350);
    expect(corrected.activeClue?.buzzedPlayerId).toBe(danaId);
  });

  it("resets to a fresh Lobby, keeping every Player at $0, when the Host resets mid-Game", async () => {
    const dana = await connect("host");
    await dana.nextState();
    dana.socket.emit("openLobby");
    await dana.nextState();
    dana.socket.emit("join", textIdentity("Dana"));
    await dana.nextState();
    dana.socket.emit("join", textIdentity("Marcus"));
    await dana.nextState();
    dana.socket.emit("startGame");
    await dana.nextState();

    dana.socket.emit("resetGame");
    const reset = await dana.nextState();

    expect(reset.phase).toBe("lobby");
    expect(reset.players.map((player) => [player.identity, player.score])).toEqual([
      [textIdentity("Dana"), 0],
      [textIdentity("Marcus"), 0],
    ]);
    expect(reset.activeClue).toBeNull();
  });

  it("wires the Board Setup authoring events through to the reducer", async () => {
    const host = await connect("host");
    const seeded = await host.nextState(); // post-identify view
    expect(seeded.phase).toBe("setup");
    expect(seeded.content).toHaveLength(5);

    host.socket.emit("newBoard", 3);
    expect((await host.nextState()).content).toHaveLength(3);

    host.socket.emit("editCategoryName", 0, "History");
    expect((await host.nextState()).content[0].name).toBe("History");

    host.socket.emit("editClue", 0, 0, "text", "A clue");
    expect((await host.nextState()).content[0].clues[0].text).toBe("A clue");

    // Still incomplete, so openLobby produces no state change; the next broadcast the
    // socket sees is the following newBoard, still in "setup".
    host.socket.emit("openLobby");
    host.socket.emit("newBoard", 4);
    const afterNewBoard = await host.nextState();
    expect(afterNewBoard.content).toHaveLength(4);
    expect(afterNewBoard.phase).toBe("setup");

    host.socket.emit("importBoardConfig", CATS);
    const afterImport = await host.nextState();
    expect(afterImport.content).toEqual(CATS);
  });

  it("wires the Double Jeopardy authoring events through to the reducer", async () => {
    const host = await connect("host");
    await host.nextState(); // post-identify view

    host.socket.emit("setTwoRounds", true);
    const withTwoRounds = await host.nextState();
    expect(withTwoRounds.twoRounds).toBe(true);
    expect(withTwoRounds.doubleJeopardyContent).toHaveLength(5);

    host.socket.emit("editDoubleJeopardyCategoryName", 0, "Double History");
    expect((await host.nextState()).doubleJeopardyContent![0].name).toBe("Double History");

    host.socket.emit("editDoubleJeopardyClue", 0, 0, "text", "A double clue");
    expect((await host.nextState()).doubleJeopardyContent![0].clues[0].text).toBe("A double clue");

    host.socket.emit("setTwoRounds", false);
    const withoutTwoRounds = await host.nextState();
    expect(withoutTwoRounds.twoRounds).toBe(false);
    expect(withoutTwoRounds.doubleJeopardyContent).toBeNull();
  });

  it("wires startDoubleJeopardy through to the reducer", async () => {
    const host = await connect("host");
    await host.nextState();

    await fillDoubleJeopardyContent(host);

    host.socket.emit("openLobby");
    await host.nextState();
    host.socket.emit("join", textIdentity("Dana"));
    const withDana = await host.nextState();
    host.socket.emit("join", textIdentity("Marcus"));
    await host.nextState();
    host.socket.emit("startGame");
    await host.nextState();

    const [roundBreak] = await sweepBoardToRoundBreak(host, []);
    expect(roundBreak.phase).toBe("roundBreak");

    host.socket.emit("startDoubleJeopardy");
    const doubleJeopardy = await host.nextState();

    expect(doubleJeopardy.phase).toBe("playing");
    expect(doubleJeopardy.round).toBe(2);
    expect(doubleJeopardy.players).toEqual(roundBreak.players);
    doubleJeopardy.board.forEach((category) => {
      expect(category.tiles.map((tile) => tile.value)).toEqual(DOUBLE_JEOPARDY_VALUES);
    });
    expect(doubleJeopardy.board[0].name).toBe("DJ 0");
    expect(byName(doubleJeopardy.players, "Dana").id).toBe(byName(withDana.players, "Dana").id);
  });

  it("returns from the Lobby to Board Setup without dropping already-joined Players", async () => {
    const host = await connect("host");
    await host.nextState();

    host.socket.emit("openLobby");
    expect((await host.nextState()).phase).toBe("lobby");

    host.socket.emit("join", textIdentity("Dana"));
    expect((await host.nextState()).players.map((p) => p.identity)).toEqual([textIdentity("Dana")]);

    host.socket.emit("returnToSetup");
    const next = await host.nextState();
    expect(next.phase).toBe("setup");
    expect(next.players.map((p) => p.identity)).toEqual([textIdentity("Dana")]);
    expect(next.board).toEqual([]);
    expect(next.activeClue).toBeNull();
  });

  it("logs accepted Game events, and nothing for rejected or unlisted actions", async () => {
    const host = await connect("host");
    await host.nextState();
    const logged = () => consoleLog.mock.calls.map(([line]) => line);

    host.socket.emit("openLobby");
    await host.nextState();
    host.socket.emit("join", textIdentity("Dana"));
    await host.nextState();
    host.socket.emit("startGame"); // rejected: only one Player
    host.socket.emit("join", textIdentity("Marcus"));
    await host.nextState();
    host.socket.emit("startGame");
    await host.nextState();

    expect(logged()).toEqual([
      `[${room.code}] [game] Player "Dana" joined (1 player)`,
      `[${room.code}] [game] Player "Marcus" joined (2 players)`,
      `[${room.code}] [game] Game started (2 players)`,
    ]);
  });

  it("logs a joined Player's socket disconnecting, and nothing for a non-Player socket", async () => {
    const host = await connect("host");
    await host.nextState();
    host.socket.emit("openLobby");
    await host.nextState();

    const dana = await connect("player");
    await dana.nextState();
    await new Promise((resolve) => dana.socket.emit("join", textIdentity("Dana"), resolve));
    const board = await connect("board");
    await board.nextState();
    consoleLog.mockClear();

    board.socket.disconnect();
    dana.socket.disconnect();
    await vi.waitFor(() => expect(consoleLog).toHaveBeenCalled());

    expect(consoleLog.mock.calls.map(([line]) => line)).toEqual([`[${room.code}] [game] "Dana" disconnected`]);
  });

  it("logs a Player reconnecting once per new connection, ignoring a repeat from the same one", async () => {
    const host = await connect("host");
    await host.nextState();
    host.socket.emit("openLobby");
    await host.nextState();
    const dana = await connect("player");
    await dana.nextState();
    const danaId = await new Promise<string>((resolve) =>
      dana.socket.emit("join", textIdentity("Dana"), (result: JoinResult) => resolve(result.ok ? result.playerId : "")),
    );
    consoleLog.mockClear();

    const phone = await connect("player");
    await phone.nextState();
    await new Promise((resolve) => phone.socket.emit("reconnect", danaId, resolve));
    await new Promise((resolve) => phone.socket.emit("reconnect", danaId, resolve));
    await new Promise((resolve) => dana.socket.emit("reconnect", danaId, resolve));

    expect(consoleLog.mock.calls.map(([line]) => line)).toEqual([`[${room.code}] [game] "Dana" reconnected`]);
  });

  describe("Answer redaction by socket role (ADR-0006)", () => {
    const trueAnswer = CATS[0].clues[0].answer;
    const trueClueText = CATS[0].clues[0].text;

    it("sends the Active Clue's Answer to a Host socket the moment it becomes Active", async () => {
      const host = await connect("host");
      await host.nextState(); // post-identify view

      const [selected] = await selectFirstClue(host, []);

      expect(selected.activeClue).toMatchObject({ answer: trueAnswer, clueText: trueClueText, revealed: false });
    });

    it("withholds a pre-Reveal Answer from Board and Player sockets, then releases it to them on Reveal", async () => {
      const host = await connect("host");
      await host.nextState();
      const board = await connect("board");
      await board.nextState();
      const player = await connect("player");
      await player.nextState();

      const [hostSel, boardSel, playerSel] = await selectFirstClue(host, [board, player]);

      expect(hostSel.activeClue?.answer).toBe(trueAnswer);
      expect(boardSel.activeClue?.answer).toBe("");
      expect(playerSel.activeClue?.answer).toBe("");
      // The Clue text itself still travels to everyone before Reveal.
      expect(boardSel.activeClue?.clueText).toBe(trueClueText);
      expect(playerSel.activeClue?.clueText).toBe(trueClueText);
      // The authored content never reaches Board or Player sockets at all.
      expect(hostSel.content.length).toBeGreaterThan(0);
      expect(boardSel.content).toEqual([]);
      expect(playerSel.content).toEqual([]);

      host.socket.emit("reveal");
      const [hostRev, boardRev, playerRev] = await Promise.all([
        host.nextState(),
        board.nextState(),
        player.nextState(),
      ]);

      expect(hostRev.activeClue?.answer).toBe(trueAnswer);
      expect(boardRev.activeClue?.answer).toBe(trueAnswer);
      expect(playerRev.activeClue?.answer).toBe(trueAnswer);
    });

    it("sends nothing at all to a socket that never identifies into a Room", async () => {
      const host = await connect("host");
      await host.nextState();
      const anon = ioClient(url);
      sockets.push(anon);
      const anonStates: GameState[] = [];
      anon.on("state", (state: GameState) => anonStates.push(state));
      await new Promise<void>((resolve) => anon.on("connect", () => resolve()));

      const [hostSel] = await selectFirstClue(host, []);
      // Round-trip on the anonymous socket so anything sent to it has arrived.
      await new Promise((resolve) => anon.emit("reconnect", "no-such-player", resolve));

      expect(hostSel.activeClue?.answer).toBe(trueAnswer);
      expect(anonStates).toEqual([]);
    });
  });

  describe("Daily Double secrecy", () => {
    it("never includes the secret Daily Double coordinate in any state broadcast to any role, before or after selection", async () => {
      const host = await connect("host");
      await host.nextState(); // post-identify view

      host.socket.emit("openLobby");
      const hostOpen = await host.nextState();
      expect(hostOpen.dailyDouble).toBeNull();

      const board = await connect("board");
      await board.nextState();
      const player = await connect("player");
      await player.nextState();

      host.socket.emit("join", textIdentity("Dana"));
      await Promise.all([host.nextState(), board.nextState(), player.nextState()]);
      host.socket.emit("join", textIdentity("Marcus"));
      await Promise.all([host.nextState(), board.nextState(), player.nextState()]);
      host.socket.emit("startGame");
      await Promise.all([host.nextState(), board.nextState(), player.nextState()]);

      host.socket.emit("selectTile", 0, 0);
      const [hostSel, boardSel, playerSel] = await Promise.all([
        host.nextState(),
        board.nextState(),
        player.nextState(),
      ]);

      expect(hostSel.dailyDouble).toBeNull();
      expect(boardSel.dailyDouble).toBeNull();
      expect(playerSel.dailyDouble).toBeNull();
      // Whichever Tile turned out to be the Daily Double, its ActiveClue carries the
      // flag instead — that's the only sanctioned way the secret ever surfaces.
      expect(typeof hostSel.activeClue?.isDailyDouble).toBe("boolean");
    });
  });

  describe("Daily Double cover screen (showDailyDoubleClue)", () => {
    it("hides a Daily Double's Clue text from every role until the Host shows it, then reveals it to all", async () => {
      const host = await connect("host");
      await host.nextState();
      const board = await connect("board");
      await board.nextState();
      const player = await connect("player");
      await player.nextState();

      host.socket.emit("openLobby");
      await Promise.all([host.nextState(), board.nextState(), player.nextState()]);
      host.socket.emit("join", textIdentity("Dana"));
      await Promise.all([host.nextState(), board.nextState(), player.nextState()]);
      host.socket.emit("join", textIdentity("Marcus"));
      await Promise.all([host.nextState(), board.nextState(), player.nextState()]);
      host.socket.emit("startGame");
      await Promise.all([host.nextState(), board.nextState(), player.nextState()]);

      // The Daily Double coordinate is secret and random — sweep every Tile on the
      // seeded 5x5 Board, closing each miss (immediately closable: nobody buzzed),
      // until the one Tile that comes back flagged is found.
      let found = false;
      for (let categoryIndex = 0; categoryIndex < 5 && !found; categoryIndex++) {
        for (let tileIndex = 0; tileIndex < 5 && !found; tileIndex++) {
          host.socket.emit("selectTile", categoryIndex, tileIndex);
          const [hostSel, boardSel, playerSel] = await Promise.all([
            host.nextState(),
            board.nextState(),
            player.nextState(),
          ]);

          if (!hostSel.activeClue?.isDailyDouble) {
            host.socket.emit("closeClue");
            await Promise.all([host.nextState(), board.nextState(), player.nextState()]);
            continue;
          }

          found = true;
          expect(hostSel.activeClue.clueShown).toBe(false);
          expect(boardSel.activeClue?.clueShown).toBe(false);
          expect(playerSel.activeClue?.clueShown).toBe(false);

          host.socket.emit("showDailyDoubleClue");
          const [hostShown, boardShown, playerShown] = await Promise.all([
            host.nextState(),
            board.nextState(),
            player.nextState(),
          ]);

          expect(hostShown.activeClue?.clueShown).toBe(true);
          expect(boardShown.activeClue?.clueShown).toBe(true);
          expect(playerShown.activeClue?.clueShown).toBe(true);
        }
      }

      expect(found).toBe(true);
    });
  });

  describe("Daily Double designate & wager (designateWagerer / submitWager)", () => {
    it("broadcasts a designateWagerer and a submitWager to every role, following the existing 1:1 wiring pattern", async () => {
      const host = await connect("host");
      await host.nextState();
      const board = await connect("board");
      await board.nextState();
      const player = await connect("player");
      await player.nextState();

      host.socket.emit("openLobby");
      await Promise.all([host.nextState(), board.nextState(), player.nextState()]);
      host.socket.emit("join", textIdentity("Dana"));
      const [hostJoinedDana] = await Promise.all([host.nextState(), board.nextState(), player.nextState()]);
      host.socket.emit("join", textIdentity("Marcus"));
      await Promise.all([host.nextState(), board.nextState(), player.nextState()]);
      host.socket.emit("startGame");
      await Promise.all([host.nextState(), board.nextState(), player.nextState()]);

      const danaId = byName(hostJoinedDana.players, "Dana").id;

      const [hostSel] = await selectUntilDailyDouble(host, [board, player]);
      expect(hostSel.activeClue?.isDailyDouble).toBe(true);

      host.socket.emit("designateWagerer", danaId);
      const [hostDesignated, boardDesignated, playerDesignated] = await Promise.all([
        host.nextState(),
        board.nextState(),
        player.nextState(),
      ]);
      expect(hostDesignated.activeClue?.wageringPlayerId).toBe(danaId);
      expect(boardDesignated.activeClue?.wageringPlayerId).toBe(danaId);
      expect(playerDesignated.activeClue?.wageringPlayerId).toBe(danaId);

      host.socket.emit("submitWager", danaId, 100);
      const [hostWagered, boardWagered, playerWagered] = await Promise.all([
        host.nextState(),
        board.nextState(),
        player.nextState(),
      ]);
      expect(hostWagered.activeClue?.wager).toBe(100);
      expect(boardWagered.activeClue?.wager).toBe(100);
      expect(playerWagered.activeClue?.wager).toBe(100);
    });
  });

  describe("Host Key gating (ADR-0015)", () => {
    const trueAnswer = CATS[0].clues[0].answer;

    // Claims `role` in the Room with `hostKey`, resolving once the claim is acknowledged
    // and its post-identify view drained.
    async function claim(role: SocketRole, hostKey?: string) {
      const connection = await connect(role, { hostKey });
      const view = await connection.nextState();
      return { ...connection, view };
    }

    // Events from one socket are handled in order, so once an acked round-trip on
    // `socket` returns, everything it emitted before has been handled (or ignored).
    function settle(socket: Socket): Promise<void> {
      return new Promise((resolve) => socket.emit("reconnect", "no-such-player", () => resolve()));
    }

    it("accepts a Host claim with the Host Key and sends it an unrevealed Active Clue's Answer", async () => {
      const host = await claim("host", room.hostKey);
      expect(host.result).toBe("accepted");

      const [selected] = await selectFirstClue(host, []);

      expect(selected.activeClue).toMatchObject({ answer: trueAnswer, revealed: false });
    });

    it.each([
      { label: "a wrong", hostKey: "guess" },
      { label: "a missing", hostKey: undefined },
    ])("rejects a Host claim with $label Host Key and keeps sending it the redacted view", async ({ hostKey }) => {
      const host = await claim("host", room.hostKey);
      const intruder = await claim("host", hostKey);
      expect(intruder.result).toBe("rejected");

      const [hostSel, intruderSel] = await selectFirstClue(host, [intruder]);

      expect(hostSel.activeClue?.answer).toBe(trueAnswer);
      expect(intruderSel.activeClue?.answer).toBe("");
      expect(intruderSel.content).toEqual([]);
    });

    it.each(["board", "player"] as const)("ignores Host actions from a %s socket", async (role) => {
      const host = await claim("host", room.hostKey);
      const other = await claim(role);
      await settle(other.socket);
      other.socket.emit("openLobby");
      await settle(other.socket);

      host.socket.emit("toggleBoardMusic");
      const [hostState] = await Promise.all([host.nextState(), other.nextState()]);
      expect(hostState.phase).toBe("setup");
    });

    it("ignores Host actions from a connection that hasn't proven the Host Key", async () => {
      const host = await claim("host", room.hostKey);
      const intruder = await claim("host", "guess");
      const drain = () => Promise.all([host.nextState(), intruder.nextState()]);
      let hostState = host.view;

      // Each ignored batch is followed by one real Host action (toggling Board Music).
      // Had anything in the batch changed state, its broadcast would arrive first and
      // the next state would differ from "previous, with Board Music toggled".
      async function expectIgnored(emitBatch: () => void): Promise<void> {
        const previous = hostState;
        emitBatch();
        await settle(intruder.socket);
        host.socket.emit("toggleBoardMusic");
        [hostState] = await drain();
        expect(hostState).toEqual({ ...previous, boardMusicMuted: !previous.boardMusicMuted });
      }

      // Board Setup
      await expectIgnored(() => {
        intruder.socket.emit("editCategoryName", 0, "Hacked");
        intruder.socket.emit("editClue", 0, 0, "answer", "Hacked");
        intruder.socket.emit("newBoard", 3);
        intruder.socket.emit("importBoardConfig", []);
        intruder.socket.emit("setTwoRounds", true);
        intruder.socket.emit("openLobby");
      });

      // Lobby
      host.socket.emit("openLobby");
      await drain();
      host.socket.emit("join", textIdentity("Dana"));
      await drain();
      host.socket.emit("join", textIdentity("Marcus"));
      [hostState] = await drain();
      await expectIgnored(() => {
        intruder.socket.emit("startGame");
        intruder.socket.emit("returnToSetup");
        intruder.socket.emit("resetGame");
      });

      // Playing
      host.socket.emit("startGame");
      [hostState] = await drain();
      await expectIgnored(() => intruder.socket.emit("selectTile", 0, 0));

      const {
        states: [selected],
      } = await selectFirstNonDailyDoubleTile(host, [intruder]);
      const danaId = byName(selected.players, "Dana").id;
      host.socket.emit("buzz", danaId);
      [hostState] = await drain();
      await expectIgnored(() => {
        intruder.socket.emit("judge", true);
        intruder.socket.emit("reveal");
        intruder.socket.emit("closeClue");
        intruder.socket.emit("setScore", danaId, 99999);
        intruder.socket.emit("resetGame");
      });
      expect(hostState.activeClue).toMatchObject({ buzzedPlayerId: danaId, revealed: false });
      expect(byName(hostState.players, "Dana").score).toBe(0);
    });

    it("lets the Board connect and Players join and Buzz without any credential", async () => {
      const host = await claim("host", room.hostKey);
      const board = await claim("board");
      const player = await claim("player");
      expect(board.result).toBe("accepted");
      expect(player.result).toBe("accepted");
      const drain = () => Promise.all([host, board, player].map((c) => c.nextState()));

      host.socket.emit("openLobby");
      await drain();
      const joinAck = await new Promise<JoinResult>((resolve) =>
        player.socket.emit("join", textIdentity("Dana"), resolve),
      );
      expect(joinAck.ok).toBe(true);
      const danaId = (joinAck as Extract<JoinResult, { ok: true }>).playerId;
      await drain();
      player.socket.emit("join", textIdentity("Marcus"));
      await drain();
      host.socket.emit("startGame");
      await drain();

      const {
        states: [, boardSel],
      } = await selectFirstNonDailyDoubleTile(host, [board, player]);
      expect(boardSel.activeClue?.answer).toBe("");
      player.socket.emit("buzz", danaId);
      const [buzzed] = await drain();
      expect(buzzed.activeClue?.buzzedPlayerId).toBe(danaId);
    });

    it("lets a Player submit a Daily Double Wager without any credential", async () => {
      const host = await claim("host", room.hostKey);
      const player = await claim("player");
      const drain = () => Promise.all([host.nextState(), player.nextState()]);

      host.socket.emit("openLobby");
      await drain();
      player.socket.emit("join", textIdentity("Dana"));
      const [joined] = await drain();
      const danaId = byName(joined.players, "Dana").id;
      player.socket.emit("join", textIdentity("Marcus"));
      await drain();
      host.socket.emit("startGame");
      await drain();

      await selectUntilDailyDouble(host, [player]);
      host.socket.emit("designateWagerer", danaId);
      await drain();
      player.socket.emit("submitWager", danaId, 100);
      const [wagered] = await drain();
      expect(wagered.activeClue?.wager).toBe(100);
    });
  });
});

describe("Rooms (ADR-0015)", () => {
  const ROOM_PASSCODE = "kia-ora-2026";
  let httpServer: ReturnType<typeof createGameServer>["httpServer"];
  let closeRoom: ReturnType<typeof createGameServer>["closeRoom"];
  let url: string;
  let sockets: Socket[] = [];
  let consoleLog: MockInstance<typeof console.log>;

  async function start(options?: Parameters<typeof createGameServer>[0]) {
    ({ httpServer, closeRoom } = createGameServer(options));
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${port}`;
  }

  beforeEach(() => {
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.close());
    sockets = [];
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    consoleLog.mockRestore();
  });

  function open(): Socket {
    const socket = ioClient(url);
    sockets.push(socket);
    return socket;
  }

  function createRoom(passcode?: string): Promise<CreateRoomResult> {
    return new Promise((resolve) => open().emit("createRoom", passcode, resolve));
  }

  type Created = Extract<CreateRoomResult, { ok: true }>;
  const created = async (passcode?: string) => (await createRoom(passcode)) as Created;

  // A socket that declares `role` in Room `code`, with every "state" push buffered from
  // the start (see `connect` in the socket.io wiring tests).
  async function enter(code: string, role: SocketRole, hostKey?: string) {
    const socket = open();
    const queue: GameState[] = [];
    const waiters: Array<(state: GameState) => void> = [];
    const received: GameState[] = [];
    socket.on("state", (state: GameState) => {
      received.push(state);
      const waiter = waiters.shift();
      if (waiter) waiter(state);
      else queue.push(state);
    });
    const nextState = () =>
      queue.length > 0 ? Promise.resolve(queue.shift()!) : new Promise<GameState>((r) => waiters.push(r));
    const result = await new Promise<IdentifyResult>((resolve) =>
      socket.emit("identify", { code, role, hostKey }, resolve),
    );
    return { socket, nextState, result, received };
  }

  // Events from one socket are handled in order, so once an acked round-trip on
  // `socket` returns, everything it emitted before has been handled (or ignored).
  function settle(socket: Socket): Promise<void> {
    return new Promise((resolve) => socket.emit("reconnect", "no-such-player", () => resolve()));
  }

  const trueAnswer = CATS[0].clues[0].answer;

  describe("claiming a role in a Room", () => {
    it("accepts a Host claim with the Room's Host Key and sends it the Answers", async () => {
      await start({ roomPasscode: ROOM_PASSCODE });
      const room = await created(ROOM_PASSCODE);

      const host = await enter(room.code, "host", room.hostKey);

      expect(host.result).toBe("accepted");
      expect((await host.nextState()).content[0].clues[0].answer).toBe(trueAnswer);
    });

    it.each([
      { label: "a wrong", hostKey: "guess" },
      { label: "a missing", hostKey: undefined },
    ])("rejects a Host claim with $label Host Key and sends it the redacted view", async ({ hostKey }) => {
      await start();
      const room = await created();

      const intruder = await enter(room.code, "host", hostKey);

      expect(intruder.result).toBe("rejected");
      const view = await intruder.nextState();
      expect(view.phase).toBe("setup");
      expect(view.content).toEqual([]);
    });

    it("matches the Room Code whatever its case", async () => {
      await start();
      const room = await created();

      const host = await enter(room.code.toLowerCase(), "host", room.hostKey);

      expect(host.result).toBe("accepted");
    });

    it("answers noRoom, and sends no state, for a code with no live Room", async () => {
      await start();
      const room = await created();
      const unused = room.code === "BCDF" ? "BCDG" : "BCDF";

      const lost = await enter(unused, "board");
      await settle(lost.socket);

      expect(lost.result).toBe("noRoom");
      expect(lost.received).toEqual([]);
    });

    it("lets the Board and Players in without any credential", async () => {
      await start({ roomPasscode: ROOM_PASSCODE });
      const room = await created(ROOM_PASSCODE);

      expect((await enter(room.code, "board")).result).toBe("accepted");
      expect((await enter(room.code, "player")).result).toBe("accepted");
    });
  });

  describe("two Rooms side by side", () => {
    // Room A gets a Host, a Board and a Player; Room B the same. Every socket has
    // drained its post-identify view.
    async function twoRooms() {
      await start();
      const a = await created();
      const b = await created();
      const roomA = {
        host: await enter(a.code, "host", a.hostKey),
        board: await enter(a.code, "board"),
        player: await enter(a.code, "player"),
      };
      const roomB = {
        host: await enter(b.code, "host", b.hostKey),
        board: await enter(b.code, "board"),
        player: await enter(b.code, "player"),
      };
      for (const c of [...Object.values(roomA), ...Object.values(roomB)]) await c.nextState();
      return { a, b, roomA, roomB };
    }

    it("never changes, or broadcasts to, the other Room on Host actions, joins and Buzzes", async () => {
      const { roomA, roomB } = await twoRooms();
      const inA = Object.values(roomA);
      const drainA = () => Promise.all(inA.map((c) => c.nextState()));
      const bBefore = roomB.host.received.length + roomB.board.received.length + roomB.player.received.length;

      roomA.host.socket.emit("openLobby");
      await drainA();
      roomA.player.socket.emit("join", textIdentity("Dana"));
      await drainA();
      roomA.player.socket.emit("join", textIdentity("Marcus"));
      await drainA();
      roomA.host.socket.emit("startGame");
      await drainA();
      const {
        states: [selected],
      } = await selectFirstNonDailyDoubleTile(roomA.host, [roomA.board, roomA.player]);
      roomA.player.socket.emit("buzz", byName(selected.players, "Dana").id);
      const [buzzed] = await drainA();
      expect(buzzed.activeClue?.buzzedPlayerId).toBe(byName(selected.players, "Dana").id);

      // Room B's own next action shows its state untouched by everything above.
      roomB.host.socket.emit("toggleBoardMusic");
      const [bHost, bBoard, bPlayer] = await Promise.all(Object.values(roomB).map((c) => c.nextState()));
      expect(bHost.phase).toBe("setup");
      expect(bHost.players).toEqual([]);
      expect(bBoard.players).toEqual([]);
      expect(bPlayer.players).toEqual([]);
      const bAfter = roomB.host.received.length + roomB.board.received.length + roomB.player.received.length;
      expect(bAfter - bBefore).toBe(3);
    });

    it("never sends one Room's Answer to the other Room's sockets", async () => {
      const { roomA, roomB } = await twoRooms();

      const [hostSel] = await selectFirstClue(roomA.host, [roomA.board, roomA.player]);
      roomB.host.socket.emit("toggleBoardMusic");
      await Promise.all(Object.values(roomB).map((c) => c.nextState()));

      expect(hostSel.activeClue?.answer).toBe(trueAnswer);
      for (const c of Object.values(roomB)) {
        expect(c.received.every((state) => state.activeClue === null)).toBe(true);
      }
    });

    it("doesn't accept Room A's Host Key as Host of Room B", async () => {
      const { a, b, roomB } = await twoRooms();

      const intruder = await enter(b.code, "host", a.hostKey);
      await intruder.nextState();
      expect(intruder.result).toBe("rejected");

      intruder.socket.emit("openLobby");
      await settle(intruder.socket);
      roomB.host.socket.emit("toggleBoardMusic");
      expect((await roomB.host.nextState()).phase).toBe("setup");
    });

    it("moves a socket that identifies into another Room out of its first one", async () => {
      const { b, roomA, roomB } = await twoRooms();

      const wanderer = roomA.board;
      await new Promise((resolve) => wanderer.socket.emit("identify", { code: b.code, role: "board" }, resolve));
      await wanderer.nextState();
      const before = wanderer.received.length;

      roomA.host.socket.emit("toggleBoardMusic");
      await roomA.host.nextState();
      roomB.host.socket.emit("toggleBoardMusic");
      await roomB.host.nextState();
      await wanderer.nextState();

      expect(wanderer.received.length - before).toBe(1);
    });
  });

  describe("creating a Room", () => {
    it("returns a Room Code and Host Key for the right Room Passcode", async () => {
      await start({ roomPasscode: ROOM_PASSCODE });

      const result = await createRoom(ROOM_PASSCODE);

      expect(result).toEqual({ ok: true, code: expect.stringMatching(/^[A-Z]{4}$/), hostKey: expect.any(String) });
    });

    it.each([
      { label: "a wrong", passcode: "guess" },
      { label: "a missing", passcode: undefined },
    ])("refuses $label Room Passcode", async ({ passcode }) => {
      await start({ roomPasscode: ROOM_PASSCODE });

      expect(await createRoom(passcode)).toEqual({ ok: false, reason: "wrongPasscode" });
    });

    it("is open to anyone when no Room Passcode is configured", async () => {
      await start();

      expect((await createRoom()).ok).toBe(true);
      expect((await createRoom("anything")).ok).toBe(true);
    });

    it("gives each new Room its own code and Host Key", async () => {
      await start();

      const [a, b] = (await Promise.all([createRoom(), createRoom()])) as Array<
        Extract<CreateRoomResult, { ok: true }>
      >;

      expect(a.code).not.toBe(b.code);
      expect(a.hostKey).not.toBe(b.hostKey);
    });

    it("logs the new Room under its code", async () => {
      await start();

      const room = (await createRoom()) as Extract<CreateRoomResult, { ok: true }>;

      expect(consoleLog.mock.calls.map(([line]) => line)).toEqual([`[${room.code}] [room] Room created`]);
    });
  });

  describe("capacity guards", () => {
    it("refuses a Room past the live-Room cap as at capacity, and creates one again once a Room ends", async () => {
      await start({ maxRooms: 2 });
      const first = await created();
      await created();

      expect(await createRoom()).toEqual({ ok: false, reason: "atCapacity" });

      closeRoom(first.code);
      expect((await createRoom()).ok).toBe(true);
    });

    it("defaults to 20 live Rooms", async () => {
      await start();
      for (let i = 0; i < 20; i++) expect((await createRoom()).ok).toBe(true);

      expect(await createRoom()).toEqual({ ok: false, reason: "atCapacity" });
    });

    // A Room with its Lobby open, and a Player socket in it ready to join.
    async function openLobby(options?: Parameters<typeof createGameServer>[0]) {
      await start(options);
      const room = await created();
      const host = await enter(room.code, "host", room.hostKey);
      await host.nextState();
      host.socket.emit("openLobby");
      await host.nextState();
      return room;
    }

    function join(socket: Socket, identity: PlayerIdentity): Promise<JoinResult> {
      return new Promise((resolve) => socket.emit("join", identity, resolve));
    }

    it("refuses the 13th join as full, while a joined Player can still reconnect", async () => {
      const room = await openLobby();
      const player = await enter(room.code, "player");
      const joined: JoinResult[] = [];
      for (let i = 1; i <= 12; i++) joined.push(await join(player.socket, textIdentity(`Player ${i}`)));
      expect(joined.every((result) => result.ok)).toBe(true);

      const latecomer = await enter(room.code, "player");
      expect(await join(latecomer.socket, textIdentity("Latecomer"))).toEqual({
        ok: false,
        reason: "roomFull",
        error: "This Room is full.",
      });

      const firstId = (joined[0] as Extract<JoinResult, { ok: true }>).playerId;
      const returning = await enter(room.code, "player");
      const reconnected = await new Promise<JoinResult>((resolve) =>
        returning.socket.emit("reconnect", firstId, resolve),
      );
      expect(reconnected).toEqual({ ok: true, playerId: firstId });
    });

    it("takes the Players-per-Room cap as an option", async () => {
      const room = await openLobby({ maxPlayersPerRoom: 1 });
      const player = await enter(room.code, "player");

      expect((await join(player.socket, textIdentity("Dana"))).ok).toBe(true);
      expect(await join(player.socket, textIdentity("Marcus"))).toMatchObject({ ok: false, reason: "roomFull" });
    });
  });

  describe("size caps", () => {
    const signature = (bytes: number): PlayerIdentity => ({
      kind: "signature",
      image: `data:image/png;base64,${"A".repeat(bytes)}`,
    });
    const tooBig = { ok: false, reason: "signatureTooBig", error: expect.stringContaining("simpler drawing") };

    async function lobbyWithPlayer() {
      await start();
      const room = await created();
      const host = await enter(room.code, "host", room.hostKey);
      await host.nextState();
      host.socket.emit("openLobby");
      await host.nextState();
      const player = await enter(room.code, "player");
      const join = (identity: PlayerIdentity) =>
        new Promise<JoinResult>((resolve) => player.socket.emit("join", identity, resolve));
      const edit = (id: string, identity: PlayerIdentity) =>
        new Promise<JoinResult>((resolve) => player.socket.emit("editIdentity", id, identity, resolve));
      return { join, edit };
    }

    it("refuses an over-cap Signature at join, asking for a simpler drawing", async () => {
      const { join } = await lobbyWithPlayer();

      expect(await join(signature(60_000))).toEqual(tooBig);
      expect((await join(signature(40_000))).ok).toBe(true);
    });

    it("refuses an over-cap Signature at edit", async () => {
      const { join, edit } = await lobbyWithPlayer();
      const joined = (await join(textIdentity("Dana"))) as Extract<JoinResult, { ok: true }>;

      expect(await edit(joined.playerId, signature(60_000))).toEqual(tooBig);
    });

    it("refuses a typed name over 40 characters at join and edit", async () => {
      const { join, edit } = await lobbyWithPlayer();

      expect(await join(textIdentity("D".repeat(41)))).toEqual({ ok: false, error: expect.stringContaining("40") });
      const joined = (await join(textIdentity("D".repeat(40)))) as Extract<JoinResult, { ok: true }>;
      expect(joined.ok).toBe(true);
      expect(await edit(joined.playerId, textIdentity("E".repeat(41)))).toMatchObject({ ok: false });
    });

    describe("Board Setup text", () => {
      async function setupHost() {
        await start();
        const room = await created();
        const host = await enter(room.code, "host", room.hostKey);
        await host.nextState();
        // Whether `emitEvent` changed the Board: a refused edit broadcasts nothing.
        const changes = async (emitEvent: (socket: Socket) => void) => {
          const before = host.received.length;
          emitEvent(host.socket);
          await settle(host.socket);
          return host.received.length > before;
        };
        return { host, changes };
      }

      const category = (name: string, clue: string, answer: string) => ({
        name,
        clues: CATS[0].clues.map(() => ({ text: clue, answer })),
      });
      const board = (overrides: Partial<{ name: string; clue: string; answer: string }>) => {
        const { name = "Birds", clue = "A clue", answer = "An answer" } = overrides;
        return CATS.map(() => category(name, clue, answer));
      };

      it("refuses Category names over 60 characters", async () => {
        const { changes } = await setupHost();

        expect(await changes((s) => s.emit("editCategoryName", 0, "C".repeat(61)))).toBe(false);
        expect(await changes((s) => s.emit("editCategoryName", 0, "C".repeat(60)))).toBe(true);
      });

      it.each(["text", "answer"])("refuses a Clue %s over 500 characters", async (field) => {
        const { changes } = await setupHost();

        expect(await changes((s) => s.emit("editClue", 0, 0, field, "x".repeat(501)))).toBe(false);
        expect(await changes((s) => s.emit("editClue", 0, 0, field, "x".repeat(500)))).toBe(true);
      });

      it("refuses over-long Double Jeopardy text too", async () => {
        const { host, changes } = await setupHost();
        host.socket.emit("setTwoRounds", true);
        await host.nextState();

        expect(await changes((s) => s.emit("editDoubleJeopardyCategoryName", 0, "C".repeat(61)))).toBe(false);
        expect(await changes((s) => s.emit("editDoubleJeopardyClue", 0, 0, "answer", "x".repeat(501)))).toBe(false);
      });

      it.each([
        { label: "a Category name", overrides: { name: "C".repeat(61) } },
        { label: "a Clue", overrides: { clue: "x".repeat(501) } },
        { label: "an Answer", overrides: { answer: "x".repeat(501) } },
      ])("refuses a Board Config import with an over-long $label", async ({ overrides }) => {
        const { changes } = await setupHost();

        expect(await changes((s) => s.emit("importBoardConfig", board(overrides)))).toBe(false);
        expect(await changes((s) => s.emit("importBoardConfig", board({})))).toBe(true);
      });
    });
  });
});

describe("serving the built client", () => {
  const ENTRY_PAGE = "<!doctype html><title>stub entry page</title>";
  let clientDir: string;
  let httpServer: ReturnType<typeof createGameServer>["httpServer"];
  let url: string;

  async function start(options?: Parameters<typeof createGameServer>[0]) {
    ({ httpServer } = createGameServer(options));
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${port}`;
  }

  beforeEach(async () => {
    clientDir = await mkdtemp(join(tmpdir(), "yeahnah-client-"));
    await writeFile(join(clientDir, "index.html"), ENTRY_PAGE);
    await mkdir(join(clientDir, "assets"));
    await writeFile(join(clientDir, "assets", "app.js"), "console.log('stub');");
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await rm(clientDir, { recursive: true, force: true });
  });

  it.each(["/", "/join", "/host", "/BRDK/host", "/BRDK/board", "/brdk/join"])(
    "returns the entry page for %s",
    async (path) => {
      await start({ clientDir });

      const res = await fetch(url + path);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/text\/html/);
      expect(await res.text()).toBe(ENTRY_PAGE);
    },
  );

  it("serves static assets from the client directory", async () => {
    await start({ clientDir });

    const res = await fetch(`${url}/assets/app.js`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/javascript/);
    expect(await res.text()).toBe("console.log('stub');");
  });

  it("answers a missing asset with 404 rather than the entry page", async () => {
    await start({ clientDir });

    const res = await fetch(`${url}/assets/stale-hash.js`);

    expect(res.status).toBe(404);
  });

  it("answers an unknown Signature image address with 404 rather than the entry page", async () => {
    await start({ clientDir });

    const res = await fetch(`${url}/rooms/BRDK/signatures/no-such-player/abc123`);

    expect(res.status).toBe(404);
  });

  it("still answers the health endpoint", async () => {
    await start({ clientDir });

    const res = await fetch(`${url}/health`);

    expect(await res.json()).toEqual({ ok: true });
  });

  // Single-origin deploy (ADR-0014): see the CORS note in server.ts.
  it.each(["/health", "/socket.io/?EIO=4&transport=polling"])("grants no cross-origin access to %s", async (path) => {
    await start({ clientDir });

    const res = await fetch(url + path, { headers: { Origin: "https://elsewhere.example" } });

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("serves no client routes when no client directory is configured", async () => {
    await start();

    expect((await fetch(`${url}/host`)).status).toBe(404);
    expect(await (await fetch(`${url}/health`)).json()).toEqual({ ok: true });
  });
});
