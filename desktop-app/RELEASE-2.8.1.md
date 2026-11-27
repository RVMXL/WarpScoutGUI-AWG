# WarpScoutGUI 2.8.1 — скролл без скролла, флаги скорости наверху, звезда без потерь (prerelease)

WarpScoutGUI 2.8.1 — три точечных исправления по итогам проверки пререлиза 2.8.0
(отчёт пользователя): вкладки «Скан» и «Конфиг» больше не имеют двойного скролла
(страница + колонка настроек), тумблеры «Замер скорости» и «Лучший по скорости»
подняты из «продвинутых» в основную группу флагов рядом с `-P`, и звезда
«лучшего» больше не достаётся эндпоинтам с потерями — потери важнее меньшего
пинга. **Выпуск опубликован как PRERELEASE** — после проверки переводится в
полноценный релиз (prerelease=false, make_latest=true). Форматы данных не
менялись: отчёты, конфиги, аккаунт, история, бэкапы — полная совместимость с
2.8.0/2.7.3.

WarpScoutGUI 2.8.1 — three focused fixes from the 2.8.0 pre-release review
(user report): the Scan and Config tabs no longer have double scrolling (page
+ settings column), the "Speed test" and "Best by speed" toggles move out of
"advanced" into the main flag group next to `-P`, and the "best" star no
longer goes to endpoints with packet loss — losses matter more than a lower
ping. **This release is published as a PRERELEASE** — after review it is
promoted to a full release (prerelease=false, make_latest=true). Data formats
are unchanged: reports, configs, account, history and backups remain fully
compatible with 2.8.0/2.7.3.

## Что изменилось / What changed

- **Вкладки «Скан» и «Конфиг» без скролла страницы (десктоп).** Раньше у этих
  вкладок было два независимых скролла: сама страница (`.main`) и колонка
  параметров. Прокрутка страницы уводила настройки за верхний край — колонка
  «пряталась», оставаясь видимой хвостом у нижней части экрана (скриншот из
  отчёта), а правая колонка (таблица результатов / предпросмотр+экспорт)
  тянула высоту документа за собой. Теперь в двухколоночном десктоп-виде
  страница не скроллится вовсе: сетка строкой `minmax(0, 1fr)` прижимает ОБЕ
  колонки к высоте вьюпорта, каждая скроллится только внутри себя — слева
  параметры, справа командная строка и таблица (пл. предпросмотр и экспорт —
  целиком на одном экране, без погони за кнопками). Таблица результатов и
  лог занимают ровно оставшееся место (flex) вместо прежних эвристик
  `max-height: calc(100vh - …)` — на низких окнах таблица честно сжимается и
  скроллится внутри. Порог 1081px — над существующим переходом в
  одноколоночный вид (≤1080px); мобильная вёрстка и touch-режим (Android,
  демо `?touch=1`) не затронуты — там по-прежнему скроллится страница.

  The Scan and Config tabs no longer scroll as a page (desktop). Both tabs
  used to have two independent scroll areas: the page itself (.main) and the
  settings column. Scrolling the page pushed the settings out of view (the
  column "hid", leaving only its tail near the bottom of the screen — see the
  report screenshot), while the right column (results table / preview+export)
  dragged the document height along. Now the two-column desktop view never
  scrolls as a page: a `minmax(0, 1fr)` grid row pins BOTH columns to the
  viewport height and each scrolls only inside itself — settings on the
  left, the command line and results table on the right (the preview and
  export sit fully on one screen). The results table and log take exactly
  the remaining space (flex) instead of the old `max-height: calc(100vh - …)`
  heuristics — on short windows the table shrinks and scrolls internally.
  The 1081px threshold sits right above the existing single-column
  breakpoint (≤1080px); the mobile layout and touch mode (Android, demo
  `?touch=1`) are unaffected — the page still scrolls there.

- **«Замер скорости» и «Лучший по скорости» — в основную группу флагов.**
  Тумблеры `-speed` и `-best-by speed` переехали из details-карточки
  «WARP-in-WARP и продвинутое» (самый низ формы) в карточку «Проверка и
  выборка» — рядом с `-P` и `-f`, без вскрытия «опционально». Добавлены
  короткие подсказки: что `-speed` даёт колонку SPEED и удлиняет скан, и что
  `-best-by speed` ведёт звезду/автоподстановку по максимальному SPEED и сам
  включает замер. Состояние, пресеты, билдер команды и гейты — без изменений:
  это чистое перемещение в DOM плюс две новых подсказки словаря (RU/EN).

  Speed flags move to the main flag group. The -speed and -best-by speed
  toggles move from the "WARP-in-WARP & advanced" details card (the bottom
  of the form) into the "Check & sampling" card — next to -P and -f, without
  expanding the "optional" section. Short hints are added: -speed adds the
  SPEED column and makes the scan longer; -best-by speed drives the star and
  the config pick by maximum SPEED and enables the measurement itself.
  State, presets, the command builder and the version gates are unchanged —
  a pure DOM move plus two new dictionary hints (RU/EN).

- **Звезда «лучшего»: сначала потери, потом пинг.** Сравнение качества
  строки — лексикографичное (LOSS, PING) — ровно как сортирует сам warpscout
  в отчёте: эндпоинт без потерь всегда впереди lossy с меньшим пингом (0%
  потерь важнее десятков мс — потери рвут передачу, разница пинга на
  практике незаметна), среди lossy меньше потерь лучше, при равных —
  меньший пинг. Нет колонки LOSS (скан без `-P`, старые отчёты) — сравнение
  вырождается в прежнее «минимальный пинг». Порядок применён во всех местах
  выбора лучшего: звезда в таблице, группировка селекта конфига (лучший
  каждой ноды и общий лучший), автоподстановка в конфиг после скана, кнопка
  «★ Лучший» в SOCKS, звезда в автономном HTML-отчёте («Поделиться
  сканом»). «Лучший по скорости» (`-best-by speed`) тоже учитывает потери:
  максимум SPEED ищется сначала среди строк без потерь, фолбэк — среди
  lossy (раньше «звезда» и «лучший по скорости» могли указывать на строку с
  потерями). Чип статистики «⚡ лучший» переименован в «⚡ мин. пинг» —
  это по-прежнему минимум TUN PING по выборке (теперь не читается как
  «позиция звезды»).

  Best star: losses first, ping second. Row quality is compared
  lexicographically (LOSS, PING) — exactly how warpscout sorts its own
  report: an endpoint without loss always beats a lossy one with a lower
  ping (0% loss matters more than tens of milliseconds — loss breaks the
  transfer while ping differences are barely noticeable), among lossy rows
  lower loss wins, ties go to the lower ping. Without a LOSS column (scan
  without -P, older reports) the comparison degenerates to the previous
  "lowest ping". The order is applied everywhere a best is picked: the star
  in the results table, the config select grouping (per-node bests and the
  overall best), the post-scan config pick, the SOCKS "★ Best" button and
  the star in the standalone HTML report ("Share scan"). "Best by speed"
  (-best-by speed) honors losses too: maximum SPEED is searched among
  loss-free rows first, with a fallback to lossy ones (previously both the
  star and "best by speed" could point at a lossy row). The "⚡ best"
  statistics chip is renamed to "⚡ min ping" — it remains the minimum TUN
  PING of the sample (it no longer reads as "where the star is").

- **Демо.** Пересобрано из ресурсов (sync-demo 28a2); поведенческих
  сценариев не добавлялось.

  Demo. Rebuilt from resources (sync-demo 28a2); no new demo scenarios.

## Изменения по платформам (2.8.1) / Platform changes (2.8.1)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Все пункты выше (общие ресурсы). |
| **Linux (linux64)** | Все пункты выше (общие ресурсы). |
| **Linux (linux-arm64)** | Все пункты выше (общие ресурсы). |
| **macOS (mac-arm64)** | Все пункты выше (общие ресурсы). |
| **macOS (mac-x64)** | Все пункты выше (общие ресурсы). |
| **Android (apk)** | Пункты 2–3 (флаги скорости, звезда); пункт 1 не применяется — на Android вёрстка одноколоночная, скролл страницы штатный; versionCode 20801. |

## Проверки / Verification

- Тесты: 148 → 152, все зелёные (`node --test desktop-app/tests/*.test.js`).
  Новые кейсы: endpointGroups — без потерь впереди lossy с меньшим пингом
  (лучший ноды и общий), «остальные» по (потери, пинг); betterEpRow/rowLossVal —
  порядок (потери, пинг), пустой/мусорный LOSS → 0; bestBySpeedOf — максимум
  SPEED среди без потерь, фолбэк на lossy, прежняя семантика без колонки LOSS;
  pickRunBest — без потерь важнее меньшего пинга.
- check-i18n: OK (новые ключи scan.check.10/11 — RU/EN; stats.04 переименован).
- gen-version --check: OK 2.8.1; verify-deps: OK (пины ядер 0.17.0).
- Вёрстка проверена в браузере на демо-копии (1440×900, 1100×700, 800×900):
  на «Скан»/«Конфиг» страница не скроллится, обе колонки скроллятся внутри,
  предпросмотр и экспорт видимы целиком; ≤1080px поведение прежнее.

## Статус пререлиза

Этот выпуск помечен как pre-release намеренно: сначала ручная проверка
функций на реальной машине, затем перевод в полноценный релиз (GitHub UI
«Set as latest» или API). Пользователи на 2.7.3 банер «⬆ WarpScoutGUI 2.8.1»
увидят только ПОСЛЕ перевода — эндпоинт releases/latest пререлизы не
возвращает.
