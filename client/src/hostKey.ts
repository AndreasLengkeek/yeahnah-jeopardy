// The Host Key this device holds for each Room (ADR-0015), keyed by Room Code, so a
// refresh or a reconnect reclaims Host of that Room without asking again.
const storageKey = (code: string) => `yeahnah-jeopardy:hostKey:${code.toUpperCase()}`;

export function getStoredHostKey(code: string): string | null {
  return localStorage.getItem(storageKey(code));
}

export function storeHostKey(code: string, hostKey: string): void {
  localStorage.setItem(storageKey(code), hostKey);
}

export function clearStoredHostKey(code: string): void {
  localStorage.removeItem(storageKey(code));
}
