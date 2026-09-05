import type { Player } from "@yeahnah/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameOver } from "./GameOver";

describe("GameOver", () => {
  it("announces the single Player with the highest score as the winner", () => {
    const players: Player[] = [
      { id: "p1", name: "Dana", score: 400, connected: true },
      { id: "p2", name: "Marcus", score: 800, connected: true },
    ];

    render(<GameOver players={players} />);

    expect(screen.getByText("Marcus wins!")).toBeInTheDocument();
  });

  it("announces a tie when multiple Players share the highest score", () => {
    const players: Player[] = [
      { id: "p1", name: "Dana", score: 800, connected: true },
      { id: "p2", name: "Marcus", score: 800, connected: true },
    ];

    render(<GameOver players={players} />);

    expect(screen.getByText("Dana & Marcus tie!")).toBeInTheDocument();
  });

  it("shows every Player's final score", () => {
    const players: Player[] = [
      { id: "p1", name: "Dana", score: 400, connected: true },
      { id: "p2", name: "Marcus", score: -200, connected: true },
    ];

    render(<GameOver players={players} />);

    expect(screen.getByText("Dana")).toBeInTheDocument();
    expect(screen.getByText("$400")).toBeInTheDocument();
    expect(screen.getByText("Marcus")).toBeInTheDocument();
    expect(screen.getByText("-$200")).toBeInTheDocument();
  });
});
