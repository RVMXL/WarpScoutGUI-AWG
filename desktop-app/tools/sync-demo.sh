#!/usr/bin/env bash
# WARPScoutGUI — синхронизация браузерного демо (public/gui-demo) с ресурсами
# десктоп-приложения (desktop-app/resources). КАНОНИЧЕСКИЙ скрипт (v2.6.2, аудит
# INFRA-L: раньше жили два расходящихся копипаста — scripts/sync-demo.sh и этот;
# правка одного не попадала в другой. Теперь источник здесь, корневой путь —
# обёртка, передающая аргументы).
#
# Демо отличается от ресурсов приложения ровно тремя вещами:
#   1) НЕ подключается js/neutralino.js — реальный клиент определяет window.Neutralino
#      до mock.js, и guard мока «return» убивает демо (мок должен переопределить
#      Neutralino сам — см. guard в mock.js);
#   2) cache-busters ?v=... меняются на демо-свои (параметр VER ниже);
#   3) v2.6.2m: в <head> добавляется js/demo-touch.js (файл генерируется здесь,
#      в resources его НЕТ) — на телефонах до первого рендера включает родной
#      touch-UI приложения (нижняя навигация, как в Android-APK) через
#      штатный параметр ?touch=1 (см. TOUCH_UI в js/wsg/01-platform.js).
#      Проблема: в браузере мок даёт NL_OS="" → IS_ANDROID=false → Pages
#      показывал сжатый ДЕСКТОП-вид («не как в приложении»). Инъекция живёт
#      только в демо-копии; ?touch=0 — явный escape на десктопный вид.
#
# Использование:
#   bash desktop-app/tools/sync-demo.sh              — полная пересинхронизация (бастер по умолчанию)
#   bash desktop-app/tools/sync-demo.sh <бастер>     — с указанным cache-buster (например 26v2)
#
# ВАЖНО (песочница): копирование выполняется PYTHON-ом — bash-cp здесь может
# прочитать устаревшую версию файла из кэш-слоя файловой системы и скопировать
# мусор (случалось с css). Python-слой читает актуальные байты.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VER="${1:-26v2}"

python3 - "$ROOT" "$VER" <<'PYEOF'
import os, re, shutil, sys

root, ver = sys.argv[1], sys.argv[2]
SRC = os.path.join(root, 'desktop-app', 'resources')
DST = os.path.join(root, 'public', 'gui-demo')

# чистим и пересоздаём — никакого «полусинхронного» состояния
if os.path.exists(DST):
    shutil.rmtree(DST)
os.makedirs(DST)

count = 0
for dirpath, dirnames, filenames in os.walk(SRC):
    rel = os.path.relpath(dirpath, SRC)
    target = DST if rel == '.' else os.path.join(DST, rel)
    os.makedirs(target, exist_ok=True)
    for fn in filenames:
        src_full = os.path.join(dirpath, fn)
        dst_full = os.path.join(target, fn)
        shutil.copyfile(src_full, dst_full)
        count += 1

# 1) вырезать загрузку реального Neutralino runtime (мок его заменяет)
idx = os.path.join(DST, 'index.html')
html = open(idx, encoding='utf-8').read()
assert '<script src="js/neutralino.js"></script>' in html, "ожидался тег neutralino.js"
html = html.replace('  <script src="js/neutralino.js"></script>\n', '')
html = html.replace('<script src="js/neutralino.js"></script>\n', '')
# 2) cache-busters — демо-свои (не совпадают с desktop, чтобы кэш не путался)
# v2.6.2: класс [0-9a-z]+ не поглощал ТОЧКИ — точечный бастер (v2.6.1 и т.п.)
# оставлял хвост («?v=v2 → v2.6.1» давал «?v=v2.6.1.6.1» при повторном прогоне).
# Теперь поглощаем точки и заглавные: замена идемпотентна для любого бастера.
html = re.sub(r'\?v=[0-9a-zA-Z.]+', '?v=' + ver, html)
open(idx, 'w', encoding='utf-8').write(html)

# 3) лишние для веба файлы
for extra in ['js/neutralino.js', 'js/neutralino.d.ts']:
    p = os.path.join(DST, extra)
    if os.path.exists(p):
        os.remove(p)

# 4) v2.6.2m: мобильная подгонка демо — js/demo-touch.js в <head>.
#    Приложение имеет родной сенсорный режим (css/touch.css, body.touch-ui:
#    нижняя навигация + главная с быстрыми действиями). В APK его включает
#    Android-оболочка; в браузере мок даёт NL_OS="" → IS_ANDROID=false, и
#    Pages показывал сжатый десктоп — «не как в приложении». Скрипт до
#    первого рендера перезаписывает URL на штатный ?touch=1 → TOUCH_UI в
#    js/wsg/01-platform.js честно вычисляется как true. Файл живёт ТОЛЬКО
#    в демо-копии (resources не меняются — десктопный релиз не затронут).
DEMO_TOUCH_JS = '''/* WARPSCOUT GUI — демо (gh-pages) v2.6.2m: мобильная подгонка.
   Родный touch-UI приложения (css/touch.css: нижняя навигация, главная)
   включается флагом TOUCH_UI (js/wsg/01-platform.js): IS_ANDROID (APK-мост)
   или URL-параметр ?touch=1. В браузере на телефоне мок Neutralino даёт
   NL_OS="" → IS_ANDROID=false, поэтому Pages показывал сжатый
   десктоп-вид. Скрипт живёт ТОЛЬКО в демо-копии (desktop-app/resources
   не изменяются) и до первого рендера добавляет ?touch=1 — вид на
   телефоне совпадает с Android-версией приложения.
   Escape: ?touch=0 — принудительный десктопный вид на любом устройстве. */
(function () {
  "use strict";
  try {
    var q = String((typeof location === "object" && location) ? location.search : "");
    /* touch=1 — уже включён; touch=0 — явный escape пользователя */
    if (/(?:^|[?&])touch=(0|1)/.test(q)) return;
    var ua = String(navigator.userAgent || "");
    var mobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)
      || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)); /* iPadOS 13+ маскируется под Mac */
    var coarse = false, noHover = false;
    try {
      coarse = matchMedia("(pointer: coarse)").matches;
      noHover = matchMedia("(hover: none)").matches;
    } catch (e) { /* старые WebView: остаётся UA-проверка */ }
    /* десктоп (в т.ч. с тачскрином: pointer:fine или hover:hover) — не трогаем */
    if (!mobile && !(coarse && noHover)) return;
    location.replace(location.pathname + (q ? q + "&" : "?") + "touch=1" + String(location.hash || ""));
  } catch (e) { /* демо не должно падать никогда */ }
})();
'''
touch_dst = os.path.join(DST, 'js', 'demo-touch.js')
with open(touch_dst, 'w', encoding='utf-8') as f:
    f.write(DEMO_TOUCH_JS)
assert html.count('</head>') == 1, "ожидался ровно один </head> в index.html"
html = html.replace('</head>', '  <script src="js/demo-touch.js?v=' + ver + '"></script>\n</head>')
open(idx, 'w', encoding='utf-8').write(html)

print('demo synced (python):', count, 'files ->', DST, '| cache-buster ?v=' + ver)
PYEOF
