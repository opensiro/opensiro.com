'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const source = fs.readFileSync(path.join(root,'harness-monitor.js'),'utf8');
const manifest = () => {const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/harness-index/manifest.js'),'utf8'),context);return context.window.harnessSnapshot;};
test('monitor assets reproduce the complete source without embedding the full table in either page',() => {
  const run=spawnSync(process.execPath,['scripts/build-harness-monitor.cjs','--check'],{cwd:root,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const data=manifest();
  const original=fs.readFileSync(path.join(root,'scripts/templates/vsm-index-source.html'),'utf8');
  const sourceRows=original.match(/<section class="vhi-all"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)[1].match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g);
  assert.equal(data.entries.length,sourceRows.length);
  const context={window:{harnessChunks:{}}};
  for (const file of new Set(data.entries.map(e=>e.file))) vm.runInNewContext(fs.readFileSync(path.join(root,'assets/harness-index',file),'utf8'),context);
  assert.equal(JSON.stringify(data.entries.map(e=>context.window.harnessChunks[e.file][e.offset])),JSON.stringify(sourceRows));
  for (const file of ['vsm-index.html','harness-monitor.html']) {
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.ok(Buffer.byteLength(html)<18000);
    assert.doesNotMatch(html,/rows-[a-f0-9]+\.js/);
    assert.doesNotMatch(html,/<tr[^>]*data-a=/);
  }
  const landing=fs.readFileSync(path.join(root,'vsm-index.html'),'utf8');
  assert.match(landing,/action="harness-monitor.html"/);
  for (const state of ['A(P)','C(P)','Agent-owned','Composable','Parent-assisted','Unknown','No supplied path']) assert.ok(landing.includes(state));
});
function environment(search='',server=false,withHeader=false) {
  const controls = new Map();
  const element = id => {if (!controls.has(id)) controls.set(id,{value:'',textContent:'',innerHTML:'',handlers:{},disabled:false,addEventListener(type,fn){this.handlers[type]=fn;},focus(){}});return controls.get(id);};
  let html='';
  const body={replaceChildren(){html='';},querySelectorAll(){return[];},get rows(){return html.match(/<tr\b/g)||[];},get innerHTML(){return html;},set innerHTML(value){html=value;}};
  const buttons=Array.from({length:10},(_,index)=>({dataset:{sortIndex:String(index),sortType:index===0||index===3?'text':index===2?'date':index===1?'number':'state'},classList:{toggle(){}},closest(){return {setAttribute(){}};},handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}}));
  const table=element('harness-table');table.tBodies=[body];table.attributes={};table.setAttribute=(k,v)=>table.attributes[k]=v;table.getAttribute=k=>table.attributes[k];table.querySelectorAll=()=>buttons;const wrap={scrollTop:0,scrollLeft:0};table.closest=()=>wrap;
  if (withHeader) {
    const cells = buttons.map(button=>({childButton:button}));
    const header = {cells,insertBefore(th,reference){const index=reference?cells.indexOf(reference):cells.length;assert.ok(index>=0);cells.splice(index,0,th);buttons.splice(index,0,th.childButton);},querySelectorAll(){return buttons;}};
    table.tHead={rows:[header]};
  }
  const requested=[];const timers=[];const events={};const location={search,pathname:'/harness-monitor.html',hash:''};
  const context={URL,URLSearchParams,console,Date,Promise,Map,Set,Number,String,Math,window:{harnessChunks:{}},location,setTimeout,clearTimeout,setInterval(fn,ms){timers.push({fn,ms});},history:{pushState(a,b,url){location.search=url.slice(url.indexOf('?'));},replaceState(a,b,url){location.search=url.slice(url.indexOf('?'));}},document:{body:{dataset:{monitorMode:server?'server':''}},hidden:false,getElementById:element,addEventListener(type,fn){events[type]=fn;},createElement(){return {remove(){},dataset:{},classList:{toggle(){}},handlers:{},appendChild(button){this.childButton=button;},addEventListener(type,fn){this.handlers[type]=fn;},closest(){return {setAttribute(){}};}};},head:{append(script){requested.push(script.src);queueMicrotask(()=>{if(context.failManifest && script.src.includes('manifest')) {script.onerror();return;} const file=path.join(root,script.src.split('?')[0]);if(fs.existsSync(file)){vm.runInContext(fs.readFileSync(file,'utf8'),context);script.onload();}else script.onerror();});}}}};
  context.window.addEventListener=(type,fn)=>events[type]=fn;
  vm.createContext(context);vm.runInContext(source,context);
  const settle=async()=>{for(let i=0;i<10;i++) await new Promise(resolve=>setImmediate(resolve));};
  return {element,requested,body,buttons,location,events,timers,context,settle,wrap};
}
test('paging loads one evidence chunk initially, page size, global search, sorting and history work',async()=>{
  const env=environment();await env.settle();
  assert.equal(env.body.rows.length,20);
  assert.equal(env.requested.filter(s=>s.includes('rows-')).length,1);
  assert.match(env.element('monitor-status').textContent,/1–20/);
  env.element('monitor-next').handlers.click();await env.settle();
  assert.equal(env.body.rows.length,20);assert.match(env.location.search,/page=2/);
  env.element('monitor-size').value='100';env.element('monitor-size').handlers.change();await env.settle();
  assert.equal(env.body.rows.length,100);assert.match(env.location.search,/size=100/);
  const last=manifest().entries.at(-1);
  env.element('monitor-query').value=last.repository;
  env.element('monitor-controls').handlers.submit({preventDefault(){}});await env.settle();
  assert.equal(env.body.rows.length,Math.min(100,manifest().entries.filter(e=>e.repository.toLowerCase().includes(last.repository.toLowerCase())).length));assert.ok(env.body.innerHTML.includes(last.repository));
  env.element('monitor-clear').handlers.click();await env.settle();
  env.buttons[2].handlers.click();await env.settle();assert.match(env.location.search,/sort=date/);
  env.location.search='?page=999&size=20';env.events.popstate();await env.settle();
  assert.equal(env.body.rows.length,manifest().entries.length % 20 || 20);assert.equal(env.element('monitor-next').disabled,true);
});
test('deep-link search, empty results, unknown filters and 60-second snapshot refresh work',async()=>{
  const env=environment('?q=no-such-harness&size=999&page=-5');await env.settle();
  assert.equal(env.body.rows.length,0);assert.match(env.element('monitor-status').textContent,/No matching/);
  assert.equal(env.requested.filter(s=>s.includes('rows-')).length,0);
  env.element('monitor-clear').handlers.click();await env.settle();
  env.element('monitor-filter').value='unknown';env.element('monitor-filter').handlers.change();await env.settle();
  assert.match(env.location.search,/filter=unknown/);
  const before=env.requested.length;
  env.timers.find(t=>t.ms===60000).fn();await env.settle();
  assert.equal(env.requested.length,before+1);
  assert.match(env.element('monitor-freshness').textContent,/Source updated/);
  assert.ok(env.body.rows.length<=20);
});

test('failed update checks retain already loaded rows and can be retried',async()=>{
  const env=environment();await env.settle();
  const previous=env.body.innerHTML;
  env.context.failManifest=true;
  env.timers.find(t=>t.ms===60000).fn();await env.settle();
  assert.equal(env.body.innerHTML,previous);
  assert.match(env.element('monitor-freshness').textContent,/Update check failed/);
  env.context.failManifest=false;
  env.element('monitor-refresh').handlers.click();await env.settle();
  assert.match(env.element('monitor-freshness').textContent,/Source updated/);
  assert.equal(env.body.rows.length,20);
});

test('server edition loads the entire corpus once, renders every match and omits paging parameters',async()=>{
  const env=environment('',true);await env.settle();
  assert.equal(env.body.rows.length,manifest().entries.length);
  assert.equal(env.requested.filter(s=>s.includes('all-')).length,1);
  assert.equal(env.requested.filter(s=>s.includes('rows-')).length,0);
  assert.doesNotMatch(env.location.search,/size=|page=/);
  const requests=env.requested.length;
  env.element('monitor-filter').value='full';env.element('monitor-filter').handlers.change();await env.settle();
  assert.equal(env.body.rows.length,manifest().entries.filter(e=>e.a===6).length);
  env.element('monitor-clear').handlers.click();await env.settle();
  env.buttons[2].handlers.click();await env.settle();
  assert.equal(env.body.rows.length,manifest().entries.length);
  assert.equal(env.requested.length,requests);
  assert.match(env.location.search,/sort=date/);
});
test('prepared examples and compact keys stay in sync with the canonical entries',()=>{
  const landing=fs.readFileSync(path.join(root,'vsm-index.html'),'utf8');
  const keys=fs.readFileSync(path.join(root,'scripts/templates/autonomy-key.html'),'utf8').trim();
  assert.ok(landing.includes(keys));
  const dialog=fs.readFileSync(path.join(root,'scripts/templates/autonomy-legend.html'),'utf8').trim();
  for(const name of ['harness-monitor.html','harness-server.html']) assert.ok(fs.readFileSync(path.join(root,name),'utf8').includes(dialog));
  const queries=[...landing.matchAll(/data-demo-query="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(queries.length,3);
  for(const query of queries) assert.ok(manifest().entries.some(e=>e.name.toLowerCase()===query));
  const server=fs.readFileSync(path.join(root,'harness-server.html'),'utf8');
  assert.doesNotMatch(server,/id="monitor-metrics"|class="site-header"|class="site-footer"/);
  assert.match(server,/data-monitor-mode="server"/);
});

test('server icon filters match exact states, combine functions and survive a URL reload',async()=>{
  const env=environment('?keys=A(P),C(P)&s0=A&s2=C&extended=1',true);await env.settle();
  const expected=manifest().entries.filter(e=>e.states.some(s=>['A(P)','C(P)'].includes(s)) && e.states[0]==='A' && e.states[2]==='C');
  assert.equal(env.body.rows.length,expected.length);
  assert.match(env.location.search,/extended=1/);
  assert.ok(env.location.search.includes('s0=A'));
  env.element('monitor-clear').handlers.click();await env.settle();
  assert.equal(env.body.rows.length,manifest().entries.length);
  assert.doesNotMatch(env.location.search,/keys=|s0=|s2=/);
});

test('refresh preserves table scroll and both monitors have the same tiled legend without uptime',async()=>{
  const env=environment();await env.settle();
  env.wrap.scrollTop=280;env.wrap.scrollLeft=120;
  env.element('monitor-refresh').handlers.click();await env.settle();
  assert.equal(env.wrap.scrollTop,280);assert.equal(env.wrap.scrollLeft,120);
  assert.equal(env.timers.some(t=>t.ms===1000),false);
  for(const name of ['harness-monitor.html','harness-server.html']) {
    const html=fs.readFileSync(path.join(root,name),'utf8');
    assert.doesNotMatch(html,/Session uptime|monitor-uptime|S5.only|S5 ONLY|Parent-assisted \(S5\)/);
    assert.match(html,/<dialog class="autonomy-legend-window"/);
  }
});

test('paginated monitor omits snapshot controls and the shared legend uses seven tiles',()=>{
  const html=fs.readFileSync(path.join(root,'harness-monitor.html'),'utf8');
  assert.doesNotMatch(html,/monitor-freshness|monitor-refresh|Refresh now/);
  const legend=fs.readFileSync(path.join(root,'scripts/templates/autonomy-legend.html'),'utf8');
  assert.equal((legend.match(/class="autonomy-legend-tile"/g)||[]).length,7);
  assert.doesNotMatch(legend,/<table/);
});

test('latest assessment card is independent of search and the recent list contains six assessments',async()=>{
  const env=environment('',true);await env.settle();
  const card=env.element('server-latest-assessment').innerHTML;
  const entries=manifest().entries;
  const newest=entries.reduce((a,b)=>Date.parse(a.assessedAt)>Date.parse(b.assessedAt)?a:b);
  assert.ok(card.includes(newest.assessment));
  assert.ok(card.includes(newest.name));
  assert.equal((env.element('server-latest-six').innerHTML.match(/class="server-latest-item"/g)||[]).length,6);
  env.element('monitor-query').value='codex';env.element('monitor-controls').handlers.submit({preventDefault(){}});await env.settle();
  assert.equal(env.element('server-latest-assessment').innerHTML,card);
  env.element('monitor-clear').handlers.click();await env.settle();
  assert.equal(env.element('server-latest-assessment').innerHTML,card);
});


test('Assessed by model era is present in both monitors without modifying canonical snapshot rows', async()=>{
  const paginated=environment();await paginated.settle();
  const server=environment('',true);await server.settle();
  for (const env of [paginated,server]) {
    assert.match(env.body.innerHTML,/class="assessment-model"/);
    assert.match(env.body.innerHTML,/GPT-5\.6 Sol|GPT-6 Sol|GPT-5\.6 \/ GPT-6 \(rollout\)/);
    assert.equal((env.body.innerHTML.match(/class="assessment-model"/g)||[]).length, env.body.rows.length);
  }
  // Source data remains unchanged, including historical dates and classifications.
  assert.doesNotMatch(fs.readFileSync(path.join(root,'scripts/templates/vsm-index-source.html'),'utf8'),/assessment-model/);
  const entries=manifest().entries;
  const inferred=entries.map(e=>e.date < '2026-10-07' ? 'GPT-5.6 Sol' : e.date === '2026-10-07' ? 'GPT-5.6 / GPT-6 (rollout)' : 'GPT-6 Sol');
  assert.equal(inferred.length,entries.length);
  assert.ok(inferred.includes('GPT-5.6 Sol'));
});


test('Assessed by header is inserted after Reviewed, retains sort indices, and sorts server rows',async()=>{
  const env=environment('',true,true);
  await env.settle();
  assert.equal(env.buttons.length,11,'the original ten sortable headers plus one model header');
  assert.equal(env.buttons[3].textContent,'Assessed by');
  assert.equal(env.buttons[3].dataset.sortIndex,'3');
  assert.equal(env.buttons[4].dataset.sortIndex,'4','Pinned ref sort must shift by one');
  assert.equal(env.buttons[10].dataset.sortIndex,'10','S5 must retain its semantic position');
  const cells=env.body.innerHTML.match(/class="assessment-model"/g)||[];
  assert.equal(cells.length,manifest().entries.length);
  env.buttons[3].handlers.click();
  await env.settle();
  assert.match(env.location.search,/sort=model/);
  assert.match(env.location.search,/dir=desc/);
  assert.match(env.body.innerHTML.slice(0,1000),/GPT-6 Sol/);
  env.buttons[3].handlers.click();
  await env.settle();
  assert.match(env.location.search,/dir=asc/);
  assert.match(env.body.innerHTML.slice(0,1000),/GPT-5\.6 Sol/);
});


test('rollout label communicates alternatives, not two verified assessor runs',async()=>{
  const env=environment('',true,true);
  await env.settle();
  const rows=(env.body.innerHTML.match(/class="assessment-model"[^>]*>GPT-5\.6 \/ GPT-6 \(rollout\)<\/td>/g)||[]);
  const expected=manifest().entries.filter(e=>e.date==='2026-10-07').length;
  assert.ok(expected>0);
  assert.equal(rows.length,expected);
  assert.doesNotMatch(env.body.innerHTML,/GPT-5\.6 Sol\*|GPT-6 Sol\*|Transition\*/);
  assert.match(env.body.innerHTML,/Exact per-assessment model is unknown/);
  assert.doesNotMatch(env.body.innerHTML,/both models (were|worked|used)/i);
  assert.equal(env.buttons[3].textContent,'Assessed by');
});
