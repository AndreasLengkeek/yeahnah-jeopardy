// The Player this device joined each Room as, keyed by Room Code, so last week's Room
// doesn't confuse this week's.
const storageKey = (code: string) => `yeahnah-jeopardy:playerId:${code.toUpperCase()}`;

export function getStoredPlayerId(code: string): string | null {
  return localStorage.getItem(storageKey(code));
}

export function storePlayerId(code: string, playerId: string): void {
  localStorage.setItem(storageKey(code), playerId);
}

export function clearStoredPlayerId(code: string): void {
  localStorage.removeItem(storageKey(code));
}
