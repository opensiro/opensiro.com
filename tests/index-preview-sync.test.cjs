'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('home Index preview follows the ranked table and stays reproducible', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'opensiro-index-preview-'));
  const scriptPath = path.join(fixture, 'scripts', 'sync-index-preview.cjs');
  const homePath = path.join(fixture, 'index.html');
  const catalogPath = path.join(fixture, 'vsm-index.html');
  fs.mkdirSync(path.dirname(scriptPath));
  for (const file of ['index.html', 'vsm-index.html', 'scripts/sync-index-preview.cjs']) {
    fs.copyFileSync(path.join(root, file), path.join(fixture, file));
  }

  const run = (...args) => spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: fixture,
    encoding: 'utf8'
  });

  try {
    const originalHome = fs.readFileSync(homePath, 'utf8');
    assert.equal(run('--check').status, 0, 'committed preview starts current');
    const count = Number(originalHome.match(/href="vsm-index.html">Open all (\d+)/)?.[1]);
    assert.ok(Number.isInteger(count) && count > 0);

    let catalog = fs.readFileSync(catalogPath, 'utf8');
    const firstHarness = /(<section class="vhi-combos"[\s\S]*?<tbody>[\s\S]*?<tr\b[^>]*>[\s\S]*?<th scope="row">[\s\S]*?<a\b[^>]*>)([^<]+)(<\/a>)/;
    assert.match(catalog, firstHarness);
    catalog = catalog.replace(firstHarness, (_, before, name, after) => `${before}${name} sync fixture${after}`);
    const allRows = /(<section class="vhi-all"[\s\S]*?<tbody>)([\s\S]*?)(<\/tbody>)/;
    assert.match(catalog, allRows);
    catalog = catalog.replace(allRows, (_, before, rows, after) => `${before}${rows}<tr data-sync-fixture="true"></tr>${after}`);
    fs.writeFileSync(catalogPath, catalog);

    assert.equal(run('--check').status, 1, 'source edits make the preview stale');
    assert.equal(fs.readFileSync(homePath, 'utf8'), originalHome, '--check does not edit the page');
    assert.equal(run().status, 0, 'sync updates the preview');
    const updatedHome = fs.readFileSync(homePath, 'utf8');
    const preview = updatedHome.match(/<!-- BEGIN GENERATED INDEX PREVIEW[\s\S]*?<!-- END GENERATED INDEX PREVIEW -->/)?.[0];
    assert.ok(preview?.includes('sync fixture'), 'first ranked harness reaches the preview');
    assert.ok(updatedHome.includes(`href="vsm-index.html">Open all ${count + 1}`), 'harness count follows the full table');
    assert.equal(run('--check').status, 0, 'updated preview passes freshness check');
    assert.equal(run().status, 0);
    assert.equal(fs.readFileSync(homePath, 'utf8'), updatedHome, 'second sync is byte-for-byte stable');

    const withoutMarker = updatedHome.replace('<!-- BEGIN GENERATED INDEX PREVIEW', '<!-- REMOVED GENERATED INDEX PREVIEW');
    fs.writeFileSync(homePath, withoutMarker);
    assert.notEqual(run().status, 0, 'missing marker fails instead of replacing other content');
    assert.equal(fs.readFileSync(homePath, 'utf8'), withoutMarker, 'failed sync leaves the page intact');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
