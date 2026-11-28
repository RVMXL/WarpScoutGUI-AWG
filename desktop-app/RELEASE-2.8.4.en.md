# WarpScoutGUI 2.8.4 — full release of the 2.8 branch

English | [Русский](RELEASE-2.8.4.md)

WarpScoutGUI 2.8.4 — promotion of the 2.8 branch to a full release: the
2.8.0–2.8.3 series (live `-stream-json` scan, GUI update banner, mihomo-json /
usque export, I1 profile auto-pick, scan rerun from history, close-window
confirmation with active SOCKS, custom CLI flags, AWG 3.1 on the Scan tab,
QUIC as the default I1 profile, the "Hard network" presets) has been verified
by the user on real machines. Plus two items: the mobile "Data folder" card no
longer promises moving the folder to "another drive" (desktop-only behavior),
and the repository docs gained English versions of README/CHANGELOG. Data
formats are unchanged: reports, configs, account, history and backups remain
fully compatible with 2.8.3/2.8.2/2.8.1/2.8.0/2.7.3.

## What changed

- The mobile "Data folder" card no longer shows the desktop-only phrase about
moving the folder to "another drive". On Android the data folder is fixed by
the system
(/storage/emulated/0/Android/data/ru.warpscout.gui/files/WARPScoutGUI) and
the "Pick…"/"Reset" buttons have been hidden since 2.5.0; the platform layer
gained android-specific full-phrase replacements (ANDROID_TEXT — the same
identifier-based mechanism as the Linux/macOS phrases), so both hint
variants ("Data folder" card on Settings and the "Paths" card) no longer
promise choosing another folder; the EN variant is in sync. Desktop and the
web demo are unchanged.

- Release status: full release. releases/latest now returns 2.8.4, so the
"⬆ WarpScoutGUI 2.8.4" banner appears for users on 2.7.3 and every 2.8.x
(releases/latest does not return pre-releases).

## Platform changes (2.8.4)

| Platform | Changes |
|---|---|
| **Windows (win64)** | Shared resources: platform-layer text edit only; the warpscout 0.17.0 core is unchanged. |
| **Linux (linux64)** | Shared resources: platform-layer text edit only; the warpscout 0.17.0 core is unchanged. |
| **Linux (linux-arm64)** | Shared resources: platform-layer text edit only; the warpscout 0.17.0 core is unchanged. |
| **macOS (mac-arm64)** | Shared resources: platform-layer text edit only; the warpscout 0.17.0 core is unchanged. |
| **macOS (mac-x64)** | Shared resources: platform-layer text edit only; the warpscout 0.17.0 core is unchanged. |
| **Android (apk)** | Shared resources: platform-layer text edit ("Data folder" card — android phrases); versionCode 20804. |

## Release status

This release is a full release (prerelease=false, make_latest=true): the
pre-release cycle for the 2.8 branch content is complete, the 2.8.0–2.8.3
series has been verified. releases/latest returns 2.8.4, so the "⬆
WarpScoutGUI 2.8.4" banner appears for users on 2.7.3/2.8.0/2.8.1/2.8.2/2.8.3.
