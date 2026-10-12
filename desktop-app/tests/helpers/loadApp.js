/* ═══════════════════════════════════════════════════════════════
   ARCH-4 (аудит): тест-харнесс — загрузка app.js в Node без браузера.
   app.js — IIFE, рассчитанная на браузер; для юнит-тестов чистых функций
   (парсеры, санитайзеры, билдеры команд) достаточно минимальных заглушек
   document/window. Инициализация UI не запускается: событие "load" не
   эмитится, DOMContentLoaded не диспатчится — app.js только определяет
   функции и выставляет window.__WSGUI (отладочный хук валидаторов).
   Ноль внешних зависимостей: node:test + node:vm + node:assert.
   Запуск: node --test desktop-app/tests/
   ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP_JS = path.join(__dirname, "..", "..", "resources", "js", "app.js");

function classListStub() {
  const set = new Set();
  return {
    add: (...c) => c.forEach((x) => set.add(x)),
    remove: (...c) => c.forEach((x) => set.delete(x)),
    toggle: (c, force) => {
      const on = force === undefined ? !set.has(c) : !!force;
      if (on) set.add(c); else set.delete(c);
      return on;
    },
    contains: (c) => set.has(c),
  };
}

function elementStub(tag) {
  const el = {
    tag: String(tag || "div"),
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    classList: classListStub(),
    textContent: "",
    innerHTML: "",
    value: "",
    hidden: false,
    children: [],
    attributes: {},
    setAttribute: (k, v) => { el.attributes[k] = String(v); },
    getAttribute: (k) => (k in el.attributes ? el.attributes[k] : null),
    removeAttribute: (k) => { delete el.attributes[k]; },
    appendChild: (c) => { el.children.push(c); return c; },
    removeChild: (c) => { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    remove: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    querySelector: () => null,
    querySelectorAll: () => [],
    insertAdjacentHTML: () => {},
    focus: () => {},
    blur: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  };
  return el;
}

function makeDocument() {
  const doc = {
    readyState: "loading",
    title: "",
    hidden: false,
    body: elementStub("body"),
    documentElement: elementStub("html"),
    head: elementStub("head"),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: (tag) => elementStub(tag),
    createTextNode: (text) => ({ nodeValue: String(text) }),
    createDocumentFragment: () => elementStub("#fragment"),
  };
  doc.body.ownerDocument = doc;
  return doc;
}

/**
 * Загружает resources/js/app.js в изолированный vm-контекст.
 * opts.nlOs       — window.NL_OS ("Windows" | "Linux" | "Darwin" | "Android")
 * opts.appVersion — window.NL_APPVERSION
 * opts.mock       — окно эмулирует браузерное демо (window.Neutralino.mock)
 * opts.search     — location.search (например "?touch=1")
 * Возвращает { window, sandbox, document, wsgui }.
 * Инициализация UI НЕ выполняется: "load" не эмитится, readyState="loading".
 */
function loadApp(opts) {
  const o = Object.assign({ nlOs: "Windows", appVersion: "0.0.0-test", mock: false, search: "" }, opts || {});
  const doc = makeDocument();
  const docListeners = [];
  const winListeners = [];
  const win = {
    NL_OS: o.nlOs,
    NL_APPVERSION: o.appVersion,
    NL_PATH: o.nlPath || "C:\\Program Files\\WARPScoutGUI",
    NL_ARGS: [],
    addEventListener: (ev, fn) => { winListeners.push([ev, fn]); },
    removeEventListener: () => {},
    dispatchEvent: () => true,
    location: { search: o.search, protocol: "file:", href: "file:///index.html", host: "", pathname: "/index.html" },
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
  };
  const sandbox = {
    window: win,
    document: doc,
    location: win.location,
    navigator: { userAgent: "node-test", language: "ru", clipboard: undefined },
    localStorage: { _m: new Map(), getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }, setItem(k, v) { this._m.set(k, String(v)); }, removeItem(k) { this._m.delete(k); }, clear() { this._m.clear(); } },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    MutationObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class { observe() {} disconnect() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    CustomEvent: class { constructor(type) { this.type = type; } },
    Event: class { constructor(type) { this.type = type; } },
    URL,
    Blob: class { constructor() {} },
    File: class { constructor() {} },
    FileReader: class { readAsText() {} readAsDataURL() {} },
    FormData: class { append() {} },
    Image: class { set src(_v) {} },
    history: { pushState() {}, replaceState() {} },
    fetch: () => Promise.reject(new Error("fetch disabled in tests")),
    alert() {}, confirm: () => false, prompt: () => null,
    console,
    TextEncoder,
    TextDecoder,
    btoa,
    atob,
    crypto: { getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; } },
    performance,
  };
  sandbox.globalThis = sandbox;
  if (o.mock) win.Neutralino = { mock: true };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(APP_JS, "utf8"), sandbox, { filename: "app.js" });
  const wsgui = win.__WSGUI;
  if (!wsgui) throw new Error("app.js не выставил window.__WSGUI — харнесс сломан или app.js упал при загрузке");
  return { window: win, sandbox, document: doc, wsgui, winListeners, docListeners };
}

module.exports = { loadApp, elementStub, classListStub };
