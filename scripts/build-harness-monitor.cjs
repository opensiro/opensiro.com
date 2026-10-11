'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'scripts/templates/vsm-index-source.html'), 'utf8');
const check = process.argv.includes('--check');
const outputs = new Map();
const hash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
const escape = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const legendWindow = fs.readFileSync(path.join(root,'scripts/templates/autonomy-legend.html'),'utf8').trim();
const legendButton = '<button type="button" class="legend-open" data-autonomy-legend-open>Key legend ↗</button>';
const shortKey = fs.readFileSync(path.join(root,'scripts/templates/autonomy-key.html'),'utf8').trim();
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const body = source.match(/<section class="vhi-all"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)[1];
const rows = [...body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map(m => m[0]);
const entries = [];
for (let start = 0; start < rows.length; start += 20) {
  const group = rows.slice(start, start + 20);
  const key = hash(group.join('\n'));
  const file = `rows-${key}.js`;
  outputs.set(`assets/harness-index/${file}`, `window.harnessChunks[${JSON.stringify(file)}]=${JSON.stringify(group)};\n`);
  group.forEach((html, offset) => {
    const link = html.match(/<th scope="row"><a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    const states = [...html.matchAll(/<abbr\b[^>]*>([^<]+)<\/abbr>/g)].map(m => decode(m[1]));
    const date = html.match(/<time datetime="([^"]+)"/)[1];
    const assessment = html.match(/class="assessment-ref"><a href="([^"]+)"/)[1];
    const assessedAt = html.match(/data-assessment-at="([^"]+)"/)?.[1] || date;
    const year = html.match(/<small>([^<]+)<\/small>/)[1];
    entries.push({name:decode(link[2]), repository:decode(link[1]), a:Number(html.match(/data-a="(\d+)"/)[1]), c:Number(html.match(/data-c="(\d+)"/)[1]), date, assessedAt, assessment, year, ref:html.match(/class="review-ref"><a[^>]*>([^<]+)/)[1].trim(), states, file, offset, rank:start+offset+1});
  });
}
const metrics = source.match(/<!-- VSM INDEX METRICS:START -->([\s\S]*?)<!-- VSM OSS METRICS:END -->/)[0]
  .replace(/(<!-- VSM OSS METRICS:START -->)([\s\S]*?)(<!-- VSM OSS METRICS:END -->)/, '$1<details class="monitor-activity"><summary>Public VSM OSS activity · canonical changes and engineering telemetry</summary>$2</details>$3');
const fullFile = `all-${hash(body)}.js`;
outputs.set(`assets/harness-index/${fullFile}`, `window.harnessAllRows=${JSON.stringify(rows)};\n`);
const snapshot = {fullFile, revision:hash(source), updatedAt:source.match(/Last updated <time datetime="([^"]+)"/)[1], entries, metrics};
outputs.set('assets/harness-index/manifest.js', `window.harnessSnapshot=${JSON.stringify(snapshot)};\n`);
let monitor = source.replace(/<main id="main-content">[\s\S]*?<\/main>/, `<main id="main-content" class="monitor-main"><div class="wrap">
<header class="monitor-heading"><div><p class="eyebrow">INDEX / LIVE SNAPSHOT</p><h1>Harness monitor</h1><p>Evidence, autonomy and the latest published corpus.</p></div><div class="monitor-view-links">${legendButton}<a class="arrow-link" href="harness-server.html">Server edition · entire index ↗</a></div></header>
<div id="monitor-metrics"></div>
<section class="vhi-all" id="all-harnesses" aria-labelledby="monitor-table-title"><h2 id="monitor-table-title">All harnesses</h2>
<form id="monitor-controls" class="monitor-controls" role="search"><label class="monitor-query">Search the entire index<input id="monitor-query" name="q" type="search" placeholder="Name or owner/repository" autocomplete="off"></label><label>Autonomy<select id="monitor-filter" name="filter"><option value="all">All harnesses</option><option value="agent">Agent-owned (A)</option><option value="full">Full-A (six functions)</option><option value="composable">Composable (C)</option><option value="parent">Parent-assisted (P)</option><option value="unknown">Unknown (?)</option></select></label><label>Rows per page<select id="monitor-size" name="size"><option>20</option><option>50</option><option>100</option></select></label><button type="button" id="monitor-clear">Clear filters</button></form>
${shortKey.replace(/<a href="vsm-index.html#state-key">Full key ↗<\/a>/,legendButton)}
<p id="monitor-status" role="status" aria-live="polite">Loading harnesses…</p>
<div class="vhi-table-wrap" tabindex="0" role="region" aria-label="Harness results"><table class="vhi-table" id="harness-table"><caption class="sr-only">Harness autonomy across six VSM functions, with pinned source and assessment revisions</caption>${source.match(/<table[^>]*id="harness-table"[^>]*>([\s\S]*?<\/thead>)/)?.[1] || source.match(/<section class="vhi-all"[\s\S]*?(<thead>[\s\S]*?<\/thead>)/)[1]}<tbody></tbody></table></div>
<nav class="monitor-pagination" aria-label="Harness pages"><span id="monitor-page">Page 1</span><button id="monitor-prev" type="button">← Previous</button><button id="monitor-next" type="button">Next →</button></nav>
<noscript><p>Enable JavaScript to load paginated results, or <a href="https://github.com/opensiro/vsm-harness-index/blob/main/RANKINGS.md">read the canonical rankings</a>.</p></noscript>
</section></div></main>`);
monitor = monitor.replace(/<nav class="vhi-section-nav"[\s\S]*?<\/nav>/,'').replace(/<script src="vsm-index.js[^>]*><\/script>/,'<script src="harness-monitor.js?v=20261011-assessments" defer></script>').replace(/vsm-index.css\?v=[^"]+/,'vsm-index.css?v=20261011').replace('https://opensiro.com/vsm-index.html','https://opensiro.com/harness-monitor.html').replace('https://opensiro.com/vsm-index.html','https://opensiro.com/harness-monitor.html').replaceAll('opensiro / vsm harness index','opensiro / harness monitor').replace('class="vsm-index-page"','class="vsm-index-page harness-monitor-page"');
monitor = monitor.replace('<!-- Cache full harness names before app.js compacts repository labels. -->', '');
monitor = monitor.replace('</head>','<link rel="stylesheet" href="autonomy-key.css?v=20261011-assessments">\n<link rel="stylesheet" href="harness-monitor.css?v=20261011-assessments">\n</head>');
monitor = monitor.replace('</body>',`${legendWindow}\n</body>`);
outputs.set('harness-monitor.html',monitor);
let server = monitor
  .replaceAll('https://opensiro.com/harness-monitor.html','https://opensiro.com/harness-server.html')
  .replaceAll('opensiro / harness monitor','opensiro / harness server edition')
  .replace('class="vsm-index-page harness-monitor-page"','class="vsm-index-page harness-monitor-page server-edition" data-monitor-mode="server"')
  .replace(/<header class="site-header">[\s\S]*?<\/header>/,'')
  .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/,'')
  .replace(/<header class="monitor-heading">[\s\S]*?<\/header>/,'<header class="server-toolbar"><h1>Harness index <small>/ server edition</small></h1><nav aria-label="Monitor views"><a href="vsm-index.html">Index ↗</a><a href="harness-monitor.html">Paginated monitor ↗</a></nav></header>')
  .replace('<div id="monitor-metrics"></div>','')
  .replace(/<h2 id="monitor-table-title">All harnesses<\/h2>/,'<h2 class="sr-only" id="monitor-table-title">All harnesses</h2>')
  .replace('<label>Rows per page<select','<label hidden>Rows per page<select')
  .replace('<nav class="monitor-pagination"','<nav hidden class="monitor-pagination"')
  .replace('load paginated results','load the complete list')
  .replace('</head>','<link rel="stylesheet" href="harness-server.css?v=20261011-assessments">\n</head>');
const keyStates = ['A','C','P','—','?','A(P)','C(P)'];
const keyNames = ['Agent-owned','Composable','Parent-assisted','No supplied path','Unknown','Agent-owned with parent path','Composable with parent path'];
const keyClass = state => state.startsWith('A')?'state-a':state.startsWith('C')?'state-c':state==='P'?'state-p':state==='?'?'state-unknown':'state-none';
const keyButtons = system => keyStates.map((state,index) => `<button type="button" class="server-key ${keyClass(state)}" data-server-state="${state}"${system === undefined ? '' : ` data-server-system="${system}"`} aria-pressed="false" aria-label="${system === undefined ? 'Any function' : ['S1','S2','S3','S3*','S4','S5'][system]}: ${keyNames[index]}" title="${keyNames[index]}">${state}</button>`).join('');
const extended = ['S1','S2','S3','S3*','S4','S5'].map((label,index) => `<div class="server-system-filter" role="group" aria-label="Filter ${label}"><strong>${label}</strong>${keyButtons(index)}</div>`).join('');
const toolbar = server.match(/<header class="server-toolbar">[\s\S]*?<\/header>/)[0];
const health = '<div class="monitor-health"><span id="monitor-freshness">Loading published snapshot…</span><button type="button" id="monitor-refresh">Refresh now</button></div>';
const form = server.match(/<form id="monitor-controls"[\s\S]*?<\/form>/)[0].replace('<label>Autonomy<select','<label hidden>Autonomy<select');
const tableSection = server.match(/<p id="monitor-status"[\s\S]*?<\/section>/)[0];
const consoleNav = `<div class="server-console-nav" id="server-console-nav">${toolbar}${health}${form}<div class="server-filter-strip" role="group" aria-label="Filter autonomy states"><strong>Filter</strong>${keyButtons()}<button type="button" id="server-extended-toggle" aria-expanded="false" aria-controls="server-extended-filters">Extended</button>${legendButton}</div><div class="server-extended-filters" id="server-extended-filters" hidden>${extended}<p>Any selected state within a function; all selected functions must match.</p></div></div>`;
const recent = `<div class="server-recent-panels"><section class="server-recent-panel" aria-labelledby="server-search-title"><header><h2 id="server-search-title">Latest assessment</h2><span>Opensiro</span></header><div id="server-latest-assessment"><p class="server-recent-empty">Loading latest assessment…</p></div></section><section class="server-recent-panel" aria-labelledby="server-latest-title"><header><h2 id="server-latest-title">Latest 6 harnesses</h2><span>By assessment update</span></header><div id="server-latest-six"></div></section></div>`;
server = server.replace(/<main id="main-content"[\s\S]*?<\/main>/, `${consoleNav}<main id="main-content" class="monitor-main"><div class="wrap">${recent}<section class="vhi-all" aria-label="Harness results">${tableSection}</div></main>`);
outputs.set('harness-server.html',server);
const samples = ['Ouroboros','Codex','OpenHands'].map((name,index) => entries.find(e=>e.name===name) || entries[index]).filter(Boolean);
const functions = ['S1','S2','S3','S3*','S4','S5'];
const frames = samples.map((entry,index) => `<article class="search-demo-frame" data-demo-query="${escape(entry.name.toLowerCase())}"${index?' hidden':''}><a href="harness-monitor.html?q=${encodeURIComponent(entry.name)}"><strong>${escape(entry.name)}</strong><span aria-hidden="true">↗</span></a><p>${escape(entry.repository.replace('https://github.com/',''))}</p><div class="search-demo-pattern" aria-label="Autonomy fingerprint">${entry.states.map((state,i) => `<span><small>${functions[i]}</small><abbr class="${state.startsWith('A')?'state-a':state.startsWith('C')?'state-c':state==='P'?'state-p':state==='?'?'state-unknown':'state-none'}" title="${functions[i]}: ${escape(state)}">${escape(state)}</abbr></span>`).join('')}</div><footer><span>Reviewed ${entry.date}</span><a href="harness-monitor.html?q=${encodeURIComponent(entry.name)}">View evidence →</a></footer></article>`).join('\n');
const demo = `<figure class="index-search-demo" data-search-demo aria-label="Animated search examples from the published harness index"><figcaption><span>SEARCH PREVIEW</span><button type="button" data-demo-toggle aria-pressed="false">Pause</button></figcaption><div class="search-demo-query" aria-hidden="true"><span>⌕</span><span data-demo-text>${escape(samples[0].name.toLowerCase())}</span><i class="search-demo-cursor"></i></div><div class="search-demo-results">${frames}</div></figure>`;
let landing = fs.readFileSync(path.join(root,'vsm-index.html'),'utf8');
for (const [label,content] of [['SEARCH DEMO',demo],['SHORT AUTONOMY KEY',shortKey]]) {
 const pattern = new RegExp(`<!-- ${label}:START -->[\\s\\S]*?<!-- ${label}:END -->`);
 if (!pattern.test(landing)) throw new Error(`Missing ${label} markers`);
 landing = landing.replace(pattern,`<!-- ${label}:START -->\n${content}\n<!-- ${label}:END -->`);
}
outputs.set('vsm-index.html',landing);
for (const [file, content] of outputs) {
 const target = path.join(root,file);
 if (check) { if (!fs.existsSync(target) || fs.readFileSync(target,'utf8') !== content) throw new Error(`Stale monitor asset: ${file}`); }
 else {fs.mkdirSync(path.dirname(target),{recursive:true}); if (!fs.existsSync(target) || fs.readFileSync(target,'utf8') !== content) fs.writeFileSync(target,content);}
}
if (!check) for (const file of fs.readdirSync(path.join(root,'assets/harness-index'))) {
 if (/^(rows|all)-/.test(file) && !outputs.has(`assets/harness-index/${file}`)) fs.unlinkSync(path.join(root,'assets/harness-index',file));
}
console.log(`Harness monitor ${check?'verified':'built'}: ${entries.length} entries, ${Math.ceil(entries.length/20)} lazy chunks.`);
