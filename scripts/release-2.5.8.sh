#!/usr/bin/env bash
# One-shot GitHub publisher for WARPScoutGUI v2.5.8.
# Prereq: token saved at /tmp/ghtoken (chmod 600). Same fine-grained PAT
# (Contents: Read/Write) that was used for the v2.5.7 release.
# Steps: auth check -> push main (fast-forward only) -> push tag v2.5.8 ->
#        create prerelease (reuse if exists) -> upload 6 assets (skip attached)
#        -> round-trip sha256 verification of every asset.
# Resumable: safe to re-run; never force-pushes; never deletes anything.
set -euo pipefail

REPO="RVMXL/WarpScoutGUI-AWG"
API="https://api.github.com"
UP="https://uploads.github.com"
TAG="v2.5.8"
TOKEN_FILE="/tmp/ghtoken"
PROJ="/home/z/my-project"
DL="$PROJ/download"
RNOTES="$PROJ/desktop-app/RELEASE-2.5.8.md"
RELNAME="WarpScoutGUI 2.5.8 — android-fix: перенос данных в общую папку и запуск warpscout (пререлиз)"

ARTIFACTS=(
  WARPScoutGUI-2.5.8-win64.zip
  WARPScoutGUI-2.5.8-linux64.zip
  WARPScoutGUI-2.5.8-linux-arm64.zip
  WARPScoutGUI-2.5.8-mac-arm64.zip
  WARPScoutGUI-2.5.8-mac-x64.zip
  WARPScoutGUI-2.5.8-android-arm64.apk
)

[ -s "$TOKEN_FILE" ] || { echo "FATAL: $TOKEN_FILE missing/empty — save the token first (chmod 600)"; exit 1; }
TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"
auth=(-H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")

echo "== 1/6 auth check =="
LOGIN="$(curl -sfS "${auth[@]}" "$API/user" | python3 -c 'import json,sys;print(json.load(sys.stdin)["login"])')"
[ "$LOGIN" = "RVMXL" ] || { echo "FATAL: unexpected login '$LOGIN'"; exit 1; }
echo "   authenticated as $LOGIN"

echo "== 2/6 push main (fast-forward only) =="
cd "$PROJ"
AHEAD="$(git rev-list --count origin/main..main)"
[ "$AHEAD" -ge 1 ] || echo "   main already up to date"
git push origin main
git fetch origin main >/dev/null 2>&1
[ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] && echo "   main synced: $(git rev-parse --short origin/main)"

echo "== 3/6 push tag $TAG =="
if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "   tag already on remote"
else
  git push origin "$TAG"
  echo "   tag pushed -> $(git rev-parse --short "$TAG")"
fi

echo "== 4/6 create release (or reuse) =="
CODE="$(curl -s -o /dev/null -w '%{http_code}' "${auth[@]}" "$API/repos/$REPO/releases/tags/$TAG")"
if [ "$CODE" = "200" ]; then
  RELID="$(curl -sfS "${auth[@]}" "$API/repos/$REPO/releases/tags/$TAG" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')"
  echo "   release exists (id $RELID) — reusing"
else
  RELJSON="$(python3 - "$RNOTES" "$RELNAME" <<'PY'
import json, sys
body = open(sys.argv[1], encoding="utf-8").read()
lines = body.splitlines()
if lines and lines[0].startswith("# "):
    body = "\n".join(lines[1:]).strip()
payload = {
    "tag_name": "v2.5.8",
    "target_commitish": "main",
    "name": sys.argv[2],
    "body": body,
    "prerelease": True,
    "make_latest": "false",
}
print(json.dumps(payload, ensure_ascii=False))
PY
)"
  RELID="$(curl -sfS "${auth[@]}" -X POST -H 'Content-Type: application/json; charset=utf-8' -d "$RELJSON" "$API/repos/$REPO/releases" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')"
  echo "   release created (id $RELID)"
fi

echo "== 5/6 upload assets =="
LISTED="$(curl -sfS "${auth[@]}" "$API/repos/$REPO/releases/$RELID/assets?per_page=100" | python3 -c 'import json,sys;print(",".join(a["name"] for a in json.load(sys.stdin)))')"
for f in "${ARTIFACTS[@]}"; do
  [ -f "$DL/$f" ] || { echo "FATAL: missing artifact $DL/$f"; exit 1; }
  if [[ ",$LISTED," == *",$f,"* ]]; then echo "   $f already attached"; continue; fi
  case "$f" in
    *.apk) CT="application/vnd.android.package-archive" ;;
    *)     CT="application/zip" ;;
  esac
  echo "   uploading $f ($(stat -c%s "$DL/$f") bytes)"
  curl -sfS "${auth[@]}" -X POST -H "Content-Type: $CT" --data-binary @"$DL/$f" \
    "$UP/repos/$REPO/releases/$RELID/assets?name=$f" -o /dev/null
done

echo "== 6/6 round-trip sha256 verification =="
VERIFY_DIR="/tmp/rel258-verify"
rm -rf "$VERIFY_DIR" && mkdir -p "$VERIFY_DIR"
curl -sfS "${auth[@]}" "$API/repos/$REPO/releases/tags/$TAG" \
  | python3 -c 'import json,sys;[print(a["browser_download_url"]) for a in json.load(sys.stdin)["assets"]]' > "$VERIFY_DIR/urls.txt"
N=$(wc -l < "$VERIFY_DIR/urls.txt")
[ "$N" -eq 6 ] || { echo "FATAL: expected 6 assets, listed $N"; exit 1; }
( cd "$VERIFY_DIR" && while read -r u; do curl -sfSL -O "$u"; done < urls.txt )
FAIL=0
for f in "${ARTIFACTS[@]}"; do
  L="$(sha256sum "$DL/$f" | cut -d" " -f1)"
  R="$(sha256sum "$VERIFY_DIR/$f" | cut -d" " -f1)"
  if [ "$L" = "$R" ]; then echo "   OK   $f  ${L:0:12}…"; else echo "   FAIL $f  local=$L remote=$R"; FAIL=1; fi
done
[ "$FAIL" -eq 0 ] || exit 1

echo
echo "ALL GOOD: v2.5.8 published — https://github.com/$REPO/releases/tag/$TAG"
echo "Post-release manual steps: flip landing refs (route.ts app->302 v2.5.8 zip, page.tsx 'published release' -> v2.5.8), sync gh-pages demo (mock 2.5.8), commit+push."
