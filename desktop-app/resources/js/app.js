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

  /* ───── v2.5.0: платформенный слой (Windows / Linux); v2.5.1: + macOS ─────
     Windows — прежнее поведение (ни одна ветка ниже не меняет логику).
     Linux (NL_OS = "Linux"): бинарник warpscout без .exe, POSIX-разделитель
     путей, chmod +x вместо PowerShell Unblock-File, папка данных
     ~/.local/share/<имя>.
     macOS (NL_OS = "Darwin"): всё POSIX-поведение Linux переиспользуется как
     есть (IS_LINUX = !IS_WIN), поверх — mac-замены фраз (Console.app вместо
     journalctl) и mac-пути данных ~/Library/Application Support/<имя>.
     Папка данных на всех ОС — os.getPath("data") (кроссплатформенно).
     В браузерном демо (IS_MOCK) остаёмся win-подобными,
     чтобы демо соответствовало Windows-релизу. */
  const IS_WIN0_RAW = typeof window.NL_OS === "string" ? window.NL_OS : "";
  const IS_ANDROID = /^android/i.test(IS_WIN0_RAW);
  const IS_WIN = IS_ANDROID ? false : (IS_MOCK || IS_WIN0_RAW === "" ? true : /^win/i.test(IS_WIN0_RAW));
  const IS_LINUX = !IS_WIN;
  const IS_MAC = !IS_WIN && /^darwin|^mac/i.test(typeof window.NL_OS === "string" ? window.NL_OS : "");
  /* v2.5.0: Android (WebView-оболочка APK): NL_OS = "Android" ставит шим
     neutralino-android.js (window.Neutralino реализован через AndroidNative-мост).
     Поведение как на Linux (POSIX, chmod), бинарь warpscout — libwarpscout.so
     из nativeLibraryDir (путь приходит в window.NL_WS_PATH).
     TOUCH_UI — сенсорный режим: нижние вкладки + главная страница. */
  const TOUCH_UI = IS_ANDROID || /(?:^|[?&])touch=1/.test(typeof location === "object" && location ? String(location.search) : "");
  // v2.5.4 (Android): публичная папка готовых конфигов — видна в любом
  // файловом менеджере и без разрешений пишется через MediaStore (API 29+)
  const ANDROID_DOWNLOAD_DIR = "/storage/emulated/0/Download/WARPScoutGUI";
  const WS_EXE = IS_WIN ? "warpscout.exe" : "warpscout";
  const GUI_EXE = IS_WIN ? "WARPScoutGUI.exe" : "WARPScoutGUI";
  const PSEP = IS_WIN ? "\\" : "/";
  // v2.5.4: UTF-8 → base64 для моста saveToDownloads (там Base64.decode)
  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(String(str == null ? "" : str));
    let bin = "";
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    return btoa(bin);
  }
  // платформенный join: на Windows ведёт себя как старые конкатенации с "\\",
  // на Linux — с "/" (лишние хвостовые разделители и ведущие у хвоста срезаются)
  function pxJoin() {
    let out = "";
    for (let i = 0; i < arguments.length; i++) {
      const part = String(arguments[i] == null ? "" : arguments[i]).replace(/[\\/]+$/, "");
      if (!part) continue;
      out = out ? out + PSEP + part.replace(/^[\\/]+/, "") : part;
    }
    return out;
  }
  // Linux-замены целых фраз: [исходный RU-ключ, linux-RU, linux-EN].
  // Применяются к КЛЮЧУ ДО словаря (platKey), поэтому EN-перевод находится.
  const LINUX_TEXT = [
    ["🔓 Разблокировать exe (антивирус)", "🔓 Разрешить запуск (chmod +x)", "🔓 Allow execution (chmod +x)"],
    ["Unblock-File выполнен: с exe снята метка «скачано из интернета». Попробуйте регистрацию ещё раз.",
     "chmod +x выполнен: право на запуск выдано. Попробуйте регистрацию ещё раз.",
     "chmod +x done: the execute permission has been granted. Try registering again."],
    ["Не удалось выполнить Unblock-File: {err}", "Не удалось выполнить chmod +x: {err}", "Could not run chmod +x: {err}"],
    ["warpscout.exe не найден. Распакуйте ZIP целиком (рядом с WARPScoutGUI.exe должна лежать папка bin с warpscout.exe) или укажите путь в Настройках. Если файл на месте — добавьте папку в исключения антивируса.",
     "warpscout не найден. Распакуйте архив целиком (рядом с WARPScoutGUI должна лежать папка bin с warpscout) или укажите путь в Настройках. Если файл на месте — выдайте ему право на запуск: chmod +x bin/warpscout (или кнопкой «Разрешить запуск» во вкладке «Аккаунт»).",
     "warpscout was not found. Unpack the archive entirely (a bin folder with warpscout must sit next to WARPScoutGUI) or set the path in Settings. If the file is there — grant it the execute permission: chmod +x bin/warpscout (or use the 'Allow execution' button on the 'Account' tab)."],
    ["Код -1: warpscout.exe не смог запуститься или был закрыт. Причины: антивирус заблокировал файл; ZIP распакован не целиком (нет папки bin с warpscout.exe); неверный путь в Настройках. Проверьте папку кнопкой «Открыть папку» и добавьте её в исключения антивируса.",
     "Код -1: warpscout не смог запуститься или был закрыт. Причины: нет права на запуск (выдайте: chmod +x bin/warpscout, или кнопкой «Разрешить запуск» во вкладке «Аккаунт»); архив распакован не целиком (нет папки bin с warpscout); неверный путь в Настройках. Проверьте папку кнопкой «Открыть папку».",
     "Exit code -1: warpscout failed to start or was closed. Causes: no execute permission (grant it: chmod +x bin/warpscout, or via the 'Allow execution' button on the 'Account' tab); the archive was not fully unpacked (no bin folder with warpscout); a wrong path in Settings. Check the folder via 'Open folder'."],
    ["warpscout не отвечает — проверьте путь и антивирус", "warpscout не отвечает — проверьте путь и право на запуск (chmod +x)", "warpscout is not responding — check the path and the execute permission (chmod +x)"],
    ["Файл найден ({p}), но версию получить не удалось — вероятно, антивирус мешает запуску. Откройте вкладку «Аккаунт» и нажмите «Разблокировать exe», либо добавьте папку в исключения антивируса.",
     "Файл найден ({p}), но версию получить не удалось — возможно, у файла нет права на запуск. Выдайте его: chmod +x <файл>, либо кнопкой «Разрешить запуск» во вкладке «Аккаунт».",
     "The file was found ({p}), but its version could not be obtained — the execute permission may be missing. Grant it: chmod +x <file>, or via the 'Allow execution' button on the 'Account' tab."],
    ["Если регистрация падает с «кодом -1»: «Проверить warpscout» показывает, запускается ли exe вообще; «Разблокировать exe» снимает метку «скачано из интернета» (PowerShell Unblock-File); папку из предыдущей кнопки добавьте в исключения антивируса.",
     "Если регистрация падает с «кодом -1»: «Проверить warpscout» показывает, запускается ли warpscout вообще; «Разрешить запуск» выдаёт право на выполнение (chmod +x) — на Linux это частая причина «кода -1» сразу после распаковки архива.",
     "If registration fails with 'exit code -1': 'Check warpscout' shows whether warpscout starts at all; 'Allow execution' grants the execute permission (chmod +x) — on Linux this is the common cause of 'exit code -1' right after unpacking the archive."],
    ["Проверка перед запуском показала версию {v} — сам exe запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: добавьте папку в исключения антивируса (и нажмите «Разблокировать exe»), затем повторите.",
     "Проверка перед запуском показала версию {v} — сам warpscout запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: проверьте системный журнал (journalctl) и повторите попытку.",
     "The preflight check reported version {v} — warpscout itself starts and the path is correct. The process seems to get closed during registration: check the system journal (journalctl) and retry."],
    ["Доступно только в приложении Windows", "Доступно только в приложении", "Available in the desktop app only"],
  ];
  const LINUX_KEY_MAP = {};
  LINUX_TEXT.forEach((row) => { LINUX_KEY_MAP[row[0]] = row[1]; });
  /* v2.5.1: mac-замены целых фраз поверх linux-вариантов: [linux-RU, mac-RU, mac-EN].
     Применяются только на macOS (IS_MAC) — на Linux поведение прежнее. */
  const MAC_TEXT = [
    ["Если регистрация падает с «кодом -1»: «Проверить warpscout» показывает, запускается ли warpscout вообще; «Разрешить запуск» выдаёт право на выполнение (chmod +x) — на Linux это частая причина «кода -1» сразу после распаковки архива.",
     "Если регистрация падает с «кодом -1»: «Проверить warpscout» показывает, запускается ли warpscout вообще; «Разрешить запуск» выдаёт право на выполнение (chmod +x) — на macOS это частая причина «кода -1» сразу после распаковки архива (метку quarantine Gatekeeper снимает: xattr -cr . в папке программы — см. README).",
     "If registration fails with 'exit code -1': 'Check warpscout' shows whether warpscout starts at all; 'Allow execution' grants the execute permission (chmod +x) — on macOS this is the common cause of 'exit code -1' right after unpacking the archive (the Gatekeeper quarantine label is cleared by: xattr -cr . in the app folder — see README)."],
    ["Проверка перед запуском показала версию {v} — сам warpscout запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: проверьте системный журнал (journalctl) и повторите попытку.",
     "Проверка перед запуском показала версию {v} — сам warpscout запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: проверьте Console (Программы → Утилиты → Console) и повторите попытку.",
     "The preflight check reported version {v} — warpscout itself starts and the path is correct. The process seems to get closed during registration: check Console (Applications → Utilities → Console) and retry."],
  ];
  const MAC_KEY_MAP = {};
  MAC_TEXT.forEach((row) => { MAC_KEY_MAP[row[0]] = row[1]; });
  // нормализация ключей/строк для Linux/macOS: имена файлов, разделители, пути.
  // v2.5.1: папка данных в шаблонах — по платформе (os.getPath("data")):
  //   Linux — ~/.local/share/<имя>, macOS — ~/Library/Application Support/<имя>
  const UNIX_DATA_DIR = IS_ANDROID ? "папка данных приложения" : IS_MAC ? "~/Library/Application Support/WARPScoutGUI" : "~/.local/share/WARPScoutGUI";
  function platNorm(s) {
    return String(s)
      .replace(/warpscout\.exe/g, "warpscout")
      .replace(/WARPScoutGUI\.exe/g, "WARPScoutGUI")
      .replace(/bin\\warpscout/g, "bin/warpscout")
      .replace(/%APPDATA%\\WARPScoutGUI/g, UNIX_DATA_DIR)
      .replace(/ \(EBWebView\)/g, "");
  }
  function platKey(s) {
    if (IS_WIN) return s;
    const raw = String(s);
    if (Object.prototype.hasOwnProperty.call(LINUX_KEY_MAP, raw)) {
      const lk = LINUX_KEY_MAP[raw];
      if (IS_MAC && Object.prototype.hasOwnProperty.call(MAC_KEY_MAP, lk)) return MAC_KEY_MAP[lk]; // v2.5.1
      return lk;
    }
    return platNorm(raw);
  }
  function linuxPlatInit() {
    if (!IS_LINUX) return; // Windows — словарь не трогаем вовсе
    // EN-словарь ключится исходными RU-строками; продублируем ключи в
    // linux-нормализованном виде, чтобы t() находил перевод после platKey.
    Object.keys(I18N_EN).forEach((k) => {
      const nk = platKey(k);
      if (nk !== k && I18N_EN[nk] === undefined) I18N_EN[nk] = platNorm(I18N_EN[k]);
    });
    LINUX_TEXT.forEach((row) => { if (I18N_EN[row[1]] === undefined) I18N_EN[row[1]] = row[2]; });
    if (IS_MAC) {
      // v2.5.1: mac-варианты фраз (Console.app вместо journalctl и т. п.) —
      // ключ и EN-перевод добавляются поверх linux-дублей.
      MAC_TEXT.forEach((row) => { if (I18N_EN[row[1]] === undefined) I18N_EN[row[1]] = row[2]; });
    }
  }


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
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } // v2.4.6 (F55): false — тоже неудача
      ta.remove();
      if (ok) toast(okMsg || t("Скопировано"), "ok");
      else toast(t("Не удалось скопировать"), "err");
    }
  }

  /* ───────── состояние ───────── */
  // I1 из эталонного конфиг-примера (маскировка под iCloud-запрос)
  const EXAMPLE_I1 =
    "<b 0xce000000010897a297ecc34cd6dd000044d0ec2e2e1ea2991f467ace4222129b5a098823784694b4897b9986ae0b7280135fa85e196d9ad980b150122129ce2a9379531b0fd3e871ca5fdb883c369832f730e272d7b8b74f393f9f0fa43f11e510ecb2219a52984410c204cf875585340c62238e14ad04dff382f2c200e0ee22fe743b9c6b8b043121c5710ec289f471c91ee414fca8b8be8419ae8ce7ffc53837f6ade262891895f3f4cecd31bc93ac5599e18e4f01b472362b8056c3172b513051f8322d1062997ef4a383b01706598d08d48c221d30e74c7ce000cdad36b706b1bf9b0607c32ec4b3203a4ee21ab64df336212b9758280803fcab14933b0e7ee1e04a7becce3e2633f4852585c567894a5f9efe9706a151b615856647e8b7dba69ab357b3982f554549bef9256111b2d67afde0b496f16962d4957ff654232aa9e845b61463908309cfd9de0a6abf5f425f577d7e5f6440652aa8da5f73588e82e9470f3b21b27b28c649506ae1a7f5f15b876f56abc4615f49911549b9bb39dd804fde182bd2dcec0c33bad9b138ca07d4a4a1650a2c2686acea05727e2a78962a840ae428f55627516e73c83dd8893b02358e81b524b4d99fda6df52b3a8d7a5291326e7ac9d773c5b43b8444554ef5aea104a738ed650aa979674bbed38da58ac29d87c29d387d80b526065baeb073ce65f075ccb56e47533aef357dceaa8293a523c5f6f790be90e4731123d3c6152a70576e90b4ab5bc5ead01576c68ab633ff7d36dcde2a0b2c68897e1acfc4d6483aaaeb635dd63c96b2b6a7a2bfe042f6aed82e5363aa850aace12ee3b1a93f30d8ab9537df483152a5527faca21efc9981b304f11fc95336f5b9637b174c5a0659e2b22e159a9fed4b8e93047371175b1d6d9cc8ab745f3b2281537d1c75fb9451871864efa5d184c38c185fd203de206751b92620f7c369e031d2041e152040920ac2c5ab5340bfc9d0561176abf10a147287ea90758575ac6a9f5ac9f390d0d5b23ee12af583383d994e22c0cf42383834bcd3ada1b3825a0664d8f3fb678261d57601ddf94a8a68a7c273a18c08aa99c7ad8c6c42eab67718843597ec9930457359dfdfbce024afc2dcf9348579a57d8d3490b2fa99f278f1c37d87dad9b221acd575192ffae1784f8e60ec7cee4068b6b988f0433d96d6a1b1865f4e155e9fe020279f434f3bf1bd117b717b92f6cd1cc9bea7d45978bcc3f24bda631a36910110a6ec06da35f8966c9279d130347594f13e9e07514fa370754d1424c0a1545c5070ef9fb2acd14233e8a50bfc5978b5bdf8bc1714731f798d21e2004117c61f2989dd44f0cf027b27d4019e81ed4b5c31db347c4a3a4d85048d7093cf16753d7b0d15e078f5c7a5205dc2f87e330a1f716738dce1c6180e9d02869b5546f1c4d2748f8c90d9693cba4e0079297d22fd61402dea32ff0eb69ebd65a5d0b687d87e3a8b2c42b648aa723c7c7daf37abcc4bb85caea2ee8f55bec20e913b3324ab8f5c3304f820d42ad1b9f2ffc1a3af9927136b4419e1e579ab4c2ae3c776d293d397d575df181e6cae0a4ada5d67ecea171cca3288d57c7bbdaee3befe745fb7d634f70386d873b90c4d6c6596bb65af68f9e5121e67ebf0d89d3c909ceedfb32ce9575a7758ff080724e1ab5d5f43074ecb53a479af21ed03d7b6899c36631c0166f9d47e5e1d4528a5d3d3f744029c4b1c190cbfbad06f5f83f7ad0429fa9a2719c56ffe3783460e166de2d8>";

  // v2.4.6 (F08/F24): канонический cfg — единый источник дефолтов для инициализации,
  // сброса и санитизации импорта
  function defaultCfg() {
    return {
      ver: "awg31", dns: "cloudflare", dnsV6: true, dnsCustom: "", endpoint: "",
      mtu: 1280, keepalive: 0, allowed: "both", allowedCustom: "", tableOff: false,
      obf: {
        jc: 4, jmin: 40, jmax: 70,
        s1: 0, s2: 0, s3: 0, s4: 0,
        h1: "1", h2: "2", h3: "3", h4: "4",
        i1: EXAMPLE_I1, i2: "", i3: "", i4: "", i5: "", // v2.4.6 (F26): I2–I5 больше не теряются
        cpa: "27-97", rekeyAfter: "116-131", rekeyTo: "6-9", rejectAfter: "171-196",
        keepaliveTo: "9-16", maxHs: "18-26", trailers: "on", noCookies: "on", hpk: "",
      },
    };
  }

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
    sortKey: "report",  // v1.6.0: report|ping|tunPing|endpoint|loss|node|loc
    sortDir: 1,         // v1.6.0: 1 = asc, -1 = desc
    selected: "",
    filter: "",         // подстрока фильтра результатов (ip, узел, страна, локация)
    history: [],        // последние 10 сканов {ts, label, results, withP, withSpeed}
    viewMeta: { withP: true, withSpeed: false }, // колонки текущей таблицы
    historyOpen: false,
    cfg: defaultCfg(),
    lastRunParams: null,  // v2.4.6 (F18/F30): снимок эффективных параметров последнего запуска
    scanSession: 0,       // v2.4.6 (F31): id текущей сессии скана
    settings: { wsPath: "", dataRoot: "" }, // v2.3.0: dataRoot — своя папка данных (пусто = Roaming\WARPScoutGUI.exe)
    wsVersionOk: false,   // v2.2.0: последняя проверка warpscout успешна
    wsCheckedAt: 0,       // v2.2.0: время последней проверки (кэш 60 с)
    wsChecking: false,    // v2.2.0: проверка уже идёт
    customPresets: [],   // {name, scan:{...}} — пользовательские пресеты
    compact: false,      // компактная таблица
    paths: { dataDir: "", dataDirDefault: "", legacyDataDir: "", udfPath: "", exeName: "", appDir: "", accPath: "", reportsDir: "", wsPath: "", wsFound: false, wsTried: [] },
    wsVersion: "",
    qrPages: null,        // v2.4.4: страницы многостраничного QR (формат AmneziaVPN), null = одиночный
    qrPage: 0,            // v2.4.4: текущая страница QR в модалке
    wsFileThere: false,  // v2.4.0: файл warpscout.exe существует (даже если версию получить не удалось)
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
      const raw = evt.detail || evt;
      // v2.4.2 FIX (проверено живым тестом рантайма 6.10.0): реальная форма события —
      // {action:"stdOut"|"stdErr"|"exit", data, id}. Раньше код читал d.type — такого
      // поля НЕ существует, поэтому checkWarpscout (v2.2.0+) никогда не получал вывод
      // и exit-код: версия warpscout не определялась, регистрация отбивала «exe не найден»
      // при рабочем exe, а Stop-кнопки молчали (в 2.1.1 работало — там был execCommand
      // с чтением stdOut из результата). Мок присылает type — принимаем ОБЕ формы.
      const act = String(raw.action != null ? raw.action : raw.type || "").toLowerCase();
      const d = {
        id: raw.id,
        type: act === "stdout" ? "stdout" : act === "stderr" ? "stderr" : act === "exit" ? "exit" : act,
        data: raw.data,
        synthetic: raw.synthetic
      };
      const h = procRegistry[d.id];
      if (h) h(d);
      else if (d.id != null) backlogPush(d.id, d);
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
    // v2.4.6 (F01): enum-валидация на границе команды (см. SCAN_ENUMS выше)
    const proto = enumOf(s.proto, SCAN_ENUMS.proto, "awg");
    const isAwg = proto === "awg";
    const isMasque = proto === "masque" || proto === "masque-h2";
    a.push("-p " + proto);
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
    if (s.node && s.node.trim() && !isMasque) a.push("-node " + safeVal(s.node));
    if (s.country && s.country.trim() && !isMasque) a.push("-country " + safeVal(s.country));
    if (s.exclNode && s.exclNode.trim() && !isMasque) a.push("-exclude-node " + safeVal(s.exclNode));
    if (s.exclCountry && s.exclCountry.trim() && !isMasque) a.push("-exclude-country " + safeVal(s.exclCountry));
    if (s.through && s.through.trim()) {
      a.push("-through " + safeVal(s.through));
      if (s.innerProto) a.push("-inner-proto " + enumOf(s.innerProto, SCAN_ENUMS.innerProto, "wg"));
    }
    if (isAwg) {
      const gi1 = enumOf(s.genI1, SCAN_ENUMS.genI1, "");
      if (gi1) {
        a.push("-gen-i1 " + gi1);
        if (s.i1Sni && s.i1Sni.trim()) a.push("-i1-sni " + safeVal(s.i1Sni)); // валиден только вместе с -gen-i1
      }
      if (s.genJunk) a.push("-gen-junk");
      else {
        if (s.jc !== "" && s.jc != null && +s.jc !== 6) a.push("-jc " + Math.min(255, Math.max(0, Math.round(+s.jc))));
        if (s.jmin !== "" && s.jmin != null && +s.jmin !== 10) a.push("-jmin " + Math.min(5000, Math.max(0, Math.round(+s.jmin))));
        if (s.jmax !== "" && s.jmax != null && +s.jmax !== 50) a.push("-jmax " + Math.min(5000, Math.max(0, Math.round(+s.jmax))));
      }
    }
    if (isMasque) {
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
  // v2.4.6 (аудит F07): каждое значение обязано быть ОДНИМ argv-токеном.
  // Раньше вырезались только shell-символы, а пробелы оставались —
  // «1.1.1.1 -f -n 256» превращался в дополнительные CLI-флаги.
  // Пробелы легитимны ни в одном из этих полей (IP/CIDR, коды узлов, SNI),
  // поэтому вырезаем их ЦЕЛИКОМ вместе с опасными символами.
  function safeVal(v) {
    if (v == null) return "";
    return String(v)
      .replace(/\s+/g, "")                 // «1.1.1.1 -f -n 256» -> «1.1.1.1-f-n256» (мусор, но один токен)
      .replace(/["'&|^%!<>()*?~;`,]/g, "") // опасные для cmd/argv символы
      .trim();
  }

  /* ── v2.4.6 (аудит F01/F02/F22): строгие enum'ы и разбор endpoint на границе команды ──
     Ни одно поле импортированного JSON (backup, пресеты, история) не должно уметь
     менять структуру shell-команды. Проверяем enum'ы ЗДЕСЬ, в месте построения команды,
     независимо от того, откуда пришёл объект (форма, пресет, импорт, storage). */
  const SCAN_ENUMS = {
    proto: ["wg", "awg", "masque", "masque-h2"],
    innerProto: ["", "wg", "awg"], // CLI: «-inner-proto wg|awg» (flags.go:104)
    genI1: ["", "quic", "dns", "sip", "stun", "random"], // flags.go:118
  };

  function enumOf(v, allowed, fallback) {
    return allowed.indexOf(v) !== -1 ? v : fallback;
  }

  function clampInt(v, min, max, fallback) {
    const n = Math.round(+v);
    if (!isFinite(n)) return fallback != null ? fallback : min;
    return Math.min(max, Math.max(min, n));
  }

  /* ── v2.6.0 (аудит SEC-5): единые точки сборки shell-команд ──
     os.execCommand/spawnProcess принимают ТОЛЬКО строку (argv-массива в API
     Neutralino нет), поэтому структурная защита — одна функция кавычек на
     платформу + жёсткий фильтр входа ДО кавычек. Новые места сборки команд
     ОБЯЗАНЫ идти через эти хелперы: конкатенация «в лоб» — источник инъекций. */
  function psQuote(s) {
    // PowerShell: одинарные кавычки не интерпретируют содержимое, ' внутри удваивается
    return "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
  }
  function cmdWinPath(s) {
    // путь для cmd.exe: cmd-метасимволы и спецсимволы PowerShell вырезаются,
    // хвостовые разделители срезаются (хвост «\» перед кавычкой ломал экранирование)
    return String(s == null ? "" : s).replace(/["%!<>|&^`]/g, "").replace(/[\\/]+$/, "");
  }

  // Единый разбор «endpoint» (host:port). Возвращает { host, port } или null.
  // host — IPv4/IPv6/имя БЕЗ скобок (скобки снимаем), port — 1..65535.
  // Пробелы и shell-символы не проходят по определению символьного класса —
  // поэтому импортированная история не может протащить «1.1.1.1 & echo …» в -target.
  function parseEndpoint(ep) {
    const raw = String(ep == null ? "" : ep).trim();
    if (!raw || /[\s"'&|^%!<>()*?~;`,\\/]/.test(raw)) return null;
    let host = "", portStr = "";
    const br = /^\[(.+)\]:(\d{1,5})$/.exec(raw); // [IPv6]:port
    if (br) {
      host = br[1];
      portStr = br[2];
    } else {
      const i = raw.lastIndexOf(":");
      if (i < 1) return null;
      host = raw.slice(0, i);
      portStr = raw.slice(i + 1);
    }
    if (!/^\d{1,5}$/.test(portStr)) return null;
    const port = parseInt(portStr, 10);
    if (port < 1 || port > 65535) return null;
    if (!host || !/^[0-9A-Za-z.:\-_]+$/.test(host)) return null; // IPv4/IPv6/hostname
    return { host: host, port: port };
  }

  function quoteExe() {
    const p = (S.paths.wsPath || WS_EXE).replace(/[\\/]+$/, ""); // v2.5.0: платформенное имя
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
    // v2.4.6 (F28): наличие колонки SPEED определяем по ФАКТИЧЕСКОМУ заголовку —
    // CLI добавляет её только при ненулевых замерах (report.go:333), а не по флагам;
    // иначе при всех нулевых замерах колонки съезжают (страна принимается за speed)
    let speedCols = withSpeed;
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (/^#\s+\d+ torn down/.test(line)) { zone = "torn"; continue; }
      if (/^#/.test(line)) { continue; }
      if (!line.trim()) { continue; }
      if (/^ENDPOINT\s/.test(line) && zone !== "nodebest" && zone !== "torn") { speedCols = /\bSPEED\b/.test(line); zone = "rows"; continue; }
      if (/^NODE\s+ENDPOINT/.test(line)) { speedCols = /\bSPEED\b/.test(line); zone = "nodebest"; continue; }
      if (zone === "rows" || zone === "torn") {
        const row = parseRowTokens(line, withP, speedCols);
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
        ping: (a, b) => pingMs(a.ping) - pingMs(b.ping),
        tunPing: (a, b) => pingMs(a.tunPing || a.ping) - pingMs(b.tunPing || b.ping),
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
      { label: "PING", key: "ping" },
    ];
    // fix: при withP у warpscout ДВЕ пинговые колонки — добавляем заголовок TUN PING.
    // Раньше он отсутствовал в шапке, и все колонки после PING съезжали влево на одну:
    // в LOSS попадал TUN PING (ms), в SEEN AS — LOSS (%), в NODE — страна и т.д.
    if (withP) cols.push({ label: "TUN PING", key: "tunPing" }, { label: "LOSS", key: "loss" });
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
          // v2.4.6 (F48): сортируемые заголовки доступны с клавиатуры и сообщают направление (aria-sort)
          return (
            '<th' + (c.key ? ' class="th-sort" tabindex="0" data-sort="' + c.key + '" title="' + t("Сортировать") + '"' +
              (active ? ' aria-sort="' + (sortDir === 1 ? "ascending" : "descending") + '"' : "") : "") + ">" +
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
      const doSort = () => {
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
      };
      th.addEventListener("click", (e) => {
        e.stopPropagation();
        doSort();
      });
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); doSort(); } // v2.4.6 (F48)
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
          "<td>" + pingCell(r.ping) + "</td>",
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
            // v2.4.6 (F19): для MASQUE нет WG/AWG .conf — честный отказ вместо профиля не того протокола
            if (S.viewProto === "masque" || S.viewProto === "masque-h2") {
              toast(t("MASQUE-эндпоинт нельзя упаковать в WG/AWG .conf — используйте SOCKS-прокси или CLI warpscout"), "warn");
              return;
            }
            S.cfg.endpoint = ep;
            // v2.4.6 (F18): junk-параметры ИЗ ПАРАМЕТРОВ СКАНА — конфиг воспроизводит проверенный туннель,
            // а не дефолтные 4/40/70 при скане с 6/10/50
            const lp = S.lastRunParams;
            if (lp && lp.proto === "awg" && !lp.genJunk) {
              S.cfg.obf.jc = clampInt(lp.jc !== "" && lp.jc != null ? lp.jc : 6, 1, 128, 4);
              let jmin = clampInt(lp.jmin !== "" && lp.jmin != null ? lp.jmin : 10, 0, 1280, 40);
              const jmax = clampInt(lp.jmax !== "" && lp.jmax != null ? lp.jmax : 50, 0, 1280, 70);
              if (jmin > jmax) jmin = jmax;
              S.cfg.obf.jmin = jmin;
              S.cfg.obf.jmax = jmax;
            }
            syncCfgInputsFromState();
            switchTab("config");
            toast(tF("Эндпоинт и junk-параметры скана подставлены в конфиг: {ep}", { ep: ep }), "ok");
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
  let scanSeq = 0; // v2.4.6 (F31): счётчик запусков — id сессии
  function setScanRunning(run) {
    S.running.scan = run;
    $("#btnRunScan").hidden = run;
    $("#btnStopScan").hidden = !run;
    $("#btnRunScanLabel").textContent = run ? t("Сканирую…") : t("Начать скан");
    $("#scanProgress").hidden = !run;
    if (!run) { $("#scanBarFill").style.width = "0%"; }
    try { homeScanUi(); } catch (e) {} // v2.5.4: синхронный индикатор на главной
  }

  function setPhase(label, frac) {
    $("#scanPhase").textContent = label;
    const livePhase = $("#scanLivePhase");
    if (livePhase) livePhase.textContent = label;
    if (frac != null) $("#scanBarFill").style.width = Math.max(2, Math.min(100, frac)) + "%";
    // v2.5.4: фаза сразу на главной (realtime-индикатор скана)
    const hp = document.getElementById("homeScanPhase");
    if (hp) hp.textContent = String(label || "");
    try { homeScanTick(); } catch (e) {}
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
    // v2.4.6 (F01): невалидные enum'ы из импорта — явный отказ, а не молчаливая подмена
    if (
      SCAN_ENUMS.proto.indexOf(s.proto) === -1 ||
      SCAN_ENUMS.genI1.indexOf(s.genI1 || "") === -1 ||
      (s.innerProto && SCAN_ENUMS.innerProto.indexOf(s.innerProto) === -1)
    ) {
      S.running.scan = false;
      setScanRunning(false);
      toast(t("Импортированные параметры содержат недопустимые значения (протокол / генератор I1 / inner-proto) — проверьте форму скана"), "err");
      switchTab("scan");
      return;
    }
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
    // v2.4.6 (F31): идентификатор запуска — устаревшие колбэки не трогают новую сессию;
    // v2.4.6 (F32): флаг отмены для Stop ДО появления процесса
    const runId = ++scanSeq;
    S.scanSession = runId;
    S.scanCancelRequested = false;
    // v2.4.6 (F18/F30): снимок ЭФФЕКТИВНЫХ параметров запуска — история, quick-check
    // и SOCKS используют ЕГО, а не текущие поля формы (протокол уже не «уедет»)
    const runParams = sanitizeScan(s);
    S.lastRunParams = runParams;
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + "-" + String(runId);
    S.paths.reportPath = S.paths.reportsDir + "/warpscout-report-" + ts + ".txt";
    await ensureDir(S.paths.reportsDir);

    const cmd = buildScanCmd(runParams);
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
      // v2.4.2 FIX: у os.execCommand в Neutralino 6.10 НЕТ стриминга (опции stream
      // не существует, событий spawnedProcess он не шлёт, поля id в ответе нет) —
      // ответ приходит одним куском ПОСЛЕ завершения. spawnProcess даёт живой
      // стриминг, реальный id для Stop-кнопок и настоящий exit-код.
      const proc = await os().spawnProcess(cmd);
      // v2.4.6 (F32): Stop успели нажать ДО возврата spawn — убиваем немедленно
      if (S.scanCancelRequested || S.scanSession !== runId) {
        try { await os().killProcess(proc.id); } catch (e) {}
        S.running.scan = false;
        setScanRunning(false);
        stopScanLive();
        toast(t("Скан остановлен"), "ok");
        return;
      }
      S.procIds.scan = proc.id;
      let buf = "";
      registerProc(proc.id, (d) => {
        if (d.type === "stdout" || d.type === "stderr") {
          const data = typeof d.data === "string" ? d.data : "";
          appendLog($("#scanLog"), data);
          scanLiveFeed(data);
          buf += data;
          if (buf.length > 300000) buf = buf.slice(-150000); // v2.4.6 (F36): внутренний буфер ограничен — квадратичный рост исключён
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
          // v2.4.6 (F31): устаревшая сессия не трогает UI
          if (S.scanSession !== runId) return;
          setPhase(S.scanStopped ? t("Остановлено") : t("Читаем отчёт…"), 100);
          if (!S.scanStopped) {
            // v2.4.6 (F31): running.scan держится true, ПОКА не дочитан отчёт —
            // новый скан не сможет вклиниться в финализацию старого
            finishScan(withP, withSpeed, exitCodeOf(d.data), runParams)
              .catch(() => {})
              .then(() => {
                if (S.scanSession === runId) {
                  S.running.scan = false;
                  setScanRunning(false);
                }
              });
          } else {
            S.running.scan = false;
            setScanRunning(false);
            toast(t("Скан остановлен"), "ok");
          }
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

  async function finishScan(withP, withSpeed, exitCode, runParams) {
    let text = "";
    try {
      text = await fs().readFile(S.paths.reportPath);
    } catch (e) {
      // в демо-режиме берём отчёт, соответствующий флагам последнего «скана»
      if (IS_MOCK && window.NeutralinoMock) text = window.NeutralinoMock.lastReport || window.NeutralinoMock.report;
    }
    if (!text) {
      stopScanLive(); // v2.4.6 (F35): live-панель и таймер гасим во ВСЕХ ветках выхода
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
    S.viewProto = (runParams && runParams.proto) || S.scan.proto; // v2.4.6 (F30): протокол ИМЕННО этого запуска
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
    pushHistory(S.viewProto);
    S.staggerNext = true; // v1.7.0: строки таблицы появятся каскадом
    stopScanLive(); // v1.8.0: прячем живую панель
    renderResults();
    fillEndpointSelect();
    switchSubtab("results");
    // v2.5.2 (Android): копия отчёта в общую папку Download/WARPScoutGUI —
    // иначе отчёт лежит в приватном каталоге, недоступном без root
    if (IS_ANDROID) mirrorPublic(S.paths.reportPath).then((pub) => { if (pub) toast(tF("Отчёт скопирован в общую папку: {p}", { p: pub }), "info"); });
    const working = S.results.filter((r) => !r.torn).length;
    const torn = S.results.length - working;
    // v2.4.6 (F35): отчёт есть, но exit ненулевой — честно показываем фактический код
    if (exitCode !== 0) {
      appendLog($("#scanLog"), "\n[GUI] " + tF("warpscout завершился с кодом {c} — отчёт мог сохраниться не полностью.", { c: exitCode }) + "\n");
      toast(tF("Скан завершён с кодом {c} — результаты ниже, но отчёт может быть неполным.", { c: exitCode }), "warn");
    }
    if (working > 0) {
      toast(torn ? tF("Скан завершён: рабочих эндпоинтов — {n}, разорванных — {t}", { n: working, t: torn }) : tF("Скан завершён: рабочих эндпоинтов — {n}", { n: working }), "ok");
    } else {
      toast(torn ? tF("Рабочих эндпоинтов не найдено ({t} разорвано). Попробуйте «Жёсткая сеть» или find-junk.", { t: torn }) : t("Рабочих эндпоинтов не найдено"), "err");
    }
  }

  async function stopScan() {
    S.scanStopped = true;
    S.scanCancelRequested = true; // v2.4.6 (F32): процесс мог ещё не появиться
    stopScanLive(); // v1.8.0: прячем живую панель
    await killProc(S.procIds.scan);
    S.procIds.scan = null;
    S.running.scan = false;
    setScanRunning(false);
    toast(t("Скан остановлен"), "ok");
  }

  /* ───────── конфиг-генератор ───────── */
  /* v2.4.3: пресеты с IPv6-адресами (Яндекс убран по запросу); dnsV6 (по умолчанию вкл) добавляет v6-адреса в строку DNS */
  const DNS_PRESETS = {
    cloudflare: { v4: "1.1.1.1, 1.0.0.1", v6: "2606:4700:4700::1111, 2606:4700:4700::1001" },
    quad9: { v4: "9.9.9.9, 149.112.112.112", v6: "2620:fe::fe, 2620:fe::9" },
    google: { v4: "8.8.8.8, 8.8.4.4", v6: "2001:4860:4860::8888, 2001:4860:4860::8844" },
    adguard: { v4: "94.140.14.14, 94.140.15.15", v6: "2a10:50c0::ad1:ff, 2a10:50c0::ad2:ff" },
  };

  /* v2.4.3: строка DNS по пресету с учётом тумблера IPv6 */
  function dnsLineOf(key, withV6) {
    const p = DNS_PRESETS[key];
    if (!p) return "";
    return withV6 ? p.v4 + ", " + p.v6 : p.v4;
  }

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
    // v2.4.6 (F06): значения не могут содержать переводы строк/табуляции —
    // инъекция директив (PostUp и т.п.) в экспортируемый .conf невозможна
    const kv = (k, v) => lines.push(k + " = " + String(v).replace(/[\r\n\t]+/g, " ").trim());

    sec("Interface");
    kv("PrivateKey", acc ? acc.private_key : t("<запустите регистрацию на вкладке «Аккаунт»>"));
    if (acc) {
      const addr = [acc.ipv4, acc.ipv6].filter(Boolean).join(", ");
      kv("Address", addr || "172.16.0.2");
    } else {
      kv("Address", "172.16.0.2, 2606:4700:110:xxxx:xxxx:xxxx:xxxx:xxxx");
    }
    const dns = c.dns === "custom" ? c.dnsCustom : dnsLineOf(c.dns, c.dnsV6 !== false); // v2.4.3: dnsV6 undefined у старых состояний → трактуем как вкл
    if (dns && dns.trim()) kv("DNS", dns);
    if (c.mtu) kv("MTU", clampInt(c.mtu, 576, 1500, 1280)); // v2.4.6 (F27)

    if (ver !== "wg") {
      // v2.4.6 (F27): лимиты CLI (flags.go): jc 1..128, jmin <= jmax, jmax <= 1280
      kv("Jc", clampInt(o.jc, 1, 128, 4));
      let jmin = clampInt(o.jmin, 0, 1280, 40);
      const jmax = clampInt(o.jmax, 0, 1280, 70);
      if (jmin > jmax) jmin = jmax;
      kv("Jmin", jmin);
      kv("Jmax", jmax);
      kv("S1", o.s1); kv("S2", o.s2); kv("S3", o.s3); kv("S4", o.s4);
      kv("H1", o.h1); kv("H2", o.h2); kv("H3", o.h3); kv("H4", o.h4);
      if ((o.i1 || "").trim()) kv("I1", String(o.i1).replace(/\s+/g, "").trim());
      // v2.4.6 (F26): I2–I5 больше не теряются (нужны профилям AWG 2.0)
      if ((o.i2 || "").trim()) kv("I2", String(o.i2).replace(/\s+/g, "").trim());
      if ((o.i3 || "").trim()) kv("I3", String(o.i3).replace(/\s+/g, "").trim());
      if ((o.i4 || "").trim()) kv("I4", String(o.i4).replace(/\s+/g, "").trim());
      if ((o.i5 || "").trim()) kv("I5", String(o.i5).replace(/\s+/g, "").trim());
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
    if (c.keepalive > 0) kv("PersistentKeepalive", clampInt(c.keepalive, 0, 65535, 0)); // v2.4.6 (F27)

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
      params: sanitizeScan(S.lastRunParams && S.lastRunParams.proto === proto ? S.lastRunParams : S.scan), // v2.4.6 (F18/F30)
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
    try { homeScanTick(); } catch (e) {} // v2.5.4: таймер/шаги на главной
  }

  function scanLiveFeed(data) {
    if (!live.on) return;
    // шаги N/M → тик на графике
    let m = /(\d+)\/(\d+)\s*$/.exec(String(data).trim());
    if (m) {
      live.steps.push({ t: Date.now() - live.t0, done: +m[1], total: +m[2] });
      if (live.steps.length > 600) live.steps = live.steps.slice(-400); // v2.4.6 (F36): точки графика ограничены
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
    try { homeScanTick(); } catch (e) {} // v2.5.4: шаги/узлы на главной
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
    try { homeScanUi(); } catch (e) {} // v2.5.4: гасим индикатор на главной
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
    toast(t(S.compact ? "Компактная таблица включена" : "Обычная таблица"), "info");
  }

  /* ───────── QR-код конфига (v1.4.0; v2.4.4: многостраничный QR для длинных конфигов — формат AmneziaVPN) ───────── */
  const QR_CHUNK = 850;      // байт данных на страницу — ровно как в qrCodeUtils.cpp Amnezia (k = 850)
  const QR_SINGLE_LIMIT = 2953; // байтовая ёмкость максимальной версии QR (40-L) — одиночный код

  function toggleQr(open) {
    setModal($("#qrModal"), open); // v2.4.6 (F47)
  }

  function qrB64url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /* Страница многостраничного QR в формате, который понимает импорт AmneziaVPN
     (importController.parseQrCodeChunk): base64url( int16be 1984 ‖ uint8 всего ‖ uint8 № ‖ uint32be длина ‖ данные ).
     Источник формата: amnezia-client core/utils/qrCodeUtils.cpp (QDataStream = big-endian,
     QByteArray сериализуется как uint32-длина + байты). */
  function qrPagesFor(conf) {
    const data = new TextEncoder().encode(conf);
    const total = Math.ceil(data.length / QR_CHUNK);
    if (total > 255) return null; // номер количества страниц — quint8
    const pages = [];
    for (let p = 0; p < total; p++) {
      const chunk = data.slice(p * QR_CHUNK, (p + 1) * QR_CHUNK);
      const buf = new Uint8Array(8 + chunk.length);
      const dv = new DataView(buf.buffer);
      dv.setInt16(0, 1984, false);          // qrMagicCode = 1984
      dv.setUint8(2, total);                // chunksCount
      dv.setUint8(3, p);                    // chunkId
      dv.setUint32(4, chunk.length, false); // длина чанка (QByteArray)
      buf.set(chunk, 8);
      pages.push(qrB64url(buf));
    }
    return pages;
  }

  function qrMake(text) {
    // v2.4.6 (F29): UTF-8 энкодер — одиночный QR больше не теряет не-ASCII символы
    // (дефолтный энкодер библиотеки оставляет только младший байт символа)
    if (window.qrcode && window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs["UTF-8"]) {
      window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs["UTF-8"];
    }
    const qr = window.qrcode(0, "L"); // L — максимальная ёмкость (2953 байта)
    qr.addData(text);
    qr.make();
    return qr;
  }

  function renderQrPage() {
    if (!S.qrPages) return;
    const qr = qrMake(S.qrPages[S.qrPage]);
    $("#qrBox").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
    $("#qrPageLabel").textContent = tF("страница {i} из {n}", { i: S.qrPage + 1, n: S.qrPages.length });
    $("#btnQrPrev").disabled = S.qrPage === 0;
    $("#btnQrNext").disabled = S.qrPage === S.qrPages.length - 1;
  }

  function showConfQr() {
    if (typeof window.qrcode !== "function") { toast(t("QR-модуль не загружен"), "err"); return; }
    if (!confExportReady()) return; // v2.4.6 (F27)
    const conf = buildConf();
    const tooBigErr = () => toast(tF("Конфиг {n} симв. — не помещается в QR (лимит 2953). Обычно виноват длинный I1: уберите его или сохраните конфиг файлом.", { n: conf.length }), "err");
    try {
      if (new TextEncoder().encode(conf).length <= QR_SINGLE_LIMIT) {
        // одиночный QR — как раньше (plain-текст конфига, его же читает и WireGuard)
        S.qrPages = null; S.qrPage = 0;
        $("#qrPager").classList.add("hidden");
        $("#qrBox").innerHTML = qrMake(conf).createSvgTag({ cellSize: 4, margin: 3, scalable: true });
      } else {
        // конфиг длиннее одного QR — многостраничный в формате AmneziaVPN
        const pages = qrPagesFor(conf);
        if (!pages) { tooBigErr(); return; }
        S.qrPages = pages; S.qrPage = 0;
        $("#qrPager").classList.remove("hidden");
        renderQrPage();
      }
      toggleQr(true);
    } catch (e) {
      tooBigErr();
    }
  }

  async function saveQrPng() {
    if (typeof window.qrcode !== "function") return;
    if (!confExportReady()) return; // v2.4.6 (F27)
    try {
      // v2.4.4: пересобираем страницы из АКТУАЛЬНОГО конфига (модалка могла устать от правок)
      const conf = buildConf();
      const multi = new TextEncoder().encode(conf).length > QR_SINGLE_LIMIT;
      let text = conf, pageIdx = 0, pageCount = 1;
      if (multi) {
        const pages = qrPagesFor(conf);
        if (!pages) { toast(tF("Конфиг {n} симв. — не помещается в QR (лимит 2953). Обычно виноват длинный I1: уберите его или сохраните конфиг файлом.", { n: conf.length }), "err"); return; }
        pageIdx = Math.min(S.qrPage || 0, pages.length - 1);
        text = pages[pageIdx];
        pageCount = pages.length;
      }
      const qr = window.qrcode(0, "L"); // v2.4.6 (F29): тот же уровень ECC, что в preview — 2332..2953 байт больше не «показывается, но не сохраняется»
      qr.addData(text);
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
      const base = ($( "#cfgFileName").textContent || "warp.conf").replace(/\.conf$/, "");
      const name = multi ? base + "-qr-" + (pageIdx + 1) + "of" + pageCount + ".png" : base + "-qr.png";
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

  /* ── v2.4.6 (аудит F03/F05/F08/F10): схема и санитизация импортируемых данных ──
     Импорт (backup/пресеты/история) и restoreState прогоняют ВСЁ через эти
     функции: типы, лимиты, управляющие символы. Ни HTML, ни shell-токены,
     ни прототипное загрязнение из чужого файла не проходят дальше. */
  function strField(v, max) {
    if (typeof v !== "string") return "";
    // вырезаем управляющие символы (вкл. \r\n — защита от инъекции директив, F06)
    return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max || 200);
  }

  function intField(v, max) {
    const n = Math.floor(+v);
    return isFinite(n) && n >= 0 ? Math.min(max || 1000000, n) : 0;
  }

  function sanitizeScan(src) {
    const s = Object.assign({}, DEFAULT_SCAN);
    if (!src || typeof src !== "object" || Array.isArray(src)) return s;
    ["tunPing", "full", "genJunk", "ipv6", "speed", "bestBySpeed"].forEach((k) => { s[k] = !!src[k]; });
    s.proto = enumOf(strField(src.proto, 20), SCAN_ENUMS.proto, "awg");
    s.innerProto = enumOf(strField(src.innerProto, 20), SCAN_ENUMS.innerProto, "");
    s.genI1 = enumOf(strField(src.genI1, 20), SCAN_ENUMS.genI1, "");
    s.sample = clampInt(src.sample, 1, 256, 10);
    s.jt = clampInt(src.jt, 1, 100, 10);
    s.timeout = clampInt(src.timeout, 1, 30, 2);
    s.tunPingCount = clampInt(src.tunPingCount, 5, 50, 10);
    s.masqueAttempts = clampInt(src.masqueAttempts, 1, 10, 3);
    s.port = src.port === "" || src.port == null ? "" : clampInt(src.port, 0, 65535, "");
    s.jc = src.jc === "" || src.jc == null ? "" : clampInt(src.jc, 0, 255, "");
    s.jmin = src.jmin === "" || src.jmin == null ? "" : clampInt(src.jmin, 0, 5000, "");
    s.jmax = src.jmax === "" || src.jmax == null ? "" : clampInt(src.jmax, 0, 5000, "");
    ["exclNode", "exclCountry", "node", "country", "i1Sni", "masqueSni", "through", "target", "pingTarget"].forEach((k) => {
      s[k] = strField(src[k], 300);
    });
    return s;
  }

  function sanitizeCfg(src) {
    const c = defaultCfg();
    if (!src || typeof src !== "object" || Array.isArray(src)) return c;
    c.ver = enumOf(strField(src.ver, 10), ["wg", "awg15", "awg20", "awg31"], "awg31");
    c.dns = enumOf(strField(src.dns, 20), ["cloudflare", "quad9", "google", "adguard", "custom"], "cloudflare");
    c.dnsV6 = src.dnsV6 !== false;
    c.dnsCustom = strField(src.dnsCustom, 300);
    c.endpoint = strField(src.endpoint, 120);
    c.mtu = clampInt(src.mtu, 576, 10000, 1280);
    c.keepalive = clampInt(src.keepalive, 0, 65535, 0);
    c.allowed = enumOf(strField(src.allowed, 10), ["both", "v4", "v6", "custom"], "both");
    c.allowedCustom = strField(src.allowedCustom, 300);
    c.tableOff = !!src.tableOff;
    const o = src.obf && typeof src.obf === "object" && !Array.isArray(src.obf) ? src.obf : {};
    c.obf.jc = clampInt(o.jc, 0, 255, 4);
    c.obf.jmin = clampInt(o.jmin, 0, 5000, 40);
    c.obf.jmax = clampInt(o.jmax, 0, 5000, 70);
    if (c.obf.jmin > c.obf.jmax) c.obf.jmin = c.obf.jmax; // CLI: jmin <= jmax (flags.go:536)
    ["s1", "s2", "s3", "s4"].forEach((k) => { c.obf[k] = clampInt(o[k], 0, 65535, 0); });
    const hdef = ["1", "2", "3", "4"];
    ["h1", "h2", "h3", "h4"].forEach((k, i) => {
      const v = strField(o[k], 60).replace(/\s+/g, "");
      c.obf[k] = v || hdef[i];
    });
    c.obf.i1 = strField(o.i1, 6000).replace(/[\r\n]/g, "");
    ["i2", "i3", "i4", "i5"].forEach((k) => { c.obf[k] = strField(o[k], 6000).replace(/[\r\n]/g, ""); });
    const dObf = defaultCfg().obf;
    ["cpa", "rekeyAfter", "rekeyTo", "rejectAfter", "keepaliveTo", "maxHs", "trailers", "noCookies", "hpk"].forEach((k) => {
      const v = strField(o[k], 120);
      c.obf[k] = v || dObf[k];
    });
    return c;
  }

  function sanitizeHistoryItem(h) {
    if (!h || typeof h !== "object" || Array.isArray(h)) return null;
    const results = Array.isArray(h.results)
      ? h.results.slice(0, 3000).map((r) => ({
          endpoint: strField(r && r.endpoint, 100),
          ping: strField(r && r.ping, 30),
          tunPing: strField(r && r.tunPing, 30),
          loss: strField(r && r.loss, 30),
          speed: strField(r && r.speed, 30),
          seenAs: strField(r && r.seenAs, 30),
          node: strField(r && r.node, 30),
          loc: strField(r && r.loc, 120),
          torn: !!(r && r.torn),
        })).filter((r) => r.endpoint)
      : [];
    return {
      ts: intField(h.ts, Date.now() + 86400000),
      proto: enumOf(strField(h.proto, 20), SCAN_ENUMS.proto, "awg"),
      label: strField(h.label, 300),
      working: intField(h.working, 100000), // v2.4.6 (F03): числа, а не HTML-строки
      torn: intField(h.torn, 100000),
      withP: !!h.withP,
      withSpeed: !!h.withSpeed,
      params: sanitizeScan(h.params),
      results: results,
    };
  }

  function sanitizeQcItem(q) {
    if (!q || typeof q !== "object" || Array.isArray(q)) return null;
    const ep = strField(q.ep, 120);
    if (!ep) return null;
    return {
      ts: intField(q.ts, Date.now() + 86400000),
      ep: ep,
      proto: enumOf(strField(q.proto, 20), SCAN_ENUMS.proto, "awg"),
      kind: ["ok", "torn", "noanswer", "error"].indexOf(q.kind) !== -1 ? q.kind : "error",
      ping: strField(q.ping, 30),
      loss: strField(q.loss, 30),
      node: strField(q.node, 30),
      code: typeof q.code === "number" && isFinite(q.code) ? Math.max(-1000, Math.min(10000, Math.round(q.code))) : undefined,
    };
  }

  function sanitizePresets(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter((p) => p && typeof p.name === "string" && p.name.trim())
      .slice(0, 20)
      .map((p) => ({ name: strField(p.name, 60), scan: sanitizeScan(p.scan) }));
  }

  // v2.4.6 (F10, OWASP CSV Injection): ячейка, начинающаяся с =,+,-,@ или TAB,
  // не должна становиться формулой в Excel/LibreOffice — префиксуем апострофом
  function csvSafe(v) {
    let s = String(v == null ? "" : v).replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s + '"';
  }

  function applyImportedState(st) {
    if (!st || typeof st !== "object" || (!st.scan && !st.cfg)) {
      toast(t("Файл не похож на резервную копию WARPSCOUT GUI"), "err");
      return;
    }
    // v2.4.6 (F08): собираем и валидируем ВСЁ в отдельный объект — состояние
    // меняется только после успешной схемы. Частичный импорт невозможен.
    let next;
    try {
      next = {
        scan: st.scan ? sanitizeScan(st.scan) : null,
        cfg: st.cfg ? sanitizeCfg(st.cfg) : null,
        customPresets: Array.isArray(st.customPresets) ? sanitizePresets(st.customPresets) : null,
        compact: !!st.compact,
        history: Array.isArray(st.history) ? st.history.map(sanitizeHistoryItem).filter(Boolean).slice(0, 10) : null,
        qcHistory: Array.isArray(st.qcHistory) ? st.qcHistory.map(sanitizeQcItem).filter(Boolean).slice(0, 50) : null,
        settings: null,
      };
      if (st.settings && typeof st.settings === "object") {
        // v2.4.6 (F05): путь к EXE из backup НЕ восстанавливаем — переносимые
        // настройки не должны влиять на выбор исполняемого кода
        next.settings = { wsPath: "", dataRoot: strField(st.settings.dataRoot, 500) };
      }
    } catch (e) {
      toast(tF("Импорт отклонён: некорректные данные ({err})", { err: e && e.message ? e.message : e }), "err");
      return;
    }
    if (next.scan) S.scan = next.scan;
    if (next.cfg) S.cfg = next.cfg;
    if (next.settings) S.settings = Object.assign({}, S.settings, next.settings);
    if (next.customPresets) S.customPresets = next.customPresets;
    S.compact = next.compact;
    if (next.history) S.history = next.history;
    if (next.qcHistory) S.qcHistory = next.qcHistory;
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
            // v2.4.6 (F08): лимит размера ДО парсинга — гигантский файл не блокирует UI
            if (String(text).length > 2000000) { toast(t("Файл слишком большой для резервной копии (>2 МБ)"), "err"); return; }
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
          const text = String(reader.result);
          if (text.length > 2000000) { toast(t("Файл слишком большой для резервной копии (>2 МБ)"), "err"); return; } // v2.4.6 (F08)
          applyImportedState(JSON.parse(text));
        } catch (err) {
          toast(tF("Некорректный JSON: {err}", { err: err && err.message ? err.message : err }), "err");
        }
      };
      reader.readAsText(file);
    });
  }

  function toggleKbd(open) {
    setModal($("#kbdModal"), open); // v2.4.6 (F47)
  }

  /* ── v2.4.6 (F47): модалки — фокус сохраняем/возвращаем, фон inert,
     глобальные хоткеи не срабатывают под открытым диалогом ── */
  const MODAL_SEL = ["#kbdModal", "#qrModal", "#qcModal", "#cmpModal"];
  function openModalOf() {
    return MODAL_SEL.map((s) => $(s)).find((m) => m && !m.classList.contains("hidden")) || null;
  }
  let modalLastFocus = null;
  function setModal(el, open) {
    if (!el) return;
    el.classList.toggle("hidden", !open);
    const app = $("#app");
    const any = openModalOf();
    if (app && "inert" in app) app.inert = !!any; // фон недоступен для Tab/скринридера
    if (any) {
      if (!modalLastFocus || !any.contains(modalLastFocus)) modalLastFocus = document.activeElement;
      const card = $(".modal__card", any) || any;
      if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "-1");
      try { card.focus({ preventScroll: true }); } catch (e) { card.focus(); }
    } else if (modalLastFocus && modalLastFocus.focus) {
      try { modalLastFocus.focus({ preventScroll: true }); } catch (e) {}
      modalLastFocus = null;
    }
  }

  // v2.4.6 (F50): сегментные кнопки = настоящая радиогруппа
  // (role=radio, aria-checked, roving tabindex, стрелки)
  function setupSegGroup(group) {
    if (!group) return;
    const btns = $$(".seg__btn", group);
    btns.forEach((b) => {
      b.setAttribute("role", "radio");
      const sync = () => {
        const on = b.classList.contains("is-active");
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.setAttribute("tabindex", on ? "0" : "-1");
      };
      sync();
      if (window.MutationObserver) new MutationObserver(sync).observe(b, { attributes: true, attributeFilter: ["class"] });
    });
    group.addEventListener("keydown", (e) => {
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].indexOf(e.key) === -1) return;
      const cur = btns.indexOf(document.activeElement);
      if (cur === -1) return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const next = btns[(cur + dir + btns.length) % btns.length];
      next.focus();
      next.click();
    });
  }

  /* ───────── тема (v1.3.0) ───────── */
  // v2.4.6 (F54): параметр переименован (тень имени translator ломала переводы)
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    const b = $("#btnTheme");
    if (b) b.textContent = t(theme === "light" ? "🌙 Тёмная тема" : "☀ Светлая тема");
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = cur === "light" ? "dark" : "light";
    S.settings.theme = next;
    applyTheme(next);
    persist();
    toast(t(next === "light" ? "Светлая тема включена" : "Тёмная тема включена"), "ok");
  }

  function toggleHistory(force) {
    S.historyOpen = force != null ? force : !S.historyOpen;
    const panel = $("#historyPanel");
    panel.classList.toggle("hidden", !S.historyOpen);
    if (!S.historyOpen) return;
    // v2.4.6 (F53): журнал ⚡-проверок независим от истории сканов — рендерим
    // голову и его ВСЕГДА, placeholder относится только к истории сканов
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
      (S.history.length
        ? renderPingTrend() +
          S.history
            .map(
              (h, i) =>
                '<button type="button" class="history__item" data-hi="' + i + '">' +
                  '<span class="history__ts">' + fmtTime(h.ts) + "</span>" +
                  '<span class="history__proto">' + esc(String(h.proto).toUpperCase()) + "</span>" +
                  '<span class="history__label">' + esc(h.label) + "</span>" +
                  '<span class="history__cnt ' + (h.working ? "is-ok" : "is-err") + '">' +
                    esc(h.working) + " " + t("рабочих") + (h.torn ? " / " + esc(h.torn) + " " + t("разорвано") : "") + // v2.4.6 (F03): счётчики — только как текст
                  "</span>" +
                  '<span class="history__cmp-btn" role="button" tabindex="0" data-cmp="' + i +
                  '" title="' + t("Δ сравнить с текущей таблицей (без загрузки)") + '">Δ</span>' +
                "</button>"
            )
            .join("")
        : '<div class="history__empty">' + t("История сканов пуста — выполните первый скан.") + "</div>");
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
    $$("[data-cmp]", panel).forEach((c) => {
      c.addEventListener("click", (e) => {
        e.stopPropagation();
        compareWithHistory(+c.getAttribute("data-cmp"));
      });
      // v2.4.6 (F48): Δ управляется и с клавиатуры (Enter/Space)
      c.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          compareWithHistory(+c.getAttribute("data-cmp"));
        }
      });
    });
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
    const q = csvSafe; // v2.4.6 (F10): формулы Excel не проходят
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
    const q = csvSafe; // v2.4.6 (F10)
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
    setModal($("#cmpModal"), open); // v2.4.6 (F47)
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
    // v2.4.6 (F18/F30): действия над загруженным сканом используют ЕГО параметры
    S.lastRunParams = h.params ? sanitizeScan(h.params) : null;
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
    if (!S.results.length) { toast(t("Нет результатов для экспорта"), "err"); return; }
    const { withP, withSpeed } = S.viewMeta;
    const head = ["endpoint", "endpoint_ping", ...(withP ? ["tun_ping", "loss"] : []), ...(withSpeed ? ["speed"] : []), "seen_as", "node", "node_location", "torn"];
    const escCell = csvSafe; // v2.4.6 (F10)
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
      toast(t("CSV скачан: ") + name, "ok");
      return;
    }
    os()
      .showSaveDialog(t("Сохранить результаты CSV"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, csv);
        toast(t("CSV сохранён: ") + path, "ok");
      })
      .catch((e) => toast(t("Ошибка экспорта: ") + (e && e.message ? e.message : e), "err"));
  }

  function selectedRowInfo() {
    return S.results.find((r) => r.endpoint === S.cfg.endpoint) || null;
  }

  // v2.4.6 (F27): экспорт/копия/QR — только для ГОТОВОГО профиля (с аккаунтом).
  // Раньше сохранялся шаблон-заглушка с «xxxx» вместо адресов.
  function confExportReady() {
    if (!S.account) {
      toast(t("Сначала создайте аккаунт — в превью сейчас шаблон без ключей, такой профиль работать не будет"), "err");
      return false;
    }
    return true;
  }

  async function saveConf() {
    if (!confExportReady()) return; // v2.4.6 (F27)
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
  // v2.4.6 (F25): peers собираются в МАССИВ (а не сливаются в один объект),
  // неизвестные секции и директивы — в явный список потерь
  function parseConfText(text) {
    const out = { interface: {}, peer: {}, other: {}, peers: [], unknown: [] };
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
        if (name === "interface") cur = out.interface;
        else if (name === "peer") { cur = {}; out.peers.push(cur); }
        else cur = out.other;
        continue;
      }
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim().toLowerCase();
      let val = line.slice(eq + 1).trim();
      if (/^".*"$/.test(val)) val = val.slice(1, -1);
      if (cur) cur[key] = val;
      else out.unknown.push(key);
    }
    out.peer = out.peers[0] || {};
    return out;
  }

  function applyImportedConf(text) {
    const c = parseConfText(text);
    // v2.4.6 (F25): несколько [Peer] не представимы — берём первый, честно сообщаем
    const peer = c.peers.length ? c.peers[0] : {};
    const all = Object.assign({}, c.other, c.interface, peer);
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

    // v2.4.6 (F24): импорт .conf — ЗАМЕНА профиля: строим новый cfg ОТ ДЕФОЛТОВ.
    // Прежние Table/keepalive/I1/DNS больше не протекают в новый профиль,
    // а «Table = auto» (или отсутствие строки) честно снимает tableOff.
    const nc = defaultCfg();
    nc.ver = has31 ? "awg31" : hasI2plus ? "awg20" : hasAwg ? "awg15" : "wg";
    applied.push({ wg: "WireGuard", awg15: "AWG 1.5", awg20: "AWG 2.0", awg31: "AWG 3.1" }[nc.ver]);

    // Interface
    if (has("dns")) {
      const d = all.dns.replace(/\s+/g, " ").trim();
      /* v2.4.3: распознаём пресет в обеих формах — только v4 и v4+v6 (старые конфиги без v6 тоже понимаем) */
      let preset = null, presetV6 = false;
      for (const k of Object.keys(DNS_PRESETS)) {
        if (d === dnsLineOf(k, true)) { preset = k; presetV6 = true; break; }
        if (d === dnsLineOf(k, false)) { preset = k; presetV6 = false; break; }
      }
      if (preset) { nc.dns = preset; nc.dnsV6 = presetV6; applied.push("DNS " + preset + (presetV6 ? " v4+v6" : " v4")); }
      else { nc.dns = "custom"; nc.dnsCustom = d; applied.push(t("DNS свои")); }
    }
    if (has("mtu")) { const m = num("mtu"); if (m && m > 0 && m <= 10000) { nc.mtu = m; applied.push("MTU " + m); } }
    if (has("table")) { nc.tableOff = /off/i.test(all.table); if (nc.tableOff) applied.push("Table off"); } // v2.4.6 (F24)

    // Peer
    if (has("endpoint") && /^[A-Za-z0-9.\[\]:-]+:\d+$/.test(all.endpoint.trim())) {
      nc.endpoint = all.endpoint.trim();
      applied.push(t("эндпоинт"));
    }
    if (has("persistentkeepalive")) { const k = num("persistentkeepalive"); if (k != null && k >= 0 && k <= 65535) { nc.keepalive = k; applied.push("keepalive " + k); } }
    if (has("allowedips")) {
      const a = all.allowedips.replace(/\s+/g, "");
      if (a === "0.0.0.0/0,::/0" || a === "::/0,0.0.0.0/0") { nc.allowed = "both"; applied.push(t("AllowedIPs весь")); }
      else if (a === "0.0.0.0/0") { nc.allowed = "v4"; applied.push("AllowedIPs v4"); }
      else if (a === "::/0") { nc.allowed = "v6"; applied.push("AllowedIPs v6"); }
      else { nc.allowed = "custom"; nc.allowedCustom = all.allowedips.trim(); applied.push(t("AllowedIPs свои")); }
    }

    // Обфускация AWG
    if (hasAwg) {
      const o = nc.obf;
      const junks = [];
      if (has("jc")) { const v = num("jc"); if (v != null) { o.jc = clampInt(v, 0, 255, 4); junks.push("Jc"); } }
      if (has("jmin")) { const v = num("jmin"); if (v != null) { o.jmin = clampInt(v, 0, 5000, 40); junks.push("Jmin"); } }
      if (has("jmax")) { const v = num("jmax"); if (v != null) { o.jmax = clampInt(v, 0, 5000, 70); junks.push("Jmax"); } }
      if (o.jmin > o.jmax) o.jmin = o.jmax; // CLI: jmin <= jmax
      if (junks.length) applied.push("junk (" + junks.join("/") + ")");
      const heads = [];
      ["s1", "s2", "s3", "s4"].forEach((k, idx) => { if (has(k)) { const v = num(k); if (v != null) { o["s" + (idx + 1)] = clampInt(v, 0, 65535, 0); heads.push("S" + (idx + 1)); } } });
      ["h1", "h2", "h3", "h4"].forEach((k, idx) => { if (has(k)) { o["h" + (idx + 1)] = strField(all[k], 60).replace(/\s+/g, "") || String(idx + 1); heads.push("H" + (idx + 1)); } });
      if (heads.length) applied.push(tF("заголовки ({n})", { n: heads.length }));
      if (has("i1")) { o.i1 = strField(all.i1, 6000).replace(/[\r\n]/g, "").trim(); applied.push("I1"); }
      if (has31) {
        if (has("contentpaddingaddition")) { o.cpa = strField(all.contentpaddingaddition, 60).trim(); applied.push("CPA"); }
        if (has("rekeyaftertime")) { o.rekeyAfter = strField(all.rekeyaftertime, 60).trim(); }
        if (has("rekeytimeout")) { o.rekeyTo = strField(all.rekeytimeout, 60).trim(); }
        if (has("rejectaftertime")) { o.rejectAfter = strField(all.rejectaftertime, 60).trim(); }
        if (has("keepalivetimeout")) { o.keepaliveTo = strField(all.keepalivetimeout, 60).trim(); }
        if (has("maxhandshakeattempts")) { o.maxHs = strField(all.maxhandshakeattempts, 60).trim(); }
        if (has("randomtrailers")) { o.trailers = /on|true|1/i.test(all.randomtrailers) ? "on" : "off"; }
        if (has("disablecookies")) { o.noCookies = /on|true|1/i.test(all.disablecookies) ? "on" : "off"; }
        if (has("headerprotectionkey")) { o.hpk = strField(all.headerprotectionkey, 200).trim(); }
        applied.push(t("тайминги 3.1"));
      }
    }
    // v2.4.6 (F26): I2–I5 больше не теряются
    if (hasI2plus) {
      ["i2", "i3", "i4", "i5"].forEach((k) => { if (has(k)) nc.obf[k] = strField(all[k], 6000).replace(/[\r\n]/g, "").trim(); });
      applied.push("I2–I5");
    }

    // что не переносится
    if (has("privatekey") || has("address")) skipped.push(t("PrivateKey/Address берутся из аккаунта"));
    if (has("publickey")) skipped.push(t("PublicKey берётся из аккаунта"));
    if (has("presharedkey")) skipped.push(t("PresharedKey не поддерживается"));
    if (c.peers.length > 1) skipped.push(tF("peers: {n} — перенесён только первый", { n: c.peers.length })); // v2.4.6 (F25)
    // v2.4.6: неизвестные директивы — явным списком, а не молча
    const KNOWN = new Set(["dns", "mtu", "table", "endpoint", "persistentkeepalive", "allowedips",
      "jc", "jmin", "jmax", "s1", "s2", "s3", "s4", "h1", "h2", "h3", "h4",
      "i1", "i2", "i3", "i4", "i5",
      "contentpaddingaddition", "rekeyaftertime", "rekeytimeout", "rejectaftertime",
      "keepalivetimeout", "maxhandshakeattempts", "randomtrailers", "disablecookies", "headerprotectionkey",
      "privatekey", "address", "publickey", "presharedkey"]);
    Object.keys(all).forEach((k) => { if (!KNOWN.has(k)) skipped.push(k); });
    if (c.unknown.length) skipped.push(tF("директивы вне секций: {n}", { n: c.unknown.length }));

    S.cfg = nc;
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
  // v2.4.6 (F02/F22): единый строгий разбор host:port через parseEndpoint —
  // IPv6-скобки снимаются, порт валидируется (1..65535), shell-синтаксис не проходит
  function splitEpPort(ep) {
    const p = parseEndpoint(ep);
    return p ? { ip: p.host, port: String(p.port) } : null;
  }

  function buildCheckCmd(ip, port, proto) {
    // v2.4.6: метка времени с мс + случайный хвост — быстрые запуски больше не делят один файл отчёта (F31)
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 21) + "-" + Math.floor(Math.random() * 1000);
    const report = (S.paths.reportsDir || ".") + "/warpscout-check-" + ts + ".txt";
    const pr = enumOf(proto, SCAN_ENUMS.proto, "awg");
    const acc = S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "";
    // v2.4.6 (F18): воспроизводим параметры туннеля из последнего запуска (AWG)
    let awgArgs = "";
    const lp = S.lastRunParams;
    if (pr === "awg" && lp && lp.proto === "awg") {
      if (lp.genI1) {
        awgArgs += " -gen-i1 " + lp.genI1;
        if (lp.i1Sni && lp.i1Sni.trim()) awgArgs += " -i1-sni " + safeVal(lp.i1Sni);
      } else if (lp.genJunk) {
        awgArgs += " -gen-junk";
      } else {
        if (lp.jc !== "" && lp.jc != null && +lp.jc !== 6) awgArgs += " -jc " + clampInt(lp.jc, 1, 128, 6);
        if (lp.jmin !== "" && lp.jmin != null && +lp.jmin !== 10) awgArgs += " -jmin " + clampInt(lp.jmin, 0, 5000, 10);
        if (lp.jmax !== "" && lp.jmax != null && +lp.jmax !== 50) awgArgs += " -jmax " + clampInt(lp.jmax, 0, 5000, 50);
      }
    }
    const cmd =
      quoteExe() + " scan -p " + pr + awgArgs +
      " -target " + ip +
      " -port " + port +
      " -P -plain" +
      ' -o "' + report + '"' + acc;
    return { cmd: cmd, report: report };
  }

  function toggleQc(open) {
    setModal($("#qcModal"), open); // v2.4.6 (F47)
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
    // v2.4.6 (F33): пакетная очередь обязана получать результат в ЛЮБОЙ ветке —
    // иначе await checkOneP() зависает навсегда
    const batchFail = (kind) => {
      if (batch && S.qcBatch && S.qcBatch.curResolve) {
        const r = S.qcBatch.curResolve;
        S.qcBatch.curResolve = null;
        r({ kind: kind, ping: "", loss: "", node: "" });
      }
    };
    if (!batch) {
      if (S.running.check) { toast(t("Уже идёт проверка — подождите"), "warn"); return; }
      if (S.running.scan) { toast(t("Проверка недоступна во время скана"), "warn"); return; }
    }
    const parts = splitEpPort(ep);
    if (!parts) { batchFail("error"); toast(t("Не удалось разобрать адрес"), "err"); return; }
    if (!S.account && !IS_MOCK) {
      batchFail("error");
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
      // v2.4.2 FIX: execCommand в 6.10 не стримит и не даёт id — см. комментарий в runScan
      const proc = await os().spawnProcess(built.cmd);
      S.procIds.check = proc.id;
      registerProc(proc.id, (d) => {
        if (d.type === "stdout" || d.type === "stderr") {
          const data = typeof d.data === "string" ? d.data : "";
          S.qcBuf += data;
          if (S.qcBuf.length > 100000) S.qcBuf = S.qcBuf.slice(-50000); // v2.4.6 (F36)
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
    const q = csvSafe; // v2.4.6 (F10)
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
      if (!S.qcBatch || S.qcBatch.cancelled) break; // v2.4.6 (F33): очередь отменена
      S.qcBatch.idx = i;
      const v = await checkOneP(list[i]);
      results.push({ ep: list[i], v: v });
    }
    const b = S.qcBatch;
    S.qcBatch = null;
    updateBatchMeta();
    if (b && b.cancelled) {
      // v2.4.6 (F33): честный вердикт отмены вместо «Готово»
      qcSetVerdict("warn", t("Пакетная проверка отменена"), {}, "");
      toast(t("Пакетная проверка отменена"), "warn");
    } else if (b) {
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
  // v2.4.6 (F06): ключ WireGuard/AWG — ровно 32 байта в base64. Это отсекает
  // переносы строк («key\nPostUp = …») и любую инъекцию директив через ключи
  function isWgKey(s) {
    if (typeof s !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(s)) return false;
    try { return atob(s).length === 32; } catch (e) { return false; }
  }

  // v2.1.0: валидация JSON-аккаунта warpscout — нужны private_key и peer_public_key
  function validateAccountJson(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "not-json";
    // v2.4.6 (F23): public_key может означать собственный ключ устройства —
    // безусловно подменять им серверный peer_public_key нельзя
    if (
      typeof obj.public_key === "string" && obj.public_key &&
      typeof obj.peer_public_key === "string" && obj.peer_public_key &&
      obj.public_key !== obj.peer_public_key
    ) return "ambiguous";
    // мягкий алиас: некоторые утилиты пишут public_key вместо peer_public_key
    if (!obj.peer_public_key && typeof obj.public_key === "string" && obj.public_key) obj.peer_public_key = obj.public_key;
    if (typeof obj.private_key !== "string" || !isWgKey(obj.private_key)) return "not-account";
    if (typeof obj.peer_public_key !== "string" || !isWgKey(obj.peer_public_key)) return "not-account";
    return null;
  }

  function accountImportErrorText(kind) {
    if (kind === "parse") return t("Это не JSON-файл. Нужен аккаунт warpscout: JSON с ключами private_key и peer_public_key.");
    if (kind === "not-account") return t("В файле нет корректных ключей аккаунта (private_key/peer_public_key в формате base64, 32 байта) — это не warpscout-account.json. Возможно, вы выбрали .conf-конфиг или файл другой программы.");
    if (kind === "ambiguous") return t("В файле есть и public_key, и peer_public_key с разными значениями — неоднозначно. Переименуйте нужный ключ в peer_public_key и попробуйте снова.");
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
    if (!(await checkWarpscout(true))) {
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
    // новый» от «старый так и лежит» при ненулевом коде выхода.
    // v2.4.6 (F40): ротация ключей сохраняет id — сравниваем и отпечаток ключа
    const preId = S.account && S.account.id ? String(S.account.id) : "";
    const preKey = S.account && typeof S.account.private_key === "string" ? S.account.private_key.slice(-12) : "";
    S.registerCancelRequested = false; // v2.4.6 (F32): Stop до появления процесса
    try {
      // v2.4.2 FIX: execCommand в 6.10 не стримит и не даёт id — см. комментарий в runScan
      const proc = await os().spawnProcess(cmd);
      // v2.4.6 (F32): Stop успели нажать ДО возврата spawn — убиваем немедленно
      if (S.registerCancelRequested) {
        try { await os().killProcess(proc.id); } catch (e) {}
        S.running.register = false;
        registerUi();
        appendLog(log, "\n[GUI] " + t("Остановлено пользователем.") + "\n");
        return;
      }
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
      // v2.4.6 (F40): ротация меняет КЛЮЧИ, сохраняя id — неизменный id больше
      // не считается доказательством неудачи
      const newKey = S.account && typeof S.account.private_key === "string" ? S.account.private_key.slice(-12) : "";
      const accountAppeared = !!S.account && (!preId || newId !== preId || (!!preKey && !!newKey && preKey !== newKey));
      // v2.5.2 (Android): копия файла аккаунта в общую папку Download/WARPScoutGUI
      if (S.account && IS_ANDROID) mirrorPublic(S.paths.accPath).then((pub) => { if (pub) toast(tF("Копия в общей папке: {p}", { p: pub }), "info"); });
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
        // v2.4.6 (F23): пишем НОРМАЛИЗОВАННЫЙ объект (алиас переименован в
        // peer_public_key) — иначе GUI показывает «готов», а CLI файл не принимает
        const r = accountFromText(String(text));
        if (!r.error) text = JSON.stringify(r.account, null, 2);
        // v2.4.6 (F16): прежний аккаунт не теряем — резервная копия рядом
        try {
          const old = await fs().readFile(S.paths.accPath);
          if (old) {
            const bak = S.paths.accPath + ".bak-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            await fs().writeFile(bak, old);
            toast(tF("Прежний аккаунт сохранён как {f}", { f: bak.split(/[\\/]/).pop() }), "info");
          }
        } catch (e) { /* прежнего аккаунта нет */ }
        await fs().writeFile(S.paths.accPath, String(text));
        // v2.5.2 (Android): копия аккаунта в общую папку — доступна без root
        mirrorPublic(S.paths.accPath).then((pub) => { if (pub) toast(tF("Копия в общей папке: {p}", { p: pub }), "info"); });
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
    const base = String(S.paths.dataDir || "").replace(/[\\/]WARPScoutGUI(\.exe)?$/i, "");
    const np = String(window.NL_PATH || "").replace(/[\\/]+$/, "");
    const exeDir = String(S.paths.wsPath || "").replace(/[\\/]warpscout(\.exe|\.so)?$/i, "").replace(/[\\/]+$/, "");
    const candidates = [];
    const legacy = S.paths.legacyDataDir || ""; // v2.3.0: старая папка данных — первый кандидат
    if (legacy && legacy.toLowerCase() !== String(S.paths.dataDir || "").toLowerCase()) candidates.push(pxJoin(legacy, "warpscout-account.json")); // v2.5.0
    if (np) candidates.push(pxJoin(np, "warpscout-account.json"), pxJoin(pxJoin(np, "bin"), "warpscout-account.json")); // v2.5.0
    if (exeDir && exeDir !== np && exeDir !== base) candidates.push(pxJoin(exeDir, "warpscout-account.json")); // v2.5.0
    if (base && base !== np) candidates.push(pxJoin(base, "warpscout-account.json")); // v2.5.0
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
      const raw = String(S.paths.wsPath || "").replace(/["%!<>|&^`]/g, "");
      if (!raw.trim()) return;
      if (!IS_WIN) {
        // v2.5.0: Linux/macOS — выдаём право на запуск; v2.6.0 (SEC-5):
        // нативный Neutralino.filesystem.setPermissions ВМЕСТО shell-«chmod +x»:
        // shell-команда больше не собирается вовсе — инъекция невозможна по построению
        appendLog($("#accLog"), "\n$ chmod +x <warpscout>\n");
        try {
          await fs().setPermissions(raw, { all: false, ownerAll: false, ownerRead: true, ownerWrite: true, ownerExec: true, groupAll: false, groupRead: true, groupWrite: false, groupExec: true, othersAll: false, othersRead: true, othersWrite: false, othersExec: true }, "ADD");
          appendLog($("#accLog"), "[GUI] " + t("chmod +x выполнен: право на запуск выдано. Попробуйте регистрацию ещё раз.") + "\n");
          toast(t("Готово — попробуйте регистрацию ещё раз"), "ok");
        } catch (e) {
          toast(tF("Не удалось выполнить chmod +x: {err}", { err: e && e.message ? e.message : e }), "err");
        }
        return;
      }
      // v2.6.0 (SEC-5): единственная точка сборки PowerShell-команды — psQuote();
      // вход уже вычищен от cmd/PowerShell-метасимволов (фильтр над raw выше),
      // cmdWinPath дополнительно срезает хвостовые разделители
      const p = cmdWinPath(raw);
      if (!p) return;
      appendLog($("#accLog"), "\n$ powershell Unblock-File <warpscout.exe>\n");
      try {
        await os().execCommand("powershell -NoProfile -ExecutionPolicy Bypass -Command \"Unblock-File -LiteralPath " + psQuote(p) + "\"");
        appendLog($("#accLog"), "[GUI] " + t("Unblock-File выполнен: с exe снята метка «скачано из интернета». Попробуйте регистрацию ещё раз.") + "\n");
        toast(t("Готово — попробуйте регистрацию ещё раз"), "ok");
      } catch (e) {
        toast(tF("Не удалось выполнить Unblock-File: {err}", { err: e && e.message ? e.message : e }), "err");
      }
    });
    $("#btnAccOpenExeDir").addEventListener("click", () => {
      if (IS_MOCK) { toast(t("Доступно только в приложении Windows"), "err"); return; }
      const dir = String(S.paths.wsPath || "").replace(/[\\/]warpscout(\.exe|\.so)?$/i, "").replace(/[\\/]+$/, "");
      if (!dir) { toast(t("Не удалось открыть папку"), "err"); return; }
      // v2.5.4: единый хелпер с фидбеком; на Android кнопка скрыта (nativeLibraryDir)
      openFolderUi(dir, "warpscout");
    });
    $("#btnAccCheckWs").addEventListener("click", async () => {
      toast(t("Проверяю warpscout…"), "ok");
      try {
        const ok = await Promise.race([
          checkWarpscout(true),
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
      S.socksCancelRequested = true; // v2.4.6 (F32): процесс мог ещё не появиться
      await killProc(S.procIds.socks);
      S.procIds.socks = null;
      S.running.socks = false;
      socksUi();
      return;
    }
    S.running.socks = true;
    S.socksCancelRequested = false;
    socksUi();
    // v2.4.6 (F39): прикладная валидация эндпоинта и порта (была только грубая regexp-проверка)
    const epParsed = parseEndpoint($("#socksEndpoint").value);
    if (!epParsed) {
      S.running.socks = false;
      socksUi();
      toast(t("Укажите эндпоинт в формате ip:порт (например 188.114.98.58:2408)"), "err");
      return;
    }
    const socksPort = clampInt($("#socksPort").value || "1080", 1, 65535, 1080);
    const proto = enumOf($("#socksProto").value, SCAN_ENUMS.proto, "awg");
    const acc = S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "";
    // v2.4.6 (F18): генератор I1 из параметров скана — SOCKS воспроизводит проверенный туннель
    let awgArgs = "";
    const lp = S.lastRunParams;
    if (proto === "awg" && lp && lp.proto === "awg" && lp.genI1) {
      awgArgs = " -gen-i1 " + lp.genI1 + (lp.i1Sni && lp.i1Sni.trim() ? " -i1-sni " + safeVal(lp.i1Sni) : "");
    }
    // v2.4.6 (F02): endpoint идёт через parseEndpoint — без скобок и shell-символов
    const cmd = quoteExe() + " socks -e " + epParsed.host + ":" + epParsed.port + " -p " + proto + awgArgs + " -P " + socksPort + acc;
    $("#socksLog").textContent = "";
    let proc;
    try { proc = await os().spawnProcess(cmd); } catch (e) { S.running.socks = false; socksUi(); toast(t("Не удалось запустить"), "err"); return; }
    // v2.4.6 (F32): Stop успели нажать ДО возврата spawn — убиваем немедленно
    if (S.socksCancelRequested) {
      try { await os().killProcess(proc.id); } catch (e) {}
      S.running.socks = false;
      socksUi();
      return;
    }
    if (proc && proc.id != null) registerProc(proc.id, () => {});
    S.procIds.socks = proc.id;
    registerProc(proc.id, (d) => {
      if (d.type === "stdout" || d.type === "stderr") appendLog($("#socksLog"), typeof d.data === "string" ? d.data : "");
      else if (d.type === "exit") {
        unregisterProc(proc.id);
        S.running.socks = false;
        socksUi();
        // v2.4.6 (F39): после exit прокси больше не слушает — прячем адрес и инфоблок
        $("#socksAddr").textContent = "";
        $("#socksInfo").hidden = true;
        appendLog($("#socksLog"), "\n[GUI] " + t("Прокси остановлен.") + "\n");
      }
    });
    // v2.4.6 (F39): адрес показываем только после успешного запуска процесса
    $("#socksAddr").textContent = "socks5h://127.0.0.1:" + socksPort;
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
      // v2.4.2 FIX: execCommand в 6.10 не стримит и не даёт id — см. комментарий в runScan
      const proc = await os().spawnProcess(cmd);
      S.procIds[key] = proc.id;
      // v2.4.6 (F20): вывод приходит кусками — матчим только ЦЕЛЫЕ строки,
      // хвост храним до следующего куска; имя exe и оба алиаса флага принимаются
      let lineBuf = "";
      const tryMatch = (line) => {
        const m = /warpscout(?:\.exe)?\s+(scan\s+(?:-p|-proto)\s\S+.*)/.exec(line);
        if (m && S.running[key]) {
          $("#foundCmdBadge").classList.remove("hidden");
          S.foundCmd = "warpscout " + m[1].trim();
          appendLog(log, "\n[GUI] " + t("Нажмите «Применить к скану».") + "\n");
        }
      };
      registerProc(proc.id, (d) => {
        if (d.type === "stdout" || d.type === "stderr") {
          const data = typeof d.data === "string" ? d.data : "";
          appendLog(log, data);
          lineBuf += data;
          const lines = lineBuf.split(/\r?\n/);
          lineBuf = lines.pop() || "";
          lines.forEach(tryMatch);
        } else if (d.type === "exit") {
          unregisterProc(proc.id);
          if (lineBuf.trim()) tryMatch(lineBuf); // последняя строка без \n
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
    const cmd = strField(S.foundCmd, 1000);
    if (!cmd) { toast(t("Сначала найдите команду"), "err"); return; }
    // v2.4.6 (F21): строим НОВЫЙ согласованный профиль с нуля, а не подмешиваем
    // найденные флаги в текущую форму (старые through/target/gen-junk искажали смысл)
    const s = Object.assign({}, DEFAULT_SCAN);
    const flags = {
      "-p": (v) => (s.proto = v),
      "-proto": (v) => (s.proto = v),
      "-P": () => (s.tunPing = true),
      "-n": (v) => (s.sample = clampInt(v, 1, 256, 10)),
      "-gen-i1": (v) => (s.genI1 = v),
      "-jc": (v) => (s.jc = clampInt(v, 0, 255, 6)),
      "-jmin": (v) => (s.jmin = clampInt(v, 0, 5000, 10)),
      "-jmax": (v) => (s.jmax = clampInt(v, 0, 5000, 50)),
      "-masque-sni": (v) => (s.masqueSni = strField(v, 200)),
      "-threshold": () => {},
    };
    const tokens = cmd.split(/\s+/);
    let sawRawI1 = false;
    for (let i = 0; i < tokens.length; i++) {
      const f = tokens[i];
      if (!Object.prototype.hasOwnProperty.call(flags, f)) {
        // v2.4.6 (F21): CLI сохраняет найденный пакет сырым флагом -i1 (findjunk.go:155) —
        // конкретный I1 в GUI не представим, честно сообщаем ниже
        if (f === "-i1") { sawRawI1 = true; i++; }
        continue;
      }
      if (f === "-P") { flags[f](); continue; }
      const v = tokens[i + 1];
      if (v == null) continue;
      flags[f](v);
      i++;
    }
    s.proto = enumOf(s.proto, SCAN_ENUMS.proto, "awg");
    s.genI1 = enumOf(s.genI1, SCAN_ENUMS.genI1, "");
    // найденные конкретные jc/jmin/jmax несовместимы с генератором junk
    if (s.jc !== "" || s.jmin !== "" || s.jmax !== "") s.genJunk = false;
    S.scan = s;
    S.lastRunParams = null; // применён новый профиль — старый снимок больше не источник параметров
    syncInputsFromState();
    updateCmdPreview();
    persist();
    switchTab("scan");
    if (sawRawI1) {
      toast(t("Найден конкретный I1 — GUI применяет генераторы; raw-I1 задаётся командой из вкладки «Поиск параметров»"), "warn");
    } else {
      toast(t("Параметры применены к скану"), "ok");
    }
  }

  /* ───────── вкладки/интерфейс ───────── */
  function switchTab(name) {
    $$(".nav__item").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-tab") === name));
    $$(".tab").forEach((t) => t.classList.toggle("is-active", t.id === "tab-" + name));
    if (name === "config") { fillEndpointSelect(); renderConf(); }
    // v2.1.1: перешли на вкладку «Аккаунт» — перепроверяем файл (вдруг его
    // положили вручную, пока приложение было открыто)
    if (name === "account") recheckAccount().catch(() => {});
    if (name === "settings") renderDataFolder().catch(() => {}); // v2.2.0: свежий статус папки данных
  }

  function switchSubtab(name) {
    $$(".subtab").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-subtab") === name));
    $("#resultsWrap").classList.toggle("hidden", name !== "results");
    $("#logWrap").classList.toggle("hidden", name !== "log");
  }

  /* ───────── v2.5.0: сенсорный режим (Android / ?touch=1) ─────────
     Нижняя навигация (Главная · Скан · Конфиг · Аккаунт · Ещё) + главная
     страница с тремя основными действиями (скан, поиск параметров,
     генерация конфига). Десктоп-вёрстка не затрагивается (TOUCH_UI = false). */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function touchStatusMirror() {
    // дублируем строки статуса из сайдбара (stWs/stAcc) в главную страницу —
    // без дублирования id: подписка на изменения текста оригиналов
    const ws = $("#stWs"), acc = $("#stAcc");
    if (!ws || !acc) return;
    // v2.5.2: фаза скана (#scanPhase) и число живых эндпоинтов (#resCount) —
    // на главной видно, идёт скан и что он дал, без перехода на вкладку
    const ph = document.getElementById("scanPhase"), rc = document.getElementById("resCount");
    const syncHome = () => {
      const hs = document.getElementById("homeScanRow"), hr = document.getElementById("homeResRow");
      if (!hs && !hr) return;
      const phase = ph ? String(ph.textContent || "").trim() : "";
      const n = (rc && !rc.hidden) ? (parseInt(rc.textContent, 10) || 0) : 0;
      // v2.5.4: после завершения не висим на «Читаем отчёт…» — честный финал
      if (hs) {
        if (S.running.scan) hs.textContent = "● " + t("Скан") + ": " + phase;
        else if (S.results.length) hs.textContent = "● " + t("Скан завершён");
        else hs.textContent = "● " + t("Скан ещё не запускался");
        hs.className = "home-status__row" + (!S.running.scan && S.results.length ? " home-done" : "");
      }
      if (hr) {
        hr.textContent = n ? "● " + tF("Живых эндпоинтов: {n}", { n: n }) : "● " + t("Живых эндпоинтов пока нет");
        hr.className = "home-status__row" + (n ? " home-done" : "");
      }
    };
    const sync = () => {
      const hw = document.getElementById("homeWs"), ha = document.getElementById("homeAcc");
      if (hw) { hw.textContent = ws.textContent; hw.className = "home-status__row " + ws.className; }
      if (ha) { ha.textContent = acc.textContent; ha.className = "home-status__row " + acc.className; }
      syncHome();
    };
    new MutationObserver(sync).observe(ws, { childList: true, characterData: true, subtree: true });
    new MutationObserver(sync).observe(acc, { childList: true, characterData: true, subtree: true });
    if (ph) new MutationObserver(syncHome).observe(ph, { childList: true, characterData: true, subtree: true });
    if (rc) new MutationObserver(syncHome).observe(rc, { attributes: true, childList: true, characterData: true, subtree: true });
    // v2.5.4: ручной доспуск синхронизации главной (статусы меняются не только мутациями DOM)
    window.__wsHomeSync = () => { try { sync(); } catch (e) {} try { syncHome(); } catch (e) {} };
    sync();
    syncHome();
  }
  /* ── v2.5.2: иконки нижней навигации — штриховые SVG вместо <svg><text>эмодзи</text></svg>:
     на части Android-устройств эмодзи внутри SVG-текста не отрисовываются
     (иконка «Ещё» выглядела отсутствующей); контурные пути чёткие и монохромные. ── */
  const TABBAR_ICONS = {
    home: '<path d="M4 11 12 4l8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 10.2V20h11v-9.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    scan: '<path d="M12 3a9 9 0 1 0 9 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 7a5 5 0 1 0 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M17 7l4-4M21 3h-4M21 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
    config: '<path d="M9 2h6v4l3 3v2l-3 3v8H9v-8l-3-3V9l3-3V2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="1.4" fill="currentColor"/>',
    account: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    more: '<circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/>',
  };
  const SVG_BOLT = '<path d="M13 2 4.5 13.5H11L9.5 22 19.5 10h-7L13 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>';
  const SVG_TOOLS = '<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4.2-4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  const SVG_SOCKS = '<path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="19" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="2"/>';
  const SVG_GEAR = '<path d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5zm8.4 3.5a8.4 8.4 0 0 0-.15-1.5l2.05-1.6-2-3.46-2.42.98a8.4 8.4 0 0 0-2.6-1.5L14.9 2h-4l-.37 2.42a8.4 8.4 0 0 0-2.6 1.5l-2.42-.98-2 3.46L5.56 10.5a8.4 8.4 0 0 0 0 3L3.5 15.1l2 3.46 2.42-.98a8.4 8.4 0 0 0 2.6 1.5L10.9 21h4l.37-2.42a8.4 8.4 0 0 0 2.6-1.5l2.42.98 2-3.46-2.06-1.6c.1-.49.17-.99.17-1.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>';

  /* ── v2.5.2: главный экран = панель быстрых действий ──
     «Просканировать эндпоинты» и «Получить рабочий конфиг» выполняются сразу,
     а не открывают вкладки. Фаза скана, число живых эндпоинтов и путь
     сохранённого конфига видны прямо на главной. */
  function bestResultRow() {
    const ok = (S.results || []).filter((r) => !r.torn);
    if (!ok.length) return null;
    let best = ok[0], bp = pingMs(best.tunPing || best.ping);
    for (const r of ok) { const p = pingMs(r.tunPing || r.ping); if (p < bp) { best = r; bp = p; } }
    return best;
  }
  async function mirrorPublic(path) {
    // v2.5.3 (Android): данные уже лежат в видимой «своей папке» на
    // /storage/emulated/0 — зеркалирование в Download больше не нужно
    // (мост отвечает без "path": все вызовы ниже безопасно деградируют
    // к исходному пути, «копии в общей папке» больше не показываются).
    if (!IS_ANDROID || !path) return "";
    const osApi = (window.Neutralino && window.Neutralino.os) || null;
    if (!osApi || typeof osApi.mirrorToPublic !== "function") return "";
    try { const r = await osApi.mirrorToPublic(String(path)); return (r && r.path) ? String(r.path) : ""; }
    catch (e) { return ""; }
  }

  /* ── v2.5.4 (fix): единое «Открыть папку» с ГАРАНТИРОВАННЫМ ответом ──
     Раньше часть кнопок вызывала os().open() с .catch(() => {}) — отказ
     тонул молча. Теперь ВСЕ кнопки открытия идут через openFolderUi:
     1) мгновенный тост «Открываю папку…» (кнопка отвечает всегда);
     2) сам вызов; на ошибку — явный тост-ошибка.
     Сама Android-обёртка (openPath) дополнительно отвечает тостом в
     каждой ветке: открыл / показал в выборе файлов / путь в буфер. */
  async function openFolderUi(path, what) {
    const target = String(path || S.paths.dataDir || window.NL_PATH || "");
    if (IS_MOCK) { toast(t("Только в приложении (в демо папки нет)"), "info"); return; }
    toast(tF("Открываю папку{what}: {p}", { what: what ? " (" + what + ")" : "", p: target }), "info");
    try {
      await Promise.resolve(os().open(target));
    } catch (e) {
      toast(t("Не удалось открыть папку") + ": " + (e && e.message ? e.message : e), "err");
    }
  }
  /* ── v2.5.4 (fix): realtime-индикатор скана на главной ──
     Раньше на главной видно было только текстовое зеркало фазы. Теперь:
     пульсирующая точка + «Сканирую…» + фаза + таймер + шаги/узлы + кнопка
     «Остановить». Обновляется из setPhase/scanLiveClock/scanLiveFeed. */
  function homeScanUi() {
    const liveEl = document.getElementById("homeScanLive");
    if (!liveEl) return;
    const run = !!S.running.scan;
    liveEl.classList.toggle("hidden", !run);
    const idle = document.getElementById("homeScanRow");
    if (idle) idle.classList.toggle("hidden", run);
    const btnH = document.getElementById("homeScan");
    if (btnH) {
      const lbl = btnH.querySelector(".home-act__txt b");
      if (lbl) lbl.textContent = run ? t("■ Остановить скан") : t("Просканировать эндпоинты");
      btnH.classList.toggle("home-act--busy", run);
      btnH.setAttribute("aria-label", run ? t("Остановить скан") : t("Просканировать эндпоинты"));
    }
    homeScanTick();
    // v2.5.4: зеркала статуса на главной (скан/аккаунт/фаза) — доспустить вручную,
    // иначе после завершения скана строка застывала на «Читаем отчёт…»
    try { if (window.__wsHomeSync) window.__wsHomeSync(); } catch (e) {}
  }
  function homeScanTick() {
    const tm = document.getElementById("homeScanTime");
    if (tm && live.on) {
      const sec = Math.max(0, Math.floor((Date.now() - live.t0) / 1000));
      tm.textContent = String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
    }
    const st = document.getElementById("homeScanSteps");
    if (st) {
      const last = live.steps.length ? live.steps[live.steps.length - 1] : null;
      st.textContent = (last ? "⚙ " + last.done + "/" + last.total : "") +
        (live.nodes.length ? (last ? " · " : "") + "🛰 " + live.nodes.length : "");
    }
  }
  async function homeStartScan() {
    // v2.5.4: кнопка главной = старт/стоп одного и того же скана
    if (S.running.scan) {
      try { await stopScan(); } catch (e) {}
      return;
    }
    toast(t("Скан запущен"), "ok");
    homeScanUi();
    try { await window.__WSGUI.runScan(); } catch (e) {}
    homeScanUi();
  }
  async function homeMakeConf() {
    if (S.running.scan) { toast(t("Дождитесь окончания скана — конфиг строится по его результатам"), "warn"); return; }
    if (!confExportReady()) return; // свой toast при отсутствии аккаунта
    const best = bestResultRow();
    if (!best) { toast(t("Нет живых эндпоинтов — сначала просканируйте"), "err"); return; }
    // выбранный эндпоинт попадает и на вкладку «Конфиг» — единое состояние
    $("#cfgEndpoint").value = best.endpoint;
    syncCfgFromInputs();
    renderConf();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const fname = ($("#cfgFileName").textContent || "warp.conf").replace(/\.conf$/, "") + "-" + stamp + ".conf";
    const text = buildConf();
    // ── v2.5.4 (Android): готовые конфиги по умолчанию → Download/WARPScoutGUI ──
    // Публичная папка видна в любом файловом менеджере; на API 29+ пишется
    // через MediaStore БЕЗ разрешений, на 7–9 — при выданном WRITE.
    // При отказе/ошибке — прежний путь в папку данных приложения.
    if (IS_ANDROID) {
      const osApi = os();
      if (osApi && typeof osApi.saveToDownloads === "function") {
        try {
          const r = await osApi.saveToDownloads(fname, "text/plain", utf8ToB64(text));
          if (r && r.ok && r.path) {
            window.__homeConfText = text;
            window.__homeConfPath = String(r.path);
            const boxDl = document.getElementById("homeConfBox");
            if (boxDl) {
              boxDl.hidden = false;
              const p = document.getElementById("homeConfPath");
              if (p) p.textContent = String(r.path);
            }
            toast(t("Конфиг сохранён в Download/WARPScoutGUI"), "ok");
            return;
          }
          if (r && r.fallback) {
            toast(t("Download недоступен без разрешения — конфиг сохранён в папку приложения"), "warn");
          }
        } catch (e) {
          toast(tF("Download недоступен ({err}) — сохраняю в папку приложения", { err: e && e.message ? e.message : e }), "warn");
        }
      }
    }
    const dir = S.paths.dataDir || (window.NL_PATH || ".");
    let savedPath = "";
    try {
      await ensureDir(dir);
      savedPath = pxJoin(dir, fname);
      await fs().writeFile(savedPath, text);
    } catch (e) {
      toast(tF("Ошибка записи: {err}", { err: e && e.message ? e.message : e }), "err");
      return;
    }
    const pub = await mirrorPublic(savedPath);
    window.__homeConfText = text;
    window.__homeConfPath = savedPath;
    const box = document.getElementById("homeConfBox");
    if (box) {
      box.hidden = false;
      const p = document.getElementById("homeConfPath");
      if (p) p.textContent = pub || savedPath;
    }
    toast(tF("Конфиг готов: {p}", { p: pub || savedPath }), "ok");
  }

  function setupTouchUi() {
    if (!TOUCH_UI) return;
    document.body.classList.add("touch-ui");
    const main = $("main.main");
    if (!main) return;
    // v2.5.4 (fix): data-tab рендерится ВСЕГДА (даже пустой). Раньше кнопки без
    // вкладки (например «🌓 Переключить тему» в «Ещё») не имели атрибута, и
    // делегированный обработчик closest("[data-tab]") их не находил — кнопка
    // темы не работала вовсе. Пустой data-tab безопасен: ветка switchTab
    // отбрасывает пустое значение, а собственные слушатели кнопок живут как жили.
    const btn = (id, icon, label, big, tab) =>
      '<button class="home-act' + (big ? " home-act--big" : "") + '" type="button" data-tab="' + (tab || "") + '" id="' + id + '">' +
      '<span class="home-act__ico" aria-hidden="true">' + icon + '</span><span class="home-act__txt"><b>' + label + '</b></span></button>';
    const actIco = (svg) => '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' + svg + '</svg>';
    // ── Главная: панель быстрых действий (v2.5.2) ──
    // v2.5.4: живой индикатор скана (#homeScanLive) — пульсирующая точка,
    // фаза, таймер, шаги/узлы и кнопка «Остановить» прямо на главной
    const home = el("section", "tab", 
      '<div class="home-wrap">' +
      '<div class="card home-status"><div class="home-status__row" id="homeWs">…</div>' +
      '<div class="home-status__row" id="homeAcc">…</div>' +
      '<div class="home-scanlive hidden" id="homeScanLive" role="status" aria-live="polite">' +
        '<span class="home-scanlive__dot" aria-hidden="true"></span>' +
        '<span class="home-scanlive__main"><b>' + t("Сканирую…") + '</b><span id="homeScanPhase"></span></span>' +
        '<span class="home-scanlive__meta"><span id="homeScanTime">00:00</span><span id="homeScanSteps"></span></span>' +
        '<button class="home-scanlive__stop" id="homeScanStop" type="button">■ ' + t("Остановить") + '</button>' +
      '</div>' +
      '<div class="home-status__row" id="homeScanRow"></div>' +
      '<div class="home-status__row" id="homeResRow"></div>' +
      '<div class="home-status__hint">' + (IS_ANDROID
        ? "Готовые конфиги сохраняются в Download/WARPScoutGUI — папка видна в любом файловом менеджере"
        : "Сенсорный режим интерфейса") + '</div></div>' +
      '<h2 class="home-title">Основные действия</h2>' +
      '<div class="home-actions">' +
      btn("homeScan", actIco(TABBAR_ICONS.scan), "Просканировать эндпоинты", true, "") +
      btn("homeConf", actIco(SVG_BOLT), "Получить рабочий конфиг", true, "") +
      '</div>' +
      '<div class="home-pub" id="homeConfBox" hidden><b>✓ ' + "Конфиг сохранён" + '</b>' +
      '<span id="homeConfPath"></span>' +
      '<div class="home-pub__btns"><button class="btn btn--ghost btn--sm" id="homeConfOpen" type="button">📁 ' + "Открыть папку" + '</button>' +
      '<button class="btn btn--ghost btn--sm" id="homeConfCopy" type="button">📋 ' + "Скопировать конфиг" + '</button></div></div>' +
      (IS_ANDROID
        ? '<div class="home-pub" id="homePubBox"><b>Download/WARPScoutGUI</b> — ' + "готовые конфиги (видны в любом файловом менеджере)" +
          '<div class="home-pub__btns"><button class="btn btn--ghost btn--sm" id="homePubOpen" type="button">📁 ' + "Открыть папку" + '</button></div></div>'
        : "") +
      // v2.5.2: разделы вертикальным списком (как в «Ещё») — в ряд из трёх
      // кнопок подписи не помещались и распирали страницу по горизонтали
      '<h2 class="home-title">Разделы</h2>' +
      '<div class="home-actions home-actions--list">' +
      btn("homeTools", actIco(SVG_TOOLS), "Поиск параметров", false, "tools") +
      btn("homeSocks", actIco(SVG_SOCKS), "SOCKS-прокси", false, "socks") +
      btn("homeSettings", actIco(SVG_GEAR), "Настройки", false, "settings") +
      '</div></div>');
    home.id = "tab-home";
    home.setAttribute("aria-label", "Главная");
    // ── Ещё ──
    const more = el("section", "tab",
      '<div class="home-wrap"><h2 class="home-title">Ещё</h2><div class="home-actions home-actions--list">' +
      btn("moreTools", "🛠", "Поиск параметров", false, "tools") +
      btn("moreSocks", "🔗", "SOCKS-прокси", false, "socks") +
      btn("moreSettings", "⚙", "Настройки", false, "settings") +
      btn("moreTheme", "🌓", "Переключить тему", false, "") +
      '</div>' +
      // v2.5.0 (аудит B4): переключатель языка доступен из touch-навигации
      // (классы .lang-switch — applyLang сам синхронизирует is-active)
      '<div class="home-lang"><div class="lang-switch" role="group" aria-label="Язык / Language">' +
      '<button class="lang-switch__btn' + (LANG === "en" ? "" : " is-active") + '" type="button" data-lang="ru" aria-label="Русский">RU</button>' +
      '<button class="lang-switch__btn' + (LANG === "en" ? " is-active" : "") + '" type="button" data-lang="en" aria-label="English">EN</button>' +
      '</div></div><div class="home-foot">WARPSCOUT GUI v' + (window.NL_APPVERSION || "2.5.2") + ' · warpscout v0.16.0<br>Android-оболочка: WebView + ядро warpscout (MIT)</div></div>');
    more.id = "tab-more";
    more.setAttribute("aria-label", "Ещё");
    main.insertBefore(home, main.firstChild);
    main.appendChild(more);
    // ── нижняя навигация (v2.5.2: контурные SVG-иконки) ──
    const tabs = [["home", "home", "Главная"], ["scan", "scan", "Скан"], ["config", "config", "Конфиг"], ["account", "account", "Аккаунт"], ["more", "more", "Ещё"]];
    const bar = el("nav", "tabbar");
    bar.setAttribute("aria-label", "Нижняя навигация");
    tabs.forEach(([t, icoKey, label]) => {
      const b = el("button", "nav__item tabbar__btn" + (t === "home" ? " is-active" : ""),
        '<svg viewBox="0 0 24 24" class="nav__ico" aria-hidden="true" focusable="false">' + TABBAR_ICONS[icoKey] + '</svg><span>' + label + '</span>');
      b.setAttribute("data-tab", t);
      b.setAttribute("type", "button");
      b.setAttribute("aria-label", label);
      bar.appendChild(b);
    });
    document.body.appendChild(bar);
    // ── переходы с главной/меню ──
    main.addEventListener("click", (ev) => {
      const b = ev.target && ev.target.closest ? ev.target.closest("[data-tab]") : null;
      if (!b) return;
      // тема — не переход по вкладке (data-tab пустой намеренно)
      if (b.id === "moreTheme") { const tb = $("#btnTheme"); if (tb) tb.click(); return; }
      const t = b.getAttribute("data-tab");
      if (!t) return;
      switchTab(t);
      window.scrollTo(0, 0);
    });
    // v2.5.4 (fix): прямой слушатель на кнопке темы — помимо делегирования.
    // Даже еслиclosest-цепочка когда-нибудь сломается, тема переключится.
    const moreThemeBtn = document.getElementById("moreTheme");
    if (moreThemeBtn) moreThemeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const tb = $("#btnTheme");
      if (tb) tb.click();
    });
    // v2.5.2: главные действия выполняются сразу (не переход по вкладкам)
    const hScan = document.getElementById("homeScan");
    if (hScan) hScan.addEventListener("click", homeStartScan);
    const hConf = document.getElementById("homeConf");
    if (hConf) hConf.addEventListener("click", homeMakeConf);
    const hcOpen = document.getElementById("homeConfOpen");
    if (hcOpen) hcOpen.addEventListener("click", () => {
      // v2.5.4: единый хелпер — мгновенный тост + явная ошибка (было .catch(() => {}))
      openFolderUi(window.__homeConfPath || S.paths.dataDir || window.NL_PATH || "", "конфиги");
    });
    const hcCopy = document.getElementById("homeConfCopy");
    if (hcCopy) hcCopy.addEventListener("click", () => { if (window.__homeConfText) copyText(window.__homeConfText, t("Конфиг скопирован")); });
    const hpOpen = document.getElementById("homePubOpen");
    if (hpOpen) hpOpen.addEventListener("click", () => {
      // v2.5.4 (Android): конфиги по умолчанию лежат в Download/WARPScoutGUI —
      // она видна в ЛЮБОМ файловом менеджере (Android/data — нет)
      openFolderUi(IS_ANDROID ? ANDROID_DOWNLOAD_DIR : (S.paths.dataDir || window.NL_PATH || ""), "готовые конфиги");
    });
    // v2.5.0 (аудит B4): переключение языка из touch-меню
    const langWrap = more.querySelector(".home-lang .lang-switch");
    if (langWrap) langWrap.addEventListener("click", (ev) => {
      const b = ev.target && ev.target.closest ? ev.target.closest("[data-lang]") : null;
      if (!b) return;
      const lg = b.getAttribute("data-lang");
      if (LANG !== lg) { applyLang(lg); toast(lg === "en" ? "Language: English" : "Язык: русский", "ok"); }
    });
    touchStatusMirror();
    // стартовая вкладка — главная
    $$(".tab").forEach((x) => x.classList.toggle("is-active", x.id === "tab-home"));
    $$(".nav__item").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-tab") === "home"));
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
    c.dnsV6 = $("#cfgDnsV6").checked; // v2.4.3
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
    $("#cfgDnsV6").checked = c.dnsV6 !== false; // v2.4.3: у старых сохранённых состояний поля нет → включено
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

  function stateJson() {
    return JSON.stringify({ scan: S.scan, cfg: S.cfg, settings: S.settings, customPresets: S.customPresets, compact: S.compact, foundCmd: S.foundCmd || "", history: S.history.slice(0, 10), qcHistory: S.qcHistory.slice(0, 50) });
  }

  function writeStateNow() {
    if (!HAS_NL) return Promise.resolve();
    try {
      return store().setData("state", stateJson()).catch(() => {});
    } catch (e) { return Promise.resolve(); }
  }

  const persist = debounce(writeStateNow, 400);

  // v2.4.6 (F17): явный flush — запись БЕЗ дебаунса; после значимых операций
  // (смена папки данных, сброс) вызываем flushSave() и ДОЖИДАЕМСЯ записи
  async function flushSave() {
    await writeStateNow();
  }

  window.addEventListener("beforeunload", () => {
    writeStateNow();
  });

  /* ───────── проверка warpscout ───────── */
  // v2.2.0: проверка версии через spawnProcess вместо не-stream execCommand.
  // Причина: нативные вызовы Neutralino обрабатываются ПО ОЧЕРЕДИ (websocket-хендлер
  // синхронный) — execCommand «warpscout version» при медленном антивирусе держал
  // очередь десятки секунд, и ВСЕ кнопки (включая «Открыть папку») отвечали с
  // задержкой до ~30 с. spawnProcess возвращается сразу, вывод приходит событиями,
  // зависший процесс убивается по таймауту 8 с. Плюс кэш результата на 60 с.
  async function checkWarpscout(force) {
    const el = $("#stWs");
    if (!force && S.wsChecked && S.wsVersionOk && Date.now() - (S.wsCheckedAt || 0) < 60000) return true;
    if (S.wsChecking) {
      // v2.4.2 FIX: force-проверка во время идущей — дожидаемся ЕЁ результата,
      // а не возвращаем устаревший false (ложное «не найден» при живом exe)
      if (force && S.wsInflight) return S.wsInflight;
      return S.wsChecked ? S.wsVersionOk : false;
    }
    S.wsChecking = true;
    S.wsInflight = checkWarpscoutRun(el);
    try {
      return await S.wsInflight;
    } finally {
      S.wsChecking = false;
      S.wsInflight = null;
    }
  }

  async function checkWarpscoutRun(el) {
    let ok = false;
    let fileThere = false;
    try {
      // v2.4.0: сперва ЧЕСТНО резолвим путь. Пользователь может указать сам exe, папку
      // с exe или папку приложения (exe внутри bin). Битый/устаревший путь из настроек
      // больше не блокирует штатные места — см. resolveWarpscoutPath().
      const res = await resolveWarpscoutPath();
      S.paths.wsTried = res.tried;
      S.paths.wsCheckedList = res.checked;
      S.paths.wsFound = res.found;
      // v2.4.1: папка bin на месте, а warpscout.exe в ней нет? — почти наверняка
      // антивирус удалил файл при распаковке ZIP (или архив распакован не целиком)
      S.paths.appBinMissing = false;
      if (!res.found && S.paths.appDir) {
        S.paths.appBinMissing = await dirThere(S.paths.appDir + "\\bin");
      }
      if (res.found) {
        S.paths.wsPath = res.path;
        fileThere = true;
        const inp = $("#setWsPath");
        if (inp && inp.value.trim() !== res.path) inp.value = res.path;
        if (String(S.settings.wsPath || "").trim().toLowerCase() !== res.path.toLowerCase()) {
          S.settings.wsPath = res.path; // нормализация: в настройках храним точный путь к exe
          persist();
        }
      }
      if (IS_MOCK) {
        S.wsVersion = "0.16.0";
        ok = true;
      } else if (fileThere) {
        let proc = null;
        let exitCode = null; // v2.4.6 (F37)
        try { proc = await os().spawnProcess(quoteExe() + " version"); } catch (e) { proc = null; }
        const out = await new Promise((resolve) => {
          let buf = "";
          let done = false;
          const finish = () => { if (!done) { done = true; resolve(buf.trim()); } };
          if (proc && proc.id != null) {
            registerProc(proc.id, (d) => {
              if (d.type === "stdout" || d.type === "stderr") buf += typeof d.data === "string" ? d.data : "";
              else if (d.type === "exit") { exitCode = exitCodeOf(d.data); unregisterProc(proc.id); finish(); }
            });
            setTimeout(async () => { await killProc(proc.id); unregisterProc(proc.id); finish(); }, 8000);
          } else finish();
        });
        // v2.4.6 (F37): версия принимается только при чистом завершении процесса.
        // 143/потерянный exit прощаем (это наш таймаут/синтетика), ненулевой настоящий код — нет.
        if (/^\d+\.\d+/.test(out) && (exitCode === 0 || exitCode === 143 || exitCode === -1)) {
          S.wsVersion = out;
          ok = true;
        } else {
          S.wsVersion = "";
        }
      } else {
        S.wsVersion = "";
      }
    } catch (e) { /* помечаем «не отвечает» ниже */ }
    S.wsChecked = true;
    S.wsVersionOk = ok;
    S.wsCheckedAt = Date.now();
    S.wsFileThere = fileThere;
    renderStatusWs();
    renderWsHints(); // v2.4.0: подсказка обновляется ВСЕГДА — раньше при неудаче висело «Проверка не выполнялась»
    updateWsFullPath(); // v2.4.1: строка «Полный путь» синхронна с результатом
    if (el) {
      el.className = ok ? "statusline__row is-ok" : "statusline__row is-err";
      el.title = S.paths.wsPath;
    }
    return ok;
  }

  async function browseWsPath() {
    let p;
    try {
      p = await os().showOpenDialog(t("Выберите warpscout.exe"), { multiSelections: false, filters: [{ name: "warpscout.exe", extensions: ["exe"] }] });
    } catch (e) { p = null; }
    let picked = null;
    if (Array.isArray(p) && p[0]) picked = p[0];
    else if (typeof p === "string" && p) picked = p;
    if (IS_MOCK && !picked) { toast(t("Выбор файла работает только в приложении"), "err"); return; }
    if (!picked) return;
    S.settings.wsPath = picked;
    S.paths.wsPath = picked;
    $("#setWsPath").value = picked;
    updateWsFullPath();
    persist();
    checkWarpscout(true); // v2.4.0: force — пользователь явно попросил проверку
  }

  /* ───────── инициализация ───────── */
  // v2.2.0: имя нашего exe (имя веб-кэш-папки рантайм берёт ИЗ ИМЕНИ БИНАРНИКА,
  // с расширением — см. lib/webview/webview.h: userDataFolder = %APPDATA% + PathFindFileNameW(exe))
  function exeFileName() {
    const a0 = window.NL_ARGS && window.NL_ARGS[0] ? String(window.NL_ARGS[0]) : "";
    const m = a0.match(/([^\\/"']+)\.exe\s*$/i);
    if (m) return m[1] + ".exe";
    // v2.5.0: вне Windows бинарник без .exe — берём имя файла из пути запуска
    if (!IS_WIN) {
      const i = Math.max(a0.lastIndexOf("\\"), a0.lastIndexOf("/"));
      const nm = (i >= 0 ? a0.slice(i + 1) : a0).trim();
      if (nm) return nm;
      return GUI_EXE;
    }
    return "WARPScoutGUI.exe";
  }

  // v2.3.0: папка приложения — по полному пути из NL_ARGS[0], а НЕ по window.NL_PATH.
  // NL_PATH после перезапуска внешним скриптом (Start-Process из чужого рабочего
  // каталога) может оказаться неверным — тогда приложение «не находит warpscout в
  // своей папке». NL_ARGS[0] — фактический путь запущенного exe, от CWD не зависит.
  function exeDirName() {
    const a0 = window.NL_ARGS && window.NL_ARGS[0] ? String(window.NL_ARGS[0]) : "";
    const i = Math.max(a0.lastIndexOf("\\"), a0.lastIndexOf("/"));
    if (i > 0) {
      const dir = a0.slice(0, i).replace(/[\\/]+$/, "");
      // v2.5.0: абсолютные пути — буква диска / UNC (Windows) или корень "/" (POSIX)
      if (/^[a-zA-Z]:[\\/]/.test(dir) || dir.startsWith("\\\\") || dir.startsWith("/")) return dir;
    }
    return window.NL_PATH ? String(window.NL_PATH).replace(/[\\/]+$/, "") : "";
  }

  // ─── v2.4.0: честный поиск warpscout.exe ───
  // Регресс v2.3.0: пользователь указывал в настройках ПАПКУ (например,
  // D:\Downloads\WARPScoutGUI), она сохранялась как есть и навсегда перекрывала
  // штатное место bin\ рядом с приложением; проверка пыталась «запустить папку»,
  // падала молча, а подсказка оставалась «Проверка не выполнялась». Теперь:
  // (1) папка — валидный ввод: ищем exe внутри (в корне и в bin\);
  // (2) битый custom больше не затирает штатные места — проверяем все кандидаты;
  // (3) существование проверяем fs.getStats (isFile), а не попыткой запуска.
  async function wsFileExists(p) {
    if (!p) return false;
    if (IS_MOCK) return /warpscout(\.exe|\.so)?$/i.test(String(p).replace(/[\\/]+$/, ""));
    try {
      const st = await fs().getStats(p);
      if (!st) return false;
      if (st.isFile === true || st.isDirectory === false) return String(st.type || "FILE").toUpperCase() !== "DIRECTORY";
      return false;
    } catch (e) { return false; }
  }

  function wsCandidates() {
    const list = [];
    const push = (p) => { if (p) list.push(String(p).replace(/[\\/]+$/, "")); };
    const custom = String(S.settings.wsPath || "").trim().replace(/[\\/]+$/, "");
    if (custom) {
      push(custom);                          // указан сам exe
      push(pxJoin(custom, WS_EXE));          // указана папка, где exe лежит рядом (v2.5.0)
      push(pxJoin(pxJoin(custom, "bin"), WS_EXE)); // указана папка приложения (exe внутри bin)
    }
    // v2.5.0: Android — warpscout упакован как libwarpscout.so в nativeLibraryDir;
    // путь к нему приносит оболочка (window.NL_WS_PATH) — до пользовательских настроек
    if (IS_ANDROID && window.NL_WS_PATH) push(String(window.NL_WS_PATH));
    const appDir = String(S.paths.appDir || "").replace(/[\\/]+$/, "");
    if (appDir) {
      push(pxJoin(pxJoin(appDir, "bin"), WS_EXE)); // штатное место: bin рядом с WARPScoutGUI (v2.5.0)
      push(pxJoin(appDir, WS_EXE));          // warpscout лежит рядом с GUI
    }
    const nlPath = window.NL_PATH ? String(window.NL_PATH).replace(/[\\/]+$/, "") : "";
    if (nlPath && nlPath.toLowerCase() !== appDir.toLowerCase()) {
      push(pxJoin(pxJoin(nlPath, "bin"), WS_EXE));
      push(pxJoin(nlPath, WS_EXE));
    }
    const seen = new Set();
    return list.filter((p) => {
      const k = p.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // v2.4.1: возвращаем ещё и checked — построчные результаты «есть/нет» для каждого
  // кандидата: они идут в подсказку и в «Скопировать диагностику», чтобы пользователь
  // ВИДЕЛ, где программа искала файл и что там нашлось (без скриншотов и догадок).
  async function resolveWarpscoutPath() {
    const cands = wsCandidates();
    const checked = [];
    for (const c of cands) {
      const ex = await wsFileExists(c);
      checked.push({ path: c, exists: !!ex });
      if (ex) return { path: c, found: true, tried: cands, checked };
    }
    return { path: "", found: false, tried: cands, checked };
  }

  // v2.4.1: существует ли КАТАЛОГ (для сценария «bin есть, а warpscout.exe в нём удалён антивирусом»)
  async function dirThere(p) {
    if (!p || IS_MOCK) return false;
    try {
      const st = await fs().getStats(p);
      // v2.4.2 FIX: у Neutralino 6.10 Stats НЕТ поля type ({size,isFile,isDirectory,createdAt,modifiedAt}) —
      // проверка st.type==="DIRECTORY" всегда давала false: appBinMissing не определялся,
      // а «📁 Показать в папке» писала «Папки нет на диске» для существующих папок.
      return !!st && st.isDirectory === true;
    } catch (e) { return false; }
  }

  // v2.4.1: полный путь — отдельной строкой под полем (жалоба пользователя: полный путь
  // «не был виден из-за короткой строки»). Дублируем в title поля — виден при наведении.
  function updateWsFullPath() {
    const code = $("#setWsFull");
    const inp = $("#setWsPath");
    if (!code && !inp) return;
    const inpVal = inp ? inp.value.trim() : "";
    // v2.4.2 FIX: пока пользователь печатает свой путь — показываем ЕГО ввод,
    // найденный путь показываем только когда он совпадает с полем
    const shown = (S.paths.wsFound && S.paths.wsPath && inpVal.toLowerCase() === S.paths.wsPath.toLowerCase()) ? S.paths.wsPath
      : (inpVal || S.paths.wsPath || "—");
    if (code) code.textContent = shown;
    if (inp) inp.title = shown;
  }

  async function computePaths() {
    let base = "";
    if (IS_MOCK) {
      // v2.5.0 (аудит A4): android-превью — base по-настоящему андроидный
      base = IS_ANDROID ? "/storage/emulated/0/Android/data/ru.warpscout.gui/files" : "C:\\Users\\Demo\\AppData\\Roaming";
    } else {
      let dataDir = "";
      try { dataDir = await os().getPath("data"); } catch (e) { dataDir = ""; }
      base = (dataDir || (window.NL_PATH || "") || "").replace(/[\\/]+$/, "");
      if (!base) base = "."; // крайний случай: относительно CWD
    }
    // v2.5.0 (аудит A6): android-превью показывает имя без .exe (как в реальной сборке)
    S.paths.exeName = IS_MOCK ? (IS_ANDROID ? "WARPScoutGUI" : "WARPScoutGUI.exe") : exeFileName();
    S.paths.udfPath = pxJoin(base, S.paths.exeName); // каталог веб-кэша (жёстко задан рантаймом) (v2.5.0)
    // v2.3.0 — НАОБОРОТ (просьба пользователя): данные (аккаунт + отчёты) живут ВНУТРИ
    // папки «<имя exe>», рядом с EBWebView. Эта папка создаётся рантаймом всегда и
    // существует с первого запуска — «одна папка» достигается без junction/PowerShell.
    S.paths.dataDirDefault = S.paths.udfPath;
    S.paths.legacyDataDir = pxJoin(base, "WARPScoutGUI"); // v2.1–2.2: старая папка (для автопереноса) (v2.5.0)
    // v2.2.0: пользовательская папка данных (Настройки → «Папка данных»)
    let root = (S.settings.dataRoot || "").trim();
    // v2.3.0: нормализация — старое умолчание и сама папка exe больше не считаются «своей папкой»
    if (root) {
      const rl = root.toLowerCase();
      if (rl === (S.paths.legacyDataDir || "").toLowerCase() || rl === S.paths.udfPath.toLowerCase()) {
        S.settings.dataRoot = "";
        root = "";
      }
    }
    if (root && !IS_MOCK) {
      let ok = true;
      try { await ensureDir(root); } catch (e) { ok = false; }
      if (ok) { try { await fs().readDirectory(root); } catch (e) { ok = false; } }
      if (!ok) {
        S.settings.dataRoot = "";
        root = "";
        toast(t("Пользовательская папка данных недоступна — вернулись к папке по умолчанию"), "err");
      }
    }
    S.paths.dataDir = root || S.paths.dataDirDefault;
    S.paths.accPath = pxJoin(S.paths.dataDir, "warpscout-account.json"); // v2.5.0
    S.paths.reportsDir = pxJoin(S.paths.dataDir, "reports"); // v2.5.0
    // v2.4.0: warpscout ищем по всем типичным местам: пользовательский путь (сам exe,
    // папка с exe или папка приложения с bin\), затем bin/папка приложения, затем NL_PATH.
    // Порядок и самозамазка — в wsCandidates()/resolveWarpscoutPath().
    S.paths.appDir = IS_MOCK ? String(window.NL_PATH || "") : exeDirName();
    const wsCustom = String(S.settings.wsPath || "").trim();
    S.paths.wsPath = "";
    S.paths.wsFound = false;
    S.paths.wsTried = [];
    const wsRes = await resolveWarpscoutPath();
    S.paths.wsTried = wsRes.tried;
    S.paths.wsCheckedList = wsRes.checked;
    S.paths.wsFound = wsRes.found;
    if (wsRes.found) {
      S.paths.wsPath = wsRes.path;
      // custom указывает не на найденный exe (мусор/переезд папки)? — самоочистка,
      // иначе он навсегда перекрыл бы штатное место (корень регресса v2.3.0)
      if (wsCustom && wsCustom.toLowerCase() !== wsRes.path.toLowerCase()) {
        S.settings.wsPath = "";
        persist();
      }
    }
    if (!S.paths.wsPath) {
      S.paths.wsPath = wsCustom || (S.paths.appDir ? pxJoin(pxJoin(S.paths.appDir, "bin"), WS_EXE) : (window.NL_PATH ? pxJoin(pxJoin(window.NL_PATH, "bin"), WS_EXE) : pxJoin("bin", WS_EXE))); // v2.5.0
    }
    S.paths.wsCustom = wsCustom;
    // v2.1.0: папка данных существует с первого запуска — иначе warpscout не сможет
    // сохранить аккаунт (не создаёт родительские каталоги), а «Открыть папку» падал
    await ensureDir(S.paths.dataDir);
    await ensureDir(S.paths.reportsDir);
    $("#setWsPath").value = S.paths.wsFound ? S.paths.wsPath : (wsCustom || S.paths.wsPath);
    updateWsFullPath(); // v2.4.1: полный путь виден целиком сразу после расчёта путей
    $("#setAccPath").value = S.paths.accPath;
    $("#setReportDir").value = S.paths.reportsDir;
    const dr = $("#setDataRoot");
    if (dr) dr.value = S.paths.dataDir;
    // v2.2.0: полный путь — в подсказке каждой кнопки-папки: путаницы «какая из двух» больше нет
    [["#btnOpenAccFolder", S.paths.dataDir], ["#btnOpenAcc", S.paths.dataDir], ["#btnOpenReports", S.paths.reportsDir], ["#btnDataRootOpen", S.paths.dataDir]]
      .forEach(([sel, p]) => { const b = $(sel); if (b) b.title = p; });
  }

  /* ───────── v2.3.0: одна папка данных — внутри «<имя exe>», рядом с EBWebView ───────── */
  // Рантайм Neutralino жёстко создаёт веб-кэш (EBWebView) в %APPDATA%\<имя exe>.
  // v2.3.0 (просьба пользователя): данные (аккаунт, отчёты) теперь живут РЯДОМ с ним —
  // внутри той же папки. Junction-объединение v2.2.0 удалено как ненадёжное; для тех,
  // кто успел объединить, есть repairUdfJunction() ниже.

  // ─── v2.3.0: статус папки данных — одна папка, без junction/объединений ───
  async function renderDataFolder() {
    const el = $("#udfState");
    if (!el) return "default";
    const custom = !!String(S.settings.dataRoot || "").trim();
    el.textContent = custom ? t("⚠ своя папка данных") : t("✓ аккаунт, отчёты и кэш — в одной папке");
    el.className = custom ? "is-warn" : "is-ok";
    const hint = $("#dataRootHint");
    if (hint) {
      hint.textContent = custom
        ? tF("Данные (аккаунт, отчёты): {d}. Веб-кэш движка рантайм всегда держит в {u} — техническая папка останется рядом.", { d: S.paths.dataDir, u: S.paths.udfPath })
        : tF("Всё вместе — в одной папке: {u}. Она создаётся программой сама, поэтому всегда на месте.", { u: S.paths.udfPath });
      // v2.6.0 (SEC-6): на Android данные приватны (app-specific), а наружу
      // (файловым менеджерам) копируются в единую папку Download/WARPScoutGUI
      if (IS_ANDROID) {
        hint.textContent += " " + t("Отчёты и конфиги дублируются в общую папку устройства: Download/WARPScoutGUI");
      }
    }
    return custom ? "custom" : "default";
  }

  // v2.4.6 (F12): каноническое сравнение путей Windows — регистр букв и вид
  // разделителей НЕ делают папки разными («C:\Warp» и «c:\warp» — одна папка)
  function normWinPath(p) {
    return String(p || "").trim().replace(/[\\/]+$/, "").replace(/[\\/]+/g, "\\").toLowerCase();
  }
  function isSameWinPath(a, b) {
    return !!a && !!b && normWinPath(a) === normWinPath(b);
  }
  // v2.4.6 (F13): destination внутри source — миграцию запускать НЕЛЬЗЯ
  function isWinPathInside(child, parent) {
    const c = normWinPath(child), p = normWinPath(parent);
    return !!c && !!p && c !== p && c.indexOf(p + "\\") === 0;
  }

  // перенос данных (аккаунт + отчёты) между корнями при смене папки данных.
  // EBWebView здесь НЕ трогаем: файлы кэша держит открытыми веб-движок, перенос —
  // только через «Объединить» (после закрытия приложения).
  // v2.4.6 (F12–F15): копируем ВСЁ → проверяем запись → удаляем только успешно
  // скопированные файлы; конфликты НЕ перезаписывают destination; старый каталог
  // удаляется только если опустел; при вложенности/ошибке — явный отказ.
  // v2.5.8 (fix): пути собираются pxJoin (платформенный разделитель), а НЕ конкатенацией
  // с "\\" — та жёсткая склейка на Android давала «…/WARPScoutGUI\warpscout-account.json»
  // (\ — часть ИМЕНИ файла): чтение старого аккаунта падало молча, переносилcя ноль файлов,
  // а папка данных переключалась — «аккаунт не перенесся». На Windows pxJoin даёт ровно
  // прежние пути (PSEP = "\"), поведение Windows не меняется.
  async function migrateData(oldRoot, newRoot) {
    const moved = [];
    const conflicts = [];
    if (!oldRoot || !newRoot || isSameWinPath(oldRoot, newRoot)) return { moved, conflicts };
    if (isWinPathInside(newRoot, oldRoot)) throw new Error(t("новая папка находится внутри старой — выберите папку вне её"));
    await ensureDir(newRoot);
    // аккаунт
    let accText = "";
    try { accText = await fs().readFile(pxJoin(oldRoot, "warpscout-account.json")); } catch (e) { accText = ""; }
    if (accText) {
      let destExists = false;
      try { await fs().readFile(pxJoin(newRoot, "warpscout-account.json")); destExists = true; } catch (e) {}
      if (destExists) {
        conflicts.push("warpscout-account.json (в новой папке уже есть аккаунт — сохранён он)"); // F15
      } else {
        await fs().writeFile(pxJoin(newRoot, "warpscout-account.json"), accText);
        let verified = false;
        try { verified = (await fs().readFile(pxJoin(newRoot, "warpscout-account.json"))) === accText; } catch (e) { verified = false; }
        if (!verified) throw new Error("аккаунт не прошёл проверку записи — перенос отменён, старая папка не тронута");
        try { await fs().remove(pxJoin(oldRoot, "warpscout-account.json")); } catch (e) { /* удалим при следующем переносе */ }
        moved.push("warpscout-account.json");
      }
    }
    // отчёты
    try {
      const items = await fs().readDirectory(pxJoin(oldRoot, "reports"));
      if (Array.isArray(items) && items.length) {
        await ensureDir(pxJoin(newRoot, "reports"));
        for (const it of items) {
          if (String(it.type || "").toUpperCase() === "DIRECTORY") continue; // подкаталоги не трогаем (F14)
          const name = String(it.path || "").split(/[\\/]/).pop();
          if (!name || !/^[\w.\- ()\[\]]+$/.test(name)) continue; // только имена отчётов нашего формата
          let txt2 = "";
          try { txt2 = await fs().readFile(it.path); } catch (e) { continue; } // не читается — остаётся на месте
          let destExists = false;
          try { await fs().readFile(pxJoin(newRoot, "reports", name)); destExists = true; } catch (e) {}
          if (destExists) { conflicts.push("reports/" + name); continue; } // F15: имя занято — файл остаётся в старой папке
          try { await fs().writeFile(pxJoin(newRoot, "reports", name), txt2); } catch (e) { continue; } // не скопировался — НЕ удаляем источник
          moved.push("reports/" + name);
        }
        // v2.4.6 (F14): старый reports удаляем ТОЛЬКО если он опустел
        try {
          const rest = await fs().readDirectory(pxJoin(oldRoot, "reports"));
          if (Array.isArray(rest) && !rest.length) { try { await fs().remove(pxJoin(oldRoot, "reports")); } catch (e) {} }
        } catch (e) {}
      }
    } catch (e) { /* папки отчётов нет */ }
    return { moved, conflicts };
  }

  /* ─── v2.5.8 (Android): автодогон данных в активную папку при запуске ───
     Сценарий из поля: перенос «В общую папку…» на 2.5.3–2.5.7 переключал
     папку данных, но сами файлы (см. migrateData выше) оставались в прежней
     app-specific папке → после запуска «аккаунт: нет». При каждом запуске
     переносим аккаунт/отчёты из прежних папок приложения (app-specific
     external files и приватный filesDir — список приносит deviceInfo →
     window.NL_LEGACY_DIRS) в активную папку. Идемпотентно: migrateData
     не перезаписывает существующие файлы, а «перенести нечего» — тихий no-op
     (без тоста), так что повторные запуски ничего не меняют. */
  async function migrateAndroidLegacyData() {
    if (!IS_ANDROID || IS_MOCK || !HAS_NL) return;
    const dst = S.paths.dataDir;
    if (!dst) return;
    const dirs = Array.isArray(window.NL_LEGACY_DIRS) ? window.NL_LEGACY_DIRS : [];
    const copiedAll = [];
    for (const raw of dirs) {
      const src = String(raw || "").trim().replace(/[\\/]+$/, "");
      if (!src || isSameWinPath(src, dst)) continue;
      try {
        const r = await migrateData(src, dst);
        copiedAll.push(...r.moved);
      } catch (e) { /* одна из прежних папок недоступна — пробуем следующую */ }
    }
    if (copiedAll.length) {
      if (copiedAll.indexOf("warpscout-account.json") !== -1) {
        try { await loadAccount(); } catch (e) {}
        renderAccount();
        renderAccountStatusline();
      }
      toast(tF("Данные из прежней папки приложения перенесены: {n} ({list})", { n: copiedAll.length, list: copiedAll.slice(0, 3).join(", ") + (copiedAll.length > 3 ? "…" : "") }), "ok");
    }
    return copiedAll;
  }

  async function anyProcRunning() {
    return Object.values(S.running || {}).some(Boolean);
  }

  async function applyDataRoot(newRoot) {
    if (!newRoot) return;
    if (await anyProcRunning()) {
      toast(t("Сначала остановите скан/регистрацию/прокси — перенос данных посреди работы невозможен"), "err");
      return;
    }
    if (newRoot === S.paths.dataDir) { toast(t("Данные уже хранятся в этой папке"), "ok"); return; }
    try {
      await ensureDir(newRoot);
      await fs().readDirectory(newRoot); // проверка, что папка доступна
    } catch (e) {
      toast(t("Папка недоступна для записи — выберите другую"), "err");
      return;
    }
    let moved = [];
    let conflicts = [];
    try {
      const r = await migrateData(S.paths.dataDir, newRoot);
      moved = r.moved;
      conflicts = r.conflicts;
    } catch (e) {
      // v2.4.6 (F14/F15): при ошибке переноса активный корень НЕ меняем —
      // «половина данных там, половина здесь» хуже явного отказа
      toast(tF("Перенос данных не выполнен: {err}. Активной осталась прежняя папка.", { err: e && e.message ? e.message : e }), "err");
      return;
    }
    S.settings.dataRoot = newRoot;
    await flushSave(); // v2.4.6 (F17): ждём ФАКТИЧЕСКУЮ запись, а не дебаунс
    await computePaths();
    await loadAccount();
    renderAccount();
    renderDataFolder().catch(() => {});
    toast(
      moved.length
        ? tF("Папка данных изменена, перенесено файлов: {n} ({list})", { n: moved.length, list: moved.slice(0, 3).join(", ") + (moved.length > 3 ? "…" : "") })
        : t("Папка данных изменена"),
      "ok"
    );
    if (conflicts.length) {
      toast(tF("Не перенесены — уже есть в новой папке: {n}", { n: conflicts.length }) + ": " + conflicts.slice(0, 3).join("; ") + (conflicts.length > 3 ? "…" : ""), "warn");
    }
  }

  async function pickDataRoot() {
    if (IS_MOCK) {
      // v2.6.0 (аудит QUAL-2): window.prompt в демо убран — блокирующий диалог
      // не имеет отношения к реальному SAF/нативному диалогу и дезинформирует.
      // Демо честно говорит, что выбор папки — только в приложении.
      toast(t("Выбор папки данных работает только в приложении"), "info");
      return;
    }
    let p = null;
    try { p = await os().showFolderDialog(t("Выберите папку для данных WARPSCOUT GUI")); } catch (e) { p = null; }
    if (!p) return;
    await applyDataRoot(String(p).replace(/[\\/]+$/, ""));
  }

  /* ───────── v2.3.0: порядок в папках — данные рядом с кэшем, без junction ───────── */
  // Данные (аккаунт + отчёты) теперь живут ВНУТРИ %APPDATA%\<имя exe>, рядом с EBWebView:
  // рантайм создаёт эту папку всегда, так что «одна папка» достигается сама, без ссылок,
  // PowerShell и объединений (v2.2.0 «Объединить» работало ненадёжно и больше не нужно).
  // Здесь только ПРИБИРАЕМ за v2.2.0:
  //   • repairUdfJunction() — если «Объединить» успели нажать и в Roaming осталась
  //     junction «<имя exe>» → снимаем ссылку, возвращаем настоящую папку, переносим данные;
  //   • migrateLegacyData() — если данные остались в старой папке %APPDATA%\WARPScoutGUI —
  //     переносим их рядом с кэшем и убираем опустевшую старую папку.

  // Является ли каталог «<имя exe>» junction-ссылкой v2.2.0. Без PowerShell: пишем
  // маркер в ссылку и ищем его в известных целях (старая папка данных / своя папка).
  // Возвращает "" (настоящая папка), "broken" (битая ссылка) или путь цели ссылки.
  async function detectUdfJunction() {
    if (!IS_WIN) return ""; // v2.5.0: junction «<имя exe>» — только Windows-история v2.2.0
    const udf = S.paths.udfPath;
    if (!udf) return "";
    const targets = [];
    if (S.paths.legacyDataDir) targets.push(S.paths.legacyDataDir);
    const custom = String(S.settings.dataRoot || "").trim();
    if (custom && targets.indexOf(custom) === -1) targets.push(custom);
    if (!targets.length) return "";
    const probe = ".wsghui-probe-" + Date.now();
    try {
      await fs().writeFile(udf + "\\" + probe, "probe");
    } catch (e) {
      // запись не прошла: либо битая ссылка, либо реальная папка без прав записи
      try { await fs().readDirectory(udf); return ""; } catch (e2) { return "broken"; }
    }
    let hit = "";
    for (const tgt of targets) {
      try {
        await fs().readFile(tgt + "\\" + probe);
        hit = tgt;
        break;
      } catch (e) { /* не эта цель */ }
    }
    try { await fs().remove(udf + "\\" + probe); } catch (e) {}
    return hit;
  }

  // Аккуратная уборка старой папки: тяжёлый кэш EBWebView удаляем фоновым процессом
  // (spawnProcess не блокирует очередь нативных вызовов — урок «30 секунд»), саму папку
  // снимаем только когда она опустеет. Трогаем ТОЛЬКО известные нам каталоги.
  function cleanupOldFolder(target) {
    if (!target || IS_MOCK || !HAS_NL || !IS_WIN) return; // v2.5.0: EBWebView-кэш — только Windows
    const t0 = String(target).replace(/[\\/]+$/, "").toLowerCase();
    if (t0 === String(S.paths.dataDir || "").toLowerCase()) return; // текущую папку не трогаем
    const known = [];
    if (S.paths.legacyDataDir) known.push(S.paths.legacyDataDir.toLowerCase());
    const custom = String(S.settings.dataRoot || "").trim().toLowerCase();
    if (custom) known.push(custom);
    if (known.indexOf(t0) === -1) return; // чужая папка (например, выбранная пользователем на другом диске) — не трогаем
    // v2.6.0 (SEC-5): пути прогнаны через cmdWinPath (метасимволы вырезаны) и
    // только потом кавычки; вход выше ограничен known-list (только НАШИ каталоги)
    const eb = cmdWinPath(target + "\\EBWebView");
    const tWin = cmdWinPath(target);
    if (!eb || !tWin) return;
    // ping — как пауза: за ~25 с приложение закроется/движок отпустит файлы кэша
    try { os().spawnProcess('cmd /c ping -n 26 127.0.0.1 > nul & rmdir /s /q "' + eb + '" & rmdir "' + tWin + '"').catch(() => {}); } catch (e) {}
  }

  // v2.2.0 могла оставить junction «<имя exe>» → старая папка данных. Разбираем:
  // читаем данные сквозь ссылку, снимаем её (cmd rmdir на ссылке трогает только ссылку),
  // создаём настоящую папку и возвращаем данные в неё — рядом с новым кэшем движка.
  async function repairUdfJunction() {
    if (!IS_WIN) return; // v2.5.0: junction-уборка v2.2.0 — только Windows
    if (IS_MOCK || !HAS_NL) return;
    const udf = S.paths.udfPath;
    if (!udf) return;
    let det = "";
    try { det = await detectUdfJunction(); } catch (e) { det = ""; }
    if (det === "") return; // настоящая папка — порядок и так в порядке
    if (det === "broken") {
      // битая ссылка: снимаем и оставляем рантайму создать настоящую папку.
      // v2.6.0 (SEC-5): нативный fs.remove ВМЕСТО shell-«cmd /c rmdir» —
      // std::filesystem снимает junction как ссылку (в цель не рекурсирует)
      try { await fs().remove(udf); } catch (e) {}
      try { await ensureDir(udf); } catch (e) {}
      return;
    }
    // v2.2.0-ссылка: сперва спасаем данные (аккаунт + отчёты) сквозь ссылку
    let accText = "";
    try { accText = await fs().readFile(udf + "\\warpscout-account.json"); } catch (e) { accText = ""; }
    const savedReports = [];
    try {
      const items = await fs().readDirectory(udf + "\\reports");
      if (Array.isArray(items)) {
        for (const it of items) {
          if (String(it.type || "").toUpperCase() === "DIRECTORY") continue;
          const name = String(it.path || "").split(/[\\/]/).pop();
          if (!name) continue;
          try { savedReports.push({ name: name, text: await fs().readFile(it.path) }); } catch (e) {}
        }
      }
    } catch (e) { /* отчётов нет */ }
    // v2.6.0 (SEC-5): нативный fs.remove ВМЕСТО shell-«cmd /c rmdir»
    try { await fs().remove(udf); } catch (e) {}
    let okDir = true;
    try { await ensureDir(udf); } catch (e) { okDir = false; }
    if (!okDir) {
      toast(t("Не удалось снять ссылку «<имя exe>» — данные доступны, папка осталась ссылкой. Закройте приложение и удалите ссылку вручную (Проводник удаляет только ссылку), затем запустите снова."), "err");
      return;
    }
    if (accText) { try { await fs().writeFile(udf + "\\warpscout-account.json", accText); } catch (e) {} }
    try {
      await ensureDir(udf + "\\reports");
      for (const r of savedReports) { try { await fs().writeFile(udf + "\\reports\\" + r.name, r.text); } catch (e) {} }
    } catch (e) {}
    cleanupOldFolder(det);
    toast(t("Ссылка «<имя exe>» разобрана: аккаунт и отчёты снова в обычной папке, рядом с кэшем движка"), "ok");
  }

  // v2.3.0: автоперенос аккаунта/отчётов из старой папки v2.1–2.2 (%APPDATA%\WARPScoutGUI)
  // в новую (рядом с EBWebView). Аккаунт переносим только валидный, отчёты — все.
  async function migrateLegacyData() {
    if (!IS_WIN) return; // v2.5.0: старая папка %APPDATA%\WARPScoutGUI — только Windows
    if (IS_MOCK || !HAS_NL) return;
    const dst = S.paths.dataDir;
    const src = S.paths.legacyDataDir;
    if (!src || src.toLowerCase() === String(dst).toLowerCase()) return;
    let haveAcc = false;
    try { await fs().readFile(dst + "\\warpscout-account.json"); haveAcc = true; } catch (e) {}
    const copied = [];
    if (!haveAcc) {
      try {
        const txt = await fs().readFile(src + "\\warpscout-account.json");
        const r = accountFromText(txt); // битый файл не тащим
        if (!r.error) {
          await fs().writeFile(dst + "\\warpscout-account.json", txt);
          copied.push("warpscout-account.json");
        }
      } catch (e) { /* аккаунта в старой папке нет */ }
    }
    try {
      const items = await fs().readDirectory(src + "\\reports");
      if (Array.isArray(items) && items.length) {
        await ensureDir(dst + "\\reports");
        for (const it of items) {
          if (String(it.type || "").toUpperCase() === "DIRECTORY") continue;
          const name = String(it.path || "").split(/[\\/]/).pop();
          if (!name) continue;
          try {
            const txt2 = await fs().readFile(it.path);
            await fs().writeFile(dst + "\\reports\\" + name, txt2);
            try { await fs().remove(it.path); } catch (e) {}
            copied.push("reports/" + name);
          } catch (e) { /* один файл не читается — переносим остальные */ }
        }
      }
    } catch (e) { /* папки отчётов нет */ }
    if (copied.length) {
      toast(tF("Данные перенесены рядом с кэшем движка ({n}): {list}", { n: copied.length, list: copied.slice(0, 3).join(", ") + (copied.length > 3 ? "…" : "") }), "ok");
      cleanupOldFolder(src); // старая папка опустеет и уберётся фоном
    }
    return copied;
  }

  async function restoreState() {
    if (!HAS_NL) return;
    try {
      const raw = await store().getData("state");
      if (!raw) return;
      const st = JSON.parse(raw);
      // v2.4.6 (F08): собственный storage тоже прогоняем через схему —
      // повреждённая запись не должна ронять следующий запуск
      if (st.scan) S.scan = sanitizeScan(st.scan);
      if (st.cfg) S.cfg = sanitizeCfg(st.cfg);
      if (st.settings && typeof st.settings === "object") {
        S.settings = Object.assign({}, S.settings, {
          wsPath: strField(st.settings.wsPath, 500),
          dataRoot: strField(st.settings.dataRoot, 500),
        });
      }
      if (Array.isArray(st.customPresets)) S.customPresets = sanitizePresets(st.customPresets);
      S.compact = !!st.compact;
      if (Array.isArray(st.history)) S.history = st.history.map(sanitizeHistoryItem).filter(Boolean).slice(0, 10);
      if (Array.isArray(st.qcHistory)) S.qcHistory = st.qcHistory.map(sanitizeQcItem).filter(Boolean).slice(0, 50);
      S.foundCmd = strField(st.foundCmd, 500);
    } catch (e) {}
  }

  function deepMerge(base, extra) {
    const out = Object.assign({}, base);
    for (const k of Object.keys(extra || {})) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue; // v2.4.6 (F08): pollution guard
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
    // v2.4.4: пейджер многостраничного QR
    $("#btnQrPrev").addEventListener("click", () => { if (S.qrPages && S.qrPage > 0) { S.qrPage--; renderQrPage(); } });
    $("#btnQrNext").addEventListener("click", () => { if (S.qrPages && S.qrPage < S.qrPages.length - 1) { S.qrPage++; renderQrPage(); } });
    $("#btnQrPng").addEventListener("click", saveQrPng);
    $("#btnQrCopy").addEventListener("click", () => { if (confExportReady()) copyText(buildConf(), t("Конфиг скопирован")); }); // v2.4.6 (F27)
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
      if (S.viewProto === "masque" || S.viewProto === "masque-h2") {
        // v2.4.6 (F19): для MASQUE нет WG/AWG .conf — честный отказ
        toast(t("MASQUE-эндпоинт нельзя упаковать в WG/AWG .conf — используйте SOCKS-прокси или CLI warpscout"), "warn");
        return;
      }
      S.cfg.endpoint = best.endpoint;
      const lp = S.lastRunParams;
      if (lp && lp.proto === "awg" && !lp.genJunk) {
        S.cfg.obf.jc = clampInt(lp.jc !== "" && lp.jc != null ? lp.jc : 6, 1, 128, 4);
        let jmin = clampInt(lp.jmin !== "" && lp.jmin != null ? lp.jmin : 10, 0, 1280, 40);
        const jmax = clampInt(lp.jmax !== "" && lp.jmax != null ? lp.jmax : 50, 0, 1280, 70);
        if (jmin > jmax) jmin = jmax;
        S.cfg.obf.jmin = jmin;
        S.cfg.obf.jmax = jmax;
      }
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
    $("#btnCopyConf").addEventListener("click", () => { if (confExportReady()) copyText(buildConf(), t("Конфиг скопирован")); }); // v2.4.6 (F27)
    $("#btnSaveConf").addEventListener("click", saveConf);

    // аккаунт
    $("#btnRegister").addEventListener("click", () => runRegister(false));
    $("#btnRegisterFresh").addEventListener("click", () => {
      if (confirm("Создать новый аккаунт WARP с нуля? Текущие ключи будут заменены.")) runRegister(true);
    });
    $("#btnRegisterStop").addEventListener("click", async () => {
      S.registerCancelRequested = true; // v2.4.6 (F32): процесс мог ещё не появиться
      await killProc(S.procIds.register);
      S.procIds.register = null;
      S.running.register = false;
      registerUi();
      appendLog($("#accLog"), "\n[GUI] Остановлено пользователем.\n");
    });
    // v2.5.4: единый хелпер с гарантированным фидбеком (было: молчаливый .catch)
    $("#btnOpenAccFolder").addEventListener("click", () => openFolderUi(S.paths.dataDir, "аккаунт и отчёты"));
    // v2.2.0: папка данных (Настройки) — v2.3.0: кнопки выбрать/открыть/по умолчанию.
    // v2.6.0 (SEC-6): на Android выбор/сброс папки данных скрыты — папка одна,
    // app-specific; на десктопе выбор остаётся (там это штатный сценарий).
    const bPick = $("#btnDataRootPick");
    if (bPick) {
      if (IS_ANDROID) bPick.hidden = true;
      else bPick.addEventListener("click", pickDataRoot);
    }
    const bReset = $("#btnDataRootReset");
    if (bReset) {
      if (IS_ANDROID) bReset.hidden = true;
      else bReset.addEventListener("click", () => applyDataRoot(S.paths.dataDirDefault || ""));
    }
    const bOpen = $("#btnDataRootOpen");
    if (bOpen) bOpen.addEventListener("click", () => openFolderUi(S.paths.dataDir, "папка данных"));
    // v2.6.0 (SEC-6): кнопка «В общую папку…» и выбор папки данных на Android
    // УДАЛЕНЫ вместе с механикой «Все файлы» (MANAGE/WRITE-разрешения больше
    // не заявлены). Публичная выгрузка — Download/WARPScoutGUI через MediaStore
    // (mirrorPublic), данные — всегда в app-specific каталоге.
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
    $("#setWsPath").addEventListener("input", () => updateWsFullPath()); // v2.4.1: полный путь виден сразу при вводе
    $("#btnCheckWs").addEventListener("click", async () => {
      const v = $("#setWsPath").value.trim();
      S.settings.wsPath = v; // v2.4.0: пусто = искать штатно; папка — тоже валидный ввод (резолвим внутри)
      persist();
      const ok = await checkWarpscout(true);
      if (ok) toast(tF("✓ warpscout v{v} — готов к работе", { v: S.wsVersion }), "ok");
      else if (S.wsFileThere) toast(t("Файл найден, но не отвечает — вероятно, антивирус. Подробности в подсказке под полем"), "err");
      else toast(t("warpscout.exe не найден — подробности в подсказке под полем пути"), "err");
    });
    // v2.4.1: «Показать в папке» — пользователь своими глазами видит, есть ли warpscout.exe
    $("#btnOpenWsFolder").addEventListener("click", openWsFolder);
    // v2.4.1: диагностика ТЕКСТОМ — вместо скриншотов, которые не читаются
    $("#btnCopyWsDiag").addEventListener("click", async () => {
      const txt = await wsDiagText();
      copyText(txt, t("Диагностика скопирована — пришлите её текстом"));
    });
    // v2.5.4: единый хелпер с гарантированным фидбеком (было: молчаливый .catch)
    $("#btnOpenAcc").addEventListener("click", () => openFolderUi(S.paths.dataDir, "файл аккаунта"));
    $("#btnOpenReports").addEventListener("click", () => openFolderUi(S.paths.reportsDir, "отчёты"));
    $("#btnResetStorage").addEventListener("click", async () => {
      if (await anyProcRunning()) {
        // v2.4.6 (F34/F38): сброс посреди активных операций запрещён
        toast(t("Сначала остановите скан/регистрацию/прокси — сброс посреди работы невозможен"), "err");
        return;
      }
      // v2.4.6 (F38): честный scope сброса — указан в подтверждении
      if (!confirm(t("Сбросить настройки скана/конфига, историю, журнал проверок и пресеты? Аккаунт и файлы в папке данных останутся."))) return;
      S.scan = Object.assign({}, DEFAULT_SCAN);
      S.cfg = defaultCfg();
      S.results = [];
      S.sortByPing = false;
      S.sortKey = "report";
      S.sortDir = 1;
      S.prevEndpoints = null;
      S.diff = null;
      S.customPresets = [];
      S.compact = false;
      S.history = []; // БАГФИКС 1.4.0: «Сбросить настройки и данные» теперь чистит и историю
      S.qcHistory = []; // v2.4.6 (F38): журнал проверок тоже сбрасываем
      S.foundCmd = ""; // v2.4.6 (F38): найденная команда тоже — иначе переживёт сброс в storage
      S.lastRunParams = null; // v2.4.6: снимок параметров тоже сбрасываем
      resetFilterSilently();
      try { await store().setData("state", "{}"); } catch (e) {}
      await flushSave(); // v2.4.6 (F17/F38): гарантируем запись пустого состояния
      syncInputsFromState();
      syncCfgInputsFromState();
      updateCmdPreview();
      renderResults();
      renderConf();
      renderCustomPresets();
      applyCompact();
      renderHistoryBtn();
      renderQcJournal(); // v2.4.6: если панель истории открыта — обновить и журнал
      toast(t("Настройки сброшены"), "ok");
    });

    // v2.4.6 (F50): сегменты — радиогруппы
    ["#protoSeg", "#i1Seg", "#cfgVerSeg", "#cfgDnsSeg"].forEach((s) => setupSegGroup($(s)));

    // горячие клавиши
    const TAB_ORDER = ["scan", "config", "account", "socks", "tools", "settings"];
    document.addEventListener("keydown", (e) => {
      // v2.4.6 (F47): под модалкой глобальные хоткеи отключены (Tab работает —
      // фон inert, фокус не выходит за пределы диалога; Escape закрывает ниже)
      if (openModalOf() && e.key !== "Escape" && e.key !== "Tab") return;
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
    if (bBatchCancel)
      bBatchCancel.addEventListener("click", () => {
        // v2.4.6 (F33): «Отмена» останавливает ОЧЕРЕДЬ и убивает текущий процесс,
        // а не только снимает выделение
        if (S.qcBatch) {
          S.qcBatch.cancelled = true;
          killProc(S.procIds.check);
          if (S.qcBatch.curResolve) {
            const r = S.qcBatch.curResolve;
            S.qcBatch.curResolve = null;
            r({ kind: "error", ping: "", loss: "", node: "" });
          }
        }
        toggleQcSelMode(false);
      });
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
    linuxPlatInit(); // v2.5.0: Linux-нормализация EN-словаря до первого applyLang
    setupTouchUi(); // v2.5.0: сенсорный режим (Android) — построить вкладки/главную до bindEvents
    if (IS_ANDROID) { const bu = $("#btnAccUnblock"); if (bu) bu.hidden = true; } // v2.5.0: бинарь уже исполняемый (nativeLibraryDir), chmod-кнопка не нужна
    // v2.5.4 (Android): путь до warpscout (libwarpscout.so в nativeLibraryDir)
    // и кнопки «показать его папку» пользователю недоступны и не нужны — убраны:
    // всё поле пути в Настройках, «Папка warpscout.exe» и Windows-подсказка про -1
    if (IS_ANDROID) {
      const fWs = document.getElementById("fieldWsPath"); if (fWs) fWs.hidden = true;
      const bExe = document.getElementById("btnAccOpenExeDir"); if (bExe) bExe.hidden = true;
      const hWin = document.getElementById("accLogHintWin"); if (hWin) hWin.hidden = true;
    }
    $("#modeBadge").hidden = !IS_MOCK;
    bindProcEvents();

    await restoreState();
    ensureLangSwitch();                       // v1.6.0: RU/EN-переключатель в сайдбаре
    applyLang(S.settings.lang || "ru", { skipPersist: true }); // v1.6.0: применить язык
    applyTheme(S.settings.theme || "dark");
    applyCompact();
    renderCustomPresets();
    await computePaths();
    // v2.3.0: разбираем junction v2.2.0 (если «Объединить» нажимали) ДО чтения аккаунта
    await repairUdfJunction().catch(() => {});
    // v2.5.8 (Android): автодогон аккаунта/отчётов из прежних папок в активную —
    // ДО loadAccount, чтобы «аккаунт: есть» появился уже на первом запуске после обновления
    await migrateAndroidLegacyData().catch(() => {});
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
    migrateLegacyData().catch(() => {}); // v2.3.0: перенос аккаунта/отчётов из старой папки v2.1–2.2
    adoptAccountFromPlaces().catch(() => {}); // v2.1.0: автоподхват готового аккаунта
    renderDataFolder().catch(() => {}); // v2.3.0: статус «всё в одной папке»
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
  /* v2.5.9 (аудит ARCH-2): версия в сайдбаре — из единого источника
     NL_APPVERSION, а не статичный текст разметки (там осталась 2.5.3). */
  const syncSidebarVer = () => {
    const el = document.querySelector(".sidebar__ver");
    if (el && window.NL_APPVERSION)
      el.textContent = el.textContent.replace(/v2\.\d+\.\d+/, "v" + window.NL_APPVERSION);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncSidebarVer);
  else syncSidebarVer();

  // v2.4.6: + валидаторы/санитайзеры (аудит-тесты и диагностика)
  window.__WSGUI = { S, runScan: () => runScan().catch((e) => console.error("runScan:", e)), buildScanCmd, buildScanArgs, buildConf, parseReport, switchTab, parseConfText, applyImportedConf, applyImportedState, applyImportedPresets, applyFoundCmd, parseEndpoint, splitEpPort, safeVal, enumOf, clampInt, sanitizeScan, sanitizeCfg, sanitizeHistoryItem, sanitizeQcItem, sanitizePresets, csvSafe, isWgKey, validateAccountJson, normWinPath, isSameWinPath, isWinPathInside, migrateData, migrateAndroidLegacyData, confExportReady, defaultCfg, flushSave, histBestPing, openCompare, renderCmpBody, toggleCmp, fillCmpSelectors, exportTrendCsv, importAccount, registerHintFor, renderDataFolder, detectUdfJunction, repairUdfJunction, migrateLegacyData, applyDataRoot, exeDirName, exeFileName, resolveWarpscoutPath, wsCandidates, wsFileExists, wsDiagText, openWsFolder, updateWsFullPath, qrPagesFor, qrB64url, showConfQr, renderQrPage };

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
