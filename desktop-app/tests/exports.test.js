/* ═══════════════════════════════════════════════════════════════
   v2.7.0 (запросы пользователя):
   1) объединение параметров обфускации — junk-набор Jc/Jmin/Jmax
      ОДИН для «Скан» и «Конфиг» (источник — S.cfg.obf), в профиле
      скана его больше нет;
   2) экспорт конфигов для сторонних клиентов — buildClashYaml
      (Clash.Meta/mihomo: wireguard + amnezia-wg-option + MASQUE) и
      buildWireSockConf (.conf с опц. ключами Id/Ip/Ib).
   Ноль внешних зависимостей: node:test + node:assert.
   ═══════════════════════════════════════════════════════════════ */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

const ACC = {
  id: "acc-1",
  private_key: "KFS3ppV6ephP5NV89KrQ+3EPhrlPWRVH2vrEhl3x7G0=",
  peer_public_key: "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=",
  ipv4: "172.16.0.2",
  ipv6: "2606:4700:110:8109:bccc:3f71:a6b3:b806",
};
const ACC_MASQUE = Object.assign({}, ACC, {
  masque: {
    id: "m-1",
    private_key: "MHcCAQEEIPhJCZ0zMXdddddjKAUBWl0eEI7GlkVD0CJfatrfmUF1Vo=",
    peer_public_key: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEIaU7MToJm9NKp8YfGxR6r==",
    ipv4: "172.16.0.2",
    ipv6: "2606:4700:110:834d:478f:acd8:aab5:a4af",
  },
});

/* ── 1. Объединение junk-параметров (Скан = Конфиг) ── */

test("v2.7.0: buildScanArgs берёт junk из S.cfg.obf (общий источник), дефолт конфига 4/40/70 уходит флагами", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const args = wsgui.buildScanArgs(wsgui.S.scan); // DEFAULT_SCAN без junk-полей
  assert.ok(args.some((a) => a === "-jc 4"), "Jc из конфига должен попасть в команду скана");
  assert.ok(args.some((a) => a === "-jmin 40"), "Jmin из конфига должен попасть в команду скана");
  assert.ok(args.some((a) => a === "-jmax 70"), "Jmax из конфига должен попасть в команду скана");
  // правка общего источника — команда скана меняется синхронно
  wsgui.S.cfg.obf.jc = 9;
  wsgui.S.cfg.obf.jmin = 100;
  wsgui.S.cfg.obf.jmax = 200;
  const args2 = wsgui.buildScanArgs(wsgui.S.scan);
  assert.ok(args2.some((a) => a === "-jc 9"));
  assert.ok(args2.some((a) => a === "-jmin 100"));
  assert.ok(args2.some((a) => a === "-jmax 200"));
  // -gen-junk перекрывает: конкретные флаги не добавляются
  wsgui.S.scan.genJunk = true;
  const args3 = wsgui.buildScanArgs(wsgui.S.scan);
  assert.ok(args3.some((a) => a === "-gen-junk"));
  assert.ok(!args3.some((a) => /^-jc /.test(a)), "при -gen-junk конкретный jc не идёт");
});

test("v2.7.0: junk-поля «Скан» и «Конфиг» синхронизированы в обе стороны (autoDom)", () => {
  const { wsgui, document } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.cfg.ver = "awg31";
  // правка на вкладке «Скан» → общий источник + зеркала в конфиге
  document.getElementById("fJc").value = "12";
  document.getElementById("fJmin").value = "80";
  document.getElementById("fJmax").value = "120";
  wsgui.syncStateFromInputs();
  assert.strictEqual(wsgui.S.cfg.obf.jc, 12, "правка на «Скан» должна менять общий источник");
  assert.strictEqual(wsgui.S.cfg.obf.jmin, 80);
  assert.strictEqual(wsgui.S.cfg.obf.jmax, 120);
  assert.strictEqual(document.getElementById("cfgJc").value, 12, "поле «Конфиг» должно зеркалиться");
  // правка на вкладке «Конфиг» → зеркала на «Скан»
  document.getElementById("cfgJc").value = "9";
  document.getElementById("cfgJmin").value = "60";
  document.getElementById("cfgJmax").value = "90";
  wsgui.syncCfgFromInputs();
  wsgui.syncInputsFromState();
  assert.strictEqual(document.getElementById("fJc").value, 9, "поле «Скан» должно зеркалить конфиг");
  assert.strictEqual(document.getElementById("fJmin").value, 60);
  assert.strictEqual(document.getElementById("fJmax").value, 90);
  // и команда скана согласована
  const args = wsgui.buildScanArgs(wsgui.S.scan);
  assert.ok(args.some((a) => a === "-jc 9"), "команда скана согласована с общим источником");
});

test("v2.7.0: applyFoundCmd пишет найденный junk в ОБЩИЙ источник (конфиг), не в профиль скана", () => {
  const { wsgui } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.foundCmd = "warpscout scan -proto awg -P -n 10 -jc 4 -jmin 40 -jmax 70";
  wsgui.applyFoundCmd();
  assert.strictEqual(wsgui.S.cfg.obf.jc, 4);
  assert.strictEqual(wsgui.S.cfg.obf.jmin, 40);
  assert.strictEqual(wsgui.S.cfg.obf.jmax, 70);
  assert.strictEqual("jc" in wsgui.S.scan, false, "в профиле скана junk-полей больше нет");
  // jmin > jmax в найденной команде — чинится к CLI-ограничению
  const w2 = loadApp({ nlOs: "Windows", autoDom: true }).wsgui;
  w2.S.foundCmd = "warpscout scan -jc 8 -jmin 300 -jmax 100";
  w2.applyFoundCmd();
  assert.strictEqual(w2.S.cfg.obf.jmin, 100, "jmin > jmax → jmin = jmax");
  assert.strictEqual(w2.S.cfg.obf.jmax, 100);
});

/* ── 2. Clash .yaml ── */

test("v2.7.0: buildClashYaml — структура примера пользователя (AWG + MASQUE + группа + MATCH)", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.account = ACC_MASQUE;
  wsgui.S.cfg.endpoint = "162.159.195.1:500";
  wsgui.S.cfg.reserved = "108, 73, 80";
  const y = wsgui.buildClashYaml();
  // якорь и база wireguard
  assert.ok(y.includes("warp-common: &warp-common"), "нет якоря warp-common");
  assert.ok(y.includes("  type: wireguard"), "нет type: wireguard");
  assert.ok(y.includes("  private-key: " + ACC.private_key), "нет приватного ключа аккаунта");
  assert.ok(y.includes("  public-key: " + ACC.peer_public_key), "нет ключа пира");
  assert.ok(y.includes("  allowed-ips: [0.0.0.0/0, '::/0']"), "allowed-ips не как в примере (::/0 закавычен — YAML-скаляр с :)");
  assert.ok(y.includes("  reserved: [108, 73, 80]"), "reserved-байты не попали в YAML");
  assert.ok(y.includes("  mtu: 1280"), "нет MTU");
  // amnezia-wg-option: версия 3 (AWG 3.1), junk и тайминги из общего источника
  assert.ok(y.includes("  amnezia-wg-option:"), "нет блока amnezia-wg-option");
  assert.ok(y.includes("    version: 3"), "версия AWG 3.1 должна быть 3");
  assert.ok(y.includes("    s1: 0"), "нет s1");
  assert.ok(y.includes("    jc: 4"), "нет jc");
  assert.ok(y.includes("    jmin: 40"), "нет jmin");
  assert.ok(y.includes("    h1: '1'") || y.includes("    h1: 1"), "нет h1");
  assert.ok(/^    i1: '<b 0x/m.test(y), "I1 должен быть закавычен (содержит <>)");
  assert.ok(y.includes("    content-padding-addition: 27-97"), "нет content-padding-addition");
  assert.ok(y.includes("    rekey-after-time: 116-131"), "нет rekey-after-time");
  assert.ok(y.includes("    random-trailers: true"), "random-trailers должен быть true при on");
  assert.ok(y.includes("    disable-cookies: true"), "disable-cookies должен быть true при on");
  // MASQUE-узлы из masque-устройства аккаунта
  assert.ok(y.includes("warp-masque: &warp-masque"), "нет якоря masque");
  assert.ok(y.includes("  type: masque"), "нет type: masque");
  assert.ok(y.includes("  sni: consumer-masque.cloudflareclient.com"), "нет SNI по умолчанию");
  assert.ok(y.includes("- name: \"[WARP-AWG] Default\""), "нет AWG-прокси");
  assert.ok(y.includes("  server: 162.159.195.1"), "endpoint не разобран на server");
  assert.ok(y.includes("  port: 500"), "endpoint не разобран на port");
  assert.ok(y.includes("- name: \"[WARP-MASQUE] QUIC\""), "нет MASQUE QUIC-прокси");
  assert.ok(y.includes("- name: \"[WARP-MASQUE] H2\""), "нет MASQUE H2-прокси");
  assert.ok(y.includes("  network: h2"), "нет network: h2");
  // группа и правило — как в примере
  assert.ok(y.includes("- name: Cloudflare"), "нет группы Cloudflare");
  assert.ok(y.includes("  type: select"), "группа не select");
  assert.ok(y.includes("- MATCH,Cloudflare"), "нет правила MATCH");
});

test("v2.7.0: buildClashYaml — reserved пуст → строки нет; masque-устройства нет → MASQUE-узлов нет", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.account = ACC; // без masque
  wsgui.S.cfg.reserved = "";
  const y = wsgui.buildClashYaml();
  assert.ok(!/reserved:/.test(y), "пустой reserved не должен печататься");
  assert.ok(!y.includes("warp-masque"), "без masque-устройства якоря be не должно");
  assert.ok(!y.includes("[WARP-MASQUE]"), "без masque-устройства прокси be не должно");
  assert.ok(y.includes('    - "[WARP-AWG] Default"'), "AWG-прокси на месте");
});

test("v2.7.0: buildClashYaml — ver=wg без amnezia-wg-option; мусор в reserved вычищается", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.account = ACC;
  wsgui.S.cfg.ver = "wg";
  let y = wsgui.buildClashYaml();
  assert.ok(!y.includes("amnezia-wg-option"), "ver=wg не должен печатать amnezia-wg-option");
  wsgui.S.cfg.ver = "awg31";
  wsgui.S.cfg.reserved = "abc108, 73xyz, 80, 99"; // мусор → только числа
  y = wsgui.buildClashYaml();
  assert.ok(y.includes("  reserved: [108, 73, 80]"), "reserved должен чиститься до чисел (макс. 3)");
});

/* ── 3. WireSock .conf ── */

test("v2.7.0: buildWireSockConf — доп. ключи Id/Ip/Ib только в WireSock-экспорте", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.cfg.wsId = "psbank.ru";
  wsgui.S.cfg.wsIp = "quic";
  wsgui.S.cfg.wsIb = "curl";
  const ws = wsgui.buildWireSockConf();
  const plain = wsgui.buildConf();
  assert.ok(ws.includes("Id = psbank.ru"), "Id не попал в WireSock-экспорт");
  assert.ok(ws.includes("Ip = quic"), "Ip не попал в WireSock-экспорт");
  assert.ok(ws.includes("Ib = curl"), "Ib не попал в WireSock-экспорт");
  assert.ok(!plain.includes("\nId = "), "Id НЕ должен попадать в стандартный .conf");
  assert.ok(!plain.includes("\nIp = "), "Ip НЕ должен попадать в стандартный .conf");
  assert.ok(!plain.includes("\nIb = "), "Ib НЕ должен попадать в стандартный .conf");
  // без заполненных полей — экспорт совпадает со стандартным .conf
  wsgui.S.cfg.wsId = "";
  wsgui.S.cfg.wsIp = "";
  wsgui.S.cfg.wsIb = "";
  assert.strictEqual(wsgui.buildWireSockConf(), wsgui.buildConf(), "без Id/Ip/Ib WireSock-экспорт = стандартный .conf");
});

test("v2.7.0: sanitizeCfg — reserved чистится до цифр/запятых, ws* однострочные", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const c = wsgui.sanitizeCfg({ reserved: "108abc, 73xyz,,", wsId: "a\nb", wsIp: " quic ", wsIb: "42" });
  assert.strictEqual(c.reserved, "108,73", "reserved: только цифры и запятые");
  assert.strictEqual(c.wsId, "a b", "переводы строк в wsId вырезаны");
  assert.strictEqual(c.wsIp, "quic");
  assert.strictEqual(c.wsIb, "42");
});
