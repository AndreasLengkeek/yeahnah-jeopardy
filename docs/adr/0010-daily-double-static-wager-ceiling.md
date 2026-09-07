# A Daily Double's wager ceiling is the static $500 top Value, not the highest remaining Tile

The wager rule mirrors the real show: a Player may wager between $5 and the greater of their current score or the board's top Value. "The board's top Value" is ambiguous once play is underway, because every Category always has one Tile at each of $100–$500 (`VALUES` is fixed regardless of Category count) — but as Tiles get marked used, the highest value still *unused* at the moment a given Daily Double is drawn could be lower than $500.

We use the static $500 constant, not the highest remaining unused Tile. One fixed ceiling is simpler to validate against and explain, and it matches how the show's own rule reads — "the board's printed top value," not "whatever's left" — rather than making the cap depend on how much of the Board happens to be cleared when the Daily Double is found.
