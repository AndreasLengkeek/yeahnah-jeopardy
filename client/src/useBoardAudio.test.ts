import type { ActiveClue, GameState } from "@yeahnah/shared";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBoardAudio } from "./useBoardAudio";

const CORRECT_SRCS = ["/audio/correct.mp3", "/audio/correct-2.m4a"];
const INCORRECT_SRCS = ["/audio/incorrect.mp3", "/audio/incorrect-2.mp3", "/audio/incorrect-3.m4a"];

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
    isDailyDouble: false,
    ...overrides,
  };
}

function state(activeClue: ActiveClue | null): GameState {
  return {
    phase: "playing",
    players: [],
    content: [],
    board: [],
    activeClue,
    boardSoundMuted: false,
    dailyDouble: null,
  };
}

describe("useBoardAudio", () => {
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    playSpy = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function playedSrcs() {
    return playSpy.mock.instances.map((audio) => new URL((audio as HTMLAudioElement).src).pathname);
  }

  it("plays buzz.mp3 the instant a Player buzzes in on the current Active Clue", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: state(clue()) },
    });

    act(() => result.current.enableSound());
    playSpy.mockClear();

    rerender({ s: state(clue({ buzzedPlayerId: "p1" })) });

    expect(playedSrcs()).toContain("/audio/buzz.mp3");
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

    expect(playedSrcs()).toContain("/audio/buzz.mp3");
  });

  it("plays a known correct-sound variant when a Buzz is judged correct", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: state(clue()) },
    });

    act(() => result.current.enableSound());
    playSpy.mockClear();

    rerender({ s: state(clue({ correctPlayerId: "p1" })) });

    expect(CORRECT_SRCS).toContain(playedSrcs()[0]);
  });

  it("plays a known incorrect-sound variant when a Buzz is judged incorrect", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: state(clue({ buzzedPlayerId: "p1" })) },
    });

    act(() => result.current.enableSound());
    rerender({ s: state(clue({ buzzedPlayerId: null, excludedPlayerIds: ["p1"] })) });
    playSpy.mockClear();

    rerender({ s: state(clue({ excludedPlayerIds: ["p1", "p2"] })) });

    expect(INCORRECT_SRCS).toContain(playedSrcs()[0]);
  });

  it("uses Math.random to choose different correct-sound variants on different firings", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: state(clue()) },
    });

    act(() => result.current.enableSound());
    playSpy.mockClear();

    rerender({ s: state(clue({ correctPlayerId: "p1" })) });
    const firstSrc = playedSrcs()[0];

    randomSpy.mockReturnValue(0.999999);
    rerender({ s: state(clue()) });
    playSpy.mockClear();

    rerender({ s: state(clue({ correctPlayerId: "p2" })) });
    const secondSrc = playedSrcs()[0];

    expect(firstSrc).toBe(CORRECT_SRCS[0]);
    expect(secondSrc).toBe(CORRECT_SRCS[1]);
  });

  it("uses Math.random to choose different incorrect-sound variants on different firings", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: state(clue({ excludedPlayerIds: ["p1"] })) },
    });

    act(() => result.current.enableSound());
    playSpy.mockClear();

    rerender({ s: state(clue({ excludedPlayerIds: ["p1", "p2"] })) });
    const firstSrc = playedSrcs()[0];

    randomSpy.mockReturnValue(0.999999);
    rerender({ s: state(clue()) });
    rerender({ s: state(clue({ excludedPlayerIds: ["p3"] })) });
    playSpy.mockClear();

    rerender({ s: state(clue({ excludedPlayerIds: ["p3", "p4"] })) });
    const secondSrc = playedSrcs()[0];

    expect(firstSrc).toBe(INCORRECT_SRCS[0]);
    expect(secondSrc).toBe(INCORRECT_SRCS[2]);
  });

  it("keeps thinking and buzz on their single existing files", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: state(clue()) },
    });

    act(() => result.current.enableSound());

    expect(playedSrcs()).toContain("/audio/thinking.mp3");

    playSpy.mockClear();
    rerender({ s: state(clue({ buzzedPlayerId: "p1" })) });

    expect(playedSrcs()).toEqual(["/audio/buzz.mp3"]);
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
