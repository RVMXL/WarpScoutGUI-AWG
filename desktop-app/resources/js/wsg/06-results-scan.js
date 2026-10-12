/* ═══ WSG · 06-results-scan — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 1641–2213.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

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
      { label: t("conf.01"), key: "endpoint" },
      { label: "PING", key: "ping" },
    ];
    // fix: при withP у warpscout ДВЕ пинговые колонки — добавляем заголовок TUN PING.
    // Раньше он отсутствовал в шапке, и все колонки после PING съезжали влево на одну:
    // в LOSS попадал TUN PING (ms), в SEEN AS — LOSS (%), в NODE — страна и т.д.
    if (withP) cols.push({ label: "TUN PING", key: "tunPing" }, { label: "LOSS", key: "loss" });
    if (withSpeed) cols.push({ label: "SPEED", key: "" });
    cols.push({ label: "SEEN AS", key: "" }, { label: "NODE", key: "node" }, { label: t("conf.02"), key: "loc" }, { label: "", key: "" });

    head.innerHTML =
      "<tr>" +
      (S.qcSelMode
        ? '<th class="th-sel"><input type="checkbox" id="selAllBox" ' +
          (visible.length && visible.every((r) => S.qcSel.indexOf(r.endpoint) !== -1) ? "checked" : "") +
          ' aria-label="' + esc(t("batch.16")) + '" title="' + esc(t("batch.16")) + '"/></th>'
        : "") +
      cols
        .map((c) => {
          const active = c.key && c.key === sortKey && sortKey !== "report";
          const arrow = active ? (sortDir === 1 ? ' <span class="th-arrow">▲</span>' : ' <span class="th-arrow">▼</span>') : "";
          const pingArrow = c.key === "ping" && sortKey === "report" && S.sortByPing ? ' <span class="th-arrow">▲</span>' : "";
          // v2.4.6 (F48): сортируемые заголовки доступны с клавиатуры и сообщают направление (aria-sort)
          return (
            '<th' + (c.key ? ' class="th-sort" tabindex="0" data-sort="' + c.key + '" title="' + t("misc.30") + '"' +
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
        emptyTitle.textContent = t("results.13");
        emptyHint.innerHTML = tF("results.14", { q: esc(S.filter) });
      } else {
        emptyTitle.textContent = t("results.10");
        emptyHint.innerHTML = t("results.11") + "<br/>" + t("results.12");
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
            ' aria-label="' + esc(t("batch.15")) + '"/></td>'
          : "";
        const cells = [
          "<td>" +
            (ep === bestEp ? '<span class="best-star" title="' + t("results.15") + '">★</span>' : "") +
            esc(ep) +
            (isNew ? '<span class="new-badge" title="' + t("results.16") + '">new</span>' : "") +
          "</td>",
          "<td>" + pingCell(r.ping) + "</td>",
          withP ? "<td>" + pingCell(r.tunPing) + "</td><td>" + lossCell(r.loss) + "</td>" : "",
          withSpeed ? "<td>" + esc(r.speed || "—") + "</td>" : "",
          '<td class="seen">' + flagEmoji(r.seenAs) + " " + esc(r.seenAs || "—") + "</td>",
          "<td>" + esc(r.node || "—") + "</td>",
          "<td>" + esc(r.loc || "—") + "</td>",
          '<td class="row-actions">' +
            '<button type="button" data-act="copy" title="' + t("results.17") + '">⧉</button>' +
            '<button type="button" data-act="cfg" title="' + t("results.18") + '">⚙</button>' +
            '<button type="button" data-act="socks" title="' + t("results.19") + '">🧦</button>' +
            '<button type="button" data-act="socks-run" title="' + t("results.20") + '">⏵</button>' +
            '<button type="button" data-act="check" title="' + t("qc.07") + '">⚡</button>' +
          "</td>",
        ];
        const sel = ep === S.selected ? " is-selected" : "";
        const torn = r.torn ? " is-torn" : "";
        if (r.torn) cells[0] = cells[0].replace("<td>", '<td data-torn="' + t("results.21") + '">');
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
          if (act === "copy") { copyText(ep, t("toasts.03")); return; }
          if (act === "cfg") {
            // v2.4.6 (F19): для MASQUE нет WG/AWG .conf — честный отказ вместо профиля не того протокола
            if (S.viewProto === "masque" || S.viewProto === "masque-h2") {
              toast(t("extra.02"), "warn");
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
            toast(tF("extra.03", { ep: ep }), "ok");
            return;
          }
          if (act === "socks") {
            $("#socksEndpoint").value = ep;
            $("#socksProto").value = S.viewProto || "awg";
            switchTab("socks");
            toast(t("toasts.07"), "ok");
            return;
          }
          if (act === "socks-run") {
            $("#socksEndpoint").value = ep;
            $("#socksProto").value = S.viewProto || "awg";
            switchTab("socks");
            if (!S.running.socks) {
              socksToggle();
              toast(tF("socks.12", { ep: ep }), "ok");
            } else {
              toast(t("socks.13"), "warn");
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
      '<span class="stat-chip">' + t("stats.01") + " <b>" + S.results.length + "</b></span>",
      '<span class="stat-chip stat-chip--ok">' + t("stats.02") + " <b>" + working.length + "</b></span>",
    ];
    if (torn) chips.push('<span class="stat-chip stat-chip--err">' + t("stats.03") + " <b>" + torn + "</b></span>");
    if (best) chips.push('<span class="stat-chip stat-chip--best" title="' + t("stats.10") + '">' + t("stats.04") + " <b>" + best + " ms</b></span>");
    if (median) chips.push('<span class="stat-chip" title="' + t("stats.11") + '">' + t("stats.05") + " <b>" + median + " ms</b></span>");
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
        '<span class="stat-chip spark" title="' + tF("stats.12", { min: min, max: max }) + '">' +
          '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true">' +
            '<polygon class="spark-area" points="' + area + '"></polygon>' +
            '<polyline class="spark-line" points="' + pts.join(" ") + '"></polyline>' +
          "</svg>" + t("stats.06") +
        "</span>"
      );
    }
    if (nodeNames.length) {
      chips.push('<span class="stat-chip" title="' + tF("stats.13", { nodes: esc(nodeNames.join(", ")) }) + '">' + t("stats.07") + " <b>" + nodeNames.length + "</b></span>");
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
          '" title="' + tF("qc.02", { port: p }) + '">' +
            "🚪 " + esc(p) + " <b>×" + ports[p] + "</b></button>"
        );
      });
    }
    if (S.diff) {
      if (S.diff.newCount) {
        chips.push('<span class="stat-chip stat-chip--new" title="' + t("stats.14") + '">' + t("stats.08") + " <b>" + S.diff.newCount + "</b></span>");
      }
      if (S.diff.gone.length) {
        chips.push(
          '<button type="button" class="stat-chip stat-chip--gone" id="chipGone" title="' +
            esc(S.diff.gone.join(", ")) +
            '">' + t("stats.09") + " <b>" + S.diff.gone.length + "</b></button>"
        );
      }
    }
    el.innerHTML = chips.join("");
    el.classList.remove("hidden");
    const goneBtn = $("#chipGone");
    if (goneBtn) {
      goneBtn.addEventListener("click", () => {
        toast(tF("stats.15", { n: S.diff.gone.length, list: S.diff.gone.join(", ") }), "warn");
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
    $("#btnRunScanLabel").textContent = run ? t("scan.run.03") : t("scan.run.02");
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
      toast(t("extra.04"), "err");
      switchTab("scan");
      return;
    }
    // для masque фильтры -node/-country/-exclude-* не применяются — buildScanArgs их вырезает
    if (!S.account && !IS_MOCK) {
      S.running.scan = false;
      setScanRunning(false);
      toast(t("scan.process.17"), "err");
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
    setPhase(t("scan.process.01"), 2);
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
        toast(t("scan.process.07"), "ok");
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
          if (mPhase1) setPhase(t("scan.process.02"), null);
          if (mPhase2) setPhase(t("scan.process.03"), null);
          if (mSpeed && !mStep) setPhase(t("scan.process.04"), null);
          if (mStep) {
            const frac = (+mStep[1] / Math.max(1, +mStep[2])) * 100;
            setPhase(mPhase2 ? t("scan.process.03") : t("scan.process.02"), frac);
          }
        } else if (d.type === "exit") {
          unregisterProc(proc.id);
          // v2.4.6 (F31): устаревшая сессия не трогает UI
          if (S.scanSession !== runId) return;
          setPhase(S.scanStopped ? t("scan.process.05") : t("scan.process.06"), 100);
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
            toast(t("scan.process.07"), "ok");
          }
        }
      });
    } catch (e) {
      S.running.scan = false;
      setScanRunning(false);
      stopScanLive();
      toast(tF("extra.05", { err: e && e.message ? e.message : e }), "err");
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
      appendLog($("#scanLog"), "\n[GUI] " + t("extra.06") + "\n");
      if (exitCode !== 0) {
        toast(tF("scan.process.09", { code: exitCode }), "err");
        switchSubtab("log");
      } else {
        toast(t("scan.process.10"), "err");
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
    if (IS_ANDROID) mirrorPublic(S.paths.reportPath).then((pub) => { if (pub) toast(tF("conf.56", { p: pub }), "info"); });
    const working = S.results.filter((r) => !r.torn).length;
    const torn = S.results.length - working;
    // v2.4.6 (F35): отчёт есть, но exit ненулевой — честно показываем фактический код
    if (exitCode !== 0) {
      appendLog($("#scanLog"), "\n[GUI] " + tF("extra.07", { c: exitCode }) + "\n");
      toast(tF("extra.08", { c: exitCode }), "warn");
    }
    if (working > 0) {
      toast(torn ? tF("scan.process.12", { n: working, t: torn }) : tF("scan.process.11", { n: working }), "ok");
    } else {
      toast(torn ? tF("scan.process.16", { t: torn }) : t("scan.process.13"), "err");
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
    toast(t("scan.process.07"), "ok");
  }

