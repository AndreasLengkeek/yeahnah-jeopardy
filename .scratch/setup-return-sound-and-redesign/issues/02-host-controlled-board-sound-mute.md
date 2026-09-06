# 02: Host-controlled Board Sound mute

**What to build:** Give the Host a persistent, always-visible mute/unmute button (in the `Header`, present in every phase — setup, lobby, playing, gameOver) that silences or restores Board Sound on the Board's own device, independent of the Board's existing gesture-based "Enable Sound" unlock.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `GameState` gains `boardSoundMuted: boolean`, defaulting to `false` in `initialState()`.
- [ ] A new `toggleBoardSound` action flips `boardSoundMuted`; it applies in every phase (no phase guard).
- [ ] `boardSoundMuted` is not reset by `openLobby`, `startGame`, `returnToSetup`, or `resetGame` — it persists across phase transitions for the life of the Game (server-memory only, no durable persistence).
- [ ] The server wires a `toggleBoardSound` socket event to dispatch the new action, following the same pattern as every other no-payload action (e.g. `openLobby`, `resetGame`).
- [ ] `boardSoundMuted` reaches every socket role unredacted (Host, Board, Player) — no change needed to role-based view filtering since it isn't Host-only or Answer-shaped data.
- [ ] `useBoardAudio` gates every cue's playback (the `thinking` loop and every one-shot cue) on `enabled && !state.boardSoundMuted` — both the Board's own gesture-unlock and the Host's mute must allow sound for anything to play; neither bypasses the other.
- [ ] `Header` gains a mute/unmute button, rendered in every phase in a consistent position, whose label/appearance reflects the current `boardSoundMuted` value and which calls a supplied handler when clicked.
- [ ] `HostPage` renders this button in all phases, wired to emit `toggleBoardSound`.
- [ ] `shared/src/gameEngine.test.ts` covers: `initialState()` includes `boardSoundMuted: false`; `toggleBoardSound` flips the value and works from every phase (parametrize across phases, matching this file's existing `it.each` style).
- [ ] `client/src/useBoardAudio.test.ts` covers: when `state.boardSoundMuted` is `true`, no cue plays even when the Active Clue's fields change in ways that would otherwise trigger `buzz`/`correct`/`incorrect`, and the `thinking` loop does not start during `playing`.
- [ ] `client/src/components/Header.test.tsx` covers: the mute/unmute button renders, reflects muted vs. unmuted state in its accessible label, and calls its handler when clicked.
