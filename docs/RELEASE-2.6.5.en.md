# WarpScoutGUI 2.6.5 — license files inside the archives filled in (prerelease)

English | [Русский](RELEASE-2.6.5.md)

WarpScoutGUI 2.6.5 is a licensing/infrastructure release. **The application
itself is unchanged** from 2.6.4 (code and resources are identical except for
the license copies inside the archives). The warpscout core is still 0.16.0
(`deps.json` SHA pins match).

## What changed

- License. The Apache 2.0 boilerplate in `licenses/LICENSE-AWG.txt` inside
every release archive now reads `Copyright 2026 RVMXL` instead of the
`[yyyy] [name of copyright owner]` placeholder. The repo-root LICENSE and
NOTICE were already filled; only the per-archive copies were left as
template (user report).

- Release infrastructure. Releases are now built and published by CI on tag
push; the APK signing key lives in an encrypted repository secret with a
SHA-256 pin check. This changes nothing for users: same artifacts, same
APK signature.

## Platform changes (2.6.5)

| Platform | Changes |
|---|---|
| **Windows (win64)** | License file inside the archive only; resources = 2.6.4. |
| **Linux (linux64)** | License file inside the archive only; resources = 2.6.4. |
| **Linux (linux-arm64)** | License file inside the archive only; resources = 2.6.4. |
| **macOS (mac-arm64)** | License file inside the archive only; resources = 2.6.4. |
| **macOS (mac-x64)** | License file inside the archive only; resources = 2.6.4. |
| **Android (android-arm64)** | versionCode 20605 (bump); content = 2.6.4, signature is the same master key. |

## Upgrade

To upgrade from 2.6.4 — unpack the ZIP over the same folder (replace files).
Updating is optional: the practical difference is the license files inside
the archives.

## Artifacts

The SHA-256 table for all files is appended to this description automatically
by CI at build time.
