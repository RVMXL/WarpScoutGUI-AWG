/* ═══ WSG · 03-i18n — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   v2.6.2 (аудит QUAL-1): словарь переведён на ключи-идентификаторы I18N {id:{ru,en}};
   t()/tF() принимают id; статический DOM резолвится через REV-таблицу (revInit);
   платформенные фразы — platPhraseOf (01-platform), нормализация — platNorm.
   Источник: app.js (был монолит ~6957 строк), диапазон строк 323–1297.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

  /* ───────── i18n: RU/EN (v1.6.0) ───────── */
  // Словарь: ключ — канонический русский текст, значение — английский.
  // LANG хранится в S.settings.lang (по умолчанию "ru").
    const I18N = {
    /* — nav — */
    /* — бренд/навигация — */
    "nav.01": { ru: "поиск живых эндпоинтов WARP", en: "find live WARP endpoints" },
    "nav.02": { ru: "Скан", en: "Scan" },
    "nav.03": { ru: "Конфиг", en: "Config" },
    "nav.04": { ru: "Аккаунт", en: "Account" },
    "nav.05": { ru: "SOCKS-прокси", en: "SOCKS proxy" },
    "nav.06": { ru: "Поиск параметров", en: "Param finder" },
    "nav.07": { ru: "Настройки", en: "Settings" },
    /* — misc — */
    /* v2.5.0 (аудит A2): сенсорная главная/меню «Ещё» */
    "misc.01": { ru: "Главная", en: "Home" },
    "misc.02": { ru: "Ещё", en: "More" },
    "misc.03": { ru: "Основные действия", en: "Main actions" },
    "misc.04": { ru: "Сгенерировать конфиг", en: "Generate config" },
    "misc.05": { ru: "Переключить тему", en: "Toggle theme" },
    "misc.06": { ru: "Скан запускается на устройстве, ключи и отчёты остаются в папке приложения.", en: "Scanning runs on the device; keys and reports stay in the app folder." },
    "misc.07": { ru: "Сенсорный режим интерфейса", en: "Touch UI mode" },
    "misc.08": { ru: "Android-оболочка: WebView + ядро warpscout (MIT)", en: "Android shell: WebView + warpscout core (MIT)" },
    "misc.09": { ru: "Разделы приложения", en: "App sections" },
    /* — status — */
    /* — статус-строка/сайдбар — */
    "status.01": { ru: "● warpscout: проверка…", en: "● warpscout: checking…" },
    "status.02": { ru: "● аккаунт: проверка…", en: "● account: checking…" },
    "status.03": { ru: "☀ Светлая тема", en: "☀ Light theme" },
    "status.04": { ru: "🌙 Тёмная тема", en: "🌙 Dark theme" },
    "status.05": { ru: "⌨ подсказки", en: "⌨ shortcuts" },
    "status.06": { ru: "ДЕМО-РЕЖИМ (браузер)", en: "DEMO MODE (browser)" },
    "status.07": { ru: "Переключить светлую/тёмную тему", en: "Toggle light/dark theme" },
    "status.08": { ru: "Переключить тему", en: "Toggle theme" },
    "status.09": { ru: "Горячие клавиши (?)", en: "Keyboard shortcuts (?)" },
    /* — presets — */
    /* — пресеты — */
    "presets.01": { ru: "Пресеты", en: "Presets" },
    "presets.02": { ru: "⟲ Сброс", en: "⟲ Reset" },
    "presets.03": { ru: "⭐ По умолчанию", en: "⭐ Default" },
    "presets.04": { ru: "⚡ Быстрый", en: "⚡ Fast" },
    "presets.05": { ru: "🧱 Жёсткая сеть", en: "🧱 Hard network" },
    "presets.06": { ru: "🔬 Тщательный", en: "🔬 Thorough" },
    "presets.07": { ru: "＋ Свой", en: "＋ Custom" },
    "presets.08": { ru: "Сохранить", en: "Save" },
    "presets.09": { ru: "Отмена", en: "Cancel" },
    "presets.10": { ru: "Название пресета", en: "Preset name" },
    "presets.11": { ru: "Вернуть команду по умолчанию", en: "Restore the default command" },
    "presets.12": { ru: "Сохранить текущие параметры как пресет", en: "Save current parameters as a preset" },
    "presets.13": { ru: "Быстрый: обычный WireGuard без проверки внутри туннеля — годится там, где WARP не фильтруется.", en: "Fast: plain WireGuard without in-tunnel checks — fine where WARP is not filtered." },
    "presets.14": { ru: "Жёсткая сеть: AmneziaWG + QUIC-маскировка первого пакета + проверка на разрыв. Если не найдёт — вкладка «Поиск параметров».", en: "Hard network: AmneziaWG + QUIC disguise of the first packet + break-check. If nothing is found — see the 'Param finder' tab." },
    "presets.15": { ru: "Тщательный: все 256 адресов каждой подсети, в туннеле и замер скорости. Долго!", en: "Thorough: all 256 addresses per subnet, in-tunnel checks and speed test. Slow!" },
    "presets.16": { ru: "По умолчанию: <code>warpscout scan -p awg -P -n 10 -exclude-node DME</code>", en: "Default: <code>warpscout scan -p awg -P -n 10 -exclude-node DME</code>" },
    "presets.17": { ru: "Пресет «<b>{name}</b>» применён. Команду можно посмотреть над кнопкой скана.", en: "Preset '<b>{name}</b>' applied. The command is shown above the scan button." },
    /* — scan.proto — */
    /* — скан: протокол — */
    "scan.proto.01": { ru: "Протокол", en: "Protocol" },
    "scan.proto.02": { ru: "Обфусцированный WireGuard — проходит там, где обычный WG фильтруется.", en: "Obfuscated WireGuard — gets through where plain WG is filtered." },
    "scan.proto.03": { ru: "Обычный WireGuard — работает там, где трафик не фильтруется.", en: "Plain WireGuard — works where traffic is not filtered." },
    "scan.proto.04": { ru: "CONNECT-IP поверх QUIC, второй транспорт Cloudflare. Узел один на всю сеть.", en: "CONNECT-IP over QUIC, Cloudflare's second transport. One node for the whole network." },
    "scan.proto.05": { ru: "MASQUE поверх TCP — те же проверки, но транспорт HTTP/2.", en: "MASQUE over TCP — same checks, but HTTP/2 transport." },
    /* — scan.check — */
    /* — скан: проверка и выборка — */
    "scan.check.01": { ru: "Проверка и выборка", en: "Verification & sampling" },
    "scan.check.02": { ru: "TUN PING и LOSS", en: "TUN PING & LOSS" },
    "scan.check.03": { ru: "RTT и потери внутри туннеля; ловит эндпоинты, которые DPI рвёт посреди передачи", en: "In-tunnel RTT & loss; catches endpoints that DPI tears mid-transfer" },
    "scan.check.04": { ru: "Все 256 адресов подсети", en: "All 256 subnet addresses" },
    "scan.check.05": { ru: "Медленно, но тщательно (перекрывает «Адресов на подсеть»)", en: "Slow but thorough (overrides 'Addresses per subnet')" },
    "scan.check.06": { ru: "Адресов на подсеть", en: "Addresses per subnet" },
    "scan.check.07": { ru: "Туннелей одновременно", en: "Parallel tunnels" },
    "scan.check.08": { ru: "Таймаут, сек", en: "Timeout, sec" },
    "scan.check.09": { ru: "Эхо-пакетов", en: "Echo packets" },
    /* — scan.filters — */
    /* — скан: фильтры — */
    "scan.filters.01": { ru: "Фильтры узлов", en: "Node filters" },
    "scan.filters.02": { ru: "DME исключён", en: "DME excluded" },
    "scan.filters.03": { ru: "Исключить узлы", en: "Exclude nodes" },
    "scan.filters.04": { ru: "Исключить страны", en: "Exclude countries" },
    "scan.filters.05": { ru: "Только узлы", en: "Only nodes" },
    "scan.filters.06": { ru: "Только страны", en: "Only countries" },
    // v2.6.4: живой бейдж фильтров (scan.filters.02 «DME исключён» больше не используется — индикатор динамический)
    "scan.filters.07": { ru: "страны", en: "countries" },
    "scan.filters.08": { ru: "Активные фильтры: {v}", en: "Active filters: {v}" },
    /* — scan.obf — */
    /* — скан: обфускация — */
    "scan.obf.01": { ru: "Обфускация AmneziaWG", en: "AmneziaWG obfuscation" },
    "scan.obf.02": { ru: "Поддельный первый пакет", en: "Fake first packet" },
    "scan.obf.03": { ru: "iCloud (базовый)", en: "iCloud (basic)" },
    "scan.obf.04": { ru: "SNI для I1", en: "SNI for I1" },
    "scan.obf.05": { ru: "Мусорных пакетов", en: "Junk packets" },
    "scan.obf.06": { ru: "Случайный junk", en: "Random junk" },
    "scan.obf.07": { ru: "Случайные jc/jmin/jmax на этот запуск (перекрывает поля выше)", en: "Random jc/jmin/jmax for this run (overrides the fields above)" },
    "scan.obf.08": { ru: "Попыток на эндпоинт", en: "Attempts per endpoint" },
    /* — scan.adv — */
    /* — скан: продвинутое — */
    "scan.adv.01": { ru: "WARP-in-WARP и продвинутое", en: "WARP-in-WARP & advanced" },
    "scan.adv.02": { ru: "опционально", en: "optional" },
    "scan.adv.03": { ru: "Через эндпоинт", en: "Via endpoint" },
    "scan.adv.04": { ru: "Протокол внутри", en: "Inner protocol" },
    "scan.adv.05": { ru: "wg (по умолчанию)", en: "wg (default)" },
    "scan.adv.06": { ru: "Свои адреса", en: "Custom addresses" },
    "scan.adv.07": { ru: "(IP или CIDR, через запятую)", en: "(IP or CIDR, comma-separated)" },
    "scan.adv.08": { ru: "Цель TUN PING", en: "TUN PING target" },
    "scan.adv.09": { ru: "Порт", en: "Port" },
    "scan.adv.10": { ru: "IPv6-пулы", en: "IPv6 pools" },
    "scan.adv.11": { ru: "Замер скорости", en: "Speed test" },
    "scan.adv.12": { ru: "Лучший по скорости", en: "Best by speed" },
    /* — scan.run — */
    /* — скан: запуск — */
    "scan.run.01": { ru: "команда", en: "command" },
    "scan.run.02": { ru: "Начать скан", en: "Start scan" },
    "scan.run.03": { ru: "Сканирую…", en: "Scanning…" },
    // v2.6.6: кнопка «Остановить» в живой карточке на главной удалена (обработчик
    // ей не привязывался), но ключ остаётся: он покрывает СТАТИЧЕСКИЙ текст
    // штатной кнопки btnStopScan (index.html) — REV-покрытие check-i18n + EN-перевод
    "scan.run.04": { ru: "Остановить", en: "Stop" },
    "scan.lock.01": { ru: "🔒 Сканирование идёт — параметры заблокированы до завершения или остановки", en: "🔒 Scan in progress — parameters are locked until it finishes or is stopped" },
    "scan.run.05": { ru: "Phase 1…", en: "Phase 1…" },
    /* — results — */
    /* — результаты — */
    "results.01": { ru: "Результаты", en: "Results" },
    "results.02": { ru: "Лог", en: "Log" },
    "results.03": { ru: "🕘 История", en: "🕘 History" },
    "results.04": { ru: "↕ пинг", en: "↕ ping" },
    "results.05": { ru: "≡ плотность", en: "≡ density" },
    "results.06": { ru: "→ Конфиг", en: "→ Config" },
    "results.07": { ru: "Фильтр: ip, узел, страна…", en: "Filter: ip, node, country…" },
    "results.08": { ru: "Фильтр результатов", en: "Results filter" },
    "results.09": { ru: "Очистить фильтр (Esc)", en: "Clear filter (Esc)" },
    "results.10": { ru: "Пока нет результатов", en: "No results yet" },
    "results.11": { ru: "Настройте параметры слева и нажмите «Начать скан».", en: "Set the parameters on the left and press 'Start scan'." },
    "results.12": { ru: "Лучший эндпоинт окажется вверху таблицы.", en: "The best endpoint will be at the top of the table." },
    "results.13": { ru: "Нет совпадений с фильтром", en: "No filter matches" },
    "results.14": { ru: "В запросе: «{q}». Попробуйте узел (HKG), страну или часть IP.", en: "Query: '{q}'. Try a node (HKG), a country, or part of an IP." },
    "results.15": { ru: "Лучший пинг", en: "Best ping" },
    "results.16": { ru: "Появился в этом скане", en: "New in this scan" },
    "results.17": { ru: "Скопировать ip:порт", en: "Copy ip:port" },
    "results.18": { ru: "Использовать в конфиге", en: "Use in config" },
    "results.19": { ru: "Подставить в SOCKS-вкладку", en: "Fill into the SOCKS tab" },
    "results.20": { ru: "Сразу запустить SOCKS5-прокси для этого эндпоинта", en: "Start a SOCKS5 proxy for this endpoint right away" },
    "results.21": { ru: "разорван", en: "torn" },
    /* — conf — */
    /* — конфиг — */
    "conf.01": { ru: "Эндпоинт", en: "Endpoint" },
    "conf.02": { ru: "Локация узла", en: "Node location" },
    "conf.03": { ru: "Из последнего скана или вручную", en: "From the last scan, or manual" },
    "conf.04": { ru: "— выберите из результатов скана —", en: "— pick from scan results —" },
    "conf.05": { ru: "Версия конфига", en: "Config version" },
    "conf.06": { ru: "3.1 — маскировка поведения соединения: случайные тайминги, паддинг, трейлеры. Как в примере.", en: "3.1 — connection behavior masking: random timings, padding, trailers. As in the example." },
    "conf.07": { ru: "Свой", en: "Custom" },
    "conf.08": { ru: "Интерфейс", en: "Interface" },
    "conf.09": { ru: "PersistentKeepalive (0 — не писать строку)", en: "PersistentKeepalive (0 — omit the line)" },
    "conf.10": { ru: "0.0.0.0/0, ::/0 (весь трафик)", en: "0.0.0.0/0, ::/0 (all traffic)" },
    "conf.11": { ru: "0.0.0.0/0 (только IPv4)", en: "0.0.0.0/0 (IPv4 only)" },
    "conf.12": { ru: "::/0 (только IPv6)", en: "::/0 (IPv6 only)" },
    "conf.13": { ru: "Своё…", en: "Custom…" },
    "conf.14": { ru: "Table = off (маршруты не трогать)", en: "Table = off (don't touch routes)" },
    "conf.15": { ru: "Параметры обфускации", en: "Obfuscation parameters" },
    "conf.16": { ru: "⟲ из примера", en: "⟲ from example" },
    "conf.17": { ru: "Дополнительно (I1–I5, AWG 3.1 тайминги…)", en: "Advanced (I1–I5, AWG 3.1 timings…)" },
    "conf.18": { ru: "I1 (CPS-пакет, hex)", en: "I1 (CPS packet, hex)" },
    "conf.19": { ru: "Импорт I1 из .conf", en: "Import I1 from .conf" },
    "conf.20": { ru: "📥 Импорт .conf целиком", en: "📥 Import full .conf" },
    "conf.21": { ru: "Очистить I1", en: "Clear I1" },
    "conf.22": { ru: "HeaderProtectionKey (опц.)", en: "HeaderProtectionKey (opt.)" },
    "conf.23": { ru: "Ключи аккаунта", en: "Account keys" },
    "conf.24": { ru: "Приватный ключ и адреса берутся из файла аккаунта", en: "The private key and addresses come from the account file" },
    "conf.25": { ru: ". Смотрите вкладку «Аккаунт».", en: ". See the 'Account' tab." },
    "conf.26": { ru: "Предпросмотр", en: "Preview" },
    "conf.27": { ru: "⧉ Копировать", en: "⧉ Copy" },
    "conf.28": { ru: "💾 Сохранить как…", en: "💾 Save as…" },
    "conf.29": { ru: "Конфиг готов к импорту в AmneziaVPN / AmneziaWG (для AWG) или в WireGuard (для WG).", en: "The config imports into AmneziaVPN / AmneziaWG (for AWG) or WireGuard (for WG)." },
    "conf.30": { ru: "аккаунт загружен", en: "account loaded" },
    "conf.31": { ru: "нет аккаунта", en: "no account" },
    "conf.32": { ru: "Чистый WireGuard без обфускации — для сетей, где WARP не режут.", en: "Clean WireGuard without obfuscation — for networks where WARP is not blocked." },
    "conf.33": { ru: "AWG 1.5: junk-пакеты (Jc/Jmin/Jmax), префиксы S1–S4 и свои заголовки H1–H4 + I1.", en: "AWG 1.5: junk packets (Jc/Jmin/Jmax), S1–S4 prefixes and custom headers H1–H4 + I1." },
    "conf.34": { ru: "AWG 2.0: то же + CPS-пакеты I1–I5 и диапазоны заголовков (можно писать «a-b»).", en: "AWG 2.0: same + CPS packets I1–I5 and header ranges ('a-b' allowed)." },
    "conf.35": { ru: "AWG 3.1: маскировка поведения соединения — случайные тайминги, паддинг, трейлеры. Как в конфиге-примере.", en: "AWG 3.1: connection behavior masking — random timings, padding, trailers. As in the example config." },
    /* — acc — */
    /* — аккаунт — */
    "acc.01": { ru: "Аккаунт WARP", en: "WARP account" },
    "acc.02": { ru: "Файл аккаунта", en: "Account file" },
    "acc.03": { ru: "Путь", en: "Path" },
    "acc.04": { ru: "WG/AWG-устройство", en: "WG/AWG device" },
    "acc.05": { ru: "MASQUE-устройство", en: "MASQUE device" },
    "acc.06": { ru: "Внешнее (WARP-in-WARP)", en: "Outer (WARP-in-WARP)" },
    "acc.07": { ru: "⚙️ Зарегистрировать / обновить ключи", en: "⚙️ Register / renew keys" },
    "acc.08": { ru: "🔥 Новый аккаунт (-fresh)", en: "🔥 New account (-fresh)" },
    "acc.09": { ru: "📁 Открыть папку", en: "📁 Open folder" },
    "acc.10": { ru: "«Обновить ключи» меняет ключи, не создавая новое устройство. «Новый аккаунт» регистрирует устройство с нуля.", en: "'Renew keys' rotates keys without creating a new device. 'New account' registers a device from scratch." },
    "acc.11": { ru: "Лог регистрации", en: "Registration log" },
    "acc.12": { ru: "Здесь появится вывод warpscout register…", en: "warpscout register output will appear here…" },
    "acc.13": { ru: "найден", en: "found" },
    "acc.14": { ru: "не найден — нужен для скана", en: "not found — required for scanning" },
    "acc.15": { ru: "✓ есть", en: "✓ present" },
    "acc.16": { ru: "нет (нужен только для masque)", en: "absent (needed only for masque)" },
    "acc.17": { ru: "нет (нужен только для -through)", en: "absent (needed only for -through)" },
    "acc.18": { ru: "● аккаунт: есть", en: "● account: present" },
    "acc.19": { ru: "● аккаунт: нет — вкладка «Аккаунт»", en: "● account: missing — see the 'Account' tab" },
    "acc.20": { ru: "Аккаунт готов", en: "Account ready" },
    "acc.21": { ru: "Регистрация не удалась — смотрите лог", en: "Registration failed — see the log" },
    "acc.22": { ru: "Демо: аккаунт уже есть", en: "Demo: account already exists" },
    "acc.23": { ru: "Создать новый аккаунт WARP с нуля? Текущие ключи будут заменены.", en: "Create a brand-new WARP account? Current keys will be replaced." },
    "acc.24": { ru: "📥 Импорт файла аккаунта", en: "📥 Import account file" },
    "acc.25": { ru: "Выберите файл аккаунта (warpscout-account.json)", en: "Pick the account file (warpscout-account.json)" },
    "acc.26": { ru: "Не удалось сохранить файл аккаунта: {err}", en: "Could not save the account file: {err}" },
    "acc.27": { ru: "Готовый аккаунт подключён — можно сканировать", en: "Ready-made account connected — you can scan now" },
    "acc.28": { ru: "Подключён готовый аккаунт, найденный рядом: {src}", en: "Connected a ready-made account found nearby: {src}" },
    "acc.29": { ru: "Это не JSON-файл. Нужен аккаунт warpscout: JSON с ключами private_key и peer_public_key.", en: "This is not a JSON file. A warpscout account is expected: JSON with private_key and peer_public_key keys." },
    "acc.30": { ru: "В файле нет ключей аккаунта (private_key/peer_public_key) — это не warpscout-account.json. Возможно, вы выбрали .conf-конфиг или файл другой программы.", en: "No account keys in the file (private_key/peer_public_key) — this isn't a warpscout-account.json. You may have picked a .conf config or a file from another app." },
    "acc.cwd.01": { ru: "Найден аккаунт в текущей папке запуска (это может быть чужой файл из другого сценария). Использовать его как рабочий?\n\nИсточник: {src}", en: "An account was found in the current working directory (it may belong to a different scenario). Use it as the working account?\n\nSource: {src}" },
    "acc.31": { ru: "Не удалось распознать файл аккаунта.", en: "Could not recognize the account file." },
    "acc.32": { ru: "файл есть, но это не JSON", en: "file exists but is not valid JSON" },
    "acc.33": { ru: "в файле нет ключей private_key/peer_public_key", en: "no private_key/peer_public_key keys in the file" },
    "acc.34": { ru: "warpscout.exe не найден. Распакуйте ZIP целиком (рядом с WARPScoutGUI.exe должна лежать папка bin с warpscout.exe) или укажите путь в Настройках. Если файл на месте — добавьте папку в исключения антивируса.", en: "warpscout.exe was not found. Unpack the ZIP entirely (a bin folder with warpscout.exe must sit next to WARPScoutGUI.exe) or set the path in Settings. If the file is there — add the folder to your antivirus exclusions." },
    "acc.35": { ru: "Не удалось сохранить файл аккаунта — папка данных пересоздана. Нажмите «Зарегистрировать» ещё раз.", en: "Could not save the account file — the data folder has been recreated. Click 'Register' once more." },
    "acc.36": { ru: "Файл аккаунта повреждён или не читается. Удалите его (кнопка «Открыть папку») и зарегистрируйте заново — или используйте «Новый аккаунт».", en: "The account file is damaged or unreadable. Delete it (via 'Open folder') and register again — or use 'New account'." },
    "acc.37": { ru: "Cloudflare API недоступна напрямую и через туннель WARP. Проверьте интернет, попробуйте VPN/прокси или повторите позже — иногда помогает несколько попыток.", en: "The Cloudflare API is unreachable both directly and via a WARP tunnel. Check your connection, try a VPN/proxy, or retry later — several attempts sometimes help." },
    "acc.38": { ru: "Код -1: warpscout.exe не смог запуститься или был закрыт. Причины: антивирус заблокировал файл; ZIP распакован не целиком (нет папки bin с warpscout.exe); неверный путь в Настройках. Проверьте папку кнопкой «Открыть папку» и добавьте её в исключения антивируса.", en: "Exit code -1: warpscout.exe failed to start or was closed. Causes: antivirus blocked the file; the ZIP was not fully unpacked (no bin folder with warpscout.exe); a wrong path in Settings. Check the folder via 'Open folder' and add it to your antivirus exclusions." },
    "acc.39": { ru: "Смотрите лог выше — там точная причина от warpscout.", en: "See the log above — warpscout prints the exact reason there." },
    /* — acc.recheck — */
    /* — v2.1.1: аккаунт — перепроверка и диагностика «кода -1» — */
    "acc.recheck.01": { ru: "🔄 Проверить снова", en: "🔄 Check again" },
    "acc.recheck.02": { ru: "📋 Скопировать путь", en: "📋 Copy path" },
    "acc.recheck.03": { ru: "Путь скопирован", en: "Path copied" },
    "acc.recheck.04": { ru: "Аккаунт найден", en: "Account found" },
    "acc.recheck.05": { ru: "Аккаунт не найден — смотрите путь выше", en: "Account not found — see the path above" },
    "acc.recheck.06": { ru: "🔓 Разблокировать exe (антивирус)", en: "🔓 Unblock exe (antivirus)" },
    "acc.recheck.07": { ru: "📂 Папка warpscout.exe", en: "📂 warpscout.exe folder" },
    "acc.recheck.08": { ru: "🔎 Проверить warpscout", en: "🔎 Check warpscout" },
    "acc.recheck.09": { ru: "Проверяю warpscout…", en: "Checking warpscout…" },
    "acc.recheck.10": { ru: "warpscout готов: {v}", en: "warpscout ready: {v}" },
    "acc.recheck.11": { ru: "warpscout не отвечает — проверьте путь и антивирус", en: "warpscout is not responding — check the path and your antivirus" },
    "acc.recheck.12": { ru: "warpscout не отвечает (таймаут)", en: "warpscout is not responding (timeout)" },
    "acc.recheck.13": { ru: "Доступно только в приложении Windows", en: "Available in the Windows app only" },
    "acc.recheck.14": { ru: "Unblock-File выполнен: с exe снята метка «скачано из интернета». Попробуйте регистрацию ещё раз.", en: "Unblock-File done: the 'downloaded from the internet' mark has been removed from the exe. Try registering again." },
    "acc.recheck.15": { ru: "Готово — попробуйте регистрацию ещё раз", en: "Done — try registering again" },
    "acc.recheck.16": { ru: "Не удалось выполнить Unblock-File: {err}", en: "Could not run Unblock-File: {err}" },
    "acc.recheck.17": { ru: "Процесс завершился с кодом {code}, но файл аккаунта создан и читается — регистрация прошла. Можно сканировать.", en: "The process exited with code {code}, but the account file was created and reads fine — registration succeeded. You can scan now." },
    "acc.recheck.18": { ru: "Процесс завершился без финального отчёта — сигнал о завершении потерян (так бывает при потере событий или закрытии процесса системой). Нажмите «Проверить снова»: аккаунт мог успеть создаться. Если его нет — добавьте папку в исключения антивируса и повторите регистрацию.", en: "The process ended without a final report — the exit signal was lost (this happens when events drop or the process is closed by the system). Click 'Check again': the account may have been created in time. If not — add the folder to your antivirus exclusions and register again." },
    "acc.recheck.19": { ru: "Проверка перед запуском показала версию {v} — сам exe запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: добавьте папку в исключения антивируса (и нажмите «Разблокировать exe»), затем повторите.", en: "The preflight check reported version {v} — the exe itself starts and the path is correct. The process seems to get closed during registration: add the folder to your antivirus exclusions (and click 'Unblock exe'), then retry." },
    "acc.recheck.20": { ru: "Файл кладётся сюда (путь выше). Если warpscout-account.json лежит рядом с warpscout.exe в bin — кнопка «Проверить снова» подхватит его без перезапуска.", en: "This is where the file is kept (path above). If warpscout-account.json sits next to warpscout.exe in bin — the 'Check again' button will pick it up without an app restart." },
    "acc.recheck.21": { ru: "Если регистрация падает с «кодом -1»: «Проверить warpscout» показывает, запускается ли exe вообще; «Разблокировать exe» снимает метку «скачано из интернета» (PowerShell Unblock-File); папку из предыдущей кнопки добавьте в исключения антивируса.", en: "If registration fails with 'exit code -1': 'Check warpscout' shows whether the exe starts at all; 'Unblock exe' removes the 'downloaded from the internet' mark (PowerShell Unblock-File); add the folder from the previous button to your antivirus exclusions." },
    "acc.recheck.22": { ru: "«Обновить ключи» меняет ключи, не создавая новое устройство. «Новый аккаунт» регистрирует устройство с нуля. Готовый аккаунт из другой установки: «Импорт файла аккаунта» сам проверит JSON (нужны ключи private_key и peer_public_key) и сохранит его в папку выше с нужным именем.", en: "'Renew keys' rotates keys without creating a new device. 'New account' registers a device from scratch. Got an account from another installation? 'Import account file' validates the JSON (private_key and peer_public_key keys are required) and saves it to the folder above with the right name." },
    /* — socks — */
    /* — socks — */
    "socks.01": { ru: "Проверка одного эндпоинта", en: "Single endpoint check" },
    "socks.02": { ru: "(как в результатах скана)", en: "(as in scan results)" },
    "socks.03": { ru: "★ Лучший", en: "★ Best" },
    "socks.04": { ru: "Порт прокси", en: "Proxy port" },
    "socks.05": { ru: "▶ Запустить прокси", en: "▶ Start proxy" },
    "socks.06": { ru: "Прокси:", en: "Proxy:" },
    "socks.07": { ru: "Проверка:", en: "Check:" },
    "socks.08": { ru: "Лог прокси", en: "Proxy log" },
    "socks.09": { ru: "Здесь появится вывод warpscout socks…", en: "warpscout socks output will appear here…" },
    "socks.10": { ru: "Укажите эндпоинт в формате ip:порт (например 188.114.98.58:2408)", en: "Enter the endpoint as ip:port (e.g. 188.114.98.58:2408)" },
    "socks.11": { ru: "Прокси запускается: ", en: "Starting proxy: " },
    "socks.12": { ru: "{ep}: запускаю прокси", en: "{ep}: starting proxy" },
    "socks.13": { ru: "Прокси уже запущен — сначала остановите текущий", en: "A proxy is already running — stop it first" },
    /* — tools — */
    /* — инструменты — */
    "tools.01": { ru: "find-junk — подбор junk-параметров", en: "find-junk — junk parameter finder" },
    "tools.02": { ru: "Профиль I1", en: "I1 profile" },
    "tools.03": { ru: "Порог успеха", en: "Success threshold" },
    "tools.04": { ru: "Туннелей", en: "Tunnels" },
    "tools.05": { ru: "▶ Искать junk", en: "▶ Find junk" },
    "tools.06": { ru: "■ Стоп", en: "■ Stop" },
    "tools.07": { ru: "find-sni — подбор SNI для MASQUE", en: "find-sni — SNI finder for MASQUE" },
    "tools.08": { ru: "Перебирает известные SNI для MASQUE и печатает готовую команду скана с рабочим именем.", en: "Iterates known MASQUE SNIs and prints a ready-to-use scan command with a working name." },
    "tools.09": { ru: "Транспорт", en: "Transport" },
    "tools.10": { ru: "▶ Искать SNI", en: "▶ Find SNI" },
    "tools.11": { ru: "команда найдена!", en: "command found!" },
    "tools.12": { ru: "↧ Применить к скану", en: "↧ Apply to scan" },
    "tools.13": { ru: "Если <code>scan -p awg</code> ничего не находит ни с одним I1 — запустите подбор junk-набора. Остановить можно в любой момент, лучший набор сохранится в логе.", en: "If <code>scan -p awg</code> finds nothing with any I1 — run the junk-set search. You can stop anytime; the best set stays in the log." },
    "tools.14": { ru: "Нажмите «Применить к скану».", en: "Press 'Apply to scan'." },
    "tools.15": { ru: "Параметры применены к скану", en: "Parameters applied to the scan" },
    "tools.16": { ru: "Сначала найдите команду", en: "Find a command first" },
    "tools.17": { ru: "Найденный I1 подставлен в конфиг (вкладка «Конфиг»)", en: "Found I1 inserted into the config ('Config' tab)" },
    /* — settings — */
    /* — настройки — */
    "settings.01": { ru: "Пути", en: "Paths" },
    "settings.02": { ru: "Путь до warpscout.exe", en: "Path to warpscout.exe" },
    "settings.03": { ru: "Обзор…", en: "Browse…" },
    "settings.04": { ru: "Проверить", en: "Check" },
    "settings.05": { ru: "Проверка не выполнялась", en: "Not checked yet" },
    "settings.06": { ru: "Файл найден ({p}), но версию получить не удалось — вероятно, антивирус мешает запуску. Откройте вкладку «Аккаунт» и нажмите «Разблокировать exe», либо добавьте папку в исключения антивируса.", en: "File found ({p}), but the version could not be obtained — the antivirus is probably blocking it. Open the 'Account' tab and press 'Unblock exe', or add the folder to antivirus exclusions." },
    "settings.07": { ru: "warpscout.exe не найден. Проверяли:", en: "warpscout.exe not found. Places checked:" },
    "settings.08": { ru: "Укажите путь к самому warpscout.exe или к папке, где он лежит, — программа найдёт exe, в том числе в подпапке bin.", en: "Point to warpscout.exe itself or to the folder where it sits — the app will find the exe, including inside a bin subfolder." },
    "settings.09": { ru: "Папка bin на месте, но самого warpscout.exe в ней нет. Так бывает, когда антивирус удалил файл при распаковке ZIP или архив распакован не целиком: верните файл из карантина («Безопасность Windows» → Защита от вирусов → Журнал защиты), добавьте папку приложения в исключения антивируса и распакуйте ZIP заново.", en: "The bin folder is there, but warpscout.exe itself is missing from it. This happens when antivirus removed the file during ZIP extraction or the archive was not fully unpacked: restore the file from quarantine (Windows Security → Virus protection → Protection history), add the app folder to antivirus exclusions and unpack the ZIP again." },
    "settings.10": { ru: "Полный путь:", en: "Full path:" },
    "settings.11": { ru: "Открыть папку, где программа ищет или нашла warpscout.exe", en: "Open the folder where the app looks for or found warpscout.exe" },
    "settings.12": { ru: "Скопировать отчёт о проверке текстом — удобно прислать вместо скриншота", en: "Copy the check report as text — handy to send instead of a screenshot" },
    "settings.13": { ru: "📁 Показать в папке", en: "📁 Show in folder" },
    "settings.14": { ru: "⧉ Скопировать диагностику", en: "⧉ Copy diagnostics" },
    "settings.15": { ru: "Диагностика скопирована — пришлите её текстом", en: "Diagnostics copied — please send it as text" },
    "settings.16": { ru: "Папка не определена — укажите путь и повторите", en: "Folder not determined — set the path and try again" },
    "settings.17": { ru: "Папки нет на диске: {p}", en: "Folder does not exist on disk: {p}" },
    "settings.18": { ru: "Папка открыта: {p}", en: "Folder opened: {p}" },
    "settings.19": { ru: "Файл найден, но не отвечает — вероятно, антивирус. Подробности в подсказке под полем", en: "File found but does not respond — likely antivirus. See the hint under the path field" },
    "settings.20": { ru: "✓ warpscout v{v} — готов к работе", en: "✓ warpscout v{v} — ready to go" },
    "settings.21": { ru: "warpscout.exe не найден — подробности в подсказке под полем пути", en: "warpscout.exe not found — see details in the hint under the path field" },
    "settings.22": { ru: "Можно указать сам warpscout.exe или папку, где он лежит, — программа найдёт exe сама, в том числе в подпапке bin.", en: "You can point to warpscout.exe itself or to the folder where it sits — the app will find the exe, including inside a bin subfolder." },
    "settings.23": { ru: "bin\\warpscout.exe или папка с ним", en: "bin\\warpscout.exe or its folder" },
    "settings.24": { ru: "Показать в папке", en: "Show in folder" },
    "settings.25": { ru: "Отчёты сканов сохраняются в", en: "Scan reports are saved to" },
    "settings.26": { ru: "Открыть", en: "Open" },
    "settings.27": { ru: "Данные приложения", en: "App data" },
    "settings.28": { ru: "⬇ Резервная копия", en: "⬇ Backup" },
    "settings.29": { ru: "⬆ Восстановить", en: "⬆ Restore" },
    "settings.30": { ru: "Сбросить настройки и данные", en: "Reset settings & data" },
    "settings.31": { ru: "О приложении", en: "About" },
    "settings.32": { ru: "WARPSCOUT GUI — графическая оболочка для консольной утилиты", en: "WARPSCOUT GUI is a graphical front-end for the console utility" },
    "settings.33": { ru: "Дефолтная команда:", en: "Default command:" },
    "settings.34": { ru: "Скан запускается локально, без серверов-посредников: туннели поднимаются с вашей машины.", en: "Scanning runs locally, no middleman servers: tunnels are raised from your machine." },
    "settings.35": { ru: "⌨ Горячие клавиши", en: "⌨ Keyboard shortcuts" },
    "settings.36": { ru: "● warpscout: не найден — укажите путь в «Настройках»", en: "● warpscout: not found — set the path in 'Settings'" },
    "settings.37": { ru: "warpscout не найден. Скачайте warpscout.exe и укажите путь.", en: "warpscout not found. Download warpscout.exe and set the path." },
    "settings.38": { ru: "● warpscout v0.16.0 — готов (демо)", en: "● warpscout v0.16.0 — ready (demo)" },
    /* — kbd — */
    /* — горячие клавиши — */
    "kbd.01": { ru: "переключение вкладок", en: "switch tabs" },
    "kbd.02": { ru: "начать скан", en: "start scan" },
    "kbd.03": { ru: "остановить скан / закрыть панель или окно", en: "stop scan / close panel or window" },
    "kbd.04": { ru: "фильтр по результатам", en: "filter results" },
    "kbd.05": { ru: "сохранить конфиг (на вкладке «Конфиг»)", en: "save config (on the 'Config' tab)" },
    "kbd.06": { ru: "показать эту справку", en: "show this help" },
    /* — qr.modal — */
    /* — qr-модалка — */
    "qr.modal.01": { ru: "▣ QR-код конфига", en: "▣ Config QR code" },
    "qr.modal.02": { ru: "⬇ Сохранить PNG", en: "⬇ Save PNG" },
    "qr.modal.03": { ru: "⧉ Скопировать конфиг", en: "⧉ Copy config" },
    "qr.modal.04": { ru: "Сохранить QR-код", en: "Save QR code" },
    /* — history — */
    /* — динамика/история — */
    "history.01": { ru: "↘ динамика лучшего пинга", en: "↘ best-ping trend" },
    "history.02": { ru: "слева направо: старые сканы → новые · клик по точке загружает скан", en: "left to right: older scans → newer · click a dot to load that scan" },
    "history.03": { ru: "Динамика лучшего пинга по сканам", en: "Best-ping trend across scans" },
    "history.04": { ru: "Скан {ts}, {ping} ms", en: "Scan {ts}, {ping} ms" },
    "history.05": { ru: "{ts} — лучший пинг {ping} ms — клик загрузит скан", en: "{ts} — best ping {ping} ms — click to load this scan" },
    "history.06": { ru: "Последние сканы (хранятся локально, до 10)", en: "Recent scans (stored locally, up to 10)" },
    "history.07": { ru: "История пуста — выполните первый скан.", en: "History is empty — run your first scan." },
    "history.08": { ru: "рабочих", en: "working" },
    "history.09": { ru: "разорвано", en: "torn" },
    "history.10": { ru: "Δ сравнить с текущей таблицей (без загрузки)", en: "Δ compare with the current table (without loading)" },
    "history.11": { ru: "Удалить всю историю", en: "Clear all history" },
    "history.12": { ru: "🗑 Очистить", en: "🗑 Clear" },
    "history.13": { ru: "Выгрузить всю историю в JSON-файл", en: "Export all history to a JSON file" },
    "history.14": { ru: "Δ сравнение с текущей таблицей:", en: "Δ comparison with the current table:" },
    "history.15": { ru: "➕ новых: ", en: "➕ new: " },
    "history.16": { ru: "➖ пропали: ", en: "➖ gone: " },
    "history.17": { ru: "Различий нет — наборы эндпоинтов совпадают", en: "No differences — the endpoint sets match" },
    "history.18": { ru: "Δ: новых {n}, пропали {g}", en: "Δ: {n} new, {g} gone" },
    "history.19": { ru: "Загружен скан от {ts} — {n} рабочих", en: "Loaded scan from {ts} — {n} working" },
    "history.20": { ru: "Удалить всю историю сканов ({n})? Текущая таблица результатов останется.", en: "Delete the entire scan history ({n})? The current results table stays." },
    "history.21": { ru: "История очищена", en: "History cleared" },
    "history.22": { ru: "История и так пуста", en: "History is already empty" },
    "history.23": { ru: "История пуста — нечего выгружать", en: "History is empty — nothing to export" },
    "history.24": { ru: "История выгружена: ", en: "History exported: " },
    "history.25": { ru: "История сохранена: ", en: "History saved: " },
    "history.26": { ru: "Выгрузить историю сканов (JSON)", en: "Export scan history (JSON)" },
    "history.27": { ru: "История CSV выгружена: ", en: "History CSV exported: " },
    "history.28": { ru: "История CSV сохранена: ", en: "History CSV saved: " },
    "history.29": { ru: "⬇ CSV (итоги)", en: "⬇ CSV (summary)" },
    "history.30": { ru: "Сохранить итоги истории (CSV)", en: "Save history summary (CSV)" },
    /* — stats — */
    /* — статистика — */
    "stats.01": { ru: "📡 всего", en: "📡 total" },
    "stats.02": { ru: "✅ рабочих", en: "✅ working" },
    "stats.03": { ru: "✂ разорвано", en: "✂ torn" },
    "stats.04": { ru: "⚡ лучший", en: "⚡ best" },
    "stats.05": { ru: "⚖ медиана", en: "⚖ median" },
    "stats.06": { ru: "📈 профиль", en: "📈 profile" },
    "stats.07": { ru: "🌍 узлов", en: "🌍 nodes" },
    "stats.08": { ru: "➕ новых", en: "➕ new" },
    "stats.09": { ru: "➖ пропали", en: "➖ gone" },
    "stats.10": { ru: "Минимальный пинг среди рабочих", en: "Lowest ping among working endpoints" },
    "stats.11": { ru: "Медианный пинг рабочих", en: "Median ping of working endpoints" },
    "stats.12": { ru: "Распределение пинга рабочих эндпоинтов: мин {min} / макс {max} ms", en: "Ping distribution of working endpoints: min {min} / max {max} ms" },
    "stats.13": { ru: "Узлы: {nodes}", en: "Nodes: {nodes}" },
    "stats.14": { ru: "Эндпоинтов, которых не было в прошлом скане", en: "Endpoints not present in the previous scan" },
    "stats.15": { ru: "Пропали с прошлого скана ({n}): {list}", en: "Gone since the previous scan ({n}): {list}" },
    "stats.16": { ru: "показано <b>{n}</b> из {m}", en: "showing <b>{n}</b> of {m}" },
    /* — scan.process — */
    /* — скан-процесс — */
    "scan.process.01": { ru: "Запуск warpscout…", en: "Launching warpscout…" },
    "scan.process.02": { ru: "Фаза 1: ищем проходимые порты", en: "Phase 1: probing passable ports" },
    "scan.process.03": { ru: "Фаза 2: проверяем туннели", en: "Phase 2: verifying tunnels" },
    "scan.process.04": { ru: "Замер скорости (медленно, ждите)…", en: "Speed test (slow, please wait)…" },
    "scan.process.05": { ru: "Остановлено", en: "Stopped" },
    "scan.process.06": { ru: "Читаем отчёт…", en: "Reading the report…" },
    "scan.process.07": { ru: "Скан остановлен", en: "Scan stopped" },
    "scan.process.08": { ru: "[GUI] Отчёт не найден — смотрим конец лога.", en: "[GUI] Report not found — see the end of the log." },
    "scan.process.09": { ru: "warpscout завершился с ошибкой (код {code}). Смотрите лог — часто не хватает аккаунта или фильтры слишком строгие.", en: "warpscout exited with an error (code {code}). Check the log — often an account is missing or filters are too strict." },
    "scan.process.10": { ru: "Скан завершён, но отчёт пуст. Смотрите лог.", en: "Scan finished, but the report is empty. Check the log." },
    "scan.process.11": { ru: "Скан завершён: рабочих эндпоинтов — {n}", en: "Scan finished: {n} working endpoints" },
    "scan.process.12": { ru: "Скан завершён: рабочих эндпоинтов — {n}, разорванных — {t}", en: "Scan finished: {n} working, {t} torn" },
    "scan.process.13": { ru: "Рабочих эндпоинтов не найдено", en: "No working endpoints found" },
    "scan.process.14": { ru: "Рабочих эндпоинтов не найдено ({t} разорвано)", en: "No working endpoints found ({t} torn)" },
    "scan.process.15": { ru: "Попробуйте «Жёсткая сеть» или find-junk.", en: "Try 'Hard network' or find-junk." },
    "scan.process.16": { ru: "Рабочих эндпоинтов не найдено ({t} разорвано). Попробуйте «Жёсткая сеть» или find-junk.", en: "No working endpoints found ({t} torn). Try 'Hard network' or find-junk." },
    "scan.process.17": { ru: "Сначала создайте аккаунт WARP — вкладка «Аккаунт»", en: "Create a WARP account first — the 'Account' tab" },
    "scan.process.18": { ru: "Не удалось запустить warpscout: ", en: "Failed to launch warpscout: " },
    /* — toasts — */
    /* — тосты/действия — */
    "toasts.01": { ru: "Скопировано", en: "Copied" },
    "toasts.02": { ru: "Не удалось скопировать", en: "Copy failed" },
    "toasts.03": { ru: "Эндпоинт скопирован", en: "Endpoint copied" },
    "toasts.04": { ru: "Скопировано эндпоинтов: {n}", en: "Endpoints copied: {n}" },
    "toasts.05": { ru: "Нет рабочих эндпоинтов для копирования", en: "No working endpoints to copy" },
    "toasts.06": { ru: "Эндпоинт подставлен в конфиг: {ep}", en: "Endpoint put into the config: {ep}" },
    "toasts.07": { ru: "Эндпоинт готов к проверке во вкладке SOCKS", en: "Endpoint ready for a check in the SOCKS tab" },
    "toasts.08": { ru: "Команда скопирована", en: "Command copied" },
    "toasts.09": { ru: "Конфиг скопирован", en: "Config copied" },
    "toasts.10": { ru: "Сначала выполните скан", en: "Run a scan first" },
    "toasts.11": { ru: "Лучший эндпоинт из скана: {ep}", en: "Best endpoint from the scan: {ep}" },
    "toasts.12": { ru: "Светлая тема включена", en: "Light theme enabled" },
    "toasts.13": { ru: "Тёмная тема включена", en: "Dark theme enabled" },
    "toasts.14": { ru: "Язык переключён на английский", en: "Language switched to Russian" },
    /* — conf.io — */
    /* — конфиг: сохранение/импорт — */
    "conf.io.01": { ru: "Сохранить конфиг", en: "Save config" },
    "conf.io.02": { ru: "Сохранение работает только в приложении Windows", en: "Saving works only in the Windows app" },
    "conf.io.03": { ru: "Конфиг сохранён: ", en: "Config saved: " },
    "conf.io.04": { ru: "Ошибка записи: ", en: "Write error: " },
    "conf.io.05": { ru: "Выберите .conf с I1", en: "Choose a .conf with I1" },
    "conf.io.06": { ru: "Импорт работает только в приложении", en: "Import works only in the app" },
    "conf.io.07": { ru: "I1 импортирован", en: "I1 imported" },
    "conf.io.08": { ru: "В файле нет строки I1 — это не AWG-конфиг?", en: "No I1 line in the file — is it not an AWG config?" },
    "conf.io.09": { ru: "Не удалось прочитать файл", en: "Could not read the file" },
    "conf.io.10": { ru: "Не удалось прочитать файл: ", en: "Could not read the file: " },
    "conf.io.11": { ru: "Выберите .conf для импорта", en: "Choose a .conf to import" },
    "conf.io.12": { ru: "Не удалось разобрать файл: нет пар «ключ = значение»", en: "Could not parse the file: no 'key = value' pairs" },
    "conf.io.13": { ru: "Импортирован конфиг: {what}", en: "Config imported: {what}" },
    "conf.io.14": { ru: "Не перенесено: {what}", en: "Not carried over: {what}" },
    "conf.io.15": { ru: "Ошибка разбора: ", en: "Parse error: " },
    "conf.io.16": { ru: "DNS свои", en: "custom DNS" },
    "conf.io.17": { ru: "эндпоинт", en: "endpoint" },
    "conf.io.18": { ru: "AllowedIPs весь", en: "all AllowedIPs" },
    "conf.io.19": { ru: "AllowedIPs свои", en: "custom AllowedIPs" },
    "conf.io.20": { ru: "заголовки ({n})", en: "headers ({n})" },
    "conf.io.21": { ru: "тайминги 3.1", en: "3.1 timings" },
    "conf.io.22": { ru: "PrivateKey/Address берутся из аккаунта", en: "PrivateKey/Address come from the account" },
    "conf.io.23": { ru: "PublicKey берётся из аккаунта", en: "PublicKey comes from the account" },
    "conf.io.24": { ru: "PresharedKey не поддерживается", en: "PresharedKey is not supported" },
    "conf.io.25": { ru: "I2–I5 отсутствуют в полях GUI", en: "I2–I5 have no fields in the GUI" },
    /* — misc — */
    /* — qr — */
    "misc.10": { ru: "QR-модуль не загружен", en: "QR module not loaded" },
    "misc.11": { ru: "страница {i} из {n}", en: "page {i} of {n}" },
    "misc.12": { ru: "Предыдущая страница", en: "Previous page" },
    "misc.13": { ru: "Следующая страница", en: "Next page" },
    "misc.14": { ru: "Отсканируйте камерой в AmneziaVPN («Сканировать QR-код») — конфиг перенесётся без файлов. Длинный конфиг разбивается на страницы: сканируйте их по очереди, пока все не соберутся, порядок не важен. В WireGuard длинный конфиг вносится файлом.", en: "Scan with the camera in AmneziaVPN (“Scan QR code”) — the config transfers without files. A long config is split into pages: scan them one by one until all are collected — the order doesn't matter. In WireGuard, import a long config from a file." },
    "misc.15": { ru: "QR-код конфига", en: "Config QR code" },
    "misc.16": { ru: "Конфиг {n} симв. — не помещается в QR (лимит 2953). Обычно виноват длинный I1: уберите его или сохраните конфиг файлом.", en: "The config is {n} chars — too big for QR (limit 2953). Usually a long I1 is to blame: drop it or save the config as a file." },
    "misc.17": { ru: "PNG скачан: ", en: "PNG downloaded: " },
    "misc.18": { ru: "QR сохранён: ", en: "QR saved: " },
    "misc.19": { ru: "Не удалось построить QR: ", en: "Failed to build the QR: " },
    /* — backup — */
    /* — бэкап состояния — */
    "backup.01": { ru: "Резервная копия WARPSCOUT GUI", en: "WARPSCOUT GUI backup" },
    "backup.02": { ru: "Резервная копия скачана: ", en: "Backup downloaded: " },
    "backup.03": { ru: "Копия сохранена: ", en: "Backup saved: " },
    "backup.04": { ru: "Ошибка экспорта: ", en: "Export error: " },
    "backup.05": { ru: "Файл не похож на резервную копию WARPSCOUT GUI", en: "The file does not look like a WARPSCOUT GUI backup" },
    "backup.06": { ru: "Настройки восстановлены из копии", en: "Settings restored from the backup" },
    "backup.07": { ru: "Выберите файл резервной копии", en: "Choose a backup file" },
    "backup.08": { ru: "Некорректный JSON: ", en: "Invalid JSON: " },
    /* — reset — */
    /* — сброс — */
    "reset.01": { ru: "Сбросить все настройки и данные приложения?", en: "Reset all app settings and data?" },
    "reset.02": { ru: "Настройки сброшены", en: "Settings reset" },
    /* — presets.toasts — */
    /* — пресеты: тосты — */
    "presets.toasts.01": { ru: "Введите название пресета", en: "Enter a preset name" },
    "presets.toasts.02": { ru: "Пресет \"{name}\" уже есть — перезаписать?", en: "Preset \"{name}\" already exists — overwrite?" },
    "presets.toasts.03": { ru: "Пресет сохранён: {name}", en: "Preset saved: {name}" },
    "presets.toasts.04": { ru: "Пресет применён: {name}", en: "Preset applied: {name}" },
    "presets.toasts.05": { ru: "Пресет удалён", en: "Preset deleted" },
    "presets.toasts.06": { ru: "Удалить пресет \"{name}\"?", en: "Delete the preset \"{name}\"?" },
    "presets.toasts.07": { ru: "Удалить пресет", en: "Delete preset" },
    "presets.toasts.08": { ru: "Пресет: применить. ✕ — удалить", en: "Preset: apply. ✕ — delete" },
    /* — misc — */
    /* — прочее — */
    "misc.20": { ru: "Не удалось запустить", en: "Failed to start" },
    "misc.21": { ru: "[GUI] Прокси остановлен.", en: "[GUI] Proxy stopped." },
    "misc.22": { ru: "Выбор файла работает только в приложении", en: "File picking works only in the app" },
    "misc.23": { ru: "Выберите warpscout.exe", en: "Choose warpscout.exe" },
    "misc.24": { ru: "Найден warpscout v", en: "Found warpscout v" },
    "misc.25": { ru: "Не удалось открыть папку", en: "Could not open the folder" },
    "misc.26": { ru: "Только в приложении Windows", en: "Only in the Windows app" },
    "misc.27": { ru: "[демо] Используется демо-аккаунт. В приложении здесь выполняется настоящая регистрация.", en: "[demo] Using the demo account. In the real app, actual registration runs here." },
    "misc.28": { ru: "[GUI] Готово.", en: "[GUI] Done." },
    "misc.29": { ru: "Готово.", en: "Done." },
    "misc.30": { ru: "Сортировать", en: "Sort" },
    "misc.31": { ru: "Узел", en: "Node" },
    "misc.32": { ru: "пинг", en: "ping" },
    "misc.33": { ru: "потери", en: "loss" },
    "misc.34": { ru: "Адрес прокси скопирован", en: "Proxy address copied" },
    "misc.35": { ru: "Нет результатов скана", en: "No scan results" },
    "misc.36": { ru: "Взят лучший эндпоинт: {ep}", en: "Took the best endpoint: {ep}" },
    "misc.37": { ru: "<запустите регистрацию на вкладке «Аккаунт»>", en: "<run the registration on the 'Account' tab>" },
    "misc.38": { ru: "[GUI] Регистрация завершилась с ошибкой (код {code}).", en: "[GUI] Registration exited with an error (code {code})." },
    "misc.39": { ru: "[GUI] Не удалось запустить warpscout: ", en: "[GUI] Failed to launch warpscout: " },
    "misc.40": { ru: "Ошибка запуска warpscout", en: "Error launching warpscout" },
    "misc.41": { ru: "Обычная таблица", en: "Regular table" },
    "misc.42": { ru: "Компактная таблица включена", en: "Compact table enabled" },
    "misc.43": { ru: "Плотность таблицы", en: "Table density" },
    "misc.44": { ru: "Открыть демо в браузере", en: "Open the demo in a browser" },
    "misc.45": { ru: "Откройте приложение через WARPScoutGUI.exe", en: "Open the app via WARPScoutGUI.exe" },
    /* — cmp — */
    /* — v1.7.0: ⇅-сравнение, тренд CSV, kbd-язык — */
    "cmp.01": { ru: "⇅ сравнить", en: "⇅ compare" },
    "cmp.02": { ru: "Сравнить два скана из истории (модалка)", en: "Compare two scans from history (modal)" },
    "cmp.03": { ru: "Для сравнения нужно минимум два скана — выполните ещё один.", en: "You need at least two scans to compare — run one more." },
    "cmp.04": { ru: "Нужно как минимум два скана в истории.", en: "At least two scans are required in history." },
    "cmp.05": { ru: "лучший пинг A", en: "best ping A" },
    "cmp.06": { ru: "лучший пинг B", en: "best ping B" },
    "cmp.07": { ru: "нет данных", en: "no data" },
    "cmp.08": { ru: "без изменений", en: "unchanged" },
    "cmp.09": { ru: "−{n} ms быстрее", en: "−{n} ms faster" },
    "cmp.10": { ru: "только в B:", en: "only in B:" },
    "cmp.11": { ru: "только в A:", en: "only in A:" },
    "cmp.12": { ru: "общих эндпоинтов:", en: "common endpoints:" },
    "cmp.13": { ru: "Нет общих живых эндпоинтов с пингом.", en: "No common live endpoints with ping." },
    "cmp.14": { ru: "разорван → разорван", en: "torn → torn" },
    "cmp.15": { ru: "статус изменился", en: "status changed" },
    "cmp.16": { ru: "Сортировать", en: "Sort" },
    "cmp.17": { ru: "Сохранить динамику пинга в CSV", en: "Save ping trend as CSV" },
    "cmp.18": { ru: "Сохранить динамику пинга (CSV)", en: "Save ping trend (CSV)" },
    "cmp.19": { ru: "Нет сканов с пингами — тренд пуст", en: "No scans with ping — trend is empty" },
    "cmp.20": { ru: "Тренд CSV выгружен: {path}", en: "Trend CSV downloaded: {path}" },
    "cmp.21": { ru: "Тренд CSV сохранён: {path}", en: "Trend CSV saved: {path}" },
    "cmp.22": { ru: "Скан A", en: "Scan A" },
    "cmp.23": { ru: "Скан B", en: "Scan B" },
    /* — live — */
    /* — v1.8.0: шаринг пресетов + живая панель скана — */
    "live.01": { ru: "Экспортировать свои пресеты в JSON-файл (поделиться)", en: "Export your presets to a JSON file (share)" },
    "live.02": { ru: "Импортировать пресеты из JSON-файла", en: "Import presets from a JSON file" },
    "live.03": { ru: "Своих пресетов пока нет — сохраните хотя бы один (кнопка «＋ Свой»)", en: "No custom presets yet — save at least one (the '＋ Custom' button)" },
    "live.04": { ru: "Файл не похож на набор пресетов WARPSCOUT GUI", en: "The file does not look like a WARPSCOUT GUI presets file" },
    "live.05": { ru: "Пресеты экспортированы: {path}", en: "Presets exported: {path}" },
    "live.06": { ru: "Пресеты скачаны: {path}", en: "Presets downloaded: {path}" },
    "live.07": { ru: "Экспорт пресетов", en: "Export presets" },
    "live.08": { ru: "Выберите файл пресетов", en: "Choose a presets file" },
    "live.09": { ru: "Импорт пресетов: добавлено {n}, пропущено (дубли) {d}", en: "Preset import: {n} added, {d} duplicates skipped" },
    "live.10": { ru: "Импорт пресетов: добавлено {n}", en: "Preset import: {n} added" },
    "live.11": { ru: "В файле нет ни одного корректного пресета", en: "The file contains no valid presets" },
    "live.12": { ru: "Ждём первый шаг прогресса…", en: "Waiting for the first progress step…" },
    "live.13": { ru: "Прямой эфир", en: "Live" },
    "live.14": { ru: "шагов", en: "steps" },
    "live.15": { ru: "узлов", en: "nodes" },
    "live.16": { ru: "сек", en: "s" },
    /* — qc — */
    /* — v1.9.0: порты, быстрая проверка, PNG тренда — */
    "qc.01": { ru: "Частота портов среди рабочих эндпоинтов — клик фильтрует таблицу", en: "Port frequency among working endpoints — click to filter the table" },
    "qc.02": { ru: "Показать только порт {port}", en: "Show only port {port}" },
    "qc.03": { ru: "Быстрая проверка эндпоинта", en: "Quick endpoint check" },
    "qc.04": { ru: "⚡ Быстрая проверка", en: "⚡ Quick check" },
    "qc.05": { ru: "Одна строка warpscout вместо целого скана:", en: "A single warpscout line instead of a full scan:" },
    "qc.06": { ru: "— handshake на указанный порт и пинг внутри туннеля. Результат никуда не сохраняется — только эта модалка.", en: "— handshake on the given port and in-tunnel ping. The result is not saved anywhere — this dialog only." },
    "qc.07": { ru: "Быстрая проверка: handshake на указанный порт и пинг внутри туннеля", en: "Quick check: handshake on the given port and in-tunnel ping" },
    "qc.08": { ru: "Уже идёт проверка — подождите", en: "A check is already running — please wait" },
    "qc.09": { ru: "Проверка недоступна во время скана", en: "Check unavailable while a scan is running" },
    "qc.10": { ru: "Не удалось разобрать адрес", en: "Could not parse the address" },
    "qc.11": { ru: "Не удалось запустить проверку: {err}", en: "Failed to start the check: {err}" },
    "qc.12": { ru: "warpscout завершился с кодом {c}", en: "warpscout exited with code {c}" },
    "qc.13": { ru: "✅ Рабочий — TUN PING {ping} ms, потери {loss}", en: "✅ Working — TUN PING {ping} ms, loss {loss}" },
    "qc.14": { ru: "⛔ Разорван — потери {loss}", en: "⛔ Torn — loss {loss}" },
    "qc.15": { ru: "Эндпоинт не ответил (нет строки в отчёте)", en: "Endpoint did not respond (no row in the report)" },
    "qc.16": { ru: "Проверка {ep}: рабочий, TUN PING {ping} ms", en: "Check {ep}: working, TUN PING {ping} ms" },
    "qc.17": { ru: "Проверка {ep}: разорван", en: "Check {ep}: torn" },
    "qc.18": { ru: "Проверка {ep}: не ответил", en: "Check {ep}: no response" },
    "qc.19": { ru: "Проверка {ep}: ошибка {err}", en: "Check {ep}: error {err}" },
    "qc.20": { ru: "Результат никуда не сохраняется — только эта модалка", en: "The result is not saved anywhere — this dialog only" },
    /* — batch — */
    /* — v2.0.0: журнал ⚡-проверок, пакетная проверка, SVG/HTML-экспорт — */
    "batch.01": { ru: "— handshake на указанный порт и пинг внутри туннеля. Вердикты сохраняются в журнал проверок (панель 🕘 История).", en: "— handshake on the given port and in-tunnel ping. Verdicts are saved to the check journal (🕘 History panel)." },
    "batch.02": { ru: "⚡ Журнал проверок", en: "⚡ Check journal" },
    "batch.03": { ru: "Журнал пуст — запустите ⚡-проверку эндпоинта", en: "Journal is empty — run a ⚡ endpoint check" },
    "batch.04": { ru: "Сохранить журнал проверок (CSV)", en: "Save check journal (CSV)" },
    "batch.05": { ru: "Удалить весь журнал проверок", en: "Clear the whole check journal" },
    "batch.06": { ru: "Удалить весь журнал проверок ({n})?", en: "Delete the whole check journal ({n})?" },
    "batch.07": { ru: "Журнал проверок очищен", en: "Check journal cleared" },
    "batch.08": { ru: "Журнал и так пуст", en: "The journal is already empty" },
    "batch.09": { ru: "Журнал проверок выгружен: {path}", en: "Check journal exported: {path}" },
    "batch.10": { ru: "Журнал проверок сохранён: {path}", en: "Check journal saved: {path}" },
    "batch.11": { ru: "☑ Выбрать", en: "☑ Select" },
    "batch.12": { ru: "Выбрать", en: "Select" },
    "batch.13": { ru: "Снять выбор", en: "Deselect" },
    "batch.14": { ru: "Выбрать несколько эндпоинтов для пакетной проверки", en: "Select several endpoints for a batch check" },
    "batch.15": { ru: "Выбрать для пакетной проверки", en: "Select for batch check" },
    "batch.16": { ru: "Отметить все видимые", en: "Check all visible" },
    "batch.17": { ru: "Выберите хотя бы один эндпоинт", en: "Select at least one endpoint" },
    "batch.18": { ru: "Выбрано: {n}", en: "Selected: {n}" },
    "batch.19": { ru: "Пакетная проверка: {n}", en: "Batch check: {n}" },
    "batch.20": { ru: "Последовательная очередь ⚡-проверок — по команде на каждый эндпоинт", en: "Sequential queue of ⚡ checks — one command per endpoint" },
    "batch.21": { ru: "Проверено {done}/{n} · ✅ {ok} · ⛔ {torn}", en: "Checked {done}/{n} · ✅ {ok} · ⛔ {torn}" },
    "batch.22": { ru: "Готово: {ok} рабочих, {torn} разорванных, {other} без ответа из {n}", en: "Done: {ok} working, {torn} torn, {other} no answer out of {n}" },
    "batch.23": { ru: "Пакетная проверка завершена", en: "Batch check finished" },
    "batch.24": { ru: "⚡ Проверить выбранные (", en: "⚡ Check selected (" },
    "batch.25": { ru: "{i}/{n}: {ep}", en: "{i}/{n}: {ep}" },
    "batch.26": { ru: "Сохранить график тренда в SVG", en: "Save the trend chart as SVG" },
    "batch.27": { ru: "Сохранить динамику пинга (SVG)", en: "Save ping trend (SVG)" },
    "batch.28": { ru: "Тренд SVG скачан: {path}", en: "Trend SVG downloaded: {path}" },
    "batch.29": { ru: "Тренд SVG сохранён: {path}", en: "Trend SVG saved: {path}" },
    "batch.30": { ru: "Ошибка экспорта SVG: {err}", en: "SVG export error: {err}" },
    "batch.31": { ru: "отчёт скана", en: "scan report" },
    "batch.32": { ru: "Нет результатов — нечего сохранять в HTML", en: "No results — nothing to save as HTML" },
    "batch.33": { ru: "Сохранить HTML-отчёт", en: "Save HTML report" },
    "batch.34": { ru: "Автономный HTML-отчёт по текущей таблице", en: "Standalone HTML report of the current table" },
    "batch.35": { ru: "Поделиться сканом как HTML-файлом", en: "Share the scan as an HTML file" },
    "batch.36": { ru: "HTML-отчёт выгружен: {path}", en: "HTML report exported: {path}" },
    "batch.37": { ru: "HTML-отчёт сохранён: {path}", en: "HTML report saved: {path}" },
    "batch.38": { ru: "Сгенерировано WARPSCOUT GUI v{v} · {d} · снимок текущей таблицы результатов", en: "Generated by WARPSCOUT GUI v{v} · {d} · a snapshot of the current results table" },
    "batch.39": { ru: "Узел", en: "Node" },
    "batch.40": { ru: "Нужно минимум 2 скана с пингами", en: "Need at least 2 scans with pings" },
    "batch.41": { ru: "Сохранить график тренда в PNG", en: "Save the trend chart as PNG" },
    "batch.42": { ru: "Сохранить динамику пинга (PNG)", en: "Save ping trend (PNG)" },
    "batch.43": { ru: "Тренд PNG сохранён: {path}", en: "Trend PNG saved: {path}" },
    "batch.44": { ru: "Тренд PNG скачан: {path}", en: "Trend PNG downloaded: {path}" },
    "batch.45": { ru: "Ошибка экспорта PNG: {err}", en: "PNG export error: {err}" },
    "batch.46": { ru: "сканов с пингами", en: "scans with pings" },
    /* — touch — */
    /* — v2.5.2: главная-панель быстрых действий (touch) — */
    "touch.01": { ru: "Просканировать эндпоинты", en: "Scan endpoints" },
    "touch.02": { ru: "Получить рабочий конфиг", en: "Get a working config" },
    "touch.03": { ru: "Разделы", en: "Sections" },
    "touch.04": { ru: "Конфиг сохранён", en: "Config saved" },
    "touch.05": { ru: "Скопировать конфиг", en: "Copy config" },
    "touch.06": { ru: "Скан ещё не запускался", en: "No scan has been run yet" },
    "touch.07": { ru: "Живых эндпоинтов: {n}", en: "Live endpoints: {n}" },
    "touch.08": { ru: "Живых эндпоинтов пока нет", en: "No live endpoints yet" },
    "touch.09": { ru: "Нет живых эндпоинтов — сначала просканируйте", en: "No live endpoints — run a scan first" },
    "touch.10": { ru: "Дождитесь окончания скана — конфиг строится по его результатам", en: "Wait for the scan to finish — the config is built from its results" },
    "touch.11": { ru: "Скан запущен", en: "Scan started" },
    "touch.12": { ru: "Скан уже выполняется — вкладка скана открыта", en: "A scan is already running — the scan tab is open" },
    "touch.13": { ru: "Конфиг готов: {p}", en: "Config ready: {p}" },
    "touch.14": { ru: "Конфиг сохранён: {p}", en: "Config saved: {p}" },
    "touch.15": { ru: "Отчёты и конфиги дублируются в общую папку устройства: Download/WARPScoutGUI", en: "Reports and configs are duplicated to the device's shared folder: Download/WARPScoutGUI" },
    "touch.16": { ru: "Выбор папки данных работает только в приложении", en: "Data folder selection works in the app only" },
    "touch.17": { ru: "конфиги", en: "configs" }, // v2.6.2 (аудит FE-24): was hardcoded RU
    "touch.18": { ru: "готовые конфиги", en: "ready-made configs" }, // v2.6.2 (аудит FE-24)
    /* — conf — */
    /* — v2.5.4: главная, открытие папок, конфиги в Download — */
    "conf.36": { ru: "Открываю папку{what}: {p}", en: "Opening folder{what}: {p}" },
    "conf.37": { ru: "Только в приложении (в демо папки нет)", en: "Only in the app (no folders in the demo)" },
    "conf.38": { ru: "Не удалось открыть папку", en: "Could not open the folder" },
    "conf.39": { ru: "■ Остановить скан", en: "■ Stop scan" },
    "conf.40": { ru: "Остановить скан", en: "Stop scan" },
    "conf.41": { ru: "Конфиг сохранён в Download/WARPScoutGUI", en: "Config saved to Download/WARPScoutGUI" },
    "conf.42": { ru: "Download недоступен без разрешения — конфиг сохранён в папку приложения", en: "Download is unavailable without permission — the config was saved to the app folder" },
    "conf.43": { ru: "Download недоступен ({err}) — сохраняю в папку приложения", en: "Download is unavailable ({err}) — saving to the app folder" },
    "conf.44": { ru: "Готовые конфиги сохраняются в Download/WARPScoutGUI — папка видна в любом файловом менеджере", en: "Ready configs are saved to Download/WARPScoutGUI — visible in any file manager" },
    "conf.45": { ru: "готовые конфиги (видны в любом файловом менеджере)", en: "ready configs (visible in any file manager)" },
    "conf.46": { ru: "— готовые конфиги (видны в любом файловом менеджере)", en: "— ready configs (visible in any file manager)" },
    "conf.47": { ru: "■ Остановить", en: "■ Stop" },
    "conf.48": { ru: "Скан завершён", en: "Scan finished" },
    "conf.49": { ru: "конфиги", en: "configs" },
    "conf.50": { ru: "аккаунт и отчёты", en: "account and reports" },
    "conf.51": { ru: "папка данных", en: "data folder" },
    "conf.52": { ru: "файл аккаунта", en: "account file" },
    "conf.53": { ru: "отчёты", en: "reports" },
    "conf.54": { ru: "warpscout", en: "warpscout" },
    "conf.55": { ru: "пользовательские файлы (отчёты, конфиги, аккаунт)", en: "user files (reports, configs, account)" },
    "conf.56": { ru: "Отчёт скопирован в общую папку: {p}", en: "Report copied to the shared folder: {p}" },
    "conf.57": { ru: "Копия в общей папке: {p}", en: "Copy in shared folder: {p}" },
    "conf.58": { ru: "Скан уже выполняется", en: "A scan is already running" },
    // v2.6.4: группы селекта эндпоинтов + подсказка I1
    "conf.59": { ru: "Лучшие с каждой ноды", en: "Best per node" },
    "conf.60": { ru: "Остальные", en: "Others" },
    "conf.61": { ru: "Скан с -gen-i1 генерирует I1 на лету и в отчёт не выносит — конкретный пакет даёт «Поиск параметров» → find-junk: «Применить найденное» подставит его сюда автоматически.", en: "A scan with -gen-i1 generates I1 on the fly and does not include it in the report — the concrete packet comes from 'Param finder' → find-junk: 'Apply found' inserts it here automatically." },
    /* — data — */
    /* — v2.2.0: единая папка данных — (v2.3.0: данные перенесены в папку «<имя exe>», объединение удалено) — */
    "data.01": { ru: "Папка данных", en: "Data folder" },
    "data.02": { ru: "Аккаунт, отчёты и веб-кэш движка (EBWebView) — в одной папке: %APPDATA%\\WARPScoutGUI.exe. Она создаётся программой сама и всегда на месте. Можно выбрать и другую — например, на другом диске.", en: "Account, reports and the engine web cache (EBWebView) live in one folder: %APPDATA%\\WARPScoutGUI.exe. The app creates it itself, so it is always there. You can pick another folder — e.g. on another drive." },
    "data.03": { ru: "📁 Выбрать…", en: "📁 Browse…" },
    "data.04": { ru: "📂 Открыть", en: "📂 Open" },
    "data.05": { ru: "↩ По умолчанию", en: "↩ Default" },
    "data.06": { ru: "Статус", en: "Status" },
    "data.07": { ru: "✓ аккаунт, отчёты и кэш — в одной папке", en: "✓ account, reports and cache — in one folder" },
    "data.08": { ru: "⚠ своя папка данных", en: "⚠ custom data folder" },
    "data.09": { ru: "Всё вместе — в одной папке: {u}. Она создаётся программой сама, поэтому всегда на месте.", en: "Everything together in one folder: {u}. The app creates it itself, so it is always there." },
    "data.10": { ru: "Данные (аккаунт, отчёты): {d}. Веб-кэш движка рантайм всегда держит в {u} — техническая папка останется рядом.", en: "Data (account, reports): {d}. The runtime always keeps the engine web cache in {u} — that technical folder will remain nearby." },
    "data.11": { ru: "Файл кладётся сюда (путь выше). Если warpscout-account.json лежит рядом с warpscout.exe в bin — кнопка «Проверить снова» подхватит его без перезапуска. Саму папку данных можно сменить в Настройках → «Папка данных».", en: "The file goes here (path above). If warpscout-account.json sits next to warpscout.exe in bin — the «Check again» button picks it up without a restart. The data folder itself can be changed in Settings → «Data folder»." },
    "data.12": { ru: "Пользовательская папка данных недоступна — вернулись к папке по умолчанию", en: "Custom data folder is unavailable — switched back to the default folder" },
    "data.13": { ru: "Сначала остановите скан/регистрацию/прокси — перенос данных посреди работы невозможен", en: "Stop the scan/registration/proxy first — data cannot be moved while running" },
    "data.14": { ru: "Данные из прежней папки приложения перенесены: {n} ({list})", en: "Data from the app's previous folder has been moved: {n} ({list})" },
    "data.15": { ru: "Сначала остановите скан/регистрацию/прокси", en: "Stop the scan/registration/proxy first" },
    "data.16": { ru: "Данные уже хранятся в этой папке", en: "Data is already stored in this folder" },
    "data.17": { ru: "Папка недоступна для записи — выберите другую", en: "Folder is not writable — pick another one" },
    "data.18": { ru: "Папка данных изменена, перенесено файлов: {n} ({list})", en: "Data folder changed, moved {n} file(s): {list}" },
    "data.19": { ru: "Папка данных изменена", en: "Data folder changed" },
    "data.20": { ru: "Демо: путь к новой папке данных:", en: "Demo: path of the new data folder:" },
    "data.21": { ru: "Выберите папку для данных WARPSCOUT GUI", en: "Choose a folder for WARPSCOUT GUI data" },
    "data.22": { ru: "Указанный путь к warpscout не используется — бинарь найден в штатном месте: {p}. Настройка сохранена — очистите поле в Настройках, чтобы убрать предупреждение.", en: "The custom warpscout path is not in use — the binary was found at the standard location: {p}. The setting is kept — clear the field in Settings to dismiss this warning." },
    /* — junction — */
    /* — v2.3.0: разбор junction v2.2.0 и перенос данных из старой папки — */
    "junction.01": { ru: "Не удалось снять ссылку «<имя exe>» — данные доступны, папка осталась ссылкой. Закройте приложение и удалите ссылку вручную (Проводник удаляет только ссылку), затем запустите снова.", en: "Could not remove the «<exe name>» link — data is accessible, the folder remained a link. Close the app and delete the link manually (Explorer removes only the link), then start the app again." },
    "junction.02": { ru: "Ссылка «<имя exe>» разобрана: аккаунт и отчёты снова в обычной папке, рядом с кэшем движка", en: "The «<exe name>» link has been dismantled: account and reports are back in a regular folder, next to the engine cache" },
    "junction.03": { ru: "Данные перенесены рядом с кэшем движка ({n}): {list}", en: "Data moved next to the engine cache ({n}): {list}" },
    /* — dns — */
    /* — v2.4.3: IPv6-адреса DNS — */
    "dns.01": { ru: "Использовать IPv6", en: "Use IPv6" },
    "dns.02": { ru: "Добавляет v6-адреса выбранного DNS-провайдера к IPv4 (отключите, если у сети нет IPv6-маршрута)", en: "Adds the selected DNS provider's v6 addresses to IPv4 (turn off if your network has no IPv6 route)" },
    /* — extra — */
    "extra.01": { ru: "● warpscout v{v} — готов", en: "● warpscout v{v} — ready" },
    "extra.02": { ru: "MASQUE-эндпоинт нельзя упаковать в WG/AWG .conf — используйте SOCKS-прокси или CLI warpscout", en: "A MASQUE endpoint cannot be packed into a WG/AWG .conf — use the SOCKS proxy or the warpscout CLI" },
    "extra.03": { ru: "Эндпоинт и junk-параметры скана подставлены в конфиг: {ep}", en: "The endpoint and scan junk parameters have been applied to the config: {ep}" },
    "extra.04": { ru: "Импортированные параметры содержат недопустимые значения (протокол / генератор I1 / inner-proto) — проверьте форму скана", en: "Imported parameters contain invalid values (protocol / I1 generator / inner-proto) — check the scan form" },
    "extra.05": { ru: "Не удалось запустить warpscout: {err}", en: "Failed to start warpscout: {err}" },
    "extra.06": { ru: "Отчёт не найден — смотрим конец лога.", en: "Report not found — reading the end of the log." },
    "extra.07": { ru: "warpscout завершился с кодом {c} — отчёт мог сохраниться не полностью.", en: "warpscout exited with code {c} — the report may be incomplete." },
    "extra.08": { ru: "Скан завершён с кодом {c} — результаты ниже, но отчёт может быть неполным.", en: "Scan finished with code {c} — results are below, but the report may be incomplete." },
    "extra.09": { ru: "Ошибка экспорта: {err}", en: "Export error: {err}" },
    "extra.10": { ru: "Не удалось прочитать файл: {err}", en: "Could not read the file: {err}" },
    "extra.11": { ru: "Некорректный JSON: {err}", en: "Invalid JSON: {err}" },
    "extra.12": { ru: "PNG скачан: {path}", en: "PNG downloaded: {path}" },
    "extra.13": { ru: "QR сохранён: {path}", en: "QR saved: {path}" },
    "extra.14": { ru: "Не удалось построить QR: {err}", en: "Failed to build the QR code: {err}" },
    "extra.15": { ru: "Резервная копия скачана: {path}", en: "Backup downloaded: {path}" },
    "extra.16": { ru: "Копия сохранена: {path}", en: "Copy saved: {path}" },
    "extra.17": { ru: "Импорт отклонён: некорректные данные ({err})", en: "Import rejected: invalid data ({err})" },
    "extra.18": { ru: "Файл слишком большой для резервной копии (>2 МБ)", en: "The file is too large for a backup (>2 MB)" },
    "extra.19": { ru: "История сканов пуста — выполните первый скан.", en: "Scan history is empty — run your first scan." },
    "extra.20": { ru: "История выгружена: {path}", en: "History exported: {path}" },
    "extra.21": { ru: "История сохранена: {path}", en: "History saved: {path}" },
    "extra.22": { ru: "История CSV выгружена: {path}", en: "History CSV exported: {path}" },
    "extra.23": { ru: "История CSV сохранена: {path}", en: "History CSV saved: {path}" },
    "extra.24": { ru: "Нет результатов для экспорта", en: "No results to export" },
    "extra.25": { ru: "CSV скачан: ", en: "CSV downloaded: " },
    "extra.26": { ru: "CSV сохранён: ", en: "CSV saved: " },
    "extra.27": { ru: "Сохранить результаты CSV", en: "Save results as CSV" },
    "extra.28": { ru: "Сначала создайте аккаунт — в превью сейчас шаблон без ключей, такой профиль работать не будет", en: "Create an account first — the preview is currently a keyless template and would not work" },
    "extra.29": { ru: "Конфиг сохранён: {path}", en: "Config saved: {path}" },
    "extra.30": { ru: "Ошибка записи: {err}", en: "Write error: {err}" },
    "extra.31": { ru: "peers: {n} — перенесён только первый", en: "peers: {n} — only the first one was imported" },
    "extra.32": { ru: "директивы вне секций: {n}", en: "directives outside sections: {n}" },
    "extra.33": { ru: "Ошибка разбора: {err}", en: "Parsing error: {err}" },
    "extra.34": { ru: "Пакетная проверка отменена", en: "Batch check cancelled" },
    "extra.35": { ru: "В файле нет корректных ключей аккаунта (private_key/peer_public_key в формате base64, 32 байта) — это не warpscout-account.json. Возможно, вы выбрали .conf-конфиг или файл другой программы.", en: "The file contains no valid account keys (private_key/peer_public_key as base64, 32 bytes) — this is not a warpscout-account.json. You may have selected a .conf config or another program's file." },
    "extra.36": { ru: "В файле есть и public_key, и peer_public_key с разными значениями — неоднозначно. Переименуйте нужный ключ в peer_public_key и попробуйте снова.", en: "The file contains both public_key and peer_public_key with different values — ambiguous. Rename the needed key to peer_public_key and try again." },
    "extra.37": { ru: "Остановлено пользователем.", en: "Stopped by the user." },
    "extra.38": { ru: "Прежний аккаунт сохранён как {f}", en: "The previous account was saved as {f}" },
    "extra.39": { ru: "Прокси остановлен.", en: "Proxy stopped." },
    "extra.40": { ru: "Найден конкретный I1 — GUI применяет генераторы; raw-I1 задаётся командой из вкладки «Поиск параметров»", en: "A concrete I1 was found — the GUI applies the generators; a raw I1 is set by the command from the 'Param finder' tab" },
    "extra.41": { ru: "новая папка находится внутри старой — выберите папку вне её", en: "the new folder is inside the old one — choose a folder outside it" },
    "extra.42": { ru: "Перенос данных не выполнен: {err}. Активной осталась прежняя папка.", en: "Data migration failed: {err}. The previous folder remains active." },
    "extra.43": { ru: "Не перенесены — уже есть в новой папке: {n}", en: "Not moved — already present in the new folder: {n}" },
    "extra.44": { ru: "Параметры обфускации восстановлены из примера", en: "Obfuscation parameters restored from the example" },
    "extra.45": { ru: "Сначала остановите скан/регистрацию/прокси — сброс посреди работы невозможен", en: "Stop the scan/registration/proxy first — reset is not possible while they are running" },
    "extra.46": { ru: "Сбросить настройки скана/конфига, историю, журнал проверок и пресеты? Аккаунт и файлы в папке данных останутся.", en: "Reset scan/config settings, history, the check log and presets? The account and the files in the data folder will remain." },
      /* — extra2: статика index.html (v2.6.2) — */
    "extra.48": { ru: "Скану нужен аккаунт WARP — это обычная регистрация устройства в Cloudflare, как у официального клиента. Приватный ключ остаётся на вашей машине.", en: "Scanning needs a WARP account — it is a regular device registration with Cloudflare, like the official client. The private key stays on your machine." },
    "extra.49": { ru: "Файл кладётся сюда (путь выше). Если warpscout-account.json лежит рядом с warpscout.exe в bin — кнопка «Проверить снова» подхватит его без перезапуска. По умолчанию файл хранится в %APPDATA%\\WARPScoutGUI.exe (вместе с отчётами и кэшем движка); папку можно сменить в Настройках → «Папка данных».", en: "The file goes here (path above). If warpscout-account.json sits next to warpscout.exe in bin — the 'Check again' button will pick it up without a restart. By default the file is stored in %APPDATA%\\WARPScoutGUI.exe (together with reports and the engine cache); the folder can be changed in Settings → 'Data folder'." },
    "extra.50": { ru: "Поднимает один туннель и раздаёт его как SOCKS5-прокси — чтобы проверить эндпоинт curl-ом или браузером. Не для постоянного использования.", en: "Raises one tunnel and serves it as a SOCKS5 proxy — to check an endpoint with curl or a browser. Not for permanent use." },
    "extra.51": { ru: "Аккаунт, отчёты и веб-кэш движка (EBWebView) — в одной папке: %APPDATA%\\WARPScoutGUI.exe. Она создаётся программой сама и всегда на месте — никаких ссылок и объединений. Можно выбрать и другую папку — например, на другом диске.", en: "The account, reports and the engine's web cache (EBWebView) live in one folder: %APPDATA%\\WARPScoutGUI.exe. The program creates it itself and it is always there — no symlinks or junctions. You can choose a different folder — for example, on another drive." },
    "extra.52": { ru: "Настройки, пресеты и последние результаты хранятся локально в хранилище приложения. Резервная копия — один JSON-файл со всеми параметрами, пресетами и историей.", en: "Settings, presets and the latest results are stored locally in the app's storage. A backup is a single JSON file with all settings, presets and history." },
    "extra.53": { ru: "Подсказка: наведите курсор на строку результата — появятся быстрые действия (⧉ копировать, ⚙ в конфиг, 🧦 в SOCKS, ⏵ сразу запустить прокси).", en: "Tip: hover over a result row — quick actions appear (⧉ copy, ⚙ to config, 🧦 to SOCKS, ⏵ start the proxy right away)." },
    "extra.54": { ru: "⇅ Сравнение сканов", en: "⇅ Scan comparison" },
    "extra.55": { ru: "Δ-пинг считается по общим эндпоинтам (A → B: зелёный — стало быстрее, красный — медленнее). Наборы берутся из сохранённой истории.", en: "Δ-ping is computed over the endpoints shared by both scans (A → B: green — faster now, red — slower). Sets are taken from the saved history." },
    "extra.56": { ru: "Горячие клавиши", en: "Keyboard shortcuts" },
    "extra.57": { ru: "Импорт пресетов", en: "Preset import" },
    "extra.58": { ru: "Протокол туннеля", en: "Tunnel protocol" },
    "extra.59": { ru: "Задание по умолчанию", en: "Default task" },
    "extra.60": { ru: "Генерация I1", en: "I1 generation" },
    "extra.61": { ru: "Точная команда, которая будет запущена", en: "The exact command that will be executed" },
    "extra.62": { ru: "Скопировать команду", en: "Copy the command" },
    "extra.63": { ru: "Сохранить таблицу в CSV", en: "Save the table as CSV" },
    "extra.64": { ru: "Скопировать рабочие эндпоинты (по одному в строке)", en: "Copy working endpoints (one per line)" },
    "extra.65": { ru: "Переключить: порядок отчёта / сортировка по TUN PING", en: "Toggle: report order / sort by TUN PING" },
    "extra.66": { ru: "Компактная таблица (меньше отступы)", en: "Compact table (smaller padding)" },
    "extra.67": { ru: "Лучший результат → генератор конфига", en: "Best result → config generator" },
    "extra.68": { ru: "Очистить фильтр", en: "Clear the filter" },
    "extra.69": { ru: "Пакетная проверка выбранных", en: "Batch check of the selected" },
    "extra.70": { ru: "Генератор конфигов", en: "Config generator" },
    "extra.71": { ru: "Версия AWG", en: "AWG version" },
    "extra.72": { ru: "Разобрать весь .conf-файл (WG / AWG 1.5–3.1) и подставить все поля", en: "Parse the whole .conf file (WG / AWG 1.5–3.1) and fill in all fields" },
    "extra.73": { ru: "Показать QR-код конфига (импорт камерой в WireGuard / AmneziaVPN)", en: "Show the config QR code (camera import into WireGuard / AmneziaVPN)" },
    "extra.74": { ru: "Взять лучший из последнего скана", en: "Take the best one from the last scan" },
    "extra.75": { ru: "Сохранить все настройки, пресеты и историю в файл", en: "Save all settings, presets and history to a file" },
    "extra.76": { ru: "Восстановить настройки из файла резервной копии", en: "Restore settings from a backup file" },
    "extra.77": { ru: "Закрыть", en: "Close" },
    "extra.78": { ru: "Сравнение двух сканов", en: "Comparison of two scans" },
      "extra.79": { ru: "Открыть папку", en: "Open folder" },
    "extra.80": { ru: "Нижняя навигация", en: "Bottom navigation" },
    "extra.81": { ru: "случайный известный хост", en: "random known host" },
    "extra.82": { ru: "авто", en: "auto" },
    "extra.83": { ru: "свои подсети через запятую", en: "your comma-separated subnets" },
    "extra.84": { ru: "32-байтный ключ", en: "32-byte key" },
  };

  let LANG = "ru";
  let revReady = false; // v2.6.2 (QUAL-1): REV-таблица строится один раз
  let i18nStaticReady = false;
  let i18nTextNodes = [];   // статические текстовые узлы, собранные один раз
  let i18nAttrEls = [];     // элементы с переводимыми атрибутами
  const i18nMissWarned = new Set(); // v2.6.2 (QUAL-1): одноразовые warn о непереведённой статике

  // ── v2.6.2 (аудит QUAL-1): ключи-идентификаторы вместо канонического RU-текста.
  // I18N: { id: { ru, en } }; переформулировка любого текста больше не ломает пару RU/EN.
  // Платформенные фразы (LINUX_TEXT/MAC_TEXT в 01-platform) применяются к ЗНАЧЕНИЮ
  // по идентификатору (platPhraseOf), нормализация имён — platNorm.
  function t(id) {
    const e = I18N[id];
    if (!e) return id; // отсутствующий идентификатор виден сразу (и ловится check-i18n)
    const lang = LANG === "en" ? "en" : "ru";
    let s = e[lang];
    const p = platPhraseOf(id, lang);
    if (p != null) s = p;
    else if (!IS_WIN) s = platNorm(s); // имена файлов/пути в значении — по платформе
    return s;
  }
  function tF(id, vars) {
    let s = t(id);
    if (vars) {
      for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(String(vars[k]));
    }
    return s;
  }

  // обратная таблица для статического DOM: нормализованный RU-текст -> id
  const REV_RU = {};
  function revInit() {
    Object.keys(I18N).forEach((id) => {
      const ru = I18N[id].ru;
      if (REV_RU[ru] === undefined) REV_RU[ru] = id;
      const k = platKey(ru);
      if (REV_RU[k] === undefined) REV_RU[k] = id;
      const n = platNorm(ru);
      if (REV_RU[n] === undefined) REV_RU[n] = id;
    });
  }

  const I18N_SKIP_SEL =
    "#resultsBody,#resultsHead,#resultsEmpty,#historyPanel,#resStats,#resFilterMeta," +
    "#presetHint,#customPresetChips,#confPreview,#scanLog,#accLog,#socksLog,#toolsLog," +
    "#toasts,#stWs,#stAcc,#accFileState,#accFilePath,#accMainState,#accMasqueState," +
    "#accOuterState,#btnRunScanLabel,#scanPhase,#resCount,#cfgFileName,#cfgVerHint," +
    "#cfgKeysState,#socksAddr,#setWsVerHint,#foundCmdBadge,#qrBox,#cfgEndpointSel," +
    "#btnHistory,#btnTheme,#kbdTable,#presetName," +
    "#udfState,#dataRootHint,#setDataRoot,#scanLivePhase,#scanLiveElapsed,#scanLiveMeta,#scanLiveNodes,#scanLiveDot,#qrPageLabel,#homeScanRow,#homeResRow,#homeConfBox,#homePubBox"; // v2.6.2: + touch-динамика

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
        if (p.closest('[data-i18n="off"]')) return NodeFilter.FILTER_REJECT; // v2.6.2 (QUAL-1)
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
      if (el.closest('[data-i18n="off"]')) return; // v2.6.2 (QUAL-1)
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
      const id = REV_RU[platKey(orig.trim())]; // v2.6.2 (QUAL-1): текст -> идентификатор
      if (id !== undefined) {
        out = orig.replace(orig.trim(), t(id));
      } else if (LANG === "en") {
        const key = platKey(orig.trim());
        out = orig.replace(orig.trim(), key);
        if (!i18nMissWarned.has(key)) { i18nMissWarned.add(key); console.warn("[i18n] нет словарной записи для статического текста:", key); }
      } else {
        out = orig.replace(orig.trim(), platKey(orig.trim())); // v2.5.0
      }
      if (node.nodeValue !== out) node.nodeValue = out;
    });
    i18nAttrEls.forEach((el) => {
      const orig = el.__i18nAttrs || {};
      Object.keys(orig).forEach((a) => {
        const id = REV_RU[platKey(orig[a].trim())]; // v2.6.2 (QUAL-1)
        if (id !== undefined) {
          el.setAttribute(a, orig[a].replace(orig[a].trim(), t(id)));
        } else if (LANG === "en") {
          const key = platKey(orig[a].trim());
          el.setAttribute(a, orig[a].replace(orig[a].trim(), key));
          if (!i18nMissWarned.has(key)) { i18nMissWarned.add(key); console.warn("[i18n] нет словарной записи для статического атрибута:", key); }
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
      if (bSel) bSel.textContent = S.qcSelMode ? "✕ " + t("batch.13") : "☑ " + t("batch.12");
    } catch (e) {}
    try {
      const bBatch = $("#btnBatchCheck"); // v2.0.0: статическая часть надписи пакетной кнопки
      if (bBatch && !S.qcBatch) {
        const span = bBatch.querySelector("#batchCount");
        if (span) {
          bBatch.childNodes[0].nodeValue = t("batch.24");
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
      el.textContent = t("settings.38");
      el.className = "statusline__row is-ok";
    } else if (S.wsVersion) {
      el.textContent = tF("extra.01", { v: S.wsVersion });
      el.className = "statusline__row is-ok";
    } else if (S.wsChecked) {
      el.textContent = t("settings.36");
      el.className = "statusline__row is-err";
    } else {
      el.textContent = t("status.01");
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
      hint.textContent = t("misc.24") + S.wsVersion + " · " + S.paths.wsPath;
    } else if (S.wsChecked && S.wsFileThere) {
      hint.textContent = tF("settings.06", { p: S.paths.wsPath });
      hint.classList.add("is-err-hint");
    } else if (S.wsChecked) {
      const checked = (S.paths.wsCheckedList && S.paths.wsCheckedList.length)
        ? S.paths.wsCheckedList
        : (S.paths.wsTried || []).map((p) => ({ path: p, exists: false }));
      const lines = checked.slice(0, 8).map((c) => (c.exists ? "✓ " : "✗ ") + c.path);
      const more = checked.length > 8 ? "\n… и ещё " + (checked.length - 8) : "";
      let extra = "";
      if (S.paths.appBinMissing) {
        extra = "\n" + t("settings.09");
      }
      hint.textContent = t("settings.07") + "\n" + lines.join("\n") + more + "\n" + t("settings.08") + extra;
      hint.classList.add("is-err-hint");
    } else hint.textContent = t("settings.05");
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
    if (IS_MOCK) { toast(t("misc.26"), "err"); return; }
    let target = "";
    if (S.paths.wsFound && S.paths.wsPath) target = wsFolderOf(S.paths.wsPath);
    if (!target) {
      const custom = String(S.settings.wsPath || "").trim().replace(/[\\/]+$/, "");
      if (custom) target = /warpscout\.exe$/i.test(custom) ? wsFolderOf(custom) : custom;
    }
    if (!target && S.paths.appDir) target = S.paths.appDir + "\\bin";
    if (!target) { toast(t("settings.16"), "err"); return; }
    const there = await dirThere(target) || await wsFileExists(target);
    if (!there) { toast(tF("settings.17", { p: target }), "err"); return; }
    // v2.4.2 FIX: os.open возвращает промис — без .catch отказ терялся молча
    try { Promise.resolve(os().open(target)).catch(() => {}); } catch (e) {}
    toast(tF("settings.18", { p: target }), "ok");
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
    if (!revReady) { revInit(); revReady = true; } // v2.6.2 (QUAL-1)
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
    wrap.setAttribute("data-i18n", "off"); // v2.6.2: двуязычные надписи RU/EN — вне словаря
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

