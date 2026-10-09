import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// All geometry is built locally. No image services, remote models, or runtime APIs.
const font = new FontFace('ZenMaru', 'url(/fonts/ZenMaruGothic-Medium.ttf)');
try { document.fonts.add(await font.load()); } catch { /* System fonts remain usable. */ }

const scene = new THREE.Scene();
scene.background = new THREE.Color('#18223a');
scene.fog = new THREE.FogExp2('#171d30', 0.013);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label', '可旋转缩放的雨夜便利店三维微缩景观');
renderer.domElement.setAttribute('role', 'img');

const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 100);
camera.position.set(14.8, 11.6, 21.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = true;
controls.minDistance = 9;
controls.maxDistance = 36;
controls.minPolarAngle = 0.17;
controls.maxPolarAngle = Math.PI / 2.05;
controls.autoRotate = false;
controls.update();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.34, 0.55, 1.12);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const steps = new Uint8Array([80, 148, 212, 255]);
const gradient = new THREE.DataTexture(steps, 4, 1, THREE.RedFormat);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;
const palette = {
  cream: '#c6c5b0', ivory: '#e8debe', teal: '#488a83', dark: '#242f40',
  frame: '#344b53', blue: '#435975', asphalt: '#263644', pink: '#d9708c',
  gold: '#e7b86b', white: '#d6e1dc', metal: '#627d87', red: '#b54b62', green: '#649b85',
};
const materials = new Map();
function mat(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!materials.has(key)) materials.set(key, new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...options }));
  return materials.get(key);
}
function glow(color, intensity = 1) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5 });
}
const outlineMaterial = new THREE.LineBasicMaterial({ color: '#111c2b', transparent: true, opacity: 0.65 });
const edgesCache = new Map();
const geometryCache = new Map();
function box(w, h, d, x, y, z, material, parent = scene, outline = true) {
  const key = `${w},${h},${d}`;
  if (!geometryCache.has(key)) geometryCache.set(key, new THREE.BoxGeometry(w, h, d));
  const geo = geometryCache.get(key);
  const obj = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
  obj.position.set(x, y, z);
  obj.castShadow = !obj.material.transparent;
  obj.receiveShadow = true;
  parent.add(obj);
  if (outline && Math.max(w, h, d) > 0.15) {
    if (!edgesCache.has(key)) edgesCache.set(key, new THREE.EdgesGeometry(geo));
    const edge = new THREE.LineSegments(edgesCache.get(key), outlineMaterial);
    obj.add(edge);
  }
  return obj;
}
function cyl(r, h, x, y, z, material, parent = scene, rTop = r, segments = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, h, segments), typeof material === 'string' ? mat(material) : material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function sphere(r, x, y, z, material, parent = scene, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), typeof material === 'string' ? mat(material) : material);
  mesh.position.set(x, y, z); mesh.scale.set(...scale); parent.add(mesh); return mesh;
}
function rod(a, b, r, material, parent = scene) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const mesh = cyl(r, from.distanceTo(to), 0, 0, 0, material, parent, r, 8);
  mesh.position.copy(from.add(to).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(new THREE.Vector3(...a)).normalize());
  return mesh;
}
function curve(points, r, material, parent = scene) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 32, r, 6, false), typeof material === 'string' ? mat(material) : material);
  parent.add(mesh); return mesh;
}
function torus(r, tube, x, y, z, material, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 32), typeof material === 'string' ? mat(material) : material);
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
function texture(draw, w = 1024, h = 512) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function textTex(lines, bg, color = '#fff5dd', w = 1024, h = 256) {
  return texture((ctx, width, height) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach(([text, size, y, custom]) => {
      ctx.font = `500 ${size}px ZenMaru, sans-serif`; ctx.fillStyle = custom || color;
      ctx.fillText(text, width / 2, y);
    });
  }, w, h);
}
function panel(w, h, x, y, z, map, parent = scene, emission = 0, rotation = 0) {
  const material = new THREE.MeshStandardMaterial({ map, roughness: 0.75, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: emission, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z); mesh.rotation.y = rotation; parent.add(mesh); return mesh;
}
function pointLight(color, intensity, x, y, z, distance = 8) {
  const light = new THREE.PointLight(color, intensity, distance, 1.8);
  light.position.set(x, y, z); scene.add(light); return light;
}
function floorPlane(w, d, x, z, material, y = 0.36) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); mesh.receiveShadow = true; scene.add(mesh); return mesh;
}

scene.add(new THREE.HemisphereLight('#a9bbdf', '#4d4259', 1.1));
const moon = new THREE.DirectionalLight('#b6c9ff', 1.15);
moon.position.set(-5, 14, 7); moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.025;
scene.add(moon);
const rim = new THREE.DirectionalLight('#8a8bb9', 0.65); rim.position.set(8, 5, -9); scene.add(rim);

// A single solid square, bevel-like layered plinth. Nothing floats beyond its footprint.
box(12.15, 0.38, 12.15, 0, -0.06, 0, '#263546');
box(12, 0.20, 12, 0, 0.22, 0, '#3c4e5b');
box(11.96, 0.025, 11.96, 0, 0.335, 0, '#182b39', scene, false);
box(11.98, 0.038, 0.026, 0, 0.09, 6.06, '#68858b', scene, false);
box(0.026, 0.038, 11.98, 6.06, 0.09, 0, '#68858b', scene, false);

// The wet street is one real planar reflection, muted and broken by subtle water distortion.
const waterShader = {
  uniforms: THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),
  vertexShader: Reflector.ReflectorShader.vertexShader,
  fragmentShader: `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform float time;
    varying vec4 vUv;
    #include <logdepthbuf_pars_fragment>
    void main(){
      #include <logdepthbuf_fragment>
      vec4 uv = vUv;
      vec2 st = uv.xy / uv.w;
      uv.x += sin(st.y*160.0+time*.7)*.0009*uv.w;
      uv.y += sin(st.x*140.0+time*.9)*.00045*uv.w;
      vec3 reflection = texture2DProj(tDiffuse,uv).rgb;
      float n = fract(sin(dot(st, vec2(112.7,269.5)))*43758.5453);
      float streak = sin(st.y*480.0+sin(st.x*100.0)*3.0)*.0012;
      gl_FragColor = vec4(mix(color,reflection,.22) + streak + n*.0018,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};
waterShader.uniforms.time = { value: 0 };
const wetStreet = new Reflector(new THREE.PlaneGeometry(11.94, 11.94), {
  color: '#142433', textureWidth: 1024, textureHeight: 1024, clipBias: 0.004, shader: waterShader, multisample: 0,
});
wetStreet.rotation.x = -Math.PI / 2; wetStreet.position.y = 0.352; scene.add(wetStreet);

// Raised pavement occupies a compact corner; the L-shaped road remains clearly readable.
box(9.2, 0.15, 8.48, -1.36, 0.425, -1.72, '#59666c');
const paving = texture((c, w, h) => {
  c.fillStyle = '#697678'; c.fillRect(0, 0, w, h);
  for (let row = 0; row < 24; row++) for (let col = 0; col < 28; col++) {
    const x = col * 38 + (row % 2) * 19;
    c.fillStyle = ['#727d7c', '#697575', '#647072', '#7b8280'][(col * 7 + row * 11) % 4];
    c.fillRect(x, row * 23, 36, 21);
  }
}, 1024, 512);
floorPlane(9.16, 8.44, -1.36, -1.72, mat('#bcc4bc', { map: paving }), 0.505);
for (let x = -5.8; x < 3.3; x += 0.52) box(0.49, 0.18, 0.19, x, 0.445, 2.56, '#9daaa5');
for (let z = -5.7; z < 2.5; z += 0.52) box(0.19, 0.18, 0.49, 3.29, 0.445, z, '#9daaa5');
// Tactile tiles turn into the entry.
for (let x = -5.2; x < 2.9; x += 0.31) {
  box(0.29, 0.015, 0.30, x, 0.521, 2.15, '#bbac77', scene, false);
  for (let k = 0; k < 3; k++) box(0.025, 0.01, 0.23, x - 0.08 + k * 0.08, 0.533, 2.15, '#d3c78b', scene, false);
}
for (let z = 1.25; z < 2.0; z += 0.3) box(0.32, 0.017, 0.27, 1.02, 0.524, z, '#d2c38a', scene, false);

// White street markings, not interface graphics.
const whitePaint = mat('#adbebc', { transparent: true, opacity: 0.74 });
for (let z = 3.03; z < 5.7; z += 0.48) floorPlane(2.75, 0.245, 0.40, z, whitePaint, 0.366);
for (let z = -5.4; z < 2.1; z += 1.7) floorPlane(0.065, 0.72, 4.73, z, whitePaint, 0.366);
for (const x of [-5.36, -3.08]) floorPlane(0.055, 2.37, x, 4.14, whitePaint, 0.366);
floorPlane(2.32, 0.055, -4.22, 5.32, whitePaint, 0.366);
const parkingTex = textTex([['軽', 155, 128]], '#344452', '#acbfbc', 256, 256);
const parking = panel(0.48, 0.48, -4.22, 0.371, 4.33, parkingTex); parking.rotation.x = -Math.PI / 2;
for (const x of [-4.95, -3.5]) box(0.46, 0.065, 0.17, x, 0.39, 3.1, '#85918f');
// Gutters and storm-drain grates.
box(8.8, 0.02, 0.13, -1.2, 0.368, 2.78, '#152634', scene, false);
box(0.13, 0.02, 7.9, 3.5, 0.368, -1.35, '#152634', scene, false);
for (const [x, z] of [[2.75, 2.8], [-4.8, 2.8], [3.49, -2.5], [3.49, 1.6]]) {
  const g = new THREE.Group(); g.position.set(x, 0.378, z); scene.add(g);
  if (x === 3.49) g.rotation.y = Math.PI / 2;
  box(0.6, 0.028, 0.20, 0, 0, 0, '#1d2934', g);
  for (let k = 0; k < 9; k++) box(0.025, 0.03, 0.19, -0.26 + k * 0.065, 0.008, 0, '#708a90', g, false);
}

// Convenience store shell: a shop that remains fully modeled when orbited.
const sx = -0.95, front = 0.67, back = -3.93, left = -4.15, right = 2.25;
box(6.45, 0.12, 4.64, sx, 0.56, -1.63, '#a3a690');
box(6.35, 0.024, 4.52, sx, 0.637, -1.63, '#d7ccaa', scene, false);
for (let x = left; x < right; x += 0.5) box(0.009, 0.004, 4.45, x, 0.653, -1.63, '#bdb494', scene, false);
for (let z = back; z < front; z += 0.5) box(6.3, 0.004, 0.009, sx, 0.653, z, '#bdb494', scene, false);
box(6.4, 2.95, 0.14, sx, 2.12, back, palette.cream);
box(0.15, 2.95, 4.6, left, 2.12, -1.63, palette.cream);
box(0.14, 0.82, 4.6, right, 1.05, -1.63, palette.cream);
box(0.14, 0.45, 4.6, right, 3.37, -1.63, palette.cream);
box(6.4, 0.57, 0.16, sx, 3.33, front, palette.cream);
box(6.42, 0.10, 4.64, sx, 3.59, -1.63, palette.ivory);
// Subtle block seams on the back and west wall.
for (let y = 0.9; y < 3.4; y += 0.34) {
  box(6.42, 0.012, 0.012, sx, y, back - 0.076, '#959d96', scene, false);
  box(0.012, 0.012, 4.58, left - 0.081, y, -1.63, '#959d96', scene, false);
}
// Dark blue roof, oversized clean fascia and rooftop utility details.
box(6.74, 0.19, 4.91, sx, 3.76, -1.61, '#465b66');
box(6.45, 0.045, 4.6, sx, 3.881, -1.61, '#637677', scene, false);
for (const x of [-4.26, 2.36]) box(0.11, 0.12, 4.93, x, 3.90, -1.61, '#526774');
for (const z of [-4.02, 0.8]) box(6.75, 0.12, 0.11, sx, 3.90, z, '#526774');
box(1.5, 0.09, 1.15, -2.5, 3.943, -2.75, '#4b606a');
for (let k = 0; k < 7; k++) box(0.07, 0.026, 0.9, -3.05 + k * 0.18, 4.01, -2.75, '#718285', scene, false);
cyl(0.17, 0.38, 0.55, 4.10, -2.9, '#758b8c');
cyl(0.26, 0.07, 0.55, 4.32, -2.9, '#526a75');

// Main fascia is a luminous Japanese shop sign; a matching sign wraps the corner.
const signTex = texture((c, w, h) => {
  c.fillStyle = '#faf3d5'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#488c83'; c.fillRect(0, 0, w, 24); c.fillRect(0, h - 40, w, 25);
  c.fillStyle = '#ddaa77'; c.fillRect(0, h - 15, w, 15);
  c.strokeStyle = '#438880'; c.lineWidth = 9; c.beginPath(); c.arc(100, 108, 48, 0.3, 5.3); c.stroke();
  c.fillStyle = '#438880'; c.font = '500 28px ZenMaru'; c.textAlign = 'center'; c.fillText('24', 100, 119);
  c.font = '500 151px ZenMaru'; c.textAlign = 'left'; c.fillText('こもれび', 190, 170);
  c.font = '500 23px ZenMaru'; c.fillText('K O M O R E B I', 206, 203);
  c.textAlign = 'right'; c.font = '500 97px ZenMaru'; c.fillText('MART', w - 50, 142); c.font = '500 25px ZenMaru'; c.fillText('いつでも、ここに。', w - 50, 188);
}, 1536, 256);
box(6.52, 0.73, 0.19, sx, 3.42, 0.84, '#405e61');
const mainSign = panel(6.37, 0.65, sx, 3.44, 0.943, signTex, scene, 0.45);
box(0.18, 0.73, 4.63, 2.39, 3.42, -1.60, '#405e61');
panel(4.51, 0.65, 2.487, 3.44, -1.60, signTex, scene, 0.4, Math.PI / 2);
// Rain canopy with a pale translucent underside.
box(6.85, 0.095, 0.93, sx, 3.04, 1.10, '#67817d');
box(6.86, 0.15, 0.11, sx, 3.025, 1.61, '#3a666a');
box(6.70, 0.027, 0.052, sx, 2.951, 1.53, glow('#f3dfa3', 1.5), scene, false);
for (let x = -4.25; x < 2.6; x += 0.63) box(0.035, 0.03, 0.84, x, 3.10, 1.10, '#90a29a', scene, false);

// Tall glass windows. Light transparency ensures the actual merchandise stays visible.
const glass = new THREE.MeshPhysicalMaterial({ color: '#b7dcd1', transparent: true, opacity: 0.12, roughness: 0.10, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
const windowBottom = 0.72, windowTop = 2.99;
for (const x of [left, -2.23, -0.32, 2.25]) box(0.07, 2.37, 0.09, x, 1.85, front + 0.015, palette.frame);
box(6.43, 0.07, 0.12, sx, windowBottom, front, palette.frame);
box(6.43, 0.07, 0.12, sx, 2.98, front, palette.frame);
for (const [x, w] of [[-3.2, 1.80], [-1.27, 1.82]]) {
  box(w, 2.20, 0.014, x, 1.85, front + 0.015, glass, scene, false);
  box(w, 0.065, 0.032, x, 1.42, front + 0.031, '#5e9e8e', scene, false);
}
// Side windows expose drinks, bento and magazines from a second view.
for (const z of [-3.85, -2.43, -1.0, 0.56]) box(0.08, 1.68, 0.07, right + 0.012, 2.28, z, palette.frame);
box(0.09, 0.07, 4.5, right, 1.47, -1.65, palette.frame);
for (let z = -3.12; z < 0.3; z += 1.45) box(0.015, 1.47, 1.36, right + 0.015, 2.23, z, glass, scene, false);
// Sliding entry door on the front right.
const sliding = [];
for (const x of [0.31, 1.50]) {
  const door = new THREE.Group(); door.position.set(x, 0, front + 0.07); scene.add(door);
  box(1.15, 2.21, 0.012, 0, 1.85, 0, glass, door, false);
  for (const side of [-0.574, 0.574]) box(0.037, 2.28, 0.04, side, 1.85, 0, '#779294', door);
  for (const y of [0.72, 2.98]) box(1.17, 0.037, 0.04, 0, y, 0, '#779294', door);
  box(1.15, 0.065, 0.025, 0, 1.42, 0.035, '#60a694', door, false);
  box(0.022, 0.26, 0.025, x < 1 ? 0.45 : -0.45, 1.49, 0.055, '#e2d5ad', door, false);
  const sticker = textTex([['自動', 53, 61], ['AUTOMATIC', 17, 103]], '#ece8c8', '#467e78', 256, 128);
  panel(0.30, 0.15, 0, 1.81, 0.025, sticker, door, 0.2);
  sliding.push({ door, x });
}
box(2.44, 0.10, 0.13, 0.91, 3.0, front + 0.06, '#334e56');
box(0.13, 0.05, 0.07, 0.91, 2.96, front + 0.15, '#141e2b');
sphere(0.021, 0.94, 2.955, front + 0.19, glow('#84cda8', 1));
box(2.26, 0.03, 0.53, 0.95, 0.53, 1.14, '#294c52');
const matTex = textTex([['いらっしゃいませ', 51, 78]], '#34575b', '#d1c8a9', 768, 160);
const welcome = panel(1.71, 0.34, 0.94, 0.553, 1.13, matTex); welcome.rotation.x = -Math.PI / 2;

// Interior: independent, neatly stocked shelving rather than a painted flat background.
const warmWhite = glow('#ffebbc', 0.7);
for (const x of [-2.9, -0.7, 1.45]) {
  box(0.13, 0.055, 3.28, x, 3.516, -1.59, '#aaa89a');
  box(0.09, 0.023, 3.16, x, 3.483, -1.59, warmWhite, scene, false);
}
pointLight('#ffd994', 7, -2.45, 2.6, -1.25, 6.2);
pointLight('#fff0c3', 7, 0.95, 2.65, -2.35, 6.2);
const entryLight = pointLight('#ffdba0', 4, 0.65, 2.75, 1.1, 6);

const productColors = ['#edc676', '#c9696b', '#79a48a', '#7fadd0', '#d5bf93', '#e39770', '#ece0ba', '#a293b9'];
let productIndex = 0;
function pack(x, y, z, w, h, d, parent, type = 'bag') {
  const n = productIndex++;
  const color = productColors[(n * 7 + Math.floor(n / 5)) % productColors.length];
  if (type === 'bottle') {
    cyl(w * 0.41, h * 0.77, x, y + h * 0.38, z, color, parent, w * 0.36, 8);
    cyl(w * 0.20, h * 0.19, x, y + h * 0.85, z, '#d9d7bc', parent, w * 0.20, 8);
    box(w * 0.63, h * 0.25, 0.008, x, y + h * 0.45, z + w * 0.38, '#e7e4ca', parent, false);
  } else {
    const p = box(w, h, d, x, y + h / 2, z, color, parent, false);
    if (type === 'bag') p.rotation.z = ((n % 3) - 1) * 0.045;
    box(w * 0.68, h * 0.25, 0.006, x, y + h * 0.64, z + d / 2 + 0.005, '#f1e6c4', parent, false);
    box(w * 0.4, h * 0.055, 0.008, x, y + h * 0.62, z + d / 2 + 0.01, color, parent, false);
  }
}
function shelf(x, z, w, rows, mode = 'bag', rotation = 0) {
  const g = new THREE.Group(); g.position.set(x, 0.66, z); g.rotation.y = rotation; scene.add(g);
  box(w, 0.13, 0.63, 0, 0.065, 0, '#9b9c84', g);
  box(w, 1.72, 0.045, 0, 0.9, -0.24, '#dfd3af', g);
  for (const px of [-w / 2 + 0.03, w / 2 - 0.03]) box(0.055, 1.8, 0.58, px, 0.9, 0, '#adb09c', g);
  for (let level = 0; level < rows; level++) {
    const y = 0.20 + level * 0.37;
    box(w, 0.045, 0.61, 0, y, 0.04, '#e4d8b6', g);
    box(w, 0.06, 0.035, 0, y + 0.005, 0.35, '#c0b692', g, false);
    const count = Math.floor(w / 0.18);
    for (let col = 0; col < count; col++) {
      const xx = -w / 2 + 0.11 + col * (w - 0.2) / (count - 1);
      const h = 0.22 + (col % 3) * 0.025;
      pack(xx, y + 0.025, 0.16, 0.12, h, 0.11, g, mode);
      if (col % 2 === 0) pack(xx, y + 0.025, -0.015, 0.12, h, 0.11, g, mode);
      box(0.083, 0.035, 0.008, xx, y - 0.004, 0.372, '#f1eacb', g, false);
    }
  }
  return g;
}
shelf(-2.98, -1.73, 1.73, 4);
shelf(-0.88, -1.95, 1.80, 4);
shelf(-2.96, -2.85, 1.78, 4, 'box');
// Low window-side onigiri and bento display, deliberately below the sightline.
const bento = new THREE.Group(); bento.position.set(-1.55, 0.66, -0.03); scene.add(bento);
box(1.69, 0.66, 0.63, 0, 0.33, 0, '#b7ba9e', bento);
box(1.72, 0.08, 0.7, 0, 0.70, 0, '#d6d3b4', bento);
for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) {
  const xx = -0.64 + col * 0.32, zz = -0.17 + row * 0.32;
  box(0.27, 0.045, 0.24, xx, 0.762, zz, '#293b43', bento, false);
  box(0.10, 0.035, 0.19, xx - 0.06, 0.803, zz, '#e6dfc0', bento, false);
  for (let k = 0; k < 3; k++) sphere(0.035, xx + 0.07, 0.82, zz - 0.06 + k * 0.06, k === 0 ? '#8aaf72' : '#c0824e', bento, [1, 0.45, 1]);
  box(0.285, 0.025, 0.255, xx, 0.842, zz, glass, bento, false);
}
const onigiri = new THREE.Group(); onigiri.position.set(-1.5, 1.6, 0.04); scene.add(onigiri);
box(1.73, 0.055, 0.37, 0, 0, 0, '#d7ceb0', onigiri);
for (let k = 0; k < 8; k++) {
  const x = -0.7 + k * 0.2;
  const triangle = new THREE.Shape(); triangle.moveTo(-0.07, 0); triangle.lineTo(0, 0.15); triangle.lineTo(0.07, 0); triangle.closePath();
  const rice = new THREE.Mesh(new THREE.ExtrudeGeometry(triangle, { depth: 0.06, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.013, bevelThickness: 0.013 }), mat('#efe8ce'));
  rice.position.set(x, 0.04, 0.02); onigiri.add(rice);
  box(0.065, 0.078, 0.018, x, 0.076, 0.105, '#314d40', onigiri, false);
}
panel(1.5, 0.15, -1.5, 1.51, 0.251, textTex([['おにぎり ・ お弁当', 57, 75]], '#d9b870', '#585544', 768, 160), scene, 0.1);

// A refrigerator bank with six shelves full of colorful drinks, behind clear doors.
const fridge = new THREE.Group(); fridge.position.set(0.23, 0.66, -3.60); scene.add(fridge);
box(3.23, 2.37, 0.55, 0, 1.18, 0, '#c2c8b9', fridge);
box(3.02, 2.06, 0.035, 0, 1.19, 0.305, '#314e56', fridge);
box(3.0, 0.045, 0.045, 0, 2.15, 0.34, glow('#d5f1d8', 1.0), fridge, false);
for (let k = 0; k < 5; k++) {
  const y = 0.25 + k * 0.36;
  box(2.93, 0.025, 0.3, 0, y, 0.23, '#879c94', fridge, false);
  for (let j = 0; j < 18; j++) pack(-1.4 + j * 0.165, y + 0.02, 0.27, 0.105, 0.26, 0.08, fridge, 'bottle');
}
for (const x of [-1.5, -0.5, 0.5, 1.5]) box(0.035, 2.10, 0.06, x, 1.18, 0.39, '#b0c4be', fridge);
for (const x of [-1, 0, 1]) {
  box(0.93, 2.05, 0.009, x, 1.19, 0.37, glass, fridge, false);
  box(0.035, 0.47, 0.07, x + 0.40, 1.12, 0.43, '#d1ddc7', fridge, false);
}
panel(3, 0.21, 0, 2.29, 0.3, textTex([['冷たい飲みもの   COLD DRINKS', 56, 66]], '#c6d8ba', '#467269', 1024, 128), fridge, 0.6);

// Cash wrap by the east window, POS, coffee brewer and oden pot.
const counter = new THREE.Group(); counter.position.set(1.32, 0.66, -1.12); scene.add(counter);
box(0.89, 0.88, 1.86, 0, 0.44, 0, '#b7bda3', counter);
box(0.96, 0.075, 1.96, 0, 0.925, 0, '#e5dbc1', counter);
box(0.905, 0.21, 1.87, 0, 0.22, 0, '#5e9183', counter);
box(0.33, 0.055, 0.30, 0, 1.0, 0.51, '#34474e', counter);
rod([0, 1.01, 0.51], [0, 1.21, 0.51], 0.03, '#4c6266', counter);
const screen = box(0.36, 0.24, 0.045, 0, 1.30, 0.51, '#293d49', counter); screen.rotation.x = -0.16;
panel(0.29, 0.17, 0, 1.305, 0.54, textTex([['¥ 680', 57, 61], ['ありがとうございます', 21, 105]], '#739a92', '#e1f3c9', 256, 128), counter, 0.6);
box(0.38, 0.065, 0.27, 0, 0.99, 0.79, '#c0b59d', counter);
box(0.055, 0.04, 0.05, 0.31, 0.99, 0.78, '#677a78', counter, false);
// Coffee machine has spouts, buttons and two cups.
box(0.41, 0.54, 0.38, 0, 1.24, -0.61, '#394b51', counter);
box(0.34, 0.17, 0.04, 0, 1.41, -0.39, '#a3b6af', counter);
box(0.33, 0.23, 0.10, 0, 1.13, -0.40, '#182d38', counter);
for (const x of [-0.10, 0.10]) {
  cyl(0.023, 0.07, x, 1.23, -0.36, '#c0cbbc', counter);
  cyl(0.049, 0.10, x, 1.05, -0.36, '#f4e4c1', counter, 0.057);
  sphere(0.02, x, 1.42, -0.36, glow('#e9bb70', 0.8), counter);
}
panel(0.34, 0.11, 0, 1.57, -0.4, textTex([['挽きたて珈琲', 40, 52]], '#685f4b', '#f5dfab', 512, 112), counter, 0.3);
// Oden warmed steel wells and a glass sneeze guard.
box(0.56, 0.12, 0.45, -0.02, 1.035, -0.01, '#9baaa0', counter);
for (const x of [-0.15, 0.11]) for (const z of [-0.12, 0.10]) {
  box(0.20, 0.015, 0.18, x, 1.107, z, '#826b4b', counter, false);
  sphere(0.055, x, 1.14, z, '#d8bd89', counter, [1, 0.4, 0.7]);
}
box(0.57, 0.26, 0.01, -0.02, 1.25, 0.22, glass, counter, false);
panel(0.45, 0.11, -0.02, 1.07, 0.238, textTex([['あったか おでん', 37, 53]], '#ca9a5f', '#fff0ca', 512, 112), counter, 0.2);
// Magazines: sloping colorful booklets facing the side window.
const magazines = new THREE.Group(); magazines.position.set(1.85, 0.66, -2.12); magazines.rotation.y = Math.PI / 2; scene.add(magazines);
box(0.84, 0.65, 0.32, 0, 0.32, 0, '#74857b', magazines);
for (let row = 0; row < 3; row++) {
  box(0.87, 0.06, 0.28, 0, 0.45 + row * 0.26, 0.08, '#c4c5ad', magazines);
  for (let k = 0; k < 4; k++) {
    const book = box(0.18, 0.29, 0.025, -0.31 + k * 0.20, 0.60 + row * 0.26, 0.08, productColors[(k + row * 3) % 8], magazines, false);
    book.rotation.x = -0.2;
    box(0.13, 0.033, 0.008, -0.31 + k * 0.20, 0.68 + row * 0.26, 0.118, '#eae1bb', magazines, false);
  }
}
// Freezer at the west window.
box(0.79, 0.75, 0.80, -3.49, 1.05, -0.06, '#c0cfbc');
box(0.80, 0.055, 0.83, -3.49, 1.45, -0.06, '#e1e1c5');
box(0.69, 0.015, 0.67, -3.49, 1.483, -0.06, mat('#7cb8b1', { transparent: true, opacity: 0.5 }), scene, false);
panel(0.62, 0.25, -3.49, 1.12, 0.353, textTex([['アイス', 65, 75]], '#699c96', '#fff0ce', 512, 160), scene, 0.2);
// Backroom door and hanging lightboxes.
box(0.82, 2.11, 0.048, -3.58, 1.72, -3.84, '#94a898');
box(0.72, 1.94, 0.02, -3.58, 1.72, -3.803, '#a5b4a0');
sphere(0.035, -3.32, 1.59, -3.77, '#e1d7b6');
panel(0.45, 0.14, -3.58, 2.2, -3.78, textTex([['STAFF ONLY', 31, 62]], '#697f75', '#eee9c9', 512, 128));
for (const [x, label, color] of [[-2.96, 'お菓子', '#d29f6f'], [-0.9, '日々の、ひと息。', '#799e84'], [1.32, 'レジ →', '#71a796']]) {
  box(1.17, 0.31, 0.07, x, 2.75, -1.02, '#eee0bc');
  panel(1.08, 0.24, x, 2.75, -0.98, textTex([[label, 59, 75]], color, '#fff1d3', 768, 160), scene, 0.6);
  for (const xx of [x - 0.35, x + 0.35]) rod([xx, 2.92, -1.02], [xx, 3.5, -1.02], 0.007, '#6f8074');
}
// Small interior floor arrows to the till.
for (const z of [-2.15, -1.3, -0.5]) {
  const arrow = new THREE.Shape(); arrow.moveTo(-0.045, -0.10); arrow.lineTo(0.045, -0.1); arrow.lineTo(0.045, 0.04); arrow.lineTo(0.12, 0.04); arrow.lineTo(0, 0.18); arrow.lineTo(-0.12, 0.04); arrow.lineTo(-0.045, 0.04); arrow.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(arrow), mat('#8eaa88')); m.rotation.x = -Math.PI / 2; m.position.set(0.40, 0.658, z); scene.add(m);
}

// Original graphic posters, drawn on canvas and attached to the architecture.
function posterTex(kind) {
  return texture((c, w, h) => {
    c.fillStyle = kind === 0 ? '#e9d6ae' : '#aec4b6'; c.fillRect(0, 0, w, h);
    c.fillStyle = kind === 0 ? '#a85b4e' : '#416b63'; c.textAlign = 'center';
    c.font = '500 61px ZenMaru'; c.fillText(kind === 0 ? '秋の、おいしい。' : '雨の日も、', w / 2, 102);
    c.font = '500 42px ZenMaru'; c.fillText(kind === 0 ? 'ほっと、ひと息。' : 'ちょっといい日。', w / 2, 174);
    if (kind === 0) {
      c.fillStyle = '#786149'; c.beginPath(); c.ellipse(w / 2, h * .62, 142, 40, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#efeee2'; c.fillRect(w / 2 - 91, h * .45, 166, 130);
      c.beginPath(); c.ellipse(w / 2 - 8, h * .45, 83, 24, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#eeeada'; c.lineWidth = 22; c.beginPath(); c.arc(w / 2 + 82, h * .52, 36, -Math.PI / 2, Math.PI / 2); c.stroke();
      c.strokeStyle = '#c19d75'; c.lineWidth = 5;
      for (let k = -1; k < 2; k++) { c.beginPath(); c.moveTo(w / 2 + k * 28, h * .39); c.bezierCurveTo(w / 2 - 15 + k * 28, h * .35, w / 2 + 25 + k * 28, h * .3, w / 2 + k * 28, h * .26); c.stroke(); }
    } else {
      c.fillStyle = '#ebdcac'; c.beginPath(); c.arc(w / 2, h * .5, 144, Math.PI, Math.PI * 2); c.fill();
      c.strokeStyle = '#4c726a'; c.lineWidth = 12; c.beginPath(); c.moveTo(w / 2, h * .38); c.lineTo(w / 2, h * .69); c.quadraticCurveTo(w / 2, h * .75, w / 2 - 34, h * .72); c.stroke();
      c.fillStyle = '#567f75'; for (let k = 0; k < 14; k++) { c.beginPath(); c.ellipse(50 + (k * 89) % 440, 240 + (k * 119) % 290, 4, 12, .3, 0, Math.PI * 2); c.fill(); }
    }
    c.fillStyle = kind === 0 ? '#a15f4c' : '#4d796c'; c.font = '500 58px ZenMaru'; c.fillText(kind === 0 ? '珈琲  ¥120' : 'こもれびマート', w / 2, h - 98);
    c.font = '500 24px ZenMaru'; c.fillText('いつでも、ここに。  KOMOREBI', w / 2, h - 45);
  }, 512, 768);
}
panel(0.49, 0.74, -3.89, 2.24, 0.72, posterTex(0), scene, 0.14);
panel(0.46, 0.69, -0.57, 2.30, 0.72, posterTex(1), scene, 0.14);

// Vending machine: illuminated rows of cans, selector keys, coin slot and retrieval hatch.
const vending = new THREE.Group(); vending.position.set(-4.89, 0.51, 0.34); vending.rotation.y = 0.10; scene.add(vending);
box(0.94, 1.98, 0.70, 0, 0.99, 0, '#609c99', vending);
box(0.89, 1.90, 0.06, 0, 1.0, 0.375, '#8bc0b0', vending);
box(0.74, 1.03, 0.05, -0.02, 1.28, 0.418, '#233e49', vending);
box(0.71, 0.035, 0.026, -0.02, 1.79, 0.455, glow('#edf3c7', 1.3), vending, false);
for (let row = 0; row < 3; row++) {
  const yy = 0.86 + row * 0.29;
  box(0.69, 0.025, 0.08, -0.02, yy, 0.44, '#cedccb', vending, false);
  for (let k = 0; k < 6; k++) {
    pack(-0.30 + k * 0.112, yy + 0.025, 0.459, 0.069, 0.18, 0.06, vending, 'bottle');
    box(0.065, 0.025, 0.021, -0.30 + k * 0.112, yy - 0.043, 0.474, glow('#88ceb7', 0.75), vending, false);
  }
}
panel(0.82, 0.13, 0, 1.91, 0.417, textTex([['ひと息、どうぞ。', 44, 60]], '#f4eacb', '#568c7d', 768, 128), vending, 1);
box(0.48, 0.18, 0.08, -0.07, 0.41, 0.428, '#29494e', vending);
box(0.43, 0.07, 0.025, -0.07, 0.44, 0.476, '#526d6e', vending, false);
box(0.18, 0.25, 0.04, 0.30, 0.65, 0.435, '#4a696c', vending);
cyl(0.047, 0.014, 0.30, 0.72, 0.465, '#bdcab7', vending).rotation.x = Math.PI / 2;
box(0.075, 0.018, 0.017, 0.30, 0.61, 0.464, '#1d3a46', vending, false);
for (const x of [-0.31, 0.31]) box(0.10, 0.07, 0.47, x, 0.03, 0, '#354e53', vending);
pointLight('#a7f7d7', 1.5, -4.8, 1.7, 1.0, 3.3);

// Umbrella rack with transparent and colored umbrellas, all furled; no people.
const rack = new THREE.Group(); rack.position.set(2.42, 0.52, 1.19); scene.add(rack);
box(0.59, 0.06, 0.42, 0, 0.05, 0, '#46616b', rack);
for (const x of [-0.25, 0.25]) for (const z of [-0.16, 0.16]) rod([x, 0.04, z], [x, 0.53, z], 0.014, '#819996', rack);
for (const z of [-0.17, 0.17]) box(0.56, 0.032, 0.03, 0, 0.52, z, '#8ea59e', rack, false);
for (let k = 0; k < 5; k++) {
  const x = -0.19 + k * 0.095, z = k % 2 ? 0.09 : -0.05;
  rod([x, 0.06, z], [x, 1.0, z], 0.009, '#b3c4bd', rack);
  cyl(0.041, 0.57, x, 0.46, z, k === 1 ? '#d09a93' : k === 3 ? '#7f9fb4' : '#a7c5c2', rack, 0.013, 8);
  curve([[x, 0.98, z], [x + 0.04, 1.035, z], [x + 0.09, 1.00, z], [x + 0.07, 0.94, z]], 0.013, '#d4d6c1', rack);
}
// Recycling bins with circular sorted slots.
for (const [x, color, label] of [[-3.80, '#628b81', '缶'], [-3.23, '#6b839a', 'PET']]) {
  box(0.47, 0.79, 0.47, x, 0.91, 1.51, color);
  box(0.49, 0.13, 0.49, x, 1.36, 1.51, '#b3c1ae');
  const slot = cyl(0.092, 0.012, x, 1.37, 1.763, '#243f47'); slot.rotation.x = Math.PI / 2;
  panel(0.26, 0.22, x, 1.01, 1.752, textTex([[label, 68, 79]], '#d9ddc4', '#47675e', 256, 160));
}

// Delicate city bicycle, basket and spokes, leaning at the curb.
function bicycle(x, z, rotation, color) {
  const g = new THREE.Group(); g.position.set(x, 0.54, z); g.rotation.y = rotation; scene.add(g);
  for (const wx of [-0.61, 0.61]) {
    torus(0.325, 0.036, wx, 0.34, 0, '#24343b', g);
    torus(0.285, 0.014, wx, 0.34, 0, '#91a6a8', g);
    cyl(0.048, 0.13, wx, 0.34, 0, '#718c92', g).rotation.x = Math.PI / 2;
    for (let k = 0; k < 12; k++) {
      const angle = k * Math.PI / 6;
      rod([wx, 0.34, 0], [wx + Math.cos(angle) * 0.285, 0.34 + Math.sin(angle) * 0.285, 0], 0.005, '#859a9c', g);
    }
  }
  const a = [-0.61, 0.34, 0], b = [-0.24, 0.84, 0], c = [-0.05, 0.32, 0], d = [0.31, 0.83, 0], e = [0.61, 0.34, 0];
  for (const [p, q] of [[a, b], [b, c], [a, c], [b, d], [c, d], [d, e], [c, e]]) rod(p, q, 0.023, color, g);
  rod(b, [-0.29, 1.0, 0], 0.022, '#afbbb1', g);
  box(0.28, 0.064, 0.18, -0.28, 1.015, 0, '#37494e', g);
  rod(d, [0.28, 1.12, 0], 0.022, '#aab8af', g);
  curve([[0.28, 1.10, -0.19], [0.33, 1.13, -0.12], [0.32, 1.13, 0.12], [0.28, 1.10, 0.19]], 0.023, '#9aaca7', g);
  for (const zz of [-0.18, 0.18]) rod([0.25, 1.1, zz], [0.38, 1.1, zz], 0.026, '#354b51', g);
  rod([-0.05, 0.32, -0.10], [-0.05, 0.32, 0.10], 0.025, '#91a9a8', g);
  box(0.12, 0.032, 0.09, -0.11, 0.22, 0.11, '#465d62', g, false);
  rod([-0.25, 0.35, 0], [-0.37, 0.01, 0.16], 0.013, '#758c8e', g);
  // Open wire basket.
  box(0.32, 0.025, 0.35, 0.64, 0.88, 0, '#879d98', g);
  for (const zz of [-0.18, 0.18]) {
    rod([0.46, 1.12, zz], [0.82, 1.12, zz], 0.012, '#aec0b1', g);
    for (let k = 0; k < 7; k++) rod([0.47 + k * 0.055, 0.88, zz], [0.47 + k * 0.055, 1.12, zz], 0.006, '#96aaa6', g);
  }
  for (const xx of [0.46, 0.82]) {
    rod([xx, 1.12, -0.18], [xx, 1.12, 0.18], 0.012, '#a6b8ae', g);
    for (let k = 0; k < 6; k++) rod([xx, 0.88, -0.17 + k * 0.068], [xx, 1.12, -0.17 + k * 0.068], 0.006, '#96aaa6', g);
  }
  sphere(0.045, 0.7, 0.83, 0, glow('#f3dfaf', 0.8), g);
  sphere(0.026, -0.86, 0.55, 0, '#c27b71', g);
  return g;
}
bicycle(-4.7, 1.95, -0.12, '#ba8b7c');

// Railings around the corner stop short of the entry and zebra crossing.
function railing(x, z, length, rotation = 0) {
  const g = new THREE.Group(); g.position.set(x, 0.52, z); g.rotation.y = rotation; scene.add(g);
  for (const px of [-length / 2, 0, length / 2]) {
    cyl(0.042, 0.78, px, 0.39, 0, '#849fa4', g);
    cyl(0.10, 0.055, px, 0.015, 0, '#3f5964', g);
    sphere(0.043, px, 0.79, 0, '#bfd1c1', g);
  }
  for (const y of [0.42, 0.72]) rod([-length / 2, y, 0], [length / 2, y, 0], 0.028, '#9bb4b0', g);
}
railing(3.02, 0.12, 2.5, Math.PI / 2);
railing(2.42, 2.34, 0.82);
railing(-2.26, 2.36, 1.45);
// A back alley with crates, meters, a rear service door and warm window.
box(0.16, 1.28, 1.96, -5.85, 1.15, -4.65, '#53646c');
box(1.90, 1.30, 0.16, -4.85, 1.16, -5.77, '#56616d');
box(1.72, 0.07, 0.25, -4.85, 1.86, -5.77, '#83928b');
box(0.80, 1.13, 0.06, -3.53, 1.21, -4.035, '#667e80');
panel(0.61, 0.19, -3.53, 1.51, -4.073, textTex([['搬入口', 49, 61]], '#a8b8a5', '#3b5d58', 512, 128), scene, 0, Math.PI);
for (const [x, z, color] of [[-5.37, -4.84, '#769c8a'], [-5.36, -4.32, '#b09270'], [-4.85, -5.19, '#78928f']]) {
  box(0.43, 0.39, 0.42, x, 0.72, z, color);
  for (let k = 0; k < 4; k++) box(0.025, 0.26, 0.02, x - 0.14 + k * 0.09, 0.75, z + 0.22, '#435e63', scene, false);
}
// Outside AC condensers with explicit fan grilles.
function ac(x, y, z, rotation = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotation; scene.add(g);
  box(0.94, 0.57, 0.44, 0, 0, 0, '#b2bbae', g);
  const fan = cyl(0.20, 0.017, -0.12, 0, 0.234, '#546971', g, 0.20, 20); fan.rotation.x = Math.PI / 2;
  for (const radius of [0.07, 0.12, 0.18]) torus(radius, 0.007, -0.12, 0, 0.25, '#91a29b', g);
  for (let k = 0; k < 8; k++) {
    const t = k * Math.PI / 4; rod([-0.12, 0, 0.254], [-0.12 + Math.cos(t) * 0.19, Math.sin(t) * 0.19, 0.254], 0.006, '#9fafa3', g);
  }
  for (let k = 0; k < 6; k++) box(0.16, 0.014, 0.019, 0.31, -0.13 + k * 0.05, 0.239, '#627c7b', g, false);
  for (const xx of [-0.33, 0.33]) box(0.08, 0.14, 0.36, xx, -0.32, 0, '#536971', g);
  return g;
}
ac(-4.40, 1.03, -2.62, -Math.PI / 2);
ac(-1.03, 1.02, -4.32, Math.PI);
curve([[-4.42, 1.2, -2.42], [-4.5, 1.65, -2.4], [-4.36, 2.08, -2.5], [-4.24, 2.18, -2.5]], 0.043, '#b9c5b6');
// Drainpipes on all visible architectural corners.
for (const [x, z] of [[2.26, -3.98], [-4.21, -3.92]]) {
  cyl(0.053, 3.19, x, 2.1, z, '#59767b');
  for (const y of [1.12, 2.58]) torus(0.060, 0.008, x, y, z, '#a2b3a8').rotation.x = Math.PI / 2;
  curve([[x, 0.61, z], [x, 0.55, z + 0.10], [x + 0.18, 0.55, z + 0.10]], 0.055, '#59767b');
}

// Neighborhood noticeboard; the model contains no overlay UI.
const board = new THREE.Group(); board.position.set(2.81, 0.52, -3.76); board.rotation.y = Math.PI / 2; scene.add(board);
for (const x of [-0.47, 0.47]) rod([x, 0, 0], [x, 1.99, 0], 0.035, '#698a86', board);
box(1.16, 1.01, 0.13, 0, 1.44, 0, '#5c807b', board);
box(1.03, 0.84, 0.023, 0, 1.42, 0.085, '#b9b39a', board);
box(1.26, 0.085, 0.28, 0, 2.01, 0, '#65867d', board);
panel(0.43, 0.61, -0.24, 1.41, 0.104, posterTex(1), board);
panel(0.41, 0.61, 0.24, 1.41, 0.104, posterTex(0), board);
panel(0.89, 0.13, 0, 1.88, 0.086, textTex([['町のお知らせ', 56, 72]], '#5c807b', '#ebdfbd', 768, 160), board);

// Potted greenery softens the concrete and adds the scale of a handcrafted diorama.
function plant(x, z, size = 1) {
  cyl(0.19 * size, 0.29 * size, x, 0.53 + 0.145 * size, z, '#b38473', scene, 0.23 * size);
  cyl(0.23 * size, 0.045 * size, x, 0.53 + 0.29 * size, z, '#cea18a');
  cyl(0.19 * size, 0.015, x, 0.54 + 0.31 * size, z, '#514d43');
  for (let k = 0; k < 7; k++) {
    const a = k * 2.399, r = (k % 3 + 1) * 0.052 * size;
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, py = 0.89 + (k % 3) * 0.07 * size;
    rod([x, 0.83, z], [px, py, pz], 0.012, '#658966');
    const leaf = sphere(0.11 * size, px, py, pz, k % 2 ? '#7ca67d' : '#567e6c', scene, [0.66, 1.7, 0.45]); leaf.rotation.z = Math.sin(a) * 0.7;
  }
}
plant(-4.54, -0.82, 0.8); plant(2.67, -2.4, 0.85);

// Street light, signs and power lines stay inside the square footprint.
const lampX = 4.84, lampZ = 3.86;
cyl(0.12, 0.18, lampX, 0.47, lampZ, '#334c5b');
cyl(0.060, 4.75, lampX, 2.81, lampZ, '#67828e');
curve([[lampX, 5.10, lampZ], [lampX, 5.39, lampZ], [4.58, 5.54, lampZ], [4.04, 5.50, lampZ]], 0.056, '#6f8b93');
box(0.73, 0.13, 0.34, 4.00, 5.47, lampZ, '#456370');
box(0.62, 0.031, 0.27, 4.00, 5.384, lampZ, glow('#ffe4a4', 2.5), scene, false);
pointLight('#ffdf9d', 9, 4.02, 5.17, lampZ, 9);
const lampSpot = new THREE.SpotLight('#ffe4ac', 13, 10, 0.64, 0.8, 1.5);
lampSpot.position.set(4.03, 5.26, lampZ); lampSpot.target.position.set(3.5, 0.35, 3.1); scene.add(lampSpot, lampSpot.target);
// Blue Japanese road signs on a smaller post.
cyl(0.036, 2.65, 3.84, 1.69, 1.33, '#97aba6');
const signCircle = cyl(0.22, 0.052, 3.84, 2.92, 1.33, '#648eaa', scene, 0.22, 32); signCircle.rotation.x = Math.PI / 2;
panel(0.30, 0.26, 3.84, 2.92, 1.365, textTex([['→', 146, 135]], '#527f9d', '#e1eee3', 256, 256));
box(0.80, 0.22, 0.06, 3.84, 2.41, 1.33, '#9cbaa9');
panel(0.76, 0.18, 3.84, 2.41, 1.367, textTex([['木漏れ日通り', 41, 67]], '#7caaa2', '#f0e5c7', 768, 128));

// Utility pole, transformers and sagging cables are a strong anime street-corner silhouette.
const poleX = 4.07, poleZ = -4.95;
cyl(0.11, 6.35, poleX, 3.54, poleZ, '#748391', scene, 0.075, 12);
cyl(0.17, 0.29, poleX, 0.49, poleZ, '#445968');
for (let k = 0; k < 6; k++) box(0.09, 0.12, 0.15, poleX + 0.11, 0.77 + k * 0.15, poleZ, k % 2 ? '#34485b' : '#c4b47f', scene, false);
for (const y of [5.82, 6.40]) {
  box(1.3, 0.10, 0.11, poleX, y, poleZ, '#617b89');
  for (const x of [poleX - 0.52, poleX + 0.52]) {
    cyl(0.047, 0.22, x, y + 0.15, poleZ, '#b2c3be');
    for (let k = 0; k < 3; k++) cyl(0.072, 0.025, x, y + 0.07 + k * 0.055, poleZ, '#b7cbc1');
  }
}
cyl(0.22, 0.66, poleX - 0.32, 5.29, poleZ, '#899f9e');
cyl(0.25, 0.048, poleX - 0.32, 5.63, poleZ, '#b7c3b5');
curve([[poleX - 0.32, 5.65, poleZ], [poleX - 0.40, 5.86, poleZ], [poleX, 5.96, poleZ]], 0.017, '#293d4d');
box(0.25, 0.52, 0.12, poleX, 3.58, poleZ + 0.12, '#b4bbaa');
panel(0.18, 0.38, poleX, 3.58, poleZ + 0.19, textTex([['木', 59, 77], ['漏', 59, 150], ['町', 59, 220]], '#d6dcc4', '#577c71', 256, 288));
// A secondary pole on the back left allows true catenary-like wiring, no off-base objects.
cyl(0.065, 5.50, -5.51, 3.24, -5.30, '#657684');
box(0.75, 0.065, 0.07, -5.51, 5.89, -5.30, '#8b9e9c');
for (let k = 0; k < 3; k++) {
  curve([[poleX - 0.48 + k * 0.46, 6.5, poleZ], [0.2, 5.55 - k * 0.07, -5.10], [-3.4, 5.63 - k * 0.08, -5.21], [-5.51 + (k - 1) * 0.27, 5.93, -5.30]], 0.015, '#172636');
}
curve([[poleX + .53, 5.98, poleZ], [5.47, 5.23, -0.3], [4.84, 4.90, 3.86]], 0.012, '#243545');
// Traffic signal at the far end of the side road, never a dominant light.
cyl(0.043, 3.45, 5.31, 2.1, -2.86, '#677e89');
box(0.28, 0.82, 0.25, 5.31, 3.75, -2.86, '#344b57');
const traffic = [];
for (const [i, color] of ['#dc756d', '#d8b872', '#74b9a0'].entries()) {
  const y = 4.01 - i * 0.25;
  cyl(0.085, 0.10, 5.31, y, -2.694, '#243c46').rotation.x = Math.PI / 2;
  const lens = sphere(0.059, 5.31, y, -2.632, glow(color, i === 0 ? 1.2 : 0.03), scene, [1, 1, .3]); traffic.push(lens);
  box(0.22, 0.03, 0.18, 5.31, y + 0.09, -2.69, '#38525e');
}
const trafficLight = pointLight('#d56c6c', 1.2, 5.30, 3.84, -2.4, 3.5);

// Soft pools of reflected light with ragged edges lie on top of the physical reflection.
const poolTex = texture((c, w, h) => {
  const gradient = c.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
  gradient.addColorStop(0, 'rgba(255,255,255,.45)'); gradient.addColorStop(.42, 'rgba(255,255,255,.13)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gradient; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 70; k++) { c.fillStyle = `rgba(0,0,0,${.15+(k%4)*.08})`; c.fillRect(0, k*8, w, 1+(k%3)); }
}, 512, 512);
const pools = [];
for (const [x, z, w, d, color, opacity] of [[-0.9, 3.02, 6.2, 2.7, '#deb684', .24], [-4.7, 2.61, 1.5, 2.9, '#6ab7aa', .33], [4.1, 3.85, 2.2, 3.6, '#efc28b', .2], [3.64, -1.3, 2.1, 5.1, '#8fbfa8', .17], [5.2, -2.2, .7, 1.9, '#b56c73', .11]]) {
  const material = new THREE.MeshBasicMaterial({ map: poolTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  pools.push(floorPlane(w, d, x, z, material, 0.375));
}
// Irregular puddles on the raised sidewalk, quiet bluish highlights.
const puddleMat = new THREE.MeshBasicMaterial({ color: '#9ab9c4', transparent: true, opacity: .09, depthWrite: false });
for (const [x, z, rx, rz] of [[-2.2,1.9,.6,.17],[2.81,.7,.15,.37],[-5.3,-1.5,.26,.56],[-4.8,-3.4,.40,.24],[-.4,1.7,.5,.12],[2.8,-4.9,.2,.47]]) {
  const shape = new THREE.Shape();
  for (let k=0;k<=18;k++) { const a=k/18*Math.PI*2, r=1+Math.sin(k*2.9)*.12; if(k===0)shape.moveTo(Math.cos(a)*rx*r,Math.sin(a)*rz*r); else shape.lineTo(Math.cos(a)*rx*r,Math.sin(a)*rz*r); }
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), puddleMat); mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.538,z);scene.add(mesh);
}

// Rain remains bounded by the model instead of filling the viewer with visual noise.
const rainCount = 1450;
const rainPositions = new Float32Array(rainCount * 6);
const rainColors = new Float32Array(rainCount * 6);
const rainData = [];
function surfaceAt(x, z) {
  if (x > -4.31 && x < 2.47 && z > -4.07 && z < .89) return 3.99;
  if (x > -4.40 && x < 2.48 && z > .88 && z < 1.67) return 3.11;
  if (x < 3.25 && z < 2.52) return .54;
  return .38;
}
for (let i = 0; i < rainCount; i++) {
  const x = (Math.random()-.5)*11.7, z=(Math.random()-.5)*11.7;
  rainData.push({ x, z, y: .6+Math.random()*7.1, speed: 4.5+Math.random()*3.0, len: .08+Math.random()*.17, ground: surfaceAt(x,z) });
}
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));rainGeo.setAttribute('color',new THREE.BufferAttribute(rainColors,3));
const rain = new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#abc5df',vertexColors:true,transparent:true,opacity:.23,depthWrite:false,blending:THREE.AdditiveBlending}));
rain.frustumCulled=false;scene.add(rain); rain.userData.excludeFromExport = true;

// Independent falling drops under the awning, and animated rings on the wet street.
const drips = [];
const dripMaterial = new THREE.MeshBasicMaterial({color:'#c8dce0',transparent:true,opacity:.5});
for (let i=0;i<22;i++) {
  const drop=sphere(.012,-4.25+i*.309,1.5,1.65,dripMaterial,scene,[.6,2.7,.6]);
  drips.push({mesh:drop,phase:Math.random(),speed:.8+Math.random()*.8});
}
const ripples = [];
const ringGeo = new THREE.RingGeometry(.89,1,40);
for (let i=0;i<55;i++) {
  let x=(Math.random()-.5)*11.4,z=(Math.random()-.5)*11.4;
  if (surfaceAt(x,z)>1) z=2.9+Math.random()*2.8;
  const ring = new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:'#aac8d1',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.set(x,surfaceAt(x,z)+.008,z);scene.add(ring);
  ripples.push({mesh:ring,phase:Math.random(),period:1.3+Math.random()*1.6,size:.10+Math.random()*.16});
}
// Tiny glass rivulets catch the light while the interior remains clear.
const rivulets = [];
const streakMaterial = new THREE.LineBasicMaterial({color:'#d1e7dc',transparent:true,opacity:.31,depthWrite:false});
for (let i=0;i<34;i++) {
  const x=-4.02+Math.random()*3.56, y=1+Math.random()*1.85;
  const length=.07+Math.random()*.18;
  const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(.009,-length*.55,0),new THREE.Vector3(.004,-length,0)]);
  const line=new THREE.Line(geo,streakMaterial);line.position.set(x,y,.727);scene.add(line);
  const bead=sphere(.013,x,y,.733,new THREE.MeshBasicMaterial({color:'#cee7d6',transparent:true,opacity:.35}),scene,[.5,1.35,.3]);
  rivulets.push({line,bead,start:y,speed:.045+Math.random()*.085});
}
// Occasional drops also slide down the large east-facing glass.
for(let i=0;i<18;i++){
  const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.10,.008)]);
  const line=new THREE.Line(geo,streakMaterial);line.position.set(2.285,1.65+Math.random()*1.3,-3.7+Math.random()*4.1);scene.add(line);
  rivulets.push({line,start:line.position.y,speed:.04+Math.random()*.07,side:true});
}

// Grounding shadow is part of the presentation, not an additional scene island.
const shadowTex = texture((c,w,h)=>{
  const g=c.createRadialGradient(w/2,h/2,w*.12,w/2,h/2,w*.48);g.addColorStop(0,'rgba(0,0,0,.56)');g.addColorStop(.58,'rgba(0,0,0,.28)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,w,h);
},512,512);
const groundShadow = floorPlane(20,20,0,0,new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,opacity:.65,depthWrite:false}),-.267);
groundShadow.userData.excludeFromExport = true;
const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshBasicMaterial({color:'#18223a',fog:false}));
backdrop.rotation.x=-Math.PI/2;backdrop.position.y=-.29;backdrop.receiveShadow=false;backdrop.userData.excludeFromExport=true;scene.add(backdrop);

// A restrained coral corner lightbox complements the sea-glass shop fascia.
const cornerLightbox = new THREE.Group(); cornerLightbox.position.set(2.64, 0, -.07); cornerLightbox.rotation.y = Math.PI / 2; scene.add(cornerLightbox);
box(.13, .06, .27, 0, 3.15, -.05, '#45616b', cornerLightbox);
box(.53, 1.04, .14, 0, 2.69, 0, '#625764', cornerLightbox);
const coralSign = textTex([['24', 103, 105], ['OPEN', 49, 191], ['こ', 59, 282], ['も', 59, 349], ['れ', 59, 416], ['び', 59, 483]], '#ba7885', '#ffedca', 256, 544);
panel(.45, .96, 0, 2.70, .08, coralSign, cornerLightbox, .85);
panel(.45, .96, 0, 2.70, -.08, coralSign, cornerLightbox, .85, Math.PI);
pointLight('#de93ac', 2.4, 2.93, 2.7, .2, 3.3);
pools.push(floorPlane(1.12, 3.0, 3.40, 1.05, new THREE.MeshBasicMaterial({ map: poolTex, color: '#d796b0', transparent: true, opacity: .17, depthWrite: false, blending: THREE.AdditiveBlending }), .378));
// Small glowing window badge and payment decals are physical shop details.
const badge = textTex([['24h', 67, 77], ['OPEN', 41, 137]], '#497f78', '#eae5b8', 256, 176);
panel(.45, .31, -2.57, 2.62, .732, badge, scene, .8);
const pay = textTex([['各種カード', 35, 57], ['●  ▬  ◇', 40, 113]], '#e0dbbd', '#628c83', 384, 160);
panel(.24, .11, 1.85, 2.27, .76, pay);
// Metal roof seams and water catches remain clean and subtle.
for (let x = -3.8; x < 2.1; x += .48) box(.014, .007, 4.40, x, 3.906, -1.60, '#586d77', scene, false);

// Procedural weather, additive light pools and viewer backdrop are web-only effects.
for (const object of [...pools, ...ripples.map(r=>r.mesh), ...drips.map(d=>d.mesh),
  ...rivulets.flatMap(r=>[r.line,r.bead].filter(Boolean))]) object.userData.excludeFromExport = true;

// Batch the handcrafted static pieces by material. Hundreds of tiny products and
// wire spokes stay detailed without thousands of per-frame draw calls.
const dynamic = new Set([
  wetStreet, mainSign, rain, ...traffic, ...pools,
  ...sliding.map(s => s.door), ...drips.map(d => d.mesh),
  ...ripples.map(r => r.mesh), ...rivulets.flatMap(d => [d.line, d.bead].filter(Boolean)),
]);
scene.updateMatrixWorld(true);
const batches = new Map(), removable = [];
scene.traverse(object => {
  if (!(object.isMesh || object.isLineSegments)) return;
  let ancestor = object;
  while (ancestor) { if (dynamic.has(ancestor)) return; ancestor = ancestor.parent; }
  if (Array.isArray(object.material) || object.isInstancedMesh) return;
  const key = `${object.userData.excludeFromExport ? "excluded" : "included"}:${object.isMesh ? 'mesh' : 'lines'}:${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
  if (!batches.has(key)) batches.set(key, { material: object.material, mesh: object.isMesh, cast: object.castShadow, receive: object.receiveShadow, exclude: !!object.userData.excludeFromExport, geometries: [] });
  let geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
  if (geometry.index) geometry = geometry.toNonIndexed();
  if (object.isMesh) {
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
    for (const attr of Object.keys(geometry.attributes)) if (!['position','normal','uv'].includes(attr)) geometry.deleteAttribute(attr);
  }
  batches.get(key).geometries.push(geometry);
  removable.push(object);
});
for (const batch of batches.values()) {
  const geometry = mergeGeometries(batch.geometries, false);
  if (!geometry) continue;
  const object = batch.mesh ? new THREE.Mesh(geometry, batch.material) : new THREE.LineSegments(geometry, batch.material);
  object.userData.excludeFromExport = batch.exclude; object.castShadow = batch.cast; object.receiveShadow = batch.receive; scene.add(object);
  batch.geometries.forEach(g => g.dispose());
}
removable.forEach(object => object.removeFromParent());

let last=performance.now(), elapsed=0;
function animate(now) {
  if (!window.__pauseRender) requestAnimationFrame(animate);
  const dt=Math.min((now-last)/1000,.05);last=now;elapsed+=dt;
  controls.update();
  // Keep the target close to the collectible even after touch panning.
  controls.target.x=THREE.MathUtils.clamp(controls.target.x,-5,5);
  controls.target.y=THREE.MathUtils.clamp(controls.target.y,.3,4.5);
  controls.target.z=THREE.MathUtils.clamp(controls.target.z,-5,5);
  wetStreet.material.uniforms.time.value=elapsed;
  for(let i=0;i<rainCount;i++){
    const d=rainData[i];d.y-=dt*d.speed;
    if(d.y<d.ground){d.y=6.4+Math.random()*1.3;}
    const n=i*6;rainPositions[n]=d.x;rainPositions[n+1]=d.y;rainPositions[n+2]=d.z;
    rainPositions[n+3]=d.x+.025;rainPositions[n+4]=d.y+d.len;rainPositions[n+5]=d.z-.015;
    const fade=(1-THREE.MathUtils.smoothstep(d.y,4.6,7.4))*.85;
    for(let j=0;j<6;j++)rainColors[n+j]=fade;
  }
  rainGeo.attributes.position.needsUpdate=true;rainGeo.attributes.color.needsUpdate=true;
  for(const d of drips){const phase=(elapsed*d.speed+d.phase)%1;d.mesh.position.y=2.98-2.4*phase*phase;d.mesh.visible=phase>.15;}
  for(const r of ripples){const p=(elapsed/r.period+r.phase)%1;const size=.018+p*r.size;r.mesh.scale.setScalar(size);r.mesh.material.opacity=Math.sin(p*Math.PI)*.17*(1-p);}
  for(const d of rivulets){const bottom=d.side?1.5:.83;const span=2.95-bottom;const y=bottom+((d.start-bottom-elapsed*d.speed)%span+span)%span;d.line.position.y=y;if(d.bead)d.bead.position.y=y;}
  // Automatic doors open briefly every eighteen seconds with a gentle ease.
  const cycle=elapsed%18;
  let opened=0;
  if(cycle>8&&cycle<9.5)opened=THREE.MathUtils.smoothstep(cycle,8,9.5);
  else if(cycle>=9.5&&cycle<12)opened=1;
  else if(cycle>=12&&cycle<13.5)opened=1-THREE.MathUtils.smoothstep(cycle,12,13.5);
  sliding[0].door.position.x=sliding[0].x-opened*.99;
  sliding[1].door.position.x=sliding[1].x+opened*.60;
  // Low-amplitude sign flicker: never a strobe.
  const flicker=1+Math.sin(elapsed*2.6)*.014+Math.sin(elapsed*9.7)*.008;
  mainSign.material.emissiveIntensity=.45*flicker;
  entryLight.intensity=4*flicker;
  const signalCycle=elapsed%31;const active=signalCycle<17?0:signalCycle<29?2:1;
  traffic.forEach((mesh,i)=>{mesh.material.emissiveIntensity=i===active?1.2:.025;});
  trafficLight.color.set(active===0?'#d56c6c':active===2?'#73b69c':'#d8b872');
  pools[4].material.color.copy(trafficLight.color);
  pools.forEach((p,i)=>{if(i<4)p.material.opacity=[.24,.33,.20,.17][i]*(1+Math.sin(elapsed*1.1+i)*.025);});
  composer.render();
}
requestAnimationFrame(animate);

function resize(){
  camera.aspect=innerWidth/innerHeight;camera.fov=camera.aspect<.8?50:34;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
}
window.addEventListener('resize',resize);
// On narrow screens the initial framing backs off, while gestures still have the full range.
if(innerWidth/innerHeight<.8){camera.fov=50;camera.updateProjectionMatrix();camera.position.multiplyScalar(1.35);controls.maxDistance=44;controls.update();}

document.addEventListener('visibilitychange',()=>{last=performance.now();});
// Export is accessible to tooling without adding any on-screen controls.
window.exportConvenienceStore = async () => {
  const { exportModel } = await import('./export-model.js');
  return exportModel(scene);
};
// Test and diagnostic readout is not rendered as UI.
window.__diorama = { scene, camera, controls, renderer, sliding, rain, ripples };
