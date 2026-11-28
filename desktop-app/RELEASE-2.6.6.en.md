# WarpScoutGUI 2.6.6 — touch UI: stop in one place, parameters locked during the scan

English | [Русский](RELEASE-2.6.6.md)

WarpScoutGUI 2.6.6 ships two UI improvements based on user feedback. The
warpscout core is still 0.16.0 (`deps.json` SHA pins match). Data formats are
unchanged: reports, configs, account and history remain fully compatible
with 2.6.x.

## What changed

- Stop in one place. The red “Stop” button was removed from the live scan
card on the home tab: it never had a click handler (pressing it did
nothing), and a working stop was already available — the large
“■ Stop scan” action button and the stop button on the Scan tab. The card
is progress-only now (phase, timer, steps/nodes).

- Home status colors match desktop: “warpscout v… — ready” and “account:
present” are green, missing/not found states are red. The touch-mode CSS
used to override them with gray.

- Scan parameters are locked while a scan is running. All controls in the
parameters column (presets, protocol, sampling, node filters, obfuscation)
are disabled and dimmed, with a hint explaining why. Run/Stop, the command
line, log and results stay available; unlocking is automatic on
finish/stop/error.

## Platform changes (2.6.6)

| Platform | Changes |
|---|---|
| **Windows (win64)** | UI fixes (shared resources) — see above; the rest is unchanged. |
| **Linux (linux64)** | UI fixes (shared resources) — see above; the rest is unchanged. |
| **Linux (linux-arm64)** | UI fixes (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-arm64)** | UI fixes (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-x64)** | UI fixes (shared resources) — see above; the rest is unchanged. |
| **Android (android-arm64)** | versionCode 20606; same UI fixes (home tab: no duplicate button, colored statuses; scan parameters locked during the scan). |

## Upgrade

To upgrade from 2.6.5 — unpack the ZIP over the same folder (replace files).
On Android, install the APK over the existing version: package name and
signing key are fixed, data is preserved.

## Artifacts

The SHA-256 table for all files is appended to this description automatically
by CI at build time.
