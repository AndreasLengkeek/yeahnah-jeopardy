# 04: Room panel with live device counts

**What to build:** The Host screen gains the **Room panel** from prototype variant C. It shows:
- the Room Code (large) and the join address;
- "Here now": how many Host devices, Board screens and Players are connected right now, so the Host can tell if the TV dropped off;
- an Open Board link.

It's shown in full during Board Setup, the Lobby, the round break and Game Over. During play it collapses to a slim strip showing the Room Code that expands on demand, so the Clue controls keep their space. Tickets 05 and 06 add the Host link section and the danger zone. See `.scratch/concurrent-rooms/spec.md` (Room info for Hosts, Screens).

- The server tracks connected devices per Room by role, and sends a room-info event with the three counts to that Room's Host sockets only, whenever the counts change. It's kept separate from Game state.
- The collapsed-during-play layout wasn't prototyped. Check it on a phone-sized Host screen.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Server tests: Host sockets receive room info whose counts change as Host, Board and Player sockets connect and disconnect
- [ ] Server tests: Board and Player sockets never receive room info, and counts never mix across Rooms
- [ ] Client tests (socket mocked): the panel shows the Room Code, join address and the three counts; Open Board links to `/CODE/board`
- [ ] Client tests: during play the panel is collapsed to the Room Code strip and expands on demand
- [ ] Checked by hand on a phone-sized Host screen during play
