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
#   python3 tools/gen-version.py --vcode   — напечатать versionCode для версии config
#                                            (единственный потребитель формулы — build-apk.sh)
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def version():
    with open(os.path.join(ROOT, "neutralino.config.json"), encoding="utf-8") as f:
        return json.load(f)["version"]

def version_code(ver):
    """v2.6.2 (аудит INFRA-F): ЕДИНСТВЕННАЯ формула versionCode —
    major*10000 + minor*100 + patch. Раньше здесь жила вторая формула
    (2%02d%02d — без учёта мажора, коллизия 2.0.0 ↔ 3.0.0), а build-apk.sh —
    третья-inline. Обновление поверх (Store/adb) требует монотонности: одна
    формула, один потребитель-кодеген, таблица-тест ниже (запускается в --check)."""
    parts = [int(p) for p in str(ver).split(".")]
    while len(parts) < 3:
        parts.append(0)
    if len(parts) != 3 or any(p < 0 or p > 99 for p in parts):
        raise ValueError(f"gen-version: версия {ver} вне формата X.Y.Z (компоненты 0..99)")
    return parts[0] * 10000 + parts[1] * 100 + parts[2]

VCODE_TABLE = {
    # таблица-тест соответствия версия→code на ближайшие версии (аудит INFRA-F):
    # монотонный рост, нет коллизий 2.x ↔ 3.x (старая формула давала 2.0.0 == 3.0.0)
    "2.0.0": 20000, "2.6.1": 20601, "2.6.2": 20602, "2.10.0": 21000,
    "2.99.99": 29999, "3.0.0": 30000, "3.0.1": 30001, "3.1.0": 30100,
    "4.0.0": 40000, "10.0.0": 100000,
}

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
    vcode = str(version_code(ver))
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
    if "--vcode" in sys.argv[1:]:
        print(version_code(version()))
        return
    ver = version()
    # таблица-тест формулы versionCode (аудит INF-F): гоняется в каждом --check
    # (в т.ч. в CI) — расхождение формула↔эталон валит сборку, а не Store-обновление
    for tv, tc in VCODE_TABLE.items():
        got = version_code(tv)
        if got != tc:
            sys.exit(f"gen-version: таблица-тест versionCode провалена: {tv} → {got}, ожидалось {tc}")
    if len(set(VCODE_TABLE.values())) != len(VCODE_TABLE):
        sys.exit("gen-version: коллизия versionCode в таблице-тесте")
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
