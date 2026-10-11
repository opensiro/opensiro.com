(() => {
  'use strict';
  const flow=document.querySelector('[data-vsm-flow]');
  if (!flow) return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=true;
  function sync() {
    flow.classList.toggle('is-paused',!visible || document.hidden || motion.matches);
  }
  motion.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.15}).observe(flow);
  sync();
})();
