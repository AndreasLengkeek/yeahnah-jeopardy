import type { AddressInfo } from "node:net";
import type { GameState } from "@yeahnah/shared";
import { io as ioClient, type Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGameServer } from "./server.js";

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
  function connect(): Promise<{ socket: Socket; nextState: () => Promise<GameState> }> {
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
        queue.length > 0
          ? Promise.resolve(queue.shift()!)
          : new Promise<GameState>((r) => waiters.push(r));

      socket.on("connect", () => resolve({ socket, nextState }));
    });
  }

  it("broadcasts resulting state to every connected socket as actions are dispatched", async () => {
    const dana = await connect();
    await dana.nextState(); // initial state pushed on connect

    dana.socket.emit("join", "Dana");
    expect((await dana.nextState()).players.map((p) => p.name)).toEqual(["Dana"]);

    const marcus = await connect();
    await marcus.nextState(); // initial state, already includes Dana

    marcus.socket.emit("join", "Marcus");
    expect((await dana.nextState()).players).toHaveLength(2);

    dana.socket.emit("startGame");
    const started = await dana.nextState();
    expect(started.phase).toBe("playing");
    const danaId = started.players.find((p) => p.name === "Dana")!.id;

    dana.socket.emit("selectTile", 0, 0);
    expect((await dana.nextState()).activeClue).toMatchObject({ categoryIndex: 0, tileIndex: 0 });

    dana.socket.emit("buzz", danaId);
    expect((await dana.nextState()).activeClue?.buzzedPlayerId).toBe(danaId);

    dana.socket.emit("reveal");
    expect((await dana.nextState()).activeClue?.revealed).toBe(true);

    dana.socket.emit("judge", true);
    const judged = await dana.nextState();
    expect(judged.activeClue).toBeNull();
    expect(judged.players.find((p) => p.id === danaId)?.score).toBeGreaterThan(0);
  });

  it("reopens a Clue after an incorrect judgement and lets the Host close it once everyone is excluded", async () => {
    const dana = await connect();
    await dana.nextState();
    dana.socket.emit("join", "Dana");
    await dana.nextState();
    dana.socket.emit("join", "Marcus");
    const withMarcus = await dana.nextState();
    const danaId = withMarcus.players.find((p) => p.name === "Dana")!.id;
    const marcusId = withMarcus.players.find((p) => p.name === "Marcus")!.id;

    dana.socket.emit("startGame");
    await dana.nextState();

    dana.socket.emit("selectTile", 0, 0);
    await dana.nextState();

    dana.socket.emit("buzz", danaId);
    await dana.nextState();
    dana.socket.emit("reveal");
    await dana.nextState();

    dana.socket.emit("judge", false);
    const afterDana = await dana.nextState();
    expect(afterDana.activeClue?.buzzedPlayerId).toBeNull();
    expect(afterDana.activeClue?.excludedPlayerIds).toEqual([danaId]);
    expect(afterDana.players.find((p) => p.id === danaId)?.score).toBeLessThan(0);

    dana.socket.emit("buzz", marcusId);
    await dana.nextState();
    dana.socket.emit("reveal");
    await dana.nextState();
    dana.socket.emit("judge", false);
    await dana.nextState();

    dana.socket.emit("closeClue");
    const closed = await dana.nextState();
    expect(closed.activeClue).toBeNull();
    expect(closed.board[0].tiles[0].used).toBe(true);
  });

  it("resets to a fresh, empty-roster Lobby when the Host resets mid-Game", async () => {
    const dana = await connect();
    await dana.nextState();
    dana.socket.emit("join", "Dana");
    await dana.nextState();
    dana.socket.emit("join", "Marcus");
    await dana.nextState();
    dana.socket.emit("startGame");
    await dana.nextState();

    dana.socket.emit("resetGame");
    const reset = await dana.nextState();

    expect(reset.phase).toBe("lobby");
    expect(reset.players).toEqual([]);
    expect(reset.activeClue).toBeNull();
  });
});
