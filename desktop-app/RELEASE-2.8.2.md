# WarpScoutGUI 2.8.2 — свои флаги CLI, AWG 3.1 на «Скан», дефолт QUIC (prerelease)

WarpScoutGUI 2.8.2 — четыре пункта по итогам проверки пререлизов 2.8.0/2.8.1
(запросы пользователя): ручной ввод флагов warpscout в консоль-стиле («вариант 1»),
удаление пресета «Тщательный» (дубль тумблера `-f`), управление AWG 3.1 прямо на
вкладке «Скан» (вкл/выкл и тайминги) и дефолт профиля I1 — QUIC вместо iCloud,
как в других warpscout GUI. Бонусом — починка мультизначных фильтров
(`-exclude-node DME,FRA`, `-target ip,cidr`), которые раньше склеивались в мусорный
токен. **Выпуск опубликован как PRERELEASE** — после проверки переводится в
полноценный релиз (prerelease=false, make_latest=true). Форматы данных не менялись:
отчёты, конфиги, аккаунт, история, бэкапы — полная совместимость с 2.8.1/2.8.0/2.7.3.

WarpScoutGUI 2.8.2 — four items from the 2.8.0/2.8.1 pre-release review (user
requests): manual warpscout flag entry in console style ("option 1"), removal of
the "Thorough" preset (a duplicate of the `-f` toggle), AWG 3.1 control right on
the Scan tab (on/off and the timings), and the default I1 profile switched to
QUIC (instead of iCloud) — like the other warpscout GUIs. Bonus: multi-value
filters (`-exclude-node DME,FRA`, `-target ip,cidr`) no longer collapse into a
garbage token. **This release is published as a PRERELEASE** — after review it is
promoted to a full release (prerelease=false, make_latest=true). Data formats are
unchanged: reports, configs, account, history and backups remain fully compatible
with 2.8.1/2.8.0/2.7.3.

## Что изменилось / What changed

- **«Свои флаги CLI» (вариант 1).** Новая карточка на вкладке «Скан»: поле
  свободного ввода флагов warpscout в консоль-стиле — для всего, чего нет в
  форме (`-sweep-ports 2408,500`, `-mtu 1280`, `-dns 1.1.1.1`, `-table-off`,
  `-emoji`, `-conf out.conf -conf-type mihomo`, `-I`/`-interface`, `-best`,
  `-no-dns`). Валидация по белому списку на границе команды (`parseExtraArgs`):
  неизвестный флаг, позиционный мусор без дефиса, битое значение — явная ошибка
  с указанием токена (красная строка под полем + тост при запуске); дубли флагов,
  которые GUI расставляет сам (`-p`, `-P`, `-gen-i1`, тайминги 3.1, `-jc/-jmin/-jmax`,
  `-speed`, `-o/-a/-json/-stream-json/-plain/-no-report`), не проходят с объяснением.
  Значение value-флага-дубля съедается — «`-p awg`» даёт одну ошибку, без ложного
  «awg — не флаг». При ошибках запуск отвергается ЦЕЛИКОМ: раньше половина
  аргументов отваливалась бы молча. Санитизация: одна строка (переводы строк/табы →
  пробелы), контрольные символы вырезаны, лимит 500. Белые списки — map'ы без
  прототипа: свободный ввод вида «`-constructor`» не протаскивается через
  Object.prototype.

  Custom CLI flags (option 1). A new card on the Scan tab: a free-form input for
  warpscout flags in console style — for everything the form does not cover
  (-sweep-ports, -mtu, -dns, -table-off, -emoji, -conf/-conf-type, -I/-interface,
  -best, -no-dns). Whitelist validation at the command boundary (parseExtraArgs):
  unknown flags, positional junk, broken values produce an explicit error naming
  the token (red line under the field + a toast on run); duplicates of flags the
  form adds itself are rejected with an explanation. The value of a duplicated
  value-flag is consumed ("-p awg" yields a single error). With any error the run
  is rejected entirely. Sanitization: single line, control characters stripped,
  500-char limit. Whitelist maps are prototype-free.

- **Пресет «Тщательный» удалён.** Он дублировал тумблер «Все 256 адресов подсети
  `-f`» (полный скан включается тем же тумблером, «Замер скорости» — рядом):
  два пути к одному и тому же только путали. Остальные пресеты (⭐ По умолчанию /
  ⚡ Быстрый / 🚫 Без обфускации / 🧱 Жёсткая сеть) и свои пресеты — без изменений.

  The "Thorough" preset is removed. It duplicated the "all 256 subnet addresses
  -f" toggle (a full scan is one toggle away, the speed test sits next to it);
  two paths to the same thing only confused. The other presets and custom
  presets are unchanged.

- **AWG 3.1 — вкл/выкл и тайминги прямо на «Скан».** В карточке «Обфускация
  AmneziaWG» появился тумблер «Тайминги AWG 3.1 (`-p awg31`)» и раскрывающийся
  блок таймингов (ContentPaddingAddition, RekeyAfterTime, RekeyTimeout,
  RejectAfterTime, KeepaliveTimeout, MaxHandshakeAttempts, RandomTrailers,
  DisableCookies). Значения — ТЕ ЖЕ общие источники, что и раньше: тумблер =
  «Конфиг → Версия» (выключение возвращает и скан, и конфиг к AWG 2.0), тайминги =
  S.cfg.obf — правка синхронно меняет обе вкладки и предпросмотр (как junk-поля
  в 2.7.0). Все чтения формы делаются ДО любых записей-зеркал — «война зеркал»
  внутри одного sync исключена; смена версии на «Конфиге» (в том числе импорт
  .conf/бэкапа) мгновенно гасит/включает тумблер на «Скан».

  AWG 3.1 on/off and timings right on the Scan tab. The "AmneziaWG obfuscation"
  card gains a "AWG 3.1 timings (-p awg31)" toggle and an expandable timings
  block. The values are the SAME shared sources as before: the toggle equals
  Config → Version (turning it off brings the scan and the config back to AWG
  2.0), the timings live in the shared obfuscation state — editing either tab
  updates both and the preview (like the junk fields in 2.7.0). All form reads
  happen BEFORE any mirror writes — no mirror war inside one sync; changing the
  version on the Config tab (including .conf/backup import) instantly toggles
  the Scan-tab switch.

- **Дефолт профиля I1 — QUIC.** Как в других warpscout GUI — неспроста:
  QUIC-маскировка первого пакета чаще проходит. «iCloud (базовый)» остался опцией
  сегмента. Одноразовая миграция для старых установок: сохранённое genI1:""
  поднимается до quic РОВНО ОДИН РАЗ (флаг settings.i1QuicMigrated) — сделанный
  позже явный выбор (в том числе icloud) не трогается; старые бэкапы/пресеты без
  поля получают новый дефолт, явное «""» сохраняется. Демо-сценарий автоподбора
  I1 адаптирован (пустой первый скан теперь именно с профилем quic).

  Default I1 profile is QUIC. Like the other warpscout GUIs — for a reason: the
  QUIC disguise of the first packet works more often. "iCloud (basic)" remains a
  segment option. A one-time migration for existing installs: a stored genI1:""
  is raised to quic EXACTLY ONCE (settings.i1QuicMigrated flag) — a later explicit
  choice (including icloud) is preserved; old backups/presets without the field
  get the new default, an explicit "" stays. The auto-I1 demo scenario is adapted.

- **Фикс мультизначных фильтров (запятые).** CLI сплитит `-exclude-node`/
  `-exclude-country`/`-target` по запятой (splitList в flags.go ядра), а наш
  safeVal вырезал запятые из значений — «DME,FRA» и «ip,cidr» склеивались в
  мусорный один токен, хотя плейсхолдеры форм прямо предлагали этот формат.
  Теперь запятая в значениях сохраняется: спавн на Windows идёт через
  CreateProcess (разбор CommandLineToArgvW — запятая аргументы не разделяет);
  на POSIX спавн через `/bin/sh -c`, поэтому `$`, `\`, `#` теперь вырезаются
  всегда (подстановка переменных, экранирование, комментарий в хвосте).

  Multi-value filters fixed (commas). The CLI splits -exclude-node/-exclude-country/
  -target on commas (splitList in the core flags.go), while the GUI's safeVal
  stripped commas — "DME,FRA" and "ip,cidr" collapsed into a garbage token even
  though the form placeholders suggested exactly that format. Commas are preserved
  now: on Windows the spawn goes through CreateProcess (CommandLineToArgvW parsing,
  commas do not split argv); on POSIX the spawn goes through /bin/sh -c, so `$`,
  `\` and `#` are always stripped (variable substitution, escaping, tail comments).

- **Демо.** Пересобрано из ресурсов (sync-demo 28a3); поведенческих сценариев
  не добавлялось — адаптирован только сценарий автоподбора I1 под новый дефолт.

  Demo. Rebuilt from resources (sync-demo 28a3); no new behavioral scenarios —
  only the auto-I1 scenario adapted to the new default.

## Изменения по платформам (2.8.2) / Platform changes (2.8.2)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Все пункты выше (общие ресурсы). |
| **Linux (linux64)** | Все пункты выше (общие ресурсы); фикс запятых актуален вдвойне — спавн через /bin/sh. |
| **Linux (linux-arm64)** | Все пункты выше (общие ресурсы); фикс запятых актуален вдвойне — спавн через /bin/sh. |
| **macOS (mac-arm64)** | Все пункты выше (общие ресурсы); фикс запятых актуален вдвойне — спавн через /bin/sh. |
| **macOS (mac-x64)** | Все пункты выше (общие ресурсы); фикс запятых актуален вдвойне — спавн через /bin/sh. |
| **Android (apk)** | Все пункты выше (общие ресурсы; мост-токенизатор POSIX-совместим — запятая безопасна); versionCode 20802. |

## Проверки / Verification

- Тесты: 152 → 167, все зелёные (`node --test desktop-app/tests/*.test.js`).
  Новые кейсы: parseExtraArgs — белый список (value+bool, `-conf -`, `-I`/`--flag`),
  дубли GUI-флагов с arity (значение дубля съедается), флаги вывода/отчёта,
  неизвестные/позиционные/битые значения, prototype-ключи; buildScanArgs — свои
  флаги в конце до `-plain`; runScan — отказ при невалидных своих флагах до старта;
  sanitizeScan — extraArgs (переводы строк → пробелы, лимит 500) и дефолт genI1
  (отсутствует → quic, явное "" → сохранено); restoreState — одноразовая миграция
  quic (флаг settings.i1QuicMigrated, явный icloud после миграции не трогается);
  safeVal — запятые сохраняются, `$ \ #` вырезаются; тумблер fUse31 ↔ cfg.ver в
  обе стороны, смена версии на «Конфиге» гасит тумблер на «Скан» (война зеркал
  исключена); тайминги 3.1 синхронны Скан↔Конфиг (обе стороны, значения в команде).
- check-i18n: OK (новые ключи scan.obf.11–15, scan.extra.* — RU/EN; presets.06/15
  удалены вместе с пресетом).
- gen-version --check: OK 2.8.2; verify-deps: OK (пины ядер 0.17.0).

## Статус пререлиза

Этот выпуск помечен как pre-release намеренно: сначала ручная проверка функций
на реальной машине, затем перевод в полноценный релиз (GitHub UI «Set as latest»
или API). Пользователи на 2.7.3 банер «⬆ WarpScoutGUI 2.8.2» увидят только ПОСЛЕ
перевода — эндпоинт releases/latest пререлизы не возвращает.
