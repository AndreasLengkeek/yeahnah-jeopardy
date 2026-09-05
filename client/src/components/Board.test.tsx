import type { Category } from "@yeahnah/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Board } from "./Board";

function twoByTwoBoard(): Category[] {
  return [
    {
      name: "World Capitals",
      tiles: [
        { value: 100, used: false },
        { value: 200, used: false },
      ],
    },
    {
      name: "The Periodic Table",
      tiles: [
        { value: 300, used: false },
        { value: 400, used: false },
      ],
    },
  ];
}

function boardWithUsedTile(): Category[] {
  return [
    {
      name: "World Capitals",
      tiles: [
        { value: 100, used: false },
        { value: 500, used: true },
      ],
    },
  ];
}

// Used tiles render no text at all, so they can't be found with getByText like
// the unused tiles below — this locates the tile div by that same emptiness.
function getUsedTileElement(container: HTMLElement): HTMLElement {
  const grid = container.firstElementChild as HTMLElement;
  return Array.from(grid.children).find((child) => child.textContent === "") as HTMLElement;
}

describe("Board", () => {
  it("calls onSelectTile with the clicked tile's categoryIndex and tileIndex", async () => {
    const user = userEvent.setup();
    const onSelectTile = vi.fn();

    render(<Board board={twoByTwoBoard()} onSelectTile={onSelectTile} />);
    await user.click(screen.getByText("$400"));

    expect(onSelectTile).toHaveBeenCalledTimes(1);
    expect(onSelectTile).toHaveBeenCalledWith(1, 1);
  });

  it("renders a used tile with no Value text", () => {
    render(<Board board={boardWithUsedTile()} onSelectTile={vi.fn()} />);

    expect(screen.getByText("$100")).toBeInTheDocument();
    expect(screen.queryByText("$500")).not.toBeInTheDocument();
  });

  it("does not call onSelectTile when a used tile is clicked", async () => {
    const user = userEvent.setup();
    const onSelectTile = vi.fn();

    const { container } = render(<Board board={boardWithUsedTile()} onSelectTile={onSelectTile} />);
    await user.click(getUsedTileElement(container));

    expect(onSelectTile).not.toHaveBeenCalled();
  });

  it("never attaches a click handler to any Tile when onSelectTile is omitted", async () => {
    const user = userEvent.setup();

    render(<Board board={twoByTwoBoard()} />);

    await expect(user.click(screen.getByText("$100"))).resolves.not.toThrow();
  });
});
