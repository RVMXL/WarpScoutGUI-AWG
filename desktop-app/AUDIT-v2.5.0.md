# Аудит v2.5.0 — Android-порт, macOS-слой, сенсорный UI, упаковка

Дата: **11 октября 2026**. Методика: повтор аудита 2.4.6 (PROJECT_AUDIT_RU.md —
статические проходы, проверка потоков недоверенных данных, сверка контрактов
CLI/runtime, живые E2E где возможно). Объект: локальное состояние после
Android-порта (до коммита «android-port v2.5.0»).

Исполнение: `HTML/CSS → app.js/S → (Neutralino native | AndroidNative-мост) → sh -c → warpscout`.

## Верификации (выполнено)

- node --check: app.js, mock.js, neutralino-android.js — синтаксис чист.
- Живой Linux-рантайм (Neutralino cloud + agent-browser): v2.5.0, warpscout
  найден (`./bin/warpscout`), папка данных `~/.local/share/WARPScoutGUI`,
  статус-строки, Настройки — прежнее поведение. Регрессий нет.
- Браузерное превью touch UI (мок, `?platform=android`, viewport 390×844):
  главная со статусом, кнопка «Начать скан» запускает реальный (мок-)скан
  с главной, нижние вкладки, «Ещё» → Настройки/Тема, i18n-ключи.
- Десктоп-демо (win-подобие): `NL_OS="Windows"`, touch не активен,
  скан «Результаты 6», пути `C:\Users\Demo\...` — прежние.
- APK: aapt2 dump badging (package `ru.warpscout.gui`, versionCode 20500,
  versionName 2.5.0, minSdk 24, targetSdk 34, INTERNET, иконка),
  apksigner verify OK, assets без resources.neu (читается www/ напрямую),
  libwarpscout.so (14,1 МБ, ELF aarch64, sha = релизному vernette).
- Zip-пакеты ×4: структура (README + бинарь + resources.neu + bin + licenses/),
  unix-режимы, таймстампы 1980, sha зафиксированы в worklog.

## Ограничения доказательства

Android-и macOS-бинари в Linux-песочнице не исполнялись (qemu-user не
эмулирует Mach-O; Android-рантайм требует устройство/эмулятор). APK проверен
статически (badging/подпись/состав); реальная установка, WebView-поведение,
SAF-диалоги и exec libwarpscout.so на устройстве не проверялись — это главное
направление smoke-теста на живом Android перед распространением.

## Находки и исправления (этот проход)

| ID | Приоритет | Где | Суть | Статус |
|---|---|---|---|---|
| A1 | P2 | app.js (touch) | Кнопка «Начать скан» на главной только переключала вкладку — основной сценарий двухшаговый | **Исправлен**: switchTab + автозапуск runScan (guard от повтора есть) |
| A2 | P3 | app.js (i18n) | EN-локализация home-фраз отсутствовала (RU в EN-режиме, класс F54) | **Исправлен**: 8 ключей добавлены в I18N_EN |
| A3 | P2 | build-apk.sh | resources.neu копировался в APK как мёртвый груз (+630 КБ; Android читает www/ напрямую) | **Исправлен**: исключён из assets |
| A4 | P3 | app.js (mock) | android-превью показывало win-путь `C:\Users\Demo\...` | **Исправлен**: base = filesDir при IS_MOCK && IS_ANDROID |
| A5 | P3 | index.html | cache-busters `?v=24v6` на скриптах при контенте 2.5.0 (класс F56) | **Исправлен**: 25v0 |
| A6 | P3 | app.js (mock) | exeName в android-превью — `WARPScoutGUI.exe` вместо `WARPScoutGUI` | **Исправлен** |

## Проверено без находок (выборка)

- **Командные потоки**: touch-разметка строится статическими строками (без
  пользовательских данных) — XSS-пути нет; статус-зеркало пишет `textContent`.
  Все enum-границы v2.4.6 (F01/F07) сохранены; Android `sh -c "exec "+cmd`
  получает те же санитизированные команды (safeVal/enumOf на границе).
- **exec "exec "+cmd**: warpscout-команды — одиночные (без `&&`/`|`), exec
  корректен; destroy() убивает сам бинарь (не shell-обёртку) — процессный
  lifecycle не течёт. onDestroy() гасит все дочерние процессы.
- **WsFileProvider**: exported=false, отдаёт только пути собственного UID;
  content:// читается через ContentResolver (SAF-диалоги), takePersistableUriPermission
  в try/catch.
- **Хранилище**: .storage — приватный filesDir; миграции v2.3.0 (F12–F15)
  не задействованы на Android (нет legacy-папок).
- **Платформенный слой**: IS_WIN0_RAW-рефакторинг сохраняет прежнюю семантику
  для всех существующих платформ (пусто/мок → win; Linux/mac — по строке);
  POSIX-ветки Linux не изменены (живой рантайм это подтвердил).
- **mac-слой** (MAC_TEXT/platKey/UNIX_DATA_DIR): только подмены фраз/путей,
  ветки Linux не затрагиваются (IS_MAC-дополнения).
- **Упаковка**: licenses/ не пересекается с бинарями; unix-режимы 755/664;
  zip-записи с таймстампами 1980; APK signing scheme v2, keystore зафиксирован
  в desktop-app/android/keystore (условие «обновления поверх»).

## Открытые пункты (для следующего прохода/релиза)

1. Smoke-тест APK на реальном/эмуляторном Android (install, WebView, скан,
   SAF-диалог, socks-туннель, обновление поверх).
2. macOS smoke на реальном Mac (Gatekeeper-диалоги, окно WKWebView).
3. Релиз-набор на GitHub как **prerelease 2.5.0** (пометка «могут быть баги»)
   после выдачи токена: win64/linux64/linux-arm64/mac-arm64/mac-x64/android-arm64.
4. gh-pages/лендинг: обновить на 2.5.0 и упомянуть Android/macOS (сейчас
   лендинг продаёт 2.4.6 win — осознанно не тронут).

---

## Проход 2 — кроссплатформенный аудит всех выпусков (11.10.2026, полный)

Объект: 6 артефактов v2.5.0 (zip ×5 + APK) после унификации 2.5.0/README-ревизии.
Методика: 2.4.6 (статика → потоки недоверенных данных → сверка контрактов → живые E2E).

### Верифицировано (проход 2)

- **Zip ×5**: 9 записей релизного формата (README + GUI + resources.neu + bin/warpscout
  + licenses/×4), unix-режимы 755/664, таймстампы 1980, порядок записей как в 2.4.6;
  resources.neu побайтово идентичен во всех пяти (sha ffa27f47…); README внутри
  zip: v2.5.0, раздел «СТАТУС ВЕРИФИКАЦИИ», старая формулировка отсутствует.
- **Бинари**: warpscout.exe в win64 zip = vernette-релизу байт-в-байт; warpscout
  linux_arm64 из zip под qemu → version 0.16.0; заголовки PE32+/Mach-O/ELF
  соответствуют платформам; GUI-бинари Neutralino — по sha из bin/.
- **APK**: badging (ru.warpscout.gui, 20500, 2.5.0, minSdk 24, targetSdk 34,
  INTERNET), apksigner OK (тот же сертификат 67969ff2… — «обновление поверх»
  сохранено), assets = текущие resources (app.js/touch.css байт-в-байт).
- **Код**: diff resources vs релиза 2.4.6 (unpack-neu.py): 31 hunk = 22 эквивалентных
  рефакторинга (pxJoin/platKey — на Windows identity/конкатенация с «\») + 9
  добавочных под guard'ами IS_LINUX/IS_MAC/IS_ANDROID/!IS_WIN; neutralino.js,
  qrcode.js, app.css — байт-в-байт прежние. Windows-поведение инвариантно.
- **Живой Linux-рантайм** (Neutralino 6.10 cloud + agent-browser): warpscout v0.16.0
  найден, пути ~/.local/share/WARPScoutGUI, РЕАЛЬНАЯ регистрация (Cloudflare API)
  → «аккаунт: есть», РЕАЛЬНЫЙ скан -n 2 → 25/25 рабочих, отчёт на диске, конфиг
  AWG 3.1 с ключами аккаунта сгенерирован. Консоль браузера чистая.
- **Touch UI** (мок, 390×844): главная с 3 основными действиями, скан с главной
  → «Результаты 6», нижние вкладки, EN-локализация home-фраз, android-пути
  /data/user/0/…; desktop-демо: win-пути, touch не активен, скан работает.

### Находки и исправления (проход 2)

| ID | Приоритет | Где | Суть | Статус |
|---|---|---|---|---|
| B1 | **P1** | build-apk.sh | `.so` упаковывалась как `arm64-v8a/libwarpscout.so` (без `lib/`) → PackageManager не извлекает, `native-code: '4-v8a'` мусорный; на устройстве warpscout не запустился бы | **Исправлен**: `lib/arm64-v8a/libwarpscout.so`, badging `native-code: 'arm64-v8a'`, APK пересобран |
| B2 | P3 | pkg/win64 | README.txt и resources.neu с exec-битом (755) — несогласованно с другими пакетами | **Исправлен**: 664, нормализовано для всех |
| B3 | P3 | README ×5 | Формулировка «(пререлиз — могут быть баги)» нетеxнична | **Исправлен**: статус-блок + раздел «СТАТУС ВЕРИФИКАЦИИ» (что проверено / что требует ручной проверки / куда сообщать) |
| B4 | P3 | app.js (touch) | Переключатель языка RU/EN недоступен из touch-навигации (остался в скрытом сайдбаре) — EN-локализация на Android недостижима | **Исправлен**: сегмент RU/EN в меню «Ещё» (классы .lang-switch — applyLang синхронизирует сам), touch.css тап-таргеты |
| B5 | P3 | tools/ | Сборка zip не была воспроизводимой (ad-hoc команды) | **Исправлен**: tools/build-zips.py (детерминированный формат релиза) + tools/unpack-neu.py (аудит-инструмент) |

### Ограничения (не изменились)

Android/macOS/GUI-бинари не исполнялись в песочнице (см. проход 1) — ручной
smoke-тест на устройстве/Mac перед широким распространением остаётся обязательным.
