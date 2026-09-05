import { MAX_CATEGORIES, MIN_CATEGORIES } from './gameEngine.js';
import { VALUES } from './trivia.js';
import type { CategoryData, ClueData } from './trivia.js';

const CLUES_PER_CATEGORY = VALUES.length;

export type ParseBoardConfigResult = { ok: true; content: CategoryData[] } | { ok: false; error: string };

// The file the Host downloads via Export and can hand back via Import — the authored
// `content` verbatim (CONTEXT.md's "Board Config"), with no metadata wrapper.
export function serializeBoardConfig(content: CategoryData[]): string {
  return JSON.stringify(content, null, 2);
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

// Structural validation only: a Category count outside [MIN_CATEGORIES, MAX_CATEGORIES],
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

  if (!Array.isArray(parsed) || parsed.length < MIN_CATEGORIES || parsed.length > MAX_CATEGORIES) {
    return {
      ok: false,
      error: `A Board Config must have between ${MIN_CATEGORIES} and ${MAX_CATEGORIES} categories.`,
    };
  }

  const content: CategoryData[] = [];
  for (const category of parsed) {
    const parsedCategory = parseCategory(category);
    if (!parsedCategory) return { ok: false, error: "That file doesn't look like a Board Config." };
    content.push(parsedCategory);
  }

  return { ok: true, content };
}
