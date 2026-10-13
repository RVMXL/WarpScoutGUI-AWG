/* v2.6.4 (запрос пользователя): группировка эндпоинтов для селекта конфига.
   Раньше список был плоским и «неочевидно, что верхний эндпоинт — самый
   быстрый». Теперь: лучший эндпоинт каждой ноды сверху (отсортирован по
   пингу, первый — общий лучший, ему рисуется ★), остальные — ниже.
   endpointGroups — чистая функция, на ней построены и селект, и автоселект
   лучшего после скана. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

const { wsgui } = loadApp({ nlOs: "Windows" });

/* ── лучший с каждой ноды + сортировка по пингу ── */
test("endpointGroups: лучший с каждой ноды, сортировка по пингу, звезда первому", () => {
  const rows = [
    { endpoint: "1.1.1.1:443", node: "DME", ping: "50ms", tunPing: "", torn: false },
    { endpoint: "2.2.2.2:443", node: "DME", ping: "30ms", tunPing: "", torn: false },
    { endpoint: "3.3.3.3:443", node: "FRA", ping: "70ms", tunPing: "", torn: false },
    { endpoint: "4.4.4.4:443", node: "LED", ping: "20ms", tunPing: "", torn: false },
  ];
  const g = wsgui.endpointGroups(rows);
  assert.strictEqual(g.best.endpoint, "4.4.4.4:443");
  // spread → локальный массив (объекты из vm-реалма имеют чужой Array.prototype)
  assert.deepStrictEqual(
    [...g.nodeBest.map((r) => r.endpoint)],
    ["4.4.4.4:443", "2.2.2.2:443", "3.3.3.3:443"]
  );
  // все, кроме лучших на своих нодах — в «остальные», тоже по пингу
  assert.deepStrictEqual([...g.rest.map((r) => r.endpoint)], ["1.1.1.1:443"]);
});

/* ── приоритет tunPing над ping; torn-строки исключены ── */
test("endpointGroups: tunPing приоритетнее ping, torn исключены", () => {
  const rows = [
    { endpoint: "1.1.1.1:443", node: "DME", ping: "10ms", tunPing: "90ms", torn: false },
    { endpoint: "5.5.5.5:443", node: "DME", ping: "999ms", tunPing: "40ms", torn: false },
    { endpoint: "6.6.6.6:443", node: "AMS", ping: "5ms", tunPing: "", torn: true },
  ];
  const g = wsgui.endpointGroups(rows);
  // у DME лучший по tunPing — 5.5.5.5 (40ms), а не 1.1.1.1 с ping 10ms
  assert.strictEqual(g.best.endpoint, "5.5.5.5:443");
  assert.strictEqual(g.nodeBest.length, 1); // AMS torn — ноды нет в списке
  assert.strictEqual(g.rest.length, 1);
  assert.strictEqual(g.rest[0].endpoint, "1.1.1.1:443");
});

/* ── пустые/невалидные входы ── */
test("endpointGroups: пусто и null — best null, группы пустые", () => {
  assert.strictEqual(wsgui.endpointGroups([]).best, null);
  assert.strictEqual(wsgui.endpointGroups(null).nodeBest.length, 0);
  assert.strictEqual(wsgui.endpointGroups(undefined).rest.length, 0);
  assert.strictEqual(wsgui.endpointGroups([{ torn: true }]).best, null); // только torn
  assert.strictEqual(wsgui.endpointGroups([{}]).nodeBest.length, 0); // нет endpoint
  assert.strictEqual(wsgui.endpointGroups([null]).best, null); // мусор отфильтрован
});

/* ── строка без ноды — отдельная группа «?», данные не мутируются ── */
test("endpointGroups: узел '?' для строк без ноды, вход не меняется", () => {
  const row = { endpoint: "7.7.7.7:443", node: "", ping: "", tunPing: "", torn: false };
  const g = wsgui.endpointGroups([row]);
  assert.strictEqual(g.nodeBest.length, 1);
  assert.strictEqual(g.nodeBest[0].endpoint, "7.7.7.7:443");
  assert.strictEqual(row.node, ""); // ничего не дописали в данные
});

/* ── применённый find-junk I1 доезжает до конфига (v2.6.4) ── */
test("applyFoundCmd: сырой -i1 из найденной команды попадает в cfg.obf.i1", () => {
  const { wsgui, document } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.foundCmd =
    "warpscout scan -p awg -i1 vVOOJgYTiAuqWQkbtdkH5cWkj3xhNZQbSwEeqywSD1YqJHLIUyZtGoYKQOnsyN20 -n 3";
  wsgui.applyFoundCmd();
  assert.strictEqual(
    wsgui.S.cfg.obf.i1,
    "vVOOJgYTiAuqWQkbtdkH5cWkj3xhNZQbSwEeqywSD1YqJHLIUyZtGoYKQOnsyN20"
  );
  // профиль скана тоже применён
  assert.strictEqual(wsgui.S.scan.proto, "awg");
  assert.strictEqual(wsgui.S.scan.sample, 3);
  // тост сообщает, что I1 ушёл в конфиг
  const box = document.querySelector("#toasts");
  const texts = (box && box.children ? box.children : []).map((el) =>
    el.children && el.children[1] ? el.children[1].textContent : ""
  );
  assert.ok(texts.some((x) => x.indexOf("I1") !== -1), "нет тоста про I1 → конфиг");
});
