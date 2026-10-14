/* Portfolio Lite — admin panel. Zero dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cssUrl = (u) => (u ? `url('${encodeURI(String(u)).replace(/'/g, '%27')}')` : 'none');
  let token = localStorage.getItem('pl_token') || '';
  let works = [], editing = null, cover = '', gallery = [], profile = {}, avatarUrl = '';

  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }

  async function api(method, url, body) {
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined });
    let data = null; try { data = await r.json(); } catch (e) { /* empty */ }
    if (r.status === 401 && !url.endsWith('/login')) { logout(); throw new Error('登录已过期，请重新登录'); }
    if (!r.ok) throw new Error((data && data.error) || `请求失败 (${r.status})`);
    return data;
  }

  /* ------------------------------------------------------------ auth */
  function showLogin() { $('#login').hidden = false; $('#app').hidden = true; setTimeout(() => $('#loginForm [name=password]').focus(), 50); }
  function logout() { token = ''; localStorage.removeItem('pl_token'); showLogin(); }
  $('#logout').onclick = logout;
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target); $('#loginErr').textContent = '';
    try {
      const d = await api('POST', '/api/auth/login', { username: f.get('username'), password: f.get('password') });
      token = d.token; localStorage.setItem('pl_token', token); e.target.reset(); start();
    } catch (err) { $('#loginErr').textContent = err.message; }
  };
  async function start() {
    try { const me = await api('GET', '/api/admin/me'); $('#who').textContent = me.username; } catch (e) { return showLogin(); }
    $('#login').hidden = true; $('#app').hidden = false;
    tab('works'); loadWorks(); loadProfile();
  }

  /* ------------------------------------------------------------ tabs */
  function tab(name) {
    $$('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== name));
    $$('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === name || (name === 'edit' && b.dataset.tab === 'works')));
    scrollTo(0, 0);
  }
  $$('[data-tab]').forEach((b) => (b.onclick = () => tab(b.dataset.tab)));

  /* ------------------------------------------------------------ images: compress to webp */
  function loadImg(file) {
    return new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => rej(new Error('无法读取图片')); i.src = u; });
  }
  async function compress(file, max = 1600, q = 0.85) {
    if (file.type === 'image/gif') return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
    const img = await loadImg(file);
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    let d = c.toDataURL('image/webp', q);
    if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/jpeg', q); // Safari < 14 fallback
    return d;
  }
  async function upload(file, max) {
    const dataUrl = await compress(file, max);
    return (await api('POST', '/api/admin/upload', { dataUrl })).url;
  }

  /* ------------------------------------------------------------ works list */
  async function loadWorks() {
    works = await api('GET', '/api/admin/works');
    $('#wCount').textContent = `共 ${works.length} 件 · 已发布 ${works.filter((w) => w.published).length}`;
    $('#wList').innerHTML = works.length ? works.map((w, i) => `
      <div class="witem ${w.published ? '' : 'draft'}" data-id="${w.id}">
        <div class="th" style="background-image:${cssUrl(w.cover)}"></div>
        <div class="meta"><b>${esc(w.title)}</b><span class="pill ${w.published ? '' : 'off'}">${w.published ? '已发布' : '草稿'}</span>${w.category ? `<span class="pill">${esc(w.category)}</span>` : ''}<span class="muted small">${esc(w.year || '')}</span>
          <div class="muted small">${esc(w.summary || '')}</div></div>
        <div class="ops">
          <button class="sw ${w.published ? 'on' : ''}" data-op="pub" title="发布 / 下架" aria-label="发布开关"></button>
          <button class="btn ghost sm" data-op="up" ${i === 0 ? 'disabled' : ''} aria-label="上移">↑</button>
          <button class="btn ghost sm" data-op="down" ${i === works.length - 1 ? 'disabled' : ''} aria-label="下移">↓</button>
          <button class="btn ghost sm" data-op="edit">编辑</button>
          <button class="btn danger sm" data-op="del">删除</button>
        </div>
      </div>`).join('') : '<div class="card muted">还没有作品，点击右上角「新建作品」。</div>';
  }
  $('#wList').onclick = async (e) => {
    const b = e.target.closest('[data-op]'); if (!b) return;
    const id = +b.closest('.witem').dataset.id, w = works.find((x) => x.id === id), i = works.indexOf(w);
    try {
      if (b.dataset.op === 'edit') return openEditor(w);
      if (b.dataset.op === 'pub') { await api('PATCH', '/api/admin/works/' + id, { published: !w.published }); toast(w.published ? '已下架' : '已发布'); }
      if (b.dataset.op === 'del') { if (!confirm(`确定删除「${w.title}」？此操作不可撤销。`)) return; await api('DELETE', '/api/admin/works/' + id); toast('已删除'); }
      if (b.dataset.op === 'up' || b.dataset.op === 'down') {
        const j = i + (b.dataset.op === 'up' ? -1 : 1); if (j < 0 || j >= works.length) return;
        const ids = works.map((x) => x.id); [ids[i], ids[j]] = [ids[j], ids[i]];
        await api('PUT', '/api/admin/works-order', { ids });
      }
      await loadWorks();
    } catch (err) { toast(err.message); }
  };

  /* ------------------------------------------------------------ work editor */
  const wf = $('#wForm'), W = wf.elements;
  function openEditor(w) {
    editing = w || null;
    $('#eTitle').textContent = w ? '编辑作品' : '新建作品';
    wf.reset(); $('#eMsg').textContent = '';
    W.title.value = w?.title || ''; W.category.value = w?.category || ''; W.year.value = w?.year || String(new Date().getFullYear());
    W.tags.value = (w?.tags || []).join(', '); W.summary.value = w?.summary || ''; W.description.value = w?.description || '';
    W.link.value = w?.link || ''; W.published.checked = w ? !!w.published : true;
    cover = w?.cover || ''; gallery = [...(w?.images || [])];
    drawCover(); drawGal(); tab('edit'); W.title.focus();
  }
  $('#newWork').onclick = () => openEditor(null);
  $('#eCancel').onclick = () => tab('works');
  function drawCover() { $('#coverPrev').style.backgroundImage = cssUrl(cover); }
  $('#coverClear').onclick = () => { cover = ''; drawCover(); };
  $('#coverFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return; const box = $('#coverPrev'); box.classList.add('uploading');
    try { cover = await upload(f); drawCover(); } catch (err) { toast(err.message); } finally { box.classList.remove('uploading'); e.target.value = ''; }
  };
  let dragI = null;
  function drawGal() {
    $('#gal').innerHTML = gallery.map((u, i) => `<div class="gi" draggable="true" data-i="${i}" style="background-image:${cssUrl(u)}"><button type="button" data-rm="${i}" aria-label="移除">×</button></div>`).join('');
  }
  $('#gal').onclick = (e) => { const b = e.target.closest('[data-rm]'); if (b) { gallery.splice(+b.dataset.rm, 1); drawGal(); } };
  $('#gal').addEventListener('dragstart', (e) => { const g = e.target.closest('.gi'); if (g) { dragI = +g.dataset.i; g.classList.add('drag'); } });
  $('#gal').addEventListener('dragover', (e) => e.preventDefault());
  $('#gal').addEventListener('drop', (e) => {
    e.preventDefault(); const g = e.target.closest('.gi'); if (!g || dragI == null) return;
    const [m] = gallery.splice(dragI, 1); gallery.splice(+g.dataset.i, 0, m); dragI = null; drawGal();
  });
  $('#gal').addEventListener('dragend', () => { dragI = null; drawGal(); });
  $('#galFile').onchange = async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    for (const f of files) {
      const ph = document.createElement('div'); ph.className = 'gi uploading'; $('#gal').append(ph);
      try { gallery.push(await upload(f)); } catch (err) { toast(err.message); }
      drawGal();
    }
  };
  wf.onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      title: W.title.value.trim(), category: W.category.value.trim(), year: W.year.value.trim(),
      tags: W.tags.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean), summary: W.summary.value.trim(),
      description: W.description.value, link: W.link.value.trim(), cover: cover || gallery[0] || '', images: gallery, published: W.published.checked,
    };
    if (body.link && !/^https?:\/\//i.test(body.link)) { $('#eMsg').textContent = '链接需以 http:// 或 https:// 开头'; return; }
    $('#eSave').disabled = true;
    try {
      if (editing) await api('PUT', '/api/admin/works/' + editing.id, body); else await api('POST', '/api/admin/works', body);
      toast('已保存'); await loadWorks(); tab('works');
    } catch (err) { $('#eMsg').textContent = err.message; } finally { $('#eSave').disabled = false; }
  };

  /* ------------------------------------------------------------ profile */
  const pf = $('#pForm'), P = pf.elements;
  async function loadProfile() {
    profile = await (await fetch('/api/profile')).json();
    for (const k of ['name', 'title', 'tagline', 'bio', 'email', 'location']) P[k].value = profile[k] || '';
    P.skills.value = (profile.skills || []).join(', ');
    avatarUrl = profile.avatar || ''; $('#avaPrev').style.backgroundImage = cssUrl(avatarUrl);
    $('#links').innerHTML = ''; (profile.links || []).forEach(addLink);
    $('#exps').innerHTML = ''; (profile.experience || []).forEach(addExp);
  }
  const rowBtns = `<div class="x"><button type="button" class="icon-btn" data-mv="-1" aria-label="上移">↑</button><button type="button" class="icon-btn" data-mv="1" aria-label="下移">↓</button><button type="button" class="icon-btn" data-del aria-label="删除">×</button></div>`;
  function addLink(l = {}) {
    const d = document.createElement('div'); d.className = 'rw link';
    d.innerHTML = `<input data-k="icon" placeholder="图标" maxlength="4" value="${esc(l.icon || '◆')}"><input data-k="label" placeholder="名称，如 GitHub" value="${esc(l.label || '')}"><input data-k="url" placeholder="https:// 或 mailto:" value="${esc(l.url || '')}">${rowBtns}`;
    $('#links').append(d);
  }
  function addExp(x = {}) {
    const d = document.createElement('div'); d.className = 'rw exp';
    d.innerHTML = `<input data-k="period" placeholder="时间，如 2022 — 今" value="${esc(x.period || '')}"><input data-k="role" placeholder="职位 / 学位" value="${esc(x.role || '')}"><input data-k="org" placeholder="公司 / 学校" value="${esc(x.org || '')}">${rowBtns}<textarea data-k="desc" rows="2" placeholder="描述">${esc(x.desc || '')}</textarea>`;
    $('#exps').append(d);
  }
  $('#addLink').onclick = () => addLink();
  $('#addExp').onclick = () => addExp();
  pf.addEventListener('click', (e) => {
    const rw = e.target.closest('.rw'); if (!rw) return;
    if (e.target.closest('[data-del]')) rw.remove();
    const mv = e.target.closest('[data-mv]');
    if (mv) { if (mv.dataset.mv === '-1' && rw.previousElementSibling) rw.parentNode.insertBefore(rw, rw.previousElementSibling); else if (mv.dataset.mv === '1' && rw.nextElementSibling) rw.parentNode.insertBefore(rw.nextElementSibling, rw); }
  });
  pf.onsubmit = (e) => { e.preventDefault(); $('#pSave').click(); };
  const rowsData = (sel) => $$(sel + ' .rw').map((rw) => Object.fromEntries($$('[data-k]', rw).map((i) => [i.dataset.k, i.value.trim()])));
  $('#avaFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return; const box = $('#avaPrev'); box.classList.add('uploading');
    try { avatarUrl = await upload(f, 600); box.style.backgroundImage = cssUrl(avatarUrl); } catch (err) { toast(err.message); } finally { box.classList.remove('uploading'); e.target.value = ''; }
  };
  $('#avaClear').onclick = () => { avatarUrl = ''; $('#avaPrev').style.backgroundImage = 'none'; };
  $('#pSave').onclick = async () => {
    const body = {
      name: P.name.value.trim(), title: P.title.value.trim(), tagline: P.tagline.value.trim(), bio: P.bio.value,
      email: P.email.value.trim(), location: P.location.value.trim(), avatar: avatarUrl,
      skills: P.skills.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      links: rowsData('#links'), experience: rowsData('#exps'),
    };
    try { profile = await api('PUT', '/api/admin/profile', body); toast('资料已保存'); $('#pMsg').textContent = '已保存 ' + new Date().toLocaleTimeString(); }
    catch (err) { toast(err.message); }
  };

  /* ------------------------------------------------------------ password */
  $('#pwForm').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target.elements, form = e.target, msg = $('#pwMsg'); msg.style.color = '#d33';
    if (f.new.value !== f.new2.value) { msg.textContent = '两次输入的新密码不一致'; return; }
    try { await api('POST', '/api/admin/password', { old: f.old.value, new: f.new.value }); msg.style.color = '#2a9d5c'; msg.textContent = '密码已修改'; form.reset(); }
    catch (err) { msg.textContent = err.message; }
  };

  if (token) start(); else showLogin();
})();
