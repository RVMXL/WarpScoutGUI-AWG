#!/usr/bin/env bash
# WARPScoutGUI — синхронизация браузерного демо (public/gui-demo) с ресурсами
# десктоп-приложения (desktop-app/resources). КАНОНИЧЕСКИЙ скрипт (v2.6.2, аудит
# INFRA-L: раньше жили два расходящихся копипаста — scripts/sync-demo.sh и этот;
# правка одного не попадала в другой. Теперь источник здесь, корневой путь —
# обёртка, передающая аргументы).
#
# Демо отличается от ресурсов приложения ровно двумя вещами:
#   1) НЕ подключается js/neutralino.js — реальный клиент определяет window.Neutralino
#      до mock.js, и guard мока «return» убивает демо (мок должен переопределить
#      Neutralino сам — см. guard в mock.js);
#   2) cache-busters ?v=... меняются на демо-свои (параметр VER ниже).
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
html = re.sub(r'\?v=[0-9a-z]+', '?v=' + ver, html)
open(idx, 'w', encoding='utf-8').write(html)

# 3) лишние для веба файлы
for extra in ['js/neutralino.js', 'js/neutralino.d.ts']:
    p = os.path.join(DST, extra)
    if os.path.exists(p):
        os.remove(p)

print('demo synced (python):', count, 'files ->', DST, '| cache-buster ?v=' + ver)
PYEOF
