import { describe, expect, it } from "vitest";
import { formatScore } from "./format";

describe("formatScore", () => {
  it("formats a positive score with a dollar sign", () => {
    expect(formatScore(400)).toBe("$400");
  });

  it("formats zero without a minus sign", () => {
    expect(formatScore(0)).toBe("$0");
  });

  it("formats a negative score with a leading minus before the dollar sign", () => {
    expect(formatScore(-200)).toBe("-$200");
  });

  it("uses a thousands separator for large scores", () => {
    expect(formatScore(1200)).toBe("$1,200");
    expect(formatScore(-1200)).toBe("-$1,200");
  });
});
