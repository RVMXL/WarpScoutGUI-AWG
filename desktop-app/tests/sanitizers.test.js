/* ARCH-4 (аудит): юнит-тесты санитайзеров и валидаторов — границы доверия.
   Находки, зафиксированные тестами: F01 (enum→shell), F03 (HTML в числах),
   F07 (safeVal — один argv-токен), F08 (схема импорта), F10 (CSV-инъекция). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

const { wsgui } = loadApp({ nlOs: "Windows" });

/* ── safeVal: значение обязано быть ОДНИМ argv-токеном (F07) ── */
test("safeVal: вырезает пробелы и shell-символы", () => {
  assert.strictEqual(wsgui.safeVal("1.1.1.1 -f -n 256"), "1.1.1.1-f-n256");
  assert.strictEqual(wsgui.safeVal("host&echo pwned"), "hostechopwned");
  assert.strictEqual(wsgui.safeVal('a"b|c`d'), "abcd");
  assert.strictEqual(wsgui.safeVal(null), "");
  assert.strictEqual(wsgui.safeVal(123), "123");
});

/* ── enumOf: только значения из списка ── */
test("enumOf: whitelist/fallback", () => {
  assert.strictEqual(wsgui.enumOf("awg", ["wg", "awg"], "wg"), "awg");
  assert.strictEqual(wsgui.enumOf("awg -f", ["wg", "awg"], "wg"), "wg");
  assert.strictEqual(wsgui.enumOf(undefined, ["wg", "awg"], "wg"), "wg");
});

/* ── clampInt ── */
test("clampInt: округление, NaN, границы", () => {
  assert.strictEqual(wsgui.clampInt(5.6, 1, 10, 3), 6);
  assert.strictEqual(wsgui.clampInt("abc", 1, 10, 3), 3);
  assert.strictEqual(wsgui.clampInt(0, 1, 10, 3), 1);
  assert.strictEqual(wsgui.clampInt(99, 1, 10, 3), 10);
  assert.strictEqual(wsgui.clampInt("abc", 1, 10, null), 1);
});

/* ── sanitizeScan: F01 — импортированный enum не меняет структуру команды ── */
test("sanitizeScan: proto-инъекция отбрасывается к дефолту (F01)", () => {
  const s = wsgui.sanitizeScan({ proto: 'awg" & echo pwned &' });
  assert.strictEqual(s.proto, "awg");
  const s2 = wsgui.sanitizeScan({ proto: "wg -extra-flag" });
  assert.strictEqual(s2.proto, "awg"); // не в whitelist → дефолт
  const s3 = wsgui.sanitizeScan({ proto: "masque" });
  assert.strictEqual(s3.proto, "masque");
});

test("sanitizeScan: числовые поля зажаты; target сохраняется строкой (вырезание — в buildScanArgs)", () => {
  const s = wsgui.sanitizeScan({ sample: 9999, port: "70000", jt: -5, timeout: 1000, target: "1.1.1.1 & echo x" });
  assert.strictEqual(s.sample, 256);
  assert.strictEqual(s.port, 65535);
  assert.strictEqual(s.jt, 1);
  assert.strictEqual(s.timeout, 30);
  assert.strictEqual(s.target, "1.1.1.1 & echo x"); // strField: обрезка длины, без вырезания
});

test("sanitizeScan: пустые числовые остаются пустыми, bool'ы нормализуются", () => {
  const s = wsgui.sanitizeScan({ port: "", jc: null, jmin: undefined, full: 1, ipv6: "yes" });
  assert.strictEqual(s.port, "");
  assert.strictEqual(s.jc, "");
  assert.strictEqual(s.jmin, "");
  assert.strictEqual(s.full, true);
  assert.strictEqual(s.ipv6, true);
});

test("sanitizeScan: не-объект → полный дефолт (F08)", () => {
  for (const bad of [null, undefined, 42, "x", [], () => {}]) {
    const s = wsgui.sanitizeScan(bad);
    assert.strictEqual(s.proto, "awg");
    assert.strictEqual(s.sample, 10);
  }
});

/* ── sanitizeCfg ── */
test("sanitizeCfg: ver/dns enum'ы, jmin<=jmax (CLI flags.go:536)", () => {
  const c = wsgui.sanitizeCfg({ ver: "awg99", dns: "paypal" });
  assert.strictEqual(c.ver, "awg31");
  assert.strictEqual(c.dns, "cloudflare");
  const c2 = wsgui.sanitizeCfg({ obf: { jmin: 5000, jmax: 10, h1: "h h", i1: "a\nb" } });
  assert.strictEqual(c2.obf.jmin, 10);
  assert.strictEqual(c2.obf.h1, "hh"); // пробелы вырезаны
  assert.strictEqual(c2.obf.i1, "ab"); // переводы строк вырезаны
});

test("sanitizeCfg: h1..h4 дефолтятся к 1..4, s1..s4 clamp 0..65535", () => {
  const c = wsgui.sanitizeCfg({});
  assert.deepStrictEqual([c.obf.h1, c.obf.h2, c.obf.h3, c.obf.h4], ["1", "2", "3", "4"]);
  const c2 = wsgui.sanitizeCfg({ obf: { s1: 70000, s2: -3 } });
  assert.strictEqual(c2.obf.s1, 65535);
  assert.strictEqual(c2.obf.s2, 0);
});

/* ── sanitizeHistoryItem: F03 — числа, а не HTML-строки ── */
test("sanitizeHistoryItem: working/torn — intField, не HTML (F03)", () => {
  const h = wsgui.sanitizeHistoryItem({
    ts: 1700000000000, proto: "awg", label: "ok", working: "<img src=x onerror=alert(1)>", torn: "3",
    withP: true, withSpeed: false, params: { proto: "wg" },
    results: [{ endpoint: "1.2.3.4:443", ping: "12ms", torn: 1 }],
  });
  assert.strictEqual(typeof h.working, "number");
  assert.strictEqual(typeof h.torn, "number");
  assert.ok(h.working < 100000); // intField не принял мусор как число → fallback
  assert.strictEqual(h.torn, 3);
  assert.strictEqual(h.results[0].torn, true);
  assert.strictEqual(h.params.proto, "wg");
});

test("sanitizeHistoryItem: results обрезаются до 3000, пустые endpoint выбрасываются", () => {
  const many = Array.from({ length: 3100 }, (_, i) => ({ endpoint: "h" + i + ":1" }));
  const h = wsgui.sanitizeHistoryItem({ results: many });
  assert.strictEqual(h.results.length, 3000);
  const h2 = wsgui.sanitizeHistoryItem({ results: [{ endpoint: "" }, { endpoint: "a:1" }] });
  assert.strictEqual(h2.results.length, 1);
});

/* ── sanitizeQcItem: kind whitelist ── */
test("sanitizeQcItem: kind только из набора ok/torn/noanswer/error", () => {
  assert.strictEqual(wsgui.sanitizeQcItem({ ep: "a:1", kind: "ok" }).kind, "ok");
  assert.strictEqual(wsgui.sanitizeQcItem({ ep: "a:1", kind: "DROP TABLE" }).kind, "error");
  assert.strictEqual(wsgui.sanitizeQcItem({ ep: "" }), null);
});

/* ── sanitizePresets ── */
test("sanitizePresets: без имени — мимо, максимум 20", () => {
  assert.deepStrictEqual(wsgui.sanitizePresets([{ name: "", scan: {} }, null]), []);
  const list = Array.from({ length: 25 }, (_, i) => ({ name: "p" + i }));
  assert.strictEqual(wsgui.sanitizePresets(list).length, 20);
});

/* ── csvSafe: F10 / OWASP CSV Injection ── */
test("csvSafe: формульные префиксы нейтрализуются, кавычки удваиваются", () => {
  assert.strictEqual(wsgui.csvSafe("=cmd|'/c calc'!A0"), '"\'=cmd|\'/c calc\'!A0"'); // ' не трогается, " удваивается
  assert.strictEqual(wsgui.csvSafe('+1'), '"\'+1"');
  assert.strictEqual(wsgui.csvSafe("-1"), '"\'-1"');
  assert.strictEqual(wsgui.csvSafe("@x"), '"\'@x"');
  assert.strictEqual(wsgui.csvSafe('a"b'), '"a""b"');
  assert.strictEqual(wsgui.csvSafe("plain"), '"plain"');
  assert.strictEqual(wsgui.csvSafe(null), '""');
});

/* ── isWgKey: base64 32 байта ── */
test("isWgKey: ровно 43 символа + '=', декодируется в 32 байта", () => {
  const good = Buffer.alloc(32, 7).toString("base64"); // 44 chars ending '='
  assert.strictEqual(good.length, 44);
  assert.strictEqual(wsgui.isWgKey(good), true);
  assert.strictEqual(wsgui.isWgKey(good.slice(0, 43)), false); // без '='
  assert.strictEqual(wsgui.isWgKey("!!!!" + good.slice(4)), false); // недопустимые символы
  assert.strictEqual(wsgui.isWgKey(good + "="), false); // лишний символ → не 43+1
  assert.strictEqual(wsgui.isWgKey(123), false);
});

/* ── validateAccountJson: F23 (public_key алиас), неоднозначность ── */
const K32 = () => Buffer.alloc(32, 1).toString("base64");
const K32b = () => Buffer.alloc(32, 2).toString("base64");

test("validateAccountJson: не-JSON объекты отбрасываются", () => {
  assert.strictEqual(wsgui.validateAccountJson(null), "not-json");
  assert.strictEqual(wsgui.validateAccountJson([1, 2]), "not-json");
  assert.strictEqual(wsgui.validateAccountJson("x"), "not-json");
});

test("validateAccountJson: алиас public_key→peer_public_key (F23)", () => {
  const acc = { private_key: K32(), public_key: K32b() };
  assert.strictEqual(wsgui.validateAccountJson(acc), null);
  assert.strictEqual(acc.peer_public_key, acc.public_key);
});

test("validateAccountJson: неоднозначность двух разных ключей", () => {
  assert.strictEqual(wsgui.validateAccountJson({ private_key: K32(), public_key: K32(), peer_public_key: K32b() }), "ambiguous");
});

test("validateAccountJson: битые ключи → not-account", () => {
  assert.strictEqual(wsgui.validateAccountJson({ private_key: "short", peer_public_key: K32() }), "not-account");
  assert.strictEqual(wsgui.validateAccountJson({ private_key: K32() }), "not-account");
  assert.strictEqual(wsgui.validateAccountJson({ private_key: K32(), peer_public_key: K32() }), null);
});
