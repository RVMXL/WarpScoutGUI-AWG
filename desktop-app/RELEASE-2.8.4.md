# WarpScoutGUI 2.8.4 — полноценный релиз ветки 2.8

WarpScoutGUI 2.8.4 — перевод ветки 2.8 в полноценный релиз: серия 2.8.0–2.8.3
(живой скан `-stream-json`, банер обновления GUI, экспорт mihomo-json/usque,
автоподбор профиля I1, повтор скана из истории, подтверждение закрытия окна с
активным SOCKS, «свои флаги CLI», AWG 3.1 на вкладке «Скан», дефолт профиля I1
QUIC, пресеты «Жёсткая сеть») проверена пользователем на реальных машинах.
Плюс два пункта: мобильная карточка «Папка данных» больше не обещает выбор
папки «на другом диске» (это поведение только ПК) и документация репозитория
получила английские версии README/CHANGELOG. Форматы данных не менялись:
отчёты, конфиги, аккаунт, история, бэкапы — полная совместимость с
2.8.3/2.8.2/2.8.1/2.8.0/2.7.3.

WarpScoutGUI 2.8.4 — promotion of the 2.8 branch to a full release: the
2.8.0–2.8.3 series (live `-stream-json` scan, GUI update banner, mihomo-json /
usque export, I1 profile auto-pick, scan rerun from history, close-window
confirmation with active SOCKS, custom CLI flags, AWG 3.1 on the Scan tab,
QUIC as the default I1 profile, the "Hard network" presets) has been verified
by the user on real machines. Plus two items: the mobile "Data folder" card no
longer promises moving the folder to "another drive" (desktop-only behavior),
and the repository docs gained English versions of README/CHANGELOG. Data
formats are unchanged: reports, configs, account, history and backups remain
fully compatible with 2.8.3/2.8.2/2.8.1/2.8.0/2.7.3.

## Что изменилось / What changed

- **Мобильная карточка «Папка данных» без фразы про «другой диск».** Хинт
  говорил «Можно выбрать и другую папку — например, на другом диске» — верно
  только для ПК: на Android папка данных фиксирована системой
  (/storage/emulated/0/Android/data/ru.warpscout.gui/files/WARPScoutGUI),
  кнопки «Выбрать…»/«По умолчанию» на мобильной скрыты ещё с 2.5.0. В
  платформенный слой добавлены android-замены целых фраз (ANDROID_TEXT — тот
  же механизм идентификаторов, что у Linux/macOS-фраз): обе вариации хинта
  (карточка «Папка данных» на «Настройках» и карточка «Пути») теперь без
  обещания выбора другой папки; EN-вариант синхронно. Десктоп и веб-демо — без
  изменений.

  The mobile "Data folder" card no longer shows the desktop-only phrase about
  moving the folder to "another drive". On Android the data folder is fixed by
  the system
  (/storage/emulated/0/Android/data/ru.warpscout.gui/files/WARPScoutGUI) and
  the "Pick…"/"Reset" buttons have been hidden since 2.5.0; the platform layer
  gained android-specific full-phrase replacements (ANDROID_TEXT — the same
  identifier-based mechanism as the Linux/macOS phrases), so both hint
  variants ("Data folder" card on Settings and the "Paths" card) no longer
  promise choosing another folder; the EN variant is in sync. Desktop and the
  web demo are unchanged.

- **README и CHANGELOG — русские по умолчанию, в начале — ссылка на
  английские версии.** README.en.md и CHANGELOG.en.md — полные синхронные
  переводы, перекрёстные ссылки «English | Русский» в заголовках обоих файлов;
  в пакетных README.txt статус «ПРЕРЕЛИЗ X.Y.Z» (остававшийся вплоть до 2.7.3)
  заменён на честный «полноценный релиз».

  README and CHANGELOG are Russian by default, with a link to the English
  versions at the top. README.en.md and CHANGELOG.en.md are full in-sync
  translations with "English | Русский" cross-links in both headers; the
  package README.txt status "ПРЕРЕЛИЗ X.Y.Z" (left over up to 2.7.3) is
  replaced with an honest "full release" wording.

- **Статус выпуска: полноценный релиз.** releases/latest возвращает 2.8.4 —
  банер «⬆ WarpScoutGUI 2.8.4» увидят пользователи 2.7.3 и всех 2.8.x
  (releases/latest не отдаёт пререлизы).

  Release status: full release. releases/latest now returns 2.8.4, so the
  "⬆ WarpScoutGUI 2.8.4" banner appears for users on 2.7.3 and every 2.8.x
  (releases/latest does not return pre-releases).

## Изменения по платформам (2.8.4) / Platform changes (2.8.4)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Общие ресурсы: только текстовая правка платформенного слоя; ядро warpscout 0.17.0 — без изменений. |
| **Linux (linux64)** | Общие ресурсы: только текстовая правка платформенного слоя; ядро warpscout 0.17.0 — без изменений. |
| **Linux (linux-arm64)** | Общие ресурсы: только текстовая правка платформенного слоя; ядро warpscout 0.17.0 — без изменений. |
| **macOS (mac-arm64)** | Общие ресурсы: только текстовая правка платформенного слоя; ядро warpscout 0.17.0 — без изменений. |
| **macOS (mac-x64)** | Общие ресурсы: только текстовая правка платформенного слоя; ядро warpscout 0.17.0 — без изменений. |
| **Android (apk)** | Общие ресурсы: текстовая правка платформенного слоя (карточка «Папка данных» — android-фразы); versionCode 20804. |

## Проверки / Verification

- Тесты: 168, все зелёные (`node --test desktop-app/tests/*.test.js`).
- check-i18n: OK (новых ключей словаря нет — android-фразы применяются к
  значениям по идентификаторам, RU/EN синхронно).
- gen-version --check: OK 2.8.4; verify-deps: OK (пины ядер 0.17.0).

## Статус выпуска

Этот выпуск — полноценный релиз (prerelease=false, make_latest=true):
пререлизный цикл для содержимого ветки 2.8 завершён, серия 2.8.0–2.8.3
проверена. releases/latest возвращает 2.8.4 — банер «⬆ WarpScoutGUI 2.8.4»
сработает у пользователей 2.7.3/2.8.0/2.8.1/2.8.2/2.8.3.

This release is a full release (prerelease=false, make_latest=true): the
pre-release cycle for the 2.8 branch content is complete, the 2.8.0–2.8.3
series has been verified. releases/latest returns 2.8.4, so the "⬆
WarpScoutGUI 2.8.4" banner appears for users on 2.7.3/2.8.0/2.8.1/2.8.2/2.8.3.
