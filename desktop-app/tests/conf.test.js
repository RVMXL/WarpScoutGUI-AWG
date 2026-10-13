/* ARCH-4: генератор и парсер .conf — основной сценарий «найти туннель → сохранить профиль».
   Зафиксировано: F06 (инъекция директив в экспорт), F24 (импорт = замена профиля),
   F25 (несколько [Peer] → первый), F26 (I2–I5 не теряются), F27 (лимиты CLI). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

function load() {
  const ctx = loadApp({ nlOs: "Windows" });
  ctx.wsgui.S.account = null;
  ctx.wsgui.S.cfg = ctx.wsgui.defaultCfg();
  return ctx;
}

test("buildConf: без аккаунта — шаблон с предупреждением, а не ключами", () => {
  const { wsgui } = load();
  const conf = wsgui.buildConf();
  assert.ok(conf.includes("[Interface]"));
  assert.ok(conf.includes("PrivateKey = <"));
  assert.ok(conf.includes("[Peer]"));
  assert.ok(!/PrivateKey = [A-Za-z0-9+/]{43}=/m.test(conf));
});

test("buildConf: с аккаунтом — реальные ключи, F06: переводы строк в значениях вырезаны", () => {
  const { wsgui } = load();
  wsgui.S.account = { private_key: "A".repeat(43) + "=", peer_public_key: "B".repeat(43) + "=", ipv4: "172.16.0.2", ipv6: "" };
  const conf = wsgui.buildConf();
  assert.ok(conf.includes("PrivateKey = " + "A".repeat(43) + "="));
  assert.ok(conf.includes("PublicKey = " + "B".repeat(43) + "="));
  assert.ok(conf.includes("Address = 172.16.0.2"));
  // F06: инъекция директив через private_key невозможна — \n схлопывается
  // в пробел ВНУТРИ значения PrivateKey, новой строки «PostUp = …» не возникает
  wsgui.S.account.private_key = "A".repeat(43) + "=\nPostUp = rm -rf /";
  const conf2 = wsgui.buildConf();
  assert.ok(!/^PostUp/m.test(conf2), "PostUp не может начать свою строку");
  assert.ok(conf2.includes("PrivateKey = " + "A".repeat(43) + "= PostUp = rm -rf /\n")); // плоское значение
});

test("buildConf: ver=wg — без обфускации; awg15 — с Jc/Jmin/Jmax; awg31 — с 3.1-ключами", () => {
  const { wsgui } = load();
  wsgui.S.cfg.ver = "wg";
  let conf = wsgui.buildConf();
  assert.ok(!conf.includes("Jc = "));
  wsgui.S.cfg.ver = "awg15";
  conf = wsgui.buildConf();
  assert.ok(conf.includes("Jc = 4"));
  assert.ok(conf.includes("Jmin = 40"));
  assert.ok(conf.includes("Jmax = 70"));
  assert.ok(!conf.includes("ContentPaddingAddition"));
  wsgui.S.cfg.ver = "awg31";
  conf = wsgui.buildConf();
  assert.ok(conf.includes("ContentPaddingAddition"));
  assert.ok(conf.includes("RekeyAfterTime"));
});

test("buildConf: F26 — I2..I5 не теряются; F27 — MTU клампится к CLI-лимиту 1500", () => {
  const { wsgui } = load();
  wsgui.S.cfg.ver = "awg20";
  wsgui.S.cfg.obf.i2 = "i2val";
  wsgui.S.cfg.obf.i5 = "i5val";
  wsgui.S.cfg.mtu = 9000;
  const conf = wsgui.buildConf();
  assert.ok(conf.includes("I2 = i2val"));
  assert.ok(conf.includes("I5 = i5val"));
  assert.ok(conf.includes("MTU = 1500"));
});

test("parseConfText: секции, инлайн-комментарии, кавычки", () => {
  const { wsgui } = load();
  const c = wsgui.parseConfText([
    "[Interface]",
    "PrivateKey = AAA=",          // не валидный ключ — парсеру всё равно
    "MTU = 1280 # inline comment",
    'DNS = "1.1.1.1, 1.0.0.1"',
    "[Peer]",
    "Endpoint = 8.47.69.43:2408",
  ].join("\n"));
  assert.strictEqual(c.interface.privatekey, "AAA=");
  assert.strictEqual(c.interface.mtu, "1280");
  assert.strictEqual(c.interface.dns, "1.1.1.1, 1.0.0.1");
  assert.strictEqual(c.peer.endpoint, "8.47.69.43:2408");
  assert.strictEqual(c.peers.length, 1);
});

test("parseConfText: F25 — несколько [Peer] сохраняются списком, out.peer = первый", () => {
  const { wsgui } = load();
  const c = wsgui.parseConfText("[Peer]\nEndpoint = a:1\n[Peer]\nEndpoint = b:2\n");
  assert.strictEqual(c.peers.length, 2);
  assert.strictEqual(c.peer.endpoint, "a:1");
});

test("parseConfText: ключи вне секций уходят в unknown", () => {
  const { wsgui } = load();
  const c = wsgui.parseConfText("Key = value\n[Interface]\nMTU = 1280\n");
  assert.strictEqual(JSON.stringify(c.unknown), '["key"]');
  assert.strictEqual(c.interface.mtu, "1280");
});
