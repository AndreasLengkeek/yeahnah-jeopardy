import type { Player } from "@yeahnah/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameOver } from "./GameOver";

describe("GameOver", () => {
  it("announces the single Player with the highest score as the winner", () => {
    const players: Player[] = [
      { id: "p1", identity: { kind: "text", name: "Dana" }, score: 400, connected: true },
      { id: "p2", identity: { kind: "text", name: "Marcus" }, score: 800, connected: true },
    ];

    render(<GameOver players={players} />);

    expect(screen.getByText(/wins!/).textContent).toBe("Marcus wins!");
  });

  it("announces a tie, joining each winner's identity with its own element", () => {
    const players: Player[] = [
      { id: "p1", identity: { kind: "text", name: "Dana" }, score: 800, connected: true },
      { id: "p2", identity: { kind: "text", name: "Marcus" }, score: 800, connected: true },
    ];

    render(<GameOver players={players} />);

    expect(screen.getByText(/tie!/).textContent).toBe("Dana & Marcus tie!");
  });

  it("renders a winning Signature as an image in the announcement rather than concatenated text", () => {
    const players: Player[] = [
      { id: "p1", identity: { kind: "signature", image: "data:image/png;base64,AAAA" }, score: 800, connected: true },
      { id: "p2", identity: { kind: "text", name: "Marcus" }, score: 800, connected: true },
    ];

    render(<GameOver players={players} />);

    const banner = screen.getByText(/tie!/);
    expect(banner.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,AAAA");
    expect(banner.textContent).toBe(" & Marcus tie!");
  });

  it("shows every Player's final score", () => {
    const players: Player[] = [
      { id: "p1", identity: { kind: "text", name: "Dana" }, score: 400, connected: true },
      { id: "p2", identity: { kind: "text", name: "Marcus" }, score: -200, connected: true },
    ];

    render(<GameOver players={players} />);

    expect(screen.getByText("$400").closest("div")).toHaveTextContent("Dana");
    expect(screen.getByText("-$200").closest("div")).toHaveTextContent("Marcus");
  });
});
