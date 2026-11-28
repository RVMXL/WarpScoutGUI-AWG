# WarpScoutGUI 2.6.2 — hardening from the v2.6.1 audit + identifier-based i18n (prerelease)

English | [Русский](RELEASE-2.6.2.md)

WarpScoutGUI 2.6.2 closes waves P2/P3 of the full v2.6.1 audit (79 findings,
0 critical) and the last finding of the previous audit — **QUAL-1**: the i18n
dictionary now uses stable identifier keys (`I18N {id:{ru,en}}`) instead of
canonical RU strings. Rewording one language no longer breaks the other; 49
previously silently-untranslated places (toast templates `{err}/{path}`,
static index.html texts and a11y attributes, touch states) gained English.

**Release status: PRERELEASE 2.6.2.** The warpscout core is unchanged
(0.16.0 in every package). Scanning and config generation behaviour is
unchanged; changes are command-boundary hardening, state consistency,
account file permissions and engineering infrastructure.

## Release policy

Every release ships ALL platforms under a single version. The changelog states
per platform what changed and what did not.

## Platform changes (2.6.2)

| Platform | Changes |
|---|---|
| **Windows (win64)** | Security: all paths into warpscout go through a single point `argPath()` (cmd quoting), restoreState validates theme/lang, preset import is sanitized (2 MB before parsing), the account file gets 0600 + backup rotation, account deletion removes the reports, the automatic account mirror in Download is gone; i18n rework (identifiers, 49 new EN translations); a fix for the real exit code being overwritten by synthetic-exit; computePaths no longer clobbers the user wsPath. |
| **Linux (linux64)** | Same as win64 (paths follow sh semantics). |
| **Linux (linux-arm64)** | Same as win64. |
| **macOS (mac-arm64)** | Same as win64. |
| **macOS (mac-x64)** | Same as win64. |
| **Android (android-arm64)** | Same as win64, plus the bridge: `content://` passes the `uriAllowed` gate, names are sanitized when written to public roots, the build core is verified by SHA-256 against the deps.json pin, KSPASS goes through the environment; versionCode 20602; permission is still `INTERNET` only. |

Windows / Linux / macOS / Android: command-boundary hardening, state
consistency, account permissions, i18n rework; Android additionally gates
`content://` URIs and sanitizes public-root writes.

## Artifacts

| File | SHA-256 |
|---|---|
| WARPScoutGUI-2.6.2-win64.zip | `3c2ad3ddcc00e4631b2d72292473b791037f5d9350c0689ebc4f0b94aedb7f53` |
| WARPScoutGUI-2.6.2-linux64.zip | `e0095f718793a7863068db39852abbed447bf018796d99c758017ad754258f37` |
| WARPScoutGUI-2.6.2-linux-arm64.zip | `81f0855ddd49f63236e79b2ebfd2ddbcb83ef2a62436ba8df8a168128f2dfd95` |
| WARPScoutGUI-2.6.2-mac-arm64.zip | `38a14673f98c7c4960b875e68606b508828ef3991c4c924721cb048992698dd2` |
| WARPScoutGUI-2.6.2-mac-x64.zip | `d104c3287b1ef7194fca196c5a6b23252a1ec338f6c29b39ce931589199dfbc8` |
| WARPScoutGUI-2.6.2-android-arm64.apk | `f93f198207fa65bcba17ee69b99135c2d192999bcd7b76cb8320e60e8960578c` |

Every zip contains README.txt, the GUI runtime, resources.neu, the warpscout
binary and licenses/. The APK is signed with the same certificate as
2.5.0–2.6.1, so in-place updates keep working.
