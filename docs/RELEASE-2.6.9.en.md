# WarpScoutGUI 2.6.9 — fix: the warpscout path notice no longer appears after every update

English | [Русский](RELEASE-2.6.9.md)

WarpScoutGUI 2.6.9 is a fix based on a user report: in the mobile UI, after
every app update, a warning appeared on launch — "The custom warpscout path is
not in use — the binary was found at the standard location… The setting is kept
— clear the field in Settings" — while there was nothing to clear in Settings.
The warpscout core is still 0.16.0 (`deps.json` SHA pins match). Data formats
are unchanged: reports, configs, account and history remain fully compatible
with 2.6.x.

## What changed

- The perpetual `data.22` toast on startup is gone. The cause had two layers.
(1) The v2.4.0 normalization wrote the found warpscout path into the `wsPath`
setting even when the user had configured nothing; on Android the binary
lives under `/data/app/~~<random>/…`, which changes on every APK update, so
the auto-saved copy went stale. (2) The startup check compared the stale
custom value with the freshly found path and warned on every launch; the
stale value was invisible anywhere in the UI (the Settings field shows the
found path), so the "clear the field" instruction could not be followed.

- New path-storage rules (v2.6.9). Auto-writing the found path into settings
is forbidden: an empty custom stays empty and the path is resolved
dynamically on every launch — APK updates no longer break anything. An
explicitly set custom is still normalized to the exact exe path (the
legitimate "I keep another CLI version on purpose" scenario is intact). A
dead custom (the found binary did not originate from it) is cleared once,
with an explanatory toast "the setting was cleared automatically; this
message won't repeat" — instead of the perpetual "the setting is kept, clear
the field". A live custom folder (with the exe inside) no longer toasts at
all: the found exe lives inside the user's own folder, there is no conflict.

## Platform changes (2.6.9)

| Platform | Changes |
|---|---|
| **Windows (win64)** | warpscout path storage fix (shared resources) — see above; the rest is unchanged. |
| **Linux (linux64)** | warpscout path storage fix (shared resources) — see above; the rest is unchanged. |
| **Linux (linux-arm64)** | warpscout path storage fix (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-arm64)** | warpscout path storage fix (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-x64)** | warpscout path storage fix (shared resources) — see above; the rest is unchanged. |
| **Android (apk)** | The main beneficiary of the fix: the stale `/data/app/~~…` path of past installs cleans itself up on the first 2.6.9 launch, and the notice will no longer reappear after updates; versionCode 20609. |

## Verification

- - gen-version --check: OK 2.6.9; verify-deps: OK.
