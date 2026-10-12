# WarpScoutGUI 2.6.0 — security & infrastructure (prerelease)

WarpScoutGUI 2.6.0 — hardening-релиз по итогам внешнего аудита: закрыты оставшиеся
находки SEC-4/5/6/7/9, внедрена инженерная база (CI, юнит-тесты, SBOM, провенанс
вендорных библиотек), прекомпилированные бинарники выведены из git.

WarpScoutGUI 2.6.0 is a hardening release following the external audit: remaining
SEC-4/5/6/7/9 findings are closed, engineering infrastructure is in place (CI,
unit tests, SBOM, vendored-library provenance), and prebuilt binaries are removed
from git.

**Статус выпуска: ПРЕРЕЛИЗ 2.6.0.** Ядро warpscout не менялось (0.16.0 во всех
пакетах). Функциональность сканирования и генерации конфигов не менялась.

**Release status: PRERELEASE 2.6.0.** The warpscout core is unchanged (0.16.0 in
every package). Scanning and config generation behaviour is unchanged.

## Политика выпуска / Release policy

Каждый релиз содержит ВСЕ платформы под единой версией. Чейнжлог построчно
указывает, что изменено на каждой платформе, а где изменений нет.

Every release ships ALL platforms under a single version. The changelog states
per platform what changed and what did not.

## Изменения по платформам (2.6.0) / Platform changes (2.6.0)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Изменения функциональности отсутствуют. Командная граница перестроена без смены поведения: `Unblock-File` собирается единственной точкой кавычек `psQuote()` с фильтром метасимволов, снятие junction-ссылок — нативным `fs.remove` вместо `cmd /c rmdir`, фоновая чистка кэша прогоняет пути через `cmdWinPath` (аудит SEC-5). |
| **Linux (linux64)** | `chmod +x` выполняется нативным `Neutralino.filesystem.setPermissions` вместо shell-команды (SEC-5) — поведение идентично. Остальное — без изменений. |
| **Linux (linux-arm64)** | Как linux64. |
| **macOS (mac-arm64)** | Как linux64. |
| **macOS (mac-x64)** | Как linux64. |
| **Android (android-arm64)** | Существенные изменения: (1) **SEC-6** — единственное разрешение приложения теперь `INTERNET`; «Все файлы» (MANAGE) и WRITE_EXTERNAL_STORAGE удалены вместе с механикой «В общую папку»: кнопка и выбор папки данных на Android убраны, данные всегда живут в app-specific каталоге, а наружу (файловым менеджерам) копируются в единую папку `Download/WARPScoutGUI` через MediaStore — копия отчёта после скана и копия аккаунта теперь реально создаются (раньше зеркалирование было заглушкой); данные пользователей 2.5.8 из `/storage/emulated/0/WARPScoutGUI` автоматически возвращаются в приватный каталог при первом запуске. (2) **SEC-7** — синхронные вызовы моста ограничены таймаутом 30 с с принудительной остановкой зависшего процесса (раньше — вечная блокировка JavaBridge-потока). (3) **SEC-9** — явная политика WebView: `file:`-навигация только внутри `android_asset`, межфайловый XHR запрещён явно. (4) **SEC-4** — внутренний FileProvider отдаёт файлы только из корней приложения и только на чтение. |

Windows / Linux / macOS: no functional changes — command-boundary hardening only.
Android: storage model reworked (single fixed public export folder via MediaStore,
zero storage permissions), bridge timeouts, explicit WebView policy, hardened
FileProvider.

## Инженерная база (вне артефактов) / Engineering (outside artifacts)

- **CI (INFRA-1)**: GitHub Actions — синтаксис JS/Python, согласованность версии,
  юнит-тесты, хэш-контроль бинарников, детерминизм `resources.neu` (двойная
  сборка → побайтово совпадающий результат).
- **Юнит-тесты (ARCH-4)**: 50 тестов чистых функций — парсеры отчётов/endpoint,
  санитайзеры импорта, валидация аккаунта, билдеры команд, защита миграции
  (node --test, ноль зависимостей).
- **Бинарники вне git (ARCH-3)**: 80+ МБ прекомпилированных файлов выведены из
  репозитория; артефакты — в Releases, хэши — в `tools/deps.json`, восстановление
  рабочей копии — `tools/fetch-binaries.py --release vX.Y.Z` со сверкой SHA-256.
- **Цепочка поставки (INFRA-2)**: `tools/deps.json` — пин версий и SHA-256 всех
  сторонних бинарников; `tools/verify-deps.py` — проверка до релиза.
- **Провенанс (INFRA-3)**: вендорная `qrcode.js` идентифицирована (upstream
  qrcode-generator, тег js1.5.2, байт-в-байт).
- **Changelog (REL-2)**: `CHANGELOG.md` — вся история 2.4.4→2.5.9 восстановлена
  из коммитов и release-заметок; продолжается с этой версии.
- **Демо (QUAL-2)**: блокирующий `window.prompt` в браузерном демо заменён
  честным сообщением.
- **Версия из одного источника (ARCH-2, завершение)**: `tools/gen-version.py`
  генерирует версию в mock/index/build-zips/манифест/README пакетов из
  `neutralino.config.json`; `pack-neu.py` отказывается собирать рассинхрон.

## Артефакты / Artifacts

| Файл | SHA-256 |
|---|---|
| WARPScoutGUI-2.6.0-win64.zip | `36a6cc79789f8835e8d1a5dcc7fdc98b2700ea0804a1afbb17caf70848633013` |
| WARPScoutGUI-2.6.0-linux64.zip | `0f4b2e87690d6639b14653b4426cbf6fa530d8340fef2ba1fc5026dcd40d7e27` |
| WARPScoutGUI-2.6.0-linux-arm64.zip | `92eb646da10d6b471342f4b9366f81fe932f07e2ab2d524a1d7f2a0ed701c475` |
| WARPScoutGUI-2.6.0-mac-arm64.zip | `fd37ac0fd6646d21feeea408fe2494a4b7ceab34d59cc5a44aefa5a430e86892` |
| WARPScoutGUI-2.6.0-mac-x64.zip | `d6c35f7599a77a7d80cf8e09e5c018e064564b1c0eb809f34a22921f2fbf60de` |
| WARPScoutGUI-2.6.0-android-arm64.apk | `8444e4d27c092c93291d272cbd1839dbbf8aa1337c37a5931ab106496d3adc45` |

Все zip содержат: README.txt, WARPScoutGUI (рантайм), resources.neu, bin/warpscout,
licenses/ (4 лицензии). APK подписан тем же сертификатом, что и 2.5.0–2.5.9
(SHA-256 `67969ff2…ac9841`) — обновление поверх установленных версий работает.

Every zip contains README.txt, the WARPScoutGUI runtime, resources.neu, the
warpscout binary and licenses/. The APK is signed with the same certificate as
2.5.0–2.5.9, so in-place updates keep working.

## Верификация / Verification

- Windows: статический аудит инвариантности против 2.5.9 (изменения — только
  командная граница), smoke-тест интерфейса. Живого прогона на Windows в этой
  среде нет — см. СТАТУС ВЕРИФИКАЦИИ внутри пакета.
- Linux x64: живой рантайм (cloud-режим) — реальный скан warpscout 0.16.0,
  реальные файловые операции, 0 ошибок консоли, 0 нарушений CSP.
- Android: сборка/подпись/структура верифицированы (aapt2 badging: единственное
  разрешение `INTERNET`, versionCode 20600, native-code arm64-v8a, apksigner OK).
  Smoke на реальном устройстве — за пользователем (пререлиз).
- macOS: бинарники не исполняются в среде сборки — см. СТАТУС ВЕРИФИКАЦИИ.

См. также `SECURITY.md` (политика уязвимостей) и `CHANGELOG.md` (история версий).
