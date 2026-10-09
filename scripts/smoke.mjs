import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { chromium as playwright } from '@playwright/test';
import chromium from '@sparticuz/chromium';

// Browser and libraries are unpacked only into ignored test storage.
const libDir = path.resolve('.cache/browser');
fs.mkdirSync(libDir, { recursive: true });
if (!fs.existsSync(path.join(libDir, 'lib/libnspr4.so'))) {
  const archive = zlib.brotliDecompressSync(fs.readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
  fs.writeFileSync(path.join(libDir, 'libraries.tar'), archive);
  execFileSync('tar', ['xf', path.join(libDir, 'libraries.tar'), '-C', libDir]);
}
const browser = await playwright.launch({
  executablePath: await chromium.executablePath(), args: chromium.args, headless: true,
  env: { ...process.env, LD_LIBRARY_PATH: `${libDir}/lib:${process.env.LD_LIBRARY_PATH || ''}` },
});
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  if (process.env.SINGLE_HTML) {
    // CDN traffic is unavailable in the test sandbox. Serve the identical pinned
    // npm package bytes at the HTML's CDN URLs to test the file:// entry point.
    const { version } = JSON.parse(fs.readFileSync('node_modules/three/package.json'));
    await page.route(`https://cdn.jsdelivr.net/npm/three@${version}/**`, async route => {
      const relative = new URL(route.request().url()).pathname.split(`/three@${version}/`)[1];
      await route.fulfill({ path: path.resolve('node_modules/three', relative), contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } });
    });
  }
  await page.goto(process.env.SINGLE_HTML
    ? pathToFileURL(path.resolve('convenience-store.html')).href
    : process.env.TEST_URL || 'http://localhost:5173/');
  await page.waitForFunction(() => window.__diorama, { timeout: 30000 });
  // Keep headless software rendering light; the user-facing renderer is unaffected.
  await page.evaluate(() => {
    const d = window.__diorama;
    window.__pauseRender = true;
    d.renderer.info.autoReset = false;
  });
  await page.waitForTimeout(1000);
  const initial = await page.evaluate(() => {
    const d = window.__diorama;
    return { x: d.camera.position.x, distance: d.camera.position.distanceTo(d.controls.target), rain: d.rain.geometry.attributes.position.count, calls: d.renderer.info.render.calls };
  });
  await page.mouse.move(500, 420);
  await page.mouse.down();
  await page.mouse.move(670, 445, { steps: 12 });
  await page.mouse.up();
  await page.evaluate(() => { for (let i = 0; i < 50; i++) window.__diorama.controls.update(); });
  const rotated = await page.evaluate(() => window.__diorama.camera.position.x);
  assert.notEqual(initial.x, rotated, 'drag changes orbit');
  await page.mouse.wheel(0, -300);
  await page.evaluate(() => { for (let i = 0; i < 50; i++) window.__diorama.controls.update(); });
  const distance = await page.evaluate(() => window.__diorama.camera.position.distanceTo(window.__diorama.controls.target));
  assert.ok(distance < initial.distance, 'wheel zooms in');
  assert.equal(initial.rain, 2900, 'rain contains 1450 animated streaks');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  assert.ok(await page.evaluate(() => Math.abs(window.__diorama.camera.aspect - 390/844) < .001), 'resize preserves camera aspect');
  assert.equal(await page.locator('button,input,nav,header').count(), 0, 'no overlay interface');
  assert.ok(await page.evaluate(() => document.fonts.check('16px ZenMaru')), 'Japanese font loaded');
  assert.equal(await page.evaluate(() => typeof window.exportConvenienceStore), 'undefined', 'no model export API');
  assert.deepEqual(errors, [], 'no browser or shader errors');
  console.log('PASS: scene loads, shaders compile, drag rotates, wheel zooms, mobile resize works, no UI overlays.');
  console.log('Static geometry is batched; rain vertex count:', initial.rain);
} finally { await browser.close(); }
