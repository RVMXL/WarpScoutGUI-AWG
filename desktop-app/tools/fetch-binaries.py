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
# v2.6.2 (аудит INFRA-B): оба curl с -f — HTTP 404/403 больше НЕ «успех»,
# тело-HTML не сохраняется как «бинарь» (проверки магии + минимального
# размера; падение — с именем ассета).
# v2.6.2 (аудит AND-2/INFRA-C): ядро Android-сборки (libwarpscout.so из
# релиза vernette/warpscout) — тоже часть цепочки поставки: скачивается,
# раскладывается в pkg/WARPScoutGUI-android/ и сверяется с deps.json.
#
# Использование:
#   python3 tools/fetch-binaries.py --release v2.6.1 [--repo RVMXL/WarpScoutGUI-AWG]
#   python3 tools/fetch-binaries.py --latest-published   — последний опубликованный релиз (CI)
#   python3 tools/fetch-binaries.py --check   — только сверить локальные бинари с deps.json
import hashlib, json, os, shutil, subprocess, sys, tarfile, tempfile, zipfile

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
    # v2.6.2 (аудит INFRA-B): -f — HTTP 404/403 = ошибка, а не тихий HTML
    cmd = ["curl", "-fsSL", "-H", "Accept: application/vnd.github+json"]
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
    cmd.append(url)
    try:
        return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError as e:
        sys.exit(f"GitHub API: запрос не удался (curl exit {e.returncode}) — {url}")

def download(url, token, label, magic=b"PK"):
    # v2.6.2 (аудит INFRA-B): -f + проверка минимального размера и магии
    # файла — HTML-страница ошибки больше не сохраняется как «бинарь».
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".bin")
    cmd = ["curl", "-fsSL", "--retry", "2", "-o", tmp.name,
           "-H", "Accept: application/octet-stream"] # иначе API ассета вернёт JSON-метаданные
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
    cmd.append(url)
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        os.unlink(tmp.name)
        sys.exit(f"{label}: загрузка не удалась (curl exit {e.returncode} — HTTP-ошибка?) — {url}")
    size = os.path.getsize(tmp.name)
    if size < 1024:
        os.unlink(tmp.name)
        sys.exit(f"{label}: файл подозрительно мал ({size} Б) — не артефакт: {url}")
    with open(tmp.name, "rb") as f:
        head = f.read(2)
    if head != magic:
        os.unlink(tmp.name)
        sys.exit(f"{label}: магия файла {head!r} ≠ ожидаемой {magic!r} — похоже на HTML-ошибку: {url}")
    return tmp

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

    repo = args[args.index("--repo") + 1] if "--repo" in args else "RVMXL/WarpScoutGUI-AWG"
    token = os.environ.get("WS_GH_TOKEN") or (
        open("/tmp/ghtoken").read().strip() if os.path.isfile("/tmp/ghtoken") else None)

    if "--latest-published" in args:
        # v2.6.2 (CI/INFRA-A): последний опубликованный релиз (список
        # /releases отдаётся по created_at DESC; включает prerelease —
        # политика проекта: Latest помечен старый v2.4.6).
        info = json.loads(gh(f"https://api.github.com/repos/{repo}/releases?per_page=1", token))
        if not info:
            sys.exit(f"в {repo} нет опубликованных релизов")
        release = info[0]["tag_name"]
        print(f"последний опубликованный релиз: {release}")
    else:
        i = args.index("--release") if "--release" in args else -1
        if i < 0 or i + 1 >= len(args):
            sys.exit("использование: fetch-binaries.py --release vX.Y.Z | --latest-published [--repo OWNER/REPO]")
        release = args[i + 1]

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
        tmp = download(url, token, name, magic=b"PK")
        digest = sha256(tmp.name)
        try:
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
        finally:
            os.unlink(tmp.name)
        print(f"OK  {name} → распаковано, sha256 {digest[:16]}…")

    # v2.6.2 (аудит AND-2/INFRA-C): android-ядро — из релиза warpscout
    # (отдельный репозиторий), хэш пинится в deps.json и проверяется
    # общим блоком сверки ниже (и build-apk.sh — той же записью).
    ws_ver = (deps.get("warpscout") or {}).get("version")
    and_dest = "pkg/WARPScoutGUI-android/libwarpscout.so"
    if ws_ver and and_dest in deps["files"]:
        url = (f"https://github.com/vernette/warpscout/releases/download/v{ws_ver}/"
               f"warpscout_{ws_ver}_android_arm64.tar.gz")
        tmp = download(url, token, f"warpscout_{ws_ver}_android_arm64.tar.gz", magic=b"\x1f\x8b")
        try:
            with tarfile.open(tmp.name, "r:gz") as tf:
                member = next((m for m in tf.getmembers()
                               if m.isfile() and m.name.split("/")[-1] == "warpscout"), None)
                if member is None:
                    sys.exit(f"warpscout_{ws_ver}_android_arm64.tar.gz: внутри нет файла warpscout")
                tgt = os.path.join(ROOT, and_dest)
                os.makedirs(os.path.dirname(tgt), exist_ok=True)
                with tf.extractfile(member) as src, open(tgt, "wb") as out:
                    shutil.copyfileobj(src, out)
        finally:
            os.unlink(tmp.name)
        got[and_dest] = "android"
        print(f"OK  warpscout_{ws_ver}_android_arm64.tar.gz → {and_dest}")

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
