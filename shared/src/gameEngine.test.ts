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
      excludedPlayerIds: [],
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

  it("rejects a buzz from a player excluded on the current clue", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    const [dana, marcus] = state.players;
    state = applyAction(state, { type: "buzz", playerId: dana.id });
    state = applyAction(state, { type: "reveal" });
    state = applyAction(state, { type: "judge", correct: false });

    const next = applyAction(state, { type: "buzz", playerId: dana.id });

    expect(next.activeClue?.buzzedPlayerId).toBeNull();
    // Marcus, who was not excluded, can still buzz.
    const afterMarcus = applyAction(state, { type: "buzz", playerId: marcus.id });
    expect(afterMarcus.activeClue?.buzzedPlayerId).toBe(marcus.id);
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

function buzzedAndRevealed(): { state: ReturnType<typeof initialState>; danaId: string; marcusId: string } {
  let state = startedGame();
  const [dana, marcus] = state.players;
  state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
  state = applyAction(state, { type: "buzz", playerId: dana.id });
  state = applyAction(state, { type: "reveal" });
  return { state, danaId: dana.id, marcusId: marcus.id };
}

describe("gameEngine: judge", () => {
  it("awards the Clue's Value, marks the Tile used, and clears the Active Clue on a correct answer", () => {
    const { state, danaId } = buzzedAndRevealed();
    const value = state.board[0].tiles[0].value;

    const next = applyAction(state, { type: "judge", correct: true });

    expect(next.players.find((p) => p.id === danaId)?.score).toBe(value);
    expect(next.board[0].tiles[0].used).toBe(true);
    expect(next.activeClue).toBeNull();
  });

  it("deducts the Clue's Value, excludes the Player, and reopens the Clue on an incorrect answer", () => {
    const { state, danaId } = buzzedAndRevealed();
    const value = state.board[0].tiles[0].value;

    const next = applyAction(state, { type: "judge", correct: false });

    expect(next.players.find((p) => p.id === danaId)?.score).toBe(-value);
    expect(next.board[0].tiles[0].used).toBe(false);
    expect(next.activeClue).toMatchObject({
      categoryIndex: 0,
      tileIndex: 0,
      revealed: false,
      buzzedPlayerId: null,
      excludedPlayerIds: [danaId],
    });
  });

  it("rejects judge with no active clue", () => {
    const state = startedGame();

    const next = applyAction(state, { type: "judge", correct: true });

    expect(next).toBe(state);
  });

  it("rejects judge before the Answer is revealed", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "buzz", playerId: state.players[0].id });

    const next = applyAction(state, { type: "judge", correct: true });

    expect(next).toBe(state);
  });

  it("rejects judge before anyone has buzzed", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    const next = applyAction(state, { type: "judge", correct: true });

    expect(next).toBe(state);
  });
});

describe("gameEngine: closeClue", () => {
  it("closes the Clue with no score change when nobody has buzzed at all", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    const scoresBefore = state.players.map((p) => p.score);

    const next = applyAction(state, { type: "closeClue" });

    expect(next.activeClue).toBeNull();
    expect(next.board[0].tiles[0].used).toBe(true);
    expect(next.players.map((p) => p.score)).toEqual(scoresBefore);
  });

  it("closes the Clue with no score change once every joined Player has been excluded", () => {
    const { state: afterDana, danaId, marcusId } = buzzedAndRevealed();
    let state = applyAction(afterDana, { type: "judge", correct: false });
    state = applyAction(state, { type: "buzz", playerId: marcusId });
    state = applyAction(state, { type: "reveal" });
    state = applyAction(state, { type: "judge", correct: false });
    const scoresBefore = state.players.map((p) => p.score);

    const next = applyAction(state, { type: "closeClue" });

    expect(next.activeClue).toBeNull();
    expect(next.board[0].tiles[0].used).toBe(true);
    expect(next.players.map((p) => p.score)).toEqual(scoresBefore);
    expect(danaId).toBeTruthy();
  });

  it("rejects closeClue while a Player is buzzed in", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "buzz", playerId: state.players[0].id });

    const next = applyAction(state, { type: "closeClue" });

    expect(next).toBe(state);
  });

  it("rejects closeClue while some but not all Players have been excluded", () => {
    const { state } = buzzedAndRevealed();
    const afterIncorrect = applyAction(state, { type: "judge", correct: false });

    const next = applyAction(afterIncorrect, { type: "closeClue" });

    expect(next).toBe(afterIncorrect);
  });

  it("rejects closeClue with no active clue", () => {
    const state = startedGame();

    const next = applyAction(state, { type: "closeClue" });

    expect(next).toBe(state);
  });
});

// Marks every Tile used except the one at (categoryIndex, tileIndex), so a single
// remaining action (judge or closeClue) can be the one that completes the Board.
function markAllUsedExcept(state: ReturnType<typeof initialState>, categoryIndex: number, tileIndex: number): ReturnType<typeof initialState> {
  return {
    ...state,
    board: state.board.map((category, i) => ({
      ...category,
      tiles: category.tiles.map((tile, j) => (i === categoryIndex && j === tileIndex ? tile : { ...tile, used: true })),
    })),
  };
}

describe("gameEngine: game over", () => {
  it("transitions to gameOver when a correct judge marks the 25th and final Tile used", () => {
    let state = startedGame();
    state = markAllUsedExcept(state, 4, 4);
    state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });
    state = applyAction(state, { type: "buzz", playerId: state.players[0].id });
    state = applyAction(state, { type: "reveal" });

    const next = applyAction(state, { type: "judge", correct: true });

    expect(next.phase).toBe("gameOver");
    expect(next.board.every((category) => category.tiles.every((tile) => tile.used))).toBe(true);
  });

  it("transitions to gameOver when closeClue marks the 25th and final Tile used", () => {
    let state = startedGame();
    state = markAllUsedExcept(state, 4, 4);
    state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });

    const next = applyAction(state, { type: "closeClue" });

    expect(next.phase).toBe("gameOver");
  });

  it("stays in playing when a Tile is resolved but Tiles remain unused", () => {
    let state = startedGame();
    state = markAllUsedExcept(state, 4, 4);
    // Leave one other Tile unused too, so resolving (4,4) does not complete the Board.
    state = {
      ...state,
      board: state.board.map((category, i) =>
        i === 0 ? { ...category, tiles: category.tiles.map((tile, j) => (j === 0 ? { ...tile, used: false } : tile)) } : category,
      ),
    };
    state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });

    const next = applyAction(state, { type: "closeClue" });

    expect(next.phase).toBe("playing");
  });
});

describe("gameEngine: resetGame", () => {
  it("resets from the lobby phase to a fresh, empty-roster lobby", () => {
    let state = initialState();
    state = applyAction(state, { type: "join", name: "Dana" });

    const next = applyAction(state, { type: "resetGame" });

    expect(next.phase).toBe("lobby");
    expect(next.players).toEqual([]);
    expect(next.activeClue).toBeNull();
    expect(next.board.every((category) => category.tiles.every((tile) => !tile.used))).toBe(true);
  });

  it("resets from the playing phase to a fresh, empty-roster lobby", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    const next = applyAction(state, { type: "resetGame" });

    expect(next.phase).toBe("lobby");
    expect(next.players).toEqual([]);
    expect(next.activeClue).toBeNull();
  });

  it("resets from the gameOver phase to a fresh, empty-roster lobby", () => {
    let state = startedGame();
    state = markAllUsedExcept(state, 4, 4);
    state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });
    state = applyAction(state, { type: "closeClue" });
    expect(state.phase).toBe("gameOver");

    const next = applyAction(state, { type: "resetGame" });

    expect(next.phase).toBe("lobby");
    expect(next.players).toEqual([]);
  });

  it("a Player who rejoins after a reset starts at $0", () => {
    let state = startedGame();
    state = applyAction(state, { type: "resetGame" });

    state = applyAction(state, { type: "join", name: "Dana" });

    expect(state.players[0]).toMatchObject({ name: "Dana", score: 0 });
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
