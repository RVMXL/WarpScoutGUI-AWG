/* v2.6.4 (запрос пользователя): группировка эндпоинтов для селекта конфига.
   Раньше список был плоским и «неочевидно, что верхний эндпоинт — самый
   быстрый». Теперь: лучший эндпоинт каждой ноды сверху (отсортирован по
   пингу, первый — общий лучший, ему рисуется ★), остальные — ниже.
   endpointGroups — чистая функция, на ней построены и селект, и автоселект
   лучшего после скана. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

const { wsgui } = loadApp({ nlOs: "Windows" });

/* ── лучший с каждой ноды + сортировка по пингу ── */
test("endpointGroups: лучший с каждой ноды, сортировка по пингу, звезда первому", () => {
  const rows = [
    { endpoint: "1.1.1.1:443", node: "DME", ping: "50ms", tunPing: "", torn: false },
    { endpoint: "2.2.2.2:443", node: "DME", ping: "30ms", tunPing: "", torn: false },
    { endpoint: "3.3.3.3:443", node: "FRA", ping: "70ms", tunPing: "", torn: false },
    { endpoint: "4.4.4.4:443", node: "LED", ping: "20ms", tunPing: "", torn: false },
  ];
  const g = wsgui.endpointGroups(rows);
  assert.strictEqual(g.best.endpoint, "4.4.4.4:443");
  // spread → локальный массив (объекты из vm-реалма имеют чужой Array.prototype)
  assert.deepStrictEqual(
    [...g.nodeBest.map((r) => r.endpoint)],
    ["4.4.4.4:443", "2.2.2.2:443", "3.3.3.3:443"]
  );
  // все, кроме лучших на своих нодах — в «остальные», тоже по пингу
  assert.deepStrictEqual([...g.rest.map((r) => r.endpoint)], ["1.1.1.1:443"]);
});

/* ── приоритет tunPing над ping; torn-строки исключены ── */
test("endpointGroups: tunPing приоритетнее ping, torn исключены", () => {
  const rows = [
    { endpoint: "1.1.1.1:443", node: "DME", ping: "10ms", tunPing: "90ms", torn: false },
    { endpoint: "5.5.5.5:443", node: "DME", ping: "999ms", tunPing: "40ms", torn: false },
    { endpoint: "6.6.6.6:443", node: "AMS", ping: "5ms", tunPing: "", torn: true },
  ];
  const g = wsgui.endpointGroups(rows);
  // у DME лучший по tunPing — 5.5.5.5 (40ms), а не 1.1.1.1 с ping 10ms
  assert.strictEqual(g.best.endpoint, "5.5.5.5:443");
  assert.strictEqual(g.nodeBest.length, 1); // AMS torn — ноды нет в списке
  assert.strictEqual(g.rest.length, 1);
  assert.strictEqual(g.rest[0].endpoint, "1.1.1.1:443");
});

/* ── пустые/невалидные входы ── */
test("endpointGroups: пусто и null — best null, группы пустые", () => {
  assert.strictEqual(wsgui.endpointGroups([]).best, null);
  assert.strictEqual(wsgui.endpointGroups(null).nodeBest.length, 0);
  assert.strictEqual(wsgui.endpointGroups(undefined).rest.length, 0);
  assert.strictEqual(wsgui.endpointGroups([{ torn: true }]).best, null); // только torn
  assert.strictEqual(wsgui.endpointGroups([{}]).nodeBest.length, 0); // нет endpoint
  assert.strictEqual(wsgui.endpointGroups([null]).best, null); // мусор отфильтрован
});

/* ── строка без ноды — отдельная группа «?», данные не мутируются ── */
test("endpointGroups: узел '?' для строк без ноды, вход не меняется", () => {
  const row = { endpoint: "7.7.7.7:443", node: "", ping: "", tunPing: "", torn: false };
  const g = wsgui.endpointGroups([row]);
  assert.strictEqual(g.nodeBest.length, 1);
  assert.strictEqual(g.nodeBest[0].endpoint, "7.7.7.7:443");
  assert.strictEqual(row.node, ""); // ничего не дописали в данные
});

/* ── применённый find-junk I1 доезжает до конфига (v2.6.4) ── */
test("applyFoundCmd: сырой -i1 из найденной команды попадает в cfg.obf.i1", () => {
  const { wsgui, document } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.foundCmd =
    "warpscout scan -p awg -i1 vVOOJgYTiAuqWQkbtdkH5cWkj3xhNZQbSwEeqywSD1YqJHLIUyZtGoYKQOnsyN20 -n 3";
  wsgui.applyFoundCmd();
  assert.strictEqual(
    wsgui.S.cfg.obf.i1,
    "vVOOJgYTiAuqWQkbtdkH5cWkj3xhNZQbSwEeqywSD1YqJHLIUyZtGoYKQOnsyN20"
  );
  // профиль скана тоже применён
  assert.strictEqual(wsgui.S.scan.proto, "awg");
  assert.strictEqual(wsgui.S.scan.sample, 3);
  // тост сообщает, что I1 ушёл в конфиг
  const box = document.querySelector("#toasts");
  const texts = (box && box.children ? box.children : []).map((el) =>
    el.children && el.children[1] ? el.children[1].textContent : ""
  );
  assert.ok(texts.some((x) => x.indexOf("I1") !== -1), "нет тоста про I1 → конфиг");
});

/* ── v2.6.7 (отчёт пользователя): raw-I1 «<b 0x…>» печатается CLI в кавычках и с
   пробелом после «<b» — прежний split(/\s+/) рвал значение на части, и в конфиг
   уходил обрывок «"<b». Плюс команда обрезалась лимитом 1000, а значение — 600.
   Кавычки — shell-артефакт: normI1Store снимает их (как parseConfText при импорте). ── */
test("applyFoundCmd: raw-I1 в кавычках с пробелом доезжает до конфига ЦЕЛИКОМ (v2.6.7)", () => {
  const { wsgui, document } = loadApp({ nlOs: "Windows", autoDom: true });
  // ~2.6 КБ, как эталонный пакет (EXAMPLE_I1 — 2506 символов): команда > 1000,
  // значение > 600 — старые лимиты ловятся этой же проверкой
  const rawI1 = '"<b 0x' + "ab12cd34".repeat(320) + '>"'; // как печатает CLI
  const wantI1 = "<b 0x" + "ab12cd34".repeat(320) + ">"; // после снятия кавычек
  wsgui.S.foundCmd =
    "warpscout scan -proto awg -P -n 10 -i1 " + rawI1 + " -jc 4 -jmin 40 -jmax 70";
  wsgui.applyFoundCmd();
  // целиком: без shell-кавычек, с пробелом после <b, весь hex — ничего не откусано
  assert.strictEqual(wsgui.S.cfg.obf.i1, wantI1);
  assert.ok(wsgui.S.cfg.obf.i1.startsWith("<b 0x"), "пробел после <b потерян");
  assert.ok(wsgui.S.cfg.obf.i1.endsWith(">"), "хвост значения потерян");
  // и строка конфига — та же форма целиком (раньше: чистка пробелов + обрыв)
  const conf = wsgui.buildConf();
  assert.ok(conf.includes("I1 = " + wantI1 + "\n"), "строка I1 в конфиге не совпадает целиком");
  // найденные junk-параметры применились
  assert.strictEqual(wsgui.S.scan.jc, 4);
});

/* ── v2.6.7: незакрытая кавычка (обрезанный лог) — значение берётся до конца
   строки, а не первый «слово-обрывок»; форма неканоническая → пробелы чистятся ── */
test("applyFoundCmd: незакрытая кавычка значения -i1 — до конца строки", () => {
  const { wsgui } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.foundCmd =
    'warpscout scan -proto awg -i1 "<b 0xdeadbeefcafebabe1122334455';
  wsgui.applyFoundCmd();
  assert.strictEqual(wsgui.S.cfg.obf.i1, '"<b0xdeadbeefcafebabe1122334455');
});

/* ── v2.6.7: чистая нормализация I1 — raw-форма нетронута, base64 чистится ── */
test("normI1Store: raw-пакет «<b 0x…>» как есть, кавычки снимаются, base64 чистится", () => {
  const w = loadApp({ nlOs: "Windows" }).wsgui;
  // shell-кавычки (как в найденной команде CLI) — снимаются
  assert.strictEqual(w.normI1Store('"<b 0xce00ab12>"'), "<b 0xce00ab12>");
  // форма без кавычек (как эталонный EXAMPLE_I1) — как есть, с пробелом
  assert.strictEqual(w.normI1Store(" <b 0xce00ab12> "), "<b 0xce00ab12>");
  // base64: пробелы/табуляции вычищаются, кавычки тоже снимаются
  assert.strictEqual(w.normI1Store("vVOO JgYT\tiuAg"), "vVOOJgYTiuAg");
  assert.strictEqual(w.normI1Store('"vVOOJgYT"'), "vVOOJgYT");
  assert.strictEqual(w.normI1Store("vVOOJgYT"), "vVOOJgYT");
  assert.strictEqual(w.normI1Store(null), "");
  assert.strictEqual(w.normI1Store(undefined), "");
  assert.strictEqual(w.normI1Store(""), "");
  assert.strictEqual(w.isI1RawPacket("<b 0xce00>"), true);
  assert.strictEqual(w.isI1RawPacket('"<b 0xce00>"'), true);
  // v2.6.8: компактная форма — тоже raw-цепочка (раньше не узнавалась → чистка пробелов)
  assert.strictEqual(w.isI1RawPacket("<b0xce00>"), true);
  assert.strictEqual(w.isI1RawPacket("<b 0xce00><r 23>"), true); // мультиблочная
  assert.strictEqual(w.isI1RawPacket("vVOOJgYT"), false);
});

/* ── v2.6.8 (повторный отчёт пользователя): конфиги с найденным I1 не рабочие —
   «IPC error -22: failed to parse i1: unknown tag <b0xc1…>/<r23>». Грамматика
   демона (amneziawg-go device/obf.go — newObfChain): тег «<ключ значение>» — через
   пробел; v2.6.7 узнавал raw-форму только при ОДНОМ теге «<b …>» на всё значение,
   а warpscout печатает найденный I1 МУЛЬТИБЛОЧНЫМ («<b 0x…><r 23><b 0x…><r 16>»)
   — такое значение шло по ветке «не raw», чистилось от значимых пробелов, и в
   конфиг уезжала компактная форма → unknown tag. Теперь цепочка — значение из
   тегов целиком, каждый тег канонизируется (пробел после ключа, склейка hex). ── */
test("normI1Store: мультиблочный raw-I1 канонизируется, пробелы не теряются (v2.6.8)", () => {
  const w = loadApp({ nlOs: "Windows" }).wsgui;
  // как печатает warpscout (пробел внутри тегов, без — между) — канон без изменений
  const canon =
    "<b 0xc100000001014d0000405b4845071e837d0f03d633e1022240a5ca67509578><r 23>" +
    "<b 0x57010bff6ab65539d2147418f07659d7ee743f02f65dc552917d3694e86ab674><r 16>";
  assert.strictEqual(w.isI1RawPacket(canon), true);
  assert.strictEqual(w.normI1Store(canon), canon);
  // значение из конфига пользователя (компактная форма — то, что убивало туннель)
  const compact = canon.replace(/<b 0x/g, "<b0x").replace(/<r (\d+)>/g, "<r$1>");
  assert.strictEqual(compact, "<b0xc100000001014d0000405b4845071e837d0f03d633e1022240a5ca67509578><r23><b0x57010bff6ab65539d2147418f07659d7ee743f02f65dc552917d3694e86ab674><r16>");
  assert.strictEqual(w.normI1Store(compact), canon); // чинится в канон демона
  // …и через shell-кавычки CLI
  assert.strictEqual(w.normI1Store('"' + compact + '"'), canon);
});

test("normI1Store: компактные теги канонизируются к виду демона, мусор не трогается", () => {
  const w = loadApp({ nlOs: "Windows" }).wsgui;
  assert.strictEqual(w.normI1Store("<b0xce00ab12>"), "<b 0xce00ab12>");
  assert.strictEqual(w.normI1Store("<r23>"), "<r 23>");
  assert.strictEqual(w.normI1Store("<b0xc1><r23><b0x57><r16>"), "<b 0xc1><r 23><b 0x57><r 16>");
  // «байты через пробел» склеиваются — демон читал бы только ПЕРВЫЙ байт (parts[1])
  assert.strictEqual(w.normI1Store("<b 0xc1 0x00 0x4d 0x40>"), "<b 0xc1004d40>");
  // без 0x — тоже норм (newBytesObf делает TrimPrefix), чётность соблюдена
  assert.strictEqual(w.normI1Store("<b c1004d40>"), "<b 0xc1004d40>");
  // неопознанные/битые теги не трогаем (демон сам скажет)
  assert.strictEqual(w.normI1Store("<foo><bar>"), "<foo><bar>");
  assert.strictEqual(w.normI1Store("<b 0xabc>"), "<b 0xabc>"); // нечётный hex
  assert.strictEqual(w.normI1Store("<b 0xzz>"), "<b 0xzz>"); // не hex
  assert.strictEqual(w.normI1Store("<data>"), "<data>"); // не цифры после d
  // смешанное: известный тег чинится, неизвестный остаётся
  assert.strictEqual(w.normI1Store("<b0xc1><foo>"), "<b 0xc1><foo>");
  // t/d/ds — значение демоном игнорируется: слитная форма с цифрами схлопывается
  assert.strictEqual(w.normI1Store("<t12>"), "<t>");
  assert.strictEqual(w.normI1Store("<dz45>"), "<dz 45>");
});

test("applyFoundCmd: мультиблочный raw-I1 (как печатает warpscout) доезжает до конфига рабочим (v2.6.8)", () => {
  const { wsgui } = loadApp({ nlOs: "Windows", autoDom: true });
  const b1 = "c100000001014d0000405b4845071e837d0f03d633e1022240a5ca67509578";
  const b2 = "57010bff6ab65539d2147418f07659d7ee743f02f65dc552917d3694e86ab674";
  // CLI печатает в кавычках, пробел внутри тегов: -i1 "<b 0xc1…><r 23><b 0x57…><r 16>"
  wsgui.S.foundCmd =
    'warpscout scan -proto awg -P -n 10 -i1 "<b 0x' + b1 + '><r 23><b 0x' + b2 + '><r 16>"';
  wsgui.applyFoundCmd();
  const want = "<b 0x" + b1 + "><r 23><b 0x" + b2 + "><r 16>";
  assert.strictEqual(wsgui.S.cfg.obf.i1, want);
  // строка конфига — канон демона (раньше: чистка пробелов → «<b0xc1…><r23>…» → unknown tag)
  const conf = wsgui.buildConf();
  assert.ok(conf.includes("I1 = " + want + "\n"), "строка I1 не совпадает с каноном демона");
  // в конфиге не осталось компактных тегов «<b0x…>»/«<r23>»
  assert.ok(!/<(?:b|r|rc|rd|dz)[0-9a-fx]/i.test(conf), "в конфиге остался компактный тег");
});

/* ── v2.6.7: buildConf — raw-форма I1 без чистки пробелов, base64 — как раньше ── */
test("buildConf: I1 raw-форма с пробелом сохраняется, base64-пробелы вычищаются", () => {
  const { wsgui } = loadApp({ nlOs: "Windows", autoDom: true });
  wsgui.S.cfg.obf.i1 = "ab12 cd34\tef56";
  assert.ok(wsgui.buildConf().includes("I1 = ab12cd34ef56\n"), "base64-форма: пробелы должны вычищаться");
  wsgui.S.cfg.obf.i1 = '"<b 0xce00>"';
  assert.ok(wsgui.buildConf().includes("I1 = <b 0xce00>\n"), "raw-форма: кавычки должны сниматься, пробел — сохраняться");
  // эталонный дефолт (EXAMPLE_I1 из 02-state) — тоже raw-форма: целиком, с пробелом
  wsgui.S.cfg.obf.i1 = wsgui.defaultCfg().obf.i1;
  const line = wsgui.buildConf().split("\n").find((l) => l.startsWith("I1 = "));
  assert.ok(line && line.startsWith("I1 = <b 0x"), "дефолтный EXAMPLE_I1 потерял raw-форму");
  assert.strictEqual(line.length, "I1 = ".length + wsgui.defaultCfg().obf.i1.length);
});
