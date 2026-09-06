import { describe, expect, it } from "vitest";
import { applyAction, initialState, isContentComplete } from "./gameEngine.js";
import { CATS, VALUES } from "./trivia.js";
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

  it("rejects a reconnect once the roster has been cleared by a reset", () => {
    let state = startedGame();
    const [dana] = state.players;
    state = applyAction(state, { type: "resetGame" });

    const next = applyAction(state, { type: "reconnect", playerId: dana.id });

    expect(next).toBe(state);
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
  return state;
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

    expect(state.activeClue).toEqual({
      categoryIndex: 0,
      tileIndex: 2,
      clueText: CATS[0].clues[2].text,
      answer: CATS[0].clues[2].answer,
      revealed: false,
      buzzedPlayerId: null,
      excludedPlayerIds: [],
      correctPlayerId: null,
    });
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
  it("resets from the lobby phase to a fresh, empty-roster lobby", () => {
    let state = lobbyState();
    state = applyAction(state, joinText("Dana"));

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

  it("is a no-op during Board Setup, so it can't skip the openLobby completeness gate", () => {
    const setup = applyAction(initialState(), { type: "newBoard", categoryCount: 3 });

    const next = applyAction(setup, { type: "resetGame" });

    expect(next).toBe(setup);
    expect(next.phase).toBe("setup");
  });

  it("a Player who rejoins after a reset starts at $0", () => {
    let state = startedGame();
    state = applyAction(state, { type: "resetGame" });

    state = applyAction(state, joinText("Dana"));

    expect(state.players[0]).toMatchObject({ identity: textIdentity("Dana"), score: 0 });
  });
});

describe("gameEngine: toggleBoardSound", () => {
  it.each(["setup", "lobby", "playing", "gameOver"] as const)("flips boardSoundMuted from the %s phase", (phase) => {
    const states = {
      setup: initialState(),
      lobby: lobbyState(),
      playing: startedGame(),
      gameOver: finishedGame(),
    };
    const before = states[phase];

    const muted = applyAction(before, { type: "toggleBoardSound" });
    const unmuted = applyAction(muted, { type: "toggleBoardSound" });

    expect(muted.boardSoundMuted).toBe(true);
    expect(unmuted.boardSoundMuted).toBe(false);
  });

  it.each([
    { actionName: "openLobby", before: initialState(), action: { type: "openLobby" as const } },
    { actionName: "startGame", before: lobbyWithTwoPlayers(), action: { type: "startGame" as const } },
    { actionName: "returnToSetup", before: finishedGame(), action: { type: "returnToSetup" as const } },
    { actionName: "resetGame", before: startedGame(), action: { type: "resetGame" as const } },
  ])("persists through $actionName", ({ before, action }) => {
    const muted = applyAction(before, { type: "toggleBoardSound" });

    const next = applyAction(muted, action);

    expect(next.boardSoundMuted).toBe(true);
  });
});

describe("gameEngine: initialState", () => {
  it("starts in the setup phase with no board yet", () => {
    const state = initialState();

    expect(state.phase).toBe("setup");
    expect(state.board).toEqual([]);
    expect(state.players).toEqual([]);
    expect(state.activeClue).toBeNull();
    expect(state.boardSoundMuted).toBe(false);
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
  });

  describe("returnToSetup", () => {
    it("returns from gameOver to setup with content still pre-loaded", () => {
      let state = startedGame();
      state = markAllUsedExcept(state, 4, 4);
      state = applyAction(state, { type: "selectTile", categoryIndex: 4, tileIndex: 4 });
      state = applyAction(state, { type: "closeClue" });
      expect(state.phase).toBe("gameOver");
      const contentBefore = state.content;

      const next = applyAction(state, { type: "returnToSetup" });

      expect(next.phase).toBe("setup");
      expect(next.content).toEqual(contentBefore);
      expect(next.players).toEqual([]);
      expect(next.board).toEqual([]);
      expect(next.activeClue).toBeNull();
    });

    it.each(["setup", "lobby", "playing"] as const)("is a no-op from the %s phase", (_phase) => {
      const states = { setup: initialState(), lobby: lobbyState(), playing: startedGame() };
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
      expect(next.players).toEqual([]);
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
