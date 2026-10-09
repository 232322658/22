import fs from 'node:fs';
import path from 'node:path';
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
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  page.on('pageerror', err => console.error(err));
  await page.goto(process.env.TEST_URL || 'http://localhost:5173/');
  await page.waitForFunction(() => window.exportConvenienceStore, { timeout: 30000 });
  await page.evaluate(() => window.__pauseRender = true);
  const base64 = await page.evaluate(async () => {
    const buffer = await window.exportConvenienceStore();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(new Blob([buffer], { type: 'model/gltf-binary' }));
    });
  });
  fs.mkdirSync('downloads', { recursive: true });
  const validation = await page.evaluate(async base64 => {
    const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const { Box3, Vector3 } = await import('/node_modules/three/build/three.module.js');
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer, '');
    const bounds = new Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new Vector3());
    return { size: size.toArray(), children: gltf.scene.children.length };
  }, base64);
  if (validation.size.some(n => !Number.isFinite(n)) || validation.size[0] > 13 || validation.size[2] > 13) {
    throw new Error('Model bounds invalid or presentation background was exported');
  }
  console.log('Validated round-trip GLTFLoader bounds:', validation.size);
  const model = Buffer.from(base64, 'base64');
  if (model.toString('ascii', 0, 4) !== 'glTF') throw new Error('Not a GLB');
  const jsonLength = model.readUInt32LE(12);
  const gltf = JSON.parse(model.toString('utf8', 20, 20 + jsonLength));
  if (gltf.images.some(image => image.bufferView === undefined)) throw new Error('External texture detected');
  fs.writeFileSync('downloads/komorebi-mart.glb', model);
  console.log(`Exported ${(model.length/1024/1024).toFixed(1)} MB GLB: ${gltf.meshes.length} meshes, ${gltf.images.length} embedded textures.`);
} finally { await browser.close(); }
