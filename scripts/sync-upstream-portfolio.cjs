'use strict';

// Materialize one externally observed, source-dated Upstream PR portfolio view.
// This is independent of Organization-owned Verified external outcomes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'upstream-portfolio.html');
const JSON_OUTPUT = path.join(ROOT, 'assets/upstream-portfolio-observation.json');
const START = '<!-- UPSTREAM PORTFOLIO:START -->';
const END = '<!-- UPSTREAM PORTFOLIO:END -->';
const LABELS = new Set(['merged', 'closed_unmerged', 'open', 'unverifiable']);
const GROUPS = new Set(['watchlist', 'casebook', 'registry']);

function escapeHtml(input) {
  return String(input).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function summarize(records, group) {
  const chosen = group ? records.filter(row => row.groups.includes(group)) : records;
  const counts = Object.fromEntries([...LABELS].map(label => [label, 0]));
  for (const row of chosen) counts[row.outcome]++;
  const resolved = counts.merged + counts.closed_unmerged;
  return { ...counts, total: chosen.length, resolved,
    rate: resolved ? `${(100 * counts.merged / resolved).toFixed(1)}%` : 'N/A' };
}

function fingerprint(records) {
  const identities = records.map(row => ({ groups: [...row.groups].sort(), url: row.url }))
    .sort((a, b) => a.url < b.url ? -1 : a.url > b.url ? 1 : 0);
  return crypto.createHash('sha256').update(JSON.stringify(identities), 'utf8').digest('hex');
}

function validate(report, upstreamSha) {
  if (!report || report.schema_version !== 1 || !Array.isArray(report.records)) {
    throw new Error('Expected Upstream portfolio schema v1');
  }
  if (!/^[0-9a-f]{40}$/.test(upstreamSha)) throw new Error('Missing exact Upstream source SHA');
  const instant = Date.parse(report.observed_at);
  if (typeof report.observed_at !== 'string' || !Number.isFinite(instant)
      || !/(?:Z|[+-]\d\d:\d\d)$/.test(report.observed_at)) {
    throw new Error('Missing source-dated observation timestamp');
  }
  const urls = new Set();
  for (const row of report.records) {
    if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/[1-9]\d*$/.test(row.url)
        || urls.has(row.url)) throw new Error('Duplicate or invalid exact PR URL');
    urls.add(row.url);
    if (!Array.isArray(row.groups) || !row.groups.length
        || row.groups.some(group => !GROUPS.has(group))
        || new Set(row.groups).size !== row.groups.length) {
      throw new Error('Invalid portfolio group');
    }
    if (!LABELS.has(row.outcome)) throw new Error('Invalid PR outcome');
  }
  if (report.cohort_sha256 !== fingerprint(report.records)) throw new Error('Cohort source fingerprint mismatch');
  const watch = summarize(report.records, 'watchlist');
  const broad = summarize(report.records);
  // This is the exact source cohort currently reviewed by Upstream. A future
  // expansion must update this public contract intentionally before publication.
  if (watch.total !== 18 || broad.total !== 25) throw new Error('Unreviewed cohort expansion');
  return { watch, broad };
}

function render(report, upstreamSha) {
  const { watch, broad } = validate(report, upstreamSha);
  const stat = (name, stats, desc) => `<div class="up-stat"><h2>${escapeHtml(name)}</h2>
    <strong>${escapeHtml(stats.rate)}</strong><small>${escapeHtml(stats.merged)} merged / ${escapeHtml(stats.resolved)} resolved · ${escapeHtml(desc)}</small>
    <small>${escapeHtml(stats.open)} open · ${escapeHtml(stats.unverifiable)} unverifiable · ${escapeHtml(stats.closed_unmerged)} closed without merge</small></div>`;
  const rows = report.records.map(row => `<tr><td><a href="${escapeHtml(row.url)}">${escapeHtml(row.url.replace('https://github.com/', ''))}</a></td>
    <td>${escapeHtml(row.groups.join(', '))}</td><td>${escapeHtml(row.outcome.replace('_', ' '))}</td></tr>`).join('\n');
  return `<section class="up-section" aria-labelledby="up-observed-title">
    <h2 id="up-observed-title">Observed external PR states</h2>
    <p class="up-sub">Read from public GitHub at <strong>${escapeHtml(report.observed_at)}</strong>. Source implementation: <a href="https://github.com/opensiro/upstream/tree/${escapeHtml(upstreamSha)}">Upstream ${escapeHtml(upstreamSha.slice(0, 12))}</a>.</p>
    <div class="up-grid" aria-label="Resolved-only PR outcomes">
      ${stat('Reviewed 18-PR watchlist · resolved-only acceptance', watch, 'official operational denominator')}
      ${stat('Broader 25-URL union · descriptive only', broad, 'not a new intervention denominator')}
    </div>
    <p class="up-sub">The 25 distinct PR URLs overlap across source groups and may represent the same intervention or a replacement PR. Pending/unverifiable outcomes are excluded from resolved-only rates; no adoption benefit is inferred.</p>
  </section>
  <section class="up-section" aria-labelledby="up-sources-title"><h2 id="up-sources-title">Exact source PRs</h2>
    <div class="up-scroll" tabindex="0" role="region" aria-label="Exact external PR records">
      <table class="up-table"><thead><tr><th scope="col">External PR</th><th scope="col">Source groups</th><th scope="col">GitHub outcome</th></tr></thead><tbody>
      ${rows}
      </tbody></table></div>
    <p class="up-sub">Cohort fingerprint: <code>${escapeHtml(report.cohort_sha256)}</code>. <a href="assets/upstream-portfolio-observation.json">Download the dated JSON observation</a>.</p>
  </section>`;
}

function materialize(source, upstreamSha, pageText) {
  const payload = JSON.parse(source);
  const region = render(payload, upstreamSha);
  const start = pageText.indexOf(START);
  const end = pageText.indexOf(END);
  if (start < 0 || end <= start || pageText.indexOf(START, start + 1) >= 0
      || pageText.indexOf(END, end + 1) >= 0) throw new Error('Missing or duplicate Upstream page anchors');
  const html = pageText.slice(0, start + START.length) + '\n' + region + '\n' + pageText.slice(end);
  return { html, json: JSON.stringify({ ...payload, upstream_source_sha: upstreamSha }, null, 2) + '\n' };
}

function main() {
  const index = process.argv.indexOf('--source');
  const shaIndex = process.argv.indexOf('--upstream-sha');
  if (index < 0 || shaIndex < 0 || !process.argv[index + 1] || !process.argv[shaIndex + 1]) {
    throw new Error('Usage: node scripts/sync-upstream-portfolio.cjs --source observation.json --upstream-sha <40-char-SHA>');
  }
  const source = fs.readFileSync(path.resolve(process.argv[index + 1]), 'utf8');
  const result = materialize(source, process.argv[shaIndex + 1], fs.readFileSync(PAGE, 'utf8'));
  fs.writeFileSync(PAGE, result.html);
  fs.writeFileSync(JSON_OUTPUT, result.json);
  console.log('Materialized source-dated Upstream operational PR status from pinned upstream ref');
}

if (require.main === module) main();
module.exports = { summarize, fingerprint, validate, render, materialize };
