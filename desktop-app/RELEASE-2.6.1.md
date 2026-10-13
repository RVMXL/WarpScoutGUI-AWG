# WarpScoutGUI 2.6.1 — модульная архитектура (prerelease)

WarpScoutGUI 2.6.1 закрывает последнюю находку аудита — **ARCH-1**: монолит
`resources/js/app.js` (6957 строк) нарезан на 15 модулей `resources/js/wsg/`.
Изменений поведения нет: нарезка выполнена механически и доказуема — конкатенация
модулей байт-в-байт восстанавливает прежний монолит, все 50 юнит-тестов прошли
без изменения ожиданий, живой скан на реальном рантайме дал идентичный результат.

WarpScoutGUI 2.6.1 closes the last audit finding — **ARCH-1**: the monolithic
`resources/js/app.js` (6957 lines) is split into 15 modules under
`resources/js/wsg/`. No behaviour change: the split is mechanical and provable —
concatenating the modules reproduces the previous monolith byte-for-byte, all 50
unit tests pass without touching expectations, and a live scan on a real runtime
produces identical results.

**Статус выпуска: ПРЕРЕЛИЗ 2.6.1.** Ядро warpscout не менялось (0.16.0 во всех
пакетах). Функциональность сканирования и генерации конфигов не менялась.

**Release status: PRERELEASE 2.6.1.** The warpscout core is unchanged (0.16.0 in
every package). Scanning and config generation behaviour is unchanged.

## Политика выпуска / Release policy

Каждый релиз содержит ВСЕ платформы под единой версией. Чейнжлог построчно
указывает, что изменено на каждой платформе, а где изменений нет.

Every release ships ALL platforms under a single version. The changelog states
per platform what changed and what did not.

## Изменения по платформам (2.6.1) / Platform changes (2.6.1)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Изменений функциональности НЕТ. В `resources.neu` код логики теперь поставляется 15 модулями `js/wsg/*.js` вместо одного `js/app.js`; index.html подключает их строго по номеру. |
| **Linux (linux64)** | Как win64. |
| **Linux (linux-arm64)** | Как win64. |
| **macOS (mac-arm64)** | Как win64. |
| **macOS (mac-x64)** | Как win64. |
| **Android (android-arm64)** | Как win64: та же упаковка логики 15 модулями в `resources.neu`; разрешение — по-прежнему только `INTERNET` (модель хранения 2.6.0 не менялась), versionCode 20601. |

Windows / Linux / macOS / Android: no functional changes — code packaging only
(single app.js replaced by 15 ordered modules inside resources.neu).

## Состав модулей / Module map

| Модуль | Содержимое (источник: app.js 2.6.0) |
|---|---|
| `01-platform` | утилиты, детект платформы (Win/Linux/mac/Android), тосты |
| `02-state` | состояние приложения, дефолты, пресеты |
| `03-i18n` | словарь EN (~700 строк) + i18n-механика + статус-подсказки |
| `04-bridge` | доступ к Neutralino (os/fs/storage), реестр процессов |
| `05-scan-core` | сборка команд скана, endpoint, парсер отчёта (чистое ядро) |
| `06-results-scan` | таблица результатов, статистика, прогон скана |
| `07-config-presets` | конфиг-генератор AWG, история, пресеты + шаринг |
| `08-live-qr` | живая панель скана, Δ-сравнение, компакт-режим, QR |
| `09-state-io` | бэкап состояния, схема и санитизация импорта |
| `10-ui-panels` | модалки, тема, история, экспорты CSV/PNG/SVG/HTML |
| `11-conf-qc-account` | импорт .conf, быстрая/пакетная проверка, аккаунт |
| `12-socks-tools-ui` | SOCKS-прокси, инструменты find-junk/find-sni, вкладки, сенсорный UI |
| `13-form-paths` | синхронизация формы ↔ состояние, пути warpscout |
| `14-data-migrations` | папки данных, junction-миграции, автодогон данных |
| `15-init` | bindEvents, init, отладочный хук `__WSGUI` |

## Инженерные гарантии / Engineering guarantees

- **Байт-в-байт**: реконструкция монолита из 15 модулей (обёртка IIFE + тела)
  идентична app.js 2.6.0 — доказано автоматической проверкой при нарезке.
- **Тесты без правок**: 50 юнит-тестов (ARCH-4) прошли против модульной
  сборки; харнесс конкатенирует `wsg/*.js` по номерам — ожидания не менялись.
- **CI (INFRA-1)**: `node --check` теперь покрывает каждый из 15 модулей.
- **resources.neu**: детерминированная сборка (двойная — побайтово совпадает),
  25 файлов, модули внутри пакета байт-идентичны исходникам.
- **E2E**: браузерное демо (мок-скан, RU/EN, темы — 0 ошибок консоли) и живой
  Linux-рантайм (реальные fs/spawn/events, аккаунт, скан → отчёт на диске —
  0 ошибок консоли) прогнаны на модульной сборке.

## Артефакты / Artifacts

| Файл | SHA-256 |
|---|---|
| WARPScoutGUI-2.6.1-win64.zip | `4755ec2f917aae6b01a5246b41af37660a2d4c542972a855dbfcb9dea18e588c` |
| WARPScoutGUI-2.6.1-linux64.zip | `bfee8d781cc03f461ad155e4f2c2c5d826ce54c385fd7beeedf164150c91ed5e` |
| WARPScoutGUI-2.6.1-linux-arm64.zip | `1ab20b7f4ba34a884e782681147bbd223cdc07d16aa021d79ed5e1150e21124c` |
| WARPScoutGUI-2.6.1-mac-arm64.zip | `24d176f3cc2d87783f2ce18707749dbfe37ada3b4b4e912a9b0144fd129f27f2` |
| WARPScoutGUI-2.6.1-mac-x64.zip | `622821d25883872982b68a5fa30d66b46e670e0ef315a9ced494f57f6838e26f` |
| WARPScoutGUI-2.6.1-android-arm64.apk | `9e73326ef00574893dea04f720e554efce77131e28db629a54b1ef29f403d000` |

Все zip содержат: README.txt, WARPScoutGUI (рантайм), resources.neu, bin/warpscout,
licenses/ (4 лицензии). APK подписан тем же сертификатом, что и 2.5.0–2.6.0
(SHA-256 `67969ff2…ac9841`) — обновление поверх установленных версий работает.

Every zip contains README.txt, the WARPScoutGUI runtime, resources.neu, the
warpscout binary and licenses/. The APK is signed with the same certificate as
2.5.0–2.6.0, so in-place updates keep working.

## Верификация / Verification

- Windows: изменений функциональности нет; пакет пересобран тем же
  детерминированным конвейером (pack-neu + build-zips). Живого прогона на
  Windows в этой среде нет — см. СТАТУС ВЕРИФИКАЦИИ внутри пакета.
- Linux x64: живой рантайм (cloud-режим) на модульной сборке — реальный скан
  warpscout 0.16.0 (24 рабочих эндпоинта при -n 2 × 12 подсетей), отчёт записан
  на диск, latch процессов корректен, 0 ошибок консоли, 0 нарушений CSP.
- Android: сборка/подпись/структура верифицированы (apksigner OK, cert —
  мастер-ключ, versionCode 20601). Smoke на реальном устройстве — за
  пользователем (пререлиз).
- macOS: бинарники не исполняются в среде сборки — см. СТАТУС ВЕРИФИКАЦИИ.

См. также `SECURITY.md` (политика уязвимостей) и `CHANGELOG.md` (история версий).
