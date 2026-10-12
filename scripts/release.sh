#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# WARPScoutGUI — параметризованный GitHub-публикатор релиза.
# v2.5.9 (аудит SEC-8): без путей среды разработки — PROJ вычисляется
# из расположения репозитория, токен берётся из окружения.
#
# Использование:
#   WS_VERSION=2.5.9 bash scripts/release.sh
#     (или: bash scripts/release.sh 2.5.9)
#
# Параметры:
#   WS_VERSION       — версия релиза (иначе берётся из neutralino.config.json)
#   WS_GH_TOKEN      — GitHub PAT с правом Contents: Read/Write.
#                      Передавайте через окружение/секреты CI, не в argv.
#                      (в CI используйте встроенный GITHUB_TOKEN)
#   WS_GH_REPO       — репозиторий (по умолчанию: origin этого клона)
#
# Что делает: auth-проверка → push main (только fast-forward) → push тега
# vX.Y.Z → создание пререлиза (notes из desktop-app/RELEASE-X.Y.Z.md,
# reuse если уже существует) → загрузка артефактов download/WARPScoutGUI-
# X.Y.Z-* (уже прикреплённые пропускаются) → round-trip-проверка SHA-256.
# Идемпотентен: безопасен к перезапуску, не форсит, ничего не удаляет.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

PROJ="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
cd "$PROJ"

[ -n "${WS_GH_TOKEN:-}" ] || { echo "FATAL: WS_GH_TOKEN не задан (окружение, не argv)"; exit 1; }

VER="${WS_VERSION:-${1:-}}"
if [ -z "$VER" ]; then
  VER="$(python3 -c "import json;print(json.load(open('$PROJ/desktop-app/neutralino.config.json'))['version'])")"
fi
TAG="v$VER"
RNOTES="$PROJ/desktop-app/RELEASE-$VER.md"
DL="$PROJ/download"
RELNAME="WarpScoutGUI $VER (prerelease)"

REPO="${WS_GH_REPO:-}"
if [ -z "$REPO" ]; then
  ORIGIN_URL="$(git config --get remote.origin.url)"
  REPO="$(echo "$ORIGIN_URL" | sed -E 's#.*(github\.com[:/])##; s#\.git$##')"
fi
API="https://api.github.com"
UP="https://uploads.github.com"

ARTIFACTS=(
  "WARPScoutGUI-$VER-win64.zip"
  "WARPScoutGUI-$VER-linux64.zip"
  "WARPScoutGUI-$VER-linux-arm64.zip"
  "WARPScoutGUI-$VER-mac-arm64.zip"
  "WARPScoutGUI-$VER-mac-x64.zip"
  "WARPScoutGUI-$VER-android-arm64.apk"
)

auth=(-H "Authorization: Bearer $WS_GH_TOKEN" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")

# GIT_ASKPASS: git читает токен из окружения-обёртки (токен не попадает
# в argv/URL процессов)
ASKPASS="$(mktemp)"
printf '#!/usr/bin/env bash\ncase "$1" in Username*) echo x-access-token ;; *) printf "%%s" "$WS_GH_TOKEN" ;; esac\n' > "$ASKPASS"
chmod 700 "$ASKPASS"
trap 'rm -f "$ASKPASS"' EXIT
export GIT_ASKPASS="$ASKPASS"

echo "== 1/6 auth check ($REPO) =="
LOGIN="$(curl -sfS "${auth[@]}" "$API/user" | python3 -c 'import json,sys;print(json.load(sys.stdin)["login"])')"
echo "   authenticated as $LOGIN"

echo "== 2/6 push main (fast-forward only) =="
git push origin main
git fetch origin main >/dev/null 2>&1
[ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] && echo "   main synced: $(git rev-parse --short origin/main)"

echo "== 3/6 push tag $TAG =="
if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "   tag already on remote"
else
  git tag -a "$TAG" -m "WarpScoutGUI $VER — all platforms per release policy" 2>/dev/null || true
  git push origin "$TAG"
  echo "   tag pushed -> $(git rev-parse --short "$TAG")"
fi

echo "== 4/6 create release (or reuse) =="
CODE="$(curl -s -o /dev/null -w '%{http_code}' "${auth[@]}" "$API/repos/$REPO/releases/tags/$TAG")"
if [ "$CODE" = "200" ]; then
  RELID="$(curl -sfS "${auth[@]}" "$API/repos/$REPO/releases/tags/$TAG" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')"
  echo "   release exists (id $RELID) — reusing"
else
  [ -f "$RNOTES" ] || { echo "FATAL: $RNOTES не найден"; exit 1; }
  RELJSON="$(WS_TAG="$TAG" WS_NAME="$RELNAME" WS_NOTES="$RNOTES" python3 - <<'PY'
import json, os
body = open(os.environ["WS_NOTES"], encoding="utf-8").read()
lines = body.splitlines()
if lines and lines[0].startswith("# "):
    body = "\n".join(lines[1:]).strip()
print(json.dumps({
    "tag_name": os.environ["WS_TAG"],
    "target_commitish": "main",
    "name": os.environ["WS_NAME"],
    "body": body,
    "prerelease": True,
    "make_latest": "false",
}, ensure_ascii=False))
PY
)"
  RELID="$(curl -sfS "${auth[@]}" -X POST -H 'Content-Type: application/json; charset=utf-8' -d "$RELJSON" "$API/repos/$REPO/releases" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')"
  echo "   release created (id $RELID)"
fi

echo "== 5/6 upload assets =="
LISTED="$(curl -sfS "${auth[@]}" "$API/repos/$REPO/releases/$RELID/assets?per_page=100" | python3 -c 'import json,sys;print(",".join(a["name"] for a in json.load(sys.stdin)))')"
for f in "${ARTIFACTS[@]}"; do
  [ -f "$DL/$f" ] || { echo "FATAL: нет артефакта $DL/$f"; exit 1; }
  if [[ ",$LISTED," == *",$f,"* ]]; then echo "   $f уже прикреплён"; continue; fi
  case "$f" in
    *.apk) CT="application/vnd.android.package-archive" ;;
    *)     CT="application/zip" ;;
  esac
  echo "   uploading $f ($(stat -c%s "$DL/$f") bytes)"
  curl -sfS "${auth[@]}" -X POST -H "Content-Type: $CT" --data-binary @"$DL/$f" \
    "$UP/repos/$REPO/releases/$RELID/assets?name=$f" -o /dev/null
done

echo "== 6/6 round-trip sha256 verification =="
VERIFY_DIR="$(mktemp -d)"
curl -sfS "${auth[@]}" "$API/repos/$REPO/releases/tags/$TAG" \
  | python3 -c 'import json,sys;[print(a["browser_download_url"]) for a in json.load(sys.stdin)["assets"]]' > "$VERIFY_DIR/urls.txt"
N="$(wc -l < "$VERIFY_DIR/urls.txt")"
[ "$N" -eq "${#ARTIFACTS[@]}" ] || { echo "FATAL: ожидалось ${#ARTIFACTS[@]} ассетов, в списке $N"; exit 1; }
( cd "$VERIFY_DIR" && while read -r u; do curl -sfSL -O "$u"; done < urls.txt )
FAIL=0
for f in "${ARTIFACTS[@]}"; do
  L="$(sha256sum "$DL/$f" | cut -d" " -f1)"
  R="$(sha256sum "$VERIFY_DIR/$f" | cut -d" " -f1)"
  if [ "$L" = "$R" ]; then echo "   OK   $f  ${L:0:12}…"; else echo "   FAIL $f  local=$L remote=$R"; FAIL=1; fi
done
[ "$FAIL" -eq 0 ] || exit 1

echo
echo "ALL GOOD: $TAG published — https://github.com/$REPO/releases/tag/$TAG"
