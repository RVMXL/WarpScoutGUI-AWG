/* ═══ WSG · 09-state-io — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 2868–3130.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

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
      toast(tF("extra.15", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("backup.01"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, json);
        toast(tF("extra.16", { path: path }), "ok");
      })
      .catch((e) => toast(tF("extra.09", { err: e && e.message ? e.message : e }), "err"));
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
    // v2.6.8: I1..I5 канонизируются при восстановлении состояния — raw-цепочка
    // (в т.ч. мультиблочная и компактная «<b0x…><r23>») приводится к виду демона,
    // старые сломанные состояния самоисправляются при первом же запуске
    c.obf.i1 = strField(normI1Store(o.i1), 6000);
    ["i2", "i3", "i4", "i5"].forEach((k) => { c.obf[k] = strField(normI1Store(o[k]), 6000); });
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
      toast(t("backup.05"), "err");
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
      toast(tF("extra.17", { err: e && e.message ? e.message : e }), "err");
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
    toast(t("backup.06"), "ok");
  }

  function importState() {
    if (!IS_MOCK && HAS_NL) {
      os()
        .showOpenDialog(t("backup.07"), { multiSelections: false })
        .then(async (p) => {
          let picked = Array.isArray(p) ? p[0] : p;
          if (!picked) return;
          try {
            const text = await fs().readFile(picked);
            // v2.4.6 (F08): лимит размера ДО парсинга — гигантский файл не блокирует UI
            if (String(text).length > 2000000) { toast(t("extra.18"), "err"); return; }
            applyImportedState(JSON.parse(text));
          } catch (e) {
            toast(tF("extra.10", { err: e && e.message ? e.message : e }), "err");
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
          if (text.length > 2000000) { toast(t("extra.18"), "err"); return; } // v2.4.6 (F08)
          applyImportedState(JSON.parse(text));
        } catch (err) {
          toast(tF("extra.11", { err: err && err.message ? err.message : err }), "err");
        }
      };
      reader.readAsText(file);
    });
  }

  function toggleKbd(open) {
    setModal($("#kbdModal"), open); // v2.4.6 (F47)
  }

