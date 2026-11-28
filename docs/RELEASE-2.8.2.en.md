# WarpScoutGUI 2.8.2 — custom CLI flags, AWG 3.1 on the Scan tab, QUIC default (prerelease)

English | [Русский](RELEASE-2.8.2.md)

WarpScoutGUI 2.8.2 — four items from the 2.8.0/2.8.1 pre-release review (user
requests): manual warpscout flag entry in console style ("option 1"), removal of
the "Thorough" preset (a duplicate of the `-f` toggle), AWG 3.1 control right on
the Scan tab (on/off and the timings), and the default I1 profile switched to
QUIC (instead of iCloud) — like the other warpscout GUIs. Bonus: multi-value
filters (`-exclude-node DME,FRA`, `-target ip,cidr`) no longer collapse into a
garbage token. **This release is published as a PRERELEASE** — after review it is
promoted to a full release (prerelease=false, make_latest=true). Data formats are
unchanged: reports, configs, account, history and backups remain fully compatible
with 2.8.1/2.8.0/2.7.3.

## What changed

- Custom CLI flags (option 1). A new card on the Scan tab: a free-form input for
warpscout flags in console style — for everything the form does not cover
(-sweep-ports, -mtu, -dns, -table-off, -emoji, -conf/-conf-type, -I/-interface,
-best, -no-dns). Whitelist validation at the command boundary (parseExtraArgs):
unknown flags, positional junk, broken values produce an explicit error naming
the token (red line under the field + a toast on run); duplicates of flags the
form adds itself are rejected with an explanation. The value of a duplicated
value-flag is consumed ("-p awg" yields a single error). With any error the run
is rejected entirely. Sanitization: single line, control characters stripped,
500-char limit. Whitelist maps are prototype-free.

- The "Thorough" preset is removed. It duplicated the "all 256 subnet addresses
-f" toggle (a full scan is one toggle away, the speed test sits next to it);
two paths to the same thing only confused. The other presets and custom
presets are unchanged.

- AWG 3.1 on/off and timings right on the Scan tab. The "AmneziaWG obfuscation"
card gains a "AWG 3.1 timings (-p awg31)" toggle and an expandable timings
block. The values are the SAME shared sources as before: the toggle equals
Config → Version (turning it off brings the scan and the config back to AWG
2.0), the timings live in the shared obfuscation state — editing either tab
updates both and the preview (like the junk fields in 2.7.0). All form reads
happen BEFORE any mirror writes — no mirror war inside one sync; changing the
version on the Config tab (including .conf/backup import) instantly toggles
the Scan-tab switch.

- Default I1 profile is QUIC. Like the other warpscout GUIs — for a reason: the
QUIC disguise of the first packet works more often. "iCloud (basic)" remains a
segment option. A one-time migration for existing installs: a stored genI1:""
is raised to quic EXACTLY ONCE (settings.i1QuicMigrated flag) — a later explicit
choice (including icloud) is preserved; old backups/presets without the field
get the new default, an explicit "" stays. The auto-I1 demo scenario is adapted.

- Multi-value filters fixed (commas). The CLI splits -exclude-node/-exclude-country/
-target on commas (splitList in the core flags.go), while the GUI's safeVal
stripped commas — "DME,FRA" and "ip,cidr" collapsed into a garbage token even
though the form placeholders suggested exactly that format. Commas are preserved
now: on Windows the spawn goes through CreateProcess (CommandLineToArgvW parsing,
commas do not split argv); on POSIX the spawn goes through /bin/sh -c, so `$`,
`\` and `#` are always stripped (variable substitution, escaping, tail comments).

- Demo. Rebuilt from resources (sync-demo 28a3); no new behavioral scenarios —
only the auto-I1 scenario adapted to the new default.

## Platform changes (2.8.2)

| Platform | Changes |
|---|---|
| **Windows (win64)** | All items above (shared resources). |
| **Linux (linux64)** | All items above (shared resources); the comma fix matters twice over — spawning goes through /bin/sh. |
| **Linux (linux-arm64)** | All items above (shared resources); the comma fix matters twice over — spawning goes through /bin/sh. |
| **macOS (mac-arm64)** | All items above (shared resources); the comma fix matters twice over — spawning goes through /bin/sh. |
| **macOS (mac-x64)** | All items above (shared resources); the comma fix matters twice over — spawning goes through /bin/sh. |
| **Android (apk)** | All items above (shared resources; the bridge tokenizer is POSIX-compatible — commas are safe); versionCode 20802. |
