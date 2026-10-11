(() => {
  'use strict';
  const demo = document.querySelector('[data-search-demo]');
  if (!demo) return;
  const frames = [...demo.querySelectorAll('[data-demo-query]')];
  const text = demo.querySelector('[data-demo-text]');
  const button = demo.querySelector('[data-demo-toggle]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, cursor = 0, phase = 'hold', timer, paused = false, visible = true;
  function paint(reveal) {
    text.textContent = frames[index].dataset.demoQuery.slice(0,cursor);
    demo.dataset.demoStage = reveal ? 'results' : 'typing';
    frames.forEach((frame,i) => frame.hidden = i !== index || !reveal);
  }
  function schedule(delay) {
    clearTimeout(timer);
    if (!paused && visible && !document.hidden && !motion.matches) timer = setTimeout(tick,delay);
  }
  function tick() {
    if (phase === 'hold') {phase='erase';paint(false);schedule(55);return;}
    if (phase === 'erase') {
      if (cursor > 0) {cursor--;paint(false);schedule(45);}
      else {index=(index+1)%frames.length;phase='type';schedule(400);}
      return;
    }
    if (cursor < frames[index].dataset.demoQuery.length) {cursor++;paint(false);schedule(95+(cursor%3)*25);}
    else {phase='hold';paint(true);schedule(2800);}
  }
  function label() {
    button.textContent=motion.matches ? 'Next example' : paused ? 'Play' : 'Pause';
    button.setAttribute('aria-pressed',String(paused));
    demo.classList.toggle('is-paused',paused || motion.matches);
  }
  button.addEventListener('click',() => {
    if (motion.matches) {index=(index+1)%frames.length;cursor=frames[index].dataset.demoQuery.length;paint(true);return;}
    paused=!paused;label();if (paused) clearTimeout(timer);else schedule(150);
  });
  function reset() {clearTimeout(timer);cursor=frames[index].dataset.demoQuery.length;phase='hold';paint(true);label();schedule(2200);}
  motion.addEventListener('change',reset);
  document.addEventListener('visibilitychange',() => {clearTimeout(timer);if (!document.hidden) schedule(250);});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible=entries[0].isIntersecting;clearTimeout(timer);if (visible) schedule(250);
  },{threshold:.15}).observe(demo);
  reset();
})();
