/* =====================================================================
   opensiro — app.js
   Vanilla, no dependencies. Active-nav highlight for the shared navigation.
   Shared across all site pages.
   ===================================================================== */
(function () {
  'use strict';

  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ----------------------------------------------------- active nav by page
     The .active class is baked into each page's markup (works without
     JS). This re-asserts it from location.pathname as a guard, mapping
     the current file to a data-nav value (products | index | research). */
  (function setActiveNav() {
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var current = file === '' || file === '/' || file === 'index.html'
      ? null                       // home has no active state
      : (file === 'opensiro.html' || file === 'vsm.html') ? 'products'
      : file === 'vsm-index.html' ? 'index'
      : file.replace(/\.html$/, ''); // products.html -> products
    if (!current) return;
    $all('[data-nav]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-nav') === current);
    });
  })();

})();
