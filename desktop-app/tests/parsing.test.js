/* ARCH-4: разбор endpoint'ов и отчётов warpscout.
   Зафиксировано: F02 (shell-синтаксис в endpoint не проходит), F22 (IPv6-скобки),
   F28 (SPEED-колонка по фактическому заголовку, не по флагам). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

const { wsgui } = loadApp({ nlOs: "Windows" });

/* ── parseEndpoint ── */
test("parseEndpoint: IPv4 host:port", () => {
  assert.strictEqual(JSON.stringify(wsgui.parseEndpoint("1.2.3.4:443")), '{"host":"1.2.3.4","port":443}');
});

test("parseEndpoint: [IPv6]:port — скобки снимаются (F22)", () => {
  assert.strictEqual(JSON.stringify(wsgui.parseEndpoint("[2606:4700::1]:8080")), '{"host":"2606:4700::1","port":8080}');
  // F22: «адрес с лишними скобками» в команде не проходит — форма без скобок тоже валидна
  assert.strictEqual(JSON.stringify(wsgui.parseEndpoint("2606:4700::1:8080")), '{"host":"2606:4700::1","port":8080}');
});

test("parseEndpoint: shell-синтаксис не проходит (F02)", () => {
  for (const bad of ["1.2.3.4:443 & echo x", "1.2.3.4:443;rm -rf", "a'b:1", "x|y:1", "1.2.3.4:443\\x", "$(x):1", "a`b:1"]) {
    assert.strictEqual(wsgui.parseEndpoint(bad), null, bad);
  }
});

test("parseEndpoint: границы порта и мусор", () => {
  assert.strictEqual(wsgui.parseEndpoint("1.2.3.4:0"), null);
  assert.strictEqual(wsgui.parseEndpoint("1.2.3.4:70000"), null);
  assert.strictEqual(wsgui.parseEndpoint("1.2.3.4:abc"), null);
  assert.strictEqual(wsgui.parseEndpoint("1.2.3.4"), null);
  assert.strictEqual(wsgui.parseEndpoint(":443"), null);
  assert.strictEqual(wsgui.parseEndpoint(""), null);
  assert.strictEqual(wsgui.parseEndpoint(null), null);
  assert.strictEqual(JSON.stringify(wsgui.parseEndpoint("host:65535")), '{"host":"host","port":65535}');
});

test("splitEpPort: прокси-формат {ip, port:String}", () => {
  assert.strictEqual(JSON.stringify(wsgui.splitEpPort("1.2.3.4:443")), '{"ip":"1.2.3.4","port":"443"}');
  assert.strictEqual(wsgui.splitEpPort("nope"), null);
});

/* ── parseReport: формат CLI report.go «%-22s %-13s %s…», колонки по 2+ пробелам ── */
const HDR = "ENDPOINT               PING         SEEN-AS     NODE        LOCATION";
const HDR_P = "ENDPOINT               PING         TUN-PING    LOSS        SEEN-AS     NODE        LOCATION";
const HDR_SPEED = "ENDPOINT               PING         SPEED       SEEN-AS     NODE        LOCATION";

function padCols(cols) {
  // имитация CLI: каждая колонка паддится пробелами, между колонками >= 2 пробела
  return cols.map((c) => String(c).padEnd(13, " ")).join("  ").replace(/ +$/, "");
}

test("parseReport: базовая таблица без SPEED и TUN", () => {
  const text = [HDR, padCols(["1.2.3.4:443", "12ms", "RU-1", "node-a", "Frankfurt, DE"]), "", "# comment"].join("\n");
  const rows = wsgui.parseReport(text, false, false);
  assert.strictEqual(rows.length, 1);
  const r = rows[0];
  assert.strictEqual(r.endpoint, "1.2.3.4:443");
  assert.strictEqual(r.ping, "12ms");
  assert.strictEqual(r.tunPing, "");
  assert.strictEqual(r.speed, "");
  assert.strictEqual(r.seenAs, "RU-1");
  assert.strictEqual(r.node, "node-a");
  assert.strictEqual(r.loc, "Frankfurt, DE");
  assert.strictEqual(r.torn, false);
});

test("parseReport: F28 — SPEED-колонка определяется по ЗАГОЛОВКУ, не по флагу", () => {
  const text = [HDR_SPEED, padCols(["1.2.3.4:443", "12ms", "4.5 Mb/s", "RU-1", "node-a", "Frankfurt DE"])].join("\n");
  // withSpeed=false передан намеренно: наличие колонки решает заголовок (report.go:333)
  const rows = wsgui.parseReport(text, false, false);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].speed, "4.5 Mb/s");
  assert.strictEqual(rows[0].seenAs, "RU-1");
  // и наоборот: флаг true при заголовке без SPEED не сдвигает колонки
  const text2 = [HDR, padCols(["1.2.3.4:443", "12ms", "RU-1", "node-a", "Frankfurt DE"])].join("\n");
  const rows2 = wsgui.parseReport(text2, false, true);
  assert.strictEqual(rows2[0].speed, "");
  assert.strictEqual(rows2[0].seenAs, "RU-1");
});

test("parseReport: зона torn down помечает строки (torn:true)", () => {
  const text = [
    HDR,
    padCols(["1.2.3.4:443", "12ms", "RU-1", "node-a", "Frankfurt DE"]),
    "# 1 torn down",
    padCols(["5.6.7.8:443", "30ms", "RU-2", "node-b", "Berlin DE"]),
  ].join("\n");
  const rows = wsgui.parseReport(text, false, false);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].torn, false);
  assert.strictEqual(rows[1].torn, true);
});

test("parseReport: режим -P (TUN-PING + LOSS колонки)", () => {
  const text = [HDR_P, padCols(["1.2.3.4:443", "12ms", "9ms", "0%", "RU-1", "node-a", "Frankfurt DE"])].join("\n");
  const rows = wsgui.parseReport(text, true, false);
  assert.strictEqual(rows[0].tunPing, "9ms");
  assert.strictEqual(rows[0].loss, "0%");
});

test("parseReport: NODE ENDPOINT-заголовок (nodebest) не перезаписывает rows-режим", () => {
  const text = [HDR, padCols(["1.2.3.4:443", "12ms", "RU-1", "node-a", "Frankfurt DE"]), "NODE ENDPOINT          PING", padCols(["1.2.3.4:443", "9ms", "RU-1", "node-a", "Frankfurt DE"])].join("\n");
  const rows = wsgui.parseReport(text, false, false);
  // строка после NODE-заголовка всё равно парсится (зона nodebest не исключает разбор)
  assert.ok(rows.length >= 1);
  assert.strictEqual(rows[0].endpoint, "1.2.3.4:443");
});
