/* ═══ WSG · 13-form-paths — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 5590–6054.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

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

