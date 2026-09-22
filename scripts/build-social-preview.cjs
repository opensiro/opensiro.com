const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'assets', 'social-preview-source.html');
const output = path.join(root, 'assets', 'social-preview.png');

if (!existsSync(source)) {
  throw new Error(`Missing social preview source: ${source}`);
}

const candidates = process.env.CHROMIUM_BIN
  ? [process.env.CHROMIUM_BIN]
  : ['chromium', 'chromium-browser', 'google-chrome', 'chrome'];

const chromium = candidates.find((candidate) => {
  const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
  return !result.error && result.status === 0;
});

if (!chromium) {
  throw new Error('Chromium was not found. Set CHROMIUM_BIN to its executable path.');
}

const result = spawnSync(chromium, [
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=1200',
  `--screenshot=${output}`,
  '--window-size=1536,1024',
  pathToFileURL(source).href,
], { stdio: 'inherit' });

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

console.log(`Built ${path.relative(root, output)} from ${path.relative(root, source)}`);
