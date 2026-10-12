/* ═══ WSG · 01-platform — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 10–205.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

  /* ───────── утилиты ───────── */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const IS_MOCK = typeof window.Neutralino !== "undefined" && window.Neutralino.mock === true;
  const HAS_NL = typeof window.Neutralino !== "undefined";

  /* ───── v2.5.0: платформенный слой (Windows / Linux); v2.5.1: + macOS ─────
     Windows — прежнее поведение (ни одна ветка ниже не меняет логику).
     Linux (NL_OS = "Linux"): бинарник warpscout без .exe, POSIX-разделитель
     путей, chmod +x вместо PowerShell Unblock-File, папка данных
     ~/.local/share/<имя>.
     macOS (NL_OS = "Darwin"): всё POSIX-поведение Linux переиспользуется как
     есть (IS_LINUX = !IS_WIN), поверх — mac-замены фраз (Console.app вместо
     journalctl) и mac-пути данных ~/Library/Application Support/<имя>.
     Папка данных на всех ОС — os.getPath("data") (кроссплатформенно).
     В браузерном демо (IS_MOCK) остаёмся win-подобными,
     чтобы демо соответствовало Windows-релизу. */
  const IS_WIN0_RAW = typeof window.NL_OS === "string" ? window.NL_OS : "";
  const IS_ANDROID = /^android/i.test(IS_WIN0_RAW);
  const IS_WIN = IS_ANDROID ? false : (IS_MOCK || IS_WIN0_RAW === "" ? true : /^win/i.test(IS_WIN0_RAW));
  const IS_LINUX = !IS_WIN;
  const IS_MAC = !IS_WIN && /^darwin|^mac/i.test(typeof window.NL_OS === "string" ? window.NL_OS : "");
  /* v2.5.0: Android (WebView-оболочка APK): NL_OS = "Android" ставит шим
     neutralino-android.js (window.Neutralino реализован через AndroidNative-мост).
     Поведение как на Linux (POSIX, chmod), бинарь warpscout — libwarpscout.so
     из nativeLibraryDir (путь приходит в window.NL_WS_PATH).
     TOUCH_UI — сенсорный режим: нижние вкладки + главная страница. */
  const TOUCH_UI = IS_ANDROID || /(?:^|[?&])touch=1/.test(typeof location === "object" && location ? String(location.search) : "");
  // v2.5.4 (Android): публичная папка готовых конфигов — видна в любом
  // файловом менеджере и без разрешений пишется через MediaStore (API 29+)
  const ANDROID_DOWNLOAD_DIR = "/storage/emulated/0/Download/WARPScoutGUI";
  const WS_EXE = IS_WIN ? "warpscout.exe" : "warpscout";
  const GUI_EXE = IS_WIN ? "WARPScoutGUI.exe" : "WARPScoutGUI";
  const PSEP = IS_WIN ? "\\" : "/";
  // v2.5.4: UTF-8 → base64 для моста saveToDownloads (там Base64.decode)
  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(String(str == null ? "" : str));
    let bin = "";
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    return btoa(bin);
  }
  // платформенный join: на Windows ведёт себя как старые конкатенации с "\\",
  // на Linux — с "/" (лишние хвостовые разделители и ведущие у хвоста срезаются)
  function pxJoin() {
    let out = "";
    for (let i = 0; i < arguments.length; i++) {
      const part = String(arguments[i] == null ? "" : arguments[i]).replace(/[\\/]+$/, "");
      if (!part) continue;
      out = out ? out + PSEP + part.replace(/^[\\/]+/, "") : part;
    }
    return out;
  }
  // Linux-замены целых фраз: [исходный RU-ключ, linux-RU, linux-EN].
  // Применяются к КЛЮЧУ ДО словаря (platKey), поэтому EN-перевод находится.
  const LINUX_TEXT = [
    ["🔓 Разблокировать exe (антивирус)", "🔓 Разрешить запуск (chmod +x)", "🔓 Allow execution (chmod +x)"],
    ["Unblock-File выполнен: с exe снята метка «скачано из интернета». Попробуйте регистрацию ещё раз.",
     "chmod +x выполнен: право на запуск выдано. Попробуйте регистрацию ещё раз.",
     "chmod +x done: the execute permission has been granted. Try registering again."],
    ["Не удалось выполнить Unblock-File: {err}", "Не удалось выполнить chmod +x: {err}", "Could not run chmod +x: {err}"],
    ["warpscout.exe не найден. Распакуйте ZIP целиком (рядом с WARPScoutGUI.exe должна лежать папка bin с warpscout.exe) или укажите путь в Настройках. Если файл на месте — добавьте папку в исключения антивируса.",
     "warpscout не найден. Распакуйте архив целиком (рядом с WARPScoutGUI должна лежать папка bin с warpscout) или укажите путь в Настройках. Если файл на месте — выдайте ему право на запуск: chmod +x bin/warpscout (или кнопкой «Разрешить запуск» во вкладке «Аккаунт»).",
     "warpscout was not found. Unpack the archive entirely (a bin folder with warpscout must sit next to WARPScoutGUI) or set the path in Settings. If the file is there — grant it the execute permission: chmod +x bin/warpscout (or use the 'Allow execution' button on the 'Account' tab)."],
    ["Код -1: warpscout.exe не смог запуститься или был закрыт. Причины: антивирус заблокировал файл; ZIP распакован не целиком (нет папки bin с warpscout.exe); неверный путь в Настройках. Проверьте папку кнопкой «Открыть папку» и добавьте её в исключения антивируса.",
     "Код -1: warpscout не смог запуститься или был закрыт. Причины: нет права на запуск (выдайте: chmod +x bin/warpscout, или кнопкой «Разрешить запуск» во вкладке «Аккаунт»); архив распакован не целиком (нет папки bin с warpscout); неверный путь в Настройках. Проверьте папку кнопкой «Открыть папку».",
     "Exit code -1: warpscout failed to start or was closed. Causes: no execute permission (grant it: chmod +x bin/warpscout, or via the 'Allow execution' button on the 'Account' tab); the archive was not fully unpacked (no bin folder with warpscout); a wrong path in Settings. Check the folder via 'Open folder'."],
    ["warpscout не отвечает — проверьте путь и антивирус", "warpscout не отвечает — проверьте путь и право на запуск (chmod +x)", "warpscout is not responding — check the path and the execute permission (chmod +x)"],
    ["Файл найден ({p}), но версию получить не удалось — вероятно, антивирус мешает запуску. Откройте вкладку «Аккаунт» и нажмите «Разблокировать exe», либо добавьте папку в исключения антивируса.",
     "Файл найден ({p}), но версию получить не удалось — возможно, у файла нет права на запуск. Выдайте его: chmod +x <файл>, либо кнопкой «Разрешить запуск» во вкладке «Аккаунт».",
     "The file was found ({p}), but its version could not be obtained — the execute permission may be missing. Grant it: chmod +x <file>, or via the 'Allow execution' button on the 'Account' tab."],
    ["Если регистрация падает с «кодом -1»: «Проверить warpscout» показывает, запускается ли exe вообще; «Разблокировать exe» снимает метку «скачано из интернета» (PowerShell Unblock-File); папку из предыдущей кнопки добавьте в исключения антивируса.",
     "Если регистрация падает с «кодом -1»: «Проверить warpscout» показывает, запускается ли warpscout вообще; «Разрешить запуск» выдаёт право на выполнение (chmod +x) — на Linux это частая причина «кода -1» сразу после распаковки архива.",
     "If registration fails with 'exit code -1': 'Check warpscout' shows whether warpscout starts at all; 'Allow execution' grants the execute permission (chmod +x) — on Linux this is the common cause of 'exit code -1' right after unpacking the archive."],
    ["Проверка перед запуском показала версию {v} — сам exe запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: добавьте папку в исключения антивируса (и нажмите «Разблокировать exe»), затем повторите.",
     "Проверка перед запуском показала версию {v} — сам warpscout запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: проверьте системный журнал (journalctl) и повторите попытку.",
     "The preflight check reported version {v} — warpscout itself starts and the path is correct. The process seems to get closed during registration: check the system journal (journalctl) and retry."],
    ["Доступно только в приложении Windows", "Доступно только в приложении", "Available in the desktop app only"],
  ];
  const LINUX_KEY_MAP = {};
  LINUX_TEXT.forEach((row) => { LINUX_KEY_MAP[row[0]] = row[1]; });
  /* v2.5.1: mac-замены целых фраз поверх linux-вариантов: [linux-RU, mac-RU, mac-EN].
     Применяются только на macOS (IS_MAC) — на Linux поведение прежнее. */
  const MAC_TEXT = [
    ["Если регистрация падает с «кодом -1»: «Проверить warpscout» показывает, запускается ли warpscout вообще; «Разрешить запуск» выдаёт право на выполнение (chmod +x) — на Linux это частая причина «кода -1» сразу после распаковки архива.",
     "Если регистрация падает с «кодом -1»: «Проверить warpscout» показывает, запускается ли warpscout вообще; «Разрешить запуск» выдаёт право на выполнение (chmod +x) — на macOS это частая причина «кода -1» сразу после распаковки архива (метку quarantine Gatekeeper снимает: xattr -cr . в папке программы — см. README).",
     "If registration fails with 'exit code -1': 'Check warpscout' shows whether warpscout starts at all; 'Allow execution' grants the execute permission (chmod +x) — on macOS this is the common cause of 'exit code -1' right after unpacking the archive (the Gatekeeper quarantine label is cleared by: xattr -cr . in the app folder — see README)."],
    ["Проверка перед запуском показала версию {v} — сам warpscout запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: проверьте системный журнал (journalctl) и повторите попытку.",
     "Проверка перед запуском показала версию {v} — сам warpscout запускается, путь верный. Похоже, процесс закрывается уже во время регистрации: проверьте Console (Программы → Утилиты → Console) и повторите попытку.",
     "The preflight check reported version {v} — warpscout itself starts and the path is correct. The process seems to get closed during registration: check Console (Applications → Utilities → Console) and retry."],
  ];
  const MAC_KEY_MAP = {};
  MAC_TEXT.forEach((row) => { MAC_KEY_MAP[row[0]] = row[1]; });
  // нормализация ключей/строк для Linux/macOS: имена файлов, разделители, пути.
  // v2.5.1: папка данных в шаблонах — по платформе (os.getPath("data")):
  //   Linux — ~/.local/share/<имя>, macOS — ~/Library/Application Support/<имя>
  const UNIX_DATA_DIR = IS_ANDROID ? "папка данных приложения" : IS_MAC ? "~/Library/Application Support/WARPScoutGUI" : "~/.local/share/WARPScoutGUI";
  function platNorm(s) {
    return String(s)
      .replace(/warpscout\.exe/g, "warpscout")
      .replace(/WARPScoutGUI\.exe/g, "WARPScoutGUI")
      .replace(/bin\\warpscout/g, "bin/warpscout")
      .replace(/%APPDATA%\\WARPScoutGUI/g, UNIX_DATA_DIR)
      .replace(/ \(EBWebView\)/g, "");
  }
  function platKey(s) {
    if (IS_WIN) return s;
    const raw = String(s);
    if (Object.prototype.hasOwnProperty.call(LINUX_KEY_MAP, raw)) {
      const lk = LINUX_KEY_MAP[raw];
      if (IS_MAC && Object.prototype.hasOwnProperty.call(MAC_KEY_MAP, lk)) return MAC_KEY_MAP[lk]; // v2.5.1
      return lk;
    }
    return platNorm(raw);
  }
  function linuxPlatInit() {
    if (!IS_LINUX) return; // Windows — словарь не трогаем вовсе
    // EN-словарь ключится исходными RU-строками; продублируем ключи в
    // linux-нормализованном виде, чтобы t() находил перевод после platKey.
    Object.keys(I18N_EN).forEach((k) => {
      const nk = platKey(k);
      if (nk !== k && I18N_EN[nk] === undefined) I18N_EN[nk] = platNorm(I18N_EN[k]);
    });
    LINUX_TEXT.forEach((row) => { if (I18N_EN[row[1]] === undefined) I18N_EN[row[1]] = row[2]; });
    if (IS_MAC) {
      // v2.5.1: mac-варианты фраз (Console.app вместо journalctl и т. п.) —
      // ключ и EN-перевод добавляются поверх linux-дублей.
      MAC_TEXT.forEach((row) => { if (I18N_EN[row[1]] === undefined) I18N_EN[row[1]] = row[2]; });
    }
  }


  function toast(msg, kind) {
    const box = $("#toasts");
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " toast--" + kind : "");
    const icons = { ok: "✅", err: "⛔", warn: "⚠️", info: "ℹ️" };
    const ico = document.createElement("span");
    ico.className = "toast__ico";
    ico.setAttribute("aria-hidden", "true");
    ico.textContent = icons[kind] || "ℹ️";
    const txt = document.createElement("span");
    txt.className = "toast__txt";
    txt.textContent = msg;
    el.appendChild(ico);
    el.appendChild(txt);
    box.appendChild(el);
    setTimeout(() => el.classList.add("toast--out"), 3200);
    setTimeout(() => el.remove(), 3500);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function flagEmoji(cc) {
    if (!cc || !/^[A-Za-z]{2}$/.test(cc)) return "";
    return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    const loc = LANG === "en" ? "en-GB" : "ru-RU";
    return d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }) + ", " +
      d.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" });
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg || t("Скопировано"), "ok");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } // v2.4.6 (F55): false — тоже неудача
      ta.remove();
      if (ok) toast(okMsg || t("Скопировано"), "ok");
      else toast(t("Не удалось скопировать"), "err");
    }
  }

