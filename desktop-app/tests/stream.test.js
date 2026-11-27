/* ═══════════════════════════════════════════════════════════════
   v2.8.0: поток -stream-json и его потребление GUI.
   CLI 0.17.0 печатает по строке на событие (schema/warpscout-v1):
   progress{phase,done,total} / endpoint{endpoint{…}} / error{error} /
   done{result{working[],torn[],picks[],best}}. Здесь — чистые функции:
   разбор строки, конвертация endpoint-объекта в строку таблицы GUI,
   done-документа — в массив результатов, а также гейт версии ядра и
   «Лучший по скорости» (F6). Сетевая часть (scanStreamFeed) не тестируется
   unit-ом — она тонкая склейка чанков над streamParseLine.
   Ноль внешних зависимостей: node:test + node:assert.
   ═══════════════════════════════════════════════════════════════ */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

/* ── wsSupports / wsSupportsStream: гейт версии ядра ── */

test("v2.8.0: wsSupports — 0.17.0+ знает -stream-json и awg31, старое ядро — нет", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const S = wsgui.S;
  S.wsVersion = "0.17.0";
  assert.strictEqual(wsgui.wsSupportsStream(), true);
  assert.strictEqual(wsgui.wsSupports31(), true);
  S.wsVersion = "0.18.1";
  assert.strictEqual(wsgui.wsSupportsStream(), true);
  S.wsVersion = "0.16.1";
  assert.strictEqual(wsgui.wsSupportsStream(), false, "0.16.x флага не знает");
  assert.strictEqual(wsgui.wsSupports31(), false);
  S.wsVersion = "";
  assert.strictEqual(wsgui.wsSupportsStream(), false, "версия неизвестна — безопасный режим");
  S.wsVersion = "мусор";
  assert.strictEqual(wsgui.wsSupportsStream(), false);
});

/* ── buildScanCmd: -stream-json добавляется только по гейту и по opts ── */

test("v2.8.0: buildScanCmd — -stream-json в команде при opts.stream и ядре 0.17+, иначе нет", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const S = wsgui.S;
  const s = { proto: "awg", tunPing: true, sample: 10 };
  S.wsVersion = "0.16.0";
  assert.ok(!wsgui.buildScanCmd(s, { stream: true }).includes("-stream-json"), "старое ядро — флага нет");
  S.wsVersion = "0.17.0";
  assert.ok(wsgui.buildScanCmd(s, { stream: true }).includes("-stream-json"), "0.17+ — флаг есть");
  assert.ok(!wsgui.buildScanCmd(s).includes("-stream-json"), "без opts.stream — флага нет (превью/legacy)");
  assert.ok(wsgui.buildScanCmd(s, { stream: true }).includes("-o "), "-o сохранён: CLI подавляет отчёт при stream, явный -o возвращает его");
});

/* ── streamParseLine: строка NDJSON → событие ── */

test("v2.8.0: streamParseLine — события схемы проходят, мусор/обрывы → null", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const p = wsgui.streamParseLine;
  const pr = p('{"event":"progress","phase":"ports","done":4,"total":12}');
  // примечание: объект создан в vm-реалме харнесса — deepStrictEqual не работает
  // (прототипы не совпадают), сравниваем поля по отдельности
  assert.strictEqual(pr.event, "progress");
  assert.strictEqual(pr.phase, "ports");
  assert.strictEqual(pr.done, 4);
  assert.strictEqual(pr.total, 12);
  const ep = p('{"event":"endpoint","endpoint":{"endpoint":"1.2.3.4:2408"}}');
  assert.strictEqual(ep.event, "endpoint");
  assert.strictEqual(p('{"event":"done","result":{"working":[]}}').event, "done");
  assert.strictEqual(p('{"event":"error","error":"phase failed"}').event, "error");
  assert.strictEqual(p(""), null, "пустая строка");
  assert.strictEqual(p("   "), null);
  assert.strictEqual(p("не json"), null);
  assert.strictEqual(p('{"broken":'), null, "обрыв чанка");
  assert.strictEqual(p("[1,2,3]"), null, "не объект");
  assert.strictEqual(p('{"no_event_field":1}'), null, "без event — не событие");
  assert.strictEqual(p(null), null);
});

/* ── streamNum: числа схемы → колонки отчёта ── */

test("v2.8.0: streamNum — 41→«41ms», 0%→«0%», null/NaN→пусто, скорость с 1 знаком", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const n = wsgui.streamNum;
  assert.strictEqual(n(41, "ms"), "41ms");
  assert.strictEqual(n(0, "%"), "0%");
  assert.strictEqual(n(12.34, "", 1), "12.3");
  assert.strictEqual(n(null, "ms"), "");
  assert.strictEqual(n(undefined, "%"), "");
  assert.strictEqual(n(NaN, "ms"), "");
  assert.strictEqual(n(Infinity, "ms"), "");
});

/* ── streamEpToRow: endpoint-объект → строка таблицы GUI ── */

test("v2.8.0: streamEpToRow — полная конвертация; null-поля → пустые колонки; loc = город, страна", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const row = wsgui.streamEpToRow({
    endpoint: "188.114.98.58:2408", ip: "188.114.98.58", port: 2408,
    seen_as: "HK", node: "HKG", node_city: "Hong Kong", node_country: "HK",
    ping_ms: 41, tun_ping_ms: 5, loss_pct: 0, speed_mbps: 12.34, measured: true, torn: false,
  });
  // vm-реалм: сравниваем поля по отдельности
  assert.strictEqual(row.endpoint, "188.114.98.58:2408");
  assert.strictEqual(row.ping, "41ms");
  assert.strictEqual(row.tunPing, "5ms");
  assert.strictEqual(row.loss, "0%");
  assert.strictEqual(row.speed, "12.3");
  assert.strictEqual(row.seenAs, "HK");
  assert.strictEqual(row.node, "HKG");
  assert.strictEqual(row.loc, "Hong Kong, HK");
  assert.strictEqual(row.torn, false);
  const q = wsgui.streamEpToRow({
    endpoint: "162.159.198.1:4500", seen_as: null, node: null, node_city: null, node_country: null,
    ping_ms: null, tun_ping_ms: null, loss_pct: null, speed_mbps: null, torn: true,
  });
  assert.strictEqual(q.ping, "");
  assert.strictEqual(q.tunPing, "");
  assert.strictEqual(q.loss, "");
  assert.strictEqual(q.seenAs, "");
  assert.strictEqual(q.node, "");
  assert.strictEqual(q.loc, "");
  assert.strictEqual(q.torn, true);
  assert.strictEqual(wsgui.streamEpToRow(null), null);
  assert.strictEqual(wsgui.streamEpToRow({ endpoint: "мусор" }), null, "не ip:port — не строка");
  assert.strictEqual(wsgui.streamEpToRow({}), null);
});

/* ── streamDoneToResults: done-документ → строки таблицы ── */

test("v2.8.0: streamDoneToResults — working+torn в порядке CLI, torn принудительно, best/picks проходят", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const ep = (endpoint, ms, t) => ({
    endpoint, ip: "0.0.0.0", port: 2408, seen_as: "DE", node: "FRA", node_city: "Frankfurt",
    node_country: "DE", ping_ms: ms, tun_ping_ms: ms, loss_pct: 0, speed_mbps: null, measured: true, torn: !!t,
  });
  const conv = wsgui.streamDoneToResults({
    version: 1, proto: "awg", total: 3, working_count: 2,
    best: "1.1.1.1:2408", picks: [ep("1.1.1.1:2408", 5)],
    working: [ep("1.1.1.1:2408", 5), ep("2.2.2.2:500", 9)],
    torn: [ep("3.3.3.3:2408", 7, true)],
  });
  assert.strictEqual(conv.results.length, 3);
  assert.strictEqual(conv.results[0].endpoint, "1.1.1.1:2408");
  assert.strictEqual(conv.results[2].endpoint, "3.3.3.3:2408");
  assert.strictEqual(conv.results[2].torn, true, "torn из torn[] принудительно true");
  assert.strictEqual(conv.best, "1.1.1.1:2408");
  assert.strictEqual(conv.picks.length, 1);
  assert.strictEqual(conv.workingCount, 2);
  const empty = wsgui.streamDoneToResults(null);
  assert.strictEqual(empty.results.length, 0);
  assert.strictEqual(empty.best, "");
});

/* ── autoI1Candidates: порядок «If nothing works», минус текущий профиль ── */

test("v2.8.0: autoI1Candidates — quic→dns→sip→stun→random, текущий исключён, пустой — все пять", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const c = wsgui.autoI1Candidates;
  // vm-реалм: массивы сравниваем через JSON-строку
  assert.strictEqual(JSON.stringify(c("")), JSON.stringify(["quic", "dns", "sip", "stun", "random"]));
  assert.strictEqual(JSON.stringify(c("quic")), JSON.stringify(["dns", "sip", "stun", "random"]));
  assert.strictEqual(JSON.stringify(c("random")), JSON.stringify(["quic", "dns", "sip", "stun"]));
  assert.strictEqual(JSON.stringify(c("stun")), JSON.stringify(["quic", "dns", "sip", "random"]));
  assert.strictEqual(JSON.stringify(c(null)), JSON.stringify(["quic", "dns", "sip", "stun", "random"]));
});

/* ── bestBySpeedOf (F6) ── */

test("v2.8.0: bestBySpeedOf — максимум SPEED среди рабочих; torn/без-замера пропускаются", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const b = wsgui.bestBySpeedOf;
  const rows = [
    { endpoint: "a:1", torn: false, speed: "10.2" },
    { endpoint: "b:2", torn: false, speed: "33.9" },
    { endpoint: "c:3", torn: true, speed: "99" },      // torn — мимо
    { endpoint: "d:4", torn: false, speed: "" },       // нет замера — мимо
    { endpoint: "e:5", torn: false, speed: "7.1" },
  ];
  assert.strictEqual(b(rows).endpoint, "b:2");
  assert.strictEqual(b([]), null);
  assert.strictEqual(b([{ endpoint: "x:1", torn: false, speed: "" }]), null);
  assert.strictEqual(b(null), null);
  // равные скорости — первый по порядку (строгая <)
  const tie = [{ endpoint: "p:1", torn: false, speed: "5" }, { endpoint: "q:1", torn: false, speed: "5.0" }];
  assert.strictEqual(b(tie).endpoint, "p:1");
});

/* ── pickRunBest: F6 — с учётом bestBySpeed, иначе пинг ── */

test("v2.8.0: pickRunBest — bestBySpeed отдаёт быстрый эндпоинт, без флага — пинговый", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const rows = [
    { endpoint: "fast:1", torn: false, speed: "50", tunPing: "80ms", ping: "40ms" },
    { endpoint: "pingy:2", torn: false, speed: "5", tunPing: "10ms", ping: "30ms" },
  ];
  const bySpeed = wsgui.pickRunBest(rows, { bestBySpeed: true });
  assert.strictEqual(bySpeed.endpoint, "fast:1");
  const byPing = wsgui.pickRunBest(rows, { bestBySpeed: false });
  assert.strictEqual(byPing.endpoint, "pingy:2", "без флага — минимальный TUN PING");
  const fallback = wsgui.pickRunBest(rows, { bestBySpeed: true });
  assert.ok(fallback, "даже с флагом всегда есть ответ при наличии рабочих");
});

/* ── sanitizeScan: autoI1 проходит границу состояния ── */

test("v2.8.0: sanitizeScan — autoI1 boolean (truthy/falsy), дефолт false — как остальные флаги скана", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  assert.strictEqual(wsgui.sanitizeScan({ autoI1: true }).autoI1, true);
  assert.strictEqual(wsgui.sanitizeScan({ autoI1: "да" }).autoI1, true, "как tunPing/full — truthy → true");
  assert.strictEqual(wsgui.sanitizeScan({ autoI1: false }).autoI1, false);
  assert.strictEqual(wsgui.sanitizeScan({ autoI1: 0 }).autoI1, false);
  assert.strictEqual(wsgui.sanitizeScan({}).autoI1, false);
  assert.strictEqual(wsgui.sanitizeScan(null).autoI1, false);
});
