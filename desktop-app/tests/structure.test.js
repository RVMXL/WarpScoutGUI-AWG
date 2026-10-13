/* v2.6.2 (аудит QUAL-C): слепая зона CI — index.html ↔ js/wsg/*.js.
   Раньше состав/порядок script-тегов index.html не сверялись с каталогом модулей:
   переименованный/удалённый/добавленный модуль при нетронутом index.html
   (или наоборот) проходил CI полностью и падал только в собранном приложении.
   Тест парсит index.html и сверяет список src с фактическим содержимым
   resources/js/wsg (существование, полнота, уникальность, порядок).
   Ноль внешних зависимостей: node:test + node:assert. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const RES = path.join(__dirname, "..", "resources");
const WSG = path.join(RES, "js", "wsg");

function scriptTags() {
  const html = fs.readFileSync(path.join(RES, "index.html"), "utf8");
  const out = [];
  const re = /<script\s+[^>]*src="([^"]+)"[^>]*>\s*<\/script\s*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    // cache-buster ?v=... — не часть пути (модуль всегда один и тот же файл)
    out.push(m[1].trim().replace(/\?.*$/, ""));
  }
  return { html, tags: out };
}

test("QUAL-C: каждый script-тег index.html указывает на существующий файл", () => {
  const { tags } = scriptTags();
  assert.ok(tags.length > 0, "в index.html не найдено ни одного script[src] — тест сломан или HTML переделан");
  for (const src of tags) {
    if (!src.startsWith("js/wsg/")) continue; // вендор и клиент проверяются deps.json
    const p = path.join(RES, ...src.split("/"));
    assert.ok(fs.existsSync(p), "script-тег указывает на отсутствующий файл: " + src);
  }
});

test("QUAL-C: состав и порядок js/wsg/*.js в index.html совпадают с каталогом", () => {
  const { tags } = scriptTags();
  const fromHtml = tags.filter((s) => s.startsWith("js/wsg/"));
  const fromDisk = fs.readdirSync(WSG).filter((f) => f.endsWith(".js")).sort()
    .map((f) => "js/wsg/" + f);
  assert.deepStrictEqual(
    fromHtml,
    fromDisk,
    "index.html и resources/js/wsg разошлись — обнови script-теги (или каталог модулей)"
  );
});

test("QUAL-C: модули подключены ровно по одному разу (без дублей)", () => {
  const { tags } = scriptTags();
  const wsg = tags.filter((s) => s.startsWith("js/wsg/"));
  const uniq = new Set(wsg);
  assert.strictEqual(uniq.size, wsg.length, "найдены дублирующиеся script-теги модулей");
});

test("QUAL-C: порядок номеров модулей монотонный (контракт «строго по номеру»)", () => {
  const { tags } = scriptTags();
  const nums = tags
    .filter((s) => s.startsWith("js/wsg/"))
    .map((s) => parseInt(path.basename(s, ".js"), 10));
  for (let i = 1; i < nums.length; i++) {
    assert.ok(nums[i] > nums[i - 1], "порядок модулей нарушен на позиции " + i + ": " + nums.join(","));
  }
});
