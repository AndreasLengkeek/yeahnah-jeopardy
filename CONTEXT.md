# Yeah Nah Jeopardy

A real-time multiplayer Jeopardy-style party game: a shared Board driven by a Host, with Players buzzing in from their own phones.

## Language

**Game**:
One playthrough: a single Board played start to finish by whichever Players have joined. v1 has exactly one Game active at a time, and it holds no state beyond server memory — restarting the server ends it.
_Avoid_: Round, session (v1 has no multi-round structure and no concurrent games, so those distinctions don't exist yet)

**Lobby**:
The Game's state before the Host starts it: Players join by choosing a name and appear at $0, and the Host starts the Game once at least two have joined. Joining closes the moment the Game starts — a Player who already joined may reconnect after that, but no new Player may.
_Avoid_: waiting room

**Board**:
The 5x5 grid of Tiles for the current game — five Categories across, five Values down.
_Avoid_: grid, gameboard

**Category**:
A themed column of five Clues on the Board, ordered by increasing Value.

**Tile**:
A single cell on the Board showing a Value; selecting it makes its Clue the Active Clue and empties the Tile.
_Avoid_: cell, square

**Clue**:
The prompt text behind a Tile. Has a matching Answer, shown only after the Host reveals it.
_Avoid_: question (a Clue is phrased as a statement; the Player's Buzz is what earns them the chance to phrase the Answer as a question)

**Value**:
The point amount a Clue is worth, shown on its Tile before selection and awarded to (or deducted from) whichever Player answers it.

**Host**:
The person driving the game: selects Tiles, reveals Answers, and judges a Buzz as correct or incorrect.
_Avoid_: moderator, admin

**Player**:
A participant with a name and score who can Buzz on the Active Clue from their own device.
_Avoid_: contestant, user

**Buzz**:
A Player's claim to answer the Active Clue. The first Buzz the server receives wins; every other Player is locked out until the clue resolves.
_Avoid_: buzz in (as a noun), ring in

**Active Clue**:
The single Clue currently selected and on display. Only one Clue can be Active at a time; it must resolve (get judged, or be abandoned) before another Tile can be selected.
