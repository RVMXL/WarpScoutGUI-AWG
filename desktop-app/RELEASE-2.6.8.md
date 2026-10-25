# WarpScoutGUI 2.6.8 — fix: конфиги с найденным I1 снова рабочие («unknown tag» исчез)

WarpScoutGUI 2.6.8 — повторный фикс по отчёту пользователя (с продолжением
истории 2.6.7): конфиг с найденным в «Поиске параметров» I1 не поднимался —
демон отвечал `IPC error -22: failed to parse i1: unknown tag <b0xc1…>` /
`unknown tag <r23>`. Ядро warpscout — по-прежнему 0.16.0 (SHA-пины `deps.json`
сходятся). Форматы данных не менялись: отчёты, конфиги, аккаунт, история —
полная совместимость с 2.6.x.

WarpScoutGUI 2.6.8 is a follow-up fix based on a user report (continuing the
2.6.7 story): a config with an I1 found in the Param finder did not come up —
the daemon answered `IPC error -22: failed to parse i1: unknown tag
<b0xc1…>` / `unknown tag <r23>`. The warpscout core is still 0.16.0
(`deps.json` SHA pins match). Data formats are unchanged: reports, configs,
account and history remain fully compatible with 2.6.x.

## Что изменилось / What changed

- **I1/I2–I5 канонизируются к грамматике демона.** Грамматика obf-chain в
  AmneziaWG (`device/obf.go — newObfChain`): значение режется на теги `<…>`,
  содержимое тега — `strings.Fields`, первое поле — ключ (`b/t/r/rc/rd/d/ds/dz`),
  второе — значение. Валидны только формы «с пробелом» — `<b 0x…>`, `<r 23>`;
  компактные `<b0x…>`/`<r23>` демон не понимает: ключом становится вся строка
  `b0xc1…` → «unknown tag». Дыра 2.6.7: raw-форма узнавалась только при одном
  теге `<b …>` на всё значение, а warpscout печатает найденный I1
  мультиблочным (`<b 0x…><r 23><b 0x…><r 16>`) — такое значение шло по ветке
  «не raw» и чистилось от значимых пробелов, в конфиг уезжала компактная форма.
  Теперь raw-цепочка — значение, целиком состоящее из тегов: каждый тег
  канонизируется (пробел после ключа, hex-байты b-тега склеиваются — форму
  `<b 0xc1 0x00 …>` демон молча читал бы как один байт), межтеговые пробелы
  снимаются; неопознанные/битые теги не трогаются; base64 чистится как раньше.
  Нормализация работает на всех путях: «Применить найденное», импорт .conf
  (I1–I5), восстановление состояния при старте — старое сломанное состояние
  самоисправляется при первом же запуске 2.6.8.

  I1/I2–I5 are now canonicalized to the daemon grammar. The AmneziaWG obf-chain
  grammar (`device/obf.go — newObfChain`) splits the value into `<…>` tags, the
  tag content into whitespace fields: first field is the key
  (`b/t/r/rc/rd/d/ds/dz`), second is the value. Only the spaced forms are
  valid — `<b 0x…>`, `<r 23>`; the compact `<b0x…>`/`<r23>` is not understood:
  the whole `b0xc1…` string becomes the key → «unknown tag». The 2.6.7 hole:
  the raw form was only recognized with a single `<b …>` tag per value, while
  warpscout prints a found I1 as a multi-block chain
  (`<b 0x…><r 23><b 0x…><r 16>`) — such a value fell into the "not raw" branch
  and was stripped of significant spaces, producing the compact form in the
  config. Now a raw chain is a value consisting entirely of tags: each tag is
  canonicalized (space after the key, hex bytes of a b-tag joined — the
  `<b 0xc1 0x00 …>` form would be silently read as a single byte), inter-tag
  spaces are removed; unknown/broken tags are left untouched; base64 is
  stripped as before. Normalization applies on every path: Apply found,
  .conf import (I1–I5), state restore at startup — an old broken state
  self-heals on the first launch of 2.6.8.

## Изменения по платформам (2.6.8) / Platform changes (2.6.8)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Фикс канонизации I1–I5 (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux64)** | Фикс канонизации I1–I5 (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux-arm64)** | Фикс канонизации I1–I5 (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-arm64)** | Фикс канонизации I1–I5 (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-x64)** | Фикс канонизации I1–I5 (общие ресурсы) — см. выше; остальное без изменений. |
| **Android (android-arm64)** | versionCode 20608; та же канонизация I1–I5 (конфиг из «Поиска параметров» и импорт .conf). |

## Обновление / Upgrade

Установка поверх 2.6.7 — распаковать ZIP целиком в ту же папку (заменить
файлы). Папка данных не переезжает: сломанное состояние I1 починится само при
первом запуске. На Android — установить APK поверх старой версии: пакет и
ключ подписи фиксированы, данные сохранятся.

To upgrade from 2.6.7 — unpack the ZIP over the same folder (replace files).
The data folder stays: a broken I1 state self-heals on the first launch.
On Android, install the APK over the existing version: package name and
signing key are fixed, data is preserved.

## Артефакты / Artifacts

SHA-256 всех файлов дописывается в это описание автоматически при сборке
релиза (шаг CI «заметки релиза»).

The SHA-256 table for all files is appended to this description automatically
by CI at build time.
