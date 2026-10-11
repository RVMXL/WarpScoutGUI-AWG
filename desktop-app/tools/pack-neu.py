#!/usr/bin/env python3
# WARPScoutGUI — resources.neu packer (Neutralino ASAR-like bundle format v4).
# Формат (по нейтральному resources.cpp, reader: server/resources.cpp):
#   u32(4) | u32(headerPaddedLen + 8) | header[headerPaddedLen] | блобы файлов
#   headerPaddedLen = len(json), выровненное вверх до кратности 4
#   оффсеты в манифесте отсчитываются от asarHeaderSize = headerPaddedLen + 16
#   integrity: SHA256 по блокам 4 МБ (blockSize=4194304); у рантайма читаются
#   только size/offset — integrity оставлена для совместимости с neu CLI.
# Детерминированный вывод: сортировка как у neu CLI (config первым, далее
# алфавитный обход resources/), JSON без пробелов.
#
# Использование:
#   python3 tools/pack-neu.py [app_dir] [out]
#   app_dir = папка с neutralino.config.json и resources/, out = путь ресурсов.neu
import json, hashlib, os, struct, sys

def build_manifest(app_dir, files):
    m = {"files": {}}
    off = 0
    for name, disk in files:
        data = open(disk, "rb").read()
        h = hashlib.sha256(data).hexdigest()
        entry = {"size": len(data), "offset": str(off),
                 "integrity": {"algorithm": "SHA256", "hash": h,
                               "blockSize": 4194304, "blocks": [h]},
                 "executable": True}
        parts = name.split("/")
        node = m["files"]
        for p in parts[:-1]:
            node = node.setdefault(p, {"files": {}})["files"]
        node[parts[-1]] = entry
        off += len(data)
    return m

def pack(app_dir, out_path):
    app_dir = os.path.abspath(app_dir)
    # Порядок как у neu CLI: алфавитный обход дерева (папки и файлы вперемешку,
    # побайтово по имени) + neutralino.config.json в корне.
    def walk(dir_abs, prefix):
        entries = sorted(
            [(n, os.path.join(dir_abs, n), True) for n in os.listdir(dir_abs)
             if os.path.isdir(os.path.join(dir_abs, n))]
            + [(n, os.path.join(dir_abs, n), False) for n in os.listdir(dir_abs)
               if not os.path.isdir(os.path.join(dir_abs, n))],
            key=lambda e: e[0].encode())
        for name, full, is_dir in entries:
            if is_dir:
                yield from walk(full, prefix + name + "/")
            elif not name.endswith(".d.ts"):  # как neu CLI: типы — dev-артефакт, в бандл не идут
                yield (prefix + name, full)
    files = [("neutralino.config.json", os.path.join(app_dir, "neutralino.config.json"))]
    files += list(walk(os.path.join(app_dir, "resources"), "resources/"))
    js = json.dumps(build_manifest(app_dir, files),
                    separators=(",", ":"), ensure_ascii=False).encode()
    padded = js + b"\x00" * ((-len(js)) % 4)  # строка манифеста выравнивается до 4 байт
    blobs = bytearray()
    for _, disk in files:
        blobs += open(disk, "rb").read()
    # ASAR/Pickle-заголовок: [4][8+padded][4+padded][len(json)] — читается
    # нейтральным resources.cpp: headerLen = u32[1]-8, блобы с offset 16+headerLen
    out = struct.pack("<IIII", 4, 8 + len(padded), 4 + len(padded), len(js)) + padded + bytes(blobs)
    open(out_path, "wb").write(out)
    print(f"packed {len(files)} files -> {out_path} ({len(out)} bytes, header {len(padded)})")
    return len(out)

if __name__ == "__main__":
    app_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(app_dir, "pkg", "WARPScoutGUI", "resources.neu")
    pack(app_dir, out)
