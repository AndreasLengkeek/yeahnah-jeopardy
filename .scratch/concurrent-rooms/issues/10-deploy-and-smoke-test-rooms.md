# 10: Deploy and smoke-test two Rooms side by side

**What to build:** Concurrent Rooms running on the public deploy, verified by hand. See `.scratch/concurrent-rooms/spec.md` (Testing Decisions → not automatically tested).

- In the Render dashboard, set `ROOM_PASSCODE` (and remove the old `HOST_PASSCODE`) **before** deploying. Deploys are now manual (ticket 01).
- Update the setup guide for the Room Passcode and manual deploys.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09

**Status:** ready-for-human

- [ ] `ROOM_PASSCODE` is set on Render and a manual deploy succeeds
- [ ] Creating a Room without the passcode is refused on the public URL
- [ ] Two Rooms run at once, hosted from different devices, with Players joining over mobile data via the QR code and by typing the code
- [ ] A Host link makes a second device a Host
- [ ] Closing one Room leaves the other playing; the closed Room's TV shows "Room has ended" and its phones go to Room Code entry
- [ ] The server log shows both Rooms' events prefixed by Room Code
- [ ] The setup guide is updated

## Comments

- The setup guide (`docs/deploy.md`) was already updated for `ROOM_PASSCODE` and manual deploys in ticket 01, and `render.yaml` has auto-deploy off. Everything else here is still to do by hand once `concurrent-rooms` is merged to main.
