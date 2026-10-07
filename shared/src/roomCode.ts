// A Room Code (ADR-0015): this many letters, matched and shown upper case whatever case
// it was typed or linked in.
export const ROOM_CODE_LENGTH = 4;

// Consonants only, so a code never spells a word, and without Y (a part-time vowel).
// Dropping the vowels also drops I and O, the letters most easily misread as 1 and 0.
export const ROOM_CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ';

// What a device hears when no live Room has the code it gave.
export const NO_ROOM_MESSAGE = 'No Room with that code';

// A Room Code as the server keys its Rooms: trimmed and upper case.
export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}
