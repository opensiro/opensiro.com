'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('repository labels are present before JavaScript runs', () => {
  for (const page of ['index.html', 'vsm-index.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const sections = html.match(/<section class="(?:vhi-combos|vhi-all|index-section)"[\s\S]*?<\/section>/g);
    assert.ok(sections?.length, `${page} has index tables`);
    let count = 0;
    for (const section of sections) {
      for (const match of section.matchAll(/<th scope="row">(?:<span[^>]*>.*?<\/span>)?<a([^>]+)>([^<]*)<\/a>/g)) {
        const source = match[1].match(/href="https:\/\/github.com\/([^"/]+\/[^"/]+)/)?.[1];
        assert.ok(source);
        assert.ok(match[1].includes(`title="Source repository: ${source}"`));
        assert.equal(match[2], source.length > 40 ? '...' + source.slice(-37) : source);
        count++;
      }
    }
    assert.ok(count >= 4, `${page} has ready-to-display repository labels`);
  }
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.doesNotMatch(app, /scrollWidth|clientWidth|textContent\s*=/, 'startup does not measure and rewrite labels');
});
