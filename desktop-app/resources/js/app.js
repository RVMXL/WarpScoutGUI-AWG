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
    el.textContent = msg;
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
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) + ", " +
      d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
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
      toast(okMsg || "Скопировано", "ok");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast(okMsg || "Скопировано", "ok"); } catch (e2) { toast("Не удалось скопировать", "err"); }
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
    selected: "",
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
    paths: { dataDir: "", accPath: "", reportsDir: "", wsPath: "" },
    wsVersion: "",
    account: null,
    running: { scan: false, register: false, fj: false, fs: false, socks: false },
    procIds: {},
    demoScanned: false,
    prevEndpoints: null,  // Set эндпоинтов прошлого скана (для сравнения)
    diff: null,           // {newList:[], newCount, gone:[]} — diff с прошлым сканом
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
  function registerProc(id, handler) { procRegistry[id] = handler; }
  function unregisterProc(id) { delete procRegistry[id]; }

  function bindProcEvents() {
    window.Neutralino.events.on("spawnedProcess", (evt) => {
      const d = evt.detail || evt;
      const h = procRegistry[d.id];
      if (h) h(d);
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
            if (h) h({ id: Number(id), type: "exit", data: -1 });
          }
        }
      } catch (e) { /* рантайм недоступен — не страшно */ }
    }, 5000);
  }

  async function ensureDir(dir) {
    if (IS_MOCK || !dir) return;
    try { await fs().createDirectory(dir, { recursive: true }); } catch (e) { /* уже есть */ }
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

  function renderResults() {
    const head = $("#resultsHead");
    const body = $("#resultsBody");
    const withP = S.viewMeta.withP;
    const withSpeed = S.viewMeta.withSpeed;

    const rows = S.results.slice();
    if (S.sortByPing) {
      rows.sort((a, b) => (a.torn - b.torn) || (pingMs(a.tunPing || a.ping) - pingMs(b.tunPing || b.ping)));
    } // иначе — порядок отчёта warpscout: потери → пинг

    // лучший рабочий эндпоинт (мин. TUN PING, иначе PING)
    let bestEp = "";
    const workingRows = rows.filter((r) => !r.torn);
    if (workingRows.length) {
      let bestV = Infinity;
      workingRows.forEach((r) => {
        const v = pingMs(r.tunPing || r.ping);
        if (v < bestV) { bestV = v; bestEp = r.endpoint; }
      });
    }

    renderResStats();
    const cols = ["Эндпоинт", S.sortByPing ? "TUN PING ↑" : "PING"];
    if (withP) cols.push("LOSS");
    if (withSpeed) cols.push("SPEED");
    cols.push("SEEN AS", "NODE", "Локация узла", "");

    head.innerHTML = "<tr>" + cols.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr>";

    if (!rows.length) {
      body.innerHTML = "";
      $("#resultsEmpty").classList.remove("hidden");
      $("#resCount").hidden = true;
      return;
    }
    $("#resultsEmpty").classList.add("hidden");
    $("#resCount").hidden = false;
    $("#resCount").textContent = String(rows.filter((r) => !r.torn).length);

    body.innerHTML = rows
      .map((r, idx) => {
        const ep = r.endpoint;
        const isNew = !!(S.diff && S.diff.newList && S.diff.newList.indexOf(ep) !== -1);
        const cells = [
          "<td>" +
            (ep === bestEp ? '<span class="best-star" title="Лучший пинг">★</span>' : "") +
            esc(ep) +
            (isNew ? '<span class="new-badge" title="Появился в этом скане">new</span>' : "") +
          "</td>",
          "<td>" + pingCell(S.sortByPing ? (r.tunPing || r.ping) : r.ping) + "</td>",
          withP ? "<td>" + pingCell(r.tunPing) + "</td><td>" + lossCell(r.loss) + "</td>" : "",
          withSpeed ? "<td>" + esc(r.speed || "—") + "</td>" : "",
          '<td class="seen">' + flagEmoji(r.seenAs) + " " + esc(r.seenAs || "—") + "</td>",
          "<td>" + esc(r.node || "—") + "</td>",
          "<td>" + esc(r.loc || "—") + "</td>",
          '<td class="row-actions">' +
            '<button type="button" data-act="copy" title="Скопировать ip:порт">⧉</button>' +
            '<button type="button" data-act="cfg" title="Использовать в конфиге">⚙</button>' +
            '<button type="button" data-act="socks" title="Проверить через SOCKS5">🧦</button>' +
          "</td>",
        ];
        const sel = ep === S.selected ? " is-selected" : "";
        const torn = r.torn ? " is-torn" : "";
        const best = ep === bestEp ? " is-best" : "";
        const nw = isNew ? " is-new" : "";
        return '<tr data-ep="' + esc(ep) + '" class="' + (sel + torn + best + nw).trim() + '">' + cells.join("") + "</tr>";
      })
      .join("");

    $$("#resultsBody tr").forEach((tr) => {
      tr.addEventListener("click", () => {
        S.selected = tr.getAttribute("data-ep");
        renderResults();
      });
      $$(".row-actions button", tr).forEach((b) =>
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          const ep = tr.getAttribute("data-ep");
          const act = b.getAttribute("data-act");
          if (act === "copy") { copyText(ep, "Эндпоинт скопирован"); return; }
          if (act === "cfg") {
            S.cfg.endpoint = ep;
            syncCfgInputsFromState();
            switchTab("config");
            toast("Эндпоинт подставлен в конфиг: " + ep, "ok");
            return;
          }
          if (act === "socks") {
            $("#socksEndpoint").value = ep;
            $("#socksProto").value = S.viewProto || "awg";
            switchTab("socks");
            toast("Эндпоинт готов к проверке во вкладке SOCKS", "ok");
          }
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
      '<span class="stat-chip">📡 всего <b>' + S.results.length + "</b></span>",
      '<span class="stat-chip stat-chip--ok">✅ рабочих <b>' + working.length + "</b></span>",
    ];
    if (torn) chips.push('<span class="stat-chip stat-chip--err">✂ разорвано <b>' + torn + "</b></span>");
    if (best) chips.push('<span class="stat-chip stat-chip--best" title="Минимальный пинг среди рабочих">⚡ лучший <b>' + best + " ms</b></span>");
    if (median) chips.push('<span class="stat-chip" title="Медианный пинг рабочих">⚖ медиана <b>' + median + " ms</b></span>");
    if (nodeNames.length) {
      chips.push('<span class="stat-chip" title="Узлы: ' + esc(nodeNames.join(", ")) + '">🌍 узлов <b>' + nodeNames.length + "</b></span>");
    }
    if (S.diff) {
      if (S.diff.newCount) {
        chips.push('<span class="stat-chip stat-chip--new" title="Эндпоинтов, которых не было в прошлом скане">➕ новых <b>' + S.diff.newCount + "</b></span>");
      }
      if (S.diff.gone.length) {
        chips.push(
          '<button type="button" class="stat-chip stat-chip--gone" id="chipGone" title="' +
            esc(S.diff.gone.join(", ")) +
            '">➖ пропали <b>' + S.diff.gone.length + "</b></button>"
        );
      }
    }
    el.innerHTML = chips.join("");
    el.classList.remove("hidden");
    const goneBtn = $("#chipGone");
    if (goneBtn) {
      goneBtn.addEventListener("click", () => {
        toast("Пропали с прошлого скана (" + S.diff.gone.length + "): " + S.diff.gone.join(", "), "warn");
      });
    }
  }

  /* ───────── прогон скана ───────── */
  function setScanRunning(run) {
    S.running.scan = run;
    $("#btnRunScan").hidden = run;
    $("#btnStopScan").hidden = !run;
    $("#btnRunScanLabel").textContent = run ? "Сканирую…" : "Начать скан";
    $("#scanProgress").hidden = !run;
    if (!run) { $("#scanBarFill").style.width = "0%"; }
  }

  function setPhase(label, frac) {
    $("#scanPhase").textContent = label;
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
      toast("Сначала создайте аккаунт WARP — вкладка «Аккаунт»", "err");
      switchTab("account");
      return;
    }
    const withP = !!s.tunPing;
    const withSpeed = !!(s.speed || s.bestBySpeed);
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    S.paths.reportPath = S.paths.reportsDir + "/warpscout-report-" + ts + ".txt";
    await ensureDir(S.paths.reportsDir);

    const cmd = buildScanCmd(s);
    $("#scanLog").textContent = "";
    switchSubtab("log");
    setPhase("Запуск warpscout…", 2);
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
          buf += data;
          // прогресс
          const mPhase1 = /Phase 1: probing reachable WARP ports: (\d+)\.\.\./.exec(buf);
          const mPhase2 = /Phase 2: verifying tunnels \(proto=(\w+)\): (\d+)\.\.\./.exec(buf);
          const mSpeed = /Speedtest|speed test|Measuring speed/i.test(buf);
          const mStep = /(\d+)\/(\d+)\s*$/.exec(buf.trim());
          if (mPhase1) setPhase("Фаза 1: ищем проходимые порты", null);
          if (mPhase2) setPhase("Фаза 2: проверяем туннели", null);
          if (mSpeed && !mStep) setPhase("Замер скорости (медленно, ждите)…", null);
          if (mStep) {
            const frac = (+mStep[1] / Math.max(1, +mStep[2])) * 100;
            setPhase(mPhase2 ? "Фаза 2: проверяем туннели" : "Фаза 1: ищем проходимые порты", frac);
          }
        } else if (d.type === "exit") {
          unregisterProc(proc.id);
          setScanRunning(false);
          setPhase(S.scanStopped ? "Остановлено" : "Читаем отчёт…", 100);
          if (!S.scanStopped) finishScan(withP, withSpeed, exitCodeOf(d.data));
          else toast("Скан остановлен", "ok");
        }
      });
    } catch (e) {
      S.running.scan = false;
      setScanRunning(false);
      toast("Не удалось запустить warpscout: " + (e && e.message ? e.message : e), "err");
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
      appendLog($("#scanLog"), "\n[GUI] Отчёт не найден — смотрим конец лога.\n");
      if (exitCode !== 0) {
        toast("warpscout завершился с ошибкой (код " + exitCode + "). Смотрите лог — часто не хватает аккаунта или фильтры слишком строгие.", "err");
        switchSubtab("log");
      } else {
        toast("Скан завершён, но отчёт пуст. Смотрите лог.", "err");
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
    renderResults();
    fillEndpointSelect();
    switchSubtab("results");
    const working = S.results.filter((r) => !r.torn).length;
    const torn = S.results.length - working;
    if (working > 0) {
      toast("Скан завершён: рабочих эндпоинтов — " + working + (torn ? ", разорванных — " + torn : ""), "ok");
    } else {
      toast("Рабочих эндпоинтов не найдено" + (torn ? " (" + torn + " разорвано)" : "") + ". Попробуйте «Жёсткая сеть» или find-junk.", "err");
    }
  }

  async function stopScan() {
    S.scanStopped = true;
    await killProc(S.procIds.scan);
    S.procIds.scan = null;
    setScanRunning(false);
    toast("Скан остановлен", "ok");
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
    kv("PrivateKey", acc ? acc.private_key : "<запустите регистрацию на вкладке «Аккаунт»>");
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
    $("#cfgVerHint").textContent = VER_HINTS[ver];
    const keys = $("#cfgKeysState");
    if (S.account) { keys.textContent = "аккаунт загружен"; keys.className = "badge badge--accent"; }
    else { keys.textContent = "нет аккаунта"; keys.className = "badge"; }
  }

  function fillEndpointSelect() {
    const sel = $("#cfgEndpointSel");
    const cur = sel.value;
    const options = ['<option value="">— выберите из результатов скана —</option>'];
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
    persist();
  }

  function renderHistoryBtn() {
    const btn = $("#btnHistory");
    if (!btn) return;
    btn.textContent = "🕘 История" + (S.history.length ? " (" + S.history.length + ")" : "");
  }

  function toggleKbd(open) {
    const m = $("#kbdModal");
    if (m) m.classList.toggle("hidden", !open);
  }

  function toggleHistory(force) {
    S.historyOpen = force != null ? force : !S.historyOpen;
    const panel = $("#historyPanel");
    panel.classList.toggle("hidden", !S.historyOpen);
    if (!S.historyOpen) return;
    if (!S.history.length) {
      panel.innerHTML = '<div class="history__empty">История пуста — выполните первый скан.</div>';
      return;
    }
    panel.innerHTML =
      '<div class="history__head">Последние сканы (хранятся локально, до 10)</div>' +
      S.history
        .map(
          (h, i) =>
            '<button type="button" class="history__item" data-hi="' + i + '">' +
              "<span class=\"history__ts\">" + fmtTime(h.ts) + "</span>" +
              "<span class=\"history__proto\">" + esc(h.proto.toUpperCase()) + "</span>" +
              "<span class=\"history__label\">" + esc(h.label) + "</span>" +
              '<span class="history__cnt ' + (h.working ? "is-ok" : "is-err") + '">' +
                h.working + " рабочих" + (h.torn ? " / " + h.torn + " разорвано" : "") +
              "</span>" +
            "</button>"
        )
        .join("");
    $$(".history__item", panel).forEach((b) =>
      b.addEventListener("click", () => loadHistory(+b.getAttribute("data-hi")))
    );
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
    const firstOk = S.results.find((r) => !r.torn);
    S.selected = firstOk ? firstOk.endpoint : "";
    renderResults();
    fillEndpointSelect();
    switchSubtab("results");
    toggleHistory(false);
    toast("Загружен скан от " + fmtTime(h.ts) + " — " + h.working + " рабочих", "ok");
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
      .showSaveDialog("Сохранить результаты CSV", { defaultPath: name })
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
      path = await os().showSaveDialog("Сохранить конфиг", { defaultPath: name });
    } catch (e) { path = null; }
    if (!path) { if (IS_MOCK) toast("Сохранение работает только в приложении Windows", "err"); return; }
    try {
      await fs().writeFile(path, buildConf());
      toast("Конфиг сохранён: " + path, "ok");
    } catch (e) {
      toast("Ошибка записи: " + (e && e.message ? e.message : e), "err");
    }
  }

  async function importI1() {
    let path;
    try {
      path = await os().showOpenDialog("Выберите .conf с I1", { multiSelections: false });
    } catch (e) { path = null; }
    let picked = null;
    if (Array.isArray(path) && path[0]) picked = path[0];
    else if (typeof path === "string" && path) picked = path;
    if (!picked) {
      if (IS_MOCK) toast("Импорт работает только в приложении", "err");
      return;
    }
    try {
      const text = await fs().readFile(picked);
      const m = /^\s*I1\s*=\s*(.+)$/m.exec(text);
      if (m) {
        $("#cfgI1").value = m[1].trim();
        syncCfgFromInputs();
        toast("I1 импортирован", "ok");
      } else {
        toast("В файле нет строки I1 — это не AWG-конфиг?", "err");
      }
    } catch (e) {
      toast("Не удалось прочитать файл", "err");
    }
  }

  /* ───────── аккаунт ───────── */
  async function loadAccount() {
    if (IS_MOCK) {
      S.account = window.NeutralinoMock ? window.NeutralinoMock.account : null;
      return S.account;
    }
    try {
      const text = await fs().readFile(S.paths.accPath);
      S.account = JSON.parse(text);
    } catch (e) {
      S.account = null;
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
    set("#accFileState", has ? "найден" : "не найден — нужен для скана", has ? "is-ok" : "is-err");
    $("#accFilePath").textContent = S.paths.accPath || "—";
    set("#accMainState", has ? "✓ " + (S.account.ipv4 || "ok") : "—", has ? "is-ok" : "is-warn");
    set("#accMasqueState", has && S.account.masque ? "✓ есть" : "нет (нужен только для masque)", has && S.account.masque ? "is-ok" : "is-warn");
    set("#accOuterState", has && S.account.outer ? "✓ есть" : "нет (нужен только для -through)", has && S.account.outer ? "is-ok" : "is-warn");
    renderAccountStatusline();
  }

  function renderAccountStatusline() {
    const el = $("#stAcc");
    if (S.account) { el.textContent = "● аккаунт: есть"; el.className = "statusline__row is-ok"; }
    else { el.textContent = "● аккаунт: нет — вкладка «Аккаунт»"; el.className = "statusline__row is-err"; }
  }

  async function runRegister(fresh) {
    if (S.running.register) return;
    S.running.register = true;
    registerUi();
    const log = $("#accLog");
    log.textContent = "";
    appendLog(log, "$ warpscout register" + (fresh ? " -fresh" : "") + "\n");
    if (!HAS_NL || IS_MOCK) {
      appendLog(log, "[демо] Используется демо-аккаунт. В приложении здесь выполняется настоящая регистрация.\n");
      S.account = await loadAccount();
      renderAccount();
      S.running.register = false;
      registerUi();
      toast("Демо: аккаунт уже есть", "ok");
      return;
    }
    const acc = S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "";
    const cmd = quoteExe() + " register" + (fresh ? " -fresh" : "") + acc;
    try {
      const proc = await os().execCommand(cmd, { stream: true });
      S.procIds.register = proc.id;
      registerProc(proc.id, (d) => {
        if (d.type === "stdout" || d.type === "stderr") appendLog(log, typeof d.data === "string" ? d.data : "");
        else if (d.type === "exit") {
          unregisterProc(proc.id);
          S.running.register = false;
          registerUi();
          const ok = exitCodeOf(d.data) === 0;
          appendLog(log, ok ? "\n[GUI] Готово.\n" : "\n[GUI] Регистрация завершилась с ошибкой (код " + exitCodeOf(d.data) + ").\n");
          if (ok) { loadAccount().then(renderAccount); toast("Аккаунт готов", "ok"); }
          else toast("Регистрация не удалась — смотрите лог", "err");
        }
      });
    } catch (e) {
      S.running.register = false;
      registerUi();
      appendLog(log, "\n[GUI] Не удалось запустить warpscout: " + (e && e.message ? e.message : e) + "\n");
      toast("Ошибка запуска warpscout", "err");
    }
  }

  function registerUi() {
    $("#btnRegister").hidden = S.running.register;
    $("#btnRegisterFresh").hidden = S.running.register;
    $("#btnRegisterStop").hidden = !S.running.register;
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
    if (!/^\[?[0-9a-zA-Z.:]+\]?:\d{1,5}$/.test(ep)) { toast("Укажите эндпоинт в формате ip:порт (например 188.114.98.58:2408)", "err"); S.running.socks = false; socksUi(); return; }
    const port = $("#socksPort").value || "1080";
    const proto = $("#socksProto").value;
    const acc = S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "";
    const cmd = quoteExe() + " socks -e " + ep + " -p " + proto + " -P " + port + acc;
    $("#socksLog").textContent = "";
    let proc;
    try { proc = await os().spawnProcess(cmd); } catch (e) { S.running.socks = false; socksUi(); toast("Не удалось запустить", "err"); return; }
    if (proc && proc.id != null) registerProc(proc.id, () => {});
    S.procIds.socks = proc.id;
    registerProc(proc.id, (d) => {
      if (d.type === "stdout" || d.type === "stderr") appendLog($("#socksLog"), typeof d.data === "string" ? d.data : "");
      else if (d.type === "exit") {
        unregisterProc(proc.id);
        S.running.socks = false;
        socksUi();
        appendLog($("#socksLog"), "\n[GUI] Прокси остановлен.\n");
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
            appendLog(log, "\n[GUI] Нажмите «Применить к скану».\n");
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
      toast("Не удалось запустить", "err");
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
    if (!cmd) { toast("Сначала найдите команду", "err"); return; }
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
    toast("Параметры применены к скану", "ok");
  }

  /* ───────── вкладки/интерфейс ───────── */
  function switchTab(name) {
    $$(".nav__item").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-tab") === name));
    $$(".tab").forEach((t) => t.classList.toggle("is-active", t.id === "tab-" + name));
    if (name === "config") { fillEndpointSelect(); renderConf(); }
    if (name === "account") renderAccount();
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
        .setData("state", JSON.stringify({ scan: S.scan, cfg: S.cfg, settings: S.settings, foundCmd: S.foundCmd || "", history: S.history.slice(0, 10) }))
        .catch(() => {});
    } catch (e) {}
  }, 400);

  window.addEventListener("beforeunload", () => {
    if (!HAS_NL) return;
    try { store().setData("state", JSON.stringify({ scan: S.scan, cfg: S.cfg, settings: S.settings, foundCmd: S.foundCmd || "", history: S.history.slice(0, 10) })); } catch (e) {}
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
        el.textContent = "● warpscout v" + out + " — готов";
        el.className = "statusline__row is-ok";
        $("#stWs").title = S.paths.wsPath;
        $("#setWsVerHint").textContent = "Найден warpscout v" + out + " · " + S.paths.wsPath;
        return true;
      }
    } catch (e) { /* падение ниже */ }
    S.wsVersion = "";
    el.textContent = "● warpscout: не найден — укажите путь в «Настройках»";
    el.className = "statusline__row is-err";
    $("#setWsVerHint").textContent = "warpscout не найден. Скачайте warpscout.exe и укажите путь.";
    return false;
  }

  async function browseWsPath() {
    let p;
    try {
      p = await os().showOpenDialog("Выберите warpscout.exe", { multiSelections: false });
    } catch (e) { p = null; }
    let picked = null;
    if (Array.isArray(p) && p[0]) picked = p[0];
    else if (typeof p === "string" && p) picked = p;
    if (IS_MOCK && !picked) { toast("Выбор файла работает только в приложении", "err"); return; }
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
      S.paths.dataDir = "C:\\Users\\Demo\\AppData\\Local\\WARPScoutGUI";
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
      if (Array.isArray(st.history)) S.history = st.history.slice(0, 10);
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
      $("#presetHint").innerHTML = PRESETS.default.hint;
      updateCmdPreview();
      persist();
    });

    // протокол
    $$("#protoSeg .seg__btn").forEach((b) =>
      b.addEventListener("click", () => {
        S.scan.proto = b.getAttribute("data-proto");
        const hints = {
          wg: "Обычный WireGuard — работает там, где трафик не фильтруется.",
          awg: "Обфусцированный WireGuard — проходит там, где обычный WG фильтруется.",
          masque: "CONNECT-IP поверх QUIC, второй транспорт Cloudflare. Узел один на всю сеть.",
          "masque-h2": "MASQUE поверх TCP — те же проверки, но транспорт HTTP/2.",
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
    $("#btnCopyCmd").addEventListener("click", () => copyText(buildScanCmd(S.scan), "Команда скопирована"));
    $("#btnSortPing").addEventListener("click", () => { S.sortByPing = !S.sortByPing; renderResults(); });
    $("#btnHistory").addEventListener("click", () => toggleHistory());
    $("#btnExportCsv").addEventListener("click", exportCsv);
    $("#btnToConfig").addEventListener("click", () => {
      const best = S.results.find((r) => !r.torn);
      if (!best) { toast("Сначала выполните скан", "err"); return; }
      S.cfg.endpoint = best.endpoint;
      syncCfgInputsFromState();
      switchTab("config");
      toast("Лучший эндпоинт из скана: " + best.endpoint, "ok");
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
        info.textContent = "Узел " + r.node + " · " + r.loc + " · пинг " + (r.tunPing || r.ping) + (r.loss ? " · потери " + r.loss : "");
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
      toast("Параметры обфускации восстановлены из примера", "ok");
    });
    $("#btnClearI1").addEventListener("click", () => { $("#cfgI1").value = ""; syncCfgFromInputs(); renderConf(); });
    $("#btnImportI1").addEventListener("click", importI1);
    $("#btnCopyConf").addEventListener("click", () => copyText(buildConf(), "Конфиг скопирован"));
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
      if (IS_MOCK) { toast("Только в приложении Windows", "err"); return; }
      os().open(S.paths.dataDir).catch(() => toast("Не удалось открыть папку", "err"));
    });

    // socks
    $("#btnSocksRun").addEventListener("click", socksToggle);
    $("#btnSocksStop").addEventListener("click", socksToggle);
    $("#btnSocksBest").addEventListener("click", () => {
      const best = S.results.find((r) => !r.torn);
      if (!best) { toast("Нет результатов скана", "err"); return; }
      $("#socksEndpoint").value = best.endpoint;
      $("#socksProto").value = S.scan.proto;
      toast("Взят лучший эндпоинт: " + best.endpoint, "ok");
    });
    $("#btnCopySocks").addEventListener("click", () => copyText($("#socksAddr").textContent, "Адрес прокси скопирован"));

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
      if (IS_MOCK) { toast("Только в приложении Windows", "err"); return; }
      os().open(S.paths.dataDir).catch(() => {});
    });
    $("#btnOpenReports").addEventListener("click", () => {
      if (IS_MOCK) { toast("Только в приложении Windows", "err"); return; }
      os().open(S.paths.reportsDir).catch(() => {});
    });
    $("#btnResetStorage").addEventListener("click", async () => {
      if (!confirm("Сбросить все настройки и данные приложения?")) return;
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
      S.prevEndpoints = null;
      S.diff = null;
      try { await store().setData("state", "{}"); } catch (e) {}
      syncInputsFromState();
      syncCfgInputsFromState();
      updateCmdPreview();
      renderResults();
      renderConf();
      toast("Настройки сброшены", "ok");
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
      if (mod && (e.key === "s" || e.key === "S" || e.key === "ы" || e.key === "Ы")) {
        const active = $(".nav__item.is-active");
        if (active && active.getAttribute("data-tab") === "config") {
          e.preventDefault();
          saveConf();
        }
        return;
      }
      if (e.key === "Escape") {
        const modal = $("#kbdModal");
        if (modal && !modal.classList.contains("hidden")) { toggleKbd(false); return; }
        if (S.historyOpen) { toggleHistory(false); return; }
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
    await computePaths();
    syncInputsFromState();
    syncCfgInputsFromState();
    $("#presetHint").innerHTML = PRESETS.default.hint;
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
    }
    renderHistoryBtn();
    await loadAccount();
    renderAccount();
    renderConf();
    if (IS_MOCK) {
      $("#stWs").textContent = "● warpscout v0.16.0 — готов (демо)";
      $("#stWs").className = "statusline__row is-ok";
    } else {
      checkWarpscout();
    }
    renderAccountStatusline();
  }

  // отладочный хук (безвредно): помогает диагностике через консоль
  window.__WSGUI = { S, runScan: () => runScan().catch((e) => console.error("runScan:", e)), buildScanCmd, buildConf, parseReport, switchTab };

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
