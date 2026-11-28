# WarpScoutGUI 2.6.8 — fix: configs with a found I1 work again ("unknown tag" is gone)

English | [Русский](RELEASE-2.6.8.md)

WarpScoutGUI 2.6.8 is a follow-up fix based on a user report (continuing the
2.6.7 story): a config with an I1 found in the Param finder did not come up —
the daemon answered `IPC error -22: failed to parse i1: unknown tag
<b0xc1…>` / `unknown tag <r23>`. The warpscout core is still 0.16.0
(`deps.json` SHA pins match). Data formats are unchanged: reports, configs,
account and history remain fully compatible with 2.6.x.

## What changed

- I1/I2–I5 are now canonicalized to the daemon grammar. The AmneziaWG obf-chain
grammar (`device/obf.go — newObfChain`) splits the value into `<…>` tags, the
tag content into whitespace fields: first field is the key
(`b/t/r/rc/rd/d/ds/dz`), second is the value. Only the spaced forms are
valid — `<b 0x…>`, `<r 23>`; the compact `<b0x…>`/`<r23>` is not understood:
the whole `b0xc1…` string becomes the key → «unknown tag». The 2.6.7 hole:
the raw form was only recognized with a single `<b …>` tag per value, while
warpscout prints a found I1 as a multi-block chain
(`<b 0x…><r 23><b 0x…><r 16>`) — such a value fell into the "not raw" branch
and was stripped of significant spaces, producing the compact form in the
config. Now a raw chain is a value consisting entirely of tags: each tag is
canonicalized (space after the key, hex bytes of a b-tag joined — the
`<b 0xc1 0x00 …>` form would be silently read as a single byte), inter-tag
spaces are removed; unknown/broken tags are left untouched; base64 is
stripped as before. Normalization applies on every path: Apply found,
.conf import (I1–I5), state restore at startup — an old broken state
self-heals on the first launch of 2.6.8.

## Platform changes (2.6.8)

| Platform | Changes |
|---|---|
| **Windows (win64)** | I1–I5 canonicalization fix (shared resources) — see above; the rest is unchanged. |
| **Linux (linux64)** | I1–I5 canonicalization fix (shared resources) — see above; the rest is unchanged. |
| **Linux (linux-arm64)** | I1–I5 canonicalization fix (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-arm64)** | I1–I5 canonicalization fix (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-x64)** | I1–I5 canonicalization fix (shared resources) — see above; the rest is unchanged. |
| **Android (android-arm64)** | versionCode 20608; same I1–I5 canonicalization (config from "Parameter search" and .conf import). |

## Upgrade

To upgrade from 2.6.7 — unpack the ZIP over the same folder (replace files).
The data folder stays: a broken I1 state self-heals on the first launch.
On Android, install the APK over the existing version: package name and
signing key are fixed, data is preserved.

## Artifacts

The SHA-256 table for all files is appended to this description automatically
by CI at build time.
