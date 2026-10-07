import { normalizeRoomCode } from "@yeahnah/shared";

// One value this device remembers per Room, in localStorage under
// `yeahnah-jeopardy:<name>:<CODE>`, so last week's Room doesn't confuse this week's.
export interface RoomStorage {
  get(code: string): string | null;
  set(code: string, value: string): void;
  clear(code: string): void;
}

function roomStorage(name: string): RoomStorage {
  const key = (code: string) => `yeahnah-jeopardy:${name}:${normalizeRoomCode(code)}`;
  return {
    get: (code) => localStorage.getItem(key(code)),
    set: (code, value) => localStorage.setItem(key(code), value),
    clear: (code) => localStorage.removeItem(key(code)),
  };
}

// The Host Key this device holds for each Room (ADR-0015), so a refresh or a reconnect
// reclaims Host of that Room without asking again.
export const hostKeys = roomStorage("hostKey");

// The Player this device joined each Room as, so it reattaches after a refresh.
export const playerIds = roomStorage("playerId");
