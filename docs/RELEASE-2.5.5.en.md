# WARPScoutGUI v2.5.5 — Release notes

English | [Русский](RELEASE-2.5.5.md)

**Date:** 2026-10-11 · **Type:** prerelease · **Core:** warpscout v0.16.0

Single release for all six platforms (release policy: every platform ships under one version number).

### Android (changed)

- **🛡 All 19 CodeQL (GitHub code scanning) warnings resolved.** This release only hardens the shell — no user-visible behavior changes:
  - **No-shell command execution.** Commands from the GUI previously ran via `sh -c`, which code scanning flagged as a potential command injection. Commands are now split by a POSIX-compatible tokenizer (single/double quotes, `\`-escapes — like sh) and executed directly via `ProcessBuilder` as argv: shell metacharacters (`; & | \` $()`) are never interpreted, and the only executable allowed is the app's own `libwarpscout.so` (or `chmod` to grant execute permission). Anything else fails with an explicit error instead of running.
  - **File operations restricted to own folders.** Read/write/mkdir/delete/listing through the JS bridge are limited to allow-listed roots: the app data folder (`…/WARPScoutGUI`), the public configs folder (`Download/WARPScoutGUI`), the shared folder (`/storage/emulated/0/WARPScoutGUI`), and the app's internal directories. Paths are canonicalized (`getCanonicalPath` — neutralizes `..` traversal and symlinks); everything else is rejected with an explicit error shown in the UI.
  - **content:// URIs — only our own.** URI operations are accepted only for files picked in the app's OWN dialogs (or with a persisted grant) — arbitrary URIs from JS are not opened.
  - **Storage keys are validated** (`[A-Za-z0-9._-]`, no `..`) — the settings file cannot escape its internal directory.
- Installs over 2.5.0–2.5.4: same package, same signing key (cert SHA-256 `67969ff2…ac9841`), data preserved.

### Windows / Linux / macOS (no functional changes)

Packages rebuilt under the single 2.5.5 version number per the release policy (`resources.neu`, `README.txt`).

### Upgrade

- **Android:** installs over 2.5.0–2.5.4 (same signing key). Data is preserved.
- **Desktop:** unpack the new zip over the old folder; account/reports/settings are untouched.

## Artifacts (SHA-256)

| Файл / File | SHA-256 |
|---|---|
| `WARPScoutGUI-2.5.5-win64.zip` | `306e718cff90ba122f3fd423838dffd3bf8539750b6b47ec9f359ea709006e96` |
| `WARPScoutGUI-2.5.5-linux64.zip` | `b3fd27f4ce060c08fa5c5f1b33ad17d69cba0e98cab37737d73916252a0a7551` |
| `WARPScoutGUI-2.5.5-linux-arm64.zip` | `f68736fa1ff76e56e19d37ec7fc85ce1ef11ad57b71680c05b6f62e50626fa62` |
| `WARPScoutGUI-2.5.5-mac-arm64.zip` | `7da73ca350de140936e51ef2529b16f85dae99a9940dd3c6594b56102473d05b` |
| `WARPScoutGUI-2.5.5-mac-x64.zip` | `d8131e72f26c28c3e324f4073f905ac28cc3271ee80141587e62ec192a2f68f3` |
| `WARPScoutGUI-2.5.5-android-arm64.apk` | `e7c43dbd648323c6f52b3461254311b62f4cf9efb1bcb4ae8d8445a3c6f6885c` |

APK: versionCode 20505, versionName 2.5.5, minSdk 24 (Android 7.0), arm64-v8a, signed with the fixed release key (updates install over previous versions).
