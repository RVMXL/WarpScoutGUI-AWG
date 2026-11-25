/* ═══ WSG · 05-scan-core — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 1384–1640.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

  /* ───────── построение команды скана ───────── */
  function joinArgs(pairs) {
    return pairs.filter(Boolean).join(" ");
  }

  /* ── v2.7.2: поддержка warpscout 0.17.0 — профиль -p awg31 ──
     Версия AWG — единый источник «Конфиг → Версия» (S.cfg.ver), как junk —
     S.cfg.obf (v2.7.0): при «awg31» скан/проверка/SOCKS идут с -p awg31 и
     таймингами 3.1 из S.cfg.obf — прогон проверяет ровно то, что уйдёт в
     конфиг. Старые warpscout (<0.17) флаг awg31 не знают — тихий откат к
     -p awg (хинт scan.obf.10). HPK warpscout сознательно не поддерживает
     (warp.go: «HeaderProtectionKey is omitted») — ключ только в конфиге. */
  function wsVersionParts(v) {
    const m = String(v == null ? "" : v).match(/(\d+)\.(\d+)(?:\.(\d+))?/);
    return m ? [+m[1], +m[2], +m[3] || 0] : null;
  }
  function wsSupports31() {
    const p = wsVersionParts(S.wsVersion);
    if (!p) return false; // версия неизвестна — безопасный обычный awg
    const need = [0, 17, 0];
    for (let i = 0; i < 3; i++) {
      if (p[i] !== need[i]) return p[i] > need[i];
    }
    return true;
  }
  function scanProtoOf(pr) {
    return pr === "awg" && String((S.cfg && S.cfg.ver) || "") === "awg31" && wsSupports31() ? "awg31" : pr;
  }
  // Тайминги 3.1 → флаги CLI: RANGE «N» или «MIN-MAX», один argv-токен
  // (только цифры и дефис — мусор/пустота молча пропускаются, как junk-дефолты)
  function awg31Args() {
    const o = (S.cfg && S.cfg.obf) || {};
    const a = [];
    const rng = (flag, v) => {
      const s = String(v == null ? "" : v).trim();
      if (/^\d+(-\d+)?$/.test(s)) a.push("-" + flag + " " + s);
    };
    rng("padding", o.cpa);            // ContentPaddingAddition
    rng("rekey-after", o.rekeyAfter); // RekeyAfterTime
    rng("rekey-timeout", o.rekeyTo);  // RekeyTimeout
    rng("reject-after", o.rejectAfter); // RejectAfterTime
    rng("keepalive-timeout", o.keepaliveTo); // KeepaliveTimeout
    rng("max-handshakes", o.maxHs);   // MaxHandshakeAttempts
    if (o.noCookies === "on") a.push("-disable-cookies");
    if (o.trailers === "on") a.push("-random-trailers");
    return a;
  }
  function awg31ArgStr() {
    const k = awg31Args();
    return k.length ? " " + k.join(" ") : "";
  }

  function buildScanArgs(s) {
    const a = [];
    // v2.4.6 (F01): enum-валидация на границе команды (см. SCAN_ENUMS выше)
    const proto = enumOf(s.proto, SCAN_ENUMS.proto, "awg");
    const isAwg = proto === "awg";
    const isMasque = proto === "masque" || proto === "masque-h2";
    // v2.7.2: -p awg31 при cfg.ver=awg31 и warpscout 0.17+ (иначе тихий -p awg)
    a.push("-p " + scanProtoOf(proto));
    if (s.tunPing) {
      a.push("-P");
      if (s.pingTarget && s.pingTarget.trim()) a.push("-ping-target " + safeVal(s.pingTarget));
      if (s.tunPingCount && +s.tunPingCount !== 10) a.push("-tun-ping-count " + Math.min(50, Math.max(5, Math.round(+s.tunPingCount))));
    }
    if (s.full) a.push("-f");
    else if (s.sample && +s.sample !== 5) a.push("-n " + Math.min(256, Math.max(1, Math.round(+s.sample))));
    if (s.port !== "" && s.port != null) a.push("-port " + Math.min(65535, Math.max(0, Math.round(+s.port))));
    if (s.jt && +s.jt !== 10) a.push("-jt " + Math.min(100, Math.max(1, Math.round(+s.jt))));
    if (s.timeout && +s.timeout !== 2) a.push("-t " + Math.min(30, Math.max(1, Math.round(+s.timeout))));
    if (s.ipv6) a.push("-6");
    if (s.target && s.target.trim()) a.push("-target " + safeVal(s.target));
    if (s.node && s.node.trim() && !isMasque) a.push("-node " + safeVal(s.node));
    if (s.country && s.country.trim() && !isMasque) a.push("-country " + safeVal(s.country));
    if (s.exclNode && s.exclNode.trim() && !isMasque) a.push("-exclude-node " + safeVal(s.exclNode));
    if (s.exclCountry && s.exclCountry.trim() && !isMasque) a.push("-exclude-country " + safeVal(s.exclCountry));
    if (s.through && s.through.trim()) {
      a.push("-through " + safeVal(s.through));
      if (s.innerProto) a.push("-inner-proto " + enumOf(s.innerProto, SCAN_ENUMS.innerProto, "wg"));
    }
    if (isAwg) {
      const gi1 = enumOf(s.genI1, SCAN_ENUMS.genI1, "");
      if (gi1) {
        a.push("-gen-i1 " + gi1);
        if (s.i1Sni && s.i1Sni.trim()) a.push("-i1-sni " + safeVal(s.i1Sni)); // валиден только вместе с -gen-i1
      }
      if (s.genJunk) a.push("-gen-junk");
      else {
        // v2.7.0 (объединение параметров): junk-набор ОБЩИЙ с генератором конфигов
        // (S.cfg.obf) — скан проверяет эндпоинт ровно с тем Jc/Jmin/Jmax, которые
        // уйдут в конфиг; ранее это были отдельные поля только для скана (6/10/50)
        const o = S.cfg.obf || {};
        if (o.jc !== "" && o.jc != null && +o.jc !== 6) a.push("-jc " + Math.min(255, Math.max(0, Math.round(+o.jc))));
        if (o.jmin !== "" && o.jmin != null && +o.jmin !== 10) a.push("-jmin " + Math.min(5000, Math.max(0, Math.round(+o.jmin))));
        if (o.jmax !== "" && o.jmax != null && +o.jmax !== 50) a.push("-jmax " + Math.min(5000, Math.max(0, Math.round(+o.jmax))));
      }
      // v2.7.2: тайминги 3.1 из S.cfg.obf — скан проверяет ровно то, что уйдёт в конфиг
      if (scanProtoOf(proto) === "awg31") a.push.apply(a, awg31Args());
    }
    if (isMasque) {
      if (s.masqueSni && s.masqueSni.trim()) a.push("-masque-sni " + safeVal(s.masqueSni));
      if (s.masqueAttempts && +s.masqueAttempts !== 3) a.push("-masque-attempts " + Math.min(10, Math.max(1, Math.round(+s.masqueAttempts))));
    }
    if (s.speed) a.push("-speed");
    if (s.bestBySpeed) a.push("-best-by speed");
    a.push("-plain");
    return a;
  }

  function buildScanCmd(s) {
    const exe = quoteExe();
    const args = buildScanArgs(s);
    // v2.6.2 (аудит FE-1): пути отчёта/аккаунта — через argPath (раньше —
    // голые двойные кавычки в обход psQuote/cmdWinPath)
    const report = S.paths.reportPath || "warpscout-report.txt";
    const acc = S.paths.accPath ? " -a " + argPath(S.paths.accPath) : "";
    return exe + " scan " + joinArgs(args) + " -o " + argPath(report) + acc;
  }

  // ── R1/R3: безопасные значения флагов для Windows cmd ──
  // v2.4.6 (аудит F07): каждое значение обязано быть ОДНИМ argv-токеном.
  // Раньше вырезались только shell-символы, а пробелы оставались —
  // «1.1.1.1 -f -n 256» превращался в дополнительные CLI-флаги.
  // Пробелы легитимны ни в одном из этих полей (IP/CIDR, коды узлов, SNI),
  // поэтому вырезаем их ЦЕЛИКОМ вместе с опасными символами.
  function safeVal(v) {
    if (v == null) return "";
    return String(v)
      .replace(/\s+/g, "")                 // «1.1.1.1 -f -n 256» -> «1.1.1.1-f-n256» (мусор, но один токен)
      .replace(/["'&|^%!<>()*?~;`,]/g, "") // опасные для cmd/argv символы
      .trim();
  }

  /* ── v2.4.6 (аудит F01/F02/F22): строгие enum'ы и разбор endpoint на границе команды ──
     Ни одно поле импортированного JSON (backup, пресеты, история) не должно уметь
     менять структуру shell-команды. Проверяем enum'ы ЗДЕСЬ, в месте построения команды,
     независимо от того, откуда пришёл объект (форма, пресет, импорт, storage). */
  const SCAN_ENUMS = {
    proto: ["wg", "awg", "masque", "masque-h2"],
    innerProto: ["", "wg", "awg"], // CLI: «-inner-proto wg|awg» (flags.go:104)
    genI1: ["", "quic", "dns", "sip", "stun", "random"], // flags.go:118
  };

  function enumOf(v, allowed, fallback) {
    return allowed.indexOf(v) !== -1 ? v : fallback;
  }

  function clampInt(v, min, max, fallback) {
    const n = Math.round(+v);
    if (!isFinite(n)) return fallback != null ? fallback : min;
    return Math.min(max, Math.max(min, n));
  }

  /* ── v2.6.0 (аудит SEC-5): единые точки сборки shell-команд ──
     os.execCommand/spawnProcess принимают ТОЛЬКО строку (argv-массива в API
     Neutralino нет), поэтому структурная защита — одна функция кавычек на
     платформу + жёсткий фильтр входа ДО кавычек. Новые места сборки команд
     ОБЯЗАНЫ идти через эти хелперы: конкатенация «в лоб» — источник инъекций. */
  function psQuote(s) {
    // PowerShell: одинарные кавычки не интерпретируют содержимое, ' внутри удваивается
    return "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
  }
  // v2.6.2 (аудит FE-1/FE-23): кавычки для POSIX-sh (Linux/macOS) и Android-моста
  // (tokenizeCmd в MainActivity POSIX-совместим). НЕ то же, что psQuote:
  // в sh «''» внутри одинарных кавычек НЕ даёт литеральную кавычку —
  // каноническая секвенция «закрыть-кавычку, экранировать, открыть»
  // ('\''-приём). Раунд-трип
  // проверен тестом FE-1 (токенизатор возвращает путь байт-в-байт).
  function shQuote(s) {
    return "'" + String(s == null ? "" : s).replace(/'/g, "'\\''") + "'";
  }
  function cmdWinPath(s) {
    // путь для cmd.exe: cmd-метасимволы и спецсимволы PowerShell вырезаются,
    // хвостовые разделители срезаются (хвост «\» перед кавычкой ломал экранирование)
    return String(s == null ? "" : s).replace(/["%!<>|&^`]/g, "").replace(/[\\/]+$/, "");
  }

  /* ── v2.6.2 (аудит FE-1/FE-23): единый хелпер аргумента-ПУТИ ──
     Пути (-o отчёт, -a аккаунт) приходят из пользовательских настроек
     (dataRoot) и импортированных бэкапов: двойная кавычка в пути раньше
     времени закрывала литерал и подсовывала оболочке новые argv-токены.
     Правило SEC-5 распространено на пути: Windows — cmdWinPath (метасимволы
     вырезаны) + двойные кавычки; POSIX и Android-мост — shQuote
     (POSIX-совместимые одинарные кавычки с '\'' для литеральной ').
     Новые места сборки команд с путями ОБЯЗАНЫ идти через argPath —
     конкатенация «в лоб» с кавычками — источник инъекций (см. тесты
     FE-1/FE-23). */
  function argPath(p) {
    if (IS_WIN) return '"' + cmdWinPath(p) + '"';
    return shQuote(p);
  }

  // Единый разбор «endpoint» (host:port). Возвращает { host, port } или null.
  // host — IPv4/IPv6/имя БЕЗ скобок (скобки снимаем), port — 1..65535.
  // Пробелы и shell-символы не проходят по определению символьного класса —
  // поэтому импортированная история не может протащить «1.1.1.1 & echo …» в -target.
  function parseEndpoint(ep) {
    const raw = String(ep == null ? "" : ep).trim();
    if (!raw || /[\s"'&|^%!<>()*?~;`,\\/]/.test(raw)) return null;
    let host = "", portStr = "";
    const br = /^\[(.+)\]:(\d{1,5})$/.exec(raw); // [IPv6]:port
    if (br) {
      host = br[1];
      portStr = br[2];
    } else {
      const i = raw.lastIndexOf(":");
      if (i < 1) return null;
      host = raw.slice(0, i);
      portStr = raw.slice(i + 1);
    }
    if (!/^\d{1,5}$/.test(portStr)) return null;
    const port = parseInt(portStr, 10);
    if (port < 1 || port > 65535) return null;
    if (!host || !/^[0-9A-Za-z.:\-_]+$/.test(host)) return null; // IPv4/IPv6/hostname
    return { host: host, port: port };
  }

  function quoteExe() {
    const p = (S.paths.wsPath || WS_EXE).replace(/[\\/]+$/, ""); // v2.5.0: платформенное имя
    return '"' + p.replace(/"/g, "") + '"';
  }

  function updateCmdPreview() {
    const cmd = buildScanCmd(S.scan);
    // в демо/до инициализации путей показываем читаемую команду без абсолютных путей
    const show = IS_MOCK
      ? cmd.replace(/^"[^"]*"/, "warpscout").replace(/ -o "[^"]*"/, "").replace(/ -a "[^"]*"/, "")
      : cmd;
    $("#cmdPreview").textContent = show;
    renderNodeFilterBadge(); // v2.6.4: живой индикатор фильтров узлов (реагирует на те же события)
  }

  /* ───────── парсер отчёта ───────── */
  // Формат строки: "%-22s %-13s %s%s%-10s %-6s %s" — IPv6-эндпоинт длиннее 22 символов,
  // поэтому первый токен всегда отделяем по первому пробелу, остальное — по 2+ пробелам.
  function parseReport(text, withP, withSpeed) {
    const lines = text.split(/\r?\n/);
    const results = [];
    let zone = "head";
    // v2.4.6 (F28): наличие колонки SPEED определяем по ФАКТИЧЕСКОМУ заголовку —
    // CLI добавляет её только при ненулевых замерах (report.go:333), а не по флагам;
    // иначе при всех нулевых замерах колонки съезжают (страна принимается за speed)
    let speedCols = withSpeed;
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (/^#\s+\d+ torn down/.test(line)) { zone = "torn"; continue; }
      if (/^#/.test(line)) { continue; }
      if (!line.trim()) { continue; }
      if (/^ENDPOINT\s/.test(line) && zone !== "nodebest" && zone !== "torn") { speedCols = /\bSPEED\b/.test(line); zone = "rows"; continue; }
      if (/^NODE\s+ENDPOINT/.test(line)) { speedCols = /\bSPEED\b/.test(line); zone = "nodebest"; continue; }
      if (zone === "rows" || zone === "torn") {
        const row = parseRowTokens(line, withP, speedCols);
        if (row) {
          row.torn = zone === "torn";
          results.push(row);
        }
      }
    }
    return results;
  }

  function parseRowTokens(line, withP, withSpeed) {
    const m = /^(\S+)\s+(.*)$/.exec(line);
    if (!m) return null;
    const endpoint = m[1];
    if (!/:\d+$/.test(endpoint)) return null;
    const tokens = m[2].split(/\s{2,}/).map((t) => t.trim()).filter((t) => t.length);
    const row = { endpoint, ping: "", tunPing: "", loss: "", speed: "", seenAs: "", node: "", loc: "" };
    let i = 0;
    row.ping = tokens[i++] || "";
    if (withP) { row.tunPing = tokens[i++] || ""; row.loss = tokens[i++] || ""; }
    if (withSpeed) row.speed = tokens[i++] || "";
    row.seenAs = tokens[i++] || "";
    row.node = tokens[i++] || "";
    row.loc = tokens.slice(i).join(" ") || "";
    return row;
  }

  function exitCodeOf(data) {
    const code = typeof data === "number" ? data : parseInt(String(data == null ? "" : data).trim(), 10);
    return Number.isFinite(code) ? code : -1;
  }

  function pingMs(pingStr) {
    const m = /(\d+)/.exec(pingStr || "");
    return m ? +m[1] : Infinity;
  }

  /* ───────── v2.6.4: группировка эндпоинтов для селекта конфига ─────────
     Запрос пользователя: «в выпадающем списке конфига неочевидно, что верхний
     эндпоинт самый быстрый». Группируем: лучший эндпоинт КАЖДОЙ ноды (по
     tunPing||ping, отсортирован по пингу; первый — общий лучший, ему рисуем
     ★), затем все остальные живые строки. Чистая функция — покрыта тестами. */
  function endpointGroups(results) {
    const ok = (results || []).filter((r) => r && r.endpoint && !r.torn);
    const byNode = new Map();
    for (const r of ok) {
      const k = r.node || "?";
      const prev = byNode.get(k);
      if (!prev || pingMs(r.tunPing || r.ping) < pingMs(prev.tunPing || prev.ping)) byNode.set(k, r);
    }
    const nodeBest = Array.from(byNode.values()).sort((a, b) => pingMs(a.tunPing || a.ping) - pingMs(b.tunPing || b.ping));
    const bestSet = new Set(nodeBest.map((r) => r.endpoint));
    const rest = ok.filter((r) => !bestSet.has(r.endpoint)).sort((a, b) => pingMs(a.tunPing || a.ping) - pingMs(b.tunPing || b.ping));
    return { best: nodeBest[0] || null, nodeBest, rest };
  }

  function pingCell(ping) {
    if (!ping) return '<span class="bad">?</span>';
    const v = pingMs(ping);
    if (v === Infinity) return '<span class="bad">?</span>';
    if (v <= 80) return '<span class="good">' + esc(ping) + "</span>";
    if (v <= 180) return '<span class="mid">' + esc(ping) + "</span>";
    return esc(ping);
  }

  function lossCell(loss) {
    if (!loss) return "—";
    const v = parseFloat(loss);
    if (v <= 2) return '<span class="good">' + esc(loss) + "</span>";
    if (v <= 20) return '<span class="mid">' + esc(loss) + "</span>";
    return '<span class="bad">' + esc(loss) + "</span>";
  }

  function matchRow(r, q) {
    return (r.endpoint + " " + r.node + " " + r.loc + " " + r.seenAs).toLowerCase().indexOf(q) !== -1;
  }

  function updateFilterMeta(shown, total) {
    const meta = $("#resFilterMeta");
    const clear = $("#resFilterClear");
    if (!meta || !clear) return;
    clear.classList.toggle("hidden", !S.filter);
    meta.innerHTML = S.filter
      ? tF("stats.16", { n: shown, m: total })
      : "";
  }

  function applyFilter(q) {
    S.filter = (q || "").trim();
    renderResults();
  }

  function clearFilter(focusBack) {
    if (!S.filter) return;
    S.filter = "";
    $("#resFilter").value = "";
    renderResults();
    if (focusBack) $("#resFilter").focus();
  }

  function resetFilterSilently() {
    S.filter = "";
    const inp = $("#resFilter");
    if (inp) inp.value = "";
  }

