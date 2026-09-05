const STORAGE_KEY = "yeahnah-jeopardy:playerId";

export function getStoredPlayerId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function storePlayerId(playerId: string): void {
  localStorage.setItem(STORAGE_KEY, playerId);
}

export function clearStoredPlayerId(): void {
  localStorage.removeItem(STORAGE_KEY);
}
