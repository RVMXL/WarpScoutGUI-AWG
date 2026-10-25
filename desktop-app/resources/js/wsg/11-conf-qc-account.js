/* ═══ WSG · 11-conf-qc-account — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 3971–5031.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

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
    if (!Object.keys(all).length) { toast(t("conf.io.12"), "err"); return; }

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
      else { nc.dns = "custom"; nc.dnsCustom = d; applied.push(t("conf.io.16")); }
    }
    if (has("mtu")) { const m = num("mtu"); if (m && m > 0 && m <= 10000) { nc.mtu = m; applied.push("MTU " + m); } }
    if (has("table")) { nc.tableOff = /off/i.test(all.table); if (nc.tableOff) applied.push("Table off"); } // v2.4.6 (F24)

    // Peer
    if (has("endpoint") && /^[A-Za-z0-9.\[\]:-]+:\d+$/.test(all.endpoint.trim())) {
      nc.endpoint = all.endpoint.trim();
      applied.push(t("conf.io.17"));
    }
    if (has("persistentkeepalive")) { const k = num("persistentkeepalive"); if (k != null && k >= 0 && k <= 65535) { nc.keepalive = k; applied.push("keepalive " + k); } }
    if (has("allowedips")) {
      const a = all.allowedips.replace(/\s+/g, "");
      if (a === "0.0.0.0/0,::/0" || a === "::/0,0.0.0.0/0") { nc.allowed = "both"; applied.push(t("conf.io.18")); }
      else if (a === "0.0.0.0/0") { nc.allowed = "v4"; applied.push("AllowedIPs v4"); }
      else if (a === "::/0") { nc.allowed = "v6"; applied.push("AllowedIPs v6"); }
      else { nc.allowed = "custom"; nc.allowedCustom = all.allowedips.trim(); applied.push(t("conf.io.19")); }
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
      if (heads.length) applied.push(tF("conf.io.20", { n: heads.length }));
      // v2.6.8: через normI1Store — raw-цепочка (в т.ч. мультиблочная и компактная
      // «<b0x…><r23>») канонизируется к виду демона; раньше компактная форма уезжала
      // как есть и демон отвечал «unknown tag»
      if (has("i1")) { o.i1 = strField(normI1Store(all.i1), 6000); applied.push("I1"); }
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
        applied.push(t("conf.io.21"));
      }
    }
    // v2.4.6 (F26): I2–I5 больше не теряются; v2.6.8: и канонизируются как I1
    if (hasI2plus) {
      ["i2", "i3", "i4", "i5"].forEach((k) => { if (has(k)) nc.obf[k] = strField(normI1Store(all[k]), 6000); });
      applied.push("I2–I5");
    }

    // что не переносится
    if (has("privatekey") || has("address")) skipped.push(t("conf.io.22"));
    if (has("publickey")) skipped.push(t("conf.io.23"));
    if (has("presharedkey")) skipped.push(t("conf.io.24"));
    if (c.peers.length > 1) skipped.push(tF("extra.31", { n: c.peers.length })); // v2.4.6 (F25)
    // v2.4.6: неизвестные директивы — явным списком, а не молча
    const KNOWN = new Set(["dns", "mtu", "table", "endpoint", "persistentkeepalive", "allowedips",
      "jc", "jmin", "jmax", "s1", "s2", "s3", "s4", "h1", "h2", "h3", "h4",
      "i1", "i2", "i3", "i4", "i5",
      "contentpaddingaddition", "rekeyaftertime", "rekeytimeout", "rejectaftertime",
      "keepalivetimeout", "maxhandshakeattempts", "randomtrailers", "disablecookies", "headerprotectionkey",
      "privatekey", "address", "publickey", "presharedkey"]);
    Object.keys(all).forEach((k) => { if (!KNOWN.has(k)) skipped.push(k); });
    if (c.unknown.length) skipped.push(tF("extra.32", { n: c.unknown.length }));

    S.cfg = nc;
    syncCfgInputsFromState();
    renderConf();
    persist();
    toast(tF("conf.io.13", { what: applied.join(" · ") }), "ok");
    if (skipped.length) toast(tF("conf.io.14", { what: skipped.join("; ") }), "warn");
  }

  async function importConf() {
    if (!IS_MOCK && HAS_NL) {
      let p;
      try {
        p = await os().showOpenDialog(t("conf.io.11"), { multiSelections: false });
      } catch (e) { p = null; }
      const picked = Array.isArray(p) ? p[0] : typeof p === "string" ? p : null;
      if (!picked) return;
      try {
        applyImportedConf(await fs().readFile(picked));
      } catch (e) {
        toast(tF("extra.10", { err: e && e.message ? e.message : e }), "err");
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
        catch (err) { toast(tF("extra.33", { err: err && err.message ? err.message : err }), "err"); }
      };
      reader.readAsText(file);
    });
  }

  /* ───────── копирование эндпоинтов (v1.5.0) ───────── */
  function copyEndpoints() {
    const list = S.results.filter((r) => !r.torn).map((r) => r.endpoint);
    if (!list.length) { toast(t("toasts.05"), "err"); return; }
    copyText(list.join("\n"), tF("toasts.04", { n: list.length }));
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
    // v2.6.2 (аудит FE-23): путь аккаунта — через argPath (дубль FE-1)
    const acc = S.paths.accPath ? " -a " + argPath(S.paths.accPath) : "";
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
      " -o " + argPath(report) + acc; // v2.6.2 (аудит FE-23): argPath вместо голых кавычек
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
    const nodePart = q.node ? " · " + t("misc.31") + " " + q.node : "";
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
      if (S.running.check) { toast(t("qc.08"), "warn"); return; }
      if (S.running.scan) { toast(t("qc.09"), "warn"); return; }
    }
    const parts = splitEpPort(ep);
    if (!parts) { batchFail("error"); toast(t("qc.10"), "err"); return; }
    if (!S.account && !IS_MOCK) {
      batchFail("error");
      toast(t("scan.process.17"), "err");
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
      $("#qcEp").textContent = tF("batch.25", { i: b ? b.idx + 1 : 1, n: b ? b.total : 1, ep: ep });
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
      const msg = tF("qc.11", { err: e && e.message ? e.message : e });
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
    if (e.kind === "ok") return tF("qc.13", { ping: e.ping || "?", loss: e.loss || "0%" });
    if (e.kind === "torn") return tF("qc.14", { loss: e.loss || "100%" });
    if (e.kind === "noanswer") return t("qc.15");
    return tF("qc.12", { c: e.code != null ? e.code : "!" });
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
        '<span class="qcj__title">' + t("batch.02") + '</span>' +
        '<span class="qcj__cnt">' + n + '</span>' +
        '<span class="qcj__tools">' +
          '<button type="button" id="btnQcjCsv" title="' + t("batch.04") + '">⬇ CSV</button>' +
          '<button type="button" id="btnQcjClear" class="history__clear" title="' + t("batch.05") + '">' + t("history.12") + "</button>" +
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
        : '<div class="qcj__empty">' + t("batch.03") + "</div>");
    const bCsv = $("#btnQcjCsv");
    if (bCsv) bCsv.addEventListener("click", exportQcjCsv);
    const bClr = $("#btnQcjClear");
    if (bClr) bClr.addEventListener("click", clearQcJournal);
  }

  function exportQcjCsv() {
    if (!S.qcHistory.length) { toast(t("batch.03"), "err"); return; }
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
      toast(tF("batch.09", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("batch.04"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, csv);
        toast(tF("batch.10", { path: path }), "ok");
      })
      .catch((e) => toast(tF("extra.09", { err: e && e.message ? e.message : e }), "err"));
  }

  async function clearQcJournal() {
    if (!S.qcHistory.length) { toast(t("batch.08"), "ok"); return; }
    if (!confirm(tF("batch.06", { n: S.qcHistory.length }))) return;
    S.qcHistory = [];
    renderQcJournal();
    persist();
    toast(t("batch.07"), "ok");
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
      if (!batch) toast(tF("qc.19", { ep: ep, err: exitCode }), "err");
    } else if (!row) {
      verdict = { kind: "noanswer", ping: "", loss: "", node: node };
      if (modalOpen) qcSetVerdict("warn", "Эндпоинт не ответил (нет строки в отчёте)", {}, "");
      if (!batch) toast(tF("qc.18", { ep: ep }), "warn");
    } else if (row.torn) {
      const loss = String(row.loss || "100%").replace(/\s*ms/i, "");
      verdict = { kind: "torn", ping: "", loss: loss, node: node };
      if (modalOpen) qcSetVerdict("err", "⛔ Разорван — потери {loss}", { loss: loss }, node);
      if (!batch) toast(tF("qc.17", { ep: ep }), "err");
    } else {
      const ping = String(row.tunPing || "?").replace(/\s*ms/i, "");
      const loss = String(row.loss || "0%").replace(/\s*ms/i, "");
      verdict = { kind: "ok", ping: ping, loss: loss, node: node };
      if (modalOpen) qcSetVerdict("ok", "✅ Рабочий — TUN PING {ping} ms, потери {loss}", { ping: ping, loss: loss }, node);
      if (!batch) toast(tF("qc.16", { ep: ep, ping: ping }), "ok");
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
    if (!list.length) { toast(t("batch.17"), "warn"); return; }
    if (S.running.check) { toast(t("qc.08"), "warn"); return; }
    if (S.running.scan) { toast(t("qc.09"), "warn"); return; }
    S.qcBatch = { list: list, idx: 0, total: list.length, ok: 0, torn: 0, other: 0, done: 0, curResolve: null };
    const m = $("#qcModal");
    if (m) {
      $("#qcEp").textContent = tF("batch.19", { n: list.length });
      $("#qcProto").textContent = String(S.viewProto || S.scan.proto || "awg").toUpperCase();
      $("#qcCmd").textContent = t("batch.20");
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
      qcSetVerdict("warn", t("extra.34"), {}, "");
      toast(t("extra.34"), "warn");
    } else if (b) {
      const summary = tF("batch.22", { ok: b.ok, torn: b.torn, other: b.other, n: b.total });
      qcSetVerdict(b.ok && !b.other ? "ok" : b.ok ? "warn" : "err", summary, {}, "");
      toast(t("batch.23") + " — " + summary, b.ok ? "ok" : "warn");
    }
  }

  function updateBatchMeta() {
    const meta = $("#batchMeta");
    const cnt = $("#batchCount");
    if (cnt) cnt.textContent = String((S.qcSel || []).length);
    if (!meta) return;
    if (S.qcBatch) {
      const b = S.qcBatch;
      meta.textContent = tF("batch.21", { done: b.done || 0, n: b.total, ok: b.ok, torn: b.torn });
      meta.className = "batch-bar__meta is-run";
    } else {
      meta.textContent = (S.qcSel || []).length ? tF("batch.18", { n: S.qcSel.length }) : "";
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
      btn.textContent = S.qcSelMode ? "✕ " + t("batch.13") : "☑ " + t("batch.12");
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
        '" role="button" tabindex="0" aria-label="' + tF("history.04", { ts: fmtTime(q.p.ts), ping: q.p.ping }) + '">' +
        "<title>" + tF("history.05", { ts: fmtTime(q.p.ts), ping: q.p.ping }) + "</title></circle>"
      )
      .join("");
    return (
      '<div class="trend" role="img" aria-label="' + t("history.03") + '">' +
        '<div class="trend__head">' +
          '<span class="trend__title">' + t("history.01") + "</span>" +
          '<span class="trend__tools">' +
            '<span class="trend__range">min <b>' + min + "</b> · max <b>" + max + "</b> ms</span>" +
            '<button type="button" class="trend__csv" id="btnTrendCsv" title="' + t("cmp.17") + '">⬇ CSV</button>' +
            '<button type="button" class="trend__csv trend__png" id="btnTrendPng" title="' + t("batch.41") + '">⬇ PNG</button>' +
            '<button type="button" class="trend__csv trend__svg" id="btnTrendSvg" title="' + t("batch.26") + '">⬇ SVG</button>' +
          "</span>" +
        "</div>" +
        '<svg class="trend__svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">' +
          '<polygon class="trend__area" points="' + area + '"></polygon>' +
          '<polyline class="trend__line" points="' + line + '"></polyline>' +
          dots +
        "</svg>" +
        '<div class="trend__hint">' + t("history.02") + "</div>" +
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
          $("#presetHint").innerHTML = tF("presets.17", { name: esc(cname) });
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
    if (kind === "parse") return t("acc.29");
    if (kind === "not-account") return t("extra.35");
    if (kind === "ambiguous") return t("extra.36");
    return t("acc.31");
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
    if (has) { fileState = t("acc.13"); fileCls = "is-ok"; }
    else if (S.accountError === "parse") { fileState = t("acc.32"); fileCls = "is-err"; }
    else if (S.accountError === "not-account") { fileState = t("acc.33"); fileCls = "is-err"; }
    else { fileState = t("acc.14"); fileCls = "is-err"; }
    set("#accFileState", fileState, fileCls);
    $("#accFilePath").textContent = S.paths.accPath || "—";
    set("#accMainState", has ? "✓ " + (S.account.ipv4 || "ok") : "—", has ? "is-ok" : "is-warn");
    set("#accMasqueState", has && S.account.masque ? t("acc.15") : t("acc.16"), has && S.account.masque ? "is-ok" : "is-warn");
    set("#accOuterState", has && S.account.outer ? t("acc.15") : t("acc.17"), has && S.account.outer ? "is-ok" : "is-warn");
    renderAccountStatusline();
  }

  function renderAccountStatusline() {
    const el = $("#stAcc");
    if (S.account) { el.textContent = t("acc.18"); el.className = "statusline__row is-ok"; }
    else { el.textContent = t("acc.19"); el.className = "statusline__row is-err"; }
  }

  // v2.1.0: человекочитаемая подсказка по коду выхода и хвосту лога warpscout
  // v2.1.1: различаем потерянный exit-сигнал (synthetic) и настоящий вылет;
  // если проверка «warpscout version» проходила — exe запускается, путь верный
  function registerHintFor(code, logTail, synthetic) {
    const tl = String(logTail || "").toLowerCase();
    if (tl.includes("could not save account"))
      return t("acc.35");
    if (tl.includes("fix or move"))
      return t("acc.36");
    if (tl.includes("registration failed") || tl.includes("no reachable endpoint"))
      return t("acc.37");
    if (code === -1) {
      if (synthetic)
        return t("acc.recheck.18");
      const v = S.wsVersion ? " " + tF("acc.recheck.19", { v: S.wsVersion }) : "";
      return t("acc.38") + v;
    }
    return t("acc.39");
  }

  async function runRegister(fresh) {
    if (S.running.register) return;
    S.running.register = true;
    registerUi();
    const log = $("#accLog");
    log.textContent = "";
    appendLog(log, "$ warpscout register" + (fresh ? " -fresh" : "") + "\n");
    if (!HAS_NL || IS_MOCK) {
      appendLog(log, t("misc.27") + "\n");
      S.account = await loadAccount();
      renderAccount();
      S.running.register = false;
      registerUi();
      toast(t("acc.22"), "ok");
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
      appendLog(log, "\n[GUI] " + t("acc.34") + "\n");
      toast(t("misc.40"), "err");
      return;
    }
    // v2.6.2 (аудит FE-23): путь аккаунта — через argPath (дубль FE-1)
    const acc = S.paths.accPath ? " -a " + argPath(S.paths.accPath) : "";
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
        appendLog(log, "\n[GUI] " + t("extra.37") + "\n");
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
      appendLog(log, "\n[GUI] " + tF("extra.05", { err: e && e.message ? e.message : e }) + "\n");
      toast(t("misc.40"), "err");
    }

    // v2.1.1: код выхода warpscout — не истина в последней инстанции: события
    // могут теряться, процесс могут закрыть в фоне ПОСЛЕ записи файла. Поэтому
    // при ненулевом коде перепроверяем файл аккаунта по факту.
    async function finishRegister(code, synthetic) {
      try { await loadAccount(); } catch (e) {}
      renderAccount();
      // v2.6.2 (SEC-A1): аккаунт мог быть записан самим CLI (права по umask CLI) —
      // после успешной регистрации права файла снимаются до 0600 (best effort)
      hardenAccountPerms();
      const newId = S.account && S.account.id ? String(S.account.id) : "";
      // v2.4.6 (F40): ротация меняет КЛЮЧИ, сохраняя id — неизменный id больше
      // не считается доказательством неудачи
      const newKey = S.account && typeof S.account.private_key === "string" ? S.account.private_key.slice(-12) : "";
      const accountAppeared = !!S.account && (!preId || newId !== preId || (!!preKey && !!newKey && preKey !== newKey));
      // v2.6.2 (FE-25): латентное зеркалирование АККАУНТА (с private_key) в публичный
      // Download УБРАНО — приватный ключ покидает app-private каталог только по явному
      // действию пользователя. Автомиррор остался только у отчётов и конфигов — это
      // и есть «явное действие» (сохранение конфига/завершение скана).
      if (code === 0) {
        appendLog(log, "\n[GUI] " + t("misc.29") + "\n");
        toast(t("acc.20"), "ok");
        return;
      }
      if (accountAppeared) {
        appendLog(log, "\n" + tF("acc.recheck.17", { code }) + "\n");
        toast(t("acc.20"), "ok");
        return;
      }
      // v2.1.1: раньше здесь был двойной префикс «[GUI] [GUI]» — убран
      appendLog(log, "\n" + tF("misc.38", { code }) + "\n");
      appendLog(log, "[GUI] " + registerHintFor(code, logTail, synthetic) + "\n");
      toast(t("acc.21"), "err");
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
  // v2.6.2 (SEC-A1): приватный ключ не должен быть читаем всем локальными
  // пользователями. Обычная запись Neutralino filesystem даёт права по umask
  // (типично 0644) — после записи снимаем их до 0600 нативным fs.setPermissions
  // (REPLACE). Только desktop: на Android файл уже в app-private каталоге моста
  // (права контролирует ОС), на Windows POSIX-права неприменимы. Best effort:
  // неудача (старый рантайм/ФС) не ломает подключение аккаунта.
  async function hardenAccountPerms() {
    if (IS_MOCK || IS_ANDROID || IS_WIN || !HAS_NL) return;
    if (!S.paths.accPath) return;
    try {
      await fs().setPermissions(S.paths.accPath, { all: false, ownerAll: false, ownerRead: true, ownerWrite: true, ownerExec: false, groupAll: false, groupRead: false, groupWrite: false, groupExec: false, othersAll: false, othersRead: false, othersWrite: false, othersExec: false }, "REPLACE");
    } catch (e) { /* best effort: нет прав/старый рантайм — подключение аккаунта важнее */ }
  }

  // v2.6.2 (SEC-A1): ротация резервных копий аккаунта — не более N=3 последних
  // .bak-ГГГГ-ММ-ДДЧЧ-ММ-СС, старшие удаляются. Раньше копии накапливались
  // бесконечно, и каждая несла копию приватного ключа без защиты и очистки.
  async function pruneAccountBackups(keep) {
    if (IS_MOCK || !S.paths.dataDir) return;
    try {
      const items = await fs().readDirectory(S.paths.dataDir);
      if (!Array.isArray(items)) return;
      const baks = items
        .map((it) => String((it && it.path) || ""))
        .filter((p) => /(^|[\\/])warpscout-account\.json\.bak-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(p))
        .sort()
        .reverse(); // новее — раньше (метка времени в имени сортируется лексикографически)
      for (const p of baks.slice(Math.max(1, keep || 3))) {
        try { await fs().remove(p); } catch (e) { /* удалим при следующей ротации */ }
      }
    } catch (e) { /* каталог не читается — не критично */ }
  }

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
            toast(tF("extra.38", { f: bak.split(/[\\/]/).pop() }), "info");
            pruneAccountBackups(3); // v2.6.2 (SEC-A1): ротация .bak — не копим приватные ключи бесконечно
          }
        } catch (e) { /* прежнего аккаунта нет */ }
        await fs().writeFile(S.paths.accPath, String(text));
        await hardenAccountPerms(); // v2.6.2 (SEC-A1): 0600 сразу после записи
        // v2.6.2 (FE-25): зеркалирование АККАУНТА в публичный Download убрано —
        // приватный ключ покидает app-private каталог только по явному решению
        // пользователя, а не латентно при каждом импорте/регистрации
      } catch (e) {
        toast(tF("acc.26", { err: e && e.message ? e.message : e }), "err");
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
      try { p = await os().showOpenDialog(t("acc.25"), { multiSelections: false }); }
      catch (e) { p = null; }
      const picked = Array.isArray(p) ? p[0] : typeof p === "string" ? p : null;
      if (!picked) return;
      let text = "";
      try { text = await fs().readFile(picked); }
      catch (e) {
        toast(tF("extra.10", { err: e && e.message ? e.message : e }), "err");
        return;
      }
      const r = accountFromText(text);
      if (r.error) { toast(t(accountImportErrorText(r.error)), "err"); return; }
      if (await adoptImportedAccount(picked, text)) toast(t("acc.27"), "ok");
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
        if (await adoptImportedAccount(null, String(reader.result))) toast(t("acc.27"), "ok");
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
      // v2.6.2 (SEC-A4): кандидат из текущего рабочего каталога — ТОЛЬКО с явным
      // подтверждением: случайно лежащий рядом warpscout-account.json (например,
      // после запуска CLI из домашней папки) мог иметь отношение к другому
      // сценарию — GUI не должен молча принять его как рабочий. Источник принятого
      // аккаунта и так виден в тосте ниже (acc.28).
      if (src === "warpscout-account.json" && !confirm(tF("acc.cwd.01", { src: src }))) continue;
      if (await adoptImportedAccount(src, text)) {
        toast(tF("acc.28", { src }), "ok");
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
      if (IS_MOCK || !HAS_NL) { toast(t("acc.recheck.13"), "err"); return; }
      const raw = String(S.paths.wsPath || "").replace(/["%!<>|&^`]/g, "");
      if (!raw.trim()) return;
      if (!IS_WIN) {
        // v2.5.0: Linux/macOS — выдаём право на запуск; v2.6.0 (SEC-5):
        // нативный Neutralino.filesystem.setPermissions ВМЕСТО shell-«chmod +x»:
        // shell-команда больше не собирается вовсе — инъекция невозможна по построению
        appendLog($("#accLog"), "\n$ chmod +x <warpscout>\n");
        try {
          await fs().setPermissions(raw, { all: false, ownerAll: false, ownerRead: true, ownerWrite: true, ownerExec: true, groupAll: false, groupRead: true, groupWrite: false, groupExec: true, othersAll: false, othersRead: true, othersWrite: false, othersExec: true }, "ADD");
          appendLog($("#accLog"), "[GUI] " + t("acc.recheck.14") + "\n");
          toast(t("acc.recheck.15"), "ok");
        } catch (e) {
          toast(tF("acc.recheck.16", { err: e && e.message ? e.message : e }), "err");
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
        appendLog($("#accLog"), "[GUI] " + t("acc.recheck.14") + "\n");
        toast(t("acc.recheck.15"), "ok");
      } catch (e) {
        toast(tF("acc.recheck.16", { err: e && e.message ? e.message : e }), "err");
      }
    });
    $("#btnAccOpenExeDir").addEventListener("click", () => {
      if (IS_MOCK) { toast(t("acc.recheck.13"), "err"); return; }
      const dir = String(S.paths.wsPath || "").replace(/[\\/]warpscout(\.exe|\.so)?$/i, "").replace(/[\\/]+$/, "");
      if (!dir) { toast(t("misc.25"), "err"); return; }
      // v2.5.4: единый хелпер с фидбеком; на Android кнопка скрыта (nativeLibraryDir)
      openFolderUi(dir, "warpscout");
    });
    $("#btnAccCheckWs").addEventListener("click", async () => {
      toast(t("acc.recheck.09"), "ok");
      try {
        const ok = await Promise.race([
          checkWarpscout(true),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 15000)),
        ]);
        toast(ok ? tF("acc.recheck.10", { v: S.wsVersion || "?" }) : t("acc.recheck.11"), ok ? "ok" : "err");
      } catch (e) {
        toast(t("acc.recheck.12"), "err");
      }
    });
  }

