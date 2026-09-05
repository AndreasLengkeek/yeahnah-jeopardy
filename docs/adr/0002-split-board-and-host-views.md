# Split Board display from Host control panel

The imported design combines the Board and the Host's judging controls (reveal / correct / incorrect) into a single screen. Put on a shared TV or projector as-is, Players would see the Host's controls and could see an Answer get revealed a beat early. We split it into two synced views instead: a read-only Board (safe to project) and a private Host control panel (kept on the Host's own device). Both read from the same server-held Game state, so the split is purely presentational, not a second source of truth.
