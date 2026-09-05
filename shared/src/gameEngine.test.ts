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

function startedGame(): ReturnType<typeof initialState> {
  let state = initialState();
  state = applyAction(state, { type: "join", name: "Dana" });
  state = applyAction(state, { type: "join", name: "Marcus" });
  state = applyAction(state, { type: "startGame" });
  return state;
}

describe("gameEngine: selectTile", () => {
  it("selecting an unused tile makes it the active clue", () => {
    const state = applyAction(startedGame(), { type: "selectTile", categoryIndex: 0, tileIndex: 2 });

    expect(state.activeClue).toEqual({
      categoryIndex: 0,
      tileIndex: 2,
      revealed: false,
      buzzedPlayerId: null,
    });
  });

  it("rejects selecting an already-used tile", () => {
    let state = startedGame();
    state = {
      ...state,
      board: state.board.map((category, i) =>
        i === 0 ? { ...category, tiles: category.tiles.map((tile, j) => (j === 2 ? { ...tile, used: true } : tile)) } : category,
      ),
    };

    const next = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 2 });

    expect(next.activeClue).toBeNull();
  });

  it("rejects selecting a tile while another clue is already active", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    const next = applyAction(state, { type: "selectTile", categoryIndex: 1, tileIndex: 1 });

    expect(next.activeClue).toMatchObject({ categoryIndex: 0, tileIndex: 0 });
  });

  it("rejects selecting a tile before the game has started", () => {
    let state = initialState();
    state = applyAction(state, { type: "join", name: "Dana" });

    const next = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    expect(next.activeClue).toBeNull();
  });
});

describe("gameEngine: buzz", () => {
  it("rejects a buzz with no active clue", () => {
    const state = applyAction(startedGame(), { type: "buzz", playerId: "whoever" });

    expect(state.activeClue).toBeNull();
  });

  it("the first buzz the server receives wins, and locks out the rest", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    const [dana, marcus] = state.players;

    state = applyAction(state, { type: "buzz", playerId: dana.id });
    expect(state.activeClue?.buzzedPlayerId).toBe(dana.id);

    const next = applyAction(state, { type: "buzz", playerId: marcus.id });
    expect(next.activeClue?.buzzedPlayerId).toBe(dana.id);
  });

  it("rejects a buzz from an unknown player id", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    const next = applyAction(state, { type: "buzz", playerId: "not-a-real-player" });

    expect(next.activeClue?.buzzedPlayerId).toBeNull();
  });
});

describe("gameEngine: reveal", () => {
  it("rejects reveal before any buzz", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    const next = applyAction(state, { type: "reveal" });

    expect(next.activeClue?.revealed).toBe(false);
  });

  it("rejects reveal with no active clue", () => {
    const state = applyAction(startedGame(), { type: "reveal" });

    expect(state.activeClue).toBeNull();
  });

  it("reveals the answer once a player has buzzed", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "buzz", playerId: state.players[0].id });

    state = applyAction(state, { type: "reveal" });

    expect(state.activeClue?.revealed).toBe(true);
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
