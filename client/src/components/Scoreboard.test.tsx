import type { Player } from "@yeahnah/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Scoreboard } from "./Scoreboard";

describe("Scoreboard", () => {
  it("renders a negative score in a different color from a non-negative score", () => {
    const players: Player[] = [
      { id: "p1", identity: { kind: "text", name: "Dana" }, score: 400, connected: true },
      { id: "p2", identity: { kind: "text", name: "Marcus" }, score: -200, connected: true },
    ];

    render(<Scoreboard players={players} />);

    const positiveColor = getComputedStyle(screen.getByText("$400")).color;
    const negativeColor = getComputedStyle(screen.getByText("-$200")).color;

    expect(negativeColor).not.toBe(positiveColor);
  });

  it("renders scores read-only with no edit control when onEditScore is omitted", () => {
    const players: Player[] = [
      { id: "p1", identity: { kind: "text", name: "Dana" }, score: 400, connected: true },
      { id: "p2", identity: { kind: "text", name: "Marcus" }, score: -200, connected: true },
    ];

    render(<Scoreboard players={players} />);

    expect(screen.getByText("$400")).toBeInTheDocument();
    expect(screen.getByText("-$200")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("commits an edited score, calling onEditScore with the playerId and parsed integer", async () => {
    const user = userEvent.setup();
    const onEditScore = vi.fn();
    const players: Player[] = [
      { id: "p1", identity: { kind: "text", name: "Dana" }, score: 400, connected: true },
      { id: "p2", identity: { kind: "text", name: "Marcus" }, score: -200, connected: true },
    ];

    render(<Scoreboard players={players} onEditScore={onEditScore} />);

    const field = screen.getByLabelText("Dana score");
    await user.clear(field);
    await user.type(field, "-350");
    await user.keyboard("{Enter}");

    expect(onEditScore).toHaveBeenCalledWith("p1", -350);
  });

  it("does not call onEditScore when the field is focused and blurred without an edit", async () => {
    const user = userEvent.setup();
    const onEditScore = vi.fn();
    const players: Player[] = [
      { id: "p1", identity: { kind: "text", name: "Dana" }, score: 400, connected: true },
    ];

    render(<Scoreboard players={players} onEditScore={onEditScore} />);

    const field = screen.getByLabelText("Dana score");
    await user.click(field);
    await user.tab();

    expect(onEditScore).not.toHaveBeenCalled();
  });

  it("discards a non-integer entry without calling onEditScore", async () => {
    const user = userEvent.setup();
    const onEditScore = vi.fn();
    const players: Player[] = [
      { id: "p1", identity: { kind: "text", name: "Dana" }, score: 400, connected: true },
    ];

    render(<Scoreboard players={players} onEditScore={onEditScore} />);

    const field = screen.getByLabelText("Dana score");
    await user.clear(field);
    await user.type(field, "3.9x");
    await user.keyboard("{Enter}");

    expect(onEditScore).not.toHaveBeenCalled();
  });
});
