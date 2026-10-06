import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initialState, viewForRole } from "@yeahnah/shared";
import type { ActiveClue, IdentifyResult, Player } from "@yeahnah/shared";
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

import { HostPage, hostFooter } from "./HostPage";

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
      <>{hostFooter(activeClue({ isDailyDouble: true, clueShown: true, wageringPlayerId: "p1", wager: 500 }), players)}</>,
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

const PASSCODE_KEY = "yeahnah-jeopardy:hostPasscode";

function fire(event: string, ...args: unknown[]) {
  act(() => fakeSocket.listeners.get(event)?.forEach((listener) => listener(...args)));
}

function identifyClaims(): Array<{ role: unknown; passcode: unknown; ack: (result: IdentifyResult) => void }> {
  return fakeSocket.emit.mock.calls
    .filter(([event]) => event === "identify")
    .map(([, role, passcode, ack]) => ({ role, passcode, ack }));
}

// Plays the server answering the latest Host claim: an accepted claim also gets the
// Host's (unredacted) view pushed first, a rejected one the Player view — the order
// the real server sends them in.
function answerLatestClaim(result: IdentifyResult) {
  const claim = identifyClaims().at(-1)!;
  fire("state", viewForRole(initialState(), result === "accepted" ? "host" : "player"));
  act(() => claim.ack(result));
}

const passcodeField = () => screen.queryByLabelText("Host Passcode");

describe("HostPage Host Passcode prompt", () => {
  beforeEach(() => {
    fakeSocket.emit.mockClear();
    fakeSocket.listeners.clear();
    fakeSocket.connected = true;
    localStorage.clear();
  });

  it("shows the Host screen with no prompt when the claim is accepted first try", () => {
    render(<HostPage />);
    expect(identifyClaims()).toHaveLength(1);
    expect(identifyClaims()[0]).toMatchObject({ role: "host", passcode: undefined });

    answerLatestClaim("accepted");

    expect(passcodeField()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Lobby/ })).toBeInTheDocument();
  });

  it("shows only the passcode prompt when the claim is rejected", () => {
    render(<HostPage />);
    answerLatestClaim("rejected");

    expect(passcodeField()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open Lobby/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Board" })).not.toBeInTheDocument();
  });

  it("re-claims with the submitted passcode and remembers it once accepted", async () => {
    const user = userEvent.setup();
    render(<HostPage />);
    answerLatestClaim("rejected");

    await user.type(passcodeField()!, "kia-ora");
    await user.click(screen.getByRole("button", { name: "Enter" }));

    expect(identifyClaims().at(-1)).toMatchObject({ role: "host", passcode: "kia-ora" });
    answerLatestClaim("accepted");

    expect(passcodeField()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Lobby/ })).toBeInTheDocument();
    expect(localStorage.getItem(PASSCODE_KEY)).toBe("kia-ora");
  });

  it("says so when the submitted passcode is wrong, and doesn't remember it", async () => {
    const user = userEvent.setup();
    render(<HostPage />);
    answerLatestClaim("rejected");

    await user.type(passcodeField()!, "guess");
    await user.click(screen.getByRole("button", { name: "Enter" }));
    answerLatestClaim("rejected");

    expect(passcodeField()).toBeInTheDocument();
    expect(screen.getByText(/isn't the Host Passcode/)).toBeInTheDocument();
    expect(localStorage.getItem(PASSCODE_KEY)).toBeNull();
  });

  it("claims with the remembered passcode, and forgets it and prompts when it's rejected", () => {
    localStorage.setItem(PASSCODE_KEY, "old-passcode");
    render(<HostPage />);
    expect(identifyClaims()[0]).toMatchObject({ role: "host", passcode: "old-passcode" });

    answerLatestClaim("rejected");

    expect(passcodeField()).toBeInTheDocument();
    expect(localStorage.getItem(PASSCODE_KEY)).toBeNull();
  });

  it("reclaims the Host role with the remembered passcode after a dropped connection", () => {
    localStorage.setItem(PASSCODE_KEY, "kia-ora");
    render(<HostPage />);
    answerLatestClaim("accepted");

    fire("connect");
    // A fresh connection starts on the redacted Player view, so nothing of the Game
    // shows until the reclaim is acknowledged.
    fire("state", viewForRole(initialState(), "player"));
    expect(screen.queryByRole("button", { name: /Open Lobby/ })).not.toBeInTheDocument();

    expect(identifyClaims()).toHaveLength(2);
    expect(identifyClaims()[1]).toMatchObject({ role: "host", passcode: "kia-ora" });
    answerLatestClaim("accepted");
    expect(passcodeField()).not.toBeInTheDocument();
  });
});
