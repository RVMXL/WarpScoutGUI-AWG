# WarpScoutGUI 2.7.1 — "I1 from scanning", meaningful presets

English | [Русский](RELEASE-2.7.1.md)

WarpScoutGUI 2.7.1 covers two user requests: (1) the I1 used by the scan
(the `-gen-i1` profile from the "Scan" tab or a packet found in the "Param
finder") can now be inserted into the config with one button — a fresh
packet of the same profile, verified on the config endpoint, so the scan
finds working endpoints and the config no longer turns out to be dead
afterwards; (2) the "Scan" tab presets are renamed to match their meaning:
"Fast" no longer means "a run through wg" — it is the standard AWG scan at
3 addresses per subnet, and the former wg run became the "No obfuscation"
preset. The warpscout core is still 0.16.0 (`deps.json` SHA pins match).
Data formats are unchanged: reports, configs, account and history remain
fully compatible with 2.7.0.

## What changed

- The "I1 from scan" button. A scan with `-gen-i1` generates the init
packet on the fly (per run) and never includes it in the report — the
packet of a past run is unrecoverable. But warpscout prints the CONCRETE
packet in the `scan -conf -` output (the ready-made config of the best
endpoint carries the `I1 = …` line): verified on the real CLI both for
the `-gen-i1 quic/dns/sip/stun/random` profiles (with `-i1-sni`) and for
the default iCloud probe. The new button on the "Config → Obfuscation →
Advanced" panel (next to "Import I1 from .conf") runs a mini-scan of one
endpoint — the one picked on the "Config" tab (the best endpoint lands
there right after a scan) — with the same profile and SNI the last scan
used (lastRunParams snapshot; junk follows the same priority branch as
the QC check: gen-i1 → gen-junk → the shared set from S.cfg.obf), with
`-plain -conf - -conf-type native -no-report` flags (no report file, no
tunnel ping) and parses the fresh I1 from stdout. The packet is rebuilt
from scratch — different bytes, same shape/profile — so the config no
longer lags behind the scan. While running, the button is disabled and
shows "…"; a concurrent run is blocked; if the endpoint does not respond,
an honest toast suggests trying another endpoint; when the last run was
not AWG (masque/wg) an explanation says I1 only applies to awg scans;
an `I1 = none` line in the output is rejected; the hint under the I1
field is updated (it no longer claims the packet cannot be extracted).

- Presets renamed to match their meaning. "⚡ Fast" used to mean "plain
WireGuard without in-tunnel checks" — that is the absence of
obfuscation, not speed. Now "⚡ Fast" = the same standard AWG scan
(tunnel ping and every parameter at defaults) but 3 addresses per subnet
instead of 10 — a thrice shorter run when time is short. The former wg
run is a separate "🚫 No obfuscation" preset (wg, no -P, 5 addresses per
subnet) for networks where WARP is not filtered. Preset hints now use
i18n dictionary ids: the EN translation works for the hint under the
chips too, and the hint updates on language switch.

## Platform changes (2.7.1)

| Platform | Changes |
|---|---|
| **Windows (win64)** | Both changes (shared resources) — see above; the rest is unchanged. |
| **Linux (linux64)** | Both changes (shared resources) — see above; the rest is unchanged. |
| **Linux (linux-arm64)** | Both changes (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-arm64)** | Both changes (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-x64)** | Both changes (shared resources) — see above; the rest is unchanged. |
| **Android (apk)** | Both changes (shared resources) — see above; versionCode 20701. |

## Verification

- - gen-version --check: OK 2.7.1; verify-deps: OK.
