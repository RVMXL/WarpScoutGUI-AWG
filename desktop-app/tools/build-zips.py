#!/usr/bin/env python3
# WARPScoutGUI — детерминированная сборка release-zip из pkg/.
# Формат идентичен релизу 2.4.6: ровно 9 записей (README, бинарь GUI,
# resources.neu, bin/warpscout[.exe], licenses/ + 4 лицензии), порядок
# записей как в релизе, таймстампы 1980-01-01, unix-режимы
# (755 — бинари, 664 — данные, 775 — каталог licenses/), deflate.
# Использование: python3 tools/build-zips.py [имя_пакета ...]
import os, sys, zipfile

VER = "2.6.1"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, "pkg")
OUT = os.path.join(os.path.dirname(ROOT), "download")

DT = (1980, 1, 1, 0, 0, 0)
# порядок записей как в релизе 2.4.6
LIC_ORDER = ["qrcode", "AWG", "warpscout", "neutralino"]

def zi(name, mode, is_dir=False):
    z = zipfile.ZipInfo(name, date_time=DT)
    z.create_system = 3   # unix
    z.create_version = 30 # как Info-ZIP 3.0
    attr = (mode << 16) | (0x10 if is_dir else 0x20)  # DOS-атрибуты
    z.external_attr = attr
    z.compress_type = zipfile.ZIP_DEFLATED if not is_dir else zipfile.ZIP_STORED
    return z

def build(name):
    d = os.path.join(PKG, f"WARPScoutGUI-{name}")
    if not os.path.isdir(d):
        sys.exit(f"нет каталога {d}")
    binexe, guiexe = ("warpscout.exe", "WARPScoutGUI.exe") if name == "win64" \
        else ("warpscout", "WARPScoutGUI")
    out = os.path.join(OUT, f"WARPScoutGUI-{VER}-{name}.zip")
    entries = [
        ("README.txt",       os.path.join(d, "README.txt"),       0o664),
        (guiexe,             os.path.join(d, guiexe),             0o755),
        ("resources.neu",    os.path.join(d, "resources.neu"),    0o664),
        (f"bin/{binexe}",    os.path.join(d, "bin", binexe),      0o755),
    ] + [
        (f"licenses/LICENSE-{lic}.txt",
         os.path.join(d, "licenses", f"LICENSE-{lic}.txt"), 0o664)
        for lic in LIC_ORDER
    ]
    with zipfile.ZipFile(out, "w") as zf:
        for arc, disk, mode in entries[:4]:  # README, GUI, neu, bin/warpscout
            with open(disk, "rb") as f:
                zf.writestr(zi(arc, mode), f.read())
        zf.writestr(zi("licenses/", 0o775, is_dir=True), b"")
        for arc, disk, mode in entries[4:]:  # лицензии
            with open(disk, "rb") as f:
                zf.writestr(zi(arc, mode), f.read())
    print(f"OK  {out}")

def main():
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or ["win64", "linux64", "linux-arm64", "mac-arm64", "mac-x64"]
    for n in names:
        build(n)

if __name__ == "__main__":
    main()
