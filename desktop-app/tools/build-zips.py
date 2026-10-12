#!/usr/bin/env python3
# WARPScoutGUI — детерминированная сборка release-zip из pkg/.
# Формат идентичен релизу 2.4.6: ровно 9 записей (README, бинарь GUI,
# resources.neu, bin/warpscout[.exe], licenses/ + 4 лицензии), порядок
# записей как в релизе, таймстампы 1980-01-01, unix-режимы
# (755 — бинари, 664 — данные, 775 — каталог licenses/), deflate.
# Использование: python3 tools/build-zips.py [имя_пакета ...]
import json, os, re, sys, zipfile

VER = "2.6.1"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PKG = os.path.join(ROOT, "pkg")
OUT = os.path.join(os.path.dirname(ROOT), "download")

# v2.6.2 (аудит INFRA-D): VER сверяется с единым источником версии —
# рассинхрон валит сборку ДО упаковки, а не в поле у пользователя.
with open(os.path.join(ROOT, "neutralino.config.json"), encoding="utf-8") as _f:
    _CFG_VER = json.load(_f)["version"]
if VER != _CFG_VER:
    sys.exit(f"build-zips: VER {VER} ≠ neutralino.config.json ({_CFG_VER}) — запустите python3 tools/gen-version.py")

# v2.6.2 (аудит INFRA-E): версия warpscout — единственный источник tools/deps.json
# (тот же пин, что сверяют verify-deps.py/build-apk.sh/fetch-binaries.py).
# Литералы в коде сборки больше не допускаются: тихое рассогласование
# («скачайте 0.16.0» при фактической потребности в другой версии) исключено.
with open(os.path.join(ROOT, "tools", "deps.json"), encoding="utf-8") as _f:
    WS_VER = json.load(_f)["warpscout"]["version"]

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

def stamp_footer(text):
    """v2.6.2 (аудит INFRA-D): футер README печатается из единого источника
    версии. gen-version патчил заголовок/статус, но не последнюю строку —
    в 4 из 5 zip v2.6.1 осталась v2.5.6. Теперь zip собирается только с
    верным футером, откуда бы ни читался README.txt."""
    new, n = re.subn(r" WARPSCOUT GUI v\d+\.\d+\.\d+ · warpscout v",
                     f" WARPSCOUT GUI v{VER} · warpscout v", text)
    if n == 0:
        new = text.rstrip("\n") + f"\n\n WARPSCOUT GUI v{VER} · warpscout v{WS_VER}\n"
    return new

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
        # v2.6.2 (аудит INFRA-D): README в zip идёт с футером из VER
        with open(entries[0][1], encoding="utf-8") as f:
            zf.writestr(zi("README.txt", 0o664), stamp_footer(f.read()))
        for arc, disk, mode in entries[1:4]:  # GUI, neu, bin/warpscout
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
