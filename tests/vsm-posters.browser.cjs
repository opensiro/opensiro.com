'use strict';
// Optional browser check: PLAYWRIGHT_MODULE can point to a bundled install.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = pathToFileURL(path.resolve(__dirname, '../vsm.html')).href;
    async function settle() {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
    }
    async function checkFit() {
      const result = await page.evaluate(() => {
        const header = document.querySelector('.site-header').getBoundingClientRect().height;
        const rail = document.querySelector('.vsm-section-nav, .os-section-nav').getBoundingClientRect().height;
        return {
          available: innerHeight - header - rail,
          overflow: document.documentElement.scrollWidth > innerWidth,
          posters: [...document.querySelectorAll('.poster, .proofstate-page .os-hero, .proofstate-page .os-section')].map(poster => ({
            id: poster.id,
            height: poster.getBoundingClientRect().height,
            content: poster.querySelector(':scope > .wrap').getBoundingClientRect().height
          }))
        };
      });
      assert.equal(result.overflow, false, 'page must not overflow horizontally');
      for (const poster of result.posters) {
        assert.ok(poster.height <= result.available + 1, `${poster.id} fits the available window height`);
        assert.ok(poster.content <= poster.height - 47, `${poster.id} content fits without clipping`);
      }
    }
    for (const [width, height] of [[1221, 811], [1366, 768], [1024, 600], [961, 600], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await page.goto(url);
      await settle();
      await checkFit();
    }
    await page.setViewportSize({ width: 1221, height: 811 });
    await page.goto(url + '#fragmentation');
    await settle();
    const bounds = await page.evaluate(() => ({
      header: document.querySelector('.site-header').getBoundingClientRect().bottom,
      poster: document.querySelector('#fragmentation').getBoundingClientRect().toJSON(),
      rail: document.querySelector('.vsm-section-nav').getBoundingClientRect().top
    }));
    assert.ok(bounds.poster.top >= bounds.header - 1, 'anchor clears the header');
    assert.ok(bounds.poster.bottom <= bounds.rail + 1, 'poster clears the bottom navigation');
    await page.locator('[data-system="s1"]').click();
    await page.locator('[data-osm-level="6"]').click();
    await page.locator('[data-vsm-template="research"]').click();
    await settle();
    await checkFit();
    // Resize the existing page across the breakpoint; do not rely on a reload.
    await page.setViewportSize({ width: 390, height: 844 });
    await settle();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('.poster').evaluateAll(posters => posters.every(poster => !poster.style.getPropertyValue('--poster-scale'))), true, 'mobile restores natural reading size');
    await page.setViewportSize({ width: 1366, height: 768 });
    await settle();
    await checkFit();
    const proofstateUrl = pathToFileURL(path.resolve(__dirname, '../opensiro.html')).href;
    for (const [width, height] of [[1221, 811], [1366, 768], [1024, 600], [961, 600], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await page.goto(proofstateUrl);
      await settle();
      await checkFit();
    }
    await page.setViewportSize({ width: 1221, height: 811 });
    await page.goto(proofstateUrl + '#os-economics');
    await settle();
    await page.locator('[data-run-replay]').click();
    await settle();
    await checkFit();
    const proofstateBounds = await page.evaluate(() => ({
      header: document.querySelector('.site-header').getBoundingClientRect().bottom,
      poster: document.querySelector('#os-economics').getBoundingClientRect().toJSON(),
      rail: document.querySelector('.os-section-nav').getBoundingClientRect().top
    }));
    assert.ok(proofstateBounds.poster.top >= proofstateBounds.header - 1, 'Proofstate anchor clears header');
    assert.ok(proofstateBounds.poster.bottom <= proofstateBounds.rail + 1, 'Proofstate content clears navigation');
    await page.setViewportSize({ width: 390, height: 844 });
    await settle();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('.os-hero, .os-section').evaluateAll(blocks => blocks.every(block => !block.style.getPropertyValue('--poster-scale'))), true);
    assert.deepEqual(errors, []);
    console.log('Poster browser check passed: VSMLite and Proofstate at five desktop sizes, anchors, controls, and mobile resizing.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
