const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {}),headless:true,args:['--no-sandbox']});
try {
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const root=require('node:path').resolve(__dirname,'..');require('node:fs').mkdirSync(root+'/work',{recursive:true});const url=pathToFileURL(root+'/harness-monitor.html').href;
await page.goto(url);await page.waitForFunction(()=>document.querySelector('#harness-table tbody').rows.length===20);
await page.locator('#monitor-next').click();await page.waitForFunction(()=>document.querySelector('#monitor-status').textContent.startsWith('21–40'));
await page.locator('#monitor-size').selectOption('100');await page.waitForFunction(()=>document.querySelector('#harness-table tbody').rows.length===100);
await page.locator('#monitor-query').fill('atmosphere');await page.waitForFunction(()=>document.querySelector('#harness-table tbody').rows.length===1);
await page.locator('#monitor-clear').click();await page.waitForFunction(()=>document.querySelector('#harness-table tbody').rows.length===100);
await page.locator('#monitor-filter').selectOption('full');await page.waitForFunction(()=>document.querySelector('#harness-table tbody').rows.length===1);
for (const [w,h] of [[1366,768],[390,844]]) {
await page.setViewportSize({width:w,height:h});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'monitor page width');
await page.screenshot({path:root+`/work/harness-monitor-${w}.png`,fullPage:true});
await page.goto(pathToFileURL(root+'/vsm-index.html').href);
assert.equal(await page.locator('.index-poster').count(),3);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'index page width');
await page.screenshot({path:root+`/work/index-posters-${w}.png`,fullPage:true});
await page.goto(url);await page.waitForFunction(()=>document.querySelector('#harness-table tbody').rows.length===20);
}
// Prepared animation never mutates the real user's query or loads the corpus.
const landing=pathToFileURL(root+'/vsm-index.html').href;
const requested=[];page.on('request',r=>requested.push(r.url()));
await page.emulateMedia({reducedMotion:'no-preference'});
await page.goto(landing);
await page.locator('#index-query').fill('codex');
await page.waitForFunction(()=>document.querySelector('[data-search-demo]').dataset.demoStage==='typing');
await page.locator('[data-demo-toggle]').click();
const paused=await page.locator('[data-demo-text]').textContent();
await page.waitForTimeout(350);
assert.equal(await page.locator('[data-demo-text]').textContent(),paused);
assert.equal(await page.locator('#index-query').inputValue(),'codex');
assert.equal(requested.some(url=>url.includes('harness-index/')),false);
await page.emulateMedia({reducedMotion:'reduce'});
await page.goto(landing);
assert.equal(await page.locator('[data-demo-toggle]').textContent(),'Next example');
const first=await page.locator('[data-demo-text]').textContent();
await page.locator('[data-demo-toggle]').click();
assert.notEqual(await page.locator('[data-demo-text]').textContent(),first);
await page.locator('#index-query').fill('codex');
await page.locator('.index-search-form button').click();
await page.waitForFunction(()=>window.harnessSnapshot && document.querySelector('#harness-table tbody').rows.length===window.harnessSnapshot.entries.filter(e=>(e.name+' '+e.repository).toLowerCase().includes('codex')).length);
assert.ok(page.url().includes('q=codex'));
// Pixel VSM signals move automatically and respect reduced motion.
await page.goto(landing);await page.emulateMedia({reducedMotion:'no-preference'});
await page.locator('[data-vsm-flow]').scrollIntoViewIfNeeded();
await page.waitForFunction(()=>!document.querySelector('[data-vsm-flow]').classList.contains('is-paused'));
const signal=page.locator('.traffic-steady').first();
assert.ok(new Set(await page.locator('.vsm-flow-signal').evaluateAll(elements=>elements.map(e=>getComputedStyle(e).animationDuration))).size>=4);
assert.equal(await page.locator('.vsm-flow-priority-signal').count(),1);
const flowStart=await signal.evaluate(e=>getComputedStyle(e).offsetDistance);
await page.waitForTimeout(250);
assert.notEqual(await signal.evaluate(e=>getComputedStyle(e).offsetDistance),flowStart);
assert.equal(await page.locator('[data-flow-toggle]').count(),0);
assert.equal(await signal.evaluate(e=>getComputedStyle(e).filter),'none');
await page.emulateMedia({reducedMotion:'reduce'});
assert.equal(await signal.evaluate(e=>getComputedStyle(e).animationName),'none');
for (const [w,h] of [[1366,768],[390,844]]) {
await page.setViewportSize({width:w,height:h});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.locator('[data-vsm-flow]').scrollIntoViewIfNeeded();
await page.screenshot({path:root+`/work/vsm-flow-${w}.png`});
}
// Server edition downloads a single complete pack and displays every entry.
requested.length=0;
await page.goto(pathToFileURL(root+'/harness-server.html').href);
await page.waitForFunction(()=>window.harnessSnapshot && document.querySelector('#harness-table tbody').rows.length===window.harnessSnapshot.entries.length);
assert.equal(requested.filter(url=>/harness-index\/all-/.test(url)).length,1);
assert.equal(requested.filter(url=>/harness-index\/rows-/.test(url)).length,0);
assert.equal(await page.locator('#monitor-metrics').count(),0);
assert.equal(await page.locator('#monitor-filter').isVisible(),false);
assert.equal(await page.locator('#monitor-size').isVisible(),false);
assert.equal(await page.locator('.monitor-pagination').isVisible(),false);
const latestCard=await page.locator('#server-latest-assessment').innerHTML();
assert.ok(await page.locator('#server-latest-assessment .server-assessment-link').getAttribute('href'));
await page.locator('#monitor-query').fill('codex');
await page.waitForFunction(()=>window.harnessSnapshot && document.querySelector('#harness-table tbody').rows.length===window.harnessSnapshot.entries.filter(e=>(e.name+' '+e.repository).toLowerCase().includes('codex')).length);
assert.equal(await page.locator('#server-latest-assessment').innerHTML(),latestCard);
await page.locator('#monitor-clear').click();
await page.waitForFunction(()=>document.querySelector('#harness-table tbody').rows.length===window.harnessSnapshot.entries.length);
await page.locator('[data-sort-index="2"]').click();
await page.waitForFunction(()=>document.querySelector('#harness-table').getAttribute('aria-busy')==='false');
const dates=await page.locator('#harness-table tbody time').allTextContents();
assert.deepEqual(dates,[...dates].sort().reverse());
for (const [w,h] of [[1366,768],[390,844]]) {
await page.setViewportSize({width:w,height:h});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'server page width');
await page.screenshot({path:root+`/work/harness-server-${w}.png`,fullPage:true});
}
await page.setViewportSize({width:1366,height:768});
await page.goto(pathToFileURL(root+'/harness-server.html').href);
await page.waitForFunction(()=>window.harnessSnapshot && document.querySelector('#harness-table tbody').rows.length===window.harnessSnapshot.entries.length);
assert.equal(await page.locator('.server-filter-strip .server-key').count(),7);
assert.equal(await page.locator('.server-latest-item').count(),6);
assert.equal(await page.locator('.server-latest-item .server-key').count(),36);
const basic=page.locator('.server-filter-strip [data-server-state="A(P)"]');
await basic.click();
await page.waitForFunction(()=>document.querySelector('#harness-table').getAttribute('aria-busy')==='false');
assert.equal(await page.locator('#harness-table tbody tr').count(),await page.evaluate(()=>window.harnessSnapshot.entries.filter(e=>e.states.includes('A(P)')).length));
assert.equal(await basic.getAttribute('aria-pressed'),'true');
await basic.click();
await page.locator('#server-extended-toggle').click();
assert.equal(await page.locator('#server-extended-filters').isVisible(),true);
assert.equal(await page.locator('#server-extended-filters .server-key').count(),42);
await page.locator('#server-extended-filters [data-server-system="0"][data-server-state="A"]').click();
await page.locator('#server-extended-filters [data-server-system="2"][data-server-state="C"]').click();
await page.waitForFunction(()=>document.querySelector('#harness-table').getAttribute('aria-busy')==='false');
assert.equal(await page.locator('#harness-table tbody tr').count(),await page.evaluate(()=>window.harnessSnapshot.entries.filter(e=>e.states[0]==='A' && e.states[2]==='C').length));
assert.ok(page.url().includes('s0=A'));
await page.reload();
await page.waitForFunction(()=>document.querySelector('#harness-table').getAttribute('aria-busy')==='false' && window.harnessSnapshot);
assert.equal(await page.locator('#server-extended-toggle').getAttribute('aria-expanded'),'true');
await page.locator('#monitor-query').fill('codex');
await page.waitForFunction(()=>new URLSearchParams(location.search).get('q')==='codex' && document.querySelector('#harness-table').getAttribute('aria-busy')==='false');
assert.equal(await page.locator('#server-latest-assessment .server-key').count(),6);
await page.locator('#monitor-clear').click();
await page.waitForFunction(()=>document.querySelector('#harness-table tbody').rows.length===window.harnessSnapshot.entries.length);
assert.equal(await page.locator('#server-latest-assessment').innerHTML(),latestCard);
await page.evaluate(()=>window.scrollTo(0,1000));
assert.equal(await page.locator('#server-console-nav').evaluate(nav=>Math.round(nav.getBoundingClientRect().top)),0);
for (const [w,h] of [[1366,768],[390,844]]) {
await page.setViewportSize({width:w,height:h});await page.evaluate(()=>window.scrollTo(0,0));
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'extended server page width');
await page.screenshot({path:root+`/work/harness-server-filters-${w}.png`,fullPage:true});
}
// Stable table viewport and scroll position through a background refresh.
await page.setViewportSize({width:1366,height:768});
await page.goto(url+'?size=100&page=1');
await page.waitForFunction(()=>document.querySelector('#harness-table tbody').rows.length===100);
const before=await page.locator('.vhi-table-wrap').evaluate(w=>{w.scrollTop=300;w.scrollLeft=80;return {top:w.scrollTop,left:w.scrollLeft,height:w.clientHeight};});
assert.equal(await page.locator('#monitor-refresh, #monitor-freshness').count(),0);
await Promise.all([page.waitForResponse(r=>r.url().includes('manifest.js?check=')),page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')))]);
await page.waitForFunction(()=>!document.querySelector('script[src*="manifest.js?check="]'));
const after=await page.locator('.vhi-table-wrap').evaluate(w=>({top:w.scrollTop,left:w.scrollLeft,height:w.clientHeight}));
assert.deepEqual(after,before);
const buttons=await page.locator('.monitor-pagination').evaluate(nav=>{const p=nav.querySelector('#monitor-prev').getBoundingClientRect(),n=nav.querySelector('#monitor-next').getBoundingClientRect(),b=nav.getBoundingClientRect();return {gap:n.left-p.right,right:b.right-n.right,top:Math.abs(p.top-n.top)};});
assert.ok(buttons.gap<=12 && buttons.right<=2 && buttons.top<=1,'paging buttons adjacent on bottom right');
for (const file of ['harness-monitor.html','harness-server.html']) {
await page.goto(pathToFileURL(root+'/'+file).href);
await page.waitForFunction(()=>window.harnessSnapshot && document.querySelector('#harness-table').getAttribute('aria-busy')==='false');
assert.equal(await page.locator('#monitor-uptime').count(),0);
for (const [w,h] of [[1366,768],[390,844]]) {
await page.setViewportSize({width:w,height:h});
const open=page.locator('[data-autonomy-legend-open]').first();
await open.click();
assert.equal(await page.locator('#autonomy-legend').evaluate(d=>d.open),true);
const bounds=await page.locator('#autonomy-legend').evaluate(d=>{const r=d.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,vw:innerWidth,vh:innerHeight};});
assert.ok(bounds.width<bounds.vw && bounds.height<bounds.vh,'legend leaves space around the window');
assert.ok(Math.abs(bounds.left+bounds.width/2-bounds.vw/2)<=6 && Math.abs(bounds.top+bounds.height/2-bounds.vh/2)<=1,'legend is centered');
assert.equal(await page.locator('#autonomy-legend .autonomy-legend-tile').count(),7);
await page.screenshot({path:root+`/work/autonomy-legend-${w}.png`});
await page.keyboard.press('Escape');assert.equal(await page.locator('#autonomy-legend').evaluate(d=>d.open),false);
await open.click();await page.locator('[data-autonomy-legend-close]').click();
assert.equal(await page.locator('#autonomy-legend').evaluate(d=>d.open),false);
if (file==='harness-server.html') {
assert.equal(await page.locator('.server-latest-item').count(),6);
assert.equal(await page.locator('#server-latest-six').evaluate(e=>e.scrollHeight<=e.clientHeight+1),true);
assert.equal(await page.locator('#server-search-title').textContent(),'Latest assessment');
}
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
}
}
assert.deepEqual(errors,[]);console.log('Browser checks passed: file:// loading, paging, size 100, global search, filters, three posters, desktop/mobile widths.');
} finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
