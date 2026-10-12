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
# Что делает: pre-flight проверки релизной политики (fail-fast, см. WS_FORCE) →
# гейт CI на коммите тега (публикация не уезжает при красной/непрогнанной сборке)
# → auth-проверка → push main (только fast-forward) → push тега vX.Y.Z → создание
# пререлиза (notes из desktop-app/RELEASE-X.Y.Z.md, reuse если уже существует) →
# загрузка артефактов download/WARPScoutGUI-X.Y.Z-* (уже прикреплённые пропускаются)
# → round-trip-проверка SHA-256. Идемпотентен: безопасен к перезапуску, не форсит,
# ничего не удаляет.
#
# v2.6.2 (аудит INFRA-K/SEC-A5): секреты не в argv и не в разбросанных /tmp-файлах —
# все временные файлы живут в одном mktemp-каталоге (0700) с trap-очисткой
# EXIT/INT/TERM; токен в curl идёт через --header @файл (0600), а не аргументом.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

PROJ="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
cd "$PROJ"

[ -n "${WS_GH_TOKEN:-}" ] || { echo "FATAL: WS_GH_TOKEN не задан (окружение, не argv)"; exit 1; }

# v2.6.2 (INFRA-K): один временный каталог на всё (askpass, curl-заголовки, round-trip)
TMPD="$(mktemp -d)"
chmod 700 "$TMPD"
cleanup() { rm -rf "$TMPD"; }
trap cleanup EXIT INT TERM

VER="${WS_VERSION:-${1:-}}"
if [ -z "$VER" ]; then
  VER="$(python3 -c "import json;print(json.load(open('$PROJ/desktop-app/neutralino.config.json'))['version'])")"
fi
TAG="v$VER"
RNOTES="$PROJ/desktop-app/RELEASE-$VER.md"
DL="$PROJ/download"
RELNAME="WarpScoutGUI $VER (prerelease)"

# v2.6.2 (аудит INFRA-G): pre-flight проверки — FATAL при нарушении.
# Мягкий режим — только за явным WS_FORCE=1 (с логом причины).
FORCE="${WS_FORCE:-}"
PFAIL=0
pfail() { echo "FATAL (preflight): $1"; PFAIL=$((PFAIL+1)); }

echo "== 0/6 pre-flight (release policy, fail-fast) =="
python3 desktop-app/tools/gen-version.py --check >/dev/null || pfail "версии не согласованы — запустите python3 desktop-app/tools/gen-version.py"
grep -q "## \[$VER\]" CHANGELOG.md || pfail "в CHANGELOG.md нет секции [$VER] — заполните перед публикацией"
[ -f "$RNOTES" ] || pfail "нет $RNOTES — примечания релиза обязательны"

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

for f in "${ARTIFACTS[@]}"; do
  [ -f "$DL/$f" ] || pfail "нет собранного артефакта $DL/$f (сборка артефактов — часть релизной политики)"
done
if [ "$PFAIL" -gt 0 ]; then
  if [ "$FORCE" = "1" ]; then
    echo "WS_FORCE=1 — продолжаем вопреки $PFAIL незакрытым pre-flight проверкам (причина должна быть в логе релиза)"
  else
    exit 1
  fi
fi

# v2.6.2 (аудит SEC-A5): токен не в argv — curl читает заголовки из файла 0600
# (--header @файл); файл в TMPD, удаляется trap-ом вместе с каталогом
HDRS="$TMPD/headers"
printf 'Authorization: Bearer %s\nAccept: application/vnd.github+json\nX-GitHub-Api-Version: 2022-11-28\n' "$WS_GH_TOKEN" > "$HDRS"
chmod 600 "$HDRS"
auth=(-H "@$HDRS")

# GIT_ASKPASS: git читает токен из окружения-обёртки (токен не попадает
# в argv/URL процессов)
ASKPASS="$TMPD/askpass"
printf '#!/usr/bin/env bash\ncase "$1" in Username*) echo x-access-token ;; *) printf "%%s" "$WS_GH_TOKEN" ;; esac\n' > "$ASKPASS"
chmod 700 "$ASKPASS"
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

# v2.6.2 (аудит INFRA-H): публикация гейтится CI. ci.yml прогоняется и на тегах —
# ждём зелёный прогон «ci» на SHA тега; красный/невыполненный = публикация не уезжает.
# Период ожидания: CI обычно ~2 мин, таймаут 10 мин. Пропуск — только явным
# WS_SKIP_CI_GATE=1 (например, републикация давно проверенного тега).
if [ "${WS_SKIP_CI_GATE:-}" != "1" ]; then
  echo "== 3.5/6 CI gate on $TAG ($(git rev-parse --short HEAD)) =="
  SHA="$(git rev-parse HEAD)"
  DEADLINE=$(( $(date +%s) + 600 ))
  while :; do
    STATUS="$(curl -sfS "${auth[@]}" "$API/repos/$REPO/commits/$SHA/check-runs?per_page=100" \
      | python3 -c '
import json, sys
d = json.load(sys.stdin)
runs = [r for r in d.get("check_runs", []) if r.get("name") == "ci"]
if not runs:
    print("none")
elif any(r["status"] != "completed" for r in runs):
    print("pending")
elif any(r["conclusion"] not in ("success", "skipped", "neutral") for r in runs):
    print("failure")
else:
    print("success")
' 2>/dev/null || echo none)"
    case "$STATUS" in
      success) echo "   CI: success — гейт пройден"; break ;;
      failure) echo "FATAL: CI на $SHA красная — публикация отменена (аудит INFRA-H)"; exit 1 ;;
      *)
        if [ "$(date +%s)" -ge "$DEADLINE" ]; then
          echo "FATAL: CI на $SHA не завершён за 10 мин (статус: $STATUS) — публикация отменена (аудит INFRA-H)"; exit 1
        fi
        echo "   CI: $STATUS — жду…"
        sleep 20
        ;;
    esac
  done
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
VERIFY_DIR="$TMPD/verify" # v2.6.2 (INFRA-K): всё временное — в одном каталоге с trap-очисткой
mkdir -p "$VERIFY_DIR"
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
