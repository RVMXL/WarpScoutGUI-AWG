# WarpScoutGUI 2.7.3 — актуальное ядро warpscout во всех пакетах + подсказка о новых версиях

WarpScoutGUI 2.7.3 закрывает оба пробела, оставшихся после 2.7.2. Во-первых,
ядро warpscout в пакетах ВСЕХ платформ обновлено до 0.17.0: в 2.7.2 код GUI
уже поддерживал профиль `-p awg31`, но в самих пакетах по-прежнему лежало
ядро 0.16.0 (десктоп-ядро переносилось из zips прошлого релиза и
замораживалось навсегда). Цепочка поставки перестроена: все шесть ядер
(win64, linux64, linux-arm64, mac-arm64, mac-x64, android) ставятся в пакеты
из релиза vernette/warpscout по единому пину `deps.json:warpscout.version`.
Во-вторых — по предложению из issue #1 — приложение само подсказывает о
выходе новой версии warpscout: раз за сессию читает последний релиз
vernette/warpscout через GitHub API и при более свежей версии показывает
строку «⬆ warpscout {v} — есть обновление» в статус-линии сайдбара.
Форматы данных не менялись: отчёты, конфиги, аккаунт, история — полная
совместимость с 2.7.2.

WarpScoutGUI 2.7.3 closes the two gaps left after 2.7.2. First, the
warpscout core bundled in ALL platform packages is updated to 0.17.0:
GUI 2.7.2 already supported the `-p awg31` profile, but the packages still
shipped a 0.16.0 core (the desktop core used to be carried over from the
previous release's zips, frozen forever). The supply chain has been
rebuilt: all six cores (win64, linux64, linux-arm64, mac-arm64, mac-x64,
android) are placed into packages from the vernette/warpscout release via
a single pin, `deps.json:warpscout.version`. Second — per the issue #1
proposal — the app now tells you when a new warpscout is out: once per
session it reads the latest vernette/warpscout release through the GitHub
API and, if it is newer than the bundled core, shows a "⬆ warpscout {v} —
update available" row in the sidebar status line. Data formats are
unchanged: reports, configs, account and history remain fully compatible
with 2.7.2.

## Что изменилось / What changed

- **Ядро warpscout 0.17.0 во всех пакетах; единый пин deps.json.** Раньше
  десктоп-ядро восстанавливалось из zips ПРОШЛОГО релиза GUI
  (`fetch-binaries.py` → `EXTRACT bin/warpscout`) — каждое ядро
  замораживалось навсегда: 2.7.2 несла 0.16.0 при полной поддержке 0.17.0
  в коде. Теперь ядро ВСЕХ платформ (win64, linux64, linux-arm64,
  mac-arm64, mac-x64, android) скачивается напрямую из релиза
  vernette/warpscout по пину `deps.json:warpscout.version` — единая точка
  обновления: бамп пина = новое ядро в следующем релизе. SHA-256 каждого
  ядра пинится в deps.json и сверяется всюду, где это имеет смысл:
  `fetch-binaries.py` (магия файла + минимальный размер + сверка пина),
  `verify-deps.py` (CI-гейт), `build-apk.sh` (android-запись). Проверено
  на реальном ядре: `warpscout version` → `0.17.0`.

  The warpscout core is 0.17.0 in every package; a single deps.json pin.
  Previously the desktop core was restored from the PREVIOUS GUI release's
  zips (`fetch-binaries.py` → `EXTRACT bin/warpscout`), freezing every
  core forever: 2.7.2 shipped 0.16.0 while the code fully supported
  0.17.0. Now the core for ALL platforms (win64, linux64, linux-arm64,
  mac-arm64, mac-x64, android) is downloaded straight from the
  vernette/warpscout release via the `deps.json:warpscout.version` pin —
  one place to update: bump the pin and the next GUI release carries the
  new core. The SHA-256 of every core is pinned in deps.json and checked
  wherever it matters: `fetch-binaries.py` (file magic + minimum size +
  pin match), `verify-deps.py` (CI gate), `build-apk.sh` (android entry).
  Verified with the real core: `warpscout version` → `0.17.0`.

- **Подсказка о новой версии warpscout на главном экране.** В статус-линии
  сайдбара появляется жёлтая строка «⬆ warpscout {v} — есть обновление»,
  если последний релиз vernette/warpscout свежее версии комплекта. Строка
  кликабельна (и доступна с клавиатуры) — открывает страницу релизов GUI,
  где лежит комплект с новым ядром; tooltip объясняет полный контекст:
  что вышло, что в комплекте и что делать тем, кто держит CLI отдельно
  (свой путь в «Настройках»). Механика: раз за сессию и не чаще раза в
  12 ч (метка в localStorage) приложение читает
  `api.github.com/repos/vernette/warpscout/releases/latest`; подсказка
  появляется только когда релиз СВЕЖЕ комплекта (свой более новый CLI —
  тишина), любая сетевая ошибка или лимит API — молча: подсказка не
  критична для работы. Это единственный внешний хост в CSP приложения —
  `connect-src https://api.github.com` добавлен явно и задокументирован
  (read-only HTTPS, без данных пользователя; скан, регистрацию и SOCKS
  по-прежнему делает только ядро warpscout).

  New-version hint on the home screen. When the latest vernette/warpscout
  release is newer than the bundled core, the sidebar status line shows a
  yellow "⬆ warpscout {v} — update available" row. The row is clickable
  (and keyboard-accessible) — it opens the GUI releases page that carries
  the updated bundle; the tooltip explains the full context: what is out,
  what is bundled and what to do if you keep a standalone CLI (your own
  path in Settings). Mechanics: once per session and at most once per 12
  hours (a localStorage marker), the app reads
  `api.github.com/repos/vernette/warpscout/releases/latest`; the hint
  appears only when the release is NEWER than the bundle (a newer custom
  CLI stays silent), and any network error or API rate limit is silent —
  the hint is never critical. This is the app's single external CSP host:
  `connect-src https://api.github.com` is added explicitly and documented
  (read-only HTTPS, no user data; scanning, registration and SOCKS are
  still done exclusively by the warpscout core).

- **Демо-режим.** Подсказка показывается на условном «релизе» v0.17.1 —
  демо ведёт себя как связка, для которой вышло обновление (все данные
  демо и так условные).

  Demo mode. The hint is shown against a mock v0.17.1 "release" — the
  demo behaves like a setup with an update available (all demo data is
  mocked anyway).

## Изменения по платформам (2.7.3) / Platform changes (2.7.3)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Ядро 0.17.0 + подсказка (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux64)** | Ядро 0.17.0 + подсказка (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux-arm64)** | Ядро 0.17.0 + подсказка (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-arm64)** | Ядро 0.17.0 + подсказка (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-x64)** | Ядро 0.17.0 + подсказка (общие ресурсы) — см. выше; остальное без изменений. |
| **Android (apk)** | Ядро 0.17.0 + подсказка (общие ресурсы) — см. выше; versionCode 20703. |

## Проверки / Verification

- Тесты: 132 → 134, все зелёные (`node --test desktop-app/tests/*.test.js`).
  Новый файл tests/wsupdate.test.js: wsParseTag (теги релизов vernette
  v0.17.0/v0.17; мусор/пустота/пробелы = ""), wsUpdFor (подсказка только
  на более свежий релиз; «комплект новее», равные версии, мусор —
  тишина).
- check-i18n: OK (ключи upd.01/upd.02 — RU/EN; перерендер при смене
  языка).
- gen-version --check: OK 2.7.3; verify-deps: OK (13/13, пины ядер
  0.17.0).
- Реальное ядро из vernette-релиза запущено на хосте сборки:
  `pkg/WARPScoutGUI-linux64/bin/warpscout version` → `0.17.0`.
