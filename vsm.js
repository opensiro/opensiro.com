/* VSMLite — role diorama and autonomy horizon. */
(function () {
  'use strict';

  var motionPosters = Array.prototype.slice.call(document.querySelectorAll('.problem-motion'));
  if (motionPosters.length) {
    if ('IntersectionObserver' in window) {
      var motionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      }, { rootMargin: '-12% 0px -12% 0px', threshold: .08 });
      motionPosters.forEach(function (poster) { motionObserver.observe(poster); });
    } else {
      motionPosters.forEach(function (poster) { poster.classList.add('is-visible'); });
    }
  }

  var systems = {
    s1: { code:'S1 / OPERATION', title:'Run the operations', thesis:'Autonomous units meet their own local environments.', label:'S1 units exchange work with local environments', scene:'TOOL / WORK CASE' },
    s2: { code:'S2 / COORDINATION', title:'Dampen oscillation', thesis:'Coordinate interactions without taking over S1.', label:'S2 dampens oscillation between S1 units', scene:'RADIO / SIGNAL DESK' },
    s3: { code:'S3 / INSIDE + NOW', title:'Regulate the present', thesis:'Resources and current work across the whole.', label:'S3 controls current operations through S2 and S1', scene:'METRICS DASHBOARD' },
    s3x:{ code:'S3* / AUDIT', title:'Inspect directly', thesis:'Independent samples from operations.', label:'S3 star independently audits S1 operations', scene:'AUDIT PROBE' },
    s4: { code:'S4 / OUTSIDE + NEXT', title:'Model the future', thesis:'Essential when the outside world is changing.', label:'S4 exchanges intelligence with a dynamic environment', scene:'RADAR / TELESCOPE' },
    s5: { code:'S5 / POLICY', title:'Hold identity', thesis:'Purpose balances the present and future.', label:'S5 balances current control and future intelligence', scene:'COMPASS / POLICY' }
  };

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.system-tabs [data-system]'));
  var panel = document.getElementById('system-panel');
  if (tabs.length && panel) {
    var code = panel.querySelector('[data-system-code]');
    var title = panel.querySelector('[data-system-title]');
    var thesis = panel.querySelector('[data-system-thesis]');
    var diagram = panel.querySelector('[data-system-diagram]');
    var roleScene = panel.querySelector('[data-role-scene]');
    var roleSceneLabel = panel.querySelector('[data-role-scene-label]');
    var modelTriggers = Array.prototype.slice.call(panel.querySelectorAll('[data-model-system]'));

    function select(tab, moveFocus) {
      var key = tab.getAttribute('data-system');
      var item = systems[key];
      if (!item) return;
      tabs.forEach(function (candidate) {
        var selected = candidate === tab;
        candidate.setAttribute('aria-selected', selected ? 'true' : 'false');
        candidate.tabIndex = selected ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tab.id);
      code.textContent = item.code;
      title.textContent = item.title;
      thesis.textContent = item.thesis;
      diagram.className = 'model-beer role-' + key;
      diagram.setAttribute('aria-label', item.label);
      if (roleScene) roleScene.setAttribute('data-role', key);
      if (roleSceneLabel) roleSceneLabel.textContent = item.code;
      modelTriggers.forEach(function (trigger) {
        trigger.setAttribute('aria-pressed', trigger.getAttribute('data-model-system') === key ? 'true' : 'false');
      });
      if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (event) {
        var next = index;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        select(tabs[next], true);
      });
    });
    modelTriggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var key = trigger.getAttribute('data-model-system');
        var tab = tabs.find(function (candidate) { return candidate.getAttribute('data-system') === key; });
        if (tab) select(tab, false);
      });
    });
  }

  // OSM §6–7: discrete snapshots of functions transferred from parent to child.
  var maturity = document.querySelector('[data-osm-maturity]');
  if (!maturity) return;
  var phases = ['INTENT', 'OPERATIONS', 'COORDINATION', 'REGULATION', 'VERIFICATION', 'ADAPTATION', 'IDENTITY'];
  var agentEstimates = ['—', '1–10', '10–50', '50–200', '100–400', '200–800', '500–1,000+'];
  var systemCodes = ['S1', 'S2', 'S3', 'S3*', 'S4', 'S5'];
  ['parent', 'child'].forEach(function (side) {
    Array.prototype.forEach.call(maturity.querySelectorAll('[data-osm-' + side + '] [data-osm-function]'), function (item, index) {
      var code = document.createElement('b');
      code.textContent = systemCodes[index];
      item.insertBefore(code, item.lastChild);
    });
  });
  var headlines = [
    'The parent carries the missing functions.',
    'The system does the work. The parent holds it together.',
    'Coordination moves inside the system.',
    'Day-to-day regulation no longer depends on the parent.',
    'The system can inspect its own work independently.',
    'The system can respond to a changing environment.',
    'The organization owns the full set of viable functions.'
  ];
  var descriptions = [
    'A new organization starts inside an existing viable system. The human provides the support it cannot yet provide for itself.',
    'Operational units take responsibility for delivery. Coordination, regulation and the remaining functions are still supported by the parent.',
    'Units coordinate with one another. The parent no longer needs to mediate every interaction.',
    'Resources and internal optimization are managed locally. The parent supplies the functions still missing.',
    'Independent observation reduces reliance on the human to discover hidden problems.',
    'Strategic adaptation moves inside when the external environment is changing. Identity and autonomy boundaries are still supported by the parent.',
    'Policy and identity resolve internal trade-offs. The system can sustain itself within its autonomy boundaries; parent compensation is no longer required.'
  ];
  var range = document.getElementById('osm-maturity-range');
  var stops = Array.prototype.slice.call(maturity.querySelectorAll('[data-osm-level]'));
  function setMaturity(level) {
    level = Math.max(0, Math.min(6, Number(level) || 0));
    maturity.setAttribute('data-level', String(level));
    maturity.querySelector('[data-osm-agents]').textContent = agentEstimates[level];
    maturity.querySelector('[data-osm-systems]').textContent = level ? systemCodes.slice(0, level).join(' + ') : 'Parent-led / intent';
    range.value = String(level);
    range.setAttribute('aria-valuetext', phases[level] + '. ' + headlines[level] + (level ? ' Est. concurrent agents: ' + agentEstimates[level] : ''));
    maturity.querySelector('[data-osm-phase]').textContent = '0' + level + ' / ' + phases[level];
    maturity.querySelector('[data-osm-headline]').textContent = headlines[level];
    maturity.querySelector('[data-osm-description]').textContent = descriptions[level];
    maturity.querySelector('[data-osm-parent-title]').textContent = level === 6 ? 'Support can recede.' : level === 0 ? 'Holds the whole.' : 'Hands over responsibility.';
    maturity.querySelector('[data-osm-child-title]').textContent = level === 6 ? 'Sustains itself.' : level === 0 ? 'Begins with intent.' : 'Owns more of its life.';
    maturity.querySelector('[data-osm-support]').textContent = level === 0 ? 'FULL SUPPORT' : level === 6 ? 'NO COMPENSATION NEEDED' : 'LESS SUPPORT';
    ['parent', 'child'].forEach(function (side) {
      var functions = maturity.querySelectorAll('[data-osm-' + side + '] [data-osm-function]');
      Array.prototype.forEach.call(functions, function (item, index) {
        item.classList.toggle('is-owned', side === 'parent' ? index >= level : index < level);
      });
    });
    Array.prototype.forEach.call(maturity.querySelectorAll('[data-osm-wire]'), function (wire, index) {
      wire.classList.toggle('is-released', index < level);
    });
    stops.forEach(function (button) {
      button.setAttribute('aria-pressed', String(Number(button.getAttribute('data-osm-level')) === level));
    });
  }
  range.addEventListener('input', function () { setMaturity(range.value); });
  stops.forEach(function (button) {
    button.addEventListener('click', function () { setMaturity(button.getAttribute('data-osm-level')); });
  });
  setMaturity(0);

  var playground = document.querySelector('[data-vsm-playground]');
  if (playground) {
    var profiles = {
      legion: { name:'ROMAN LEGION', weights:{ s1:.8, s2:.12, s3:.045, s4:.025, s5:.01 } },
      democracy: { name:'DEMOCRACY', weights:{ s1:.56, s2:.19, s3:.11, s4:.13, s5:.01 } },
      dictatorship: { name:'DICTATORSHIP', weights:{ s1:.93, s2:.035, s3:.025, s4:.009, s5:.001 } },
      colony: { name:'ANT COLONY', weights:{ s1:.97, s2:.02, s3:.006, s4:.003, s5:.001 } },
      research: { name:'RESEARCH FEDERATION', weights:{ s1:.6, s2:.09, s3:.07, s4:.23, s5:.01 } },
      emergency: { name:'EMERGENCY NETWORK', weights:{ s1:.69, s2:.21, s3:.06, s4:.035, s5:.005 } }
    };
    var coreSystems = ['s1', 's2', 's3', 's4', 's5'];
    var templateButtons = Array.prototype.slice.call(document.querySelectorAll('[data-vsm-template]'));
    var systemToggles = Array.prototype.slice.call(playground.querySelectorAll('[data-vsm-system]'));
    var totalRange = document.getElementById('vsm-total-range');
    var profileName = playground.querySelector('[data-vsm-profile]');
    var profileOrigin = playground.querySelector('[data-vsm-origin]');
    var selectedProfile = 'legion';
    var currentWeights = profiles.legion.weights;

    function formatCount(value) { return Number(value).toLocaleString('en-US'); }
    function totalCapacity() { return Math.max(10, Math.min(10000, Math.round(Math.pow(10, Number(totalRange.value))))); }
    function isSystemOn(key) {
      var toggle = playground.querySelector('[data-vsm-system="' + key + '"]');
      return toggle ? toggle.checked : false;
    }
    function setCustom() {
      if (selectedProfile === 'custom') return;
      profileOrigin.hidden = false;
      profileOrigin.textContent = 'DERIVED FROM ' + profiles[selectedProfile].name;
      selectedProfile = 'custom';
      playground.setAttribute('data-template', 'custom');
      profileName.textContent = 'CUSTOM';
      templateButtons.forEach(function (button) { button.setAttribute('aria-pressed', 'false'); });
    }
    function renderPlayground() {
      var total = totalCapacity();
      var counts = {};
      var roundedTotal = 0;
      coreSystems.forEach(function (key) {
        counts[key] = Math.round(total * currentWeights[key]);
        roundedTotal += counts[key];
      });
      counts.s1 += total - roundedTotal;
      var running = 0;
      var maxCount = Math.max.apply(Math, coreSystems.map(function (key) { return counts[key]; }));
      coreSystems.forEach(function (key) {
        var enabled = isSystemOn(key);
        var count = enabled ? counts[key] : 0;
        running += count;
        var tier = playground.querySelector('[data-vsm-tier="' + key + '"]');
        tier.classList.toggle('is-off', !enabled);
        tier.style.setProperty('--tier-width', count ? Math.max(6, Math.sqrt(count / maxCount) * 100).toFixed(2) + '%' : '0%');
        playground.querySelector('[data-vsm-count="' + key + '"]').textContent = formatCount(count);
      });
      var auditOn = isSystemOn('s3x');
      playground.querySelector('[data-vsm-audit]').classList.toggle('is-off', !auditOn);
      var activeSystems = systemToggles.filter(function (toggle) { return toggle.checked; }).length;
      playground.querySelector('[data-vsm-total]').textContent = formatCount(total);
      playground.querySelector('[data-vsm-running]').textContent = formatCount(running);
      playground.querySelector('[data-vsm-capacity]').textContent = formatCount(total);
      playground.querySelector('[data-vsm-independent]').textContent = formatCount(isSystemOn('s1') ? counts.s1 : 0);
      playground.querySelector('[data-vsm-control]').textContent = formatCount(running - (isSystemOn('s1') ? counts.s1 : 0));
      playground.querySelector('[data-vsm-active]').textContent = activeSystems + ' / 6';
      totalRange.setAttribute('aria-valuenow', String(total));
      totalRange.setAttribute('aria-valuetext', formatCount(total) + ' total agent sessions');
    }
    function selectProfile(key) {
      selectedProfile = key;
      currentWeights = profiles[key].weights;
      playground.setAttribute('data-template', key);
      profileName.textContent = profiles[key].name;
      profileOrigin.hidden = true;
      systemToggles.forEach(function (toggle) { toggle.checked = true; });
      templateButtons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.getAttribute('data-vsm-template') === key)); });
      renderPlayground();
    }
    templateButtons.forEach(function (button) {
      button.addEventListener('click', function () { selectProfile(button.getAttribute('data-vsm-template')); });
    });
    totalRange.addEventListener('input', function () { setCustom(); renderPlayground(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-vsm-total-preset]'), function (button) {
      button.addEventListener('click', function () {
        totalRange.value = String(Math.log10(Number(button.getAttribute('data-vsm-total-preset'))));
        setCustom();
        renderPlayground();
      });
    });
    systemToggles.forEach(function (toggle) {
      toggle.addEventListener('change', function () { setCustom(); renderPlayground(); });
    });
    renderPlayground();
  }

  var sectionNav = document.querySelector('.vsm-section-nav');
  if (sectionNav) {
    var sectionLinks = Array.prototype.slice.call(sectionNav.querySelectorAll('a[href^="#"]'));
    var sectionTargets = sectionLinks.map(function (link) { return document.querySelector(link.getAttribute('href')); });
    var sectionFrame = null;
    function syncSectionNav() {
      sectionFrame = null;
      var marker = window.innerHeight * .34;
      var activeIndex = 0;
      sectionTargets.forEach(function (section, index) {
        if (section && section.getBoundingClientRect().top <= marker) activeIndex = index;
      });
      sectionLinks.forEach(function (link, index) {
        var active = index === activeIndex;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    window.addEventListener('scroll', function () {
      if (sectionFrame === null) sectionFrame = requestAnimationFrame(syncSectionNav);
    }, { passive: true });
    sectionLinks.forEach(function (link) { link.addEventListener('click', syncSectionNav); });
    syncSectionNav();
  }
})();
