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

  /* ----------------------------------------- compact harness source labels
     Harness links come from the generated Index snapshot. Display the
     canonical GitHub owner/repo path directly; when it exceeds the compact
     table budget, preserve the repository end and elide from the left. */
  (function addHarnessSources() {
    var maxLabelLength = 40;
    var ellipsis = '...';
    var selector = [
      '.vhi-combos tbody th[scope="row"] > a',
      '.vhi-all tbody th[scope="row"] > a',
      '.index-preview-table tbody th[scope="row"] > a'
    ].join(', ');

    function truncateLeft(source, maxLength) {
      return source.length <= maxLength
        ? source
        : ellipsis + source.slice(-(maxLength - ellipsis.length));
    }

    function fitAllHarnessLabel(link, source) {
      if (typeof link.closest !== 'function' || !link.closest('.vhi-all')) return;
      if (!link.clientWidth || link.scrollWidth <= link.clientWidth) return;

      var maxLength = Math.min(maxLabelLength, source.length);
      while (maxLength > ellipsis.length + 1 && link.scrollWidth > link.clientWidth) {
        maxLength -= 1;
        link.textContent = truncateLeft(source, maxLength);
      }
    }

    $all(selector).forEach(function (link) {
      var url;
      try {
        url = new URL(link.getAttribute('href'), location.href);
      } catch (_) {
        return;
      }
      if (url.hostname.toLowerCase() !== 'github.com') return;

      var parts = url.pathname.split('/').filter(Boolean);
      if (parts.length < 2) return;
      var source = parts[0] + '/' + parts[1];

      link.title = 'Source repository: ' + source;
      link.textContent = truncateLeft(source, maxLabelLength);
      fitAllHarnessLabel(link, source);
    });
  })();

})();