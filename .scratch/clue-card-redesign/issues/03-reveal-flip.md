# 03: Reveal flip — Clue Card flips to its Answer face

**What to build:** When the Host reveals the Answer, the Clue Card flips over (front face → back face) to show the Answer, replacing today's behavior of the Answer appearing inline below the Clue text. The Category/Value header, buzzed-player status text, and the Host's action buttons (Reveal, and eventually Correct/Incorrect once the game spec's judging ticket lands) stay fixed outside the flipping face — they never rotate, are never hidden mid-animation, and remain clickable throughout (see `ADR-0004`: the Clue Card flips as one object with fixed chrome, not two separate cards).

Target roughly 250–400ms for the flip, consistent with the zoom transition's pacing (ticket 02).

**Blocked by:** 01 (Clue Card layout redesign) — the flip needs the header already pinned outside a defined Clue/Answer content region; building the flip first would mean re-architecting that structure.

**Status:** done

- [x] Clicking Reveal visibly flips the Clue Card (front → back) instead of the Answer appearing inline.
- [x] The Answer appears on the Clue Card's back face, replacing the Clue text rather than sharing space with it.
- [x] The Category/Value header remains visible, in the same position, on both faces.
- [x] Buzzed-player status and the Host's action buttons remain fixed, visible, and clickable throughout the flip.
- [x] Applies identically on both the Board and Host views.
- [x] Flip duration is roughly 250–400ms.
- [x] Verified manually in a browser; no automated test required.
