# GitHub Release notes — v2.5.0 (prerelease)

## RU

### WarpScoutGUI 2.5.0 — кроссплатформенный выпуск (пререлиз)

Первый выпуск на единой кодовой базе для шести целевых платформ:
Windows (x86_64), Linux (x86_64 / ARM64), macOS (Apple Silicon / Intel),
Android (ARM64).

**Статус стабильности.** Windows-логика не изменялась с релиза 2.4.6:
платформенный слой добавляет ветки Linux/macOS/Android, не затрагивая
существующие пути выполнения (проверено сверкой кода и живыми регрессионными
прогонами). Проведён статический аудит по методике 2.4.6 (командные потоки,
границы недоверенных данных, жизненный цикл процессов, упаковка; отчёт —
AUDIT-v2.5.0.md). E2E на живом Linux-рантайме: регистрация (Cloudflare API),
скан, отчёты, генерация конфигов. Ядро warpscout ARM64 проверено под
эмуляцией AArch64; сенсорный UI — в эмуляции 390×844.

**Ограничения верификации.** macOS- и Android-сборки не исполнялись в среде
сборки (Mach-O не эмулируется; Android требует устройства): поведение
Gatekeeper/WKWebView и WebView/SAF-диалогов подлежит ручной smoke-проверке.
О выявленных дефектах сообщайте в Issues.

**Android:** APK подписан фиксированным ключом — обновления устанавливаются
поверх установленной версии без удаления данных (versionCode 20500, пакет
ru.warpscout.gui).

**Состав пакетов:** бинарный архив с resources.neu, bin/warpscout v0.16.0
(MIT) и папкой licenses/ (лицензии всех компонентов). Список изменений
функциональности — в README.txt каждого архива.

## EN

### WarpScoutGUI 2.5.0 — cross-platform release (pre-release)

First release built from a single codebase targeting six platforms:
Windows (x86_64), Linux (x86_64/ARM64), macOS (Apple Silicon/Intel),
Android (ARM64).

**Stability.** Windows behavior is unchanged since 2.4.6: the platform
layer only adds Linux/macOS/Android branches, leaving existing code paths
intact (verified by code diff review and live regression runs). A static
audit per the 2.4.6 methodology passed (command streams, untrusted-data
boundaries, process lifecycle, packaging — see AUDIT-v2.5.0.md). Live
Linux-runtime E2E: registration (Cloudflare API), scanning, reports,
config generation. The ARM64 warpscout core was verified under AArch64
emulation; the touch UI was verified at 390×844.

**Verification limits.** The macOS and Android builds were not executed
in the build environment (Mach-O cannot be emulated here; Android requires
a device): Gatekeeper/WKWebView and WebView/SAF-dialog behavior still
requires manual smoke testing. Please report defects via Issues.

**Android:** the APK is signed with a fixed key, so updates install over
the existing app without data loss (versionCode 20500, package
ru.warpscout.gui).

**Package contents:** portable archive with resources.neu, bin/warpscout
v0.16.0 (MIT) and a licenses/ folder (licenses for all bundled
components). The functional changelog is in each archive's README.txt.
