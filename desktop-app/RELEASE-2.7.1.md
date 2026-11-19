# WarpScoutGUI 2.7.1 — «I1 из сканирования», пресеты по смыслу

WarpScoutGUI 2.7.1 — два изменения по запросам пользователя: (1) I1,
использованный сканом (профиль `-gen-i1` из вкладки «Скан» или найденный
пакет из «Поиска параметров»), теперь одной кнопкой подставляется в конфиг —
свежий пакет того же профиля, проверенный на эндпоинте конфига, чтобы скан
показывал рабочие эндпоинты, а конфиг не «выяснялся нерабочим» постфактум;
(2) пресеты вкладки «Скан» переименованы по смыслу: «Быстрый» больше не
означает «прогон через wg» — это стандартный AWG-скан на 3 адреса подсети,
а бывший wg-прогон стал пресетом «Без обфускации». Ядро warpscout —
по-прежнему 0.16.0 (SHA-пины `deps.json` сходятся). Форматы данных не
менялись: отчёты, конфиги, аккаунт, история — полная совместимость с 2.7.0.

WarpScoutGUI 2.7.1 covers two user requests: (1) the I1 used by the scan
(the `-gen-i1` profile from the "Scan" tab or a packet found in the "Param
finder") can now be inserted into the config with one button — a fresh
packet of the same profile, verified on the config endpoint, so the scan
finds working endpoints and the config no longer turns out to be dead
afterwards; (2) the "Scan" tab presets are renamed to match their meaning:
"Fast" no longer means "a run through wg" — it is the standard AWG scan at
3 addresses per subnet, and the former wg run became the "No obfuscation"
preset. The warpscout core is still 0.16.0 (`deps.json` SHA pins match).
Data formats are unchanged: reports, configs, account and history remain
fully compatible with 2.7.0.

## Что изменилось / What changed

- **Кнопка «I1 из сканирования».** Скан с `-gen-i1` генерирует init-пакет
  на лету (per run) и в отчёт его не выносит — вытащить пакет из прошлого
  прогона невозможно. Но warpscout печатает КОНКРЕТНЫЙ пакет в выводе
  `scan -conf -` (готовый конфиг лучшего эндпоинта несёт строку
  `I1 = …`): проверено на реальном CLI и для профилей `-gen-i1
  quic/dns/sip/stun/random` (с `-i1-sni`), и для дефолтного iCloud-зонда.
  Новая кнопка во вкладке «Конфиг → Параметры обфускации → Дополнительно»
  (рядом с «Импорт I1 из .conf») запускает мини-скан одного эндпоинта —
  выбранного на вкладке «Конфиг» (после скана туда ставится лучший) —
  с тем же профилем и SNI, что у последнего скана (снимок lastRunParams;
  junk — та же ветка приоритетов, что у QC-проверки: gen-i1 → gen-junk →
  общий набор из S.cfg.obf), с флагами `-plain -conf - -conf-type native
  -no-report` (без файла отчёта и туннель-пинга) и парсит свежий I1 из
  stdout. Пакет пересобирается заново — байты другие, но форма/профиль те
  же, поэтому конфиг больше не «отстаёт» от скана. На время прогона кнопка
  дизейблится и показывает «…»; повторный запуск блокируется; эндпоинт не
  ответил → честный тост «попробуйте другой эндпоинт или повторите позже»;
  последний запуск был не AWG (masque/wg) → объяснение, что I1 применим
  только к awg-сканам; «I1 = none» в выводе отбрасывается; подсказка под
  полем I1 обновлена (она больше не утверждает, что вытащить пакет нельзя).

  The "I1 from scan" button. A scan with `-gen-i1` generates the init
  packet on the fly (per run) and never includes it in the report — the
  packet of a past run is unrecoverable. But warpscout prints the CONCRETE
  packet in the `scan -conf -` output (the ready-made config of the best
  endpoint carries the `I1 = …` line): verified on the real CLI both for
  the `-gen-i1 quic/dns/sip/stun/random` profiles (with `-i1-sni`) and for
  the default iCloud probe. The new button on the "Config → Obfuscation →
  Advanced" panel (next to "Import I1 from .conf") runs a mini-scan of one
  endpoint — the one picked on the "Config" tab (the best endpoint lands
  there right after a scan) — with the same profile and SNI the last scan
  used (lastRunParams snapshot; junk follows the same priority branch as
  the QC check: gen-i1 → gen-junk → the shared set from S.cfg.obf), with
  `-plain -conf - -conf-type native -no-report` flags (no report file, no
  tunnel ping) and parses the fresh I1 from stdout. The packet is rebuilt
  from scratch — different bytes, same shape/profile — so the config no
  longer lags behind the scan. While running, the button is disabled and
  shows "…"; a concurrent run is blocked; if the endpoint does not respond,
  an honest toast suggests trying another endpoint; when the last run was
  not AWG (masque/wg) an explanation says I1 only applies to awg scans;
  an `I1 = none` line in the output is rejected; the hint under the I1
  field is updated (it no longer claims the packet cannot be extracted).

- **Пресеты — по смыслу.** Раньше «⚡ Быстрый» означал «обычный WireGuard
  без проверки внутри туннеля» — это отсутствие обфускации, а не скорость,
  что путало. Теперь «⚡ Быстрый» = тот же стандартный AWG-скан
  (туннель-пинг и все параметры по умолчанию), но 3 адреса на подсеть
  вместо 10 — втрое короче прогон, когда время поджимает. Бывший wg-прогон
  — отдельный пресет «🚫 Без обфускации» (wg, без -P, 5 адресов на подсеть)
  для сетей, где WARP не фильтруется. Хинты пресетов переведены на
  идентификаторы словаря i18n: перевод EN теперь работает и для подсказки
  под чипами, и подсказка обновляется при смене языка.

  Presets renamed to match their meaning. "⚡ Fast" used to mean "plain
  WireGuard without in-tunnel checks" — that is the absence of
  obfuscation, not speed. Now "⚡ Fast" = the same standard AWG scan
  (tunnel ping and every parameter at defaults) but 3 addresses per subnet
  instead of 10 — a thrice shorter run when time is short. The former wg
  run is a separate "🚫 No obfuscation" preset (wg, no -P, 5 addresses per
  subnet) for networks where WARP is not filtered. Preset hints now use
  i18n dictionary ids: the EN translation works for the hint under the
  chips too, and the hint updates on language switch.

## Изменения по платформам (2.7.1) / Platform changes (2.7.1)

| Платформа | Изменения |
|---|---|
| **Windows (win64)** | Оба изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux64)** | Оба изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **Linux (linux-arm64)** | Оба изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-arm64)** | Оба изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **macOS (mac-x64)** | Оба изменения (общие ресурсы) — см. выше; остальное без изменений. |
| **Android (apk)** | Оба изменения (общие ресурсы) — см. выше; versionCode 20701. |

## Проверки / Verification

- Тесты: 110 → 120, все зелёные (`node --test desktop-app/tests/*.test.js`).
  Новый файл tests/i1scan.test.js: пресеты fast = DEFAULT_SCAN + sample:3 и
  noobf = прежний wg-прогон (fast ≠ noobf ≠ default), хинты пресетов —
  идентификаторы словаря; buildI1Cmd — ветки профиля (-gen-i1 + -i1-sni,
  без флагов junk), gen-junk, junk из общего S.cfg.obf (и дефолт без
  флагов), флаги `-conf -`/`-no-report`; parseI1Output — raw-форма
  посимвольно, CRLF, iCloud-зонд, «no working endpoints found», нет строки,
  «I1 = none», последняя строка при дублях; finishI1 — запись в
  S.cfg.obf.i1 и поле cfgI1, тост с профилем.
- check-i18n: OK (кнопка, тосты и подсказка — RU/EN; 723 записи словаря).
- gen-version --check: OK 2.7.1; verify-deps: OK.
- Живая проверка CLI (песочница, реальный warpscout 0.16.0): `scan -p awg
  -gen-i1 quic -i1-sni apple.com -target … -port 2408 -conf - -conf-type
  native -plain -no-report` печатает конфиг со строкой
  `I1 = <b 0x…><r 22><b 0x…><r 16>`; тот же прогон без `-gen-i1` —
  `I1 = <r 2><b 0x8580…icloud…>`; «no working endpoints found» — конфига
  нет, парсер даёт честную ошибку.
