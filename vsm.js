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
      legion: { name:'ROMAN LEGION', min:1000, s5:5, weights:{ s1:.79, s2:.12, s3:.04, s3x:.015, s4:.025, s5:.01 } },
      democracy: { name:'DEMOCRACY', min:1000, s5:50, s5Mode:'max', weights:{ s1:.54, s2:.18, s3:.10, s3x:.04, s4:.13, s5:.01 } },
      dictatorship: { name:'DICTATORSHIP', min:500, s5:1, weights:{ s1:.925, s2:.035, s3:.025, s3x:.005, s4:.009, s5:.001 } },
      colony: { name:'ANT COLONY', min:5000, s5:1, weights:{ s1:.965, s2:.02, s3:.006, s3x:.005, s4:.003, s5:.001 } },
      research: { name:'RESEARCH FEDERATION', min:500, s5:8, weights:{ s1:.58, s2:.08, s3:.06, s3x:.06, s4:.21, s5:.01 } },
      emergency: { name:'EMERGENCY NETWORK', min:100, s5:3, weights:{ s1:.67, s2:.20, s3:.06, s3x:.03, s4:.035, s5:.005 } }
    };
    var sessionSystems = ['s1', 's2', 's3', 's3x', 's4', 's5'];
    var pyramidSystems = ['s1', 's2', 's3', 's4', 's5'];
    var templateButtons = Array.prototype.slice.call(document.querySelectorAll('[data-vsm-template]'));
    var systemToggles = Array.prototype.slice.call(playground.querySelectorAll('[data-vsm-system]'));
    var allocationInputs = Array.prototype.slice.call(playground.querySelectorAll('[data-vsm-allocation]'));
    var totalRange = document.getElementById('vsm-total-range');
    var minimumTrack = playground.querySelector('[data-vsm-minimum-track]');
    var minimumValue = playground.querySelector('[data-vsm-minimum]');
    var profileName = playground.querySelector('[data-vsm-profile]');
    var profileRequirement = playground.querySelector('[data-vsm-requirement]');
    var profileOrigin = playground.querySelector('[data-vsm-origin]');
    var selectedProfile = 'legion';
    var currentWeights = Object.assign({}, profiles.legion.weights);

    function formatCount(value) { return Number(value).toLocaleString('en-US'); }
    function totalCapacity() { return Math.max(10, Math.min(10000, Math.round(Math.pow(10, Number(totalRange.value))))); }
    function shortCount(value) { return value >= 1000 ? (value / 1000) + 'K' : String(value); }
    function setMinimum(profile) {
      minimumTrack.style.setProperty('--minimum-position', (((Math.log10(profile.min) - 1) / 3) * 100).toFixed(2) + '%');
      minimumValue.textContent = shortCount(profile.min);
    }
    function syncAllocationInputs() {
      allocationInputs.forEach(function (input) {
        var key = input.getAttribute('data-vsm-allocation');
        var percent = currentWeights[key] * 100;
        input.value = percent.toFixed(1);
        playground.querySelector('[data-vsm-allocation-value="' + key + '"]').textContent = percent.toFixed(1) + '%';
      });
    }
    function adjustAllocation(changedKey, percent) {
      var changedWeight = Math.max(0, Math.min(1, percent / 100));
      var remaining = 1 - changedWeight;
      var otherTotal = sessionSystems.reduce(function (sum, key) { return sum + (key === changedKey ? 0 : currentWeights[key]); }, 0);
      sessionSystems.forEach(function (key) {
        if (key === changedKey) currentWeights[key] = changedWeight;
        else currentWeights[key] = otherTotal ? currentWeights[key] / otherTotal * remaining : remaining / (sessionSystems.length - 1);
      });
      syncAllocationInputs();
    }
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
      profileRequirement.textContent = 'FREE ALLOCATION';
      templateButtons.forEach(function (button) { button.setAttribute('aria-pressed', 'false'); });
    }
    function renderPlayground() {
      var total = totalCapacity();
      var counts = {};
      var roundedTotal = 0;
      sessionSystems.forEach(function (key) {
        counts[key] = Math.round(total * currentWeights[key]);
        roundedTotal += counts[key];
      });
      var correctionKey = sessionSystems.reduce(function (largest, key) { return counts[key] > counts[largest] ? key : largest; }, sessionSystems[0]);
      counts[correctionKey] += total - roundedTotal;
      if (selectedProfile !== 'custom') {
        var profile = profiles[selectedProfile];
        var constrainedS5 = profile.s5Mode === 'max' ? Math.min(counts.s5, profile.s5) : profile.s5;
        counts.s1 += counts.s5 - constrainedS5;
        counts.s5 = constrainedS5;
      }
      var running = sessionSystems.reduce(function (sum, key) { return sum + (isSystemOn(key) ? counts[key] : 0); }, 0);
      var maxCount = Math.max.apply(Math, pyramidSystems.map(function (key) { return counts[key]; }));
      pyramidSystems.forEach(function (key) {
        var enabled = isSystemOn(key);
        var count = enabled ? counts[key] : 0;
        var tier = playground.querySelector('[data-vsm-tier="' + key + '"]');
        tier.classList.toggle('is-off', !enabled);
        tier.style.setProperty('--tier-width', count ? Math.max(6, Math.sqrt(count / maxCount) * 100).toFixed(2) + '%' : '0%');
        playground.querySelector('[data-vsm-count="' + key + '"]').textContent = formatCount(count);
      });
      var auditOn = isSystemOn('s3x');
      playground.querySelector('[data-vsm-audit]').classList.toggle('is-off', !auditOn);
      playground.querySelector('[data-vsm-audit-count]').textContent = formatCount(auditOn ? counts.s3x : 0);
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
      currentWeights = Object.assign({}, profiles[key].weights);
      if (totalCapacity() < profiles[key].min) totalRange.value = String(Math.log10(profiles[key].min));
      setMinimum(profiles[key]);
      syncAllocationInputs();
      playground.setAttribute('data-template', key);
      profileName.textContent = profiles[key].name;
      profileRequirement.textContent = 'MIN ' + formatCount(profiles[key].min) + ' · ' + (profiles[key].s5Mode === 'max' ? 'MAX' : 'FIXED') + ' S5 × ' + profiles[key].s5;
      profileOrigin.hidden = true;
      systemToggles.forEach(function (toggle) { toggle.checked = true; });
      templateButtons.forEach(function (button) { button.setAttribute('aria-pressed', String(button.getAttribute('data-vsm-template') === key)); });
      renderPlayground();
    }
    templateButtons.forEach(function (button) {
      button.addEventListener('click', function () { selectProfile(button.getAttribute('data-vsm-template')); });
    });
    totalRange.addEventListener('input', function () {
      if (selectedProfile !== 'custom' && totalCapacity() < profiles[selectedProfile].min) setCustom();
      renderPlayground();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-vsm-total-preset]'), function (button) {
      button.addEventListener('click', function () {
        totalRange.value = String(Math.log10(Number(button.getAttribute('data-vsm-total-preset'))));
        if (selectedProfile !== 'custom' && totalCapacity() < profiles[selectedProfile].min) setCustom();
        renderPlayground();
      });
    });
    systemToggles.forEach(function (toggle) {
      toggle.addEventListener('change', function () { setCustom(); renderPlayground(); });
    });
    allocationInputs.forEach(function (input) {
      input.addEventListener('input', function () {
        adjustAllocation(input.getAttribute('data-vsm-allocation'), Number(input.value));
        setCustom();
        renderPlayground();
      });
    });
    setMinimum(profiles.legion);
    syncAllocationInputs();
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
