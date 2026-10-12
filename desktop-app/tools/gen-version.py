#!/usr/bin/env python3
# WARPScoutGUI — кодогенерация версии из единого источника (v2.6.0, аудит ARCH-2).
# Единственный источник версии — neutralino.config.json ("version").
# Всё остальное генерируется/патчится отсюда:
#   • resources/js/mock.js        — window.NL_APPVERSION
#   • resources/index.html        — кэш-бастер ?v=… и статичный текст сайдбара
#   • tools/build-zips.py         — VER (имена release-zip)
#   • pkg/*/README.txt            — заголовок «WARPSCOUT GUI vX.Y.Z — …»,
#                                   «Статус выпуска: ПРЕРЕЛИЗ X.Y.Z …»,
#                                   «СТАТУС ВЕРИФИКАЦИИ (ПРЕРЕЛИЗ X.Y.Z)»
#   • android/AndroidManifest.xml — versionCode / versionName
# (build-apk.sh дополнительно синхронизирует манифест сам — двойная страховка.)
#
# Использование:
#   python3 tools/gen-version.py           — применить (идемпотентно)
#   python3 tools/gen-version.py --check   — только проверить (для CI), exit 1 при расхождении
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def version():
    with open(os.path.join(ROOT, "neutralino.config.json"), encoding="utf-8") as f:
        return json.load(f)["version"]

def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()

def write(rel, text):
    with open(os.path.join(ROOT, rel), "w", encoding="utf-8") as f:
        f.write(text)

def sub(rel, pattern, repl, text, required=True):
    new, n = re.subn(pattern, repl, text)
    if required and n == 0:
        sys.exit(f"gen-version: паттерн не найден в {rel}: {pattern}")
    return new

def targets(ver):
    """[(rel_path, patch_fn(text)->text)] — все точки, зависящие от версии."""
    vcode = "2%02d%02d" % (int(ver.split(".")[1]), int(ver.split(".")[2]))
    buster = "v" + ver
    return [
        ("resources/js/mock.js", lambda t: sub("mock.js",
            r'window\.NL_APPVERSION = "[^"]+"',
            f'window.NL_APPVERSION = "{ver}"', t)),
        ("resources/index.html", lambda t: sub("index.html",
            r'\?v=\d+v\d+|\?v=v\d+\.\d+\.\d+',
            f'?v={buster}', t)),
        ("resources/index.html", lambda t: sub("index.html (sidebar)",
            r'WARPSCOUT GUI v\d+\.\d+\.\d+ · warpscout v',
            f'WARPSCOUT GUI v{ver} · warpscout v', t)),
        ("tools/build-zips.py", lambda t: sub("build-zips.py",
            r'VER = "\d+\.\d+\.\d+"',
            f'VER = "{ver}"', t)),
        ("android/AndroidManifest.xml", lambda t: sub("AndroidManifest.xml (code)",
            r'android:versionCode="\d+"',
            f'android:versionCode="{vcode}"', t)),
        ("android/AndroidManifest.xml", lambda t: sub("AndroidManifest.xml (name)",
            r'android:versionName="[^"]+"',
            f'android:versionName="{ver}"', t)),
    ]

def pkg_readme_targets(ver):
    """pkg/*/README.txt: заголовок и статус-строки — версия патчится независимо от платформы."""
    pkg = os.path.join(ROOT, "pkg")
    out = []
    if os.path.isdir(pkg):
        for name in sorted(os.listdir(pkg)):
            rel = os.path.join("pkg", name, "README.txt")
            if not os.path.isfile(os.path.join(ROOT, rel)):
                continue
            def patch(t, rel=rel):
                t = sub(rel, r'WARPSCOUT GUI v\d+\.\d+\.\d+ — ', f'WARPSCOUT GUI v{ver} — ', t)
                t = sub(rel, r'Статус выпуска: ПРЕРЕЛИЗ \d+\.\d+\.\d+', f'Статус выпуска: ПРЕРЕЛИЗ {ver}', t, required=False)
                t = sub(rel, r'СТАТУС ВЕРИФИКАЦИИ \(ПРЕРЕЛИЗ \d+\.\d+\.\d+\)', f'СТАТУС ВЕРИФИКАЦИИ (ПРЕРЕЛИЗ {ver})', t, required=False)
                # v2.6.2 (аудит INFRA-D): футер (последняя строка) больше не слепая зона
                t = sub(rel, r' WARPSCOUT GUI v\d+\.\d+\.\d+ · warpscout v',
                        f' WARPSCOUT GUI v{ver} · warpscout v', t, required=False)
                return t
            out.append((rel, patch))
    return out

def main():
    check = "--check" in sys.argv[1:]
    ver = version()
    dirty = []
    all_targets = targets(ver) + pkg_readme_targets(ver)
    for rel, patch in all_targets:
        old = read(rel)
        new = patch(old)
        if new != old:
            if check:
                dirty.append(rel)
            else:
                write(rel, new)
                print(f"OK  {rel} → {ver}")
    if check:
        if dirty:
            print("MISMATCH (запусти python3 tools/gen-version.py):")
            for rel in dirty:
                print("  " + rel)
            sys.exit(1)
        print(f"OK  версия согласована везде: {ver}")

if __name__ == "__main__":
    main()
