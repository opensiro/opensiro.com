'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function link(text, href) {
  return {
    textContent: text,
    title: '',
    getAttribute(name) { return name === 'href' ? href : null; }
  };
}

test('harness labels show canonical GitHub owner/repo and elide long sources from the left', () => {
  const scion = link('Scion', 'https://github.com/annex-ai/scion');
  const henterprise = link('Henterprise', 'https://github.com/humbertobellor/henterprise');
  const long = link('Long Harness', 'https://github.com/very-long-organization-name/very-long-harness-name');
  const external = link('External', 'https://example.com/project');
  const selector = [
    '.vhi-combos tbody th[scope="row"] > a',
    '.vhi-all tbody th[scope="row"] > a',
    '.index-preview-table tbody th[scope="row"] > a'
  ].join(', ');

  const document = {
    querySelectorAll(value) {
      if (value === '[data-nav]') return [];
      if (value === selector) return [scion, henterprise, long, external];
      return [];
    }
  };

  vm.runInNewContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), {
    document,
    location: { pathname: '/vsm-index.html', href: 'https://opensiro.com/vsm-index.html' },
    URL
  });

  assert.equal(scion.textContent, 'annex-ai/scion');
  assert.equal(scion.title, 'Source repository: annex-ai/scion');
  assert.equal(henterprise.textContent, 'humbertobellor/henterprise');
  assert.equal(henterprise.title, 'Source repository: humbertobellor/henterprise');
  assert.equal(long.textContent, '...anization-name/very-long-harness-name');
  assert.equal(long.textContent.length, 40);
  assert.equal(long.title, 'Source repository: very-long-organization-name/very-long-harness-name');
  assert.equal(external.textContent, 'External');
  assert.equal(external.title, '');
});