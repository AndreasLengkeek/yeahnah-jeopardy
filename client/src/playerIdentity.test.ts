import { beforeEach, describe, expect, it } from "vitest";
import { clearStoredPlayerId, getStoredPlayerId, storePlayerId } from "./playerIdentity";

describe("playerIdentity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("has nothing stored by default", () => {
    expect(getStoredPlayerId()).toBeNull();
  });

  it("persists a stored id across reads", () => {
    storePlayerId("player-123");
    expect(getStoredPlayerId()).toBe("player-123");
  });

  it("overwrites a previously stored id", () => {
    storePlayerId("player-123");
    storePlayerId("player-456");
    expect(getStoredPlayerId()).toBe("player-456");
  });

  it("clears a stored id", () => {
    storePlayerId("player-123");
    clearStoredPlayerId();
    expect(getStoredPlayerId()).toBeNull();
  });
});
