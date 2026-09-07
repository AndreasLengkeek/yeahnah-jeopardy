import type { AddressInfo } from "node:net";
import { CATS } from "@yeahnah/shared";
import type { GameState, JoinResult, PlayerIdentity, SocketRole } from "@yeahnah/shared";
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

  // The Daily Double coordinate is secretly randomized; Tile (0, 0) may occasionally
  // land on it, and buzzing is gated behind its cover screen. Tests that select a
  // fixed Tile and buzz immediately call this first so they never flake.
  async function revealIfDailyDouble(
    driver: { socket: Socket; nextState: () => Promise<GameState> },
    state: GameState,
  ): Promise<void> {
    if (!state.activeClue?.isDailyDouble) return;
    driver.socket.emit("showDailyDoubleClue");
    await driver.nextState();
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

    dana.socket.emit("selectTile", 0, 0);
    const selected = await dana.nextState();
    expect(selected.activeClue).toMatchObject({ categoryIndex: 0, tileIndex: 0 });
    await revealIfDailyDouble(dana, selected);

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

  it("wires toggleBoardSound through to every socket role without redacting it", async () => {
    const host = await connect("host");
    await host.nextState();
    await host.nextState();
    const board = await connect("board");
    await board.nextState();
    await board.nextState();
    const player = await connect("player");
    await player.nextState();
    await player.nextState();

    host.socket.emit("toggleBoardSound");
    const [hostMuted, boardMuted, playerMuted] = await Promise.all([
      host.nextState(),
      board.nextState(),
      player.nextState(),
    ]);

    expect(hostMuted.boardSoundMuted).toBe(true);
    expect(boardMuted.boardSoundMuted).toBe(true);
    expect(playerMuted.boardSoundMuted).toBe(true);
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

    dana.socket.emit("selectTile", 0, 0);
    const selected = await dana.nextState();
    await revealIfDailyDouble(dana, selected);

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
    expect(closed.board[0].tiles[0].used).toBe(true);
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
    dana.socket.emit("selectTile", 0, 0);
    const selected = await dana.nextState();
    await revealIfDailyDouble(dana, selected);
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
});
