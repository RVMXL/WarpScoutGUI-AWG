# WarpScoutGUI 2.6.7 — fix: raw-I1 из «Поиска параметров» больше не обрывается на «"<b»

WarpScoutGUI 2.6.7 — точечный фикс по отчёту пользователя: конкретный I1,
найденный find-junk, при нажатии «Применить найденное» попадал в конфиг
обрывком `"<b` — остальная часть значения (пакет ~2.6 КБ) пропадала. Ядро
warpscout — по-прежнему 0.16.0 (SHA-пины `deps.json` сходятся). Форматы данных
не менялись: отчёты, конфиги, аккаунт, история — полная совместимость с 2.6.x.

WarpScoutGUI 2.6.7 is a targeted fix based on a user report: a concrete I1
found by find-junk was inserted into the config as a `"<b` fragment — the rest
of the value (a ~2.6 KB packet) was lost. The warpscout core is still 0.16.0
(`deps.json` SHA pins match). Data formats are unchanged: reports, configs,
account and history remain fully compatible with 2.6.x.

## Что изменилось / What changed

- **Raw-I1 доезжает до конфига целиком.** Причин было четыре: команда резалась
  лимитом 1000 символов до разбора (команда с raw-I1 — ~2.6 КБ); флаги
  разбирались `split(/\s+/)`, а CLI печатает значение в кавычках с пробелом
  внутри (`-i1 "<b 0xce…>"`) — в флаг попадал только первый токен `"<b`;
  значение резалось лимитом 600 (эталон — 2506 символов); buildConf и
  applyFoundCmd безусловно вычищали пробелы, хотя пробел после `<b` в raw-форме
  значим. Теперь: кавычко-осведомлённая токенизация, лимиты 8000/6000,
  shell-кавычки снимаются (как при импорте .conf), raw-форма `<b …>` хранится
  и выводится как есть; base64-значения чистятся от пробелов как раньше.
  Попутно починен давний дефект дефолта: эталонный EXAMPLE_I1 больше не теряет
  пробел после `<b` в предпросмотре/экспорте. Найденная команда переживает
  перезапуск приложения (лимит восстановления 500→8000).

  The raw I1 now reaches the config intact. There were four stacked causes:
  the found command was truncated to 1000 chars before parsing (a command with
  a raw I1 is ~2.6 KB); flags were parsed with `split(/\s+/)` while the CLI
  prints the value quoted with a space inside (`-i1 "<b 0xce…>"`) — so only
  the `"<b` token reached the flag handler; the value itself was capped at 600
  chars (the reference packet is 2506); buildConf and applyFoundCmd stripped
  all whitespace although the space after `<b` is significant. Now: quote-aware
  tokenization, 8000/6000 limits, shell quotes are removed (same as .conf
  import), the raw `<b …>` form is stored and rendered as is; base64 values
  are still whitespace-stripped. Also fixed a long-standing default flaw: the
  reference EXAMPLE_I1 no longer loses the space after `<b` in the
  preview/export. The found command survives an app restart (restore cap
  500→8000).

## Изменения по платформам (2.6.7) / Platform changes (2.6.7)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Фикс вставки I1 (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux64)** | Фикс вставки I1 (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux-arm64)** | Фикс вставки I1 (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-arm64)** | Фикс вставки I1 (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-x64)** | Фикс вставки I1 (общие ресурсы) — см. выше; остальное без изменений. |
| **Android (android-arm64)** | versionCode 20607; тот же фикс вставки I1 («Поиск параметров» → «Применить найденное» → конфиг). |

## Обновление / Upgrade

Установка поверх 2.6.6 — распаковать ZIP целиком в ту же папку (заменить
файлы). Папка данных не переезжает. На Android — установить APK поверх
старой версии: пакет и ключ подписи фиксированы, данные сохранятся.

To upgrade from 2.6.6 — unpack the ZIP over the same folder (replace files).
On Android, install the APK over the existing version: package name and
signing key are fixed, data is preserved.

## Артефакты / Artifacts

SHA-256 всех файлов дописывается в это описание автоматически при сборке
релиза (шаг CI «заметки релиза»).

The SHA-256 table for all files is appended to this description automatically
by CI at build time.
