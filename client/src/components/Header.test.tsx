import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
