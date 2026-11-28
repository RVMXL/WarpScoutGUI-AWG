# WarpScoutGUI 2.8.0 — live scan, GUI update banner, new exports (prerelease)

English | [Русский](RELEASE-2.8.0.md)

WarpScoutGUI 2.8.0 is a batch of improvements based on a review of three
third-party warpscout GUIs (HattabbI4, 3inker, openwarpkit): scanning moves
to the 0.17.0 core's `-stream-json` mode (a live table and honest progress),
the app learns to announce its own new version, config export gains
mihomo JSON and a usque config.json, and two tools "for when everything
fails" appear: automatic I1 profile search and re-running a scan from
history. **This release is published as a PRERELEASE** — after review it is
promoted to a full release (prerelease=false, make_latest=true); while it is
a pre-release, the update banner below does not fire — GitHub excludes
pre-releases from `releases/latest`. Data formats are unchanged: reports,
configs, account, history and backups remain fully compatible with 2.7.3.

## What changed

- Live scan table via -stream-json. The scan runs with -stream-json, the
flag warpscout 0.17.0 added exactly for GUI wrappers (schema
warpscout-v1.schema.json). Progress events carry exact done/total for the
ports/tunnels/speed phases — the progress bar shows real percentages for
the first time instead of regex guesses; endpoint events fill the table
as results arrive (renders throttled to 800 ms — a full -f scan emits
hundreds of events); error lines hit the log with a [CLI] prefix; the
done event carries the authoritative result document
(working/torn/picks/best) the final table is built from. The live panel
(chart, node chips, counters) feeds on the same structured events. The
report file is still written: an explicit -o brings it back (the CLI
suppresses reports in stream mode), it feeds the Android mirror in
Download/WARPScoutGUI and serves as a fallback. Compatibility: on
warpscout <0.17 (a custom CLI in Settings) the version gate omits the
flag entirely; if an old core still dies with "flag provided but not
defined", the same session silently restarts in the regular mode (report
file) with a note in the log.

- A "⬆ WarpScoutGUI {v} — update available" banner. Symmetric to the 2.7.3
warpscout hint: once per session (at most once per 12 hours, its own
localStorage marker) the app reads its own repository's releases/latest
through api.github.com — the same single external CSP host, read-only
HTTPS with no user data. When a newer version exists, a second yellow row
appears in the sidebar status line; click (or keyboard) opens the releases
page. GitHub excludes pre-releases and drafts from releases/latest — the
banner fires only on promoted versions. Any network error stays silent.

- mihomo .json export. The same proxies as the Clash .yaml (a
WireGuard+AmneziaWG proxy with the full amnezia-wg-option block — 3.1
timings, I1–I5 — plus MASQUE nodes when the account has the device), as a
JSON array: the shape of the CLI -conf-type mihomo-json, keys identical to
the YAML. A "🧩 mihomo .json" button next to Clash/WireSock.

- usque config.json export. The usque format needs ECDSA keys, a license
and an access_token that do not exist in the WG/AWG part of the account,
and assembling it in the GUI would drift from the core. The honest source
is the core itself: a "🪶 usque config.json" button runs a short
single-endpoint scan (scan -p masque -target <ip> -port <port> -n 1
-conf - -conf-type native, the same mechanism as "I1 from scan") and
saves the ready config.json through the standard dialog. Empty/invalid
output — a toast, nothing is written.

- Automatic I1 profile search. A toggle in the AmneziaWG obfuscation card:
if an AWG scan finds no working endpoints, the app itself walks the
"If nothing works" profiles from the core README (quic → dns → sip →
stun → random, minus the current one) within the same session, showing
"Auto I1: profile {p} ({n}/{m})"; the working profile stays in the
constructor. Intermediate empty attempts do not pollute history — a
single entry records the chain's outcome. Stop breaks the chain; wg and
masque are untouched.

- "Best by speed" finished. The -best-by speed flag existed in the
constructor — now the best-star in the table, the post-scan config pick
and the SOCKS "★ Best" button all honor it: with a speed measurement, the
endpoint with the highest SPEED is the best one, not the lowest ping.

- Re-run a scan from history. History entries carried a parameter snapshot
since 2.4.6 (F18/F30) with no way to use it. A "⟳" button on every entry
restores the parameters into the constructor (it does not start the scan
by itself), keyboard-accessible, with a confirmation toast.

- A warning when closing with an active SOCKS (desktop). The windowClose
event is intercepted: with a SOCKS proxy running, the window asks to
close and stop the proxy — declining keeps the app open, accepting stops
the proxy, saves state and exits. Demo and Android are unaffected.

- Demo mode. A NDJSON -stream-json script (the same data as the text report,
including the variation), the auto-I1 toggle demo-nostrifies an empty scan
(the first no-profile run comes back empty, the next one finds endpoints),
the GUI banner is shown against a mock "v2.9.0", the usque button returns
a mock config.json.

## Platform changes (2.8.0)

| Platform | Changes |
|---|---|
| **Windows (win64)** | All items above (shared resources); window close = F8. |
| **Linux (linux64)** | All items above (shared resources); window close = F8. |
| **Linux (linux-arm64)** | All items above (shared resources); window close = F8. |
| **macOS (mac-arm64)** | All items above (shared resources); window close = F8. |
| **macOS (mac-x64)** | All items above (shared resources); window close = F8. |
| **Android (apk)** | All items above except F8 (windowClose never arrives on Android); versionCode 20800. |
