import { CATS } from "@yeahnah/shared";
import type { ActiveClue, Category, Player } from "@yeahnah/shared";
import { describe, expect, it } from "vitest";
import { resolveActiveClue } from "./activeClue";

function board(): Category[] {
  return CATS.map((category) => ({
    name: category.name,
    tiles: category.clues.map((_, index) => ({ value: (index + 1) * 100, used: false })),
  }));
}

function players(): Player[] {
  return [
    { id: "p1", identity: { kind: "text", name: "Dana" }, score: 0, connected: true },
    { id: "p2", identity: { kind: "text", name: "Marcus" }, score: 0, connected: true },
  ];
}

describe("resolveActiveClue", () => {
  it("looks up the category name, clue text, answer, and value from the board and CATS data", () => {
    const activeClue: ActiveClue = {
      categoryIndex: 0,
      tileIndex: 2,
      revealed: false,
      buzzedPlayerId: null,
      excludedPlayerIds: [],
      correctPlayerId: null,
    };

    const details = resolveActiveClue(activeClue, board(), players());

    expect(details.category).toBe(CATS[0].name);
    expect(details.clueText).toBe(CATS[0].clues[2].text);
    expect(details.answer).toBe(CATS[0].clues[2].answer);
    expect(details.value).toBe(300);
    expect(details.revealed).toBe(false);
  });

  it("resolves buzzedPlayer to the matching Player when buzzedPlayerId is set", () => {
    const activeClue: ActiveClue = {
      categoryIndex: 1,
      tileIndex: 0,
      revealed: false,
      buzzedPlayerId: "p2",
      excludedPlayerIds: [],
      correctPlayerId: null,
    };

    const details = resolveActiveClue(activeClue, board(), players());

    expect(details.buzzedPlayer).toEqual({ id: "p2", identity: { kind: "text", name: "Marcus" }, score: 0, connected: true });
  });

  it("resolves buzzedPlayer to null when buzzedPlayerId is null", () => {
    const activeClue: ActiveClue = {
      categoryIndex: 1,
      tileIndex: 0,
      revealed: false,
      buzzedPlayerId: null,
      excludedPlayerIds: [],
      correctPlayerId: null,
    };

    const details = resolveActiveClue(activeClue, board(), players());

    expect(details.buzzedPlayer).toBeNull();
  });

  it("resolves buzzedPlayer to null when buzzedPlayerId no longer matches a Player", () => {
    const activeClue: ActiveClue = {
      categoryIndex: 1,
      tileIndex: 0,
      revealed: false,
      buzzedPlayerId: "gone",
      excludedPlayerIds: [],
      correctPlayerId: null,
    };

    const details = resolveActiveClue(activeClue, board(), players());

    expect(details.buzzedPlayer).toBeNull();
  });

  it("resolves correctPlayer to the matching Player when correctPlayerId is set", () => {
    const activeClue: ActiveClue = {
      categoryIndex: 1,
      tileIndex: 0,
      revealed: false,
      buzzedPlayerId: null,
      excludedPlayerIds: [],
      correctPlayerId: "p1",
    };

    const details = resolveActiveClue(activeClue, board(), players());

    expect(details.correctPlayer).toEqual({ id: "p1", identity: { kind: "text", name: "Dana" }, score: 0, connected: true });
  });

  it("resolves correctPlayer to null when correctPlayerId is null", () => {
    const activeClue: ActiveClue = {
      categoryIndex: 1,
      tileIndex: 0,
      revealed: false,
      buzzedPlayerId: null,
      excludedPlayerIds: [],
      correctPlayerId: null,
    };

    const details = resolveActiveClue(activeClue, board(), players());

    expect(details.correctPlayer).toBeNull();
  });
});
