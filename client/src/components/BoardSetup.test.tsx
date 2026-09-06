import type { CategoryData } from "@yeahnah/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BoardSetup } from "./BoardSetup";

function blankBoard(categoryCount = 3): CategoryData[] {
  return Array.from({ length: categoryCount }, () => ({
    name: "",
    clues: Array.from({ length: 5 }, () => ({ text: "", answer: "" })),
  }));
}

function completeBoard(categoryCount = 3): CategoryData[] {
  return Array.from({ length: categoryCount }, (_, c) => ({
    name: `Category ${c + 1}`,
    clues: Array.from({ length: 5 }, (_, t) => ({ text: `Clue ${t + 1}`, answer: `Answer ${t + 1}` })),
  }));
}

function noopHandlers() {
  return {
    onEditCategoryName: vi.fn(),
    onEditClue: vi.fn(),
    onNewBoard: vi.fn(),
    onImportBoardConfig: vi.fn(),
    onOpenLobby: vi.fn(),
  };
}

describe("BoardSetup", () => {
  it("flags every incomplete field and disables Open Lobby while the board is blank", () => {
    render(<BoardSetup content={blankBoard(3)} {...noopHandlers()} />);

    expect(screen.getAllByText("Category name required")).toHaveLength(3);
    expect(screen.getAllByText("Clue text and answer required")).toHaveLength(15);
    expect(screen.getByRole("button", { name: "Open Lobby" })).toBeDisabled();
  });

  it("shows a single field-specific flag when only one of a clue's two fields is blank", () => {
    const content = completeBoard(3);
    content[0].clues[0] = { text: "Has text", answer: "" };

    render(<BoardSetup content={content} {...noopHandlers()} />);

    expect(screen.getByText("Answer required")).toBeInTheDocument();
    expect(screen.queryByText("Clue text required")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Lobby" })).toBeDisabled();
  });

  it("raises no flags and enables Open Lobby once every field is filled", async () => {
    const user = userEvent.setup();
    const handlers = noopHandlers();
    render(<BoardSetup content={completeBoard(3)} {...handlers} />);

    expect(screen.queryByText(/required/)).not.toBeInTheDocument();

    const openLobby = screen.getByRole("button", { name: "Open Lobby" });
    expect(openLobby).toBeEnabled();
    await user.click(openLobby);
    expect(handlers.onOpenLobby).toHaveBeenCalledTimes(1);
  });

  it("reports category-name edits with the category index and new value", async () => {
    const user = userEvent.setup();
    const handlers = noopHandlers();
    render(<BoardSetup content={blankBoard(3)} {...handlers} />);

    await user.type(screen.getByLabelText("Category 2 name"), "X");

    expect(handlers.onEditCategoryName).toHaveBeenCalledWith(1, "X");
  });

  it("reports clue edits with the category index, tile index, field, and new value", async () => {
    const user = userEvent.setup();
    const handlers = noopHandlers();
    render(<BoardSetup content={blankBoard(3)} {...handlers} />);

    await user.type(screen.getByLabelText("Category 1 clue 3 answer"), "Y");

    expect(handlers.onEditClue).toHaveBeenCalledWith(0, 2, "answer", "Y");
  });

  it("keeps category names single-line while clue text and answers are multiline textareas", () => {
    render(<BoardSetup content={blankBoard(3)} {...noopHandlers()} />);

    expect(screen.getByLabelText("Category 1 name").tagName).toBe("INPUT");
    expect(screen.getByRole("textbox", { name: "Category 1 clue 1 text" }).tagName).toBe("TEXTAREA");
    expect(screen.getByRole("textbox", { name: "Category 1 clue 1 answer" }).tagName).toBe("TEXTAREA");
  });

  it("keeps the category grid column count in sync with the current category count", () => {
    render(<BoardSetup content={completeBoard(6)} {...noopHandlers()} />);

    const grid = screen.getByLabelText("Category 1 name").closest("div")?.parentElement;
    expect(grid).toHaveStyle({ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" });
  });

  it("starts a new board with the chosen category count", async () => {
    const user = userEvent.setup();
    const handlers = noopHandlers();
    render(<BoardSetup content={completeBoard(3)} {...handlers} />);

    await user.selectOptions(screen.getByLabelText("Category count"), "6");
    await user.click(screen.getByRole("button", { name: "Start New Board" }));

    expect(handlers.onNewBoard).toHaveBeenCalledWith(6);
  });
});
