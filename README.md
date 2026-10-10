# WARPScoutGUI-AWG

Графическая оболочка для [**warpscout**](https://github.com/vernette/warpscout) — CLI-сканера WARP-эндпоинтов от [vernette](https://github.com/vernette) (Go, MIT). Суффикс **-AWG** отличает этот GUI от прочих обёрток: проект работает с конфигурациями в формате **AmneziaWG** (awg31).

Набор утилит:

- **WARPScout GUI** (`desktop-app/`) — десктопное приложение (Neutralino.js) вокруг CLI-утилиты `bin/warpscout.exe`: регистрация WARP-аккаунтов, генерация `.conf` в формате AmneziaWG (awg31), импорт/валидация конфигов, QR-коды (включая многостраничный формат AmneziaVPN для длинных конфигов), сканер статуса аккаунтов.
- **Лендинг** (`src/`) — сайт на Next.js 16 + Tailwind + shadcn/ui: описание проекта, демо интерфейса, changelog и эндпоинт `/api/download` для отдачи релизного zip-архива.

Текущая версия GUI: **v2.4.4**.

## Структура репозитория

| Путь | Назначение |
|---|---|
| `src/` | Next.js-лендинг (App Router, TypeScript). Главные файлы: `src/app/page.tsx`, `src/components/site-controls.tsx` |
| `src/app/api/download/route.ts` | Раздача релизного архива из `download/` |
| `desktop-app/resources/` | Исходники GUI (`index.html`, `js/app.js`, `js/mock.js`, `css/`) |
| `desktop-app/pkg/WARPScoutGUI/` | Собранный пакет приложения (exe + resources.neu) |
| `desktop-app/bin/warpscout.exe` | CLI-утилита, которую оборачивает GUI |
| `download/` | Релизный zip (`WARPScoutGUI-x.y.z-win64.zip`) |
| `scripts/sync-demo.sh` | Синхронизация собранных ресурсов GUI в `public/gui-demo/` для демо на лендинге |
| `materials/` | Рабочие материалы: исходное задание, документация Amnezia, примеры конфигов |
| `prisma/schema.prisma` | Схема БД (SQLite) лендинга |

## Запуск лендинга

```bash
bun install
bun run db:push   # инициализация SQLite (Prisma)
bun run dev       # http://localhost:3000
```

## Сборка GUI (Windows x64)

```bash
cd desktop-app
npx --yes @neutralinojs/neu@11 build --release
# → dist/WARPScoutGUI/{resources.neu, WARPScoutGUI-win_x64.exe}
# далее копируется в pkg/ и упаковывается в download/WARPScoutGUI-<ver>-win64.zip
```

Демо-версия интерфейса (без Neutralino, на моках) доступна на лендинге — ресурсы синхронизируются скриптом `scripts/sync-demo.sh` в `public/gui-demo/`.

## Ключевые возможности GUI

- Регистрация WARP-аккаунтов через `warpscout` с живым логом процесса и реальными кодами выхода
- Генерация конфига AmneziaWG (awg31): endpoint, порт, DNS-пресеты (Cloudflare / Quad9 / Google / AdGuard) с тумблером «Использовать IPv6» (вкл. по умолчанию), obfuscation-параметры (S1/S2, H1–H4, Jc/Jmin/Jmax)
- Предпросмотр команды запуска и итогового `.conf`
- Импорт существующих конфигов с распознаванием параметров (включая обе формы DNS-строки)
- QR-код конфига: одиночный (до 2953 байт) или **многостраничный** в формате AmneziaVPN (побайтово совместим с их импортером, порядок страниц не важен)
- Сканирование статуса аккаунтов с настраиваемым concurrency
- Локальное состояние в localStorage, тёмная/светлая тема

## Авторство и лицензии

- **warpscout** — CLI-утилита [vernette/warpscout](https://github.com/vernette/warpscout) (Go, MIT © Nikita S.). GUI распространяет её бинарник в релизных архивах; полная лицензия прикладывается в каждом архиве (`LICENSE-warpscout.txt`).
- **Этот репозиторий — не форк**: это независимый проект (Neutralino.js GUI + Next.js лендинг), написанный с нуля вокруг CLI-утилиты; общей истории коммитов с апстримом нет.
- Лендинг: не аффилирован с Cloudflare и Amnezia. WARP — товарный знак Cloudflare, Inc.

## Примечания

- Репозиторий приватный.
- `.env`, `db/`, `desktop-app/dist/`, `tool-results/`, `.zscripts/` не публикуются (см. `.gitignore`).
- История версий — в changelog на лендинге и в `worklog.md`.
