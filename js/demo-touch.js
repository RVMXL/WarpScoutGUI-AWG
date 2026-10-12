/* WARPSCOUT GUI — демо (gh-pages) v2.6.2m: мобильная подгонка.
   Родный touch-UI приложения (css/touch.css: нижняя навигация, главная)
   включается флагом TOUCH_UI (js/wsg/01-platform.js): IS_ANDROID (APK-мост)
   или URL-параметр ?touch=1. В браузере на телефоне мок Neutralino даёт
   NL_OS="" → IS_ANDROID=false, поэтому Pages показывал сжатый
   десктоп-вид. Скрипт живёт ТОЛЬКО в демо-копии (desktop-app/resources
   не изменяются) и до первого рендера добавляет ?touch=1 — вид на
   телефоне совпадает с Android-версией приложения.
   Escape: ?touch=0 — принудительный десктопный вид на любом устройстве. */
(function () {
  "use strict";
  try {
    var q = String((typeof location === "object" && location) ? location.search : "");
    /* touch=1 — уже включён; touch=0 — явный escape пользователя */
    if (/(?:^|[?&])touch=(0|1)/.test(q)) return;
    var ua = String(navigator.userAgent || "");
    var mobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)
      || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)); /* iPadOS 13+ маскируется под Mac */
    var coarse = false, noHover = false;
    try {
      coarse = matchMedia("(pointer: coarse)").matches;
      noHover = matchMedia("(hover: none)").matches;
    } catch (e) { /* старые WebView: остаётся UA-проверка */ }
    /* десктоп (в т.ч. с тачскрином: pointer:fine или hover:hover) — не трогаем */
    if (!mobile && !(coarse && noHover)) return;
    location.replace(location.pathname + (q ? q + "&" : "?") + "touch=1" + String(location.hash || ""));
  } catch (e) { /* демо не должно падать никогда */ }
})();
