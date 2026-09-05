import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JoinQrCode } from "./JoinQrCode";

describe("JoinQrCode", () => {
  const url = "http://192.168.1.50:5173/join";

  it("renders a QR graphic for the given URL", () => {
    render(<JoinQrCode url={url} />);

    const qr = screen.getByRole("img", { name: `Scan to join: ${url}` });
    expect(qr.tagName.toLowerCase()).toBe("svg");
  });

  it("shows the same URL as visible plain text", () => {
    render(<JoinQrCode url={url} />);

    expect(screen.getByText(url)).toBeInTheDocument();
  });
});
