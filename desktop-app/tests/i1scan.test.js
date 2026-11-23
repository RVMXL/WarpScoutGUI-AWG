/* ═══════════════════════════════════════════════════════════════
   v2.7.1 (запросы пользователя):
   1) пресеты: «Быстрый» = тот же стандарт (DEFAULT_SCAN), но 3 адреса
      на подсеть; бывший wg-прогон переименован в «noobf»
      («Без обфускации»), чтобы название не путало;
   2) кнопка «I1 из сканирования»: buildI1Cmd повторяет профиль
      последнего скана (-gen-i1/-i1-sni → -gen-junk → общий junk из
      S.cfg.obf) и печатает конфиг через «-conf - -no-report»;
      parseI1Output достаёт строку I1 из вывода (raw-форма
      «<b 0x…><r …>»); finishI1 пишет пакет в S.cfg.obf.i1 и поле конфига.
   Ноль внешних зависимостей: node:test + node:assert.
   ═══════════════════════════════════════════════════════════════ */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

const I1_RAW = "<b 0xc70000000101f1000040523185a1c3c4dc1895025c171bf5bcc2218b6ec941><r 22><b 0x725e51652e066e230f458f86a3c49c5009be32c863859adf><r 16>";
const QUIC_OUT = [
  "Using cached WARP account from warpscout-account.json",
  "",
  "Port: 2408 (pinned, phase 1 skipped)",
  "Phase 2: verifying tunnels (proto=awg): 1...",
  "  node: HK HKG (188.114.98.58:2408)",
  "Phase 2: verifying tunnels (proto=awg): done",
  "",
  "[Interface]",
  "Address = 172.16.0.2/32",
  "PrivateKey = EPwCPpMTQUl7V/cpPyacTsXVvzpmzHcQQI5abeLmylA=",
  "DNS = 1.1.1.1, 1.0.0.1",
  "Jc = 6",
  "Jmin = 10",
  "Jmax = 50",
  "I1 = " + I1_RAW,
  "",
  "[Peer]",
  "PublicKey = bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=",
  "Endpoint = 188.114.98.58:2408",
  "AllowedIPs = 0.0.0.0/0",
].join("\r\n");

function toastsOf(doc) {
  const box = doc.querySelector("#toasts");
  return (box && box.children ? box.children : []).map((el) => el.children && el.children[1] ? el.children[1].textContent : "");
}

/* ── пресеты v2.7.1 ── */

test("v2.7.1: пресет «Быстрый» = DEFAULT_SCAN с sample:3 (AWG и туннель-пинг сохранены)", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.PRESETS.fast.apply();
  assert.strictEqual(wsgui.S.scan.sample, 3, "быстрый = 3 адреса на подсеть");
  assert.strictEqual(wsgui.S.scan.proto, "awg", "протокол остаётся AWG");
  assert.strictEqual(wsgui.S.scan.tunPing, true, "туннель-пинг как в стандарте");
  assert.strictEqual(wsgui.S.scan.full, false);
  // отличается от «По умолчанию» ровно одним полем
  const fastSnap = JSON.stringify(wsgui.S.scan);
  wsgui.PRESETS.default.apply();
  assert.strictEqual(wsgui.S.scan.sample, 10);
  assert.notStrictEqual(JSON.stringify(wsgui.S.scan), fastSnap, "fast и default не должны совпадать");
});

test("v2.7.1: пресет «Без обфускации» (noobf) — прежний wg-прогон; fast ≠ noobf", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.PRESETS.noobf.apply();
  assert.strictEqual(wsgui.S.scan.proto, "wg", "noobf = обычный WireGuard");
  assert.strictEqual(wsgui.S.scan.tunPing, false);
  assert.strictEqual(wsgui.S.scan.sample, 5);
  assert.strictEqual(wsgui.S.scan.full, false);
  const noobfSnap = JSON.stringify(wsgui.S.scan);
  wsgui.PRESETS.fast.apply();
  assert.notStrictEqual(JSON.stringify(wsgui.S.scan), noobfSnap, "fast — AWG-скан, не noobf");
  assert.strictEqual(wsgui.S.scan.proto, "awg");
});

test("v2.7.1: хинты пресетов — идентификаторы словаря (t(p.hint) не вернёт сырой текст)", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  for (const name of Object.keys(wsgui.PRESETS)) {
    assert.match(wsgui.PRESETS[name].hint, /^presets\.\d+$/, "hint пресета " + name + " должен быть id словаря");
  }
});

/* ── buildI1Cmd ── */

test("v2.7.1: buildI1Cmd повторяет профиль последнего скана (-gen-i1 + -i1-sni), junk-флагов нет", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.lastRunParams = { proto: "awg", genI1: "quic", i1Sni: "apple.com", genJunk: false };
  const { cmd, prof } = wsgui.buildI1Cmd("188.114.98.58", "2408");
  assert.strictEqual(prof, "quic");
  assert.ok(cmd.indexOf("-gen-i1 quic") !== -1, "профиль из снимка последнего скана");
  assert.ok(cmd.indexOf("-i1-sni apple.com") !== -1, "SNI из снимка последнего скана");
  assert.ok(cmd.indexOf("-target 188.114.98.58") !== -1);
  assert.ok(cmd.indexOf("-port 2408") !== -1);
  assert.ok(cmd.indexOf("-conf -") !== -1, "конфиг печатается в stdout");
  assert.ok(cmd.indexOf("-no-report") !== -1, "файл отчёта не нужен");
  assert.ok(!/ -jc | -jmin | -jmax /.test(cmd), "при -gen-i1 junk не задаётся (как в buildCheckCmd)");
});

test("v2.7.1: buildI1Cmd без профиля — iCloud-зонд, junk берётся из общего S.cfg.obf", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.lastRunParams = { proto: "awg", genI1: "", genJunk: false };
  wsgui.S.cfg.obf.jc = 4; wsgui.S.cfg.obf.jmin = 40; wsgui.S.cfg.obf.jmax = 70;
  const { cmd, prof } = wsgui.buildI1Cmd("162.159.192.1", "500");
  assert.strictEqual(prof, "", "профиль пуст — скан шёл без -gen-i1");
  assert.ok(cmd.indexOf("-gen-i1") === -1);
  assert.ok(cmd.indexOf("-jc 4") !== -1, "junk из общего источника (как у скана)");
  assert.ok(cmd.indexOf("-jmin 40") !== -1);
  assert.ok(cmd.indexOf("-jmax 70") !== -1);
  // дефолтный набор 6/10/50 флагов не даёт
  wsgui.S.cfg.obf.jc = 6; wsgui.S.cfg.obf.jmin = 10; wsgui.S.cfg.obf.jmax = 50;
  const cmd2 = wsgui.buildI1Cmd("162.159.192.1", "500").cmd;
  assert.ok(!/ -jc | -jmin | -jmax /.test(cmd2), "дефолтный junk не идёт флагами");
});

test("v2.7.1: buildI1Cmd — -gen-junk последнего запуса повторяется; masque → профиль пуст", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.lastRunParams = { proto: "awg", genI1: "", genJunk: true };
  let r = wsgui.buildI1Cmd("188.114.98.58", "2408");
  assert.strictEqual(r.prof, "");
  assert.ok(r.cmd.indexOf("-gen-junk") !== -1);
  wsgui.S.lastRunParams = { proto: "masque" };
  r = wsgui.buildI1Cmd("188.114.98.58", "2408");
  assert.strictEqual(r.prof, "");
  assert.ok(r.cmd.indexOf("-gen-junk") === -1, "чужой proto не тянет gen-junk");
});

/* ── parseI1Output / finishI1 ── */

test("v2.7.1: parseI1Output достаёт I1 из вывода (raw-форма, CRLF)", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const r = wsgui.parseI1Output(QUIC_OUT);
  assert.ok(r.ok, "успешный вывод должен парситься");
  assert.strictEqual(r.i1, I1_RAW, "raw-форма должна сохраниться посимвольно");
  // iCloud-зонд (без -gen-i1) тоже материализуется
  const icloud = QUIC_OUT.replace("I1 = " + I1_RAW, "I1 = <r 2><b 0x858000010001000000000669636c6f756403636f6d0000010001c00c000100010000105a00044d583737>");
  const r2 = wsgui.parseI1Output(icloud);
  assert.ok(r2.ok);
  assert.ok(r2.i1.indexOf("69636c6f7564") !== -1 || r2.i1.indexOf("85800001") !== -1, "hex «icloud» (DNS-вопрос зонда) или магия 0x8580 в raw-пакете");
});

test("v2.7.1: parseI1Output — «no working endpoints found» и отсутствие I1 распознаются", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const noep = wsgui.parseI1Output("Port: 2408 (pinned, phase 1 skipped)\r\nno working endpoints found - try -gen-i1 quic\r\n");
  assert.strictEqual(noep.ok, false);
  assert.strictEqual(noep.reason, "noendpoints");
  const noi1 = wsgui.parseI1Output("Phase 2: verifying tunnels (proto=awg): done\r\nsome text\r\n");
  assert.strictEqual(noi1.ok, false);
  assert.strictEqual(noi1.reason, "noi1");
  const none = wsgui.parseI1Output("[Interface]\r\nI1 = none\r\n");
  assert.strictEqual(none.ok, false, "«I1 = none» не должен попасть в конфиг");
  assert.strictEqual(wsgui.parseI1Output("").ok, false);
});

test("v2.7.1: parseI1Output берёт ПОСЛЕДНИЙ I1, если строк несколько", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const buf = "[Interface]\r\nI1 = <b 0x0102>\r\n[Peer]\r\nI1 = <b 0x0a0b0c>\r\n";
  const r = wsgui.parseI1Output(buf);
  assert.ok(r.ok);
  assert.strictEqual(r.i1, "<b 0x0a0b0c>");
});

test("v2.7.1: finishI1 пишет свежий I1 в S.cfg.obf.i1 и поле конфига, тост об успехе", () => {
  const { wsgui, document } = loadApp({ nlOs: "Windows", autoDom: true });
  const before = toastsOf(document).length;
  wsgui.finishI1(QUIC_OUT, "quic", "188.114.98.58:2408");
  assert.strictEqual(wsgui.S.cfg.obf.i1, I1_RAW, "raw-форма сохранена как есть");
  assert.strictEqual(document.getElementById("cfgI1").value, I1_RAW, "поле I1 конфига заполнено");
  const ts = toastsOf(document);
  assert.strictEqual(ts.length, before + 1, "один тост о результате");
  assert.ok(ts[ts.length - 1].indexOf("quic") !== -1, "в тосте — профиль пакета");
});
