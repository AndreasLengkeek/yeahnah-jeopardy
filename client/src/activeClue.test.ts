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
    { id: "p1", name: "Dana", score: 0, connected: true },
    { id: "p2", name: "Marcus", score: 0, connected: true },
  ];
}

function activeClue(overrides: Partial<ActiveClue> = {}): ActiveClue {
  return {
    categoryIndex: 0,
    tileIndex: 2,
    clueText: "This Baltic capital sits on the Vilnia River",
    answer: "Vilnius",
    revealed: false,
    buzzedPlayerId: null,
    excludedPlayerIds: [],
    correctPlayerId: null,
    ...overrides,
  };
}

describe("resolveActiveClue", () => {
  it("takes the category name and value from the board, and the clue text and answer straight off the ActiveClue", () => {
    const details = resolveActiveClue(activeClue(), board(), players());

    expect(details.category).toBe(CATS[0].name);
    expect(details.clueText).toBe("This Baltic capital sits on the Vilnia River");
    expect(details.answer).toBe("Vilnius");
    expect(details.value).toBe(300);
    expect(details.revealed).toBe(false);
  });

  it("passes through a redacted (blank) answer as delivered by the server pre-Reveal", () => {
    const details = resolveActiveClue(activeClue({ answer: "" }), board(), players());

    expect(details.answer).toBe("");
  });

  it("resolves buzzedPlayer to the matching Player when buzzedPlayerId is set", () => {
    const details = resolveActiveClue(
      activeClue({ categoryIndex: 1, tileIndex: 0, buzzedPlayerId: "p2" }),
      board(),
      players(),
    );

    expect(details.buzzedPlayer).toEqual({ id: "p2", name: "Marcus", score: 0, connected: true });
  });

  it("resolves buzzedPlayer to null when buzzedPlayerId is null", () => {
    const details = resolveActiveClue(activeClue({ categoryIndex: 1, tileIndex: 0 }), board(), players());

    expect(details.buzzedPlayer).toBeNull();
  });

  it("resolves buzzedPlayer to null when buzzedPlayerId no longer matches a Player", () => {
    const details = resolveActiveClue(
      activeClue({ categoryIndex: 1, tileIndex: 0, buzzedPlayerId: "gone" }),
      board(),
      players(),
    );

    expect(details.buzzedPlayer).toBeNull();
  });

  it("resolves correctPlayer to the matching Player when correctPlayerId is set", () => {
    const details = resolveActiveClue(
      activeClue({ categoryIndex: 1, tileIndex: 0, correctPlayerId: "p1" }),
      board(),
      players(),
    );

    expect(details.correctPlayer).toEqual({ id: "p1", name: "Dana", score: 0, connected: true });
  });

  it("resolves correctPlayer to null when correctPlayerId is null", () => {
    const details = resolveActiveClue(activeClue({ categoryIndex: 1, tileIndex: 0 }), board(), players());

    expect(details.correctPlayer).toBeNull();
  });
});
