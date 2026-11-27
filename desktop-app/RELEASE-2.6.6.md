# WarpScoutGUI 2.6.6 — touch-интерфейс: останов в одном месте, параметры под замком на время скана

WarpScoutGUI 2.6.6 — два улучшения интерфейса по отзывам пользователя. Ядро
warpscout — по-прежнему 0.16.0 (SHA-пины `deps.json` сходятся). Форматы данных
не менялись: отчёты, конфиги, аккаунт, история — полная совместимость с 2.6.x.

WarpScoutGUI 2.6.6 ships two UI improvements based on user feedback. The
warpscout core is still 0.16.0 (`deps.json` SHA pins match). Data formats are
unchanged: reports, configs, account and history remain fully compatible
with 2.6.x.

## Что изменилось / What changed

- **Останов — в одном месте.** Из живой карточки скана на главной удалена
  красная кнопка «Остановить»: обработчик клика ей никогда не привязывался
  (нажатие ничего не делало), а рабочий останов дублировался — большая кнопка
  «■ Остановить скан» в «Основных действиях» и штатная кнопка на вкладке
  «Скан». Карточка теперь только показывает прогресс (фаза, таймер, шаги/узлы).

  Stop in one place. The red “Stop” button was removed from the live scan
  card on the home tab: it never had a click handler (pressing it did
  nothing), and a working stop was already available — the large
  “■ Stop scan” action button and the stop button on the Scan tab. The card
  is progress-only now (phase, timer, steps/nodes).

- **Статусы на главной — как на десктопе.** Строки «warpscout v… — готов» и
  «аккаунт: есть» подсвечиваются зелёным, «не найден / нет» — красным.
  Раньше классы статуса копировались в зеркала корректно, но CSS touch-режима
  перебивал цвет серым.

  Home status colors match desktop: “warpscout v… — ready” and “account:
  present” are green, missing/not found states are red. The touch-mode CSS
  used to override them with gray.

- **Параметры скана заблокированы во время сканирования.** Пока идёт скан,
  все контролы колонки параметров (пресеты, протокол, выборка, фильтры,
  обфускация) неактивны: `disabled` + гашение колонки + подсказка
  «🔒 Сканирование идёт — параметры заблокированы до завершения или
  остановки». Случайные нажатия больше не создают впечатления, что что-то
  сломалось. Пуск/Стоп, командная строка, лог и результаты остаются
  доступными; разблокировка автоматическая на завершении/останове/ошибке.

  Scan parameters are locked while a scan is running. All controls in the
  parameters column (presets, protocol, sampling, node filters, obfuscation)
  are disabled and dimmed, with a hint explaining why. Run/Stop, the command
  line, log and results stay available; unlocking is automatic on
  finish/stop/error.

## Изменения по платформам (2.6.6) / Platform changes (2.6.6)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | UI-правки (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux64)** | UI-правки (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux-arm64)** | UI-правки (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-arm64)** | UI-правки (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-x64)** | UI-правки (общие ресурсы) — см. выше; остальное без изменений. |
| **Android (android-arm64)** | versionCode 20606; те же UI-правки (главная: без дубль-кнопки, цветные статусы; параметры скана под замком на время скана). |

## Обновление / Upgrade

Установка поверх 2.6.5 — распаковать ZIP целиком в ту же папку (заменить
файлы). Папка данных не переезжает. На Android — установить APK поверх
старой версии: пакет и ключ подписи фиксированы, данные сохранятся.

To upgrade from 2.6.5 — unpack the ZIP over the same folder (replace files).
On Android, install the APK over the existing version: package name and
signing key are fixed, data is preserved.

## Артефакты / Artifacts

SHA-256 всех файлов дописывается в это описание автоматически при сборке
релиза (шаг CI «заметки релиза»).

The SHA-256 table for all files is appended to this description automatically
by CI at build time.
