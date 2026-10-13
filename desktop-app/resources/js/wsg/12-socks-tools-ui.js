/* ═══ WSG · 12-socks-tools-ui — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 5032–5589.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

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
      toast(t("socks.10"), "err");
      return;
    }
    const socksPort = clampInt($("#socksPort").value || "1080", 1, 65535, 1080);
    const proto = enumOf($("#socksProto").value, SCAN_ENUMS.proto, "awg");
    // v2.6.2 (аудит FE-23): путь аккаунта — через argPath (дубль FE-1)
    const acc = S.paths.accPath ? " -a " + argPath(S.paths.accPath) : "";
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
    try { proc = await os().spawnProcess(cmd); } catch (e) { S.running.socks = false; socksUi(); toast(t("misc.20"), "err"); return; }
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
        appendLog($("#socksLog"), "\n[GUI] " + t("extra.39") + "\n");
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
        (S.paths.accPath ? " -a " + argPath(S.paths.accPath) : ""); // v2.6.2 (FE-23)
    } else {
      cmd =
        quoteExe() + " find-sni -p " + $("#fsProto").value +
        " -threshold " + (+$("#fsThreshold").value || 70) +
        (S.paths.accPath ? " -a " + argPath(S.paths.accPath) : ""); // v2.6.2 (FE-23)
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
          appendLog(log, "\n[GUI] " + t("tools.14") + "\n");
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
      toast(t("misc.20"), "err");
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
    if (!cmd) { toast(t("tools.16"), "err"); return; }
    // v2.4.6 (F21): строим НОВЫЙ согласованный профиль с нуля, а не подмешиваем
    // найденные флаги в текущую форму (старые through/target/gen-junk искажали смысл)
    const s = Object.assign({}, DEFAULT_SCAN);
    const tokens = cmd.split(/\s+/);
    // v2.6.4 (запрос пользователя): найденный find-junk КОНКРЕТНЫЙ I1 (CLI сохраняет
    // его сырым флагом -i1, findjunk.go:155) больше не выбрасывается — он ровно то,
    // что лежит в поле I1 вкладки «Конфиг» (S.cfg.obf.i1). Раньше GUI «не представлял»
    // его и предупреждал (extra.40) — теперь подставляем в конфиг.
    let foundI1 = "";
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
      "-i1": (v) => (foundI1 = strField(String(v == null ? "" : v), 600)),
      "-threshold": () => {},
    };
    for (let i = 0; i < tokens.length; i++) {
      const f = tokens[i];
      if (!Object.prototype.hasOwnProperty.call(flags, f)) continue;
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
    // v2.6.4: конкретный I1 из find-junk — в конфиг (пробелы вычищает и buildConf)
    if (foundI1) {
      S.cfg.obf.i1 = foundI1.replace(/\s+/g, "");
      syncCfgInputsFromState();
    }
    S.lastRunParams = null; // применён новый профиль — старый снимок больше не источник параметров
    syncInputsFromState();
    updateCmdPreview();
    persist();
    switchTab("scan");
    if (foundI1) toast(t("tools.17"), "ok");
    else toast(t("tools.15"), "ok");
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
        if (S.running.scan) hs.textContent = "● " + t("nav.02") + ": " + phase;
        else if (S.results.length) hs.textContent = "● " + t("conf.48");
        else hs.textContent = "● " + t("touch.06");
        hs.className = "home-status__row" + (!S.running.scan && S.results.length ? " home-done" : "");
      }
      if (hr) {
        hr.textContent = n ? "● " + tF("touch.07", { n: n }) : "● " + t("touch.08");
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
    if (IS_MOCK) { toast(t("conf.37"), "info"); return; }
    toast(tF("conf.36", { what: what ? " (" + what + ")" : "", p: target }), "info");
    try {
      await Promise.resolve(os().open(target));
    } catch (e) {
      toast(t("misc.25") + ": " + (e && e.message ? e.message : e), "err");
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
      if (lbl) lbl.textContent = run ? t("conf.39") : t("touch.01");
      btnH.classList.toggle("home-act--busy", run);
      btnH.setAttribute("aria-label", run ? t("conf.40") : t("touch.01"));
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
    toast(t("touch.11"), "ok");
    homeScanUi();
    try { await window.__WSGUI.runScan(); } catch (e) {}
    homeScanUi();
  }
  async function homeMakeConf() {
    if (S.running.scan) { toast(t("touch.10"), "warn"); return; }
    if (!confExportReady()) return; // свой toast при отсутствии аккаунта
    const best = bestResultRow();
    if (!best) { toast(t("touch.09"), "err"); return; }
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
            toast(t("conf.41"), "ok");
            return;
          }
          if (r && r.fallback) {
            toast(t("conf.42"), "warn");
          }
        } catch (e) {
          toast(tF("conf.43", { err: e && e.message ? e.message : e }), "warn");
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
      toast(tF("extra.30", { err: e && e.message ? e.message : e }), "err");
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
    toast(tF("touch.13", { p: pub || savedPath }), "ok");
  }

  function setupTouchUi() {
    // v2.6.3 (QUAL-2): самозащита от двойного вызова — теперь строится РАНЬШЕ
    // (preInitUi при разборе скриптов, до готовности рантайма), init вызывает
    // повторно — повтор должен быть безопасным no-op (иначе дубли DOM).
    if (setupTouchUi.done || !TOUCH_UI) return;
    setupTouchUi.done = true;
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
        '<span class="home-scanlive__main"><b>' + t("scan.run.03") + '</b><span id="homeScanPhase"></span></span>' +
        '<span class="home-scanlive__meta"><span id="homeScanTime">00:00</span><span id="homeScanSteps"></span></span>' +
        '<button class="home-scanlive__stop" id="homeScanStop" type="button">■ ' + t("scan.run.04") + '</button>' +
      '</div>' +
      '<div class="home-status__row" id="homeScanRow"></div>' +
      '<div class="home-status__row" id="homeResRow"></div>' +
      '<div class="home-status__hint">' + (IS_ANDROID
        ? t("conf.44")
        : t("misc.07")) + '</div></div>' +
      '<h2 class="home-title">' + t("misc.03") + '</h2>' +
      '<div class="home-actions">' +
      btn("homeScan", actIco(TABBAR_ICONS.scan), t("touch.01"), true, "") +
      btn("homeConf", actIco(SVG_BOLT), t("touch.02"), true, "") +
      '</div>' +
      '<div class="home-pub" id="homeConfBox" hidden><b>✓ ' + t("touch.04") + '</b>' +
      '<span id="homeConfPath"></span>' +
      '<div class="home-pub__btns"><button class="btn btn--ghost btn--sm" id="homeConfOpen" type="button">📁 ' + t("extra.79") + '</button>' +
      '<button class="btn btn--ghost btn--sm" id="homeConfCopy" type="button">📋 ' + t("touch.05") + '</button></div></div>' +
      (IS_ANDROID
        ? '<div class="home-pub" id="homePubBox"><b>Download/WARPScoutGUI</b> — ' + t("conf.45") +
          '<div class="home-pub__btns"><button class="btn btn--ghost btn--sm" id="homePubOpen" type="button">📁 ' + t("extra.79") + '</button></div></div>'
        : "") +
      // v2.5.2: разделы вертикальным списком (как в «Ещё») — в ряд из трёх
      // кнопок подписи не помещались и распирали страницу по горизонтали
      '<h2 class="home-title">' + t("touch.03") + '</h2>' +
      '<div class="home-actions home-actions--list">' +
      btn("homeTools", actIco(SVG_TOOLS), t("nav.06"), false, "tools") +
      btn("homeSocks", actIco(SVG_SOCKS), t("nav.05"), false, "socks") +
      btn("homeSettings", actIco(SVG_GEAR), t("nav.07"), false, "settings") +
      '</div></div>');
    home.id = "tab-home";
    home.setAttribute("aria-label", t("misc.01"));
    // ── Ещё ──
    const more = el("section", "tab",
      '<div class="home-wrap"><h2 class="home-title">' + t("misc.02") + '</h2><div class="home-actions home-actions--list">' +
      btn("moreTools", "🛠", t("nav.06"), false, "tools") +
      btn("moreSocks", "🔗", t("nav.05"), false, "socks") +
      btn("moreSettings", "⚙", t("nav.07"), false, "settings") +
      btn("moreTheme", "🌓", t("misc.05"), false, "") +
      '</div>' +
      // v2.5.0 (аудит B4): переключатель языка доступен из touch-навигации
      // (классы .lang-switch — applyLang сам синхронизирует is-active)
      '<div class="home-lang"><div class="lang-switch" role="group" data-i18n="off" aria-label="Язык / Language">' +
      '<button class="lang-switch__btn' + (LANG === "en" ? "" : " is-active") + '" type="button" data-lang="ru" aria-label="Русский">RU</button>' +
      '<button class="lang-switch__btn' + (LANG === "en" ? " is-active" : "") + '" type="button" data-lang="en" aria-label="English">EN</button>' +
      '</div></div><div class="home-foot">WARPSCOUT GUI v' + (window.NL_APPVERSION || "2.5.2") + ' · warpscout v0.16.0<br>' + t("misc.08") + '</div></div>');
    more.id = "tab-more";
    more.setAttribute("aria-label", t("misc.02"));
    main.insertBefore(home, main.firstChild);
    main.appendChild(more);
    // ── нижняя навигация (v2.5.2: контурные SVG-иконки) ──
    const tabs = [["home", "home", "misc.01"], ["scan", "scan", "nav.02"], ["config", "config", "nav.03"], ["account", "account", "nav.04"], ["more", "more", "misc.02"]]; // v2.6.2 (QUAL-1): id-ключи
    const bar = el("nav", "tabbar");
    bar.setAttribute("aria-label", t("extra.80"));
    tabs.forEach(([tabId, icoKey, label]) => { // v2.6.2 (QUAL-1): tabId — не "t" (затеняет переводчик)
      const b = el("button", "nav__item tabbar__btn" + (tabId === "home" ? " is-active" : ""),
        '<svg viewBox="0 0 24 24" class="nav__ico" aria-hidden="true" focusable="false">' + TABBAR_ICONS[icoKey] + '</svg><span>' + t(label) + '</span>');
      b.setAttribute("data-tab", tabId);
      b.setAttribute("type", "button");
      b.setAttribute("aria-label", t(label));
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
      openFolderUi(window.__homeConfPath || S.paths.dataDir || window.NL_PATH || "", t("touch.17")); // v2.6.2 (FE-24)
    });
    const hcCopy = document.getElementById("homeConfCopy");
    if (hcCopy) hcCopy.addEventListener("click", () => { if (window.__homeConfText) copyText(window.__homeConfText, t("toasts.09")); });
    const hpOpen = document.getElementById("homePubOpen");
    if (hpOpen) hpOpen.addEventListener("click", () => {
      // v2.5.4 (Android): конфиги по умолчанию лежат в Download/WARPScoutGUI —
      // она видна в ЛЮБОМ файловом менеджере (Android/data — нет)
      openFolderUi(IS_ANDROID ? ANDROID_DOWNLOAD_DIR : (S.paths.dataDir || window.NL_PATH || ""), t("touch.18")); // v2.6.2 (FE-24)
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

