# WarpScoutGUI 2.7.3 — up-to-date warpscout core in all packages + new-version hints

English | [Русский](RELEASE-2.7.3.md)

WarpScoutGUI 2.7.3 closes the two gaps left after 2.7.2. First, the
warpscout core bundled in ALL platform packages is updated to 0.17.0:
GUI 2.7.2 already supported the `-p awg31` profile, but the packages still
shipped a 0.16.0 core (the desktop core used to be carried over from the
previous release's zips, frozen forever). The supply chain has been
rebuilt: all six cores (win64, linux64, linux-arm64, mac-arm64, mac-x64,
android) are placed into packages from the vernette/warpscout release via
a single pin, `deps.json:warpscout.version`. Second — per the issue #1
proposal — the app now tells you when a new warpscout is out: once per
session it reads the latest vernette/warpscout release through the GitHub
API and, if it is newer than the bundled core, shows a "⬆ warpscout {v} —
update available" row in the sidebar status line. Data formats are
unchanged: reports, configs, account and history remain fully compatible
with 2.7.2.

## What changed

- The warpscout core is 0.17.0 in every package; a single deps.json pin.
Previously the desktop core was restored from the PREVIOUS GUI release's
zips (`fetch-binaries.py` → `EXTRACT bin/warpscout`), freezing every
core forever: 2.7.2 shipped 0.16.0 while the code fully supported
0.17.0. Now the core for ALL platforms (win64, linux64, linux-arm64,
mac-arm64, mac-x64, android) is downloaded straight from the
vernette/warpscout release via the `deps.json:warpscout.version` pin —
one place to update: bump the pin and the next GUI release carries the
new core. The SHA-256 of every core is pinned in deps.json and checked
wherever it matters: `fetch-binaries.py` (file magic + minimum size +
pin match), `verify-deps.py` (CI gate), `build-apk.sh` (android entry).
Verified with the real core: `warpscout version` → `0.17.0`.

- New-version hint on the home screen. When the latest vernette/warpscout
release is newer than the bundled core, the sidebar status line shows a
yellow "⬆ warpscout {v} — update available" row. The row is clickable
(and keyboard-accessible) — it opens the GUI releases page that carries
the updated bundle; the tooltip explains the full context: what is out,
what is bundled and what to do if you keep a standalone CLI (your own
path in Settings). Mechanics: once per session and at most once per 12
hours (a localStorage marker), the app reads
`api.github.com/repos/vernette/warpscout/releases/latest`; the hint
appears only when the release is NEWER than the bundle (a newer custom
CLI stays silent), and any network error or API rate limit is silent —
the hint is never critical. This is the app's single external CSP host:
`connect-src https://api.github.com` is added explicitly and documented
(read-only HTTPS, no user data; scanning, registration and SOCKS are
still done exclusively by the warpscout core).

- Demo mode. The hint is shown against a mock v0.17.1 "release" — the
demo behaves like a setup with an update available (all demo data is
mocked anyway).

## Platform changes (2.7.3)

| Platform | Changes |
|---|---|
| **Windows (win64)** | Core 0.17.0 + update hint (shared resources) — see above; the rest is unchanged. |
| **Linux (linux64)** | Core 0.17.0 + update hint (shared resources) — see above; the rest is unchanged. |
| **Linux (linux-arm64)** | Core 0.17.0 + update hint (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-arm64)** | Core 0.17.0 + update hint (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-x64)** | Core 0.17.0 + update hint (shared resources) — see above; the rest is unchanged. |
| **Android (apk)** | Core 0.17.0 + update hint (shared resources) — see above; versionCode 20703. |
