---
status: supersedes ADR-0010
---

# A Daily Double's wager ceiling is its own Round's static top Value, not one game-wide constant

ADR-0010 fixed the wager ceiling at the static $500 top Value, reasoned from a single-Round Board where $500 was the only top Value that could ever exist. Double Jeopardy introduces a second top Value ($1000), so a single game-wide constant would leave Double Jeopardy's own Daily Doubles capped below their own board. Instead, the ceiling is "the greater of the Player's current score or the static top Value of the Round the Daily Double belongs to" — $500 in Round 1, $1000 in Double Jeopardy — preserving ADR-0010's original reasoning (a fixed, board-printed ceiling rather than "whatever's left") while scoping it correctly to whichever Round is in play.
