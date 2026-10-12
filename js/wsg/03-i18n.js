/* ═══ WSG · 03-i18n — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 323–1297.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

  /* ───────── i18n: RU/EN (v1.6.0) ───────── */
  // Словарь: ключ — канонический русский текст, значение — английский.
  // LANG хранится в S.settings.lang (по умолчанию "ru").
  const I18N_EN = {
    /* — бренд/навигация — */
    "поиск живых эндпоинтов WARP": "find live WARP endpoints",
    "Скан": "Scan",
    "Конфиг": "Config",
    "Аккаунт": "Account",
    "SOCKS-прокси": "SOCKS proxy",
    "Поиск параметров": "Param finder",
    "Настройки": "Settings",
    /* v2.5.0 (аудит A2): сенсорная главная/меню «Ещё» */
    "Главная": "Home",
    "Ещё": "More",
    "Основные действия": "Main actions",
    "Сгенерировать конфиг": "Generate config",
    "Переключить тему": "Toggle theme",
    "Скан запускается на устройстве, ключи и отчёты остаются в папке приложения.": "Scanning runs on the device; keys and reports stay in the app folder.",
    "Сенсорный режим интерфейса": "Touch UI mode",
    "Android-оболочка: WebView + ядро warpscout (MIT)": "Android shell: WebView + warpscout core (MIT)",
    "Разделы приложения": "App sections",
    /* — статус-строка/сайдбар — */
    "● warpscout: проверка…": "● warpscout: checking…",
    "● аккаунт: проверка…": "● account: checking…",
    "☀ Светлая тема": "☀ Light theme",
    "🌙 Тёмная тема": "🌙 Dark theme",
    "⌨ подсказки": "⌨ shortcuts",
    "ДЕМО-РЕЖИМ (браузер)": "DEMO MODE (browser)",
    "Переключить светлую/тёмную тему": "Toggle light/dark theme",
    "Переключить тему": "Toggle theme",
    "Горячие клавиши (?)": "Keyboard shortcuts (?)",
    /* — пресеты — */
    "Пресеты": "Presets",
    "⟲ Сброс": "⟲ Reset",
    "⭐ По умолчанию": "⭐ Default",
    "⚡ Быстрый": "⚡ Fast",
    "🧱 Жёсткая сеть": "🧱 Hard network",
    "🔬 Тщательный": "🔬 Thorough",
    "＋ Свой": "＋ Custom",
    "Сохранить": "Save",
    "Отмена": "Cancel",
    "Название пресета": "Preset name",
    "Вернуть команду по умолчанию": "Restore the default command",
    "Сохранить текущие параметры как пресет": "Save current parameters as a preset",
    "Быстрый: обычный WireGuard без проверки внутри туннеля — годится там, где WARP не фильтруется.":
      "Fast: plain WireGuard without in-tunnel checks — fine where WARP is not filtered.",
    "Жёсткая сеть: AmneziaWG + QUIC-маскировка первого пакета + проверка на разрыв. Если не найдёт — вкладка «Поиск параметров».":
      "Hard network: AmneziaWG + QUIC disguise of the first packet + break-check. If nothing is found — see the 'Param finder' tab.",
    "Тщательный: все 256 адресов каждой подсети, в туннеле и замер скорости. Долго!":
      "Thorough: all 256 addresses per subnet, in-tunnel checks and speed test. Slow!",
    "По умолчанию: <code>warpscout scan -p awg -P -n 10 -exclude-node DME</code>":
      "Default: <code>warpscout scan -p awg -P -n 10 -exclude-node DME</code>",
    "Пресет «<b>{name}</b>» применён. Команду можно посмотреть над кнопкой скана.":
      "Preset '<b>{name}</b>' applied. The command is shown above the scan button.",
    /* — скан: протокол — */
    "Протокол": "Protocol",
    "Обфусцированный WireGuard — проходит там, где обычный WG фильтруется.":
      "Obfuscated WireGuard — gets through where plain WG is filtered.",
    "Обычный WireGuard — работает там, где трафик не фильтруется.":
      "Plain WireGuard — works where traffic is not filtered.",
    "CONNECT-IP поверх QUIC, второй транспорт Cloudflare. Узел один на всю сеть.":
      "CONNECT-IP over QUIC, Cloudflare's second transport. One node for the whole network.",
    "MASQUE поверх TCP — те же проверки, но транспорт HTTP/2.":
      "MASQUE over TCP — same checks, but HTTP/2 transport.",
    /* — скан: проверка и выборка — */
    "Проверка и выборка": "Verification & sampling",
    "TUN PING и LOSS": "TUN PING & LOSS",
    "RTT и потери внутри туннеля; ловит эндпоинты, которые DPI рвёт посреди передачи":
      "In-tunnel RTT & loss; catches endpoints that DPI tears mid-transfer",
    "Все 256 адресов подсети": "All 256 subnet addresses",
    "Медленно, но тщательно (перекрывает «Адресов на подсеть»)":
      "Slow but thorough (overrides 'Addresses per subnet')",
    "Адресов на подсеть": "Addresses per subnet",
    "Туннелей одновременно": "Parallel tunnels",
    "Таймаут, сек": "Timeout, sec",
    "Эхо-пакетов": "Echo packets",
    /* — скан: фильтры — */
    "Фильтры узлов": "Node filters",
    "DME исключён": "DME excluded",
    "Исключить узлы": "Exclude nodes",
    "Исключить страны": "Exclude countries",
    "Только узлы": "Only nodes",
    "Только страны": "Only countries",
    /* — скан: обфускация — */
    "Обфускация AmneziaWG": "AmneziaWG obfuscation",
    "Поддельный первый пакет": "Fake first packet",
    "iCloud (базовый)": "iCloud (basic)",
    "SNI для I1": "SNI for I1",
    "Мусорных пакетов": "Junk packets",
    "Случайный junk": "Random junk",
    "Случайные jc/jmin/jmax на этот запуск (перекрывает поля выше)":
      "Random jc/jmin/jmax for this run (overrides the fields above)",
    "Попыток на эндпоинт": "Attempts per endpoint",
    /* — скан: продвинутое — */
    "WARP-in-WARP и продвинутое": "WARP-in-WARP & advanced",
    "опционально": "optional",
    "Через эндпоинт": "Via endpoint",
    "Протокол внутри": "Inner protocol",
    "wg (по умолчанию)": "wg (default)",
    "Свои адреса": "Custom addresses",
    "(IP или CIDR, через запятую)": "(IP or CIDR, comma-separated)",
    "Цель TUN PING": "TUN PING target",
    "Порт": "Port",
    "IPv6-пулы": "IPv6 pools",
    "Замер скорости": "Speed test",
    "Лучший по скорости": "Best by speed",
    /* — скан: запуск — */
    "команда": "command",
    "Начать скан": "Start scan",
    "Сканирую…": "Scanning…",
    "Остановить": "Stop",
    "Phase 1…": "Phase 1…",
    /* — результаты — */
    "Результаты": "Results",
    "Лог": "Log",
    "🕘 История": "🕘 History",
    "↕ пинг": "↕ ping",
    "≡ плотность": "≡ density",
    "→ Конфиг": "→ Config",
    "Фильтр: ip, узел, страна…": "Filter: ip, node, country…",
    "Фильтр результатов": "Results filter",
    "Очистить фильтр (Esc)": "Clear filter (Esc)",
    "Пока нет результатов": "No results yet",
    "Настройте параметры слева и нажмите «Начать скан».":
      "Set the parameters on the left and press 'Start scan'.",
    "Лучший эндпоинт окажется вверху таблицы.": "The best endpoint will be at the top of the table.",
    "Нет совпадений с фильтром": "No filter matches",
    "В запросе: «{q}». Попробуйте узел (HKG), страну или часть IP.":
      "Query: '{q}'. Try a node (HKG), a country, or part of an IP.",
    "Лучший пинг": "Best ping",
    "Появился в этом скане": "New in this scan",
    "Скопировать ip:порт": "Copy ip:port",
    "Использовать в конфиге": "Use in config",
    "Подставить в SOCKS-вкладку": "Fill into the SOCKS tab",
    "Сразу запустить SOCKS5-прокси для этого эндпоинта": "Start a SOCKS5 proxy for this endpoint right away",
    "разорван": "torn",
    /* — конфиг — */
    "Эндпоинт": "Endpoint",
    "Локация узла": "Node location",
    "Из последнего скана или вручную": "From the last scan, or manual",
    "— выберите из результатов скана —": "— pick from scan results —",
    "Версия конфига": "Config version",
    "3.1 — маскировка поведения соединения: случайные тайминги, паддинг, трейлеры. Как в примере.":
      "3.1 — connection behavior masking: random timings, padding, trailers. As in the example.",
    "Свой": "Custom",
    "Интерфейс": "Interface",
    "PersistentKeepalive (0 — не писать строку)": "PersistentKeepalive (0 — omit the line)",
    "0.0.0.0/0, ::/0 (весь трафик)": "0.0.0.0/0, ::/0 (all traffic)",
    "0.0.0.0/0 (только IPv4)": "0.0.0.0/0 (IPv4 only)",
    "::/0 (только IPv6)": "::/0 (IPv6 only)",
    "Своё…": "Custom…",
    "Table = off (маршруты не трогать)": "Table = off (don't touch routes)",
    "Параметры обфускации": "Obfuscation parameters",
    "⟲ из примера": "⟲ from example",
    "Дополнительно (I1–I5, AWG 3.1 тайминги…)": "Advanced (I1–I5, AWG 3.1 timings…)",
    "I1 (CPS-пакет, hex)": "I1 (CPS packet, hex)",
    "Импорт I1 из .conf": "Import I1 from .conf",
    "📥 Импорт .conf целиком": "📥 Import full .conf",
    "Очистить I1": "Clear I1",
    "HeaderProtectionKey (опц.)": "HeaderProtectionKey (opt.)",
    "Ключи аккаунта": "Account keys",
    "Приватный ключ и адреса берутся из файла аккаунта": "The private key and addresses come from the account file",
    ". Смотрите вкладку «Аккаунт».": ". See the 'Account' tab.",
    "Предпросмотр": "Preview",
    "⧉ Копировать": "⧉ Copy",
    "💾 Сохранить как…": "💾 Save as…",
    "Конфиг готов к импорту в AmneziaVPN / AmneziaWG (для AWG) или в WireGuard (для WG).":
      "The config imports into AmneziaVPN / AmneziaWG (for AWG) or WireGuard (for WG).",
    "аккаунт загружен": "account loaded",
    "нет аккаунта": "no account",
    "Чистый WireGuard без обфускации — для сетей, где WARP не режут.":
      "Clean WireGuard without obfuscation — for networks where WARP is not blocked.",
    "AWG 1.5: junk-пакеты (Jc/Jmin/Jmax), префиксы S1–S4 и свои заголовки H1–H4 + I1.":
      "AWG 1.5: junk packets (Jc/Jmin/Jmax), S1–S4 prefixes and custom headers H1–H4 + I1.",
    "AWG 2.0: то же + CPS-пакеты I1–I5 и диапазоны заголовков (можно писать «a-b»).":
      "AWG 2.0: same + CPS packets I1–I5 and header ranges ('a-b' allowed).",
    "AWG 3.1: маскировка поведения соединения — случайные тайминги, паддинг, трейлеры. Как в конфиге-примере.":
      "AWG 3.1: connection behavior masking — random timings, padding, trailers. As in the example config.",
    /* — аккаунт — */
    "Аккаунт WARP": "WARP account",
    "Файл аккаунта": "Account file",
    "Путь": "Path",
    "WG/AWG-устройство": "WG/AWG device",
    "MASQUE-устройство": "MASQUE device",
    "Внешнее (WARP-in-WARP)": "Outer (WARP-in-WARP)",
    "⚙️ Зарегистрировать / обновить ключи": "⚙️ Register / renew keys",
    "🔥 Новый аккаунт (-fresh)": "🔥 New account (-fresh)",
    "📁 Открыть папку": "📁 Open folder",
    "«Обновить ключи» меняет ключи, не создавая новое устройство. «Новый аккаунт» регистрирует устройство с нуля.":
      "'Renew keys' rotates keys without creating a new device. 'New account' registers a device from scratch.",
    "Лог регистрации": "Registration log",
    "Здесь появится вывод warpscout register…": "warpscout register output will appear here…",
    "найден": "found",
    "не найден — нужен для скана": "not found — required for scanning",
    "✓ есть": "✓ present",
    "нет (нужен только для masque)": "absent (needed only for masque)",
    "нет (нужен только для -through)": "absent (needed only for -through)",
    "● аккаунт: есть": "● account: present",
    "● аккаунт: нет — вкладка «Аккаунт»": "● account: missing — see the 'Account' tab",
    "Аккаунт готов": "Account ready",
    "Регистрация не удалась — смотрите лог": "Registration failed — see the log",
    "Демо: аккаунт уже есть": "Demo: account already exists",
    "Создать новый аккаунт WARP с нуля? Текущие ключи будут заменены.":
      "Create a brand-new WARP account? Current keys will be replaced.",
    "📥 Импорт файла аккаунта": "📥 Import account file",
    "Выберите файл аккаунта (warpscout-account.json)": "Pick the account file (warpscout-account.json)",
    "Не удалось сохранить файл аккаунта: {err}": "Could not save the account file: {err}",
    "Готовый аккаунт подключён — можно сканировать": "Ready-made account connected — you can scan now",
    "Подключён готовый аккаунт, найденный рядом: {src}": "Connected a ready-made account found nearby: {src}",
    "Это не JSON-файл. Нужен аккаунт warpscout: JSON с ключами private_key и peer_public_key.":
      "This is not a JSON file. A warpscout account is expected: JSON with private_key and peer_public_key keys.",
    "В файле нет ключей аккаунта (private_key/peer_public_key) — это не warpscout-account.json. Возможно, вы выбрали .conf-конфиг или файл другой программы.":
      "No account keys in the file (private_key/peer_public_key) — this isn't a warpscout-account.json. You may have picked a .conf config or a file from another app.",
    "Не удалось распознать файл аккаунта.": "Could not recognize the account file.",
    "файл есть, но это не JSON": "file exists but is not valid JSON",
    "в файле нет ключей private_key/peer_public_key": "no private_key/peer_public_key keys in the file",
    "warpscout.exe не найден. Распакуйте ZIP целиком (рядом с WARPScoutGUI.exe должна лежать папка bin с warpscout.exe) или укажите путь в Настройках. Если файл на месте — добавьте папку в исключения антивируса.":
      "warpscout.exe was not found. Unpack the ZIP entirely (a bin folder with warpscout.exe must sit next to WARPScoutGUI.exe) or set the path in Settings. If the file is there — add the folder to your antivirus exclusions.",
    "Не удалось сохранить файл аккаунта — папка данных пересоздана. Нажмите «Зарегистрировать» ещё раз.":
      "Could not save the account file — the data folder has been recreated. Click 'Register' once more.",
    "Файл аккаунта повреждён или не читается. Удалите его (кнопка «Открыть папку») и зарегистрируйте заново — или используйте «Новый аккаунт».":
      "The account file is damaged or unreadable. Delete it (via 'Open folder') and register again — or use 'New account'.",
    "Cloudflare API недоступна напрямую и через туннель WARP. Проверьте интернет, попробуйте VPN/прокси или повторите позже — иногда помогает несколько попыток.":
      "The Cloudflare API is unreachable both directly and via a WARP tunnel. Check your connection, try a VPN/proxy, or retry later — several attempts sometimes help.",
    "Код -1: warpscout.exe не смог запуститься или был закрыт. Причины: антивирус заблокировал файл; ZIP распакован не целиком (нет папки bin с warpscout.exe); неверный путь в Настройках. Проверьте папку кнопкой «Открыть папку» и добавьте её в исключения антивируса.":
      "Exit code -1: warpscout.exe failed to start or was closed. Causes: antivirus blocked the file; the ZIP was not fully unpacked (no bin folder with warpscout.exe); a wrong path in Settings. Check the folder via 'Open folder' and add it to your antivirus exclusions.",
    "Смотрите лог выше — там точная причина от warpscout.": "See the log above — warpscout prints the exact reason there.",
    /* — v2.1.1: аккаунт — перепроверка и диагностика «кода -1» — */
    "🔄 Проверить снова": "🔄 Check again",
    "📋 Скопировать путь": "📋 Copy path",
    "Путь скопирован": "Path copied",
    "Аккаунт найден": "Account found",
    "Аккаунт не найден — смотрите путь выше": "Account not found — see the path above",
    "🔓 Разблокировать exe (антивирус)": "🔓 Unblock exe (antivirus)",
    "📂 Папка warpscout.exe": "📂 warpscout.exe folder",
    "🔎 Проверить warpscout": "🔎 Check warpscout",
    "Проверяю warpscout…": "Checking warpscout…",
    "warpscout готов: {v}": "warpscout ready: {v}",
    "warpscout не отвечает — проверьте путь и антивирус": "warpscout is not responding — check the path and your antivirus",
    "warpscout не отвечает (таймаут)": "warpscout is not responding (timeout)",
    "Доступно только в приложении Windows": "Available in the Windows app only",
    "Unblock-File выполнен: с exe снята метка «скачано из интернета». Попробуйте регистрацию ещё раз.":
      "Unblock-File done: the 'downloaded from the internet' mark has been removed from the exe. Try registering again.",
    "Готово — попробуйте регистрацию ещё раз": "Done — try registering again",
    "Не удалось выполнить Unblock-File: {err}": "Could not run Unblock-File: {err}",
    "Процесс завершился с кодом {code}, но файл аккаунта создан и читается — регистрация прошла. Можно сканировать.":
      "The process exited with code {code}, but the account file was created and reads fine — registration succeeded. You can scan now.",
    "Процесс завершился без финального отчёта — сигнал о завершении потерян (так бывает при потере событий или закрытии процесса системой). Нажмите «Проверить снова»: аккаунт мог успеть создаться. Если его нет — добавьте папку в исключения антивируса и повторите регистрацию.":
      "The process ended without a final report — the exit signal was lost (this happens when events drop or the process is closed by the system). Click 'Check again': the account may have been created in time. If not — add the folder to your antivirus exclusions and register again.",
    "Проверка перед запуском показала версию {v} — сам exe запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: добавьте папку в исключения антивируса (и нажмите «Разблокировать exe»), затем повторите.":
      "The preflight check reported version {v} — the exe itself starts and the path is correct. The process seems to get closed during registration: add the folder to your antivirus exclusions (and click 'Unblock exe'), then retry.",
    "Файл кладётся сюда (путь выше). Если warpscout-account.json лежит рядом с warpscout.exe в bin — кнопка «Проверить снова» подхватит его без перезапуска.":
      "This is where the file is kept (path above). If warpscout-account.json sits next to warpscout.exe in bin — the 'Check again' button will pick it up without an app restart.",
    "Если регистрация падает с «кодом -1»: «Проверить warpscout» показывает, запускается ли exe вообще; «Разблокировать exe» снимает метку «скачано из интернета» (PowerShell Unblock-File); папку из предыдущей кнопки добавьте в исключения антивируса.":
      "If registration fails with 'exit code -1': 'Check warpscout' shows whether the exe starts at all; 'Unblock exe' removes the 'downloaded from the internet' mark (PowerShell Unblock-File); add the folder from the previous button to your antivirus exclusions.",
    "«Обновить ключи» меняет ключи, не создавая новое устройство. «Новый аккаунт» регистрирует устройство с нуля. Готовый аккаунт из другой установки: «Импорт файла аккаунта» сам проверит JSON (нужны ключи private_key и peer_public_key) и сохранит его в папку выше с нужным именем.":
      "'Renew keys' rotates keys without creating a new device. 'New account' registers a device from scratch. Got an account from another installation? 'Import account file' validates the JSON (private_key and peer_public_key keys are required) and saves it to the folder above with the right name.",
    /* — socks — */
    "Проверка одного эндпоинта": "Single endpoint check",
    "(как в результатах скана)": "(as in scan results)",
    "★ Лучший": "★ Best",
    "Порт прокси": "Proxy port",
    "▶ Запустить прокси": "▶ Start proxy",
    "Прокси:": "Proxy:",
    "Проверка:": "Check:",
    "Лог прокси": "Proxy log",
    "Здесь появится вывод warpscout socks…": "warpscout socks output will appear here…",
    "Укажите эндпоинт в формате ip:порт (например 188.114.98.58:2408)":
      "Enter the endpoint as ip:port (e.g. 188.114.98.58:2408)",
    "Прокси запускается: ": "Starting proxy: ",
    "{ep}: запускаю прокси": "{ep}: starting proxy",
    "Прокси уже запущен — сначала остановите текущий": "A proxy is already running — stop it first",
    /* — инструменты — */
    "find-junk — подбор junk-параметров": "find-junk — junk parameter finder",
    "Профиль I1": "I1 profile",
    "Порог успеха": "Success threshold",
    "Туннелей": "Tunnels",
    "▶ Искать junk": "▶ Find junk",
    "■ Стоп": "■ Stop",
    "find-sni — подбор SNI для MASQUE": "find-sni — SNI finder for MASQUE",
    "Перебирает известные SNI для MASQUE и печатает готовую команду скана с рабочим именем.":
      "Iterates known MASQUE SNIs and prints a ready-to-use scan command with a working name.",
    "Транспорт": "Transport",
    "▶ Искать SNI": "▶ Find SNI",
    "команда найдена!": "command found!",
    "↧ Применить к скану": "↧ Apply to scan",
    "Если <code>scan -p awg</code> ничего не находит ни с одним I1 — запустите подбор junk-набора. Остановить можно в любой момент, лучший набор сохранится в логе.":
      "If <code>scan -p awg</code> finds nothing with any I1 — run the junk-set search. You can stop anytime; the best set stays in the log.",
    "Нажмите «Применить к скану».": "Press 'Apply to scan'.",
    "Параметры применены к скану": "Parameters applied to the scan",
    "Сначала найдите команду": "Find a command first",
    /* — настройки — */
    "Пути": "Paths",
    "Путь до warpscout.exe": "Path to warpscout.exe",
    "Обзор…": "Browse…",
    "Проверить": "Check",
    "Проверка не выполнялась": "Not checked yet",
    "Файл найден ({p}), но версию получить не удалось — вероятно, антивирус мешает запуску. Откройте вкладку «Аккаунт» и нажмите «Разблокировать exe», либо добавьте папку в исключения антивируса.": "File found ({p}), but the version could not be obtained — the antivirus is probably blocking it. Open the 'Account' tab and press 'Unblock exe', or add the folder to antivirus exclusions.",
    "warpscout.exe не найден. Проверяли:": "warpscout.exe not found. Places checked:",
    "Укажите путь к самому warpscout.exe или к папке, где он лежит, — программа найдёт exe, в том числе в подпапке bin.": "Point to warpscout.exe itself or to the folder where it sits — the app will find the exe, including inside a bin subfolder.",
    "Папка bin на месте, но самого warpscout.exe в ней нет. Так бывает, когда антивирус удалил файл при распаковке ZIP или архив распакован не целиком: верните файл из карантина («Безопасность Windows» → Защита от вирусов → Журнал защиты), добавьте папку приложения в исключения антивируса и распакуйте ZIP заново.": "The bin folder is there, but warpscout.exe itself is missing from it. This happens when antivirus removed the file during ZIP extraction or the archive was not fully unpacked: restore the file from quarantine (Windows Security → Virus protection → Protection history), add the app folder to antivirus exclusions and unpack the ZIP again.",
    "Полный путь:": "Full path:",
    "Открыть папку, где программа ищет или нашла warpscout.exe": "Open the folder where the app looks for or found warpscout.exe",
    "Скопировать отчёт о проверке текстом — удобно прислать вместо скриншота": "Copy the check report as text — handy to send instead of a screenshot",
    "📁 Показать в папке": "📁 Show in folder",
    "⧉ Скопировать диагностику": "⧉ Copy diagnostics",
    "Диагностика скопирована — пришлите её текстом": "Diagnostics copied — please send it as text",
    "Папка не определена — укажите путь и повторите": "Folder not determined — set the path and try again",
    "Папки нет на диске: {p}": "Folder does not exist on disk: {p}",
    "Папка открыта: {p}": "Folder opened: {p}",
    "Файл найден, но не отвечает — вероятно, антивирус. Подробности в подсказке под полем": "File found but does not respond — likely antivirus. See the hint under the path field",
    "✓ warpscout v{v} — готов к работе": "✓ warpscout v{v} — ready to go",
    "warpscout.exe не найден — подробности в подсказке под полем пути": "warpscout.exe not found — see details in the hint under the path field",
    "Можно указать сам warpscout.exe или папку, где он лежит, — программа найдёт exe сама, в том числе в подпапке bin.": "You can point to warpscout.exe itself or to the folder where it sits — the app will find the exe, including inside a bin subfolder.",
    "bin\\warpscout.exe или папка с ним": "bin\\warpscout.exe or its folder",
    "Показать в папке": "Show in folder",
    "Отчёты сканов сохраняются в": "Scan reports are saved to",
    "Открыть": "Open",
    "Данные приложения": "App data",
    "⬇ Резервная копия": "⬇ Backup",
    "⬆ Восстановить": "⬆ Restore",
    "Сбросить настройки и данные": "Reset settings & data",
    "О приложении": "About",
    "WARPSCOUT GUI — графическая оболочка для консольной утилиты":
      "WARPSCOUT GUI is a graphical front-end for the console utility",
    "Дефолтная команда:": "Default command:",
    "Скан запускается локально, без серверов-посредников: туннели поднимаются с вашей машины.":
      "Scanning runs locally, no middleman servers: tunnels are raised from your machine.",
    "⌨ Горячие клавиши": "⌨ Keyboard shortcuts",
    "● warpscout: не найден — укажите путь в «Настройках»": "● warpscout: not found — set the path in 'Settings'",
    "warpscout не найден. Скачайте warpscout.exe и укажите путь.": "warpscout not found. Download warpscout.exe and set the path.",
    "● warpscout v0.16.0 — готов (демо)": "● warpscout v0.16.0 — ready (demo)",
    /* — горячие клавиши — */
    "переключение вкладок": "switch tabs",
    "начать скан": "start scan",
    "остановить скан / закрыть панель или окно": "stop scan / close panel or window",
    "фильтр по результатам": "filter results",
    "сохранить конфиг (на вкладке «Конфиг»)": "save config (on the 'Config' tab)",
    "показать эту справку": "show this help",
    /* — qr-модалка — */
    "▣ QR-код конфига": "▣ Config QR code",
    "⬇ Сохранить PNG": "⬇ Save PNG",
    "⧉ Скопировать конфиг": "⧉ Copy config",
    "Сохранить QR-код": "Save QR code",
    /* — динамика/история — */
    "↘ динамика лучшего пинга": "↘ best-ping trend",
    "слева направо: старые сканы → новые · клик по точке загружает скан":
      "left to right: older scans → newer · click a dot to load that scan",
    "Динамика лучшего пинга по сканам": "Best-ping trend across scans",
    "Скан {ts}, {ping} ms": "Scan {ts}, {ping} ms",
    "{ts} — лучший пинг {ping} ms — клик загрузит скан": "{ts} — best ping {ping} ms — click to load this scan",
    "Последние сканы (хранятся локально, до 10)": "Recent scans (stored locally, up to 10)",
    "История пуста — выполните первый скан.": "History is empty — run your first scan.",
    "рабочих": "working",
    "разорвано": "torn",
    "Δ сравнить с текущей таблицей (без загрузки)": "Δ compare with the current table (without loading)",
    "Удалить всю историю": "Clear all history",
    "🗑 Очистить": "🗑 Clear",
    "Выгрузить всю историю в JSON-файл": "Export all history to a JSON file",
    "Δ сравнение с текущей таблицей:": "Δ comparison with the current table:",
    "➕ новых: ": "➕ new: ",
    "➖ пропали: ": "➖ gone: ",
    "Различий нет — наборы эндпоинтов совпадают": "No differences — the endpoint sets match",
    "Δ: новых {n}, пропали {g}": "Δ: {n} new, {g} gone",
    "Загружен скан от {ts} — {n} рабочих": "Loaded scan from {ts} — {n} working",
    "Удалить всю историю сканов ({n})? Текущая таблица результатов останется.":
      "Delete the entire scan history ({n})? The current results table stays.",
    "История очищена": "History cleared",
    "История и так пуста": "History is already empty",
    "История пуста — нечего выгружать": "History is empty — nothing to export",
    "История выгружена: ": "History exported: ",
    "История сохранена: ": "History saved: ",
    "Выгрузить историю сканов (JSON)": "Export scan history (JSON)",
    "История CSV выгружена: ": "History CSV exported: ",
    "История CSV сохранена: ": "History CSV saved: ",
    "⬇ CSV (итоги)": "⬇ CSV (summary)",
    "Сохранить итоги истории (CSV)": "Save history summary (CSV)",
    /* — статистика — */
    "📡 всего": "📡 total",
    "✅ рабочих": "✅ working",
    "✂ разорвано": "✂ torn",
    "⚡ лучший": "⚡ best",
    "⚖ медиана": "⚖ median",
    "📈 профиль": "📈 profile",
    "🌍 узлов": "🌍 nodes",
    "➕ новых": "➕ new",
    "➖ пропали": "➖ gone",
    "Минимальный пинг среди рабочих": "Lowest ping among working endpoints",
    "Медианный пинг рабочих": "Median ping of working endpoints",
    "Распределение пинга рабочих эндпоинтов: мин {min} / макс {max} ms":
      "Ping distribution of working endpoints: min {min} / max {max} ms",
    "Узлы: {nodes}": "Nodes: {nodes}",
    "Эндпоинтов, которых не было в прошлом скане": "Endpoints not present in the previous scan",
    "Пропали с прошлого скана ({n}): {list}": "Gone since the previous scan ({n}): {list}",
    "показано <b>{n}</b> из {m}": "showing <b>{n}</b> of {m}",
    /* — скан-процесс — */
    "Запуск warpscout…": "Launching warpscout…",
    "Фаза 1: ищем проходимые порты": "Phase 1: probing passable ports",
    "Фаза 2: проверяем туннели": "Phase 2: verifying tunnels",
    "Замер скорости (медленно, ждите)…": "Speed test (slow, please wait)…",
    "Остановлено": "Stopped",
    "Читаем отчёт…": "Reading the report…",
    "Скан остановлен": "Scan stopped",
    "[GUI] Отчёт не найден — смотрим конец лога.": "[GUI] Report not found — see the end of the log.",
    "warpscout завершился с ошибкой (код {code}). Смотрите лог — часто не хватает аккаунта или фильтры слишком строгие.":
      "warpscout exited with an error (code {code}). Check the log — often an account is missing or filters are too strict.",
    "Скан завершён, но отчёт пуст. Смотрите лог.": "Scan finished, but the report is empty. Check the log.",
    "Скан завершён: рабочих эндпоинтов — {n}": "Scan finished: {n} working endpoints",
    "Скан завершён: рабочих эндпоинтов — {n}, разорванных — {t}": "Scan finished: {n} working, {t} torn",
    "Рабочих эндпоинтов не найдено": "No working endpoints found",
    "Рабочих эндпоинтов не найдено ({t} разорвано)": "No working endpoints found ({t} torn)",
    "Попробуйте «Жёсткая сеть» или find-junk.": "Try 'Hard network' or find-junk.",
    "Рабочих эндпоинтов не найдено ({t} разорвано). Попробуйте «Жёсткая сеть» или find-junk.":
      "No working endpoints found ({t} torn). Try 'Hard network' or find-junk.",
    "Сначала создайте аккаунт WARP — вкладка «Аккаунт»": "Create a WARP account first — the 'Account' tab",
    "Не удалось запустить warpscout: ": "Failed to launch warpscout: ",
    /* — тосты/действия — */
    "Скопировано": "Copied",
    "Не удалось скопировать": "Copy failed",
    "Эндпоинт скопирован": "Endpoint copied",
    "Скопировано эндпоинтов: {n}": "Endpoints copied: {n}",
    "Нет рабочих эндпоинтов для копирования": "No working endpoints to copy",
    "Эндпоинт подставлен в конфиг: {ep}": "Endpoint put into the config: {ep}",
    "Эндпоинт готов к проверке во вкладке SOCKS": "Endpoint ready for a check in the SOCKS tab",
    "Команда скопирована": "Command copied",
    "Конфиг скопирован": "Config copied",
    "Сначала выполните скан": "Run a scan first",
    "Лучший эндпоинт из скана: {ep}": "Best endpoint from the scan: {ep}",
    "Светлая тема включена": "Light theme enabled",
    "Тёмная тема включена": "Dark theme enabled",
    "Язык переключён на английский": "Language switched to Russian",
    /* — конфиг: сохранение/импорт — */
    "Сохранить конфиг": "Save config",
    "Сохранение работает только в приложении Windows": "Saving works only in the Windows app",
    "Конфиг сохранён: ": "Config saved: ",
    "Ошибка записи: ": "Write error: ",
    "Выберите .conf с I1": "Choose a .conf with I1",
    "Импорт работает только в приложении": "Import works only in the app",
    "I1 импортирован": "I1 imported",
    "В файле нет строки I1 — это не AWG-конфиг?": "No I1 line in the file — is it not an AWG config?",
    "Не удалось прочитать файл": "Could not read the file",
    "Не удалось прочитать файл: ": "Could not read the file: ",
    "Выберите .conf для импорта": "Choose a .conf to import",
    "Не удалось разобрать файл: нет пар «ключ = значение»": "Could not parse the file: no 'key = value' pairs",
    "Импортирован конфиг: {what}": "Config imported: {what}",
    "Не перенесено: {what}": "Not carried over: {what}",
    "Ошибка разбора: ": "Parse error: ",
    "DNS свои": "custom DNS",
    "эндпоинт": "endpoint",
    "AllowedIPs весь": "all AllowedIPs",
    "AllowedIPs свои": "custom AllowedIPs",
    "заголовки ({n})": "headers ({n})",
    "тайминги 3.1": "3.1 timings",
    "PrivateKey/Address берутся из аккаунта": "PrivateKey/Address come from the account",
    "PublicKey берётся из аккаунта": "PublicKey comes from the account",
    "PresharedKey не поддерживается": "PresharedKey is not supported",
    "I2–I5 отсутствуют в полях GUI": "I2–I5 have no fields in the GUI",
    /* — qr — */
    "QR-модуль не загружен": "QR module not loaded",
    "страница {i} из {n}": "page {i} of {n}",
    "Предыдущая страница": "Previous page",
    "Следующая страница": "Next page",
    "Отсканируйте камерой в AmneziaVPN («Сканировать QR-код») — конфиг перенесётся без файлов. Длинный конфиг разбивается на страницы: сканируйте их по очереди, пока все не соберутся, порядок не важен. В WireGuard длинный конфиг вносится файлом.": "Scan with the camera in AmneziaVPN (“Scan QR code”) — the config transfers without files. A long config is split into pages: scan them one by one until all are collected — the order doesn't matter. In WireGuard, import a long config from a file.",
    "QR-код конфига": "Config QR code",
    "Конфиг {n} симв. — не помещается в QR (лимит 2953). Обычно виноват длинный I1: уберите его или сохраните конфиг файлом.":
      "The config is {n} chars — too big for QR (limit 2953). Usually a long I1 is to blame: drop it or save the config as a file.",
    "PNG скачан: ": "PNG downloaded: ",
    "QR сохранён: ": "QR saved: ",
    "Не удалось построить QR: ": "Failed to build the QR: ",
    /* — бэкап состояния — */
    "Резервная копия WARPSCOUT GUI": "WARPSCOUT GUI backup",
    "Резервная копия скачана: ": "Backup downloaded: ",
    "Копия сохранена: ": "Backup saved: ",
    "Ошибка экспорта: ": "Export error: ",
    "Файл не похож на резервную копию WARPSCOUT GUI": "The file does not look like a WARPSCOUT GUI backup",
    "Настройки восстановлены из копии": "Settings restored from the backup",
    "Выберите файл резервной копии": "Choose a backup file",
    "Некорректный JSON: ": "Invalid JSON: ",
    /* — сброс — */
    "Сбросить все настройки и данные приложения?": "Reset all app settings and data?",
    "Настройки сброшены": "Settings reset",
    /* — пресеты: тосты — */
    "Введите название пресета": "Enter a preset name",
    "Пресет \"{name}\" уже есть — перезаписать?": "Preset \"{name}\" already exists — overwrite?",
    "Пресет сохранён: {name}": "Preset saved: {name}",
    "Пресет применён: {name}": "Preset applied: {name}",
    "Пресет удалён": "Preset deleted",
    "Удалить пресет \"{name}\"?": "Delete the preset \"{name}\"?",
    "Удалить пресет": "Delete preset",
    "Пресет: применить. ✕ — удалить": "Preset: apply. ✕ — delete",
    /* — прочее — */
    "Не удалось запустить": "Failed to start",
    "[GUI] Прокси остановлен.": "[GUI] Proxy stopped.",
    "Выбор файла работает только в приложении": "File picking works only in the app",
    "Выберите warpscout.exe": "Choose warpscout.exe",
    "Найден warpscout v": "Found warpscout v",
    "Не удалось открыть папку": "Could not open the folder",
    "Только в приложении Windows": "Only in the Windows app",
    "[демо] Используется демо-аккаунт. В приложении здесь выполняется настоящая регистрация.":
      "[demo] Using the demo account. In the real app, actual registration runs here.",
    "[GUI] Готово.": "[GUI] Done.",
    "Готово.": "Done.",
    "Сортировать": "Sort",
    "Узел": "Node",
    "пинг": "ping",
    "потери": "loss",
    "Адрес прокси скопирован": "Proxy address copied",
    "Нет результатов скана": "No scan results",
    "Взят лучший эндпоинт: {ep}": "Took the best endpoint: {ep}",
    "<запустите регистрацию на вкладке «Аккаунт»>": "<run the registration on the 'Account' tab>",
    "[GUI] Регистрация завершилась с ошибкой (код {code}).": "[GUI] Registration exited with an error (code {code}).",
    "[GUI] Не удалось запустить warpscout: ": "[GUI] Failed to launch warpscout: ",
    "Ошибка запуска warpscout": "Error launching warpscout",
    "Обычная таблица": "Regular table",
    "Компактная таблица включена": "Compact table enabled",
    "Плотность таблицы": "Table density",
    "Открыть демо в браузере": "Open the demo in a browser",
    "Откройте приложение через WARPScoutGUI.exe": "Open the app via WARPScoutGUI.exe",
    /* — v1.7.0: ⇅-сравнение, тренд CSV, kbd-язык — */
    "⇅ сравнить": "⇅ compare",
    "Сравнить два скана из истории (модалка)": "Compare two scans from history (modal)",
    "Для сравнения нужно минимум два скана — выполните ещё один.": "You need at least two scans to compare — run one more.",
    "Нужно как минимум два скана в истории.": "At least two scans are required in history.",
    "лучший пинг A": "best ping A",
    "лучший пинг B": "best ping B",
    "нет данных": "no data",
    "без изменений": "unchanged",
    "−{n} ms быстрее": "−{n} ms faster",
    "только в B:": "only in B:",
    "только в A:": "only in A:",
    "общих эндпоинтов:": "common endpoints:",
    "Нет общих живых эндпоинтов с пингом.": "No common live endpoints with ping.",
    "разорван → разорван": "torn → torn",
    "статус изменился": "status changed",
    "Сортировать": "Sort",
    "Сохранить динамику пинга в CSV": "Save ping trend as CSV",
    "Сохранить динамику пинга (CSV)": "Save ping trend (CSV)",
    "Нет сканов с пингами — тренд пуст": "No scans with ping — trend is empty",
    "Тренд CSV выгружен: {path}": "Trend CSV downloaded: {path}",
    "Тренд CSV сохранён: {path}": "Trend CSV saved: {path}",
    "Скан A": "Scan A",
    "Скан B": "Scan B",
    /* — v1.8.0: шаринг пресетов + живая панель скана — */
    "Экспортировать свои пресеты в JSON-файл (поделиться)": "Export your presets to a JSON file (share)",
    "Импортировать пресеты из JSON-файла": "Import presets from a JSON file",
    "Своих пресетов пока нет — сохраните хотя бы один (кнопка «＋ Свой»)": "No custom presets yet — save at least one (the '＋ Custom' button)",
    "Файл не похож на набор пресетов WARPSCOUT GUI": "The file does not look like a WARPSCOUT GUI presets file",
    "Пресеты экспортированы: {path}": "Presets exported: {path}",
    "Пресеты скачаны: {path}": "Presets downloaded: {path}",
    "Экспорт пресетов": "Export presets",
    "Выберите файл пресетов": "Choose a presets file",
    "Импорт пресетов: добавлено {n}, пропущено (дубли) {d}": "Preset import: {n} added, {d} duplicates skipped",
    "Импорт пресетов: добавлено {n}": "Preset import: {n} added",
    "В файле нет ни одного корректного пресета": "The file contains no valid presets",
    "Ждём первый шаг прогресса…": "Waiting for the first progress step…",
    "Прямой эфир": "Live",
    "шагов": "steps",
    "узлов": "nodes",
    "сек": "s",
    /* — v1.9.0: порты, быстрая проверка, PNG тренда — */
    "Частота портов среди рабочих эндпоинтов — клик фильтрует таблицу": "Port frequency among working endpoints — click to filter the table",
    "Показать только порт {port}": "Show only port {port}",
    "Быстрая проверка эндпоинта": "Quick endpoint check",
    "⚡ Быстрая проверка": "⚡ Quick check",
    "Одна строка warpscout вместо целого скана:": "A single warpscout line instead of a full scan:",
    "— handshake на указанный порт и пинг внутри туннеля. Результат никуда не сохраняется — только эта модалка.": "— handshake on the given port and in-tunnel ping. The result is not saved anywhere — this dialog only.",
    "Быстрая проверка: handshake на указанный порт и пинг внутри туннеля": "Quick check: handshake on the given port and in-tunnel ping",
    "Уже идёт проверка — подождите": "A check is already running — please wait",
    "Проверка недоступна во время скана": "Check unavailable while a scan is running",
    "Не удалось разобрать адрес": "Could not parse the address",
    "Не удалось запустить проверку: {err}": "Failed to start the check: {err}",
    "warpscout завершился с кодом {c}": "warpscout exited with code {c}",
    "✅ Рабочий — TUN PING {ping} ms, потери {loss}": "✅ Working — TUN PING {ping} ms, loss {loss}",
    "⛔ Разорван — потери {loss}": "⛔ Torn — loss {loss}",
    "Эндпоинт не ответил (нет строки в отчёте)": "Endpoint did not respond (no row in the report)",
    "Проверка {ep}: рабочий, TUN PING {ping} ms": "Check {ep}: working, TUN PING {ping} ms",
    "Проверка {ep}: разорван": "Check {ep}: torn",
    "Проверка {ep}: не ответил": "Check {ep}: no response",
    "Проверка {ep}: ошибка {err}": "Check {ep}: error {err}",
    "Результат никуда не сохраняется — только эта модалка": "The result is not saved anywhere — this dialog only",
    /* — v2.0.0: журнал ⚡-проверок, пакетная проверка, SVG/HTML-экспорт — */
    "— handshake на указанный порт и пинг внутри туннеля. Вердикты сохраняются в журнал проверок (панель 🕘 История).": "— handshake on the given port and in-tunnel ping. Verdicts are saved to the check journal (🕘 History panel).",
    "⚡ Журнал проверок": "⚡ Check journal",
    "Журнал пуст — запустите ⚡-проверку эндпоинта": "Journal is empty — run a ⚡ endpoint check",
    "Сохранить журнал проверок (CSV)": "Save check journal (CSV)",
    "Удалить весь журнал проверок": "Clear the whole check journal",
    "Удалить весь журнал проверок ({n})?": "Delete the whole check journal ({n})?",
    "Журнал проверок очищен": "Check journal cleared",
    "Журнал и так пуст": "The journal is already empty",
    "Журнал проверок выгружен: {path}": "Check journal exported: {path}",
    "Журнал проверок сохранён: {path}": "Check journal saved: {path}",
    "☑ Выбрать": "☑ Select",
    "Выбрать": "Select",
    "Снять выбор": "Deselect",
    "Выбрать несколько эндпоинтов для пакетной проверки": "Select several endpoints for a batch check",
    "Выбрать для пакетной проверки": "Select for batch check",
    "Отметить все видимые": "Check all visible",
    "Выберите хотя бы один эндпоинт": "Select at least one endpoint",
    "Выбрано: {n}": "Selected: {n}",
    "Пакетная проверка: {n}": "Batch check: {n}",
    "Последовательная очередь ⚡-проверок — по команде на каждый эндпоинт": "Sequential queue of ⚡ checks — one command per endpoint",
    "Проверено {done}/{n} · ✅ {ok} · ⛔ {torn}": "Checked {done}/{n} · ✅ {ok} · ⛔ {torn}",
    "Готово: {ok} рабочих, {torn} разорванных, {other} без ответа из {n}": "Done: {ok} working, {torn} torn, {other} no answer out of {n}",
    "Пакетная проверка завершена": "Batch check finished",
    "⚡ Проверить выбранные (": "⚡ Check selected (",
    "{i}/{n}: {ep}": "{i}/{n}: {ep}",
    "Сохранить график тренда в SVG": "Save the trend chart as SVG",
    "Сохранить динамику пинга (SVG)": "Save ping trend (SVG)",
    "Тренд SVG скачан: {path}": "Trend SVG downloaded: {path}",
    "Тренд SVG сохранён: {path}": "Trend SVG saved: {path}",
    "Ошибка экспорта SVG: {err}": "SVG export error: {err}",
    "отчёт скана": "scan report",
    "Нет результатов — нечего сохранять в HTML": "No results — nothing to save as HTML",
    "Сохранить HTML-отчёт": "Save HTML report",
    "Автономный HTML-отчёт по текущей таблице": "Standalone HTML report of the current table",
    "Поделиться сканом как HTML-файлом": "Share the scan as an HTML file",
    "HTML-отчёт выгружен: {path}": "HTML report exported: {path}",
    "HTML-отчёт сохранён: {path}": "HTML report saved: {path}",
    "Сгенерировано WARPSCOUT GUI v{v} · {d} · снимок текущей таблицы результатов": "Generated by WARPSCOUT GUI v{v} · {d} · a snapshot of the current results table",
    "Узел": "Node",
    "Нужно минимум 2 скана с пингами": "Need at least 2 scans with pings",
    "Сохранить график тренда в PNG": "Save the trend chart as PNG",
    "Сохранить динамику пинга (PNG)": "Save ping trend (PNG)",
    "Тренд PNG сохранён: {path}": "Trend PNG saved: {path}",
    "Тренд PNG скачан: {path}": "Trend PNG downloaded: {path}",
    "Ошибка экспорта PNG: {err}": "PNG export error: {err}",
    "сканов с пингами": "scans with pings",
    /* — v2.5.2: главная-панель быстрых действий (touch) — */
    "Просканировать эндпоинты": "Scan endpoints",
    "Получить рабочий конфиг": "Get a working config",
    "Разделы": "Sections",
    "Конфиг сохранён": "Config saved",
    "Скопировать конфиг": "Copy config",
    "Скан ещё не запускался": "No scan has been run yet",
    "Живых эндпоинтов: {n}": "Live endpoints: {n}",
    "Живых эндпоинтов пока нет": "No live endpoints yet",
    "Нет живых эндпоинтов — сначала просканируйте": "No live endpoints — run a scan first",
    "Дождитесь окончания скана — конфиг строится по его результатам": "Wait for the scan to finish — the config is built from its results",
    "Скан запущен": "Scan started",
    "Скан уже выполняется — вкладка скана открыта": "A scan is already running — the scan tab is open",
    "Конфиг готов: {p}": "Config ready: {p}",
    "Конфиг сохранён: {p}": "Config saved: {p}",
    "Отчёты и конфиги дублируются в общую папку устройства: Download/WARPScoutGUI": "Reports and configs are duplicated to the device's shared folder: Download/WARPScoutGUI",
    "Выбор папки данных работает только в приложении": "Data folder selection works in the app only",
    /* — v2.5.4: главная, открытие папок, конфиги в Download — */
    "Открываю папку{what}: {p}": "Opening folder{what}: {p}",
    "Только в приложении (в демо папки нет)": "Only in the app (no folders in the demo)",
    "Не удалось открыть папку": "Could not open the folder",
    "■ Остановить скан": "■ Stop scan",
    "Остановить скан": "Stop scan",
    "Конфиг сохранён в Download/WARPScoutGUI": "Config saved to Download/WARPScoutGUI",
    "Download недоступен без разрешения — конфиг сохранён в папку приложения": "Download is unavailable without permission — the config was saved to the app folder",
    "Download недоступен ({err}) — сохраняю в папку приложения": "Download is unavailable ({err}) — saving to the app folder",
    "Готовые конфиги сохраняются в Download/WARPScoutGUI — папка видна в любом файловом менеджере": "Ready configs are saved to Download/WARPScoutGUI — visible in any file manager",
    "готовые конфиги (видны в любом файловом менеджере)": "ready configs (visible in any file manager)",
    // текстовый узел в homePubBox начинается с « — » — нужен и такой ключ
    "— готовые конфиги (видны в любом файловом менеджере)": "— ready configs (visible in any file manager)",
    "■ Остановить": "■ Stop",
    "Скан завершён": "Scan finished",
    "конфиги": "configs",
    "аккаунт и отчёты": "account and reports",
    "папка данных": "data folder",
    "файл аккаунта": "account file",
    "отчёты": "reports",
    "warpscout": "warpscout",
    "пользовательские файлы (отчёты, конфиги, аккаунт)": "user files (reports, configs, account)",
    "Отчёт скопирован в общую папку: {p}": "Report copied to the shared folder: {p}",
    "Копия в общей папке: {p}": "Copy in shared folder: {p}",
    "Скан уже выполняется": "A scan is already running",
    /* — v1.8.0: лендинг — */
    /* — v2.2.0: единая папка данных — (v2.3.0: данные перенесены в папку «<имя exe>», объединение удалено) — */
    "Папка данных": "Data folder",
    "Аккаунт, отчёты и веб-кэш движка (EBWebView) — в одной папке: %APPDATA%\\WARPScoutGUI.exe. Она создаётся программой сама и всегда на месте. Можно выбрать и другую — например, на другом диске.": "Account, reports and the engine web cache (EBWebView) live in one folder: %APPDATA%\\WARPScoutGUI.exe. The app creates it itself, so it is always there. You can pick another folder — e.g. on another drive.",
    "📁 Выбрать…": "📁 Browse…",
    "📂 Открыть": "📂 Open",
    "↩ По умолчанию": "↩ Default",
    "Статус": "Status",
    "✓ аккаунт, отчёты и кэш — в одной папке": "✓ account, reports and cache — in one folder",
    "⚠ своя папка данных": "⚠ custom data folder",
    "Всё вместе — в одной папке: {u}. Она создаётся программой сама, поэтому всегда на месте.": "Everything together in one folder: {u}. The app creates it itself, so it is always there.",
    "Данные (аккаунт, отчёты): {d}. Веб-кэш движка рантайм всегда держит в {u} — техническая папка останется рядом.": "Data (account, reports): {d}. The runtime always keeps the engine web cache in {u} — that technical folder will remain nearby.",
    "Файл кладётся сюда (путь выше). Если warpscout-account.json лежит рядом с warpscout.exe в bin — кнопка «Проверить снова» подхватит его без перезапуска. Саму папку данных можно сменить в Настройках → «Папка данных».": "The file goes here (path above). If warpscout-account.json sits next to warpscout.exe in bin — the «Check again» button picks it up without a restart. The data folder itself can be changed in Settings → «Data folder».",
    "Пользовательская папка данных недоступна — вернулись к папке по умолчанию": "Custom data folder is unavailable — switched back to the default folder",
    "Сначала остановите скан/регистрацию/прокси — перенос данных посреди работы невозможен": "Stop the scan/registration/proxy first — data cannot be moved while running",
    "Данные из прежней папки приложения перенесены: {n} ({list})": "Data from the app's previous folder has been moved: {n} ({list})",
    "Сначала остановите скан/регистрацию/прокси": "Stop the scan/registration/proxy first",
    "Данные уже хранятся в этой папке": "Data is already stored in this folder",
    "Папка недоступна для записи — выберите другую": "Folder is not writable — pick another one",
    "Папка данных изменена, перенесено файлов: {n} ({list})": "Data folder changed, moved {n} file(s): {list}",
    "Папка данных изменена": "Data folder changed",
    "Демо: путь к новой папке данных:": "Demo: path of the new data folder:",
    "Выберите папку для данных WARPSCOUT GUI": "Choose a folder for WARPSCOUT GUI data",
    /* — v2.3.0: разбор junction v2.2.0 и перенос данных из старой папки — */
    "Не удалось снять ссылку «<имя exe>» — данные доступны, папка осталась ссылкой. Закройте приложение и удалите ссылку вручную (Проводник удаляет только ссылку), затем запустите снова.": "Could not remove the «<exe name>» link — data is accessible, the folder remained a link. Close the app and delete the link manually (Explorer removes only the link), then start the app again.",
    "Ссылка «<имя exe>» разобрана: аккаунт и отчёты снова в обычной папке, рядом с кэшем движка": "The «<exe name>» link has been dismantled: account and reports are back in a regular folder, next to the engine cache",
    "Данные перенесены рядом с кэшем движка ({n}): {list}": "Data moved next to the engine cache ({n}): {list}",
    /* — v2.4.3: IPv6-адреса DNS — */
    "Использовать IPv6": "Use IPv6",
    "Добавляет v6-адреса выбранного DNS-провайдера к IPv4 (отключите, если у сети нет IPv6-маршрута)": "Adds the selected DNS provider's v6 addresses to IPv4 (turn off if your network has no IPv6 route)",
    /* v2.6.0 (SEC-6): ключи механики «В общую папку»/«Все файлы» удалены вместе
       с UI (кнопка убрана, выбор папки данных на Android скрыт). Публичная
       выгрузка — Download/WARPScoutGUI через MediaStore (см. mirrorPublic). */
  };

  let LANG = "ru";
  let i18nStaticReady = false;
  let i18nTextNodes = [];   // статические текстовые узлы, собранные один раз
  let i18nAttrEls = [];     // элементы с переводимыми атрибутами

  function t(ru) {
    const key = IS_WIN ? ru : platKey(ru); // v2.5.0: на Linux ключ нормализуется до словаря
    if (LANG !== "en") return key;
    const v = I18N_EN[key];
    return v === undefined ? key : v;
  }
  function tF(ru, vars) {
    let s = t(ru);
    if (vars) {
      for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(String(vars[k]));
    }
    return s;
  }

  const I18N_SKIP_SEL =
    "#resultsBody,#resultsHead,#resultsEmpty,#historyPanel,#resStats,#resFilterMeta," +
    "#presetHint,#customPresetChips,#confPreview,#scanLog,#accLog,#socksLog,#toolsLog," +
    "#toasts,#stWs,#stAcc,#accFileState,#accFilePath,#accMainState,#accMasqueState," +
    "#accOuterState,#btnRunScanLabel,#scanPhase,#resCount,#cfgFileName,#cfgVerHint," +
    "#cfgKeysState,#socksAddr,#setWsVerHint,#foundCmdBadge,#qrBox,#cfgEndpointSel," +
    "#btnHistory,#btnTheme,#kbdTable,#presetName," +
    "#udfState,#dataRootHint,#setDataRoot,#scanLivePhase,#scanLiveElapsed,#scanLiveMeta,#scanLiveNodes,#scanLiveDot";

  function i18nInitStatic() {
    if (i18nStaticReady) return;
    i18nStaticReady = true;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest("script,style")) return NodeFilter.FILTER_REJECT;
        if (p.closest(I18N_SKIP_SEL)) return NodeFilter.FILTER_REJECT;
        // переводим только узлы, где есть кириллица (латиница-команды не трогаем)
        if (!/[а-яё]/i.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) {
      node.__ru = node.nodeValue;
      i18nTextNodes.push(node);
    }
    // атрибуты: placeholder / title / aria-label с кириллицей
    $$("input[placeholder], button[title], [aria-label], [title], select[title]").forEach((el) => {
      if (el.closest("script,style") || el.closest(I18N_SKIP_SEL)) return;
      const orig = {};
      let hasRu = false;
      ["placeholder", "title", "aria-label"].forEach((a) => {
        const v = el.getAttribute(a);
        if (v && /[а-яё]/i.test(v)) { orig[a] = v; hasRu = true; }
      });
      if (hasRu) { el.__i18nAttrs = orig; i18nAttrEls.push(el); }
    });
  }

  function i18nApplyStatic() {
    i18nTextNodes.forEach((node) => {
      const orig = node.__ru != null ? node.__ru : node.nodeValue;
      let out;
      if (LANG === "en") {
        const key = platKey(orig.trim()); // v2.5.0: ключ нормализуется до словаря
        const v = I18N_EN[key];
        out = v === undefined ? orig.replace(orig.trim(), key) : orig.replace(orig.trim(), v);
      } else {
        out = orig.replace(orig.trim(), platKey(orig.trim())); // v2.5.0
      }
      if (node.nodeValue !== out) node.nodeValue = out;
    });
    i18nAttrEls.forEach((el) => {
      const orig = el.__i18nAttrs || {};
      Object.keys(orig).forEach((a) => {
        if (LANG === "en") {
          const key = platKey(orig[a].trim()); // v2.5.0
          const v = I18N_EN[key];
          el.setAttribute(a, v === undefined ? orig[a].replace(orig[a].trim(), key) : orig[a].replace(orig[a].trim(), v));
        } else {
          el.setAttribute(a, orig[a].replace(orig[a].trim(), platKey(orig[a].trim()))); // v2.5.0
        }
      });
    });
    document.documentElement.setAttribute("lang", LANG === "en" ? "en" : "ru");
  }

  // перерисовать всё динамическое (JS-генерируемый русский текст)
  function rerenderI18nDynamic() {
    try { renderResults(); } catch (e) {}
    try { fillEndpointSelect(); } catch (e) {}
    try { renderConf(); } catch (e) {}
    try { renderCustomPresets(); } catch (e) {}
    try { renderHistoryBtn(); } catch (e) {}
    try { if (S.historyOpen) toggleHistory(true); } catch (e) {}
    try { updateCmdPreview(); } catch (e) {}
    try { renderAccount(); } catch (e) {}
    try { highlightMatchingPreset(); } catch (e) {}
    try { setScanRunning(S.running.scan); } catch (e) {}
    try { renderStatusWs(); } catch (e) {}
    try { renderWsHints(); } catch (e) {}
    try { const cm = $("#cmpModal"); if (cm && !cm.classList.contains("hidden")) renderCmpBody(); } catch (e) {} // v1.7.0
    try { qcRenderLast(); } catch (e) {} // v1.9.0: вердикт быстрой проверки на новом языке
    try { renderDataFolder(); } catch (e) {} // v2.2.0: статус папки данных на новом языке
    try {
      const bSel = $("#btnSelectMode"); // v2.0.0: метка кнопки перезаписывается JS — обновить вручную
      if (bSel) bSel.textContent = S.qcSelMode ? "✕ " + t("Снять выбор") : "☑ " + t("Выбрать");
    } catch (e) {}
    try {
      const bBatch = $("#btnBatchCheck"); // v2.0.0: статическая часть надписи пакетной кнопки
      if (bBatch && !S.qcBatch) {
        const span = bBatch.querySelector("#batchCount");
        if (span) {
          bBatch.childNodes[0].nodeValue = t("⚡ Проверить выбранные (");
        }
      }
    } catch (e) {}
    try { applyTheme(document.documentElement.getAttribute("data-theme") || "dark"); } catch (e) {}
    const hint = $("#setWsCheckHint");
    if (hint) hint.textContent = hint.textContent; // статичен
  }

  // статус-строка warpscout (вынесена, чтобы вызывать и из init, и из i18n)
  function renderStatusWs() {
    const el = $("#stWs");
    if (!el) return;
    if (IS_MOCK) {
      el.textContent = t("● warpscout v0.16.0 — готов (демо)");
      el.className = "statusline__row is-ok";
    } else if (S.wsVersion) {
      el.textContent = tF("● warpscout v{v} — готов", { v: S.wsVersion });
      el.className = "statusline__row is-ok";
    } else if (S.wsChecked) {
      el.textContent = t("● warpscout: не найден — укажите путь в «Настройках»");
      el.className = "statusline__row is-err";
    } else {
      el.textContent = t("● warpscout: проверка…");
      el.className = "statusline__row";
    }
  }

  // подсказка в «Настройках» о статусе warpscout (v1.6.0 — с учётом языка;
  // v2.4.0 — три честных состояния: версия получена / файл есть, но не отвечает / не найден + список мест;
  // v2.4.1 — при «не найден» показываем ПОСТРОЧНО все проверенные места с отметками есть/нет
  // и отдельную подсказку про антивирус, если папка bin есть, а warpscout.exe в ней нет)
  function renderWsHints() {
    const hint = $("#setWsVerHint");
    if (!hint) return;
    hint.classList.remove("is-err-hint");
    if (S.wsVersion) {
      hint.textContent = t("Найден warpscout v") + S.wsVersion + " · " + S.paths.wsPath;
    } else if (S.wsChecked && S.wsFileThere) {
      hint.textContent = tF("Файл найден ({p}), но версию получить не удалось — вероятно, антивирус мешает запуску. Откройте вкладку «Аккаунт» и нажмите «Разблокировать exe», либо добавьте папку в исключения антивируса.", { p: S.paths.wsPath });
      hint.classList.add("is-err-hint");
    } else if (S.wsChecked) {
      const checked = (S.paths.wsCheckedList && S.paths.wsCheckedList.length)
        ? S.paths.wsCheckedList
        : (S.paths.wsTried || []).map((p) => ({ path: p, exists: false }));
      const lines = checked.slice(0, 8).map((c) => (c.exists ? "✓ " : "✗ ") + c.path);
      const more = checked.length > 8 ? "\n… и ещё " + (checked.length - 8) : "";
      let extra = "";
      if (S.paths.appBinMissing) {
        extra = "\n" + t("Папка bin на месте, но самого warpscout.exe в ней нет. Так бывает, когда антивирус удалил файл при распаковке ZIP или архив распакован не целиком: верните файл из карантина («Безопасность Windows» → Защита от вирусов → Журнал защиты), добавьте папку приложения в исключения антивируса и распакуйте ZIP заново.");
      }
      hint.textContent = t("warpscout.exe не найден. Проверяли:") + "\n" + lines.join("\n") + more + "\n" + t("Укажите путь к самому warpscout.exe или к папке, где он лежит, — программа найдёт exe, в том числе в подпапке bin.") + extra;
      hint.classList.add("is-err-hint");
    } else hint.textContent = t("Проверка не выполнялась");
  }

  // ─── v2.4.1: «Показать в папке» и «Скопировать диагностику» для warpscout ───
  // Цель — чтобы пользователь УВИДЕЛ глазами: есть ли файл физически (частый случай:
  // антивирус удалил bin\warpscout.exe при распаковке новой версии — «в 2.1.1 работало,
  // сейчас ничего»), и мог прислать диагностику ТЕКСТОМ вместо скриншота.
  function wsFolderOf(p) {
    const s = String(p || "").replace(/[\\/]+$/, "");
    const i = Math.max(s.lastIndexOf("\\"), s.lastIndexOf("/"));
    return i > 0 ? s.slice(0, i) : "";
  }

  async function openWsFolder() {
    if (IS_MOCK) { toast(t("Только в приложении Windows"), "err"); return; }
    let target = "";
    if (S.paths.wsFound && S.paths.wsPath) target = wsFolderOf(S.paths.wsPath);
    if (!target) {
      const custom = String(S.settings.wsPath || "").trim().replace(/[\\/]+$/, "");
      if (custom) target = /warpscout\.exe$/i.test(custom) ? wsFolderOf(custom) : custom;
    }
    if (!target && S.paths.appDir) target = S.paths.appDir + "\\bin";
    if (!target) { toast(t("Папка не определена — укажите путь и повторите"), "err"); return; }
    const there = await dirThere(target) || await wsFileExists(target);
    if (!there) { toast(tF("Папки нет на диске: {p}", { p: target }), "err"); return; }
    // v2.4.2 FIX: os.open возвращает промис — без .catch отказ терялся молча
    try { Promise.resolve(os().open(target)).catch(() => {}); } catch (e) {}
    toast(tF("Папка открыта: {p}", { p: target }), "ok");
  }

  async function wsDiagText() {
    const checked = (S.paths.wsCheckedList && S.paths.wsCheckedList.length)
      ? S.paths.wsCheckedList
      : (S.paths.wsTried || []).map((p) => ({ path: p, exists: null }));
    const lines = [];
    lines.push("WARPScout GUI v" + (window.NL_APPVERSION || "?") + " — диагностика warpscout");
    lines.push("Дата: " + new Date().toLocaleString());
    lines.push("GUI exe: " + (window.NL_ARGS && window.NL_ARGS[0] ? window.NL_ARGS[0] : "?"));
    lines.push("NL_PATH: " + (window.NL_PATH || "?"));
    lines.push("Папка приложения (appDir): " + (S.paths.appDir || "?"));
    lines.push("Папка данных: " + (S.paths.dataDir || "?"));
    lines.push("В поле пути указано: " + (String(S.settings.wsPath || "").trim() || "(пусто — ищем штатно)"));
    lines.push("Итог: " + (S.wsVersion ? "найден warpscout v" + S.wsVersion + " — " + S.paths.wsPath : (S.wsFileThere ? "файл есть, но не запускается: " + S.paths.wsPath : "warpscout.exe не найден")));
    lines.push("Проверенные места:");
    checked.forEach((c) => lines.push("  [" + (c.exists === true ? "есть" : c.exists === false ? "нет" : "?") + "] " + c.path));
    if (S.paths.appBinMissing) lines.push("(!) Папка bin есть, а warpscout.exe в ней нет — похоже, антивирус удалил файл при распаковке ZIP или архив распакован не целиком.");
    return lines.join("\n");
  }

  function applyLang(lang, opts) {
    LANG = lang === "en" ? "en" : "ru";
    S.settings.lang = LANG;
    i18nInitStatic();
    i18nApplyStatic();
    rerenderI18nDynamic();
    $$(".lang-switch .lang-switch__btn").forEach((b) =>
      b.classList.toggle("is-active", b.getAttribute("data-lang") === LANG)
    );
    if (!(opts && opts.skipPersist)) persist();
  }

  function ensureLangSwitch() {
    if ($("#langSwitch")) return;
    const foot = $("#sidebar .sidebar__footer") || $("#sidebar");
    if (!foot) return;
    const wrap = document.createElement("div");
    wrap.className = "lang-switch";
    wrap.id = "langSwitch";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Язык / Language");
    const ru = document.createElement("button");
    ru.type = "button";
    ru.className = "lang-switch__btn is-active";
    ru.setAttribute("data-lang", "ru");
    ru.textContent = "RU";
    ru.title = "Русский";
    const en = document.createElement("button");
    en.type = "button";
    en.className = "lang-switch__btn";
    en.setAttribute("data-lang", "en");
    en.textContent = "EN";
    en.title = "English";
    wrap.appendChild(ru);
    wrap.appendChild(en);
    foot.insertBefore(wrap, $("#btnTheme"));
    ru.addEventListener("click", () => { if (LANG !== "ru") { applyLang("ru"); toast("Язык: русский", "ok"); } });
    en.addEventListener("click", () => { if (LANG !== "en") { applyLang("en"); toast("Language: English", "ok"); } });
    // v1.7.0: копия переключателя в модалке горячих клавиш
    const kbdRow = $("#kbdLangRow");
    if (kbdRow && !kbdRow.childElementCount) {
      const copy = wrap.cloneNode(true);
      copy.removeAttribute("id"); // id должен быть один
      Array.from(copy.querySelectorAll(".lang-switch__btn")).forEach((b) => {
        b.addEventListener("click", () => {
          const lang = b.getAttribute("data-lang");
          if (LANG !== lang) { applyLang(lang); toast(lang === "ru" ? "Язык: русский" : "Language: English", "ok"); }
        });
      });
      kbdRow.appendChild(copy);
    }
  }

