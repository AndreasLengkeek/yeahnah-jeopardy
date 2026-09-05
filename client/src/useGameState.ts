import type { GameState } from "@yeahnah/shared";
import { useEffect, useState } from "react";
import { socket } from "./socket";

export function useGameState(): GameState | null {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    function onState(next: GameState) {
      setState(next);
    }
    socket.on("state", onState);
    return () => {
      socket.off("state", onState);
    };
  }, []);

  return state;
}
