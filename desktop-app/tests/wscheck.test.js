/* ═══════════════════════════════════════════════════════════════
   v2.6.3: регрессия «warpscout: не найден» / «версию получить
   не удалось» при живом exe (появилась в 2.6.2, отчёт пользователя).
   Механика: FE-3 сделал synthetic exit двухтактным (2 × 5 c), а
   checkWarpscoutRun сдавался по своему таймауту 8 c с exitCode = null;
   гейт F37 (exitCode ∈ {0, 143, -1}) null не прощал и отвергал валидный
   stdout «0.16.0». В 2.6.1 свип был однотактным (5 c < 8 c) и успевал.
   Фикс 2.6.3: таймаут 12 c (больше свипа) + прощение exitCode == null
   ТОЛЬКО при killedByTimeout (наш killProc не синтезирует exit).
   Тесты гоняют checkWarpscout с фейком os.spawnProcess и РУЧНОЙ
   доставкой событий spawnedProcess (та же форма, что у реального моста:
   {action:"stdOut"|"stdErr"|"exit", data, id}).
   Ноль внешних зависимостей: node:test + node:assert.
   ═══════════════════════════════════════════════════════════════ */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadApp } = require("./helpers/loadApp.js");

const NL_PATH = "C:\\Program Files\\WARPScoutGUI";
const WS_EXE = NL_PATH + "\\bin\\warpscout.exe";

/* Фейковый Neutralino: warpscout.exe лежит на штатном месте (bin рядом с GUI),
   os.spawnProcess выдаёт процесс с ручной доставкой событий через nl.__emit. */
function fakeSpawnNL(opts) {
  const o = opts || {};
  const evtHandlers = [];
  const spawned = [];
  const nl = {
    os: {
      getPath: async () => "C:\\Users\\Tester\\AppData\\Roaming",
      spawnProcess: async (cmd) => {
        spawned.push(cmd);
        const p = { id: 100 + spawned.length };
        if (o.onSpawn) o.onSpawn(p, nl);
        return p;
      },
      updateSpawnedProcess: async () => { if (o.onKill) o.onKill(); },
      getSpawnedProcesses: async () => [],
    },
    events: {
      on: (name, cb) => { if (name === "spawnedProcess") evtHandlers.push(cb); },
      dispatch: async () => true,
    },
    storage: { getData: async () => null, setData: async () => {} },
    filesystem: {
      getStats: async (p) => {
        if (String(p).toLowerCase() === WS_EXE.toLowerCase()) return { isFile: true, isDirectory: false };
        throw new Error("ENOENT: " + p);
      },
      readFile: async (p) => { throw new Error("ENOENT: " + p); },
      writeFile: async () => {},
      createDirectory: async () => {},
      readDirectory: async () => [],
    },
    __emit(id, action, data) {
      for (const cb of evtHandlers) cb({ detail: { id, action, data } });
    },
    __spawned: spawned,
  };
  return nl;
}

/* Подменяем setTimeout в контексте ДО вызова checkWarpscout: таймаут-хендлер
   checkWarpscoutRun исполняется сразу (мгновенная «истечение 12 секунд»),
   тест не ждёт реальных секунд. Реальный host-setTimeout не используется. */
function captureTimers(sandbox) {
  const fired = [];
  sandbox.setTimeout = (fn) => { fired.push(fn); return 1; };
  return fired;
}

function fireTimers(fired) {
  for (const fn of fired.splice(0)) { try { fn(); } catch (e) { /* как реальный таймер */ } }
}

test("WSCHK: exit-событие ПОТЕРЯНО, stdout «0.16.0» дошёл — версия принимается (регресс 2.6.2, таймаут-килл)", async () => {
  const nl = fakeSpawnNL({
    onSpawn: (p, n) => { n.__emit(p.id, "stdOut", "0.16.0\n"); /* exit не приходит никогда */ },
  });
  const { sandbox, document, wsgui } = loadApp({ nlOs: "Windows", neutralino: nl, autoDom: true });
  wsgui.bindProcEvents();
  const fired = captureTimers(sandbox);
  const pending = wsgui.checkWarpscout(true); // промис висит до «таймаута»
  await new Promise((r) => setImmediate(r)); // прокрутить spawn-цепочку: registerProc + установка таймаута
  fireTimers(fired); // таймаут-хендлер: killedByTimeout → killProc → finish
  await new Promise((r) => setImmediate(r)); // микротаски таймаут-хендлера
  const ok = await pending;
  assert.strictEqual(ok, true, "валидная версия из stdout должна приниматься при потерянном exit");
  const st = document.getElementById("stWs");
  assert.ok(st && /is-ok/.test(st.className), "статусная строка — is-ok");
});

test("WSCHK: exit 0 приходит штатно — версия принимается (поведение 2.6.1 не изменено)", async () => {
  const nl = fakeSpawnNL({
    onSpawn: (p, n) => {
      n.__emit(p.id, "stdOut", "0.16.0\n");
      n.__emit(p.id, "exit", 0);
    },
  });
  const { sandbox, wsgui } = loadApp({ nlOs: "Windows", neutralino: nl, autoDom: true });
  wsgui.bindProcEvents();
  captureTimers(sandbox);
  const ok = await wsgui.checkWarpscout(true);
  assert.strictEqual(ok, true, "штатный exit 0 — версия принимается");
});

test("WSCHK: настоящий ненулевой exit (антивирус-обёртка) — версия ОТВЕРГАЕТСЯ (гейт F37 жив)", async () => {
  const nl = fakeSpawnNL({
    onSpawn: (p, n) => {
      n.__emit(p.id, "stdOut", "0.16.0\n");
      n.__emit(p.id, "exit", 1); // реальный код ошибки — не наш килл
    },
  });
  const { sandbox, wsgui } = loadApp({ nlOs: "Windows", neutralino: nl, autoDom: true });
  wsgui.bindProcEvents();
  captureTimers(sandbox);
  const ok = await wsgui.checkWarpscout(true);
  assert.strictEqual(ok, false, "ненулевой настоящий код — версия не принимается");
});

test("WSCHK: stdout не версия — отвергается независимо от exit (мусор в stdout)", async () => {
  const nl = fakeSpawnNL({
    onSpawn: (p, n) => {
      n.__emit(p.id, "stdOut", " AV scanned OK \n");
      n.__emit(p.id, "exit", 0);
    },
  });
  const { sandbox, wsgui } = loadApp({ nlOs: "Windows", neutralino: nl, autoDom: true });
  wsgui.bindProcEvents();
  captureTimers(sandbox);
  const ok = await wsgui.checkWarpscout(true);
  assert.strictEqual(ok, false, "stdout без версии — fail при любом exit-коде");
});

test("WSCHK: бинаря нет ни в одном кандидате — fail (ветка «не найден»)", async () => {
  const nl = fakeSpawnNL({});
  nl.filesystem.getStats = async () => { throw new Error("ENOENT"); };
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: nl, autoDom: true });
  wsgui.bindProcEvents();
  const ok = await wsgui.checkWarpscout(true);
  assert.strictEqual(ok, false, "файла нет — fail без запуска процесса");
});

test("WSCHK v2.6.9: custom не задан — найденный штатный путь НЕ записывается в настройки (регресс вечного data.22 после обновления APK)", async () => {
  // v2.4.0-нормализация писала найденный путь в S.settings.wsPath даже при пустом
  // custom. На Android этот путь (/data/app/~~<random>/…) меняется при каждом
  // обновлении приложения → сохранённая копия протухала → data.22 при каждом
  // запуске. Теперь пустой custom остаётся пустым: путь резолвится динамически.
  const nl = fakeSpawnNL({
    onSpawn: (p, n) => {
      n.__emit(p.id, "stdOut", "0.16.0\n");
      n.__emit(p.id, "exit", 0);
    },
  });
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: nl, autoDom: true });
  wsgui.bindProcEvents();
  wsgui.S.settings.wsPath = "";
  const ok = await wsgui.checkWarpscout(true);
  assert.strictEqual(ok, true, "штатный бинарь должен находиться и проверяться");
  assert.strictEqual(wsgui.S.settings.wsPath, "", "автозапись найденного пути в настройки запрещена (v2.6.9)");
  assert.strictEqual(wsgui.S.paths.wsPath, WS_EXE, "рабочий путь при этом найден");
});

test("WSCHK v2.6.9: custom задан явно — нормализация в точный путь exe сохранена (легитимный сценарий)", async () => {
  const nl = fakeSpawnNL({
    onSpawn: (p, n) => {
      n.__emit(p.id, "stdOut", "0.16.0\n");
      n.__emit(p.id, "exit", 0);
    },
  });
  const { wsgui } = loadApp({ nlOs: "Windows", neutralino: nl, autoDom: true });
  wsgui.bindProcEvents();
  wsgui.S.settings.wsPath = "C:\\Program Files\\WARPScoutGUI\\bin"; // пользователь указал ПАПКУ
  await wsgui.checkWarpscout(true);
  assert.strictEqual(wsgui.S.settings.wsPath, WS_EXE, "явный custom нормализуется до точного пути exe (как в v2.4.0)");
});
