# WarpScoutGUI 2.6.5 — лицензии в архивах заполнены (prerelease)

WarpScoutGUI 2.6.5 — лицензионно-инфраструктурный выпуск. **Содержимое
приложения не менялось**: код и ресурсы идентичны 2.6.4 (2.6.4 во всём, кроме
копий лицензии внутри архивов). Ядро warpscout — по-прежнему 0.16.0
(SHA-пины `deps.json` сходятся).

WarpScoutGUI 2.6.5 is a licensing/infrastructure release. **The application
itself is unchanged** from 2.6.4 (code and resources are identical except for
the license copies inside the archives). The warpscout core is still 0.16.0
(`deps.json` SHA pins match).

## Что изменилось / What changed

- **Лицензия.** В `licenses/LICENSE-AWG.txt` всех пяти релизных пакетов
  заполнен шаблон Apache 2.0: `Copyright 2026 RVMXL` вместо заглушки
  `[yyyy] [name of copyright owner]`. Корневой `LICENSE` и `NOTICE` были
  заполнены ранее — незаполненными оставались только копии, которые идут
  внутрь каждого архива (отчёт пользователя).

  License. The Apache 2.0 boilerplate in `licenses/LICENSE-AWG.txt` inside
  every release archive now reads `Copyright 2026 RVMXL` instead of the
  `[yyyy] [name of copyright owner]` placeholder. The repo-root LICENSE and
  NOTICE were already filled; only the per-archive copies were left as
  template (user report).

- **Инфраструктура выпуска.** Релиз теперь собирается и публикуется CI по
  пушу тега: гейт проверок (версия = тег, юнит-тесты, i18n, SHA-пины
  бинарников) → 5 release-zip + APK → prerelease с заметками и SHA-таблицей
  артефактов, дописываемой CI → деплой демо на gh-pages. Ключ подписи APK
  переехал в зашифрованный секрет репозитория (SHA-контроль против подмены);
  молчаливая автогенерация ключа в `build-apk.sh` запрещена. Для пользователей
  это ничего не меняет: те же артефакты, та же подпись APK.

  Release infrastructure. Releases are now built and published by CI on tag
  push; the APK signing key lives in an encrypted repository secret with a
  SHA-256 pin check. This changes nothing for users: same artifacts, same
  APK signature.

## Изменения по платформам (2.6.5) / Platform changes (2.6.5)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Только лицензия в архиве; ресурсы = 2.6.4. |
| **Linux (linux64)** | Только лицензия в архиве; ресурсы = 2.6.4. |
| **Linux (linux-arm64)** | Только лицензия в архиве; ресурсы = 2.6.4. |
| **macOS (mac-arm64)** | Только лицензия в архиве; ресурсы = 2.6.4. |
| **macOS (mac-x64)** | Только лицензия в архиве; ресурсы = 2.6.4. |
| **Android (android-arm64)** | versionCode 20605 (бамп); содержимое = 2.6.4, подпись — тот же мастер-ключ. |

## Обновление / Upgrade

Установка поверх 2.6.4 — распаковать ZIP целиком в ту же папку (заменить
файлы). Папка данных не переезжает. Обновление с 2.6.4 необязательно:
практическая разница — только лицензионные файлы в архиве.

To upgrade from 2.6.4 — unpack the ZIP over the same folder (replace files).
Updating is optional: the practical difference is the license files inside
the archives.

## Артефакты / Artifacts

SHA-256 всех файлов дописывается в это описание автоматически при сборке
релиза (шаг CI «заметки релиза»).

The SHA-256 table for all files is appended to this description automatically
by CI at build time.
