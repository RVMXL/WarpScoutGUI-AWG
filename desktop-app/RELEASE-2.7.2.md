# WarpScoutGUI 2.7.2 — warpscout 0.17.0: профиль -p awg31

WarpScoutGUI 2.7.2 — поддержка warpscout 0.17.0 (вышел 24.11). Главный
профиль нового CLI — `-p awg31` (AmneziaWG с клиентскими параметрами 3.1) —
встроен в связку «скан = конфиг», которую GUI завёл в 2.7.0: версия AWG
берётся из «Конфиг → Версия» (как junk-параметры из `S.cfg.obf`), поэтому
прогон проверяет эндпоинты ровно с тем профилем, который уйдёт в конфиг —
разница 2.0/3.1 больше не даёт сюрприза «скан находит, конфиг не работает».
На warpscout <0.17 всё работает как раньше — тихий откат к `-p awg`.
Ядро, которое GUI находит рядом с собой, пользователь обновляет сам
(например, заменой `warpscout.exe`); SHA-пины `deps.json` для
поставляемых бинарей сходятся. Форматы данных не менялись: отчёты,
конфиги, аккаунт, история — полная совместимость с 2.7.1.

WarpScoutGUI 2.7.2 brings support for warpscout 0.17.0 (released Nov 24).
The headline CLI profile `-p awg31` (AmneziaWG with the 3.1 client
parameters) is wired into the "scan = config" coupling the GUI
introduced in 2.7.0: the AWG version comes from Config → Version (the way
junk parameters come from `S.cfg.obf`), so the run verifies endpoints
with exactly the profile that goes into the config — the 2.0/3.1 mismatch
no longer produces the "scan works, config doesn't" surprise. On
warpscout <0.17 everything works as before — a silent fallback to
`-p awg`. The warpscout binary itself is updated by the user (e.g. by
replacing `warpscout.exe`); the `deps.json` SHA pins for the bundled
binaries match. Data formats are unchanged: reports, configs, account
and history remain fully compatible with 2.7.1.

## Что изменилось / What changed

- **Профиль `-p awg31` в скане, проверке, «I1 из сканирования» и SOCKS.**
  При версии конфига «3.1» команды идут с `-p awg31` и передают тайминги
  3.1 из общего `S.cfg.obf` флагами CLI: `-padding`
  (ContentPaddingAddition), `-rekey-after` (RekeyAfterTime),
  `-rekey-timeout` (RekeyTimeout), `-reject-after` (RejectAfterTime),
  `-keepalive-timeout` (KeepaliveTimeout), `-max-handshakes`
  (MaxHandshakeAttempts), булевы `-disable-cookies` / `-random-trailers`
  (в точности соответствие полей «Конфиг → Дополнительно» флагам v0.17.0:
  `flags.go` awg31Ranges, RANGE — «N» или «MIN-MAX»). HPK warpscout
  сознательно не поддерживает (`warp.go`: «HeaderProtectionKey is
  omitted» — ключ шифрует заголовки, им должен владеть пир) — ключ
  по-прежнему только в конфиге. Поля не-RANGE формата (пустые, «abc»,
  «6 9», shell-мусор) молча пропускаются — флаг не добавляется, структура
  команды не ломается. На warpscout <0.17 (версия распознаётся при
  проверке бинаря, semver-порог 0.17.0) — тихий откат к обычному `-p awg`;
  в карточке «Обфускация AmneziaWG» на вкладке «Скан» — подсказка о том,
  откуда берётся версия и что нужен 0.17+.

  The `-p awg31` profile in scan, endpoint check, "I1 from scan" and
  SOCKS. When the config version is "3.1", the commands run with
  `-p awg31` and pass the 3.1 timings from the shared `S.cfg.obf` as CLI
  flags: `-padding` (ContentPaddingAddition), `-rekey-after`
  (RekeyAfterTime), `-rekey-timeout` (RekeyTimeout), `-reject-after`
  (RejectAfterTime), `-keepalive-timeout` (KeepaliveTimeout),
  `-max-handshakes` (MaxHandshakeAttempts), boolean `-disable-cookies` /
  `-random-trailers` (an exact field-to-flag mapping of Config → Advanced
  against v0.17.0 `flags.go` awg31Ranges; RANGE is "N" or "MIN-MAX").
  HPK is deliberately unsupported by warpscout (`warp.go`:
  "HeaderProtectionKey is omitted" — the key encrypts headers, so the
  peer must hold it) — it remains config-only. Fields that are not a
  valid RANGE (empty, "abc", "6 9", shell junk) are silently skipped —
  no flag is added, the command structure stays intact. On warpscout
  <0.17 (the version is learned when the binary is checked; semver
  threshold 0.17.0) everything silently falls back to plain `-p awg`;
  the "Obfuscation AmneziaWG" card on the Scan tab now explains where
  the version comes from and that 0.17+ is required.

- **Демо-режим — warpscout 0.17.0.** Статусная строка в настройках, футер
  домашнего экрана и mock-сценарий `version` показывают 0.17.0 — демо
  ведёт себя как связка с новым CLI (в том числе `-p awg31` в командах).

  Demo mode shows warpscout 0.17.0 (the status line in Settings, the
  home-screen footer and the mock `version` scenario) — the demo behaves
  like a setup with the new CLI (including `-p awg31` in commands).

## Изменения по платформам (2.7.2) / Platform changes (2.7.2)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Оба изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux64)** | Оба изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux-arm64)** | Оба изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-arm64)** | Оба изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-x64)** | Оба изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **Android (apk)** | Оба изменения (общие ресурсы) — см. выше; versionCode 20702. |

## Проверки / Verification

- Тесты: 120 → 132, все зелёные (`node --test desktop-app/tests/*.test.js`).
  Новый файл tests/awg31.test.js: wsSupports31 (semver-порог 0.17.0;
  пустота/мусор = откат; «0.1.70» ≠ «0.17»), scanProtoOf (awg31 только
  при cfg.ver=awg31 И CLI 0.17+; wg/masque не трогаются; awg20/wg-версии
  конфига дают обычный awg), awg31Args (полный набор дефолтов примера —
  8 токенов; пустота/«abc»/«6 9»/shell-мусор/off пропускаются — остаётся
  ровно один валидный флаг), buildScanArgs (awg31 + junk из S.cfg.obf;
  откат на 0.16 без таймингов; awg20/wg/masque без таймингов),
  buildScanCmd (строка с блоком таймингов), buildCheckCmd (повтор
  профиля + gen-i1 + тайминги; на 0.16 ветка junk жива), buildI1Cmd
  (мини-скан awg31 с профилем и таймингами; masque последнего запуска —
  без таймингов).
- check-i18n: OK (подсказка awg31 — RU/EN; тексты демо обновлены).
- gen-version --check: OK 2.7.2; verify-deps: OK.
- Соответствие флагов проверено по исходникам warpscout v0.17.0
  (`flags.go`: `-p` принимает `wg|awg|awg31|masque|masque-h2`,
  awg31-флаги требуют `-proto awg31`; `warp.go`: awg31Ranges —
  padding/rekey-after/rekey-timeout/reject-after/keepalive-timeout/
  max-handshakes + disable-cookies/random-trailers; junk-флаги
  jc/jmin/jmax/gen-i1 применимы и под awg31).
