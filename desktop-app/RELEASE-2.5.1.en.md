# GitHub Release notes — v2.5.1 (prerelease)

English | [Русский](RELEASE-2.5.1.md)

### WarpScoutGUI 2.5.1 — Android fix (pre-release)

A targeted release fixing the first bug found on a **real Android device** in the 2.5.0 build.

**Release policy.** Every release ships artifacts for all supported platforms under a single version number — including platforms whose code did not change in that release. The notes state, per platform, exactly what changed or explicitly record the absence of changes.

**Per-platform changes (2.5.1):**

| Platform | Status | Changes in 2.5.1 |
|---|---|---|
| Android ARM64 | **fix** | Startup fix: the WebView loaded `file:///android_asset/www/index.html`, while `aapt2 -A` places the `www/` contents at the **root** of assets (`assets/index.html`) — the app failed with `net::ERR_FILE_NOT_FOUND`. The load URL is now `file:///android_asset/index.html`. Additionally, `versionCode` is now synchronized from the config on every build (it turned out `aapt2 link --version-code` does not override an explicitly declared manifest attribute — otherwise 2.5.1 would carry 20500 instead of 20501). **versionCode 20501** — in-place update over 2.5.0 works without data loss |
| Windows x86_64 | no functional changes | rebuilt under the unified version number (resources.neu — 2.5.1, README.txt); behavior identical to 2.5.0 |
| Linux x86_64 | no functional changes | rebuilt under the unified version number |
| Linux ARM64 | no functional changes | rebuilt under the unified version number |
| macOS arm64 | no functional changes | rebuilt under the unified version number |
| macOS x64 | no functional changes | rebuilt under the unified version number |

**Android update:** install `WARPScoutGUI-2.5.1-android-arm64.apk` over the installed 2.5.0 — same package and signing key (certificate SHA-256 `67969FF2…AC9841`), versionCode 20500 → 20501, app data is preserved.

**Package contents:** same as 2.5.0 — resources.neu, bin/warpscout v0.16.0 (MIT) and a licenses/ folder in every desktop archive.
