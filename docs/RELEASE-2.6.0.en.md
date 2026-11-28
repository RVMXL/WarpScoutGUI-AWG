# WarpScoutGUI 2.6.0 — security & infrastructure (prerelease)

English | [Русский](RELEASE-2.6.0.md)

WarpScoutGUI 2.6.0 is a hardening release following the external audit: remaining
SEC-4/5/6/7/9 findings are closed, engineering infrastructure is in place (CI,
unit tests, SBOM, vendored-library provenance), and prebuilt binaries are removed
from git.

**Release status: PRERELEASE 2.6.0.** The warpscout core is unchanged (0.16.0 in
every package). Scanning and config generation behaviour is unchanged.

## Release policy

Every release ships ALL platforms under a single version. The changelog states
per platform what changed and what did not.

## Platform changes (2.6.0)

| Platform | Changes |
|---|---|
| **Windows (win64)** | No functional changes. The command boundary was rebuilt without behavior changes: `Unblock-File` is assembled by a single quoting point `psQuote()` with a metacharacter filter, junction removal goes through the native `fs.remove` instead of `cmd /c rmdir`, and the background cache cleanup passes paths through `cmdWinPath` (audit SEC-5). |
| **Linux (linux64)** | `chmod +x` runs through the native `Neutralino.filesystem.setPermissions` instead of a shell command (SEC-5) — behavior is identical. The rest is unchanged. |
| **Linux (linux-arm64)** | Same as linux64. |
| **macOS (mac-arm64)** | Same as linux64. |
| **macOS (mac-x64)** | Same as linux64. |
| **Android (android-arm64)** | Substantial changes: (1) **SEC-6** — the app now has a single permission, `INTERNET`; "All files" (MANAGE) and WRITE_EXTERNAL_STORAGE are removed together with the "To shared folder" mechanics: the button and the data-folder picker are gone on Android, data always lives in the app-specific directory, and copies for file managers are made into the single `Download/WARPScoutGUI` folder via MediaStore — the report copy after a scan and the account copy are now actually created (mirroring used to be a stub); data of 2.5.8 users from `/storage/emulated/0/WARPScoutGUI` automatically returns to the private directory on first launch. (2) **SEC-7** — synchronous bridge calls are capped at a 30 s timeout with a forced kill of a hung process (previously — an eternal JavaBridge-thread block). (3) **SEC-9** — an explicit WebView policy: `file:` navigation only inside `android_asset`, cross-file XHR is explicitly forbidden. (4) **SEC-4** — the internal FileProvider serves files only from the app roots and read-only. |

Windows / Linux / macOS: no functional changes — command-boundary hardening only.
Android: storage model reworked (single fixed public export folder via MediaStore,
zero storage permissions), bridge timeouts, explicit WebView policy, hardened
FileProvider.

## Artifacts

| File | SHA-256 |
|---|---|
| WARPScoutGUI-2.6.0-win64.zip | `36a6cc79789f8835e8d1a5dcc7fdc98b2700ea0804a1afbb17caf70848633013` |
| WARPScoutGUI-2.6.0-linux64.zip | `0f4b2e87690d6639b14653b4426cbf6fa530d8340fef2ba1fc5026dcd40d7e27` |
| WARPScoutGUI-2.6.0-linux-arm64.zip | `92eb646da10d6b471342f4b9366f81fe932f07e2ab2d524a1d7f2a0ed701c475` |
| WARPScoutGUI-2.6.0-mac-arm64.zip | `fd37ac0fd6646d21feeea408fe2494a4b7ceab34d59cc5a44aefa5a430e86892` |
| WARPScoutGUI-2.6.0-mac-x64.zip | `d6c35f7599a77a7d80cf8e09e5c018e064564b1c0eb809f34a22921f2fbf60de` |
| WARPScoutGUI-2.6.0-android-arm64.apk | `8444e4d27c092c93291d272cbd1839dbbf8aa1337c37a5931ab106496d3adc45` |

Every zip contains README.txt, the WARPScoutGUI runtime, resources.neu, the
warpscout binary and licenses/. The APK is signed with the same certificate as
2.5.0–2.5.9, so in-place updates keep working.
