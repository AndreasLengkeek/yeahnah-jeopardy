import type { ActiveClue as ActiveClueState, Category } from "@yeahnah/shared";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ActiveClueDetails } from "../activeClue";
import { zoomTransform } from "../geometry";
import { ActiveClue } from "./ActiveClue";
import { Board } from "./Board";

const TRANSITION_MS = 320;

const stageStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  position: "relative",
  display: "flex",
  flexDirection: "column",
};

const overlayBaseStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  transformOrigin: "center",
  transition: `transform ${TRANSITION_MS}ms ease`,
};

type Phase = "entering" | "settled" | "leaving";

interface OverlayState {
  tileKey: string;
  activeClue: ActiveClueState;
  details: ActiveClueDetails;
  transform: string;
  phase: Phase;
}

function tileKey(categoryIndex: number, tileIndex: number): string {
  return `${categoryIndex}-${tileIndex}`;
}

export function ClueCardStage({
  board,
  activeClue,
  details,
  onSelectTile,
  footer,
}: {
  board: Category[];
  activeClue: ActiveClueState | null;
  details: ActiveClueDetails | null;
  onSelectTile?: (categoryIndex: number, tileIndex: number) => void;
  footer?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tileEls = useRef(new Map<string, HTMLDivElement>());
  const closeTimeout = useRef<number | undefined>(undefined);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);

  const clueKey = activeClue ? tileKey(activeClue.categoryIndex, activeClue.tileIndex) : null;

  function registerTile(categoryIndex: number, tileIndex: number, el: HTMLDivElement | null): void {
    const key = tileKey(categoryIndex, tileIndex);
    if (el) tileEls.current.set(key, el);
    else tileEls.current.delete(key);
  }

  function transformToward(key: string): string {
    const container = containerRef.current;
    const tile = tileEls.current.get(key);
    if (!container || !tile) return "none";
    return zoomTransform(tile.getBoundingClientRect(), container.getBoundingClientRect());
  }

  // Opening: a new Active Clue appeared with no Clue Card currently on stage.
  // Mount the card already positioned at the source Tile's rect.
  useLayoutEffect(() => {
    if (clueKey && activeClue && details && !overlay) {
      window.clearTimeout(closeTimeout.current);
      setOverlay({ tileKey: clueKey, activeClue, details, transform: transformToward(clueKey), phase: "entering" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clueKey]);

  // Closing: the Active Clue resolved and cleared. Reverse-zoom the still-mounted
  // card back toward its origin Tile, then unmount it once the transition ends.
  useLayoutEffect(() => {
    if (!clueKey && overlay && overlay.phase !== "leaving") {
      window.clearTimeout(closeTimeout.current);
      setOverlay((current) =>
        current ? { ...current, transform: transformToward(current.tileKey), phase: "leaving" } : current,
      );
      closeTimeout.current = window.setTimeout(() => setOverlay(null), TRANSITION_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clueKey]);

  // While the card is on stage, keep its content (reveal state, buzzed player, etc.)
  // in sync with the latest broadcast without touching the zoom transform.
  useEffect(() => {
    if (clueKey && activeClue && details) {
      setOverlay((current) => (current && current.phase !== "leaving" ? { ...current, activeClue, details } : current));
    }
  }, [clueKey, activeClue, details]);

  // Once the entering frame has painted at the source rect, zoom to fullscreen.
  useLayoutEffect(() => {
    if (!overlay || overlay.phase !== "entering") return undefined;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setOverlay((current) => (current && current.phase === "entering" ? { ...current, transform: "none", phase: "settled" } : current));
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [overlay]);

  useEffect(() => () => window.clearTimeout(closeTimeout.current), []);

  const canSelectTile = !clueKey && !overlay;

  return (
    <div ref={containerRef} style={stageStyle}>
      <Board board={board} onSelectTile={canSelectTile ? onSelectTile : undefined} registerTile={registerTile} />
      {overlay && (
        <div style={{ ...overlayBaseStyle, transform: overlay.transform }}>
          <ActiveClue details={overlay.details} footer={footer} />
        </div>
      )}
    </div>
  );
}
