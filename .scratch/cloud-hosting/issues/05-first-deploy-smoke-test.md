# 05: First deploy and remote smoke test

**What to build:** The first real public deploy, verified end-to-end by the Host from outside the home network. Requires a Render account and dashboard access, so it's a human ticket. Follow the setup guide from ticket 04.

**Blocked by:** 04 (Render blueprint and setup guide)

**Status:** ready-for-human

- [ ] Repo connected to Render via the blueprint; `HOST_PASSCODE` set in the dashboard
- [ ] Deploy succeeds and the health check passes
- [ ] From a phone on mobile data (off the home wifi), scanning the Board's Join QR code lands on the public join page
- [ ] Opening `/host` on a new device asks for the Host Passcode; the wrong one is refused, the right one is remembered across a refresh
- [ ] A short Game plays through remotely, including a Buzz and a judged Clue
- [ ] After ~15+ minutes idle, the next visit wakes the service within about a minute
- [ ] Any surprises noted under `## Comments` here (and the setup guide updated)
