import { useEffect, useRef, useState } from "react";
import type { GameState } from "@yeahnah/shared";

const THINKING_SRC = "/audio/thinking.mp3";
const BUZZ_SRC = "/audio/buzz.mp3";
const CORRECT_SRCS = ["/audio/correct.mp3", "/audio/correct-2.m4a"];
const INCORRECT_SRCS = ["/audio/incorrect.mp3", "/audio/incorrect-2.mp3", "/audio/incorrect-3.m4a"];

function pickRandomAudio(audio: HTMLAudioElement[]) {
  return audio[Math.floor(Math.random() * audio.length)];
}

// Board-only sound. Expects one hardcoded file list per cue in client/public/audio/:
//   thinking      — single looping file while nobody holds the Buzz on the current (or no) Active Clue
//   buzz          — single one-shot file, fires the instant a Player buzzes in
//   correct       — one-shot variants, one chosen at random when a Buzz is judged correct
//   incorrect     — one-shot variants, one chosen at random when a Buzz is judged incorrect
// Browsers block audio until a user gesture, so nothing plays until enableSound() has
// run once — wired to the Board's Lobby-screen "Enable Sound" button.
export function useBoardAudio(state: GameState | null) {
  const [enabled, setEnabled] = useState(false);
  const thinkingRef = useRef<HTMLAudioElement | null>(null);
  const buzzRef = useRef<HTMLAudioElement | null>(null);
  const correctRef = useRef<HTMLAudioElement[] | null>(null);
  const incorrectRef = useRef<HTMLAudioElement[] | null>(null);
  const prevRef = useRef<{
    buzzedPlayerId: string | null;
    correctPlayerId: string | null;
    excludedCount: number;
  } | null>(null);

  if (!thinkingRef.current) {
    thinkingRef.current = new Audio(THINKING_SRC);
    thinkingRef.current.loop = true;
    buzzRef.current = new Audio(BUZZ_SRC);
    correctRef.current = CORRECT_SRCS.map((src) => new Audio(src));
    incorrectRef.current = INCORRECT_SRCS.map((src) => new Audio(src));
  }

  function enableSound() {
    for (const audio of [
      thinkingRef.current,
      buzzRef.current,
      ...(correctRef.current ?? []),
      ...(incorrectRef.current ?? []),
    ]) {
      audio
        ?.play()
        .then(() => audio.pause())
        .catch(() => {});
    }
    setEnabled(true);
  }

  const activeClue = state?.activeClue ?? null;
  const boardSoundEnabled = enabled && !state?.boardSoundMuted;
  const shouldPlayThinking =
    boardSoundEnabled &&
    state?.phase === "playing" &&
    (!activeClue || (activeClue.buzzedPlayerId === null && !activeClue.revealed));

  useEffect(() => {
    if (shouldPlayThinking) thinkingRef.current?.play().catch(() => {});
    else thinkingRef.current?.pause();
  }, [shouldPlayThinking]);

  // Detects a buzz or a judge landing by diffing the Active Clue's own buzz/judge-derived
  // fields against their previous values — there's no discrete "buzz happened" or "judge
  // happened" event to hook, just the broadcast state before and after it.
  useEffect(() => {
    if (!boardSoundEnabled || !activeClue) {
      prevRef.current = activeClue
        ? {
            buzzedPlayerId: activeClue.buzzedPlayerId,
            correctPlayerId: activeClue.correctPlayerId,
            excludedCount: activeClue.excludedPlayerIds.length,
          }
        : null;
      return;
    }

    const prev = prevRef.current;
    if (prev && !prev.buzzedPlayerId && activeClue.buzzedPlayerId) {
      buzzRef.current?.play().catch(() => {});
    } else if (prev && !prev.correctPlayerId && activeClue.correctPlayerId) {
      pickRandomAudio(correctRef.current ?? [])?.play().catch(() => {});
    } else if (prev && activeClue.excludedPlayerIds.length > prev.excludedCount) {
      pickRandomAudio(incorrectRef.current ?? [])?.play().catch(() => {});
    }
    prevRef.current = {
      buzzedPlayerId: activeClue.buzzedPlayerId,
      correctPlayerId: activeClue.correctPlayerId,
      excludedCount: activeClue.excludedPlayerIds.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSoundEnabled, activeClue?.buzzedPlayerId, activeClue?.correctPlayerId, activeClue?.excludedPlayerIds.length]);

  return { enabled, enableSound };
}
