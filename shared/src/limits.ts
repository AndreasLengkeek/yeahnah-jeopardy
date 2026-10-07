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

/** What a Player hears when their drawing is over the Signature cap. */
export const SIGNATURE_TOO_BIG_MESSAGE = 'That drawing is too big — try a simpler drawing.';

/** A Room ends by itself once no Host or Player device has been connected for this
 * long (a Board left on a TV doesn't count, so it can't keep a Room alive forever). */
export const EMPTY_ROOM_LIMIT_MINUTES = 30;
/** ...or once this long passes with no Host action, even with devices still connected. */
export const HOST_IDLE_LIMIT_HOURS = 4;

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

/** Which per-field cap a Board's content breaks. */
export type ContentCap = 'categoryName' | 'clueField';

// The first cap any Category name, Clue or Answer in `content` breaks (Category names
// checked before Clues), or null when everything fits. A field that isn't a string at
// all breaks its cap too, since the server receives imported content already parsed by
// the client and can't trust that parse.
export function brokenContentCap(content: CategoryData[]): ContentCap | null {
  if (!content.every((category) => categoryNameFits(category?.name))) return 'categoryName';
  const cluesFit = content.every(
    (category) =>
      Array.isArray(category.clues) &&
      category.clues.every((clue) => CLUE_FIELDS.every((field) => clueFieldFits(clue?.[field]))),
  );
  return cluesFit ? null : 'clueField';
}

// Whether `content` is a list of Categories whose every field is within its cap — what
// an imported Board Config is held to.
export function contentFits(content: CategoryData[]): boolean {
  return Array.isArray(content) && brokenContentCap(content) === null;
}
