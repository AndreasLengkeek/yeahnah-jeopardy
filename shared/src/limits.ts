import type { CategoryData } from './trivia.js';
import type { ClueField, PlayerIdentity } from './types.js';

// Size caps that keep one free-tier server healthy however many Rooms it holds: nobody
// can push megabytes through a text field or bloat every broadcast with one huge
// drawing. The reducers refuse anything over them the same way they refuse blank text;
// the client mirrors them (input `maxLength`s, Board Config import errors).

export const MAX_NAME_LENGTH = 40;
export const MAX_CATEGORY_NAME_LENGTH = 60;
/** Each of a Clue's text and its Answer. */
export const MAX_CLUE_FIELD_LENGTH = 500;
/** A Signature's data URL, in characters (about 50 KB). A drawing the Join form's
 * canvas exports is a few KB, far under it. */
export const MAX_SIGNATURE_LENGTH = 50_000;

export function signatureTooBig(identity: PlayerIdentity): boolean {
  return identity.kind === 'signature' && identity.image.length > MAX_SIGNATURE_LENGTH;
}

export function nameTooLong(identity: PlayerIdentity): boolean {
  return identity.kind === 'text' && identity.name.length > MAX_NAME_LENGTH;
}

export function categoryNameFits(name: unknown): name is string {
  return typeof name === 'string' && name.length <= MAX_CATEGORY_NAME_LENGTH;
}

export function clueFieldFits(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_CLUE_FIELD_LENGTH;
}

const CLUE_FIELDS: ClueField[] = ['text', 'answer'];

// Whether every Category name, Clue and Answer in `content` is a string within its
// cap — what an imported Board Config is held to, since the server receives it
// already parsed by the client and can't trust that parse.
export function contentFits(content: CategoryData[]): boolean {
  return (
    Array.isArray(content) &&
    content.every(
      (category) =>
        categoryNameFits(category?.name) &&
        Array.isArray(category.clues) &&
        category.clues.every((clue) => CLUE_FIELDS.every((field) => clueFieldFits(clue?.[field]))),
    )
  );
}
