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

  it("renders no action button when none is supplied", () => {
    render(<Header subtitle="Host view" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the action button with its label and calls its handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Header subtitle="Host view" action={{ label: "Edit Board", onClick }} />);

    await user.click(screen.getByRole("button", { name: "Edit Board" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  function renderSoundToggles(overrides: Partial<Parameters<typeof Header>[0]> = {}) {
    const props = {
      isBoardMusicMuted: false,
      onToggleBoardMusic: vi.fn(),
      isBoardEffectsMuted: false,
      onToggleBoardEffects: vi.fn(),
      ...overrides,
    };
    render(<Header {...props} />);
    return props;
  }

  it.each(["Board Music", "Board Effects"])("renders an unpressed mute toggle for unmuted %s", (part) => {
    renderSoundToggles();

    expect(screen.getByRole("button", { name: `Mute ${part}` })).toHaveAttribute("aria-pressed", "false");
  });

  it("renders a pressed unmute toggle for muted Board Music alongside unmuted Board Effects", () => {
    renderSoundToggles({ isBoardMusicMuted: true });

    expect(screen.getByRole("button", { name: "Unmute Board Music" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mute Board Effects" })).toHaveAttribute("aria-pressed", "false");
  });

  it("renders a pressed unmute toggle for muted Board Effects alongside unmuted Board Music", () => {
    renderSoundToggles({ isBoardEffectsMuted: true });

    expect(screen.getByRole("button", { name: "Unmute Board Effects" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mute Board Music" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls only the Board Music handler when its toggle is clicked", async () => {
    const user = userEvent.setup();
    const props = renderSoundToggles();

    await user.click(screen.getByRole("button", { name: "Mute Board Music" }));

    expect(props.onToggleBoardMusic).toHaveBeenCalledTimes(1);
    expect(props.onToggleBoardEffects).not.toHaveBeenCalled();
  });

  it("calls only the Board Effects handler when its toggle is clicked", async () => {
    const user = userEvent.setup();
    const props = renderSoundToggles();

    await user.click(screen.getByRole("button", { name: "Mute Board Effects" }));

    expect(props.onToggleBoardEffects).toHaveBeenCalledTimes(1);
    expect(props.onToggleBoardMusic).not.toHaveBeenCalled();
  });
});
