import fs from 'node:fs';

// Keep the scene source readable; pin CDN modules to the locally tested version.
const { version } = JSON.parse(fs.readFileSync('node_modules/three/package.json', 'utf8'));
const font = fs.readFileSync('public/fonts/ZenMaruGothic-Medium.ttf').toString('base64');
const license = fs.readFileSync('public/fonts/OFL.txt', 'utf8');
const source = fs.readFileSync('src/main.js', 'utf8').replace(
  '`url(${import.meta.env.BASE_URL}fonts/ZenMaruGothic-Medium.ttf)`',
  "`url(data:font/ttf;base64,${document.getElementById('embedded-font').textContent.trim()})`",
);
const safeSource = source.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>雨の角 · 便利店场景源码</title>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #181d30; }
canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
canvas:active { cursor: grabbing; }
</style>
<!-- Standalone source HTML. Requires internet for Three.js CDN modules.
     The complete editable scene code is below; no GLB/model loader is used. -->
<script type="importmap">
${JSON.stringify({ imports: {
  three: `https://cdn.jsdelivr.net/npm/three@${version}/build/three.module.js`,
  'three/addons/': `https://cdn.jsdelivr.net/npm/three@${version}/examples/jsm/`,
}}, null, 2)}
</script>
</head>
<body>
<script type="module">
${safeSource}
</script>
<!-- Embedded font license: ${license.replace(/--/g, '—')} -->
<script id="embedded-font" type="application/octet-stream">
${font}
</script>
</body>
</html>
`;
fs.writeFileSync('convenience-store.html', html);
console.log(`Generated convenience-store.html — readable inline source; Three.js ${version} via CDN; font embedded.`);
