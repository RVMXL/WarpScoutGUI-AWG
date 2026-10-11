/* ═══════════════════════════════════════════════════════════════
   WARPSCOUT GUI — Android-шим Neutralino API (v2.5.1)
   Подключается в APK вместо js/neutralino.js (до app.js/mock.js).
   Реализует через AndroidNative-мост ровно тот сурфейс, что
   использует app.js (см. также mock.js — тот же контракт):
     Neutralino.init, events.on("ready"|"spawnedProcess")
     os.spawnProcess / execCommand / killProcess /
       updateSpawnedProcess / getSpawnedProcesses
     os.showSaveDialog / showOpenDialog / showFolderDialog
     os.getPath("data") / os.open
     fs.readFile / writeFile / writeBinaryFile / readDirectory /
       getStats / createDirectory / remove
     storage.setData / getData
   Пути: NL_PATH = filesDir; warpscout — libwarpscout.so из
   nativeLibraryDir (путь в window.NL_WS_PATH).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (typeof window.AndroidNative === "undefined") return; // не Android-оболочка

  const B = window.AndroidNative;

  function jparse(s, fallback) {
    try { return JSON.parse(s); } catch (e) { return fallback; }
  }
  /* мост синхронный; уводим в таймер, {error} → reject */
  function asyncCall(fn) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const r = jparse(fn(), null);
          if (r === null) return reject(new Error("bridge: bad json"));
          if (r.error) return reject(new Error(r.error));
          resolve(r);
        } catch (e) { reject(e); }
      }, 0);
    });
  }
  /* диалоговые методы моста возвращают чистую строку URI (или "") */
  function asyncString(fn) {
    return new Promise((resolve) => {
      setTimeout(() => {
        try { resolve(String(fn() || "")); } catch (e) { resolve(""); }
      }, 0);
    });
  }

  const INFO = jparse(B.deviceInfo(), {}) || {};

  /* ── NL_* глобальные (app.js читает их до init) ── */
  window.NL_PATH = INFO.nlPath || "/data/user/0/ru.warpscout.gui/files";
  window.NL_CWD = INFO.nlCwd || window.NL_PATH;
  window.NL_OS = "Android";
  window.NL_APPVERSION = INFO.appVersion || "2.5.0";
  window.NL_VERSION = "6.1.0"; // совместимость шима с рантаймом 6.x
  window.NL_WS_PATH = INFO.wsPath || ""; // libwarpscout.so в nativeLibraryDir

  /* ── шина событий (ready / spawnedProcess) ── */
  function dispatchNL(name, detail) {
    window.dispatchEvent(new CustomEvent("nl-ev:" + name, { detail: detail }));
  }
  // Java → JS: события процессов
  window.__nlEmit = function (evt) {
    if (!evt || typeof evt !== "object") return;
    if (evt.action) dispatchNL("spawnedProcess", evt);
  };

  window.Neutralino = {
    init() {
      setTimeout(() => dispatchNL("ready", {}), 50);
    },
    os: {
      execCommand(cmd) {
        return asyncCall(() => B.execSync(String(cmd)));
      },
      spawnProcess(cmd) {
        return asyncCall(() => B.execStream(String(cmd)));
      },
      killProcess(id) {
        try { B.procKill(Number(id) || 0); } catch (e) {}
        return Promise.resolve();
      },
      updateSpawnedProcess(id, action) {
        if (action === "exit") { try { B.procKill(Number(id) || 0); } catch (e) {} }
        return Promise.resolve();
      },
      getSpawnedProcesses() {
        let list = [];
        try { list = jparse(B.procList(), []) || []; } catch (e) {}
        return Promise.resolve(list);
      },
      showSaveDialog(title, opts) {
        const name = (opts && opts.defaultPath) || "warp.conf";
        const ext = (name.split(".").pop() || "").toLowerCase();
        const MIME = { conf: "text/plain", txt: "text/plain", json: "application/json",
          csv: "text/csv", html: "text/html", svg: "image/svg+xml", png: "image/png", log: "text/plain" };
        return asyncString(() => B.saveDialog(String(title || ""), String(name), MIME[ext] || "*/*"));
      },
      showOpenDialog() {
        return asyncString(() => B.openDialog("Выберите файл", "*/*"));
      },
      showFolderDialog() {
        // SAF-выбор дерева каталогов в v1 не поддержан — пустая строка =
        // «отмена» в логике app.js; объясняем пользователю
        setTimeout(() => {
          try { window.alert("На Android смена папки данных недоступна — данные хранятся в приватной папке приложения."); } catch (e) {}
        }, 0);
        return Promise.resolve("");
      },
      open(path) {
        try { B.openPath(String(path)); } catch (e) {}
        return Promise.resolve();
      },
      getPath(kind) {
        return asyncCall(() => B.getPath(String(kind || "data")))
          .then((r) => r.path || r.data || "");
      },
    },
    filesystem: {
      readFile(path) {
        return asyncCall(() => B.fsRead(String(path))).then((r) => r.data);
      },
      writeFile(path, data) {
        return asyncCall(() => B.fsWrite(String(path), String(data == null ? "" : data)))
          .then(() => true);
      },
      writeBinaryFile(path, buf) {
        let bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
        let bin = "";
        const CH = 0x8000;
        for (let i = 0; i < bytes.length; i += CH) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
        }
        const b64 = btoa(bin);
        return asyncCall(() => B.fsWriteBin(String(path), b64)).then(() => true);
      },
      readBinaryFile(path) {
        return asyncCall(() => B.fsReadBin(String(path))).then((r) => {
          const s = atob(r.b64 || "");
          const out = new Uint8Array(s.length);
          for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
          return out.buffer;
        });
      },
      readDirectory(path) {
        return asyncCall(() => B.fsReadDir(String(path)))
          .then((r) => (Array.isArray(r) ? r : []));
      },
      getStats(path) {
        return asyncCall(() => B.fsStats(String(path)));
      },
      createDirectory(path) {
        return asyncCall(() => B.fsMkdir(String(path))).then(() => true);
      },
      remove(path) {
        return asyncCall(() => B.fsRemove(String(path))).then(() => true);
      },
      copyFile(src, dst) {
        return asyncCall(() => B.fsCopy(String(src), String(dst))).then(() => true);
      },
    },
    storage: {
      setData(key, value) {
        try { B.storeSet(String(key), String(value == null ? "" : value)); } catch (e) {}
        return Promise.resolve();
      },
      getData(key) {
        return asyncCall(() => B.storeGet(String(key))).then((r) => r.data);
      },
    },
    clipboard: {
      writeText(t) {
        try { B.clipboardWrite(String(t == null ? "" : t)); } catch (e) {}
        return Promise.resolve();
      },
    },
    events: {
      on(name, handler) {
        window.addEventListener("nl-ev:" + name, (e) => {
          try { handler({ detail: e.detail }); } catch (err) {}
        });
        return Promise.resolve();
      },
      off() { return Promise.resolve(); },
      dispatch(name, detail) { dispatchNL(name, detail); return Promise.resolve(); },
    },
    app: { exit() { return Promise.resolve(); } },
    debug: { log() {} },
    path: {},
  };
})();
