# WARPScoutGUI-AWG

Графическая оболочка для [**warpscout**](https://github.com/vernette/warpscout) — CLI-сканера WARP-эндпоинтов от [vernette](https://github.com/vernette) (Go, MIT). Суффикс **-AWG** отличает этот GUI от прочих обёрток: проект работает с конфигурациями в формате **AmneziaWG** (awg31).

Десктопное и мобильное приложение (Neutralino.js / WebView) вокруг CLI-утилиты `warpscout`: регистрация WARP-аккаунтов, генерация `.conf` в формате AmneziaWG, импорт/валидация конфигов, QR-коды, сканер живых WARP-эндпоинтов.

## Интерфейс

| Тёмная тема | Светлая тема |
|---|---|
| ![Тёмная тема](docs/screenshot-dark.png) | ![Светлая тема](docs/screenshot-light.png) |

▶ **Веб-демо интерфейса** (на моках, без Neutralino) — [**rvmxl.github.io/WarpScoutGUI-AWG**](https://rvmxl.github.io/WarpScoutGUI-AWG/) — можно пощёлкать интерфейс прямо в браузере, ничего не скачивая. На мобильном экране демо переключается в сенсорный режим, как в Android-версии.

## Скачать

Готовые сборки — в разделе **[Releases](https://github.com/RVMXL/WarpScoutGUI-AWG/releases)**.

Текущая версия: **v2.6.5** — [releases/tag/v2.6.5](https://github.com/RVMXL/WarpScoutGUI-AWG/releases/tag/v2.6.5), единый выпуск для шести целевых платформ, собирается и публикуется CI по пушу тега.

Ключевые свойства текущей сборки:

- **Android — минимум привилегий**: единственное разрешение приложения — `INTERNET`. Данные живут в приватном каталоге приложения; наружу, в общую папку `Download/WARPScoutGUI`, через MediaStore реально копируются отчёт скана, аккаунт и готовые конфиги (подробнее ниже).
- **Десктоп — portable без установки**: распакованный архив самодостаточен; `chmod +x` выдаётся штатно нативным `fs.setPermissions` (Linux/macOS), команды собираются через единые экранирующие точки (`psQuote`/`cmdWinPath`).
- **Модульная архитектура**: логика интерфейса — 15 модулей `resources/js/wsg/` (01-platform … 15-init), подключаемых `index.html` строго по номеру.
- **Ядро `warpscout` v0.16.0** во всех пакетах; GUI не меняет поведение сканера.
- **Инженерная обвязка**: CI (GitHub Actions: статические проверки на каждый пуш + полный релизный конвейер по тегу), 88 юнит-тестов чистых функций (node --test, ноль зависимостей), SBOM-lite (`tools/deps.json` + `verify-deps.py`), провенанс вендореного qrcode.js (js1.5.2), единая точка версии (`tools/gen-version.py`), детерминированная сборка `resources.neu`, бинарники распространяются через Releases (`tools/fetch-binaries.py`).

История изменений по версиям — в [`CHANGELOG.md`](CHANGELOG.md) и примечаниях к релизам.

**Политика выпуска:** каждый релиз содержит артефакты **всех** поддерживаемых платформ под единым номером версии — включая платформы, код которых в данном выпуске не менялся; в примечаниях к релизу для каждой платформы указано, что изменилось либо зафиксировано отсутствие изменений. Публикация автоматизирована (с v2.6.5, аудит INFRA-H): пуш тега `v*` запускает workflow `release`, который прогоняет гейт проверок (версия = тег, юнит-тесты, i18n, SHA-пины бинарников), собирает все 6 артефактов — включая APK с ключом подписи из зашифрованного секрета репозитория (SHA-контроль против подмены) — и публикует релиз с заметками и SHA-таблицей, затем обновляет веб-демо на gh-pages. Прежний ручной публикатор `scripts/release.sh` сохранён как альтернатива: перед созданием релиза ждёт зелёный прогон «ci» на коммите тега и падает, если проверка красная; pre-flight проверки скрипта (согласованность версий, секция CHANGELOG, примечания релиза, наличие всех 6 артефактов) — fail-fast, мягкий режим только с явным `WS_FORCE=1` (аудит INFRA-G). Дожим существующего тега — Actions → release → Run workflow (ввод тега).

| Артефакт | Платформа | Размер |
|---|---|---|
| `WARPScoutGUI-2.6.5-win64.zip` | Windows 10/11 (x86_64) | 6,3 МБ |
| `WARPScoutGUI-2.6.5-linux64.zip` | Linux (x86_64) | 4,8 МБ |
| `WARPScoutGUI-2.6.5-linux-arm64.zip` | Linux (ARM64 / aarch64) | 4,4 МБ |
| `WARPScoutGUI-2.6.5-mac-arm64.zip` | macOS Apple Silicon (M1–M4) | 5,7 МБ |
| `WARPScoutGUI-2.6.5-mac-x64.zip` | macOS Intel | 6,1 МБ |
| `WARPScoutGUI-2.6.5-android-arm64.apk` | Android 7.0+ (ARM64) | 5,0 МБ |

Контрольные суммы SHA-256 всех артефактов — в [примечаниях к релизу](https://github.com/RVMXL/WarpScoutGUI-AWG/releases/tag/v2.6.5) и в разделе [«Проверка целостности»](#проверка-целостности) ниже.

**Состав desktop-архива** (одинаков на всех платформах, 9 записей):

```
WARPScoutGUI[.exe]      — исполняемый файл GUI (Neutralino)
resources.neu           — ресурсы интерфейса
bin/warpscout[.exe]     — ядро warpscout v0.16.0
README.txt              — инструкция по этой платформе (подробная)
licenses/               — лицензии всех компонентов (4 файла)
```

## Установка и запуск

### Windows (x64)

1. Скачайте `WARPScoutGUI-2.6.5-win64.zip` из [релиза](https://github.com/RVMXL/WarpScoutGUI-AWG/releases/latest).
2. Распакуйте папку целиком в любое место (например, `D:\WARPScoutGUI`). Внутри должна остаться структура `WARPScoutGUI.exe`, `resources.neu`, `bin\`, `licenses\` — не разъединяйте их.
3. Запустите `WARPScoutGUI.exe` — установка не требуется.
4. Если SmartScreen предупреждает (приложение не подписано сертификатом Microsoft): «Подробнее» → «Выполнить в любом случае».

Требования: Windows 10/11 x64, WebView2 Runtime (движок интерфейса; предустановлен в Windows 10/11 вместе с Edge).

### Linux (x64 / ARM64)

1. Скачайте zip под свою архитектуру (`uname -m`: `x86_64` → linux64, `aarch64` → linux-arm64).
2. Распакуйте архив целиком в любое место (например, `~/WARPScoutGUI`).
3. Выдайте право на запуск (один раз, из папки программы):
   ```bash
   chmod +x WARPScoutGUI bin/warpscout
   ```
4. Запустите:
   ```bash
   ./WARPScoutGUI
   ```

Требования: Linux x86_64/aarch64 с графической средой (X11 или Wayland), **WebKitGTK** (движок интерфейса). WebKitGTK обычно уже установлен (GNOME, Xfce и т. д.). Если нет — установите пакет:

```bash
Debian/Ubuntu:  sudo apt install libwebkit2gtk-4.1-0 libxtst6
                (на старых системах: libwebkit2gtk-4.0-37)
Fedora:         sudo dnf install webkit2gtk4.1
Arch:           sudo pacman -S webkit2gtk-4.1
```

Ядро `bin/warpscout` — статическое, дополнительных библиотек не требует. Ошибка вида `error while loading shared libraries ... libwebkit2gtk` лечится установкой WebKitGTK (см. выше).

### macOS (Apple Silicon / Intel)

1. Скачайте zip под свою архитектуру (в Терминале `uname -m`: `arm64` → mac-arm64, `x86_64` → mac-x64; либо меню  → «Об этом Mac»).
2. Распакуйте архив целиком (например, в `~/WARPScoutGUI`), структура `WARPScoutGUI`, `resources.neu`, `bin/` должна сохраниться.
3. Снимите метку «скачано из интернета» (quarantine) — macOS ставит её на файлы из сети и может назвать приложение «повреждённым». В Терминале из папки программы:
   ```bash
   xattr -cr .
   ```
4. Выдайте право на запуск и запустите:
   ```bash
   chmod +x WARPScoutGUI bin/warpscout
   ./WARPScoutGUI
   ```

Требования: macOS 11 Big Sur или новее. Дополнительных зависимостей нет — интерфейс работает на системном WebKit (WKWebView).

**Если macOS блокирует запуск (Gatekeeper):** приложение не подписано сертификатом Apple Developer. Варианты: правый клик по `WARPScoutGUI` → «Открыть» → «Открыть» в диалоге; либо Системные настройки → «Конфиденциальность и безопасность» → «Открыть в любом случае»; либо `xattr -cr .` из шага 3.

### Android (ARM64)

1. Скачайте `WARPScoutGUI-2.6.5-android-arm64.apk` из релиза.
2. Откройте файл на устройстве и разрешите установку из неизвестных источников для приложения, которым открываете (Chrome/Файлы) — стандартный запрос Android для APK вне Play Market.
3. Установите APK и запустите приложение **WARPScoutGUI**.

Требования: Android 7.0+ (API 24), устройство/эмулятор ARM64 (arm64-v8a), системный Android WebView (предустановлен и обновляется через Play Market). Пакет: `ru.warpscout.gui`.

Интерфейс Android-версии адаптирован под сенсорный ввод: вкладки внизу (с подписями и индикатором под иконкой), главная — панель быстрых действий («Просканировать эндпоинты» и «Получить рабочий конфиг» выполняются прямо с главной), диалоги выбора файлов — системные (Storage Access Framework).

**Где лежат пользовательские файлы на Android:**

| Что | Где находится | Как попасть |
|---|---|---|
| Аккаунт, отчёты сканов, настройки | приватная папка приложения `Android/data/ru.warpscout.gui/files/WARPScoutGUI` | кнопка «Открыть папку» в приложении; на Android 11+ — через системный SAF-выборщик (обычные менеджеры эту папку показывают пустой) |
| Публичная копия: отчёты сканов и готовые конфиги | `Download/WARPScoutGUI` — видна в любом файловом менеджере | отчёт — автоматически при завершении скана, конфиг — при сохранении; на Android 10+ — через MediaStore без каких-либо разрешений; на Android 7–9 запись в Downloads приложению недоступна — файл остаётся в приватной папке. Файл аккаунта (содержит приватный ключ) наружу НЕ копируется — с v2.6.2 он остаётся только в приватной папке (аудит SEC-A1/FE-25) |

Копия отчётов и конфигов в `Download/WARPScoutGUI` — именно копия: рабочие данные живут в приватной папке и остаются там при удалении публичных файлов. Выбор произвольной папки на Android не предусмотрен (ни диалогов, ни SAF-пикера для данных): модель хранения фиксированная и не требует разрешений — приложение запрашивает только `INTERNET`. Данные, оставшиеся в старых местах (`Android/data` прошлых версий, общая `/storage/emulated/0/WARPScoutGUI`), подхватываются автоматически при первом запуске. Кнопки «Открыть папку» открывают только свою папку данных или папку конфигов (корень тома и системные каталоги не открываются никогда) и отвечают тостом в каждой ветке.

### Обновление

- **Windows/Linux/macOS:** скачайте zip новой версии и распакуйте поверх старой папки (или в новую — старую после этого можно удалить). Аккаунт, отчёты и настройки переносить не нужно: они хранятся отдельно (см. ниже) и при обновлении не теряются.
- **Android:** установите новый APK поверх старой версии — пакет и ключ подписи фиксированы, данные сохранятся, удаление не требуется.

### Проверка целостности

SHA-256 артефактов релиза v2.6.5:

| Файл | SHA-256 |
|---|---|
| `WARPScoutGUI-2.6.5-win64.zip` | `e601bc2e22840a67e17858b713e504f7a2893e40a976b4b81ae117f6812927b0` |
| `WARPScoutGUI-2.6.5-linux64.zip` | `7057dacaf651ddaefd7c71b713a6b98e56de044cdd97e65d6a9cb0d5dab13e6b` |
| `WARPScoutGUI-2.6.5-linux-arm64.zip` | `52a6970fae3e8dc7a4538582e35fc098de6cbecb5ce358701ade0428bf2f55b2` |
| `WARPScoutGUI-2.6.5-mac-arm64.zip` | `c0afd5c5f71b7214ad35e64d9b15a1cf9b79e1f7f7e26c152727cf8a0294d208` |
| `WARPScoutGUI-2.6.5-mac-x64.zip` | `53e4138072a1edf6e419fe9fc1417b919d17cc00532b4d8c40de715bf9955eb2` |
| `WARPScoutGUI-2.6.5-android-arm64.apk` | `b816879b9ee87ad1f18b67a46a6b857064229b71bb48517b1bf785461624db60` |

Проверка после скачивания:

```bash
# Linux / macOS
shasum -a 256 WARPScoutGUI-2.6.5-*.zip
# Windows (PowerShell)
Get-FileHash WARPScoutGUI-2.6.5-win64.zip -Algorithm SHA256
```

**Подпись APK.** Android-сборка подписана фиксированным ключом — обновления устанавливаются поверх установленной версии без потери данных. Отпечаток сертификата (SHA-256) для проверки:

```
67:96:9F:F2:B0:7D:32:44:55:EF:EE:A5:3F:5D:E0:BF:69:DF:D0:F2:45:A3:02:C4:7E:3E:4D:42:A1:AC:98:41
```

## Папка данных

Аккаунт, отчёты, настройки и веб-кэш движка хранятся **вне** папки программы:

| Платформа | Папка данных |
|---|---|
| Windows | `%APPDATA%\WARPScoutGUI.exe` (`C:\Users\<вы>\AppData\Roaming\WARPScoutGUI.exe`) |
| Linux | `~/.local/share/WARPScoutGUI` |
| macOS | `~/Library/Application Support/WARPScoutGUI` |
| Android | приватная папка приложения (`/data/user/0/ru.warpscout.gui/files`) |

**Не удаляйте и не перемещайте эту папку** — без неё приложение потеряет аккаунт и настройки. Перенести данные в другое место можно штатно: Настройки → «Папка данных» (desktop-версии).

## Ключевые возможности

- Регистрация WARP-аккаунтов через `warpscout` с живым логом процесса и реальными кодами выхода
- Генерация конфига AmneziaWG (awg31): endpoint, порт, DNS-пресеты (Cloudflare / Quad9 / Google / AdGuard) с тумблером «Использовать IPv6» (вкл. по умолчанию), obfuscation-параметры (S1/S2, H1–H4, Jc/Jmin/Jmax)
- Предпросмотр команды запуска и итогового `.conf`
- Импорт существующих конфигов с распознаванием параметров (включая обе формы DNS-строки)
- QR-код конфига: одиночный (до 2953 байт) или **многостраничный** в формате AmneziaVPN (побайтово совместим с их импортером, порядок страниц не важен)
- Сканирование живых WARP-эндпоинтов (пинг, потери, узлы), проверка туннеля, SOCKS-прокси, сравнение A/B, экспорт CSV / HTML-отчёт
- Локальное состояние в localStorage, тёмная/светлая тема, RU/EN i18n

## Структура репозитория

| Путь | Назначение |
|---|---|
| `desktop-app/resources/` | Исходники GUI (`index.html`, `js/wsg/*.js` — 15 модулей логики (нарезка ARCH-1), `css/app.css`, `css/touch.css`, иконки) |
| `desktop-app/neutralino.config.json` | Конфигурация Neutralino (v6.10.0, окно, CLI-аргументы) |
| `desktop-app/tools/` | Инструменты сборки и верификации цепочки поставки: `pack-neu.py` (сборка `resources.neu`), `build-zips.py` (детерминированные release-zip; футер README печатается из единого источника версии — аудит INFRA-D), `gen-version.py` (кодогенерация версии, `--check` — гейт CI), `verify-deps.py` + `fetch-binaries.py` + `deps.json` (SBOM-lite: SHA-256 всех 13 поставляемых артефактов), `check-i18n.py` (аудит i18n), `unpack-neu.py`, `sync-demo.sh` |
| `desktop-app/android/` | Android-проект без Gradle: `AndroidManifest.xml`, `java/`, `res/`, `build-apk.sh` (aapt2 + d8 + apksigner) |
| `desktop-app/pkg/WARPScoutGUI-<платформа>/` | Собранные пакеты (бинарь + `resources.neu` + `bin/warpscout` + `licenses/` + `README.txt`) |
| `desktop-app/AUDIT-v2.5.0.md`, `desktop-app/RELEASE-2.5.0.md` … `desktop-app/RELEASE-2.6.5.md` | Отчёт первого аудита и построчные примечания к каждому релизу (RU/EN, платформенная таблица, SHA-256) |
| `docs/` | Скриншоты интерфейса |

## Сборка из исходников

Полный цикл (все платформы, версия берётся из `neutralino.config.json`):

```bash
cd desktop-app

# 1. Восстановление пиннутых бинарей из релиза (warpscout всех платформ +
#    android-ядро libwarpscout.so; рантаймы Neutralino скачает neu build)
python3 tools/fetch-binaries.py --latest-published

# 2. Рантаймы Neutralino всех платформ (кросс-скачивание) + resources.neu
npx --yes @neutralinojs/neu@11 build --release
python3 tools/pack-neu.py           # детерминированный resources.neu

# 3. Сборка пакетов и детерминированных zip (download/*.zip)
python3 tools/build-zips.py

# 4. Android APK (нужны SDK-компоненты: platform android-34, build-tools 34, JDK;
#    путь к ним — в SDK_DIR, пароль keystore — только через переменную окружения)
KSPASS='<пароль keystore>' bash android/build-apk.sh
```

Выход: `pkg/WARPScoutGUI-<платформа>/` и `download/WARPScoutGUI-<версия>-<платформа>.zip|apk`. Сборка zip детерминирована (фиксированные таймстампы и порядок записей) — пересборка из того же дерева даёт побайтово тот же архив.

## Тесты

Юнит-тесты чистых функций (парсеры отчётов, санитайзеры, билдеры команд, персистенс и миграции данных) — на встроенном `node:test`, без внешних зависимостей. Требуется Node ≥ 18 (проверено на 20/22/24):

```bash
node --test desktop-app/tests/*.test.js
```

Ровно эта форма используется в CI (`.github/workflows/ci.yml`). Каталог-форма `node --test tests/` на Node ≥ 22 не работает — раннер подбирает служебные файлы харнесса как «тесты» (аудит QUAL-A; хелпер `tests/helpers/loadApp.js` на прямой запуск отвечает тихим кодом 0, но канонической считается форма с glob).

Имена и комментарии тестов ссылаются на ID находок аудитов (F01–F56, FE/AND/INFRA/SEC-A/QUAL) — «тесты-как-журнал-аудита»: каждая находка закрыта регресс-тестом.

## Авторство и лицензии

**Сам WarpScoutGUI-AWG** (код GUI: `resources/`, конфигурация, упаковка) — © 2026 RVMXL, лицензия **[Apache License 2.0](LICENSE)** (текст — [`LICENSE`](LICENSE), атрибуция — [`NOTICE`](NOTICE); в архивах релизов — `LICENSE-AWG.txt`).

В состав распространяемых архивов входят сторонние компоненты; все они — под лицензией **MIT**, полные тексты прикладываются к каждому desktop-архиву (папка `licenses/`; для APK тексты — в этом репозитории и на странице релиза):

| Компонент | Источник | Лицензия | Текст в архиве |
|---|---|---|---|
| **warpscout** (CLI-ядро, `bin/warpscout`, на всех платформах включая `libwarpscout.so` в APK) | [vernette/warpscout](https://github.com/vernette/warpscout) (Go, © Nikita S.) | MIT | `LICENSE-warpscout.txt` |
| **Neutralino** — ядро (`WARPScoutGUI[.exe]`) и клиент (`neutralino.js` v6.10.0 внутри `resources.neu`) | [neutralinojs/neutralinojs](https://github.com/neutralinojs/neutralinojs) | MIT © Neutralinojs and contributors | `LICENSE-neutralino.txt` (включая лицензии встроенных в ядро C++-библиотек: asio, websocketpp, mbedTLS, nlohmann/json, webview и др.) |
| **QR Code Generator for JavaScript** (`resources/js/qrcode.js`) | [kazuhikoarase/qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (© 2009 Kazuhiko Arase) | MIT | `LICENSE-qrcode.txt` |

- Протокол **AmneziaWG** внутри warpscout реализован на базе [amneziawg-go](https://github.com/amnezia-vpn/amneziawg-go) (MIT), который в свою очередь основан на [wireguard-go](https://github.com/WireGuard/wireguard-go) (© Jason A. Donenfeld, MIT).
- Слово «QR Code» — зарегистрированный товарный знак **DENSO WAVE INCORPORATED**.
- **Этот репозиторий — не форк**: это независимый проект (Neutralino.js GUI), написанный с нуля вокруг CLI-утилиты; общей истории коммитов с апстримом нет.
- Приложения распространяются без подписных сертификатов Apple/Microsoft, поэтому SmartScreen и Gatekeeper могут предупреждать при первом запуске (см. разделы установки выше) — это ожидаемое поведение для portable-сборок.
- Не аффилировано с Cloudflare, Amnezia и DENSO WAVE. WARP — товарный знак Cloudflare, Inc.
