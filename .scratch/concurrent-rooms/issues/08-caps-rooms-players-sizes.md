# 08: Caps on Rooms, Players, Signature size, and text length

**What to build:** Guards that keep the single free-tier instance healthy:
- **Room cap:** at most 20 live Rooms. Creating a 21st shows "the server is at capacity, try again in a bit" on the home page.
- **Player cap:** at most 12 Players per Room. Joining a full Room shows the **Room full** page (prototype variant B: "Room full" over dimmed code Tiles, with an "ask the Host" line). A Player who already joined can always reconnect, even when the Room is full.
- **Size caps:** Signatures over the size limit are refused at join and edit, with a "try a simpler drawing" error. Over-long names, Category names, Clues and Answers are refused, including inside an imported Board Config.

See `.scratch/concurrent-rooms/spec.md` (Configuration, Payload size).

- The caps are factory options with defaults: 20 Rooms and 12 Players. The size caps default to about 50 KB for a Signature, 40 characters for names, 60 for Category names, and 500 each for Clue text and Answers; tune them if needed.
- The create-Room acknowledgement gains an at-capacity reason, and join gains "This Room is full."

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Server tests: creating a Room at the Room cap is refused as at capacity, and succeeds again once a Room ends
- [ ] Server tests: the 13th join is refused as full; a joined Player's reconnect at full succeeds
- [ ] Server tests: an over-cap Signature is refused at join and at edit; over-long text is refused for names, Category names, Clues and Answers, including through Board Config import
- [ ] Client tests (socket mocked): the home page shows the capacity error; the join page shows Room full; the join form shows the Signature-too-big error
