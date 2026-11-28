# WARPScoutGUI v2.5.4 — Release notes

English | [Русский](RELEASE-2.5.4.md)

**Date:** 2026-10-11 · **Type:** prerelease · **Core:** warpscout v0.16.0

Single release for all six platforms (release policy: every platform ships under one version number).

### Android (changed)

- **🌓 Theme toggle works again.** The button in the "More" menu lacked a `data-tab` attribute, so the delegated click handler never matched it. The attribute is now always rendered, plus a direct listener is attached.
- **📂 Every "Open folder" button responds instantly.** A press always shows a toast ("Opening folder: …"), and the outcome is reported in every branch: opened / pick it in the SAF manager / path copied. Silent `.catch(() => {})` failures are gone. On Android 11+ the `Android/data/…` folder opens directly in the system SAF picker, which can display it even where regular Files apps show it empty (that's why the button previously looked dead).
- **⬇️ Ready configs default to Download/WARPScoutGUI.** The "Get working config" action saves into the public `Download/WARPScoutGUI` folder — visible in any file manager; Android 10+ writes via MediaStore with zero permissions, Android 7–9 with the storage permission; otherwise an honest fallback message and the app folder is used. The "Save as…" dialog opens in that folder.
- **⏱ Realtime scan indicator on Home.** While scanning: pulsing dot, "Scanning…", current phase, elapsed timer, steps N/M and discovered nodes, and a "■ Stop" button. The main action button doubles as stop while a scan runs. After finishing — "● Scan finished" and the live endpoint count.
- **🧹 The technical warpscout path** (`…/libwarpscout.so` in nativeLibraryDir) and its "open folder" buttons were removed from the UI — nothing a user could do there.
- Account/report files stay as in 2.5.3: `Android/data/ru.warpscout.gui/files/WARPScoutGUI` by default (no permissions) or `/storage/emulated/0/WARPScoutGUI` after granting access.

### Windows / Linux / macOS (no functional changes)

Packages rebuilt under the single 2.5.4 version number per the release policy (`resources.neu`, `README.txt`).

### Upgrade

- **Android:** installs over 2.5.0–2.5.3 (same package, same signing key; cert SHA-256 `67969ff2…ac9841`). Data is preserved.
- **Desktop:** unpack the new zip over the old folder; account/reports/settings are untouched.

## Artifacts (SHA-256)

| Файл / File | SHA-256 |
|---|---|
| `WARPScoutGUI-2.5.4-win64.zip` | `d22bf7bbec5a04d5b20e4b43582493e8f6b96ebf363aa6f9fa44687175230fe6` |
| `WARPScoutGUI-2.5.4-linux64.zip` | `08cc9a5cbd6c153cc3f574a8084e8fbb35b5f5abec2977da424f560a8e8dc884` |
| `WARPScoutGUI-2.5.4-linux-arm64.zip` | `7bcaec8b3294413570e3df192b5df5722173b3bb098b14aaad165393a11c4a45` |
| `WARPScoutGUI-2.5.4-mac-arm64.zip` | `48c62d84319b3000992c4e5c9b3852cbcf48274c27660a437bb197d577b6daee` |
| `WARPScoutGUI-2.5.4-mac-x64.zip` | `5fad1273da68fe3fab086ccfc68d36d77998676353572ec847d7e3dbdf1759e9` |
| `WARPScoutGUI-2.5.4-android-arm64.apk` | `ef514ee1e39fdb897a0f81493b24ee0487db0d6987121baa854ef5da458d6932` |

APK: versionCode 20504, versionName 2.5.4, minSdk 24 (Android 7.0), arm64-v8a, signed with the fixed release key (updates install over previous versions).
