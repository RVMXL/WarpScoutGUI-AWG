# WarpScoutGUI 2.6.4 — three UX improvements from user feedback (prerelease)

English | [Русский](RELEASE-2.6.4.md)

WarpScoutGUI 2.6.4 is a usability release: three UI improvements based on
specific user feedback. The warpscout core is unchanged (0.16.0 in every
package, byte-identical files to 2.6.1–2.6.3 — `deps.json` SHA-256 pins match);
scanning and config generation behaviour is unchanged — only how results are
displayed and pre-filled.

## What changed

- Live node-filter badge (Scan tab). The old static “DME excluded” caption is
replaced by a badge that mirrors ACTIVE filters in real time: `✗` — excluded
nodes/countries, `✓` — “only” nodes/countries, countries marked; hidden when
no filters are active; updates on any field change, presets, “Apply found”,
language switch; long lists ellipsize with the full list in the tooltip.

- Smart endpoint picker (Config tab). The flat dropdown is regrouped: the best
endpoint of EVERY node at the top (sorted by in-tunnel ping, ★ on the
absolute best, ping shown next to each), an “Others” group below with all
remaining rows. After a scan finishes, the best endpoint is auto-filled into
the config — generation works with it right away; picking another one is a
single dropdown action.

- End-to-end I1 from the Param finder (find-junk → config). The concrete I1
packet found by find-junk (kept by the CLI as a raw `-i1` flag) is no longer
discarded — it is inserted straight into the I1 field of the Config tab
(with a toast). An honest hint under the field explains that a `-gen-i1`
scan generates the packet on the fly and never reports it — the concrete
packet comes from the Param finder.

## Platform changes (2.6.4)

| Platform | Changes |
|---|---|
| **Windows (win64)** | Three UX improvements in `resources.neu` (`renderNodeFilterBadge`, `endpointGroups` + select groups + best-endpoint autofill, end-to-end I1); the rest is as in 2.6.3. |
| **Linux (linux64)** | Same as win64. |
| **Linux (linux-arm64)** | Same as win64. |
| **macOS (mac-arm64)** | Same as win64. |
| **macOS (mac-x64)** | Same as win64. |
| **Android (android-arm64)** | Same as win64; permission is still `INTERNET` only, versionCode 20604. |

Windows / Linux / macOS / Android: the three UX improvements inside
resources.neu; everything else is unchanged from 2.6.3.

## Upgrade

To upgrade from 2.6.3 — unpack the ZIP entirely over the same folder (replace
files). The data folder stays put; settings/account/history/presets are kept.

## Artifacts

| File | SHA-256 |
|---|---|
| `WARPScoutGUI-2.6.4-win64.zip` | `bec469bb86c384ef44afa7250ff8110fcce66bae9b50aeeb9fb063e0c7593521` |
| `WARPScoutGUI-2.6.4-linux64.zip` | `035694d9274f4be6ea05c9d183492f425d2d91d60afff7f18c785cb87a8714d6` |
| `WARPScoutGUI-2.6.4-linux-arm64.zip` | `5e716d649fdc19162b7c7813b55d9ec40ffb85edfe6c73f0302cfe96e62c3f19` |
| `WARPScoutGUI-2.6.4-mac-arm64.zip` | `be208e585fe6f94e644c4448ee8b984a428f152569d58484bfec7322ecb3c6fc` |
| `WARPScoutGUI-2.6.4-mac-x64.zip` | `70a6054f76cd1d4bb15690b0e3d964adb03de82b17a99906fb400322841b51f8` |
| `WARPScoutGUI-2.6.4-android-arm64.apk` | `10df6a9373fcb3d42db66504b01005d48512e128a88e0696feb507473f01b626` |

**APK (android-arm64):** versionCode 20604, single `INTERNET` permission,
core `libwarpscout.so` — warpscout 0.16.0 (pinned in `deps.json`, AND-2),
signed with the project master key (cert SHA-256 `67969ff2…ac9841`, the same
key as 2.6.1–2.6.3 — updates install over without reinstalling); apksigner
verify: OK.
