import type { AddressInfo } from "node:net";
import type { GameState, JoinResult, PlayerIdentity } from "@yeahnah/shared";
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
    expect((await dana.nextState()).activeClue).toMatchObject({ categoryIndex: 0, tileIndex: 0 });

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

  it("carries a drawn signature identity through a join round-trip to the broadcast state", async () => {
    const dana = await connect();
    await dana.nextState();

    const signature: PlayerIdentity = {
      kind: "signature",
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
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

  it("reopens a Clue after an incorrect judgement and lets the Host close it once everyone is excluded", async () => {
    const dana = await connect();
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
    await dana.nextState();

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

  it("resets to a fresh, empty-roster Lobby when the Host resets mid-Game", async () => {
    const dana = await connect();
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
});
