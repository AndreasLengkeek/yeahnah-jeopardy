import { describe, expect, it } from "vitest";
import { parseBoardConfig, serializeBoardConfig } from "./boardConfig.js";
import { CATS } from "./trivia.js";

const ROUND_1 = CATS.slice(0, 3);
const DOUBLE_JEOPARDY = ROUND_1.map((category, categoryIndex) => ({
  name: `Double ${category.name}`,
  clues: category.clues.map((clue, clueIndex) => ({
    text: `Double ${categoryIndex + 1}-${clueIndex + 1}: ${clue.text}`,
    answer: `Double ${categoryIndex + 1}-${clueIndex + 1}: ${clue.answer}`,
  })),
}));

describe("serializeBoardConfig / parseBoardConfig", () => {
  it("round-trips a valid Board Config", () => {
    const raw = serializeBoardConfig(CATS);

    const result = parseBoardConfig(raw);

    expect(result).toEqual({ ok: true, content: CATS });
  });

  it("round-trips a two-Round Board Config unchanged", () => {
    const raw = serializeBoardConfig(ROUND_1, DOUBLE_JEOPARDY);

    const result = parseBoardConfig(raw);

    expect(result).toEqual({ ok: true, content: ROUND_1, doubleJeopardy: DOUBLE_JEOPARDY });
  });
});

describe("parseBoardConfig", () => {
  it("still parses the legacy bare-array format as Round 1 only", () => {
    const result = parseBoardConfig(JSON.stringify(ROUND_1));

    expect(result).toEqual({ ok: true, content: ROUND_1 });
  });

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

  it.each([
    { label: "Category name", edit: { name: "C".repeat(61) }, error: "Category names can be at most 60 characters." },
    {
      label: "Clue",
      edit: { clues: [{ text: "x".repeat(501), answer: "a" }, ...CATS[0].clues.slice(1)] },
      error: "Clues and Answers can be at most 500 characters.",
    },
  ])("rejects an over-long $label, naming the limit", ({ edit, error }) => {
    const raw = serializeBoardConfig(
      ROUND_1,
      ROUND_1.map((category) => ({ ...category, ...edit })),
    );

    expect(parseBoardConfig(raw)).toEqual({ ok: false, error });
  });

  it("rejects text that isn't valid JSON", () => {
    const result = parseBoardConfig("not json");

    expect(result.ok).toBe(false);
  });

  it("rejects JSON that isn't a list of categories at all", () => {
    const result = parseBoardConfig(JSON.stringify({ foo: "bar" }));

    expect(result.ok).toBe(false);
  });

  it("parses the new two-Round object shape", () => {
    const result = parseBoardConfig(JSON.stringify({ round1: ROUND_1, doubleJeopardy: DOUBLE_JEOPARDY }));

    expect(result).toEqual({ ok: true, content: ROUND_1, doubleJeopardy: DOUBLE_JEOPARDY });
  });

  it("rejects a category whose clues aren't a 5-element list", () => {
    const malformed = [{ name: "Cat", clues: [{ text: "only one", answer: "clue" }] }];

    const result = parseBoardConfig(JSON.stringify(malformed));

    expect(result.ok).toBe(false);
  });

  it("rejects Double Jeopardy content whose Category count doesn't match Round 1", () => {
    const result = parseBoardConfig(JSON.stringify({ round1: ROUND_1, doubleJeopardy: DOUBLE_JEOPARDY.slice(0, 2) }));

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
