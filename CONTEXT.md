# Yeah Nah Jeopardy

A real-time multiplayer Jeopardy-style party game: a shared Board driven by a Host, with Players buzzing in from their own phones.

## Language

**Game**:
One playthrough: a single Board played start to finish by whichever Players have joined. v1 has exactly one Game active at a time, and it holds no state beyond server memory — restarting the server ends it.
_Avoid_: Round, session (v1 has no multi-round structure and no concurrent games, so those distinctions don't exist yet)

**Board Setup**:
The Game's state before the Lobby opens: the Host creates a new Board or imports a Board Config, edits it in-app — including choosing its Category count — until every Tile has a Clue and Answer, and only then may open the Lobby for Players to join. The Category count is fixed once Board Setup ends. Opens pre-loaded with a complete, editable Board (the bundled example on first boot, or whichever Board was last played) rather than starting blank.
_Avoid_: create room, room (v1 has exactly one Game at a time — see Game — so this isn't a multi-tenant "room")

**Board Config**:
The file a Host imports or exports during Board Setup to save a Board's authored content — each Category's name and its five Clues' text and Answers. Holds Board content only, never Game state (no used Tiles, no scores, no Buzz/score progress), and is the only durable copy of a Board: v1 keeps no board library server-side beyond memory.
_Avoid_: save file, board data

**Lobby**:
The Game's state after Board Setup ends and before the Host starts it: Players join by choosing a name and appear at $0, and the Host starts the Game once at least two have joined. Joining closes the moment the Game starts — a Player who already joined may reconnect after that, but no new Player may.
_Avoid_: waiting room

**Board**:
The grid of Tiles for the current game — three to six Categories across (chosen by the Host during Board Setup), five Values down.
_Avoid_: grid, gameboard

**Category**:
A themed column of five Clues on the Board, ordered by increasing Value.

**Tile**:
A single cell on the Board showing a Value; selecting it makes its Clue the Active Clue and empties the Tile.
_Avoid_: cell, square

**Clue**:
The prompt text behind a Tile. Has a matching Answer, visible to the Host as soon as it becomes the Active Clue; visible to everyone else only once the Host Reveals it.
_Avoid_: question (a Clue is phrased as a statement; the Player's Buzz is what earns them the chance to phrase the Answer as a question)

**Value**:
The point amount a Clue is worth, shown on its Tile before selection and awarded to (or deducted from) whichever Player answers it.

**Host**:
The person driving the game: selects Tiles, sees each Clue's Answer as soon as it becomes Active, judges a Buzz as correct or incorrect without needing to Reveal first, and may Reveal an Answer publicly when no one currently holds the Buzz. May also directly set any Player's score to any value at any time the Scoreboard is visible — including mid-Clue and after Game Over — to correct a mis-judged Buzz or any other scoring mistake, with no confirmation step and no effect on Clue or Buzz state.
_Avoid_: moderator, admin

**Player**:
A participant with a name and score who can Buzz on the Active Clue from their own device. A Player identifies themselves at join time either by typing a name or by drawing a Signature — never both — and whichever they chose is used everywhere their identity is shown.
_Avoid_: contestant, user

**Signature**:
A Player's drawn, freehand alternative to typing a name, captured as a small raster image at join time. Stands in for a typed name wherever a Player's identity is shown — Scoreboard, Lobby roster, Buzz status — including places that would otherwise be a text sentence, which render it as an inline image instead. Never checked for uniqueness the way a typed name is: two Players may draw identical or similar Signatures.
_Avoid_: avatar, drawing (drawing is the act; Signature is the resulting identity)

**Buzz**:
A Player's claim to answer the Active Clue. The first Buzz the server receives wins; every other Player is locked out until the clue resolves. Not accepted once the Host has Revealed the Answer, or once a Player has already answered it correctly — either one ends the Clue's attempt loop.
_Avoid_: buzz in (as a noun), ring in

**Active Clue**:
The single Clue currently selected and on display. Only one Clue can be Active at a time; it must resolve (get judged correct and Closed, judged incorrect and reopened, or abandoned) before another Tile can be selected.

**Clue Card**:
The fullscreen display of the Active Clue, on the Board and Host screens. Zooms in from the selected Tile's position on the Board when selected, and zooms back out when the Clue resolves. On the Board and Player screens it has a Clue face (Category, Value, Clue text) and an Answer face it flips to when the Host Reveals. On the Host's screen it instead shows the Answer alongside the Clue face at all times — the Host's own card never flips.
_Avoid_: tile (a Clue Card isn't a Board Tile — it doesn't hold a Value or get marked used; it's a separate fullscreen view of whichever Tile is Active)

**Reveal**:
The Host's choice to flip the Clue Card to its Answer face for the Board and Players. Only available while no one currently holds the Buzz. Ends the Clue's attempt loop: once Revealed, no further Buzz is accepted, and the Host may Close the Clue regardless of how many Players have been excluded so far.
_Avoid_: show the answer (the Host always *sees* the Answer privately; Reveal names only this specific public act)

**Close**:
The Host's action that finalizes the Active Clue: marks its Tile used and clears it, zooming every screen back to the Board. Available whenever every joined Player has been excluded, nobody has attempted the Clue at all, it's been Revealed, or a Player has already answered it correctly. Never itself changes a score — that already happened (or never happens) at judge time; Close just ends the Clue's time on screen, whether or not the Host chose to Reveal first.
