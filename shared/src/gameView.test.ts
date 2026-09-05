import { describe, expect, it } from "vitest";
import { viewForRole } from "./gameView.js";
import type { ActiveClue, GameState } from "./types.js";

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
    ...overrides,
  };
}

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "playing",
    players: [],
    board: [],
    activeClue: activeClue(),
    ...overrides,
  };
}

describe("viewForRole", () => {
  it("returns the Host view unchanged, including the true Answer, before Reveal", () => {
    const input = state();

    const view = viewForRole(input, "host");

    expect(view).toBe(input);
    expect(view.activeClue?.answer).toBe("Vilnius");
  });

  it("still gives the Host the true Answer after Reveal", () => {
    const input = state({ activeClue: activeClue({ revealed: true }) });

    expect(viewForRole(input, "host").activeClue?.answer).toBe("Vilnius");
  });

  it("redacts the Answer from the Board view while the Clue is unrevealed", () => {
    const view = viewForRole(state(), "board");

    expect(view.activeClue?.answer).toBe("");
    expect(view.activeClue?.clueText).toBe("This Baltic capital sits on the Vilnia River");
  });

  it("redacts the Answer from the Player view while the Clue is unrevealed", () => {
    const view = viewForRole(state(), "player");

    expect(view.activeClue?.answer).toBe("");
  });

  it("gives the Board view the true Answer once the Clue is revealed", () => {
    const input = state({ activeClue: activeClue({ revealed: true }) });

    expect(viewForRole(input, "board").activeClue?.answer).toBe("Vilnius");
  });

  it("gives the Player view the true Answer once the Clue is revealed", () => {
    const input = state({ activeClue: activeClue({ revealed: true }) });

    expect(viewForRole(input, "player").activeClue?.answer).toBe("Vilnius");
  });

  it("leaves a Board/Player view untouched when there is no Active Clue", () => {
    const input = state({ activeClue: null });

    expect(viewForRole(input, "board")).toBe(input);
    expect(viewForRole(input, "player")).toBe(input);
  });

  it("does not mutate the input state when redacting", () => {
    const input = state();

    viewForRole(input, "player");

    expect(input.activeClue?.answer).toBe("Vilnius");
  });
});
