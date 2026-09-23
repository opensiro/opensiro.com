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

test('compact harness labels append canonical GitHub source only when they fit', () => {
  const short = link('Scion', 'https://github.com/annex-ai/scion');
  const medium = link('Henterprise', 'https://github.com/humbertobellor/henterprise');
  const long = link('Microsoft AutoGen AgentChat', 'https://github.com/microsoft/autogen');
  const external = link('External', 'https://example.com/project');
  const selector = [
    '.vhi-combos tbody th[scope="row"] > a',
    '.vhi-all tbody th[scope="row"] > a',
    '.index-preview-table tbody th[scope="row"] > a'
  ].join(', ');

  const document = {
    querySelectorAll(value) {
      if (value === '[data-nav]') return [];
      if (value === selector) return [short, medium, long, external];
      return [];
    }
  };

  vm.runInNewContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), {
    document,
    location: { pathname: '/vsm-index.html', href: 'https://opensiro.com/vsm-index.html' },
    URL
  });

  assert.equal(short.textContent, 'Scion · annex-ai/scion');
  assert.equal(short.title, 'Source repository: annex-ai/scion');
  assert.equal(medium.textContent, 'Henterprise · humbertobellor/henterprise');
  assert.equal(medium.title, 'Source repository: humbertobellor/henterprise');
  assert.equal(long.textContent, 'Microsoft AutoGen AgentChat');
  assert.equal(long.title, 'Source repository: microsoft/autogen');
  assert.equal(external.textContent, 'External');
  assert.equal(external.title, '');
});