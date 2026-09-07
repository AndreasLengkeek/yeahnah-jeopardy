import { describe, expect, it } from "vitest";
import { viewForRole } from "./gameView.js";
import type { CategoryData } from "./trivia.js";
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
    isDailyDouble: false,
    clueShown: true,
    wageringPlayerId: null,
    wager: null,
    ...overrides,
  };
}

const content: CategoryData[] = [
  { name: "World Capitals", clues: [{ text: "This Baltic capital sits on the Vilnia River", answer: "Vilnius" }] },
];

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "playing",
    players: [],
    content,
    board: [],
    activeClue: activeClue(),
    boardSoundMuted: false,
    dailyDouble: { categoryIndex: 3, tileIndex: 4 },
    twoRounds: false,
    doubleJeopardyContent: null,
    ...overrides,
  };
}

describe("viewForRole", () => {
  it("gives the Host everything but the secret Daily Double coordinate, including content and the true Answer, before Reveal", () => {
    const input = state();

    const view = viewForRole(input, "host");

    expect(view.content).toBe(content);
    expect(view.activeClue?.answer).toBe("Vilnius");
    expect(view.players).toBe(input.players);
    expect(view.board).toBe(input.board);
  });

  it("still gives the Host the true Answer after Reveal", () => {
    const input = state({ activeClue: activeClue({ revealed: true }) });

    expect(viewForRole(input, "host").activeClue?.answer).toBe("Vilnius");
  });

  it("strips the authored content from the Board view", () => {
    expect(viewForRole(state(), "board").content).toEqual([]);
  });

  it("strips the authored content from the Player view", () => {
    expect(viewForRole(state(), "player").content).toEqual([]);
  });

  it("strips Double Jeopardy content from the Board/Player views", () => {
    const input = state({ twoRounds: true, doubleJeopardyContent: content });

    expect(viewForRole(input, "board").doubleJeopardyContent).toBeNull();
    expect(viewForRole(input, "player").doubleJeopardyContent).toBeNull();
  });

  it("redacts the Answer from the Board view while the Clue is unrevealed", () => {
    const view = viewForRole(state(), "board");

    expect(view.activeClue?.answer).toBe("");
    expect(view.activeClue?.clueText).toBe("This Baltic capital sits on the Vilnia River");
  });

  it("redacts the Answer from the Player view while the Clue is unrevealed", () => {
    expect(viewForRole(state(), "player").activeClue?.answer).toBe("");
  });

  it("gives the Board view the true Answer once the Clue is revealed", () => {
    const input = state({ activeClue: activeClue({ revealed: true }) });

    expect(viewForRole(input, "board").activeClue?.answer).toBe("Vilnius");
  });

  it("gives the Player view the true Answer once the Clue is revealed", () => {
    const input = state({ activeClue: activeClue({ revealed: true }) });

    expect(viewForRole(input, "player").activeClue?.answer).toBe("Vilnius");
  });

  it("still strips content for a Board/Player view when there is no Active Clue", () => {
    const input = state({ activeClue: null });

    const view = viewForRole(input, "board");
    expect(view.content).toEqual([]);
    expect(view.activeClue).toBeNull();
    expect(view.players).toBe(input.players);
    expect(view.board).toBe(input.board);
  });

  it("does not mutate the input state when redacting", () => {
    const input = state();

    viewForRole(input, "player");

    expect(input.content).toBe(content);
    expect(input.activeClue?.answer).toBe("Vilnius");
  });

  it("never exposes the secret Daily Double coordinate to the Host view", () => {
    expect(viewForRole(state(), "host").dailyDouble).toBeNull();
  });

  it("never exposes the secret Daily Double coordinate to the Board view", () => {
    expect(viewForRole(state(), "board").dailyDouble).toBeNull();
  });

  it("never exposes the secret Daily Double coordinate to the Player view", () => {
    expect(viewForRole(state(), "player").dailyDouble).toBeNull();
  });
});
