/* ═══════════════════════════════════════════════════════════════
   WARPSCOUT GUI — application logic
   Оболочка warpscout: скан, генератор конфигов, аккаунт, SOCKS.
   Работает под Neutralino (реальное приложение) и в браузере
   (демо через mock.js — там Neutralino подменяется моком).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ───────── утилиты ───────── */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const IS_MOCK = typeof window.Neutralino !== "undefined" && window.Neutralino.mock === true;
  const HAS_NL = typeof window.Neutralino !== "undefined";

  function toast(msg, kind) {
    const box = $("#toasts");
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " toast--" + kind : "");
    const icons = { ok: "✅", err: "⛔", warn: "⚠️", info: "ℹ️" };
    const ico = document.createElement("span");
    ico.className = "toast__ico";
    ico.setAttribute("aria-hidden", "true");
    ico.textContent = icons[kind] || "ℹ️";
    const txt = document.createElement("span");
    txt.className = "toast__txt";
    txt.textContent = msg;
    el.appendChild(ico);
    el.appendChild(txt);
    box.appendChild(el);
    setTimeout(() => el.classList.add("toast--out"), 3200);
    setTimeout(() => el.remove(), 3500);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function flagEmoji(cc) {
    if (!cc || !/^[A-Za-z]{2}$/.test(cc)) return "";
    return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    const loc = LANG === "en" ? "en-GB" : "ru-RU";
    return d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }) + ", " +
      d.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" });
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg || t("Скопировано"), "ok");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast(okMsg || t("Скопировано"), "ok"); } catch (e2) { toast(t("Не удалось скопировать"), "err"); }
      ta.remove();
    }
  }

  /* ───────── состояние ───────── */
  // I1 из эталонного конфиг-примера (маскировка под iCloud-запрос)
  const EXAMPLE_I1 =
    "<b 0xce000000010897a297ecc34cd6dd000044d0ec2e2e1ea2991f467ace4222129b5a098823784694b4897b9986ae0b7280135fa85e196d9ad980b150122129ce2a9379531b0fd3e871ca5fdb883c369832f730e272d7b8b74f393f9f0fa43f11e510ecb2219a52984410c204cf875585340c62238e14ad04dff382f2c200e0ee22fe743b9c6b8b043121c5710ec289f471c91ee414fca8b8be8419ae8ce7ffc53837f6ade262891895f3f4cecd31bc93ac5599e18e4f01b472362b8056c3172b513051f8322d1062997ef4a383b01706598d08d48c221d30e74c7ce000cdad36b706b1bf9b0607c32ec4b3203a4ee21ab64df336212b9758280803fcab14933b0e7ee1e04a7becce3e2633f4852585c567894a5f9efe9706a151b615856647e8b7dba69ab357b3982f554549bef9256111b2d67afde0b496f16962d4957ff654232aa9e845b61463908309cfd9de0a6abf5f425f577d7e5f6440652aa8da5f73588e82e9470f3b21b27b28c649506ae1a7f5f15b876f56abc4615f49911549b9bb39dd804fde182bd2dcec0c33bad9b138ca07d4a4a1650a2c2686acea05727e2a78962a840ae428f55627516e73c83dd8893b02358e81b524b4d99fda6df52b3a8d7a5291326e7ac9d773c5b43b8444554ef5aea104a738ed650aa979674bbed38da58ac29d87c29d387d80b526065baeb073ce65f075ccb56e47533aef357dceaa8293a523c5f6f790be90e4731123d3c6152a70576e90b4ab5bc5ead01576c68ab633ff7d36dcde2a0b2c68897e1acfc4d6483aaaeb635dd63c96b2b6a7a2bfe042f6aed82e5363aa850aace12ee3b1a93f30d8ab9537df483152a5527faca21efc9981b304f11fc95336f5b9637b174c5a0659e2b22e159a9fed4b8e93047371175b1d6d9cc8ab745f3b2281537d1c75fb9451871864efa5d184c38c185fd203de206751b92620f7c369e031d2041e152040920ac2c5ab5340bfc9d0561176abf10a147287ea90758575ac6a9f5ac9f390d0d5b23ee12af583383d994e22c0cf42383834bcd3ada1b3825a0664d8f3fb678261d57601ddf94a8a68a7c273a18c08aa99c7ad8c6c42eab67718843597ec9930457359dfdfbce024afc2dcf9348579a57d8d3490b2fa99f278f1c37d87dad9b221acd575192ffae1784f8e60ec7cee4068b6b988f0433d96d6a1b1865f4e155e9fe020279f434f3bf1bd117b717b92f6cd1cc9bea7d45978bcc3f24bda631a36910110a6ec06da35f8966c9279d130347594f13e9e07514fa370754d1424c0a1545c5070ef9fb2acd14233e8a50bfc5978b5bdf8bc1714731f798d21e2004117c61f2989dd44f0cf027b27d4019e81ed4b5c31db347c4a3a4d85048d7093cf16753d7b0d15e078f5c7a5205dc2f87e330a1f716738dce1c6180e9d02869b5546f1c4d2748f8c90d9693cba4e0079297d22fd61402dea32ff0eb69ebd65a5d0b687d87e3a8b2c42b648aa723c7c7daf37abcc4bb85caea2ee8f55bec20e913b3324ab8f5c3304f820d42ad1b9f2ffc1a3af9927136b4419e1e579ab4c2ae3c776d293d397d575df181e6cae0a4ada5d67ecea171cca3288d57c7bbdaee3befe745fb7d634f70386d873b90c4d6c6596bb65af68f9e5121e67ebf0d89d3c909ceedfb32ce9575a7758ff080724e1ab5d5f43074ecb53a479af21ed03d7b6899c36631c0166f9d47e5e1d4528a5d3d3f744029c4b1c190cbfbad06f5f83f7ad0429fa9a2719c56ffe3783460e166de2d8>";

  const DEFAULT_SCAN = {
    proto: "awg",
    tunPing: true,
    sample: 10,
    full: false,
    jt: 10,
    timeout: 2,
    tunPingCount: 10,
    exclNode: "DME",
    exclCountry: "",
    node: "",
    country: "",
    genI1: "",
    i1Sni: "",
    jc: 6,
    jmin: 10,
    jmax: 50,
    genJunk: false,
    masqueSni: "",
    masqueAttempts: 3,
    through: "",
    innerProto: "",
    target: "",
    pingTarget: "",
    port: "",
    ipv6: false,
    speed: false,
    bestBySpeed: false,
  };

  const S = {
    scan: Object.assign({}, DEFAULT_SCAN),
    results: [],        // {endpoint, ping, tunPing, loss, seenAs, node, loc, torn}
    sortByPing: false,
    sortKey: "report",  // v1.6.0: report|ping|endpoint|loss|node|loc
    sortDir: 1,         // v1.6.0: 1 = asc, -1 = desc
    selected: "",
    filter: "",         // подстрока фильтра результатов (ip, узел, страна, локация)
    history: [],        // последние 10 сканов {ts, label, results, withP, withSpeed}
    viewMeta: { withP: true, withSpeed: false }, // колонки текущей таблицы
    historyOpen: false,
    cfg: {
      ver: "awg31",
      dns: "cloudflare",
      dnsCustom: "",
      endpoint: "",
      mtu: 1280,
      keepalive: 0,
      allowed: "both",
      allowedCustom: "",
      tableOff: false,
      obf: {
        jc: 4, jmin: 40, jmax: 70,
        s1: 0, s2: 0, s3: 0, s4: 0,
        h1: "1", h2: "2", h3: "3", h4: "4",
        i1: EXAMPLE_I1,
        cpa: "27-97", rekeyAfter: "116-131", rekeyTo: "6-9", rejectAfter: "171-196",
        keepaliveTo: "9-16", maxHs: "18-26", trailers: "on", noCookies: "on", hpk: "",
      },
    },
    settings: { wsPath: "" },
    customPresets: [],   // {name, scan:{...}} — пользовательские пресеты
    compact: false,      // компактная таблица
    paths: { dataDir: "", accPath: "", reportsDir: "", wsPath: "" },
    wsVersion: "",
    account: null,
    accountError: "", // v2.1.0: причина, почему файл аккаунта не принят ("parse" | "not-account")
    running: { scan: false, register: false, fj: false, fs: false, socks: false, check: false },
    procIds: {},
    demoScanned: false,
    prevEndpoints: null,  // Set эндпоинтов прошлого скана (для сравнения)
    diff: null,           // {newList:[], newCount, gone:[]} — diff с прошлым сканом
    qcHistory: [],        // v2.0.0: журнал ⚡-проверок {ts, ep, proto, kind, ping, loss, node}
    qcSelMode: false,     // v2.0.0: режим выбора эндпоинтов для пакетной проверки
    qcSel: [],            // v2.0.0: выбранные эндпоинты (порядок таблицы)
    qcBatch: null,        // v2.0.0: очередь пакетной проверки {list, idx, total, ok, torn, other, curResolve}
  };

  const PRESETS = {
    default: {
      hint: 'По умолчанию: <code>warpscout scan -p awg -P -n 10 -exclude-node DME</code>',
      apply() {
        Object.assign(S.scan, DEFAULT_SCAN);
      },
    },
    fast: {
      hint: "Быстрый: обычный WireGuard без проверки внутри туннеля — годится там, где WARP не фильтруется.",
      apply() {
        Object.assign(S.scan, DEFAULT_SCAN, { proto: "wg", tunPing: false, sample: 5, full: false });
      },
    },
    hard: {
      hint: "Жёсткая сеть: AmneziaWG + QUIC-маскировка первого пакета + проверка на разрыв. Если не найдёт — вкладка «Поиск параметров».",
      apply() {
        Object.assign(S.scan, DEFAULT_SCAN, { proto: "awg", tunPing: true, genI1: "quic", tunPingCount: 10 });
      },
    },
    full: {
      hint: "Тщательный: все 256 адресов каждой подсети, в туннеле и замер скорости. Долго!",
      apply() {
        Object.assign(S.scan, DEFAULT_SCAN, { full: true, tunPing: true, speed: true });
      },
    },
  };

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
    /* — v1.8.0: лендинг — */
  };

  let LANG = "ru";
  let i18nStaticReady = false;
  let i18nTextNodes = [];   // статические текстовые узлы, собранные один раз
  let i18nAttrEls = [];     // элементы с переводимыми атрибутами

  function t(ru) {
    if (LANG !== "en") return ru;
    const v = I18N_EN[ru];
    return v === undefined ? ru : v;
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
    "#scanLivePhase,#scanLiveElapsed,#scanLiveMeta,#scanLiveNodes,#scanLiveDot";

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
        const key = orig.trim();
        const v = I18N_EN[key];
        out = v === undefined ? orig : orig.replace(key, v);
      } else {
        out = orig;
      }
      if (node.nodeValue !== out) node.nodeValue = out;
    });
    i18nAttrEls.forEach((el) => {
      const orig = el.__i18nAttrs || {};
      Object.keys(orig).forEach((a) => {
        if (LANG === "en") {
          const v = I18N_EN[orig[a].trim()];
          el.setAttribute(a, v === undefined ? orig[a] : v);
        } else {
          el.setAttribute(a, orig[a]);
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

  // подсказка в «Настройках» о статусе warpscout (v1.6.0 — с учётом языка)
  function renderWsHints() {
    const hint = $("#setWsVerHint");
    if (!hint) return;
    if (S.wsVersion) hint.textContent = t("Найден warpscout v") + S.wsVersion + " · " + S.paths.wsPath;
    else if (S.wsChecked) hint.textContent = t("warpscout не найден. Скачайте warpscout.exe и укажите путь.");
    else hint.textContent = t("Проверка не выполнялась");
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

  /* ───────── Neutralino-мост ───────── */
  const os = () => window.Neutralino.os;
  const fs = () => window.Neutralino.filesystem;
  const store = () => window.Neutralino.storage;

  async function killProc(id) {
    if (id == null) return;
    try {
      if (os().updateSpawnedProcess) await os().updateSpawnedProcess(id, "exit");
      else if (os().killProcess) await os().killProcess(id);
    } catch (e) { /* процесс уже завершился */ }
  }

  const procRegistry = {};
  // v2.1.1: события могут прийти ДО registerProc (гонка «execCommand вернулся →
  // подписка оформлена»): раньше они молча терялись, и первый вывод warpscout
  // не попадал в лог. Копим «ранние» события и отыгрываем их в момент
  // регистрации обработчика (старше 60с — мусор, выбрасываем).
  const procBacklog = new Map(); // id -> [{ evt, ts }]
  function backlogPush(id, evt) {
    const arr = procBacklog.get(id) || [];
    arr.push({ evt, ts: Date.now() });
    procBacklog.set(id, arr);
    for (const [k, v] of procBacklog) {
      const fresh = v.filter((x) => Date.now() - x.ts < 60000);
      if (fresh.length) procBacklog.set(k, fresh); else procBacklog.delete(k);
    }
  }
  function registerProc(id, handler) {
    procRegistry[id] = handler;
    const back = procBacklog.get(id);
    if (back) {
      procBacklog.delete(id);
      for (const { evt } of back) { try { handler(evt); } catch (e) { /* не роняем поток событий */ } }
    }
  }
  function unregisterProc(id) { delete procRegistry[id]; }

  function bindProcEvents() {
    window.Neutralino.events.on("spawnedProcess", (evt) => {
      const d = evt.detail || evt;
      const h = procRegistry[d.id];
      if (h) h(d);
      else backlogPush(d.id, d);
    });
    // страховка: если exit-событие потеряно — раз в 5 сек сверяемся со списком живых процессов
    setInterval(async () => {
      const ids = Object.keys(procRegistry);
      if (!ids.length) return;
      if (!os().getSpawnedProcesses) return;
      try {
        const live = await os().getSpawnedProcesses();
        const liveIds = new Set((live || []).map((p) => String(p.id)));
        for (const id of ids) {
          if (!liveIds.has(String(id))) {
            const h = procRegistry[id];
            delete procRegistry[id];
            // v2.1.1: synthetic — exit-событие потеряно, это НЕ настоящий код -1
            if (h) h({ id: Number(id), type: "exit", data: -1, synthetic: true });
          }
        }
      } catch (e) { /* рантайм недоступен — не страшно */ }
    }, 5000);
  }

  async function ensureDir(dir) {
    if (IS_MOCK || !dir) return;
    // v2.1.1: у createDirectory в Neutralino нет опции recursive (фантомный
    // второй аргумент молча игнорировался клиентом) — порядок ensureDir ниже
    // гарантирует существование родителя
    try { await fs().createDirectory(dir); } catch (e) { /* уже есть */ }
  }

  /* ───────── построение команды скана ───────── */
  function joinArgs(pairs) {
    return pairs.filter(Boolean).join(" ");
  }

  function buildScanArgs(s) {
    const a = [];
    a.push("-p " + s.proto);
    if (s.tunPing) {
      a.push("-P");
      if (s.pingTarget && s.pingTarget.trim()) a.push("-ping-target " + safeVal(s.pingTarget));
      if (s.tunPingCount && +s.tunPingCount !== 10) a.push("-tun-ping-count " + Math.min(50, Math.max(5, Math.round(+s.tunPingCount))));
    }
    if (s.full) a.push("-f");
    else if (s.sample && +s.sample !== 5) a.push("-n " + Math.min(256, Math.max(1, Math.round(+s.sample))));
    if (s.port !== "" && s.port != null) a.push("-port " + Math.min(65535, Math.max(0, Math.round(+s.port))));
    if (s.jt && +s.jt !== 10) a.push("-jt " + Math.min(100, Math.max(1, Math.round(+s.jt))));
    if (s.timeout && +s.timeout !== 2) a.push("-t " + Math.min(30, Math.max(1, Math.round(+s.timeout))));
    if (s.ipv6) a.push("-6");
    if (s.target && s.target.trim()) a.push("-target " + safeVal(s.target));
    const isMasque = s.proto === "masque" || s.proto === "masque-h2";
    if (s.node && s.node.trim() && !isMasque) a.push("-node " + safeVal(s.node));
    if (s.country && s.country.trim() && !isMasque) a.push("-country " + safeVal(s.country));
    if (s.exclNode && s.exclNode.trim() && !isMasque) a.push("-exclude-node " + safeVal(s.exclNode));
    if (s.exclCountry && s.exclCountry.trim() && !isMasque) a.push("-exclude-country " + safeVal(s.exclCountry));
    if (s.through && s.through.trim()) {
      a.push("-through " + safeVal(s.through));
      if (s.innerProto) a.push("-inner-proto " + s.innerProto);
    }
    if (s.proto === "awg") {
      if (s.genI1) {
        a.push("-gen-i1 " + s.genI1);
        if (s.i1Sni && s.i1Sni.trim()) a.push("-i1-sni " + safeVal(s.i1Sni)); // валиден только вместе с -gen-i1
      }
      if (s.genJunk) a.push("-gen-junk");
      else {
        if (s.jc !== "" && s.jc != null && +s.jc !== 6) a.push("-jc " + Math.min(255, Math.max(0, Math.round(+s.jc))));
        if (s.jmin !== "" && s.jmin != null && +s.jmin !== 10) a.push("-jmin " + Math.min(5000, Math.max(0, Math.round(+s.jmin))));
        if (s.jmax !== "" && s.jmax != null && +s.jmax !== 50) a.push("-jmax " + Math.min(5000, Math.max(0, Math.round(+s.jmax))));
      }
    }
    if (s.proto === "masque" || s.proto === "masque-h2") {
      if (s.masqueSni && s.masqueSni.trim()) a.push("-masque-sni " + safeVal(s.masqueSni));
      if (s.masqueAttempts && +s.masqueAttempts !== 3) a.push("-masque-attempts " + Math.min(10, Math.max(1, Math.round(+s.masqueAttempts))));
    }
    if (s.speed) a.push("-speed");
    if (s.bestBySpeed) a.push("-best-by speed");
    a.push("-plain");
    return a;
  }

  function buildScanCmd(s) {
    const exe = quoteExe();
    const args = buildScanArgs(s);
    const report = S.paths.reportPath || "warpscout-report.txt";
    const acc = S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "";
    return exe + " scan " + joinArgs(args) + ' -o "' + report + '"' + acc;
  }

  // ── R1/R3: безопасные значения флагов для Windows cmd ──
  function safeVal(v) {
    if (v == null) return "";
    return String(v)
      .replace(/\s*,\s*/g, ",")            // «DME, FRA» -> «DME,FRA»
      .replace(/["'&|^%!<>()*?~;]/g, "")   // опасные для cmd/argv символы
      .trim();
  }

  function quoteExe() {
    const p = (S.paths.wsPath || "warpscout.exe").replace(/[\\/]+$/, "");
    return '"' + p.replace(/"/g, "") + '"';
  }

  function updateCmdPreview() {
    const cmd = buildScanCmd(S.scan);
    // в демо/до инициализации путей показываем читаемую команду без абсолютных путей
    const show = IS_MOCK
      ? cmd.replace(/^"[^"]*"/, "warpscout").replace(/ -o "[^"]*"/, "").replace(/ -a "[^"]*"/, "")
      : cmd;
    $("#cmdPreview").textContent = show;
  }

  /* ───────── парсер отчёта ───────── */
  // Формат строки: "%-22s %-13s %s%s%-10s %-6s %s" — IPv6-эндпоинт длиннее 22 символов,
  // поэтому первый токен всегда отделяем по первому пробелу, остальное — по 2+ пробелам.
  function parseReport(text, withP, withSpeed) {
    const lines = text.split(/\r?\n/);
    const results = [];
    let zone = "head";
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (/^#\s+\d+ torn down/.test(line)) { zone = "torn"; continue; }
      if (/^#/.test(line)) { continue; }
      if (!line.trim()) { continue; }
      if (/^ENDPOINT\s/.test(line) && zone !== "nodebest" && zone !== "torn") { zone = "rows"; continue; }
      if (/^NODE\s+ENDPOINT/.test(line)) { zone = "nodebest"; continue; }
      if (zone === "rows" || zone === "torn") {
        const row = parseRowTokens(line, withP, withSpeed);
        if (row) {
          row.torn = zone === "torn";
          results.push(row);
        }
      }
    }
    return results;
  }

  function parseRowTokens(line, withP, withSpeed) {
    const m = /^(\S+)\s+(.*)$/.exec(line);
    if (!m) return null;
    const endpoint = m[1];
    if (!/:\d+$/.test(endpoint)) return null;
    const tokens = m[2].split(/\s{2,}/).map((t) => t.trim()).filter((t) => t.length);
    const row = { endpoint, ping: "", tunPing: "", loss: "", speed: "", seenAs: "", node: "", loc: "" };
    let i = 0;
    row.ping = tokens[i++] || "";
    if (withP) { row.tunPing = tokens[i++] || ""; row.loss = tokens[i++] || ""; }
    if (withSpeed) row.speed = tokens[i++] || "";
    row.seenAs = tokens[i++] || "";
    row.node = tokens[i++] || "";
    row.loc = tokens.slice(i).join(" ") || "";
    return row;
  }

  function exitCodeOf(data) {
    const code = typeof data === "number" ? data : parseInt(String(data == null ? "" : data).trim(), 10);
    return Number.isFinite(code) ? code : -1;
  }

  function pingMs(pingStr) {
    const m = /(\d+)/.exec(pingStr || "");
    return m ? +m[1] : Infinity;
  }

  function pingCell(ping) {
    if (!ping) return '<span class="bad">?</span>';
    const v = pingMs(ping);
    if (v === Infinity) return '<span class="bad">?</span>';
    if (v <= 80) return '<span class="good">' + esc(ping) + "</span>";
    if (v <= 180) return '<span class="mid">' + esc(ping) + "</span>";
    return esc(ping);
  }

  function lossCell(loss) {
    if (!loss) return "—";
    const v = parseFloat(loss);
    if (v <= 2) return '<span class="good">' + esc(loss) + "</span>";
    if (v <= 20) return '<span class="mid">' + esc(loss) + "</span>";
    return '<span class="bad">' + esc(loss) + "</span>";
  }

  function matchRow(r, q) {
    return (r.endpoint + " " + r.node + " " + r.loc + " " + r.seenAs).toLowerCase().indexOf(q) !== -1;
  }

  function updateFilterMeta(shown, total) {
    const meta = $("#resFilterMeta");
    const clear = $("#resFilterClear");
    if (!meta || !clear) return;
    clear.classList.toggle("hidden", !S.filter);
    meta.innerHTML = S.filter
      ? tF("показано <b>{n}</b> из {m}", { n: shown, m: total })
      : "";
  }

  function applyFilter(q) {
    S.filter = (q || "").trim();
    renderResults();
  }

  function clearFilter(focusBack) {
    if (!S.filter) return;
    S.filter = "";
    $("#resFilter").value = "";
    renderResults();
    if (focusBack) $("#resFilter").focus();
  }

  function resetFilterSilently() {
    S.filter = "";
    const inp = $("#resFilter");
    if (inp) inp.value = "";
  }

  function renderResults() {
    const head = $("#resultsHead");
    const body = $("#resultsBody");
    const withP = S.viewMeta.withP;
    const withSpeed = S.viewMeta.withSpeed;

    const rows = S.results.slice();
    if (S.sortByPing) { S.sortKey = "ping"; S.sortDir = 1; }
    const sortKey = S.sortKey || "report";
    const sortDir = S.sortDir || 1;
    if (sortKey !== "report") {
      const cmp = {
        ping: (a, b) => pingMs(a.tunPing || a.ping) - pingMs(b.tunPing || b.ping),
        loss: (a, b) => (parseFloat(a.loss) || 0) - (parseFloat(b.loss) || 0),
        endpoint: (a, b) => String(a.endpoint).localeCompare(String(b.endpoint), undefined, { numeric: true }),
        node: (a, b) => String(a.node || "").localeCompare(String(b.node || "")),
        loc: (a, b) => String(a.loc || "").localeCompare(String(b.loc || "")),
      }[sortKey];
      if (cmp) rows.sort((a, b) => (a.torn - b.torn) || sortDir * cmp(a, b));
    } // иначе — порядок отчёта warpscout: потери → пинг

    // лучший рабочий эндпоинт (мин. TUN PING, иначе PING) — считаем по ПОЛНОЙ выборке,
    // чтобы звезда не «прыгала» при фильтрации
    let bestEp = "";
    const workingAll = S.results.filter((r) => !r.torn);
    if (workingAll.length) {
      let bestV = Infinity;
      workingAll.forEach((r) => {
        const v = pingMs(r.tunPing || r.ping);
        if (v < bestV) { bestV = v; bestEp = r.endpoint; }
      });
    }

    // фильтр результатов (v1.3.0)
    const totalRows = rows.length;
    let visible = rows;
    if (S.filter) visible = rows.filter((r) => matchRow(r, S.filter.toLowerCase()));

    // v2.0.0: в режиме выбора выкидываем из выбранного то, чего больше нет в таблице
    if (S.qcSelMode && S.qcSel.length) {
      S.qcSel = S.qcSel.filter((ep) => rows.some((r) => r.endpoint === ep));
    }

    renderResStats();
    const toolbar = $("#resToolbar");
    if (toolbar) {
      toolbar.hidden = !S.results.length;
      toolbar.classList.toggle("hidden", !S.results.length);
    }
    updateFilterMeta(visible.length, totalRows);

    // v1.6.0: кликабельная сортировка. Каждый столбец: {label, key}
    const cols = [
      { label: t("Эндпоинт"), key: "endpoint" },
      { label: S.sortKey === "ping" ? "TUN PING" : "PING", key: "ping" },
    ];
    if (withP) cols.push({ label: "LOSS", key: "loss" });
    if (withSpeed) cols.push({ label: "SPEED", key: "" });
    cols.push({ label: "SEEN AS", key: "" }, { label: "NODE", key: "node" }, { label: t("Локация узла"), key: "loc" }, { label: "", key: "" });

    head.innerHTML =
      "<tr>" +
      (S.qcSelMode
        ? '<th class="th-sel"><input type="checkbox" id="selAllBox" ' +
          (visible.length && visible.every((r) => S.qcSel.indexOf(r.endpoint) !== -1) ? "checked" : "") +
          ' aria-label="' + esc(t("Отметить все видимые")) + '" title="' + esc(t("Отметить все видимые")) + '"/></th>'
        : "") +
      cols
        .map((c) => {
          const active = c.key && c.key === sortKey && sortKey !== "report";
          const arrow = active ? (sortDir === 1 ? ' <span class="th-arrow">▲</span>' : ' <span class="th-arrow">▼</span>') : "";
          const pingArrow = c.key === "ping" && sortKey === "report" && S.sortByPing ? ' <span class="th-arrow">▲</span>' : "";
          return (
            '<th' + (c.key ? ' class="th-sort" data-sort="' + c.key + '" title="' + t("Сортировать") + '"' : "") + ">" +
            esc(c.label) + arrow + pingArrow + "</th>"
          );
        })
        .join("") +
      "</tr>";
    // v2.0.0: мастер-чекбокс «отметить все видимые»
    const selAll = $("#selAllBox");
    if (selAll) selAll.addEventListener("change", selectAllVisible);
    // v1.6.0: клик по заголовку — сортировка (повторный клик меняет направление)
    $$("#resultsHead .th-sort").forEach((th) => {
      th.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = th.getAttribute("data-sort");
        if (!key) return;
        if (S.sortKey === key) {
          S.sortDir = -S.sortDir;
        } else {
          S.sortKey = key;
          S.sortDir = 1;
        }
        S.sortByPing = S.sortKey === "ping" && S.sortDir === 1;
        renderResults();
      });
    });

    if (!visible.length) {
      body.innerHTML = "";
      $("#resultsEmpty").classList.remove("hidden");
      const emptyTitle = $("#resultsEmpty .empty__title");
      const emptyHint = $("#resultsEmpty .empty__hint");
      if (S.filter && totalRows) {
        emptyTitle.textContent = t("Нет совпадений с фильтром");
        emptyHint.innerHTML = tF("В запросе: «{q}». Попробуйте узел (HKG), страну или часть IP.", { q: esc(S.filter) });
      } else {
        emptyTitle.textContent = t("Пока нет результатов");
        emptyHint.innerHTML = t("Настройте параметры слева и нажмите «Начать скан».") + "<br/>" + t("Лучший эндпоинт окажется вверху таблицы.");
      }
      if (!totalRows) $("#resCount").hidden = true;
      return;
    }
    $("#resultsEmpty").classList.add("hidden");
    $("#resCount").hidden = false;
    $("#resCount").textContent = String(S.results.filter((r) => !r.torn).length);
    // v1.7.0: каскадное появление строк после завершения скана
    const stagger = S.staggerNext;
    S.staggerNext = false;

    body.innerHTML = visible
      .map((r, idx) => {
        const ep = r.endpoint;
        const isNew = !!(S.diff && S.diff.newList && S.diff.newList.indexOf(ep) !== -1);
        const selCell = S.qcSelMode
          ? '<td class="td-sel"><input type="checkbox" class="row-sel" data-sel="' + esc(ep) + '" ' +
            (S.qcSel.indexOf(ep) !== -1 ? "checked" : "") +
            ' aria-label="' + esc(t("Выбрать для пакетной проверки")) + '"/></td>'
          : "";
        const cells = [
          "<td>" +
            (ep === bestEp ? '<span class="best-star" title="' + t("Лучший пинг") + '">★</span>' : "") +
            esc(ep) +
            (isNew ? '<span class="new-badge" title="' + t("Появился в этом скане") + '">new</span>' : "") +
          "</td>",
          "<td>" + pingCell(S.sortKey === "ping" ? (r.tunPing || r.ping) : r.ping) + "</td>",
          withP ? "<td>" + pingCell(r.tunPing) + "</td><td>" + lossCell(r.loss) + "</td>" : "",
          withSpeed ? "<td>" + esc(r.speed || "—") + "</td>" : "",
          '<td class="seen">' + flagEmoji(r.seenAs) + " " + esc(r.seenAs || "—") + "</td>",
          "<td>" + esc(r.node || "—") + "</td>",
          "<td>" + esc(r.loc || "—") + "</td>",
          '<td class="row-actions">' +
            '<button type="button" data-act="copy" title="' + t("Скопировать ip:порт") + '">⧉</button>' +
            '<button type="button" data-act="cfg" title="' + t("Использовать в конфиге") + '">⚙</button>' +
            '<button type="button" data-act="socks" title="' + t("Подставить в SOCKS-вкладку") + '">🧦</button>' +
            '<button type="button" data-act="socks-run" title="' + t("Сразу запустить SOCKS5-прокси для этого эндпоинта") + '">⏵</button>' +
            '<button type="button" data-act="check" title="' + t("Быстрая проверка: handshake на указанный порт и пинг внутри туннеля") + '">⚡</button>' +
          "</td>",
        ];
        const sel = ep === S.selected ? " is-selected" : "";
        const torn = r.torn ? " is-torn" : "";
        if (r.torn) cells[0] = cells[0].replace("<td>", '<td data-torn="' + t("разорван") + '">');
        const best = ep === bestEp ? " is-best" : "";
        const nw = isNew ? " is-new" : "";
        return '<tr data-ep="' + esc(ep) + '" class="' + (sel + torn + best + nw).trim() + '">' + selCell + cells.join("") + "</tr>";
      })
      .join("");

    // v1.7.0: каскадное появление строк (только сразу после скана)
    if (stagger) {
      $$("#resultsBody tr").forEach((tr, i) => {
        tr.classList.add("is-entering");
        tr.style.animationDelay = Math.min(i * 40, 600) + "ms";
        tr.addEventListener("animationend", () => {
          tr.classList.remove("is-entering");
          tr.style.animationDelay = "";
        }, { once: true });
      });
    }

    $$("#resultsBody tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        const ep = tr.getAttribute("data-ep");
        // v2.0.0: в режиме выбора клик по строке = переключить чекбокс (без перерисовки)
        if (S.qcSelMode) {
          toggleQcSel(ep);
          const box = tr.querySelector(".row-sel");
          if (box) box.checked = S.qcSel.indexOf(ep) !== -1;
          return;
        }
        S.selected = ep;
        renderResults();
      });
      // v2.0.0: чекбокс строки — выбор для пакетной проверки
      const rowSel = tr.querySelector(".row-sel");
      if (rowSel) {
        rowSel.addEventListener("click", (e) => e.stopPropagation());
        rowSel.addEventListener("change", () => {
          toggleQcSel(tr.getAttribute("data-ep"));
        });
      }
      $$(".row-actions button", tr).forEach((b) =>
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          const ep = tr.getAttribute("data-ep");
          const act = b.getAttribute("data-act");
          if (act === "copy") { copyText(ep, t("Эндпоинт скопирован")); return; }
          if (act === "cfg") {
            S.cfg.endpoint = ep;
            syncCfgInputsFromState();
            switchTab("config");
            toast(tF("Эндпоинт подставлен в конфиг: {ep}", { ep: ep }), "ok");
            return;
          }
          if (act === "socks") {
            $("#socksEndpoint").value = ep;
            $("#socksProto").value = S.viewProto || "awg";
            switchTab("socks");
            toast(t("Эндпоинт готов к проверке во вкладке SOCKS"), "ok");
            return;
          }
          if (act === "socks-run") {
            $("#socksEndpoint").value = ep;
            $("#socksProto").value = S.viewProto || "awg";
            switchTab("socks");
            if (!S.running.socks) {
              socksToggle();
              toast(tF("{ep}: запускаю прокси", { ep: ep }), "ok");
            } else {
              toast(t("Прокси уже запущен — сначала остановите текущий"), "warn");
            }
          }
          if (act === "check") { checkOne(ep); return; }
        })
      );
    });
  }

  /* ───────── статистика результатов ───────── */
  function renderResStats() {
    const el = $("#resStats");
    if (!el) return;
    if (!S.results.length) {
      el.classList.add("hidden");
      el.innerHTML = "";
      return;
    }
    const working = S.results.filter((r) => !r.torn);
    const torn = S.results.length - working.length;
    const pings = working.map((r) => pingMs(r.tunPing || r.ping)).filter((v) => v !== Infinity);
    const sorted = pings.slice().sort((a, b) => a - b);
    const best = sorted.length ? sorted[0] : 0;
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    const nodes = {};
    working.forEach((r) => { if (r.node) nodes[r.node] = (nodes[r.node] || 0) + 1; });
    const nodeNames = Object.keys(nodes);

    const chips = [
      '<span class="stat-chip">' + t("📡 всего") + " <b>" + S.results.length + "</b></span>",
      '<span class="stat-chip stat-chip--ok">' + t("✅ рабочих") + " <b>" + working.length + "</b></span>",
    ];
    if (torn) chips.push('<span class="stat-chip stat-chip--err">' + t("✂ разорвано") + " <b>" + torn + "</b></span>");
    if (best) chips.push('<span class="stat-chip stat-chip--best" title="' + t("Минимальный пинг среди рабочих") + '">' + t("⚡ лучший") + " <b>" + best + " ms</b></span>");
    if (median) chips.push('<span class="stat-chip" title="' + t("Медианный пинг рабочих") + '">' + t("⚖ медиана") + " <b>" + median + " ms</b></span>");
    // спарклайн распределения пинга (v1.3.0)
    if (sorted.length >= 2) {
      const W = 84, H = 20;
      const min = sorted[0], max = sorted[sorted.length - 1];
      const span = Math.max(1, max - min);
      const pts = sorted.map((v, i) => {
        const x = (i / (sorted.length - 1)) * (W - 2) + 1;
        const y = H - 2 - ((v - min) / span) * (H - 5);
        return x.toFixed(1) + "," + y.toFixed(1);
      });
      const area = "1," + (H - 1) + " " + pts.join(" ") + " " + (W - 1) + "," + (H - 1);
      chips.push(
        '<span class="stat-chip spark" title="' + tF("Распределение пинга рабочих эндпоинтов: мин {min} / макс {max} ms", { min: min, max: max }) + '">' +
          '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true">' +
            '<polygon class="spark-area" points="' + area + '"></polygon>' +
            '<polyline class="spark-line" points="' + pts.join(" ") + '"></polyline>' +
          "</svg>" + t("📈 профиль") +
        "</span>"
      );
    }
    if (nodeNames.length) {
      chips.push('<span class="stat-chip" title="' + tF("Узлы: {nodes}", { nodes: esc(nodeNames.join(", ")) }) + '">' + t("🌍 узлов") + " <b>" + nodeNames.length + "</b></span>");
    }
    // v1.9.0: частота портов среди рабочих — кликабельные чипы-фильтры
    const ports = {};
    working.forEach((r) => {
      const m = /:(\d+)$/.exec(r.endpoint);
      if (m) ports[m[1]] = (ports[m[1]] || 0) + 1;
    });
    const topPorts = Object.keys(ports)
      .sort((a, b) => ports[b] - ports[a] || +a - +b)
      .slice(0, 4);
    if (topPorts.length && (topPorts.length > 1 || working.length > 1)) {
      topPorts.forEach((p) => {
        chips.push(
          '<button type="button" class="stat-chip stat-chip--port" data-port="' + esc(p) +
          '" title="' + tF("Показать только порт {port}", { port: p }) + '">' +
            "🚪 " + esc(p) + " <b>×" + ports[p] + "</b></button>"
        );
      });
    }
    if (S.diff) {
      if (S.diff.newCount) {
        chips.push('<span class="stat-chip stat-chip--new" title="' + t("Эндпоинтов, которых не было в прошлом скане") + '">' + t("➕ новых") + " <b>" + S.diff.newCount + "</b></span>");
      }
      if (S.diff.gone.length) {
        chips.push(
          '<button type="button" class="stat-chip stat-chip--gone" id="chipGone" title="' +
            esc(S.diff.gone.join(", ")) +
            '">' + t("➖ пропали") + " <b>" + S.diff.gone.length + "</b></button>"
        );
      }
    }
    el.innerHTML = chips.join("");
    el.classList.remove("hidden");
    const goneBtn = $("#chipGone");
    if (goneBtn) {
      goneBtn.addEventListener("click", () => {
        toast(tF("Пропали с прошлого скана ({n}): {list}", { n: S.diff.gone.length, list: S.diff.gone.join(", ") }), "warn");
      });
    }
    // v1.9.0: клик по чипу порта → фильтр таблицы по «:порт»
    $$("#resStats .stat-chip--port").forEach((b) =>
      b.addEventListener("click", () => {
        const p = b.getAttribute("data-port");
        if (!p) return;
        switchTab("scan");
        const inp = $("#resFilter");
        inp.value = ":" + p;
        applyFilter(":" + p);
      })
    );
  }

  /* ───────── прогон скана ───────── */
  function setScanRunning(run) {
    S.running.scan = run;
    $("#btnRunScan").hidden = run;
    $("#btnStopScan").hidden = !run;
    $("#btnRunScanLabel").textContent = run ? t("Сканирую…") : t("Начать скан");
    $("#scanProgress").hidden = !run;
    if (!run) { $("#scanBarFill").style.width = "0%"; }
  }

  function setPhase(label, frac) {
    $("#scanPhase").textContent = label;
    const livePhase = $("#scanLivePhase");
    if (livePhase) livePhase.textContent = label;
    if (frac != null) $("#scanBarFill").style.width = Math.max(2, Math.min(100, frac)) + "%";
  }

  function appendLog(el, data) {
    el.textContent += data;
    if (el.textContent.length > 60000) el.textContent = el.textContent.slice(-40000);
    el.scrollTop = el.scrollHeight;
  }

  async function runScan() {
    if (S.running.scan) return;
    S.running.scan = true;
    setScanRunning(true);
    const s = S.scan;
    // для masque фильтры -node/-country/-exclude-* не применяются — buildScanArgs их вырезает
    if (!S.account && !IS_MOCK) {
      S.running.scan = false;
      setScanRunning(false);
      toast(t("Сначала создайте аккаунт WARP — вкладка «Аккаунт»"), "err");
      switchTab("account");
      return;
    }
    const withP = !!s.tunPing;
    const withSpeed = !!(s.speed || s.bestBySpeed);
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    S.paths.reportPath = S.paths.reportsDir + "/warpscout-report-" + ts + ".txt";
    await ensureDir(S.paths.reportsDir);

    const cmd = buildScanCmd(s);
    resetFilterSilently();
    $("#scanLog").textContent = "";
    switchSubtab("log");
    setPhase(t("Запуск warpscout…"), 2);
    startScanLive();
    // запоминаем эндпоинты прошлого скана для сравнения (diff)
    S.prevEndpoints = S.results.length ? new Set(S.results.map((r) => r.endpoint)) : null;
    S.results = [];
    renderResults();
    updateCmdPreview();
    S.scanStopped = false;
    try {
      const proc = await os().execCommand(cmd, { stream: true });
      S.procIds.scan = proc.id;
      let buf = "";
      registerProc(proc.id, (d) => {
        if (d.type === "stdout" || d.type === "stderr") {
          const data = typeof d.data === "string" ? d.data : "";
          appendLog($("#scanLog"), data);
          scanLiveFeed(data);
          buf += data;
          // прогресс
          const mPhase1 = /Phase 1: probing reachable WARP ports: (\d+)\.\.\./.exec(buf);
          const mPhase2 = /Phase 2: verifying tunnels \(proto=(\w+)\): (\d+)\.\.\./.exec(buf);
          const mSpeed = /Speedtest|speed test|Measuring speed/i.test(buf);
          const mStep = /(\d+)\/(\d+)\s*$/.exec(buf.trim());
          if (mPhase1) setPhase(t("Фаза 1: ищем проходимые порты"), null);
          if (mPhase2) setPhase(t("Фаза 2: проверяем туннели"), null);
          if (mSpeed && !mStep) setPhase(t("Замер скорости (медленно, ждите)…"), null);
          if (mStep) {
            const frac = (+mStep[1] / Math.max(1, +mStep[2])) * 100;
            setPhase(mPhase2 ? t("Фаза 2: проверяем туннели") : t("Фаза 1: ищем проходимые порты"), frac);
          }
        } else if (d.type === "exit") {
          unregisterProc(proc.id);
          setScanRunning(false);
          setPhase(S.scanStopped ? t("Остановлено") : t("Читаем отчёт…"), 100);
          if (!S.scanStopped) finishScan(withP, withSpeed, exitCodeOf(d.data));
          else toast(t("Скан остановлен"), "ok");
        }
      });
    } catch (e) {
      S.running.scan = false;
      setScanRunning(false);
      stopScanLive();
      toast(tF("Не удалось запустить warpscout: {err}", { err: e && e.message ? e.message : e }), "err");
      switchSubtab("results");
    }
  }

  async function finishScan(withP, withSpeed, exitCode) {
    let text = "";
    try {
      text = await fs().readFile(S.paths.reportPath);
    } catch (e) {
      // в демо-режиме берём отчёт, соответствующий флагам последнего «скана»
      if (IS_MOCK && window.NeutralinoMock) text = window.NeutralinoMock.lastReport || window.NeutralinoMock.report;
    }
    if (!text) {
      appendLog($("#scanLog"), "\n[GUI] " + t("Отчёт не найден — смотрим конец лога.") + "\n");
      if (exitCode !== 0) {
        toast(tF("warpscout завершился с ошибкой (код {code}). Смотрите лог — часто не хватает аккаунта или фильтры слишком строгие.", { code: exitCode }), "err");
        switchSubtab("log");
      } else {
        toast(t("Скан завершён, но отчёт пуст. Смотрите лог."), "err");
        switchSubtab("results");
      }
      return;
    }
    S.results = parseReport(text, withP, withSpeed);
    S.viewMeta = { withP, withSpeed };
    S.viewProto = S.scan.proto;
    // diff с прошлым сканом
    if (S.prevEndpoints) {
      const curSet = new Set(S.results.map((r) => r.endpoint));
      const newList = S.results.map((r) => r.endpoint).filter((ep) => !S.prevEndpoints.has(ep));
      const gone = Array.from(S.prevEndpoints).filter((ep) => !curSet.has(ep));
      S.diff = { newList, newCount: newList.length, gone };
    } else {
      S.diff = null;
    }
    S.selected = S.results.find((r) => !r.torn) ? S.results.find((r) => !r.torn).endpoint : "";
    pushHistory(S.scan.proto);
    S.staggerNext = true; // v1.7.0: строки таблицы появятся каскадом
    stopScanLive(); // v1.8.0: прячем живую панель
    renderResults();
    fillEndpointSelect();
    switchSubtab("results");
    const working = S.results.filter((r) => !r.torn).length;
    const torn = S.results.length - working;
    if (working > 0) {
      toast(torn ? tF("Скан завершён: рабочих эндпоинтов — {n}, разорванных — {t}", { n: working, t: torn }) : tF("Скан завершён: рабочих эндпоинтов — {n}", { n: working }), "ok");
    } else {
      toast(torn ? tF("Рабочих эндпоинтов не найдено ({t} разорвано). Попробуйте «Жёсткая сеть» или find-junk.", { t: torn }) : t("Рабочих эндпоинтов не найдено"), "err");
    }
  }

  async function stopScan() {
    S.scanStopped = true;
    stopScanLive(); // v1.8.0: прячем живую панель
    await killProc(S.procIds.scan);
    S.procIds.scan = null;
    setScanRunning(false);
    toast(t("Скан остановлен"), "ok");
  }

  /* ───────── конфиг-генератор ───────── */
  const DNS_PRESETS = {
    cloudflare: "1.1.1.1, 1.0.0.1",
    quad9: "9.9.9.9, 149.112.112.112",
    google: "8.8.8.8, 8.8.4.4",
    adguard: "94.140.14.14, 94.140.15.15",
    yandex: "77.88.8.8, 77.88.8.1",
  };

  const VER_HINTS = {
    wg: "Чистый WireGuard без обфускации — для сетей, где WARP не режут.",
    awg15: "AWG 1.5: junk-пакеты (Jc/Jmin/Jmax), префиксы S1–S4 и свои заголовки H1–H4 + I1.",
    awg20: "AWG 2.0: то же + CPS-пакеты I1–I5 и диапазоны заголовков (можно писать «a-b»).",
    awg31: "AWG 3.1: маскировка поведения соединения — случайные тайминги, паддинг, трейлеры. Как в конфиге-примере.",
  };

  function cfgAllowedIps() {
    switch (S.cfg.allowed) {
      case "v4": return "0.0.0.0/0";
      case "v6": return "::/0";
      case "custom": return S.cfg.allowedCustom || "0.0.0.0/0, ::/0";
      default: return "0.0.0.0/0, ::/0";
    }
  }

  function buildConf() {
    const acc = S.account;
    const c = S.cfg;
    const ver = c.ver;
    const o = c.obf;
    const lines = [];
    const sec = (name) => lines.push("[" + name + "]");
    const kv = (k, v) => lines.push(k + " = " + v);

    sec("Interface");
    kv("PrivateKey", acc ? acc.private_key : t("<запустите регистрацию на вкладке «Аккаунт»>"));
    if (acc) {
      const addr = [acc.ipv4, acc.ipv6].filter(Boolean).join(", ");
      kv("Address", addr || "172.16.0.2");
    } else {
      kv("Address", "172.16.0.2, 2606:4700:110:xxxx:xxxx:xxxx:xxxx:xxxx");
    }
    const dns = c.dns === "custom" ? c.dnsCustom : DNS_PRESETS[c.dns];
    if (dns && dns.trim()) kv("DNS", dns);
    if (c.mtu) kv("MTU", c.mtu);

    if (ver !== "wg") {
      kv("Jc", o.jc);
      kv("Jmin", o.jmin);
      kv("Jmax", o.jmax);
      kv("S1", o.s1); kv("S2", o.s2); kv("S3", o.s3); kv("S4", o.s4);
      kv("H1", o.h1); kv("H2", o.h2); kv("H3", o.h3); kv("H4", o.h4);
      if ((o.i1 || "").trim()) kv("I1", o.i1.trim());
    }
    if (ver === "awg31") {
      kv("ContentPaddingAddition", o.cpa);
      kv("RekeyAfterTime", o.rekeyAfter);
      kv("RekeyTimeout", o.rekeyTo);
      kv("RejectAfterTime", o.rejectAfter);
      kv("KeepaliveTimeout", o.keepaliveTo);
      kv("MaxHandshakeAttempts", o.maxHs);
      kv("RandomTrailers", o.trailers);
      kv("DisableCookies", o.noCookies);
      if ((o.hpk || "").trim()) kv("HeaderProtectionKey", o.hpk.trim());
    }
    if (c.tableOff) kv("Table", "off");

    lines.push("");
    sec("Peer");
    kv("PublicKey", acc ? acc.peer_public_key : "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=");
    kv("AllowedIPs", cfgAllowedIps());
    kv("Endpoint", c.endpoint || "8.47.69.43:2408");
    if (c.keepalive > 0) kv("PersistentKeepalive", c.keepalive);

    return lines.join("\n") + "\n";
  }

  function hlConf(text) {
    return esc(text)
      .replace(/^\[(.+)\]/gm, '<span class="c-sec">[$1]</span>')
      .replace(/^([A-Za-z][A-Za-z0-9]*) =/gm, '<span class="c-key">$1</span> =')
      .replace(/^(#.*)$/gm, '<span class="c-dim">$1</span>');
  }

  function renderConf() {
    const conf = buildConf();
    $("#confPreview").innerHTML = hlConf(conf);
    const ver = S.cfg.ver;
    const names = { wg: "warp-wg.conf", awg15: "warp-awg15.conf", awg20: "warp-awg20.conf", awg31: "warp-awg31.conf" };
    $("#cfgFileName").textContent = names[ver] || "warp.conf";
    $("#cfgObfCard").classList.toggle("hidden", ver === "wg");
    $("#cfgAwg31Grid").style.display = ver === "awg31" ? "" : "none";
    $("#cfgVerHint").textContent = t(VER_HINTS[ver]);
    const keys = $("#cfgKeysState");
    if (S.account) { keys.textContent = t("аккаунт загружен"); keys.className = "badge badge--accent"; }
    else { keys.textContent = t("нет аккаунта"); keys.className = "badge"; }
  }

  function fillEndpointSelect() {
    const sel = $("#cfgEndpointSel");
    const cur = sel.value;
    const options = ['<option value="">' + t("— выберите из результатов скана —") + "</option>"];
    S.results.filter((r) => !r.torn).forEach((r) => {
      options.push(
        '<option value="' + esc(r.endpoint) + '">' +
          esc(r.endpoint) + " · " + esc(r.node || "?") + " · " + esc(r.loc || r.seenAs || "?") +
        "</option>"
      );
    });
    sel.innerHTML = options.join("");
    if (cur) sel.value = cur;
    if (S.cfg.endpoint && S.results.some((r) => r.endpoint === S.cfg.endpoint && !r.torn)) {
      sel.value = S.cfg.endpoint;
    }
  }

  function pushHistory(proto) {
    const working = S.results.filter((r) => !r.torn).length;
    const torn = S.results.length - working;
    const bits = [];
    bits.push(S.scan.full ? "-f" : "-n " + (S.scan.sample || 5));
    if (S.scan.exclNode && S.scan.exclNode.trim()) bits.push("-exclude-node " + safeVal(S.scan.exclNode));
    if (S.scan.genI1) bits.push("-gen-i1 " + S.scan.genI1);
    S.history.unshift({
      ts: Date.now(),
      proto,
      label: bits.join(" "),
      working,
      torn,
      withP: S.viewMeta.withP,
      withSpeed: S.viewMeta.withSpeed,
      results: S.results.map((r) => Object.assign({}, r)),
    });
    S.history = S.history.slice(0, 10);
    renderHistoryBtn();
    if (S.historyOpen) toggleHistory(true); // v1.5.0: обновить открытую панель (тренд/список)
    persist();
  }

  function renderHistoryBtn() {
    const btn = $("#btnHistory");
    if (!btn) return;
    btn.textContent = t("🕘 История") + (S.history.length ? " (" + S.history.length + ")" : "");
  }

  /* ───────── пользовательские пресеты (v1.4.0) ───────── */
  function renderCustomPresets() {
    const box = $("#customPresetChips");
    if (!box) return;
    box.innerHTML = S.customPresets
      .map(
        (p, i) =>
          '<span class="chip chip--custom" role="button" tabindex="0" data-pi="' + i +
          '" title="' + t("Пресет: применить. ✕ — удалить") + '">' +
            '<span class="chip__custom-name">' + esc(p.name) + "</span>" +
            '<button type="button" class="chip__del" data-del-preset="' + i + '" title="' + t("Удалить пресет") + '" aria-label="' + t("Удалить пресет") + ' ' + esc(p.name) + '">✕</button>' +
          "</span>"
      )
      .join("");
    $$("#customPresetChips .chip--custom", box).forEach((el) => {
      const apply = () => {
        const p = S.customPresets[+el.getAttribute("data-pi")];
        if (!p) return;
        Object.assign(S.scan, DEFAULT_SCAN, p.scan);
        syncInputsFromState();
        updateCmdPreview();
        $$("#presetChips .chip").forEach((c) => c.classList.remove("is-active"));
        el.classList.add("is-active");
        $("#presetHint").innerHTML = tF("Пресет «<b>{name}</b>» применён. Команду можно посмотреть над кнопкой скана.", { name: esc(p.name) });
        persist();
        toast(tF("Пресет применён: {name}", { name: p.name }), "ok");
      };
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-del-preset]")) return;
        apply();
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apply(); }
      });
    });
    $$("[data-del-preset]", box).forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const i = +b.getAttribute("data-del-preset");
        const p = S.customPresets[i];
        if (!p) return;
        if (!confirm(tF('Удалить пресет "{name}"?', { name: p.name }))) return;
        S.customPresets.splice(i, 1);
        renderCustomPresets();
        persist();
        toast(t("Пресет удалён"), "ok");
      })
    );
  }

  function togglePresetSaveRow(show) {
    const row = $("#presetSaveRow");
    if (!row) return;
    row.classList.toggle("hidden", !show);
    if (show) {
      $("#presetName").value = "";
      $("#presetName").focus();
    }
  }

  function saveCurrentPreset() {
    const name = ($("#presetName").value || "").trim();
    if (!name) { toast(t("Введите название пресета"), "warn"); $("#presetName").focus(); return; }
    if (S.customPresets.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      if (!confirm(tF('Пресет "{name}" уже есть — перезаписать?', { name: name }))) return;
      S.customPresets = S.customPresets.filter((p) => p.name.toLowerCase() !== name.toLowerCase());
    }
    syncStateFromInputs();
    S.customPresets.push({ name: name, scan: Object.assign({}, S.scan) });
    if (S.customPresets.length > 20) S.customPresets = S.customPresets.slice(-20);
    renderCustomPresets();
    togglePresetSaveRow(false);
    persist();
    toast(tF("Пресет сохранён: {name}", { name: name }), "ok");
  }

  /* ───────── шаринг пресетов: экспорт/импорт JSON (v1.8.0) ───────── */
  function exportPresets() {
    if (!S.customPresets.length) {
      toast(t("Своих пресетов пока нет — сохраните хотя бы один (кнопка «＋ Свой»)"), "warn");
      return;
    }
    const json = JSON.stringify(
      { app: "WARPSCOUT GUI presets", format: 1, exportedAt: new Date().toISOString(), presets: S.customPresets },
      null,
      2
    );
    const name = "warpscout-presets-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".json";
    if (IS_MOCK) {
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("Пресеты скачаны: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Экспорт пресетов"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, json);
        toast(tF("Пресеты экспортированы: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  function applyImportedPresets(data) {
    if (!data || typeof data !== "object" || data.app !== "WARPSCOUT GUI presets" || !Array.isArray(data.presets)) {
      toast(t("Файл не похож на набор пресетов WARPSCOUT GUI"), "err");
      return;
    }
    const valid = data.presets.filter((p) => p && typeof p.name === "string" && p.name.trim() && p.scan && typeof p.scan === "object");
    if (!valid.length) {
      toast(t("В файле нет ни одного корректного пресета"), "err");
      return;
    }
    const have = new Set(S.customPresets.map((p) => p.name.toLowerCase()));
    let added = 0, dup = 0;
    valid.forEach((p) => {
      if (have.has(p.name.toLowerCase())) { dup++; return; }
      S.customPresets.push({ name: p.name.trim(), scan: Object.assign({}, DEFAULT_SCAN, p.scan) });
      have.add(p.name.toLowerCase());
      added++;
    });
    if (S.customPresets.length > 20) S.customPresets = S.customPresets.slice(-20);
    renderCustomPresets();
    persist();
    toast(dup ? tF("Импорт пресетов: добавлено {n}, пропущено (дубли) {d}", { n: added, d: dup }) : tF("Импорт пресетов: добавлено {n}", { n: added }), "ok");
  }

  function importPresets() {
    if (!IS_MOCK && HAS_NL) {
      os()
        .showOpenDialog(t("Выберите файл пресетов"), { multiSelections: false })
        .then(async (p) => {
          const picked = Array.isArray(p) ? p[0] : p;
          if (!picked) return;
          try {
            const text = await fs().readFile(picked);
            applyImportedPresets(JSON.parse(text));
          } catch (e) {
            toast(tF("Не удалось прочитать файл: {err}", { err: e && e.message ? e.message : e }), "err");
          }
        })
        .catch(() => {});
      return;
    }
    const inp = $("#importPresetsFile");
    if (!inp) return;
    inp.value = "";
    inp.click();
  }

  function bindImportPresetsFile() {
    const inp = $("#importPresetsFile");
    if (!inp) return;
    inp.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          applyImportedPresets(JSON.parse(String(reader.result)));
        } catch (err) {
          toast(tF("Некорректный JSON: {err}", { err: err && err.message ? err.message : err }), "err");
        }
      };
      reader.readAsText(file);
    });
  }

  /* ───────── живая панель скана (v1.8.0) ───────── */
  const live = { on: false, t0: 0, timer: 0, steps: [], nodes: [] };

  function startScanLive() {
    const panel = $("#scanLive");
    if (!panel) return;
    live.on = true;
    live.t0 = Date.now();
    live.steps = [];
    live.nodes = [];
    panel.classList.remove("hidden");
    $("#scanLiveNodes").innerHTML = "";
    $("#scanLiveMeta").textContent = "";
    drawScanLive();
    clearInterval(live.timer);
    live.timer = setInterval(scanLiveClock, 1000);
    scanLiveClock();
  }

  function scanLiveClock() {
    if (!live.on) return;
    const sec = Math.floor((Date.now() - live.t0) / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    const el = $("#scanLiveElapsed");
    if (el) el.textContent = mm + ":" + ss;
  }

  function scanLiveFeed(data) {
    if (!live.on) return;
    // шаги N/M → тик на графике
    let m = /(\d+)\/(\d+)\s*$/.exec(String(data).trim());
    if (m) {
      live.steps.push({ t: Date.now() - live.t0, done: +m[1], total: +m[2] });
      drawScanLive();
    }
    // узлы "node: HK HKG (188.114.98.58:2408)"
    m = /node:\s*([A-Z]{2})\s+([A-Z]{3})\s*\(([^)]+)\)/.exec(String(data));
    if (m) {
      const key = m[1] + " " + m[2];
      if (!live.nodes.some((n) => n.key === key)) {
        live.nodes.push({ key: key, ep: m[3] });
        const box = $("#scanLiveNodes");
        if (box) {
          const chip = document.createElement("span");
          chip.className = "scan-live__node is-entering";
          chip.textContent = "🛰 " + key + " · " + m[3];
          chip.title = m[1] + " / " + m[2] + " → " + m[3];
          chip.addEventListener("animationend", () => chip.classList.remove("is-entering"), { once: true });
          box.appendChild(chip);
        }
      }
    }
    const meta = $("#scanLiveMeta");
    if (meta && live.steps.length) {
      const last = live.steps[live.steps.length - 1];
      meta.textContent = t("шагов") + " " + last.done + "/" + last.total + " · " + t("узлов") + " " + live.nodes.length;
    }
  }

  function drawScanLive() {
    const cv = $("#scanLiveCanvas");
    if (!cv || !cv.getContext) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 300;
    const h = 46;
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // сетка-подложка
    ctx.strokeStyle = "rgba(242,124,32,0.12)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += 28) {
      ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, h); ctx.stroke();
    }
    if (live.steps.length < 1) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "11px " + (getComputedStyle(document.body).fontFamily || "sans-serif");
      ctx.fillText(t("Ждём первый шаг прогресса…"), 8, h / 2 + 4);
      return;
    }
    const T = Math.max(8000, live.steps[live.steps.length - 1].t);
    const maxY = Math.max(1, live.steps[live.steps.length - 1].done);
    const X = (t) => 4 + (t / T) * (w - 8);
    const Y = (v) => h - 5 - (v / maxY) * (h - 14);
    // заливка под линией
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(246,139,49,0.35)");
    grad.addColorStop(1, "rgba(246,139,49,0.02)");
    ctx.beginPath();
    ctx.moveTo(X(live.steps[0].t), h - 2);
    live.steps.forEach((p) => ctx.lineTo(X(p.t), Y(p.done)));
    ctx.lineTo(X(live.steps[live.steps.length - 1].t), h - 2);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    // линия
    ctx.beginPath();
    live.steps.forEach((p, i) => (i ? ctx.lineTo(X(p.t), Y(p.done)) : ctx.moveTo(X(p.t), Y(p.done))));
    ctx.strokeStyle = "#f68b31";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();
    // точки
    live.steps.forEach((p) => {
      ctx.beginPath();
      ctx.arc(X(p.t), Y(p.done), 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffb06a";
      ctx.fill();
    });
  }

  function stopScanLive() {
    live.on = false;
    clearInterval(live.timer);
    const panel = $("#scanLive");
    if (panel) panel.classList.add("hidden");
  }

  /* ───────── Δ-сравнение с записью истории (v1.4.0) ───────── */
  function compareWithHistory(i) {
    const h = S.history[i];
    if (!h) return;
    const cur = new Set(S.results.map((r) => r.endpoint));
    const old = new Set(h.results.map((r) => r.endpoint));
    const newList = Array.from(cur).filter((ep) => !old.has(ep));
    const goneList = Array.from(old).filter((ep) => !cur.has(ep));
    const fmt = (list) => list.slice(0, 6).join(", ") + (list.length > 6 ? " … +" + (list.length - 6) : "");
    const panel =
      '<div class="history__cmp">' +
        '<div class="history__cmp-title">' + t("Δ сравнение с текущей таблицей:") + "</div>" +
        '<div class="history__cmp-row">' +
          '<span class="is-ok">' + t("➕ новых: ") + "<b>" + newList.length + "</b></span>" +
          (newList.length ? '<span class="history__cmp-list">' + esc(fmt(newList)) + "</span>" : "") +
        "</div>" +
        '<div class="history__cmp-row">' +
          '<span class="is-err">' + t("➖ пропали: ") + "<b>" + goneList.length + "</b></span>" +
          (goneList.length ? '<span class="history__cmp-list">' + esc(fmt(goneList)) + "</span>" : "") +
        "</div>" +
      "</div>";
    // вставляем/заменяем панель сравнения после нужного элемента
    const item = $('#historyPanel .history__item[data-hi="' + i + '"]');
    if (!item) return;
    const oldPanel = $("#historyPanel .history__cmp");
    if (oldPanel) oldPanel.remove();
    item.insertAdjacentHTML("afterend", panel);
    if (!newList.length && !goneList.length) {
      toast(t("Различий нет — наборы эндпоинтов совпадают"), "ok");
    } else {
      toast(tF("Δ: новых {n}, пропали {g}", { n: newList.length, g: goneList.length }), "info");
    }
  }

  /* ───────── компактная таблица (v1.4.0) ───────── */
  function applyCompact() {
    const wrap = $("#resultsTable");
    if (!wrap) return;
    wrap.classList.toggle("is-compact", !!S.compact);
    const btn = $("#btnDensity");
    if (btn) btn.classList.toggle("is-toggled", !!S.compact);
  }

  function toggleCompact() {
    S.compact = !S.compact;
    applyCompact();
    persist();
    toast(S.compact ? "Компактная таблица включена" : "Обычная таблица", "info");
  }

  /* ───────── QR-код конфига (v1.4.0) ───────── */
  function toggleQr(open) {
    const m = $("#qrModal");
    if (m) m.classList.toggle("hidden", !open);
  }

  function showConfQr() {
    if (typeof window.qrcode !== "function") { toast(t("QR-модуль не загружен"), "err"); return; }
    const conf = buildConf();
    try {
      const qr = window.qrcode(0, "L"); // L — максимальная ёмкость (2953 байта)
      qr.addData(conf);
      qr.make();
      $("#qrBox").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
      toggleQr(true);
    } catch (e) {
      toast(tF("Конфиг {n} симв. — не помещается в QR (лимит 2953). Обычно виноват длинный I1: уберите его или сохраните конфиг файлом.", { n: conf.length }), "err");
    }
  }

  async function saveQrPng() {
    if (typeof window.qrcode !== "function") return;
    try {
      const qr = window.qrcode(0, "M");
      qr.addData(buildConf());
      qr.make();
      const cell = 6, margin = 4, count = qr.getModuleCount();
      const size = (count + margin * 2) * cell;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#000000";
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
        }
      }
      const dataUrl = canvas.toDataURL("image/png");
      const name = ($( "#cfgFileName").textContent || "warp.conf").replace(/\.conf$/, "") + "-qr.png";
      if (IS_MOCK) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast(tF("PNG скачан: {path}", { path: name }), "ok");
        return;
      }
      const path = await os().showSaveDialog(t("Сохранить QR-код"), { defaultPath: name });
      if (!path) return;
      const base64 = dataUrl.split(",")[1];
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (fs().writeBinaryFile) await fs().writeBinaryFile(path, bytes.buffer);
      else await fs().writeFile(path, dataUrl);
      toast(tF("QR сохранён: {path}", { path: path }), "ok");
    } catch (e) {
      toast(tF("Не удалось построить QR: {err}", { err: e && e.message ? e.message : e }), "err");
    }
  }

  /* ───────── резервная копия состояния (v1.4.0) ───────── */
  function snapshotState() {
    return JSON.stringify({
      app: "WARPSCOUT GUI",
      format: 2,
      exportedAt: new Date().toISOString(),
      scan: S.scan,
      cfg: S.cfg,
      settings: S.settings,
      customPresets: S.customPresets,
      compact: S.compact,
      history: S.history.slice(0, 10),
      qcHistory: S.qcHistory.slice(0, 50),
    });
  }

  function exportState() {
    const json = snapshotState();
    const name = "warpscout-backup-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".json";
    if (IS_MOCK) {
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("Резервная копия скачана: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Резервная копия WARPSCOUT GUI"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, json);
        toast(tF("Копия сохранена: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  function applyImportedState(st) {
    if (!st || typeof st !== "object" || (!st.scan && !st.cfg)) {
      toast(t("Файл не похож на резервную копию WARPSCOUT GUI"), "err");
      return;
    }
    if (st.scan) S.scan = Object.assign({}, DEFAULT_SCAN, st.scan);
    if (st.cfg) S.cfg = deepMerge(S.cfg, st.cfg);
    if (st.settings) S.settings = Object.assign({}, S.settings, st.settings);
    if (Array.isArray(st.customPresets)) S.customPresets = st.customPresets.filter((p) => p && p.name && p.scan).slice(0, 20);
    S.compact = !!st.compact;
    if (Array.isArray(st.history)) S.history = st.history.slice(0, 10);
    if (Array.isArray(st.qcHistory)) S.qcHistory = st.qcHistory.filter((q) => q && q.ep && q.kind).slice(0, 50);
    applyTheme(S.settings.theme || "dark");
    applyCompact();
    syncInputsFromState();
    syncCfgInputsFromState();
    updateCmdPreview();
    renderResults();
    renderConf();
    renderCustomPresets();
    renderHistoryBtn();
    persist();
    toast(t("Настройки восстановлены из копии"), "ok");
  }

  function importState() {
    if (!IS_MOCK && HAS_NL) {
      os()
        .showOpenDialog(t("Выберите файл резервной копии"), { multiSelections: false })
        .then(async (p) => {
          let picked = Array.isArray(p) ? p[0] : p;
          if (!picked) return;
          try {
            const text = await fs().readFile(picked);
            applyImportedState(JSON.parse(text));
          } catch (e) {
            toast(tF("Не удалось прочитать файл: {err}", { err: e && e.message ? e.message : e }), "err");
          }
        })
        .catch(() => {});
      return;
    }
    $("#importStateFile").value = "";
    $("#importStateFile").click();
  }

  function bindImportStateFile() {
    $("#importStateFile").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          applyImportedState(JSON.parse(String(reader.result)));
        } catch (err) {
          toast(tF("Некорректный JSON: {err}", { err: err && err.message ? err.message : err }), "err");
        }
      };
      reader.readAsText(file);
    });
  }

  function toggleKbd(open) {
    const m = $("#kbdModal");
    if (m) m.classList.toggle("hidden", !open);
  }

  /* ───────── тема (v1.3.0) ───────── */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t === "light" ? "light" : "dark");
    const b = $("#btnTheme");
    if (b) b.textContent = t === "light" ? "🌙 Тёмная тема" : "☀ Светлая тема";
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = cur === "light" ? "dark" : "light";
    S.settings.theme = next;
    applyTheme(next);
    persist();
    toast(next === "light" ? "Светлая тема включена" : "Тёмная тема включена", "ok");
  }

  function toggleHistory(force) {
    S.historyOpen = force != null ? force : !S.historyOpen;
    const panel = $("#historyPanel");
    panel.classList.toggle("hidden", !S.historyOpen);
    if (!S.historyOpen) return;
    if (!S.history.length) {
      panel.innerHTML = '<div class="history__empty">' + t("История пуста — выполните первый скан.") + "</div>";
      return;
    }
    panel.innerHTML =
      '<div class="history__head">' +
        '<span class="history__head-title">' + t("Последние сканы (хранятся локально, до 10)") + "</span>" +
        '<span class="history__tools">' +
          '<button type="button" id="btnHistCmp" title="' + t("Сравнить два скана из истории (модалка)") + '">' + t("⇅ сравнить") + "</button>" +
          '<button type="button" id="btnHistCsv" title="' + t("Сохранить итоги истории (CSV)") + '">' + t("⬇ CSV (итоги)") + "</button>" +
          '<button type="button" id="btnHistExport" title="' + t("Выгрузить всю историю в JSON-файл") + '">⬇ JSON</button>' +
          '<button type="button" id="btnHistClear" class="history__clear" title="' + t("Удалить всю историю") + '">' + t("🗑 Очистить") + "</button>" +
        "</span>" +
      "</div>" +
      renderPingTrend() +
      S.history
        .map(
          (h, i) =>
            '<button type="button" class="history__item" data-hi="' + i + '">' +
              "<span class=\"history__ts\">" + fmtTime(h.ts) + "</span>" +
              "<span class=\"history__proto\">" + esc(h.proto.toUpperCase()) + "</span>" +
              "<span class=\"history__label\">" + esc(h.label) + "</span>" +
              '<span class="history__cnt ' + (h.working ? "is-ok" : "is-err") + '">' +
                h.working + " " + t("рабочих") + (h.torn ? " / " + h.torn + " " + t("разорвано") : "") +
              "</span>" +
              '<span class="history__cmp-btn" role="button" tabindex="0" data-cmp="' + i +
              '" title="' + t("Δ сравнить с текущей таблицей (без загрузки)") + '">Δ</span>' +
            "</button>"
        )
        .join("");
    const bExp = $("#btnHistExport");
    if (bExp) bExp.addEventListener("click", exportHistory);
    const bCsv = $("#btnHistCsv");
    if (bCsv) bCsv.addEventListener("click", exportHistoryCsv);
    const bCmp = $("#btnHistCmp");
    if (bCmp) bCmp.addEventListener("click", openCompare);
    const bTrCsv = $("#btnTrendCsv");
    if (bTrCsv) bTrCsv.addEventListener("click", (e) => { e.stopPropagation(); exportTrendCsv(); });
    const bTrPng = $("#btnTrendPng");
    if (bTrPng) bTrPng.addEventListener("click", (e) => { e.stopPropagation(); exportTrendPng(); });
    const bTrSvg = $("#btnTrendSvg");
    if (bTrSvg) bTrSvg.addEventListener("click", (e) => { e.stopPropagation(); exportTrendSvg(); });
    const bClr = $("#btnHistClear");
    if (bClr) bClr.addEventListener("click", clearHistory);
    $$(".history__item", panel).forEach((b) =>
      b.addEventListener("click", (e) => {
        if (e.target.closest("[data-cmp]")) return;
        loadHistory(+b.getAttribute("data-hi"));
      })
    );
    $$("[data-cmp]", panel).forEach((c) =>
      c.addEventListener("click", (e) => {
        e.stopPropagation();
        compareWithHistory(+c.getAttribute("data-cmp"));
      })
    );
    $$("[data-trend]", panel).forEach((d) => {
      const go = (e) => {
        e.stopPropagation();
        loadHistory(+d.getAttribute("data-trend"));
      };
      d.addEventListener("click", go);
      d.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") go(e); });
    });
    // v2.0.0: журнал ⚡-проверок — отдельный блок под списком сканов
    renderQcJournal();
  }

  function exportHistory() {
    if (!S.history.length) { toast(t("История пуста — нечего выгружать"), "err"); return; }
    const payload = { app: "WARPSCOUT GUI", format: 1, exportedAt: new Date().toISOString(), scans: S.history };
    const json = JSON.stringify(payload, null, 2);
    const name = "warpscout-history-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".json";
    if (IS_MOCK) {
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("История выгружена: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Выгрузить историю сканов (JSON)"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, json);
        toast(tF("История сохранена: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  /* ───────── итоги истории в CSV (v1.6.0) ───────── */
  function exportHistoryCsv() {
    if (!S.history.length) { toast(t("История пуста — нечего выгружать"), "err"); return; }
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const rows = ["datetime,proto,params,working,torn,best_ping_ms"];
    for (let i = S.history.length - 1; i >= 0; i--) {
      const h = S.history[i];
      const best = histBestPing(h);
      rows.push(
        [new Date(h.ts).toISOString(), h.proto, h.label, h.working, h.torn, best === Infinity ? "" : best]
          .map(q).join(",")
      );
    }
    const csv = "\ufeff" + rows.join("\r\n");
    const name = "warpscout-history-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".csv";
    if (IS_MOCK) {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("История CSV выгружена: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Сохранить итоги истории (CSV)"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, csv);
        toast(tF("История CSV сохранена: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  async function clearHistory() {
    if (!S.history.length) { toast(t("История и так пуста"), "ok"); return; }
    if (!confirm(tF("Удалить всю историю сканов ({n})? Текущая таблица результатов останется.", { n: S.history.length }))) return;
    S.history = [];
    renderHistoryBtn();
    toggleHistory(true); // перерисовать открытую панель
    persist();
    toast(t("История очищена"), "ok");
  }

  /* ───────── CSV динамики пинга (v1.7.0) ───────── */
  function exportTrendCsv() {
    const pts = [];
    for (let i = S.history.length - 1; i >= 0; i--) {
      const b = histBestPing(S.history[i]);
      if (b !== Infinity) pts.push({ ts: S.history[i].ts, ping: b });
    }
    if (pts.length < 1) { toast(t("Нет сканов с пингами — тренд пуст"), "err"); return; }
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const rows = ["datetime,best_ping_ms"];
    pts.forEach((p) => rows.push([new Date(p.ts).toISOString(), p.ping].map(q).join(",")));
    const csv = "\ufeff" + rows.join("\r\n");
    const name = "warpscout-ping-trend-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".csv";
    if (IS_MOCK) {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("Тренд CSV выгружен: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Сохранить динамику пинга (CSV)"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, csv);
        toast(tF("Тренд CSV сохранён: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  /* ───────── PNG графика тренда (v1.9.0) ───────── */
  function trendPoints() {
    const pts = [];
    for (let i = S.history.length - 1; i >= 0; i--) {
      const b = histBestPing(S.history[i]);
      if (b !== Infinity) pts.push({ ts: S.history[i].ts, ping: b });
    }
    return pts;
  }

  function drawTrendChart(pts) {
    const W = 960, H = 380;
    const PADL = 78, PADR = 30, PADT = 104, PADB = 64;
    const scale = 2; // ретина-качество
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const bg = light ? "#f2eee6" : "#141416";
    const card = light ? "#fffdf8" : "#1d1d21";
    const ink = light ? "#26221c" : "#f0ede6";
    const sub = light ? "#6e675c" : "#9d968c";
    const grid = light ? "rgba(38,34,28,.12)" : "rgba(240,237,230,.12)";
    const accent = "#ff7a1a";
    const accentSoft = light ? "rgba(255,122,26,.22)" : "rgba(255,122,26,.28)";
    // фон + карточка
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = card;
    ctx.beginPath();
    const rx = 14;
    ctx.moveTo(rx, 22);
    ctx.arcTo(W - 22, 22, W - 22, H - 22, rx);
    ctx.arcTo(W - 22, H - 22, 22, H - 22, rx);
    ctx.arcTo(22, H - 22, 22, 22, rx);
    ctx.arcTo(22, 22, W - 22, 22, rx);
    ctx.fill();
    // шапка: заголовок слева, min/max справа на той же строке
    const pings0 = pts.map((p) => p.ping);
    const min0 = Math.min.apply(null, pings0);
    const max0 = Math.max.apply(null, pings0);
    ctx.fillStyle = ink;
    ctx.font = "600 21px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("WARPSCOUT GUI — " + t("↘ динамика лучшего пинга"), 44, 58);
    ctx.textAlign = "right";
    ctx.fillStyle = accent;
    ctx.font = "600 14px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("min " + min0 + " · max " + max0 + " ms", W - 44, 58);
    ctx.textAlign = "left";
    ctx.fillStyle = sub;
    ctx.font = "13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(pts.length + " " + t("сканов с пингами"), 44, 82);
    // данные
    const pings = pts.map((p) => p.ping);
    const min = Math.min.apply(null, pings);
    const max = Math.max.apply(null, pings);
    const span = Math.max(1, max - min);
    const lo = Math.max(0, min - span * 0.15);
    const hi = max + span * 0.15;
    const fmtV = (v) => (hi - lo < 8 ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v)));
    const xAt = (i) => PADL + (i / Math.max(1, pts.length - 1)) * (W - PADL - PADR);
    const yAt = (v) => H - PADB - ((v - lo) / Math.max(1, hi - lo)) * (H - PADT - PADB);
    // сетка + подписи оси Y
    ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "right";
    for (let g = 0; g <= 4; g++) {
      const v = lo + ((hi - lo) * g) / 4;
      const y = yAt(v);
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADL, y);
      ctx.lineTo(W - PADR, y);
      ctx.stroke();
      ctx.fillStyle = sub;
      ctx.fillText(fmtV(v) + " ms", PADL - 10, y + 4);
    }
    ctx.textAlign = "left";
    // area
    const grad = ctx.createLinearGradient(0, PADT, 0, H - PADB);
    grad.addColorStop(0, accentSoft);
    grad.addColorStop(1, "rgba(255,122,26,0)");
    ctx.beginPath();
    ctx.moveTo(xAt(0), H - PADB);
    pts.forEach((p, i) => ctx.lineTo(xAt(i), yAt(p.ping)));
    ctx.lineTo(xAt(pts.length - 1), H - PADB);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    // линия
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(xAt(i), yAt(p.ping)) : ctx.moveTo(xAt(i), yAt(p.ping))));
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();
    // точки
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(xAt(i), yAt(p.ping), 5, 0, Math.PI * 2);
      ctx.fillStyle = p.ping === min ? accent : card;
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
    // подписи дат (первая/последняя) — над футером, без пересечений
    ctx.fillStyle = sub;
    ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
    const stamp = (iso) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");
    ctx.textAlign = "left";
    ctx.fillText(stamp(pts[0].ts), PADL, H - PADB + 24);
    ctx.textAlign = "right";
    ctx.fillText(stamp(pts[pts.length - 1].ts), W - PADR, H - PADB + 24);
    ctx.textAlign = "left";
    // футер
    ctx.fillStyle = sub;
    ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("WARPSCOUT GUI · " + new Date().toISOString().slice(0, 19).replace("T", " "), 44, H - 20);
    return canvas;
  }

  async function exportTrendPng() {
    const pts = trendPoints();
    if (pts.length < 2) { toast(t("Нужно минимум 2 скана с пингами"), "warn"); return; }
    try {
      const canvas = drawTrendChart(pts);
      const dataUrl = canvas.toDataURL("image/png");
      const name = "warpscout-ping-trend-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".png";
      if (IS_MOCK) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast(tF("Тренд PNG скачан: {path}", { path: name }), "ok");
        return;
      }
      const path = await os().showSaveDialog(t("Сохранить динамику пинга (PNG)"), { defaultPath: name });
      if (!path) return;
      const base64 = dataUrl.split(",")[1];
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (fs().writeBinaryFile) await fs().writeBinaryFile(path, bytes.buffer);
      else await fs().writeFile(path, dataUrl);
      toast(tF("Тренд PNG сохранён: {path}", { path: path }), "ok");
    } catch (e) {
      toast(tF("Ошибка экспорта PNG: {err}", { err: e && e.message ? e.message : e }), "err");
    }
  }

  /* ───────── SVG графика тренда (v2.0.0) ───────── */
  // Векторная копия drawTrendChart: тот же макет (шапка/сетка/градиент/точки/футер),
  // но файл масштабируется без потери качества и следует теме приложения.
  function buildTrendSvg(pts) {
    const W = 960, H = 380;
    const PADL = 78, PADR = 30, PADT = 104, PADB = 64;
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const bg = light ? "#f2eee6" : "#141416";
    const card = light ? "#fffdf8" : "#1d1d21";
    const ink = light ? "#26221c" : "#f0ede6";
    const sub = light ? "#6e675c" : "#9d968c";
    const grid = light ? "rgba(38,34,28,.12)" : "rgba(240,237,230,.12)";
    const accent = "#ff7a1a";
    const gradTop = light ? "rgba(255,122,26,.22)" : "rgba(255,122,26,.28)";
    const escX = (s) => esc(String(s));
    const pings = pts.map((p) => p.ping);
    const min = Math.min.apply(null, pings);
    const max = Math.max.apply(null, pings);
    const span = Math.max(1, max - min);
    const lo = Math.max(0, min - span * 0.15);
    const hi = max + span * 0.15;
    const fmtV = (v) => (hi - lo < 8 ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v)));
    const xAt = (i) => PADL + (i / Math.max(1, pts.length - 1)) * (W - PADL - PADR);
    const yAt = (v) => H - PADB - ((v - lo) / Math.max(1, hi - lo)) * (H - PADT - PADB);
    const f = (v) => v.toFixed(1);
    // сетка + подписи
    let gridEls = "";
    for (let g = 0; g <= 4; g++) {
      const v = lo + ((hi - lo) * g) / 4;
      const y = yAt(v);
      gridEls +=
        '<line x1="' + PADL + '" y1="' + f(y) + '" x2="' + (W - PADR) + '" y2="' + f(y) + '" stroke="' + grid + '" stroke-width="1"/>' +
        '<text x="' + (PADL - 10) + '" y="' + f(y + 4) + '" text-anchor="end" font-size="12" fill="' + sub + '" font-family="\'Segoe UI\', system-ui, sans-serif">' + escX(fmtV(v) + " ms") + "</text>";
    }
    const linePts = pts.map((p, i) => f(xAt(i)) + "," + f(yAt(p.ping))).join(" ");
    const areaPts = f(xAt(0)) + "," + (H - PADB) + " " + linePts + " " + f(xAt(pts.length - 1)) + "," + (H - PADB);
    const dots = pts
      .map((p, i) => {
        const isMin = p.ping === min;
        return (
          '<circle cx="' + f(xAt(i)) + '" cy="' + f(yAt(p.ping)) + '" r="5" fill="' + (isMin ? accent : card) + '" stroke="' + accent + '" stroke-width="2.5"><title>' +
          escX(fmtTime(p.ts) + " — " + p.ping + " ms") + "</title></circle>"
        );
      })
      .join("");
    const stamp = (iso) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");
    const min0 = Math.min.apply(null, pings);
    const max0 = Math.max.apply(null, pings);
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">' +
        "<defs><linearGradient id=\"tsg\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
          '<stop offset="0" stop-color="' + gradTop + '"/><stop offset="1" stop-color="rgba(255,122,26,0)"/>' +
        "</linearGradient></defs>" +
        '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>' +
        '<rect x="22" y="22" width="' + (W - 44) + '" height="' + (H - 44) + '" rx="14" fill="' + card + '"/>' +
        '<text x="44" y="58" font-size="21" font-weight="600" fill="' + ink + '" font-family="\'Segoe UI\', system-ui, sans-serif">' + escX("WARPSCOUT GUI — " + t("↘ динамика лучшего пинга")) + "</text>" +
        '<text x="' + (W - 44) + '" y="58" text-anchor="end" font-size="14" font-weight="600" fill="' + accent + '" font-family="\'Segoe UI\', system-ui, sans-serif">min ' + min0 + " · max " + max0 + " ms</text>" +
        '<text x="44" y="82" font-size="13" fill="' + sub + '" font-family="\'Segoe UI\', system-ui, sans-serif">' + escX(pts.length + " " + t("сканов с пингами")) + "</text>" +
        gridEls +
        '<polygon points="' + areaPts + '" fill="url(#tsg)"/>' +
        '<polyline points="' + linePts + '" fill="none" stroke="' + accent + '" stroke-width="3" stroke-linejoin="round"/>' +
        dots +
        '<text x="' + PADL + '" y="' + (H - PADB + 24) + '" font-size="12" fill="' + sub + '" font-family="\'Segoe UI\', system-ui, sans-serif">' + escX(stamp(pts[0].ts)) + "</text>" +
        '<text x="' + (W - PADR) + '" y="' + (H - PADB + 24) + '" text-anchor="end" font-size="12" fill="' + sub + '" font-family="\'Segoe UI\', system-ui, sans-serif">' + escX(stamp(pts[pts.length - 1].ts)) + "</text>" +
        '<text x="44" y="' + (H - 20) + '" font-size="11" fill="' + sub + '" font-family="\'Segoe UI\', system-ui, sans-serif">WARPSCOUT GUI · ' + new Date().toISOString().slice(0, 19).replace("T", " ") + "</text>" +
      "</svg>"
    );
  }

  async function exportTrendSvg() {
    const pts = trendPoints();
    if (pts.length < 2) { toast(t("Нужно минимум 2 скана с пингами"), "warn"); return; }
    try {
      const svg = buildTrendSvg(pts);
      const name = "warpscout-ping-trend-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".svg";
      if (IS_MOCK) {
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
        toast(tF("Тренд SVG скачан: {path}", { path: name }), "ok");
        return;
      }
      const path = await os().showSaveDialog(t("Сохранить динамику пинга (SVG)"), { defaultPath: name });
      if (!path) return;
      await fs().writeFile(path, svg);
      toast(tF("Тренд SVG сохранён: {path}", { path: path }), "ok");
    } catch (e) {
      toast(tF("Ошибка экспорта SVG: {err}", { err: e && e.message ? e.message : e }), "err");
    }
  }

  /* ───────── «Поделиться сканом»: автономный HTML-отчёт (v2.0.0) ───────── */
  function exportScanHtml() {
    if (!S.results.length) { toast(t("Нет результатов — нечего сохранять в HTML"), "err"); return; }
    const rows = S.results.slice();
    const working = rows.filter((r) => !r.torn);
    const torn = rows.length - working.length;
    const pings = working.map((r) => pingMs(r.tunPing || r.ping)).filter((v) => v !== Infinity).sort((a, b) => a - b);
    const best = pings.length ? pings[0] : 0;
    const median = pings.length ? pings[Math.floor(pings.length / 2)] : 0;
    let bestEp = "";
    if (working.length) {
      let bv = Infinity;
      working.forEach((r) => { const v = pingMs(r.tunPing || r.ping); if (v < bv) { bv = v; bestEp = r.endpoint; } });
    }
    const withP = S.viewMeta.withP;
    const withSpeed = S.viewMeta.withSpeed;
    const proto = (S.viewProto || S.scan.proto || "awg").toUpperCase();
    const when = new Date();
    const td = (v, cls) => '<td' + (cls ? ' class="' + cls + '"' : "") + ">" + esc(v == null || v === "" ? "—" : String(v)) + "</td>";
    const bodyRows = rows
      .map((r) => {
        const cls = r.torn ? "torn" : r.endpoint === bestEp ? "best" : "";
        return (
          "<tr" + (cls ? ' class="' + cls + '"' : "") + ">" +
          td((r.endpoint === bestEp ? "★ " : "") + r.endpoint, "mono") +
          td(r.ping || "?") +
          (withP ? td(r.tunPing || "?") + td(r.loss || "?") : "") +
          (withSpeed ? td(r.speed) : "") +
          td(r.seenAs) + td(r.node) + td(r.loc) +
          "</tr>"
        );
      })
      .join("\n");
    const html =
      "<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"utf-8\"/>\n" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>\n" +
      "<title>WARPSCOUT GUI — отчёт скана · " + when.toISOString().slice(0, 16).replace("T", " ") + "</title>\n" +
      "<style>\n" +
      ":root{color-scheme:dark}\n" +
      "*{box-sizing:border-box}\n" +
      "body{margin:0;padding:32px 20px;background:#141416;color:#f0ede6;font:14px/1.5 'Segoe UI',system-ui,sans-serif}\n" +
      ".card{max-width:980px;margin:0 auto;background:#1d1d21;border:1px solid rgba(240,237,230,.1);border-radius:16px;padding:28px}\n" +
      "h1{margin:0 0 6px;font-size:22px}\n" +
      ".brand{color:#ff7a1a;font-weight:700}\n" +
      ".meta{color:#9d968c;font-size:13px;margin-bottom:18px}\n" +
      ".chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}\n" +
      ".chip{border:1px solid rgba(240,237,230,.16);border-radius:999px;padding:4px 12px;font-size:12.5px;color:#cfc9bf}\n" +
      ".chip b{color:#f0ede6}\n" +
      ".chip.ok{border-color:rgba(64,192,110,.5);color:#7fd9a0}\n" +
      ".chip.err{border-color:rgba(224,82,82,.5);color:#f09a9a}\n" +
      ".chip.acc{border-color:rgba(255,122,26,.55);color:#ffb37a}\n" +
      "table{width:100%;border-collapse:collapse;font-size:13px}\n" +
      "th{ text-align:left;padding:8px 10px;border-bottom:1px solid rgba(240,237,230,.16);color:#9d968c;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase}\n" +
      "td{padding:7px 10px;border-bottom:1px solid rgba(240,237,230,.07)}\n" +
      "tr.torn td{color:#8d877d;text-decoration:line-through}\n" +
      "tr.best td{color:#ffcf9e;background:rgba(255,122,26,.06)}\n" +
      ".mono{font-family:ui-monospace,Consolas,monospace}\n" +
      ".foot{margin-top:18px;color:#6e675c;font-size:12px}\n" +
      "@media (max-width:640px){body{padding:12px 6px}.card{padding:16px}table{font-size:12px}td,th{padding:5px 6px}}\n" +
      "</style>\n</head>\n<body>\n<div class=\"card\">\n" +
      "<h1><span class=\"brand\">WARPSCOUT GUI</span> — " + esc(t("отчёт скана")) + "</h1>\n" +
      '<div class="meta">' + esc(when.toISOString().slice(0, 19).replace("T", " ") + " UTC · протокол " + proto) + "</div>\n" +
      '<div class="chips">' +
        '<span class="chip">' + esc(t("📡 всего")) + " <b>" + rows.length + "</b></span>" +
        '<span class="chip ok">' + esc(t("✅ рабочих")) + " <b>" + working.length + "</b></span>" +
        (torn ? '<span class="chip err">' + esc(t("✂ разорвано")) + " <b>" + torn + "</b></span>" : "") +
        (best ? '<span class="chip acc">' + esc(t("⚡ лучший")) + " <b>" + best + " ms</b></span>" : "") +
        (median ? '<span class="chip">' + esc(t("⚖ медиана")) + " <b>" + median + " ms</b></span>" : "") +
      "</div>\n" +
      "<table>\n<thead><tr><th>ENDPOINT</th><th>PING</th>" + (withP ? "<th>TUN PING</th><th>LOSS</th>" : "") + (withSpeed ? "<th>SPEED</th>" : "") + "<th>SEEN AS</th><th>NODE</th><th>" + esc(t("Локация узла")) + "</th></tr></thead>\n<tbody>\n" +
      bodyRows +
      "\n</tbody></table>\n" +
      '<div class="foot">' + esc(tF("Сгенерировано WARPSCOUT GUI v{v} · {d} · снимок текущей таблицы результатов", { v: "2.0.0", d: when.toISOString().slice(0, 10) })) + "</div>\n" +
      "</div>\n</body>\n</html>";
    const name = "warpscout-report-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".html";
    if (IS_MOCK) {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("HTML-отчёт выгружен: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Сохранить HTML-отчёт"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, html);
        toast(tF("HTML-отчёт сохранён: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  /* ───────── модалка ⇅-сравнения двух сканов (v1.7.0) ───────── */
  function toggleCmp(open) {
    const m = $("#cmpModal");
    if (m) m.classList.toggle("hidden", !open);
  }

  function histOptionLabel(h) {
    return fmtTime(h.ts) + " · " + h.proto.toUpperCase() + " · " + h.working + " " + t("рабочих") + (h.torn ? " / " + h.torn + " " + t("разорвано") : "");
  }

  function fillCmpSelectors(aIdx, bIdx) {
    const selA = $("#cmpSelA");
    const selB = $("#cmpSelB");
    if (!selA || !selB) return;
    const opts = S.history
      .map((h, i) => '<option value="' + i + '">' + esc(histOptionLabel(h)) + "</option>")
      .join("");
    selA.innerHTML = opts;
    selB.innerHTML = opts;
    // по умолчанию: A — более старый скан, B — более новый (или соседние записи)
    const n = S.history.length;
    selA.value = String(Math.min(aIdx != null ? aIdx : n - 1, n - 1));
    selB.value = String(Math.min(bIdx != null ? bIdx : n - 2, n - 1));
  }

  function renderCmpBody() {
    const box = $("#cmpBody");
    const selA = $("#cmpSelA");
    const selB = $("#cmpSelB");
    if (!box || !selA || !selB) return;
    const hA = S.history[+selA.value];
    const hB = S.history[+selB.value];
    if (!hA || !hB) { box.innerHTML = '<div class="cmp-empty">' + t("Нужно как минимум два скана в истории.") + "</div>"; return; }

    const mapA = {};
    hA.results.forEach((r) => { mapA[r.endpoint] = r; });
    const mapB = {};
    hB.results.forEach((r) => { mapB[r.endpoint] = r; });

    const epsA = new Set(hA.results.map((r) => r.endpoint));
    const epsB = new Set(hB.results.map((r) => r.endpoint));
    const common = Array.from(epsA).filter((ep) => epsB.has(ep));
    const onlyA = Array.from(epsA).filter((ep) => !epsB.has(ep));
    const onlyB = Array.from(epsB).filter((ep) => !epsA.has(ep));

    const bestA = histBestPing(hA);
    const bestB = histBestPing(hB);
    const deltaBest = bestA !== Infinity && bestB !== Infinity ? bestA - bestB : null;

    // строки по общим эндпоинтам с Δ-пингом
    const deltaRows = common
      .map((ep) => {
        const a = mapA[ep];
        const b = mapB[ep];
        if (a.torn || b.torn) return { ep, cls: "is-torn", text: a.torn && b.torn ? t("разорван → разорван") : t("статус изменился") };
        const pa = pingMs(a.tunPing || a.ping);
        const pb = pingMs(b.tunPing || b.ping);
        if (pa === Infinity || pb === Infinity) return null;
        const d = pa - pb;
        return { ep, pa, pb, d, cls: d < 0 ? "is-better" : d > 0 ? "is-worse" : "is-same" };
      })
      .filter(Boolean)
      .sort((x, y) => (x.d != null && y.d != null ? x.d - y.d : 0));

    const dAbs = deltaBest == null ? "" : Math.abs(deltaBest);
    const bestBlock =
      '<div class="cmp-best">' +
        '<div class="cmp-best__card">' +
          '<span class="cmp-best__label">' + t("лучший пинг A") + "</span>" +
          '<span class="cmp-best__val">' + (bestA === Infinity ? "—" : bestA + " ms") + "</span>" +
        "</div>" +
        '<div class="cmp-best__delta ' + (deltaBest == null ? "" : deltaBest > 0 ? "is-better" : deltaBest < 0 ? "is-worse" : "is-same") + '">' +
          (deltaBest == null ? t("нет данных") : deltaBest === 0 ? t("без изменений") : deltaBest > 0 ? "▼ " + tF("−{n} ms быстрее", { n: dAbs }) : "▲ +" + dAbs + " ms") +
        "</div>" +
        '<div class="cmp-best__card">' +
          '<span class="cmp-best__label">' + t("лучший пинг B") + "</span>" +
          '<span class="cmp-best__val">' + (bestB === Infinity ? "—" : bestB + " ms") + "</span>" +
        "</div>" +
      "</div>";

    const deltaTable = deltaRows.length
      ? '<table class="cmp-table"><thead><tr><th>' + t("Эндпоинт") + "</th><th>A</th><th>B</th><th>Δ</th></tr></thead><tbody>" +
        deltaRows
          .map((r) => {
            if (r.d == null) {
              return '<tr class="' + r.cls + '"><td class="cmp-ep">' + esc(r.ep) + '</td><td colspan="3">' + esc(r.text) + "</td></tr>";
            }
            const sign = r.d < 0 ? "▼" : r.d > 0 ? "▲" : "=";
            const txt = r.d === 0 ? "=" : sign + " " + Math.abs(r.d) + " ms";
            return (
              '<tr class="' + r.cls + '"><td class="cmp-ep">' + esc(r.ep) + "</td>" +
              "<td>" + r.pa + "</td><td>" + r.pb + "</td>" +
              '<td class="cmp-delta">' + txt + "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table>"
      : '<div class="cmp-empty">' + t("Нет общих живых эндпоинтов с пингом.") + "</div>";

    const setBlock =
      '<div class="cmp-sets">' +
        '<div class="cmp-set cmp-set--b"><span>➕ ' + t("только в B:") + " <b>" + onlyB.length + "</b></span>" +
          (onlyB.length ? '<span class="cmp-set__list">' + esc(onlyB.slice(0, 5).join(", ")) + (onlyB.length > 5 ? " … +" + (onlyB.length - 5) : "") + "</span>" : "") + "</div>" +
        '<div class="cmp-set cmp-set--a"><span>➖ ' + t("только в A:") + " <b>" + onlyA.length + "</b></span>" +
          (onlyA.length ? '<span class="cmp-set__list">' + esc(onlyA.slice(0, 5).join(", ")) + (onlyA.length > 5 ? " … +" + (onlyA.length - 5) : "") + "</span>" : "") + "</div>" +
        '<div class="cmp-set"><span>⇄ ' + t("общих эндпоинтов:") + " <b>" + common.length + "</b></span></div>" +
      "</div>";

    box.innerHTML = bestBlock + setBlock + '<div class="cmp-table-wrap">' + deltaTable + "</div>";
  }

  function openCompare() {
    if (S.history.length < 2) {
      toast(t("Для сравнения нужно минимум два скана — выполните ещё один."), "warn");
      return;
    }
    fillCmpSelectors(S.history.length - 1, S.history.length - 2);
    renderCmpBody();
    toggleCmp(true);
  }

  function loadHistory(i) {
    const h = S.history[i];
    if (!h) return;
    S.results = h.results.map((r) => Object.assign({}, r));
    S.prevEndpoints = null;
    S.diff = null;
    S.viewMeta = { withP: h.withP, withSpeed: h.withSpeed };
    S.viewProto = h.proto;
    S.sortByPing = false;
    S.sortKey = "report";
    S.sortDir = 1;
    resetFilterSilently();
    const firstOk = S.results.find((r) => !r.torn);
    S.selected = firstOk ? firstOk.endpoint : "";
    renderResults();
    fillEndpointSelect();
    switchSubtab("results");
    toggleHistory(false);
    toast(tF("Загружен скан от {ts} — {n} рабочих", { ts: fmtTime(h.ts), n: h.working }), "ok");
  }

  function exportCsv() {
    if (!S.results.length) { toast("Нет результатов для экспорта", "err"); return; }
    const { withP, withSpeed } = S.viewMeta;
    const head = ["endpoint", "endpoint_ping", ...(withP ? ["tun_ping", "loss"] : []), ...(withSpeed ? ["speed"] : []), "seen_as", "node", "node_location", "torn"];
    const escCell = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const lines = [head.join(",")];
    for (const r of S.results) {
      const cells = [
        r.endpoint, r.ping,
        ...(withP ? [r.tunPing, r.loss] : []),
        ...(withSpeed ? [r.speed] : []),
        r.seenAs, r.node, r.loc, r.torn ? "yes" : "no",
      ];
      lines.push(cells.map(escCell).join(","));
    }
    const csv = "\ufeff" + lines.join("\r\n") + "\r\n"; // BOM для Excel
    const name = "warpscout-results-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".csv";
    if (IS_MOCK) {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast("CSV скачан: " + name, "ok");
      return;
    }
    os()
      .showSaveDialog(t("Сохранить результаты CSV"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, csv);
        toast("CSV сохранён: " + path, "ok");
      })
      .catch((e) => toast("Ошибка экспорта: " + (e && e.message ? e.message : e), "err"));
  }

  function selectedRowInfo() {
    return S.results.find((r) => r.endpoint === S.cfg.endpoint) || null;
  }

  async function saveConf() {
    const name = $("#cfgFileName").textContent;
    let path;
    try {
      path = await os().showSaveDialog(t("Сохранить конфиг"), { defaultPath: name });
    } catch (e) { path = null; }
    if (!path) { if (IS_MOCK) toast(t("Сохранение работает только в приложении Windows"), "err"); return; }
    try {
      await fs().writeFile(path, buildConf());
      toast(tF("Конфиг сохранён: {path}", { path: path }), "ok");
    } catch (e) {
      toast(tF("Ошибка записи: {err}", { err: e && e.message ? e.message : e }), "err");
    }
  }

  async function importI1() {
    let path;
    try {
      path = await os().showOpenDialog(t("Выберите .conf с I1"), { multiSelections: false });
    } catch (e) { path = null; }
    let picked = null;
    if (Array.isArray(path) && path[0]) picked = path[0];
    else if (typeof path === "string" && path) picked = path;
    if (!picked) {
      if (IS_MOCK) toast(t("Импорт работает только в приложении"), "err");
      return;
    }
    try {
      const text = await fs().readFile(picked);
      const m = /^\s*I1\s*=\s*(.+)$/m.exec(text);
      if (m) {
        $("#cfgI1").value = m[1].trim();
        syncCfgFromInputs();
        toast(t("I1 импортирован"), "ok");
      } else {
        toast(t("В файле нет строки I1 — это не AWG-конфиг?"), "err");
      }
    } catch (e) {
      toast(t("Не удалось прочитать файл"), "err");
    }
  }

  /* ───────── полный импорт .conf (v1.5.0) ───────── */
  function parseConfText(text) {
    const out = { interface: {}, peer: {}, other: {} };
    let cur = null;
    for (const rawLine of String(text).split(/\r?\n/)) {
      let line = rawLine;
      const hashAt = line.search(/(^|\s)#/);
      if (hashAt >= 0) line = line.slice(0, hashAt);
      line = line.trim();
      if (!line) continue;
      const sec = /^\[\s*([A-Za-z0-9_-]+)\s*\]$/.exec(line);
      if (sec) {
        const name = sec[1].toLowerCase();
        cur = name === "interface" ? out.interface : name === "peer" ? out.peer : out.other;
        continue;
      }
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim().toLowerCase();
      let val = line.slice(eq + 1).trim();
      if (/^".*"$/.test(val)) val = val.slice(1, -1);
      if (cur) cur[key] = val;
    }
    return out;
  }

  function applyImportedConf(text) {
    const c = parseConfText(text);
    const all = Object.assign({}, c.other, c.interface, c.peer);
    const has = (k) => all[k] != null && String(all[k]).trim() !== "";
    if (!Object.keys(all).length) { toast(t("Не удалось разобрать файл: нет пар «ключ = значение»"), "err"); return; }

    const applied = [];
    const skipped = [];
    const num = (k) => { const v = +all[k]; return isFinite(v) ? v : null; };

    // определение версии конфига
    const has31 = ["contentpaddingaddition", "rekeyaftertime", "rekeytimeout", "rejectaftertime",
      "keepalivetimeout", "maxhandshakeattempts", "randomtrailers", "disablecookies", "headerprotectionkey"].some(has);
    const hasI2plus = has("i2") || has("i3") || has("i4") || has("i5");
    const hasAwg = has31 || hasI2plus ||
      ["jc", "jmin", "jmax", "s1", "s2", "s3", "s4", "h1", "h2", "h3", "h4", "i1"].some(has);
    S.cfg.ver = has31 ? "awg31" : hasI2plus ? "awg20" : hasAwg ? "awg15" : "wg";
    applied.push({ wg: "WireGuard", awg15: "AWG 1.5", awg20: "AWG 2.0", awg31: "AWG 3.1" }[S.cfg.ver]);

    // Interface
    if (has("dns")) {
      const d = all.dns.replace(/\s+/g, " ").trim();
      const preset = Object.keys(DNS_PRESETS).find((k) => DNS_PRESETS[k].replace(/\s+/g, " ") === d);
      if (preset) { S.cfg.dns = preset; applied.push("DNS " + preset); }
      else { S.cfg.dns = "custom"; S.cfg.dnsCustom = d; applied.push(t("DNS свои")); }
    }
    if (has("mtu")) { const m = num("mtu"); if (m && m > 0 && m <= 10000) { S.cfg.mtu = m; applied.push("MTU " + m); } }
    if (has("table") && /off/i.test(all.table)) { S.cfg.tableOff = true; applied.push("Table off"); }

    // Peer
    if (has("endpoint") && /^[A-Za-z0-9.\[\]:-]+:\d+$/.test(all.endpoint.trim())) {
      S.cfg.endpoint = all.endpoint.trim();
      applied.push(t("эндпоинт"));
    }
    if (has("persistentkeepalive")) { const k = num("persistentkeepalive"); if (k != null && k >= 0 && k <= 65535) { S.cfg.keepalive = k; applied.push("keepalive " + k); } }
    if (has("allowedips")) {
      const a = all.allowedips.replace(/\s+/g, "");
      if (a === "0.0.0.0/0,::/0" || a === "::/0,0.0.0.0/0") { S.cfg.allowed = "both"; applied.push(t("AllowedIPs весь")); }
      else if (a === "0.0.0.0/0") { S.cfg.allowed = "v4"; applied.push("AllowedIPs v4"); }
      else if (a === "::/0") { S.cfg.allowed = "v6"; applied.push("AllowedIPs v6"); }
      else { S.cfg.allowed = "custom"; S.cfg.allowedCustom = all.allowedips.trim(); applied.push(t("AllowedIPs свои")); }
    }

    // Обфускация AWG
    if (hasAwg) {
      const o = S.cfg.obf;
      const junks = [];
      if (has("jc")) { const v = num("jc"); if (v != null) { o.jc = v; junks.push("Jc"); } }
      if (has("jmin")) { const v = num("jmin"); if (v != null) { o.jmin = v; junks.push("Jmin"); } }
      if (has("jmax")) { const v = num("jmax"); if (v != null) { o.jmax = v; junks.push("Jmax"); } }
      if (junks.length) applied.push("junk (" + junks.join("/") + ")");
      const heads = [];
      ["s1", "s2", "s3", "s4"].forEach((k, idx) => { if (has(k)) { const v = num(k); if (v != null) { o["s" + (idx + 1)] = v; heads.push("S" + (idx + 1)); } } });
      ["h1", "h2", "h3", "h4"].forEach((k, idx) => { if (has(k)) { o["h" + (idx + 1)] = String(all[k]).trim(); heads.push("H" + (idx + 1)); } });
      if (heads.length) applied.push(tF("заголовки ({n})", { n: heads.length }));
      if (has("i1")) { o.i1 = String(all.i1).trim(); applied.push("I1"); }
      if (has31) {
        if (has("contentpaddingaddition")) { o.cpa = String(all.contentpaddingaddition).trim(); applied.push("CPA"); }
        if (has("rekeyaftertime")) { o.rekeyAfter = String(all.rekeyaftertime).trim(); }
        if (has("rekeytimeout")) { o.rekeyTo = String(all.rekeytimeout).trim(); }
        if (has("rejectaftertime")) { o.rejectAfter = String(all.rejectaftertime).trim(); }
        if (has("keepalivetimeout")) { o.keepaliveTo = String(all.keepalivetimeout).trim(); }
        if (has("maxhandshakeattempts")) { o.maxHs = String(all.maxhandshakeattempts).trim(); }
        if (has("randomtrailers")) { o.trailers = /on|true|1/i.test(all.randomtrailers) ? "on" : "off"; }
        if (has("disablecookies")) { o.noCookies = /on|true|1/i.test(all.disablecookies) ? "on" : "off"; }
        if (has("headerprotectionkey")) { o.hpk = String(all.headerprotectionkey).trim(); }
        applied.push(t("тайминги 3.1"));
      }
    }

    // что не переносится
    if (has("privatekey") || has("address")) skipped.push(t("PrivateKey/Address берутся из аккаунта"));
    if (has("publickey")) skipped.push(t("PublicKey берётся из аккаунта"));
    if (has("presharedkey")) skipped.push(t("PresharedKey не поддерживается"));
    if (hasI2plus) skipped.push(t("I2–I5 отсутствуют в полях GUI"));

    syncCfgInputsFromState();
    renderConf();
    persist();
    toast(tF("Импортирован конфиг: {what}", { what: applied.join(" · ") }), "ok");
    if (skipped.length) toast(tF("Не перенесено: {what}", { what: skipped.join("; ") }), "warn");
  }

  async function importConf() {
    if (!IS_MOCK && HAS_NL) {
      let p;
      try {
        p = await os().showOpenDialog(t("Выберите .conf для импорта"), { multiSelections: false });
      } catch (e) { p = null; }
      const picked = Array.isArray(p) ? p[0] : typeof p === "string" ? p : null;
      if (!picked) return;
      try {
        applyImportedConf(await fs().readFile(picked));
      } catch (e) {
        toast(tF("Не удалось прочитать файл: {err}", { err: e && e.message ? e.message : e }), "err");
      }
      return;
    }
    $("#importConfFile").value = "";
    $("#importConfFile").click();
  }

  function bindImportConfFile() {
    $("#importConfFile").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { applyImportedConf(String(reader.result)); }
        catch (err) { toast(tF("Ошибка разбора: {err}", { err: err && err.message ? err.message : err }), "err"); }
      };
      reader.readAsText(file);
    });
  }

  /* ───────── копирование эндпоинтов (v1.5.0) ───────── */
  function copyEndpoints() {
    const list = S.results.filter((r) => !r.torn).map((r) => r.endpoint);
    if (!list.length) { toast(t("Нет рабочих эндпоинтов для копирования"), "err"); return; }
    copyText(list.join("\n"), tF("Скопировано эндпоинтов: {n}", { n: list.length }));
  }

  /* ───────── быстрая проверка одного эндпоинта (v1.9.0) ───────── */
  // Честный маппинг на warpscout: scan -p PROTO -target IP -port PORT -P
  // (-port пропускает фазу 1 и проверяет только указанный порт, -target снимает пулы)
  function splitEpPort(ep) {
    const m = /^(.+):(\d+)$/.exec(ep || "");
    return m ? { ip: m[1], port: m[2] } : null;
  }

  function buildCheckCmd(ip, port, proto) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const report = (S.paths.reportsDir || ".") + "/warpscout-check-" + ts + ".txt";
    const acc = S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "";
    const cmd =
      quoteExe() + " scan -p " + proto +
      " -target " + ip +
      " -port " + port +
      " -P -plain" +
      ' -o "' + report + '"' + acc;
    return { cmd: cmd, report: report };
  }

  function toggleQc(open) {
    const m = $("#qcModal");
    if (m) m.classList.toggle("hidden", !open);
  }

  function qcLogData(data) {
    const el = $("#qcLog");
    if (!el) return;
    el.textContent += data;
    if (el.textContent.length > 20000) el.textContent = el.textContent.slice(-12000);
    el.scrollTop = el.scrollHeight;
  }

  function qcVerdict(kind, text) {
    const v = $("#qcVerdict");
    if (!v) return;
    v.className = "qc-verdict is-" + kind;
    v.textContent = text;
  }

  // вердикт с запоминанием (для смены языка без перезапуска проверки)
  function qcSetVerdict(kind, key, vars, node) {
    S.qcLast = { kind: kind, key: key, vars: vars || {}, node: node || "" };
    qcRenderLast();
  }

  function qcRenderLast() {
    if (!S.qcLast) return;
    const q = S.qcLast;
    const nodePart = q.node ? " · " + t("Узел") + " " + q.node : "";
    qcVerdict(q.kind, tF(q.key, q.vars) + nodePart);
  }

  async function checkOne(ep, opts) {
    const batch = !!(opts && opts.batch);
    if (!batch) {
      if (S.running.check) { toast(t("Уже идёт проверка — подождите"), "warn"); return; }
      if (S.running.scan) { toast(t("Проверка недоступна во время скана"), "warn"); return; }
    }
    const parts = splitEpPort(ep);
    if (!parts) { toast(t("Не удалось разобрать адрес"), "err"); return; }
    if (!S.account && !IS_MOCK) {
      toast(t("Сначала создайте аккаунт WARP — вкладка «Аккаунт»"), "err");
      switchTab("account");
      return;
    }
    S.running.check = true;
    const proto = S.viewProto || S.scan.proto || "awg";
    const built = buildCheckCmd(parts.ip, parts.port, proto);
    const m = $("#qcModal");
    if (m && !batch) {
      $("#qcEp").textContent = ep;
      $("#qcProto").textContent = String(proto).toUpperCase();
      $("#qcCmd").textContent = built.cmd;
      $("#qcLog").textContent = "";
      qcVerdict("run", "…");
      m.classList.remove("hidden");
    } else if (m && batch) {
      // пакетный режим: модалка уже открыта очередью — показываем текущую цель и команду
      const b = S.qcBatch;
      $("#qcEp").textContent = tF("{i}/{n}: {ep}", { i: b ? b.idx + 1 : 1, n: b ? b.total : 1, ep: ep });
      $("#qcProto").textContent = String(proto).toUpperCase();
      $("#qcCmd").textContent = built.cmd;
    }
    qcLogData("$ " + built.cmd + "\r\n");
    S.qcBuf = "";
    try {
      const proc = await os().execCommand(built.cmd, { stream: true });
      S.procIds.check = proc.id;
      registerProc(proc.id, (d) => {
        if (d.type === "stdout" || d.type === "stderr") {
          const data = typeof d.data === "string" ? d.data : "";
          S.qcBuf += data;
          qcLogData(data);
        } else if (d.type === "exit") {
          unregisterProc(proc.id);
          S.running.check = false;
          finishCheck(ep, exitCodeOf(d.data), built.report, opts);
        }
      });
    } catch (e) {
      S.running.check = false;
      const msg = tF("Не удалось запустить проверку: {err}", { err: e && e.message ? e.message : e });
      qcVerdict("err", msg);
      toast(msg, "err");
      pushQcJournal({ ts: Date.now(), ep: ep, proto: proto, kind: "error", ping: "", loss: "", node: "" });
      if (batch && S.qcBatch && S.qcBatch.curResolve) { const r = S.qcBatch.curResolve; S.qcBatch.curResolve = null; r({ kind: "error", ping: "", loss: "", node: "" }); }
    }
  }

  // журнал ⚡-проверок (v2.0.0): добавляет запись и перерисовывает открытую панель
  function pushQcJournal(entry) {
    S.qcHistory.unshift(entry);
    if (S.qcHistory.length > 50) S.qcHistory = S.qcHistory.slice(0, 50);
    persist();
    if (S.historyOpen) {
      const panel = $("#historyPanel");
      if (panel && !panel.classList.contains("hidden")) renderQcJournal();
    }
  }

  function qcjVerdictText(e) {
    if (e.kind === "ok") return tF("✅ Рабочий — TUN PING {ping} ms, потери {loss}", { ping: e.ping || "?", loss: e.loss || "0%" });
    if (e.kind === "torn") return tF("⛔ Разорван — потери {loss}", { loss: e.loss || "100%" });
    if (e.kind === "noanswer") return t("Эндпоинт не ответил (нет строки в отчёте)");
    return tF("warpscout завершился с кодом {c}", { c: e.code != null ? e.code : "!" });
  }

  function renderQcJournal() {
    const panel = $("#historyPanel");
    if (!panel) return;
    let box = $("#qcJournal");
    if (!box) {
      box = document.createElement("div");
      box.id = "qcJournal";
      box.className = "qcj";
      panel.appendChild(box);
    }
    const n = S.qcHistory.length;
    box.innerHTML =
      '<div class="qcj__head">' +
        '<span class="qcj__title">' + t("⚡ Журнал проверок") + '</span>' +
        '<span class="qcj__cnt">' + n + '</span>' +
        '<span class="qcj__tools">' +
          '<button type="button" id="btnQcjCsv" title="' + t("Сохранить журнал проверок (CSV)") + '">⬇ CSV</button>' +
          '<button type="button" id="btnQcjClear" class="history__clear" title="' + t("Удалить весь журнал проверок") + '">' + t("🗑 Очистить") + "</button>" +
        "</span>" +
      "</div>" +
      (n
        ? '<div class="qcj__list">' +
          S.qcHistory
            .map((e) => {
              const cls = e.kind === "ok" ? "is-ok" : e.kind === "torn" ? "is-err" : e.kind === "error" ? "is-err" : "is-warn";
              return (
                '<div class="qcj__row ' + cls + '">' +
                  '<span class="qcj__dot" aria-hidden="true"></span>' +
                  '<span class="qcj__ts">' + fmtTime(e.ts) + "</span>" +
                  '<span class="qcj__proto">' + esc(String(e.proto || "").toUpperCase()) + "</span>" +
                  '<span class="qcj__ep mono">' + esc(e.ep) + "</span>" +
                  '<span class="qcj__verdict">' + esc(qcjVerdictText(e)) + (e.node ? ' · <span class="qcj__node">' + esc(e.node) + "</span>" : "") + "</span>" +
                "</div>"
              );
            })
            .join("") +
          "</div>"
        : '<div class="qcj__empty">' + t("Журнал пуст — запустите ⚡-проверку эндпоинта") + "</div>");
    const bCsv = $("#btnQcjCsv");
    if (bCsv) bCsv.addEventListener("click", exportQcjCsv);
    const bClr = $("#btnQcjClear");
    if (bClr) bClr.addEventListener("click", clearQcJournal);
  }

  function exportQcjCsv() {
    if (!S.qcHistory.length) { toast(t("Журнал пуст — запустите ⚡-проверку эндпоинта"), "err"); return; }
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const rows = ["datetime,endpoint,proto,verdict,tun_ping_ms,loss,node"];
    for (let i = S.qcHistory.length - 1; i >= 0; i--) {
      const e = S.qcHistory[i];
      rows.push([new Date(e.ts).toISOString(), e.ep, e.proto, e.kind, e.ping, e.loss, e.node].map(q).join(","));
    }
    const csv = "\ufeff" + rows.join("\r\n");
    const name = "warpscout-check-journal-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".csv";
    if (IS_MOCK) {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("Журнал проверок выгружен: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Сохранить журнал проверок (CSV)"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, csv);
        toast(tF("Журнал проверок сохранён: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  async function clearQcJournal() {
    if (!S.qcHistory.length) { toast(t("Журнал и так пуст"), "ok"); return; }
    if (!confirm(tF("Удалить весь журнал проверок ({n})?", { n: S.qcHistory.length }))) return;
    S.qcHistory = [];
    renderQcJournal();
    persist();
    toast(t("Журнал проверок очищен"), "ok");
  }

  async function finishCheck(ep, exitCode, reportPath, opts) {
    const batch = !!(opts && opts.batch);
    const modalOpen = (() => {
      const m = $("#qcModal");
      return !!(m && !m.classList.contains("hidden"));
    })();
    let row = null;
    try {
      let text = "";
      if (IS_MOCK) text = (window.NeutralinoMock && window.NeutralinoMock.lastCheckReport) || "";
      else text = await fs().readFile(reportPath);
      const rows = parseReport(text, true, false);
      row = rows.find((r) => r.endpoint === ep) || rows[0] || null;
    } catch (e) {
      row = null;
    }
    const nm = /node:\s*([A-Z]{2})\s+([A-Z]{3})/.exec(S.qcBuf || "");
    const proto = S.viewProto || S.scan.proto || "awg";
    const node = nm ? nm[2] : "";
    let verdict;
    if (exitCode !== 0) {
      verdict = { kind: "error", ping: "", loss: "", node: node, code: exitCode };
      if (modalOpen) qcSetVerdict("err", "warpscout завершился с кодом {c}", { c: exitCode }, "");
      if (!batch) toast(tF("Проверка {ep}: ошибка {err}", { ep: ep, err: exitCode }), "err");
    } else if (!row) {
      verdict = { kind: "noanswer", ping: "", loss: "", node: node };
      if (modalOpen) qcSetVerdict("warn", "Эндпоинт не ответил (нет строки в отчёте)", {}, "");
      if (!batch) toast(tF("Проверка {ep}: не ответил", { ep: ep }), "warn");
    } else if (row.torn) {
      const loss = String(row.loss || "100%").replace(/\s*ms/i, "");
      verdict = { kind: "torn", ping: "", loss: loss, node: node };
      if (modalOpen) qcSetVerdict("err", "⛔ Разорван — потери {loss}", { loss: loss }, node);
      if (!batch) toast(tF("Проверка {ep}: разорван", { ep: ep }), "err");
    } else {
      const ping = String(row.tunPing || "?").replace(/\s*ms/i, "");
      const loss = String(row.loss || "0%").replace(/\s*ms/i, "");
      verdict = { kind: "ok", ping: ping, loss: loss, node: node };
      if (modalOpen) qcSetVerdict("ok", "✅ Рабочий — TUN PING {ping} ms, потери {loss}", { ping: ping, loss: loss }, node);
      if (!batch) toast(tF("Проверка {ep}: рабочий, TUN PING {ping} ms", { ep: ep, ping: ping }), "ok");
    }
    // журнал ⚡-проверок (v2.0.0)
    pushQcJournal({ ts: Date.now(), ep: ep, proto: proto, kind: verdict.kind, ping: verdict.ping, loss: verdict.loss, node: verdict.node, code: verdict.code });
    // пакетный режим: строка-вердикт в лог, счётчики, прогресс
    if (batch && S.qcBatch) {
      const b = S.qcBatch;
      b.done = (b.done || 0) + 1;
      if (verdict.kind === "ok") b.ok++;
      else if (verdict.kind === "torn") b.torn++;
      else b.other++;
      const line = (verdict.kind === "ok" ? "✅ " : verdict.kind === "torn" ? "⛔ " : "⚠️ ") + ep + " — " + qcjVerdictText(Object.assign({}, verdict, { ep: ep })) + "\r\n";
      qcLogData(line);
      updateBatchMeta();
      if (b.curResolve) { const r = b.curResolve; b.curResolve = null; r(verdict); }
    }
    return verdict;
  }

  /* ───────── пакетная проверка выбранных эндпоинтов (v2.0.0) ───────── */
  // Очередь: каждый эндпоинт проверяется тем же честным warpscout-запуском (scan -target -port -P),
  // последовательно; вердикты пишутся в журнал ⚡-проверок, прогресс — в панель выбора и модалку.
  function checkOneP(ep) {
    return new Promise((resolve) => {
      if (!S.qcBatch) return resolve({ kind: "noanswer", ping: "", loss: "", node: "" });
      S.qcBatch.curResolve = resolve;
      checkOne(ep, { batch: true }).catch(() => {
        if (S.qcBatch && S.qcBatch.curResolve === resolve) {
          S.qcBatch.curResolve = null;
          resolve({ kind: "error", ping: "", loss: "", node: "" });
        }
      });
    });
  }

  async function runBatchCheck() {
    const list = (S.qcSel || []).slice();
    if (!list.length) { toast(t("Выберите хотя бы один эндпоинт"), "warn"); return; }
    if (S.running.check) { toast(t("Уже идёт проверка — подождите"), "warn"); return; }
    if (S.running.scan) { toast(t("Проверка недоступна во время скана"), "warn"); return; }
    S.qcBatch = { list: list, idx: 0, total: list.length, ok: 0, torn: 0, other: 0, done: 0, curResolve: null };
    const m = $("#qcModal");
    if (m) {
      $("#qcEp").textContent = tF("Пакетная проверка: {n}", { n: list.length });
      $("#qcProto").textContent = String(S.viewProto || S.scan.proto || "awg").toUpperCase();
      $("#qcCmd").textContent = t("Последовательная очередь ⚡-проверок — по команде на каждый эндпоинт");
      $("#qcLog").textContent = "";
      qcVerdict("run", "…");
      m.classList.remove("hidden");
    }
    updateBatchMeta();
    const results = [];
    for (let i = 0; i < list.length; i++) {
      if (!S.qcBatch) break; // очередь отменена
      S.qcBatch.idx = i;
      const v = await checkOneP(list[i]);
      results.push({ ep: list[i], v: v });
    }
    const b = S.qcBatch;
    S.qcBatch = null;
    updateBatchMeta();
    if (b) {
      const summary = tF("Готово: {ok} рабочих, {torn} разорванных, {other} без ответа из {n}", { ok: b.ok, torn: b.torn, other: b.other, n: b.total });
      qcSetVerdict(b.ok && !b.other ? "ok" : b.ok ? "warn" : "err", summary, {}, "");
      toast(t("Пакетная проверка завершена") + " — " + summary, b.ok ? "ok" : "warn");
    }
  }

  function updateBatchMeta() {
    const meta = $("#batchMeta");
    const cnt = $("#batchCount");
    if (cnt) cnt.textContent = String((S.qcSel || []).length);
    if (!meta) return;
    if (S.qcBatch) {
      const b = S.qcBatch;
      meta.textContent = tF("Проверено {done}/{n} · ✅ {ok} · ⛔ {torn}", { done: b.done || 0, n: b.total, ok: b.ok, torn: b.torn });
      meta.className = "batch-bar__meta is-run";
    } else {
      meta.textContent = (S.qcSel || []).length ? tF("Выбрано: {n}", { n: S.qcSel.length }) : "";
      meta.className = "batch-bar__meta";
    }
  }

  function toggleQcSelMode(force) {
    S.qcSelMode = force != null ? !!force : !S.qcSelMode;
    if (!S.qcSelMode) S.qcSel = [];
    const bar = $("#batchBar");
    if (bar) bar.classList.toggle("hidden", !S.qcSelMode);
    const btn = $("#btnSelectMode");
    if (btn) {
      btn.classList.toggle("is-on", S.qcSelMode);
      btn.textContent = S.qcSelMode ? "✕ " + t("Снять выбор") : "☑ " + t("Выбрать");
    }
    updateBatchMeta();
    renderResults();
  }

  function toggleQcSel(ep) {
    const i = S.qcSel.indexOf(ep);
    if (i !== -1) S.qcSel.splice(i, 1);
    else S.qcSel.push(ep);
    updateBatchMeta();
  }

  function selectAllVisible() {
    const visible = $$("#resultsBody tr").map((tr) => tr.getAttribute("data-ep")).filter(Boolean);
    if (!visible.length) return;
    const allSel = visible.every((ep) => S.qcSel.indexOf(ep) !== -1);
    if (allSel) {
      S.qcSel = S.qcSel.filter((ep) => visible.indexOf(ep) === -1);
    } else {
      visible.forEach((ep) => { if (S.qcSel.indexOf(ep) === -1) S.qcSel.push(ep); });
    }
    updateBatchMeta();
    renderResults();
  }

  /* ───────── тренд пинга по истории (v1.5.0) ───────── */
  function histBestPing(h) {
    let best = Infinity;
    for (const r of h.results || []) {
      if (r.torn) continue;
      const v = pingMs(r.tunPing || r.ping);
      if (v !== Infinity && v < best) best = v;
    }
    return best;
  }

  function renderPingTrend() {
    const pts = [];
    for (let i = S.history.length - 1; i >= 0; i--) {
      const b = histBestPing(S.history[i]);
      if (b !== Infinity) pts.push({ i, ping: b, ts: S.history[i].ts });
    }
    if (pts.length < 2) return "";
    const W = 560, H = 64, PAD = 7;
    const pings = pts.map((p) => p.ping);
    const min = Math.min.apply(null, pings);
    const max = Math.max.apply(null, pings);
    const span = Math.max(1, max - min);
    const xy = pts.map((p, idx) => ({
      x: PAD + (idx / (pts.length - 1)) * (W - PAD * 2),
      y: H - PAD - ((p.ping - min) / span) * (H - PAD * 2),
      p,
    }));
    const line = xy.map((q) => q.x.toFixed(1) + "," + q.y.toFixed(1)).join(" ");
    const area = PAD + "," + (H - 1) + " " + line + " " + (W - PAD) + "," + (H - 1);
    const dots = xy
      .map((q) =>
        '<circle class="trend-dot" cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="3.5" data-trend="' + q.p.i +
        '" role="button" tabindex="0" aria-label="' + tF("Скан {ts}, {ping} ms", { ts: fmtTime(q.p.ts), ping: q.p.ping }) + '">' +
        "<title>" + tF("{ts} — лучший пинг {ping} ms — клик загрузит скан", { ts: fmtTime(q.p.ts), ping: q.p.ping }) + "</title></circle>"
      )
      .join("");
    return (
      '<div class="trend" role="img" aria-label="' + t("Динамика лучшего пинга по сканам") + '">' +
        '<div class="trend__head">' +
          '<span class="trend__title">' + t("↘ динамика лучшего пинга") + "</span>" +
          '<span class="trend__tools">' +
            '<span class="trend__range">min <b>' + min + "</b> · max <b>" + max + "</b> ms</span>" +
            '<button type="button" class="trend__csv" id="btnTrendCsv" title="' + t("Сохранить динамику пинга в CSV") + '">⬇ CSV</button>' +
            '<button type="button" class="trend__csv trend__png" id="btnTrendPng" title="' + t("Сохранить график тренда в PNG") + '">⬇ PNG</button>' +
            '<button type="button" class="trend__csv trend__svg" id="btnTrendSvg" title="' + t("Сохранить график тренда в SVG") + '">⬇ SVG</button>' +
          "</span>" +
        "</div>" +
        '<svg class="trend__svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">' +
          '<polygon class="trend__area" points="' + area + '"></polygon>' +
          '<polyline class="trend__line" points="' + line + '"></polyline>' +
          dots +
        "</svg>" +
        '<div class="trend__hint">' + t("слева направо: старые сканы → новые · клик по точке загружает скан") + "</div>" +
      "</div>"
    );
  }

  /* ───────── подсветка пресета, соответствующего форме (v1.5.0) ───────── */
  function matchPresetName() {
    const orig = JSON.stringify(S.scan);
    let found = "";
    for (const name of Object.keys(PRESETS)) {
      PRESETS[name].apply();
      if (JSON.stringify(S.scan) === orig) { found = name; break; }
    }
    S.scan = JSON.parse(orig);
    if (!found) {
      for (const cp of S.customPresets) {
        if (JSON.stringify(Object.assign({}, DEFAULT_SCAN, cp.scan)) === orig) { found = "custom:" + cp.name; break; }
      }
    }
    return found;
  }

  function highlightMatchingPreset() {
    const name = matchPresetName();
    $$("#presetChips .chip").forEach((c) => c.classList.remove("is-active"));
    $$("#customPresetChips .chip--custom").forEach((c) => c.classList.remove("is-active"));
    if (!name) return;
    if (name.indexOf("custom:") === 0) {
      const cname = name.slice(7);
      const idx = S.customPresets.findIndex((p) => p.name === cname);
      if (idx >= 0) {
        const chip = $('#customPresetChips .chip--custom[data-pi="' + idx + '"]');
        if (chip) {
          chip.classList.add("is-active");
          $("#presetHint").innerHTML = tF("Пресет «<b>{name}</b>» применён. Команду можно посмотреть над кнопкой скана.", { name: esc(cname) });
        }
      }
      return;
    }
    const chip = $('#presetChips .chip[data-preset="' + name + '"]');
    if (chip) {
      chip.classList.add("is-active");
      $("#presetHint").innerHTML = t(PRESETS[name].hint);
    }
  }

  /* ───────── аккаунт ───────── */
  // v2.1.0: валидация JSON-аккаунта warpscout — нужны private_key и peer_public_key
  function validateAccountJson(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "not-json";
    // мягкие алиасы: некоторые утилиты пишут public_key вместо peer_public_key
    if (!obj.peer_public_key && typeof obj.public_key === "string" && obj.public_key) obj.peer_public_key = obj.public_key;
    if (typeof obj.private_key !== "string" || !obj.private_key) return "not-account";
    if (typeof obj.peer_public_key !== "string" || !obj.peer_public_key) return "not-account";
    return null;
  }

  function accountImportErrorText(kind) {
    if (kind === "parse") return t("Это не JSON-файл. Нужен аккаунт warpscout: JSON с ключами private_key и peer_public_key.");
    if (kind === "not-account") return t("В файле нет ключей аккаунта (private_key/peer_public_key) — это не warpscout-account.json. Возможно, вы выбрали .conf-конфиг или файл другой программы.");
    return t("Не удалось распознать файл аккаунта.");
  }

  function accountFromText(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { return { error: "parse" }; }
    const v = validateAccountJson(obj);
    if (v) return { error: v };
    return { account: obj };
  }

  async function loadAccount() {
    S.accountError = "";
    if (IS_MOCK) {
      S.account = window.NeutralinoMock ? window.NeutralinoMock.account : null;
      return S.account;
    }
    try {
      const text = await fs().readFile(S.paths.accPath);
      const r = accountFromText(text);
      if (r.error) { S.accountError = r.error; S.account = null; return S.account; }
      S.account = r.account;
    } catch (e) {
      S.account = null; // файл просто отсутствует — это не ошибка
    }
    return S.account;
  }

  function renderAccount() {
    const has = !!S.account;
    const set = (id, text, cls) => {
      const el = $(id);
      el.textContent = text;
      el.className = cls || "";
    };
    let fileState;
    let fileCls;
    if (has) { fileState = t("найден"); fileCls = "is-ok"; }
    else if (S.accountError === "parse") { fileState = t("файл есть, но это не JSON"); fileCls = "is-err"; }
    else if (S.accountError === "not-account") { fileState = t("в файле нет ключей private_key/peer_public_key"); fileCls = "is-err"; }
    else { fileState = t("не найден — нужен для скана"); fileCls = "is-err"; }
    set("#accFileState", fileState, fileCls);
    $("#accFilePath").textContent = S.paths.accPath || "—";
    set("#accMainState", has ? "✓ " + (S.account.ipv4 || "ok") : "—", has ? "is-ok" : "is-warn");
    set("#accMasqueState", has && S.account.masque ? t("✓ есть") : t("нет (нужен только для masque)"), has && S.account.masque ? "is-ok" : "is-warn");
    set("#accOuterState", has && S.account.outer ? t("✓ есть") : t("нет (нужен только для -through)"), has && S.account.outer ? "is-ok" : "is-warn");
    renderAccountStatusline();
  }

  function renderAccountStatusline() {
    const el = $("#stAcc");
    if (S.account) { el.textContent = t("● аккаунт: есть"); el.className = "statusline__row is-ok"; }
    else { el.textContent = t("● аккаунт: нет — вкладка «Аккаунт»"); el.className = "statusline__row is-err"; }
  }

  // v2.1.0: человекочитаемая подсказка по коду выхода и хвосту лога warpscout
  // v2.1.1: различаем потерянный exit-сигнал (synthetic) и настоящий вылет;
  // если проверка «warpscout version» проходила — exe запускается, путь верный
  function registerHintFor(code, logTail, synthetic) {
    const tl = String(logTail || "").toLowerCase();
    if (tl.includes("could not save account"))
      return t("Не удалось сохранить файл аккаунта — папка данных пересоздана. Нажмите «Зарегистрировать» ещё раз.");
    if (tl.includes("fix or move"))
      return t("Файл аккаунта повреждён или не читается. Удалите его (кнопка «Открыть папку») и зарегистрируйте заново — или используйте «Новый аккаунт».");
    if (tl.includes("registration failed") || tl.includes("no reachable endpoint"))
      return t("Cloudflare API недоступна напрямую и через туннель WARP. Проверьте интернет, попробуйте VPN/прокси или повторите позже — иногда помогает несколько попыток.");
    if (code === -1) {
      if (synthetic)
        return t("Процесс завершился без финального отчёта — сигнал о завершении потерян (так бывает при потере событий или закрытии процесса системой). Нажмите «Проверить снова»: аккаунт мог успеть создаться. Если его нет — добавьте папку в исключения антивируса и повторите регистрацию.");
      const v = S.wsVersion ? " " + tF("Проверка перед запуском показала версию {v} — сам exe запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: добавьте папку в исключения антивируса (и нажмите «Разблокировать exe»), затем повторите.", { v: S.wsVersion }) : "";
      return t("Код -1: warpscout.exe не смог запуститься или был закрыт. Причины: антивирус заблокировал файл; ZIP распакован не целиком (нет папки bin с warpscout.exe); неверный путь в Настройках. Проверьте папку кнопкой «Открыть папку» и добавьте её в исключения антивируса.") + v;
    }
    return t("Смотрите лог выше — там точная причина от warpscout.");
  }

  async function runRegister(fresh) {
    if (S.running.register) return;
    S.running.register = true;
    registerUi();
    const log = $("#accLog");
    log.textContent = "";
    appendLog(log, "$ warpscout register" + (fresh ? " -fresh" : "") + "\n");
    if (!HAS_NL || IS_MOCK) {
      appendLog(log, t("[демо] Используется демо-аккаунт. В приложении здесь выполняется настоящая регистрация.") + "\n");
      S.account = await loadAccount();
      renderAccount();
      S.running.register = false;
      registerUi();
      toast(t("Демо: аккаунт уже есть"), "ok");
      return;
    }
    // v2.1.0: папка данных должна существовать ДО запуска — warpscout не создаёт
    // родительские каталоги, и без этого аккаунт не сохранялся (ошибка регистрации)
    await ensureDir(S.paths.dataDir);
    await ensureDir(S.paths.reportsDir);
    // v2.1.0: предпроверка warpscout — не ловим «код -1» ради отсутствующего exe
    if (!(await checkWarpscout())) {
      S.running.register = false;
      registerUi();
      appendLog(log, "\n[GUI] " + t("warpscout.exe не найден. Распакуйте ZIP целиком (рядом с WARPScoutGUI.exe должна лежать папка bin с warpscout.exe) или укажите путь в Настройках. Если файл на месте — добавьте папку в исключения антивируса.") + "\n");
      toast(t("Ошибка запуска warpscout"), "err");
      return;
    }
    const acc = S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "";
    const cmd = quoteExe() + " register" + (fresh ? " -fresh" : "") + acc;
    appendLog(log, "$ " + cmd + "\n"); // v2.1.1: полная команда с путями — для диагностики
    let logTail = "";
    // v2.1.1: помним, какой аккаунт был ДО запуска — чтобы отличить «появился
    // новый» от «старый так и лежит» при ненулевом коде выхода
    const preId = S.account && S.account.id ? String(S.account.id) : "";
    try {
      const proc = await os().execCommand(cmd, { stream: true });
      S.procIds.register = proc.id;
      registerProc(proc.id, (d) => {
        if (d.type === "stdout" || d.type === "stderr") {
          const data = typeof d.data === "string" ? d.data : "";
          appendLog(log, data);
          logTail = (logTail + data).slice(-4000);
        } else if (d.type === "exit") {
          unregisterProc(proc.id);
          S.running.register = false;
          registerUi();
          finishRegister(exitCodeOf(d.data), d.synthetic);
        }
      });
    } catch (e) {
      S.running.register = false;
      registerUi();
      appendLog(log, "\n[GUI] " + tF("Не удалось запустить warpscout: {err}", { err: e && e.message ? e.message : e }) + "\n");
      toast(t("Ошибка запуска warpscout"), "err");
    }

    // v2.1.1: код выхода warpscout — не истина в последней инстанции: события
    // могут теряться, процесс могут закрыть в фоне ПОСЛЕ записи файла. Поэтому
    // при ненулевом коде перепроверяем файл аккаунта по факту.
    async function finishRegister(code, synthetic) {
      try { await loadAccount(); } catch (e) {}
      renderAccount();
      const newId = S.account && S.account.id ? String(S.account.id) : "";
      const accountAppeared = !!S.account && (!preId || newId !== preId);
      if (code === 0) {
        appendLog(log, "\n[GUI] " + t("Готово.") + "\n");
        toast(t("Аккаунт готов"), "ok");
        return;
      }
      if (accountAppeared) {
        appendLog(log, "\n" + tF("Процесс завершился с кодом {code}, но файл аккаунта создан и читается — регистрация прошла. Можно сканировать.", { code }) + "\n");
        toast(t("Аккаунт готов"), "ok");
        return;
      }
      // v2.1.1: раньше здесь был двойной префикс «[GUI] [GUI]» — убран
      appendLog(log, "\n" + tF("[GUI] Регистрация завершилась с ошибкой (код {code}).", { code }) + "\n");
      appendLog(log, "[GUI] " + registerHintFor(code, logTail, synthetic) + "\n");
      toast(t("Регистрация не удалась — смотрите лог"), "err");
    }
  }

  function registerUi() {
    $("#btnRegister").hidden = S.running.register;
    $("#btnRegisterFresh").hidden = S.running.register;
    $("#btnRegisterStop").hidden = !S.running.register;
  }

  /* ───────── v2.1.0: импорт готового файла аккаунта ───────── */
  // v2.1.1: БАГФИКС «fs(...).copyFile is not a function». В Neutralino v6 нет
  // fs().copyFile (есть только fs().copy) — импорт падал, и готовый аккаунт
  // «не подхватывался». Теперь вызывающий код уже прочитал и проверил JSON —
  // остаётся сохранить текст в accPath через writeFile (есть во всех версиях).
  async function adoptImportedAccount(source, text) {
    if (!IS_MOCK) {
      try {
        await ensureDir(S.paths.dataDir);
        if (text == null) text = await fs().readFile(source);
        await fs().writeFile(S.paths.accPath, String(text));
      } catch (e) {
        toast(tF("Не удалось сохранить файл аккаунта: {err}", { err: e && e.message ? e.message : e }), "err");
        return false;
      }
    }
    await loadAccount();
    renderAccount();
    return true;
  }

  async function importAccount() {
    if (HAS_NL && !IS_MOCK) {
      let p;
      try { p = await os().showOpenDialog(t("Выберите файл аккаунта (warpscout-account.json)"), { multiSelections: false }); }
      catch (e) { p = null; }
      const picked = Array.isArray(p) ? p[0] : typeof p === "string" ? p : null;
      if (!picked) return;
      let text = "";
      try { text = await fs().readFile(picked); }
      catch (e) {
        toast(tF("Не удалось прочитать файл: {err}", { err: e && e.message ? e.message : e }), "err");
        return;
      }
      const r = accountFromText(text);
      if (r.error) { toast(t(accountImportErrorText(r.error)), "err"); return; }
      if (await adoptImportedAccount(picked, text)) toast(t("Готовый аккаунт подключён — можно сканировать"), "ok");
      return;
    }
    // демо: <input type=file>
    $("#importAccFile").value = "";
    $("#importAccFile").click();
  }

  function bindImportAccFile() {
    $("#importAccFile").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const r = accountFromText(String(reader.result));
        if (r.error) { toast(t(accountImportErrorText(r.error)), "err"); return; }
        if (window.NeutralinoMock) window.NeutralinoMock.account = r.account;
        if (await adoptImportedAccount(null, String(reader.result))) toast(t("Готовый аккаунт подключён — можно сканировать"), "ok");
      };
      reader.readAsText(file);
    });
  }

  // v2.1.0: автоподхват готового аккаунта из типичных мест, если своего ещё нет
  // v2.1.1: добавлена папка, где лежит warpscout.exe (типичный случай —
  // пользователь кладёт warpscout-account.json рядом с exe в bin)
  async function adoptAccountFromPlaces() {
    if (!HAS_NL || IS_MOCK) return false;
    if (S.account || S.accountError) return false; // свой есть (или лежит битый) — не трогаем
    const base = String(S.paths.dataDir || "").replace(/[\\/]WARPScoutGUI$/i, "");
    const np = String(window.NL_PATH || "").replace(/[\\/]+$/, "");
    const exeDir = String(S.paths.wsPath || "").replace(/[\\/]warpscout(\.exe)?$/i, "").replace(/[\\/]+$/, "");
    const candidates = [];
    if (np) candidates.push(np + "\\warpscout-account.json", np + "\\bin\\warpscout-account.json");
    if (exeDir && exeDir !== np && exeDir !== base) candidates.push(exeDir + "\\warpscout-account.json");
    if (base && base !== np) candidates.push(base + "\\warpscout-account.json");
    candidates.push("warpscout-account.json"); // рядом с местом запуска
    for (const src of candidates) {
      let text = "";
      try { text = await fs().readFile(src); } catch (e) { continue; }
      const r = accountFromText(text);
      if (r.error) continue;
      if (await adoptImportedAccount(src, text)) {
        toast(tF("Подключён готовый аккаунт, найденный рядом: {src}", { src }), "ok");
        return true;
      }
    }
    return false;
  }

  // v2.1.1: перепроверка файла аккаунта БЕЗ перезапуска приложения
  async function recheckAccount() {
    await loadAccount();
    let adopted = false;
    if (!S.account && !S.accountError && HAS_NL && !IS_MOCK) {
      adopted = await adoptAccountFromPlaces();
    }
    if (!adopted) renderAccount();
    return !!S.account;
  }

  // v2.1.1: помощь при «коде -1» — антивирус / метка Zone.Identifier из ZIP
  function bindExeHelpers() {
    $("#btnAccUnblock").addEventListener("click", async () => {
      if (IS_MOCK || !HAS_NL) { toast(t("Доступно только в приложении Windows"), "err"); return; }
      const p = String(S.paths.wsPath || "").replace(/"/g, "");
      if (!p) return;
      appendLog($("#accLog"), "\n$ powershell Unblock-File <warpscout.exe>\n");
      try {
        await os().execCommand("powershell -NoProfile -ExecutionPolicy Bypass -Command \"Unblock-File -LiteralPath '" + p + "'\"");
        appendLog($("#accLog"), "[GUI] " + t("Unblock-File выполнен: с exe снята метка «скачано из интернета». Попробуйте регистрацию ещё раз.") + "\n");
        toast(t("Готово — попробуйте регистрацию ещё раз"), "ok");
      } catch (e) {
        toast(tF("Не удалось выполнить Unblock-File: {err}", { err: e && e.message ? e.message : e }), "err");
      }
    });
    $("#btnAccOpenExeDir").addEventListener("click", () => {
      if (IS_MOCK) { toast(t("Доступно только в приложении Windows"), "err"); return; }
      const dir = String(S.paths.wsPath || "").replace(/[\\/]warpscout(\.exe)?$/i, "").replace(/[\\/]+$/, "");
      if (!dir) { toast(t("Не удалось открыть папку"), "err"); return; }
      os().open(dir).catch(() => toast(t("Не удалось открыть папку"), "err"));
    });
    $("#btnAccCheckWs").addEventListener("click", async () => {
      toast(t("Проверяю warpscout…"), "ok");
      try {
        const ok = await Promise.race([
          checkWarpscout(),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 15000)),
        ]);
        toast(ok ? tF("warpscout готов: {v}", { v: S.wsVersion || "?" }) : t("warpscout не отвечает — проверьте путь и антивирус"), ok ? "ok" : "err");
      } catch (e) {
        toast(t("warpscout не отвечает (таймаут)"), "err");
      }
    });
  }

  /* ───────── SOCKS ───────── */
  async function socksToggle() {
    if (S.running.socks) {
      await killProc(S.procIds.socks);
      S.procIds.socks = null;
      S.running.socks = false;
      socksUi();
      return;
    }
    S.running.socks = true;
    socksUi();
    const ep = $("#socksEndpoint").value.trim();
    if (!/^\[?[0-9a-zA-Z.:]+\]?:\d{1,5}$/.test(ep)) { toast(t("Укажите эндпоинт в формате ip:порт (например 188.114.98.58:2408)"), "err"); S.running.socks = false; socksUi(); return; }
    const port = $("#socksPort").value || "1080";
    const proto = $("#socksProto").value;
    const acc = S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "";
    const cmd = quoteExe() + " socks -e " + ep + " -p " + proto + " -P " + port + acc;
    $("#socksLog").textContent = "";
    let proc;
    try { proc = await os().spawnProcess(cmd); } catch (e) { S.running.socks = false; socksUi(); toast(t("Не удалось запустить"), "err"); return; }
    if (proc && proc.id != null) registerProc(proc.id, () => {});
    S.procIds.socks = proc.id;
    registerProc(proc.id, (d) => {
      if (d.type === "stdout" || d.type === "stderr") appendLog($("#socksLog"), typeof d.data === "string" ? d.data : "");
      else if (d.type === "exit") {
        unregisterProc(proc.id);
        S.running.socks = false;
        socksUi();
        appendLog($("#socksLog"), "\n[GUI] " + t("Прокси остановлен.") + "\n");
      }
    });
    $("#socksAddr").textContent = "socks5h://127.0.0.1:" + port;
    $("#socksInfo").hidden = false;
  }

  function socksUi() {
    $("#btnSocksRun").hidden = S.running.socks;
    $("#btnSocksStop").hidden = !S.running.socks;
  }

  /* ───────── инструменты: find-junk / find-sni ───────── */
  function toolsKey(cmd) {
    return cmd.includes("find-junk") ? "fj" : "fs";
  }

  async function runTool(kind) {
    const key = kind; // 'fj' | 'fs'
    if (S.running[key]) return;
    S.running[key] = true;
    toolsUi(key);
    const log = $("#toolsLog");
    if (!log.dataset.forKey || log.dataset.forKey !== key) { log.textContent = ""; log.dataset.forKey = key; }
    $("#foundCmdBadge").classList.add("hidden");
    let cmd;
    if (key === "fj") {
      cmd =
        quoteExe() + " find-junk -gen-i1 " + $("#fjGenI1").value +
        " -threshold " + (+$("#fjThreshold").value || 95) +
        " -n " + (+$("#fjSample").value || 5) +
        " -jt " + (+$("#fjJt").value || 10) +
        (S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "");
    } else {
      cmd =
        quoteExe() + " find-sni -p " + $("#fsProto").value +
        " -threshold " + (+$("#fsThreshold").value || 70) +
        (S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "");
    }
    appendLog(log, "$ " + (IS_MOCK ? cmd.replace(/^"[^"]*"/, "warpscout") : cmd) + "\n\n");
    try {
      const proc = await os().execCommand(cmd, { stream: true });
      S.procIds[key] = proc.id;
      registerProc(proc.id, (d) => {
        if (d.type === "stdout" || d.type === "stderr") {
          const data = typeof d.data === "string" ? d.data : "";
          appendLog(log, data);
          const m = /warpscout (scan -p \S+.*)/.exec(data);
          if (m && S.running[key]) {
            $("#foundCmdBadge").classList.remove("hidden");
            S.foundCmd = "warpscout " + m[1].trim();
            appendLog(log, "\n[GUI] " + t("Нажмите «Применить к скану».") + "\n");
          }
        } else if (d.type === "exit") {
          unregisterProc(proc.id);
          S.running[key] = false;
          toolsUi(key);
        }
      });
    } catch (e) {
      S.running[key] = false;
      toolsUi(key);
      toast(t("Не удалось запустить"), "err");
    }
  }

  function toolsUi(key) {
    $("#btnFjRun").hidden = key === "fj" && S.running.fj;
    $("#btnFjStop").hidden = !(key === "fj" && S.running.fj);
    $("#btnFsRun").hidden = key === "fs" && S.running.fs;
    $("#btnFsStop").hidden = !(key === "fs" && S.running.fs);
  }

  function applyFoundCmd() {
    const cmd = S.foundCmd;
    if (!cmd) { toast(t("Сначала найдите команду"), "err"); return; }
    const s = S.scan;
    const flags = {
      "-p": (v) => (s.proto = v),
      "-proto": (v) => (s.proto = v),
      "-P": () => (s.tunPing = true),
      "-n": (v) => (s.sample = +v || 5),
      "-gen-i1": (v) => (s.genI1 = v),
      "-jc": (v) => (s.jc = +v),
      "-jmin": (v) => (s.jmin = +v),
      "-jmax": (v) => (s.jmax = +v),
      "-masque-sni": (v) => (s.masqueSni = v),
      "-threshold": () => {},
    };
    const tokens = cmd.split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      const f = tokens[i];
      if (flags[f]) {
        if (f === "-P") flags[f]();
        else { flags[f](tokens[i + 1]); i++; }
      }
    }
    // MASQUE несовместим с фильтрами узлов — сбрасываем, иначе warpscout вернёт ошибку
    if (s.proto === "masque" || s.proto === "masque-h2") {
      s.node = ""; s.country = ""; s.exclNode = ""; s.exclCountry = "";
    }
    S.foundCmd = ""; // применена — не даём переиспользовать устаревшую
    syncInputsFromState();
    updateCmdPreview();
    persist();
    switchTab("scan");
    toast(t("Параметры применены к скану"), "ok");
  }

  /* ───────── вкладки/интерфейс ───────── */
  function switchTab(name) {
    $$(".nav__item").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-tab") === name));
    $$(".tab").forEach((t) => t.classList.toggle("is-active", t.id === "tab-" + name));
    if (name === "config") { fillEndpointSelect(); renderConf(); }
    // v2.1.1: перешли на вкладку «Аккаунт» — перепроверяем файл (вдруг его
    // положили вручную, пока приложение было открыто)
    if (name === "account") recheckAccount().catch(() => {});
  }

  function switchSubtab(name) {
    $$(".subtab").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-subtab") === name));
    $("#resultsWrap").classList.toggle("hidden", name !== "results");
    $("#logWrap").classList.toggle("hidden", name !== "log");
  }

  /* ───────── синхронизация формы ↔ состояние ───────── */
  function syncStateFromInputs() {
    const s = S.scan;
    s.tunPing = $("#fTunPing").checked;
    s.full = $("#fFull").checked;
    s.sample = +$("#fSample").value || 10;
    s.jt = +$("#fJt").value || 10;
    s.timeout = +$("#fTimeout").value || 2;
    s.tunPingCount = +$("#fTunPingCount").value || 10;
    s.exclNode = $("#fExclNode").value;
    s.exclCountry = $("#fExclCountry").value;
    s.node = $("#fNode").value;
    s.country = $("#fCountry").value;
    s.i1Sni = $("#fI1Sni").value;
    s.jc = $("#fJc").value === "" ? "" : +$("#fJc").value;
    s.jmin = $("#fJmin").value === "" ? "" : +$("#fJmin").value;
    s.jmax = $("#fJmax").value === "" ? "" : +$("#fJmax").value;
    s.genJunk = $("#fGenJunk").checked;
    s.masqueSni = $("#fMasqueSni").value;
    s.masqueAttempts = +$("#fMasqueAttempts").value || 3;
    s.through = $("#fThrough").value;
    s.innerProto = $("#fInnerProto").value;
    s.target = $("#fTarget").value;
    s.pingTarget = $("#fPingTarget").value;
    s.port = $("#fPort").value;
    s.ipv6 = $("#fIpv6").checked;
    s.speed = $("#fSpeed").checked;
    s.bestBySpeed = $("#fBestBySpeed").checked;
  }

  function syncInputsFromState() {
    const s = S.scan;
    $("#fTunPing").checked = s.tunPing;
    $("#fFull").checked = s.full;
    $("#fSample").value = s.sample;
    $("#fJt").value = s.jt;
    $("#fTimeout").value = s.timeout;
    $("#fTunPingCount").value = s.tunPingCount;
    $("#fExclNode").value = s.exclNode;
    $("#fExclCountry").value = s.exclCountry;
    $("#fNode").value = s.node;
    $("#fCountry").value = s.country;
    $("#fI1Sni").value = s.i1Sni;
    $("#fJc").value = s.jc;
    $("#fJmin").value = s.jmin;
    $("#fJmax").value = s.jmax;
    $("#fGenJunk").checked = s.genJunk;
    $("#fMasqueSni").value = s.masqueSni;
    $("#fMasqueAttempts").value = s.masqueAttempts;
    $("#fThrough").value = s.through;
    $("#fInnerProto").value = s.innerProto;
    $("#fTarget").value = s.target;
    $("#fPingTarget").value = s.pingTarget;
    $("#fPort").value = s.port;
    $("#fIpv6").checked = s.ipv6;
    $("#fSpeed").checked = s.speed;
    $("#fBestBySpeed").checked = s.bestBySpeed;
    $$("#protoSeg .seg__btn").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-proto") === s.proto));
    $$("#i1Seg .seg__btn").forEach((b) => b.classList.toggle("is-active", (b.getAttribute("data-i1") || "") === (s.genI1 || "")));
    $("#cardAwg").classList.toggle("hidden", s.proto !== "awg");
    $("#cardMasque").classList.toggle("hidden", !(s.proto === "masque" || s.proto === "masque-h2"));
  }

  function syncCfgFromInputs() {
    const c = S.cfg;
    const o = c.obf;
    c.dnsCustom = $("#cfgDnsCustom").value;
    c.endpoint = $("#cfgEndpoint").value.trim();
    c.mtu = +$("#cfgMtu").value || 0;
    c.keepalive = +$("#cfgKeepalive").value || 0;
    c.allowed = $("#cfgAllowed").value;
    c.allowedCustom = $("#cfgAllowedCustom").value;
    c.tableOff = $("#cfgTableOff").checked;
    o.jc = +$("#cfgJc").value || 0;
    o.jmin = +$("#cfgJmin").value || 0;
    o.jmax = +$("#cfgJmax").value || 0;
    o.s1 = +$("#cfgS1").value || 0;
    o.s2 = +$("#cfgS2").value || 0;
    o.s3 = +$("#cfgS3").value || 0;
    o.s4 = +$("#cfgS4").value || 0;
    o.h1 = $("#cfgH1").value.trim();
    o.h2 = $("#cfgH2").value.trim();
    o.h3 = $("#cfgH3").value.trim();
    o.h4 = $("#cfgH4").value.trim();
    o.i1 = $("#cfgI1").value.trim();
    o.cpa = $("#cfgCpa").value.trim();
    o.rekeyAfter = $("#cfgRekeyAfter").value.trim();
    o.rekeyTo = $("#cfgRekeyTo").value.trim();
    o.rejectAfter = $("#cfgRejectAfter").value.trim();
    o.keepaliveTo = $("#cfgKeepaliveTo").value.trim();
    o.maxHs = $("#cfgMaxHs").value.trim();
    o.trailers = $("#cfgTrailers").value;
    o.noCookies = $("#cfgNoCookies").value;
    o.hpk = $("#cfgHpk").value.trim();
  }

  function syncCfgInputsFromState() {
    const c = S.cfg;
    const o = c.obf;
    $("#cfgDnsCustom").value = c.dnsCustom;
    $("#cfgEndpoint").value = c.endpoint;
    $("#cfgMtu").value = c.mtu;
    $("#cfgKeepalive").value = c.keepalive;
    $("#cfgAllowed").value = c.allowed;
    $("#cfgAllowedCustom").value = c.allowedCustom;
    $("#cfgTableOff").checked = c.tableOff;
    $("#cfgJc").value = o.jc; $("#cfgJmin").value = o.jmin; $("#cfgJmax").value = o.jmax;
    $("#cfgS1").value = o.s1; $("#cfgS2").value = o.s2; $("#cfgS3").value = o.s3; $("#cfgS4").value = o.s4;
    $("#cfgH1").value = o.h1; $("#cfgH2").value = o.h2; $("#cfgH3").value = o.h3; $("#cfgH4").value = o.h4;
    $("#cfgI1").value = o.i1;
    $("#cfgCpa").value = o.cpa; $("#cfgRekeyAfter").value = o.rekeyAfter; $("#cfgRekeyTo").value = o.rekeyTo;
    $("#cfgRejectAfter").value = o.rejectAfter; $("#cfgKeepaliveTo").value = o.keepaliveTo; $("#cfgMaxHs").value = o.maxHs;
    $("#cfgTrailers").value = o.trailers; $("#cfgNoCookies").value = o.noCookies; $("#cfgHpk").value = o.hpk;
    $$("#cfgVerSeg .seg__btn").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-ver") === c.ver));
    $$("#cfgDnsSeg .seg__btn").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-dns") === c.dns));
    $("#cfgDnsCustom").classList.toggle("hidden", c.dns !== "custom");
    $("#cfgAllowedCustom").classList.toggle("hidden", c.allowed !== "custom");
  }

  const persist = debounce(() => {
    if (!HAS_NL) return;
    try {
      store()
        .setData("state", JSON.stringify({ scan: S.scan, cfg: S.cfg, settings: S.settings, customPresets: S.customPresets, compact: S.compact, foundCmd: S.foundCmd || "", history: S.history.slice(0, 10), qcHistory: S.qcHistory.slice(0, 50) }))
        .catch(() => {});
    } catch (e) {}
  }, 400);

  window.addEventListener("beforeunload", () => {
    if (!HAS_NL) return;
    try { store().setData("state", JSON.stringify({ scan: S.scan, cfg: S.cfg, settings: S.settings, customPresets: S.customPresets, compact: S.compact, foundCmd: S.foundCmd || "", history: S.history.slice(0, 10), qcHistory: S.qcHistory.slice(0, 50) })); } catch (e) {}
  });

  /* ───────── проверка warpscout ───────── */
  async function checkWarpscout() {
    const el = $("#stWs");
    try {
      const cmd = quoteExe() + " version";
      const res = await os().execCommand(cmd);
      const out = String((res && (res.stdOut != null ? res.stdOut : res.output)) || "").trim();
      if (/^\d+\.\d+/.test(out)) {
        S.wsVersion = out;
        S.wsChecked = true;
        renderStatusWs();
        el.className = "statusline__row is-ok";
        $("#stWs").title = S.paths.wsPath;
        renderWsHints();
        return true;
      }
    } catch (e) { /* падение ниже */ }
    S.wsVersion = "";
    S.wsChecked = true;
    renderStatusWs();
    el.className = "statusline__row is-err";
    renderWsHints();
    return false;
  }

  async function browseWsPath() {
    let p;
    try {
      p = await os().showOpenDialog(t("Выберите warpscout.exe"), { multiSelections: false });
    } catch (e) { p = null; }
    let picked = null;
    if (Array.isArray(p) && p[0]) picked = p[0];
    else if (typeof p === "string" && p) picked = p;
    if (IS_MOCK && !picked) { toast(t("Выбор файла работает только в приложении"), "err"); return; }
    if (!picked) return;
    S.settings.wsPath = picked;
    S.paths.wsPath = picked;
    $("#setWsPath").value = picked;
    persist();
    checkWarpscout();
  }

  /* ───────── инициализация ───────── */
  async function computePaths() {
    if (IS_MOCK) {
      S.paths.dataDir = "C:\\Users\\Demo\\AppData\\Roaming\\WARPScoutGUI"; // v2.1.0: как в реальном приложении (Roaming)
    } else {
      let dataDir = "";
      try { dataDir = await os().getPath("data"); } catch (e) { dataDir = ""; }
      dataDir = (dataDir || (window.NL_PATH || "") || "").replace(/[\\/]+$/, "");
      if (!dataDir) dataDir = "."; // крайний случай: относительно CWD
      S.paths.dataDir = dataDir + "\\WARPScoutGUI";
    }
    S.paths.accPath = S.paths.dataDir + "\\warpscout-account.json";
    S.paths.reportsDir = S.paths.dataDir + "\\reports";
    S.paths.wsPath = S.settings.wsPath || (window.NL_PATH ? window.NL_PATH + "\\bin\\warpscout.exe" : "bin\\warpscout.exe");
    // v2.1.0: папка данных существует с первого запуска — иначе warpscout не сможет
    // сохранить аккаунт (не создаёт родительские каталоги), а «Открыть папку» падал
    await ensureDir(S.paths.dataDir);
    await ensureDir(S.paths.reportsDir);
    $("#setWsPath").value = S.paths.wsPath;
    $("#setAccPath").value = S.paths.accPath;
    $("#setReportDir").value = S.paths.reportsDir;
  }

  async function restoreState() {
    if (!HAS_NL) return;
    try {
      const raw = await store().getData("state");
      if (!raw) return;
      const st = JSON.parse(raw);
      if (st.scan) S.scan = Object.assign({}, DEFAULT_SCAN, st.scan);
      if (st.cfg) S.cfg = deepMerge(S.cfg, st.cfg);
      if (st.settings) S.settings = Object.assign({}, S.settings, st.settings);
      if (Array.isArray(st.customPresets)) S.customPresets = st.customPresets.filter((p) => p && p.name && p.scan).slice(0, 20);
      S.compact = !!st.compact;
      if (Array.isArray(st.history)) S.history = st.history.slice(0, 10);
      if (Array.isArray(st.qcHistory)) S.qcHistory = st.qcHistory.filter((q) => q && q.ep && q.kind).slice(0, 50);
      S.foundCmd = st.foundCmd || "";
    } catch (e) {}
  }

  function deepMerge(base, extra) {
    const out = Object.assign({}, base);
    for (const k of Object.keys(extra || {})) {
      if (extra[k] && typeof extra[k] === "object" && !Array.isArray(extra[k]) && base[k] && typeof base[k] === "object") {
        out[k] = deepMerge(base[k], extra[k]);
      } else out[k] = extra[k];
    }
    return out;
  }

  function bindEvents() {
    // вкладки
    $$(".nav__item").forEach((b) => b.addEventListener("click", () => switchTab(b.getAttribute("data-tab"))));
    $$(".subtab").forEach((b) => b.addEventListener("click", () => switchSubtab(b.getAttribute("data-subtab"))));

    // пресеты
    $$("#presetChips .chip").forEach((ch) =>
      ch.addEventListener("click", () => {
        $$("#presetChips .chip").forEach((c) => c.classList.remove("is-active"));
        ch.classList.add("is-active");
        const p = PRESETS[ch.getAttribute("data-preset")];
        p.apply();
        syncInputsFromState();
        $("#presetHint").innerHTML = p.hint;
        updateCmdPreview();
        persist();
      })
    );
    $("#btnResetPreset").addEventListener("click", () => {
      $$("#presetChips .chip").forEach((c) => c.classList.toggle("is-active", c.getAttribute("data-preset") === "default"));
      PRESETS.default.apply();
      syncInputsFromState();
      $("#presetHint").innerHTML = t(PRESETS.default.hint);
      updateCmdPreview();
      persist();
    });

    // протокол
    $$("#protoSeg .seg__btn").forEach((b) =>
      b.addEventListener("click", () => {
        S.scan.proto = b.getAttribute("data-proto");
        const hints = {
          wg: t("Обычный WireGuard — работает там, где трафик не фильтруется."),
          awg: t("Обфусцированный WireGuard — проходит там, где обычный WG фильтруется."),
          masque: t("CONNECT-IP поверх QUIC, второй транспорт Cloudflare. Узел один на всю сеть."),
          "masque-h2": t("MASQUE поверх TCP — те же проверки, но транспорт HTTP/2."),
        };
        $("#protoHint").textContent = hints[S.scan.proto];
        syncInputsFromState();
        updateCmdPreview();
        persist();
      })
    );

    // I1 сегменты
    $$("#i1Seg .seg__btn").forEach((b) =>
      b.addEventListener("click", () => {
        S.scan.genI1 = b.getAttribute("data-i1") || "";
        syncInputsFromState();
        updateCmdPreview();
        persist();
      })
    );

    // любые поля ввода
    $$("#tab-scan input, #tab-scan select").forEach((el) => {
      el.addEventListener("change", () => { syncStateFromInputs(); updateCmdPreview(); persist(); });
      el.addEventListener("input", debounce(() => { syncStateFromInputs(); updateCmdPreview(); persist(); }, 250));
    });

    // скан
    $("#btnRunScan").addEventListener("click", runScan);
    $("#btnStopScan").addEventListener("click", stopScan);
    $("#btnCopyCmd").addEventListener("click", () => copyText(buildScanCmd(S.scan), t("Команда скопирована")));
    $("#btnSortPing").addEventListener("click", () => {
      // v1.6.0: тумблер «↕ пинг» синхронизирован с сортировкой по заголовку
      if (S.sortByPing || S.sortKey === "ping") { S.sortByPing = false; S.sortKey = "report"; S.sortDir = 1; }
      else { S.sortByPing = true; S.sortKey = "ping"; S.sortDir = 1; }
      renderResults();
    });
    $("#btnHistory").addEventListener("click", () => toggleHistory());

    // фильтр результатов (v1.3.0)
    $("#resFilter").addEventListener("input", debounce(() => applyFilter($("#resFilter").value), 140));
    $("#resFilter").addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.stopPropagation(); clearFilter(true); }
    });
    $("#resFilterClear").addEventListener("click", () => clearFilter(true));

    $("#btnDensity").addEventListener("click", toggleCompact);
    $("#btnExportCsv").addEventListener("click", exportCsv);
    $("#btnCopyEps").addEventListener("click", copyEndpoints); // v1.5.0
    $("#btnConfQr").addEventListener("click", showConfQr);
    $("#btnQrPng").addEventListener("click", saveQrPng);
    $("#btnQrCopy").addEventListener("click", () => copyText(buildConf(), t("Конфиг скопирован")));
    $("#btnExportState").addEventListener("click", exportState);
    $("#btnImportState").addEventListener("click", importState);
    bindImportStateFile();
    $("#btnPresetsExport").addEventListener("click", exportPresets);
    $("#btnPresetsImport").addEventListener("click", importPresets);
    bindImportPresetsFile();
    $("#btnPresetSave").addEventListener("click", () => togglePresetSaveRow(true));
    $("#btnPresetSaveCancel").addEventListener("click", () => togglePresetSaveRow(false));
    $("#btnPresetSaveOk").addEventListener("click", saveCurrentPreset);
    $("#presetName").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); saveCurrentPreset(); }
      if (e.key === "Escape") { e.stopPropagation(); togglePresetSaveRow(false); }
    });

    $("#btnTheme").addEventListener("click", toggleTheme);
    $("#btnToConfig").addEventListener("click", () => {
      const best = S.results.find((r) => !r.torn);
      if (!best) { toast(t("Сначала выполните скан"), "err"); return; }
      S.cfg.endpoint = best.endpoint;
      syncCfgInputsFromState();
      switchTab("config");
      toast(tF("Лучший эндпоинт из скана: {ep}", { ep: best.endpoint }), "ok");
    });

    // таблица: двойной клик = копия ip:port
    $("#resultsBody").addEventListener("dblclick", (e) => {
      const tr = e.target.closest("tr");
      if (tr) copyText(tr.getAttribute("data-ep"), "Эндпоинт скопирован");
    });

    // конфиг
    $$("#cfgVerSeg .seg__btn").forEach((b) =>
      b.addEventListener("click", () => {
        S.cfg.ver = b.getAttribute("data-ver");
        syncCfgInputsFromState();
        renderConf();
        persist();
      })
    );
    $$("#cfgDnsSeg .seg__btn").forEach((b) =>
      b.addEventListener("click", () => {
        S.cfg.dns = b.getAttribute("data-dns");
        syncCfgInputsFromState();
        renderConf();
        persist();
      })
    );
    $$("#tab-config input, #tab-config select, #tab-config textarea").forEach((el) => {
      el.addEventListener("change", () => { syncCfgFromInputs(); renderConf(); persist(); });
      el.addEventListener("input", debounce(() => { syncCfgFromInputs(); renderConf(); persist(); }, 250));
    });
    $("#cfgEndpointSel").addEventListener("change", () => {
      if (!$("#cfgEndpointSel").value) return;
      S.cfg.endpoint = $("#cfgEndpointSel").value;
      $("#cfgEndpoint").value = S.cfg.endpoint;
      const r = selectedRowInfo();
      const info = $("#cfgEndpointInfo");
      if (r) {
        info.hidden = false;
        info.textContent = t("Узел") + " " + r.node + " · " + r.loc + " · " + t("пинг") + " " + (r.tunPing || r.ping) + (r.loss ? " · " + t("потери") + " " + r.loss : "");
      }
      renderConf();
      persist();
    });
    $("#cfgAllowed").addEventListener("change", () => {
      $("#cfgAllowedCustom").classList.toggle("hidden", $("#cfgAllowed").value !== "custom");
    });
    $("#btnCfgDefaults").addEventListener("click", () => {
      S.cfg.obf = {
        jc: 4, jmin: 40, jmax: 70,
        s1: 0, s2: 0, s3: 0, s4: 0,
        h1: "1", h2: "2", h3: "3", h4: "4",
        i1: EXAMPLE_I1,
        cpa: "27-97", rekeyAfter: "116-131", rekeyTo: "6-9", rejectAfter: "171-196",
        keepaliveTo: "9-16", maxHs: "18-26", trailers: "on", noCookies: "on", hpk: "",
      };
      syncCfgInputsFromState();
      renderConf();
      toast(t("Параметры обфускации восстановлены из примера"), "ok");
    });
    $("#btnClearI1").addEventListener("click", () => { $("#cfgI1").value = ""; syncCfgFromInputs(); renderConf(); });
    $("#btnImportI1").addEventListener("click", importI1);
    $("#btnImportConf").addEventListener("click", importConf); // v1.5.0
    bindImportConfFile(); // v1.5.0
    $("#btnCopyConf").addEventListener("click", () => copyText(buildConf(), t("Конфиг скопирован")));
    $("#btnSaveConf").addEventListener("click", saveConf);

    // аккаунт
    $("#btnRegister").addEventListener("click", () => runRegister(false));
    $("#btnRegisterFresh").addEventListener("click", () => {
      if (confirm("Создать новый аккаунт WARP с нуля? Текущие ключи будут заменены.")) runRegister(true);
    });
    $("#btnRegisterStop").addEventListener("click", async () => {
      await killProc(S.procIds.register);
      S.procIds.register = null;
      S.running.register = false;
      registerUi();
      appendLog($("#accLog"), "\n[GUI] Остановлено пользователем.\n");
    });
    $("#btnOpenAccFolder").addEventListener("click", () => {
      if (IS_MOCK) { toast(t("Только в приложении Windows"), "err"); return; }
      os().open(S.paths.dataDir).catch(() => toast(t("Не удалось открыть папку"), "err"));
    });
    // v2.1.1: перепроверка / копирование пути / помощь при «коде -1»
    $("#btnAccRecheck").addEventListener("click", async () => {
      const has = await recheckAccount();
      toast(has ? t("Аккаунт найден") : t("Аккаунт не найден — смотрите путь выше"), has ? "ok" : "err");
    });
    $("#btnAccCopyPath").addEventListener("click", () => copyText(S.paths.accPath || "", t("Путь скопирован")));
    bindExeHelpers();

    // socks
    $("#btnSocksRun").addEventListener("click", socksToggle);
    $("#btnSocksStop").addEventListener("click", socksToggle);
    $("#btnSocksBest").addEventListener("click", () => {
      const best = S.results.find((r) => !r.torn);
      if (!best) { toast(t("Нет результатов скана"), "err"); return; }
      $("#socksEndpoint").value = best.endpoint;
      $("#socksProto").value = S.scan.proto;
      toast(tF("Взят лучший эндпоинт: {ep}", { ep: best.endpoint }), "ok");
    });
    $("#btnCopySocks").addEventListener("click", () => copyText($("#socksAddr").textContent, t("Адрес прокси скопирован")));

    // инструменты
    $("#btnFjRun").addEventListener("click", () => runTool("fj"));
    $("#btnFjStop").addEventListener("click", () => { killProc(S.procIds.fj); });
    $("#btnFsRun").addEventListener("click", () => runTool("fs"));
    $("#btnFsStop").addEventListener("click", () => { killProc(S.procIds.fs); });
    $("#btnApplyFound").addEventListener("click", applyFoundCmd);

    // настройки
    $("#btnBrowseWs").addEventListener("click", browseWsPath);
    $("#btnCheckWs").addEventListener("click", () => {
      S.paths.wsPath = $("#setWsPath").value.trim() || S.paths.wsPath;
      S.settings.wsPath = S.paths.wsPath;
      persist();
      checkWarpscout();
    });
    $("#btnOpenAcc").addEventListener("click", () => {
      if (IS_MOCK) { toast(t("Только в приложении Windows"), "err"); return; }
      os().open(S.paths.dataDir).catch(() => {});
    });
    $("#btnOpenReports").addEventListener("click", () => {
      if (IS_MOCK) { toast(t("Только в приложении Windows"), "err"); return; }
      os().open(S.paths.reportsDir).catch(() => {});
    });
    $("#btnResetStorage").addEventListener("click", async () => {
      if (!confirm(t("Сбросить все настройки и данные приложения?"))) return;
      S.scan = Object.assign({}, DEFAULT_SCAN);
      S.cfg = {
        ver: "awg31", dns: "cloudflare", dnsCustom: "", endpoint: "", mtu: 1280,
        keepalive: 0, allowed: "both", allowedCustom: "", tableOff: false,
        obf: {
          jc: 4, jmin: 40, jmax: 70, s1: 0, s2: 0, s3: 0, s4: 0,
          h1: "1", h2: "2", h3: "3", h4: "4", i1: EXAMPLE_I1,
          cpa: "27-97", rekeyAfter: "116-131", rekeyTo: "6-9", rejectAfter: "171-196",
          keepaliveTo: "9-16", maxHs: "18-26", trailers: "on", noCookies: "on", hpk: "",
        },
      };
      S.results = [];
      S.sortByPing = false;
      S.sortKey = "report";
      S.sortDir = 1;
      S.prevEndpoints = null;
      S.diff = null;
      S.customPresets = [];
      S.compact = false;
      S.history = []; // БАГФИКС 1.4.0: «Сбросить настройки и данные» теперь чистит и историю
      resetFilterSilently();
      try { await store().setData("state", "{}"); } catch (e) {}
      syncInputsFromState();
      syncCfgInputsFromState();
      updateCmdPreview();
      renderResults();
      renderConf();
      renderCustomPresets();
      applyCompact();
      renderHistoryBtn();
      toast(t("Настройки сброшены"), "ok");
    });

    // горячие клавиши
    const TAB_ORDER = ["scan", "config", "account", "socks", "tools", "settings"];
    document.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && !e.altKey && e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        switchTab(TAB_ORDER[+e.key - 1]);
        return;
      }
      if (mod && e.key === "Enter") {
        e.preventDefault();
        switchTab("scan");
        if (!S.running.scan) runScan();
        return;
      }
      if (mod && (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А")) {
        // Ctrl+F — фильтр по результатам (работает и в русской раскладке)
        e.preventDefault();
        switchTab("scan");
        const f = $("#resFilter");
        f.focus();
        f.select();
        return;
      }
      if (mod && (e.key === "s" || e.key === "S" || e.key === "ы" || e.key === "Ы")) {
        const active = $(".nav__item.is-active");
        if (active && active.getAttribute("data-tab") === "config") {
          e.preventDefault();
          saveConf();
        }
        return;
      }
      if (e.key === "Escape") {
        const qc = $("#qcModal");
        if (qc && !qc.classList.contains("hidden")) { toggleQc(false); return; }
        const modal = $("#kbdModal");
        if (modal && !modal.classList.contains("hidden")) { toggleKbd(false); return; }
        const qr = $("#qrModal");
        if (qr && !qr.classList.contains("hidden")) { toggleQr(false); return; }
        const cmp = $("#cmpModal");
        if (cmp && !cmp.classList.contains("hidden")) { toggleCmp(false); return; }
        const saveRow = $("#presetSaveRow");
        if (saveRow && !saveRow.classList.contains("hidden")) { togglePresetSaveRow(false); return; }
        if (S.historyOpen) { toggleHistory(false); return; }
        if (S.filter && document.activeElement === $("#resFilter")) { clearFilter(true); return; }
        if (S.running.scan) stopScan();
        return;
      }
      if (!mod && !e.altKey && (e.key === "?" || (e.shiftKey && e.key === "/"))) {
        const t = e.target;
        if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;
        toggleKbd(true);
      }
    });

    // модалка горячих клавиш
    $("#btnKbd").addEventListener("click", () => toggleKbd(true));
    $$("[data-close-kbd]").forEach((el) => el.addEventListener("click", () => toggleKbd(false)));

    // модалка QR
    $$("[data-close-qr]").forEach((el) => el.addEventListener("click", () => toggleQr(false)));

    // модалка быстрой проверки (v1.9.0)
    $$("[data-close-qc]").forEach((el) => el.addEventListener("click", () => toggleQc(false)));

    // v2.0.0: режим выбора / пакетная проверка / HTML-отчёт
    const bSelMode = $("#btnSelectMode");
    if (bSelMode) bSelMode.addEventListener("click", () => toggleQcSelMode());
    const bBatch = $("#btnBatchCheck");
    if (bBatch) bBatch.addEventListener("click", () => { runBatchCheck().catch((e) => console.error("batch:", e)); });
    const bBatchCancel = $("#btnBatchCancel");
    if (bBatchCancel) bBatchCancel.addEventListener("click", () => toggleQcSelMode(false));
    const bHtml = $("#btnExportHtml");
    if (bHtml) bHtml.addEventListener("click", exportScanHtml);

    // модалка сравнения сканов (v1.7.0)
    $$("[data-close-cmp]").forEach((el) => el.addEventListener("click", () => toggleCmp(false)));
    const selA = $("#cmpSelA");
    const selB = $("#cmpSelB");
    if (selA) selA.addEventListener("change", renderCmpBody);
    if (selB) selB.addEventListener("change", renderCmpBody);

    $("#btnAccImport").addEventListener("click", importAccount); // v2.1.0
    bindImportAccFile(); // v2.1.0
    // внешние ссылки — системный браузер
    $$("a[data-ext]").forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (HAS_NL && !IS_MOCK) os().open(a.href);
        else window.open(a.href, "_blank");
      })
    );
  }

  async function init() {
    $("#modeBadge").hidden = !IS_MOCK;
    bindProcEvents();

    await restoreState();
    ensureLangSwitch();                       // v1.6.0: RU/EN-переключатель в сайдбаре
    applyLang(S.settings.lang || "ru", { skipPersist: true }); // v1.6.0: применить язык
    applyTheme(S.settings.theme || "dark");
    applyCompact();
    renderCustomPresets();
    await computePaths();
    syncInputsFromState();
    syncCfgInputsFromState();
    $("#presetHint").innerHTML = t(PRESETS.default.hint);
    highlightMatchingPreset(); // v1.5.0: подсветить пресет, соответствующий сохранённой форме
    bindEvents();
    updateCmdPreview();
    renderResults();
    renderConf();

    if (!S.results.length && S.history.length) {
      // восстановим последнюю таблицу из истории, чтобы UI не был пустым
      const h = S.history[0];
      S.results = h.results.map((r) => Object.assign({}, r));
      S.viewMeta = { withP: h.withP, withSpeed: h.withSpeed };
      S.viewProto = h.proto;
      renderResults(); // БАГФИКС 1.4.0: без этого таблица оставалась пустой до первого действия
      fillEndpointSelect();
    }
    renderHistoryBtn();
    await loadAccount();
    renderAccount();
    adoptAccountFromPlaces().catch(() => {}); // v2.1.0: автоподхват готового аккаунта
    renderConf();
    if (IS_MOCK) {
      S.wsVersion = "0.16.0"; // демо: считаем warpscout найденным
      renderStatusWs();
    } else {
      checkWarpscout();
    }
    renderAccountStatusline();
  }

  // отладочный хук (безвредно): помогает диагностике через консоль
  window.__WSGUI = { S, runScan: () => runScan().catch((e) => console.error("runScan:", e)), buildScanCmd, buildConf, parseReport, switchTab, parseConfText, applyImportedConf, histBestPing, openCompare, renderCmpBody, toggleCmp, fillCmpSelectors, exportTrendCsv, importAccount, registerHintFor, validateAccountJson };

  if (HAS_NL) {
    window.addEventListener("load", () => {
      if (IS_MOCK) {
        setTimeout(init, 30);
      } else {
        Neutralino.init();
        Neutralino.events.on("ready", () => setTimeout(init, 0));
      }
    });
  } else {
    window.addEventListener("load", () => {
      document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;color:#eee;background:#0e1114">Откройте приложение через WARPScoutGUI.exe</div>';
    });
  }
})();
