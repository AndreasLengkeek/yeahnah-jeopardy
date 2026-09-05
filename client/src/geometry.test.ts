import { describe, expect, it } from "vitest";
import { zoomTransform } from "./geometry";

describe("zoomTransform", () => {
  it("returns an identity-equivalent transform when source equals destination", () => {
    const rect = { top: 100, left: 200, width: 300, height: 150 };

    expect(zoomTransform(rect, rect)).toBe("translate(0px, 0px) scale(1, 1)");
  });

  it("scales down and translates toward a smaller, offset source rect", () => {
    const source = { top: 50, left: 20, width: 100, height: 50 };
    const destination = { top: 0, left: 0, width: 400, height: 200 };

    // source center (70, 75) - destination center (200, 100) = (-130, -25)
    expect(zoomTransform(source, destination)).toBe("translate(-130px, -25px) scale(0.25, 0.25)");
  });

  it("returns none when the destination has zero area", () => {
    const source = { top: 0, left: 0, width: 100, height: 100 };
    const destination = { top: 0, left: 0, width: 0, height: 0 };

    expect(zoomTransform(source, destination)).toBe("none");
  });
});
