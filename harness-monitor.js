(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const serverMode = document.body?.dataset.monitorMode === 'server';
  const table = $('harness-table');
  const body = table.tBodies[0];
  const query = $('monitor-query'), filter = $('monitor-filter'), size = $('monitor-size');
  const status = $('monitor-status');
  const params = () => new URLSearchParams(location.search);
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase();
  const columns = ['name','a','date','model','ref',0,1,2,3,4,5,'rank'];
  // Presentation-only model-era estimate; not a recorded execution identity.
  // Only regular ChatGPT Chat is assumed, never Work/Codex/API.
  function modelEra(reviewedAt) {
    const day = String(reviewedAt || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return {label:'Unknown', order:0, detail:'Missing review date: model unknown'};
    if (day < '2026-10-07') return {label:'GPT-5.6 Sol', order:1, detail:'Date-inferred ChatGPT Chat era; not a verified model run'};
    if (day === '2026-10-07') return {label:'GPT-5.6 / GPT-6 (rollout)', order:2, detail:'GPT-5.6 Sol or GPT-6 Sol may have been used during the rollout day. Exact per-assessment model is unknown; this is a date-based estimate, not evidence both models participated.'};
    return {label:'GPT-6 Sol', order:3, detail:'Date-inferred ChatGPT Chat era; not a verified model run'};
  }
  function assessedByColumn(entry, html) {
    const inferred = modelEra(entry.date);
    const cell = `<td class="assessment-model" data-sort-value="${inferred.order}" title="${inferred.detail}">${inferred.label}</td>`;
    return html.replace(/(<td class="review-date">[\s\S]*?<\/td>)/, `$1${cell}`);
  }
  // Add one view-only column after Reviewed in both paginated and Server Edition tables.
  const headings = table.tHead?.rows?.[0];
  if (headings?.insertBefore) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.title = 'Model era inferred from review date, not verified execution provenance; on rollout day either GPT-5.6 Sol or GPT-6 Sol may have been used.';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sort-button';
    button.dataset.sortType = 'number';
    button.textContent = 'Assessed by';
    th.appendChild(button);
    headings.insertBefore(th, headings.cells[3] || null);
    headings.querySelectorAll('.sort-button').forEach((control, index) => { control.dataset.sortIndex = String(index); });
  }
  const keyStates = ['A','C','P','—','?','A(P)','C(P)'];
  const systemNames = ['S1','S2','S3','S3*','S4','S5'];
  const serverButtons = () => [...(document.querySelectorAll?.('[data-server-state]') || [])];
  const states = new Map([['A',5],['A(P)',5],['P',4],['C',3],['C(P)',3],['—',2],['?',1]]);
  function readState() {
    const p = params();
    const parseKeys = value => (value || '').split(',').filter(value=>keyStates.includes(value));
    return {keys:parseKeys(p.get('keys')), systems:systemNames.map((name,index)=>parseKeys(p.get(`s${index}`))), extended:p.get('extended') === '1', q:p.get('q') || '', filter:['agent','full','composable','parent','unknown'].includes(p.get('filter')) ? p.get('filter') : 'all', size:[20,50,100].includes(Number(p.get('size'))) ? Number(p.get('size')) : 20, page:Math.max(1, Math.floor(Number(p.get('page'))) || 1), sort:columns.includes(p.get('sort')) ? p.get('sort') : /^\d$/.test(p.get('sort') || '') && Number(p.get('sort')) < 6 ? Number(p.get('sort')) : 'rank', dir:p.get('dir') === 'desc' ? 'desc' : 'asc'};
  }
  let state = readState(), snapshot, view = 0, refreshing = false, debounce;
  let checkedAt;
  window.harnessChunks = Object.create(null);
  const loading = new Map();
  function loadScript(src) {
    return new Promise((resolve,reject) => {
      const script = document.createElement('script');
      let finished = false;
      const finish = error => {
        if (finished) return;
        finished = true; clearTimeout(timeout); script.remove();
        error ? reject(error) : resolve();
      };
      const timeout = setTimeout(() => finish(new Error('Loading timed out')),15000);
      script.onload = () => finish(); script.onerror = () => finish(new Error('Could not load published data'));
      script.src = src; document.head.append(script);
    });
  }
  async function chunk(file) {
    if (window.harnessChunks[file]) return window.harnessChunks[file];
    if (!loading.has(file)) loading.set(file, loadScript(`assets/harness-index/${file}`).then(() => {
      if (!window.harnessChunks[file]) throw new Error('Missing results chunk');
      return window.harnessChunks[file];
    }).finally(() => loading.delete(file)));
    return loading.get(file);
  }
  function selected(entries) {
    const terms = normalize(state.q).trim().split(/\s+/).filter(Boolean);
    return entries.filter(e => {
      const text = normalize(`${e.name} ${e.repository}`);
      if (!terms.every(t => text.includes(t))) return false;
      if (serverMode && state.keys.length && !e.states.some(value=>state.keys.includes(value))) return false;
      if (serverMode && !state.systems.every((keys,index)=>!keys.length || keys.includes(e.states[index]))) return false;
      return state.filter === 'all' || state.filter === 'agent' && e.a > 0 || state.filter === 'full' && e.a === 6 || state.filter === 'composable' && e.c > 0 || state.filter === 'parent' && e.states.some(s => s.includes('P')) || state.filter === 'unknown' && e.states.includes('?');
    }).sort((a,b) => {
      const value = e => state.sort === 'model' ? modelEra(e.date).order : typeof state.sort === 'number' ? states.get(e.states[state.sort]) || 0 : e[state.sort];
      const av = value(a), bv = value(b);
      const result = typeof av === 'number' ? av-bv : String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});
      return (state.dir === 'desc' ? -result : result) || a.rank-b.rank;
    });
  }
  function syncControls() {
    query.value=state.q; filter.value=state.filter; size.value=String(state.size);
    if (serverMode) {
      serverButtons().forEach(button=>{
        const system=button.dataset.serverSystem;
        const keys=system === undefined ? state.keys : state.systems[Number(system)];
        button.setAttribute('aria-pressed',String(keys.includes(button.dataset.serverState)));
      });
      const toggle=$('server-extended-toggle'), extended=$('server-extended-filters');
      if (toggle && extended) {toggle.setAttribute?.('aria-expanded',String(state.extended));extended.hidden=!state.extended;}
    }
    table.querySelectorAll('.sort-button').forEach(button => {
      const active = columns[Number(button.dataset.sortIndex)] === state.sort;
      button.classList.toggle('is-sorted',active);
      button.classList.toggle('desc',active && state.dir === 'desc');
      button.closest('th').setAttribute('aria-sort',active ? state.dir === 'desc' ? 'descending' : 'ascending' : 'none');
    });
  }
  function writeURL(replace = false) {
    const p = new URLSearchParams();
    if (state.q) p.set('q',state.q);
    if (state.filter !== 'all') p.set('filter',state.filter);
    if (serverMode) {
      if (state.keys.length) p.set('keys',state.keys.join(','));
      state.systems.forEach((keys,index)=>{if (keys.length) p.set(`s${index}`,keys.join(','));});
      if (state.extended) p.set('extended','1');
    }
    if (!serverMode) {p.set('size',state.size); p.set('page',state.page);}
    if (state.sort !== 'rank') {p.set('sort',state.sort);p.set('dir',state.dir);}
    const url = `${location.pathname}?${p}${location.hash}`;
    if (url !== `${location.pathname}${location.search}${location.hash}`) history[replace?'replaceState':'pushState'](null,'',url);
  }
  async function render(replace = false, preserveScroll = false) {
    if (!snapshot) return;
    const current = ++view;
    const matches = selected(snapshot.entries);
    const pages = serverMode ? 1 : Math.max(1,Math.ceil(matches.length/state.size));
    state.page = Math.min(state.page,pages);
    writeURL(replace); syncControls();
    $('monitor-prev').disabled = state.page <= 1;
    $('monitor-next').disabled = state.page >= pages;
    $('monitor-page').textContent = `Page ${state.page} of ${pages}`;
    const start = serverMode ? 0 : (state.page-1)*state.size, entries = serverMode ? matches : matches.slice(start,start+state.size);
    const version = snapshot;
    if (serverMode) renderRecent();
    table.setAttribute('aria-busy','true');
    const wrap = table.closest('.vhi-table-wrap');
    const scroll = {top:wrap.scrollTop, left:wrap.scrollLeft};
    status.textContent = 'Loading results…';
    try {
      let allRows;
      if (serverMode) {
        const file = version.fullFile;
        if (!loading.has(file)) loading.set(file, loadScript(`assets/harness-index/${file}`).then(() => {
          if (!Array.isArray(window.harnessAllRows)) throw new Error('Missing complete corpus');
          return window.harnessAllRows;
        }).catch(error => {loading.delete(file);throw error;}));
        allRows = await loading.get(file);
      } else {
        const files = [...new Set(entries.map(e => e.file))];
        await Promise.all(files.map(chunk));
      }
      if (current !== view) return;
      const retainedScroll=preserveScroll ? {top:wrap.scrollTop,left:wrap.scrollLeft} : scroll;
      // HTML is generated locally from escaped, pinned canonical assessments.
      body.innerHTML = entries.map(e => assessedByColumn(e, serverMode ? allRows[e.rank-1] : window.harnessChunks[e.file][e.offset])).join('');
      body.querySelectorAll('th[scope="row"] > a').forEach(link => {
        const url = new URL(link.href);
        if (url.hostname === 'github.com') {link.title = `${link.textContent} · ${url.pathname.slice(1)}`; link.textContent = url.pathname.slice(1);}
      });
      status.textContent = matches.length ? `${start+1}–${start+entries.length} of ${matches.length} results · ${snapshot.entries.length} harnesses in the index` : `No matching harnesses. Try another query or clear the filters.`;
      wrap.scrollTop = preserveScroll ? retainedScroll.top : 0;
      wrap.scrollLeft = retainedScroll.left;
    } catch (error) {
      if (current === view) status.textContent = serverMode ? 'Results could not be loaded. Use Refresh now to retry.' : 'Results could not be loaded. Retrying in the background.';
    } finally {if (current === view) table.setAttribute('aria-busy','false');}
  }
  const escapeHTML = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function fingerprint(entry) {
    return `<div class="server-fingerprint">${entry.states.map((value,index)=>`<span><small>${systemNames[index]}</small><button type="button" class="server-key ${value.startsWith('A')?'state-a':value.startsWith('C')?'state-c':value==='P'?'state-p':value==='?'?'state-unknown':'state-none'}" data-server-system="${index}" data-server-state="${value}" aria-label="Filter ${systemNames[index]} by ${value}" aria-pressed="${state.systems[index].includes(value)}" title="Filter ${systemNames[index]} by ${value}">${value}</button></span>`).join('')}</div>`;
  }
  function renderRecent() {
    const last=$('server-latest-assessment'), recent=$('server-latest-six');
    if (!last || !recent) return;
    const latest=[...snapshot.entries].sort((a,b)=>Date.parse(b.assessedAt || b.date)-Date.parse(a.assessedAt || a.date)||a.assessment.localeCompare(b.assessment)||a.rank-b.rank).slice(0,6);
    const canonical=latest[0];
    last.innerHTML=canonical ? `<article class="server-search-card">${fingerprint(canonical)}<a href="${escapeHTML(canonical.repository)}" target="_blank" rel="noopener">${escapeHTML(canonical.name)} ↗</a><p>${escapeHTML(canonical.repository.replace('https://github.com/',''))}</p><time datetime="${canonical.assessedAt}">Assessed ${canonical.assessedAt.slice(0,10)}</time><a class="server-assessment-link" href="${escapeHTML(canonical.assessment)}" target="_blank" rel="noopener">Open assessment ↗</a></article>` : '<p class="server-recent-empty">No published assessments.</p>';
    recent.innerHTML=latest.map(entry=>`<article class="server-latest-item"><button type="button" data-server-query="${escapeHTML(entry.name)}" title="Search ${escapeHTML(entry.name)}">${escapeHTML(entry.name)}</button><time datetime="${entry.assessedAt}">${entry.assessedAt.slice(0,10)}</time>${fingerprint(entry)}</article>`).join('');
    [last,recent].forEach(panel=>{
      panel.querySelectorAll?.('[data-server-state]').forEach(button=>button.addEventListener('click',()=>toggleKey(button)));
      panel.querySelectorAll?.('[data-server-query]').forEach(button=>button.addEventListener('click',()=>{query.value=button.dataset.serverQuery;change();}));
    });
  }
  function toggleKey(button) {
    clearTimeout(debounce);
    state.q=query.value;
    const system=button.dataset.serverSystem;
    const keys=system === undefined ? state.keys : state.systems[Number(system)];
    const value=button.dataset.serverState, index=keys.indexOf(value);
    if (index < 0) keys.push(value); else keys.splice(index,1);
    state.filter='all';state.page=1;
    render();
  }
  async function refresh() {
    if (refreshing) return;
    refreshing=true; if ($('monitor-refresh')) $('monitor-refresh').disabled=true;
    try {
      await loadScript(`assets/harness-index/manifest.js?check=${Date.now()}`);
      const next = window.harnessSnapshot;
      if (!next || !Array.isArray(next.entries)) throw new Error('Invalid snapshot');
      const changed = !snapshot || next.revision !== snapshot.revision;
      snapshot=next; checkedAt=new Date();
      if (changed && $('monitor-metrics')) $('monitor-metrics').innerHTML=snapshot.metrics;
      updateHealth();
      if (changed || table.getAttribute('aria-busy') !== 'true' && !body.rows.length) await render(true,true);
    } catch (error) {
      if ($('monitor-freshness')) $('monitor-freshness').textContent = snapshot ? `Update check failed. Showing snapshot from ${snapshot.updatedAt}. Retry with Refresh now.` : 'Snapshot could not be loaded. Use Refresh now to retry.';
      if (!snapshot) status.textContent = 'Waiting for published data.';
    } finally {refreshing=false; if ($('monitor-refresh')) $('monitor-refresh').disabled=false;}
  }
  function updateHealth() {
    if (snapshot && checkedAt && $('monitor-freshness')) {
      const age = Math.max(0,Math.floor((Date.now()-Date.parse(snapshot.updatedAt))/3600000));
      $('monitor-freshness').textContent = `Source updated ${new Date(snapshot.updatedAt).toLocaleString()} · ${age}h ago · checked ${checkedAt.toLocaleTimeString()} · checks every 60s`;
    }
  }
  const change = () => {state.q=query.value;state.filter=filter.value;state.size=Number(size.value);state.page=1;render();};
  query.addEventListener('input',() => {clearTimeout(debounce);debounce=setTimeout(change,200);});
  query.addEventListener('keydown',event => {if (event.key === 'Escape') {query.value='';change();}});
  $('monitor-controls').addEventListener('submit',event => {event.preventDefault();clearTimeout(debounce);change();});
  filter.addEventListener('change',change);size.addEventListener('change',change);
  $('monitor-clear').addEventListener('click',() => {query.value='';filter.value='all';state.keys=[];state.systems=systemNames.map(()=>[]);change();query.focus();});
  $('monitor-prev').addEventListener('click',() => {state.page--;render();});
  $('monitor-next').addEventListener('click',() => {state.page++;render();});
  table.querySelectorAll('.sort-button').forEach(button => button.addEventListener('click',() => {
    const sort=columns[Number(button.dataset.sortIndex)];
    state.dir=state.sort===sort ? state.dir==='asc'?'desc':'asc' : button.dataset.sortType==='text'?'asc':'desc';
    state.sort=sort;state.page=1;render();
  }));
  $('monitor-refresh')?.addEventListener('click',async () => {await refresh();await render(true,true);});
  window.addEventListener('popstate',() => {state=readState();render(true);});
  document.addEventListener('visibilitychange',() => {if (!document.hidden) refresh();});
  setInterval(() => {if (!document.hidden) refresh();},60000);
  if (serverMode) {
    serverButtons().forEach(button=>button.addEventListener('click',()=>toggleKey(button)));
    $('server-extended-toggle')?.addEventListener('click',()=>{state.extended=!state.extended;writeURL();syncControls();});
    const nav=$('server-console-nav');
    if (nav && 'ResizeObserver' in window) new window.ResizeObserver(()=>document.documentElement.style.setProperty('--server-nav-height',`${nav.getBoundingClientRect().height}px`)).observe(nav);
  }
  const legend=$('autonomy-legend');
  if (legend?.showModal) {
    let opener, previousOverflow;
    [...(document.querySelectorAll?.('[data-autonomy-legend-open]') || [])].forEach(button=>button.addEventListener('click',()=>{
      opener=button;previousOverflow=document.documentElement.style.overflow;
      legend.showModal();document.documentElement.style.overflow='hidden';
    }));
    legend.querySelector('[data-autonomy-legend-close]').addEventListener('click',()=>legend.close());
    legend.addEventListener('close',()=>{document.documentElement.style.overflow=previousOverflow;opener?.focus({preventScroll:true});});
  }
  syncControls();refresh();
})();
