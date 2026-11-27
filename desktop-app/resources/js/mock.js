/* ═══════════════════════════════════════════════════════════════
   WARPSCOUT GUI — browser mock backend
   Активируется ТОЛЬКО когда Neutralino runtime отсутствует
   (веб-демо интерфейса). Реальное приложение его не использует.
   Данные сценариев = реальные логи warpscout v0.16.0.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (typeof window.Neutralino !== "undefined") return; // реальный runtime — мок не нужен

  const LS = {
    get(k) { try { return window.localStorage.getItem("wsgui:" + k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem("wsgui:" + k, v); } catch (e) {} },
  };

  const MOCK_ACCOUNT = {
    id: "b9f1c0a2-77de-4831-9c1f-demo0000000d",
    token: "demo-token-not-real",
    private_key: "+J1oV84Mo1F9O/prQhLFb+68aqKWvJBMFmRFRgrvYFk=",
    peer_public_key: "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=",
    ipv4: "172.16.0.2",
    ipv6: "2606:4700:110:8679:ee89:902a:ff5a:9571",
    masque: {
      id: "m0ckmasque00000000000000000000000",
      token: "demo-masque-token",
      private_key: "mQ2xDemoMasquePrivateKeyHere012345678=",
      peer_public_key: "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=",
      ipv4: "172.16.0.2",
      ipv6: "2606:4700:110:8679:ee89:902a:ff5a:9571",
    },
    outer: {
      id: "m0ckouter0000000000000000000000000",
      token: "demo-outer-token",
      private_key: "oQ2xDemoOuterPrivateKeyHere0123456789=",
      peer_public_key: "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=",
      ipv4: "172.16.0.2",
      ipv6: "2606:4700:110:8679:ee89:902a:ff5a:9571",
    },
  };

  // Реальный отчёт скана (fmt-строки из report.go, реальные значения песочницы)
  const MOCK_REPORT = [
    "# WARP endpoints: 6 working / 8 probed",
    "# sorted by in-tunnel loss, then in-tunnel ping",
    "# ENDPOINT PING = ICMP ping to the endpoint address from this host, no tunnel involved",
    "# TUN PING / LOSS = RTT and packet loss measured inside the tunnel, to 1.1.1.1",
    "# SEEN AS = region external services see through the tunnel",
    "# NODE / NODE LOCATION = Cloudflare WARP edge node the tunnel landed on, and where it sits",
    "# One /24 pool can land on several different nodes - NODE is per endpoint, not per subnet",
    "",
    "ENDPOINT               ENDPOINT PING TUN PING  LOSS   SEEN AS    NODE   NODE LOCATION",
    "188.114.98.58:2408     41ms          5ms       0%     HK         HKG    Hong Kong, HK",
    "162.159.192.1:1701     44ms          6ms       0%     HK         HKG    Hong Kong, HK",
    "188.114.97.177:2408    52ms          9ms       0%     SE         ARN    Stockholm, SE",
    "188.114.99.218:2408    55ms          11ms      0%     DE         FRA    Frankfurt-am-Main, DE",
    "162.159.198.1:4500     ?             14ms      2%     NL         AMS    Amsterdam, NL",
    "162.159.193.10:500     ?             18ms      0%     PL         WAW    Warsaw, PL",
    "",
    "# 2 torn down (handshake ok, data flowed, then cut and never recovered)",
    "188.114.98.1:2408      ?             7ms       100%   RU         DME    Moscow, RU",
    "188.114.99.1:2408      ?             8ms       88%    RU         DME    Moscow, RU",
    "",
    "# Best endpoint per node (lowest in-tunnel loss, then in-tunnel ping)",
    "NODE   ENDPOINT               ENDPOINT PING TUN PING  LOSS   SEEN AS    NODE LOCATION",
    "HKG    188.114.98.58:2408     41ms          5ms       0%     HK         Hong Kong, HK",
    "ARN    188.114.97.177:2408    52ms          9ms       0%     SE         Stockholm, SE",
  ].join("\n");

  const MOCK_SCAN_LOG = [
    "Using cached WARP account from warpscout-account.json",
    "",
    "Phase 1: probing reachable WARP ports: 12...",
    "  4/12",
    "  8/12",
    "Phase 1: probing reachable WARP ports: reachable ports [2408 500 1701 4500]",
    "Phase 2: verifying tunnels (proto=awg): 8...",
    "  node: HK HKG (188.114.98.58:2408)",
    "  2/8",
    "  node: SE ARN (188.114.97.177:2408)",
    "  node: DE FRA (188.114.99.218:2408)",
    "  5/8",
    "Phase 2: verifying tunnels (proto=awg): done",
    "",
    "Full report written to demo-report.txt",
  ].join("\n");

  let processSeq = 1;
  const processes = {};

  function emitEvent(name, detail) {
    window.dispatchEvent(new CustomEvent("mocknl:" + name, { detail }));
  }

  function streamProcess(cmd, script) {
    const id = processSeq++;
    processes[id] = { cmd, killed: false };
    const run = () => {
      const proc = processes[id];
      if (!proc || proc.killed) return;
      let t = 0;
      script.forEach((chunk) => {
        t += chunk.delay;
        setTimeout(() => {
          if (!processes[id] || processes[id].killed) return;
          if (chunk.type === "exit") {
            delete processes[id];
            emitEvent("spawnedProcess", { id, pid: 4000 + id, type: "exit", data: chunk.data });
          } else {
            emitEvent("spawnedProcess", { id, pid: 4000 + id, type: chunk.type || "stdout", data: chunk.data });
          }
        }, t);
      });
    };
    run();
    return Promise.resolve({ id, pid: 4000 + id });
  }

  // отчёт без -P: 5 колонок, без разорванных
  const MOCK_REPORT_NOP = [
    "# WARP endpoints: 6 working / 8 probed",
    "# sorted by endpoint ping",
    "# ENDPOINT PING = ICMP ping to the endpoint address from this host, no tunnel involved",
    "# SEEN AS = region external services see through the tunnel",
    "# NODE / NODE LOCATION = Cloudflare WARP edge node the tunnel landed on, and where it sits",
    "# One /24 pool can land on several different nodes - NODE is per endpoint, not per subnet",
    "",
    "ENDPOINT               ENDPOINT PING SEEN AS    NODE   NODE LOCATION",
    "188.114.98.58:2408     41ms          HK         HKG    Hong Kong, HK",
    "162.159.192.1:1701     44ms          HK         HKG    Hong Kong, HK",
    "188.114.97.177:2408    52ms          SE         ARN    Stockholm, SE",
    "188.114.99.218:2408    55ms          DE         FRA    Frankfurt-am-Main, DE",
    "162.159.198.1:4500     ?             NL         AMS    Amsterdam, NL",
    "162.159.193.10:500     ?             PL         WAW    Warsaw, PL",
    "",
    "# Best endpoint per node (lowest endpoint ping)",
    "NODE   ENDPOINT               ENDPOINT PING SEEN AS    NODE LOCATION",
    "HKG    188.114.98.58:2408     41ms          HK         Hong Kong, HK",
    "ARN    188.114.97.177:2408    52ms          SE         Stockholm, SE",
  ].join("\n");

  // В демо отчёт слегка «живой»: чётные прогоны добавляют CDG-эндпоинт и теряют WAW —
  // чтобы дифф «новые / пропали» в веб-демо был наглядным (в реальном app diff считает warpscout).
  let scanRuns = 0;
  function varyReport(report) {
    scanRuns++;
    if (scanRuns % 2 === 1) return report; // нечётные прогоны — эталонный отчёт
    const withP = report.indexOf("TUN PING") !== -1;
    const lines = report.split("\n");
    const drop = lines.findIndex((l) => l.startsWith("162.159.193.10:500"));
    if (drop !== -1) lines.splice(drop, 1);
    const anchor = lines.findIndex((l) => l.startsWith("188.114.98.58:2408"));
    const newRow = withP
      ? "188.114.96.7:878      61ms          4ms        3%     FR         CDG    Paris, FR"
      : "188.114.96.7:878      61ms          FR         CDG    Paris, FR";
    if (anchor !== -1) lines.splice(anchor + 1, 0, newRow);
    return lines.join("\n");
  }

  /* ── v2.8.0: NDJSON-события -stream-json для демо (схема warpscout-v1).
     Строки — те же данные, что в MOCK_REPORT (варьируются так же), но в виде
     progress/endpoint/done. Демо автоподбора I1: если в интерфейсе включён
     тумблер (NeutralinoMock.autoI1Armed), первый скан С ДЕФОЛТНЫМ профилем
     quic возвращается пустым — следующий (dns/sip/…) находит рабочие адреса.
     (v2.8.2: дефолт скана стал quic — раньше демо ждало скан без -gen-i1.) ── */
  function mockStreamRows() {
    const rows = [
      { endpoint: "188.114.98.58:2408", ip: "188.114.98.58", port: 2408, seen_as: "HK", node: "HKG", node_city: "Hong Kong", node_country: "HK", ping_ms: 41, tun_ping_ms: 5, loss_pct: 0, speed_mbps: null, measured: true, torn: false },
      { endpoint: "162.159.192.1:1701", ip: "162.159.192.1", port: 1701, seen_as: "HK", node: "HKG", node_city: "Hong Kong", node_country: "HK", ping_ms: 44, tun_ping_ms: 6, loss_pct: 0, speed_mbps: null, measured: true, torn: false },
      { endpoint: "188.114.97.177:2408", ip: "188.114.97.177", port: 2408, seen_as: "SE", node: "ARN", node_city: "Stockholm", node_country: "SE", ping_ms: 52, tun_ping_ms: 9, loss_pct: 0, speed_mbps: null, measured: true, torn: false },
      { endpoint: "188.114.99.218:2408", ip: "188.114.99.218", port: 2408, seen_as: "DE", node: "FRA", node_city: "Frankfurt-am-Main", node_country: "DE", ping_ms: 55, tun_ping_ms: 11, loss_pct: 0, speed_mbps: null, measured: true, torn: false },
      { endpoint: "162.159.198.1:4500", ip: "162.159.198.1", port: 4500, seen_as: "NL", node: "AMS", node_city: "Amsterdam", node_country: "NL", ping_ms: null, tun_ping_ms: 14, loss_pct: 2, speed_mbps: null, measured: true, torn: false },
      { endpoint: "162.159.193.10:500", ip: "162.159.193.10", port: 500, seen_as: "PL", node: "WAW", node_city: "Warsaw", node_country: "PL", ping_ms: null, tun_ping_ms: 18, loss_pct: 0, speed_mbps: null, measured: true, torn: false },
    ];
    const torn = [
      { endpoint: "188.114.98.1:2408", ip: "188.114.98.1", port: 2408, seen_as: "RU", node: "DME", node_city: "Moscow", node_country: "RU", ping_ms: null, tun_ping_ms: 7, loss_pct: 100, speed_mbps: null, measured: true, torn: true },
      { endpoint: "188.114.99.1:2408", ip: "188.114.99.1", port: 2408, seen_as: "RU", node: "DME", node_city: "Moscow", node_country: "RU", ping_ms: null, tun_ping_ms: 8, loss_pct: 88, speed_mbps: null, measured: true, torn: true },
    ];
    if (scanRuns % 2 === 0) {
      rows.pop(); // WAW пропадает (как в varyReport)
      rows.splice(1, 0, { endpoint: "188.114.96.7:878", ip: "188.114.96.7", port: 878, seen_as: "FR", node: "CDG", node_city: "Paris", node_country: "FR", ping_ms: 61, tun_ping_ms: 4, loss_pct: 3, speed_mbps: null, measured: true, torn: false });
    }
    return { working: rows, torn: torn };
  }

  function mockBest(rows) {
    const byNode = {};
    for (const r of rows) if (!byNode[r.node] || r.tun_ping_ms < byNode[r.node].tun_ping_ms) byNode[r.node] = r;
    return Object.values(byNode).sort((a, b) => a.tun_ping_ms - b.tun_ping_ms);
  }

  function streamScanScript(cmd) {
    const emptyDemo = window.NeutralinoMock.autoI1Armed && /(^|\s)-gen-i1\s+quic(\s|$)/.test(cmd) && !/(^|\s)-target(\s|$)/.test(cmd);
    const chunks = [];
    let t = 200;
    const push = (delay, obj) => { t += delay; chunks.push({ delay, data: JSON.stringify(obj) + "\r\n" }); };
    if (emptyDemo) {
      push(300, { event: "progress", phase: "ports", done: 6, total: 12 });
      push(500, { event: "progress", phase: "ports", done: 12, total: 12 });
      push(700, { event: "progress", phase: "tunnels", done: 4, total: 8 });
      push(700, { event: "progress", phase: "tunnels", done: 8, total: 8 });
      push(300, { event: "done", result: { $schema: "https://raw.githubusercontent.com/vernette/warpscout/master/schema/warpscout-v1.schema.json", version: 1, proto: "awg", total: 8, working_count: 0, best: null, picks: [], working: [], torn: [] } });
      chunks.push({ delay: 120, type: "exit", data: "0" });
      return chunks;
    }
    const { working, torn } = mockStreamRows();
    const all = working.concat(torn);
    const proto = (cmd.match(/-p\s+(\S+)/) || [null, "awg"])[1];
    push(250, { event: "progress", phase: "ports", done: 4, total: 12 });
    push(450, { event: "progress", phase: "ports", done: 8, total: 12 });
    push(350, { event: "progress", phase: "ports", done: 12, total: 12 });
    const thirds = [2, 5, all.length];
    let idx = 0;
    thirds.forEach((n, i) => {
      const prev = i ? thirds[i - 1] : 0;
      push(500, { event: "progress", phase: "tunnels", done: n, total: all.length });
      for (; idx < n; idx++) push(260, { event: "endpoint", endpoint: all[idx] });
    });
    const picks = mockBest(working);
    push(300, { event: "done", result: { $schema: "https://raw.githubusercontent.com/vernette/warpscout/master/schema/warpscout-v1.schema.json", version: 1, proto: proto, total: all.length, working_count: working.length, best: working.length ? working[0].endpoint : null, picks: picks, working: working, torn: torn } });
    chunks.push({ delay: 120, type: "exit", data: "0" });
    return chunks;
  }

  // v1.9.0: быстрая проверка одного эндпоинта — отчёт из одной строки (формат report.go).
  // Вердикт детерминирован по адресу: сумма кодов символов % 4 === 0 → «разорван»,
  // иначе рабочий с TUN PING 6ms / 0%. Это демо-сценарий, реальный app парсит настоящий отчёт.
  function checkScript(cmd) {
    const ip = (cmd.match(/-target\s+(\S+)/) || [null, "188.114.98.58"])[1];
    const port = (cmd.match(/-port\s+(\d+)/) || [null, "2408"])[1];
    const proto = (cmd.match(/-p\s+(\S+)/) || [null, "awg"])[1];
    const endpoint = /:\d+$/.test(ip) ? ip : ip + ":" + port;
    let sum = 0;
    for (let i = 0; i < ip.length; i++) sum += ip.charCodeAt(i);
    const torn = sum % 4 === 0;
    const pad = endpoint + " ".repeat(Math.max(1, 23 - endpoint.length));
    const report = [
      "# WARP endpoints: " + (torn ? "0 working / 1 probed" : "1 working / 1 probed"),
      "# sorted by in-tunnel loss, then in-tunnel ping",
      "# ENDPOINT PING = ICMP ping to the endpoint address from this host, no tunnel involved",
      "# TUN PING / LOSS = RTT and packet loss measured inside the tunnel, to 1.1.1.1",
      "# SEEN AS = region external services see through the tunnel",
      "# NODE / NODE LOCATION = Cloudflare WARP edge node the tunnel landed on, and where it sits",
      "",
      "ENDPOINT               ENDPOINT PING TUN PING  LOSS   SEEN AS    NODE   NODE LOCATION",
    ];
    if (torn) {
      report.push("# 1 torn down (handshake ok, data flowed, then cut and never recovered)");
      report.push(pad + "?             8ms       100%   RU         DME    Moscow, RU");
    } else {
      report.push(pad + "?             6ms       0%     HK         HKG    Hong Kong, HK");
    }
    report.push("");
    report.push("# Best endpoint per node (lowest in-tunnel loss, then in-tunnel ping)");
    const out = report.join("\n");
    window.NeutralinoMock.lastCheckReport = out;
    const epLine = "  node: " + (torn ? "RU DME" : "HK HKG") + " (" + endpoint + ")\r\n";
    return [
      { delay: 250, data: "Using cached WARP account from warpscout-account.json\r\n" },
      { delay: 350, data: "Phase 2: verifying tunnels (proto=" + proto + "): 1...\r\n" },
      { delay: 650, data: epLine },
      { delay: 400, data: "  1/1\r\n" },
      { delay: 250, data: "Phase 2: verifying tunnels (proto=" + proto + "): done\r\n" },
      { delay: 200, data: "\r\nFull report written to demo-check.txt\r\n" },
      { delay: 100, type: "exit", data: "0" },
    ];
  }

  // v2.7.1: мини-скан «I1 из сканирования» — «-conf -» печатает готовый конфиг со строкой I1
  // (как у реального CLI). Профиль/SNI берём из команды, пакет — QUIC-подобный для профиля,
  // дефолтный iCloud-зонд — без -gen-i1.
  function i1Script(cmd) {
    const ip = (cmd.match(/-target\s+(\S+)/) || [null, "188.114.98.58"])[1];
    const port = (cmd.match(/-port\s+(\d+)/) || [null, "2408"])[1];
    const prof = (cmd.match(/-gen-i1\s+(\S+)/) || [null, ""])[1];
    const sni = (cmd.match(/-i1-sni\s+(\S+)/) || [null, ""])[1];
    const endpoint = /:\d+$/.test(ip) ? ip : ip + ":" + port;
    let sum = 0;
    const seed = (prof || "icloud") + "|" + sni;
    for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
    const hx = (n) => { let s = ""; for (let i = 0; i < n; i++) { sum = (sum * 1103515245 + 12345) >>> 0; s += "0123456789abcdef"[sum % 16]; } return s; };
    const i1 = prof
      ? "<b 0xc70000000101f1000040" + hx(22) + "><r 22><b 0x" + hx(24) + "><r 16>"
      : "<r 2><b 0x858000010001000000000669636c6f756403636f6d0000010001c00c000100010000105a00044d583737>";
    const conf = [
      "",
      "[Interface]",
      "Address = 172.16.0.2/32",
      "PrivateKey = EPwCPpMTQUl7V/cpPyacTsXVvzpmzHcQQI5abeLmylA=",
      "DNS = 1.1.1.1, 1.0.0.1",
      "Jc = 6",
      "Jmin = 10",
      "Jmax = 50",
      "I1 = " + i1,
      "",
      "[Peer]",
      "PublicKey = bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=",
      "Endpoint = " + endpoint,
      "AllowedIPs = 0.0.0.0/0",
      "PersistentKeepalive = 25",
    ].join("\r\n");
    return [
      { delay: 250, data: "Using cached WARP account from warpscout-account.json\r\n" },
      { delay: 300, data: "\r\nPort: " + port + " (pinned, phase 1 skipped)\r\n" },
      { delay: 400, data: "Phase 2: verifying tunnels (proto=awg): 1...\r\n" },
      { delay: 500, data: "  node: HK HKG (" + endpoint + ")\r\n  1/1\r\n" },
      { delay: 300, data: "Phase 2: verifying tunnels (proto=awg): done\r\n" },
      { delay: 250, data: conf + "\r\n" },
      { delay: 100, type: "exit", data: "0" },
    ];
  }

  // v2.8.0 (F3): usque config.json — «scan -p masque … -conf - -conf-type native»
  // печатает готовый config.json (формат Diniboy1123/usque).
  function usqueScript(cmd) {
    const ip = (cmd.match(/-target\s+(\S+)/) || [null, "162.159.198.2"])[1];
    const port = (cmd.match(/-port\s+(\d+)/) || [null, "443"])[1];
    const conf = {
      private_key: "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQDemo",
      endpoint_v4: ip,
      endpoint_v6: "2606:4700:103::",
      endpoint_h2_v4: "162.159.198.2",
      endpoint_h2_v6: "",
      endpoint_pub_key: "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEIaU7MToJm9NKp8YfGxR6r+/h4mcG\n7SxI8tsW8OR1A5tv/zCzVbCRRh2t87/kxnP6lAy0lkr7qYwu+ox+k3dr6w==\n-----END PUBLIC KEY-----\n",
      license: "",
      id: "m0ckmasque00000000000000000000000",
      access_token: "demo-masque-token",
      ipv4: "172.16.0.2",
      ipv6: "2606:4700:110:8679:ee89:902a:ff5a:9571",
    };
    const body = JSON.stringify(conf, null, 2) + "\r\n";
    return [
      { delay: 250, data: "Using cached WARP account from warpscout-account.json\r\n" },
      { delay: 300, data: "\r\nPort: " + port + " (pinned, phase 1 skipped)\r\n" },
      { delay: 500, data: "Phase 2: verifying tunnels (proto=masque): 1...\r\n" },
      { delay: 500, data: "  node: HK HKG (" + ip + ":" + port + ")\r\n  1/1\r\n" },
      { delay: 300, data: "Phase 2: verifying tunnels (proto=masque): done\r\n" },
      { delay: 250, data: body },
      { delay: 100, type: "exit", data: "0" },
    ];
  }

  const scripts = {
    scan(cmd) {
      // v2.8.0: usque config.json (MASQUE) — мини-скан с -conf - печатает готовый config.json
      if (/(^|\s)-p\s+masque(\s|$)/.test(cmd) && /(^|\s)-conf\s+-/.test(cmd)) return usqueScript(cmd);
      // v2.8.0: потоковый скан (-stream-json) — NDJSON-события вместо текстового вывода
      if (/(^|\s)-stream-json(\s|$)/.test(cmd)) return streamScanScript(cmd);
      // v2.7.1: «I1 из сканирования» (мини-скан с -conf -) — до проверки QC-сценария
      if (/(^|\s)-conf\s+-/.test(cmd)) return i1Script(cmd);
      // v1.9.0: быстрая проверка одного эндпоинта (scan -target IP -port PORT) — короткий сценарий
      if (/(^|\s)-target\s+\S/.test(cmd) && /(^|\s)-port\s+\d+/.test(cmd)) return checkScript(cmd);
      const withP = /(^|\s)-P(\s|$)|tun-ping/.test(cmd);
      const chunks = [];
      const report = varyReport(withP ? MOCK_REPORT : MOCK_REPORT_NOP);
      window.NeutralinoMock.lastReport = report; // finishScan в демо берёт отчёт, соответствующий флагам
      chunks.push({ delay: 200, data: "Using cached WARP account from warpscout-account.json\r\n" });
      chunks.push({ delay: 300, data: "\r\nPhase 1: probing reachable WARP ports: 12...\r\n" });
      chunks.push({ delay: 700, data: "  4/12\r\n" });
      chunks.push({ delay: 600, data: "  8/12\r\n" });
      chunks.push({ delay: 500, data: "Phase 1: probing reachable WARP ports: reachable ports [2408 500 1701 4500]\r\n" });
      chunks.push({ delay: 300, data: "Phase 2: verifying tunnels (proto=awg): 8...\r\n" });
      chunks.push({ delay: 500, data: "  node: HK HKG (188.114.98.58:2408)\r\n  2/8\r\n" });
      chunks.push({ delay: 500, data: "  node: SE ARN (188.114.97.177:2408)\r\n  node: DE FRA (188.114.99.218:2408)\r\n  5/8\r\n" });
      chunks.push({ delay: 500, data: "Phase 2: verifying tunnels (proto=awg): done\r\n" });
      chunks.push({ delay: 300, data: "\r\nFull report written to demo-report.txt\r\n" });
      chunks.push({ delay: 200, data: report, type: "stdout" });
      chunks.push({ delay: 100, type: "exit", data: "0" });
      return chunks;
    },
    register(cmd) {
      const fresh = /-fresh/.test(cmd);
      return [
        { delay: 300, data: "Checking Cloudflare API availability...\r\n" },
        { delay: 900, data: fresh ? "Registered fresh WARP account -> warpscout-account.json\r\n" : "Rotated keys on existing WARP account -> warpscout-account.json\r\n" },
        { delay: 100, type: "exit", data: "0" },
      ];
    },
    "find-junk"(cmd) {
      return [
        { delay: 300, data: "attempt 1: jc=14 jmin=8 jmax=48 gen-i1=quic -> 0/8 endpoints work\r\n" },
        { delay: 800, data: "attempt 2: jc=6 jmin=12 jmax=63 gen-i1=random -> 2/8 endpoints work\r\n" },
        { delay: 800, data: "attempt 3: jc=4 jmin=40 jmax=70 gen-i1=quic -> 8/8 endpoints work\r\n" },
        { delay: 200, data: "\r\nWorking junk set found. Command:\r\n" },
        { delay: 50, data: "warpscout.exe scan -proto awg -P -n 10 -gen-i1 quic -jc 4 -jmin 40 -jmax 70\r\n" }, // v2.4.6 (F44): формат как у реального CLI на Windows
        { delay: 100, type: "exit", data: "0" },
      ];
    },
    "find-sni"(cmd) {
      return [
        { delay: 300, data: "SNI consumer-masque.cloudflareclient.com -> 0/6 endpoints work\r\n" },
        { delay: 800, data: "SNI www.apple.com -> 6/6 endpoints work\r\n" },
        { delay: 200, data: "\r\nWorking SNI found. Command:\r\n" },
        { delay: 50, data: "warpscout.exe scan -proto masque -masque-sni www.apple.com\r\n" }, // v2.4.6 (F44): как у реального CLI
        { delay: 100, type: "exit", data: "0" },
      ];
    },
    socks(cmd) {
      const box = (s) => "\u2502 " + s;
      const line = "\u2500".repeat(34);
      const top = "\u256d" + line + "\u256e";
      const bot = "\u2570" + line + "\u256f";
      const ep = (cmd.match(/-e\s+(\S+)/) || [null, "188.114.98.58:2408"])[1];
      return [
        { delay: 400, data: "For testing purposes ONLY.\r\nOne tunnel, no reconnect, no failover.\r\n" },
        { delay: 600, data: top + "\r\n" },
        { delay: 100, data: box("SOCKS5   socks5h://127.0.0.1:1080") + "\r\n" },
        { delay: 100, data: box("Endpoint " + ep) + "\r\n" },
        { delay: 100, data: box("Tunnel   " + ((cmd.match(/-p\s+(\S+)/) || [null, "awg"])[1])) + "\r\n" },
        { delay: 100, data: box("Exit     Hong Kong, HK (HKG node)") + "\r\n" },
        { delay: 100, data: bot + "\r\n" },
        { delay: 300, data: "Ctrl+C to stop the proxy\r\n" },
      ];
    },
    version() {
      return [{ delay: 150, data: "0.17.0\r\n" }, { delay: 50, type: "exit", data: "0" }];
    },
  };

  window.NeutralinoMock = {
    account: MOCK_ACCOUNT,
    report: MOCK_REPORT,
    isRunning(id) { return !!processes[id]; },
  };

  window.Neutralino = {
    id: "mock",
    mock: true,
    init() { window.dispatchEvent(new CustomEvent("mocknl:ready")); },
    os: {
      execCommand(cmd, opts) {
        const key = cmd.trim().split(/\s+/).slice(0, 2).join(" ").replace(/\.exe$/i, "").toLowerCase();
        let script;
        if (key.includes("scan")) script = scripts.scan(cmd);
        else if (key.includes("register")) script = scripts.register(cmd);
        else if (key.includes("find-junk")) script = scripts["find-junk"](cmd);
        else if (key.includes("find-sni")) script = scripts["find-sni"](cmd);
        else if (key.includes("socks")) script = scripts.socks(cmd);
        else if (key.includes("version")) script = scripts.version(cmd);
        else script = [{ delay: 100, data: "(демо: команда не поддержана в превью)\r\n" }, { delay: 50, type: "exit", data: "0" }];
        if (opts && opts.stream) return streamProcess(cmd, script);
        // не-стриминговый вызов (как os.execCommand в реальном рантайме): ждём весь вывод
        const out = script
          .filter((c) => c.type !== "exit")
          .map((c) => String(c.data))
          .join("");
        return new Promise((resolve) => {
          setTimeout(() => resolve({ id: -1, pid: 0, stdOut: out, stdErr: "", exitCode: 0, output: out }), 400);
        });
      },
      spawnProcess(cmd) {
        // v2.4.2 FIX: реальное приложение перешло с execCommand{stream} на spawnProcess —
        // мок обязан диспетчить по команде так же, как execCommand, иначе демо-скан/
        // регистрация/инструменты получали бы socks-сценарий.
        const key = cmd.trim().split(/\s+/).slice(0, 2).join(" ").replace(/\.exe$/i, "").toLowerCase();
        let script;
        if (key.includes("scan")) script = scripts.scan(cmd);
        else if (key.includes("register")) script = scripts.register(cmd);
        else if (key.includes("find-junk")) script = scripts["find-junk"](cmd);
        else if (key.includes("find-sni")) script = scripts["find-sni"](cmd);
        else if (key.includes("socks")) script = scripts.socks(cmd);
        else if (key.includes("version")) script = scripts.version(cmd);
        else script = [{ delay: 100, data: "(демо: команда не поддержана в превью)\r\n" }, { delay: 50, type: "exit", data: "0" }];
        return streamProcess(cmd, script);
      },
      killProcess(id) {
        if (processes[id]) {
          processes[id].killed = true;
          delete processes[id];
          emitEvent("spawnedProcess", { id, pid: 4000 + id, type: "exit", data: 143 });
        }
        return Promise.resolve();
      },
      // реальный API Neutralino v6: os.updateSpawnedProcess(id, "exit") завершает процесс
      updateSpawnedProcess(id, action) {
        if (action === "exit") return this.killProcess(Number(id));
        return Promise.resolve();
      },
      getSpawnedProcesses() {
        return Promise.resolve(
          Object.keys(processes).map((id) => ({ id: Number(id), pid: 4000 + Number(id), stream: "out" }))
        );
      },
      showSaveDialog(title, opts) {
        const name = (opts && opts.defaultPath) || "warp.conf";
        return Promise.resolve(window.prompt("Демо: путь сохранения:", "C:\\Users\\Demo\\Downloads\\" + name) || "");
      },
      showOpenDialog() {
        return Promise.resolve(window.prompt("Демо: путь к файлу:", "C:\\Users\\Demo\\Downloads\\warp.conf") || "");
      },
      showFolderDialog(title) {
        return Promise.resolve(window.prompt("Демо: " + (title || "выбор папки:"), "C:\\Users\\Demo\\WarpData") || "");
      },
      open() { return Promise.resolve(); },
      getPath(kind) {
        return Promise.resolve("C:\\Users\\Demo\\" + (kind === "data" ? "AppData\\Local" : kind || "Documents"));
      },
      env: { NL_DEMO: "1" },
    },
    filesystem: {
      writeFile(path, data) {
        try { LS.set("lastfile:" + path, String(data)); } catch (e) {}
        return Promise.resolve();
      },
      readFile(path) {
        const v = LS.get("lastfile:" + path);
        return v == null ? Promise.reject(new Error("not found (demo)")) : Promise.resolve(v);
      },
      createDirectory() { return Promise.resolve(); },
      readDirectory() { return Promise.resolve([]); },
      // v2.2.0: демо-заглушки (v2.3.0: remove нужен repairUdfJunction в реальном приложении; в демо не вызывается)
      remove() { return Promise.resolve(); },
    },
    storage: {
      setData(k, v) { LS.set(k, v); return Promise.resolve(); },
      getData(k) {
        const v = LS.get(k);
        return v == null ? Promise.reject({ code: "NE_ST_NOKAY" }) : Promise.resolve(v);
      },
    },
    window: {
      setTitle(t) { document.title = t; return Promise.resolve(); },
    },
    app: { exit() { return Promise.resolve(); } },
    debug: { log() {} },
    events: {
      _h: {},
      on(name, handler) {
        const ev = "mocknl:" + name;
        const wrapped = (e) => handler({ detail: e.detail });
        window.addEventListener(ev, wrapped);
        this._h[name + ":" + Date.now()] = wrapped;
        return Promise.resolve();
      },
      off() { return Promise.resolve(); },
      dispatch() { return Promise.resolve(); },
    },
    path: {},
  };

  // mock globals, используемые app.js
  window.NL_PATH = "C:\\Users\\Demo\\Apps\\WARPScoutGUI";
  window.NL_CWD = window.NL_PATH;
  // единая версия демо = версия GUI (не дублировать в ветках — раньше здесь
  // остался устаревший «2.4.6», из-за чего JS-статусы демо показывали не ту версию)
  window.NL_APPVERSION = "2.8.2";
  // v2.5.0: ?platform=android — предпросмотр сенсорного режима Android-версии
  // (тот же мок, но платформа Android: TOUCH_UI, бинарь из nativeLibraryDir)
  if (/(?:^|[?&])platform=android/.test(String(window.location.search))) {
    window.NL_PATH = "/data/user/0/ru.warpscout.gui/files";
    window.NL_CWD = window.NL_PATH;
    window.NL_OS = "Android";
    window.NL_WS_PATH = "/data/app/~~demo/lib/arm64/libwarpscout.so";
  } else {
    window.NL_OS = "Windows";
  }
  // v2.3.0: демо показывает только статус «всё в одной папке» —
  // виртуальные папки v2.2.0 больше не нужны
})();
