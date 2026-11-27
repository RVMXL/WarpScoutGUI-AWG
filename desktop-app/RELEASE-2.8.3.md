# WarpScoutGUI 2.8.3 — «Жёсткая сеть» снова жёсткая (prerelease)

WarpScoutGUI 2.8.3 — один пункт по итогам проверки пререлиза 2.8.2 (запрос
пользователя): после смены дефолта профиля I1 на QUIC пресет «Жёсткая сеть»
совпал с «По умолчанию» символ в символ — его историческое отличие было ровно
в `genI1:"quic"`. Пресет получил отличия, соответствующие названию: автоподбор
профиля I1 и терпеливый таймаут зонда. **Выпуск опубликован как PRERELEASE** —
после проверки переводится в полноценный релиз (prerelease=false,
make_latest=true). Форматы данных не менялись: отчёты, конфиги, аккаунт,
история, бэкапы — полная совместимость с 2.8.2/2.8.1/2.8.0/2.7.3.

WarpScoutGUI 2.8.3 — a single item from the 2.8.2 pre-release review (user
request): after the default I1 profile switched to QUIC, the "Hard network"
preset became an exact copy of "Default" — its historical difference was
precisely `genI1:"quic"`. The preset now has differences that match its name:
auto-picking of the I1 profile and a patient probe timeout. **This release is
published as a PRERELEASE** — after review it is promoted to a full release
(prerelease=false, make_latest=true). Data formats are unchanged: reports,
configs, account, history and backups remain fully compatible with
2.8.2/2.8.1/2.8.0/2.7.3.

## Что изменилось / What changed

- **Пресет «Жёсткая сеть» — автоподбор профиля I1 + таймаут зонда 4 с.**
  Отличие от «По умолчанию» теперь ровно два поля, и оба соответствуют
  названию:
  - тумблер **«Автоподбор профиля I1»** — если маскировка не прошла и скан
    ничего не нашёл, та же сессия сама перебирает профили «If nothing works»
    из README ядра (quic → dns → sip → stun → random), пока не найдёт рабочий;
    сработавший профиль остаётся в конструкторе;
  - **`-t 4` вместо дефолтных 2 с** — на жёсткой сети ответы на зонды приходят
    медленнее, и часть живых эндпоинтов раньше отсекалась по таймауту.
  Команда «Жёсткая сеть»: `warpscout scan -p awg31 -P -gen-i1 quic -t 4 -n 10
  -exclude-node DME` (+ автоподбор в приложении). Удаление пресета не
  потребовалось — в отличие от «Тщательного» (дубль тумблера `-f`), автоподбор
  меняет поведение ПОСЛЕ пустого скана, а не дублирует один флаг.

  The "Hard network" preset — auto-picking of the I1 profile + a 4 s probe
  timeout. The difference from "Default" is now exactly two fields, both
  matching the name: the "Auto-pick I1 profile" toggle (if the disguise fails
  and the scan finds nothing, the same session iterates the core's "If
  nothing works" profiles — quic → dns → sip → stun → random — until one
  works; the winning profile stays in the form) and `-t 4` instead of the
  default 2 s (on a hard network probe answers arrive slower, and some live
  endpoints used to be cut off by the timeout). Hard network command:
  `warpscout scan -p awg31 -P -gen-i1 quic -t 4 -n 10 -exclude-node DME`
  (+ auto-pick in the app). No removal needed — unlike "Thorough" (a
  duplicate of the `-f` toggle), auto-pick changes behavior AFTER an empty
  scan rather than duplicating a single flag.

- **Демо.** Пересобрано из ресурсов (sync-demo 28a4); поведенческих сценариев
  не добавлялось.

  Demo. Rebuilt from resources (sync-demo 28a4); no new behavioral scenarios.

## Изменения по платформам (2.8.3) / Platform changes (2.8.3)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Все пункты выше (общие ресурсы). |
| **Linux (linux64)** | Все пункты выше (общие ресурсы). |
| **Linux (linux-arm64)** | Все пункты выше (общие ресурсы). |
| **macOS (mac-arm64)** | Все пункты выше (общие ресурсы). |
| **macOS (mac-x64)** | Все пункты выше (общие ресурсы). |
| **Android (apk)** | Все пункты выше (общие ресурсы); versionCode 20803. |

## Проверки / Verification

- Тесты: 167 → 168, все зелёные (`node --test desktop-app/tests/*.test.js`).
  Новый кейс: пресет «Жёсткая сеть» — autoI1:true, timeout:4, стартовый
  genI1 quic, `-t 4` в команде buildScanCmd, ровно два отличия от
  DEFAULT_SCAN по снапшоту (timeout, autoI1).
- check-i18n: OK (ключ presets.14 переписан, RU/EN синхронно; новых ключей
  нет).
- gen-version --check: OK 2.8.3; verify-deps: OK (пины ядер 0.17.0).

## Статус пререлиза

Этот выпуск помечен как pre-release намеренно: сначала ручная проверка функций
на реальной машине, затем перевод в полноценный релиз (GitHub UI «Set as latest»
или API). Пользователи на 2.7.3 банер «⬆ WarpScoutGUI 2.8.3» увидят только ПОСЛЕ
перевода — эндпоинт releases/latest пререлизы не возвращает.
