'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pagePath = path.join(root, 'vsm-index.html');

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const sourceRoot = path.resolve(root, argValue('--source') || process.env.VSM_INDEX_SOURCE || '.upstream/vsm-harness-index');
const checkOnly = process.argv.includes('--check');
const sourceRevision = process.env.VSM_INDEX_SOURCE_REF || 'main';

function requiredFile(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing required source file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function parsePsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split('|');
  return lines.slice(1).map((line, index) => {
    const values = line.split('|');
    if (values.length !== header.length) throw new Error(`Invalid PSV row ${index + 2}`);
    return Object.fromEntries(header.map((key, column) => [key, values[column]]));
  });
}

function parseFrontMatter(markdown, file) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`Missing front matter: ${file}`);
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

function listMarkdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMarkdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function sectionSummary(markdown, label, fallback) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`## ${label} `) || line === `## ${label}`);
  if (start < 0) return fallback;
  const paragraph = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) break;
    if (!line) {
      if (paragraph.length) break;
      continue;
    }
    paragraph.push(line);
  }
  if (!paragraph.length) return fallback;
  return paragraph.join(' ')
    .replace(/^`(?:A|C|P|\?|—)`:\s*/, '')
    .replace(/\s+Confidence:\s*[^.]+\.?\s*$/i, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim() || fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const stateInfo = [
  ['S1', 'autonomy_s1', 'operation'],
  ['S2', 'autonomy_s2', 'coordination'],
  ['S3', 'autonomy_s3', 'regulation'],
  ['S3*', 'autonomy_s3_star', 'direct audit'],
  ['S4', 'autonomy_s4', 'adaptation'],
  ['S5', 'autonomy_s5', 'identity']
];
const stateClass = new Map([['A', 'state-a'], ['C', 'state-c'], ['P', 'state-p'], ['—', 'state-none'], ['?', 'state-unknown']]);

function fallbackSummary(state) {
  if (state === '?') return 'Insufficient reviewed primary evidence.';
  if (state === '—') return 'No material first-party path in the review boundary.';
  if (state === 'C') return 'First-party primitives exist, but the builder must compose the required authority or feedback loop.';
  if (state === 'P') return 'Identity or ultimate-policy closure returns to a parent and binds subsequent operation.';
  return 'The agent holds the decision right and ready enactment exists in the standard setup.';
}

function stateAbbr(label, kind, state, summary, combo) {
  const css = stateClass.get(state);
  if (!css) throw new Error(`Unsupported state ${state} for ${label}`);
  const comboClass = state === 'A' && combo ? ' combo-a' : '';
  return `<abbr tabindex="0" class="vhi-state ${css}${comboClass}" title="${escapeHtml(label)} / ${escapeHtml(kind)}: ${escapeHtml(summary)}">${escapeHtml(state)}</abbr>`;
}

function countsMarkup(a, c) {
  return `<div class="vhi-counts"><span class="vhi-count count-a">A <b>${a}</b></span><span class="vhi-count count-c">C <b>${c}</b></span></div>`;
}

const bolt = '<span class="combo-lightning" style="--gap:GAP" aria-hidden="true"><svg viewBox="0 0 100 28" preserveAspectRatio="none"><polyline class="lightning-glow" points="0,14 12,9 22,17 34,6 45,16 57,10 68,19 80,7 90,16 100,14"></polyline><polyline class="lightning-bolt" points="0,14 12,9 22,17 34,6 45,16 57,10 68,19 80,7 90,16 100,14"></polyline></svg></span>';

const catalogRows = parsePsv(requiredFile(path.join(sourceRoot, 'data', 'catalog.psv')));
const catalogById = new Map(catalogRows.map((row) => [row.harness_id, row]));
if (catalogById.size !== catalogRows.length) throw new Error('Duplicate harness_id in catalog.psv');

const assessmentsDir = path.join(sourceRoot, 'assessments');
if (!fs.existsSync(assessmentsDir)) throw new Error(`Missing assessments directory: ${assessmentsDir}`);
const assessments = new Map();
for (const file of listMarkdownFiles(assessmentsDir)) {
  const markdown = fs.readFileSync(file, 'utf8');
  const meta = parseFrontMatter(markdown, file);
  if (meta.status !== 'included') continue;
  const id = meta.harness_id;
  if (!id) throw new Error(`Missing harness_id: ${file}`);
  if (assessments.has(id)) throw new Error(`Duplicate included assessment for ${id}`);
  const states = stateInfo.map(([label, field, kind]) => {
    const state = meta[field];
    if (!stateClass.has(state)) throw new Error(`Missing or invalid ${field} in ${file}`);
    return { label, kind, state, summary: sectionSummary(markdown, label, fallbackSummary(state)) };
  });
  assessments.set(id, { id, meta, states });
}

const rankingText = requiredFile(path.join(sourceRoot, 'RANKINGS.md'));
const rankingIds = [];
for (const match of rankingText.matchAll(/^\|\s*(\d+)\s*\|\s*<a id="([^"]+)"><\/a>/gm)) rankingIds.push(match[2]);
if (!rankingIds.length) throw new Error('No harness rows found in RANKINGS.md');
if (new Set(rankingIds).size !== rankingIds.length) throw new Error('Duplicate harness id in RANKINGS.md');

const missingAssessments = catalogRows.map((row) => row.harness_id).filter((id) => !assessments.has(id));
if (missingAssessments.length) throw new Error(`Catalog entries missing included assessments: ${missingAssessments.join(', ')}`);
const missingRankings = catalogRows.map((row) => row.harness_id).filter((id) => !rankingIds.includes(id));
if (missingRankings.length) throw new Error(`Catalog entries missing from RANKINGS.md: ${missingRankings.join(', ')}`);
const extraRankings = rankingIds.filter((id) => !catalogById.has(id));
if (extraRankings.length) throw new Error(`RANKINGS.md entries missing from catalog.psv: ${extraRankings.join(', ')}`);

const records = rankingIds.map((id) => {
  const catalog = catalogById.get(id);
  const assessment = assessments.get(id);
  if (!catalog || !assessment) throw new Error(`Incomplete index record for ${id}`);
  const meta = assessment.meta;
  const repository = meta.repository || catalog.repository;
  const reviewRef = meta.review_ref || catalog.review_ref;
  const reviewedAt = meta.reviewed_at || catalog.pinned_at;
  const projectName = meta.project_name || catalog.project_name || id;
  const year = (catalog.repository_created_at || '').slice(0, 4) || '—';
  const a = assessment.states.filter((item) => item.state === 'A').length;
  const c = assessment.states.filter((item) => item.state === 'C').length;
  return { id, repository, reviewRef, reviewedAt, projectName, year, a, c, states: assessment.states };
});

function recordLink(record) {
  return `<a href="${escapeHtml(record.repository)}" target="_blank" rel="noopener">${escapeHtml(record.projectName)}</a>`;
}

function reviewLink(record) {
  const href = `${record.repository.replace(/\/$/, '')}/tree/${record.reviewRef}`;
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" title="Open pinned source revision ${escapeHtml(record.reviewRef)}">${escapeHtml(record.reviewRef.slice(0, 7))} &#8599;</a>`;
}

function renderTop(record, index) {
  const combo = record.a >= 2;
  const pattern = record.states.map((item) => stateAbbr(item.label, item.kind, item.state, item.summary, combo)).join('');
  return `<tr data-a="${record.a}" data-c="${record.c}"><th scope="row"><span class="vhi-rank">${String(index + 1).padStart(2, '0')}</span>${recordLink(record)}</th><td data-sort-value="${record.a}">${countsMarkup(record.a, record.c)}</td><td><div class="combo-pattern" aria-label="VSM state pattern">${pattern}</div></td><td class="review-date"><time datetime="${escapeHtml(record.reviewedAt)}">${escapeHtml(record.reviewedAt)}</time></td><td class="review-ref">${reviewLink(record)}</td></tr>`;
}

function renderAll(record) {
  const combo = record.a >= 2;
  const active = record.states.map((item, index) => item.state === 'A' ? index : -1).filter((index) => index >= 0);
  const stateCells = record.states.map((item, index) => {
    let lightning = '';
    if (combo && item.state === 'A') {
      const activeIndex = active.indexOf(index);
      if (activeIndex > 0) lightning = bolt.replace('GAP', String(index - active[activeIndex - 1]));
    }
    return `<td class="state-cell">${lightning}${stateAbbr(item.label, item.kind, item.state, item.summary, combo)}</td>`;
  }).join('');
  const rowClass = combo ? ` class="has-a-combo" data-combo="${record.a}"` : '';
  return `<tr${rowClass} data-a="${record.a}" data-c="${record.c}"><th scope="row">${recordLink(record)}<small>${escapeHtml(record.year)}</small></th><td class="counts-cell" data-sort-value="${record.a}">${countsMarkup(record.a, record.c)}</td><td class="review-date"><time datetime="${escapeHtml(record.reviewedAt)}">${escapeHtml(record.reviewedAt)}</time></td><td class="review-ref">${reviewLink(record)}</td>${stateCells}</tr>`;
}

const original = requiredFile(pagePath);
let updated = original;
const sourceComment = `<!-- VSM INDEX SOURCE: opensiro/vsm-harness-index@${escapeHtml(sourceRevision)}; generated by scripts/sync-vsm-index.cjs -->`;
if (/<!-- VSM INDEX SOURCE:[\s\S]*?-->/.test(updated)) updated = updated.replace(/<!-- VSM INDEX SOURCE:[\s\S]*?-->/, sourceComment);
else updated = updated.replace('<main id="main-content">', `${sourceComment}\n<main id="main-content">`);
updated = updated.replace(/content="Track \d+ evidence-backed agent harness fingerprints across six Viable System Model functions\."/, `content="Track ${records.length} evidence-backed agent harness fingerprints across six Viable System Model functions."`);

const topPattern = /(<section class="vhi-combos"[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/;
if (!topPattern.test(updated)) throw new Error('Could not find Top 20 table body');
updated = updated.replace(topPattern, `$1\n${records.slice(0, 20).map(renderTop).join('\n')}\n$2`);
const allPattern = /(<section class="vhi-all"[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/;
if (!allPattern.test(updated)) throw new Error('Could not find All harnesses table body');
updated = updated.replace(allPattern, `$1${records.map(renderAll).join('\n')}\n$2`);

if (checkOnly) {
  if (updated !== original) {
    console.error(`VSM Index is stale against ${sourceRoot}. Run node scripts/sync-vsm-index.cjs --source ${sourceRoot}`);
    process.exitCode = 1;
  } else {
    console.log(`VSM Index is current: ${records.length} harnesses from ${sourceRevision}.`);
  }
} else {
  if (updated !== original) fs.writeFileSync(pagePath, updated);
  console.log(`Synced VSM Index: ${records.length} harnesses from ${sourceRevision}.`);
}
