import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerIdentity } from "./PlayerIdentity";

describe("PlayerIdentity", () => {
  it("renders a text identity as visible text, with no image", () => {
    const { container } = render(<PlayerIdentity identity={{ kind: "text", name: "Dana" }} />);

    expect(screen.getByText("Dana")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders a signature identity as an image with the drawn data URL as its source", () => {
    const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    const { container } = render(<PlayerIdentity identity={{ kind: "signature", image }} />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", image);
  });
});
