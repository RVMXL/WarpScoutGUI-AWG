/* ARCH-4: построение команд скана — граница «данные → shell».
   Зафиксировано: F01 (импортированный enum не меняет структуру команды),
   F07 (значение — один argv-токен), платформенные инварианты (win/linux/android). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

/* ── buildScanArgs: безобидный скан ── */
test("buildScanArgs: минимальный скан — -p, clamp -n, -plain", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const a = wsgui.buildScanArgs({ proto: "wg", full: false, sample: 5 });
  assert.ok(a.includes("-p wg"));
  assert.ok(a.includes("-plain"));
  assert.ok(!a.some((x) => x.startsWith("-n "))); // sample=5 — дефолт, флаг не нужен
});

test("buildScanArgs: F01 — инъекция в enum падает к дефолту, команда не меняет структуру", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const a = wsgui.buildScanArgs({ proto: 'awg" & start calc & echo "' });
  assert.ok(a.includes("-p awg"));
  assert.ok(!a.join(" ").includes("start calc"));
});

test("buildScanArgs: F07 — target с пробелами/метасимволами становится одним токеном", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const a = wsgui.buildScanArgs({ proto: "wg", target: "1.1.1.1 -f & echo x" });
  const t = a.find((x) => x.startsWith("-target "));
  // & и пробелы вырезаны → фрагмент склеен в ОДИН токен, структуры команды нет
  assert.strictEqual(t, "-target 1.1.1.1-fechox");
  assert.ok(!a.join(" ").includes("&"));
});

test("buildScanArgs: клампы флагов (n/jt/t/jc/jmin/jmax/masque-attempts)", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const a = wsgui.buildScanArgs({
    proto: "awg", full: false, sample: 99999, jt: 200, timeout: 999,
    genJunk: false, jc: -1, jmin: 9000, jmax: 1, // jmin>jmax?? CLI-правило в sanitize; build просто клампит
    masqueAttempts: 99,
  }).join(" ");
  assert.ok(a.includes("-n 256"));
  assert.ok(a.includes("-jt 100")); // jt=0 был бы опущен (falsy) — берём 200 → clamp 100
  assert.ok(a.includes("-t 30"));
  assert.ok(a.includes("-jc 0"));
  assert.ok(a.includes("-jmin 5000"));
  assert.ok(a.includes("-jmax 1")); // билдер клампит только диапазон, порядок правит sanitizeCfg/форма
  // masque-флаги только у masque-протоколов:
  assert.ok(!a.includes("-masque-attempts"));
});

test("buildScanArgs: masque подавляет node/country, поддерживает -masque-sni/-masque-attempts", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const a = wsgui.buildScanArgs({ proto: "masque", node: "n1", country: "RU", masqueSni: "x.example", masqueAttempts: 3 }).join(" ");
  assert.ok(!a.includes("-node"));
  assert.ok(!a.includes("-country"));
  assert.ok(a.includes("-masque-sni x.example"));
  assert.ok(!a.includes("-masque-attempts")); // 3 — дефолт
});

test("buildScanArgs: AWG — gen-i1 whitelist, i1-sni только вместе с gen-i1, gen-junk vs jc/jmin/jmax", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  let a = wsgui.buildScanArgs({ proto: "awg", genI1: "quic", i1Sni: "sni.example", genJunk: true }).join(" ");
  assert.ok(a.includes("-gen-i1 quic"));
  assert.ok(a.includes("-i1-sni sni.example"));
  assert.ok(a.includes("-gen-junk"));
  assert.ok(!a.includes("-jc"));
  a = wsgui.buildScanArgs({ proto: "awg", genI1: "eval", genJunk: false, jc: 6, jmin: 10, jmax: 50 }).join(" ");
  assert.ok(!a.includes("-gen-i1")); // вне whitelist → пусто
  assert.ok(!a.includes("-jc"));     // дефолтные значения не печатаются
  a = wsgui.buildScanArgs({ proto: "awg", genI1: "", genJunk: false, jc: 9 }).join(" ");
  assert.ok(a.includes("-jc 9"));
  assert.ok(!a.includes("-i1-sni")); // без gen-i1 sni невалиден
});

test("buildScanArgs: -inner-proto только с -through и из whitelist", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  let a = wsgui.buildScanArgs({ proto: "wg", through: "hop.example", innerProto: "awg" }).join(" ");
  assert.ok(a.includes("-through hop.example"));
  assert.ok(a.includes("-inner-proto awg"));
  a = wsgui.buildScanArgs({ proto: "wg", innerProto: "awg" }).join(" "); // без through
  assert.ok(!a.includes("-inner-proto"));
  a = wsgui.buildScanArgs({ proto: "wg", through: "hop", innerProto: "eval" }).join(" ");
  assert.ok(a.includes("-inner-proto wg")); // fallback wg
});

/* ── buildScanCmd: платформенные инварианты ── */
test("buildScanCmd: Windows — exe в кавычках, -o, отчёт и аккаунт", () => {
  const { wsgui, window } = loadApp({ nlOs: "Windows", nlPath: "C:\\Program Files\\WARPScoutGUI" });
  const cmd = wsgui.buildScanCmd({ proto: "wg" });
  assert.ok(cmd.startsWith('"warpscout.exe" scan'));
  assert.ok(cmd.includes('-o "warpscout-report.txt"'));
  assert.ok(cmd.includes("-plain"));
  assert.ok(cmd.endsWith('-o "warpscout-report.txt"'));
  void window;
});

test("buildScanCmd: Linux — имя без .exe; Android — warpscout (POSIX-платформа)", () => {
  for (const nlOs of ["Linux", "Android"]) {
    const { wsgui } = loadApp({ nlOs });
    const cmd = wsgui.buildScanCmd({ proto: "wg" });
    assert.ok(cmd.startsWith('"warpscout" scan'), nlOs);
    assert.ok(!cmd.includes("warpscout.exe"), nlOs);
  }
});

test("buildScanCmd: полный скан с флагами не содержит разрывов структуры", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const s = {
    proto: "awg & echo x", // инъекция → awg
    full: true, tunPing: true, pingTarget: "1.1.1.1 & del *", tunPingCount: 999,
    ipv6: true, target: "$(evil)", node: "n&del", country: "RU`", exclNode: "x|y",
    speed: true, bestBySpeed: true,
  };
  const cmd = wsgui.buildScanCmd(s);
  for (const frag of ["& echo", "del *", "$(evil)", "n&del", "RU`", "x|y", "start", "calc"]) {
    assert.ok(!cmd.includes(frag), frag);
  }
  assert.ok(cmd.includes("-p awg"));
  assert.ok(cmd.includes("-ping-target 1.1.1.1del"), cmd); // &, пробелы и * вырезаны → один токен
  assert.ok(cmd.includes("-f") && !cmd.includes("-n "));
  assert.ok(cmd.includes("-6") && cmd.includes("-speed") && cmd.includes("-best-by speed"));
});
