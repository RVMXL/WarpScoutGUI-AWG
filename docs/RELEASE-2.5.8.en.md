# GitHub Release notes — v2.5.8 (prerelease)

English | [Русский](RELEASE-2.5.8.md)

### WarpScoutGUI 2.5.8 — android-fix: shared-folder data migration and warpscout launch (pre-release)

Fixes for the user-reported defects (Android, v2.5.7): "After pressing
'move data to shared folder': 1. The account did not transfer; 2. Error
launching warpscout when trying to create an account."

**Changes per platform (2.5.8):**

| Platform | Status | Changes in 2.5.8 |
|---|---|---|
| Android ARM64 | fixed (2 defects + automatic data recovery) | **① "To shared folder" now actually moves the account and reports.** `migrateData()` built paths by hard-concatenating the Windows separator `\` — on Android this produced a file whose *name* contained a backslash; reading the old account failed silently, the migrated-file counter showed 0, yet the data root was still switched. All concatenations now go through the platform-aware `pxJoin()` (on Windows the separator is unchanged — behavior identical). **② warpscout launch restored.** The registration/scan preflight reads `libwarpscout.so` from `nativeLibraryDir`; the v2.5.5 path-guard (protection against escaping allowed roots) did not know that path and answered "path not allowed" — a "Error launching warpscout" toast was shown before any process spawn. `guardPath` gained a read-only mode: `fsStats`/`fsRead` may access `nativeLibraryDir`, while write operations remain strictly guarded. **③ Automatic recovery of stranded data.** On first launch, 2.5.8 itself finds the account/reports in the previous app-specific folders and moves them into the active folder using the now-fixed migration — no reinstall or manual move required; the operation is idempotent and never overwrites existing files |
| Windows x86_64 | no functional changes | resources.neu rebuild (single resource bundle), version number |
| Linux x86_64 | no functional changes | resources.neu rebuild, version number |
| Linux ARM64 | no functional changes | resources.neu rebuild, version number |
| macOS arm64 (Apple Silicon) | no functional changes | resources.neu rebuild, version number |
| macOS x64 (Intel) | no functional changes | resources.neu rebuild, version number |

**Who needs 2.5.8:** Android users of v2.5.3–v2.5.7 who (a) migrated data to
the shared folder and ended up with an empty folder without the account, or
(b) saw "Error launching warpscout" during registration/scan. Both defects
were present in those versions; desktop platforms are unchanged and
unaffected.

**Verification status.** E2E in Android emulation (touch 390×844, Neutralino
2.5.8): an account planted in the old app-specific folder → "To shared
folder" → the account lands in the shared folder with the toast "transferred
files: 1 (warpscout-account.json)"; a repeated transfer reports a conflict
without overwriting; same-folder transfer is a no-op; warpscout launch after
the guard fix succeeds. Desktop mock (Windows `C:\…` joins) — no regression.
`node --check`, ESLint, APK signature (apksigner) — clean. On-device smoke
testing remains with the user; please report defects via Issues.

**Android:** the APK is signed with the same fixed key (cert SHA-256
`67:96:9F:F2:…:AC:98:41`) as 2.5.0–2.5.7 — updates install over the existing
version without data loss (versionCode 20508, package `ru.warpscout.gui`).

**Artifact SHA-256:**

```
2a2eafd7338e41457349a9eb1c3066054e428eada26185711474b088bc9deab5  WARPScoutGUI-2.5.8-win64.zip
e81b105ecaf7afa75dd35ff22919ae232da3c0bba0ddc03d107e6a90117d2572  WARPScoutGUI-2.5.8-linux64.zip
16c24c7a3b9cedda12da962926d8780cfc526687902b07437941654a6bf3c876  WARPScoutGUI-2.5.8-linux-arm64.zip
f2262a8e16ac2d80e732fed7675a4b210b5047a79be0e0ac9b36b43baabdf9d4  WARPScoutGUI-2.5.8-mac-arm64.zip
1d71645481764e08e7c5792760b8a27ce8e33061a7f894d1727c70812ce301ab  WARPScoutGUI-2.5.8-mac-x64.zip
b269fe7db1aa182b5de39d81abf3b698815fc7743bac4473a7be4c3ea7c6e658  WARPScoutGUI-2.5.8-android-arm64.apk
```
