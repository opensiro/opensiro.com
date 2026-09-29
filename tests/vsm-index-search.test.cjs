'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('catalog search retains full identities, filters, clears, and preserves sorting', () => {
  const control = (extra = {}) => ({ ...extra, handlers: {}, addEventListener(type, handler) { this.handlers[type] = handler; } });
  const input = control({ value: '', focus() { this.focused = true; } });
  const clear = control();
  const status = {};
  const empty = {};
  const search = { hidden: true, querySelector(selector) { return selector === 'input' ? input : selector === 'button' ? clear : status; } };
  const row = (name, url) => {
    const link = { textContent: name, getAttribute() { return url; } };
    return { hidden: false, cells: [{ dataset: {}, textContent: name }], querySelector() { return link; }, link };
  };
  const alpha = row('Alpha Harness', 'https://github.com/very-long-owner/alpha');
  const beta = row('Scion', 'https://github.com/annex-ai/scion');
  const body = { rows: [beta, alpha], append(...rows) { this.rows = rows; } };
  const heading = { removeAttribute() {}, setAttribute() {} };
  const classes = new Set();
  const sort = control({ dataset: { sortIndex: '0' }, closest() { return heading; }, classList: {
    contains(value) { return classes.has(value); }, add(...values) { values.forEach(v => classes.add(v)); }, remove(...values) { values.forEach(v => classes.delete(v)); }
  } });
  const table = { tBodies: [body], querySelectorAll(selector) { return selector === 'thead th' ? [heading] : [sort]; } };
  const document = {
    querySelectorAll() { return [table]; },
    querySelector(selector) { return ({ '.vhi-search': search, '#harness-table': table, '#harness-search-empty': empty })[selector] || null; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../vsm-index.js'), 'utf8'), { document });
  assert.equal(search.hidden, false);
  assert.equal(status.textContent, '2 of 2 harnesses');
  alpha.link.textContent = '...owner/alpha';
  input.value = '  ALPHA   harness ';
  input.handlers.input();
  assert.equal(alpha.hidden, false);
  assert.equal(beta.hidden, true);
  assert.equal(status.textContent, '1 of 2 harnesses');
  sort.handlers.click();
  assert.equal(body.rows[0], alpha);
  assert.equal(beta.hidden, true);
  input.value = 'very-long-owner'; input.handlers.input();
  assert.equal(alpha.hidden, false);
  input.value = '<no match>'; input.handlers.input();
  assert.equal(empty.hidden, false);
  assert.equal(status.textContent, '0 of 2 harnesses');
  clear.handlers.click();
  assert.equal(input.value, '');
  assert.equal(empty.hidden, true);
  assert.equal(clear.disabled, true);
  assert.equal(input.focused, true);
  assert.equal(body.rows[0], alpha);
  input.value = 'scion'; input.handlers.input();
  input.handlers.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(status.textContent, '2 of 2 harnesses');
});

test('search is progressive enhancement and caches names before shared label formatting', () => {
  const html = fs.readFileSync(path.join(__dirname, '../vsm-index.html'), 'utf8');
  assert.match(html, /class="vhi-search"[^>]* hidden/);
  assert.ok(html.indexOf('<script src="vsm-index.js') < html.indexOf('<script src="app.js'));
});
