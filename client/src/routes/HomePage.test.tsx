import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CreateRoomResult, IdentifyResult } from "@yeahnah/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in socket that records listeners, so tests can play the server's part.
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

const emitted = (event: string) => fakeSocket.emit.mock.calls.filter(([name]) => name === event);

beforeEach(() => {
  fakeSocket.emit.mockReset();
  fakeSocket.listeners.clear();
  localStorage.clear();
});

describe("home page", () => {
  it("keeps Room creation tucked behind a quiet link until asked for", async () => {
    const user = userEvent.setup();
    renderAt("/");
    expect(screen.queryByLabelText("Room Passcode")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Hosting tonight\? Create a Room/ }));

    expect(screen.getByLabelText("Room Passcode")).toBeInTheDocument();
  });

  it("creates a Room with the Room Passcode and lands on its Host screen, holding its Host Key", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(screen.getByRole("button", { name: /Hosting tonight\?/ }));
    await user.type(screen.getByLabelText("Room Passcode"), "kia-ora");
    await user.click(screen.getByRole("button", { name: "Create" }));

    const [[, passcode, ack]] = emitted("createRoom");
    expect(passcode).toBe("kia-ora");
    act(() => (ack as (result: CreateRoomResult) => void)({ ok: true, code: "BRDK", hostKey: "key-brdk" }));

    // The Host screen for BRDK claims Host with the key it was just handed.
    expect(emitted("identify").at(-1)?.[1]).toEqual({ code: "BRDK", role: "host", hostKey: "key-brdk" });
  });

  it("says so when the Room Passcode is wrong, and stays put", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(screen.getByRole("button", { name: /Hosting tonight\?/ }));
    await user.type(screen.getByLabelText("Room Passcode"), "guess");
    await user.click(screen.getByRole("button", { name: "Create" }));
    const [[, , ack]] = emitted("createRoom");
    act(() => (ack as (result: CreateRoomResult) => void)({ ok: false, reason: "wrongPasscode" }));

    expect(screen.getByRole("alert")).toHaveTextContent("That isn't the Room Passcode.");
    expect(emitted("identify")).toEqual([]);
  });

  it("says the server is at capacity when every Room slot is taken, and stays put", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(screen.getByRole("button", { name: /Hosting tonight\?/ }));
    await user.type(screen.getByLabelText("Room Passcode"), "kia-ora");
    await user.click(screen.getByRole("button", { name: "Create" }));
    const [[, , ack]] = emitted("createRoom");
    act(() => (ack as (result: CreateRoomResult) => void)({ ok: false, reason: "atCapacity" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Every Room slot is taken right now — try again in a bit.");
    expect(emitted("identify")).toEqual([]);
  });

  it("joins the Room whose code is typed, in any case", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.type(screen.getByLabelText("Room Code"), "brdk");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(emitted("identify").at(-1)?.[1]).toEqual({ code: "BRDK", role: "player" });
  });

  it("takes letters only, upper case, at most four", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.type(screen.getByLabelText("Room Code"), "b r1dkx");

    expect(screen.getByLabelText("Room Code")).toHaveValue("BRDK");
  });

  it("says so when no Room has the typed code, back on Room Code entry", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.type(screen.getByLabelText("Room Code"), "zzzz");
    await user.click(screen.getByRole("button", { name: "Join" }));
    const [, claim, ack] = emitted("identify").at(-1)!;
    expect(claim).toEqual({ code: "ZZZZ", role: "player" });
    act(() => (ack as (result: IdentifyResult) => void)("noRoom"));

    expect(screen.getByRole("alert")).toHaveTextContent("No Room with that code");
    expect(screen.getByLabelText("Room Code")).toHaveValue("");
    expect(screen.queryByRole("button", { name: /Hosting tonight\?/ })).not.toBeInTheDocument();
  });
});

describe("Room Code entry (/join)", () => {
  it("goes to the typed Room's join page", async () => {
    const user = userEvent.setup();
    renderAt("/join");

    await user.type(screen.getByLabelText("Room Code"), "qztm");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(emitted("identify").at(-1)?.[1]).toEqual({ code: "QZTM", role: "player" });
  });
});

describe("routes", () => {
  it.each(["/host", "/board", "/no/such/page"])("sends %s to the home page", (path) => {
    renderAt(path);

    expect(screen.getByRole("button", { name: /Hosting tonight\? Create a Room/ })).toBeInTheDocument();
    expect(emitted("identify")).toEqual([]);
  });
});
