import { MAX_CATEGORIES, MIN_CATEGORIES } from './gameEngine.js';
import { categoryNameFits, clueFieldFits, MAX_CATEGORY_NAME_LENGTH, MAX_CLUE_FIELD_LENGTH } from './limits.js';
import { VALUES } from './trivia.js';
import type { CategoryData, ClueData } from './trivia.js';

const CLUES_PER_CATEGORY = VALUES.length;

export type ParseBoardConfigResult =
  { ok: true; content: CategoryData[]; doubleJeopardy?: CategoryData[] } | { ok: false; error: string };

// The file the Host downloads via Export and can hand back via Import — Round 1's
// authored `content`, plus Double Jeopardy's when this Game has two Rounds.
export function serializeBoardConfig(content: CategoryData[], doubleJeopardyContent?: CategoryData[] | null): string {
  return JSON.stringify(
    doubleJeopardyContent === undefined || doubleJeopardyContent === null
      ? { round1: content }
      : { round1: content, doubleJeopardy: doubleJeopardyContent },
    null,
    2,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseClue(raw: unknown): ClueData | null {
  if (!isRecord(raw)) return null;

  return {
    text: typeof raw.text === 'string' ? raw.text : '',
    answer: typeof raw.answer === 'string' ? raw.answer : '',
  };
}

function parseCategory(raw: unknown): CategoryData | null {
  if (!isRecord(raw) || !Array.isArray(raw.clues) || raw.clues.length !== CLUES_PER_CATEGORY) return null;

  const clues: ClueData[] = [];
  for (const clue of raw.clues) {
    const parsedClue = parseClue(clue);
    if (!parsedClue) return null;
    clues.push(parsedClue);
  }

  return { name: typeof raw.name === 'string' ? raw.name : '', clues };
}

function categoryCountError(): ParseBoardConfigResult {
  return {
    ok: false,
    error: `A Board Config must have between ${MIN_CATEGORIES} and ${MAX_CATEGORIES} categories.`,
  };
}

function shapeError(): ParseBoardConfigResult {
  return { ok: false, error: "That file doesn't look like a Board Config." };
}

// The first per-field size cap (see limits.ts) any Round breaks, as an error naming it.
function lengthError(rounds: CategoryData[][]): ParseBoardConfigResult | null {
  const categories = rounds.flat();
  if (!categories.every((category) => categoryNameFits(category.name))) {
    return { ok: false, error: `Category names can be at most ${MAX_CATEGORY_NAME_LENGTH} characters.` };
  }
  if (
    !categories.every((category) =>
      category.clues.every((clue) => clueFieldFits(clue.text) && clueFieldFits(clue.answer)),
    )
  ) {
    return { ok: false, error: `Clues and Answers can be at most ${MAX_CLUE_FIELD_LENGTH} characters.` };
  }
  return null;
}

function parseContent(raw: unknown): CategoryData[] | 'count-error' | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length < MIN_CATEGORIES || raw.length > MAX_CATEGORIES) return 'count-error';

  const content: CategoryData[] = [];
  for (const category of raw) {
    const parsedCategory = parseCategory(category);
    if (!parsedCategory) return null;
    content.push(parsedCategory);
  }

  return content;
}

// Structural validation, plus the per-field size caps: a Category count outside [MIN_CATEGORIES, MAX_CATEGORIES],
// invalid JSON, or any shape that doesn't parse as categories/clues at all is rejected
// outright. Missing or blank text/answer fields parse as empty strings — the existing
// completeness check (isContentComplete) flags those inline once imported, rather than
// this function failing.
export function parseBoardConfig(raw: string): ParseBoardConfigResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  const round1 = parseContent(Array.isArray(parsed) ? parsed : isRecord(parsed) ? parsed.round1 : null);
  if (round1 === 'count-error') return categoryCountError();
  if (!round1) {
    return Array.isArray(parsed) || isRecord(parsed) ? shapeError() : categoryCountError();
  }

  if (!isRecord(parsed) || parsed.doubleJeopardy === undefined) {
    return lengthError([round1]) ?? { ok: true, content: round1 };
  }

  const doubleJeopardy = parseContent(parsed.doubleJeopardy);
  if (doubleJeopardy === 'count-error') return categoryCountError();
  if (!doubleJeopardy) return shapeError();
  if (doubleJeopardy.length !== round1.length) {
    return { ok: false, error: 'Round 1 and Double Jeopardy must have the same number of categories.' };
  }

  return lengthError([round1, doubleJeopardy]) ?? { ok: true, content: round1, doubleJeopardy };
}
