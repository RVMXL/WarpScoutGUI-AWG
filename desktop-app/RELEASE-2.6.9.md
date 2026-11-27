# WarpScoutGUI 2.6.9 — fix: оповещение о пути к warpscout больше не появляется после каждого обновления

WarpScoutGUI 2.6.9 — фикс по отчёту пользователя: в мобильном интерфейсе после
каждого обновления приложения при запуске появлялось оповещение «Указанный путь
к warpscout не используется — бинарь найден в штатном месте… Настройка сохранена
— очистите поле в Настройках», причём в настройках очищать было нечего. Ядро
warpscout — по-прежнему 0.16.0 (SHA-пины `deps.json` сходятся). Форматы данных
не менялись: отчёты, конфиги, аккаунт, история — полная совместимость с 2.6.x.

WarpScoutGUI 2.6.9 is a fix based on a user report: in the mobile UI, after
every app update, a warning appeared on launch — "The custom warpscout path is
not in use — the binary was found at the standard location… The setting is kept
— clear the field in Settings" — while there was nothing to clear in Settings.
The warpscout core is still 0.16.0 (`deps.json` SHA pins match). Data formats
are unchanged: reports, configs, account and history remain fully compatible
with 2.6.x.

## Что изменилось / What changed

- **Вечный тост `data.22` при старте устранён.** Причина двухслойная.
  (1) Нормализация v2.4.0 записывала найденный путь warpscout в настройку
  `wsPath` даже когда пользователь ничего не задавал; на Android бинарь лежит в
  `/data/app/~~<random>/…`, и при каждом обновлении APK этот путь меняется —
  автосохранённая копия протухала. (2) Проверка при старте сравнивала
  протухший custom с найденным путём и предупреждала при каждом запуске; при
  этом протухший путь нигде не был виден (поле в настройках показывает
  найденный путь), так что инструкция «очистите поле» была невыполнима.

  The perpetual `data.22` toast on startup is gone. The cause had two layers.
  (1) The v2.4.0 normalization wrote the found warpscout path into the `wsPath`
  setting even when the user had configured nothing; on Android the binary
  lives under `/data/app/~~<random>/…`, which changes on every APK update, so
  the auto-saved copy went stale. (2) The startup check compared the stale
  custom value with the freshly found path and warned on every launch; the
  stale value was invisible anywhere in the UI (the Settings field shows the
  found path), so the "clear the field" instruction could not be followed.

- **Новые правила хранения пути (v2.6.9).** Автозапись найденного пути в
  настройки запрещена: пустой custom остаётся пустым, путь резолвится
  динамически при каждом запуске — обновления APK больше ничего не ломают.
  Явно заданный custom по-прежнему нормализуется до точного пути exe
  (легитимный сценарий «сознательно держу другую версию CLI» не сломан).
  Мёртвый custom (найденный бинарь не произошёл от него) очищается один раз с
  объясняющим тостом «настройка очищена автоматически, это сообщение не
  повторится» — вместо вечного «настройка сохранена, очистите поле». Живой
  custom-папке (exe внутри) больше не тостится вовсе: найденный exe лежит в
  собственной папке пользователя, конфликт отсутствует.

  New path-storage rules (v2.6.9). Auto-writing the found path into settings
  is forbidden: an empty custom stays empty and the path is resolved
  dynamically on every launch — APK updates no longer break anything. An
  explicitly set custom is still normalized to the exact exe path (the
  legitimate "I keep another CLI version on purpose" scenario is intact). A
  dead custom (the found binary did not originate from it) is cleared once,
  with an explanatory toast "the setting was cleared automatically; this
  message won't repeat" — instead of the perpetual "the setting is kept, clear
  the field". A live custom folder (with the exe inside) no longer toasts at
  all: the found exe lives inside the user's own folder, there is no conflict.

## Изменения по платформам (2.6.9) / Platform changes (2.6.9)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Фикс хранения пути warpscout (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux64)** | Фикс хранения пути warpscout (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux-arm64)** | Фикс хранения пути warpscout (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-arm64)** | Фикс хранения пути warpscout (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-x64)** | Фикс хранения пути warpscout (общие ресурсы) — см. выше; остальное без изменений. |
| **Android (apk)** | Основной бенефициар фикса: протухший путь `/data/app/~~…` прошлых установок самоочищается при первом запуске 2.6.9, повторных предупреждений после обновлений больше не будет; versionCode 20609. |

## Проверки / Verification

- Тесты: 97 → 101, все зелёные (`node --test desktop-app/tests/*.test.js`).
  paths.test.js: мёртвый custom очищается + ровно один тост + повторный запуск
  без тоста; живая custom-папка — без тостов, настройка не трогается;
  Android-регресс: протухший `/data/app/~~old/…` очищается, используется
  `NL_WS_PATH` текущей установки. wscheck.test.js: пустой custom не
  заполняется найденным путём; явный custom-папка нормализуется до точного
  пути exe, как в 2.4.0.
- check-i18n: OK (тексты data.22 обновлены в RU/EN синхронно).
- gen-version --check: OK 2.6.9; verify-deps: OK.
