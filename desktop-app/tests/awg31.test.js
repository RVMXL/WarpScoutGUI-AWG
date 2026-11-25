/* ═══════════════════════════════════════════════════════════════
   v2.7.2: поддержка warpscout 0.17.0 — профиль -p awg31.
   Источник версии AWG — «Конфиг → Версия» (S.cfg.ver), как junk —
   S.cfg.obf (v2.7.0): при «awg31» скан/проверка/SOCKS идут с -p awg31
   и таймингами 3.1 из S.cfg.obf (padding/rekey-after/rekey-timeout/
   reject-after/keepalive-timeout/max-handshakes + disable-cookies/
   random-trailers). warpscout <0.17 флага не знает — тихий откат к
   -p awg (wsSupports31 по S.wsVersion). RANGE — «N» или «MIN-MAX»,
   один argv-токен (только цифры и дефис).
   Ноль внешних зависимостей: node:test + node:assert.
   ═══════════════════════════════════════════════════════════════ */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

function set31(w) {
  // дефолтное состояние уже awg31 — фиксируем явно + версия CLI с поддержкой
  w.S.cfg.ver = "awg31";
  w.S.wsVersion = "0.17.0";
}

/* ── wsSupports31: порог 0.17.0 ── */

test("v2.7.2: wsSupports31 — semver-порог 0.17.0, мусор/пустота = false", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const set = (v) => { wsgui.S.wsVersion = v; };
  set("");      assert.strictEqual(wsgui.wsSupports31(), false, "версия неизвестна — откат");
  set(null);    assert.strictEqual(wsgui.wsSupports31(), false);
  set("мусор"); assert.strictEqual(wsgui.wsSupports31(), false);
  set("0.16");      assert.strictEqual(wsgui.wsSupports31(), false);
  set("0.16.0");    assert.strictEqual(wsgui.wsSupports31(), false);
  set("0.16.9");    assert.strictEqual(wsgui.wsSupports31(), false);
  set("0.17.0");    assert.strictEqual(wsgui.wsSupports31(), true);
  set("0.17.1");    assert.strictEqual(wsgui.wsSupports31(), true);
  set("0.17");      assert.strictEqual(wsgui.wsSupports31(), true);
  set("0.18.0");    assert.strictEqual(wsgui.wsSupports31(), true);
  set("1.0.0");     assert.strictEqual(wsgui.wsSupports31(), true);
  set("0.1.70");    assert.strictEqual(wsgui.wsSupports31(), false, "0.1.70 ≠ 0.17");
});

/* ── scanProtoOf ── */

test("v2.7.2: scanProtoOf — awg31 только при cfg.ver=awg31 И warpscout 0.17+", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  // всё на месте → awg31
  set31(wsgui);
  assert.strictEqual(wsgui.scanProtoOf("awg"), "awg31");
  assert.strictEqual(wsgui.scanProtoOf("wg"), "wg", "не-AWG протоколы не трогаются");
  assert.strictEqual(wsgui.scanProtoOf("masque"), "masque");
  // старый CLI → тихий откат
  wsgui.S.wsVersion = "0.16.0";
  assert.strictEqual(wsgui.scanProtoOf("awg"), "awg");
  // cfg.ver не awg31 → обычный awg даже на 0.17
  wsgui.S.wsVersion = "0.17.0";
  wsgui.S.cfg.ver = "awg20";
  assert.strictEqual(wsgui.scanProtoOf("awg"), "awg");
  wsgui.S.cfg.ver = "wg";
  assert.strictEqual(wsgui.scanProtoOf("awg"), "awg");
});

/* ── awg31Args ── */

test("v2.7.2: awg31Args — полный набор таймингов из S.cfg.obf (дефолты примера)", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const a = wsgui.awg31Args();
  for (const tok of [
    "-padding 27-97", "-rekey-after 116-131", "-rekey-timeout 6-9",
    "-reject-after 171-196", "-keepalive-timeout 9-16", "-max-handshakes 18-26",
    "-disable-cookies", "-random-trailers",
  ]) {
    assert.ok(a.includes(tok), tok);
  }
  assert.strictEqual(a.length, 8);
});

test("v2.7.2: awg31Args — пустота/мусор/пробелы пропускаются, off не даёт булевых флагов", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const o = wsgui.S.cfg.obf;
  o.cpa = "";            // пусто — флага нет
  o.rekeyAfter = "abc";  // не RANGE
  o.rekeyTo = "6 9";     // пробел — не один токен
  o.rejectAfter = "171; rm -rf"; // shell-мусор
  o.keepaliveTo = "16";  // одиночное N — валидно
  o.maxHs = "18-26 & del"; // хвост вырезан → не соответствует ^\d+(-\d+)?$
  o.noCookies = "off";
  o.trailers = "off";
  const a = wsgui.awg31Args();
  assert.strictEqual(a.length, 1, a.join(" | "));
  assert.strictEqual(a[0], "-keepalive-timeout 16");
});

/* ── buildScanArgs ── */

test("v2.7.2: buildScanArgs — awg + ver31 + 0.17 → -p awg31 и тайминги; junk — как раньше", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  set31(wsgui);
  wsgui.S.cfg.obf.jc = 4; wsgui.S.cfg.obf.jmin = 40; wsgui.S.cfg.obf.jmax = 70;
  const a = wsgui.buildScanArgs({ proto: "awg", tunPing: true });
  assert.ok(a.includes("-p awg31"), a.join(" "));
  assert.ok(a.includes("-jc 4") && a.includes("-jmin 40") && a.includes("-jmax 70"), "junk из S.cfg.obf");
  assert.ok(a.includes("-padding 27-97"));
  assert.ok(a.includes("-rekey-after 116-131"));
  assert.ok(a.includes("-disable-cookies") && a.includes("-random-trailers"));
});

test("v2.7.2: buildScanArgs — warpscout 0.16 → тихий откат к -p awg без таймингов", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.cfg.ver = "awg31";
  wsgui.S.wsVersion = "0.16.0";
  const a = wsgui.buildScanArgs({ proto: "awg" });
  assert.ok(a.includes("-p awg"), a.join(" "));
  assert.strictEqual(a.some((x) => x.startsWith("-padding")), false);
  assert.strictEqual(a.includes("-disable-cookies"), false);
});

test("v2.7.2: buildScanArgs — cfg.ver=awg20 → -p awg даже на 0.17; wg/masque без таймингов", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.wsVersion = "0.17.0";
  wsgui.S.cfg.ver = "awg20";
  let a = wsgui.buildScanArgs({ proto: "awg" });
  assert.ok(a.includes("-p awg"));
  assert.strictEqual(a.some((x) => x.startsWith("-padding")), false);
  a = wsgui.buildScanArgs({ proto: "wg" });
  assert.ok(a.includes("-p wg"));
  assert.strictEqual(a.some((x) => x.startsWith("-padding")), false, "ver31 не влияет на wg");
  a = wsgui.buildScanArgs({ proto: "masque", masqueSni: "x.com" });
  assert.ok(a.includes("-p masque"));
  assert.strictEqual(a.some((x) => x.startsWith("-padding")), false);
});

test("v2.7.2: buildScanCmd — строка содержит -p awg31 и тайминги одним блоком", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  set31(wsgui);
  const cmd = wsgui.buildScanCmd({ proto: "awg", tunPing: true, sample: 3 });
  assert.ok(cmd.includes("-p awg31"), cmd);
  assert.ok(cmd.includes("-padding 27-97 -rekey-after 116-131"), cmd);
  assert.ok(cmd.includes("-random-trailers"), cmd);
});

/* ── buildCheckCmd / buildI1Cmd ── */

test("v2.7.2: buildCheckCmd — повторяет -p awg31 последнего скана (gen-i1 + тайминги)", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  set31(wsgui);
  wsgui.S.lastRunParams = { proto: "awg", genI1: "quic", i1Sni: "apple.com", genJunk: false };
  const { cmd } = wsgui.buildCheckCmd("188.114.98.58", "2408", "awg");
  assert.ok(cmd.includes("-p awg31"), cmd);
  assert.ok(cmd.includes("-gen-i1 quic"), cmd);
  assert.ok(cmd.includes("-i1-sni apple.com"), cmd);
  assert.ok(cmd.includes("-padding 27-97"), cmd);
  assert.ok(cmd.includes("-rekey-timeout 6-9"), cmd);
  assert.ok(!/ -jc | -jmin | -jmax /.test(cmd), "gen-i1-ветка junk-флагов не даёт");
});

test("v2.7.2: buildCheckCmd — 0.16 → -p awg без таймингов (ветка junk жива)", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.cfg.ver = "awg31";
  wsgui.S.wsVersion = "0.16.0";
  wsgui.S.lastRunParams = { proto: "awg", genI1: "", genJunk: false };
  wsgui.S.cfg.obf.jc = 4; wsgui.S.cfg.obf.jmin = 40; wsgui.S.cfg.obf.jmax = 70;
  const { cmd } = wsgui.buildCheckCmd("188.114.98.58", "2408", "awg");
  assert.ok(cmd.includes("-p awg "), cmd);
  assert.ok(cmd.includes("-jc 4"), cmd);
  assert.strictEqual(cmd.includes("-padding"), false);
});

test("v2.7.2: buildI1Cmd — мини-скан с -p awg31, профилем и таймингами; -conf - сохранён", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  set31(wsgui);
  wsgui.S.lastRunParams = { proto: "awg", genI1: "dns", genJunk: false };
  const { cmd, prof } = wsgui.buildI1Cmd("162.159.192.1", "500");
  assert.strictEqual(prof, "dns");
  assert.ok(cmd.includes("-p awg31"), cmd);
  assert.ok(cmd.includes("-gen-i1 dns"), cmd);
  assert.ok(cmd.includes("-reject-after 171-196"), cmd);
  assert.ok(cmd.includes("-max-handshakes 18-26"), cmd);
  assert.ok(cmd.includes("-conf -") && cmd.includes("-no-report"), cmd);
});

test("v2.7.2: buildI1Cmd — masque последнего запуска → без awg31-таймингов", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  set31(wsgui);
  wsgui.S.lastRunParams = { proto: "masque" };
  const { cmd } = wsgui.buildI1Cmd("188.114.98.58", "2408");
  assert.ok(cmd.includes("-p awg"), cmd, "чужой proto не тянет awg31");
  assert.strictEqual(cmd.includes("-padding"), false);
});
