# WARPSCOUT GUI v2.5.2 — Android fixes (smoke test No. 2)

English | [Русский](RELEASE-2.5.2.md)

The second batch of fixes from the smoke test **on a real device** (Android). As before: every release ships the artifacts of **all six platforms** under a single version.

## Platform changes

| Platform | Status | What changed |
|---|---|---|
| **Android (ARM64)** | ✅ **fixes** | 7 fixes below (layout, home panel, files in the shared folder) |
| Windows (x86_64) | ⚪ **no** functional changes | rebuilt under the unified 2.5.2 number (index.html: sidebar version, cache busters) |
| Linux (x86_64, ARM64) | ⚪ **no** functional changes | rebuilt under the unified 2.5.2 number |
| macOS (ARM64, Intel) | ⚪ **no** functional changes | rebuilt under the unified 2.5.2 number |

## Android — what's fixed (bug-report items)

1. **The Account tab scrolled horizontally** — the long `warpscout-account.json` path bloated the "Path" row. The path now wraps, and horizontal drift is forbidden on all 8 tabs (verified at 412px: 0 overflows).
2. **The "broken tab icon"** was the desktop active-item indicator (a stripe on the left) leaking into the bottom navigation. Removed; tab labels hidden by the desktop media query are back.
3. **The active-tab indicator now sits strictly UNDER the icon** (between the icon and the label), plus stroke SVG icons replace emoji-in-SVG text (on some devices the "More" icon failed to render).
4. **"Open folder" worked silently** — file managers cannot see the private `/data/user/0/…` directory. The buttons now open the **public copy** `Download/WARPScoutGUI` via the system file manager and **always** answer with a toast showing the path.
5. **Content hid behind the bottom tabs** — the frame no longer depends on `100dvh` (unsupported by older WebViews): `.main` is pinned with insets, bottom padding 84px + safe-area.
6. **Home = quick-action panel**: "Scan endpoints" starts a scan right from home (phase and live-endpoint count are visible there), "Get working config" takes the best endpoint of the last scan and builds and saves a config with "Open folder"/"Copy" buttons — no tab switching.
7. **User files go to shared storage**: scan reports, saved configs and a copy of the account file are automatically mirrored to `Download/WARPScoutGUI` (Android 10+ — MediaStore, no permissions; Android 7–9 — Downloads). Service data stays in the private directory — that is normal.

Plus: `versionCode` 20502 (update over 2.5.0/2.5.1 without data loss), the signing certificate is unchanged (`67969FF2…AC9841`).

## Integrity check

| File | SHA-256 |
|---|---|
| `WARPScoutGUI-2.5.2-win64.zip` | `54c4dd53d81f3ea1bede73d5435a79a2cf15c100733b534facdda268a67fdbe4` |
| `WARPScoutGUI-2.5.2-linux64.zip` | `e25d13e20581030356a33b83270a0b457ff4fe944b26561bddd9b4cf6c252d13` |
| `WARPScoutGUI-2.5.2-linux-arm64.zip` | `f03fa2d761a9a4625ebce3e084ddcd74ad5853958bcc035c58cdf49f342b01e4` |
| `WARPScoutGUI-2.5.2-mac-arm64.zip` | `6db355559a6b802c853cb21111276f9414c53cdce4a59fd46098fac677f1a646` |
| `WARPScoutGUI-2.5.2-mac-x64.zip` | `fbdca7377c63874e43263cf8d3532e6b32040cfa44537643bc214be5a9792c48` |
| `WARPScoutGUI-2.5.2-android-arm64.apk` | `c6b3d7376fae2d45505bda035ec2ed5a8642ce0e4902e8e87eecd6648d7fd73b` |

---
Full install/run guide: [README.md](https://github.com/RVMXL/WarpScoutGUI-AWG/blob/main/README.md) · GUI: Apache-2.0 · warpscout core v0.16.0: MIT
