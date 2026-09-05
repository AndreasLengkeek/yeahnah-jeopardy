import type { Player } from "@yeahnah/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Lobby } from "./Lobby";

describe("Lobby", () => {
  it("shows zero joined and a no-players message when empty", () => {
    render(<Lobby players={[]} />);

    expect(screen.getByText(/0 joined/)).toBeInTheDocument();
    expect(screen.getByText("No players yet")).toBeInTheDocument();
  });

  it("renders one player's name and score", () => {
    const players: Player[] = [{ id: "p1", name: "Dana", score: 400, connected: true }];

    render(<Lobby players={players} />);

    expect(screen.getByText(/1 joined/)).toBeInTheDocument();
    expect(screen.getByText("Dana")).toBeInTheDocument();
    expect(screen.getByText("$400")).toBeInTheDocument();
    expect(screen.queryByText("No players yet")).not.toBeInTheDocument();
  });

  it("renders every player's name and score when there are multiple", () => {
    const players: Player[] = [
      { id: "p1", name: "Dana", score: 400, connected: true },
      { id: "p2", name: "Marcus", score: -200, connected: true },
    ];

    render(<Lobby players={players} />);

    expect(screen.getByText(/2 joined/)).toBeInTheDocument();
    expect(screen.getByText("Dana")).toBeInTheDocument();
    expect(screen.getByText("$400")).toBeInTheDocument();
    expect(screen.getByText("Marcus")).toBeInTheDocument();
    expect(screen.getByText("-$200")).toBeInTheDocument();
  });
});
