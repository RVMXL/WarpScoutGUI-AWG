#!/usr/bin/env python3
# WARPScoutGUI — распаковщик resources.neu (Neutralino ASAR-like bundle).
# Формат — зеркален tools/pack-neu.py: <u32 4><u32 8+hdr><u32 4+hdr><u32 jsonLen>
# + padded JSON-манифест + блобы; offsets отсчитываются от 16+hdrPadded.
# Использование: python3 tools/unpack-neu.py resources.neu out_dir [префикс_фильтр]
import json, os, struct, sys

def unpack(neu_path, out_dir, prefix_filter=""):
    buf = open(neu_path, "rb").read()
    a, b, c, json_len = struct.unpack_from("<IIII", buf, 0)
    hdr_padded = b - 8
    manifest = json.loads(buf[16:16 + json_len])
    base = 16 + hdr_padded  # asarHeaderSize
    count = 0
    def walk(node, rel):
        nonlocal count
        for name, entry in node.items():
            path = f"{rel}{name}"
            if "files" in entry:  # каталог
                walk(entry["files"], path + "/")
            elif path.startswith(prefix_filter):
                dst = os.path.join(out_dir, path)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                off = base + int(entry["offset"])
                with open(dst, "wb") as f:
                    f.write(buf[off:off + entry["size"]])
                count += 1
    walk(manifest["files"], "")
    print(f"unpacked {count} files -> {out_dir}")

if __name__ == "__main__":
    unpack(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "")
