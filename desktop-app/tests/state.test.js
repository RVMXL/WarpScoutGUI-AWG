/* v2.6.2 (аудит FE-20/FE-22 + QUAL-B/QUAL-F): персистенс и миграции данных.
   Харнесс loadApp({ neutralino }) подставляет фейковый Neutralino
   (storage + filesystem) ДО вычисления HAS_NL/IS_MOCK. Ноль внешних
   зависимостей: node:test + node:assert. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

// in-memory FS: files{путь→текст}, dirs{путь→true}, store{ключ→текст}
function fakeNL({ files = {}, dirs = {}, store = {} } = {}) {
  return {
    storage: {
      getData: async (k) => (k in store ? store[k] : null),
      setData: async (k, v) => { store[k] = String(v); },
    },
    filesystem: {
      readFile: async (p) => { if (!(p in files)) throw new Error("ENOENT: " + p); return files[p]; },
      writeFile: async (p, v) => { files[p] = String(v); },
      remove: async (p) => { delete files[p]; delete dirs[p]; },
      createDirectory: async (p) => { dirs[p] = true; },
      readDirectory: async (p) => {
        if (!(p in dirs)) throw new Error("ENOENT: " + p);
        return Object.keys(files)
          .filter((f) => f.indexOf(p + "\\") === 0)
          .map((f) => ({ type: "FILE", path: f }));
      },
    },
  };
}

/* ── FE-20: тема и язык переживают рестарт ── */

test("FE-20: restoreState восстанавливает theme/lang (persist→restore→assert)", async () => {
  const store = {};
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: fakeNL({ store }) });
  store.state = JSON.stringify({ settings: { wsPath: "", dataRoot: "", theme: "light", lang: "en" } });
  await wsgui.restoreState();
  assert.strictEqual(wsgui.S.settings.theme, "light");
  assert.strictEqual(wsgui.S.settings.lang, "en");
});

test("FE-20: мусорные theme/lang отбрасываются — дефолт не затирается", async () => {
  const store = {};
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: fakeNL({ store }) });
  store.state = JSON.stringify({ settings: { theme: "banana", lang: "de" } });
  await wsgui.restoreState();
  assert.strictEqual(wsgui.S.settings.theme, undefined); // boot применит дефолт dark
  assert.strictEqual(wsgui.S.settings.lang, undefined);   // boot применит дефолт ru
});

test("FE-20: битый JSON состояния не роняет restoreState", async () => {
  const store = {};
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: fakeNL({ store }) });
  store.state = "{settings:{broken";
  await wsgui.restoreState(); // try/catch — тихий выход
  assert.ok(wsgui.S.settings);
});

/* ── FE-22/QUAL-F: migrateData — перенос с удалением источника ── */

test("FE-22: migrateData переносит отчёты и аккаунт и удаляет источники (после проверки записи)", async () => {
  const files = {
    "C:\\old\\reports\\warpscout-report-1.txt": "AAA",
    "C:\\old\\warpscout-account.json": '{"id":"x"}',
  };
  const dirs = { "C:\\old\\reports": true };
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: fakeNL({ files, dirs }) });
  const r = await wsgui.migrateData("C:\\old", "C:\\new");
  // прим.: значения из vm-реалма — deepStrictEqual по прототипу Array не годится
  assert.strictEqual(r.conflicts.length, 0, JSON.stringify(r));
  assert.ok(r.moved.includes("reports/warpscout-report-1.txt"), JSON.stringify(r));
  assert.ok(r.moved.includes("warpscout-account.json"), JSON.stringify(r));
  assert.strictEqual(files["C:\\old\\reports\\warpscout-report-1.txt"], undefined); // FE-22: источник удалён
  assert.strictEqual(files["C:\\new\\reports\\warpscout-report-1.txt"], "AAA");
  assert.strictEqual(files["C:\\old\\warpscout-account.json"], undefined);
  assert.strictEqual(files["C:\\new\\warpscout-account.json"], '{"id":"x"}');
});

test("FE-22: конфликт имён — источник НЕ удаляется (F15), файл остаётся в старой папке", async () => {
  const files = { "C:\\old\\reports\\r.txt": "OLD", "C:\\new\\reports\\r.txt": "NEW" };
  const dirs = { "C:\\old\\reports": true, "C:\\new\\reports": true };
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: fakeNL({ files, dirs }) });
  const r = await wsgui.migrateData("C:\\old", "C:\\new");
  assert.strictEqual(JSON.stringify(r.conflicts), JSON.stringify(["reports/r.txt"]));
  assert.strictEqual(files["C:\\old\\reports\\r.txt"], "OLD");
  assert.strictEqual(files["C:\\new\\reports\\r.txt"], "NEW");
});

test("FE-22: неудачная запись — источник сохранён, файл не числится в moved", async () => {
  const files = { "C:\\old\\reports\\r.txt": "OLD" };
  const dirs = { "C:\\old\\reports": true };
  const { wsgui } = loadApp({
    nlOs: "Windows",
    neutralino: (() => {
      const nl = fakeNL({ files, dirs });
      const realWrite = nl.filesystem.writeFile;
      nl.filesystem.writeFile = async (p, v) => {
        if (String(p).indexOf("C:\\new") === 0) throw new Error("disk full");
        return realWrite(p, v);
      };
      return nl;
    })(),
  });
  const r = await wsgui.migrateData("C:\\old", "C:\\new");
  assert.strictEqual(r.moved.length, 0, JSON.stringify(r));
  assert.strictEqual(files["C:\\old\\reports\\r.txt"], "OLD"); // не потеряли данные
});

test("FE-22: вложенность (новый корень внутри старого) — явный отказ", async () => {
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: fakeNL({}) });
  await assert.rejects(() => wsgui.migrateData("C:\\data", "C:\\data\\sub"), /внутри старой/);
});
