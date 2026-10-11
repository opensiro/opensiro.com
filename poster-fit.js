/* Fit article compositions between the header and bottom navigation. */
(function () {
  'use strict';
  // Measure real navigation heights, then fit each desktop composition.
  // Small screens retain their natural reading size and normal page scrolling.
  var posters = Array.prototype.slice.call(document.querySelectorAll('.vsm-page .poster, .proofstate-page .os-hero, .proofstate-page .os-section'));
  var posterViewport = window.matchMedia('(min-width:961px) and (min-height:600px)');
  var posterFrame = null;
  function fitPosters() {
    posterFrame = null;
    var header = document.querySelector('.site-header');
    var rail = document.querySelector('.vsm-section-nav, .os-section-nav');
    var headerHeight = header ? header.getBoundingClientRect().height : 0;
    var railHeight = rail ? rail.getBoundingClientRect().height : 0;
    var available = window.innerHeight - headerHeight - railHeight;
    document.body.style.setProperty('--poster-header-height', headerHeight + 'px');
    document.body.style.setProperty('--poster-height', available + 'px');
    posters.forEach(function (poster) {
      poster.style.removeProperty('--poster-scale');
      if (!posterViewport.matches) return;
      var content = poster.querySelector(':scope > .wrap');
      if (!content) return;
      var style = getComputedStyle(poster);
      var space = available - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 2;
      if (content.getBoundingClientRect().height <= space) return;
      var lower = 0;
      var upper = 1;
      // Find the largest fitting size after reflow, rather than over-shrinking
      // from a single measurement taken at the original line lengths.
      for (var pass = 0; pass < 10; pass++) {
        var scale = (lower + upper) / 2;
        poster.style.setProperty('--poster-scale', String(scale));
        if (content.getBoundingClientRect().height <= space) lower = scale;
        else upper = scale;
      }
      poster.style.setProperty('--poster-scale', String(lower));
    });
  }
  function schedulePosterFit() {
    if (posterFrame === null) posterFrame = requestAnimationFrame(fitPosters);
  }
  window.addEventListener('resize', schedulePosterFit);
  window.addEventListener('load', schedulePosterFit);
  if (document.fonts) document.fonts.ready.then(schedulePosterFit);
  // Changing interactive copy or loading an illustration can alter its height.
  var posterObserver = new MutationObserver(schedulePosterFit);
  posters.forEach(function (poster) {
    var content = poster.matches('.poster') && poster.querySelector(':scope > .wrap');
    if (content) posterObserver.observe(content, { childList: true, characterData: true, subtree: true });
  });
  fitPosters();

})();
