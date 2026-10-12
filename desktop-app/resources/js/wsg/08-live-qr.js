/* ═══ WSG · 08-live-qr — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 2552–2867.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

  /* ───────── живая панель скана (v1.8.0) ───────── */
  const live = { on: false, t0: 0, timer: 0, steps: [], nodes: [] };

  function startScanLive() {
    const panel = $("#scanLive");
    if (!panel) return;
    live.on = true;
    live.t0 = Date.now();
    live.steps = [];
    live.nodes = [];
    panel.classList.remove("hidden");
    $("#scanLiveNodes").innerHTML = "";
    $("#scanLiveMeta").textContent = "";
    drawScanLive();
    clearInterval(live.timer);
    live.timer = setInterval(scanLiveClock, 1000);
    scanLiveClock();
  }

  function scanLiveClock() {
    if (!live.on) return;
    const sec = Math.floor((Date.now() - live.t0) / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    const el = $("#scanLiveElapsed");
    if (el) el.textContent = mm + ":" + ss;
    try { homeScanTick(); } catch (e) {} // v2.5.4: таймер/шаги на главной
  }

  function scanLiveFeed(data) {
    if (!live.on) return;
    // шаги N/M → тик на графике
    let m = /(\d+)\/(\d+)\s*$/.exec(String(data).trim());
    if (m) {
      live.steps.push({ t: Date.now() - live.t0, done: +m[1], total: +m[2] });
      if (live.steps.length > 600) live.steps = live.steps.slice(-400); // v2.4.6 (F36): точки графика ограничены
      drawScanLive();
    }
    // узлы "node: HK HKG (188.114.98.58:2408)"
    m = /node:\s*([A-Z]{2})\s+([A-Z]{3})\s*\(([^)]+)\)/.exec(String(data));
    if (m) {
      const key = m[1] + " " + m[2];
      if (!live.nodes.some((n) => n.key === key)) {
        live.nodes.push({ key: key, ep: m[3] });
        const box = $("#scanLiveNodes");
        if (box) {
          const chip = document.createElement("span");
          chip.className = "scan-live__node is-entering";
          chip.textContent = "🛰 " + key + " · " + m[3];
          chip.title = m[1] + " / " + m[2] + " → " + m[3];
          chip.addEventListener("animationend", () => chip.classList.remove("is-entering"), { once: true });
          box.appendChild(chip);
        }
      }
    }
    const meta = $("#scanLiveMeta");
    if (meta && live.steps.length) {
      const last = live.steps[live.steps.length - 1];
      meta.textContent = t("шагов") + " " + last.done + "/" + last.total + " · " + t("узлов") + " " + live.nodes.length;
    }
    try { homeScanTick(); } catch (e) {} // v2.5.4: шаги/узлы на главной
  }

  function drawScanLive() {
    const cv = $("#scanLiveCanvas");
    if (!cv || !cv.getContext) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 300;
    const h = 46;
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // сетка-подложка
    ctx.strokeStyle = "rgba(242,124,32,0.12)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += 28) {
      ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, h); ctx.stroke();
    }
    if (live.steps.length < 1) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "11px " + (getComputedStyle(document.body).fontFamily || "sans-serif");
      ctx.fillText(t("Ждём первый шаг прогресса…"), 8, h / 2 + 4);
      return;
    }
    const T = Math.max(8000, live.steps[live.steps.length - 1].t);
    const maxY = Math.max(1, live.steps[live.steps.length - 1].done);
    const X = (t) => 4 + (t / T) * (w - 8);
    const Y = (v) => h - 5 - (v / maxY) * (h - 14);
    // заливка под линией
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(246,139,49,0.35)");
    grad.addColorStop(1, "rgba(246,139,49,0.02)");
    ctx.beginPath();
    ctx.moveTo(X(live.steps[0].t), h - 2);
    live.steps.forEach((p) => ctx.lineTo(X(p.t), Y(p.done)));
    ctx.lineTo(X(live.steps[live.steps.length - 1].t), h - 2);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    // линия
    ctx.beginPath();
    live.steps.forEach((p, i) => (i ? ctx.lineTo(X(p.t), Y(p.done)) : ctx.moveTo(X(p.t), Y(p.done))));
    ctx.strokeStyle = "#f68b31";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();
    // точки
    live.steps.forEach((p) => {
      ctx.beginPath();
      ctx.arc(X(p.t), Y(p.done), 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffb06a";
      ctx.fill();
    });
  }

  function stopScanLive() {
    live.on = false;
    clearInterval(live.timer);
    const panel = $("#scanLive");
    if (panel) panel.classList.add("hidden");
    try { homeScanUi(); } catch (e) {} // v2.5.4: гасим индикатор на главной
  }

  /* ───────── Δ-сравнение с записью истории (v1.4.0) ───────── */
  function compareWithHistory(i) {
    const h = S.history[i];
    if (!h) return;
    const cur = new Set(S.results.map((r) => r.endpoint));
    const old = new Set(h.results.map((r) => r.endpoint));
    const newList = Array.from(cur).filter((ep) => !old.has(ep));
    const goneList = Array.from(old).filter((ep) => !cur.has(ep));
    const fmt = (list) => list.slice(0, 6).join(", ") + (list.length > 6 ? " … +" + (list.length - 6) : "");
    const panel =
      '<div class="history__cmp">' +
        '<div class="history__cmp-title">' + t("Δ сравнение с текущей таблицей:") + "</div>" +
        '<div class="history__cmp-row">' +
          '<span class="is-ok">' + t("➕ новых: ") + "<b>" + newList.length + "</b></span>" +
          (newList.length ? '<span class="history__cmp-list">' + esc(fmt(newList)) + "</span>" : "") +
        "</div>" +
        '<div class="history__cmp-row">' +
          '<span class="is-err">' + t("➖ пропали: ") + "<b>" + goneList.length + "</b></span>" +
          (goneList.length ? '<span class="history__cmp-list">' + esc(fmt(goneList)) + "</span>" : "") +
        "</div>" +
      "</div>";
    // вставляем/заменяем панель сравнения после нужного элемента
    const item = $('#historyPanel .history__item[data-hi="' + i + '"]');
    if (!item) return;
    const oldPanel = $("#historyPanel .history__cmp");
    if (oldPanel) oldPanel.remove();
    item.insertAdjacentHTML("afterend", panel);
    if (!newList.length && !goneList.length) {
      toast(t("Различий нет — наборы эндпоинтов совпадают"), "ok");
    } else {
      toast(tF("Δ: новых {n}, пропали {g}", { n: newList.length, g: goneList.length }), "info");
    }
  }

  /* ───────── компактная таблица (v1.4.0) ───────── */
  function applyCompact() {
    const wrap = $("#resultsTable");
    if (!wrap) return;
    wrap.classList.toggle("is-compact", !!S.compact);
    const btn = $("#btnDensity");
    if (btn) btn.classList.toggle("is-toggled", !!S.compact);
  }

  function toggleCompact() {
    S.compact = !S.compact;
    applyCompact();
    persist();
    toast(t(S.compact ? "Компактная таблица включена" : "Обычная таблица"), "info");
  }

  /* ───────── QR-код конфига (v1.4.0; v2.4.4: многостраничный QR для длинных конфигов — формат AmneziaVPN) ───────── */
  const QR_CHUNK = 850;      // байт данных на страницу — ровно как в qrCodeUtils.cpp Amnezia (k = 850)
  const QR_SINGLE_LIMIT = 2953; // байтовая ёмкость максимальной версии QR (40-L) — одиночный код

  function toggleQr(open) {
    setModal($("#qrModal"), open); // v2.4.6 (F47)
  }

  function qrB64url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /* Страница многостраничного QR в формате, который понимает импорт AmneziaVPN
     (importController.parseQrCodeChunk): base64url( int16be 1984 ‖ uint8 всего ‖ uint8 № ‖ uint32be длина ‖ данные ).
     Источник формата: amnezia-client core/utils/qrCodeUtils.cpp (QDataStream = big-endian,
     QByteArray сериализуется как uint32-длина + байты). */
  function qrPagesFor(conf) {
    const data = new TextEncoder().encode(conf);
    const total = Math.ceil(data.length / QR_CHUNK);
    if (total > 255) return null; // номер количества страниц — quint8
    const pages = [];
    for (let p = 0; p < total; p++) {
      const chunk = data.slice(p * QR_CHUNK, (p + 1) * QR_CHUNK);
      const buf = new Uint8Array(8 + chunk.length);
      const dv = new DataView(buf.buffer);
      dv.setInt16(0, 1984, false);          // qrMagicCode = 1984
      dv.setUint8(2, total);                // chunksCount
      dv.setUint8(3, p);                    // chunkId
      dv.setUint32(4, chunk.length, false); // длина чанка (QByteArray)
      buf.set(chunk, 8);
      pages.push(qrB64url(buf));
    }
    return pages;
  }

  function qrMake(text) {
    // v2.4.6 (F29): UTF-8 энкодер — одиночный QR больше не теряет не-ASCII символы
    // (дефолтный энкодер библиотеки оставляет только младший байт символа)
    if (window.qrcode && window.qrcode.stringToBytesFuncs && window.qrcode.stringToBytesFuncs["UTF-8"]) {
      window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs["UTF-8"];
    }
    const qr = window.qrcode(0, "L"); // L — максимальная ёмкость (2953 байта)
    qr.addData(text);
    qr.make();
    return qr;
  }

  function renderQrPage() {
    if (!S.qrPages) return;
    const qr = qrMake(S.qrPages[S.qrPage]);
    $("#qrBox").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
    $("#qrPageLabel").textContent = tF("страница {i} из {n}", { i: S.qrPage + 1, n: S.qrPages.length });
    $("#btnQrPrev").disabled = S.qrPage === 0;
    $("#btnQrNext").disabled = S.qrPage === S.qrPages.length - 1;
  }

  function showConfQr() {
    if (typeof window.qrcode !== "function") { toast(t("QR-модуль не загружен"), "err"); return; }
    if (!confExportReady()) return; // v2.4.6 (F27)
    const conf = buildConf();
    const tooBigErr = () => toast(tF("Конфиг {n} симв. — не помещается в QR (лимит 2953). Обычно виноват длинный I1: уберите его или сохраните конфиг файлом.", { n: conf.length }), "err");
    try {
      if (new TextEncoder().encode(conf).length <= QR_SINGLE_LIMIT) {
        // одиночный QR — как раньше (plain-текст конфига, его же читает и WireGuard)
        S.qrPages = null; S.qrPage = 0;
        $("#qrPager").classList.add("hidden");
        $("#qrBox").innerHTML = qrMake(conf).createSvgTag({ cellSize: 4, margin: 3, scalable: true });
      } else {
        // конфиг длиннее одного QR — многостраничный в формате AmneziaVPN
        const pages = qrPagesFor(conf);
        if (!pages) { tooBigErr(); return; }
        S.qrPages = pages; S.qrPage = 0;
        $("#qrPager").classList.remove("hidden");
        renderQrPage();
      }
      toggleQr(true);
    } catch (e) {
      tooBigErr();
    }
  }

  async function saveQrPng() {
    if (typeof window.qrcode !== "function") return;
    if (!confExportReady()) return; // v2.4.6 (F27)
    try {
      // v2.4.4: пересобираем страницы из АКТУАЛЬНОГО конфига (модалка могла устать от правок)
      const conf = buildConf();
      const multi = new TextEncoder().encode(conf).length > QR_SINGLE_LIMIT;
      let text = conf, pageIdx = 0, pageCount = 1;
      if (multi) {
        const pages = qrPagesFor(conf);
        if (!pages) { toast(tF("Конфиг {n} симв. — не помещается в QR (лимит 2953). Обычно виноват длинный I1: уберите его или сохраните конфиг файлом.", { n: conf.length }), "err"); return; }
        pageIdx = Math.min(S.qrPage || 0, pages.length - 1);
        text = pages[pageIdx];
        pageCount = pages.length;
      }
      const qr = window.qrcode(0, "L"); // v2.4.6 (F29): тот же уровень ECC, что в preview — 2332..2953 байт больше не «показывается, но не сохраняется»
      qr.addData(text);
      qr.make();
      const cell = 6, margin = 4, count = qr.getModuleCount();
      const size = (count + margin * 2) * cell;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#000000";
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
        }
      }
      const dataUrl = canvas.toDataURL("image/png");
      const base = ($( "#cfgFileName").textContent || "warp.conf").replace(/\.conf$/, "");
      const name = multi ? base + "-qr-" + (pageIdx + 1) + "of" + pageCount + ".png" : base + "-qr.png";
      if (IS_MOCK) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast(tF("PNG скачан: {path}", { path: name }), "ok");
        return;
      }
      const path = await os().showSaveDialog(t("Сохранить QR-код"), { defaultPath: name });
      if (!path) return;
      const base64 = dataUrl.split(",")[1];
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (fs().writeBinaryFile) await fs().writeBinaryFile(path, bytes.buffer);
      else await fs().writeFile(path, dataUrl);
      toast(tF("QR сохранён: {path}", { path: path }), "ok");
    } catch (e) {
      toast(tF("Не удалось построить QR: {err}", { err: e && e.message ? e.message : e }), "err");
    }
  }

