'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const put = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

function repo(primaryMetric, value, windowChange, commits = [3, 10, 30]) {
  return {
    primary_metric: primaryMetric,
    metrics: { [primaryMetric]: { value, window_change: windowChange } },
    engineering_activity: {
      classification: 'secondary_non_kpi',
      commits_24h: commits[0],
      commits_7d: commits[1],
      commits_30d: commits[2]
    }
  };
}

const numericWindows = (a, b, c) => ({
  '24h': { status: 'derived_net_change', value: a },
  '7d': { status: 'derived_net_change', value: b },
  '30d': { status: 'derived_pre_inception_net_change', value: c }
});

test('VSM Index renders organization-owned VSM OSS activity without calculating it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opensiro-vsm-oss-metrics-'));
  const script = path.join(dir, 'scripts', 'sync-vsm-oss-metrics.cjs');
  const source = path.join(dir, 'vsm-oss-metrics.json');
  put(script, fs.readFileSync(path.join(root, 'scripts', 'sync-vsm-oss-metrics.cjs'), 'utf8'));
  put(path.join(dir, 'vsm-index.html'), '<!doctype html><html><head></head><body><main id="main-content"><!-- VSM INDEX METRICS:START --><section>index</section><!-- VSM INDEX METRICS:END --><section class="vhi-combos">table</section></main></body></html>');

  const scope = [
    'opensiro/vsm-harness-profile',
    'opensiro/vsm-harness-skills',
    'opensiro/vsm-harness-index',
    'opensiro/awesome-vsm-harness',
    'opensiro/vsm-oss-organization',
    'opensiro/upstream'
  ];
  const upstream = repo('verified_external_outcomes', 2, {
    '24h': { status: 'source_unavailable_at_baseline', value: null },
    '7d': { status: 'source_unavailable_at_baseline', value: null },
    '30d': { status: 'source_unavailable_at_baseline', value: null }
  });
  Object.assign(upstream.metrics.verified_external_outcomes, {
    claim_status: 'verified_merged_changes_only_not_deployed_benefit',
    completion_gate_evaluated: true,
    observed_at: '2026-11-11T22:10:01+00:00',
    owner_source_sha256: 'a'.repeat(64),
    portfolio_cohort_sha256: 'b'.repeat(64),
    accepted: [
      { intervention_id: 'improvement:agent-fleet',
        external_pr_url: 'https://github.com/chankov/agent-fleet/pull/43',
        merge_commit_sha: 'c'.repeat(40),
        native_receipt: 'https://github.com/opensiro/upstream/actions/runs/40093167700',
        acceptance_basis: 'DETERMINISTIC_VERIFIED_MERGE',
        decision: 'ACCEPTED_MERGED_CHANGE_ONLY', benefit_claim: 'NOT_MEASURED' },
      { intervention_id: 'improvement:citadel',
        external_pr_url: 'https://github.com/SethGammon/Citadel/pull/366',
        merge_commit_sha: 'd'.repeat(40),
        native_receipt: 'https://github.com/opensiro/upstream/actions/runs/40039135313',
        acceptance_basis: 'DETERMINISTIC_VERIFIED_MERGE',
        decision: 'ACCEPTED_MERGED_CHANGE_ONLY', benefit_claim: 'NOT_MEASURED' }
    ]
  });
  put(source, JSON.stringify({
    schema_version: 2,
    collected_at: '2026-09-22T19:00:00Z',
    scope,
    publication: {
      window_change_semantics: 'net canonical state change, not gross event count',
      engineering_activity_is_productivity_kpi: false
    },
    repositories: {
      [scope[0]]: repo('current_validated_profile_release', '0.2.4', {
        '24h': { status: 'derived_state_change', baseline: '0.2.3', changed: true },
        '7d': { status: 'derived_state_change', baseline: '0.2.3', changed: true },
        '30d': { status: 'derived_pre_inception_state', baseline: null, changed: true }
      }),
      [scope[1]]: repo('current_validated_methodology_release', '0.3.6', {
        '24h': { status: 'derived_state_change', baseline: '0.3.5', changed: true },
        '7d': { status: 'derived_state_change_via_repository_renderer', baseline: null, changed: true },
        '30d': { status: 'derived_pre_inception_state', baseline: null, changed: true }
      }, [20, 50, 60]),
      [scope[2]]: repo('included_assessments', 193, numericWindows(15, 112, 193), [84, 443, 583]),
      [scope[3]]: repo('curated_representative_entries', 5, numericWindows(0, -6, 5), [9, 18, 28]),
      [scope[4]]: repo('current_formal_construction_milestone', null, {
        '24h': { status: 'unclaimed_semantic_evidence', value: null },
        '7d': { status: 'unclaimed_semantic_evidence', value: null },
        '30d': { status: 'unclaimed_semantic_evidence', value: null }
      }, [65, 295, 295]),
      [scope[5]]: upstream
    }
  }, null, 2));

  const run = (...args) => spawnSync(process.execPath, [script, '--source', source, ...args], { cwd: dir, encoding: 'utf8' });
  try {
    assert.equal(run('--check').status, 1);
    assert.equal(run().status, 0);
    const page = fs.readFileSync(path.join(dir, 'vsm-index.html'), 'utf8');
    assert.match(page, /Public VSM OSS activity/);
    assert.match(page, /vsm-harness-index<\/span><small>included_assessments<\/small><\/th><td class="is-number">193<\/td><td class="is-positive">\+15<\/td><td class="is-positive">\+112<\/td><td class="is-positive">\+193<\/td>/);
    assert.match(page, /awesome-vsm-harness[\s\S]*?<td class="is-muted">0<\/td><td class="is-negative">−6<\/td><td class="is-positive">\+5<\/td>/);
    assert.match(page, /current_formal_construction_milestone[\s\S]*?evidence-gated/);
    assert.match(page, /href="https:\/\/github.com\/chankov\/agent-fleet\/pull\/43"/);
    assert.match(page, /href="https:\/\/github.com\/SethGammon\/Citadel\/pull\/366"/);
    assert.match(page, /2 source-verified merged changes/);
    assert.match(page, /id="upstream-verified"/);
    assert.match(page, /See all external PR statuses/);
    assert.match(page, /not deployment or measured user benefit/);
    assert.match(page, /blob\/main\/docs\/METRICS.md/);
    assert.match(page, /Engineering activity <span>non-KPI<\/span>/);
    assert.match(page, /commits \/ 24h/);
    assert.match(page, /Commit volume is audit\/activity telemetry only/);
    assert.ok(page.indexOf('Corpus snapshot') === -1 || page.indexOf('Public VSM OSS activity') > page.indexOf('VSM INDEX METRICS:END'));
    assert.equal(run('--check').status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('renderer rejects snapshots that promote engineering activity to KPI', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opensiro-vsm-oss-invalid-'));
  const script = path.join(dir, 'scripts', 'sync-vsm-oss-metrics.cjs');
  const source = path.join(dir, 'snapshot.json');
  put(script, fs.readFileSync(path.join(root, 'scripts', 'sync-vsm-oss-metrics.cjs'), 'utf8'));
  put(path.join(dir, 'vsm-index.html'), '<html><body><main id="main-content"><!-- VSM INDEX METRICS:END --></main></body></html>');
  put(source, JSON.stringify({ scope: ['opensiro/x'], repositories: {}, publication: { window_change_semantics: 'net canonical state change, not gross event count', engineering_activity_is_productivity_kpi: true } }));
  try {
    const run = spawnSync(process.execPath, [script, '--source', source], { cwd: dir, encoding: 'utf8' });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /Engineering activity must remain non-KPI/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rendered merged-change evidence rejects benefit inflation or mutable receipts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opensiro-upstream-evidence-'));
  const script = path.join(dir, 'scripts', 'sync-vsm-oss-metrics.cjs');
  const source = path.join(dir, 'snapshot.json');
  put(script, fs.readFileSync(path.join(root, 'scripts', 'sync-vsm-oss-metrics.cjs'), 'utf8'));
  put(path.join(dir, 'vsm-index.html'), '<html><body><!-- VSM INDEX METRICS:END --></body></html>');
  const row = repo('verified_external_outcomes', 1, {
    '24h': { status: 'source_unavailable_at_baseline', value: null },
    '7d': { status: 'source_unavailable_at_baseline', value: null },
    '30d': { status: 'source_unavailable_at_baseline', value: null }
  });
  const claim = row.metrics.verified_external_outcomes;
  Object.assign(claim, {
    claim_status: 'verified_merged_changes_only_not_deployed_benefit',
    completion_gate_evaluated: true, observed_at: '2026-11-11T22:10:01+00:00',
    owner_source_sha256: 'a'.repeat(64), portfolio_cohort_sha256: 'b'.repeat(64),
    accepted: [{ intervention_id: 'case:a',
      external_pr_url: 'https://github.com/chankov/agent-fleet/pull/43',
      merge_commit_sha: 'c'.repeat(40),
      native_receipt: 'https://github.com/opensiro/upstream/actions/runs/40093167700',
      decision: 'ACCEPTED_MERGED_CHANGE_ONLY',
      acceptance_basis: 'DETERMINISTIC_VERIFIED_MERGE', benefit_claim: 'NOT_MEASURED' }]
  });
  const snapshot = { scope: ['opensiro/upstream'],
    repositories: { 'opensiro/upstream': row },
    publication: { window_change_semantics: 'net canonical state change, not gross event count',
      engineering_activity_is_productivity_kpi: false } };
  const run = () => spawnSync(process.execPath, [script, '--source', source], { cwd: dir, encoding: 'utf8' });
  try {
    put(source, JSON.stringify(snapshot));
    assert.equal(run().status, 0);
    claim.accepted[0].benefit_claim = 'DEPLOYED';
    put(source, JSON.stringify(snapshot));
    assert.notEqual(run().status, 0);
    assert.match(run().stderr, /Invalid or duplicated Upstream merged-change evidence/);
    claim.accepted[0].benefit_claim = 'NOT_MEASURED';
    claim.accepted[0].native_receipt = 'https://github.com/opensiro/upstream/blob/main/test';
    put(source, JSON.stringify(snapshot));
    assert.notEqual(run().status, 0);
    claim.value = null; claim.accepted = [];
    put(source, JSON.stringify(snapshot));
    assert.equal(run().status, 0);
    assert.doesNotMatch(fs.readFileSync(path.join(dir, 'vsm-index.html'), 'utf8'),
      /source-verified merged changes/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
