/* v2.6.6 (запрос пользователя): две доработки touch-интерфейса.
   1) Блокировка параметров вкладки «Скан» на время сканирования: случайные
      нажатия по полям во время прогона выглядели как «что-то сломалось».
      setScanRunning(run) теперь дополнительно вызывает setScanParamsLocked:
      все контролы .scan-form получают disabled + класс .is-locked (гашение),
      Пуск/Стоп, командная строка и лог остаются доступны (они вне .scan-form).
      Чистая часть — applyScanLock(controls, locked) — покрыта юнит-тестом.
   2) Верхняя красная кнопка «Остановить» в живой карточке скана на главной
      удалена: обработчика клика у неё не было (нажатие ничего не делало),
      рабочий останов дублировался штатной кнопкой и большой кнопкой главной.
   Попутно (та же карточка): зеркала статуса warpscout/аккаунт на главной
   красятся is-ok/is-err как на десктопе — регресс проверяется по touch.css. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { loadApp } = require("./helpers/loadApp.js");

const { wsgui, document } = loadApp({ nlOs: "Windows", autoDom: true });

const WSG = path.join(__dirname, "..", "resources", "js", "wsg");
const readSrc = (f) => fs.readFileSync(path.join(WSG, f), "utf8");
const TOUCH_CSS = fs.readFileSync(path.join(__dirname, "..", "resources", "css", "touch.css"), "utf8");

/* ── чистая функция applyScanLock ── */
test("applyScanLock: lock ставит disabled всем контролам и возвращает их число", () => {
  const ctr = [{ disabled: false }, { disabled: false }, { disabled: true }];
  const n = wsgui.applyScanLock(ctr, true);
  assert.strictEqual(n, 3);
  assert.ok(ctr.every((c) => c.disabled === true), "все контролы должны получить disabled=true");
});

test("applyScanLock: unlock снимает disabled со всех", () => {
  const ctr = [{ disabled: true }, { disabled: true }];
  wsgui.applyScanLock(ctr, false);
  assert.ok(ctr.every((c) => c.disabled === false), "после снятия блокировки disabled=false");
});

test("applyScanLock: null/пустой список безопасны, throws-объекты пропускаются", () => {
  assert.strictEqual(wsgui.applyScanLock(null, true), 0);
  assert.strictEqual(wsgui.applyScanLock([], true), 0);
  const hostile = [{ get disabled() { throw new Error("readonly"); } }, { disabled: false }];
  const n = wsgui.applyScanLock(hostile, true); // не должно упасть на первом элементе
  assert.strictEqual(n, 2);
  assert.strictEqual(hostile[1].disabled, true);
});

/* ── DOM-обвязка через харнесс (autoDom-заглушки документа) ── */
test("setScanParamsLocked: не падает в обе стороны и пишет подсказку (t(scan.lock.01))", () => {
  assert.doesNotThrow(() => wsgui.setScanParamsLocked(true));
  assert.doesNotThrow(() => wsgui.setScanParamsLocked(false));
  // autoDom-реестр: #scanLockHint создан и содержит текст подсказки
  const hint = document.getElementById("scanLockHint");
  assert.ok(hint, "элемент подсказки должен создаваться лениво");
  assert.ok(String(hint.textContent).includes("заблокированы"), "текст подсказки — из словаря i18n");
  assert.strictEqual(hint.hidden, true, "после unlock подсказка скрыта");
});

test("setScanRunning вызывает блокировку параметров (вход и выход скана — одна точка)", () => {
  const src = readSrc("06-results-scan.js");
  assert.match(
    src,
    /function setScanRunning\(run\) \{[\s\S]{0,600}setScanParamsLocked\(run\)/,
    "setScanRunning обязан гасить/возвращать параметры — все пути старта/стопа/ошибок проходят через него"
  );
});

/* ── удаление нерабочей кнопки «Остановить» из живой карточки главной ── */
test("homeScanStop удалён: ни создания, ни стилей; scan.run.04 жив (REV btnStopScan)", () => {
  const src12 = readSrc("12-socks-tools-ui.js");
  assert.ok(!src12.includes("homeScanStop"), "кнопки #homeScanStop больше нет в разметке карточки");
  const src03 = readSrc("03-i18n.js");
  assert.match(src03, /"scan\.run\.04":\s*\{\s*ru:\s*"Остановить"/,
    "ключ scan.run.04 НЕ сирота — покрывает статический текст btnStopScan (check-i18n REV)");
  assert.doesNotMatch(TOUCH_CSS, /\.home-scanlive__stop\s*\{/, "стили удалённой кнопки вычищены из touch.css");
});

/* ── цвета статусов на главной — как на десктопе ── */
test("зеркала статуса на главной красятся is-ok/is-err (var(--ok)/var(--err))", () => {
  assert.match(TOUCH_CSS, /\.home-status__row\.is-ok[^}]*var\(--ok\)/);
  assert.match(TOUCH_CSS, /\.home-status__row\.is-err[^}]*var\(--err\)/);
});

/* ── i18n: новая подсказка блокировки объявлена (ru/en) ── */
test("scan.lock.01 объявлен с непустыми ru и en", () => {
  const src = readSrc("03-i18n.js");
  assert.match(src, /"scan\.lock\.01":\s*\{\s*ru:\s*"[^"]+",\s*en:\s*"[^"]+"\s*\}/);
});
