# GitHub Release notes — v2.5.9 (prerelease)

## RU

### WarpScoutGUI 2.5.9 — security-харденинг по итогам техаудита (пререлиз)

Закрыты три находки уровня Medium и конфигурационные упущения внешнего
технического аудита репозитория (20 находок: 0 Critical, 2 High, 6 Medium,
5 Low, 7 Info). High-находки аудита (монолит app.js, отсутствие автотестов) —
инженерная устойчивость, а не уязвимости; они приняты в roadmap и в этот
релиз не входят.

**Изменения по платформам (2.5.9):**

| Платформа | Статус | Изменения в 2.5.9 |
|---|---|---|
| Android ARM64 | исправлено (2 Medium + 1 процессное) | **① SEC-2: `allowBackup=false`.** Приложение хранит приватные ключи WARP (warpscout-account.json) — автоматические облачные резервные копии и adb backup отключены полностью. **② SEC-1: chmod под контролем аргументов.** Ранее проверялось только имя программы (argv[0]) — остальным аргументам chmod доверялось; теперь допустима ровно одна форма «chmod +x <файл>» (или «a+x»), где файл — ядро warpscout либо путь внутри разрешённых guardPath-корней; числовые режимы (777), снятие прав (−x) и цели вне корней отклоняются. **③ Сопровождающее:** CSP (см. desktop) входит и в Android-сборку (общие ресурсы) |
| Windows x86_64 | SEC-3 (CSP) + пересборка | **SEC-3: Content-Security-Policy** в index.html — второй барьер после экранирования: скрипты/стили/картинки — только локальные ресурсы приложения, соединения — только к локальному API Neutralino (ws/http на 127.0.0.1/localhost); object-src/base-uri/form-action закрыты. При компрометации динамического контента XSS больше не даёт прямого доступа к нативным API. resources.neu пересобран, версия синхронизирована |
| Linux x86_64 | SEC-3 (CSP) + пересборка | идентично Windows (общий resources.neu) |
| Linux ARM64 | SEC-3 (CSP) + пересборка | идентично Windows (общий resources.neu) |
| macOS arm64 (Apple Silicon) | SEC-3 (CSP) + пересборка | идентично Windows (общий resources.neu) |
| macOS x64 (Intel) | SEC-3 (CSP) + пересборка | идентично Windows (общий resources.neu) |

**Инструментарий и документация (без изменения артефактов):** релизный
публикатор параметризован (пути песочницы разработки убраны — SEC-8);
README.txt внутри пакетов показывает актуальный статус выпуска (REL-1);
версия в сайдбаре интерфейса синхронизируется из единого источника
NL_APPVERSION (частичный ARCH-2); ESLint-конфиг лендинга игнорирует
vanilla-JS-домен desktop-app.

**Статус верификации.** CSP проверен в живом Neutralino-рантайме (cloud-mode):
загрузка ресурсов, реальный WS-клиент, файловые API, spawn процесса,
РЕАЛЬНАЯ регистрация аккаунта (Cloudflare API) и РЕАЛЬНЫЙ скан (108
результатов, рендер таблицы) — без единого CSP-нарушения в консоли; то же —
для file://-загрузки (эмуляция Android WebView). APK: apksigner OK,
сертификат — прежний мастер-ключ, `allowBackup=false` подтверждён дампом
манифеста (aapt2). Zip ×5 пересобраны детерминированно — SHA-256
воспроизведены байт-в-байт. Smoke на реальных устройствах — за
пользователем; о дефектах сообщайте в Issues.

**Android:** APK подписан тем же фиксированным ключом (cert SHA-256
`67:96:9F:F2:…:AC:98:41`), что и 2.5.0–2.5.8 — обновление устанавливается
поверх без удаления данных (versionCode 20509, пакет `ru.warpscout.gui`).

**SHA-256 артефактов:**

```
a35265a85febe579bc18682f3b7e3b5646494e68751963a1400412a8a766741d  WARPScoutGUI-2.5.9-win64.zip
2d38dbda34423c143c2a98f516291f18b761cf476f2d32d8ffd83b97fb88ded5  WARPScoutGUI-2.5.9-linux64.zip
cbdfe56282cbaeb97a719df586962b6942ccda24373630967cd2cfd4c9a2d369  WARPScoutGUI-2.5.9-linux-arm64.zip
6e5810cb294f7489a4a4b42ede0d90a865716b5ed93f28769a8d0b083425c873  WARPScoutGUI-2.5.9-mac-arm64.zip
251bca9b653f11ffde8d172fc9138322bebb0277e95a460f335613e3b7bf123f  WARPScoutGUI-2.5.9-mac-x64.zip
cd499ea7fa900cf8db3fb85401a5b9847e05e54b370970de6e1720971e5b308f  WARPScoutGUI-2.5.9-android-arm64.apk
```

## EN

### WarpScoutGUI 2.5.9 — security hardening from the technical audit (pre-release)

Closes three Medium findings and configuration gaps of the external technical
audit (20 findings: 0 Critical, 2 High, 6 Medium, 5 Low, 7 Info). The audit's
High findings (app.js monolith, zero automated tests) are engineering-
resilience items, not vulnerabilities; they are accepted into the roadmap and
are not part of this release.

**Changes per platform (2.5.9):**

| Platform | Status | Changes in 2.5.9 |
|---|---|---|
| Android ARM64 | fixed (2 Medium + 1 process-level) | **① SEC-2: `allowBackup=false`.** The app stores WARP private keys (warpscout-account.json) — automatic cloud backups and adb backup are now fully disabled. **② SEC-1: chmod arguments validated.** Previously only the program name (argv[0]) was checked — the remaining chmod arguments were trusted; now exactly one shape is allowed, "chmod +x <file>" (or "a+x"), where file is the warpscout core or a path inside the allowed guardPath roots; numeric modes (777), permission removal (−x) and targets outside the roots are rejected. **③ Accompanying:** the CSP (see desktop) ships in the Android build as well (shared resources) |
| Windows x86_64 | SEC-3 (CSP) + rebuild | **SEC-3: Content-Security-Policy** in index.html — a second barrier after output escaping: scripts/styles/images load only from the app's local resources, connections go only to the local Neutralino API (ws/http on 127.0.0.1/localhost); object-src/base-uri/form-action are closed. If dynamic content is ever compromised, XSS no longer grants direct access to native APIs. resources.neu rebuilt, version synchronized |
| Linux x86_64 | SEC-3 (CSP) + rebuild | identical to Windows (shared resources.neu) |
| Linux ARM64 | SEC-3 (CSP) + rebuild | identical to Windows (shared resources.neu) |
| macOS arm64 (Apple Silicon) | SEC-3 (CSP) + rebuild | identical to Windows (shared resources.neu) |
| macOS x64 (Intel) | SEC-3 (CSP) + rebuild | identical to Windows (shared resources.neu) |

**Tooling and docs (no artifact changes):** the release publisher is
parameterized (development-sandbox paths removed — SEC-8); the README.txt
inside packages shows the actual release status (REL-1); the sidebar version
is synchronized from the single NL_APPVERSION source (partial ARCH-2); the
landing ESLint config ignores the vanilla-JS desktop-app domain.

**Verification status.** CSP validated in a live Neutralino runtime
(cloud-mode): resource loading, the real WS client, file APIs, process spawn,
a REAL account registration (Cloudflare API) and a REAL scan (108 results,
table rendering) — with zero CSP violations in the console; the same holds
for file:// loading (Android WebView emulation). APK: apksigner OK,
certificate — same master key, `allowBackup=false` confirmed via manifest
dump (aapt2). The five zips were rebuilt deterministically — SHA-256
reproduced byte-for-byte. On-device smoke testing remains with the user;
please report defects via Issues.

**Android:** the APK is signed with the same fixed key (cert SHA-256
`67:96:9F:F2:…:AC:98:41`) as 2.5.0–2.5.8 — updates install over the existing
version without data loss (versionCode 20509, package `ru.warpscout.gui`).

**Artifact SHA-256:**

```
a35265a85febe579bc18682f3b7e3b5646494e68751963a1400412a8a766741d  WARPScoutGUI-2.5.9-win64.zip
2d38dbda34423c143c2a98f516291f18b761cf476f2d32d8ffd83b97fb88ded5  WARPScoutGUI-2.5.9-linux64.zip
cbdfe56282cbaeb97a719df586962b6942ccda24373630967cd2cfd4c9a2d369  WARPScoutGUI-2.5.9-linux-arm64.zip
6e5810cb294f7489a4a4b42ede0d90a865716b5ed93f28769a8d0b083425c873  WARPScoutGUI-2.5.9-mac-arm64.zip
251bca9b653f11ffde8d172fc9138322bebb0277e95a460f335613e3b7bf123f  WARPScoutGUI-2.5.9-mac-x64.zip
cd499ea7fa900cf8db3fb85401a5b9847e05e54b370970de6e1720971e5b308f  WARPScoutGUI-2.5.9-android-arm64.apk
```
