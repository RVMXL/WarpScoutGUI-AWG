# WarpScoutGUI 2.7.0 — фикс вёрстки «Дополнительно», единые параметры обфускации, экспорт для Clash и WireSock

WarpScoutGUI 2.7.0 — три задачи по отзывам пользователя: (1) на вкладке
«Конфиг» в «Параметры обфускации → Дополнительно» подписи AWG 3.1-полей
налезали друг на друга; (2) параметры обфускации были в трёх местах с разными
областями действия — теперь Jc/Jmin/Jmax один набор для «Скан» и «Конфиг»;
(3) в генератор конфигов добавлен экспорт для Clash.Meta/mihomo (по примеру
пользователя: AWG + MASQUE + группа + MATCH) и для WireSock (доп. ключи
Id/Ip/Ib). Ядро warpscout — по-прежнему 0.16.0 (SHA-пины `deps.json`
сходятся). Форматы данных не менялись: отчёты, конфиги, аккаунт, история —
полная совместимость с 2.6.x.

WarpScoutGUI 2.7.0 covers three user requests: (1) on the "Config" tab, the
AWG 3.1 field labels in "Advanced" overlapped each other; (2) obfuscation
parameters lived in three places with different scopes — Jc/Jmin/Jmax are now
one shared set for "Scan" and "Config"; (3) the config generator gained export
to Clash.Meta/mihomo (following the user's example: AWG + MASQUE + group +
MATCH) and to WireSock (the extra Id/Ip/Ib keys). The warpscout core is still
0.16.0 (`deps.json` SHA pins match). Data formats are unchanged: reports,
configs, account and history remain fully compatible with 2.6.x.

## Что изменилось / What changed

- **Вёрстка «Дополнительно» починена.** Сетка AWG 3.1
  (ContentPaddingAddition, RekeyAfterTime, RekeyTimeout, RejectAfterTime,
  KeepaliveTimeout, MaxHandshakeAttempts, RandomTrailers, DisableCookies,
  HeaderProtectionKey) раньше жалась в правую половину внешней 2-колоночной
  сетки — ячейки выходили ~90px, а подписи — длинные неразрывные
  идентификаторы, которые перелезали на соседние. Теперь сетка развёрнута на
  всю ширину карточки (`#cfgAwg31Grid { grid-column: 1/-1 }`), а подписи
  переносятся по символам (`overflow-wrap: anywhere`).

  The "Advanced" layout is fixed. The AWG 3.1 grid used to squeeze into the
  right half of the outer two-column grid (~90px cells) and the long
  unbreakable identifiers overlapped the neighbours. Now the grid spans the
  full card width and the labels wrap by character.

- **Jc/Jmin/Jmax — общие для скана и конфига.** Единый источник —
  `S.cfg.obf` (тот же, что и в конфиге). Правка в карточке «Обфускация
  AmneziaWG» на вкладке «Скан» синхронно меняет конфиг (и предпросмотр), и
  наоборот. Скан теперь проверяет эндпоинты ровно с тем набором, который
  уйдёт в конфиг. Ранее у скана был свой набор (6/10/50), влиявший только на
  пробу. «Случайный junk» (-gen-junk) остался скановым: CLI рандомизирует
  набор только на время прогона, конфиг не трогает. Найденные в «Поиске
  параметров» junk-значения пишутся в общий источник; копия junk из параметров
  последнего запуска (v2.4.6, F18) удалена как избыточная; старые junk-поля в
  профиле скана из состояний/пресетов игнорируются. В обеих карточках —
  подсказки о том, что набор общий.

  Jc/Jmin/Jmax are shared between scan and config. The single source is
  `S.cfg.obf`; editing the "AmneziaWG obfuscation" card on the "Scan" tab
  updates the config (and its preview) and vice versa. The scan now probes
  endpoints with the exact set that goes into the config. "Random junk"
  (-gen-junk) remains scan-only: the CLI randomizes the set for the run
  without touching the config. Junk values found by the Param finder go to the
  shared source; the v2.4.6 (F18) copy-from-last-run block is removed as
  redundant; legacy per-scan junk fields in states/presets are ignored. Both
  cards carry a hint explaining the sharing.

- **Экспорт для других клиентов.** Новая карточка на вкладке «Конфиг».
  «Clash .yaml» — профиль Clash.Meta/mihomo по примеру пользователя: якорь
  warp-common (WireGuard: ключи/адреса аккаунта, allowed-ips, MTU, DNS,
  reserved), amnezia-wg-option со всеми параметрами обфускации (S1–S4,
  Jc/Jmin/Jmax, H1–H4, I1/I2–I5, для AWG 3.1 — тайминги и трейлеры; версия 1/2/3
  по выбранной вкладке «Версия конфига»), при masque-устройстве аккаунта —
  узлы [WARP-MASQUE] QUIC/H2, группа Cloudflare (select) и правило
  `MATCH,Cloudflare`. Reserved-байты WARP — опциональное поле (берутся из
  рабочего Clash/wgcf-конфига того же аккаунта, чистятся до цифр, максимум 3).
  «WireSock .conf» — тот же конфиг, что в предпросмотре, плюс опциональные
  ключи Id/Ip/Ib (поля в карточке; в стандартный .conf для AmneziaVPN не
  попадают). Имена файлов: `warp-clash.yaml`, `warp-wiresock.conf`.

  Export for other clients. A new card on the "Config" tab. "Clash .yaml" —
  a Clash.Meta/mihomo profile following the user's example: the warp-common
  anchor (WireGuard with account keys/addresses, allowed-ips, MTU, DNS,
  reserved), amnezia-wg-option with every obfuscation parameter (S1–S4,
  Jc/Jmin/Jmax, H1–H4, I1/I2–I5, and for AWG 3.1 the timing keys; version
  1/2/3 follows the selected config version), [WARP-MASQUE] QUIC/H2 nodes when
  the account has a masque device, a Cloudflare select group and the
  `MATCH,Cloudflare` rule. The WARP reserved bytes are an optional field
  (taken from a working Clash/wgcf config of the same account, digits only,
  max 3). "WireSock .conf" — the same config as in the preview plus optional
  Id/Ip/Ib keys (card fields; they never reach the standard .conf). File
  names: `warp-clash.yaml`, `warp-wiresock.conf`.

## Изменения по платформам (2.7.0) / Platform changes (2.7.0)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Все три изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux64)** | Все три изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux-arm64)** | Все три изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-arm64)** | Все три изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-x64)** | Все три изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **Android (apk)** | Все три изменения (общие ресурсы) — см. выше; вёрстка «Дополнительно» проверена в touch-режиме; versionCode 20700. |

## Проверки / Verification

- Тесты: 101 → 110, все зелёные (`node --test desktop-app/tests/*.test.js`).
  Новый файл tests/exports.test.js: buildScanArgs читает junk из S.cfg.obf;
  двухсторонняя синхронизация полей «Скан»↔«Конфиг»; applyFoundCmd пишет
  junk в общий источник (с чином jmin>jmax); buildClashYaml — структура
  примера пользователя (якорь, version: 3, тайминги AWG 3.1, кавычка I1,
  reserved, MASQUE-узлы, MATCH) и чистка мусора в reserved; buildWireSockConf
  — Id/Ip/Ib только в WireSock-экспорте, при пустых полях — равенство
  стандартному .conf; sanitizeCfg — reserved/ws*. commands.test.js и
  sanitizers.test.js переведены на общий источник.
- check-i18n: OK (новые подсказки и карточка экспорта — RU/EN).
- gen-version --check: OK 2.7.0; verify-deps: OK.
- Браузерная верификация демо: правка Jc на «Скан» мгновенно видна в «Конфиг»
  и в предпросмотре; buildClashYaml/buildWireSockConf соответствуют примеру;
  сетка AWG 3.1 без налезаний на десктопе и в touch-режиме; консоль чистая.
