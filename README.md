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

Текущая версия: **v2.5.8** (кроссплатформенный пререлиз) — [releases/tag/v2.5.8](https://github.com/RVMXL/WarpScoutGUI-AWG/releases/tag/v2.5.8). Единый выпуск для шести целевых платформ; 2.5.8 — Android: перенос данных «В общую папку» теперь действительно переносит аккаунт и отчёты (v2.5.3–2.5.7 собирали пути с Windows-разделителем «\» — файлы оставались в прежней папке), при запуске данные из прежних папок приложения автоматически догоняются в активную; запуск warpscout восстановлен после v2.5.5-guard: fsStats/fsRead получают read-доступ к nativeLibraryDir, иначе предпроверка считала бинарь не найденным и регистрация/скан падали с «Ошибка запуска warpscout». Плюс унаследованные фиксы 2.5.7: имена конфигов больше не искажаются при сохранении («*.conf» превращался в «*.conf.txt»/«*.txt»): MediaStore и SAF-пикеры прошивок дописывают каноническое расширение MIME к имени, чьё расширение не совпадает с переданным MIME — теперь мост отдаёт провайдеру MIME, родной для расширения (или не имеющий канонического расширения, если платформа расширение не знает), убран IS_PENDING (ряд прошивок показывает «висящие» pending-записи призрачными папками в Downloads), а имя после вставки читается обратно — UI показывает реальный путь файла. «Открыть папку» теперь целенаправленно запускает системные «Файлы» (DocumentsUI) по классу: OEM-проводники перехватывали ACTION_VIEW каталога и открывали свой корень, игнорируя папку из URI. Desktop-платформы — без изменений кода (пересобран resources.neu). Стабильный Windows-релиз — **v2.4.6**.

**Политика выпуска:** каждый релиз содержит артефакты **всех** поддерживаемых платформ под единым номером версии — включая платформы, код которых в данном выпуске не менялся; в примечаниях к релизу для каждой платформы указано, что изменилось либо зафиксировано отсутствие изменений.

| Артефакт | Платформа | Размер |
|---|---|---|
| `WARPScoutGUI-2.5.8-win64.zip` | Windows 10/11 (x86_64) | 6,3 МБ |
| `WARPScoutGUI-2.5.8-linux64.zip` | Linux (x86_64) | 4,8 МБ |
| `WARPScoutGUI-2.5.8-linux-arm64.zip` | Linux (ARM64 / aarch64) | 4,4 МБ |
| `WARPScoutGUI-2.5.8-mac-arm64.zip` | macOS Apple Silicon (M1–M4) | 5,8 МБ |
| `WARPScoutGUI-2.5.8-mac-x64.zip` | macOS Intel | 6,2 МБ |
| `WARPScoutGUI-2.5.8-android-arm64.apk` | Android 7.0+ (ARM64) | 5,0 МБ |

Контрольные суммы SHA-256 всех артефактов — в [примечаниях к релизу](https://github.com/RVMXL/WarpScoutGUI-AWG/releases/tag/v2.5.8) и в разделе [«Проверка целостности»](#проверка-целостности) ниже.

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

1. Скачайте `WARPScoutGUI-2.5.8-win64.zip` из [релиза](https://github.com/RVMXL/WarpScoutGUI-AWG/releases/latest).
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

1. Скачайте `WARPScoutGUI-2.5.8-android-arm64.apk` из релиза.
2. Откройте файл на устройстве и разрешите установку из неизвестных источников для приложения, которым открываете (Chrome/Файлы) — стандартный запрос Android для APK вне Play Market.
3. Установите APK и запустите приложение **WARPScoutGUI**.

Требования: Android 7.0+ (API 24), устройство/эмулятор ARM64 (arm64-v8a), системный Android WebView (предустановлен и обновляется через Play Market). Пакет: `ru.warpscout.gui`.

Интерфейс Android-версии адаптирован под сенсорный ввод: вкладки внизу (с подписями и индикатором под иконкой), главная — панель быстрых действий («Просканировать эндпоинты» и «Получить рабочий конфиг» выполняются прямо с главной), диалоги выбора файлов — системные (Storage Access Framework).

**Папки с пользовательскими файлами на Android:** аккаунт и отчёты сканов лежат в «своей папке» на `/storage/emulated/0` — по умолчанию `Android/data/ru.warpscout.gui/files/WARPScoutGUI` (запись работает всегда, разрешений не требуется), а после выдачи доступа — в общей `/storage/emulated/0/WARPScoutGUI` (кнопка «🌐 В общую папку…» в Настройках: Android 11+ — переключатель «Все файлы», Android 7–10 — право на запись; файлы переносятся автоматически). **Готовые конфиги с v2.5.4 сохраняются в публичную папку `Download/WARPScoutGUI`** — она видна в любом файловом менеджере; на Android 10+ запись идёт через MediaStore вообще без разрешений, на Android 7–9 — с правом на запись. Кнопки «Открыть папку» открывают только свою папку данных или папку конфигов (корень тома и системные каталоги не открываются никогда) и отвечают тостом в каждой ветке; папка Android/data на Android 11+ открывается через системный SAF-выборщик, который её видит даже там, где обычные менеджеры показывают пустоту.

### Обновление

- **Windows/Linux/macOS:** скачайте zip новой версии и распакуйте поверх старой папки (или в новую — старую после этого можно удалить). Аккаунт, отчёты и настройки переносить не нужно: они хранятся отдельно (см. ниже) и при обновлении не теряются.
- **Android:** установите новый APK поверх старой версии — пакет и ключ подписи фиксированы, данные сохранятся, удаление не требуется.

### Проверка целостности

SHA-256 артефактов релиза v2.5.8:

| Файл | SHA-256 |
|---|---|
| `WARPScoutGUI-2.5.8-win64.zip` | `213c226212c4a131d79599cd1091d8c5b0f03b43c369615baed96dccd16e95d2` |
| `WARPScoutGUI-2.5.8-linux64.zip` | `53f55050de85ef4fc152789dc7e2287c00be7711ecc9c62ba82ef0fc9fdb7887` |
| `WARPScoutGUI-2.5.8-linux-arm64.zip` | `3d52a8b64d7aab0ed0fabb68b33a29ff0b7e16510a1444f34713462a0971f4bf` |
| `WARPScoutGUI-2.5.8-mac-arm64.zip` | `d707111d877404f7cd78a0a862e1f9701ecb57f688a3b18af7cfd15a01a91bba` |
| `WARPScoutGUI-2.5.8-mac-x64.zip` | `27957a6b488d1dea58446fa2e7d138db0000bf0c9a2914b980042d50d1b9011e` |
| `WARPScoutGUI-2.5.8-android-arm64.apk` | `b269fe7db1aa182b5de39d81abf3b698815fc7743bac4473a7be4c3ea7c6e658` |

Проверка после скачивания:

```bash
# Linux / macOS
shasum -a 256 WARPScoutGUI-2.5.8-*.zip
# Windows (PowerShell)
Get-FileHash WARPScoutGUI-2.5.8-win64.zip -Algorithm SHA256
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
| `desktop-app/resources/` | Исходники GUI (`index.html`, `js/app.js`, `css/app.css`, `css/touch.css`, иконки) |
| `desktop-app/neutralino.config.json` | Конфигурация Neutralino (v6.10.0, окно, CLI-аргументы) |
| `desktop-app/tools/` | Инструменты сборки: `pack-neu.py` (сборка `resources.neu`), `build-zips.py` (детерминированные release-zip), `unpack-neu.py`, `sync-demo.sh` |
| `desktop-app/android/` | Android-проект без Gradle: `AndroidManifest.xml`, `java/`, `res/`, `build-apk.sh` (aapt2 + d8 + apksigner) |
| `desktop-app/pkg/WARPScoutGUI-<платформа>/` | Собранные пакеты (бинарь + `resources.neu` + `bin/warpscout` + `licenses/` + `README.txt`) |
| `desktop-app/AUDIT-v2.5.1.md`, `desktop-app/RELEASE-2.5.1.md` | Отчёт аудита и примечания к релизу v2.5.1 |
| `docs/` | Скриншоты интерфейса |

## Сборка из исходников

Полный цикл (все платформы, версия берётся из `neutralino.config.json`):

```bash
cd desktop-app

# 1. Рантаймы Neutralino всех платформ (кросс-скачивание) + resources.neu
npx --yes @neutralinojs/neu@11 build --release
python3 tools/pack-neu.py           # детерминированный resources.neu

# 2. Сборка пакетов и детерминированных zip (download/*.zip)
python3 tools/build-zips.py

# 3. Android APK (нужны SDK-компоненты: platform android-34, build-tools 34, JDK;
#    путь к ним — в SDK_DIR, пароль keystore — только через переменную окружения)
KSPASS='<пароль keystore>' bash android/build-apk.sh
```

Выход: `pkg/WARPScoutGUI-<платформа>/` и `download/WARPScoutGUI-<версия>-<платформа>.zip|apk`. Сборка zip детерминирована (фиксированные таймстампы и порядок записей) — пересборка из того же дерева даёт побайтово тот же архив.

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
