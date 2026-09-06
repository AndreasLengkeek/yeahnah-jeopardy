# 03: Random correct/incorrect sound variants

**What to build:** Give the `correct` and `incorrect` Board Sound cues several recorded variants each, with one chosen at random every time that cue fires, so judged Clues don't sound identical all Game long. The `thinking` loop and `buzz` one-shot stay single files, unchanged.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `useBoardAudio` replaces the single `correct` and `incorrect` `HTMLAudioElement`s with an explicit, hardcoded list of file paths per cue, matching whatever variant files are actually present in `client/public/audio/` at implementation time (mixed file extensions across variants are fine).
- [ ] Each cue with multiple variants preloads one `HTMLAudioElement` per variant up front (same construction timing/lifecycle as today's single elements).
- [ ] When a cue with variants fires, one variant is chosen at random and played; the choice only needs to vary across separate firings, not mid-playback.
- [ ] `thinking` and `buzz` remain single files with no variant selection.
- [ ] The file-comment block at the top of `useBoardAudio.ts` is updated to describe the new per-cue variant-list convention, replacing its current "four files" description.
- [ ] `client/src/useBoardAudio.test.ts` covers: when a cue with multiple variants fires, the played element's `src` is a member of that cue's known variant set (not just equal to one fixed URL); mocking `Math.random` to a couple of different values selects different variants; the existing single-variant assertions for `thinking`/`buzz` are unaffected.
