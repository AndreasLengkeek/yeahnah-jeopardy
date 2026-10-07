import { beforeEach, describe, expect, it } from "vitest";
import { hostKeys, playerIds } from "./roomStorage";

describe("roomStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("has nothing stored by default", () => {
    expect(playerIds.get("BRDK")).toBeNull();
  });

  it("persists a stored id across reads", () => {
    playerIds.set("BRDK", "player-123");
    expect(playerIds.get("BRDK")).toBe("player-123");
  });

  it("overwrites a previously stored id", () => {
    playerIds.set("BRDK", "player-123");
    playerIds.set("BRDK", "player-456");
    expect(playerIds.get("BRDK")).toBe("player-456");
  });

  it("clears a stored id", () => {
    playerIds.set("BRDK", "player-123");
    playerIds.clear("BRDK");
    expect(playerIds.get("BRDK")).toBeNull();
  });

  it("keeps each Room's id separate, whatever the code's case", () => {
    playerIds.set("BRDK", "player-in-brdk");
    playerIds.set("QZTM", "player-in-qztm");

    expect(playerIds.get("brdk")).toBe("player-in-brdk");
    expect(playerIds.get("QZTM")).toBe("player-in-qztm");
    playerIds.clear("BRDK");
    expect(playerIds.get("QZTM")).toBe("player-in-qztm");
  });

  it("keeps the storage keys earlier versions of the app wrote", () => {
    hostKeys.set("brdk", "key-brdk");
    playerIds.set("brdk", "player-in-brdk");

    expect(localStorage.getItem("yeahnah-jeopardy:hostKey:BRDK")).toBe("key-brdk");
    expect(localStorage.getItem("yeahnah-jeopardy:playerId:BRDK")).toBe("player-in-brdk");
  });
});
