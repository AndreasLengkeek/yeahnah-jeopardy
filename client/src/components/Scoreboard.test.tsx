import type { Player } from "@yeahnah/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Scoreboard } from "./Scoreboard";

describe("Scoreboard", () => {
  it("renders a negative score in a different color from a non-negative score", () => {
    const players: Player[] = [
      { id: "p1", name: "Dana", score: 400, connected: true },
      { id: "p2", name: "Marcus", score: -200, connected: true },
    ];

    render(<Scoreboard players={players} />);

    const positiveColor = getComputedStyle(screen.getByText("$400")).color;
    const negativeColor = getComputedStyle(screen.getByText("-$200")).color;

    expect(negativeColor).not.toBe(positiveColor);
  });
});
