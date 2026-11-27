/* ═══════════════════════════════════════════════════════════════
   v2.8.2 (запросы пользователя):
   1) «Свои флаги CLI» (вариант 1) — ручной ввод флагов warpscout в
      консоль-стиле: белый список parseExtraArgs, интеграция в
      buildScanArgs, санитизация extraArgs, отказ запуска при ошибках;
   2) дефолт профиля I1 — QUIC (DEFAULT_SCAN + sanitizeScan + миграция
      restoreState) и сохранность явного icloud-зонда;
   3) пресет «Тщательный» удалён (дубль тумблера -f);
   4) safeVal возвращает запятую в значения — мультизначные фильтры CLI
      (-exclude-node DME,FRA, -target ip,cidr) работают, $ \ # по-прежнему
      вырезаются (POSIX-спавн через /bin/sh -c).
   Ноль внешних зависимостей: node:test + node:assert.
   ═══════════════════════════════════════════════════════════════ */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

// in-memory storage — как в state.test.js (fakeNL)
function fakeNL(store) {
  return {
    storage: {
      getData: async (k) => (k in store ? store[k] : null),
      setData: async (k, v) => { store[k] = String(v); },
    },
    filesystem: {
      readFile: async () => { throw new Error("ENOENT"); },
      writeFile: async () => {},
      remove: async () => {},
      createDirectory: async () => {},
      readDirectory: async () => { throw new Error("ENOENT"); },
    },
  };
}

/* ── 1. parseExtraArgs: белый список ── */

test("v2.8.2: parseExtraArgs — whitelisted value+bool флаги проходят, -conf - валиден", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const pa = wsgui.parseExtraArgs("-sweep-ports 2408,500 -emoji -table-off -mtu 1280 -dns 1.1.1.1");
  assert.strictEqual(pa.errors.length, 0, "ошибок быть не должно: " + JSON.stringify(pa.errors));
  assert.strictEqual(JSON.stringify(pa.args), JSON.stringify(["-sweep-ports 2408,500", "-emoji", "-table-off", "-mtu 1280", "-dns 1.1.1.1"]));
  // «-conf -» — значение-дефис легитимно (CLI печатает конфиг в stdout)
  const pa2 = wsgui.parseExtraArgs("-conf - -conf-type mihomo");
  assert.strictEqual(pa2.errors.length, 0);
  assert.strictEqual(JSON.stringify(pa2.args), JSON.stringify(["-conf -", "-conf-type mihomo"]));
  // короткая форма -I и длинная --flag (Go flag допускает оба вида)
  const pa3 = wsgui.parseExtraArgs("-I eth0 --best");
  assert.strictEqual(pa3.errors.length, 0);
  assert.strictEqual(JSON.stringify(pa3.args), JSON.stringify(["-I eth0", "-best"]));
  // prototype-ключ из свободного ввода не протаскивается
  const pa4 = wsgui.parseExtraArgs("-constructor -toString");
  assert.strictEqual(pa4.args.length, 0, "prototype-ключи не проходят как булевы");
  assert.strictEqual(pa4.errors.length, 2);
});

test("v2.8.2: parseExtraArgs — дубли GUI-флагов и флаги вывода блокируются", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const dups = ["-P", "-p awg", "-speed", "-gen-i1 quic", "-jc 9", "-padding 27-97", "-best-by speed", "-f", "-n 10", "-6", "-port 500"];
  for (const line of dups) {
    const pa = wsgui.parseExtraArgs(line);
    assert.strictEqual(pa.errors.length, 1, line + " должен быть дубликатом: " + JSON.stringify(pa));
    assert.strictEqual(pa.errors[0].id, "scan.extra.err.dup");
    assert.strictEqual(pa.args.length, 0, line + " не должен попасть в команду");
  }
  const out = ["-o x.txt", "-output x.txt", "-a acc.json", "-plain", "-json", "-stream-json", "-no-report"];
  for (const line of out) {
    const pa = wsgui.parseExtraArgs(line);
    assert.strictEqual(pa.errors.length, 1, line + " (вывод/отчёт) должен быть заблокирован");
  }
});

test("v2.8.2: parseExtraArgs — неизвестный флаг, позиционный токен, битое значение", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  let pa = wsgui.parseExtraArgs("-frobnicate");
  assert.strictEqual(pa.errors[0].id, "scan.extra.err.unknown");
  pa = wsgui.parseExtraArgs("188.114.98.58");
  assert.strictEqual(pa.errors[0].id, "scan.extra.err.pos", "позиционный токен без дефиса");
  pa = wsgui.parseExtraArgs("-mtu");
  assert.strictEqual(pa.errors[0].id, "scan.extra.err.val", "флагу-значению нужен аргумент");
  pa = wsgui.parseExtraArgs("-dns 1.1.1.1&calc");
  assert.strictEqual(pa.errors[0].id, "scan.extra.err.badval", "shell-метасимвол в значении");
  // несколько ошибок — все собраны, валидные части не теряются
  pa = wsgui.parseExtraArgs("-emoji -P -unknown");
  assert.strictEqual(pa.errors.length, 2);
  assert.strictEqual(JSON.stringify(pa.args), JSON.stringify(["-emoji"]));
});

/* ── 2. buildScanArgs + запуск ── */

test("v2.8.2: buildScanArgs — свои флаги в конце команды, до -plain; без ввода — ничего", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const base = wsgui.buildScanArgs(wsgui.S.scan);
  assert.strictEqual(base[base.length - 1], "-plain", "хвост команды прежний");
  wsgui.S.scan.extraArgs = "-sweep-ports all -emoji";
  const args = wsgui.buildScanArgs(wsgui.S.scan);
  assert.strictEqual(JSON.stringify(args.slice(-3)), JSON.stringify(["-sweep-ports all", "-emoji", "-plain"]));
  // командная строка целиком
  const cmd = wsgui.buildScanCmd(wsgui.S.scan, {});
  assert.ok(cmd.indexOf("-sweep-ports all -emoji -plain") !== -1, "свои флаги перед -plain");
});

test("v2.8.2: runScan с невалидными своими флагами — отказ ДО запуска (тост, без процесса)", async () => {
  const { wsgui } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.account = { private_key: "KFS3ppV6ephP5NV89KrQ+3EPhrlPWRVH2vrEhl3x7G0=", peer_public_key: "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=" }; // мимо аккаунт-гейта
  wsgui.S.scan.extraArgs = "-gen-i1 quic"; // дубль GUI-флага
  await wsgui.runScan();
  assert.strictEqual(wsgui.S.running.scan, false, "запуск не должен стартовать");
});

/* ── 3. sanitizeScan: extraArgs + дефолт genI1 ── */

test("v2.8.2: sanitizeScan — extraArgs одна строка (\\r\\n\\t → пробел), контрольные символы вырезаны", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  const s = wsgui.sanitizeScan({ extraArgs: "-emoji\r\n-mtu 1280\t-emoji\u0000" });
  assert.strictEqual(s.extraArgs, "-emoji -mtu 1280 -emoji");
  assert.strictEqual(wsgui.sanitizeScan({}).extraArgs, "", "нет поля → пусто");
  assert.strictEqual(wsgui.sanitizeScan({ extraArgs: "x".repeat(600) }).extraArgs.length, 500, "лимит 500");
});

test("v2.8.2: дефолт профиля I1 — QUIC; явный icloud (\"\") сохраняется; отсутствующее поле → quic", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  assert.strictEqual(wsgui.S.scan.genI1, "quic", "DEFAULT_SCAN.genI1");
  assert.strictEqual(wsgui.sanitizeScan({}).genI1, "quic", "старый бэкап без поля → новый дефолт");
  assert.strictEqual(wsgui.sanitizeScan({ genI1: "" }).genI1, "", "явный icloud-зонд валиден и сохранён");
  assert.strictEqual(wsgui.sanitizeScan({ genI1: "banana" }).genI1, "", "мусор → icloud (как раньше)");
  // дефолтная команда скана несёт -gen-i1 quic
  const args = wsgui.buildScanArgs(wsgui.S.scan);
  assert.ok(args.some((a) => a === "-gen-i1 quic"), "-gen-i1 quic в команде по умолчанию");
});

/* ── 4. миграция restoreState (одноразово, флаг i1QuicMigrated) ── */

test("v2.8.2: restoreState — старое состояние genI1:'' поднимается до quic ровно один раз", async () => {
  const store = {};
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: fakeNL(store) });
  store.state = JSON.stringify({ scan: { genI1: "" }, cfg: {}, settings: {} });
  await wsgui.restoreState();
  assert.strictEqual(wsgui.S.scan.genI1, "quic", "миграция сработала");
  assert.strictEqual(wsgui.S.settings.i1QuicMigrated, true, "флаг выставлен");
  // пользователь явно вернул icloud — повторный restore НЕ трогает выбор
  store.state = JSON.stringify({ scan: { genI1: "" }, cfg: {}, settings: { i1QuicMigrated: true } });
  await wsgui.restoreState();
  assert.strictEqual(wsgui.S.scan.genI1, "", "повторная миграция не перетирает явный icloud");
});

/* ── 5. пресет «Тщательный» удалён ── */

test("v2.8.2: пресет «Тщательный» (full) удалён — дубль тумблера -f; остальные целы", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  assert.strictEqual("full" in wsgui.PRESETS, false, "PRESETS.full больше нет");
  assert.deepStrictEqual(Object.keys(wsgui.PRESETS).sort(), ["default", "fast", "hard", "noobf"]);
});

/* ── 6. safeVal: запятая в значениях (мультизначные фильтры), $ \ # вырезаются ── */

test("v2.8.2: safeVal сохраняет запятые (DME,FRA / ip,cidr), вырезает $ \\ # и кавычки", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  assert.strictEqual(wsgui.safeVal("DME,FRA"), "DME,FRA");
  assert.strictEqual(wsgui.safeVal("188.114.98.58,162.159.192.0/28"), "188.114.98.58,162.159.192.0/28");
  assert.strictEqual(wsgui.safeVal("1.1.1.1$HOME"), "1.1.1.1HOME", "$ не проходит (POSIX /bin/sh -c)");
  assert.strictEqual(wsgui.safeVal("a#-target"), "a-target", "# не проходит (комментарий в sh)");
  assert.strictEqual(wsgui.safeVal('a"b'), "ab", "кавычка по-прежнему вырезается");
});

test("v2.8.2: buildScanArgs — -exclude-node DME,FRA и -target ip,cidr уходят в CLI с запятыми", () => {
  const { wsgui } = loadApp({ nlOs: "Windows" });
  wsgui.S.scan.exclNode = "DME,FRA";
  wsgui.S.scan.target = "188.114.98.58,162.159.192.0/28";
  const args = wsgui.buildScanArgs(wsgui.S.scan);
  assert.ok(args.some((a) => a === "-exclude-node DME,FRA"), "исключение узлов не ломается запятой");
  assert.ok(args.some((a) => a === "-target 188.114.98.58,162.159.192.0/28"), "список адресов не ломается запятой");
});

/* ── 7. AWG 3.1 на вкладке «Скан»: тумблер и тайминги — общие с «Конфиг» ── */

test("v2.8.2: syncStateFromInputs — тумблер fUse31 управляет общим S.cfg.ver (awg31↔awg20)", () => {
  const { wsgui, document } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.wsVersion = "0.17.0"; // гейт awg31 — как в awg31.test.js
  // тумблер выключили → вер = awg20 → в команде нет -p awg31 и таймингов
  document.getElementById("fUse31").checked = false;
  document.getElementById("fCpa").value = "27-97"; // значения полей — как в реальном DOM
  document.getElementById("fRekeyAfter").value = "116-131";
  document.getElementById("fRekeyTo").value = "6-9";
  document.getElementById("fRejectAfter").value = "171-196";
  document.getElementById("fKeepaliveTo").value = "9-16";
  document.getElementById("fMaxHs").value = "18-26";
  document.getElementById("fTrailers").checked = true;
  document.getElementById("fNoCookies").checked = true;
  wsgui.syncStateFromInputs();
  assert.strictEqual(wsgui.S.cfg.ver, "awg20", "выключение — общий источник AWG 2.0");
  assert.ok(!wsgui.buildScanArgs(wsgui.S.scan).some((a) => /^-padding /.test(a)), "таймингов в команде нет");
  assert.strictEqual(wsgui.scanProtoOf("awg"), "awg", "-p awg вместо awg31");
  // включили обратно → вер = awg31 → тайминги в команде
  document.getElementById("fUse31").checked = true;
  wsgui.syncStateFromInputs();
  assert.strictEqual(wsgui.S.cfg.ver, "awg31");
  const args = wsgui.buildScanArgs(wsgui.S.scan);
  assert.ok(args.some((a) => a === "-padding 27-97"), "тайминги вернулись");
});

test("v2.8.2: тайминги 3.1 синхронны в обе стороны (Скан ↔ Конфиг, autoDom)", () => {
  const { wsgui, document } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.wsVersion = "0.17.0"; // гейт awg31 — как в awg31.test.js
  // правка на «Скан» → общий источник + зеркало в «Конфиг»
  document.getElementById("fUse31").checked = true; // тумблер включён — как в реальном DOM (дефолт awg31)
  document.getElementById("fCpa").value = "30-90";
  document.getElementById("fTrailers").checked = false;
  wsgui.syncStateFromInputs();
  assert.strictEqual(wsgui.S.cfg.obf.cpa, "30-90");
  assert.strictEqual(wsgui.S.cfg.obf.trailers, "off");
  assert.strictEqual(document.getElementById("cfgCpa").value, "30-90", "поле «Конфиг» зеркалится");
  assert.strictEqual(document.getElementById("cfgTrailers").value, "off");
  const args = wsgui.buildScanArgs(wsgui.S.scan);
  assert.ok(args.some((a) => a === "-padding 30-90"), "команда скана согласована");
  assert.ok(!args.some((a) => a === "-random-trailers"), "trailers off — булев флаг не идёт");
  // правка на «Конфиг» → зеркала на «Скан»
  wsgui.S.cfg.obf.keepaliveTo = "10-20";
  wsgui.syncInputsFromState();
  assert.strictEqual(document.getElementById("fKeepaliveTo").value, "10-20");
  assert.strictEqual(document.getElementById("fTrailers").checked, false);
  // повторная синхронизация не поднимает мусор из пустых зеркал: обф-значения живы
  wsgui.syncInputsFromState();
  assert.strictEqual(document.getElementById("fCpa").value, "30-90");
});

test("v2.8.2: syncInputsFromState — тумблер fUse31 отражает cfg.ver (awg20 → выключен)", () => {
  const { wsgui, document } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.cfg.ver = "awg20";
  wsgui.syncInputsFromState();
  assert.strictEqual(document.getElementById("fUse31").checked, false);
  wsgui.S.cfg.ver = "awg31";
  wsgui.syncInputsFromState();
  assert.strictEqual(document.getElementById("fUse31").checked, true);
});

test("v2.8.2: смена версии на «Конфиг» (awg15) гасит тумблер на «Скан» — войны зеркал нет", () => {
  const { wsgui, document } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.cfg.ver = "awg15";
  wsgui.syncCfgInputsFromState(); // то же, что делает клик по cfgVerSeg
  assert.strictEqual(document.getElementById("fUse31").checked, false, "зеркало погашено");
  // и любой ввод в форме скана НЕ возвращает awg31 принудительно
  wsgui.syncStateFromInputs();
  assert.strictEqual(wsgui.S.cfg.ver, "awg15", "awg15 не перетирается вводом в скан-форму");
});
