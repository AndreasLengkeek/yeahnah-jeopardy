import type { ActiveClue, GameState } from "@yeahnah/shared";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBoardAudio } from "./useBoardAudio";

function clue(overrides: Partial<ActiveClue> = {}): ActiveClue {
  return {
    categoryIndex: 0,
    tileIndex: 0,
    clueText: "clue",
    answer: "answer",
    revealed: false,
    buzzedPlayerId: null,
    excludedPlayerIds: [],
    correctPlayerId: null,
    ...overrides,
  };
}

function state(activeClue: ActiveClue | null): GameState {
  return { phase: "playing", players: [], content: [], board: [], activeClue, boardSoundMuted: false };
}

describe("useBoardAudio", () => {
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    playSpy = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    playSpy.mockRestore();
  });

  it("plays buzz.mp3 the instant a Player buzzes in on the current Active Clue", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: state(clue()) },
    });

    act(() => result.current.enableSound());
    playSpy.mockClear();

    rerender({ s: state(clue({ buzzedPlayerId: "p1" })) });

    expect(playSpy.mock.instances.some((audio) => (audio as HTMLAudioElement).src.endsWith("/audio/buzz.mp3"))).toBe(
      true,
    );
  });

  it("plays buzz.mp3 again when a second Player buzzes after the first was excluded", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: state(clue()) },
    });

    act(() => result.current.enableSound());
    rerender({ s: state(clue({ buzzedPlayerId: "p1" })) });
    rerender({ s: state(clue({ buzzedPlayerId: null, excludedPlayerIds: ["p1"] })) });
    playSpy.mockClear();

    rerender({ s: state(clue({ buzzedPlayerId: "p2", excludedPlayerIds: ["p1"] })) });

    expect(playSpy.mock.instances.some((audio) => (audio as HTMLAudioElement).src.endsWith("/audio/buzz.mp3"))).toBe(
      true,
    );
  });

  it("plays no one-shot cue while board sound is muted", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: { ...state(clue()), boardSoundMuted: true } },
    });

    act(() => result.current.enableSound());
    playSpy.mockClear();

    rerender({ s: { ...state(clue({ buzzedPlayerId: "p1" })), boardSoundMuted: true } });
    rerender({ s: { ...state(clue({ correctPlayerId: "p1" })), boardSoundMuted: true } });
    rerender({ s: { ...state(clue({ excludedPlayerIds: ["p1"] })), boardSoundMuted: true } });

    expect(playSpy).not.toHaveBeenCalled();
  });

  it("does not start the thinking loop while board sound is muted", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: { ...state(clue({ buzzedPlayerId: "p1" })), boardSoundMuted: true } },
    });

    act(() => result.current.enableSound());
    playSpy.mockClear();

    rerender({ s: { ...state(null), boardSoundMuted: true } });

    expect(playSpy).not.toHaveBeenCalled();
  });
});
