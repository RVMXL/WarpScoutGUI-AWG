/* ARCH-4: Windows-пути и защита миграции данных.
   Зафиксировано: F12 (алиас пути), F13 (destination внутри source). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

const { wsgui } = loadApp({ nlOs: "Windows" });

test("normWinPath: слэши обоих видов, хвостовые, регистр", () => {
  assert.strictEqual(wsgui.normWinPath("C:\\Data\\Warp\\"), "c:\\data\\warp");
  assert.strictEqual(wsgui.normWinPath("C:/Data/Warp/"), "c:\\data\\warp");
  assert.strictEqual(wsgui.normWinPath("c:\\data\\WARP"), "c:\\data\\warp");
  assert.strictEqual(wsgui.normWinPath("  C:\\Data  "), "c:\\data");
  assert.strictEqual(wsgui.normWinPath(null), "");
});

test("isSameWinPath: алиасы одного пути (F12)", () => {
  assert.strictEqual(wsgui.isSameWinPath("C:\\Data\\Warp", "c:/data/warp/"), true);
  assert.strictEqual(wsgui.isSameWinPath("C:\\Data\\Warp", "C:\\Data\\Warp2"), false);
  assert.strictEqual(wsgui.isSameWinPath("", "C:\\x"), false);
  assert.strictEqual(wsgui.isSameWinPath("C:\\x", null), false);
});

test("isWinPathInside: вложенность назначения внутри источника запрещает миграцию (F13)", () => {
  assert.strictEqual(wsgui.isWinPathInside("C:\\Data\\Warp\\reports", "C:\\Data\\Warp"), true);
  assert.strictEqual(wsgui.isWinPathInside("c:/data/warp/reports", "C:\\DATA\\WARP\\"), true); // регистр + слэши
  assert.strictEqual(wsgui.isWinPathInside("C:\\Data\\Warp", "C:\\Data\\Warp"), false); // тот же путь — не «внутри»
  assert.strictEqual(wsgui.isWinPathInside("C:\\Data\\WarpOther", "C:\\Data\\Warp"), false); // префикс-обман
  assert.strictEqual(wsgui.isWinPathInside("C:\\Data", "C:\\Data\\Warp"), false);
  assert.strictEqual(wsgui.isWinPathInside("", "C:\\x"), false);
});

test("isWinPathInside: глубина больше одного уровня", () => {
  assert.strictEqual(wsgui.isWinPathInside("C:\\a\\b\\c\\d", "C:\\a"), true);
  assert.strictEqual(wsgui.isWinPathInside("C:\\ab", "C:\\a"), false);
});
