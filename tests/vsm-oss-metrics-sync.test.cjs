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
  put(path.join(dir, 'vsm-index.html'), '<!doctype html><html><head></head><body><main><!-- VSM INDEX METRICS:START --><section>index</section><!-- VSM INDEX METRICS:END --><section class="vhi-combos">table</section></main></body></html>');

  const scope = [
    'opensiro/vsm-harness-profile',
    'opensiro/vsm-harness-skills',
    'opensiro/vsm-harness-index',
    'opensiro/awesome-vsm-harness',
    'opensiro/vsm-oss-organization'
  ];
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
      }, [65, 295, 295])
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
  put(path.join(dir, 'vsm-index.html'), '<html><body><!-- VSM INDEX METRICS:END --></body></html>');
  put(source, JSON.stringify({ scope: ['opensiro/x'], repositories: {}, publication: { window_change_semantics: 'net canonical state change, not gross event count', engineering_activity_is_productivity_kpi: true } }));
  try {
    const run = spawnSync(process.execPath, [script, '--source', source], { cwd: dir, encoding: 'utf8' });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /Engineering activity must remain non-KPI/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
