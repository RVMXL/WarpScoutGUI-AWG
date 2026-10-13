# WarpScoutGUI 2.6.2 — харденинг по аудиту v2.6.1 + i18n на идентификаторах (prerelease)

WarpScoutGUI 2.6.2 закрывает волны P2/P3 полного аудита v2.6.1 (79 находок,
0 критических) и последнюю находку прежнего аудита — **QUAL-1**: словарь i18n
переведён с канонического RU-текста на ключи-идентификаторы `I18N {id:{ru,en}}`.
Переформулировка одного языка больше не ломает другой; 49 прежде «молча
непереводимых» мест (шаблоны `{err}/{path}` в тостах, статические тексты и
a11y-атрибуты index.html, touch-состояния) получили EN-переводы.

WarpScoutGUI 2.6.2 closes waves P2/P3 of the full v2.6.1 audit (79 findings,
0 critical) and the last finding of the previous audit — **QUAL-1**: the i18n
dictionary now uses stable identifier keys (`I18N {id:{ru,en}}`) instead of
canonical RU strings. Rewording one language no longer breaks the other; 49
previously silently-untranslated places (toast templates `{err}/{path}`,
static index.html texts and a11y attributes, touch states) gained English.

**Статус выпуска: ПРЕРЕЛИЗ 2.6.2.** Ядро warpscout не менялось (0.16.0 во всех
пакетах). Функциональность сканирования и генерации конфигов не менялась;
изменения — безопасность командной границы, консистентность состояния,
права аккаунта и инженерная база.

**Release status: PRERELEASE 2.6.2.** The warpscout core is unchanged
(0.16.0 in every package). Scanning and config generation behaviour is
unchanged; changes are command-boundary hardening, state consistency,
account file permissions and engineering infrastructure.

## Политика выпуска / Release policy

Каждый релиз содержит ВСЕ платформы под единой версией. Чейнжлог построчно
указывает, что изменено на каждой платформе, а где изменений нет.

Every release ships ALL platforms under a single version. The changelog states
per platform what changed and what did not.

## Изменения по платформам (2.6.2) / Platform changes (2.6.2)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Безопасность: все пути в warpscout идут через единую точку `argPath()` (кавычки cmd), restoreState валидирует theme/lang, импорт пресетов санитизируется (2 МБ до парсинга), файл аккаунта 0600 + ротация бэкапов, удаление аккаунта уносит отчёты, автомиррор аккаунта в Download убран; i18n-реворк (идентификаторы, 49 новых EN-переводов); фикс затирания реального кода выхода synthetic-exit; computePaths не затирает пользовательский wsPath. |
| **Linux (linux64)** | Как win64 (пути — с семантикой sh). |
| **Linux (linux-arm64)** | Как win64. |
| **macOS (mac-arm64)** | Как win64. |
| **macOS (mac-x64)** | Как win64. |
| **Android (android-arm64)** | Как win64, плюс мост: `content://` проходит `uriAllowed`-гейт, имена санитизируются при записи в публичные корни, ядро сборки сверяется по SHA-256 с пином deps.json, KSPASS — через окружение; versionCode 20602; разрешение — по-прежнему только `INTERNET`. |

Windows / Linux / macOS / Android: command-boundary hardening, state
consistency, account permissions, i18n rework; Android additionally gates
`content://` URIs and sanitizes public-root writes.

## Безопасность / Security

- **Командная граница (FE-1/FE-23)**: 6 точек передачи путей в warpscout
  заменены на единую `argPath()`; для POSIX/Android — кавычки с семантикой
  sh (PowerShell-семантика `psQuote` теряла кавычку в sh-токенизаторе —
  поймано round-trip-тестом «злого» пути на 3 платформах).
- **Аккаунт (SEC-A1/FE-22/FE-25/SEC-A4)**: права файла аккаунта 0600 после
  каждой записи/регистрации, ротация бэкапов (N=3); удаление аккаунта
  уносит и отчёты (копия → проверка → удаление источника); автомиррор файла
  аккаунта в общий `Download` убран — наружу выгружаются только отчёты и
  конфиги; альтернативный CWD-кандидат — только после явного подтверждения.
- **Android (AND-1/AND-4)**: `content://` URI во VIEW — только выданные
  собственными диалогами; запись в публичные корни санитизирует имя файла.

## Состояние и импорт / State and import

- `restoreState` (FE-20): theme/lang валидируются по перечислению, патч —
  только из валидных полей (битое состояние не рвёт цепочку инициализации).
- Импорт пресетов (FE-4): `sanitizePresets`/`sanitizeScan` (типы, лимиты,
  прототипная загрязнённость), лимит 2 МБ до парсинга.
- `computePaths` (FE-21): пользовательский `wsPath` больше не затирается —
  конфликт путей решается явным тостом (корень регресса 2.3.0 устранён
  конструктивно, а не точечной заплаткой).
- Мост событий (FE-3): synthetic exit — только после двух тиков подряд,
  синтетика не затирает реальный код выхода процесса.

## i18n (QUAL-1) / i18n (QUAL-1)

- Словарь: `I18N = { id: { ru, en } }` — ~695 записей; ID вида `<секция>.<nn>`;
  `t(id)`/`tF(id, vars)`; ~400 вызовов мигрировано в 15 модулях.
- Статический DOM: walker резолвит текст в id через REV-таблицу; осознанно
  непереводимое помечено `data-i18n="off"`.
- CI: `tools/check-i18n.py` — обязательность ru+en для каждого id, покрытие
  всех вызовов (включая тернарники), статических текстов/атрибутов index.html
  и платформенных связок LINUX_TEXT/MAC_TEXT.

## Инженерная база / Engineering infrastructure

- Цепочка поставки: `verify-deps.py` (exit 1 при «0 проверено»),
  `fetch-binaries.py` (`curl -f`, `Accept: application/octet-stream`,
  проверки магии/размера, android-ядро в deps.json), `build-zips.py`
  (сверка версии с единым источником, футер README.txt из него же).
- Релизный конвейер: pre-flight fail-fast в `scripts/release.sh` (INFRA-G),
  CI-гейт на коммите тега (INFRA-H), workflow `release.yml` на тег `v*`
  (полные проверки, детерминизм `resources.neu` двойной сборкой, сборка
  release-zip тем же конвейером), секреты в mktemp-каталоге 0700 с
  trap-очисткой (INFRA-K/SEC-A5).
- Версионирование: единая формула versionCode `major*10000+minor*100+patch`
  с таблицей-тестом (INFRA-F); для 2.6.2 — 20602.
- Тесты: 50 → 70 (round-trip путей, restoreState, migrateData, computePaths,
  права аккаунта, структура пакета).

## Артефакты / Artifacts

| Файл | SHA-256 |
|---|---|
| WARPScoutGUI-2.6.2-win64.zip | `3c2ad3ddcc00e4631b2d72292473b791037f5d9350c0689ebc4f0b94aedb7f53` |
| WARPScoutGUI-2.6.2-linux64.zip | `e0095f718793a7863068db39852abbed447bf018796d99c758017ad754258f37` |
| WARPScoutGUI-2.6.2-linux-arm64.zip | `81f0855ddd49f63236e79b2ebfd2ddbcb83ef2a62436ba8df8a168128f2dfd95` |
| WARPScoutGUI-2.6.2-mac-arm64.zip | `38a14673f98c7c4960b875e68606b508828ef3991c4c924721cb048992698dd2` |
| WARPScoutGUI-2.6.2-mac-x64.zip | `d104c3287b1ef7194fca196c5a6b23252a1ec338f6c29b39ce931589199dfbc8` |
| WARPScoutGUI-2.6.2-android-arm64.apk | `f93f198207fa65bcba17ee69b99135c2d192999bcd7b76cb8320e60e8960578c` |

Все zip содержат: README.txt, бинарь GUI, resources.neu, bin/warpscout,
licenses/ (4 лицензии). APK подписан тем же сертификатом, что и 2.5.0–2.6.1 —
обновление поверх установленных версий работает.

Every zip contains README.txt, the GUI runtime, resources.neu, the warpscout
binary and licenses/. The APK is signed with the same certificate as
2.5.0–2.6.1, so in-place updates keep working.

## Верификация / Verification

- Все платформы: детерминированный конвейер (pack-neu двойной сборкой —
  побайтово совпадает; build-zips — формат 2.4.6, таймстампы 1980-01-01);
  бинарники GUI и warpscout восстановлены из релиза v2.6.1 и сверены с
  `tools/deps.json` (13 проверено, 0 отсутствует).
- Проверки: 70/70 юнит-тестов, `check-i18n.py` OK (186 текстов + 63 атрибута
  статики, misses 0), `gen-version --check` OK, `node --check` ×17,
  `py_compile`/`bash -n` OK; CI на main — зелёный.
- Браузерный прогон демо (мок-рантайм): RU/EN переключение, импорт пресетов
  (санитизация), computePaths-конфликт — 0 ошибок консоли.
- Android: сборка/подпись тем же конвейером (aapt2+d8+apksigner, build-tools
  34); apksigner verify OK, сертификат — мастер-ключ 2.5.0–2.6.1
  (SHA-256 67969ff2…ac9841 — обновление поверх работает); ядро warpscout
  сверено с пином deps.json (AND-2); smoke на реальном устройстве — за
  пользователем (пререлиз).
- Живого прогона Windows/macOS в среде сборки нет — см. СТАТУС ВЕРИФИКАЦИИ
  внутри пакетов.

См. также `SECURITY.md` (политика уязвимостей) и `CHANGELOG.md` (история версий).
