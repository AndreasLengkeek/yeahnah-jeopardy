import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { applyAction, initialState, viewForRole } from "@yeahnah/shared";
import type { ActiveClue, IdentifyClaim, IdentifyResult, Player } from "@yeahnah/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in socket that records listeners, so tests can play the server's part:
// fire "connect"/"state", and answer each `identify` claim's acknowledgement.
const fakeSocket = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    connected: true,
    listeners,
    emit: vi.fn(),
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    }),
    off: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(listener);
    }),
  };
});

vi.mock("../socket", () => ({ socket: fakeSocket }));

import { renderAt } from "../test/renderAt";
import { hostFooter } from "./HostPage";

function activeClue(overrides: Partial<ActiveClue> = {}): ActiveClue {
  return {
    categoryIndex: 0,
    tileIndex: 0,
    clueText: "This Baltic capital sits on the Vilnia River",
    answer: "Vilnius",
    revealed: false,
    buzzedPlayerId: null,
    excludedPlayerIds: [],
    correctPlayerId: null,
    isDailyDouble: false,
    clueShown: true,
    wageringPlayerId: null,
    wager: null,
    ...overrides,
  };
}

const players: Player[] = [{ id: "p1", identity: { kind: "text", name: "Ann" }, score: 0, connected: true }];

describe("hostFooter", () => {
  it("shows Correct/Incorrect once a Daily Double Wager is submitted", () => {
    render(
      <>
        {hostFooter(activeClue({ isDailyDouble: true, clueShown: true, wageringPlayerId: "p1", wager: 500 }), players)}
      </>,
    );

    expect(screen.getByRole("button", { name: "Correct" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Incorrect" })).toBeInTheDocument();
  });

  it("does not show Correct/Incorrect for a Daily Double before a Wager is submitted", () => {
    render(<>{hostFooter(activeClue({ isDailyDouble: true, clueShown: true, wager: null }), players)}</>);

    expect(screen.queryByRole("button", { name: "Correct" })).not.toBeInTheDocument();
  });

  it("hides Correct/Incorrect for a Daily Double once judged (revealed)", () => {
    render(
      <>
        {hostFooter(
          activeClue({ isDailyDouble: true, clueShown: true, wageringPlayerId: "p1", wager: 500, revealed: true }),
          players,
        )}
      </>,
    );

    expect(screen.queryByRole("button", { name: "Correct" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close Clue" })).toBeInTheDocument();
  });

  it("still shows Correct/Incorrect for a normal Clue once buzzed", () => {
    render(<>{hostFooter(activeClue({ buzzedPlayerId: "p1" }), players)}</>);

    expect(screen.getByRole("button", { name: "Correct" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Incorrect" })).toBeInTheDocument();
  });
});

const hostKeyStorage = (code: string) => `yeahnah-jeopardy:hostKey:${code}`;

function fire(event: string, ...args: unknown[]) {
  act(() => fakeSocket.listeners.get(event)?.forEach((listener) => listener(...args)));
}

function identifyClaims(): Array<{ claim: IdentifyClaim; ack: (result: IdentifyResult) => void }> {
  return fakeSocket.emit.mock.calls.filter(([event]) => event === "identify").map(([, claim, ack]) => ({ claim, ack }));
}

// Plays the server answering the latest Host claim: an accepted claim also gets the
// Host's (unredacted) view pushed first, a rejected one the Player view — the order
// the real server sends them in. A "noRoom" answer gets no state at all.
function answerLatestClaim(result: IdentifyResult) {
  const claim = identifyClaims().at(-1)!;
  if (result !== "noRoom") fire("state", viewForRole(initialState(), result === "accepted" ? "host" : "player"));
  act(() => claim.ack(result));
}

const openLobbyButton = () => screen.queryByRole("button", { name: /Open Lobby/ });

describe("HostPage Host Key claim", () => {
  beforeEach(() => {
    fakeSocket.emit.mockClear();
    fakeSocket.listeners.clear();
    fakeSocket.connected = true;
    localStorage.clear();
  });

  it("claims Host of the Room in its address with the Host Key this device holds for that Room", () => {
    localStorage.setItem(hostKeyStorage("BRDK"), "key-brdk");
    localStorage.setItem(hostKeyStorage("QZTM"), "key-qztm");
    renderAt("/brdk/host");

    expect(identifyClaims().map(({ claim }) => claim)).toEqual([{ code: "BRDK", role: "host", hostKey: "key-brdk" }]);
  });

  it("shows the Host screen once the claim is accepted", () => {
    localStorage.setItem(hostKeyStorage("BRDK"), "key-brdk");
    renderAt("/BRDK/host");
    expect(openLobbyButton()).not.toBeInTheDocument();

    answerLatestClaim("accepted");

    expect(openLobbyButton()).toBeInTheDocument();
  });

  it("says this device isn't the Host, shows nothing of the Game, and forgets the rejected key", () => {
    localStorage.setItem(hostKeyStorage("BRDK"), "stale-key");
    localStorage.setItem(hostKeyStorage("QZTM"), "key-qztm");
    renderAt("/BRDK/host");

    answerLatestClaim("rejected");

    expect(screen.getByText("This device isn't the Host of Room BRDK")).toBeInTheDocument();
    expect(openLobbyButton()).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Board" })).not.toBeInTheDocument();
    expect(localStorage.getItem(hostKeyStorage("BRDK"))).toBeNull();
    expect(localStorage.getItem(hostKeyStorage("QZTM"))).toBe("key-qztm");
  });

  it("claims with no Host Key when this device holds none for the Room", () => {
    renderAt("/BRDK/host");
    expect(identifyClaims()[0].claim).toEqual({ code: "BRDK", role: "host", hostKey: undefined });

    answerLatestClaim("rejected");

    expect(screen.getByText("This device isn't the Host of Room BRDK")).toBeInTheDocument();
  });

  it("says so when no Room has the code", () => {
    renderAt("/BRDK/host");

    answerLatestClaim("noRoom");

    expect(screen.getByText("No Room with that code")).toBeInTheDocument();
    expect(openLobbyButton()).not.toBeInTheDocument();
  });

  it("reclaims Host with the remembered Host Key after a dropped connection", () => {
    localStorage.setItem(hostKeyStorage("BRDK"), "key-brdk");
    renderAt("/BRDK/host");
    answerLatestClaim("accepted");

    fire("connect");
    // A fresh connection is bound to no Room, so nothing of the Game shows until the
    // reclaim is acknowledged.
    expect(openLobbyButton()).not.toBeInTheDocument();

    expect(identifyClaims()).toHaveLength(2);
    expect(identifyClaims()[1].claim).toEqual({ code: "BRDK", role: "host", hostKey: "key-brdk" });
    answerLatestClaim("accepted");
    expect(openLobbyButton()).toBeInTheDocument();
  });
});

// A Game in play: the Lobby opened, two Players joined, and the Game started.
function playingState() {
  let state = applyAction(initialState(), { type: "openLobby" });
  state = applyAction(state, { type: "join", identity: { kind: "text", name: "Ann" } });
  state = applyAction(state, { type: "join", identity: { kind: "text", name: "Ben" } });
  return applyAction(state, { type: "startGame" });
}

describe("HostPage Room panel", () => {
  beforeEach(() => {
    fakeSocket.emit.mockClear();
    fakeSocket.listeners.clear();
    fakeSocket.connected = true;
    localStorage.clear();
    localStorage.setItem(hostKeyStorage("BRDK"), "key-brdk");
  });

  const roomPanel = () => screen.getByRole("complementary", { name: "Room" });

  it("shows the Room Code and where Players join", () => {
    renderAt("/brdk/host");
    answerLatestClaim("accepted");

    expect(within(roomPanel()).getByText("BRDK")).toBeInTheDocument();
    expect(within(roomPanel()).getByText(`Players join at ${window.location.host}/join`)).toBeInTheDocument();
  });

  it("shows how many Host devices, Board screens and Players are here now, as the counts change", () => {
    renderAt("/BRDK/host");
    answerLatestClaim("accepted");

    fire("roomInfo", { hosts: 2, boards: 1, players: 3 });
    expect(within(roomPanel()).getByText("2 Host devices")).toBeInTheDocument();
    expect(within(roomPanel()).getByText("1 Board")).toBeInTheDocument();
    expect(within(roomPanel()).getByText("3 Players")).toBeInTheDocument();

    fire("roomInfo", { hosts: 1, boards: 0, players: 1 });
    expect(within(roomPanel()).getByText("1 Host device")).toBeInTheDocument();
    expect(within(roomPanel()).getByText("0 Boards")).toBeInTheDocument();
    expect(within(roomPanel()).getByText("1 Player")).toBeInTheDocument();
  });

  it("links to the Room's Board", () => {
    renderAt("/brdk/host");
    answerLatestClaim("accepted");

    expect(within(roomPanel()).getByRole("link", { name: /Open Board/ })).toHaveAttribute("href", "/BRDK/board");
  });

  it("collapses to a Room Code strip during play, which expands on demand", () => {
    renderAt("/BRDK/host");
    answerLatestClaim("accepted");
    fire("roomInfo", { hosts: 1, boards: 1, players: 2 });

    fire("state", viewForRole(playingState(), "host"));

    expect(screen.queryByText("2 Players")).not.toBeInTheDocument();
    const strip = screen.getByRole("button", { name: /Room BRDK/ });
    expect(strip).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(strip);

    expect(strip).toHaveAttribute("aria-expanded", "true");
    expect(within(roomPanel()).getByText("2 Players")).toBeInTheDocument();
    expect(within(roomPanel()).getByRole("link", { name: /Open Board/ })).toBeInTheDocument();

    fireEvent.click(strip);

    expect(screen.queryByText("2 Players")).not.toBeInTheDocument();
  });
});
