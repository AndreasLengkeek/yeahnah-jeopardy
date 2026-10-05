# Independent Board Music and Board Effects toggles

Status: ready-for-agent

## Problem Statement

The Host has a single "Mute Board Sound" switch that silences everything the Board plays. During a Game the Host often wants only part of that audio. The looping Board Music while Players think can get grating over a long Game, or clash with music already playing in the room, but the Board Effects (Buzz landing, correct and incorrect Judge outcomes) are useful feedback the room relies on. Sometimes the reverse applies too. Right now the Host has to keep everything on or turn everything off.

## Solution

Board Sound splits into its two parts, **Board Music** and **Board Effects**, and each gets its own Host-controlled switch. The single "Mute Board Sound" button in the Host's Header is replaced by two icon toggles: a music note for Board Music and a speaker for Board Effects. Each is crossed out when muted. Each toggle works the way the old single switch did. It's one shared switch for the whole Game, controlled only by the Host, on when the Game begins, unchanged across every phase, and only affects audio on the Board's device. There is no master mute, because muting both toggles does that job. The Board's existing "Enable Sound" gesture unlock is unchanged, and one tap still unlocks both parts.

## User Stories

1. As a Host, I want to mute Board Music without muting Board Effects, so that the room still hears Buzz and Judge cues when the looping music gets repetitive.
2. As a Host, I want to mute Board Effects without muting Board Music, so that the thinking loop keeps the atmosphere going when the one-shot cues are too loud or distracting.
3. As a Host, I want to mute both Board Music and Board Effects, so that the Board goes completely silent when I need it to, for example while I'm talking to the room.
4. As a Host, I want to unmute either part independently at any time, so that I can bring back exactly the audio I want.
5. As a Host, I want each toggle to show at a glance whether its part is muted, so that I don't have to guess what the Board is currently playing.
6. As a Host, I want the two toggles to be compact icons in the Header, so that they don't crowd the controls I use during play.
7. As a Host, I want both toggles in the same place in every phase (Board Setup, Lobby, playing, Game Over), so that I can always find them.
8. As a Host, I want toggling a part to take effect on the Board immediately, so that my change takes effect immediately during a live Clue.
9. As a Host, I want both parts to be on when a new Game begins, so that the Board sounds right by default without me configuring anything.
10. As a Host, I want my mute choices to persist when I send the Game back to Board Setup, open the Lobby, start the Game, or reset it, so that I don't have to re-mute after every phase change.
11. As a Host, I want unmuting Board Music in the middle of a Clue to pick the loop up where it paused, so that the music doesn't jarringly restart.
12. As a Host, I want a Board Effects cue that happened while Board Effects was muted to be skipped rather than played late when I unmute, so that a stale Buzz or Judge sound never confuses the room.
13. As a Host using a screen reader, I want each toggle to have an accessible label that names its part and its action ("Mute Board Music" / "Unmute Board Music", "Mute Board Effects" / "Unmute Board Effects"), so that I can tell the two apart and know what pressing each one will do.
14. As a Host using a screen reader, I want each toggle to expose its pressed state, so that I can tell whether its part is currently muted.
15. As a Player, I want the Board's Buzz and Judge cues to keep playing when the Host only mutes Board Music, so that I still get clear feedback about whether I won the Buzz and whether I was right.
16. As a Board operator, I want the single "Enable Sound" tap to unlock both Board Music and Board Effects, so that I don't have to unlock audio twice.
17. As a Board operator, I want the Host's mute choices to apply on the Board without me touching the Board, so that the Board can stay a hands-off TV during play.
18. As a Player, I want the mute toggles to affect only the Board's audio and not give me any audio controls, so that sound stays a single shared experience in the room.

## Implementation Decisions

- **Game state shape:** the single `boardSoundMuted` flag is replaced by two independent booleans, one for Board Music and one for Board Effects (for example `boardMusicMuted` and `boardEffectsMuted`). Both default to `false` in the initial state. The old flag is removed rather than kept alongside them.
- **Actions:** the single `toggleBoardSound` action is replaced by two no-payload actions, one flipping each flag (for example `toggleBoardMusic` and `toggleBoardEffects`). Neither has a phase guard. Each flips only its own flag.
- **Persistence:** neither flag is reset by opening the Lobby, starting the Game, returning to Board Setup, or resetting the Game. Like today, they exist in server memory only and are lost when the server restarts.
- **Server wiring:** two socket events replace `toggleBoardSound`, following the existing pattern for no-payload actions. Both flags reach every socket role unredacted. They aren't Host-only or Answer-shaped data, so role-based view filtering doesn't need to change.
- **Board audio hook:** the hook keeps its single gesture-unlock (`enableSound`) for every audio element. The Board Music loop plays only when the device is unlocked, Board Music is unmuted, and the existing "nobody holds the Buzz during play" condition holds. One-shot Board Effects cues play only when the device is unlocked and Board Effects is unmuted. Neither flag affects the other part.
- **Resuming Board Music:** muting Board Music pauses the loop without rewinding it, so unmuting picks it up where it paused. This is the hook's current pause/play behaviour, kept as it is.
- **Skipping cues while muted:** while Board Effects is muted, the hook keeps tracking the Active Clue's buzz and judge fields, so a buzz or judge that happens while muted is recorded as already seen. Unmuting afterwards must not replay it. This extends the hook's existing "track the previous values while disabled" behaviour to the Board Effects flag alone.
- **Header:** the single labelled mute button is replaced by two icon toggle buttons, Board Music (a music note) and Board Effects (a speaker). Each is crossed out when muted. Each exposes `aria-pressed` set to its muted state, and an accessible label that names its part and action ("Mute Board Music" / "Unmute Board Music", "Mute Board Effects" / "Unmute Board Effects"). The Header takes each part's muted state and handler as props, and renders the pair only when both are supplied, matching the current optional-prop pattern.
- **Host page:** renders both toggles in every phase, each wired to emit its own socket event.
- **Glossary:** `CONTEXT.md` already defines Board Sound as the umbrella, with Board Music and Board Effects as its two independently mutable parts. Code, labels and tests use those terms, not "background music", "thinking music", "sound effects" or "sfx".

## Testing Decisions

- Good tests here drive each module through its public surface: reducer actions in and state out, socket events in and broadcast state out, `GameState` in and audio played out, props in and rendered or clicked UI out. They assert observable behaviour, not internal refs or effect wiring.
- **Game engine reducer:** covers the initial state having both parts unmuted. It covers each toggle flipping only its own flag and working from every phase, parametrized across phases in the file's existing `it.each` style. It covers both flags surviving Lobby, start, return-to-Setup and reset. Prior art: the existing `toggleBoardSound` reducer tests.
- **Server socket wiring:** covers each new event reaching every socket role (Host, Board, Player) unredacted. Prior art: the existing "wires toggleBoardSound through to every socket role without redacting it" test.
- **Board audio hook:** most of the tests go here. It covers:
  - With Board Music muted, the loop doesn't play during play, but Buzz, correct and incorrect cues still fire.
  - With Board Effects muted, no cue fires, but the loop still plays when nobody holds the Buzz.
  - With both muted, nothing plays.
  - Unmuting Board Music resumes the loop without rewinding it.
  - A buzz or judge that happens while Board Effects is muted is not played after unmuting.
  - Nothing plays before the gesture unlock, whatever the flags say.

  Prior art: the existing `boardSoundMuted` cases in the hook's test file.
- **Header component:** covers both toggles rendering, each reflecting its muted state through its accessible label and pressed state, and each calling only its own handler when clicked. Prior art: the existing mute-button tests in the Header test file.
- The existing `boardSoundMuted` and `toggleBoardSound` tests are rewritten for the two new flags rather than kept.

## Out of Scope

- Any new music, such as Lobby, Board Setup or Game Over music. Board Music is only the existing loop.
- Volume sliders or any level control other than on and off.
- Audio controls on a Player's or the Host's own device, or any per-device setting.
- Letting the Board's device change the toggles itself.
- A master mute in addition to the two toggles.
- Persisting the toggles beyond server memory (for example in a Board Config or browser storage).
- Changing which cues exist or how variants are chosen.

## Further Notes

- This replaces the single Host-controlled mute delivered by `.scratch/setup-return-sound-and-redesign/issues/02-host-controlled-board-sound-mute.md`. That work's phase-independence, unredacted broadcast and gesture-unlock rules all carry over unchanged to each of the two new toggles.
- `CONTEXT.md` was updated during the grilling session, so it already reflects the split.
- No ADR was recorded, because the split is easy to reverse.
