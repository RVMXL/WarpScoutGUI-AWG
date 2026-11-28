# WarpScoutGUI 2.6.3 — warpscout check fix (prerelease)

English | [Русский](RELEASE-2.6.3.md)

WarpScoutGUI 2.6.3 is a targeted fix for a 2.6.2 regression reported by a user:
on some machines the app showed “**warpscout: not found**” or “**File found,
but the version could not be obtained**” even though `warpscout.exe` was fine
next to the program (the same binaries worked in 2.6.1).

**Release status: PRERELEASE 2.6.3.** The warpscout core is unchanged (0.16.0 in
every package, byte-identical files to 2.6.1/2.6.2 — `deps.json` SHA-256 pins
match). Scanning and config generation behaviour is unchanged.

## Platform changes (2.6.3)

| Platform | Changes |
|---|---|
| **Windows (win64)** | warpscout check fix + earlier UI revival in `resources.neu` (`checkWarpscoutRun`, `init`/`bindEvents`/`setupTouchUi`); the rest is as in 2.6.2. |
| **Linux (linux64)** | Same as win64. |
| **Linux (linux-arm64)** | Same as win64. |
| **macOS (mac-arm64)** | Same as win64. |
| **macOS (mac-x64)** | Same as win64. |
| **Android (android-arm64)** | Same as win64; permission is still `INTERNET` only, versionCode 20603. |

Windows / Linux / macOS / Android: only the warpscout version-check timing fix
and the early-UI bootstrap inside resources.neu; everything else is unchanged
from 2.6.2.

## Upgrade

To upgrade from 2.6.2 — unpack the ZIP entirely over the same folder (replace
files). The data folder stays put; settings/account/history are kept. The
warpscout status check runs automatically at startup; if it fails — “Account”
tab → “Check warpscout” (forced re-check).

## Artifacts

| File | SHA-256 |
|---|---|
| `WARPScoutGUI-2.6.3-win64.zip` | `bd65e61624d75c0c5fbf406378a3256216b318daa9cb31d248bb3d30a86380a9` |
| `WARPScoutGUI-2.6.3-linux64.zip` | `05c981d38f00bb90cfc05c12774017bf2916266811480c9bb78991a8d084cf04` |
| `WARPScoutGUI-2.6.3-linux-arm64.zip` | `03c9f960da73963ce9d5591e74ac6bb75c1ac43eb83716b31268f5d7b47a8e51` |
| `WARPScoutGUI-2.6.3-mac-arm64.zip` | `440eb4ad146688f0a9df856f375ae7b603a04b3d8c4353fdb7ad654b0d522da4` |
| `WARPScoutGUI-2.6.3-mac-x64.zip` | `70e28711a55d886d1d44b7c192d4a2a0c5eea4bdfb440a1f1dc506e77167f7c5` |
| `WARPScoutGUI-2.6.3-android-arm64.apk` | `0087ccdf2111709e8a43e4d15facd2fbd566faa18f9611c1539c804d703efbc2` |

**APK (android-arm64):** versionCode 20603, single `INTERNET` permission,
core `libwarpscout.so` — warpscout 0.16.0 (pinned in `deps.json`, AND-2),
signed with the project master key (cert SHA-256 `67969ff2…ac9841`, the same
key as 2.6.1/2.6.2 — updates install over without reinstalling). APK SHA-256:
`0087ccdf2111709e8a43e4d15facd2fbd566faa18f9611c1539c804d703efbc2`;
apksigner verify: OK.
