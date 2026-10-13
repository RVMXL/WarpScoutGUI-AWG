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

/* ── v2.6.2 (аудит FE-1/FE-23): argPath — путь как ОДИН argv-токен ── */

// POSIX-токенизатор (эквивалент MainActivity.tokenizeCmd на Android и sh -c на
// Linux/macOS): одинарные/двойные кавычки, backslash-экранирование.
function posixTokens(cmd) {
  const out = [];
  let cur = "", has = false, inS = false, inD = false;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (inS) { if (c === "'") inS = false; else cur += c; }
    else if (inD) {
      if (c === '"') inD = false;
      else if (c === "\\" && i + 1 < cmd.length) { cur += cmd[++i]; }
      else cur += c;
    }
    else if (c === "'") { inS = true; has = true; }
    else if (c === '"') { inD = true; has = true; }
    else if (c === "\\" && i + 1 < cmd.length) { cur += cmd[++i]; has = true; }
    else if (c === " " || c === "\t" || c === "\n" || c === "\r") { if (has) { out.push(cur); cur = ""; has = false; } }
    else { cur += c; has = true; }
  }
  if (has) out.push(cur);
  return out;
}

// «злой» путь: двойная кавычка, $, &, backtick, ;, скобки, пробелы, одинарная кавычка
const EVIL = 'C:\\my data" & calc & echo `x` $(rm) ;(x) \'q\'';

test("FE-1: buildScanCmd — путь с метасимволами не меняет структуру команды (3 платформы)", () => {
  for (const nlOs of ["Windows", "Linux", "Android"]) {
    const { wsgui } = loadApp({ nlOs });
    wsgui.S.paths.accPath = EVIL + "\\warpscout-account.json";
    wsgui.S.paths.reportPath = EVIL + "\\report.txt";
    const cmd = wsgui.buildScanCmd({ proto: "wg" });
    if (nlOs === "Windows") {
      // cmdWinPath вырезает cmd-метасимволы → внутри двойных кавычек нет
      // символов, способных завершить токен или запустить команду
      const m = cmd.match(/-o "([^"]*)"/);
      const a = cmd.match(/-a "([^"]*)"/);
      assert.ok(m && a, nlOs + ": " + cmd);
      for (const t of [m[1], a[1]]) assert.ok(!/[&|<>^%!`"]/.test(t), nlOs + ": " + cmd); // ' внутри "…" инертен для cmd
      assert.ok(m[1].endsWith("report.txt") && a[1].endsWith("warpscout-account.json"), nlOs + ": " + cmd);
      assert.strictEqual(cmd.split('"').length % 2, 1, nlOs + ": непарные кавычки: " + cmd);
    } else {
      // POSIX/Android: psQuote → round-trip через токенизатор возвращает
      // путь байт-в-байт — инъекция невозможна по построению
      const toks = posixTokens(cmd);
      const at = (flag) => { const i = toks.indexOf(flag); return i === -1 ? null : toks[i + 1]; };
      assert.strictEqual(at("-o"), EVIL + "\\report.txt", nlOs + ": " + cmd);
      assert.strictEqual(at("-a"), EVIL + "\\warpscout-account.json", nlOs + ": " + cmd);
      // «инъекционные» фрагменты не стали отдельными argv-токенами
      for (const frag of ["calc", "echo", "rm", "pwn"]) assert.ok(!toks.includes(frag), nlOs + ": " + cmd);
    }
  }
});

test("FE-23: buildCheckCmd — acc/report одним токеном (POSIX round-trip)", () => {
  const evil = "/tmp/ws 'x' & echo pwn ;(x)/data";
  const { wsgui } = loadApp({ nlOs: "Linux" });
  wsgui.S.paths.accPath = evil + "/warpscout-account.json";
  wsgui.S.paths.reportsDir = evil + "/reports";
  const r = wsgui.buildCheckCmd("1.1.1.1", 443, "wg");
  const toks = posixTokens(r.cmd);
  const at = (flag) => { const i = toks.indexOf(flag); return i === -1 ? null : toks[i + 1]; };
  assert.strictEqual(at("-a"), evil + "/warpscout-account.json", r.cmd);
  assert.ok(String(at("-o")).startsWith(evil + "/reports/warpscout-check-"), r.cmd);
  for (const frag of ["pwn", "echo"]) assert.ok(!toks.includes(frag), r.cmd);
});

test("FE-23: argPath — Windows: метасимволы вырезаны; POSIX/Android: psQuote с удвоением '", () => {
  const w = loadApp({ nlOs: "Windows" }).wsgui;
  const winToken = w.argPath('C:\\a"b&c|d^e%f!g<h>i`j');
  assert.strictEqual(winToken, '"C:\\abcdefghij"'); // cmd-метасимволы вырезаны, кавычки на месте
  const l = loadApp({ nlOs: "Linux" }).wsgui;
  assert.strictEqual(l.argPath("/a 'b' c"), "'/a '\\''b'\\'' c'"); // POSIX: приём '\''
  const a = loadApp({ nlOs: "Android" }).wsgui;
  assert.strictEqual(a.argPath("/a 'b' c"), "'/a '\\''b'\\'' c'"); // токенизатор моста POSIX-совместим
});

test("FE-23: трипвайр — в wsg/ не осталось голой конкатенации путей -a/-o", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const dir = path.join(__dirname, "..", "resources", "js", "wsg");
  const bad = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".js")).sort()) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    if (/\s-[oa]\s?"'\s*\+/.test(src)) bad.push(f); // паттерн « -a "' + …» (фикс FE-1/FE-23)
  }
  assert.deepStrictEqual(bad, [], "голая конкатенация путей вернулась в: " + bad.join(", "));
});
