/* v2.6.2 (аудит волна 2): computePaths (FE-21, QUAL-B — остаток) и перенос
   .bak-копий аккаунта при миграции (SEC-A1 п.4).
   Харнесс loadApp({ neutralino, autoDom }): фейковый Neutralino (os/filesystem/
   storage) + авто-реестр DOM-заглушек для «#id»-селекторов — computePaths
   трогает поля формы и тосты, которые теперь можно проверять.
   Ноль внешних зависимостей: node:test + node:assert. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

const NL_PATH_DIR = "C:\\Program Files\\WARPScoutGUI";
const DEFAULT_WS = NL_PATH_DIR + "\\bin\\warpscout.exe";
const DATA_BASE = "C:\\Users\\Tester\\AppData\\Roaming";

// фейковый Neutralino с os.getPath/getStats — ровно то, что нужно computePaths
function fakeNL({ files = {}, dirs = {}, store = {} } = {}) {
  return {
    os: {
      getPath: async (kind) => (kind === "data" ? DATA_BASE : "C:\\Users\\Tester\\Documents"),
    },
    storage: {
      getData: async (k) => (k in store ? store[k] : null),
      setData: async (k, v) => { store[k] = String(v); },
    },
    filesystem: {
      readFile: async (p) => { if (!(p in files)) throw new Error("ENOENT: " + p); return files[p]; },
      writeFile: async (p, v) => { files[p] = String(v); },
      remove: async (p) => { delete files[p]; delete dirs[p]; },
      createDirectory: async (p) => { dirs[p] = true; },
      getStats: async (p) => {
        if (p in files) return { isFile: true, isDirectory: false, type: "FILE", size: 1 };
        if (p in dirs) return { isFile: false, isDirectory: true, type: "DIRECTORY" };
        throw new Error("ENOENT: " + p);
      },
      readDirectory: async (p) => {
        if (!(p in dirs)) throw new Error("ENOENT: " + p);
        return Object.keys(files)
          .filter((f) => f.indexOf(p + "\\") === 0 && !(f.slice(p.length + 1) in dirs))
          .map((f) => ({ type: "FILE", path: f }));
      },
    },
  };
}

function toastsOf(doc) {
  const box = doc.querySelector("#toasts");
  return (box && box.children ? box.children : []).map((el) => ({
    text: el.children && el.children[1] ? el.children[1].textContent : "",
    kind: el.className || "",
  }));
}

/* ── FE-21: пользовательский путь warpscout не самоуничтожается ── */

test("FE-21: custom-путь не найден, бинарь найден в штатном месте — настройка СОХРАНАЕТСЯ + тост-конфликт", async () => {
  const custom = "C:\\Custom\\ws\\warpscout.exe";
  const files = {}, store = {};
  const nl = fakeNL({ files, store });
  files[DEFAULT_WS] = "MZ"; // найден ТОЛЬКО штатный бинарь
  const { wsgui, document } = loadApp({ nlOs: "Windows", neutralino: nl, autoDom: true });
  wsgui.S.settings.wsPath = custom;
  await wsgui.computePaths();
  // раньше здесь было S.settings.wsPath = "" + persist — самоуничтожение молча
  assert.strictEqual(wsgui.S.settings.wsPath, custom, "настройка пользователя затёрта!");
  assert.strictEqual(wsgui.S.paths.wsPath, DEFAULT_WS, "рабочим должен стать найденный штатный бинарь");
  const ts = toastsOf(document);
  assert.ok(ts.some((t) => t.text.indexOf(DEFAULT_WS) !== -1), "нет тоста-конфликта с найденным путём");
});

test("FE-21: custom-путь существует — используется он сам, без тоста-конфликта", async () => {
  const custom = "C:\\MyWS\\warpscout.exe";
  const files = {};
  const nl = fakeNL({ files });
  files[custom] = "MZ";
  files[DEFAULT_WS] = "MZ";
  const { wsgui, document } = loadApp({ nlOs: "Windows", neutralino: nl, autoDom: true });
  wsgui.S.settings.wsPath = custom;
  await wsgui.computePaths();
  assert.strictEqual(wsgui.S.paths.wsPath, custom, "легитимный custom должен побеждать (кандидаты custom — первыми)");
  assert.ok(!toastsOf(document).some((t) => t.text.indexOf(DEFAULT_WS) !== -1), "тост-конфликт не нужен");
});

test("FE-21: custom не задан — никакого тоста-конфликта", async () => {
  const files = {};
  const nl = fakeNL({ files });
  files[DEFAULT_WS] = "MZ";
  const { wsgui, document } = loadApp({ nlOs: "Windows", neutralino: nl, autoDom: true });
  wsgui.S.settings.wsPath = "";
  await wsgui.computePaths();
  assert.strictEqual(wsgui.S.paths.wsPath, DEFAULT_WS);
  assert.ok(toastsOf(document).length === 0, "чистый запуск не должен тостить про конфликт путей");
});

/* ── SEC-A1 п.4: .bak-копии аккаунта учитываются при миграции (пересечение с FE-22) ── */

test("SEC-A1: migrateData переносит .bak-копии аккаунта (копия+проверка+удаление источника)", async () => {
  const oldRoot = "C:\\Old", newRoot = "C:\\New";
  const files = {}, dirs = {};
  dirs[oldRoot] = true; dirs[oldRoot + "\\reports"] = true; dirs[newRoot] = true;
  files[oldRoot + "\\warpscout-account.json"] = '{"id":"x","private_key":"k"}';
  files[oldRoot + "\\warpscout-account.json.bak-2026-10-12T10-00-00"] = '{"id":"old1"}';
  files[oldRoot + "\\warpscout-account.json.bak-2026-10-12T11-00-00"] = '{"id":"old2"}';
  files[oldRoot + "\\unrelated.txt"] = "не трогаем";
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: fakeNL({ files, dirs }) });
  const r = await wsgui.migrateData(oldRoot, newRoot);
  assert.ok(r.moved.indexOf("warpscout-account.json") !== -1);
  assert.ok(r.moved.indexOf("warpscout-account.json.bak-2026-10-12T10-00-00") !== -1, ".bak не перенесён");
  assert.ok(r.moved.indexOf("warpscout-account.json.bak-2026-10-12T11-00-00") !== -1, ".bak не перенесён");
  assert.ok(r.moved.indexOf("unrelated.txt") === -1, "чужой файл не должен трогаться");
  // источник удалён — приватный ключ не остаётся в старой папке
  assert.ok(!(oldRoot + "\\warpscout-account.json.bak-2026-10-12T10-00-00" in files), "источник .bak остался в старой папке");
  // содержимое на месте
  assert.strictEqual(files[newRoot + "\\warpscout-account.json.bak-2026-10-12T11-00-00"], '{"id":"old2"}');
});

test("SEC-A1: конфликт имени .bak в новой папке — источник сохранён, конфликт зафиксирован", async () => {
  const oldRoot = "C:\\Old", newRoot = "C:\\New";
  const files = {}, dirs = {};
  dirs[oldRoot] = true; dirs[newRoot] = true;
  const BAK = "warpscout-account.json.bak-2026-10-12T10-00-00";
  files[oldRoot + "\\warpscout-account.json"] = '{"id":"x","private_key":"k"}';
  files[oldRoot + "\\" + BAK] = '{"id":"old"}';
  files[newRoot + "\\" + BAK] = '{"id":"занято"}';
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: fakeNL({ files, dirs }) });
  const r = await wsgui.migrateData(oldRoot, newRoot);
  assert.ok(r.conflicts.indexOf(BAK) !== -1, "конфликт не зафиксирован");
  assert.strictEqual(files[oldRoot + "\\" + BAK], '{"id":"old"}', "источник .bak удалён при конфликте — нельзя");
  assert.strictEqual(files[newRoot + "\\" + BAK], '{"id":"занято"}', "destination перезаписан — нельзя (F15)");
});
