'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const site = require('../scripts/sync-upstream-portfolio.cjs');

const root = path.resolve(__dirname, '..');
const sourceSha = 'e7e37b09717581265f39d0b87acc94c3522aea51';

function observation() {
  const records = Array.from({ length: 25 }, (_, index) => ({
    url: `https://github.com/Example/repo/pull/${index + 1}`,
    groups: [index < 18 ? 'watchlist' : 'casebook'],
    outcome: index < 4 ? 'merged' : index < 6 ? 'closed_unmerged' : 'open',
  }));
  records[17].outcome = 'unverifiable';
  return { schema_version: 1, observed_at: '2026-11-07T13:30:00+00:00',
    cohort_sha256: site.fingerprint(records), records };
}

test('exact 18-target watchlist and distinct broad denominator', () => {
  const report = observation();
  const { watch, broad } = site.validate(report, sourceSha);
  assert.equal(watch.total, 18);
  assert.equal(broad.total, 25);
  assert.equal(watch.rate, '66.7%');
  assert.equal(broad.rate, '66.7%');
  assert.equal(watch.unverifiable, 1);
  assert.match(site.render(report, sourceSha), /Broader 25-URL union · descriptive only/);
});

test('source fingerprints bind identities, not outcomes', () => {
  const report = observation();
  const previous = report.cohort_sha256;
  report.records[0].outcome = 'open';
  assert.equal(site.fingerprint(report.records), previous);
  report.records[0].groups.push('registry');
  assert.notEqual(site.fingerprint(report.records), previous);
  assert.throws(() => site.validate(report, sourceSha), /fingerprint/);
});

test('reject an arbitrary URL, changed cohort, stale or invalid provenance', () => {
  const report = observation();
  assert.throws(() => site.validate(report, 'main'), /source SHA/);
  const badUrl = structuredClone(report);
  badUrl.records[0].url = 'https://evil.example/pull/1';
  assert.throws(() => site.validate(badUrl, sourceSha), /invalid exact PR URL/);
  const enlarged = structuredClone(report);
  enlarged.records.push({ url: 'https://github.com/Example/repo/pull/26', groups: ['casebook'], outcome: 'open' });
  enlarged.cohort_sha256 = site.fingerprint(enlarged.records);
  assert.throws(() => site.validate(enlarged, sourceSha), /cohort expansion/);
  const noDate = structuredClone(report);
  noDate.observed_at = '2026-11-07';
  assert.throws(() => site.validate(noDate, sourceSha), /timestamp/);
});

test('rendering is deterministic and does not touch other site pages', () => {
  const report = observation();
  const page = fs.readFileSync(path.join(root, 'upstream-portfolio.html'), 'utf8');
  const result = site.materialize(JSON.stringify(report), sourceSha, page);
  assert.match(result.html, /Reviewed 18-PR watchlist/);
  assert.match(result.html, /2026-11-07T13:30:00/);
  assert.match(result.html, /not the Organization/);
  assert.equal(site.materialize(JSON.stringify(report), sourceSha, result.html).html, result.html);
  assert.equal(JSON.parse(result.json).upstream_source_sha, sourceSha);
  assert.equal(result.html.match(/UPSTREAM PORTFOLIO:START/g).length, 1);
});
