/* ═══ WSG · 14-data-migrations — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 6055–6444.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

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
    el.textContent = custom ? t("data.08") : t("data.07");
    el.className = custom ? "is-warn" : "is-ok";
    const hint = $("#dataRootHint");
    if (hint) {
      hint.textContent = custom
        ? tF("data.10", { d: S.paths.dataDir, u: S.paths.udfPath })
        : tF("data.09", { u: S.paths.udfPath });
      // v2.6.0 (SEC-6): на Android данные приватны (app-specific), а наружу
      // (файловым менеджерам) копируются в единую папку Download/WARPScoutGUI
      if (IS_ANDROID) {
        hint.textContent += " " + t("touch.15");
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
    if (isWinPathInside(newRoot, oldRoot)) throw new Error(t("extra.41"));
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
        // v2.6.2 (SEC-A1, пересечение с FE-22): резервные копии аккаунта (.bak-*)
        // несут копии приватного ключа — переносим их вместе с аккаунтом по той же
        // схеме (копия + проверка + удаление источника). Иначе источник остаётся
        // с ключами, а повторная миграция плодит дубли.
        try {
          const bakItems = await fs().readDirectory(oldRoot);
          if (Array.isArray(bakItems)) {
            for (const it of bakItems) {
              if (String(it.type || "").toUpperCase() === "DIRECTORY") continue;
              const name = String(it.path || "").split(/[\\/]/).pop();
              if (!name || !/^warpscout-account\.json\.bak-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(name)) continue;
              let bakTxt = "";
              try { bakTxt = await fs().readFile(it.path); } catch (e) { continue; }
              let bakDest = false;
              try { await fs().readFile(pxJoin(newRoot, name)); bakDest = true; } catch (e) {}
              if (bakDest) { conflicts.push(name); continue; }
              try { await fs().writeFile(pxJoin(newRoot, name), bakTxt); } catch (e) { continue; }
              let bakVerified = false;
              try { bakVerified = (await fs().readFile(pxJoin(newRoot, name))) === bakTxt; } catch (e) { bakVerified = false; }
              if (!bakVerified) continue;
              try { await fs().remove(it.path); } catch (e) { /* удалим при следующем переносе */ }
              moved.push(name);
            }
          }
        } catch (e) { /* каталог источника не читается — не ломаем основной перенос */ }
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
          // v2.6.2 (аудит FE-22): перенос = копия + проверка записи + удаление
          // источника (как для аккаунта выше). Раньше источник оставался —
          // отчёты дублировались в двух папках и при повторной миграции
          // копировались снова. Не подтвердилась запись — источник сохранён.
          let verified2 = false;
          try { verified2 = (await fs().readFile(pxJoin(newRoot, "reports", name))) === txt2; } catch (e) { verified2 = false; }
          if (!verified2) continue;
          try { await fs().remove(it.path); } catch (e) { /* удалим при следующем переносе */ }
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
      toast(tF("data.14", { n: copiedAll.length, list: copiedAll.slice(0, 3).join(", ") + (copiedAll.length > 3 ? "…" : "") }), "ok");
    }
    return copiedAll;
  }

  async function anyProcRunning() {
    return Object.values(S.running || {}).some(Boolean);
  }

  async function applyDataRoot(newRoot) {
    if (!newRoot) return;
    if (await anyProcRunning()) {
      toast(t("data.13"), "err");
      return;
    }
    if (newRoot === S.paths.dataDir) { toast(t("data.16"), "ok"); return; }
    try {
      await ensureDir(newRoot);
      await fs().readDirectory(newRoot); // проверка, что папка доступна
    } catch (e) {
      toast(t("data.17"), "err");
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
      toast(tF("extra.42", { err: e && e.message ? e.message : e }), "err");
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
        ? tF("data.18", { n: moved.length, list: moved.slice(0, 3).join(", ") + (moved.length > 3 ? "…" : "") })
        : t("data.19"),
      "ok"
    );
    if (conflicts.length) {
      toast(tF("extra.43", { n: conflicts.length }) + ": " + conflicts.slice(0, 3).join("; ") + (conflicts.length > 3 ? "…" : ""), "warn");
    }
  }

  async function pickDataRoot() {
    if (IS_MOCK) {
      // v2.6.0 (аудит QUAL-2): window.prompt в демо убран — блокирующий диалог
      // не имеет отношения к реальному SAF/нативному диалогу и дезинформирует.
      // Демо честно говорит, что выбор папки — только в приложении.
      toast(t("touch.16"), "info");
      return;
    }
    let p = null;
    try { p = await os().showFolderDialog(t("data.21")); } catch (e) { p = null; }
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
      toast(t("junction.01"), "err");
      return;
    }
    if (accText) { try { await fs().writeFile(udf + "\\warpscout-account.json", accText); } catch (e) {} }
    try {
      await ensureDir(udf + "\\reports");
      for (const r of savedReports) { try { await fs().writeFile(udf + "\\reports\\" + r.name, r.text); } catch (e) {} }
    } catch (e) {}
    cleanupOldFolder(det);
    toast(t("junction.02"), "ok");
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
      toast(tF("junction.03", { n: copied.length, list: copied.slice(0, 3).join(", ") + (copied.length > 3 ? "…" : "") }), "ok");
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
        // v2.6.2 (аудит FE-20): тема и язык переживают рестарт — persist их
        // сохраняет, restore обязан читать. Валидация по enum; невалидное
        // значение НЕ затирает текущее (patch собираем только из валидных
        // полей: Object.assign с undefined стёр бы настройку до дефолта).
        const patch = {
          wsPath: strField(st.settings.wsPath, 500),
          dataRoot: strField(st.settings.dataRoot, 500),
        };
        if (st.settings.theme === "dark" || st.settings.theme === "light") patch.theme = st.settings.theme;
        if (st.settings.lang === "ru" || st.settings.lang === "en") patch.lang = st.settings.lang;
        S.settings = Object.assign({}, S.settings, patch);
      }
      if (Array.isArray(st.customPresets)) S.customPresets = sanitizePresets(st.customPresets);
      S.compact = !!st.compact;
      if (Array.isArray(st.history)) S.history = st.history.map(sanitizeHistoryItem).filter(Boolean).slice(0, 10);
      if (Array.isArray(st.qcHistory)) S.qcHistory = st.qcHistory.map(sanitizeQcItem).filter(Boolean).slice(0, 50);
      // v2.6.7 (FIX i1-truncation): 500 → 8000 — команда с raw-I1 (эталон ~2.6 КБ)
      // больше не режется при восстановлении состояния
      S.foundCmd = strField(st.foundCmd, 8000);
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

