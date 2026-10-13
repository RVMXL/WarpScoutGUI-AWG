#!/usr/bin/env python3
# WARPScoutGUI — верификатор цепочки поставки (v2.6.0, аудит INFRA-2).
# Сверяет SHA-256 всех сторонних бинарников (рантаймы Neutralino, ядро
# warpscout) с манифестом tools/deps.json: подмена блоба в pkg/ или bin/
# обнаруживается до релиза, а не у пользователя.
#
# Использование:
#   python3 tools/verify-deps.py            — проверить все файлы (CI)
#   python3 tools/verify-deps.py --update   — пересобрать хэши (после смены бинарей)
import hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPS = os.path.join(ROOT, "tools", "deps.json")

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def main():
    update = "--update" in sys.argv[1:]
    with open(DEPS, encoding="utf-8") as f:
        deps = json.load(f)
    bad, missing = [], []
    for rel, meta in sorted(deps["files"].items()):
        p = os.path.join(ROOT, rel)
        if not os.path.isfile(p):
            missing.append(rel)
            continue
        actual = sha256(p)
        if actual != meta["sha256"]:
            if update:
                meta["sha256"] = actual
                print(f"UPD {rel} → {actual[:16]}…")
            else:
                bad.append((rel, meta["sha256"], actual))
    if update:
        with open(DEPS, "w", encoding="utf-8") as f:
            json.dump(deps, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print("deps.json обновлён")
        return
    if missing:
        # v2.6.0 (ARCH-3): бинарей в git нет — свежий клон их не имеет.
        # Отсутствие — не ошибка (см. tools/fetch-binaries.py), но выходим
        # с кодом 0 только если всё, что ЕСТЬ, совпало (проверка ниже).
        print(f"пропущено (нет на диске, не в git — ARCH-3): {len(missing)}")
    if bad:
        print("ХЭШ-РАСХОЖДЕНИЕ (подмена/пересборка без --update):")
        for rel, exp, act in bad:
            print(f"  {rel}\n    ждали {exp}\n    факт  {act}")
        sys.exit(1)
    checked = len(deps["files"]) - len(missing)
    if checked == 0:
        # v2.6.2 (аудит INFRA-A): «0 проверено» — НЕ успех, а вакуум: свежий
        # клон не содержит бинарей (ARCH-3), и старая логика молча проходила.
        print("ОШИБКА: 0 файлов проверено — проверка вакуумна (аудит INFRA-A).")
        print("Восстановите бинарники: python3 tools/fetch-binaries.py --latest-published")
        sys.exit(1)
    print(f"OK  цепочка поставки согласована: {checked} проверено, {len(missing)} отсутствует (fetch-binaries.py)")

if __name__ == "__main__":
    main()
