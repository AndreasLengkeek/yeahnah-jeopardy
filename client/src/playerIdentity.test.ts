import { beforeEach, describe, expect, it } from "vitest";
import { clearStoredPlayerId, getStoredPlayerId, storePlayerId } from "./playerIdentity";

describe("playerIdentity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("has nothing stored by default", () => {
    expect(getStoredPlayerId("BRDK")).toBeNull();
  });

  it("persists a stored id across reads", () => {
    storePlayerId("BRDK", "player-123");
    expect(getStoredPlayerId("BRDK")).toBe("player-123");
  });

  it("overwrites a previously stored id", () => {
    storePlayerId("BRDK", "player-123");
    storePlayerId("BRDK", "player-456");
    expect(getStoredPlayerId("BRDK")).toBe("player-456");
  });

  it("clears a stored id", () => {
    storePlayerId("BRDK", "player-123");
    clearStoredPlayerId("BRDK");
    expect(getStoredPlayerId("BRDK")).toBeNull();
  });

  it("keeps each Room's id separate, whatever the code's case", () => {
    storePlayerId("BRDK", "player-in-brdk");
    storePlayerId("QZTM", "player-in-qztm");

    expect(getStoredPlayerId("brdk")).toBe("player-in-brdk");
    expect(getStoredPlayerId("QZTM")).toBe("player-in-qztm");
    clearStoredPlayerId("BRDK");
    expect(getStoredPlayerId("QZTM")).toBe("player-in-qztm");
  });
});
