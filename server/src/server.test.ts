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
    expect((await dana.nextState()).phase).toBe("playing");
  });
});
