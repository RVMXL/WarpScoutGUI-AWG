#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# WARPSCOUT GUI — сборка Android APK (v2.5.0)
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
VERCODE="$(python3 -c "import json,sys;v=json.load(open('$A/../neutralino.config.json'))['version'].split('.');print(int(v[0])*10000+int(v[1])*100+int(v[2]))")"
OUT="$ROOT/download/WARPScoutGUI-$VER-android-arm64.apk"

KS="$A/keystore/warpscout.keystore"
KSPASS="${KSPASS:?set KSPASS env var (keystore password)}"

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
mkdir -p "$BUILD/lib/arm64-v8a"
if [ -f "/tmp/ws-android/warpscout" ]; then
  cp /tmp/ws-android/warpscout "$BUILD/lib/arm64-v8a/libwarpscout.so"
else
  echo "✗ /tmp/ws-android/warpscout не найден — скачайте warpscout_0.16.0_android_arm64.tar.gz" >&2
  exit 1
fi
chmod 755 "$BUILD/lib/arm64-v8a/libwarpscout.so"

# ── 3. ресурсы: aapt2 compile+link ──
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
mkdir -p "$BUILD/classes" "$BUILD/dex"
"$JDK_BIN/javac" -source 8 -target 8 \
  -bootclasspath "$PLATFORM:$BT/core-lambda-stubs.jar" -classpath "$PLATFORM" \
  -d "$BUILD/classes" \
  "$A/java/ru/warpscout/gui/MainActivity.java" \
  "$A/java/ru/warpscout/gui/WsFileProvider.java" 2>&1 | grep -v "^warning:" || true
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
  --ks-pass "pass:$KSPASS" --key-pass "pass:$KSPASS" \
  --out "$OUT" "$BUILD/aligned.apk"
"$BT/apksigner" verify "$OUT" && echo "   apksigner verify: OK"

ls -la "$OUT" && sha256sum "$OUT"
echo "✓ APK собран: $OUT"
