/* ═══ WSG · 02-state — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 206–322.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

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

