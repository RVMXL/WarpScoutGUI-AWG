/* ═══════════════════════════════════════════════════════════════
   v2.7.3: подсказка о новой версии warpscout (issue #1, предложение 2).
   Ядро warpscout входит в комплект GUI: приложение раз за сессию
   (не чаще раза в 12 ч) читает последний релиз vernette/warpscout
   через GitHub API и при более свежей версии показывает строку ⬆
   в статус-линии сайдбара. Здесь — чистые функции: разбор тега
   релиза (wsParseTag) и решение «нужна ли подсказка» (wsUpdFor);
   сетевая часть (checkWsUpdate) молчалива и не тестируется unit-ом.
   Ноль внешних зависимостей: node:test + node:assert.
   ═══════════════════════════════════════════════════════════════ */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

/* ── wsParseTag: теги релизов vernette ── */

test("v2.7.3: wsParseTag — v0.17.0/v0.17, мусор и пустота = пусто", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const p = wsgui.wsParseTag;
  assert.strictEqual(p("v0.17.0"), "0.17.0");
  assert.strictEqual(p("v0.17"), "0.17");
  assert.strictEqual(p("0.17.1"), "0.17.1");
  assert.strictEqual(p(" v0.17.0 "), "0.17.0", "пробелы по краям не мешают");
  assert.strictEqual(p(""), "");
  assert.strictEqual(p(null), "");
  assert.strictEqual(p(undefined), "");
  assert.strictEqual(p("release"), "");
  assert.strictEqual(p("vX.Y.Z"), "");
  assert.strictEqual(p("v"), "");
});

/* ── wsUpdFor: подсказка только на более свежий релиз ── */

test("v2.7.3: wsUpdFor — свежее комплекта = версия, иначе тишина", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const u = wsgui.wsUpdFor;
  assert.strictEqual(u("0.17.0", "v0.17.1"), "0.17.1");
  assert.strictEqual(u("0.17.0", "v0.18.0"), "0.18.0");
  assert.strictEqual(u("0.16.0", "v0.17.0"), "0.17.0");
  assert.strictEqual(u("0.17", "v0.17.1"), "0.17.1");
  assert.strictEqual(u("0.17.1", "v0.17.1"), "", "тот же релиз — тишина");
  assert.strictEqual(u("0.17.2", "v0.17.1"), "", "комплект новее (свой CLI) — тишина");
  assert.strictEqual(u("0.17.0", "v0.17"), "", "равные части 0.17 — тишина");
  assert.strictEqual(u("", "v0.17.1"), "", "версия комплекта неизвестна — тишина");
  assert.strictEqual(u(null, "v0.17.1"), "");
  assert.strictEqual(u("мусор", "v0.17.1"), "");
  assert.strictEqual(u("0.17.0", ""), "", "тег не разобран — тишина");
  assert.strictEqual(u("0.17.0", "abc"), "");
  assert.strictEqual(u("0.17.0", null), "");
});
