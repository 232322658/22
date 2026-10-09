import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const font=fs.readFileSync(path.join(root,'assets/credits.ttf')).toString('base64');
let css=fs.readFileSync(path.join(root,'style.css'),'utf8').replace("url('./assets/credits.ttf')",`url('data:font/ttf;base64,${font}')`);
const audio=fs.readFileSync(path.join(root,'assets/song.mp3')).toString('base64');
const js=['timeline.js','scenes.js','player.js'].map(name=>fs.readFileSync(path.join(root,name),'utf8')
  .replace(/^import .*?;\n/gm,'').replace(/\bexport /g,'')).join('\n');
html=html.replace('<link rel="stylesheet" href="./style.css">',`<style>${css}</style>`)
  .replace('src="./assets/song.mp3"',`src="data:audio/mpeg;base64,${audio}"`)
  .replace('href="./DIRECTION.md"','href="https://github.com/232322658/22/blob/arena/e0eb6d0e-22/mv/lonely-fire/DIRECTION.md"')
  .replace('<script type="module" src="./player.js"></script>',`<script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`);
fs.writeFileSync(path.join(root,'embers.html'),html);
console.log('Built embers.html: readable source, embedded audio/font, no network dependencies.');

// The standard repository build includes a deployable MV alongside the older project.
const dist=path.resolve(root,'../../dist/mv/lonely-fire');
fs.mkdirSync(dist,{recursive:true});
for(const name of ['index.html','style.css','timeline.js','scenes.js','player.js','DIRECTION.md','README.md','embers.html'])
  fs.copyFileSync(path.join(root,name),path.join(dist,name));
fs.cpSync(path.join(root,'assets'),path.join(dist,'assets'),{recursive:true});
