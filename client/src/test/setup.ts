import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Newer Node versions ship an experimental global `localStorage` getter that shadows
// jsdom's own implementation and resolves to undefined unless a --localstorage-file was
// passed, breaking any test that touches localStorage. Fill in an in-memory Storage only
// when that's happened, so environments where jsdom's real implementation works untouched.
if (typeof window.localStorage === "undefined") {
  class MemoryStorage implements Storage {
    #store = new Map<string, string>();

    get length() {
      return this.#store.size;
    }

    clear() {
      this.#store.clear();
    }

    getItem(key: string) {
      return this.#store.has(key) ? this.#store.get(key)! : null;
    }

    key(index: number) {
      return Array.from(this.#store.keys())[index] ?? null;
    }

    removeItem(key: string) {
      this.#store.delete(key);
    }

    setItem(key: string, value: string) {
      this.#store.set(key, String(value));
    }
  }

  Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), configurable: true });
}

afterEach(() => {
  cleanup();
});
