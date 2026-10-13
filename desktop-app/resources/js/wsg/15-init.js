/* ═══ WSG · 15-init — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 6445–6956.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

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
          wg: t("scan.proto.03"),
          awg: t("scan.proto.02"),
          masque: t("scan.proto.04"),
          "masque-h2": t("scan.proto.05"),
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
    $("#btnCopyCmd").addEventListener("click", () => copyText(buildScanCmd(S.scan), t("toasts.08")));
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
    $("#btnQrCopy").addEventListener("click", () => { if (confExportReady()) copyText(buildConf(), t("toasts.09")); }); // v2.4.6 (F27)
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
      if (!best) { toast(t("toasts.10"), "err"); return; }
      if (S.viewProto === "masque" || S.viewProto === "masque-h2") {
        // v2.4.6 (F19): для MASQUE нет WG/AWG .conf — честный отказ
        toast(t("extra.02"), "warn");
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
      toast(tF("toasts.11", { ep: best.endpoint }), "ok");
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
        info.textContent = t("misc.31") + " " + r.node + " · " + r.loc + " · " + t("misc.32") + " " + (r.tunPing || r.ping) + (r.loss ? " · " + t("misc.33") + " " + r.loss : "");
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
      toast(t("extra.44"), "ok");
    });
    $("#btnClearI1").addEventListener("click", () => { $("#cfgI1").value = ""; syncCfgFromInputs(); renderConf(); });
    $("#btnImportI1").addEventListener("click", importI1);
    $("#btnImportConf").addEventListener("click", importConf); // v1.5.0
    bindImportConfFile(); // v1.5.0
    $("#btnCopyConf").addEventListener("click", () => { if (confExportReady()) copyText(buildConf(), t("toasts.09")); }); // v2.4.6 (F27)
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
      toast(has ? t("acc.recheck.04") : t("acc.recheck.05"), has ? "ok" : "err");
    });
    $("#btnAccCopyPath").addEventListener("click", () => copyText(S.paths.accPath || "", t("acc.recheck.03")));
    bindExeHelpers();

    // socks
    $("#btnSocksRun").addEventListener("click", socksToggle);
    $("#btnSocksStop").addEventListener("click", socksToggle);
    $("#btnSocksBest").addEventListener("click", () => {
      const best = S.results.find((r) => !r.torn);
      if (!best) { toast(t("misc.35"), "err"); return; }
      $("#socksEndpoint").value = best.endpoint;
      $("#socksProto").value = S.scan.proto;
      toast(tF("misc.36", { ep: best.endpoint }), "ok");
    });
    $("#btnCopySocks").addEventListener("click", () => copyText($("#socksAddr").textContent, t("misc.34")));

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
      if (ok) toast(tF("settings.20", { v: S.wsVersion }), "ok");
      else if (S.wsFileThere) toast(t("settings.19"), "err");
      else toast(t("settings.21"), "err");
    });
    // v2.4.1: «Показать в папке» — пользователь своими глазами видит, есть ли warpscout.exe
    $("#btnOpenWsFolder").addEventListener("click", openWsFolder);
    // v2.4.1: диагностика ТЕКСТОМ — вместо скриншотов, которые не читаются
    $("#btnCopyWsDiag").addEventListener("click", async () => {
      const txt = await wsDiagText();
      copyText(txt, t("settings.15"));
    });
    // v2.5.4: единый хелпер с гарантированным фидбеком (было: молчаливый .catch)
    $("#btnOpenAcc").addEventListener("click", () => openFolderUi(S.paths.dataDir, "файл аккаунта"));
    $("#btnOpenReports").addEventListener("click", () => openFolderUi(S.paths.reportsDir, "отчёты"));
    $("#btnResetStorage").addEventListener("click", async () => {
      if (await anyProcRunning()) {
        // v2.4.6 (F34/F38): сброс посреди активных операций запрещён
        toast(t("extra.45"), "err");
        return;
      }
      // v2.4.6 (F38): честный scope сброса — указан в подтверждении
      if (!confirm(t("extra.46"))) return;
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
      toast(t("reset.02"), "ok");
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
    // v2.6.2 (QUAL-1): linuxPlatInit упразднён — REV строится лениво в applyLang,
    // платформенные фразы резолвит platPhraseOf (см. 01-platform / 03-i18n)
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
  window.__WSGUI = { S, runScan: () => runScan().catch((e) => console.error("runScan:", e)), buildScanCmd, buildScanArgs, argPath, buildCheckCmd, checkWarpscout, bindProcEvents, restoreState, computePaths, buildConf, parseReport, switchTab, parseConfText, applyImportedConf, applyImportedState, applyImportedPresets, applyFoundCmd, parseEndpoint, splitEpPort, safeVal, enumOf, clampInt, sanitizeScan, sanitizeCfg, sanitizeHistoryItem, sanitizeQcItem, sanitizePresets, csvSafe, isWgKey, validateAccountJson, normWinPath, isSameWinPath, isWinPathInside, migrateData, migrateAndroidLegacyData, confExportReady, defaultCfg, flushSave, histBestPing, openCompare, renderCmpBody, toggleCmp, fillCmpSelectors, exportTrendCsv, importAccount, registerHintFor, renderDataFolder, detectUdfJunction, repairUdfJunction, migrateLegacyData, applyDataRoot, exeDirName, exeFileName, resolveWarpscoutPath, wsCandidates, wsFileExists, wsDiagText, openWsFolder, updateWsFullPath, qrPagesFor, qrB64url, showConfQr, renderQrPage };

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
