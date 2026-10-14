'use strict';

// Public-served provenance attestation after GitHub Pages deployment.
// Compare the complete canonical manifest; a successful deploy alone is not
// evidence that Pages serves the Index snapshot shipped by that commit.
const fs = require('node:fs');
const path = require('node:path');
const {setTimeout: sleepDefault} = require('node:timers/promises');

const relativeManifest = 'assets/harness-index/source-manifest.json';

async function verifyServedManifest({
  baseUrl,
  expectedText,
  fetchImpl = fetch,
  attempts = 12,
  delayMs = 10000,
  sleep = sleepDefault,
}) {
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) throw new Error('Missing absolute Pages base URL');
  if (!Number.isInteger(attempts) || attempts < 1) throw new Error('Invalid attempts');
  const expected = JSON.parse(expectedText);
  if (!/^[0-9a-f]{40}$/.test(expected.source_sha || '')) throw new Error('Invalid local Index SHA');
  const url = new URL(relativeManifest, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  let lastError = 'not fetched';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchImpl(url.toString(), {
        headers: {'cache-control': 'no-cache'},
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        lastError = 'HTTP ' + response.status;
      } else {
        const actualText = await response.text();
        const actual = JSON.parse(actualText);
        if (actualText.trimEnd() === expectedText.trimEnd()) {
          return {attempt, sourceSha:expected.source_sha, snapshotRevision:expected.snapshot_revision, url:url.toString()};
        }
        lastError = 'served source=' + String(actual.source_sha) + ', revision=' +
          String(actual.snapshot_revision) + '; expected source=' + expected.source_sha +
          ', revision=' + expected.snapshot_revision;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  throw new Error('Pages source-manifest not verified after ' + attempts +
    ' attempts: ' + lastError);
}

if (require.main === module) {
  const expectedText = fs.readFileSync(path.resolve(
    __dirname, '..', relativeManifest
  ), 'utf8');
  const baseUrl = process.env.DEPLOYED_PAGE_URL;
  if (!baseUrl || !baseUrl.startsWith('https://')) {
    console.error('DEPLOYED_PAGE_URL must be a non-empty HTTPS Pages URL');
    process.exitCode = 1;
  } else {
    verifyServedManifest({baseUrl, expectedText}).then(result => {
      console.log('Verified served Index SHA ' + result.sourceSha +
        ' and snapshot revision ' + result.snapshotRevision +
        ' at ' + result.url + ' (attempt ' + result.attempt + ')');
    }).catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}

module.exports = {verifyServedManifest};
