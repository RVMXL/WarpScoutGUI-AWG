#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# WARPSCOUT GUI — sync desktop-app/resources → public/gui-demo
# (веб-демо интерфейса на Next.js сайте)
#
# ВАЖНО:
#  1) в веб-демо НЕ должен грузиться реальный js/neutralino.js —
#     он определяет window.Neutralino раньше mock.js и ломает демо.
#  2) копирование выполняется PYTHON-ом: в этой песочнице bash-cp
#     может прочитать устаревшую версию файла из кэш-слоя файловой
#     системы и скопировать мусор (случалось с css). Python-слой
#     читает актуальные байты.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PYEOF'
import os, shutil

SRC = 'desktop-app/resources'
DST = 'public/gui-demo'

# чистим и пересоздаём
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
html = html.replace('<script src="js/neutralino.js"></script>\n', '')
open(idx, 'w', encoding='utf-8').write(html)

# 2) лишние для веба файлы
for extra in ['js/neutralino.js', 'js/neutralino.d.ts']:
    p = os.path.join(DST, extra)
    if os.path.exists(p):
        os.remove(p)

print('demo synced (python):', count, 'files ->', DST)
PYEOF
