# WarpScoutGUI 2.6.4 — три UX-улучшения по отзывам (prerelease)

WarpScoutGUI 2.6.4 — релиз удобства: три улучшения интерфейса по конкретным
запросам пользователя. Ядро warpscout не менялось (0.16.0 во всех пакетах,
байт-в-байт те же файлы, что в 2.6.1–2.6.3 — SHA-256 пины `deps.json` сходятся),
логика сканирования и генерации конфигов не менялась — меняется только то,
как результаты показываются и подставляются.

WarpScoutGUI 2.6.4 is a usability release: three UI improvements based on
specific user feedback. The warpscout core is unchanged (0.16.0 in every
package, byte-identical files to 2.6.1–2.6.3 — `deps.json` SHA-256 pins match);
scanning and config generation behaviour is unchanged — only how results are
displayed and pre-filled.

## Что изменилось / What changed

- **Живой индикатор фильтров узлов (вкладка «Скан»).** Раньше в шапке карточки
  «Фильтры узлов» висела статичная надпись «DME исключён» — она показывалась
  всегда, даже когда DME убирали из исключений. Теперь на её месте бейдж,
  отражающий АКТИВНЫЕ фильтры в реальном времени: `✗ DME` — исключённые узлы,
  `✓ HEL` — «только узлы», страны — с пометкой `(страны)`; активных фильтров
  нет — бейдж скрыт. Обновляется на любое изменение полей (ввод, пресеты,
  «Применить найденное», смена языка); длинный список — с многоточием,
  полный — в подсказке.

  Live node-filter badge (Scan tab). The old static “DME excluded” caption is
  replaced by a badge that mirrors ACTIVE filters in real time: `✗` — excluded
  nodes/countries, `✓` — “only” nodes/countries, countries marked; hidden when
  no filters are active; updates on any field change, presets, “Apply found”,
  language switch; long lists ellipsize with the full list in the tooltip.

- **Умный выбор эндпоинта (вкладка «Конфиг»).** Раньше выпадающий список был
  плоским и было «неочевидно, что верхний эндпоинт — самый быстрый». Теперь
  список перестроен группами: сверху — **лучший эндпоинт каждой ноды**
  (отсортированы по пингу туннеля; общему лучшему — ★; у каждого рядом —
  пинг для наглядности), ниже — группа «Остальные» со всеми прочими живыми
  строками. Кроме того, **после завершения скана лучший эндпоинт сразу
  подставляется в конфиг** — «В конфиг»/генерация работают с ним без лишних
  кликов; вручную выбрать другой можно в одну операцию.

  Smart endpoint picker (Config tab). The flat dropdown is regrouped: the best
  endpoint of EVERY node at the top (sorted by in-tunnel ping, ★ on the
  absolute best, ping shown next to each), an “Others” group below with all
  remaining rows. After a scan finishes, the best endpoint is auto-filled into
  the config — generation works with it right away; picking another one is a
  single dropdown action.

- **Сквозной I1 из «Поиска параметров» (find-junk → конфиг).** Раньше найденный
  find-junk КОНКРЕТНЫЙ пакет I1 (CLI сохраняет его сырым флагом `-i1`)/gui
  «не представлял» и предупреждал, что raw-I1 задаётся только командой. Теперь
  найденный I1 **подставляется прямо в поле I1 вкладки «Конфиг»** (с тостом)
  — найденное решение применяется одним нажатием «Применить найденное».
  Под полем I1 — честная подсказка: скан с `-gen-i1` генерирует пакет на лету
  и в отчёт не выносит (вытащить его из скана невозможно), конкретный I1 даёт
  именно «Поиск параметров» → find-junk.

  End-to-end I1 from the Param finder (find-junk → config). The concrete I1
  packet found by find-junk (kept by the CLI as a raw `-i1` flag) is no longer
  discarded — it is inserted straight into the I1 field of the Config tab
  (with a toast). An honest hint under the field explains that a `-gen-i1`
  scan generates the packet on the fly and never reports it — the concrete
  packet comes from the Param finder.

- **Тесты.** 75 → 80 юнит-тестов (`tests/endpoints.test.js`): группировка
  «лучшие с каждой ноды» (приоритет tunPing над ping, torn-исключение, узел
  «?», немутация входа), сквозной I1 (сырой `-i1` из find-junk доезжает до
  `cfg.obf.i1`, тост показан).

## Изменения по платформам (2.6.4) / Platform changes (2.6.4)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Три UX-улучшения в `resources.neu` (`renderNodeFilterBadge`, `endpointGroups` + группы селекта + автоподстановка лучшего, сквозной I1); остальное — как 2.6.3. |
| **Linux (linux64)** | Как win64. |
| **Linux (linux-arm64)** | Как win64. |
| **macOS (mac-arm64)** | Как win64. |
| **macOS (mac-x64)** | Как win64. |
| **Android (android-arm64)** | Как win64; разрешение — по-прежнему только `INTERNET`, versionCode 20604. |

Windows / Linux / macOS / Android: the three UX improvements inside
resources.neu; everything else is unchanged from 2.6.3.

## Обновление / Upgrade

Установка поверх 2.6.3 — распаковать ZIP целиком в ту же папку (заменить
файлы). Папка данных не переезжает, настройки/аккаунт/история/пресеты
сохраняются.

To upgrade from 2.6.3 — unpack the ZIP entirely over the same folder (replace
files). The data folder stays put; settings/account/history/presets are kept.

## Артефакты / Artifacts

| Файл | SHA-256 |
|---|---|
| `WARPScoutGUI-2.6.4-win64.zip` | `bec469bb86c384ef44afa7250ff8110fcce66bae9b50aeeb9fb063e0c7593521` |
| `WARPScoutGUI-2.6.4-linux64.zip` | `035694d9274f4be6ea05c9d183492f425d2d91d60afff7f18c785cb87a8714d6` |
| `WARPScoutGUI-2.6.4-linux-arm64.zip` | `5e716d649fdc19162b7c7813b55d9ec40ffb85edfe6c73f0302cfe96e62c3f19` |
| `WARPScoutGUI-2.6.4-mac-arm64.zip` | `be208e585fe6f94e644c4448ee8b984a428f152569d58484bfec7322ecb3c6fc` |
| `WARPScoutGUI-2.6.4-mac-x64.zip` | `70a6054f76cd1d4bb15690b0e3d964adb03de82b17a99906fb400322841b51f8` |
| `WARPScoutGUI-2.6.4-android-arm64.apk` | `10df6a9373fcb3d42db66504b01005d48512e128a88e0696feb507473f01b626` |

**APK (android-arm64):** versionCode 20604, только разрешение `INTERNET`,
ядро `libwarpscout.so` — warpscout 0.16.0 (SHA-пин `deps.json`, AND-2),
подпись — мастер-ключ проекта (серт. SHA-256 `67969ff2…ac9841`, тот же,
что в 2.6.1–2.6.3 — обновление поверх без переустановки); apksigner verify: OK.

**APK (android-arm64):** versionCode 20604, single `INTERNET` permission,
core `libwarpscout.so` — warpscout 0.16.0 (pinned in `deps.json`, AND-2),
signed with the project master key (cert SHA-256 `67969ff2…ac9841`, the same
key as 2.6.1–2.6.3 — updates install over without reinstalling); apksigner
verify: OK.

## Верификация / Verification

- 80/80 юнит-тестов (`node --test desktop-app/tests/*.test.js`), включая 5 новых
  (`tests/endpoints.test.js`: группировка ×4, сквозной I1 ×1).
- `check-i18n.py`: 186 текстов + 62 атрибута, misses 0 (новые ключи
  `scan.filters.07/08`, `tools.17`, `conf.59/60/61` — RU/EN).
- `gen-version.py --check`: 2.6.4 согласована везде (versionCode 20604).
- `verify-deps.py`: 13/13 бинарников соответствуют SHA-пинам `deps.json`.
- Зип: ровно 9 записей, футер README.txt « WARPSCOUT GUI v2.6.4 · warpscout v0.16.0».
- Живая проверка в браузере (демо): бейдж реагирует на очистку/заполнение
  фильтров; после мок-скана лучший эндпоинт подставлен в конфиг, группы
  селекта «Лучшие с каждой ноды» (★, пинг) и «Остальные» на месте; найденный
  `-i1` доезжает до поля I1 с тостом; touch-UI (Pixel 7) — без ошибок консоли.
