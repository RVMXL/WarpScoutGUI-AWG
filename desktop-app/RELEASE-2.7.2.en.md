# WarpScoutGUI 2.7.2 — warpscout 0.17.0: the -p awg31 profile

English | [Русский](RELEASE-2.7.2.md)

WarpScoutGUI 2.7.2 brings support for warpscout 0.17.0 (released Nov 24).
The headline CLI profile `-p awg31` (AmneziaWG with the 3.1 client
parameters) is wired into the "scan = config" coupling the GUI
introduced in 2.7.0: the AWG version comes from Config → Version (the way
junk parameters come from `S.cfg.obf`), so the run verifies endpoints
with exactly the profile that goes into the config — the 2.0/3.1 mismatch
no longer produces the "scan works, config doesn't" surprise. On
warpscout <0.17 everything works as before — a silent fallback to
`-p awg`. The warpscout binary itself is updated by the user (e.g. by
replacing `warpscout.exe`); the `deps.json` SHA pins for the bundled
binaries match. Data formats are unchanged: reports, configs, account
and history remain fully compatible with 2.7.1.

## What changed

- The `-p awg31` profile in scan, endpoint check, "I1 from scan" and
SOCKS. When the config version is "3.1", the commands run with
`-p awg31` and pass the 3.1 timings from the shared `S.cfg.obf` as CLI
flags: `-padding` (ContentPaddingAddition), `-rekey-after`
(RekeyAfterTime), `-rekey-timeout` (RekeyTimeout), `-reject-after`
(RejectAfterTime), `-keepalive-timeout` (KeepaliveTimeout),
`-max-handshakes` (MaxHandshakeAttempts), boolean `-disable-cookies` /
`-random-trailers` (an exact field-to-flag mapping of Config → Advanced
against v0.17.0 `flags.go` awg31Ranges; RANGE is "N" or "MIN-MAX").
HPK is deliberately unsupported by warpscout (`warp.go`:
"HeaderProtectionKey is omitted" — the key encrypts headers, so the
peer must hold it) — it remains config-only. Fields that are not a
valid RANGE (empty, "abc", "6 9", shell junk) are silently skipped —
no flag is added, the command structure stays intact. On warpscout
<0.17 (the version is learned when the binary is checked; semver
threshold 0.17.0) everything silently falls back to plain `-p awg`;
the "Obfuscation AmneziaWG" card on the Scan tab now explains where
the version comes from and that 0.17+ is required.

- Demo mode shows warpscout 0.17.0 (the status line in Settings, the
home-screen footer and the mock `version` scenario) — the demo behaves
like a setup with the new CLI (including `-p awg31` in commands).

## Platform changes (2.7.2)

| Platform | Changes |
|---|---|
| **Windows (win64)** | Both changes (shared resources) — see above; the rest is unchanged. |
| **Linux (linux64)** | Both changes (shared resources) — see above; the rest is unchanged. |
| **Linux (linux-arm64)** | Both changes (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-arm64)** | Both changes (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-x64)** | Both changes (shared resources) — see above; the rest is unchanged. |
| **Android (apk)** | Both changes (shared resources) — see above; versionCode 20702. |

## Verification

- - gen-version --check: OK 2.7.2; verify-deps: OK.
