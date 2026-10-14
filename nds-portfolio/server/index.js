// NDS-Lite style portfolio — server (zero-framework Node http + better-sqlite3)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------------------------------------------------------------- secrets
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const f = path.join(DATA_DIR, '.jwt_secret');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  const s = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
}
const JWT_SECRET = loadSecret();

// ---------------------------------------------------------------- db
const db = new Database(path.join(DATA_DIR, 'portfolio.db'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, pass TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS works(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, category TEXT DEFAULT '', tags TEXT DEFAULT '[]', year TEXT DEFAULT '',
  cover TEXT DEFAULT '', images TEXT DEFAULT '[]', summary TEXT DEFAULT '', description TEXT DEFAULT '',
  link TEXT DEFAULT '', sort INTEGER DEFAULT 0, published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
`);

function hashPass(p) { const salt = crypto.randomBytes(16); const h = crypto.scryptSync(p, salt, 64); return salt.toString('hex') + ':' + h.toString('hex'); }
function checkPass(p, stored) { const [s, h] = stored.split(':'); const hh = crypto.scryptSync(p, Buffer.from(s, 'hex'), 64); return crypto.timingSafeEqual(hh, Buffer.from(h, 'hex')); }

// first run: admin account
if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
  const user = process.env.ADMIN_USER || 'admin';
  let pass = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!pass) { pass = crypto.randomBytes(9).toString('base64url'); generated = true; }
  db.prepare('INSERT INTO users(username,pass) VALUES(?,?)').run(user, hashPass(pass));
  console.log('\n==============================================');
  console.log(' 管理员账号已创建 / admin account created');
  console.log(`   用户名: ${user}`);
  console.log(`   密码  : ${generated ? pass + '   (随机生成，请登录后修改)' : '(来自 ADMIN_PASSWORD)'}`);
  console.log('==============================================\n');
  if (generated) fs.writeFileSync(path.join(DATA_DIR, 'INITIAL_ADMIN_PASSWORD.txt'), `${user}\n${pass}\n`, { mode: 0o600 });
}

// seed demo content
if (!db.prepare("SELECT 1 FROM settings WHERE key='profile'").get()) {
  require('./seed')(db, UPLOAD_DIR);
}

const getProfile = () => JSON.parse(db.prepare("SELECT value FROM settings WHERE key='profile'").get().value);
const rowToWork = r => r && ({ ...r, tags: JSON.parse(r.tags || '[]'), images: JSON.parse(r.images || '[]'), published: !!r.published });

// ---------------------------------------------------------------- jwt
const b64u = b => Buffer.from(b).toString('base64url');
function signJWT(payload, ttlSec = 7 * 86400) {
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64u(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec }));
  const s = crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + p).digest('base64url');
  return `${h}.${p}.${s}`;
}
function verifyJWT(tok) {
  if (!tok) return null;
  const [h, p, s] = tok.split('.');
  if (!h || !p || !s) return null;
  const exp = crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + p).digest('base64url');
  if (exp.length !== s.length || !crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(s))) return null;
  try { const pl = JSON.parse(Buffer.from(p, 'base64url').toString()); if (pl.exp < Date.now() / 1000) return null; return pl; } catch { return null; }
}

// ---------------------------------------------------------------- helpers
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' };
function send(res, code, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}
function readBody(req, limit = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(Object.assign(new Error('payload too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { if (!chunks.length) return resolve({}); try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { reject(Object.assign(new Error('invalid json'), { code: 400 })); } });
    req.on('error', reject);
  });
}
function serveFile(res, file, cache = 'no-cache') {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(file).pipe(res);
  });
}
function safeJoin(base, rel) { const p = path.resolve(base, '.' + path.sep + rel); return p.startsWith(base + path.sep) || p === base ? p : null; }
const str = (v, max = 5000) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
const strArr = (v, max = 50) => (Array.isArray(v) ? v : []).slice(0, max).map(x => str(x, 500)).filter(Boolean);

// login rate limit
const attempts = new Map();
function limited(ip) { const now = Date.now(); const a = (attempts.get(ip) || []).filter(t => now - t < 10 * 60e3); attempts.set(ip, a); return a.length >= 8; }

function workFromBody(b) {
  return { title: str(b.title, 200).trim(), category: str(b.category, 100), tags: JSON.stringify(strArr(b.tags, 20)), year: str(b.year, 20),
    cover: str(b.cover, 500), images: JSON.stringify(strArr(b.images, 30)), summary: str(b.summary, 300), description: str(b.description, 20000),
    link: /^https?:\/\//i.test(str(b.link)) ? str(b.link, 500) : '', published: b.published === false ? 0 : 1 };
}
function profileFromBody(b, old) {
  const links = (Array.isArray(b.links) ? b.links : []).slice(0, 12).map(l => ({ label: str(l.label, 40), url: str(l.url, 300), icon: str(l.icon, 10) })).filter(l => l.label && l.url);
  const experience = (Array.isArray(b.experience) ? b.experience : []).slice(0, 30).map(e => ({ period: str(e.period, 40), role: str(e.role, 80), org: str(e.org, 80), desc: str(e.desc, 1000) })).filter(e => e.role || e.org);
  return { ...old, name: str(b.name, 40) || old.name, title: str(b.title, 80), tagline: str(b.tagline, 120), bio: str(b.bio, 5000), avatar: str(b.avatar, 500),
    email: str(b.email, 120), location: str(b.location, 60), skills: strArr(b.skills, 30), links, experience };
}

// ---------------------------------------------------------------- routes
async function api(req, res, url) {
  const m = req.method, p = url.pathname;
  // ---- public
  if (m === 'GET' && p === '/api/profile') return send(res, 200, getProfile());
  if (m === 'GET' && p === '/api/works') return send(res, 200, db.prepare('SELECT * FROM works WHERE published=1 ORDER BY sort ASC, id DESC').all().map(rowToWork));
  let mm;
  if (m === 'GET' && (mm = p.match(/^\/api\/works\/(\d+)$/))) {
    const w = rowToWork(db.prepare('SELECT * FROM works WHERE id=? AND published=1').get(+mm[1]));
    return w ? send(res, 200, w) : send(res, 404, { error: 'not found' });
  }
  if (m === 'POST' && p === '/api/auth/login') {
    const ip = req.socket.remoteAddress;
    if (limited(ip)) return send(res, 429, { error: '尝试次数过多，请 10 分钟后再试' });
    const b = await readBody(req, 10e3);
    const u = db.prepare('SELECT * FROM users WHERE username=?').get(str(b.username, 60));
    if (!u || !checkPass(str(b.password, 200), u.pass)) { attempts.get(ip).push(Date.now()); return send(res, 401, { error: '用户名或密码错误' }); }
    return send(res, 200, { token: signJWT({ uid: u.id, u: u.username }), username: u.username });
  }
  // ---- admin
  if (p.startsWith('/api/admin/')) {
    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user = verifyJWT(auth);
    if (!user) return send(res, 401, { error: 'unauthorized' });
    if (m === 'GET' && p === '/api/admin/me') return send(res, 200, { username: user.u });
    if (m === 'GET' && p === '/api/admin/works') return send(res, 200, db.prepare('SELECT * FROM works ORDER BY sort ASC, id DESC').all().map(rowToWork));
    if (m === 'POST' && p === '/api/admin/works') {
      const w = workFromBody(await readBody(req));
      if (!w.title) return send(res, 400, { error: '标题不能为空' });
      const minSort = db.prepare('SELECT COALESCE(MIN(sort),0) s FROM works').get().s;
      const r = db.prepare('INSERT INTO works(title,category,tags,year,cover,images,summary,description,link,published,sort) VALUES(@title,@category,@tags,@year,@cover,@images,@summary,@description,@link,@published,@sort)').run({ ...w, sort: minSort - 1 });
      return send(res, 201, rowToWork(db.prepare('SELECT * FROM works WHERE id=?').get(r.lastInsertRowid)));
    }
    if ((mm = p.match(/^\/api\/admin\/works\/(\d+)$/))) {
      const id = +mm[1];
      if (!db.prepare('SELECT 1 FROM works WHERE id=?').get(id)) return send(res, 404, { error: 'not found' });
      if (m === 'PUT') {
        const w = workFromBody(await readBody(req));
        if (!w.title) return send(res, 400, { error: '标题不能为空' });
        db.prepare("UPDATE works SET title=@title,category=@category,tags=@tags,year=@year,cover=@cover,images=@images,summary=@summary,description=@description,link=@link,published=@published,updated_at=datetime('now') WHERE id=@id").run({ ...w, id });
        return send(res, 200, rowToWork(db.prepare('SELECT * FROM works WHERE id=?').get(id)));
      }
      if (m === 'PATCH') {
        const b = await readBody(req);
        if (typeof b.published === 'boolean') db.prepare('UPDATE works SET published=? WHERE id=?').run(b.published ? 1 : 0, id);
        return send(res, 200, rowToWork(db.prepare('SELECT * FROM works WHERE id=?').get(id)));
      }
      if (m === 'DELETE') { db.prepare('DELETE FROM works WHERE id=?').run(id); return send(res, 200, { ok: true }); }
    }
    if (m === 'PUT' && p === '/api/admin/works-order') {
      const ids = (await readBody(req)).ids;
      if (!Array.isArray(ids)) return send(res, 400, { error: 'ids required' });
      const st = db.prepare('UPDATE works SET sort=? WHERE id=?');
      db.transaction(() => ids.forEach((id, i) => st.run(i, +id)))();
      return send(res, 200, { ok: true });
    }
    if (m === 'PUT' && p === '/api/admin/profile') {
      const np = profileFromBody(await readBody(req), getProfile());
      db.prepare("UPDATE settings SET value=? WHERE key='profile'").run(JSON.stringify(np));
      return send(res, 200, np);
    }
    if (m === 'POST' && p === '/api/admin/upload') {
      const b = await readBody(req);
      const mt = str(b.dataUrl, 15e6).match(/^data:image\/(webp|png|jpeg|gif);base64,([A-Za-z0-9+/=]+)$/);
      if (!mt) return send(res, 400, { error: '仅支持 webp / png / jpeg / gif 图片' });
      const buf = Buffer.from(mt[2], 'base64');
      if (buf.length > 8 * 1024 * 1024) return send(res, 413, { error: '图片不能超过 8MB' });
      const ext = mt[1] === 'jpeg' ? 'jpg' : mt[1];
      const name = `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
      return send(res, 201, { url: '/uploads/' + name, size: buf.length });
    }
    if (m === 'POST' && p === '/api/admin/password') {
      const b = await readBody(req, 10e3);
      const u = db.prepare('SELECT * FROM users WHERE id=?').get(user.uid);
      if (!u || !checkPass(str(b.old), u.pass)) return send(res, 400, { error: '原密码不正确' });
      if (str(b.new).length < 8) return send(res, 400, { error: '新密码至少 8 位' });
      db.prepare('UPDATE users SET pass=? WHERE id=?').run(hashPass(str(b.new)), u.id);
      try { fs.unlinkSync(path.join(DATA_DIR, 'INITIAL_ADMIN_PASSWORD.txt')); } catch {}
      return send(res, 200, { ok: true });
    }
  }
  return send(res, 404, { error: 'not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = decodeURIComponent(url.pathname);
    if (p.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed');
    if (p.startsWith('/uploads/')) { const f = safeJoin(UPLOAD_DIR, p.slice(9)); return f ? serveFile(res, f, 'public, max-age=31536000, immutable') : send(res, 404, 'not found'); }
    if (p === '/admin' || p === '/admin/') return serveFile(res, path.join(ROOT, 'admin', 'index.html'));
    if (p.startsWith('/admin/')) { const f = safeJoin(path.join(ROOT, 'admin'), p.slice(7)); return f ? serveFile(res, f) : send(res, 404, 'not found'); }
    const f = safeJoin(path.join(ROOT, 'web'), p === '/' ? 'index.html' : p.slice(1));
    return f ? serveFile(res, f) : send(res, 404, 'not found');
  } catch (e) {
    if (!res.headersSent) send(res, e.code >= 400 && e.code < 600 ? e.code : 500, { error: e.message || 'server error' });
    if (!(e.code >= 400 && e.code < 500)) console.error(e);
  }
});
server.listen(PORT, HOST, () => console.log(`NDS-Lite portfolio running → http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}   (admin: /admin)`));
