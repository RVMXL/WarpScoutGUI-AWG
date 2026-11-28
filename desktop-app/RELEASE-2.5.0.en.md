# GitHub Release notes — v2.5.0 (prerelease)

English | [Русский](RELEASE-2.5.0.md)

### WarpScoutGUI 2.5.0 — cross-platform release (pre-release)

First release built from a single codebase targeting six platforms:
Windows (x86_64), Linux (x86_64/ARM64), macOS (Apple Silicon/Intel),
Android (ARM64).

**Release policy.** Every release ships artifacts for all supported
platforms under a single version number — including platforms whose code
did not change in that release. The notes state, per platform, exactly what
changed or explicitly record the absence of changes.

**Per-platform changes (2.5.0):**

| Platform | Status | Changes in 2.5.0 |
|---|---|---|
| Windows x86_64 | no functional changes | platform-layer refactor with provably unchanged behavior (line-by-line diff against 2.4.6 plus live regression runs); packages renamed to "name-OS-arch", licenses moved to licenses/, README extended with a verification-status section |
| Linux x86_64 | new platform | first release: platform layer (~/.local/share paths, chmod +x instead of Unblock-File), WebKitGTK dependencies documented in README |
| Linux ARM64 | new platform | first release; the AArch64 warpscout core was verified under emulation (version / register / scan / report) |
| macOS arm64 | new platform | first release: Darwin layer (~/Library/Application Support, Gatekeeper xattr -cr hints), system WKWebView with no external dependencies; requires smoke testing on target hardware |
| macOS x64 | new platform | first release, code-identical to arm64 (differs only in Mach-O binaries) |
| Android ARM64 | new platform | first release: touch UI (bottom tabs, home screen with primary actions), warpscout packaged as lib/arm64-v8a/libwarpscout.so, APK signed with a fixed key — in-place updates without data loss |

**Stability.** Windows behavior is unchanged since 2.4.6: the platform
layer only adds Linux/macOS/Android branches, leaving existing code paths
intact (verified by code diff review and live regression runs). A static
audit per the 2.4.6 methodology passed (command streams, untrusted-data
boundaries, process lifecycle, packaging — see AUDIT-v2.5.0.md). Live
Linux-runtime E2E: registration (Cloudflare API), scanning, reports,
config generation. The ARM64 warpscout core was verified under AArch64
emulation; the touch UI was verified at 390×844.

**Verification limits.** The macOS and Android builds were not executed
in the build environment (Mach-O cannot be emulated here; Android requires
a device): Gatekeeper/WKWebView and WebView/SAF-dialog behavior still
requires manual smoke testing. Please report defects via Issues.

**Android:** the APK is signed with a fixed key, so updates install over
the existing app without data loss (versionCode 20500, package
ru.warpscout.gui).

**Package contents:** portable archive with resources.neu, bin/warpscout
v0.16.0 (MIT) and a licenses/ folder (licenses for all bundled
components). The functional changelog is in each archive's README.txt.
