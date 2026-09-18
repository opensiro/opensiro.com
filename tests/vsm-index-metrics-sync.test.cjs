'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const put = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

test('VSM index renders corpus metrics from canonical metrics.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opensiro-vsm-metrics-'));
  const source = path.join(dir, '.upstream', 'vsm-harness-index');
  const script = path.join(dir, 'scripts', 'sync-vsm-metrics.cjs');
  put(script, fs.readFileSync(path.join(root, 'scripts', 'sync-vsm-metrics.cjs'), 'utf8'));
  put(path.join(dir, 'vsm-index.html'), '<!doctype html><html><head></head><body><main><section class="vhi-combos"><p>table</p></section></main></body></html>');
  put(path.join(source, 'data', 'metrics.json'), JSON.stringify({
    schema_version: 1,
    corpus: {
      included_assessments: 128,
      canonical_assessments: 129,
      excluded_assessments: 1,
      proposed_assessments: 2,
      catalog_entries: 129,
      catalog_entries_without_included_assessment: 1,
      reassessment_events: 80,
      full_a_assessments: 0
    },
    active_contract: { profile_version: '0.2.3', methodology_version: '0.3.5' },
    milestones: [
      { target: 100, status: 'achieved', completed: 128, progress_fraction: 1 },
      { target: 250, status: 'next', completed: 128, progress_fraction: 0.512 },
      { target: 500, status: 'planned', completed: 128, progress_fraction: 0.256 }
    ]
  }, null, 2));

  const run = (...args) => spawnSync(process.execPath, [script, '--source', source, ...args], { cwd: dir, encoding: 'utf8' });
  try {
    assert.equal(run('--check').status, 1);
    assert.equal(run().status, 0);
    const page = fs.readFileSync(path.join(dir, 'vsm-index.html'), 'utf8');
    assert.match(page, /vsm-index-metrics\.css\?v=20260919-metrics/);
    assert.match(page, /<h2 id="vhi-metrics-title">Corpus snapshot<\/h2>/);
    assert.match(page, /<dt>Included<\/dt><dd>128<\/dd>/);
    assert.match(page, /<dt>Catalog<\/dt><dd>129<\/dd>/);
    assert.match(page, /<dt>Reassessments<\/dt><dd>80<\/dd>/);
    assert.match(page, /<dt>Full-A<\/dt><dd>0<\/dd>/);
    assert.match(page, /<strong>128 \/ 250<\/strong><span>51\.2%<\/span>/);
    assert.match(page, /Profile 0\.2\.3 \/ Methodology 0\.3\.5/);
    assert.ok(page.indexOf('Corpus snapshot') < page.indexOf('class="vhi-combos"'));
    assert.equal(run('--check').status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
