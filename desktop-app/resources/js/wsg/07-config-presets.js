/* ═══ WSG · 07-config-presets — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 2214–2551.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

  /* ───────── конфиг-генератор ───────── */
  /* v2.4.3: пресеты с IPv6-адресами (Яндекс убран по запросу); dnsV6 (по умолчанию вкл) добавляет v6-адреса в строку DNS */
  const DNS_PRESETS = {
    cloudflare: { v4: "1.1.1.1, 1.0.0.1", v6: "2606:4700:4700::1111, 2606:4700:4700::1001" },
    quad9: { v4: "9.9.9.9, 149.112.112.112", v6: "2620:fe::fe, 2620:fe::9" },
    google: { v4: "8.8.8.8, 8.8.4.4", v6: "2001:4860:4860::8888, 2001:4860:4860::8844" },
    adguard: { v4: "94.140.14.14, 94.140.15.15", v6: "2a10:50c0::ad1:ff, 2a10:50c0::ad2:ff" },
  };

  /* v2.4.3: строка DNS по пресету с учётом тумблера IPv6 */
  function dnsLineOf(key, withV6) {
    const p = DNS_PRESETS[key];
    if (!p) return "";
    return withV6 ? p.v4 + ", " + p.v6 : p.v4;
  }

  const VER_HINTS = {
    wg: "Чистый WireGuard без обфускации — для сетей, где WARP не режут.",
    awg15: "AWG 1.5: junk-пакеты (Jc/Jmin/Jmax), префиксы S1–S4 и свои заголовки H1–H4 + I1.",
    awg20: "AWG 2.0: то же + CPS-пакеты I1–I5 и диапазоны заголовков (можно писать «a-b»).",
    awg31: "AWG 3.1: маскировка поведения соединения — случайные тайминги, паддинг, трейлеры. Как в конфиге-примере.",
  };

  function cfgAllowedIps() {
    switch (S.cfg.allowed) {
      case "v4": return "0.0.0.0/0";
      case "v6": return "::/0";
      case "custom": return S.cfg.allowedCustom || "0.0.0.0/0, ::/0";
      default: return "0.0.0.0/0, ::/0";
    }
  }

  /* ── v2.6.7 (FIX i1-truncation, отчёт пользователя) ──
     Raw-пакет I1 печатается CLI в найденной команде как -i1 "<b 0xce…>" — в кавычках
     (shell-артефакт из-за пробела) и со значимым пробелом после «<b»; эталонный
     EXAMPLE_I1 в 02-state — та же форма БЕЗ кавычек. Раньше пробелы вычищались
     безусловно (applyFoundCmd, buildConf) → в конфиг уезжала форма без пробела, а до
     неё значение ещё рвалось по split(/\s+/) — в поле попадал обрывок «"<b».
     Теперь: окружающие кавычки снимаются (как и при импорте .conf — parseConfText),
     форма «<b …>» хранится/выводится как есть; прочим форматам (base64 и пр.)
     пробелы вычищаются как раньше.
   ── v2.6.8 (FIX i1-compact, повторный отчёт: «unknown tag», конфиги не рабочие) ──
     Грамматика obf-chain у AWG-демона (amneziawg-go device/obf.go — newObfChain):
     значение режется на теги «<…>», содержимое тега — strings.Fields, ПЕРВОЕ поле —
     ключ (b/t/r/rc/rd/d/ds/dz), ВТОРОЕ — значение. Валидны только «<b 0x…>» и
     «<r 23>» — с пробелом; компактные «<b0x…>»/«<r23>» демон не понимает: ключом
     становится вся строка «b0xc1…» → «IPC error -22: unknown tag», туннель мёртв.
     Дыра v2.6.7: isI1RawPacket узнавал raw-форму только при ОДНОМ теге «<b …>» на
     всё значение, а warpscout печатает найденный I1 МУЛЬТИБЛОЧНЫМ
     («<b 0x…><r 23><b 0x…><r 16>») — такое значение шло по ветке «не raw» и
     чистилось от значимых пробелов → в конфиг уезжала компактная форма. Теперь
     raw-цепочка — значение, целиком состоящее из тегов; каждый тег канонизируется
     к виду «ключ+пробел+значение», hex-байты b-тега склеиваются (форма
     «<b 0xc1 0x00 …>» демон молча читал бы как ОДИН байт 0xc1), межтеговые пробелы
     не значимы и исчезают. Неопознанные/битые теги не трогаем (демон сам скажет);
     base64 и прочие не-цепочки чистятся от пробелов как в v2.6.7. */
  const OBF_CHAIN_RE = /^\s*(?:<[^<>]*>\s*)+$/; // всё значение — теги <…>
  const OBF_TAG_KEYS = ["rc", "rd", "ds", "dz", "b", "t", "r", "d"];

  function i1Unquote(v) {
    let s = String(v == null ? "" : v).trim();
    // кавычки — артефакт shell-печати CLI/импорта, значением не являются
    if (s.length > 1 && s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).trim();
    return s;
  }

  /* тег цепочки → канонический вид демона «<ключ значение>»; null — не разобрали (не трогаем) */
  function normI1Tag(content) {
    const fields = String(content == null ? "" : content).trim().split(/\s+/).filter(Boolean);
    if (!fields.length) return null;
    let key = fields[0];
    let rest = fields.slice(1);
    if (OBF_TAG_KEYS.indexOf(key) === -1) {
      // компактная форма «b0x…»/«r23»/«rd12»: ключ слит со значением
      const m = /^(rc|rd|ds|dz|b|t|r|d)(.+)$/.exec(fields[0]);
      if (!m) return null;
      key = m[1];
      rest = [m[2]].concat(rest);
    }
    if (key === "b") {
      // newBytesObf: 0x-префикс опционален, hex сплошняком и чётной длины
      const hex = rest.map((x) => x.replace(/^0x/i, "")).join("");
      if (!hex || hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) return null;
      return "<b 0x" + hex + ">";
    }
    if (key === "r" || key === "rc" || key === "rd" || key === "dz") {
      // newRandObf/newRandCharObf/newRandDigitsObf/newDataSizeObf: длина — число
      if (!/^\d+$/.test(rest[0] || "")) return null;
      return "<" + key + " " + rest[0] + ">";
    }
    // t/d/ds — значение демон игнорирует (obf_timestamp/obf_data/obf_datastring):
    // слитную форму с цифрами («<t12>» — демон увидел бы ключ «t12») схлопываем
    if ((key === "t" || key === "d" || key === "ds") && (!rest.length || /^\d+$/.test(rest[0]))) {
      return "<" + key + ">";
    }
    return null;
  }

  function isI1RawPacket(v) {
    return OBF_CHAIN_RE.test(i1Unquote(v));
  }
  function normI1Store(v) {
    const s = i1Unquote(v);
    if (!s) return "";
    // raw-цепочка (один или несколько тегов): канонизируем каждый тег (v2.6.8)
    if (OBF_CHAIN_RE.test(s)) {
      return s
        .match(/<[^<>]*>/g)
        .map((t) => {
          const norm = normI1Tag(t.slice(1, -1));
          return norm == null ? t : norm;
        })
        .join("");
    }
    // base64 и прочие не-цепочки — пробелы вычищаются как раньше
    return s.replace(/\s+/g, "");
  }

  function buildConf() {
    const acc = S.account;
    const c = S.cfg;
    const ver = c.ver;
    const o = c.obf;
    const lines = [];
    const sec = (name) => lines.push("[" + name + "]");
    // v2.4.6 (F06): значения не могут содержать переводы строк/табуляции —
    // инъекция директив (PostUp и т.п.) в экспортируемый .conf невозможна
    const kv = (k, v) => lines.push(k + " = " + String(v).replace(/[\r\n\t]+/g, " ").trim());

    sec("Interface");
    kv("PrivateKey", acc ? acc.private_key : t("misc.37"));
    if (acc) {
      const addr = [acc.ipv4, acc.ipv6].filter(Boolean).join(", ");
      kv("Address", addr || "172.16.0.2");
    } else {
      kv("Address", "172.16.0.2, 2606:4700:110:xxxx:xxxx:xxxx:xxxx:xxxx");
    }
    const dns = c.dns === "custom" ? c.dnsCustom : dnsLineOf(c.dns, c.dnsV6 !== false); // v2.4.3: dnsV6 undefined у старых состояний → трактуем как вкл
    if (dns && dns.trim()) kv("DNS", dns);
    if (c.mtu) kv("MTU", clampInt(c.mtu, 576, 1500, 1280)); // v2.4.6 (F27)

    if (ver !== "wg") {
      // v2.4.6 (F27): лимиты CLI (flags.go): jc 1..128, jmin <= jmax, jmax <= 1280
      kv("Jc", clampInt(o.jc, 1, 128, 4));
      let jmin = clampInt(o.jmin, 0, 1280, 40);
      const jmax = clampInt(o.jmax, 0, 1280, 70);
      if (jmin > jmax) jmin = jmax;
      kv("Jmin", jmin);
      kv("Jmax", jmax);
      kv("S1", o.s1); kv("S2", o.s2); kv("S3", o.s3); kv("S4", o.s4);
      kv("H1", o.h1); kv("H2", o.h2); kv("H3", o.h3); kv("H4", o.h4);
      if ((o.i1 || "").trim()) kv("I1", normI1Store(o.i1)); // v2.6.7: raw-форма «<b 0x…>» — без чистки пробелов
      // v2.4.6 (F26): I2–I5 больше не теряются (нужны профилям AWG 2.0)
      if ((o.i2 || "").trim()) kv("I2", normI1Store(o.i2));
      if ((o.i3 || "").trim()) kv("I3", normI1Store(o.i3));
      if ((o.i4 || "").trim()) kv("I4", normI1Store(o.i4));
      if ((o.i5 || "").trim()) kv("I5", normI1Store(o.i5));
    }
    if (ver === "awg31") {
      kv("ContentPaddingAddition", o.cpa);
      kv("RekeyAfterTime", o.rekeyAfter);
      kv("RekeyTimeout", o.rekeyTo);
      kv("RejectAfterTime", o.rejectAfter);
      kv("KeepaliveTimeout", o.keepaliveTo);
      kv("MaxHandshakeAttempts", o.maxHs);
      kv("RandomTrailers", o.trailers);
      kv("DisableCookies", o.noCookies);
      if ((o.hpk || "").trim()) kv("HeaderProtectionKey", o.hpk.trim());
    }
    if (c.tableOff) kv("Table", "off");

    lines.push("");
    sec("Peer");
    kv("PublicKey", acc ? acc.peer_public_key : "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=");
    kv("AllowedIPs", cfgAllowedIps());
    kv("Endpoint", c.endpoint || "8.47.69.43:2408");
    if (c.keepalive > 0) kv("PersistentKeepalive", clampInt(c.keepalive, 0, 65535, 0)); // v2.4.6 (F27)

    return lines.join("\n") + "\n";
  }

  function hlConf(text) {
    return esc(text)
      .replace(/^\[(.+)\]/gm, '<span class="c-sec">[$1]</span>')
      .replace(/^([A-Za-z][A-Za-z0-9]*) =/gm, '<span class="c-key">$1</span> =')
      .replace(/^(#.*)$/gm, '<span class="c-dim">$1</span>');
  }

  function renderConf() {
    const conf = buildConf();
    $("#confPreview").innerHTML = hlConf(conf);
    const ver = S.cfg.ver;
    const names = { wg: "warp-wg.conf", awg15: "warp-awg15.conf", awg20: "warp-awg20.conf", awg31: "warp-awg31.conf" };
    $("#cfgFileName").textContent = names[ver] || "warp.conf";
    $("#cfgObfCard").classList.toggle("hidden", ver === "wg");
    $("#cfgAwg31Grid").style.display = ver === "awg31" ? "" : "none";
    $("#cfgVerHint").textContent = t(VER_HINTS[ver]);
    const keys = $("#cfgKeysState");
    if (S.account) { keys.textContent = t("conf.30"); keys.className = "badge badge--accent"; }
    else { keys.textContent = t("conf.31"); keys.className = "badge"; }
  }

  function fillEndpointSelect() {
    const sel = $("#cfgEndpointSel");
    const cur = sel.value;
    // v2.6.4 (запрос пользователя): список перестроен группами — сначала лучший
    // эндпоинт каждой ноды (общему лучшему — ★), пинг рядом для наглядности,
    // ниже — все остальные. Порядок в группе «лучших» — по пингу.
    const g = endpointGroups(S.results);
    const opt = (r, star) =>
      '<option value="' + esc(r.endpoint) + '">' +
        (star ? "★ " : "") + esc(r.endpoint) + " · " + esc(r.node || "?") + " · " + esc(r.loc || r.seenAs || "?") +
        " · " + esc(String(r.tunPing || r.ping || "?")) +
      "</option>";
    const options = ['<option value="">' + t("conf.04") + "</option>"];
    if (g.nodeBest.length) {
      options.push('<optgroup label="' + esc(t("conf.59")) + '">');
      for (const r of g.nodeBest) options.push(opt(r, r === g.best));
      options.push("</optgroup>");
    }
    if (g.rest.length) {
      options.push('<optgroup label="' + esc(t("conf.60")) + '">');
      for (const r of g.rest) options.push(opt(r, false));
      options.push("</optgroup>");
    }
    sel.innerHTML = options.join("");
    if (cur) sel.value = cur;
    if (S.cfg.endpoint && S.results.some((r) => r.endpoint === S.cfg.endpoint && !r.torn)) {
      sel.value = S.cfg.endpoint;
    }
  }

  function pushHistory(proto) {
    const working = S.results.filter((r) => !r.torn).length;
    const torn = S.results.length - working;
    const bits = [];
    bits.push(S.scan.full ? "-f" : "-n " + (S.scan.sample || 5));
    if (S.scan.exclNode && S.scan.exclNode.trim()) bits.push("-exclude-node " + safeVal(S.scan.exclNode));
    if (S.scan.genI1) bits.push("-gen-i1 " + S.scan.genI1);
    S.history.unshift({
      ts: Date.now(),
      proto,
      label: bits.join(" "),
      working,
      torn,
      withP: S.viewMeta.withP,
      withSpeed: S.viewMeta.withSpeed,
      params: sanitizeScan(S.lastRunParams && S.lastRunParams.proto === proto ? S.lastRunParams : S.scan), // v2.4.6 (F18/F30)
      results: S.results.map((r) => Object.assign({}, r)),
    });
    S.history = S.history.slice(0, 10);
    renderHistoryBtn();
    if (S.historyOpen) toggleHistory(true); // v1.5.0: обновить открытую панель (тренд/список)
    persist();
  }

  function renderHistoryBtn() {
    const btn = $("#btnHistory");
    if (!btn) return;
    btn.textContent = t("results.03") + (S.history.length ? " (" + S.history.length + ")" : "");
  }

  /* ───────── пользовательские пресеты (v1.4.0) ───────── */
  function renderCustomPresets() {
    const box = $("#customPresetChips");
    if (!box) return;
    box.innerHTML = S.customPresets
      .map(
        (p, i) =>
          '<span class="chip chip--custom" role="button" tabindex="0" data-pi="' + i +
          '" title="' + t("presets.toasts.08") + '">' +
            '<span class="chip__custom-name">' + esc(p.name) + "</span>" +
            '<button type="button" class="chip__del" data-del-preset="' + i + '" title="' + t("presets.toasts.07") + '" aria-label="' + t("presets.toasts.07") + ' ' + esc(p.name) + '">✕</button>' +
          "</span>"
      )
      .join("");
    $$("#customPresetChips .chip--custom", box).forEach((el) => {
      const apply = () => {
        const p = S.customPresets[+el.getAttribute("data-pi")];
        if (!p) return;
        Object.assign(S.scan, DEFAULT_SCAN, p.scan);
        syncInputsFromState();
        updateCmdPreview();
        $$("#presetChips .chip").forEach((c) => c.classList.remove("is-active"));
        el.classList.add("is-active");
        $("#presetHint").innerHTML = tF("presets.17", { name: esc(p.name) });
        persist();
        toast(tF("presets.toasts.04", { name: p.name }), "ok");
      };
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-del-preset]")) return;
        apply();
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apply(); }
      });
    });
    $$("[data-del-preset]", box).forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const i = +b.getAttribute("data-del-preset");
        const p = S.customPresets[i];
        if (!p) return;
        if (!confirm(tF('Удалить пресет "{name}"?', { name: p.name }))) return;
        S.customPresets.splice(i, 1);
        renderCustomPresets();
        persist();
        toast(t("presets.toasts.05"), "ok");
      })
    );
  }

  function togglePresetSaveRow(show) {
    const row = $("#presetSaveRow");
    if (!row) return;
    row.classList.toggle("hidden", !show);
    if (show) {
      $("#presetName").value = "";
      $("#presetName").focus();
    }
  }

  function saveCurrentPreset() {
    const name = ($("#presetName").value || "").trim();
    if (!name) { toast(t("presets.toasts.01"), "warn"); $("#presetName").focus(); return; }
    if (S.customPresets.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      if (!confirm(tF('Пресет "{name}" уже есть — перезаписать?', { name: name }))) return;
      S.customPresets = S.customPresets.filter((p) => p.name.toLowerCase() !== name.toLowerCase());
    }
    syncStateFromInputs();
    S.customPresets.push({ name: name, scan: Object.assign({}, S.scan) });
    if (S.customPresets.length > 20) S.customPresets = S.customPresets.slice(-20);
    renderCustomPresets();
    togglePresetSaveRow(false);
    persist();
    toast(tF("presets.toasts.03", { name: name }), "ok");
  }

  /* ───────── шаринг пресетов: экспорт/импорт JSON (v1.8.0) ───────── */
  function exportPresets() {
    if (!S.customPresets.length) {
      toast(t("live.03"), "warn");
      return;
    }
    const json = JSON.stringify(
      { app: "WARPSCOUT GUI presets", format: 1, exportedAt: new Date().toISOString(), presets: S.customPresets },
      null,
      2
    );
    const name = "warpscout-presets-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + ".json";
    if (IS_MOCK) {
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast(tF("live.06", { path: name }), "ok");
      return;
    }
    os()
      .showSaveDialog(t("live.07"), { defaultPath: name })
      .then(async (path) => {
        if (!path) return;
        await fs().writeFile(path, json);
        toast(tF("live.05", { path: path }), "ok");
      })
      .catch((e) => toast(tF("extra.09", { err: e && e.message ? e.message : e }), "err"));
  }

  function applyImportedPresets(data) {
    if (!data || typeof data !== "object" || data.app !== "WARPSCOUT GUI presets" || !Array.isArray(data.presets)) {
      toast(t("live.04"), "err");
      return;
    }
    // v2.6.2 (FE-4): пресеты из чужого файла идут через ТЕ ЖЕ санитайзеры, что и
    // бэкап-состояние (sanitizePresets → sanitizeScan): типы, лимиты длин,
    // управляющие символы. Собственное свойство __proto__ из JSON.parse при этом
    // не проходит — Object.assign в sanitizeScan заполняет ТОЛЬКО известные поля
    // с явной валидацией, прототипное загрязнение исключено (раньше канал был
    // единственным неочищенным: бэкап санитизировался, пресеты — нет).
    const valid = sanitizePresets(data.presets).filter((p) => p.name.trim());
    if (!valid.length) {
      toast(t("live.11"), "err");
      return;
    }
    const have = new Set(S.customPresets.map((p) => p.name.toLowerCase()));
    let added = 0, dup = 0;
    valid.forEach((p) => {
      const name = p.name.trim();
      if (have.has(name.toLowerCase())) { dup++; return; }
      S.customPresets.push({ name: name, scan: p.scan });
      have.add(name.toLowerCase());
      added++;
    });
    if (S.customPresets.length > 20) S.customPresets = S.customPresets.slice(-20);
    renderCustomPresets();
    persist();
    toast(dup ? tF("live.09", { n: added, d: dup }) : tF("live.10", { n: added }), "ok");
  }

  function importPresets() {
    if (!IS_MOCK && HAS_NL) {
      os()
        .showOpenDialog(t("live.08"), { multiSelections: false })
        .then(async (p) => {
          const picked = Array.isArray(p) ? p[0] : p;
          if (!picked) return;
          try {
            const text = await fs().readFile(picked);
            // v2.6.2 (FE-4): тот же лимит размера ДО парсинга, что у бэкапа (extra.18) —
            // гигантский файл не блокирует UI
            if (String(text).length > 2000000) { toast(t("extra.18"), "err"); return; }
            applyImportedPresets(JSON.parse(text));
          } catch (e) {
            toast(tF("extra.10", { err: e && e.message ? e.message : e }), "err");
          }
        })
        .catch(() => {});
      return;
    }
    const inp = $("#importPresetsFile");
    if (!inp) return;
    inp.value = "";
    inp.click();
  }

  function bindImportPresetsFile() {
    const inp = $("#importPresetsFile");
    if (!inp) return;
    inp.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result);
          if (text.length > 2000000) { toast(t("extra.18"), "err"); return; } // v2.6.2 (FE-4)
          applyImportedPresets(JSON.parse(text));
        } catch (err) {
          toast(tF("extra.11", { err: err && err.message ? err.message : err }), "err");
        }
      };
      reader.readAsText(file);
    });
  }

