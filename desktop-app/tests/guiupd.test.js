/* ═══════════════════════════════════════════════════════════════
   v2.8.0 (F2): подсказка о новой версии самого WarpScoutGUI.
   Симметрично wsupdate.test.js (v2.7.3): раз за сессию читаем
   releases/latest СВОЕГО репозитория (пререлизы и черновики GitHub в
   этот эндпоинт не отдаёт — банер появляется только на полноценном
   релизе). Здесь — чистые функции: разбор тега (guiParseTag) и решение
   «нужен ли банер» (guiUpdFor); сетевая часть молчалива и не тестируется.
   Ноль внешних зависимостей: node:test + node:assert.
   ═══════════════════════════════════════════════════════════════ */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

/* ── guiParseTag: теги этого репозитория ── */

test("v2.8.0: guiParseTag — v2.8.0/v2.8, мусор и пустота = пусто", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const p = wsgui.guiParseTag;
  assert.strictEqual(p("v2.8.0"), "2.8.0");
  assert.strictEqual(p("v2.8"), "2.8");
  assert.strictEqual(p("2.9.1"), "2.9.1");
  assert.strictEqual(p(" v2.8.0 "), "2.8.0");
  assert.strictEqual(p(""), "");
  assert.strictEqual(p(null), "");
  assert.strictEqual(p(undefined), "");
  assert.strictEqual(p("release"), "");
  assert.strictEqual(p("vX.Y.Z"), "");
  assert.strictEqual(p("v"), "");
});

/* ── guiUpdFor: банер только на более свежий ПОЛНОценный релиз ── */

test("v2.8.0: guiUpdFor — свежее = версия, та же/старее/мусор = тишина", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const u = wsgui.guiUpdFor;
  assert.strictEqual(u("2.7.3", "v2.8.0"), "2.8.0");
  assert.strictEqual(u("2.7.3", "v3.0.0"), "3.0.0");
  assert.strictEqual(u("2.8", "v2.8.1"), "2.8.1");
  assert.strictEqual(u("2.8.0", "v2.8.0"), "", "та же версия — тишина");
  assert.strictEqual(u("2.8.1", "v2.8.0"), "", "локальная новее (dev-сборка) — тишина");
  assert.strictEqual(u("2.8.0", "v2.8"), "", "равные части 2.8 — тишина");
  assert.strictEqual(u("", "v2.8.0"), "", "версия GUI неизвестна — тишина");
  assert.strictEqual(u(null, "v2.8.0"), "");
  assert.strictEqual(u("мусор", "v2.8.0"), "");
  assert.strictEqual(u("2.7.3", ""), "", "тег не разобран — тишина");
  assert.strictEqual(u("2.7.3", "abc"), "");
  assert.strictEqual(u("2.7.3", null), "");
});

/* ── buildMihomoJson (F3): те же прокси, что в YAML, но JSON-массивом ── */

test("v2.8.0: buildMihomoJson — валидный JSON-массив: wireguard + amnezia-wg-option (awg31)", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.cfg.ver = "awg31";
  wsgui.S.cfg.endpoint = "188.114.98.58:2408";
  wsgui.S.cfg.reserved = "abc108, 73, 80x, , 9";
  const arr = JSON.parse(wsgui.buildMihomoJson());
  assert.ok(Array.isArray(arr));
  const wg = arr[0];
  assert.strictEqual(wg.name, "[WARP-AWG] Default");
  assert.strictEqual(wg.type, "wireguard");
  assert.strictEqual(wg.server, "188.114.98.58");
  assert.strictEqual(wg.port, 2408);
  assert.strictEqual(wg.udp, true);
  assert.ok(Array.isArray(wg["allowed-ips"]));
  assert.deepStrictEqual(wg.reserved, [108, 73, 80], "reserved вычищен до максимум 3 цифр");
  const a = wg["amnezia-wg-option"];
  assert.ok(a, "для awg31 есть amnezia-wg-option");
  assert.strictEqual(a.version, 3);
  assert.strictEqual(a["random-trailers"], true);
  assert.strictEqual(a["disable-cookies"], true);
});

test("v2.8.0: buildMihomoJson — reserved пуст → поля нет; ver=wg → amnezia-wg-option нет; MASQUE-устройство → два masque-прокси", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const S = wsgui.S;
  S.cfg.ver = "wg";
  S.cfg.reserved = "";
  const arr = JSON.parse(wsgui.buildMihomoJson());
  assert.strictEqual(arr[0].reserved, undefined);
  assert.strictEqual(arr[0]["amnezia-wg-option"], undefined);
  assert.strictEqual(arr.length, 1, "без masque-устройства — один прокси");
  // аккаунт с MASQUE-устройством (как в warpscout-account.json)
  S.account = {
    ipv4: "172.16.0.2", ipv6: "2606:4700:110::1",
    private_key: "pkWg=", peer_public_key: "pkPeer=",
    masque: { private_key: "pkMq=", peer_public_key: "mqPeer=", ipv4: "172.16.0.3", ipv6: "2606:4700:110::2" },
  };
  S.cfg.ver = "awg31";
  const arr2 = JSON.parse(wsgui.buildMihomoJson());
  assert.strictEqual(arr2.length, 3);
  const mq = arr2[1];
  assert.strictEqual(mq.type, "masque");
  assert.strictEqual(mq.name, "[WARP-MASQUE] QUIC");
  assert.strictEqual(mq.sni, "consumer-masque.cloudflareclient.com");
  assert.strictEqual(mq.ip, "172.16.0.3");
  const h2 = arr2[2];
  assert.strictEqual(h2.network, "h2");
  assert.strictEqual(h2["private-key"], "pkMq=");
});
