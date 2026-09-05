import { describe, expect, it } from "vitest";
import { applyAction, initialState } from "./gameEngine.js";
import { CATS, VALUES } from "./trivia.js";

describe("gameEngine: join", () => {
  it("accepts a valid join and adds the player at $0", () => {
    const state = applyAction(initialState(), { type: "join", name: "Dana" });

    expect(state.players).toHaveLength(1);
    expect(state.players[0]).toMatchObject({ name: "Dana", score: 0, connected: true });
    expect(state.players[0].id).toBeTruthy();
  });

  it("rejects a duplicate name in the lobby", () => {
    let state = initialState();
    state = applyAction(state, { type: "join", name: "Dana" });
    state = applyAction(state, { type: "join", name: "Dana" });

    expect(state.players).toHaveLength(1);
  });

  it("trims whitespace from a name and still catches duplicates", () => {
    let state = initialState();
    state = applyAction(state, { type: "join", name: "  Dana  " });
    expect(state.players[0].name).toBe("Dana");

    state = applyAction(state, { type: "join", name: "Dana" });
    expect(state.players).toHaveLength(1);
  });

  it("rejects a blank or whitespace-only name", () => {
    const state = applyAction(initialState(), { type: "join", name: "   " });
    expect(state.players).toHaveLength(0);
  });

  it("rejects a join once the game has started", () => {
    let state = initialState();
    state = applyAction(state, { type: "join", name: "Dana" });
    state = applyAction(state, { type: "join", name: "Marcus" });
    state = applyAction(state, { type: "startGame" });

    state = applyAction(state, { type: "join", name: "Priya" });

    expect(state.players).toHaveLength(2);
    expect(state.players.some((p) => p.name === "Priya")).toBe(false);
  });
});

describe("gameEngine: startGame", () => {
  it("rejects starting with fewer than 2 players", () => {
    let state = initialState();
    state = applyAction(state, { type: "join", name: "Dana" });

    state = applyAction(state, { type: "startGame" });

    expect(state.phase).toBe("lobby");
  });

  it("starts the game once at least 2 players have joined", () => {
    let state = initialState();
    state = applyAction(state, { type: "join", name: "Dana" });
    state = applyAction(state, { type: "join", name: "Marcus" });

    state = applyAction(state, { type: "startGame" });

    expect(state.phase).toBe("playing");
  });
});

describe("gameEngine: initialState board", () => {
  it("has 5 categories of 5 unused tiles matching the ported CATS/VALUES data", () => {
    const state = initialState();

    expect(state.board).toHaveLength(5);
    state.board.forEach((category, i) => {
      expect(category.name).toBe(CATS[i].name);
      expect(category.tiles).toHaveLength(5);
      category.tiles.forEach((tile, j) => {
        expect(tile.value).toBe(VALUES[j]);
        expect(tile.used).toBe(false);
      });
    });
  });
});
