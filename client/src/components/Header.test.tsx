import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("renders no subtitle when none is supplied", () => {
    render(<Header />);

    expect(screen.queryByText("Host view")).not.toBeInTheDocument();
  });

  it("renders the subtitle when supplied", () => {
    render(<Header subtitle="Host view" />);

    expect(screen.getByText("Host view")).toBeInTheDocument();
  });

  it("renders a mute button whose accessible label reflects an unmuted board", () => {
    render(<Header isBoardSoundMuted={false} onToggleBoardSound={() => {}} />);

    expect(screen.getByRole("button", { name: "Mute Board Sound" })).toBeInTheDocument();
  });

  it("renders an unmute button whose accessible label reflects a muted board", () => {
    render(<Header isBoardSoundMuted onToggleBoardSound={() => {}} />);

    expect(screen.getByRole("button", { name: "Unmute Board Sound" })).toBeInTheDocument();
  });

  it("calls the supplied handler when the button is clicked", async () => {
    const user = userEvent.setup();
    const onToggleBoardSound = vi.fn();
    render(<Header isBoardSoundMuted={false} onToggleBoardSound={onToggleBoardSound} />);

    await user.click(screen.getByRole("button", { name: "Mute Board Sound" }));

    expect(onToggleBoardSound).toHaveBeenCalledTimes(1);
  });
});
