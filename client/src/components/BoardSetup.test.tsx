import type { CategoryData } from "@yeahnah/shared";
import { render, screen, waitFor } from "@testing-library/react";
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

function doubleJeopardyBoard(categoryCount = 3): CategoryData[] {
  return Array.from({ length: categoryCount }, (_, c) => ({
    name: `Double Category ${c + 1}`,
    clues: Array.from({ length: 5 }, (_, t) => ({
      text: `Double clue ${c + 1}-${t + 1}`,
      answer: `Double answer ${c + 1}-${t + 1}`,
    })),
  }));
}

function jsonFile(name: string, content: string): File {
  const file = new File([content], name, { type: "application/json" }) as File & { text: () => Promise<string> };
  file.text = async () => content;
  return file;
}

function noopHandlers() {
  return {
    onEditCategoryName: vi.fn(),
    onEditClue: vi.fn(),
    onNewBoard: vi.fn(),
    onImportBoardConfig: vi.fn(),
    onOpenLobby: vi.fn(),
    twoRounds: false,
    doubleJeopardyContent: null,
    onSetTwoRounds: vi.fn(),
    onEditDoubleJeopardyCategoryName: vi.fn(),
    onEditDoubleJeopardyClue: vi.fn(),
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

  describe("Double Jeopardy toggle", () => {
    it("hides the Double Jeopardy panel while the toggle is off", () => {
      render(<BoardSetup content={completeBoard(3)} {...noopHandlers()} />);

      expect(screen.getAllByText("Double Jeopardy")).toHaveLength(1); // toggle label only, no panel title
      expect(screen.getByLabelText("Double Jeopardy")).not.toBeChecked();
    });

    it("reports toggling Double Jeopardy on", async () => {
      const user = userEvent.setup();
      const handlers = noopHandlers();
      render(<BoardSetup content={completeBoard(3)} {...handlers} />);

      await user.click(screen.getByLabelText("Double Jeopardy"));

      expect(handlers.onSetTwoRounds).toHaveBeenCalledWith(true);
    });

    it("shows a second panel with $200-$1000 Value labels once twoRounds is on with content", () => {
      render(
        <BoardSetup
          content={completeBoard(3)}
          {...noopHandlers()}
          twoRounds={true}
          doubleJeopardyContent={blankBoard(3)}
        />,
      );

      expect(screen.getAllByText("Double Jeopardy")).toHaveLength(2); // toggle label + panel title
      expect(screen.getAllByText("$200")).toHaveLength(3 + 3); // one per category in each panel (Round 1's tile 2, DJ's tile 1)
      expect(screen.getAllByText("$1000")).toHaveLength(3); // only present in the Double Jeopardy panel
    });

    it("reports Double Jeopardy category and clue edits separately from Round 1's", async () => {
      const user = userEvent.setup();
      const handlers = noopHandlers();
      render(
        <BoardSetup
          content={completeBoard(3)}
          {...handlers}
          twoRounds={true}
          doubleJeopardyContent={blankBoard(3)}
        />,
      );

      const djNameInput = screen.getByLabelText("Double Jeopardy Category 2 name");
      await user.type(djNameInput, "X");

      expect(handlers.onEditDoubleJeopardyCategoryName).toHaveBeenCalledWith(1, "X");
      expect(handlers.onEditCategoryName).not.toHaveBeenCalled();
    });

    it("keeps Open Lobby disabled while Double Jeopardy content is incomplete, even though Round 1's is complete", () => {
      render(
        <BoardSetup
          content={completeBoard(3)}
          {...noopHandlers()}
          twoRounds={true}
          doubleJeopardyContent={blankBoard(3)}
        />,
      );

      expect(screen.getByRole("button", { name: "Open Lobby" })).toBeDisabled();
    });

    it("enables Open Lobby once both Round 1's and Double Jeopardy's content are complete", () => {
      render(
        <BoardSetup
          content={completeBoard(3)}
          {...noopHandlers()}
          twoRounds={true}
          doubleJeopardyContent={completeBoard(3)}
        />,
      );

      expect(screen.getByRole("button", { name: "Open Lobby" })).toBeEnabled();
    });
  });

  describe("Board Config import/export", () => {
    it("imports a two-Round Board Config by turning Double Jeopardy on and loading both Rounds", async () => {
      const user = userEvent.setup();
      const handlers = noopHandlers();
      const { container } = render(<BoardSetup content={blankBoard(3)} {...handlers} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;

      expect(fileInput).not.toBeNull();

      const round1 = completeBoard(3);
      const doubleJeopardy = doubleJeopardyBoard(3);
      const file = jsonFile("two-round-board.json", JSON.stringify({ round1, doubleJeopardy }));

      await user.upload(fileInput!, file);

      await waitFor(() => {
        expect(handlers.onSetTwoRounds).toHaveBeenCalledWith(true);
      });
      expect(handlers.onImportBoardConfig).toHaveBeenCalledWith(round1);
      expect(handlers.onEditDoubleJeopardyCategoryName).toHaveBeenCalledTimes(3);
      expect(handlers.onEditDoubleJeopardyCategoryName).toHaveBeenNthCalledWith(1, 0, "Double Category 1");
      expect(handlers.onEditDoubleJeopardyCategoryName).toHaveBeenNthCalledWith(3, 2, "Double Category 3");
      expect(handlers.onEditDoubleJeopardyClue).toHaveBeenCalledTimes(30);
      expect(handlers.onEditDoubleJeopardyClue).toHaveBeenNthCalledWith(1, 0, 0, "text", "Double clue 1-1");
      expect(handlers.onEditDoubleJeopardyClue).toHaveBeenNthCalledWith(30, 2, 4, "answer", "Double answer 3-5");
    });

    it("imports a legacy Board Config by turning Double Jeopardy off and loading Round 1 only", async () => {
      const user = userEvent.setup();
      const handlers = noopHandlers();
      const { container } = render(
        <BoardSetup
          content={completeBoard(3)}
          {...handlers}
          twoRounds={true}
          doubleJeopardyContent={doubleJeopardyBoard(3)}
        />,
      );
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;

      expect(fileInput).not.toBeNull();

      const round1 = completeBoard(4);
      const file = jsonFile("legacy-board.json", JSON.stringify(round1));

      await user.upload(fileInput!, file);

      await waitFor(() => {
        expect(handlers.onSetTwoRounds).toHaveBeenCalledWith(false);
      });
      expect(handlers.onImportBoardConfig).toHaveBeenCalledWith(round1);
      expect(handlers.onEditDoubleJeopardyCategoryName).not.toHaveBeenCalled();
      expect(handlers.onEditDoubleJeopardyClue).not.toHaveBeenCalled();
    });

    it("exports both Rounds when Double Jeopardy is on", async () => {
      const user = userEvent.setup();
      const createObjectURL = vi.fn(() => "blob:board-config");
      const revokeObjectURL = vi.fn();
      const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      const blobParts: BlobPart[][] = [];
      const originalBlob = Blob;
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      Blob = class {
        constructor(parts: BlobPart[]) {
          blobParts.push(parts);
        }
      } as typeof Blob;
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;

      try {
        render(
          <BoardSetup
            content={completeBoard(3)}
            {...noopHandlers()}
            twoRounds={true}
            doubleJeopardyContent={doubleJeopardyBoard(3)}
          />,
        );

        await user.click(screen.getByRole("button", { name: "Export Board" }));

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(blobParts).toEqual([
          [
            JSON.stringify(
              {
                round1: completeBoard(3),
                doubleJeopardy: doubleJeopardyBoard(3),
              },
              null,
              2,
            ),
          ],
        ]);
        expect(createObjectURL.mock.calls[0]).toHaveLength(1);
        expect(JSON.parse(String(blobParts[0]?.[0]))).toEqual({
          round1: completeBoard(3),
          doubleJeopardy: doubleJeopardyBoard(3),
        });
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:board-config");
      } finally {
        Blob = originalBlob;
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        anchorClick.mockRestore();
      }
    });
  });
});
