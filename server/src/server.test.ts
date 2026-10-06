import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CATS, DOUBLE_JEOPARDY_VALUES } from "@yeahnah/shared";
import type { GameState, IdentifyResult, JoinResult, PlayerIdentity, SocketRole } from "@yeahnah/shared";
import { io as ioClient, type Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGameServer } from "./server.js";

const textIdentity = (name: string): PlayerIdentity => ({ kind: "text", name });
const byName = (players: GameState["players"], name: string) =>
  players.find((player) => player.identity.kind === "text" && player.identity.name === name)!;

describe("socket.io wiring", () => {
  let httpServer: ReturnType<typeof createGameServer>["httpServer"];
  let url: string;
  let sockets: Socket[] = [];

  beforeEach(async () => {
    ({ httpServer } = createGameServer());
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    sockets.forEach((socket) => socket.close());
    sockets = [];
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  // Buffers "state" broadcasts from the moment the socket is created, since the
  // server pushes the initial state as soon as the connection handshake completes —
  // a listener attached only after the "connect" event can arrive too late to see it.
  function connect(role?: SocketRole): Promise<{ socket: Socket; nextState: () => Promise<GameState> }> {
    return new Promise((resolve) => {
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

      socket.on("connect", () => {
        // A socket that declares a role gets a second "state" push in reply (the
        // now role-appropriate view), on top of the one sent on raw connect.
        if (role) socket.emit("identify", role);
        resolve({ socket, nextState });
      });
    });
  }

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
        host.socket.emit("editDoubleJeopardyClue", categoryIndex, tileIndex, "text", `DJ clue ${categoryIndex}-${tileIndex}`);
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

  it("broadcasts resulting state to every connected socket as actions are dispatched", async () => {
    const dana = await connect();
    expect((await dana.nextState()).phase).toBe("setup"); // initial state pushed on connect

    dana.socket.emit("openLobby");
    expect((await dana.nextState()).phase).toBe("lobby");

    dana.socket.emit("join", textIdentity("Dana"));
    expect((await dana.nextState()).players.map((p) => p.identity)).toEqual([textIdentity("Dana")]);

    const marcus = await connect();
    await marcus.nextState(); // initial state, already includes Dana

    marcus.socket.emit("join", textIdentity("Marcus"));
    expect((await dana.nextState()).players).toHaveLength(2);

    dana.socket.emit("startGame");
    const started = await dana.nextState();
    expect(started.phase).toBe("playing");
    const danaId = byName(started.players, "Dana").id;

    const { states: [selected] } = await selectFirstNonDailyDoubleTile(dana, []);
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
    await host.nextState();
    const board = await connect("board");
    await board.nextState();
    await board.nextState();
    const player = await connect("player");
    await player.nextState();
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

  it("carries a drawn signature identity through a join round-trip to the broadcast state", async () => {
    const dana = await connect();
    await dana.nextState();
    dana.socket.emit("openLobby");
    await dana.nextState();

    const signature: PlayerIdentity = {
      kind: "signature",
      image:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    };
    const ack = await new Promise<JoinResult>((resolve) => {
      dana.socket.emit("join", signature, resolve);
    });
    expect(ack.ok).toBe(true);

    const broadcast = await dana.nextState();
    expect(broadcast.players).toHaveLength(1);
    expect(broadcast.players[0].identity).toEqual(signature);

    // A reconnect is playerId-keyed, so the drawn Signature comes back unchanged just
    // like a typed name would.
    const danaId = (ack as Extract<JoinResult, { ok: true }>).playerId;
    const reconnected = await connect();
    await reconnected.nextState();
    reconnected.socket.emit("reconnect", danaId);
    expect((await reconnected.nextState()).players[0].identity).toEqual(signature);
  });

  it("lets a joined Player edit their identity before the Game starts, broadcasting the change", async () => {
    const dana = await connect();
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
    const dana = await connect();
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
    const dana = await connect();
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
    const reconnected = await connect();
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
    const dana = await connect();
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

  it("resets to a fresh, empty-roster Lobby when the Host resets mid-Game", async () => {
    const dana = await connect();
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
    expect(reset.players).toEqual([]);
    expect(reset.activeClue).toBeNull();
  });

  it("wires the Board Setup authoring events through to the reducer", async () => {
    const host = await connect("host");
    await host.nextState(); // raw-connect view
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
    await host.nextState(); // raw-connect view
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

  describe("Answer redaction by socket role (ADR-0006)", () => {
    const trueAnswer = CATS[0].clues[0].answer;
    const trueClueText = CATS[0].clues[0].text;

    it("sends the Active Clue's Answer to a Host socket the moment it becomes Active", async () => {
      const host = await connect("host");
      await host.nextState(); // raw-connect view
      await host.nextState(); // post-identify view

      const [selected] = await selectFirstClue(host, []);

      expect(selected.activeClue).toMatchObject({ answer: trueAnswer, clueText: trueClueText, revealed: false });
    });

    it("withholds a pre-Reveal Answer from Board and Player sockets, then releases it to them on Reveal", async () => {
      const host = await connect("host");
      await host.nextState();
      await host.nextState();
      const board = await connect("board");
      await board.nextState();
      await board.nextState();
      const player = await connect("player");
      await player.nextState();
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

    it("treats a socket that never identifies as the most restrictive (Player) view", async () => {
      const host = await connect("host");
      await host.nextState();
      await host.nextState();
      const anon = await connect();
      await anon.nextState(); // raw-connect view; no identify follows

      const [hostSel, anonSel] = await selectFirstClue(host, [anon]);

      expect(hostSel.activeClue?.answer).toBe(trueAnswer);
      expect(anonSel.activeClue?.answer).toBe("");
    });
  });

  describe("Daily Double secrecy", () => {
    it("never includes the secret Daily Double coordinate in any state broadcast to any role, before or after selection", async () => {
      const host = await connect("host");
      await host.nextState(); // raw-connect view
      await host.nextState(); // post-identify view

      host.socket.emit("openLobby");
      const hostOpen = await host.nextState();
      expect(hostOpen.dailyDouble).toBeNull();

      const board = await connect("board");
      await board.nextState();
      await board.nextState();
      const player = await connect("player");
      await player.nextState();
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
      await host.nextState();
      const board = await connect("board");
      await board.nextState();
      await board.nextState();
      const player = await connect("player");
      await player.nextState();
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
      await host.nextState();
      const board = await connect("board");
      await board.nextState();
      await board.nextState();
      const player = await connect("player");
      await player.nextState();
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

  describe("Host Passcode (ADR-0014)", () => {
    const PASSCODE = "kia-ora-2026";
    const trueAnswer = CATS[0].clues[0].answer;

    // Swaps the passcode-less server the outer beforeEach started for one configured
    // with a Host Passcode, reusing the outer helpers (they read `url` lazily).
    beforeEach(async () => {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      ({ httpServer } = createGameServer({ hostPasscode: PASSCODE }));
      await new Promise<void>((resolve) => httpServer.listen(0, resolve));
      const { port } = httpServer.address() as AddressInfo;
      url = `http://127.0.0.1:${port}`;
    });

    // Connects, then claims `role` with `passcode`, resolving once the server has
    // acknowledged the claim and pushed the resulting view (both drained here).
    async function claim(role: SocketRole, passcode?: string) {
      const connection = await connect();
      await connection.nextState(); // raw-connect view
      const result = await new Promise<IdentifyResult>((resolve) =>
        connection.socket.emit("identify", role, passcode, resolve),
      );
      const view = await connection.nextState(); // post-identify view
      return { ...connection, result, view };
    }

    // Events from one socket are handled in order, so once an acked round-trip on
    // `socket` returns, everything it emitted before has been handled (or ignored).
    function settle(socket: Socket): Promise<void> {
      return new Promise((resolve) => socket.emit("reconnect", "no-such-player", () => resolve()));
    }

    it("accepts a Host claim with the correct passcode and sends it an unrevealed Active Clue's Answer", async () => {
      const host = await claim("host", PASSCODE);
      expect(host.result).toBe("accepted");

      const [selected] = await selectFirstClue(host, []);

      expect(selected.activeClue).toMatchObject({ answer: trueAnswer, revealed: false });
    });

    it.each([
      { label: "a wrong", passcode: "guess" },
      { label: "a missing", passcode: undefined },
    ])("rejects a Host claim with $label passcode and keeps sending it the redacted view", async ({ passcode }) => {
      const host = await claim("host", PASSCODE);
      const intruder = await claim("host", passcode);
      expect(intruder.result).toBe("rejected");

      const [hostSel, intruderSel] = await selectFirstClue(host, [intruder]);

      expect(hostSel.activeClue?.answer).toBe(trueAnswer);
      expect(intruderSel.activeClue?.answer).toBe("");
      expect(intruderSel.content).toEqual([]);
    });

    it("ignores Host actions from a connection that hasn't proven the passcode", async () => {
      const host = await claim("host", PASSCODE);
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

      const { states: [selected] } = await selectFirstNonDailyDoubleTile(host, [intruder]);
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

    it("lets the Board connect and Players join and Buzz without any passcode", async () => {
      const host = await claim("host", PASSCODE);
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

      const { states: [, boardSel] } = await selectFirstNonDailyDoubleTile(host, [board, player]);
      expect(boardSel.activeClue?.answer).toBe("");
      player.socket.emit("buzz", danaId);
      const [buzzed] = await drain();
      expect(buzzed.activeClue?.buzzedPlayerId).toBe(danaId);
    });

    it("lets a Player submit a Daily Double Wager without any passcode", async () => {
      const host = await claim("host", PASSCODE);
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

  describe("Host Passcode not configured", () => {
    it("accepts a Host claim without any passcode", async () => {
      const { socket, nextState } = await connect();
      await nextState();
      const result = await new Promise<IdentifyResult>((resolve) => socket.emit("identify", "host", undefined, resolve));
      expect(result).toBe("accepted");
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

  it.each(["/", "/host", "/board", "/join"])("returns the entry page for %s", async (path) => {
    await start({ clientDir });

    const res = await fetch(url + path);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    expect(await res.text()).toBe(ENTRY_PAGE);
  });

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

  it("still answers the health endpoint", async () => {
    await start({ clientDir });

    const res = await fetch(`${url}/health`);

    expect(await res.json()).toEqual({ ok: true });
  });

  it("serves no client routes when no client directory is configured", async () => {
    await start();

    expect((await fetch(`${url}/host`)).status).toBe(404);
    expect(await (await fetch(`${url}/health`)).json()).toEqual({ ok: true });
  });
});
