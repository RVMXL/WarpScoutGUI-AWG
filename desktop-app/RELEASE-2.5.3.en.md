# WARPScoutGUI v2.5.3 — Android user files in a visible own folder

English | [Русский](RELEASE-2.5.3.md)

The third batch of Android fixes from smoke tests on a real device. User files (account, reports, configs) now live in a visible folder on `/storage/emulated/0` without root, and "Open folder" opens exactly that folder and never stays silent.

### Per-platform changes

| Platform | Status |
|---|---|
| 🤖 Android (ARM64) | **changed** — 3 items below |
| 🪟 Windows x64 | no changes — rebuilt under the unified 2.5.3 number |
| 🐧 Linux x64 / ARM64 | no changes — rebuilt under the unified 2.5.3 number |
| 🍎 macOS arm64 / x64 | no changes — rebuilt under the unified 2.5.3 number |

### Android — details

- 📁 **Data folder without root.** Default: `Android/data/ru.warpscout.gui/files/WARPScoutGUI` (always writable, no permissions needed). Optionally the shared `/storage/emulated/0/WARPScoutGUI`: Settings → "🌐 To shared folder…" (Android 11+ — the "All files" toggle, Android 7–10 — the write permission; data moves automatically). Files from the private 2.5.2 directory are moved to the new folder on the first launch of 2.5.3. warpscout works right in this folder — mirroring to Downloads is no longer needed.
- 📂 **"Open folder" always responds.** It opens strictly the app's own data folder (the volume root and system directories are never opened). A response in every branch: system file manager → SAF picker opened at that folder → path to the clipboard + toast. Silent failures are eliminated.
- 📐 The "Data folder" hint wraps long paths (the Settings tab overflow on a 412px screen is fixed).

### Artifacts (all — v2.5.3)

| File | SHA-256 |
|---|---|
| `WARPScoutGUI-2.5.3-win64.zip` | `9fcbb966623dd746f49909e1c3344c69c00de703f889ff2133176375303bfb25` |
| `WARPScoutGUI-2.5.3-linux64.zip` | `e87a68cfcb8eb5998b87ddbeb4d42cce8dcce68f76a2700988914bde26f611f9` |
| `WARPScoutGUI-2.5.3-linux-arm64.zip` | `f7b2224dbddad7a6408bbf6ece31cdc103507b636a5aa6bb5952824703d2793d` |
| `WARPScoutGUI-2.5.3-mac-arm64.zip` | `9a3d5d6b18b7d66247e721ea9c96c777939e56fe8eb76c922faa3e01001035b7` |
| `WARPScoutGUI-2.5.3-mac-x64.zip` | `bcccdfebfec85ded44dde19b73e7171ec957f553a3cbc1b4d64fdb7217128ea6` |
| `WARPScoutGUI-2.5.3-android-arm64.apk` | `a6a6e7790e1ab8439aa751efee8a57315289a573258aa20ba954cee457179a4f` |

**Android update:** the APK installs over the previous version — the package and the signing key are fixed, data is preserved. Certificate (SHA-256): `67:96:9F:F2:B0:7D:32:44:55:EF:EE:A5:3F:5D:E0:BF:69:DF:D0:F2:45:A3:02:C4:7E:3E:4D:42:A1:AC:98:41` — unchanged since v2.5.0.
