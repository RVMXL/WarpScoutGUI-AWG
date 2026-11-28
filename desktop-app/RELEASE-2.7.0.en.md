# WarpScoutGUI 2.7.0 — Advanced-tab layout fix, unified obfuscation parameters, Clash and WireSock export

English | [Русский](RELEASE-2.7.0.md)

WarpScoutGUI 2.7.0 covers three user requests: (1) on the "Config" tab, the
AWG 3.1 field labels in "Advanced" overlapped each other; (2) obfuscation
parameters lived in three places with different scopes — Jc/Jmin/Jmax are now
one shared set for "Scan" and "Config"; (3) the config generator gained export
to Clash.Meta/mihomo (following the user's example: AWG + MASQUE + group +
MATCH) and to WireSock (the extra Id/Ip/Ib keys). The warpscout core is still
0.16.0 (`deps.json` SHA pins match). Data formats are unchanged: reports,
configs, account and history remain fully compatible with 2.6.x.

## What changed

- The "Advanced" layout is fixed. The AWG 3.1 grid used to squeeze into the
right half of the outer two-column grid (~90px cells) and the long
unbreakable identifiers overlapped the neighbours. Now the grid spans the
full card width and the labels wrap by character.

- Jc/Jmin/Jmax are shared between scan and config. The single source is
`S.cfg.obf`; editing the "AmneziaWG obfuscation" card on the "Scan" tab
updates the config (and its preview) and vice versa. The scan now probes
endpoints with the exact set that goes into the config. "Random junk"
(-gen-junk) remains scan-only: the CLI randomizes the set for the run
without touching the config. Junk values found by the Param finder go to the
shared source; the v2.4.6 (F18) copy-from-last-run block is removed as
redundant; legacy per-scan junk fields in states/presets are ignored. Both
cards carry a hint explaining the sharing.

- Export for other clients. A new card on the "Config" tab. "Clash .yaml" —
a Clash.Meta/mihomo profile following the user's example: the warp-common
anchor (WireGuard with account keys/addresses, allowed-ips, MTU, DNS,
reserved), amnezia-wg-option with every obfuscation parameter (S1–S4,
Jc/Jmin/Jmax, H1–H4, I1/I2–I5, and for AWG 3.1 the timing keys; version
1/2/3 follows the selected config version), [WARP-MASQUE] QUIC/H2 nodes when
the account has a masque device, a Cloudflare select group and the
`MATCH,Cloudflare` rule. The WARP reserved bytes are an optional field
(taken from a working Clash/wgcf config of the same account, digits only,
max 3). "WireSock .conf" — the same config as in the preview plus optional
Id/Ip/Ib keys (card fields; they never reach the standard .conf). File
names: `warp-clash.yaml`, `warp-wiresock.conf`.

## Platform changes (2.7.0)

| Platform | Changes |
|---|---|
| **Windows (win64)** | All three changes (shared resources) — see above; the rest is unchanged. |
| **Linux (linux64)** | All three changes (shared resources) — see above; the rest is unchanged. |
| **Linux (linux-arm64)** | All three changes (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-arm64)** | All three changes (shared resources) — see above; the rest is unchanged. |
| **macOS (mac-x64)** | All three changes (shared resources) — see above; the rest is unchanged. |
| **Android (apk)** | All three changes (shared resources) — see above; the "Advanced" layout was verified in touch mode; versionCode 20700. |

## Verification

- - gen-version --check: OK 2.7.0; verify-deps: OK.
