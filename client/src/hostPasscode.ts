// The Host Passcode this device has proven (ADR-0014), remembered so a refresh or a
// reconnect reclaims the Host role without asking again.
const STORAGE_KEY = "yeahnah-jeopardy:hostPasscode";

export function getStoredHostPasscode(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function storeHostPasscode(passcode: string): void {
  localStorage.setItem(STORAGE_KEY, passcode);
}

export function clearStoredHostPasscode(): void {
  localStorage.removeItem(STORAGE_KEY);
}
