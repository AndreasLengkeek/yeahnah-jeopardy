import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MAX_SIGNATURE_LENGTH } from "@yeahnah/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JoinForm } from "./JoinForm";

const { MOCK_IMAGE, exported } = vi.hoisted(() => {
  const MOCK_IMAGE = "data:image/png;base64,MOCKSIGNATURE";
  // What the stub canvas exports while it has content; a test may swap in another image.
  return { MOCK_IMAGE, exported: { image: MOCK_IMAGE } };
});

// The real SignatureCanvas is browser-API-bound glue (untested by design). This stub
// stands in for it so the form's submit-enablement logic can be exercised: one button
// simulates a drawn stroke, another simulates clearing, and the imperative handle
// mirrors the real contract — a fixed image while content exists, an empty string once
// cleared.
vi.mock("./SignatureCanvas", async () => {
  const { forwardRef, useImperativeHandle, useState } = await import("react");
  return {
    SignatureCanvas: forwardRef(function MockSignatureCanvas(
      { onContentChange }: { onContentChange?: (hasContent: boolean) => void },
      ref: import("react").ForwardedRef<{ toDataURL: () => string }>,
    ) {
      const [hasContent, setHasContent] = useState(false);
      useImperativeHandle(ref, () => ({ toDataURL: () => (hasContent ? exported.image : "") }), [hasContent]);

      function set(next: boolean) {
        setHasContent(next);
        onContentChange?.(next);
      }

      return (
        <div>
          <button type="button" onClick={() => set(true)}>
            mock: draw a stroke
          </button>
          <button type="button" onClick={() => set(false)}>
            mock: clear the canvas
          </button>
        </div>
      );
    }),
  };
});

beforeEach(() => {
  exported.image = MOCK_IMAGE;
});

function renderForm(overrides: Partial<Parameters<typeof JoinForm>[0]> = {}) {
  const onJoin = vi.fn();
  render(<JoinForm onJoin={onJoin} submitting={false} error={null} {...overrides} />);
  return { onJoin };
}

describe("JoinForm submit enablement", () => {
  it("disables Join with a blank canvas and no typed name", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
  });

  it("enables Join once a stroke exists on the canvas", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "mock: draw a stroke" }));

    expect(screen.getByRole("button", { name: "Join" })).toBeEnabled();
  });

  it("disables Join again once the canvas is cleared", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "mock: draw a stroke" }));
    await user.click(screen.getByRole("button", { name: "mock: clear the canvas" }));

    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
  });

  it("enables Join once a non-blank name is typed in text mode", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /type a name instead/i }));
    await user.type(screen.getByPlaceholderText("Your name"), "Dana");

    expect(screen.getByRole("button", { name: "Join" })).toBeEnabled();
  });

  it("keeps Join disabled for a whitespace-only name in text mode", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /type a name instead/i }));
    await user.type(screen.getByPlaceholderText("Your name"), "   ");

    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
  });

  it("joins with a signature identity carrying the exported image", async () => {
    const user = userEvent.setup();
    const { onJoin } = renderForm();

    await user.click(screen.getByRole("button", { name: "mock: draw a stroke" }));
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(onJoin).toHaveBeenCalledWith({ kind: "signature", image: MOCK_IMAGE });
  });

  it("joins with a text identity carrying the trimmed name", async () => {
    const user = userEvent.setup();
    const { onJoin } = renderForm();

    await user.click(screen.getByRole("button", { name: /type a name instead/i }));
    await user.type(screen.getByPlaceholderText("Your name"), "  Dana  ");
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(onJoin).toHaveBeenCalledWith({ kind: "text", name: "Dana" });
  });

  it("does not submit while a join is already in flight", async () => {
    const user = userEvent.setup();
    const { onJoin } = renderForm({ submitting: true });

    await user.click(screen.getByRole("button", { name: "mock: draw a stroke" }));
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(onJoin).not.toHaveBeenCalled();
  });
});

describe("JoinForm size caps", () => {
  it("asks for a simpler drawing, without joining, when the Signature is over the size cap", async () => {
    const user = userEvent.setup();
    exported.image = `data:image/png;base64,${"A".repeat(MAX_SIGNATURE_LENGTH)}`;
    const { onJoin } = renderForm();

    await user.click(screen.getByRole("button", { name: "mock: draw a stroke" }));
    await user.click(screen.getByRole("button", { name: "Join" }));

    expect(onJoin).not.toHaveBeenCalled();
    expect(screen.getByText(/try a simpler drawing/)).toBeInTheDocument();
  });

  it("shows the server's error when it refuses the drawing", () => {
    renderForm({ error: "That drawing is too big — try a simpler drawing." });

    expect(screen.getByText(/try a simpler drawing/)).toBeInTheDocument();
  });

  it("caps a typed name at the server's name length", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /type a name instead/i }));

    expect(screen.getByPlaceholderText("Your name")).toHaveAttribute("maxLength", "40");
  });
});
