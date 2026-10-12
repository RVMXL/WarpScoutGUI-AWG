#!/usr/bin/env python3
# WARPScoutGUI — восстановление бинарников из GitHub Releases
# (v2.6.0, аудит ARCH-3: прекомпилированные бинари больше не в git).
#
# Свежий клон не содержит бинарников (pkg/*/WARPScoutGUI*, pkg/*/bin/,
# resources.neu). Скрипт скачивает релизные zip/апк указанной версии,
# сверяет SHA-256 с tools/deps.json и раскладывает бинари в рабочее
# дерево. resources.neu не скачивается из zip, а собирается локально
# (pack-neu.py) — детерминизм сборки проверяется сам.
#
# Использование:
#   python3 tools/fetch-binaries.py --release v2.6.0 [--repo RVMXL/WarpScoutGUI-AWG]
#   python3 tools/fetch-binaries.py --check   — только сверить локальные бинари с deps.json
import hashlib, json, os, shutil, subprocess, sys, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPS = os.path.join(ROOT, "tools", "deps.json")

# архив → (внутри архива: путь, куда: путь относительно desktop-app/)
EXTRACT = {
    "win64":       [("WARPScoutGUI.exe", "pkg/WARPScoutGUI-win64/WARPScoutGUI.exe"),
                    ("bin/warpscout.exe", "pkg/WARPScoutGUI-win64/bin/warpscout.exe")],
    "linux64":     [("WARPScoutGUI", "pkg/WARPScoutGUI-linux64/WARPScoutGUI"),
                    ("bin/warpscout", "pkg/WARPScoutGUI-linux64/bin/warpscout")],
    "linux-arm64": [("WARPScoutGUI", "pkg/WARPScoutGUI-linux-arm64/WARPScoutGUI"),
                    ("bin/warpscout", "pkg/WARPScoutGUI-linux-arm64/bin/warpscout")],
    "mac-arm64":   [("WARPScoutGUI", "pkg/WARPScoutGUI-mac-arm64/WARPScoutGUI"),
                    ("bin/warpscout", "pkg/WARPScoutGUI-mac-arm64/bin/warpscout")],
    "mac-x64":     [("WARPScoutGUI", "pkg/WARPScoutGUI-mac-x64/WARPScoutGUI"),
                    ("bin/warpscout", "pkg/WARPScoutGUI-mac-x64/bin/warpscout")],
}

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def gh(url, token=None):
    cmd = ["curl", "-sSL", "-H", "Accept: application/vnd.github+json"]
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
    cmd.append(url)
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout

def main():
    args = sys.argv[1:]
    with open(DEPS, encoding="utf-8") as f:
        deps = json.load(f)
    if "--check" in args:
        missing, bad = [], []
        for rel, meta in sorted(deps["files"].items()):
            p = os.path.join(ROOT, rel)
            if not os.path.isfile(p):
                missing.append(rel)
            elif sha256(p) != meta["sha256"]:
                bad.append(rel)
        for rel in missing:
            print("НЕТ     " + rel)
        for rel in bad:
            print("ХЭШ≠    " + rel)
        if missing or bad:
            sys.exit(1)
        print("OK все бинарники соответствуют deps.json")
        return

    i = args.index("--release") if "--release" in args else -1
    if i < 0 or i + 1 >= len(args):
        sys.exit("использование: fetch-binaries.py --release vX.Y.Z [--repo OWNER/REPO]")
    release = args[i + 1]
    repo = args[args.index("--repo") + 1] if "--repo" in args else "RVMXL/WarpScoutGUI-AWG"
    token = os.environ.get("WS_GH_TOKEN") or (
        open("/tmp/ghtoken").read().strip() if os.path.isfile("/tmp/ghtoken") else None)

    # platform → asset name (по релизной политике: единая версия во всех именах)
    ver = release.lstrip("v")
    assets = {f"WARPScoutGUI-{ver}-{pl}.zip": pl for pl in EXTRACT}

    print(f"Запрашиваю релиз {release} из {repo}…")
    info = json.loads(gh(f"https://api.github.com/repos/{repo}/releases/tags/{release}", token))
    by_name = {a["name"]: a for a in info.get("assets", [])}
    got = {}
    for name, pl in assets.items():
        if name not in by_name:
            print(f"  пропускаю {name}: ассета нет в релизе")
            continue
        url = by_name[name]["url"]
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
        cmd = ["curl", "-sSL", "-o", tmp.name, url]
        if token:
            cmd += ["-H", f"Authorization: Bearer {token}"]
        subprocess.run(cmd, check=True)
        digest = sha256(tmp.name)
        with zipfile.ZipFile(tmp.name) as zf:
            names = zf.namelist()
            for inner, dest in EXTRACT[pl]:
                if inner not in names:
                    sys.exit(f"{name}: внутри нет {inner}")
                tgt = os.path.join(ROOT, dest)
                os.makedirs(os.path.dirname(tgt), exist_ok=True)
                with zf.open(inner) as src, open(tgt, "wb") as out:
                    shutil.copyfileobj(src, out)
                got[dest] = digest
        os.unlink(tmp.name)
        print(f"OK  {name} → распаковано, sha256 {digest[:16]}…")

    # сверка с deps.json: хэш БИНАРНИКА из deps.json должен совпасть с тем,
    # что лежит внутри релизного архива (цепочка «репо → релиз → рабочее дерево»)
    ok = True
    for dest in got:
        if dest in deps["files"] and sha256(os.path.join(ROOT, dest)) != deps["files"][dest]["sha256"]:
            print(f"ХЭШ-РАСХОЖДЕНИЕ: {dest} не совпадает с tools/deps.json")
            ok = False
    if not ok:
        sys.exit(1)
    print(f"Готово: {len(got)} бинарей восстановлено и сверено с deps.json")

if __name__ == "__main__":
    main()
