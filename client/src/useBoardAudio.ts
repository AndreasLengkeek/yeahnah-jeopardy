import { useEffect, useRef, useState } from "react";
import type { GameState } from "@yeahnah/shared";

// Board-only sound. Expects four files dropped into client/public/audio/:
//   thinking.mp3  — loops while nobody holds the Buzz on the current (or no) Active Clue
//   buzz.mp3      — one-shot, fires the instant a Player buzzes in
//   correct.mp3   — one-shot, fires the instant a Buzz is judged correct
//   incorrect.mp3 — one-shot, fires the instant a Buzz is judged incorrect
// Browsers block audio until a user gesture, so nothing plays until enableSound() has
// run once — wired to the Board's Lobby-screen "Enable Sound" button.
export function useBoardAudio(state: GameState | null) {
  const [enabled, setEnabled] = useState(false);
  const thinkingRef = useRef<HTMLAudioElement | null>(null);
  const buzzRef = useRef<HTMLAudioElement | null>(null);
  const correctRef = useRef<HTMLAudioElement | null>(null);
  const incorrectRef = useRef<HTMLAudioElement | null>(null);
  const prevRef = useRef<{
    buzzedPlayerId: string | null;
    correctPlayerId: string | null;
    excludedCount: number;
  } | null>(null);

  if (!thinkingRef.current) {
    thinkingRef.current = new Audio("/audio/thinking.mp3");
    thinkingRef.current.loop = true;
    buzzRef.current = new Audio("/audio/buzz.mp3");
    correctRef.current = new Audio("/audio/correct.mp3");
    incorrectRef.current = new Audio("/audio/incorrect.mp3");
  }

  function enableSound() {
    for (const audio of [thinkingRef.current, buzzRef.current, correctRef.current, incorrectRef.current]) {
      audio
        ?.play()
        .then(() => audio.pause())
        .catch(() => {});
    }
    setEnabled(true);
  }

  const activeClue = state?.activeClue ?? null;
  const shouldPlayThinking =
    enabled &&
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
    if (!enabled || !activeClue) {
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
      correctRef.current?.play().catch(() => {});
    } else if (prev && activeClue.excludedPlayerIds.length > prev.excludedCount) {
      incorrectRef.current?.play().catch(() => {});
    }
    prevRef.current = {
      buzzedPlayerId: activeClue.buzzedPlayerId,
      correctPlayerId: activeClue.correctPlayerId,
      excludedCount: activeClue.excludedPlayerIds.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, activeClue?.buzzedPlayerId, activeClue?.correctPlayerId, activeClue?.excludedPlayerIds.length]);

  return { enabled, enableSound };
}
