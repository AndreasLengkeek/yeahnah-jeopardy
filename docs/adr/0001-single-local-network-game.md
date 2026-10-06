# Single local-network Game, no rooms

v1 targets a living-room game night: the Host runs the server on their own machine and Players join over the same wifi, nothing public-facing. Given that, the server holds exactly one active Game at a time rather than supporting concurrent Games behind room/join codes. This keeps the session model trivial (no room isolation, no routing, no auth) at the cost of needing a real redesign later if the product ever needs to serve multiple simultaneous games or public internet users.

_Superseded in part by ADR-0014: the deploy is now public; the single-Game rule still stands._
