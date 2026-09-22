'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pagePath = path.join(root, 'vsm-index.html');
const START = '<!-- VSM OSS METRICS:START -->';
const END = '<!-- VSM OSS METRICS:END -->';
const INDEX_METRICS_END = '<!-- VSM INDEX METRICS:END -->';
const stylesheetVersion = 'vsm-index-metrics.css?v=20260922-vsm-oss';

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const sourcePath = path.resolve(root, argValue('--source') || process.env.VSM_OSS_METRICS_SOURCE || '.upstream/vsm-oss-metrics.json');
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

function signed(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
}

function formatWindow(entry) {
  if (!entry || typeof entry !== 'object') return { text: '—', cls: 'is-muted' };
  const delta = signed(entry.value);
  if (delta !== null) return { text: delta, cls: entry.value > 0 ? 'is-positive' : entry.value < 0 ? 'is-negative' : 'is-muted' };
  if (entry.status === 'unclaimed_semantic_evidence') return { text: 'evidence-gated', cls: 'is-gated' };
  if (entry.changed === false) return { text: '—', cls: 'is-muted' };
  if (entry.changed === true) {
    const introduced = entry.baseline == null || String(entry.status || '').includes('pre_inception');
    return { text: introduced ? 'introduced' : 'changed', cls: introduced ? 'is-introduced' : 'is-changed' };
  }
  return { text: '—', cls: 'is-muted' };
}

function formatCurrent(metric) {
  if (!metric || metric.value == null) return { text: 'evidence-gated', cls: 'is-gated' };
  return { text: String(metric.value), cls: typeof metric.value === 'number' ? 'is-number' : 'is-state' };
}

function shortRepo(repo) {
  return repo.replace(/^opensiro\//, '');
}

let snapshot;
try {
  snapshot = JSON.parse(requiredFile(sourcePath));
} catch (error) {
  if (error instanceof SyntaxError) throw new Error(`Invalid JSON in ${sourcePath}: ${error.message}`);
  throw error;
}

if (!Array.isArray(snapshot.scope) || !snapshot.scope.length) throw new Error('Missing VSM OSS scope');
if (!snapshot.repositories || typeof snapshot.repositories !== 'object') throw new Error('Missing VSM OSS repositories');
if (!snapshot.publication || snapshot.publication.window_change_semantics !== 'net canonical state change, not gross event count') {
  throw new Error('Unexpected VSM OSS window-change semantics');
}
if (snapshot.publication.engineering_activity_is_productivity_kpi !== false) {
  throw new Error('Engineering activity must remain non-KPI');
}

const windows = ['24h', '7d', '30d'];
const rows = snapshot.scope.map((repo) => {
  const entry = snapshot.repositories[repo];
  if (!entry) throw new Error(`Missing repository snapshot: ${repo}`);
  const primary = entry.primary_metric;
  const metric = entry.metrics && entry.metrics[primary];
  if (!metric) throw new Error(`Missing primary metric ${primary} for ${repo}`);
  const current = formatCurrent(metric);
  const cells = windows.map((window) => formatWindow(metric.window_change && metric.window_change[window]));
  return `      <tr><th scope="row"><span>${escapeHtml(shortRepo(repo))}</span><small>${escapeHtml(primary)}</small></th><td class="${current.cls}">${escapeHtml(current.text)}</td>${cells.map((cell) => `<td class="${cell.cls}">${escapeHtml(cell.text)}</td>`).join('')}</tr>`;
}).join('\n');

const activityRows = snapshot.scope.map((repo) => {
  const entry = snapshot.repositories[repo];
  const activity = entry.engineering_activity || {};
  if (activity.classification !== 'secondary_non_kpi') throw new Error(`Engineering activity classification is not secondary_non_kpi for ${repo}`);
  const values = windows.map((window) => {
    const value = activity[`commits_${window}`];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`Invalid commits_${window} for ${repo}`);
    return value;
  });
  return `          <tr><th scope="row">${escapeHtml(shortRepo(repo))}</th>${values.map((value) => `<td>${value}</td>`).join('')}</tr>`;
}).join('\n');

const collected = typeof snapshot.collected_at === 'string' ? snapshot.collected_at.slice(0, 10) : '—';
const section = `${START}
  <section class="vhi-org-metrics" aria-labelledby="vhi-org-metrics-title">
    <header class="vhi-metrics-head vhi-org-metrics-head">
      <div><h2 id="vhi-org-metrics-title">Public VSM OSS activity</h2><p>Repository-owned state and net canonical change. Updated ${escapeHtml(collected)}.</p></div>
      <a href="https://github.com/opensiro/vsm-oss-organization/blob/main/METRICS.md" target="_blank" rel="noopener">Metrics contract &#8599;</a>
    </header>
    <div class="vhi-org-table-wrap" tabindex="0" role="region" aria-label="Public VSM OSS canonical state change">
      <table class="vhi-org-table">
        <thead><tr><th scope="col">Surface</th><th scope="col">Current</th><th scope="col">24h</th><th scope="col">7d</th><th scope="col">30d</th></tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>
    <p class="vhi-org-semantics">Window values are net canonical-state change, not gross event counts. Unlike outputs are never summed into a productivity score.</p>
    <details class="vhi-engineering-activity">
      <summary>Engineering activity <span>non-KPI</span></summary>
      <div class="vhi-org-table-wrap">
        <table class="vhi-org-table vhi-activity-table">
          <thead><tr><th scope="col">Repository</th><th scope="col">commits / 24h</th><th scope="col">commits / 7d</th><th scope="col">commits / 30d</th></tr></thead>
          <tbody>
${activityRows}
          </tbody>
        </table>
      </div>
      <p>Commit volume is audit/activity telemetry only. It is not a measure of productivity, quality, or verified output.</p>
    </details>
  </section>
${END}`;

const original = requiredFile(pagePath);
let updated = original;

if (/vsm-index-metrics\.css\?v=[^"']+/.test(updated)) {
  updated = updated.replace(/vsm-index-metrics\.css\?v=[^"']+/, stylesheetVersion);
}

if (updated.includes(START) || updated.includes(END)) {
  if ((updated.match(new RegExp(START, 'g')) || []).length !== 1 || (updated.match(new RegExp(END, 'g')) || []).length !== 1) {
    throw new Error('VSM OSS metrics markers must occur exactly once');
  }
  updated = updated.replace(new RegExp(`${START}[\\s\\S]*?${END}`), section);
} else {
  if (!updated.includes(INDEX_METRICS_END)) throw new Error('Could not find VSM Index metrics insertion point');
  updated = updated.replace(INDEX_METRICS_END, `${INDEX_METRICS_END}\n${section}`);
}

if (checkOnly) {
  if (updated !== original) {
    console.error(`VSM OSS metrics are stale against ${sourcePath}. Run node scripts/sync-vsm-oss-metrics.cjs --source ${sourcePath}`);
    process.exitCode = 1;
  } else {
    console.log(`VSM OSS metrics are current for ${snapshot.scope.length} repository surfaces.`);
  }
} else {
  if (updated !== original) fs.writeFileSync(pagePath, updated);
  console.log(`Synced VSM OSS metrics for ${snapshot.scope.length} repository surfaces.`);
}
