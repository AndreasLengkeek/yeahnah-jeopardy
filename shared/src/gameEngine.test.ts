import { describe, expect, it } from "vitest";
import {
  applyAction,
  canCloseClue,
  dailyDoubleWagerCeiling,
  initialState,
  isContentComplete,
  valuesForRound,
} from "./gameEngine.js";
import { CATS, DOUBLE_JEOPARDY_VALUES, VALUES } from "./trivia.js";
import type { PlayerIdentity } from "./types.js";

const textIdentity = (name: string): PlayerIdentity => ({ kind: "text", name });
const signatureIdentity = (image: string): PlayerIdentity => ({ kind: "signature", image });
const joinText = (name: string) => ({ type: "join" as const, identity: textIdentity(name) });
const joinSignature = (image: string) => ({ type: "join" as const, identity: signatureIdentity(image) });

// A stand-in for a real captured Signature — any non-blank string counts as drawn content.
const A_SIGNATURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// initialState() now starts in "setup". Most pre-Game tests want the Lobby that used
// to be the starting point, reached by accepting the seeded (complete) example Board.
function lobbyState(): ReturnType<typeof initialState> {
  return applyAction(initialState(), { type: "openLobby" });
}

describe("gameEngine: join", () => {
  it("accepts a valid join and adds the player at $0", () => {
    const state = applyAction(lobbyState(), joinText("Dana"));

    expect(state.players).toHaveLength(1);
    expect(state.players[0]).toMatchObject({ identity: textIdentity("Dana"), score: 0, connected: true });
    expect(state.players[0].id).toBeTruthy();
  });

  it("rejects a duplicate name in the lobby", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    state = applyAction(state, joinText("Dana"));

    expect(state.players).toHaveLength(1);
  });

  it("trims whitespace from a name and still catches duplicates", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("  Dana  "));
    expect(state.players[0].identity).toEqual(textIdentity("Dana"));

    state = applyAction(state, joinText("Dana"));
    expect(state.players).toHaveLength(1);
  });

  it("rejects a blank or whitespace-only name", () => {
    const state = applyAction(lobbyState(), joinText("   "));
    expect(state.players).toHaveLength(0);
  });

  it("rejects a join once the game has started", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    state = applyAction(state, joinText("Marcus"));
    state = applyAction(state, { type: "startGame" });

    state = applyAction(state, joinText("Priya"));

    expect(state.players).toHaveLength(2);
    expect(state.players.some((p) => p.identity.kind === "text" && p.identity.name === "Priya")).toBe(false);
  });

  it("accepts a signature identity, storing its image unchanged", () => {
    const state = applyAction(lobbyState(), joinSignature(A_SIGNATURE));

    expect(state.players).toHaveLength(1);
    expect(state.players[0]).toMatchObject({ identity: signatureIdentity(A_SIGNATURE), score: 0, connected: true });
  });

  it("rejects a signature identity captured from a blank canvas (no image data)", () => {
    const state = applyAction(initialState(), joinSignature(""));

    expect(state.players).toHaveLength(0);
  });

  it("lets a signature join succeed even when another Player already holds a pixel-identical image", () => {
    let state = lobbyState();
    state = applyAction(state, joinSignature(A_SIGNATURE));
    state = applyAction(state, joinSignature(A_SIGNATURE));

    expect(state.players).toHaveLength(2);
  });

  it("never blocks two Players from holding visually identical signatures", () => {
    let state = lobbyState();
    state = applyAction(state, joinSignature(A_SIGNATURE));
    state = applyAction(state, joinSignature(A_SIGNATURE));

    expect(state.players.map((p) => p.identity)).toEqual([
      signatureIdentity(A_SIGNATURE),
      signatureIdentity(A_SIGNATURE),
    ]);
  });

  it("does not check a signature identity against a matching typed name for uniqueness", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    state = applyAction(state, joinSignature(A_SIGNATURE));

    expect(state.players).toHaveLength(2);
  });
});

describe("gameEngine: startDoubleJeopardy", () => {
  it("is a no-op outside roundBreak", () => {
    const playing = startedTwoRoundGame();

    expect(applyAction(playing, { type: "startDoubleJeopardy" })).toBe(playing);
  });

  it("rebuilds the board from Double Jeopardy content at doubled Values and preserves players", () => {
    let state = roundBreakState();
    state = {
      ...state,
      players: state.players.map((player, index) =>
        index === 0 ? { ...player, score: 600, connected: false } : { ...player, score: -200 },
      ),
    };
    const playersBefore = state.players;

    const next = applyAction(state, { type: "startDoubleJeopardy" });

    expect(next.phase).toBe("playing");
    expect(next.round).toBe(2);
    expect(next.players).toEqual(playersBefore);
    expect(next.activeClue).toBeNull();
    expect(next.board.map((category) => category.name)).toEqual(
      next.doubleJeopardyContent!.map((category) => category.name),
    );
    next.board.forEach((category) => {
      expect(category.tiles.map((tile) => tile.value)).toEqual(DOUBLE_JEOPARDY_VALUES);
      expect(category.tiles.every((tile) => !tile.used)).toBe(true);
    });
  });

  it("uses Double Jeopardy clue content after the Round starts", () => {
    const state = applyAction(roundBreakState(), { type: "startDoubleJeopardy" });

    const next = applyAction(state, { type: "selectTile", categoryIndex: 1, tileIndex: 2 });

    expect(next.activeClue?.clueText).toBe("DJ clue 1-2");
    expect(next.activeClue?.answer).toBe("DJ answer 1-2");
  });
});

describe("gameEngine: editIdentity", () => {
  it("lets a joined Player change their name before the Game starts", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    const [dana] = state.players;

    state = applyAction(state, { type: "editIdentity", playerId: dana.id, identity: textIdentity("Danielle") });

    expect(state.players[0]).toMatchObject({ id: dana.id, identity: textIdentity("Danielle"), score: 0 });
  });

  it("lets a joined Player switch from a typed name to a drawn Signature", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    const [dana] = state.players;

    state = applyAction(state, { type: "editIdentity", playerId: dana.id, identity: signatureIdentity(A_SIGNATURE) });

    expect(state.players[0].identity).toEqual(signatureIdentity(A_SIGNATURE));
  });

  it("rejects an edit that collides with another Player's name", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    state = applyAction(state, joinText("Marcus"));
    const [dana] = state.players;

    const next = applyAction(state, { type: "editIdentity", playerId: dana.id, identity: textIdentity("Marcus") });

    expect(next).toBe(state);
  });

  it("does not reject an edit that collides only with the Player's own current name", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    const [dana] = state.players;

    const next = applyAction(state, { type: "editIdentity", playerId: dana.id, identity: textIdentity("Dana") });

    expect(next.players[0].identity).toEqual(textIdentity("Dana"));
  });

  it("rejects a blank edit", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    const [dana] = state.players;

    const next = applyAction(state, { type: "editIdentity", playerId: dana.id, identity: textIdentity("   ") });

    expect(next).toBe(state);
  });

  it("rejects an edit from an unknown Player id", () => {
    const state = applyAction(lobbyState(), joinText("Dana"));

    const next = applyAction(state, {
      type: "editIdentity",
      playerId: "not-a-real-player",
      identity: textIdentity("Whoever"),
    });

    expect(next).toBe(state);
  });

  it("rejects an edit once the Game has started", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    state = applyAction(state, joinText("Marcus"));
    state = applyAction(state, { type: "startGame" });
    const [dana] = state.players;

    const next = applyAction(state, { type: "editIdentity", playerId: dana.id, identity: textIdentity("Danielle") });

    expect(next).toBe(state);
  });
});

describe("gameEngine: reconnect", () => {
  it("reattaches a known Player id, preserving their score and connected state", () => {
    let state = startedGame();
    const [dana] = state.players;
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "buzz", playerId: dana.id });
    state = applyAction(state, { type: "judge", correct: true });
    const scoreBefore = state.players.find((p) => p.id === dana.id)?.score;

    const next = applyAction(state, { type: "reconnect", playerId: dana.id });

    expect(next.players.find((p) => p.id === dana.id)).toMatchObject({
      id: dana.id,
      score: scoreBefore,
      connected: true,
    });
  });

  it("rejects an unknown Player id", () => {
    const state = startedGame();

    const next = applyAction(state, { type: "reconnect", playerId: "not-a-real-player" });

    expect(next).toBe(state);
  });

  it("returns a signature identity unchanged on reconnect, the same way a typed name comes back", () => {
    let state = applyAction(lobbyState(), joinSignature(A_SIGNATURE));
    const [player] = state.players;

    const next = applyAction(state, { type: "reconnect", playerId: player.id });

    expect(next.players[0].identity).toEqual(signatureIdentity(A_SIGNATURE));
    expect(next.players[0].connected).toBe(true);
  });

  it("reattaches a Player to the same id after Play again, since the roster survives a reset", () => {
    let state = startedGame();
    const [dana] = state.players;
    state = applyAction(state, { type: "resetGame" });

    const next = applyAction(state, { type: "reconnect", playerId: dana.id });

    expect(next.players[0]).toMatchObject({ id: dana.id, identity: textIdentity("Dana"), score: 0, connected: true });
  });
});

describe("gameEngine: startGame", () => {
  it("rejects starting with fewer than 2 players", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));

    state = applyAction(state, { type: "startGame" });

    expect(state.phase).toBe("lobby");
  });

  it("starts the game once at least 2 players have joined", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    state = applyAction(state, joinText("Marcus"));

    state = applyAction(state, { type: "startGame" });

    expect(state.phase).toBe("playing");
  });
});

function startedGame(): ReturnType<typeof initialState> {
  let state = lobbyWithTwoPlayers();
  state = applyAction(state, { type: "startGame" });
  // Most tests below aren't about the Daily Double at all, and its coordinate is
  // random — neutralize it so selecting any Tile behaves like a normal Clue,
  // deterministically. Tests that actually need the real secret pick use
  // startedGameWithRealDailyDouble() instead.
  return { ...state, dailyDouble: null };
}

// Same as startedGame(), but keeps the genuine random Daily Double pick — for tests
// that specifically exercise Daily Double behavior.
function startedGameWithRealDailyDouble(): ReturnType<typeof initialState> {
  let state = lobbyWithTwoPlayers();
  state = applyAction(state, { type: "startGame" });
  return state;
}

function fillDoubleJeopardyContent(state: ReturnType<typeof initialState>): ReturnType<typeof initialState> {
  let next = state;
  for (let c = 0; c < next.content.length; c++) {
    next = applyAction(next, { type: "editDoubleJeopardyCategoryName", categoryIndex: c, name: `DJ Category ${c}` });
    for (let t = 0; t < 5; t++) {
      next = applyAction(next, {
        type: "editDoubleJeopardyClue",
        categoryIndex: c,
        tileIndex: t,
        field: "text",
        value: `DJ clue ${c}-${t}`,
      });
      next = applyAction(next, {
        type: "editDoubleJeopardyClue",
        categoryIndex: c,
        tileIndex: t,
        field: "answer",
        value: `DJ answer ${c}-${t}`,
      });
    }
  }
  return next;
}

function filledTwoRoundContent(categoryCount: number): ReturnType<typeof initialState> {
  return fillDoubleJeopardyContent(applyAction(filledContent(categoryCount), { type: "setTwoRounds", value: true }));
}

function startedTwoRoundGame(): ReturnType<typeof initialState> {
  let state = applyAction(filledTwoRoundContent(5), { type: "openLobby" });
  state = applyAction(state, joinText("Dana"));
  state = applyAction(state, joinText("Marcus"));
  state = applyAction(state, { type: "startGame" });
  return { ...state, dailyDouble: null };
}

function roundBreakState(): ReturnType<typeof initialState> {
  let state = startedTwoRoundGame();
  state = markAllUsedExcept(state, 4, 4);
  state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });
  return applyAction(state, { type: "closeClue" });
}

function lobbyWithTwoPlayers(): ReturnType<typeof initialState> {
  let state = lobbyState();
  state = applyAction(state, joinText("Dana"));
  state = applyAction(state, joinText("Marcus"));
  return state;
}

describe("gameEngine: selectTile", () => {
  it("selecting an unused tile makes it the active clue", () => {
    const state = applyAction(startedGame(), { type: "selectTile", categoryIndex: 0, tileIndex: 2 });

    expect(state.activeClue).toMatchObject({
      categoryIndex: 0,
      tileIndex: 2,
      clueText: CATS[0].clues[2].text,
      answer: CATS[0].clues[2].answer,
      revealed: false,
      buzzedPlayerId: null,
      excludedPlayerIds: [],
      correctPlayerId: null,
    });
    // Whether it lands on the secretly pre-picked Daily Double Tile is covered by its
    // own describe block below — this test only cares that the field is present.
    expect(typeof state.activeClue?.isDailyDouble).toBe("boolean");
  });

  it("stores the true Clue text and Answer from the authored content on the active clue", () => {
    const state = applyAction(startedGame(), { type: "selectTile", categoryIndex: 2, tileIndex: 3 });

    expect(state.activeClue?.clueText).toBe(CATS[2].clues[3].text);
    expect(state.activeClue?.answer).toBe(CATS[2].clues[3].answer);
  });

  it("rejects selecting an already-used tile", () => {
    let state = startedGame();
    state = {
      ...state,
      board: state.board.map((category, i) =>
        i === 0
          ? { ...category, tiles: category.tiles.map((tile, j) => (j === 2 ? { ...tile, used: true } : tile)) }
          : category,
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
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));

    const next = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    expect(next.activeClue).toBeNull();
  });
});

describe("gameEngine: Daily Double", () => {
  it("flags isDailyDouble true only when the secretly pre-picked Tile is the one selected, false for every other Tile", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex: ddCategory, tileIndex: ddTile } = base.dailyDouble!;

    let dailyDoubleHits = 0;
    for (let categoryIndex = 0; categoryIndex < base.board.length; categoryIndex++) {
      for (let tileIndex = 0; tileIndex < base.board[categoryIndex].tiles.length; tileIndex++) {
        const state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
        const expected = categoryIndex === ddCategory && tileIndex === ddTile;
        expect(state.activeClue?.isDailyDouble).toBe(expected);
        if (expected) dailyDoubleHits++;
      }
    }

    // Exactly one coordinate on the whole Board is the Daily Double.
    expect(dailyDoubleHits).toBe(1);
  });

  it("draws a fresh random coordinate every time the Lobby opens, never exposed on the resulting state itself as anything selectTile didn't already reveal", () => {
    const picks = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const state = lobbyState();
      picks.add(`${state.dailyDouble!.categoryIndex}-${state.dailyDouble!.tileIndex}`);
    }

    // 25 possible Tiles, 20 independent draws: astronomically unlikely to all collide
    // unless the pick genuinely varies from build to build.
    expect(picks.size).toBeGreaterThan(1);
  });

  it("draws a new coordinate on resetGame rather than reusing the one from the previous Board", () => {
    const originalRandom = Math.random;
    try {
      // Category 0 tile 0, then category 4 tile 4 (5 categories x 5 tiles seeded Board).
      Math.random = () => 0;
      let state = applyAction(initialState(), { type: "openLobby" });
      expect(state.dailyDouble).toEqual({ categoryIndex: 0, tileIndex: 0 });

      state = applyAction(state, joinText("Dana"));
      state = applyAction(state, joinText("Marcus"));
      state = applyAction(state, { type: "startGame" });

      Math.random = () => 0.999;
      state = applyAction(state, { type: "resetGame" });

      expect(state.dailyDouble).toEqual({ categoryIndex: 4, tileIndex: 4 });
    } finally {
      Math.random = originalRandom;
    }
  });

  it("selecting a normal Clue shows its text immediately (clueShown true)", () => {
    let state = startedGame(); // dailyDouble neutralized: every Tile behaves normally
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    expect(state.activeClue?.clueShown).toBe(true);
  });

  it("selecting the Daily Double Tile hides its Clue behind the cover screen (clueShown false)", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;

    const state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });

    expect(state.activeClue?.isDailyDouble).toBe(true);
    expect(state.activeClue?.clueShown).toBe(false);
  });

  it("showDailyDoubleClue reveals the Clue text once the Host triggers it", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    expect(state.activeClue?.clueShown).toBe(false);

    state = applyAction(state, { type: "showDailyDoubleClue" });

    expect(state.activeClue?.clueShown).toBe(true);
  });

  it("showDailyDoubleClue is a no-op with no active clue", () => {
    const state = applyAction(startedGame(), { type: "showDailyDoubleClue" });

    expect(state.activeClue).toBeNull();
  });

  it("showDailyDoubleClue is a no-op on a normal (non-Daily-Double) Clue", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    const next = applyAction(state, { type: "showDailyDoubleClue" });

    expect(next).toBe(state);
    expect(next.activeClue?.clueShown).toBe(true);
  });

  it("showDailyDoubleClue is a no-op once the Clue is already shown", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    state = applyAction(state, { type: "showDailyDoubleClue" });

    const next = applyAction(state, { type: "showDailyDoubleClue" });

    expect(next).toBe(state);
  });

  it("rejects a buzz on a Daily Double Clue both before and after the Host reveals it — buzzing is locked out for its entire lifetime", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    const [dana] = state.players;

    const blocked = applyAction(state, { type: "buzz", playerId: dana.id });
    expect(blocked.activeClue?.buzzedPlayerId).toBeNull();

    state = applyAction(state, { type: "showDailyDoubleClue" });
    const stillBlocked = applyAction(state, { type: "buzz", playerId: dana.id });

    expect(stillBlocked.activeClue?.buzzedPlayerId).toBeNull();
  });
});

describe("gameEngine: Double Jeopardy Daily Doubles", () => {
  it("draws two distinct coordinates when a two-Round Game's Lobby opens", () => {
    const state = applyAction(filledTwoRoundContent(5), { type: "openLobby" });

    const [first, second] = state.doubleJeopardyDailyDoubles!;
    expect(state.doubleJeopardyDailyDoubles).not.toBeNull();
    expect(first).not.toEqual(second);
  });

  it("never draws the same coordinate twice across many independent Lobby openings", () => {
    for (let i = 0; i < 25; i++) {
      const state = applyAction(filledTwoRoundContent(5), { type: "openLobby" });
      const [first, second] = state.doubleJeopardyDailyDoubles!;
      expect(first).not.toEqual(second);
    }
  });

  it("stays null for a single-Round Game", () => {
    const state = lobbyState();

    expect(state.doubleJeopardyDailyDoubles).toBeNull();
  });

  it("draws a new pair on resetGame rather than reusing the previous Board's", () => {
    let state = applyAction(filledTwoRoundContent(5), { type: "openLobby" });
    const first = state.doubleJeopardyDailyDoubles;
    state = applyAction(state, joinText("Dana"));
    state = applyAction(state, joinText("Marcus"));
    state = applyAction(state, { type: "startGame" });

    state = applyAction(state, { type: "resetGame" });

    expect(state.doubleJeopardyDailyDoubles).not.toBeNull();
    expect(state.doubleJeopardyDailyDoubles).not.toEqual(first);
  });

  it("selecting a Tile during Double Jeopardy checks the Double Jeopardy coordinate set, not Round 1's", () => {
    const state = applyAction(roundBreakState(), { type: "startDoubleJeopardy" });
    const [ddOne, ddTwo] = state.doubleJeopardyDailyDoubles!;

    const hitOne = applyAction(state, { type: "selectTile", categoryIndex: ddOne.categoryIndex, tileIndex: ddOne.tileIndex });
    const hitTwo = applyAction(state, { type: "selectTile", categoryIndex: ddTwo.categoryIndex, tileIndex: ddTwo.tileIndex });

    expect(hitOne.activeClue?.isDailyDouble).toBe(true);
    expect(hitTwo.activeClue?.isDailyDouble).toBe(true);
  });

  it("selecting a non-Daily-Double Tile during Double Jeopardy is never flagged as one", () => {
    const state = applyAction(roundBreakState(), { type: "startDoubleJeopardy" });
    const isDD = (categoryIndex: number, tileIndex: number) =>
      state.doubleJeopardyDailyDoubles!.some((dd) => dd.categoryIndex === categoryIndex && dd.tileIndex === tileIndex);

    let normalCategory = 0;
    let normalTile = 0;
    outer: for (let c = 0; c < state.board.length; c++) {
      for (let t = 0; t < state.board[c].tiles.length; t++) {
        if (!isDD(c, t)) {
          normalCategory = c;
          normalTile = t;
          break outer;
        }
      }
    }

    const next = applyAction(state, { type: "selectTile", categoryIndex: normalCategory, tileIndex: normalTile });

    expect(next.activeClue?.isDailyDouble).toBe(false);
  });

  it("Wager ceiling is $500 in Round 1 and $1000 in Double Jeopardy for an identical Player score", () => {
    expect(dailyDoubleWagerCeiling(1)).toBe(500);
    expect(dailyDoubleWagerCeiling(2)).toBe(1000);
  });

  it("Round 1's Wager ceiling stays $500 for a two-Round Game — never inflated just because Double Jeopardy exists", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    const [dana] = state.players;
    state = { ...state, players: state.players.map((p) => (p.id === dana.id ? { ...p, score: 0 } : p)) };
    state = applyAction(state, { type: "designateWagerer", playerId: dana.id });

    const accepted = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 500 });
    expect(accepted.activeClue?.wager).toBe(500);

    const rejected = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 1000 });
    expect(rejected.activeClue?.wager).toBeNull();
  });

  it("Double Jeopardy's Wager ceiling is $1000 for a Player at $0", () => {
    let state = applyAction(roundBreakState(), { type: "startDoubleJeopardy" });
    const [ddOne] = state.doubleJeopardyDailyDoubles!;
    state = applyAction(state, {
      type: "selectTile",
      categoryIndex: ddOne.categoryIndex,
      tileIndex: ddOne.tileIndex,
    });
    const [dana] = state.players;
    state = { ...state, players: state.players.map((p) => (p.id === dana.id ? { ...p, score: 0 } : p)) };
    state = applyAction(state, { type: "designateWagerer", playerId: dana.id });

    const accepted = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 1000 });
    expect(accepted.activeClue?.wager).toBe(1000);

    const rejected = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 1001 });
    expect(rejected.activeClue?.wager).toBeNull();
  });
});

describe("gameEngine: designateWagerer", () => {
  it("sets the wagering Player on a Daily Double Clue, regardless of connected status", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    const [dana] = state.players;
    state = { ...state, players: state.players.map((p) => (p.id === dana.id ? { ...p, connected: false } : p)) };

    state = applyAction(state, { type: "designateWagerer", playerId: dana.id });

    expect(state.activeClue?.wageringPlayerId).toBe(dana.id);
  });

  it("is a no-op with no active clue", () => {
    const state = applyAction(startedGame(), { type: "designateWagerer", playerId: "anyone" });

    expect(state.activeClue).toBeNull();
  });

  it("is a no-op on a normal (non-Daily-Double) Clue", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    const [dana] = state.players;

    const next = applyAction(state, { type: "designateWagerer", playerId: dana.id });

    expect(next).toBe(state);
    expect(next.activeClue?.wageringPlayerId).toBeNull();
  });

  it("is a no-op for a playerId that matches nobody in the roster", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    const state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });

    const next = applyAction(state, { type: "designateWagerer", playerId: "ghost" });

    expect(next).toBe(state);
  });

  it("supports redesignating a different Player before a Wager lands", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    const [dana, marcus] = state.players;
    state = applyAction(state, { type: "designateWagerer", playerId: dana.id });

    state = applyAction(state, { type: "designateWagerer", playerId: marcus.id });

    expect(state.activeClue?.wageringPlayerId).toBe(marcus.id);
  });

  it("is a no-op once a Wager already exists", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    const [dana, marcus] = state.players;
    state = applyAction(state, { type: "designateWagerer", playerId: dana.id });
    state = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 100 });

    const next = applyAction(state, { type: "designateWagerer", playerId: marcus.id });

    expect(next).toBe(state);
    expect(next.activeClue?.wageringPlayerId).toBe(dana.id);
  });
});

describe("gameEngine: submitWager", () => {
  function dailyDoubleWithDesignatedWagerer(scoreOverride?: number) {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    let [dana] = state.players;
    if (scoreOverride !== undefined) {
      state = { ...state, players: state.players.map((p) => (p.id === dana.id ? { ...p, score: scoreOverride } : p)) };
      [dana] = state.players;
    }
    state = applyAction(state, { type: "designateWagerer", playerId: dana.id });
    return { state, dana };
  }

  it("accepts the $5 minimum", () => {
    const { state, dana } = dailyDoubleWithDesignatedWagerer();

    const next = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 5 });

    expect(next.activeClue?.wager).toBe(5);
  });

  it("accepts the $500 ceiling for a Player at exactly $0", () => {
    const { state, dana } = dailyDoubleWithDesignatedWagerer(0);

    const next = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 500 });

    expect(next.activeClue?.wager).toBe(500);
  });

  it("accepts the $500 ceiling for a Player with a negative score", () => {
    const { state, dana } = dailyDoubleWithDesignatedWagerer(-200);

    const next = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 500 });

    expect(next.activeClue?.wager).toBe(500);
  });

  it("accepts the score-based ceiling for a Player above $500", () => {
    const { state, dana } = dailyDoubleWithDesignatedWagerer(1200);

    const next = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 1200 });

    expect(next.activeClue?.wager).toBe(1200);
  });

  it("rejects an amount below $5", () => {
    const { state, dana } = dailyDoubleWithDesignatedWagerer();

    const next = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 4 });

    expect(next).toBe(state);
    expect(next.activeClue?.wager).toBeNull();
  });

  it("rejects an amount above the computed max", () => {
    const { state, dana } = dailyDoubleWithDesignatedWagerer(200);

    const next = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 501 });

    expect(next).toBe(state);
    expect(next.activeClue?.wager).toBeNull();
  });

  it("rejects a submission from a non-designated Player", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    const [dana, marcus] = state.players;
    state = applyAction(state, { type: "designateWagerer", playerId: dana.id });

    const next = applyAction(state, { type: "submitWager", playerId: marcus.id, amount: 100 });

    expect(next).toBe(state);
    expect(next.activeClue?.wager).toBeNull();
  });

  it("rejects a submission when no Player has been designated yet", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    const state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    const [dana] = state.players;

    const next = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 100 });

    expect(next).toBe(state);
    expect(next.activeClue?.wager).toBeNull();
  });

  it("is a no-op once a Wager already exists — the amount stays unchanged even for the same Player", () => {
    const { state, dana } = dailyDoubleWithDesignatedWagerer();
    const first = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 100 });

    const second = applyAction(first, { type: "submitWager", playerId: dana.id, amount: 300 });

    expect(second).toBe(first);
    expect(second.activeClue?.wager).toBe(100);
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
    state = applyAction(state, { type: "judge", correct: false });

    const next = applyAction(state, { type: "buzz", playerId: dana.id });

    expect(next.activeClue?.buzzedPlayerId).toBeNull();
    // Marcus, who was not excluded, can still buzz.
    const afterMarcus = applyAction(state, { type: "buzz", playerId: marcus.id });
    expect(afterMarcus.activeClue?.buzzedPlayerId).toBe(marcus.id);
  });

  it("rejects a buzz once the clue has been revealed", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "reveal" });

    const next = applyAction(state, { type: "buzz", playerId: state.players[0].id });

    expect(next.activeClue?.buzzedPlayerId).toBeNull();
  });

  it("rejects a buzz once the clue has already been correctly answered", () => {
    const { state, marcusId } = buzzed();
    const afterCorrect = applyAction(state, { type: "judge", correct: true });

    const next = applyAction(afterCorrect, { type: "buzz", playerId: marcusId });

    expect(next.activeClue?.buzzedPlayerId).toBeNull();
  });

  it("is a no-op on a Daily Double Clue at any point in its lifetime — right after selection, before the wager, and after judging", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    const [dana, marcus] = state.players;

    const rightAfterSelection = applyAction(state, { type: "buzz", playerId: marcus.id });
    expect(rightAfterSelection.activeClue?.buzzedPlayerId).toBeNull();

    state = applyAction(state, { type: "showDailyDoubleClue" });
    const afterClueShown = applyAction(state, { type: "buzz", playerId: marcus.id });
    expect(afterClueShown.activeClue?.buzzedPlayerId).toBeNull();

    state = applyAction(state, { type: "designateWagerer", playerId: dana.id });
    const afterDesignation = applyAction(state, { type: "buzz", playerId: marcus.id });
    expect(afterDesignation.activeClue?.buzzedPlayerId).toBeNull();

    state = applyAction(state, { type: "submitWager", playerId: dana.id, amount: 100 });
    const afterWager = applyAction(state, { type: "buzz", playerId: marcus.id });
    expect(afterWager.activeClue?.buzzedPlayerId).toBeNull();

    state = applyAction(state, { type: "judge", correct: true });
    const afterJudge = applyAction(state, { type: "buzz", playerId: marcus.id });
    expect(afterJudge.activeClue?.buzzedPlayerId).toBeNull();
  });
});

describe("gameEngine: reveal", () => {
  it("rejects reveal with no active clue", () => {
    const state = applyAction(startedGame(), { type: "reveal" });

    expect(state.activeClue).toBeNull();
  });

  it("succeeds with no buzz and no prior exclusions", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    const next = applyAction(state, { type: "reveal" });

    expect(next.activeClue?.revealed).toBe(true);
  });

  it("succeeds after some (not all) Players have been excluded, with nobody currently buzzed", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "buzz", playerId: state.players[0].id });
    state = applyAction(state, { type: "judge", correct: false });

    const next = applyAction(state, { type: "reveal" });

    expect(next.activeClue?.revealed).toBe(true);
  });

  it("is rejected while a Player is buzzed in", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "buzz", playerId: state.players[0].id });

    const next = applyAction(state, { type: "reveal" });

    expect(next.activeClue?.revealed).toBe(false);
  });

  it("is rejected once already revealed", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "reveal" });

    const next = applyAction(state, { type: "reveal" });

    expect(next).toBe(state);
  });
});

function buzzed(): { state: ReturnType<typeof initialState>; danaId: string; marcusId: string } {
  let state = startedGame();
  const [dana, marcus] = state.players;
  state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
  state = applyAction(state, { type: "buzz", playerId: dana.id });
  return { state, danaId: dana.id, marcusId: marcus.id };
}

describe("gameEngine: judge", () => {
  it("awards the Clue's Value immediately, reveals the Answer, and leaves the Clue Active, pending an explicit Close, on a correct answer", () => {
    const { state, danaId } = buzzed();
    const value = state.board[0].tiles[0].value;
    expect(state.activeClue?.revealed).toBe(false);

    const next = applyAction(state, { type: "judge", correct: true });

    expect(next.players.find((p) => p.id === danaId)?.score).toBe(value);
    expect(next.board[0].tiles[0].used).toBe(false);
    expect(next.activeClue).toMatchObject({
      categoryIndex: 0,
      tileIndex: 0,
      revealed: true,
      buzzedPlayerId: null,
      excludedPlayerIds: [],
      correctPlayerId: danaId,
    });
  });

  it("deducts the Clue's Value, excludes the Player, and reopens the Clue on an incorrect answer, immediately after a buzz with no reveal", () => {
    const { state, danaId } = buzzed();
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
      correctPlayerId: null,
    });
  });

  it("rejects judge with no active clue", () => {
    const state = startedGame();

    const next = applyAction(state, { type: "judge", correct: true });

    expect(next).toBe(state);
  });

  it("rejects judge before anyone has buzzed", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    const next = applyAction(state, { type: "judge", correct: true });

    expect(next).toBe(state);
  });

  it("rejects a second judge once the Clue has already been correctly answered", () => {
    const { state } = buzzed();
    const afterCorrect = applyAction(state, { type: "judge", correct: true });

    const next = applyAction(afterCorrect, { type: "judge", correct: false });

    expect(next).toBe(afterCorrect);
  });
});

function dailyDoubleWithWager(amount = 100): {
  state: ReturnType<typeof initialState>;
  danaId: string;
  marcusId: string;
} {
  const base = startedGameWithRealDailyDouble();
  const { categoryIndex, tileIndex } = base.dailyDouble!;
  let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
  const [dana, marcus] = state.players;
  state = applyAction(state, { type: "designateWagerer", playerId: dana.id });
  state = applyAction(state, { type: "submitWager", playerId: dana.id, amount });
  return { state, danaId: dana.id, marcusId: marcus.id };
}

describe("gameEngine: judge on a Daily Double", () => {
  it("adds the submitted Wager, not the Tile's Value, to the wagering Player's score, and sets revealed true", () => {
    const { state, danaId } = dailyDoubleWithWager(350);
    const value = state.board[state.activeClue!.categoryIndex].tiles[state.activeClue!.tileIndex].value;
    expect(value).not.toBe(350);

    const next = applyAction(state, { type: "judge", correct: true });

    expect(next.players.find((p) => p.id === danaId)?.score).toBe(350);
    expect(next.activeClue?.revealed).toBe(true);
    expect(next.activeClue?.correctPlayerId).toBe(danaId);
  });

  it("subtracts the submitted Wager on an incorrect judgment, and — diverging from a normal wrong Buzz — still sets revealed true", () => {
    const { state, danaId } = dailyDoubleWithWager(350);

    const next = applyAction(state, { type: "judge", correct: false });

    expect(next.players.find((p) => p.id === danaId)?.score).toBe(-350);
    expect(next.activeClue?.revealed).toBe(true);
    expect(next.activeClue?.correctPlayerId).toBeNull();
  });

  it("is blocked (no-op) until a Wager has actually been submitted", () => {
    const base = startedGameWithRealDailyDouble();
    const { categoryIndex, tileIndex } = base.dailyDouble!;
    let state = applyAction(base, { type: "selectTile", categoryIndex, tileIndex });
    const [dana] = state.players;
    state = applyAction(state, { type: "designateWagerer", playerId: dana.id });

    const next = applyAction(state, { type: "judge", correct: true });

    expect(next).toBe(state);
    expect(next.players.find((p) => p.id === dana.id)?.score).toBe(0);
  });

  it("is immediately closable after either outcome, with no dependency on excludedPlayerIds", () => {
    const { state: correctState } = dailyDoubleWithWager(200);
    const afterCorrect = applyAction(correctState, { type: "judge", correct: true });
    expect(canCloseClue(afterCorrect.activeClue!, afterCorrect.players)).toBe(true);

    const { state: incorrectState } = dailyDoubleWithWager(200);
    const afterIncorrect = applyAction(incorrectState, { type: "judge", correct: false });
    expect(canCloseClue(afterIncorrect.activeClue!, afterIncorrect.players)).toBe(true);

    const closed = applyAction(afterIncorrect, { type: "closeClue" });
    expect(closed.activeClue).toBeNull();
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
    let state = startedGame();
    const [dana, marcus] = state.players;
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "buzz", playerId: dana.id });
    state = applyAction(state, { type: "judge", correct: false });
    state = applyAction(state, { type: "buzz", playerId: marcus.id });
    state = applyAction(state, { type: "judge", correct: false });
    const scoresBefore = state.players.map((p) => p.score);

    const next = applyAction(state, { type: "closeClue" });

    expect(next.activeClue).toBeNull();
    expect(next.board[0].tiles[0].used).toBe(true);
    expect(next.players.map((p) => p.score)).toEqual(scoresBefore);
  });

  it("succeeds immediately once revealed is true, even with only one of several eligible Players excluded", () => {
    const { state: afterBuzz } = buzzed();
    let state = applyAction(afterBuzz, { type: "judge", correct: false });
    state = applyAction(state, { type: "reveal" });
    const scoresBefore = state.players.map((p) => p.score);

    const next = applyAction(state, { type: "closeClue" });

    expect(next.activeClue).toBeNull();
    expect(next.board[0].tiles[0].used).toBe(true);
    expect(next.players.map((p) => p.score)).toEqual(scoresBefore);
  });

  it("closes the Clue immediately after a correct judge, with no additional score change beyond the award already made at judge time", () => {
    const { state: afterBuzz, danaId } = buzzed();
    const state = applyAction(afterBuzz, { type: "judge", correct: true });
    const value = state.board[0].tiles[0].value;

    const next = applyAction(state, { type: "closeClue" });

    expect(next.activeClue).toBeNull();
    expect(next.board[0].tiles[0].used).toBe(true);
    expect(next.players.find((p) => p.id === danaId)?.score).toBe(value);
  });

  it("closes the Clue after a correct judge that followed an earlier Player's exclusion, already revealed", () => {
    let state = startedGame();
    const [dana, marcus] = state.players;
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "buzz", playerId: dana.id });
    state = applyAction(state, { type: "judge", correct: false });
    state = applyAction(state, { type: "buzz", playerId: marcus.id });
    state = applyAction(state, { type: "judge", correct: true });
    expect(state.activeClue?.revealed).toBe(true);
    expect(state.activeClue?.excludedPlayerIds).toEqual([dana.id]);

    const next = applyAction(state, { type: "closeClue" });

    expect(next.activeClue).toBeNull();
    expect(next.board[0].tiles[0].used).toBe(true);
  });

  it("treats an explicit reveal as a no-op once a correct judge has already revealed the Clue", () => {
    let state = startedGame();
    const [dana, marcus] = state.players;
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "buzz", playerId: dana.id });
    state = applyAction(state, { type: "judge", correct: false });
    state = applyAction(state, { type: "buzz", playerId: marcus.id });
    state = applyAction(state, { type: "judge", correct: true });

    const next = applyAction(state, { type: "reveal" });

    expect(next).toBe(state);
  });

  it("rejects closeClue while a Player is buzzed in", () => {
    let state = startedGame();
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    state = applyAction(state, { type: "buzz", playerId: state.players[0].id });

    const next = applyAction(state, { type: "closeClue" });

    expect(next).toBe(state);
  });

  it("rejects closeClue while some but not all Players have been excluded", () => {
    const { state } = buzzed();
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
function markAllUsedExcept(
  state: ReturnType<typeof initialState>,
  categoryIndex: number,
  tileIndex: number,
): ReturnType<typeof initialState> {
  return {
    ...state,
    board: state.board.map((category, i) => ({
      ...category,
      tiles: category.tiles.map((tile, j) => (i === categoryIndex && j === tileIndex ? tile : { ...tile, used: true })),
    })),
  };
}

describe("gameEngine: game over", () => {
  it("transitions to roundBreak when Round 1's last Tile closes in a two-Round Game", () => {
    const next = roundBreakState();

    expect(next.phase).toBe("roundBreak");
    expect(next.round).toBe(1);
    expect(next.board.every((category) => category.tiles.every((tile) => tile.used))).toBe(true);
  });

  it("stays in playing immediately after a correct judge, then transitions to gameOver once that Clue is closed", () => {
    let state = startedGame();
    state = markAllUsedExcept(state, 4, 4);
    state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });
    state = applyAction(state, { type: "buzz", playerId: state.players[0].id });

    const afterJudge = applyAction(state, { type: "judge", correct: true });
    expect(afterJudge.phase).toBe("playing");
    expect(afterJudge.board[4].tiles[4].used).toBe(false);

    const next = applyAction(afterJudge, { type: "closeClue" });

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

  it("transitions to gameOver when closeClue reached via reveal-with-no-buzz marks the 25th and final Tile used", () => {
    let state = startedGame();
    state = markAllUsedExcept(state, 4, 4);
    state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });
    state = applyAction(state, { type: "reveal" });

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
        i === 0
          ? { ...category, tiles: category.tiles.map((tile, j) => (j === 0 ? { ...tile, used: false } : tile)) }
          : category,
      ),
    };
    state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });

    const next = applyAction(state, { type: "closeClue" });

    expect(next.phase).toBe("playing");
  });

  it("transitions to gameOver when Double Jeopardy's last Tile closes", () => {
    let state = applyAction(roundBreakState(), { type: "startDoubleJeopardy" });
    state = markAllUsedExcept(state, 4, 4);
    state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });

    const next = applyAction(state, { type: "closeClue" });

    expect(next.phase).toBe("gameOver");
    expect(next.round).toBe(2);
  });
});

describe("gameEngine: setScore", () => {
  it("replaces the target Player's score with the given value verbatim", () => {
    const { state, danaId } = buzzed();

    const next = applyAction(state, { type: "setScore", playerId: danaId, score: 1234 });

    expect(next.players.find((p) => p.id === danaId)?.score).toBe(1234);
  });

  it("accepts a negative value with no clamping", () => {
    const { state, danaId } = buzzed();

    const next = applyAction(state, { type: "setScore", playerId: danaId, score: -600 });

    expect(next.players.find((p) => p.id === danaId)?.score).toBe(-600);
  });

  it("no-ops for a playerId that matches nobody in the roster", () => {
    const state = startedGame();

    const next = applyAction(state, { type: "setScore", playerId: "not-a-real-player", score: 500 });

    expect(next).toBe(state);
  });

  it("leaves activeClue untouched when applied mid-Clue with a Player buzzed in", () => {
    const { state, danaId, marcusId } = buzzed();
    const withExclusion = applyAction(state, { type: "judge", correct: false });
    const reBuzzed = applyAction(withExclusion, { type: "buzz", playerId: marcusId });
    const clueBefore = reBuzzed.activeClue;

    const next = applyAction(reBuzzed, { type: "setScore", playerId: danaId, score: 999 });

    expect(next.activeClue).toEqual(clueBefore);
    expect(next.activeClue).toMatchObject({
      buzzedPlayerId: marcusId,
      excludedPlayerIds: [danaId],
      correctPlayerId: null,
      revealed: false,
    });
  });

  it("applies the same way in the gameOver phase as in playing", () => {
    let state = startedGame();
    const [dana] = state.players;
    state = markAllUsedExcept(state, 4, 4);
    state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });
    state = applyAction(state, { type: "closeClue" });
    expect(state.phase).toBe("gameOver");

    const next = applyAction(state, { type: "setScore", playerId: dana.id, score: 4200 });

    expect(next.phase).toBe("gameOver");
    expect(next.players.find((p) => p.id === dana.id)?.score).toBe(4200);
  });
});

describe("gameEngine: resetGame", () => {
  it("resets from the lobby phase to a fresh lobby, keeping the roster", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));
    const playersBefore = state.players;

    const next = applyAction(state, { type: "resetGame" });

    expect(next.phase).toBe("lobby");
    expect(next.players).toEqual(playersBefore);
    expect(next.activeClue).toBeNull();
    expect(next.board.every((category) => category.tiles.every((tile) => !tile.used))).toBe(true);
  });

  it("resets from the playing phase to a fresh lobby, keeping every Player at $0", () => {
    let state = startedGame();
    const [dana, marcus] = state.players;
    state = applyAction(state, { type: "setScore", playerId: dana.id, score: 600 });
    state = applyAction(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });

    const next = applyAction(state, { type: "resetGame" });

    expect(next.phase).toBe("lobby");
    expect(next.players).toEqual([
      { ...dana, score: 0 },
      { ...marcus, score: 0 },
    ]);
    expect(next.activeClue).toBeNull();
  });

  it("Play again after Game Over keeps every Player joined, in order, at $0", () => {
    let state = finishedGame();
    const [dana, marcus] = state.players;
    state = applyAction(state, { type: "setScore", playerId: dana.id, score: 1800 });
    state = applyAction(state, { type: "setScore", playerId: marcus.id, score: -400 });

    const next = applyAction(state, { type: "resetGame" });

    expect(next.phase).toBe("lobby");
    expect(next.players).toEqual([
      { ...dana, score: 0 },
      { ...marcus, score: 0 },
    ]);
  });

  it("a new Player can still join the fresh Lobby after Play again", () => {
    let state = applyAction(finishedGame(), { type: "resetGame" });

    state = applyAction(state, joinText("Priya"));

    expect(state.players.map((p) => p.identity)).toEqual([
      textIdentity("Dana"),
      textIdentity("Marcus"),
      textIdentity("Priya"),
    ]);
    expect(state.players[2].score).toBe(0);
  });

  it("is a no-op during Board Setup, so it can't skip the openLobby completeness gate", () => {
    const setup = applyAction(initialState(), { type: "newBoard", categoryCount: 3 });

    const next = applyAction(setup, { type: "resetGame" });

    expect(next).toBe(setup);
    expect(next.phase).toBe("setup");
  });

  it("resets from the round break to round 1's lobby, keeping every Player at $0", () => {
    let state = roundBreakState();
    const [dana, marcus] = state.players;
    state = applyAction(state, { type: "setScore", playerId: marcus.id, score: 2000 });

    const next = applyAction(state, { type: "resetGame" });

    expect(next.phase).toBe("lobby");
    expect(next.round).toBe(1);
    expect(next.players).toEqual([
      { ...dana, score: 0 },
      { ...marcus, score: 0 },
    ]);
  });

  it("resets a finished two-Round Game back to round 1's lobby, rebuilding Round 1's board fresh", () => {
    const state = finishedTwoRoundGame();
    expect(state.phase).toBe("gameOver");
    expect(state.round).toBe(2);
    const contentBefore = state.content;
    const doubleJeopardyContentBefore = state.doubleJeopardyContent;

    const next = applyAction(state, { type: "resetGame" });

    expect(next.phase).toBe("lobby");
    expect(next.round).toBe(1);
    expect(next.content).toEqual(contentBefore);
    expect(next.board.map((c) => c.name)).toEqual(contentBefore.map((c) => c.name));
    expect(next.board.every((c) => c.tiles.every((tile) => !tile.used))).toBe(true);
    expect(next.players.map((p) => p.score)).toEqual([0, 0]);
    // Double Jeopardy's board itself is only rebuilt when startDoubleJeopardy next
    // runs — resetGame leaves its authored content untouched and doesn't derive a
    // board from it.
    expect(next.doubleJeopardyContent).toEqual(doubleJeopardyContentBefore);
    next.board.forEach((category) => {
      expect(category.tiles.map((tile) => tile.value)).toEqual(valuesForRound(1));
    });
  });

  it("draws fresh Daily Double coordinates on resetGame for both Round 1 and Double Jeopardy, varying across repeated resets of the same finished two-Round Game", () => {
    const state = finishedTwoRoundGame();

    const round1CoordinatesSeen = new Set<string>();
    const doubleJeopardyCoordinatesSeen = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const next = applyAction(state, { type: "resetGame" });
      expect(next.dailyDouble).not.toBeNull();
      expect(next.doubleJeopardyDailyDoubles).not.toBeNull();
      const [first, second] = next.doubleJeopardyDailyDoubles!;
      expect(first).not.toEqual(second);
      round1CoordinatesSeen.add(JSON.stringify(next.dailyDouble));
      doubleJeopardyCoordinatesSeen.add(JSON.stringify(next.doubleJeopardyDailyDoubles));
    }

    // Not every one of 25 draws is guaranteed distinct, but a real random redraw
    // should produce more than a single repeated coordinate/pair across all of them.
    expect(round1CoordinatesSeen.size).toBeGreaterThan(1);
    expect(doubleJeopardyCoordinatesSeen.size).toBeGreaterThan(1);
  });
});

describe.each([
  { actionType: "toggleBoardMusic" as const, flag: "boardMusicMuted" as const, other: "boardEffectsMuted" as const },
  { actionType: "toggleBoardEffects" as const, flag: "boardEffectsMuted" as const, other: "boardMusicMuted" as const },
])("gameEngine: $actionType", ({ actionType, flag, other }) => {
  it.each(["setup", "lobby", "playing", "roundBreak", "gameOver"] as const)(`flips ${flag} from the %s phase`, (phase) => {
    const states = {
      setup: initialState(),
      lobby: lobbyState(),
      playing: startedGame(),
      roundBreak: roundBreakState(),
      gameOver: finishedGame(),
    };
    const before = states[phase];

    const muted = applyAction(before, { type: actionType });
    const unmuted = applyAction(muted, { type: actionType });

    expect(muted[flag]).toBe(true);
    expect(unmuted[flag]).toBe(false);
  });

  it(`leaves ${other} untouched`, () => {
    const muted = applyAction(initialState(), { type: actionType });

    expect(muted[other]).toBe(false);
  });

  it.each([
    { actionName: "openLobby", before: initialState(), action: { type: "openLobby" as const } },
    { actionName: "startGame", before: lobbyWithTwoPlayers(), action: { type: "startGame" as const } },
    { actionName: "returnToSetup", before: finishedGame(), action: { type: "returnToSetup" as const } },
    { actionName: "resetGame", before: startedGame(), action: { type: "resetGame" as const } },
  ])("persists through $actionName", ({ before, action }) => {
    const muted = applyAction(before, { type: actionType });

    const next = applyAction(muted, action);

    expect(next[flag]).toBe(true);
  });
});

describe("gameEngine: initialState", () => {
  it("starts in the setup phase with no board yet", () => {
    const state = initialState();

    expect(state.phase).toBe("setup");
    expect(state.board).toEqual([]);
    expect(state.players).toEqual([]);
    expect(state.activeClue).toBeNull();
    expect(state.boardMusicMuted).toBe(false);
    expect(state.boardEffectsMuted).toBe(false);
    expect(state.dailyDouble).toBeNull();
    expect(state.doubleJeopardyDailyDoubles).toBeNull();
    expect(state.round).toBe(1);
  });

  it("seeds content from the ported CATS fixture (5 categories, 5 clues each)", () => {
    const { content } = initialState();

    expect(content).toHaveLength(5);
    content.forEach((category, i) => {
      expect(category.name).toBe(CATS[i].name);
      expect(category.clues).toHaveLength(5);
      category.clues.forEach((clue, j) => {
        expect(clue.text).toBe(CATS[i].clues[j].text);
        expect(clue.answer).toBe(CATS[i].clues[j].answer);
      });
    });
  });

  it("seeds content as a deep copy that editing does not write back to the fixture", () => {
    let state = initialState();
    state = applyAction(state, { type: "editCategoryName", categoryIndex: 0, name: "Changed" });

    expect(state.content[0].name).toBe("Changed");
    expect(CATS[0].name).not.toBe("Changed");
  });

  it("builds 5 columns of 5 unused Value tiles from the seeded content when the Lobby opens", () => {
    const state = lobbyState();

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

  it("picks a Daily Double coordinate within the Board's bounds when the Lobby opens", () => {
    const state = lobbyState();

    expect(state.dailyDouble).not.toBeNull();
    expect(state.dailyDouble!.categoryIndex).toBeGreaterThanOrEqual(0);
    expect(state.dailyDouble!.categoryIndex).toBeLessThan(state.board.length);
    expect(state.dailyDouble!.tileIndex).toBeGreaterThanOrEqual(0);
    expect(state.dailyDouble!.tileIndex).toBeLessThan(state.board[state.dailyDouble!.categoryIndex].tiles.length);
  });

  it("routes Value lists through valuesForRound for both Rounds", () => {
    expect(valuesForRound(1)).toEqual(VALUES);
    expect(valuesForRound(2)).toEqual(DOUBLE_JEOPARDY_VALUES);
  });
});

// A complete authored Board of `categoryCount` categories, filled with placeholder
// text so isContentComplete passes and the Lobby can open.
function filledContent(categoryCount: number) {
  let state = applyAction(initialState(), { type: "newBoard", categoryCount });
  for (let c = 0; c < categoryCount; c++) {
    state = applyAction(state, { type: "editCategoryName", categoryIndex: c, name: `Category ${c}` });
    for (let t = 0; t < 5; t++) {
      state = applyAction(state, {
        type: "editClue",
        categoryIndex: c,
        tileIndex: t,
        field: "text",
        value: `Clue ${c}-${t}`,
      });
      state = applyAction(state, {
        type: "editClue",
        categoryIndex: c,
        tileIndex: t,
        field: "answer",
        value: `Answer ${c}-${t}`,
      });
    }
  }
  return state;
}

function finishedGame(): ReturnType<typeof initialState> {
  let state = startedGame();
  state = markAllUsedExcept(state, 4, 4);
  state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });
  return applyAction(state, { type: "closeClue" });
}

// Plays a two-Round Game all the way through Double Jeopardy to gameOver, so
// resetGame/returnToSetup can be exercised against the "furthest along" state a
// two-Round Game reaches.
function finishedTwoRoundGame(): ReturnType<typeof initialState> {
  let state = applyAction(roundBreakState(), { type: "startDoubleJeopardy" });
  state = markAllUsedExcept(state, 4, 4);
  state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });
  return applyAction(state, { type: "closeClue" });
}

describe("gameEngine: Board Setup", () => {
  describe("newBoard", () => {
    it.each([3, 4, 5, 6])("replaces content with a blank board of %i categories, 5 blank clues each", (count) => {
      const state = applyAction(initialState(), { type: "newBoard", categoryCount: count });

      expect(state.content).toHaveLength(count);
      state.content.forEach((category) => {
        expect(category.name).toBe("");
        expect(category.clues).toHaveLength(5);
        category.clues.forEach((clue) => {
          expect(clue).toEqual({ text: "", answer: "" });
        });
      });
    });

    it.each([2, 7, 0, -1, 3.5])("rejects a category count of %s, leaving content unchanged", (count) => {
      const before = initialState();
      const after = applyAction(before, { type: "newBoard", categoryCount: count });

      expect(after).toBe(before);
    });

    it("is a no-op outside the setup phase", () => {
      const lobby = lobbyState();
      const next = applyAction(lobby, { type: "newBoard", categoryCount: 3 });

      expect(next).toBe(lobby);
      expect(next.content).toHaveLength(5);
    });

    it("reseeds doubleJeopardyContent blank at the new category count when twoRounds is on, keeping the two panels' counts in sync", () => {
      const withTwoRounds = applyAction(filledContent(4), { type: "setTwoRounds", value: true });

      const resized = applyAction(withTwoRounds, { type: "newBoard", categoryCount: 6 });

      expect(resized.content).toHaveLength(6);
      expect(resized.doubleJeopardyContent).toHaveLength(6);
    });

    it("leaves doubleJeopardyContent untouched (still null) when twoRounds is off", () => {
      const state = applyAction(filledContent(4), { type: "newBoard", categoryCount: 6 });

      expect(state.doubleJeopardyContent).toBeNull();
    });
  });

  describe("editCategoryName / editClue", () => {
    it("updates a category name in place", () => {
      const state = applyAction(initialState(), { type: "editCategoryName", categoryIndex: 1, name: "My Category" });

      expect(state.content[1].name).toBe("My Category");
      expect(state.content[0].name).toBe(CATS[0].name);
    });

    it("updates a clue's text and answer independently", () => {
      let state = applyAction(initialState(), {
        type: "editClue",
        categoryIndex: 0,
        tileIndex: 2,
        field: "text",
        value: "New clue text",
      });
      state = applyAction(state, {
        type: "editClue",
        categoryIndex: 0,
        tileIndex: 2,
        field: "answer",
        value: "New answer",
      });

      expect(state.content[0].clues[2]).toEqual({ text: "New clue text", answer: "New answer" });
      expect(state.content[0].clues[1]).toEqual(CATS[0].clues[1]);
    });

    it("ignores an out-of-range category or tile index", () => {
      const before = initialState();

      expect(applyAction(before, { type: "editCategoryName", categoryIndex: 9, name: "x" })).toBe(before);
      expect(applyAction(before, { type: "editClue", categoryIndex: 0, tileIndex: 9, field: "text", value: "x" })).toBe(
        before,
      );
    });

    it("is a no-op outside the setup phase", () => {
      const lobby = lobbyState();

      expect(applyAction(lobby, { type: "editCategoryName", categoryIndex: 0, name: "x" })).toBe(lobby);
      expect(applyAction(lobby, { type: "editClue", categoryIndex: 0, tileIndex: 0, field: "text", value: "x" })).toBe(
        lobby,
      );
    });
  });

  describe("openLobby", () => {
    it("is rejected while any field is still blank", () => {
      let state = applyAction(initialState(), { type: "newBoard", categoryCount: 3 });
      state = applyAction(state, { type: "editCategoryName", categoryIndex: 0, name: "Only one name" });

      const next = applyAction(state, { type: "openLobby" });

      expect(next).toBe(state);
      expect(next.phase).toBe("setup");
    });

    it("transitions to the Lobby and builds the board once every field is filled", () => {
      const state = applyAction(filledContent(4), { type: "openLobby" });

      expect(state.phase).toBe("lobby");
      expect(state.board).toHaveLength(4);
      state.board.forEach((category, i) => {
        expect(category.name).toBe(`Category ${i}`);
        expect(category.tiles.map((tile) => tile.value)).toEqual(VALUES);
        expect(category.tiles.every((tile) => !tile.used)).toBe(true);
      });
    });

    it("accepts the seeded example board as-is", () => {
      expect(applyAction(initialState(), { type: "openLobby" }).phase).toBe("lobby");
    });

    it("is a no-op outside the setup phase", () => {
      const lobby = lobbyState();
      expect(applyAction(lobby, { type: "openLobby" })).toBe(lobby);
    });

    it("is blocked when twoRounds is true and doubleJeopardyContent is incomplete, even if Round 1's content is complete", () => {
      const state = applyAction(filledContent(4), { type: "setTwoRounds", value: true });

      const next = applyAction(state, { type: "openLobby" });

      expect(next).toBe(state);
      expect(next.phase).toBe("setup");
    });

    it("succeeds once both Round 1's and Double Jeopardy's content are complete", () => {
      const state = filledTwoRoundContent(4);

      const next = applyAction(state, { type: "openLobby" });

      expect(next.phase).toBe("lobby");
      expect(next.round).toBe(1);
    });
  });

  describe("importBoardConfig", () => {
    it("replaces content wholesale with the imported payload", () => {
      const imported = filledContent(4).content;

      const state = applyAction(initialState(), { type: "importBoardConfig", content: imported });

      expect(state.content).toEqual(imported);
    });

    it("accepts a payload with blank fields, surfaced later via isContentComplete rather than a separate error", () => {
      const withBlanks = applyAction(initialState(), { type: "newBoard", categoryCount: 3 }).content;

      const state = applyAction(initialState(), { type: "importBoardConfig", content: withBlanks });

      expect(state.content).toEqual(withBlanks);
      expect(isContentComplete(state.content)).toBe(false);
    });

    it("is a no-op outside the setup phase", () => {
      const lobby = lobbyState();
      const imported = filledContent(4).content;

      expect(applyAction(lobby, { type: "importBoardConfig", content: imported })).toBe(lobby);
    });

    it("reseeds doubleJeopardyContent blank at the imported category count when twoRounds is on", () => {
      const withTwoRounds = applyAction(filledContent(4), { type: "setTwoRounds", value: true });
      const imported = filledContent(6).content;

      const state = applyAction(withTwoRounds, { type: "importBoardConfig", content: imported });

      expect(state.content).toHaveLength(6);
      expect(state.doubleJeopardyContent).toHaveLength(6);
    });

    it("leaves doubleJeopardyContent untouched (still null) when twoRounds is off", () => {
      const imported = filledContent(6).content;

      const state = applyAction(filledContent(4), { type: "importBoardConfig", content: imported });

      expect(state.doubleJeopardyContent).toBeNull();
    });
  });

  describe("setTwoRounds", () => {
    it("turning on seeds doubleJeopardyContent blank at Round 1's current category count", () => {
      const state = applyAction(filledContent(5), { type: "setTwoRounds", value: true });

      expect(state.twoRounds).toBe(true);
      expect(state.doubleJeopardyContent).toHaveLength(5);
      state.doubleJeopardyContent!.forEach((category) => {
        expect(category.name).toBe("");
        expect(category.clues).toHaveLength(5);
        category.clues.forEach((clue) => expect(clue).toEqual({ text: "", answer: "" }));
      });
    });

    it("turning off clears doubleJeopardyContent back to null", () => {
      const on = applyAction(filledContent(4), { type: "setTwoRounds", value: true });
      const withEdit = applyAction(on, {
        type: "editDoubleJeopardyCategoryName",
        categoryIndex: 0,
        name: "Some name",
      });

      const off = applyAction(withEdit, { type: "setTwoRounds", value: false });

      expect(off.twoRounds).toBe(false);
      expect(off.doubleJeopardyContent).toBeNull();
    });

    it("toggling back on after off starts the panel blank again, not preserving prior edits", () => {
      let state = applyAction(filledContent(3), { type: "setTwoRounds", value: true });
      state = applyAction(state, { type: "editDoubleJeopardyCategoryName", categoryIndex: 0, name: "Old" });
      state = applyAction(state, { type: "setTwoRounds", value: false });

      state = applyAction(state, { type: "setTwoRounds", value: true });

      expect(state.doubleJeopardyContent![0].name).toBe("");
    });

    it("is a no-op outside the setup phase", () => {
      const lobby = lobbyState();

      expect(applyAction(lobby, { type: "setTwoRounds", value: true })).toBe(lobby);
    });
  });

  describe("editDoubleJeopardyCategoryName / editDoubleJeopardyClue", () => {
    it("updates a Double Jeopardy category name in place, leaving content untouched", () => {
      const on = applyAction(filledContent(4), { type: "setTwoRounds", value: true });

      const state = applyAction(on, {
        type: "editDoubleJeopardyCategoryName",
        categoryIndex: 1,
        name: "Double Jeopardy Category",
      });

      expect(state.doubleJeopardyContent![1].name).toBe("Double Jeopardy Category");
      expect(state.content[1].name).toBe("Category 1");
    });

    it("updates a Double Jeopardy clue's text and answer independently", () => {
      const on = applyAction(filledContent(4), { type: "setTwoRounds", value: true });

      let state = applyAction(on, {
        type: "editDoubleJeopardyClue",
        categoryIndex: 0,
        tileIndex: 2,
        field: "text",
        value: "DJ clue text",
      });
      state = applyAction(state, {
        type: "editDoubleJeopardyClue",
        categoryIndex: 0,
        tileIndex: 2,
        field: "answer",
        value: "DJ answer",
      });

      expect(state.doubleJeopardyContent![0].clues[2]).toEqual({ text: "DJ clue text", answer: "DJ answer" });
    });

    it("is a no-op whenever doubleJeopardyContent is null (twoRounds is false)", () => {
      const before = filledContent(4);

      expect(
        applyAction(before, { type: "editDoubleJeopardyCategoryName", categoryIndex: 0, name: "x" }),
      ).toBe(before);
      expect(
        applyAction(before, {
          type: "editDoubleJeopardyClue",
          categoryIndex: 0,
          tileIndex: 0,
          field: "text",
          value: "x",
        }),
      ).toBe(before);
    });

    it("is a no-op outside the setup phase", () => {
      const lobby = lobbyState();

      expect(applyAction(lobby, { type: "editDoubleJeopardyCategoryName", categoryIndex: 0, name: "x" })).toBe(
        lobby,
      );
      expect(
        applyAction(lobby, {
          type: "editDoubleJeopardyClue",
          categoryIndex: 0,
          tileIndex: 0,
          field: "text",
          value: "x",
        }),
      ).toBe(lobby);
    });
  });

  describe("returnToSetup", () => {
    it("returns from the lobby to setup without dropping the roster or authored content", () => {
      let state = lobbyState();
      state = applyAction(state, joinText("Dana"));
      state = applyAction(state, joinText("Marcus"));
      const playersBefore = state.players;
      const contentBefore = state.content;

      const next = applyAction(state, { type: "returnToSetup" });

      expect(next.phase).toBe("setup");
      expect(next.players).toEqual(playersBefore);
      expect(next.content).toEqual(contentBefore);
      expect(next.board).toEqual([]);
      expect(next.activeClue).toBeNull();
    });

    it("re-enables board authoring actions after returning from the lobby", () => {
      let state = lobbyState();
      state = applyAction(state, joinText("Dana"));

      const backInSetup = applyAction(state, { type: "returnToSetup" });
      const resized = applyAction(backInSetup, { type: "newBoard", categoryCount: 6 });
      const renamed = applyAction(resized, { type: "editCategoryName", categoryIndex: 5, name: "Final category" });

      expect(backInSetup.phase).toBe("setup");
      expect(resized.content).toHaveLength(6);
      expect(renamed.content[5].name).toBe("Final category");
    });

    it("returns from gameOver to setup with content still pre-loaded, keeping every Player joined at $0", () => {
      let state = finishedGame();
      const [dana, marcus] = state.players;
      state = applyAction(state, { type: "setScore", playerId: dana.id, score: 1200 });
      const contentBefore = state.content;

      const next = applyAction(state, { type: "returnToSetup" });

      expect(next.phase).toBe("setup");
      expect(next.content).toEqual(contentBefore);
      expect(next.players).toEqual([
        { ...dana, score: 0 },
        { ...marcus, score: 0 },
      ]);
      expect(next.board).toEqual([]);
      expect(next.activeClue).toBeNull();
    });

    it("preserves doubleJeopardyContent and twoRounds across the round trip from a finished two-Round Game", () => {
      const state = finishedTwoRoundGame();
      expect(state.twoRounds).toBe(true);
      const doubleJeopardyContentBefore = state.doubleJeopardyContent;

      const next = applyAction(state, { type: "returnToSetup" });

      expect(next.phase).toBe("setup");
      expect(next.twoRounds).toBe(true);
      expect(next.doubleJeopardyContent).toEqual(doubleJeopardyContentBefore);
      expect(next.board).toEqual([]);
      expect(next.activeClue).toBeNull();
      expect(next.dailyDouble).toBeNull();
      expect(next.doubleJeopardyDailyDoubles).toBeNull();
      expect(next.round).toBe(1);
    });

    it("still allows editing Double Jeopardy's content after returning to setup from a two-Round Game", () => {
      const state = finishedTwoRoundGame();

      const backInSetup = applyAction(state, { type: "returnToSetup" });
      const renamed = applyAction(backInSetup, {
        type: "editDoubleJeopardyCategoryName",
        categoryIndex: 0,
        name: "Edited after reset",
      });

      expect(renamed.doubleJeopardyContent![0].name).toBe("Edited after reset");
    });

    it.each(["setup", "playing"] as const)("is a no-op from the %s phase", (_phase) => {
      const states = { setup: initialState(), playing: startedGame() };
      const before = states[_phase];

      expect(applyAction(before, { type: "returnToSetup" })).toBe(before);
    });
  });

  describe("resetGame", () => {
    it("after gameOver drops to the Lobby, reusing content unchanged with a fresh board", () => {
      let state = startedGame();
      state = markAllUsedExcept(state, 4, 4);
      state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });
      state = applyAction(state, { type: "closeClue" });
      expect(state.phase).toBe("gameOver");
      const contentBefore = state.content;

      const next = applyAction(state, { type: "resetGame" });

      expect(next.phase).toBe("lobby");
      expect(next.content).toEqual(contentBefore);
      expect(next.board.map((c) => c.name)).toEqual(contentBefore.map((c) => c.name));
      expect(next.board.every((c) => c.tiles.every((tile) => !tile.used))).toBe(true);
      expect(next.players.map((p) => p.score)).toEqual([0, 0]);
      expect(next.activeClue).toBeNull();
    });
  });
});

describe("isContentComplete", () => {
  it("is false when any category name or clue field is blank or whitespace", () => {
    expect(isContentComplete(applyAction(initialState(), { type: "newBoard", categoryCount: 3 }).content)).toBe(false);

    let state = applyAction(initialState(), { type: "editCategoryName", categoryIndex: 0, name: "   " });
    expect(isContentComplete(state.content)).toBe(false);

    state = applyAction(initialState(), {
      type: "editClue",
      categoryIndex: 0,
      tileIndex: 0,
      field: "answer",
      value: "",
    });
    expect(isContentComplete(state.content)).toBe(false);
  });

  it("is true for the seeded example board", () => {
    expect(isContentComplete(initialState().content)).toBe(true);
  });
});
