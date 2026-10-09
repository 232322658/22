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
 const page=await browser.newPage({viewport:{width:1440,height:1200}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const standalone=!!process.env.MV_STANDALONE;
 await page.goto(standalone?pathToFileURL(path.resolve('mv/lonely-fire/embers.html')).href:'http://localhost:5173/mv/lonely-fire/');
 await page.waitForFunction(()=>window.__mv);
 await page.waitForFunction(()=>window.__mv.audio.readyState>=1);
 assert.ok(Math.abs(await page.evaluate(()=>window.__mv.duration)-290.35)<.15,'complete audio loaded');
 assert.equal(await page.evaluate(()=>window.__mv.DATA.lyrics.length),36);
 const allCueBoundaries=await page.evaluate(()=>window.__mv.DATA.lyrics.every(l=>window.__mv.activeLyric(l.start+.01)?.text===l.text&&window.__mv.activeLyric(l.end-.01)?.text===l.text));
 assert.ok(allCueBoundaries,'all lyric cue starts and ends agree');
 const allShots=await page.evaluate(()=>window.__mv.SHOTS.every(s=>{const f=window.__mv.renderAt(s.start+2);return f.shot===s.label}));
 assert.ok(allShots,'all 24 shot scripts render');
 assert.ok(await page.evaluate(()=>document.fonts.check('20px Embers')));
 await page.evaluate(()=>window.__mv.renderAt(17.17));assert.equal(await page.locator('#film').getAttribute('data-lyric'),'');
 await page.evaluate(()=>window.__mv.renderAt(17.20));assert.equal(await page.locator('#film').getAttribute('data-lyric'),'你看我 我看你 彼此相對沉默');
 await page.evaluate(()=>window.__mv.renderAt(151));assert.equal(await page.locator('#film').getAttribute('data-lyric'),'');
 await page.click('#start');await page.waitForFunction(()=>!window.__mv.audio.paused&&window.__mv.audio.currentTime>.15);
 await page.click('#toggle');assert.ok(await page.evaluate(()=>window.__mv.audio.paused));
 await page.evaluate(()=>{window.__mv.audio.currentTime=195;});await page.waitForFunction(()=>Math.abs(+document.getElementById('film').dataset.time-195)<.1);
 assert.equal(await page.locator('#film').getAttribute('data-lyric'),'寂寞就象一團烈火');
 await page.click('#mute');assert.ok(await page.evaluate(()=>window.__mv.audio.muted));
 await page.selectOption('#sync','0.5');assert.ok(await page.evaluate(()=>window.__mv.activeLyric(17.30)===null));await page.selectOption('#sync','0');
 const deterministic=await page.evaluate(()=>{window.__mv.renderAt(130);const a=document.getElementById('film').toDataURL();window.__mv.renderAt(22);window.__mv.renderAt(130);return a===document.getElementById('film').toDataURL()});assert.ok(deterministic);
 if(!standalone){
 await page.screenshot({path:'.cache/lonely-fire/page-final.png'});
 for(const t of [20,61,95,130,195,204,278,49.5,50,50.5,126.5,127,127.5]){
  await page.evaluate(t=>window.__mv.renderAt(t),t);
  await page.locator('#film').screenshot({path:`.cache/lonely-fire/approved-${t}.png`});
 }
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.__mv.renderAt(130));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile horizontal overflow');
 assert.deepEqual(errors,[]);
 console.log(`PASS ${standalone?'standalone file://':'web app'}: complete audio, LRC offset/cues, playback/pause, seeking, mute, sync correction, deterministic frames, mobile layout.`);
}finally{await browser.close()}
