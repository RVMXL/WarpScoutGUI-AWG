# WarpScoutGUI 2.8.3 — "Hard network" is hard again (prerelease)

English | [Русский](RELEASE-2.8.3.md)

WarpScoutGUI 2.8.3 — a single item from the 2.8.2 pre-release review (user
request): after the default I1 profile switched to QUIC, the "Hard network"
preset became an exact copy of "Default" — its historical difference was
precisely `genI1:"quic"`. The preset now has differences that match its name:
auto-picking of the I1 profile and a patient probe timeout. **This release is
published as a PRERELEASE** — after review it is promoted to a full release
(prerelease=false, make_latest=true). Data formats are unchanged: reports,
configs, account, history and backups remain fully compatible with
2.8.2/2.8.1/2.8.0/2.7.3.

## What changed

- The "Hard network" preset — auto-picking of the I1 profile + a 4 s probe
timeout. The difference from "Default" is now exactly two fields, both
matching the name: the "Auto-pick I1 profile" toggle (if the disguise fails
and the scan finds nothing, the same session iterates the core's "If
nothing works" profiles — quic → dns → sip → stun → random — until one
works; the winning profile stays in the form) and `-t 4` instead of the
default 2 s (on a hard network probe answers arrive slower, and some live
endpoints used to be cut off by the timeout). Hard network command:
`warpscout scan -p awg31 -P -gen-i1 quic -t 4 -n 10 -exclude-node DME`
(+ auto-pick in the app). No removal needed — unlike "Thorough" (a
duplicate of the `-f` toggle), auto-pick changes behavior AFTER an empty
scan rather than duplicating a single flag.

- Demo. Rebuilt from resources (sync-demo 28a4); no new behavioral scenarios.

## Platform changes (2.8.3)

| Platform | Changes |
|---|---|
| **Windows (win64)** | All items above (shared resources). |
| **Linux (linux64)** | All items above (shared resources). |
| **Linux (linux-arm64)** | All items above (shared resources). |
| **macOS (mac-arm64)** | All items above (shared resources). |
| **macOS (mac-x64)** | All items above (shared resources). |
| **Android (apk)** | All items above (shared resources); versionCode 20803. |
