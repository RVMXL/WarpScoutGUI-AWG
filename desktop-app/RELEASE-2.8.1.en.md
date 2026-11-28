# WarpScoutGUI 2.8.1 — scroll without scrolling, speed flags on top, no-loss star (prerelease)

English | [Русский](RELEASE-2.8.1.md)

WarpScoutGUI 2.8.1 — three focused fixes from the 2.8.0 pre-release review
(user report): the Scan and Config tabs no longer have double scrolling (page
+ settings column), the "Speed test" and "Best by speed" toggles move out of
"advanced" into the main flag group next to `-P`, and the "best" star no
longer goes to endpoints with packet loss — losses matter more than a lower
ping. **This release is published as a PRERELEASE** — after review it is
promoted to a full release (prerelease=false, make_latest=true). Data formats
are unchanged: reports, configs, account, history and backups remain fully
compatible with 2.8.0/2.7.3.

## What changed

- The Scan and Config tabs no longer scroll as a page (desktop). Both tabs
used to have two independent scroll areas: the page itself (.main) and the
settings column. Scrolling the page pushed the settings out of view (the
column "hid", leaving only its tail near the bottom of the screen — see the
report screenshot), while the right column (results table / preview+export)
dragged the document height along. Now the two-column desktop view never
scrolls as a page: a `minmax(0, 1fr)` grid row pins BOTH columns to the
viewport height and each scrolls only inside itself — settings on the
left, the command line and results table on the right (the preview and
export sit fully on one screen). The results table and log take exactly
the remaining space (flex) instead of the old `max-height: calc(100vh - …)`
heuristics — on short windows the table shrinks and scrolls internally.
The 1081px threshold sits right above the existing single-column
breakpoint (≤1080px); the mobile layout and touch mode (Android, demo
`?touch=1`) are unaffected — the page still scrolls there.

- Speed flags move to the main flag group. The -speed and -best-by speed
toggles move from the "WARP-in-WARP & advanced" details card (the bottom
of the form) into the "Check & sampling" card — next to -P and -f, without
expanding the "optional" section. Short hints are added: -speed adds the
SPEED column and makes the scan longer; -best-by speed drives the star and
the config pick by maximum SPEED and enables the measurement itself.
State, presets, the command builder and the version gates are unchanged —
a pure DOM move plus two new dictionary hints (RU/EN).

- Best star: losses first, ping second. Row quality is compared
lexicographically (LOSS, PING) — exactly how warpscout sorts its own
report: an endpoint without loss always beats a lossy one with a lower
ping (0% loss matters more than tens of milliseconds — loss breaks the
transfer while ping differences are barely noticeable), among lossy rows
lower loss wins, ties go to the lower ping. Without a LOSS column (scan
without -P, older reports) the comparison degenerates to the previous
"lowest ping". The order is applied everywhere a best is picked: the star
in the results table, the config select grouping (per-node bests and the
overall best), the post-scan config pick, the SOCKS "★ Best" button and
the star in the standalone HTML report ("Share scan"). "Best by speed"
(-best-by speed) honors losses too: maximum SPEED is searched among
loss-free rows first, with a fallback to lossy ones (previously both the
star and "best by speed" could point at a lossy row). The "⚡ best"
statistics chip is renamed to "⚡ min ping" — it remains the minimum TUN
PING of the sample (it no longer reads as "where the star is").

- Demo. Rebuilt from resources (sync-demo 28a2); no new demo scenarios.

## Platform changes (2.8.1)

| Platform | Changes |
|---|---|
| **Windows (win64)** | All items above (shared resources). |
| **Linux (linux64)** | All items above (shared resources). |
| **Linux (linux-arm64)** | All items above (shared resources). |
| **macOS (mac-arm64)** | All items above (shared resources). |
| **macOS (mac-x64)** | All items above (shared resources). |
| **Android (apk)** | Items 2–3 (speed flags, star); item 1 does not apply — the Android layout is single-column and page scroll is the norm; versionCode 20801. |
