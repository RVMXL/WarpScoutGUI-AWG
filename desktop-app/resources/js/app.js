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
    sortDesc: false,
    selected: "",
    cfg: {
      ver: "awg31",
      dns: "cloudflare",
      dnsCustom: "",
      endpoint: "",
      mtu: 1280,
      keepalive: 25,
      allowed: "both",
      allowedCustom: "",
      tableOff: false,
      obf: {
        jc: 4, jmin: 40, jmax: 70,
        s1: 0, s2: 0, s3: 0, s4: 0,
        h1: "1", h2: "2", h3: "3", h4: "4",
        i1: "",
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

  const procRegistry = {};
  function registerProc(id, handler) { procRegistry[id] = handler; }
  function unregisterProc(id) { delete procRegistry[id]; }

  function bindProcEvents() {
    window.Neutralino.events.on("spawnedProcess", (evt) => {
      const d = evt.detail || evt;
      const h = procRegistry[d.id];
      if (h) h(d);
    });
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
      if (s.pingTarget && s.pingTarget.trim()) a.push("-ping-target " + s.pingTarget.trim());
      if (s.tunPingCount && +s.tunPingCount !== 10) a.push("-tun-ping-count " + (+s.tunPingCount));
    }
    if (s.full) a.push("-f");
    else if (s.sample && +s.sample !== 5) a.push("-n " + (+s.sample));
    if (s.port !== "" && s.port != null) a.push("-port " + (+s.port));
    if (s.jt && +s.jt !== 10) a.push("-jt " + (+s.jt));
    if (s.timeout && +s.timeout !== 2) a.push("-t " + (+s.timeout));
    if (s.ipv6) a.push("-6");
    if (s.target && s.target.trim()) a.push("-target " + s.target.trim());
    if (s.node && s.node.trim()) a.push("-node " + s.node.trim());
    if (s.country && s.country.trim()) a.push("-country " + s.country.trim());
    if (s.exclNode && s.exclNode.trim()) a.push("-exclude-node " + s.exclNode.trim());
    if (s.exclCountry && s.exclCountry.trim()) a.push("-exclude-country " + s.exclCountry.trim());
    if (s.through && s.through.trim()) {
      a.push("-through " + s.through.trim());
      if (s.innerProto) a.push("-inner-proto " + s.innerProto);
    }
    if (s.proto === "awg") {
      if (s.genI1) a.push("-gen-i1 " + s.genI1);
      if (s.i1Sni && s.i1Sni.trim()) a.push("-i1-sni " + s.i1Sni.trim());
      if (s.genJunk) a.push("-gen-junk");
      else {
        if (s.jc !== "" && +s.jc !== 6) a.push("-jc " + (+s.jc));
        if (s.jmin !== "" && +s.jmin !== 10) a.push("-jmin " + (+s.jmin));
        if (s.jmax !== "" && +s.jmax !== 50) a.push("-jmax " + (+s.jmax));
      }
    }
    if (s.proto === "masque" || s.proto === "masque-h2") {
      if (s.masqueSni && s.masqueSni.trim()) a.push("-masque-sni " + s.masqueSni.trim());
      if (s.masqueAttempts && +s.masqueAttempts !== 3) a.push("-masque-attempts " + (+s.masqueAttempts));
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

  function quoteExe() {
    const p = S.paths.wsPath || "warpscout.exe";
    return '"' + p + '"';
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
  function parseReport(text, withP, withSpeed) {
    const lines = text.split(/\r?\n/);
    const results = [];
    let zone = "head";
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (/^#\s+\d+ torn down/.test(line)) { zone = "torn"; continue; }
      if (/^#/.test(line)) { if (zone === "rows") zone = "after"; continue; }
      if (!line.trim()) { if (zone === "rows") zone = "mid"; continue; }
      if (/^ENDPOINT\s/.test(line) && zone !== "torn" && zone !== "nodebest") {
        zone = "rows";
        continue;
      }
      if (/^NODE\s+ENDPOINT/.test(line)) { zone = "nodebest"; continue; }
      if (zone === "rows" || zone === "torn" || zone === "mid") {
        if (/^\s/.test(raw) === false && zone === "mid") { zone = "after"; continue; }
        const tokens = line.split(/\s{2,}/).map((t) => t.trim()).filter((t) => t.length);
        const row = parseRowTokens(tokens, withP, withSpeed);
        if (row) {
          row.torn = zone === "torn" || zone === "mid";
          results.push(row);
        }
      }
    }
    return results;
  }

  function parseRowTokens(tokens, withP, withSpeed) {
    // ожидаемо: [endpoint, ping, (tunPing, loss), (speed), seenAs, node, location]
    if (tokens.length < 4) return null;
    const row = { endpoint: tokens[0], ping: "", tunPing: "", loss: "", speed: "", seenAs: "", node: "", loc: "" };
    let i = 1;
    row.ping = tokens[i++] || "";
    if (withP) { row.tunPing = tokens[i++] || ""; row.loss = tokens[i++] || ""; }
    if (withSpeed) row.speed = tokens[i++] || "";
    row.seenAs = tokens[i++] || "";
    row.node = tokens[i++] || "";
    row.loc = tokens.slice(i).join(" ") || "";
    if (!/:\d+$/.test(row.endpoint)) return null;
    return row;
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
    const withP = S.scan.tunPing;
    const withSpeed = S.scan.speed || S.scan.bestBySpeed;

    let rows = S.results.slice();
    if (!S.sortDesc) {
      rows.sort((a, b) => (a.torn - b.torn) || (pingMs(a.ping || (a.tunPing && a.tunPing)) - pingMs(b.ping || (b.tunPing && b.tunPing))));
    } else {
      rows.sort((a, b) => (a.torn - b.torn) || (pingMs(a.tunPing || a.ping) - pingMs(b.tunPing || b.ping)));
    }

    const cols = ["Эндпоинт", S.sortDesc ? "TUN PING" : "PING"];
    if (withP) cols.push("LOSS");
    if (withSpeed) cols.push("SPEED");
    cols.push("SEEN AS", "NODE", "Локация узла");

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
        const cells = [
          "<td>" + esc(r.endpoint) + "</td>",
          "<td>" + pingCell(S.sortDesc ? (r.tunPing || r.ping) : r.ping) + "</td>",
          withP ? "<td>" + pingCell(r.tunPing) + "</td><td>" + lossCell(r.loss) + "</td>" : "",
          withSpeed ? "<td>" + esc(r.speed || "—") + "</td>" : "",
          "<td>" + esc(r.seenAs || "—") + "</td>",
          "<td>" + esc(r.node || "—") + "</td>",
          "<td>" + esc(r.loc || "—") + "</td>",
        ];
        const sel = r.endpoint === S.selected ? " is-selected" : "";
        const torn = r.torn ? " is-torn" : "";
        return '<tr data-ep="' + esc(r.endpoint) + '" class="' + sel.trim() + torn + '">' + cells.join("") + "</tr>";
      })
      .join("");

    $$("#resultsBody tr").forEach((tr) =>
      tr.addEventListener("click", () => {
        S.selected = tr.getAttribute("data-ep");
        renderResults();
      })
    );
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
    const s = S.scan;
    if ((s.proto === "masque" || s.proto === "masque-h2") && (s.node || s.country)) {
      toast("Для MASQUE фильтры -node/-country не применяются — Cloudflare вернёт одну ноду", "err");
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
    setScanRunning(true);
    setPhase("Запуск warpscout…", 2);
    S.results = [];
    renderResults();
    updateCmdPreview();

    if (!S.account && !IS_MOCK) {
      setScanRunning(false);
      toast("Сначала создайте аккаунт WARP — вкладка «Аккаунт»", "err");
      switchTab("account");
      return;
    }
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
          const mStep = /(\d+)\/(\d+)\s*$/.exec(buf.trim());
          if (mPhase1) setPhase("Фаза 1: ищем проходимые порты", null);
          if (mPhase2) setPhase("Фаза 2: проверяем туннели", null);
          if (mStep) {
            const frac = (+mStep[1] / Math.max(1, +mStep[2])) * 100;
            setPhase(mPhase2 ? "Фаза 2: проверяем туннели" : "Фаза 1: ищем проходимые порты", frac);
          }
        } else if (d.type === "exit") {
          unregisterProc(proc.id);
          setScanRunning(false);
          setPhase("Читаем отчёт…", 100);
          finishScan(withP, withSpeed, +((d.data || "0").trim()) === 0);
        }
      });
    } catch (e) {
      setScanRunning(false);
      toast("Не удалось запустить warpscout: " + (e && e.message ? e.message : e), "err");
      switchSubtab("results");
    }
  }

  async function finishScan(withP, withSpeed, exitOk) {
    let text = "";
    try {
      text = await fs().readFile(S.paths.reportPath);
    } catch (e) {
      // в демо-режиме берём отчёт из мока
      if (IS_MOCK && window.NeutralinoMock) text = window.NeutralinoMock.report;
    }
    if (!text) {
      appendLog($("#scanLog"), "\n[GUI] Отчёт не найден — смотрим конец лога.\n");
      toast("Скан завершён, но отчёт пуст. Смотрите лог.", "err");
      switchSubtab("results");
      return;
    }
    S.results = parseReport(text, withP, withSpeed);
    const firstOk = S.results.find((r) => !r.torn);
    S.selected = firstOk ? firstOk.endpoint : "";
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
    if (S.procIds.scan != null) {
      try { await os().killProcess(S.procIds.scan); } catch (e) {}
      S.procIds.scan = null;
    }
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
      if (ver === "awg20" || ver === "awg31") {
        if ((o.i1 || "").trim()) kv("I1", o.i1.trim());
      } else if ((o.i1 || "").trim()) {
        kv("I1", o.i1.trim());
      }
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
    kv("Endpoint", c.endpoint || "188.114.98.58:2408");
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
    $("#cfgFileName").textContent = ver === "wg" ? "warp-wg.conf" : "warp-" + ver.replace("awg", "awg") + ".conf";
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
    const log = $("#accLog");
    log.textContent = "";
    appendLog(log, "$ warpscout register" + (fresh ? " -fresh" : "") + "\n");
    if (!HAS_NL || IS_MOCK) {
      appendLog(log, "[демо] Используется демо-аккаунт. В приложении здесь выполняется настоящая регистрация.\n");
      S.account = await loadAccount();
      renderAccount();
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
          const ok = +((d.data || "1").trim()) === 0;
          appendLog(log, ok ? "\n[GUI] Готово.\n" : "\n[GUI] Регистрация завершилась с ошибкой (код " + d.data + ").\n");
          if (ok) { loadAccount().then(renderAccount); toast("Аккаунт готов", "ok"); }
          else toast("Регистрация не удалась — смотрите лог", "err");
        }
      });
    } catch (e) {
      S.running.register = false;
      appendLog(log, "\n[GUI] Не удалось запустить warpscout: " + (e && e.message ? e.message : e) + "\n");
      toast("Ошибка запуска warpscout", "err");
    }
  }

  /* ───────── SOCKS ───────── */
  async function socksToggle() {
    if (S.running.socks) {
      try { await os().killProcess(S.procIds.socks); } catch (e) {}
      S.procIds.socks = null;
      S.running.socks = false;
      socksUi();
      return;
    }
    const ep = $("#socksEndpoint").value.trim();
    if (!/^.+:\d+$/.test(ep)) { toast("Укажите эндпоинт в формате ip:порт", "err"); return; }
    const port = $("#socksPort").value || "1080";
    const proto = $("#socksProto").value;
    const acc = S.paths.accPath ? ' -a "' + S.paths.accPath + '"' : "";
    const cmd = quoteExe() + " socks -e " + ep + " -p " + proto + " -P " + port + acc;
    $("#socksLog").textContent = "";
    const proc = await os().spawnProcess(cmd);
    S.procIds.socks = proc.id;
    S.running.socks = true;
    socksUi();
    registerProc(proc.id, (d) => {
      if (d.type === "stdout" || d.type === "stderr") appendLog($("#socksLog"), typeof d.data === "string" ? d.data : "");
      else if (d.type === "exit") {
        unregisterProc(proc.id);
        S.running.socks = false;
        socksUi();
        appendLog($("#socksLog"), "\n[GUI] Прокси остановлен (код " + d.data + ").\n");
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
    syncInputsFromState();
    updateCmdPreview();
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
      store().setData("state", JSON.stringify({ scan: S.scan, cfg: S.cfg, settings: S.settings, foundCmd: S.foundCmd || "" }));
    } catch (e) {}
  }, 400);

  /* ───────── проверка warpscout ───────── */
  async function checkWarpscout() {
    const el = $("#stWs");
    try {
      const cmd = quoteExe() + " version";
      const res = await os().execCommand(cmd);
      const out = ((res && res.output) || "").trim();
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
      dataDir = (dataDir || ".").replace(/[\\/]+$/, "") + "\\WARPScoutGUI";
      S.paths.dataDir = dataDir;
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
    $("#btnSortPing").addEventListener("click", () => { S.sortDesc = !S.sortDesc; renderResults(); });
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
        i1: S.cfg.obf.i1, // I1 не сбрасываем — он из скана
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
    $("#btnFjStop").addEventListener("click", () => { try { os().killProcess(S.procIds.fj); } catch (e) {} });
    $("#btnFsRun").addEventListener("click", () => runTool("fs"));
    $("#btnFsStop").addEventListener("click", () => { try { os().killProcess(S.procIds.fs); } catch (e) {} });
    $("#btnApplyFound").addEventListener("click", applyFoundCmd);

    // настройки
    $("#btnBrowseWs").addEventListener("click", browseWsPath);
    $("#btnCheckWs").addEventListener("click", () => { S.paths.wsPath = $("#setWsPath").value.trim() || S.paths.wsPath; checkWarpscout(); });
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
      S.results = [];
      syncInputsFromState();
      updateCmdPreview();
      renderResults();
      toast("Сброшено", "ok");
    });

    // горячие клавиши
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        switchTab("scan");
        if (!S.running.scan) runScan();
      }
    });

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
