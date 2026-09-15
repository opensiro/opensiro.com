'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const homePath = path.join(root, 'index.html');
const catalogPath = path.join(root, 'vsm-index.html');
const home = fs.readFileSync(homePath, 'utf8');
const catalog = fs.readFileSync(catalogPath, 'utf8');

function requiredMatch(text, pattern, label) {
  const match = text.match(pattern);
  if (!match) throw new Error(`Could not find ${label}`);
  return match;
}

const topBody = requiredMatch(
  catalog,
  /<section class="vhi-combos"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/,
  'Top 20 table'
)[1];
const topRows = [...topBody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)];
if (topRows.length < 4) throw new Error('Top 20 table has fewer than four rows');

const previewRows = topRows.slice(0, 4).map((row, index) => {
  const link = requiredMatch(row[1], /<th scope="row">[\s\S]*?(<a\b[^>]*>[\s\S]*?<\/a>)<\/th>/, `row ${index + 1} harness`)[1];
  const pattern = requiredMatch(row[1], /<div class="combo-pattern"[^>]*>([\s\S]*?)<\/div>/, `row ${index + 1} pattern`)[1];
  const states = [...pattern.matchAll(/<abbr\b([^>]*)>([\s\S]*?)<\/abbr>/g)];
  if (states.length !== 6) throw new Error(`Top 20 row ${index + 1} has ${states.length} states, expected six`);

  const cells = states.map((state) => {
    const classes = requiredMatch(state[1], /\bclass="([^"]+)"/, 'state class')[1]
      .replace(/\bvhi-state\b/, 'home-state');
    const title = requiredMatch(state[1], /\btitle="([^"]+)"/, 'state explanation')[1];
    return `<td><abbr tabindex="0" class="${classes}" title="${title}">${state[2]}</abbr></td>`;
  });
  return `          <tr><th scope="row">${link}</th>${cells.join('')}</tr>`;
});

const allBody = requiredMatch(
  catalog,
  /<section class="vhi-all"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/,
  'All harnesses table'
)[1];
const total = [...allBody.matchAll(/<tr\b/g)].length;
if (!total) throw new Error('All harnesses table is empty');

const beginMarker = '          <!-- BEGIN GENERATED INDEX PREVIEW: node scripts/sync-index-preview.cjs -->';
const endMarker = '          <!-- END GENERATED INDEX PREVIEW -->';
const preview = [beginMarker, ...previewRows, endMarker].join('\n');

const section = requiredMatch(home, /<section class="index-section"[\s\S]*?<\/section>/, 'home Index section')[0];
requiredMatch(section, /href="vsm-index.html">Open all \d+/, 'home Index count');
requiredMatch(section, /<footer><span>[^<]*<\/span>/, 'home Index footer');
const begin = section.indexOf(beginMarker);
const end = section.indexOf(endMarker);
if (begin < 0 || end <= begin || section.indexOf(beginMarker, begin + 1) !== -1 || section.indexOf(endMarker, end + 1) !== -1) {
  throw new Error('Home Index preview markers are missing or duplicated');
}
const updatedSection = (section.slice(0, begin) + preview + section.slice(end + endMarker.length))
  .replace(/(href="vsm-index.html">)Open all \d+/, `$1Open all ${total}`)
  .replace(/(<footer><span>)[^<]*(<\/span>)/, '$1Top ranked harnesses shown$2');
const updated = home.replace(section, updatedSection);
if (process.argv.includes('--check')) {
  if (updated !== home) {
    console.error('Home Index preview is stale. Run node scripts/sync-index-preview.cjs');
    process.exitCode = 1;
  } else {
    console.log(`Home Index preview is current: top 4 of ${total} harnesses.`);
  }
} else {
  if (updated !== home) fs.writeFileSync(homePath, updated);
  console.log(`Synced home Index preview: top 4 of ${total} harnesses.`);
}
