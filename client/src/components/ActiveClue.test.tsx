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
        details={details({ buzzedPlayer: { id: "p1", name: "Dana", score: 0, connected: true } })}
      />,
    );

    expect(screen.getByText("Dana has the buzz")).toBeInTheDocument();
  });

  it("omits the footer when none is supplied", () => {
    const { container } = render(<ActiveClue details={details()} />);

    expect(container.querySelector("button")).not.toBeInTheDocument();
  });

  it("renders the supplied footer", () => {
    render(<ActiveClue details={details()} footer={<button>Reveal</button>} />);

    expect(screen.getByRole("button", { name: "Reveal" })).toBeInTheDocument();
  });
});
