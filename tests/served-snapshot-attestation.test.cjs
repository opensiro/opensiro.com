'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {verifyServedManifest} = require('../scripts/verify-served-index-manifest.cjs');

const expected = JSON.stringify({
  source_repository: 'opensiro/vsm-harness-index',
  source_branch: 'main',
  source_sha: 'a'.repeat(40),
  source_url: 'https://github.com/opensiro/vsm-harness-index/tree/' + 'a'.repeat(40),
  snapshot_revision: '0123456789abcdef',
  source_updated_at: '2026-10-14T19:23:22.000Z',
  included_assessments: 514,
  all_rows_file: 'all-0123456789abcdef.js',
}, null, 2) + '\n';

function response(text, status = 200) {
  return {ok:status === 200, status, text:async () => text};
}

test('attests entire served snapshot after eventual Pages propagation', async () => {
  const visited = [];
  let attempt = 0;
  const result = await verifyServedManifest({
    baseUrl:'https://opensiro.com/',
    expectedText:expected,
    attempts:3,
    delayMs:0,
    sleep:async () => {},
    fetchImpl:async (url, opts) => {
      visited.push({url, cache:opts.headers['cache-control']});
      return response(++attempt === 1 ? expected.replace('514', '513') : expected);
    },
  });
  assert.equal(result.attempt, 2);
  assert.equal(result.sourceSha, 'a'.repeat(40));
  assert.equal(result.snapshotRevision, '0123456789abcdef');
  assert.equal(visited.length, 2);
  assert.equal(visited[0].url, 'https://opensiro.com/assets/harness-index/source-manifest.json');
  assert.equal(visited[0].cache, 'no-cache');
});

test('a stale served source SHA never becomes a success', async () => {
  const stale = expected.replaceAll('a'.repeat(40), 'b'.repeat(40));
  let attempts = 0;
  await assert.rejects(
    verifyServedManifest({
      baseUrl:'https://opensiro.com/',
      expectedText:expected,
      attempts:2,
      delayMs:0,
      sleep:async () => {},
      fetchImpl:async () => {attempts++; return response(stale);},
    }),
    /not verified after 2 attempts: served source=b{40}/
  );
  assert.equal(attempts, 2);
});

test('HTTP failure and incompatible manifest fail closed', async () => {
  await assert.rejects(verifyServedManifest({
    baseUrl:'https://opensiro.com',
    expectedText:expected,
    attempts:1,
    fetchImpl:async () => response('not found', 404),
  }), /HTTP 404/);
  await assert.rejects(verifyServedManifest({
    baseUrl:'https://opensiro.com',
    expectedText:'{"source_sha":"invalid"}',
    fetchImpl:async () => {throw new Error('must not fetch');},
  }), /Invalid local Index SHA/);
});

test('served manifest fields must match, not just its Index SHA', async () => {
  const wrongRows = expected.replace('514', '515');
  await assert.rejects(verifyServedManifest({
    baseUrl:'https://opensiro.com',
    expectedText:expected,
    attempts:1,
    fetchImpl:async () => response(wrongRows),
  }), /not verified/);
});
