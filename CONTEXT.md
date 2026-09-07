# Yeah Nah Jeopardy

A real-time multiplayer Jeopardy-style party game: a shared Board driven by a Host, with Players buzzing in from their own phones.

## Language

**Game**:
One playthrough: a single Board played start to finish by whichever Players have joined. v1 has exactly one Game active at a time, and it holds no state beyond server memory — restarting the server ends it.
_Avoid_: Round, session (v1 has no multi-round structure and no concurrent games, so those distinctions don't exist yet)

**Board Setup**:
The Game's state before the Lobby opens: the Host creates a new Board or imports a Board Config, edits it in-app — including choosing its Category count — until every Tile has a Clue and Answer, and only then may open the Lobby for Players to join. The Category count is fixed for as long as the Lobby stays open, but not permanently: the Host may resume Board Setup from the Lobby at any time before starting the Game, reopening the Category count and every other field, and already-joined Players stay joined across the round trip. Opens pre-loaded with a complete, editable Board (the bundled example on first boot, or whichever Board was last played) rather than starting blank.
_Avoid_: create room, room (v1 has exactly one Game at a time — see Game — so this isn't a multi-tenant "room")

**Board Config**:
The file a Host imports or exports during Board Setup to save a Board's authored content — each Category's name and its five Clues' text and Answers. Holds Board content only, never Game state (no used Tiles, no scores, no Buzz/score progress), and is the only durable copy of a Board: v1 keeps no board library server-side beyond memory.
_Avoid_: save file, board data

**Lobby**:
The Game's state after Board Setup ends and before the Host starts it: Players join by choosing a name and appear at $0, and the Host starts the Game once at least two have joined. Joining closes the moment the Game starts — a Player who already joined may reconnect after that, but no new Player may. The Host may instead send the Game back into Board Setup from here (see Board Setup) — this is a detour, not the Game starting, so it doesn't touch the roster.
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

**Daily Double**:
One Tile per Board, chosen at random when the Board is built and kept secret from everyone — including the Host — until selected. Its Clue is resolved by a single Host-designated Player's Wager instead of the Tile's printed Value and the usual Buzz race; the Value shown before selection is a decoy, never what's actually at stake.
_Avoid_: hidden tile, bonus tile

**Host**:
The person driving the game: selects Tiles, sees each Clue's Answer as soon as it becomes Active, judges a Buzz as correct or incorrect without needing to Reveal first, and may Reveal an Answer publicly when no one currently holds the Buzz. May also directly set any Player's score to any value at any time the Scoreboard is visible — including mid-Clue and after Game Over — to correct a mis-judged Buzz or any other scoring mistake, with no confirmation step and no effect on Clue or Buzz state.
_Avoid_: moderator, admin

**Player**:
A participant with a name and score who can Buzz on the Active Clue from their own device. A Player identifies themselves at join time either by typing a name or by drawing a Signature — never both — and whichever they chose is used everywhere their identity is shown. A Player may revisit and change this choice — a new typed name, a redrawn Signature, or switching between the two — any time before the Host starts the Game, subject to the same rules as a fresh join (no blank identity, no name collision with another Player).
_Avoid_: contestant, user

**Signature**:
A Player's drawn, freehand alternative to typing a name, captured as a small raster image at join time. Stands in for a typed name wherever a Player's identity is shown — Scoreboard, Lobby roster, Buzz status — including places that would otherwise be a text sentence, which render it as an inline image instead. Never checked for uniqueness the way a typed name is: two Players may draw identical or similar Signatures.
_Avoid_: avatar, drawing (drawing is the act; Signature is the resulting identity)

**Buzz**:
A Player's claim to answer the Active Clue. The first Buzz the server receives wins; every other Player is locked out until the clue resolves. Not accepted once the Host has Revealed the Answer, or once a Player has already answered it correctly — either one ends the Clue's attempt loop.
_Avoid_: buzz in (as a noun), ring in

**Wager**:
The amount a Daily Double's Host-designated Player stakes instead of Buzzing — a number between $5 and the greater of their current score or the board's static top Value, submitted once from their own device and final from that moment on. Replaces the Value as the amount added to (or deducted from) their score once the Host judges their answer; there is no Buzz race and no other Player ever gets a turn at this Clue.
_Avoid_: bet, bid

**Active Clue**:
The single Clue currently selected and on display. Only one Clue can be Active at a time; it must resolve (get judged correct and Closed, judged incorrect and reopened, or abandoned) before another Tile can be selected.

**Clue Card**:
The fullscreen display of the Active Clue, on the Board and Host screens. Zooms in from the selected Tile's position on the Board when selected, and zooms back out when the Clue resolves. On the Board and Player screens it has a Clue face (Category, Value, Clue text) and an Answer face it flips to when the Host Reveals; while a Buzz is held, the Clue face there swaps its Clue text for a banner naming whoever's buzzed, so nobody still waiting to buzz can keep reading. On the Host's screen it instead shows the Answer alongside the Clue face at all times — the Host's own card never swaps or flips.
_Avoid_: tile (a Clue Card isn't a Board Tile — it doesn't hold a Value or get marked used; it's a separate fullscreen view of whichever Tile is Active)

**Reveal**:
The Host's choice to flip the Clue Card to its Answer face for the Board and Players. Only available while no one currently holds the Buzz. Ends the Clue's attempt loop: once Revealed, no further Buzz is accepted, and the Host may Close the Clue regardless of how many Players have been excluded so far. Also triggered automatically the instant a Buzz is judged correct — the Host never needs a separate Reveal click once someone's already won the Clue (see ADR-0007).
_Avoid_: show the answer (the Host always _sees_ the Answer privately; Reveal names only this specific public act)

**Close**:
The Host's action that finalizes the Active Clue: marks its Tile used and clears it, zooming every screen back to the Board. Available whenever every joined Player has been excluded, nobody has attempted the Clue at all, it's been Revealed, or a Player has already answered it correctly. Never itself changes a score — that already happened (or never happens) at judge time; Close just ends the Clue's time on screen, whether or not the Host chose to Reveal first.

**Board Sound**:
The Board's own audio cues — a looping cue while nobody holds the Buzz, and a one-shot cue for a Buzz landing and for each Judge outcome, one of several variants chosen at random per cue. Silent until the Board's device confirms a user gesture (the browser's autoplay rule), and separately mutable at any time by the Host — one shared switch for the whole Game, the same in every phase, not a per-device or Player setting.
_Avoid_: sound effects, audio (Board Sound names specifically the Board's cues, not a Host's or Player's own device)
