import type { ActiveClue, GameState } from "@yeahnah/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
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
    clueShown: true,
    wageringPlayerId: null,
    wager: null,
    ...overrides,
  };
}

// jsdom has no navigator.getAutoplayPolicy; tests install one (or remove it, to exercise
// the play() probe fallback). Defaults to a browser that blocks autoplay.
function setAutoplayPolicy(policy: string | undefined) {
  if (policy === undefined) {
    delete (navigator as { getAutoplayPolicy?: unknown }).getAutoplayPolicy;
  } else {
    Object.defineProperty(navigator, "getAutoplayPolicy", { value: () => policy, configurable: true });
  }
}

function state(activeClue: ActiveClue | null): GameState {
  return {
    phase: "playing",
    players: [],
    content: [],
    board: [],
    activeClue,
    boardMusicMuted: false,
    boardEffectsMuted: false,
    dailyDouble: null,
    doubleJeopardyDailyDoubles: null,
    twoRounds: false,
    round: 1,
    doubleJeopardyContent: null,
  };
}

describe("useBoardAudio", () => {
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    playSpy = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    setAutoplayPolicy("disallowed");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setAutoplayPolicy(undefined);
  });

  function playedSrcs() {
    // Cue files only — the auto-unlock's inaudible probe isn't a cue.
    return playSpy.mock.instances
      .map((audio) => new URL((audio as HTMLAudioElement).src).pathname)
      .filter((path) => path.startsWith("/audio/"));
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

  it("plays nothing before the Board's gesture unlock, whatever the mute switches say", () => {
    const { rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: state(clue()) },
    });

    rerender({ s: state(clue({ buzzedPlayerId: "p1" })) });
    rerender({ s: state(clue({ correctPlayerId: "p1" })) });
    rerender({ s: state(null) });

    expect(playSpy).not.toHaveBeenCalled();
  });

  it("keeps Board Effects playing while only Board Music is muted", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: { ...state(clue()), boardMusicMuted: true } },
    });

    act(() => result.current.enableSound());
    playSpy.mockClear();

    rerender({ s: { ...state(clue({ buzzedPlayerId: "p1" })), boardMusicMuted: true } });
    rerender({ s: { ...state(null), boardMusicMuted: true } });

    expect(playedSrcs()).toEqual(["/audio/buzz.mp3"]);
  });

  it("keeps Board Music looping while only Board Effects is muted", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: { ...state(clue({ buzzedPlayerId: "p1" })), boardEffectsMuted: true } },
    });

    act(() => result.current.enableSound());
    playSpy.mockClear();

    rerender({ s: { ...state(clue({ correctPlayerId: "p1" })), boardEffectsMuted: true } });
    rerender({ s: { ...state(clue({ excludedPlayerIds: ["p1"] })), boardEffectsMuted: true } });

    expect(playedSrcs()).toEqual(["/audio/thinking.mp3"]);
  });

  it("plays nothing while both Board Music and Board Effects are muted", () => {
    const muted = { boardMusicMuted: true, boardEffectsMuted: true };
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: { ...state(clue({ buzzedPlayerId: "p1" })), ...muted } },
    });

    act(() => result.current.enableSound());
    playSpy.mockClear();

    rerender({ s: { ...state(null), ...muted } });
    rerender({ s: { ...state(clue({ buzzedPlayerId: "p1" })), ...muted } });
    rerender({ s: { ...state(clue({ correctPlayerId: "p1" })), ...muted } });

    expect(playSpy).not.toHaveBeenCalled();
  });

  it("resumes Board Music where it paused when the Host unmutes it", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: state(clue()) },
    });

    act(() => result.current.enableSound());
    const thinking = playSpy.mock.instances
      .map((audio) => audio as HTMLAudioElement)
      .find((audio) => audio.src.endsWith("/audio/thinking.mp3"))!;
    thinking.currentTime = 12;

    rerender({ s: { ...state(clue()), boardMusicMuted: true } });
    playSpy.mockClear();
    rerender({ s: state(clue()) });

    expect(playedSrcs()).toEqual(["/audio/thinking.mp3"]);
    expect(thinking.currentTime).toBe(12);
  });

  it("skips a Board Effects cue that landed while muted rather than playing it on unmute", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: { ...state(clue()), boardEffectsMuted: true } },
    });

    act(() => result.current.enableSound());
    rerender({ s: { ...state(clue({ buzzedPlayerId: "p1" })), boardEffectsMuted: true } });
    playSpy.mockClear();

    rerender({ s: state(clue({ buzzedPlayerId: "p1" })) });

    expect(playSpy).not.toHaveBeenCalled();
  });

  it("skips a Judge outcome cue that landed while Board Effects was muted rather than playing it on unmute", () => {
    const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
      initialProps: { s: { ...state(clue({ buzzedPlayerId: "p1" })), boardEffectsMuted: true } },
    });

    act(() => result.current.enableSound());
    rerender({ s: { ...state(clue({ correctPlayerId: "p1" })), boardEffectsMuted: true } });
    playSpy.mockClear();

    rerender({ s: state(clue({ correctPlayerId: "p1" })) });

    expect(playSpy).not.toHaveBeenCalled();
  });

  describe("auto-unlock on load", () => {
    it("enables Board Sound with no gesture when the browser's autoplay policy allows it", async () => {
      setAutoplayPolicy("allowed");
      const { result } = renderHook(() => useBoardAudio(state(clue())));

      await waitFor(() => expect(result.current.enabled).toBe(true));
      expect(playedSrcs()).toEqual(["/audio/thinking.mp3"]);
    });

    it("stays locked and plays nothing when the autoplay policy only allows muted playback", async () => {
      setAutoplayPolicy("allowed-muted");
      const { result } = renderHook(() => useBoardAudio(state(clue())));

      await act(async () => {});
      expect(result.current.enabled).toBe(false);
      expect(playSpy).not.toHaveBeenCalled();
    });

    it("falls back to a play() probe where getAutoplayPolicy is missing, and enables on success", async () => {
      setAutoplayPolicy(undefined);
      const { result } = renderHook(() => useBoardAudio({ ...state(clue()), boardMusicMuted: true }));

      await waitFor(() => expect(result.current.enabled).toBe(true));
      // Only the inaudible probe ran: no cue was played to test the waters.
      expect(playedSrcs()).toEqual([]);
    });

    it("stays locked when the play() probe is blocked", async () => {
      setAutoplayPolicy(undefined);
      playSpy.mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
      const { result } = renderHook(() => useBoardAudio(state(clue())));

      await act(async () => {});
      expect(result.current.enabled).toBe(false);
    });

    it("doesn't replay a Board Effects cue that landed before the auto-unlock", async () => {
      setAutoplayPolicy(undefined);
      let allow!: () => void;
      playSpy.mockReturnValueOnce(new Promise<void>((resolve) => (allow = resolve)));
      const { result, rerender } = renderHook(({ s }: { s: GameState }) => useBoardAudio(s), {
        initialProps: { s: state(clue()) },
      });

      rerender({ s: state(clue({ buzzedPlayerId: "p1" })) });
      await act(async () => allow());

      expect(result.current.enabled).toBe(true);
      expect(playedSrcs()).not.toContain("/audio/buzz.mp3");
    });
  });
});
