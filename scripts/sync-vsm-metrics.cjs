'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pagePath = path.join(root, 'vsm-index.html');
const START = '<!-- VSM INDEX METRICS:START -->';
const END = '<!-- VSM INDEX METRICS:END -->';
const stylesheet = '<link rel="stylesheet" href="vsm-index-metrics.css?v=20260922-vsm-oss">';
const stylesheetPattern = /<link rel="stylesheet" href="vsm-index-metrics\.css\?v=[^"]+">/;

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const sourceRoot = path.resolve(root, argValue('--source') || process.env.VSM_INDEX_SOURCE || '.upstream/vsm-harness-index');
const checkOnly = process.argv.includes('--check');

function requiredFile(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing required source file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function requireNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${label} in data/metrics.json`);
  }
  return value;
}

function formatUpdatedAt(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Missing canonical Index update time');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { datetime: raw, label: raw };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid canonical Index update time: ${raw}`);
  const iso = parsed.toISOString();
  return {
    datetime: iso,
    label: `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
  };
}

const metricsPath = path.join(sourceRoot, 'data', 'metrics.json');
let metrics;
try {
  metrics = JSON.parse(requiredFile(metricsPath));
} catch (error) {
  if (error instanceof SyntaxError) throw new Error(`Invalid JSON in ${metricsPath}: ${error.message}`);
  throw error;
}

const corpus = metrics.corpus || {};
const included = requireNumber(corpus.included_assessments, 'corpus.included_assessments');
const catalog = requireNumber(corpus.catalog_entries, 'corpus.catalog_entries');
const reassessments = requireNumber(corpus.reassessment_events, 'corpus.reassessment_events');
const fullA = requireNumber(corpus.full_a_assessments, 'corpus.full_a_assessments');
const contract = metrics.active_contract || {};
if (!contract.profile_version || !contract.methodology_version) throw new Error('Missing active semantic contract in data/metrics.json');
if (!Array.isArray(metrics.milestones)) throw new Error('Missing milestones in data/metrics.json');

const updatedAt = formatUpdatedAt(process.env.VSM_INDEX_SOURCE_UPDATED_AT || metrics.snapshot_date);
const next = metrics.milestones.find((row) => row && row.status === 'next');
if (!next) throw new Error('Missing next corpus milestone in data/metrics.json');
const nextTarget = requireNumber(next.target, 'milestones.next.target');
const nextCompleted = requireNumber(next.completed, 'milestones.next.completed');
const progressFraction = requireNumber(next.progress_fraction, 'milestones.next.progress_fraction');
const progress = Math.min(progressFraction * 100, 100);

const section = `${START}
  <section class="vhi-metrics" aria-labelledby="vhi-metrics-title">
    <header class="vhi-metrics-head">
      <div><h2 id="vhi-metrics-title">Corpus snapshot</h2><p>Generated from the canonical VSM Harness Index.</p><p class="vhi-metrics-updated">Last updated <time datetime="${escapeHtml(updatedAt.datetime)}">${escapeHtml(updatedAt.label)}</time></p></div>
      <a href="https://github.com/opensiro/vsm-harness-index/blob/main/METRICS.md" target="_blank" rel="noopener">Full metrics &#8599;</a>
    </header>
    <dl class="vhi-metric-grid">
      <div><dt>Included</dt><dd>${included}</dd></div>
      <div><dt>Catalog</dt><dd>${catalog}</dd></div>
      <div><dt>Reassessments</dt><dd>${reassessments}</dd></div>
      <div><dt>Full-A</dt><dd>${fullA}</dd></div>
    </dl>
    <div class="vhi-milestone" aria-label="Next corpus milestone: ${nextCompleted} of ${nextTarget}">
      <div class="vhi-milestone-copy"><span>Next milestone</span><strong>${nextCompleted} / ${nextTarget}</strong><span>${progress.toFixed(1)}%</span></div>
      <div class="vhi-milestone-track" aria-hidden="true"><span style="width:${progress.toFixed(1)}%"></span></div>
    </div>
    <p class="vhi-metrics-contract">Profile ${escapeHtml(contract.profile_version)} / Methodology ${escapeHtml(contract.methodology_version)}</p>
  </section>
${END}`;

const original = requiredFile(pagePath);
let updated = original;

if (stylesheetPattern.test(updated)) {
  updated = updated.replace(stylesheetPattern, stylesheet);
} else {
  if (!updated.includes('</head>')) throw new Error('Could not find </head> in vsm-index.html');
  updated = updated.replace('</head>', `${stylesheet}\n</head>`);
}

if (updated.includes(START) || updated.includes(END)) {
  if ((updated.match(new RegExp(START, 'g')) || []).length !== 1 || (updated.match(new RegExp(END, 'g')) || []).length !== 1) {
    throw new Error('VSM metrics markers must occur exactly once');
  }
  const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
  updated = updated.replace(pattern, section);
} else {
  const anchor = '<section class="vhi-combos"';
  if (!updated.includes(anchor)) throw new Error('Could not find Top 20 section insertion point');
  updated = updated.replace(anchor, `${section}\n  ${anchor}`);
}

if (checkOnly) {
  if (updated !== original) {
    console.error(`VSM metrics are stale against ${metricsPath}. Run node scripts/sync-vsm-metrics.cjs --source ${sourceRoot}`);
    process.exitCode = 1;
  } else {
    console.log(`VSM metrics are current: ${included} included assessments; next milestone ${nextTarget}.`);
  }
} else {
  if (updated !== original) fs.writeFileSync(pagePath, updated);
  console.log(`Synced VSM metrics: ${included} included assessments; next milestone ${nextTarget}.`);
}
