import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ActiveClueDetails } from "../activeClue";
import { ActiveClue } from "./ActiveClue";

function details(overrides: Partial<ActiveClueDetails> = {}): ActiveClueDetails {
  return {
    category: "World Capitals",
    value: 300,
    clueText: "This Baltic capital sits on the Vilnia River",
    answer: "Vilnius",
    revealed: false,
    buzzedPlayer: null,
    correctPlayer: null,
    isDailyDouble: false,
    clueShown: true,
    wageringPlayer: null,
    wager: null,
    ...overrides,
  };
}

describe("ActiveClue", () => {
  it("hides the answer when not revealed", () => {
    render(<ActiveClue details={details({ revealed: false })} />);

    expect(screen.queryByText("Vilnius")).not.toBeInTheDocument();
  });

  it("shows the answer once revealed", () => {
    render(<ActiveClue details={details({ revealed: true })} />);

    expect(screen.getByText("Vilnius")).toBeInTheDocument();
  });

  it("shows a waiting message when no one has buzzed", () => {
    render(<ActiveClue details={details({ buzzedPlayer: null })} />);

    expect(screen.getByText("Waiting for a buzz…")).toBeInTheDocument();
  });

  it("shows the buzzed player's name when someone has the buzz", () => {
    render(
      <ActiveClue
        details={details({
          buzzedPlayer: { id: "p1", identity: { kind: "text", name: "Dana" }, score: 0, connected: true },
        })}
      />,
    );

    expect(screen.getByText(/has the buzz/).textContent).toBe("Dana has the buzz");
  });

  it("renders a buzzed player's Signature as an image in the status line", () => {
    render(
      <ActiveClue
        details={details({
          buzzedPlayer: {
            id: "p1",
            identity: { kind: "signature", image: "data:image/png;base64,AAAA" },
            score: 0,
            connected: true,
          },
        })}
      />,
    );

    const status = screen.getByText(/has the buzz/);
    expect(status.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,AAAA");
    expect(status.textContent).toBe(" has the buzz");
  });

  it("shows the correct player's name once they've answered correctly, even with no one currently buzzed", () => {
    render(
      <ActiveClue
        details={details({
          buzzedPlayer: null,
          correctPlayer: { id: "p1", identity: { kind: "text", name: "Dana" }, score: 300, connected: true },
        })}
      />,
    );

    expect(screen.getByText(/got it right/).textContent).toBe("Dana got it right");
  });

  it("prefers the buzzed player's status over a lingering correct player", () => {
    render(
      <ActiveClue
        details={details({
          buzzedPlayer: { id: "p2", identity: { kind: "text", name: "Marcus" }, score: 0, connected: true },
          correctPlayer: { id: "p1", identity: { kind: "text", name: "Dana" }, score: 300, connected: true },
        })}
      />,
    );

    expect(screen.getByText(/has the buzz/).textContent).toBe("Marcus has the buzz");
  });

  it("omits the footer when none is supplied", () => {
    const { container } = render(<ActiveClue details={details()} />);

    expect(container.querySelector("button")).not.toBeInTheDocument();
  });

  it("renders the supplied footer", () => {
    render(<ActiveClue details={details()} footer={<button>Reveal</button>} />);

    expect(screen.getByRole("button", { name: "Reveal" })).toBeInTheDocument();
  });

  it("shows the answer when alwaysShowAnswer is true, even before it's revealed", () => {
    render(<ActiveClue details={details({ revealed: false })} alwaysShowAnswer />);

    expect(screen.getByText("Vilnius")).toBeInTheDocument();
  });

  it("doesn't duplicate the answer when alwaysShowAnswer and revealed are both true", () => {
    render(<ActiveClue details={details({ revealed: true })} alwaysShowAnswer />);

    expect(screen.getAllByText("Vilnius")).toHaveLength(1);
  });

  it("hides the answer by default when alwaysShowAnswer is omitted", () => {
    render(<ActiveClue details={details({ revealed: false })} />);

    expect(screen.queryByText("Vilnius")).not.toBeInTheDocument();
  });

  it("shows a full-card Daily Double cover instead of the Clue text while clueShown is false", () => {
    render(<ActiveClue details={details({ isDailyDouble: true, clueShown: false })} />);

    expect(screen.getByText("Daily Double!")).toBeInTheDocument();
    expect(screen.queryByText("This Baltic capital sits on the Vilnia River")).not.toBeInTheDocument();
    expect(screen.queryByText("Waiting for a buzz…")).not.toBeInTheDocument();
  });

  it("renders the footer even behind the Daily Double cover, so the Host's reveal control still shows", () => {
    render(
      <ActiveClue details={details({ isDailyDouble: true, clueShown: false })} footer={<button>Show Clue</button>} />,
    );

    expect(screen.getByRole("button", { name: "Show Clue" })).toBeInTheDocument();
  });

  it("shows the Clue text and normal waiting status once a Daily Double's Wager has already landed", () => {
    render(<ActiveClue details={details({ isDailyDouble: true, clueShown: true, wager: 500 })} />);

    expect(screen.queryByText("Daily Double!")).not.toBeInTheDocument();
    expect(screen.getByText("This Baltic capital sits on the Vilnia River")).toBeInTheDocument();
    expect(screen.getByText("Waiting for a buzz…")).toBeInTheDocument();
  });

  it("buzzing on a Daily Double whose Wager has already landed behaves exactly like a normal Clue", () => {
    render(
      <ActiveClue
        details={details({
          isDailyDouble: true,
          clueShown: true,
          wager: 500,
          buzzedPlayer: { id: "p1", identity: { kind: "text", name: "Dana" }, score: 0, connected: true },
        })}
      />,
    );

    expect(screen.queryByText("Daily Double!")).not.toBeInTheDocument();
    expect(screen.getByText(/has the buzz/).textContent).toBe("Dana has the buzz");
  });

  it("shows a wagering banner instead of the waiting-for-buzz status once the Host reveals a Daily Double with no Wager yet", () => {
    render(<ActiveClue details={details({ isDailyDouble: true, clueShown: true })} />);

    expect(screen.queryByText("Daily Double!")).not.toBeInTheDocument();
    expect(screen.queryByText("This Baltic capital sits on the Vilnia River")).not.toBeInTheDocument();
    expect(screen.queryByText("Waiting for a buzz…")).not.toBeInTheDocument();
    expect(screen.getByText("Choosing a wagerer…")).toBeInTheDocument();
  });

  it("names the designated Player in the wagering banner once the Host has picked one", () => {
    render(
      <ActiveClue
        details={details({
          isDailyDouble: true,
          clueShown: true,
          wageringPlayer: { id: "p1", identity: { kind: "text", name: "Dana" }, score: 0, connected: true },
        })}
      />,
    );

    expect(screen.getByText(/is wagering…/).textContent).toBe("Dana is wagering…");
  });

  it("still shows the Clue text (not the wagering banner) for the Host, via alwaysShowAnswer, while a Wager is pending", () => {
    render(<ActiveClue details={details({ isDailyDouble: true, clueShown: true })} alwaysShowAnswer />);

    expect(screen.getByText("This Baltic capital sits on the Vilnia River")).toBeInTheDocument();
    expect(screen.getByText("Choosing a wagerer…")).toBeInTheDocument();
  });

  it("shows the submitted Wager amount in the header instead of the Tile's Value once a Wager lands", () => {
    render(<ActiveClue details={details({ isDailyDouble: true, clueShown: true, value: 300, wager: 750 })} />);

    expect(screen.getByText("$750")).toBeInTheDocument();
    expect(screen.queryByText("$300")).not.toBeInTheDocument();
  });

  it("shows the wagering banner even if a buzz has somehow landed while no Wager exists yet", () => {
    render(
      <ActiveClue
        details={details({
          isDailyDouble: true,
          clueShown: true,
          buzzedPlayer: { id: "p1", identity: { kind: "text", name: "Dana" }, score: 0, connected: true },
        })}
      />,
    );

    expect(screen.getByText("Choosing a wagerer…")).toBeInTheDocument();
    expect(screen.queryByText(/has the buzz/)).not.toBeInTheDocument();
  });
});
