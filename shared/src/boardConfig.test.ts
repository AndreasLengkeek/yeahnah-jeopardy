import { describe, expect, it } from "vitest";
import { parseBoardConfig, serializeBoardConfig } from "./boardConfig.js";
import { CATS } from "./trivia.js";

describe("serializeBoardConfig / parseBoardConfig", () => {
  it("round-trips a valid Board Config", () => {
    const raw = serializeBoardConfig(CATS);

    const result = parseBoardConfig(raw);

    expect(result).toEqual({ ok: true, content: CATS });
  });
});

describe("parseBoardConfig", () => {
  it("rejects a Category count below the minimum", () => {
    const raw = serializeBoardConfig(CATS.slice(0, 2));

    const result = parseBoardConfig(raw);

    expect(result.ok).toBe(false);
  });

  it("rejects a Category count above the maximum", () => {
    const sevenCategories = [...CATS, ...CATS].slice(0, 7);
    const raw = serializeBoardConfig(sevenCategories);

    const result = parseBoardConfig(raw);

    expect(result.ok).toBe(false);
  });

  it("rejects text that isn't valid JSON", () => {
    const result = parseBoardConfig("not json");

    expect(result.ok).toBe(false);
  });

  it("rejects JSON that isn't a list of categories at all", () => {
    const result = parseBoardConfig(JSON.stringify({ foo: "bar" }));

    expect(result.ok).toBe(false);
  });

  it("rejects a category whose clues aren't a 5-element list", () => {
    const malformed = [{ name: "Cat", clues: [{ text: "only one", answer: "clue" }] }];

    const result = parseBoardConfig(JSON.stringify(malformed));

    expect(result.ok).toBe(false);
  });

  it("parses missing or blank text/answer fields as empty strings rather than failing", () => {
    const content = CATS.map((category) => ({
      name: category.name,
      clues: category.clues.map(() => ({})),
    }));

    const result = parseBoardConfig(JSON.stringify(content));

    expect(result).toEqual({
      ok: true,
      content: CATS.map((category) => ({
        name: category.name,
        clues: category.clues.map(() => ({ text: "", answer: "" })),
      })),
    });
  });
});
