# GitHub Release notes — v2.5.7 (prerelease)

English | [Русский](RELEASE-2.5.7.md)

### WarpScoutGUI 2.5.7 — android-fix (prerelease)

Android ARM64 fixes: (1) saved configs keep their real name — «*.conf» is no longer
turned into «*.conf.txt»/«*.txt» (MIME is now derived from the file extension; unknown
extensions get a neutral extension-less MIME; the actual display name is read back
after insert); (2) «Open folder» launches the system Files app (DocumentsUI)
explicitly — OEM file managers no longer hijack the directory intent and show their
own root; (3) IS_PENDING writes dropped — some firmwares rendered pending entries as
ghost folders in Downloads.

Other platforms ship the same version number with a rebuilt resources.neu
(no functional changes). LICENSE copyright line filled in (`Copyright 2026 RVMXL`).

APK is signed with the same fixed key as 2.5.0–2.5.6 — updates install over without
data loss (versionCode 20507). SHA-256 table above.
