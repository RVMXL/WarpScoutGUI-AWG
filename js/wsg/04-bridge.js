/* ═══ WSG · 04-bridge — модуль монолита app.js (нарезка ARCH-1, v2.6.0) ═══
   Источник: app.js (был монолит ~6957 строк), диапазон строк 1298–1383.
   Файлы js/wsg/*.js загружаются index.html строго по номеру — порядок
   объявлений оригинала сохранён; классические script-теги разделяют общую
   глобальную область видимости (как тело одной IIFE).
   v2.6.0: поведенческих изменений НЕТ (байт-в-байт реконструкция + 50 юнит-тестов). */
"use strict";

  /* ───────── Neutralino-мост ───────── */
  const os = () => window.Neutralino.os;
  const fs = () => window.Neutralino.filesystem;
  const store = () => window.Neutralino.storage;

  async function killProc(id) {
    if (id == null) return;
    try {
      if (os().updateSpawnedProcess) await os().updateSpawnedProcess(id, "exit");
      else if (os().killProcess) await os().killProcess(id);
    } catch (e) { /* процесс уже завершился */ }
  }

  const procRegistry = {};
  // v2.1.1: события могут прийти ДО registerProc (гонка «execCommand вернулся →
  // подписка оформлена»): раньше они молча терялись, и первый вывод warpscout
  // не попадал в лог. Копим «ранние» события и отыгрываем их в момент
  // регистрации обработчика (старше 60с — мусор, выбрасываем).
  const procBacklog = new Map(); // id -> [{ evt, ts }]
  function backlogPush(id, evt) {
    const arr = procBacklog.get(id) || [];
    arr.push({ evt, ts: Date.now() });
    procBacklog.set(id, arr);
    for (const [k, v] of procBacklog) {
      const fresh = v.filter((x) => Date.now() - x.ts < 60000);
      if (fresh.length) procBacklog.set(k, fresh); else procBacklog.delete(k);
    }
  }
  function registerProc(id, handler) {
    procRegistry[id] = handler;
    const back = procBacklog.get(id);
    if (back) {
      procBacklog.delete(id);
      for (const { evt } of back) { try { handler(evt); } catch (e) { /* не роняем поток событий */ } }
    }
  }
  function unregisterProc(id) { delete procRegistry[id]; }

  function bindProcEvents() {
    window.Neutralino.events.on("spawnedProcess", (evt) => {
      const raw = evt.detail || evt;
      // v2.4.2 FIX (проверено живым тестом рантайма 6.10.0): реальная форма события —
      // {action:"stdOut"|"stdErr"|"exit", data, id}. Раньше код читал d.type — такого
      // поля НЕ существует, поэтому checkWarpscout (v2.2.0+) никогда не получал вывод
      // и exit-код: версия warpscout не определялась, регистрация отбивала «exe не найден»
      // при рабочем exe, а Stop-кнопки молчали (в 2.1.1 работало — там был execCommand
      // с чтением stdOut из результата). Мок присылает type — принимаем ОБЕ формы.
      const act = String(raw.action != null ? raw.action : raw.type || "").toLowerCase();
      const d = {
        id: raw.id,
        type: act === "stdout" ? "stdout" : act === "stderr" ? "stderr" : act === "exit" ? "exit" : act,
        data: raw.data,
        synthetic: raw.synthetic
      };
      const h = procRegistry[d.id];
      if (h) h(d);
      else if (d.id != null) backlogPush(d.id, d);
    });
    // страховка: если exit-событие потеряно — раз в 5 сек сверяемся со списком живых процессов
    setInterval(async () => {
      const ids = Object.keys(procRegistry);
      if (!ids.length) return;
      if (!os().getSpawnedProcesses) return;
      try {
        const live = await os().getSpawnedProcesses();
        const liveIds = new Set((live || []).map((p) => String(p.id)));
        for (const id of ids) {
          if (!liveIds.has(String(id))) {
            const h = procRegistry[id];
            delete procRegistry[id];
            // v2.1.1: synthetic — exit-событие потеряно, это НЕ настоящий код -1
            if (h) h({ id: Number(id), type: "exit", data: -1, synthetic: true });
          }
        }
      } catch (e) { /* рантайм недоступен — не страшно */ }
    }, 5000);
  }

  async function ensureDir(dir) {
    if (IS_MOCK || !dir) return;
    // v2.1.1: у createDirectory в Neutralino нет опции recursive (фантомный
    // второй аргумент молча игнорировался клиентом) — порядок ensureDir ниже
    // гарантирует существование родителя
    try { await fs().createDirectory(dir); } catch (e) { /* уже есть */ }
  }

