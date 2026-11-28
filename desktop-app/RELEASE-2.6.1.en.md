# WarpScoutGUI 2.6.1 — modular architecture (prerelease)

English | [Русский](RELEASE-2.6.1.md)

WarpScoutGUI 2.6.1 closes the last audit finding — **ARCH-1**: the monolithic
`resources/js/app.js` (6957 lines) is split into 15 modules under
`resources/js/wsg/`. No behaviour change: the split is mechanical and provable —
concatenating the modules reproduces the previous monolith byte-for-byte, all 50
unit tests pass without touching expectations, and a live scan on a real runtime
produces identical results.

**Release status: PRERELEASE 2.6.1.** The warpscout core is unchanged (0.16.0 in
every package). Scanning and config generation behaviour is unchanged.

## Release policy

Every release ships ALL platforms under a single version. The changelog states
per platform what changed and what did not.

## Platform changes (2.6.1)

| Platform | Changes |
|---|---|
| **Windows (win64)** | No functional changes. In `resources.neu` the logic code is now shipped as 15 `js/wsg/*.js` modules instead of a single `js/app.js`; index.html loads them strictly by number. |
| **Linux (linux64)** | Same as win64. |
| **Linux (linux-arm64)** | Same as win64. |
| **macOS (mac-arm64)** | Same as win64. |
| **macOS (mac-x64)** | Same as win64. |
| **Android (android-arm64)** | Same as win64: the same 15-module logic packaging in `resources.neu`; permission is still `INTERNET` only (the 2.6.0 storage model is unchanged), versionCode 20601. |

Windows / Linux / macOS / Android: no functional changes — code packaging only
(single app.js replaced by 15 ordered modules inside resources.neu).

## Module map

| Module | Contents (source: app.js 2.6.0) |
|---|---|
| `01-platform` | utilities, platform detection (Win/Linux/mac/Android), toasts |
| `02-state` | app state, defaults, presets |
| `03-i18n` | EN dictionary (~700 lines) + i18n mechanics + status hints |
| `04-bridge` | Neutralino access (os/fs/storage), process registry |
| `05-scan-core` | scan command building, endpoint, report parser (pure core) |
| `06-results-scan` | results table, statistics, scan run |
| `07-config-presets` | AWG config generator, history, presets + sharing |
| `08-live-qr` | live scan panel, Δ comparison, compact mode, QR |
| `09-state-io` | state backup, import schema and sanitization |
| `10-ui-panels` | modals, theme, history, CSV/PNG/SVG/HTML exports |
| `11-conf-qc-account` | .conf import, quick/batch check, account |
| `12-socks-tools-ui` | SOCKS proxy, find-junk/find-sni tools, tabs, touch UI |
| `13-form-paths` | form ↔ state sync, warpscout paths |
| `14-data-migrations` | data folders, junction migrations, data catch-up |
| `15-init` | bindEvents, init, the `__WSGUI` debug hook |

## Artifacts

| File | SHA-256 |
|---|---|
| WARPScoutGUI-2.6.1-win64.zip | `4755ec2f917aae6b01a5246b41af37660a2d4c542972a855dbfcb9dea18e588c` |
| WARPScoutGUI-2.6.1-linux64.zip | `bfee8d781cc03f461ad155e4f2c2c5d826ce54c385fd7beeedf164150c91ed5e` |
| WARPScoutGUI-2.6.1-linux-arm64.zip | `1ab20b7f4ba34a884e782681147bbd223cdc07d16aa021d79ed5e1150e21124c` |
| WARPScoutGUI-2.6.1-mac-arm64.zip | `24d176f3cc2d87783f2ce18707749dbfe37ada3b4b4e912a9b0144fd129f27f2` |
| WARPScoutGUI-2.6.1-mac-x64.zip | `622821d25883872982b68a5fa30d66b46e670e0ef315a9ced494f57f6838e26f` |
| WARPScoutGUI-2.6.1-android-arm64.apk | `9e73326ef00574893dea04f720e554efce77131e28db629a54b1ef29f403d000` |

Every zip contains README.txt, the WARPScoutGUI runtime, resources.neu, the
warpscout binary and licenses/. The APK is signed with the same certificate as
2.5.0–2.6.0, so in-place updates keep working.
