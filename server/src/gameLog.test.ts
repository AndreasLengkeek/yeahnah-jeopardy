import { applyAction, initialState } from "@yeahnah/shared";
import type { GameAction, GameState, PlayerIdentity } from "@yeahnah/shared";
import { describe, expect, it } from "vitest";
import { describeGameEvent } from "./gameLog.js";

const SIGNATURE_IMAGE = "data:image/png;base64,iVBORw0KGgo=";
const text = (name: string): PlayerIdentity => ({ kind: "text", name });
const signature: PlayerIdentity = { kind: "signature", image: SIGNATURE_IMAGE };

// Applies an action through the engine and returns both the log line
// and the resulting state, so a test can chain events off real engine output.
function step(state: GameState, action: GameAction): { line: string | null; next: GameState } {
  const next = applyAction(state, action);
  return { line: describeGameEvent(state, action, next), next };
}

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce((current, action) => applyAction(current, action), state);
}

const lobby = () => run(initialState(), { type: "openLobby" });

// A Lobby with Sam and Alex joined, then started, with no Daily Doubles to dodge.
function playing(): GameState {
  const state = run(lobby(), { type: "join", identity: text("Sam") }, { type: "join", identity: text("Alex") });
  return { ...run(state, { type: "startGame" }), dailyDouble: null };
}

const idOf = (state: GameState, name: string) =>
  state.players.find((player) => player.identity.kind === "text" && player.identity.name === name)!.id;

// Every Answer and Clue text on the seeded Board — used to prove no
// line ever leaks Clue content.
const clueContent = (state: GameState) =>
  state.content.flatMap((category) => category.clues.flatMap((c) => [c.text, c.answer]));

describe("describeGameEvent", () => {
  it("logs a typed-name Player joining, with the new roster size", () => {
    const first = step(lobby(), { type: "join", identity: text("Dana") });
    const { line } = step(first.next, { type: "join", identity: text("Sam") });
    expect(line).toBe('[game] Player "Sam" joined (2 players)');
  });

  it("uses singular wording for the first Player", () => {
    const { line } = step(lobby(), { type: "join", identity: text("Sam") });
    expect(line).toBe('[game] Player "Sam" joined (1 player)');
  });

  it("refers to a Signature Player by a short form of their id, never the image", () => {
    const { line, next } = step(lobby(), { type: "join", identity: signature });
    const id = next.players[0].id;
    expect(line).toBe(`[game] Player ${id.slice(0, 6)} joined (1 player)`);
    expect(line).not.toContain(SIGNATURE_IMAGE);
  });

  it("logs the Game starting", () => {
    const state = run(lobby(), { type: "join", identity: text("Sam") }, { type: "join", identity: text("Alex") });
    expect(step(state, { type: "startGame" }).line).toBe("[game] Game started (2 players)");
  });

  it("logs Double Jeopardy starting in the same style", () => {
    const state: GameState = {
      ...playing(),
      phase: "roundBreak",
      twoRounds: true,
      doubleJeopardyContent: lobby().content,
    };
    expect(step(state, { type: "startDoubleJeopardy" }).line).toBe("[game] Double Jeopardy started (2 players)");
  });

  it("logs a Clue pick by Category and Value only", () => {
    const state = playing();
    const { line } = step(state, { type: "selectTile", categoryIndex: 1, tileIndex: 3 });
    const category = state.board[1];
    expect(line).toBe(`[game] Clue picked: ${category.name} for $${category.tiles[3].value}`);
    for (const content of clueContent(state)) expect(line).not.toContain(content);
  });

  it("logs a Buzz", () => {
    const state = run(playing(), { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    expect(step(state, { type: "buzz", playerId: idOf(state, "Sam") }).line).toBe('[game] "Sam" buzzed in');
  });

  it("logs a Signature Player's Buzz by short id", () => {
    let state = run(lobby(), { type: "join", identity: signature }, { type: "join", identity: text("Alex") });
    state = { ...run(state, { type: "startGame" }), dailyDouble: null };
    state = run(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    const id = state.players[0].id;
    expect(step(state, { type: "buzz", playerId: id }).line).toBe(`[game] Player ${id.slice(0, 6)} buzzed in`);
  });

  describe("judging", () => {
    function buzzedOn(tileIndex: number, score: number): GameState {
      let state = playing();
      const sam = idOf(state, "Sam");
      state = run(
        state,
        { type: "setScore", playerId: sam, score },
        { type: "selectTile", categoryIndex: 0, tileIndex },
        { type: "buzz", playerId: sam },
      );
      return state;
    }

    it("logs a correct judgement with the score delta and new score, never the Answer", () => {
      const state = buzzedOn(3, 800);
      const { line } = step(state, { type: "judge", correct: true });
      expect(line).toBe('[game] "Sam" judged correct (+$400, now $1200)');
      expect(line).not.toContain(state.activeClue!.answer);
    });

    it("logs an incorrect judgement with the score delta and new score", () => {
      const state = buzzedOn(3, 800);
      expect(step(state, { type: "judge", correct: false }).line).toBe(
        '[game] "Sam" judged incorrect (-$400, now $400)',
      );
    });

    it("writes a negative score with the sign before the dollar sign", () => {
      const state = buzzedOn(1, 0);
      expect(step(state, { type: "judge", correct: false }).line).toBe(
        '[game] "Sam" judged incorrect (-$200, now -$200)',
      );
    });

    it("uses the Wager as the delta on a Daily Double", () => {
      let state = playing();
      const sam = idOf(state, "Sam");
      state = run(
        { ...state, dailyDouble: { categoryIndex: 0, tileIndex: 0 } },
        { type: "selectTile", categoryIndex: 0, tileIndex: 0 },
        { type: "designateWagerer", playerId: sam },
        { type: "submitWager", playerId: sam, amount: 250 },
      );
      expect(step(state, { type: "judge", correct: true }).line).toBe('[game] "Sam" judged correct (+$250, now $250)');
    });
  });

  it("logs the Host setting a Player's score", () => {
    const state = playing();
    const { line } = step(state, { type: "setScore", playerId: idOf(state, "Sam"), score: 800 });
    expect(line).toBe(`[game] Host set "Sam"'s score to $800`);
  });

  it("logs the Host setting a Signature Player's score by short id", () => {
    let state = run(lobby(), { type: "join", identity: signature });
    const id = state.players[0].id;
    expect(step(state, { type: "setScore", playerId: id, score: -100 }).line).toBe(
      `[game] Host set Player ${id.slice(0, 6)}'s score to -$100`,
    );
  });

  describe("Game over", () => {
    // Every Tile but (0, 0) already used, with (0, 0) the Active Clue ready to Close.
    function lastClue(scores: Record<string, number>): GameState {
      let state = playing();
      for (const [name, score] of Object.entries(scores)) {
        state = run(state, { type: "setScore", playerId: idOf(state, name), score });
      }
      state = {
        ...state,
        board: state.board.map((category) => ({
          ...category,
          tiles: category.tiles.map((tile) => ({ ...tile, used: true })),
        })),
      };
      state.board[0].tiles[0] = { ...state.board[0].tiles[0], used: false };
      return run(state, { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
    }

    it("logs the winner when the last Clue closes", () => {
      const { line, next } = step(lastClue({ Sam: 2400, Alex: 1000 }), { type: "closeClue" });
      expect(next.phase).toBe("gameOver");
      expect(line).toBe('[game] Game over — winner "Sam" ($2400)');
    });

    it("names every tied leader", () => {
      const { line } = step(lastClue({ Sam: 1000, Alex: 1000 }), { type: "closeClue" });
      expect(line).toBe('[game] Game over — tie between "Sam" and "Alex" ($1000)');
    });

    it("logs nothing when a Clue closes with Tiles still left", () => {
      const state = run(playing(), { type: "selectTile", categoryIndex: 0, tileIndex: 0 });
      expect(step(state, { type: "closeClue" }).line).toBeNull();
    });

    it("logs nothing when the last Round 1 Clue closes into a round break", () => {
      const state = { ...lastClue({}), twoRounds: true };
      const { line, next } = step(state, { type: "closeClue" });
      expect(next.phase).toBe("roundBreak");
      expect(line).toBeNull();
    });
  });

  it("logs the Game being reset", () => {
    expect(step(playing(), { type: "resetGame" }).line).toBe("[game] Game reset");
  });

  it("logs nothing for unlisted actions", () => {
    const setup = initialState();
    const joined = run(lobby(), { type: "join", identity: text("Sam") });
    const sam = joined.players[0].id;
    const dailyDouble = run(
      { ...playing(), dailyDouble: { categoryIndex: 0, tileIndex: 0 } },
      { type: "selectTile", categoryIndex: 0, tileIndex: 0 },
    );
    const alex = idOf(dailyDouble, "Alex");
    const unlogged: Array<[GameState, GameAction]> = [
      [setup, { type: "newBoard", categoryCount: 3 }],
      [setup, { type: "editCategoryName", categoryIndex: 0, name: "Birds" }],
      [setup, { type: "editClue", categoryIndex: 0, tileIndex: 0, field: "answer", value: "Kea" }],
      [setup, { type: "setTwoRounds", value: true }],
      [setup, { type: "importBoardConfig", content: setup.content }],
      [setup, { type: "openLobby" }],
      [setup, { type: "toggleBoardMusic" }],
      [setup, { type: "toggleBoardEffects" }],
      [joined, { type: "editIdentity", playerId: sam, identity: text("Samantha") }],
      [joined, { type: "reconnect", playerId: sam }],
      [joined, { type: "returnToSetup" }],
      [dailyDouble, { type: "showDailyDoubleClue" }],
      [dailyDouble, { type: "designateWagerer", playerId: alex }],
      [
        run(dailyDouble, { type: "designateWagerer", playerId: alex }),
        { type: "submitWager", playerId: alex, amount: 100 },
      ],
      [run(playing(), { type: "selectTile", categoryIndex: 0, tileIndex: 0 }), { type: "reveal" }],
      [run(playing(), { type: "selectTile", categoryIndex: 0, tileIndex: 0 }), { type: "closeClue" }],
    ];
    for (const [state, action] of unlogged) {
      const next = applyAction(state, action);
      expect(next, action.type).not.toBe(state);
      expect(describeGameEvent(state, action, next), action.type).toBeNull();
    }
  });

  it("logs nothing for a rejected (no-op) action", () => {
    const state = lobby();
    expect(describeGameEvent(state, { type: "startGame" }, state)).toBeNull();
  });
});
