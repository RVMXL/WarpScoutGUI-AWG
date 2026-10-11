#!/usr/bin/env bash
# WARPScoutGUI — синхронизация браузерного демо (public/gui-demo) с ресурсами
# десктоп-приложения (desktop-app/resources).
# Демо отличается от ресурсов приложения ровно двумя вещами:
#   1) НЕ подключается js/neutralino.js — реальный клиент определяет window.Neutralino
#      до mock.js, и guard мока «return» убивает демо (мок должен переопределить
#      Neutralino сам — см. guard в mock.js);
#   2) cache-busters ?v=... меняются на демо-свои (параметр VER ниже).
# Использование: tools/sync-demo.sh [версия-бастер]   (по умолчанию 25v0)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VER="${1:-25v0}"
cp "$ROOT/desktop-app/resources/index.html" "$ROOT/public/gui-demo/index.html"
python3 - "$ROOT" "$VER" << 'EOF'
import sys
root, ver = sys.argv[1], sys.argv[2]
p = root + "/public/gui-demo/index.html"
src = open(p).read()
assert '<script src="js/neutralino.js"></script>' in src, "ожидался тег neutralino.js"
src = src.replace('  <script src="js/neutralino.js"></script>\n', '')
import re
src = re.sub(r'\?v=[0-9a-z]+', '?v=' + ver, src)
open(p, "w").write(src)
print("demo index: neutralino.js удалён, cache-buster ?v=%s" % ver)
EOF
for f in css/app.css js/app.js js/mock.js js/qrcode.js; do
  cp "$ROOT/desktop-app/resources/$f" "$ROOT/public/gui-demo/$f"
done
mkdir -p "$ROOT/public/gui-demo/icons"
cp "$ROOT/desktop-app/resources/icons/"*.png "$ROOT/public/gui-demo/icons/"
echo "gui-demo синхронизирован с desktop-app/resources (v-бастер $VER)"
