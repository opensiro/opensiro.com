'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const put = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

function assessment(id, name, states) {
  const fields = ['autonomy_s1', 'autonomy_s2', 'autonomy_s3', 'autonomy_s3_star', 'autonomy_s4', 'autonomy_s5'];
  const labels = ['S1', 'S2', 'S3', 'S3*', 'S4', 'S5'];
  return `---\nharness_id: ${id}\nproject_name: ${name}\nrepository: https://github.com/test-fixture/${id}\nreview_ref: ${id.repeat(16).slice(0, 16)}\nreviewed_at: 2026-09-16\nstatus: included\n${fields.map((field, i) => `${field}: ${states[i]}`).join('\n')}\n---\n\n${labels.map((label, i) => `## ${label} — Section\n\`${states[i]}\`: ${name} ${label} evidence. Confidence: high.`).join('\n\n')}\n`;
}

test('VSM index renders included assessments from canonical source inputs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opensiro-vsm-'));
  const source = path.join(dir, '.upstream', 'vsm-harness-index');
  const script = path.join(dir, 'scripts', 'sync-vsm-index.cjs');
  put(script, fs.readFileSync(path.join(root, 'scripts', 'sync-vsm-index.cjs'), 'utf8'));
  put(path.join(dir, 'vsm-index.html'), '<meta name="description" content="Track 1 evidence-backed agent harness fingerprints across six Viable System Model functions."><main id="main-content"><section class="vhi-combos"><table><thead><tr><th scope="col">Harness</th></tr></thead><tbody><tr><td>old</td></tr></tbody></table></section><section class="vhi-all"><table><thead><tr><th scope="col">Harness</th></tr></thead><tbody><tr><td>old</td></tr></tbody></table></section></main>');
  put(path.join(source, 'data', 'catalog.psv'), 'catalog_position|harness_id|project_name|repository|repository_created_at|source_membership|review_ref|pinned_at\n1|alpha|Alpha|https://github.com/test-fixture/alpha|2024-01-01T00:00:00Z|fixture|aaaaaaaaaaaaaaaa|2026-09-16\n2|beta|Beta|https://github.com/test-fixture/beta|2026-01-01T00:00:00Z|fixture|bbbbbbbbbbbbbbbb|2026-09-16\n3|gamma|Gamma|https://github.com/test-fixture/gamma|2026-02-01T00:00:00Z|fixture|cccccccccccccccc|2026-09-16\n');
  put(path.join(source, 'RANKINGS.md'), '| Rank | Harness |\n| ---: | --- |\n| 1 | <a id="beta"></a>[Beta](x) |\n| 2 | <a id="alpha"></a>[Alpha](x) |\n');
  put(path.join(source, 'assessments', 'alpha.md'), assessment('alpha', 'Alpha', ['A', '—', '—', 'A', '—', '—']));
  put(path.join(source, 'assessments', 'beta.md'), assessment('beta', 'Beta', ['A', 'A(P)', 'C(P)', 'P', '—', '?']));
  const run = (...args) => spawnSync(process.execPath, [script, '--source', source, ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, VSM_INDEX_SOURCE_REF: 'fixture-sha' } });
  try {
    assert.equal(run('--check').status, 1);
    assert.equal(run().status, 0);
    const page = fs.readFileSync(path.join(dir, 'vsm-index.html'), 'utf8');
    assert.match(page, /Track 2 evidence-backed/);
    assert.doesNotMatch(page, />Gamma<\/a>/, 'unreviewed catalog candidates are not published');
    assert.match(page, /opensiro\/vsm-harness-index@fixture-sha/);
    assert.ok(page.indexOf('>Beta<\/a>') < page.indexOf('>Alpha<\/a>'));
    assert.match(page, /data-a="2" data-c="1"/);
    assert.match(page, /count-a">A <b>2<\/b>/);
    assert.match(page, /count-c">C <b>1<\/b>/);
    assert.match(page, /class="vhi-state state-a combo-a" title="S2 \/ coordination: Beta S2 evidence\.">A\(P\)<\/abbr>/);
    assert.match(page, /class="vhi-state state-c" title="S3 \/ regulation: Beta S3 evidence\.">C\(P\)<\/abbr>/);
    assert.match(page, /class="vhi-state state-p" title="S3\* \/ direct audit: Beta S3 evidence\.">P<\/abbr>/);
    assert.equal((page.match(/>Assessment ref<\/th>/g) || []).length, 2);
    assert.match(page, /href="https:\/\/github\.com\/opensiro\/vsm-harness-index\/blob\/fixture-sha\/assessments\/beta\.md"[^>]*>fixture &#8599;<\/a>/);
    assert.match(page, /href="https:\/\/github\.com\/opensiro\/vsm-harness-index\/blob\/fixture-sha\/assessments\/alpha\.md"[^>]*>fixture &#8599;<\/a>/);
    assert.equal((page.match(/class="assessment-ref"/g) || []).length, 4);
    assert.equal(run('--check').status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
