#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# WARPSCOUT GUI — сборка Android APK (v2.5.2)
# Тулчейн: aapt2 + javac + d8 + zipalign + apksigner (без Gradle).
# Путь к SDK-компонентам: SDK_DIR (android-34 platform + build-tools 34).
# Выход: download/WARPScoutGUI-<ver>-android-arm64.apk
# Обновление поверх: package/ключ фиксированы (keystore/warpscout.keystore).
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
A="$ROOT/desktop-app/android"
SDK_DIR="${SDK_DIR:-/tmp/android-sdk}"
BT="$SDK_DIR/android-14"              # build-tools 34 (aapt2/d8/apksigner/zipalign)
PLATFORM="$SDK_DIR/android-34/android.jar"
JDK_BIN="$SDK_DIR/jdk/bin"
VER="$(python3 -c "import json;print(json.load(open('$A/../neutralino.config.json'))['version'])")"
# v2.6.2 (аудит INFRA-F): формула versionCode ЕДИНСТВЕННАЯ — в gen-version.py
# (major*10000 + minor*100 + patch, с таблицей-тестом). Здесь только потребитель.
VERCODE="$(python3 "$A/../tools/gen-version.py" --vcode)"
OUT="$ROOT/download/WARPScoutGUI-$VER-android-arm64.apk"

KS="$A/keystore/warpscout.keystore"
KSPASS="${KSPASS:?set KSPASS env var (keystore password)}"
export KSPASS # v2.6.2 (аудит AND-3): пароль идёт в apksigner через env, не через argv

BUILD="$A/build"
WWW="$BUILD/www"

export PATH="$JDK_BIN:$PATH"

echo "→ версия $VER (versionCode $VERCODE)"

# ── 1. assets: resources + Android-шим вместо neutralino.js ──
rm -rf "$BUILD"
mkdir -p "$WWW/js"
cp -r "$ROOT/desktop-app/resources/." "$WWW/"
rm -f "$WWW/js/neutralino.js" "$WWW/js/neutralino.d.ts"
# v2.5.0 (аудит A3): Android читает www/ напрямую, neu-бандл — мёртвый груз
rm -f "$WWW/resources.neu"
cp "$A/www/js/neutralino-android.js" "$WWW/js/neutralino-android.js"
python3 - "$WWW" << 'EOF'
import sys
www = sys.argv[1]
p = www + "/index.html"
src = open(p).read()
assert '<script src="js/neutralino.js"></script>' in src, "neutralino.js tag not found"
src = src.replace('<script src="js/neutralino.js"></script>',
                  '<script src="js/neutralino-android.js"></script>')
open(p, "w").write(src)
print("   www/index.html: neutralino.js → neutralino-android.js")
EOF

# ── 2. jniLibs: warpscout android_arm64 как libwarpscout.so ──
# Путь в APK обязан быть lib/arm64-v8a/ — иначе PackageManager НЕ извлечёт
# библиотеку (nativeLibraryDir будет пуст, warpscout не запустится).
# v2.6.2 (аудит AND-2): ядро сверяется с SHA-256-пином deps.json ДО копии —
# подмена/чужая версия бинаря в /tmp/ws-android валит сборку явно.
WARPS_VER="$(python3 -c "import json;print(json.load(open('$A/../tools/deps.json'))['warpscout']['version'])")"
EXPECTED_SO="$(python3 -c "import json;print(json.load(open('$A/../tools/deps.json'))['files']['pkg/WARPScoutGUI-android/libwarpscout.so']['sha256'])")"
mkdir -p "$BUILD/lib/arm64-v8a"
WS_SRC="/tmp/ws-android/warpscout"
if [ ! -f "$WS_SRC" ]; then
  echo "✗ $WS_SRC не найден — python3 tools/fetch-binaries.py --latest-published (или warpscout_${WARPS_VER}_android_arm64.tar.gz)" >&2
  exit 1
fi
ACTUAL_SO="$(sha256sum "$WS_SRC" | cut -d' ' -f1)"
if [ "$ACTUAL_SO" != "$EXPECTED_SO" ]; then
  echo "✗ SHA-256 ядра warpscout (android) не совпадает с пином tools/deps.json (аудит AND-2):" >&2
  echo "   ждали $EXPECTED_SO" >&2
  echo "   факт  $ACTUAL_SO" >&2
  echo "   Положите в /tmp/ws-android/warpscout бинарь версии ${WARPS_VER} (релиз v${WARPS_VER} vernette/warpscout)." >&2
  exit 1
fi
cp "$WS_SRC" "$BUILD/lib/arm64-v8a/libwarpscout.so"
chmod 755 "$BUILD/lib/arm64-v8a/libwarpscout.so"

# ── 3. ресурсы: aapt2 compile+link ──
# v2.5.1 (fix): aapt2 link --version-code НЕ перебивает явно заданный
# android:versionCode в манифесте (эмпирически: APK 2.5.1 получил 20500
# вместо 20501). Синхронизируем манифест из config — единый источник версии.
sed -i -E \
  -e "s/android:versionCode=\"[0-9]+\"/android:versionCode=\"$VERCODE\"/" \
  -e "s/android:versionName=\"[^\"]*\"/android:versionName=\"$VER\"/" \
  "$A/AndroidManifest.xml"
"$BT/aapt2" compile --dir "$A/res" -o "$BUILD/res.zip"
"$BT/aapt2" link -o "$BUILD/base.apk" \
  -I "$PLATFORM" \
  --manifest "$A/AndroidManifest.xml" \
  -A "$WWW" \
  "$BUILD/res.zip" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$VERCODE" --version-name "$VER" \
  --auto-add-overlay
# нативная библиотека добавляется по пути lib/arm64-v8a/… (сжатой;
# extractNativeLibs=true — PackageManager распакует в nativeLibraryDir)
(cd "$BUILD" && zip -q -r "$BUILD/base.apk" lib)

# ── 4. java → dex ──
# v2.6.2 (аудит INFRA-J): stderr javac не глотается — ошибка компиляции
# валит сборку с полным выводом; предупреждения печатаются отдельно.
mkdir -p "$BUILD/classes" "$BUILD/dex"
if ! "$JDK_BIN/javac" -source 8 -target 8 \
  -bootclasspath "$PLATFORM:$BT/core-lambda-stubs.jar" -classpath "$PLATFORM" \
  -d "$BUILD/classes" \
  "$A/java/ru/warpscout/gui/MainActivity.java" \
  "$A/java/ru/warpscout/gui/WsFileProvider.java" 2> "$BUILD/javac.err"; then
  cat "$BUILD/javac.err" >&2
  exit 1
fi
grep -v "^warning:" "$BUILD/javac.err" >&2 || true
find "$BUILD/classes" -name "*.class" > "$BUILD/classlist.txt"
"$BT/d8" --release --lib "$PLATFORM" --min-api 24 \
  --output "$BUILD/dex" $(cat "$BUILD/classlist.txt")
(cd "$BUILD/dex" && zip -q -j "$BUILD/base.apk" classes.dex)

# ── 5. zipalign + подпись (ключ фиксирован — апдейты поверх старых версий) ──
"$BT/zipalign" -f -p 4 "$BUILD/base.apk" "$BUILD/aligned.apk"

if [ ! -f "$KS" ]; then
  echo "→ генерация ключа подписи $KS"
  "$JDK_BIN/keytool" -genkeypair -keystore "$KS" -alias warpscout \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KSPASS" -keypass "$KSPASS" \
    -dname "CN=WARPScoutGUI,O=AWG,C=RU"
fi
"$BT/apksigner" sign --ks "$KS" --ks-key-alias warpscout \
  --ks-pass "env:KSPASS" --key-pass "env:KSPASS" \
  --out "$OUT" "$BUILD/aligned.apk"
"$BT/apksigner" verify "$OUT" && echo "   apksigner verify: OK"

ls -la "$OUT" && sha256sum "$OUT"
echo "✓ APK собран: $OUT"
