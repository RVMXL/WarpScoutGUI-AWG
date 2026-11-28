# WarpScoutGUI 2.6.7 — fix: raw I1 from the "Parameter search" no longer truncates at "«<b"

English | [Русский](RELEASE-2.6.7.md)

WarpScoutGUI 2.6.7 is a targeted fix based on a user report: a concrete I1
found by find-junk was inserted into the config as a `"<b` fragment — the rest
of the value (a ~2.6 KB packet) was lost. The warpscout core is still 0.16.0
(`deps.json` SHA pins match). Data formats are unchanged: reports, configs,
account and history remain fully compatible with 2.6.x.

## What changed

- The raw I1 now reaches the config intact. There were four stacked causes:
the found command was truncated to 1000 chars before parsing (a command with
a raw I1 is ~2.6 KB); flags were parsed with `split(/\s+/)` while the CLI
prints the value quoted with a space inside (`-i1 "<b 0xce…>"`) — so only
the `"<b` token reached the flag handler; the value itself was capped at 600
chars (the reference packet is 2506); buildConf and applyFoundCmd stripped
all whitespace although the space after `<b` is significant. Now: quote-aware
tokenization, 8000/6000 limits, shell quotes are removed (same as .conf
import), the raw `<b …>` form is stored and rendered as is; base64 values
are still whitespace-stripped. Also fixed a long-standing default flaw: the
reference EXAMPLE_I1 no longer loses the space after `<b` in the
preview/export. The found command survives an app restart (restore cap
500→8000).

## Platform changes (2.6.7)

| Platform | Changes |
|---|---|
| **Windows (win64)** | I1 paste fix (shared resources) — see above; the rest is unchanged. |
| **Linux (linux64)** | I1 paste fix (shared resources) — see above; the rest is unchanged. |
| **Linux (linux-arm64)** | I1 paste fix (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-arm64)** | I1 paste fix (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-x64)** | I1 paste fix (shared resources) — see above; the rest is unchanged. |
| **Android (android-arm64)** | versionCode 20607; same I1 paste fix ("Parameter search" → "Apply found" → config). |

## Upgrade

To upgrade from 2.6.6 — unpack the ZIP over the same folder (replace files).
On Android, install the APK over the existing version: package name and
signing key are fixed, data is preserved.

## Artifacts

The SHA-256 table for all files is appended to this description automatically
by CI at build time.
