import type { Player } from "@yeahnah/shared";
import { describe, expect, it } from "vitest";
import { winningPlayers } from "./winner";

describe("winningPlayers", () => {
  it("returns the single Player with the highest score", () => {
    const players: Player[] = [
      { id: "p1", name: "Dana", score: 400, connected: true },
      { id: "p2", name: "Marcus", score: 800, connected: true },
    ];

    expect(winningPlayers(players)).toEqual([{ id: "p2", name: "Marcus", score: 800, connected: true }]);
  });

  it("returns every Player tied for the highest score", () => {
    const players: Player[] = [
      { id: "p1", name: "Dana", score: 800, connected: true },
      { id: "p2", name: "Marcus", score: 800, connected: true },
      { id: "p3", name: "Priya", score: 200, connected: true },
    ];

    expect(winningPlayers(players).map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("picks the least-negative score as the winner when everyone is in the red", () => {
    const players: Player[] = [
      { id: "p1", name: "Dana", score: -400, connected: true },
      { id: "p2", name: "Marcus", score: -100, connected: true },
    ];

    expect(winningPlayers(players)).toEqual([{ id: "p2", name: "Marcus", score: -100, connected: true }]);
  });

  it("returns an empty array when there are no players", () => {
    expect(winningPlayers([])).toEqual([]);
  });
});
