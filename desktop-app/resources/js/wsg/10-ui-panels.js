/* ═══ WSG · 10-ui-panels — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 3131–3970.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

  /* ── v2.4.6 (F47): модалки — фокус сохраняем/возвращаем, фон inert,
     глобальные хоткеи не срабатывают под открытым диалогом ── */
  const MODAL_SEL = ["#kbdModal", "#qrModal", "#qcModal", "#cmpModal"];
  function openModalOf() {
    return MODAL_SEL.map((s) => $(s)).find((m) => m && !m.classList.contains("hidden")) || null;
  }
  let modalLastFocus = null;
  function setModal(el, open) {
    if (!el) return;
    el.classList.toggle("hidden", !open);
    const app = $("#app");
    const any = openModalOf();
    if (app && "inert" in app) app.inert = !!any; // фон недоступен для Tab/скринридера
    if (any) {
      if (!modalLastFocus || !any.contains(modalLastFocus)) modalLastFocus = document.activeElement;
      const card = $(".modal__card", any) || any;
      if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "-1");
      try { card.focus({ preventScroll: true }); } catch (e) { card.focus(); }
    } else if (modalLastFocus && modalLastFocus.focus) {
      try { modalLastFocus.focus({ preventScroll: true }); } catch (e) {}
      modalLastFocus = null;
    }
  }

  // v2.4.6 (F50): сегментные кнопки = настоящая радиогруппа
  // (role=radio, aria-checked, roving tabindex, стрелки)
  function setupSegGroup(group) {
    if (!group) return;
    const btns = $$(".seg__btn", group);
    btns.forEach((b) => {
      b.setAttribute("role", "radio");
      const sync = () => {
        const on = b.classList.contains("is-active");
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.setAttribute("tabindex", on ? "0" : "-1");
      };
      sync();
      if (window.MutationObserver) new MutationObserver(sync).observe(b, { attributes: true, attributeFilter: ["class"] });
    });
    group.addEventListener("keydown", (e) => {
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].indexOf(e.key) === -1) return;
      const cur = btns.indexOf(document.activeElement);
      if (cur === -1) return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const next = btns[(cur + dir + btns.length) % btns.length];
      next.focus();
      next.click();
    });
  }

  /* ───────── тема (v1.3.0) ───────── */
  // v2.4.6 (F54): параметр переименован (тень имени translator ломала переводы)
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    const b = $("#btnTheme");
    if (b) b.textContent = t(theme === "light" ? "🌙 Тёмная тема" : "☀ Светлая тема");
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = cur === "light" ? "dark" : "light";
    S.settings.theme = next;
    applyTheme(next);
    persist();
    toast(t(next === "light" ? "Светлая тема включена" : "Тёмная тема включена"), "ok");
  }

  function toggleHistory(force) {
    S.historyOpen = force != null ? force : !S.historyOpen;
    const panel = $("#historyPanel");
    panel.classList.toggle("hidden", !S.historyOpen);
    if (!S.historyOpen) return;
    // v2.4.6 (F53): журнал ⚡-проверок независим от истории сканов — рендерим
    // голову и его ВСЕГДА, placeholder относится только к истории сканов
    panel.innerHTML =
      '<div class="history__head">' +
        '<span class="history__head-title">' + t("Последние сканы (хранятся локально, до 10)") + "</span>" +
        '<span class="history__tools">' +
          '<button type="button" id="btnHistCmp" title="' + t("Сравнить два скана из истории (модалка)") + '">' + t("⇅ сравнить") + "</button>" +
          '<button type="button" id="btnHistCsv" title="' + t("Сохранить итоги истории (CSV)") + '">' + t("⬇ CSV (итоги)") + "</button>" +
          '<button type="button" id="btnHistExport" title="' + t("Выгрузить всю историю в JSON-файл") + '">⬇ JSON</button>' +
          '<button type="button" id="btnHistClear" class="history__clear" title="' + t("Удалить всю историю") + '">' + t("🗑 Очистить") + "</button>" +
        "</span>" +
      "</div>" +
      (S.history.length
        ? renderPingTrend() +
          S.history
            .map(
              (h, i) =>
                '<button type="button" class="history__item" data-hi="' + i + '">' +
                  '<span class="history__ts">' + fmtTime(h.ts) + "</span>" +
                  '<span class="history__proto">' + esc(String(h.proto).toUpperCase()) + "</span>" +
                  '<span class="history__label">' + esc(h.label) + "</span>" +
                  '<span class="history__cnt ' + (h.working ? "is-ok" : "is-err") + '">' +
                    esc(h.working) + " " + t("рабочих") + (h.torn ? " / " + esc(h.torn) + " " + t("разорвано") : "") + // v2.4.6 (F03): счётчики — только как текст
                  "</span>" +
                  '<span class="history__cmp-btn" role="button" tabindex="0" data-cmp="' + i +
                  '" title="' + t("Δ сравнить с текущей таблицей (без загрузки)") + '">Δ</span>' +
                "</button>"
            )
            .join("")
        : '<div class="history__empty">' + t("История сканов пуста — выполните первый скан.") + "</div>");
    const bExp = $("#btnHistExport");
    if (bExp) bExp.addEventListener("click", exportHistory);
    const bCsv = $("#btnHistCsv");
    if (bCsv) bCsv.addEventListener("click", exportHistoryCsv);
    const bCmp = $("#btnHistCmp");
    if (bCmp) bCmp.addEventListener("click", openCompare);
    const bTrCsv = $("#btnTrendCsv");
    if (bTrCsv) bTrCsv.addEventListener("click", (e) => { e.stopPropagation(); exportTrendCsv(); });
    const bTrPng = $("#btnTrendPng");
    if (bTrPng) bTrPng.addEventListener("click", (e) => { e.stopPropagation(); exportTrendPng(); });
    const bTrSvg = $("#btnTrendSvg");
    if (bTrSvg) bTrSvg.addEventListener("click", (e) => { e.stopPropagation(); exportTrendSvg(); });
    const bClr = $("#btnHistClear");
    if (bClr) bClr.addEventListener("click", clearHistory);
    $$(".history__item", panel).forEach((b) =>
      b.addEventListener("click", (e) => {
        if (e.target.closest("[data-cmp]")) return;
        loadHistory(+b.getAttribute("data-hi"));
      })
    );
    $$("[data-cmp]", panel).forEach((c) => {
      c.addEventListener("click", (e) => {
        e.stopPropagation();
        compareWithHistory(+c.getAttribute("data-cmp"));
      });
      // v2.4.6 (F48): Δ управляется и с клавиатуры (Enter/Space)
      c.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          compareWithHistory(+c.getAttribute("data-cmp"));
        }
      });
    });
    $$("[data-trend]", panel).forEach((d) => {
      const go = (e) => {
        e.stopPropagation();
        loadHistory(+d.getAttribute("data-trend"));
      };
      d.addEventListener("click", go);
      d.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") go(e); });
    });
    // v2.0.0: журнал ⚡-проверок — отдельный блок под списком сканов
    renderQcJournal();
  }

  function exportHistory() {
    if (!S.history.length) { toast(t("История пуста — нечего выгружать"), "err"); return; }
    const payload = { app: "WARPSCOUT GUI", format: 1, exportedAt: new Date().toISOString(), scans: S.history };
    const json = JSON.stringify(payload, null, 2);
    const name = "warpscout-history-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".json";
    if (IS_MOCK) {
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("История выгружена: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Выгрузить историю сканов (JSON)"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, json);
        toast(tF("История сохранена: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  /* ───────── итоги истории в CSV (v1.6.0) ───────── */
  function exportHistoryCsv() {
    if (!S.history.length) { toast(t("История пуста — нечего выгружать"), "err"); return; }
    const q = csvSafe; // v2.4.6 (F10): формулы Excel не проходят
    const rows = ["datetime,proto,params,working,torn,best_ping_ms"];
    for (let i = S.history.length - 1; i >= 0; i--) {
      const h = S.history[i];
      const best = histBestPing(h);
      rows.push(
        [new Date(h.ts).toISOString(), h.proto, h.label, h.working, h.torn, best === Infinity ? "" : best]
          .map(q).join(",")
      );
    }
    const csv = "\ufeff" + rows.join("\r\n");
    const name = "warpscout-history-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".csv";
    if (IS_MOCK) {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("История CSV выгружена: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Сохранить итоги истории (CSV)"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, csv);
        toast(tF("История CSV сохранена: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  async function clearHistory() {
    if (!S.history.length) { toast(t("История и так пуста"), "ok"); return; }
    if (!confirm(tF("Удалить всю историю сканов ({n})? Текущая таблица результатов останется.", { n: S.history.length }))) return;
    S.history = [];
    renderHistoryBtn();
    toggleHistory(true); // перерисовать открытую панель
    persist();
    toast(t("История очищена"), "ok");
  }

  /* ───────── CSV динамики пинга (v1.7.0) ───────── */
  function exportTrendCsv() {
    const pts = [];
    for (let i = S.history.length - 1; i >= 0; i--) {
      const b = histBestPing(S.history[i]);
      if (b !== Infinity) pts.push({ ts: S.history[i].ts, ping: b });
    }
    if (pts.length < 1) { toast(t("Нет сканов с пингами — тренд пуст"), "err"); return; }
    const q = csvSafe; // v2.4.6 (F10)
    const rows = ["datetime,best_ping_ms"];
    pts.forEach((p) => rows.push([new Date(p.ts).toISOString(), p.ping].map(q).join(",")));
    const csv = "\ufeff" + rows.join("\r\n");
    const name = "warpscout-ping-trend-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".csv";
    if (IS_MOCK) {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("Тренд CSV выгружен: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Сохранить динамику пинга (CSV)"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, csv);
        toast(tF("Тренд CSV сохранён: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  /* ───────── PNG графика тренда (v1.9.0) ───────── */
  function trendPoints() {
    const pts = [];
    for (let i = S.history.length - 1; i >= 0; i--) {
      const b = histBestPing(S.history[i]);
      if (b !== Infinity) pts.push({ ts: S.history[i].ts, ping: b });
    }
    return pts;
  }

  function drawTrendChart(pts) {
    const W = 960, H = 380;
    const PADL = 78, PADR = 30, PADT = 104, PADB = 64;
    const scale = 2; // ретина-качество
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const bg = light ? "#f2eee6" : "#141416";
    const card = light ? "#fffdf8" : "#1d1d21";
    const ink = light ? "#26221c" : "#f0ede6";
    const sub = light ? "#6e675c" : "#9d968c";
    const grid = light ? "rgba(38,34,28,.12)" : "rgba(240,237,230,.12)";
    const accent = "#ff7a1a";
    const accentSoft = light ? "rgba(255,122,26,.22)" : "rgba(255,122,26,.28)";
    // фон + карточка
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = card;
    ctx.beginPath();
    const rx = 14;
    ctx.moveTo(rx, 22);
    ctx.arcTo(W - 22, 22, W - 22, H - 22, rx);
    ctx.arcTo(W - 22, H - 22, 22, H - 22, rx);
    ctx.arcTo(22, H - 22, 22, 22, rx);
    ctx.arcTo(22, 22, W - 22, 22, rx);
    ctx.fill();
    // шапка: заголовок слева, min/max справа на той же строке
    const pings0 = pts.map((p) => p.ping);
    const min0 = Math.min.apply(null, pings0);
    const max0 = Math.max.apply(null, pings0);
    ctx.fillStyle = ink;
    ctx.font = "600 21px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("WARPSCOUT GUI — " + t("↘ динамика лучшего пинга"), 44, 58);
    ctx.textAlign = "right";
    ctx.fillStyle = accent;
    ctx.font = "600 14px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("min " + min0 + " · max " + max0 + " ms", W - 44, 58);
    ctx.textAlign = "left";
    ctx.fillStyle = sub;
    ctx.font = "13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(pts.length + " " + t("сканов с пингами"), 44, 82);
    // данные
    const pings = pts.map((p) => p.ping);
    const min = Math.min.apply(null, pings);
    const max = Math.max.apply(null, pings);
    const span = Math.max(1, max - min);
    const lo = Math.max(0, min - span * 0.15);
    const hi = max + span * 0.15;
    const fmtV = (v) => (hi - lo < 8 ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v)));
    const xAt = (i) => PADL + (i / Math.max(1, pts.length - 1)) * (W - PADL - PADR);
    const yAt = (v) => H - PADB - ((v - lo) / Math.max(1, hi - lo)) * (H - PADT - PADB);
    // сетка + подписи оси Y
    ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "right";
    for (let g = 0; g <= 4; g++) {
      const v = lo + ((hi - lo) * g) / 4;
      const y = yAt(v);
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADL, y);
      ctx.lineTo(W - PADR, y);
      ctx.stroke();
      ctx.fillStyle = sub;
      ctx.fillText(fmtV(v) + " ms", PADL - 10, y + 4);
    }
    ctx.textAlign = "left";
    // area
    const grad = ctx.createLinearGradient(0, PADT, 0, H - PADB);
    grad.addColorStop(0, accentSoft);
    grad.addColorStop(1, "rgba(255,122,26,0)");
    ctx.beginPath();
    ctx.moveTo(xAt(0), H - PADB);
    pts.forEach((p, i) => ctx.lineTo(xAt(i), yAt(p.ping)));
    ctx.lineTo(xAt(pts.length - 1), H - PADB);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    // линия
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(xAt(i), yAt(p.ping)) : ctx.moveTo(xAt(i), yAt(p.ping))));
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();
    // точки
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(xAt(i), yAt(p.ping), 5, 0, Math.PI * 2);
      ctx.fillStyle = p.ping === min ? accent : card;
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
    // подписи дат (первая/последняя) — над футером, без пересечений
    ctx.fillStyle = sub;
    ctx.font = "12px 'Segoe UI', system-ui, sans-serif";
    const stamp = (iso) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");
    ctx.textAlign = "left";
    ctx.fillText(stamp(pts[0].ts), PADL, H - PADB + 24);
    ctx.textAlign = "right";
    ctx.fillText(stamp(pts[pts.length - 1].ts), W - PADR, H - PADB + 24);
    ctx.textAlign = "left";
    // футер
    ctx.fillStyle = sub;
    ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("WARPSCOUT GUI · " + new Date().toISOString().slice(0, 19).replace("T", " "), 44, H - 20);
    return canvas;
  }

  async function exportTrendPng() {
    const pts = trendPoints();
    if (pts.length < 2) { toast(t("Нужно минимум 2 скана с пингами"), "warn"); return; }
    try {
      const canvas = drawTrendChart(pts);
      const dataUrl = canvas.toDataURL("image/png");
      const name = "warpscout-ping-trend-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".png";
      if (IS_MOCK) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast(tF("Тренд PNG скачан: {path}", { path: name }), "ok");
        return;
      }
      const path = await os().showSaveDialog(t("Сохранить динамику пинга (PNG)"), { defaultPath: name });
      if (!path) return;
      const base64 = dataUrl.split(",")[1];
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (fs().writeBinaryFile) await fs().writeBinaryFile(path, bytes.buffer);
      else await fs().writeFile(path, dataUrl);
      toast(tF("Тренд PNG сохранён: {path}", { path: path }), "ok");
    } catch (e) {
      toast(tF("Ошибка экспорта PNG: {err}", { err: e && e.message ? e.message : e }), "err");
    }
  }

  /* ───────── SVG графика тренда (v2.0.0) ───────── */
  // Векторная копия drawTrendChart: тот же макет (шапка/сетка/градиент/точки/футер),
  // но файл масштабируется без потери качества и следует теме приложения.
  function buildTrendSvg(pts) {
    const W = 960, H = 380;
    const PADL = 78, PADR = 30, PADT = 104, PADB = 64;
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const bg = light ? "#f2eee6" : "#141416";
    const card = light ? "#fffdf8" : "#1d1d21";
    const ink = light ? "#26221c" : "#f0ede6";
    const sub = light ? "#6e675c" : "#9d968c";
    const grid = light ? "rgba(38,34,28,.12)" : "rgba(240,237,230,.12)";
    const accent = "#ff7a1a";
    const gradTop = light ? "rgba(255,122,26,.22)" : "rgba(255,122,26,.28)";
    const escX = (s) => esc(String(s));
    const pings = pts.map((p) => p.ping);
    const min = Math.min.apply(null, pings);
    const max = Math.max.apply(null, pings);
    const span = Math.max(1, max - min);
    const lo = Math.max(0, min - span * 0.15);
    const hi = max + span * 0.15;
    const fmtV = (v) => (hi - lo < 8 ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v)));
    const xAt = (i) => PADL + (i / Math.max(1, pts.length - 1)) * (W - PADL - PADR);
    const yAt = (v) => H - PADB - ((v - lo) / Math.max(1, hi - lo)) * (H - PADT - PADB);
    const f = (v) => v.toFixed(1);
    // сетка + подписи
    let gridEls = "";
    for (let g = 0; g <= 4; g++) {
      const v = lo + ((hi - lo) * g) / 4;
      const y = yAt(v);
      gridEls +=
        '<line x1="' + PADL + '" y1="' + f(y) + '" x2="' + (W - PADR) + '" y2="' + f(y) + '" stroke="' + grid + '" stroke-width="1"/>' +
        '<text x="' + (PADL - 10) + '" y="' + f(y + 4) + '" text-anchor="end" font-size="12" fill="' + sub + '" font-family="\'Segoe UI\', system-ui, sans-serif">' + escX(fmtV(v) + " ms") + "</text>";
    }
    const linePts = pts.map((p, i) => f(xAt(i)) + "," + f(yAt(p.ping))).join(" ");
    const areaPts = f(xAt(0)) + "," + (H - PADB) + " " + linePts + " " + f(xAt(pts.length - 1)) + "," + (H - PADB);
    const dots = pts
      .map((p, i) => {
        const isMin = p.ping === min;
        return (
          '<circle cx="' + f(xAt(i)) + '" cy="' + f(yAt(p.ping)) + '" r="5" fill="' + (isMin ? accent : card) + '" stroke="' + accent + '" stroke-width="2.5"><title>' +
          escX(fmtTime(p.ts) + " — " + p.ping + " ms") + "</title></circle>"
        );
      })
      .join("");
    const stamp = (iso) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");
    const min0 = Math.min.apply(null, pings);
    const max0 = Math.max.apply(null, pings);
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">' +
        "<defs><linearGradient id=\"tsg\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
          '<stop offset="0" stop-color="' + gradTop + '"/><stop offset="1" stop-color="rgba(255,122,26,0)"/>' +
        "</linearGradient></defs>" +
        '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>' +
        '<rect x="22" y="22" width="' + (W - 44) + '" height="' + (H - 44) + '" rx="14" fill="' + card + '"/>' +
        '<text x="44" y="58" font-size="21" font-weight="600" fill="' + ink + '" font-family="\'Segoe UI\', system-ui, sans-serif">' + escX("WARPSCOUT GUI — " + t("↘ динамика лучшего пинга")) + "</text>" +
        '<text x="' + (W - 44) + '" y="58" text-anchor="end" font-size="14" font-weight="600" fill="' + accent + '" font-family="\'Segoe UI\', system-ui, sans-serif">min ' + min0 + " · max " + max0 + " ms</text>" +
        '<text x="44" y="82" font-size="13" fill="' + sub + '" font-family="\'Segoe UI\', system-ui, sans-serif">' + escX(pts.length + " " + t("сканов с пингами")) + "</text>" +
        gridEls +
        '<polygon points="' + areaPts + '" fill="url(#tsg)"/>' +
        '<polyline points="' + linePts + '" fill="none" stroke="' + accent + '" stroke-width="3" stroke-linejoin="round"/>' +
        dots +
        '<text x="' + PADL + '" y="' + (H - PADB + 24) + '" font-size="12" fill="' + sub + '" font-family="\'Segoe UI\', system-ui, sans-serif">' + escX(stamp(pts[0].ts)) + "</text>" +
        '<text x="' + (W - PADR) + '" y="' + (H - PADB + 24) + '" text-anchor="end" font-size="12" fill="' + sub + '" font-family="\'Segoe UI\', system-ui, sans-serif">' + escX(stamp(pts[pts.length - 1].ts)) + "</text>" +
        '<text x="44" y="' + (H - 20) + '" font-size="11" fill="' + sub + '" font-family="\'Segoe UI\', system-ui, sans-serif">WARPSCOUT GUI · ' + new Date().toISOString().slice(0, 19).replace("T", " ") + "</text>" +
      "</svg>"
    );
  }

  async function exportTrendSvg() {
    const pts = trendPoints();
    if (pts.length < 2) { toast(t("Нужно минимум 2 скана с пингами"), "warn"); return; }
    try {
      const svg = buildTrendSvg(pts);
      const name = "warpscout-ping-trend-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".svg";
      if (IS_MOCK) {
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
        toast(tF("Тренд SVG скачан: {path}", { path: name }), "ok");
        return;
      }
      const path = await os().showSaveDialog(t("Сохранить динамику пинга (SVG)"), { defaultPath: name });
      if (!path) return;
      await fs().writeFile(path, svg);
      toast(tF("Тренд SVG сохранён: {path}", { path: path }), "ok");
    } catch (e) {
      toast(tF("Ошибка экспорта SVG: {err}", { err: e && e.message ? e.message : e }), "err");
    }
  }

  /* ───────── «Поделиться сканом»: автономный HTML-отчёт (v2.0.0) ───────── */
  function exportScanHtml() {
    if (!S.results.length) { toast(t("Нет результатов — нечего сохранять в HTML"), "err"); return; }
    const rows = S.results.slice();
    const working = rows.filter((r) => !r.torn);
    const torn = rows.length - working.length;
    const pings = working.map((r) => pingMs(r.tunPing || r.ping)).filter((v) => v !== Infinity).sort((a, b) => a - b);
    const best = pings.length ? pings[0] : 0;
    const median = pings.length ? pings[Math.floor(pings.length / 2)] : 0;
    let bestEp = "";
    if (working.length) {
      let bv = Infinity;
      working.forEach((r) => { const v = pingMs(r.tunPing || r.ping); if (v < bv) { bv = v; bestEp = r.endpoint; } });
    }
    const withP = S.viewMeta.withP;
    const withSpeed = S.viewMeta.withSpeed;
    const proto = (S.viewProto || S.scan.proto || "awg").toUpperCase();
    const when = new Date();
    const td = (v, cls) => '<td' + (cls ? ' class="' + cls + '"' : "") + ">" + esc(v == null || v === "" ? "—" : String(v)) + "</td>";
    const bodyRows = rows
      .map((r) => {
        const cls = r.torn ? "torn" : r.endpoint === bestEp ? "best" : "";
        return (
          "<tr" + (cls ? ' class="' + cls + '"' : "") + ">" +
          td((r.endpoint === bestEp ? "★ " : "") + r.endpoint, "mono") +
          td(r.ping || "?") +
          (withP ? td(r.tunPing || "?") + td(r.loss || "?") : "") +
          (withSpeed ? td(r.speed) : "") +
          td(r.seenAs) + td(r.node) + td(r.loc) +
          "</tr>"
        );
      })
      .join("\n");
    const html =
      "<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"utf-8\"/>\n" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>\n" +
      "<title>WARPSCOUT GUI — отчёт скана · " + when.toISOString().slice(0, 16).replace("T", " ") + "</title>\n" +
      "<style>\n" +
      ":root{color-scheme:dark}\n" +
      "*{box-sizing:border-box}\n" +
      "body{margin:0;padding:32px 20px;background:#141416;color:#f0ede6;font:14px/1.5 'Segoe UI',system-ui,sans-serif}\n" +
      ".card{max-width:980px;margin:0 auto;background:#1d1d21;border:1px solid rgba(240,237,230,.1);border-radius:16px;padding:28px}\n" +
      "h1{margin:0 0 6px;font-size:22px}\n" +
      ".brand{color:#ff7a1a;font-weight:700}\n" +
      ".meta{color:#9d968c;font-size:13px;margin-bottom:18px}\n" +
      ".chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}\n" +
      ".chip{border:1px solid rgba(240,237,230,.16);border-radius:999px;padding:4px 12px;font-size:12.5px;color:#cfc9bf}\n" +
      ".chip b{color:#f0ede6}\n" +
      ".chip.ok{border-color:rgba(64,192,110,.5);color:#7fd9a0}\n" +
      ".chip.err{border-color:rgba(224,82,82,.5);color:#f09a9a}\n" +
      ".chip.acc{border-color:rgba(255,122,26,.55);color:#ffb37a}\n" +
      "table{width:100%;border-collapse:collapse;font-size:13px}\n" +
      "th{ text-align:left;padding:8px 10px;border-bottom:1px solid rgba(240,237,230,.16);color:#9d968c;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase}\n" +
      "td{padding:7px 10px;border-bottom:1px solid rgba(240,237,230,.07)}\n" +
      "tr.torn td{color:#8d877d;text-decoration:line-through}\n" +
      "tr.best td{color:#ffcf9e;background:rgba(255,122,26,.06)}\n" +
      ".mono{font-family:ui-monospace,Consolas,monospace}\n" +
      ".foot{margin-top:18px;color:#6e675c;font-size:12px}\n" +
      "@media (max-width:640px){body{padding:12px 6px}.card{padding:16px}table{font-size:12px}td,th{padding:5px 6px}}\n" +
      "</style>\n</head>\n<body>\n<div class=\"card\">\n" +
      "<h1><span class=\"brand\">WARPSCOUT GUI</span> — " + esc(t("отчёт скана")) + "</h1>\n" +
      '<div class="meta">' + esc(when.toISOString().slice(0, 19).replace("T", " ") + " UTC · протокол " + proto) + "</div>\n" +
      '<div class="chips">' +
        '<span class="chip">' + esc(t("📡 всего")) + " <b>" + rows.length + "</b></span>" +
        '<span class="chip ok">' + esc(t("✅ рабочих")) + " <b>" + working.length + "</b></span>" +
        (torn ? '<span class="chip err">' + esc(t("✂ разорвано")) + " <b>" + torn + "</b></span>" : "") +
        (best ? '<span class="chip acc">' + esc(t("⚡ лучший")) + " <b>" + best + " ms</b></span>" : "") +
        (median ? '<span class="chip">' + esc(t("⚖ медиана")) + " <b>" + median + " ms</b></span>" : "") +
      "</div>\n" +
      "<table>\n<thead><tr><th>ENDPOINT</th><th>PING</th>" + (withP ? "<th>TUN PING</th><th>LOSS</th>" : "") + (withSpeed ? "<th>SPEED</th>" : "") + "<th>SEEN AS</th><th>NODE</th><th>" + esc(t("Локация узла")) + "</th></tr></thead>\n<tbody>\n" +
      bodyRows +
      "\n</tbody></table>\n" +
      '<div class="foot">' + esc(tF("Сгенерировано WARPSCOUT GUI v{v} · {d} · снимок текущей таблицы результатов", { v: "2.0.0", d: when.toISOString().slice(0, 10) })) + "</div>\n" +
      "</div>\n</body>\n</html>";
    const name = "warpscout-report-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".html";
    if (IS_MOCK) {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("HTML-отчёт выгружен: {path}", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("Сохранить HTML-отчёт"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, html);
        toast(tF("HTML-отчёт сохранён: {path}", { path: path }), "ok");
      })
      .catch((e) => toast(tF("Ошибка экспорта: {err}", { err: e && e.message ? e.message : e }), "err"));
  }

  /* ───────── модалка ⇅-сравнения двух сканов (v1.7.0) ───────── */
  function toggleCmp(open) {
    setModal($("#cmpModal"), open); // v2.4.6 (F47)
  }

  function histOptionLabel(h) {
    return fmtTime(h.ts) + " · " + h.proto.toUpperCase() + " · " + h.working + " " + t("рабочих") + (h.torn ? " / " + h.torn + " " + t("разорвано") : "");
  }

  function fillCmpSelectors(aIdx, bIdx) {
    const selA = $("#cmpSelA");
    const selB = $("#cmpSelB");
    if (!selA || !selB) return;
    const opts = S.history
      .map((h, i) => '<option value="' + i + '">' + esc(histOptionLabel(h)) + "</option>")
      .join("");
    selA.innerHTML = opts;
    selB.innerHTML = opts;
    // по умолчанию: A — более старый скан, B — более новый (или соседние записи)
    const n = S.history.length;
    selA.value = String(Math.min(aIdx != null ? aIdx : n - 1, n - 1));
    selB.value = String(Math.min(bIdx != null ? bIdx : n - 2, n - 1));
  }

  function renderCmpBody() {
    const box = $("#cmpBody");
    const selA = $("#cmpSelA");
    const selB = $("#cmpSelB");
    if (!box || !selA || !selB) return;
    const hA = S.history[+selA.value];
    const hB = S.history[+selB.value];
    if (!hA || !hB) { box.innerHTML = '<div class="cmp-empty">' + t("Нужно как минимум два скана в истории.") + "</div>"; return; }

    const mapA = {};
    hA.results.forEach((r) => { mapA[r.endpoint] = r; });
    const mapB = {};
    hB.results.forEach((r) => { mapB[r.endpoint] = r; });

    const epsA = new Set(hA.results.map((r) => r.endpoint));
    const epsB = new Set(hB.results.map((r) => r.endpoint));
    const common = Array.from(epsA).filter((ep) => epsB.has(ep));
    const onlyA = Array.from(epsA).filter((ep) => !epsB.has(ep));
    const onlyB = Array.from(epsB).filter((ep) => !epsA.has(ep));

    const bestA = histBestPing(hA);
    const bestB = histBestPing(hB);
    const deltaBest = bestA !== Infinity && bestB !== Infinity ? bestA - bestB : null;

    // строки по общим эндпоинтам с Δ-пингом
    const deltaRows = common
      .map((ep) => {
        const a = mapA[ep];
        const b = mapB[ep];
        if (a.torn || b.torn) return { ep, cls: "is-torn", text: a.torn && b.torn ? t("разорван → разорван") : t("статус изменился") };
        const pa = pingMs(a.tunPing || a.ping);
        const pb = pingMs(b.tunPing || b.ping);
        if (pa === Infinity || pb === Infinity) return null;
        const d = pa - pb;
        return { ep, pa, pb, d, cls: d < 0 ? "is-better" : d > 0 ? "is-worse" : "is-same" };
      })
      .filter(Boolean)
      .sort((x, y) => (x.d != null && y.d != null ? x.d - y.d : 0));

    const dAbs = deltaBest == null ? "" : Math.abs(deltaBest);
    const bestBlock =
      '<div class="cmp-best">' +
        '<div class="cmp-best__card">' +
          '<span class="cmp-best__label">' + t("лучший пинг A") + "</span>" +
          '<span class="cmp-best__val">' + (bestA === Infinity ? "—" : bestA + " ms") + "</span>" +
        "</div>" +
        '<div class="cmp-best__delta ' + (deltaBest == null ? "" : deltaBest > 0 ? "is-better" : deltaBest < 0 ? "is-worse" : "is-same") + '">' +
          (deltaBest == null ? t("нет данных") : deltaBest === 0 ? t("без изменений") : deltaBest > 0 ? "▼ " + tF("−{n} ms быстрее", { n: dAbs }) : "▲ +" + dAbs + " ms") +
        "</div>" +
        '<div class="cmp-best__card">' +
          '<span class="cmp-best__label">' + t("лучший пинг B") + "</span>" +
          '<span class="cmp-best__val">' + (bestB === Infinity ? "—" : bestB + " ms") + "</span>" +
        "</div>" +
      "</div>";

    const deltaTable = deltaRows.length
      ? '<table class="cmp-table"><thead><tr><th>' + t("Эндпоинт") + "</th><th>A</th><th>B</th><th>Δ</th></tr></thead><tbody>" +
        deltaRows
          .map((r) => {
            if (r.d == null) {
              return '<tr class="' + r.cls + '"><td class="cmp-ep">' + esc(r.ep) + '</td><td colspan="3">' + esc(r.text) + "</td></tr>";
            }
            const sign = r.d < 0 ? "▼" : r.d > 0 ? "▲" : "=";
            const txt = r.d === 0 ? "=" : sign + " " + Math.abs(r.d) + " ms";
            return (
              '<tr class="' + r.cls + '"><td class="cmp-ep">' + esc(r.ep) + "</td>" +
              "<td>" + r.pa + "</td><td>" + r.pb + "</td>" +
              '<td class="cmp-delta">' + txt + "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table>"
      : '<div class="cmp-empty">' + t("Нет общих живых эндпоинтов с пингом.") + "</div>";

    const setBlock =
      '<div class="cmp-sets">' +
        '<div class="cmp-set cmp-set--b"><span>➕ ' + t("только в B:") + " <b>" + onlyB.length + "</b></span>" +
          (onlyB.length ? '<span class="cmp-set__list">' + esc(onlyB.slice(0, 5).join(", ")) + (onlyB.length > 5 ? " … +" + (onlyB.length - 5) : "") + "</span>" : "") + "</div>" +
        '<div class="cmp-set cmp-set--a"><span>➖ ' + t("только в A:") + " <b>" + onlyA.length + "</b></span>" +
          (onlyA.length ? '<span class="cmp-set__list">' + esc(onlyA.slice(0, 5).join(", ")) + (onlyA.length > 5 ? " … +" + (onlyA.length - 5) : "") + "</span>" : "") + "</div>" +
        '<div class="cmp-set"><span>⇄ ' + t("общих эндпоинтов:") + " <b>" + common.length + "</b></span></div>" +
      "</div>";

    box.innerHTML = bestBlock + setBlock + '<div class="cmp-table-wrap">' + deltaTable + "</div>";
  }

  function openCompare() {
    if (S.history.length < 2) {
      toast(t("Для сравнения нужно минимум два скана — выполните ещё один."), "warn");
      return;
    }
    fillCmpSelectors(S.history.length - 1, S.history.length - 2);
    renderCmpBody();
    toggleCmp(true);
  }

  function loadHistory(i) {
    const h = S.history[i];
    if (!h) return;
    S.results = h.results.map((r) => Object.assign({}, r));
    // v2.4.6 (F18/F30): действия над загруженным сканом используют ЕГО параметры
    S.lastRunParams = h.params ? sanitizeScan(h.params) : null;
    S.prevEndpoints = null;
    S.diff = null;
    S.viewMeta = { withP: h.withP, withSpeed: h.withSpeed };
    S.viewProto = h.proto;
    S.sortByPing = false;
    S.sortKey = "report";
    S.sortDir = 1;
    resetFilterSilently();
    const firstOk = S.results.find((r) => !r.torn);
    S.selected = firstOk ? firstOk.endpoint : "";
    renderResults();
    fillEndpointSelect();
    switchSubtab("results");
    toggleHistory(false);
    toast(tF("Загружен скан от {ts} — {n} рабочих", { ts: fmtTime(h.ts), n: h.working }), "ok");
  }

  function exportCsv() {
    if (!S.results.length) { toast(t("Нет результатов для экспорта"), "err"); return; }
    const { withP, withSpeed } = S.viewMeta;
    const head = ["endpoint", "endpoint_ping", ...(withP ? ["tun_ping", "loss"] : []), ...(withSpeed ? ["speed"] : []), "seen_as", "node", "node_location", "torn"];
    const escCell = csvSafe; // v2.4.6 (F10)
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
      toast(t("CSV скачан: ") + name, "ok");
      return;
    }
    os()
      .showSaveDialog(t("Сохранить результаты CSV"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, csv);
        toast(t("CSV сохранён: ") + path, "ok");
      })
      .catch((e) => toast(t("Ошибка экспорта: ") + (e && e.message ? e.message : e), "err"));
  }

  function selectedRowInfo() {
    return S.results.find((r) => r.endpoint === S.cfg.endpoint) || null;
  }

  // v2.4.6 (F27): экспорт/копия/QR — только для ГОТОВОГО профиля (с аккаунтом).
  // Раньше сохранялся шаблон-заглушка с «xxxx» вместо адресов.
  function confExportReady() {
    if (!S.account) {
      toast(t("Сначала создайте аккаунт — в превью сейчас шаблон без ключей, такой профиль работать не будет"), "err");
      return false;
    }
    return true;
  }

  async function saveConf() {
    if (!confExportReady()) return; // v2.4.6 (F27)
    const name = $("#cfgFileName").textContent;
    let path;
    try {
      path = await os().showSaveDialog(t("Сохранить конфиг"), { defaultPath: name });
    } catch (e) { path = null; }
    if (!path) { if (IS_MOCK) toast(t("Сохранение работает только в приложении Windows"), "err"); return; }
    try {
      await fs().writeFile(path, buildConf());
      toast(tF("Конфиг сохранён: {path}", { path: path }), "ok");
    } catch (e) {
      toast(tF("Ошибка записи: {err}", { err: e && e.message ? e.message : e }), "err");
    }
  }

  async function importI1() {
    let path;
    try {
      path = await os().showOpenDialog(t("Выберите .conf с I1"), { multiSelections: false });
    } catch (e) { path = null; }
    let picked = null;
    if (Array.isArray(path) && path[0]) picked = path[0];
    else if (typeof path === "string" && path) picked = path;
    if (!picked) {
      if (IS_MOCK) toast(t("Импорт работает только в приложении"), "err");
      return;
    }
    try {
      const text = await fs().readFile(picked);
      const m = /^\s*I1\s*=\s*(.+)$/m.exec(text);
      if (m) {
        $("#cfgI1").value = m[1].trim();
        syncCfgFromInputs();
        toast(t("I1 импортирован"), "ok");
      } else {
        toast(t("В файле нет строки I1 — это не AWG-конфиг?"), "err");
      }
    } catch (e) {
      toast(t("Не удалось прочитать файл"), "err");
    }
  }

