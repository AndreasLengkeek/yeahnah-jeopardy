# Concurrent Rooms (Phase 2: several Games side by side)

Status: ready-for-agent

## Problem Statement

The public deploy runs exactly one Game at a time. If two friend groups want to play on the same night, the second has to wait, or they collide in one Game where both Hosts can run each other's Board and see each other's Answers. There's also only one Host Passcode, so anyone who can host one Game can host every Game. Players have no way to say which Game they mean: the Join QR code and `/join` always lead to "the" Game.

## Solution

The server holds many **Rooms** at once. Each has a short **Room Code** and holds one Game at a time. Creating a Room needs the operator's **Room Passcode**. The server then hands the creating device that Room's **Host Key**, which proves Host for that Room only, and the Host can pass it to other devices through a Host link. Every screen's address carries the Room Code (`/BRDK/host`, `/BRDK/board`, `/BRDK/join`), and the Board's Join QR code points into its own Room. Players type the code on a code-first home page or scan the QR code. Rooms are fully isolated from one another. A Room ends when its Host closes it, after 30 minutes with no Host or Player device connected, or after 4 hours with no Host action. Capacity guards (live Room cap, Players-per-Room cap, Signature and text size caps, Signature images leaving the state broadcast) keep the single free-tier instance healthy as Rooms multiply. Successive Games in a Room keep their Players: Play again and Back to Board Setup no longer clear the roster.

Decisions are recorded in ADR-0015 (concurrent Rooms: Room Passcode to create, Host Key to host), which supersedes ADR-0001's one-Game rule and ADR-0014's Host Passcode. Terms are defined in the glossary: Room, Room Code, Room Passcode, Host Key. The lifecycle rules were exercised in a click-through prototype, and the screens were chosen from three UI variants. Both are on the throwaway branch `prototype/rooms`.

## User Stories

**Creating a Room**

1. As a Host, I want to create a Room from the home page by entering the Room Passcode, so that I can start a game night without anyone setting anything up on a server.
2. As a Host, I want to land on my new Room's Host screen straight after creating it, so that I can get into Board Setup immediately.
3. As a Host, I want my device to remember it's the Host of my Room, so that a reload or dropped connection doesn't lock me out.
4. As a Host, I want to be told clearly when the Room Passcode is wrong, so that I know to check it rather than wait.
5. As a Host, I want to be told when the server is at capacity, so that I know to try again later instead of thinking it's broken.
6. As a Host, I want a brand-new Room to open with the bundled example Board, so that I never inherit another group's Board.
7. As the operator, I want creating a Room to require the Room Passcode, so that only people I trust can use my server.
8. As a developer running locally with no Room Passcode configured, I want creating Rooms to just work (with a console warning), so that local play is as easy as today.

**Hosting from several devices**

9. As a Host, I want to copy a Host link from my Room panel, so that I can host from my laptop as well as my phone.
10. As a Host, I want a warning next to the Host link that anyone holding it can run the Game, so that I don't put it on the Board or in the group chat.
11. As a Host on a second device, I want opening the Host link to make that device a Host of the Room and remember it, so that it keeps working after a reload.
12. As a Host, I want every device that holds the Host Key to be able to act as Host at the same time, so that handing over between phone and laptop is seamless.
13. As a Host, I want the Host Key never to show in my address bar after the Host link is opened, so that a screen share or screenshot doesn't leak it.

**Losing the Host Key**

14. As a Host whose browser storage was wiped, I want my Room's Host screen to tell me this device isn't the Host, so that I understand why I can't see the Board Setup or Answers.
15. As a Host who lost the Host Key, I want to reclaim Host of my Room with the Room Passcode, so that the Game doesn't die because my phone did.
16. As a Host, I want reclaiming Host to leave my other Host devices working, so that the laptop doesn't get kicked out when my phone reclaims.
17. As a Host, I want a wrong Room Passcode on the reclaim screen to be refused with a message, so that I know to try again.

**Joining a Room**

18. As a Player, I want to type a Room Code on the home page, so that I can join without needing a link.
19. As a Player, I want to scan the Board's Join QR code and land directly on that Room's join page, so that joining is one step.
20. As a Player, I want the Room Code entry to accept lower-case letters, so that I don't fumble with caps on my phone.
21. As a Player, I want to be told when no Room has that code, so that I can check it with the Host.
22. As a Player, I want to be told when a Room is full, so that I know it's not a problem with my phone.
23. As a Player who already joined, I want to always be able to reconnect even if the Room filled up while I was away, so that a dropped connection doesn't cost me my seat.
24. As a Player, I want my device to remember which Player I am in each Room separately, so that last week's Room doesn't confuse this week's.
25. As a Player, I want a bare `/join` address to show Room Code entry, so that old bookmarks and typed addresses still lead somewhere useful.

**The Board's screen**

26. As a Host, I want an "Open Board" link on my Room panel, so that I can put the Board on the TV without typing an address.
27. As a Player in the living room, I want the Board's Lobby to show the Room Code as large Board-Tile letters next to the QR code, so that I can read it from the couch if my camera won't scan.
28. As a Player, I want the Board's Lobby to tell me which address to type the code into, so that I can join from a phone that can't scan.
29. As a Host, I want the Board to never need any credential, so that any TV or laptop can show it.

**The Room panel (Host screen)**

30. As a Host, I want a Room panel beside my Host screen showing the Room Code and join address, so that I can read it out to remote Players.
31. As a Host, I want the Room panel to show how many Host devices, Board screens, and Players are connected right now, so that I can tell whether the TV dropped off.
32. As a Host, I want the Room panel to remind me the Room ends by itself after everyone leaves, so that I'm not worried about leaving it open.
33. As a Host, I want the Room panel to stay out of my way during play, so that the Clue controls get the room they need.

**Isolation between Rooms**

34. As a Host, I want nothing in another Room to ever appear on my screens, so that two game nights never bleed into each other.
35. As a Host, I want the Host of another Room to be unable to act in mine even if they type my Room Code into their Host address, so that each Room is controlled only by its own Host.
36. As a Player, I want my Buzzes and Wagers to only ever affect my own Room, so that someone in another Room can't interfere.
37. As a Host, I want another Room's Answers never to reach any device in my Room, and mine never to reach theirs, so that the Answer-withholding rule holds across Rooms.

**Successive Games in one Room**

38. As a Host, I want Play again after Game Over to keep every Player joined at $0, so that the group doesn't have to rejoin for a second Game.
39. As a Host, I want new Players to still be able to join the fresh Lobby after Play again, so that a late arrival can jump into the next Game.
40. As a Host, I want going Back to Board Setup after Game Over to keep the Players joined, so that I can edit the Board for the next Game without losing anyone.
41. As a Player, I want to stay on my "waiting" screen across Play again and Board Setup, so that I don't have to rejoin.
42. As a Host, I want the next Game in my Room to open with the Board we last played, so that a quick rematch needs no re-authoring.

**Ending a Room**

43. As a Host, I want a Close Room action with an in-app confirmation, so that I can end the night deliberately and not by accident.
44. As a Host, I want closing the Room to end the Game for every device at once, so that nobody is left on a frozen screen.
45. As a Host or Board, I want a closed or expired Room's screen to show "This Room has ended", so that it's obvious the night is over.
46. As a Player, I want my phone to drop back to plain Room Code entry when my Room ends, so that I can join another Room as if fresh.
47. As the operator, I want a Room with no Host or Player device connected for 30 minutes to end by itself, so that abandoned Rooms free their slot.
48. As the operator, I want a Board screen left on a TV to not keep a Room alive, so that a forgotten TV doesn't hold a slot forever.
49. As the operator, I want a Room with no Host action for 4 hours to end, so that a Room whose devices stay connected but idle still eventually frees its slot.
50. As a Host whose phone died mid-Game, I want the Room to hang on while the Players are still connected, so that I can come back and finish.

**Server health**

51. As the operator, I want a cap of 20 live Rooms, so that the free-tier instance can't be overloaded.
52. As the operator, I want a cap of 12 Players per Room, so that one Room can't swamp the server.
53. As the operator, I want Signatures over a size limit to be refused at join and edit, so that one huge drawing can't bloat every broadcast.
54. As the operator, I want names, Category names, Clues, and Answers to have length limits enforced on the server, so that nobody can push megabytes through a text field.
55. As a Player on mobile data, I want a Buzz to send only a few KB to my phone, not every Signature again, so that the game feels instant and doesn't eat my data.
56. As a Player, I want other Players' Signatures to still appear everywhere they do today, so that the slimmer broadcast changes nothing visible.
57. As the operator, I want deploys to be manual rather than automatic on every merge, so that a merge on game night doesn't end everyone's Games.
58. As the operator, I want the server's log lines to say which Room each event happened in, so that I can follow several Games in one log.

## Implementation Decisions

**Server: a registry of Rooms instead of one Game**

- The game server factory's single module-level Game state becomes a registry of Rooms keyed by Room Code. Each Room holds its own Game state (the game engine is unchanged in shape: one state, one `applyAction`), its Host Key, when its last Host action happened, since when it has had no Host or Player device connected, and its connected devices by role. Trimmed from the lifecycle prototype, the Room record is roughly:

  ```ts
  interface Room {
    code: string;               // 4 letters, upper-case
    hostKey: string;            // random, server-issued
    game: GameState;            // exactly what the single Game is today
    lastHostActionAt: number;   // creation counts as a Host action
    emptySince: number | null;  // null while any Host or Player device is connected
  }
  ```

- **Every socket is bound to at most one Room.** All Game and Host events act on the bound Room's state only. A socket with no Room bound (e.g. the home page) can only create a Room. Broadcasts go only to sockets bound to that Room, each redacted by its role exactly as today (ADR-0006). The current broadcast-to-every-socket loop must not survive.
- **Room Codes:** 4 letters from a consonant-only alphabet with confusable letters removed (no vowels, no I/O), so codes never spell words. Matched case-insensitively and displayed upper-case. A code is never shared by two live Rooms, and becomes free again as soon as its Room ends. There is no reuse cool-down (accepted in ADR-0015).
- **Host Keys** are random, unguessable strings issued at Room creation. The Room Passcode and the Host Key are compared in constant time, as the Host Passcode is today.

**Socket contract**

- **Create a Room:** a new event carrying the Room Passcode, acknowledged with either the new Room Code and Host Key, or a refusal reason: wrong passcode, or server at capacity. With no Room Passcode configured, any passcode (including none) is accepted.
- **Declare role (`identify`)** now also carries the Room Code, alongside the role and, for `host`, the Host Key (replacing today's passcode argument). The acknowledgement answers one of:
  - **accepted**;
  - **rejected**: a `host` claim without the right Host Key. The socket stays bound to the Room with the Player view, as today;
  - **no Room**: the code isn't live, distinguishing a Room that has **ended** from a code that **doesn't exist**. The server remembers ended codes until they're reused.

  Re-sent on every reconnect, exactly as today.
- **Reclaim Host:** a new event carrying the Room Code and the Room Passcode. On success it acknowledges with that Room's *existing* Host Key, never a new one, and the socket is accepted as Host. A wrong passcode is refused.
- **Close Room:** a new Host-only event. The server ends the Room, tells every socket bound to it that the Room has ended, and unbinds them.
- **Room ended notice:** a new server-to-client event sent to every socket in a Room when it ends, for any reason.
- **Room info for Hosts:** a new server-to-client event sent only to Host sockets in a Room whenever its device counts change. It carries the counts of connected Host devices, Board screens, and Player devices. It is kept separate from Game state so the engine stays pure.
- Host-only gating stays in the socket layer: a Host event from a socket not accepted as Host *of its bound Room* is silently ignored. That gate is now always on, since every Room has a Host Key. The list of Host-only events is today's list plus Close Room.
- **Join refusals** gain "This Room is full." The Player cap applies to new joins only. Reconnecting as an already-joined Player always succeeds.

**Ending Rooms and time**

- **A Room ends when:**
  - its Host closes it;
  - no Host or Player device has been connected for 30 minutes (Board screens don't count);
  - or 4 hours pass since the last accepted Host event (creation counts).

  Ending a Room discards its Game.
- **The factory takes an injectable clock** (defaulting to real time) and returns a sweep operation that ends every Room past either limit. The process entry point runs the sweep on an interval (about once a minute). Tests advance the clock and call the sweep directly.

**Configuration and deploy**

- **The `HOST_PASSCODE` environment variable becomes `ROOM_PASSCODE`.** The factory option is renamed to match, and the start-up warning when it's unset now says that anyone can create Rooms *and reclaim Host of any Room*.
- **Caps are factory options with defaults:** 20 live Rooms and 12 Players per Room. The entry point uses the defaults.
- **The Render blueprint** renames the secret to the Room Passcode and turns auto-deploy off. The setup guide is updated to match, including how to deploy manually.

**Payload size**

- **Signature images leave the state broadcast.** In the view each socket receives, a Signature identity carries a Room-scoped, versioned image address in place of its data URL. The version changes whenever that Player redraws. The server serves the image at that address over plain HTTP with long-lived caching, so each device fetches each Signature once. The Player identity component keeps rendering it as an image source. Full data URLs stay in server memory only.
- **Server-side caps** (defaults; the implementer may tune them):
  - Signature data about 50 KB;
  - typed names 40 characters;
  - Category names 60 characters;
  - Clue text and Answers 500 characters each;
  - Board Config imports are bound by the same per-field caps.

  An over-cap Signature is refused at join or edit with a "try a simpler drawing" error. Over-long text is refused, the same way blank text is refused today.

**Game engine changes (game rules)**

- **Play again** (reset after Game Over, and from the Lobby or round break as today) keeps every joined Player, with scores set to $0, and still allows new joins in the fresh Lobby.
- **Back to Board Setup** from Game Over keeps every joined Player at $0, like the existing Lobby round trip (ADR-0008). After this change, Players only ever leave a Game's roster when its Room ends.
- The Player page's existing "roster cleared, send me back to the join form" behaviour stays as a safety net. It no longer fires on reset.

**Client routes and storage**

- **Routes:**
  - `/` is the home page;
  - `/join` is Room Code entry;
  - `/:code/host`, `/:code/board` and `/:code/join` are the three screens of a Room;
  - bare `/host` and `/board` redirect to `/`;
  - the catch-all redirects to `/`.

  The server's static fallback already serves the entry page for every client route.
- **The socket connection** is shared as today. Each Room screen identifies with its Room Code from the address.
- **The Host link** is `/:code/host#<hostKey>`. On load, the Host page moves the key from the fragment into storage and removes the fragment from the address.
- **Browser storage** of the Host Key and the Player id is keyed by Room Code. It replaces today's single remembered Host Passcode and single remembered Player id. A remembered Host Key or Player id that the Room rejects is forgotten, as today.
- **The Board's Join QR code** encodes `<origin>/<code>/join`.

**Screens (chosen from the UI prototype on `prototype/rooms`)**

- **Home (`/`), the code-first variant:**
  - the main action is Room Code entry, drawn as four Board-Tile letter boxes, with a Join button;
  - underneath, a quiet "Hosting tonight? Create a Room →" link expands into a Room Passcode field and a Create button;
  - wrong-passcode and at-capacity errors show inline under it.
- **Room Code entry (`/join`):** the same Tile-style entry. Unknown codes show "No Room with that code".
- **Room full:** a "Room full" title over dimmed code Tiles, with a short "ask the Host" line.
- **Host screen, Room panel variant:** a Room panel beside the existing Host screen with four sections:
  - the Room Code (large) and the join address;
  - "Here now": counts of Host devices, Board screens and Players;
  - "Hosting from another device": the Host link with Copy, the don't-show-it warning, and Open Board;
  - a danger zone: Close Room… with an in-place confirmation ("Close Room BRDK? The Game ends for everyone, right now.") and a note that the Room otherwise ends by itself 30 minutes after everyone leaves.

  The panel is shown in full during Board Setup, the Lobby, the round break and Game Over. During play it collapses to a slim strip showing the Room Code that expands on demand, so the Clue controls keep their space.
- **Host Key needed:** shown on a Room's Host screen when this device doesn't hold that Room's Host Key. It shows the Room Code Tiles, "You're not hosting this Room here", and a hint to open the Host link on this device. A Room Passcode field with Reclaim lets the operator take over. Nothing of the Game renders behind it, as with today's passcode prompt.
- **Board Lobby, code-first variant:** the Room Code as large Board-Tile letters with "Go to <host> and enter", then "or", then the Join QR code, side by side, with the Lobby roster underneath.
- **Room has ended:** the code-first variant. Shown on Host and Board screens: dimmed code Tiles, "This Room has ended", "Thanks for playing", and a link back to the home page. Player screens skip it and go straight to Room Code entry.

**Logging**

- Every Game event and Player connection log line is prefixed with its Room Code. Room creation, closing and expiry (with the reason) each get a log line.

## Testing Decisions

- Good tests exercise external behaviour only: what a real socket client can and can't do and what state and notices it receives, what a real HTTP request gets back, and what a person sees on the page. They never inspect the registry's internal maps.
- **Server socket seam (primary).** Extend the existing socket wiring tests, which start a real game server on a random port and drive it with real socket.io clients. A small helper creates a Room and returns its code and Host Key. Cover:
  - creating a Room with the right passcode, the wrong passcode, and no passcode configured; refusal at the live-Room cap;
  - claiming Host with the right Host Key (receives Answers) and a wrong or missing one (rejected, redacted view); identify on an ended code versus a never-used code;
  - isolation: two Rooms side by side, where Host actions, Buzzes and joins in one never change the other's state, and neither Room's sockets receive the other's broadcasts; the Host Key of Room A doesn't work in Room B;
  - reclaiming Host with the Room Passcode returns the same Host Key, the other Host sockets keep working, and a wrong passcode is refused;
  - Close Room from a Host ends the Room for every socket (ended notice), is ignored from a non-Host, and the code then reports ended;
  - expiry: advance the injected clock and sweep. A Room with no Host/Player sockets ends after 30 minutes and not before, and a connected Board alone doesn't keep it alive. A Room with no Host action ends after 4 hours even with Players connected. A Player reconnecting resets the 30-minute countdown;
  - the Player cap refuses the 13th join, while a reconnect at full still succeeds;
  - Signature: broadcasts carry an image address, not the data URL; an HTTP request to that address returns the image; redrawing changes the address; an over-cap Signature is refused at join and edit; over-long text fields are refused;
  - Room info events to Hosts reflect connects and disconnects by role, and are never sent to Board or Player sockets;
  - all existing behaviour tests keep passing once moved inside a created Room.

  Prior art: the existing connect/next-state helpers, the role-declaring connections, the Host Passcode tests, and the static-serving HTTP tests.
- **Game engine seam.** Extend the existing engine tests. Play again after Game Over keeps the roster at $0 and still accepts new joins. Back to Board Setup from Game Over keeps the roster at $0. Existing reset tests that expected an empty roster are updated. Prior art: the existing reset and return-to-setup tests.
- **Client page seam.** React Testing Library tests with the socket module mocked, in the style of the existing Host, Join and Board page tests. Cover:
  - the home page creates a Room and navigates to its Host screen, and shows wrong-passcode and capacity errors;
  - Room Code entry navigates to the Room's join page, and shows "No Room with that code";
  - the Host page stores a Host Key from the link fragment and strips it, shows Host Key needed when rejected and reclaims with the Room Passcode, and renders the Room panel with counts, Copy Host link and confirm-then-Close Room;
  - Room has ended appears on Host and Board pages, while a Player page goes to Room Code entry;
  - the Board Lobby shows the Room Code and a QR code for the Room's join address;
  - remembered Host Keys and Player ids are scoped per Room Code.
- **Not automatically tested:** the Render blueprint change and the manual-deploy guide, which are verified by a real deploy, two Rooms run side by side from different phones, and closing one while the other carries on.

## Out of Scope

- Public Room creation without the Room Passcode, and the abuse limits and rate limiting it would need. ADR-0015 leaves the door open by making the passcode optional later.
- Preventing a Player from acting as another Player *within* a Room. It stays deferred in `.scratch/cloud-hosting/issues/01-player-impersonation.md`, which now points at public Room creation as its trigger.
- Rotating the Host Key on reclaim, or revoking a lost device's Host Key.
- A cool-down before a Room Code can be reused.
- More than one server instance, shared state, or keeping Rooms alive across a restart or deploy (all Rooms are still in memory).
- Blocking a deploy while Rooms are live.
- State diffs or compression for broadcasts beyond moving Signatures out.
- Accounts, Room history, or a Board library.
- Latency-fair Buzz resolution (ADR-0003 unchanged).

## Further Notes

- The two prototypes are on the throwaway branch `prototype/rooms`:
  - a click-through demo of the Room lifecycle (open the server-side prototype HTML file by double-click);
  - three UI variants at `/prototype/rooms` in a dev build.

  The lifecycle demo's pure module is the closest thing to a reference for the registry rules.
- How the Room panel collapses during play wasn't prototyped. The decision above (a slim strip that expands on demand) is the starting point, and worth a quick look on a phone-sized Host screen during implementation.
- This touches nearly every socket test, because every test now needs a Room. Moving the existing tests into a created Room is mechanical but is the bulk of the diff, so landing it first, as its own ticket with no behaviour change beyond Rooms existing, would keep later tickets small.
