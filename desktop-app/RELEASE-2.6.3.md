# WarpScoutGUI 2.6.3 — фикс проверки warpscout (prerelease)

WarpScoutGUI 2.6.3 — точечный фикс регресса 2.6.2, найденного пользователем:
на части машин приложение писало «**warpscout: не найден**» или «**Файл найден,
но версию получить не удалось**» при РАБОЧЕМ `warpscout.exe` рядом с программой
(в 2.6.1 той же сборки ошибки не было).

WarpScoutGUI 2.6.3 is a targeted fix for a 2.6.2 regression reported by a user:
on some machines the app showed “**warpscout: not found**” or “**File found,
but the version could not be obtained**” even though `warpscout.exe` was fine
next to the program (the same binaries worked in 2.6.1).

**Статус выпуска: ПРЕРЕЛИЗ 2.6.3.** Ядро warpscout не менялось (0.16.0 во всех
пакетах, байт-в-байт те же файлы, что в 2.6.1/2.6.2 — SHA-256 пины `deps.json`
сходятся). Функциональность сканирования и генерации конфигов не менялась.

**Release status: PRERELEASE 2.6.3.** The warpscout core is unchanged (0.16.0 in
every package, byte-identical files to 2.6.1/2.6.2 — `deps.json` SHA-256 pins
match). Scanning and config generation behaviour is unchanged.

## Причина и фиксы / Root cause and fixes

- **Механика регресса.** В 2.6.2 (FE-3) synthetic-exit моста стал двухтактным:
  страховочный свип подтверждает потерю exit-события двумя тиками по 5 с (~10 с).
  Проверка версии (`warpscout version`) имеет собственный таймаут — в 2.6.2 он
  был 8 с: процесс «сдавался» с `exitCode = null` раньше синтетики, и гейт F37
  (принимает только exit 0/143/-1) отвергал валидный ответ из stdout. В 2.6.1
  свип был однотактным (5 с < 8 с) и успевал — поэтому ошибка «вернулась».

- **Fix 1 (13-form-paths.js).** Таймаут проверки версии поднят до **12 с** —
  больше двухтактного свипа, синтетика успевает доехать в штатном окне.

- **Fix 2 (13-form-paths.js).** `exitCode = null` прощается **только** когда
  процесс убит нашим таймаутом (`killedByTimeout`: `killProc` не синтезирует
  exit-событие, а ответ warpscout уже в буфере stdout). Настоящий ненулевой
  код (антивирус-обёртка, повреждённый exe) по-прежнему отвергается — защита
  F37 не ослаблена.

- **Fix 3 (15-init.js / 12-socks-tools-ui.js) — плавающий фриз UI при старте.**
  Второй отчёт пользователя: «иногда после запуска несколько секунд интерфейс
  не отвечает». Причина: привязка кнопок (bindEvents) выполнялась ПОСЛЕ цепочки
  последовательных await'ов инициализации (restoreState → computePaths →
  repairUdfJunction → migrateAndroidLegacyData), а нативные вызовы Neutralino
  обрабатываются по очереди (websocket-хендлер синхронный) — на медленном диске
  или при активном антивирусе цепочка растягивалась на секунды, и всё это время
  интерфейс был глух к нажатиям; плавающий характер — зависимость от состояния
  диска/антивируса. Теперь setupTouchUi + bindEvents выполняются сразу при
  разборе скриптов (preInitUi — ещё до готовности рантайма, у обоих самозащита
  от двойного вызова), а repairUdfJunction и migrateAndroidLegacyData идут
  параллельно. Пользовательский сценарий/поведение не менялись — ускорен и
  «оживлён» только старт.

- **Тесты.** +5 юнит-тестов (`tests/wscheck.test.js`): потерянный exit + валидный
  stdout → принимается; штатный exit 0 → принимается; настоящий exit 1 →
  отвергается; мусор в stdout → отвергается; файла нет → «не найден». Тест
  регресса проверен на старой логике гейта — падает (ловит). Всего 75/75.

## Изменения по платформам (2.6.3) / Platform changes (2.6.3)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Фикс проверки warpscout + раннее оживление UI в `resources.neu` (`checkWarpscoutRun`, `init`/`bindEvents`/`setupTouchUi`); остальное — как 2.6.2. |
| **Linux (linux64)** | Как win64. |
| **Linux (linux-arm64)** | Как win64. |
| **macOS (mac-arm64)** | Как win64. |
| **macOS (mac-x64)** | Как win64. |
| **Android (android-arm64)** | Как win64; разрешение — по-прежнему только `INTERNET`, versionCode 20603. |

Windows / Linux / macOS / Android: only the warpscout version-check timing fix
and the early-UI bootstrap inside resources.neu; everything else is unchanged
from 2.6.2.

## Обновление / Upgrade

Установка поверх 2.6.2 — распаковать ZIP целиком в ту же папку (заменить файлы).
Папка данных не переезжает, настройки/аккаунт/история сохраняются. Проверка
статуса warpscout выполняется автоматически при запуске; при неудаче — вкладка
«Аккаунт» → «Проверить warpscout» (принудительная проверка).

To upgrade from 2.6.2 — unpack the ZIP entirely over the same folder (replace
files). The data folder stays put; settings/account/history are kept. The
warpscout status check runs automatically at startup; if it fails — “Account”
tab → “Check warpscout” (forced re-check).

## Артефакты / Artifacts

| Файл | SHA-256 |
|---|---|
| `WARPScoutGUI-2.6.3-win64.zip` | `bd65e61624d75c0c5fbf406378a3256216b318daa9cb31d248bb3d30a86380a9` |
| `WARPScoutGUI-2.6.3-linux64.zip` | `05c981d38f00bb90cfc05c12774017bf2916266811480c9bb78991a8d084cf04` |
| `WARPScoutGUI-2.6.3-linux-arm64.zip` | `03c9f960da73963ce9d5591e74ac6bb75c1ac43eb83716b31268f5d7b47a8e51` |
| `WARPScoutGUI-2.6.3-mac-arm64.zip` | `440eb4ad146688f0a9df856f375ae7b603a04b3d8c4353fdb7ad654b0d522da4` |
| `WARPScoutGUI-2.6.3-mac-x64.zip` | `70e28711a55d886d1d44b7c192d4a2a0c5eea4bdfb440a1f1dc506e77167f7c5` |
| `WARPScoutGUI-2.6.3-android-arm64.apk` | см. примечание ниже / see note below |

**APK (android-arm64):** versionCode 20603, только разрешение `INTERNET`,
ядро `libwarpscout.so` — warpscout 0.16.0 (SHA-пин `deps.json`, AND-2),
подпись — мастер-ключ проекта. SHA-256 APK вписывается в эти заметки при
сборке (`APK-SHA256-PLACEHOLDER` заменяется sed-командой на машине сборщика).

**APK (android-arm64):** versionCode 20603, single `INTERNET` permission,
core `libwarpscout.so` — warpscout 0.16.0 (pinned in `deps.json`, AND-2),
signed with the project master key. The APK SHA-256 is substituted for
`APK-SHA256-PLACEHOLDER` at build time on the signing machine.

## Верификация / Verification

- 75/75 юнит-тестов (`node --test desktop-app/tests/*.test.js`), включая 5 новых
  wscheck-тестов; регрессионный тест проверен на старом гейте (падает — ловит).
- `check-i18n.py`: 186 текстов + 63 атрибута, misses 0.
- `gen-version.py --check`: 2.6.3 согласована везде (versionCode 20603).
- `verify-deps.py`: 13/13 бинарников соответствуют SHA-пинам `deps.json`.
- Зип: ровно 9 записей, футер README.txt « WARPSCOUT GUI v2.6.3 · warpscout v0.16.0».
