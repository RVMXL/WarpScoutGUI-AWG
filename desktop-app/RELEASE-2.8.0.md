# WarpScoutGUI 2.8.0 — живой скан, банер обновления GUI, новые экспорты (prerelease)

WarpScoutGUI 2.8.0 — пакет улучшений по итогам разбора трёх сторонних GUI для
warpscout (HattabbI4, 3inker, openwarpkit): скан переходит на потоковый режим
`-stream-json` ядра 0.17.0 (живая таблица и честный прогресс), приложение
учит сообщать о своей собственной новой версии, экспорт конфигов пополнился
mihomo-JSON и usque config.json, появилось два инструмента «для тех, у кого
всё плохо»: автоподбор профиля I1 и повтор скана из истории. **Выпуск
опубликован как PRERELEASE** — после проверки он переводится в полноценный
релиз (prerelease=false, make_latest=true); пока он пререлиз, банер
обновления (см. ниже) на него не срабатывает — GitHub не отдаёт пререлизы в
`releases/latest`. Форматы данных не менялись: отчёты, конфиги, аккаунт,
история, бэкапы — полная совместимость с 2.7.3.

WarpScoutGUI 2.8.0 is a batch of improvements based on a review of three
third-party warpscout GUIs (HattabbI4, 3inker, openwarpkit): scanning moves
to the 0.17.0 core's `-stream-json` mode (a live table and honest progress),
the app learns to announce its own new version, config export gains
mihomo JSON and a usque config.json, and two tools "for when everything
fails" appear: automatic I1 profile search and re-running a scan from
history. **This release is published as a PRERELEASE** — after review it is
promoted to a full release (prerelease=false, make_latest=true); while it is
a pre-release, the update banner below does not fire — GitHub excludes
pre-releases from `releases/latest`. Data formats are unchanged: reports,
configs, account, history and backups remain fully compatible with 2.7.3.

## Что изменилось / What changed

- **Живая таблица скана (`-stream-json`, F1).** Скан запускается с
  `-stream-json` — флагом, который warpscout 0.17.0 добавил ровно для
  GUI-обёрток (схема `schema/warpscout-v1.schema.json` в репо ядра). События
  `progress` несут точные done/total по фазам ports/tunnels/speed —
  прогресс-бар впервые показывает реальные проценты вместо regex-догадок по
  тексту CLI; события `endpoint` наполняют таблицу по мере находок
  (перерисовка троттлингом 800 мс — на полном `-f` скане событий сотни);
  `error` попадает в лог с пометкой [CLI]; `done` несёт авторитетный
  документ результата (working/torn/picks/best), из которого собирается
  финальная таблица. Живая панель (график, чипы узлов, счётчики) питается
  теми же структурированными событиями. Файл отчёта по-прежнему пишется:
  явный `-o` возвращает его (CLI подавляет отчёт при stream-режиме), он нужен
  для Android-зеркала в Download/WARPScoutGUI и служит фолбэком. Лог —
  человекочитаемый: вехи фаз и ошибки, сырой NDJSON в журнал не льётся.
  Совместимость: на warpscout <0.17 (свой CLI в «Настройках») гейт версии
  не добавляет флаг вовсе; если старое ядро всё же упало с «flag provided
  but not defined» — та же сессия тихо перезапускается в обычном режиме
  (файл отчёта) с примечанием в логе.

  Live scan table via -stream-json. The scan runs with -stream-json, the
  flag warpscout 0.17.0 added exactly for GUI wrappers (schema
  warpscout-v1.schema.json). Progress events carry exact done/total for the
  ports/tunnels/speed phases — the progress bar shows real percentages for
  the first time instead of regex guesses; endpoint events fill the table
  as results arrive (renders throttled to 800 ms — a full -f scan emits
  hundreds of events); error lines hit the log with a [CLI] prefix; the
  done event carries the authoritative result document
  (working/torn/picks/best) the final table is built from. The live panel
  (chart, node chips, counters) feeds on the same structured events. The
  report file is still written: an explicit -o brings it back (the CLI
  suppresses reports in stream mode), it feeds the Android mirror in
  Download/WARPScoutGUI and serves as a fallback. Compatibility: on
  warpscout <0.17 (a custom CLI in Settings) the version gate omits the
  flag entirely; if an old core still dies with "flag provided but not
  defined", the same session silently restarts in the regular mode (report
  file) with a note in the log.

- **Банер «⬆ WarpScoutGUI {v} — есть обновление» (F2).** Симметрично
  подсказке warpscout из 2.7.3: раз за сессию (не чаще раза в 12 ч, своя
  метка в localStorage) приложение читает `releases/latest` своего
  репозитория через api.github.com — тот же единственный внешний CSP-хост,
  read-only HTTPS без данных пользователя. При более свежей версии в
  статус-линии появляется вторая жёлтая строка; клик (и клавиатура) открывает
  страницу релизов. GitHub не отдаёт пререлизы и черновики в
  `releases/latest` — банер срабатывает только на версии, переведённые в
  полноценный релиз. Любая сетевая ошибка — молча.

  A "⬆ WarpScoutGUI {v} — update available" banner. Symmetric to the 2.7.3
  warpscout hint: once per session (at most once per 12 hours, its own
  localStorage marker) the app reads its own repository's releases/latest
  through api.github.com — the same single external CSP host, read-only
  HTTPS with no user data. When a newer version exists, a second yellow row
  appears in the sidebar status line; click (or keyboard) opens the releases
  page. GitHub excludes pre-releases and drafts from releases/latest — the
  banner fires only on promoted versions. Any network error stays silent.

- **Экспорт mihomo .json (F3).** Те же прокси, что в Clash .yaml
  (WireGuard+AmneziaWG с полным amnezia-wg-option — тайминги 3.1, I1–I5 — и
  MASQUE-узлы при наличии устройства), но JSON-массивом: формат CLI
  `-conf-type mihomo-json`, ключи совпадают с YAML. Кнопка «🧩 mihomo .json»
  рядом с Clash/WireSock.

  mihomo .json export. The same proxies as the Clash .yaml (a
  WireGuard+AmneziaWG proxy with the full amnezia-wg-option block — 3.1
  timings, I1–I5 — plus MASQUE nodes when the account has the device), as a
  JSON array: the shape of the CLI -conf-type mihomo-json, keys identical to
  the YAML. A "🧩 mihomo .json" button next to Clash/WireSock.

- **Экспорт usque config.json (F3, MASQUE).** Формат usque требует
  ECDSA-ключи, license и access_token, которых в WG/AWG-части аккаунта нет,
  а вручную собирать его из GUI — гарантированная рассинхронизация с ядром.
  Единственный честный источник — само ядро: кнопка «🪶 usque config.json»
  прогоняет короткий мини-скан выбранного эндпоинта
  (`scan -p masque -target <ip> -port <port> -n 1 -conf - -conf-type native`,
  механика «I1 из сканирования») и сохраняет готовый config.json через
  стандартный диалог. Пустой/невалидный вывод — тост, ничего не пишется.

  usque config.json export. The usque format needs ECDSA keys, a license
  and an access_token that do not exist in the WG/AWG part of the account,
  and assembling it in the GUI would drift from the core. The honest source
  is the core itself: a "🪶 usque config.json" button runs a short
  single-endpoint scan (scan -p masque -target <ip> -port <port> -n 1
  -conf - -conf-type native, the same mechanism as "I1 from scan") and
  saves the ready config.json through the standard dialog. Empty/invalid
  output — a toast, nothing is written.

- **Автоподбор профиля I1 (F4).** Тумблер «Автоподбор профиля I1» в карточке
  «Обфускация AmneziaWG»: если скан AWG не нашёл ни одного рабочего
  эндпоинта, приложение в той же сессии само перебирает профили «If nothing
  works» из README ядра (quic → dns → sip → stun → random, минус текущий),
  показывая «Автоподбор I1: профиль {p} ({n}/{m})» в фазе и тостах;
  сработавший профиль остаётся в конструкторе. Промежуточные пустые попытки
  историю не засоряют — запись одна, итог цепочки. Stop останавливает
  цепочку; для wg/masque фича неактивна.

  Automatic I1 profile search. A toggle in the AmneziaWG obfuscation card:
  if an AWG scan finds no working endpoints, the app itself walks the
  "If nothing works" profiles from the core README (quic → dns → sip →
  stun → random, minus the current one) within the same session, showing
  "Auto I1: profile {p} ({n}/{m})"; the working profile stays in the
  constructor. Intermediate empty attempts do not pollute history — a
  single entry records the chain's outcome. Stop breaks the chain; wg and
  masque are untouched.

- **«Лучший по скорости» доведён до конца (F6).** Флаг `-best-by speed` в
  конструкторе уже был — теперь звезда лучшего в таблице, автоподстановка
  в конфиг после скана и кнопка «★ Лучший» в SOCKS учитывают его: при
  замере скорости лучшим считается эндпоинт с максимальным SPEED, а не
  минимальным пингом.

  "Best by speed" finished. The -best-by speed flag existed in the
  constructor — now the best-star in the table, the post-scan config pick
  and the SOCKS "★ Best" button all honor it: with a speed measurement, the
  endpoint with the highest SPEED is the best one, not the lowest ping.

- **Повтор скана из истории (F7).** Снимок параметров хранился в записях
  истории с 2.4.6 (F18/F30), но доставить его было некем. Кнопка «⟳» в
  каждой записи возвращает параметры в конструктор (форма сама не
  запускается — запуск остаётся за пользователем), с клавиатурой и
  тостом-подтверждением.

  Re-run a scan from history. History entries carried a parameter snapshot
  since 2.4.6 (F18/F30) with no way to use it. A "⟳" button on every entry
  restores the parameters into the constructor (it does not start the scan
  by itself), keyboard-accessible, with a confirmation toast.

- **Предупреждение при закрытии с активным SOCKS (F8, десктоп).** Событие
  `windowClose` перехватывается: при запущенном SOCKS-прокси окно спросит
  «Закрыть приложение и остановить прокси?» — отказ оставляет приложение
  открытым, согласие останавливает прокси, сохраняет состояние и выходит.
  Демо и Android не затронуты.

  A warning when closing with an active SOCKS (desktop). The windowClose
  event is intercepted: with a SOCKS proxy running, the window asks to
  close and stop the proxy — declining keeps the app open, accepting stops
  the proxy, saves state and exits. Demo and Android are unaffected.

- **Демо-режим.** NDJSON-сценарий `-stream-json` (те же данные, что в
  текстовом отчёте, включая варьирование «живости»), тумблер автоподбора I1
  демо-нострифицирует пустой скан (первый прогон без профиля пуст —
  следующий, уже с профилем, находит адреса), банер GUI показывается на
  условной «v2.9.0», usque-кнопка возвращает условный config.json.

  Demo mode. A NDJSON -stream-json script (the same data as the text report,
  including the variation), the auto-I1 toggle demo-nostrifies an empty scan
  (the first no-profile run comes back empty, the next one finds endpoints),
  the GUI banner is shown against a mock "v2.9.0", the usque button returns
  a mock config.json.

## Изменения по платформам (2.8.0) / Platform changes (2.8.0)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Все пункты выше (общие ресурсы); закрытие окна — F8. |
| **Linux (linux64)** | Все пункты выше (общие ресурсы); закрытие окна — F8. |
| **Linux (linux-arm64)** | Все пункты выше (общие ресурсы); закрытие окна — F8. |
| **macOS (mac-arm64)** | Все пункты выше (общие ресурсы); закрытие окна — F8. |
| **macOS (mac-x64)** | Все пункты выше (общие ресурсы); закрытие окна — F8. |
| **Android (apk)** | Все пункты выше, кроме F8 (windowClose на Android не приходит); versionCode 20800. |

## Проверки / Verification

- Тесты: 134 → 148, все зелёные (`node --test desktop-app/tests/*.test.js`).
  Новые файлы: stream.test.js (wsSupports/wsSupportsStream — semver-гейт
  0.17.0; buildScanCmd — -stream-json только по гейту и opts, -o сохранён;
  streamParseLine/streamNum/streamEpToRow/streamDoneToResults — события
  схемы, конвертации, мусор → null; autoI1Candidates; bestBySpeedOf;
  pickRunBest; sanitizeScan autoI1) и guiupd.test.js (guiParseTag, guiUpdFor,
  buildMihomoJson — валидный массив, awg31-опции, reserved, MASQUE-узлы).
- check-i18n: OK (новые ключи upd.03/04, scan.autoi1.01–05, scan.stream.01,
  scan.lock.02, history.31–33, conf.82–86, socks.close.01 — RU/EN; статика
  index.html покрыта словарём; банеры #stWsUpd/#stGuiUpd в SKIP).
- gen-version --check: OK 2.8.0; verify-deps: OK (пины ядер 0.17.0).

## Статус пререлиза

Этот выпуск помечен как pre-release намеренно: сначала ручная проверка
функций на реальной машине, затем перевод в полноценный релиз (GitHub UI
«Set as latest» или API). Пользователи на 2.7.3 банер «⬆ WarpScoutGUI 2.8.0»
увидят только ПОСЛЕ перевода — эндпоинт releases/latest пререлизы не
возвращает.
