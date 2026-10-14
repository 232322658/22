/* Portfolio Lite — front-end. Zero dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cssUrl = (u) => (u ? `url('${encodeURI(String(u)).replace(/'/g, '%27')}')` : 'none');
  const safeHref = (u) => (/^(https?:|mailto:|tel:|\/)/i.test(u || '') ? u : '#');

  const lcdTop = $('#lcdTop'), lcdBot = $('#lcdBot'), device = $('#device');
  const S = {
    mode: 'boot', bootStep: 0, profile: null, works: [],
    home: 0, wsel: 0, about: 0, exp: 0, contact: 0, info: 0,
    sound: localStorage.getItem('pl_sound') !== '0', power: true, busy: false,
  };
  const PER = 6;

  /* ---------------------------------------------------------------- audio */
  let ac;
  function tone(f, d = 0.05, type = 'square', v = 0.035, at = 0) {
    if (!S.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* ignore */ }
  }
  const sfx = {
    move: () => tone(1320, 0.03),
    ok: () => { tone(988, 0.05); tone(1480, 0.08, 'square', 0.03, 0.05); },
    back: () => { tone(740, 0.05); tone(523, 0.07, 'square', 0.03, 0.05); },
    nope: () => tone(180, 0.08, 'sawtooth', 0.03),
    chime: () => [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.5, 'sine', 0.06, i * 0.09)),
  };

  /* ---------------------------------------------------------------- scale */
  function fit() {
    const compact = matchMedia('(max-width: 720px) and (orientation: portrait)').matches || window.innerWidth < 420;
    document.body.classList.toggle('compact', compact);
    for (const id of ['scrTop', 'scrBot']) {
      const el = document.getElementById(id);
      el.querySelector('.lcd').style.setProperty('--k', el.clientWidth / 256);
    }
  }
  addEventListener('resize', fit);

  /* ---------------------------------------------------------------- data */
  async function load() {
    try {
      const [p, w] = await Promise.all([fetch('/api/profile').then((r) => r.json()), fetch('/api/works').then((r) => r.json())]);
      S.profile = p || {}; S.works = Array.isArray(w) ? w : (w.works || []);
    } catch (e) {
      S.profile = { name: 'Portfolio' }; S.works = [];
    }
    const nm = S.profile.name || 'Portfolio';
    document.title = `${nm} · Portfolio Lite`;
    $('#lidName').textContent = nm.toUpperCase().slice(0, 14);
  }

  /* ---------------------------------------------------------------- helpers */
  const pad2 = (n) => String(n).padStart(2, '0');
  const WD = ['日', '一', '二', '三', '四', '五', '六'];
  function bar(title) {
    const d = new Date();
    return `<div class="bar"><span>${esc(title)}</span><span class="sp"></span><span>${d.getMonth() + 1}/${d.getDate()}</span><span data-clock>${pad2(d.getHours())}:${pad2(d.getMinutes())}</span><span class="batt"><i></i></span></div>`;
  }
  function foot(left, right) {
    return `<div class="foot"><span>${left || ''}</span><span>${right || ''}</span></div>`;
  }
  const keyB = `<span class="key" data-act="back"><b>B</b>返回</span>`;
  const keyA = (t) => `<span class="key" data-act="ok"><b>A</b>${t}</span>`;
  const heartSvg = `<svg class="heart" viewBox="0 0 11 10" shape-rendering="crispEdges"><path fill="#ff6f9a" d="M1 1h3v1h1v1h1V2h1V1h3v1h1v3h-1v1H9v1H8v1H7v1H4V8H3V7H2V6H1V5H0V2h1z"/><path fill="#fff" d="M2 2h1v1H2z"/></svg>`;
  function initials(n) { return esc((n || '?').trim().slice(0, 1).toUpperCase()); }
  function avatar(p) { return p.avatar ? `<div class="ava" style="background-image:${cssUrl(p.avatar)}"></div>` : `<div class="ava">${initials(p.name)}</div>`; }
  function scroller(id, html) {
    return `<div class="scroll" id="${id}"><div class="in">${html}</div></div><div class="sb"><i></i></div>`;
  }
  function updScroll(el, delta) {
    const box = el.querySelector('.scroll'); if (!box) return;
    const inn = box.firstElementChild, max = Math.max(0, inn.scrollHeight - box.clientHeight);
    const cur = Math.min(max, Math.max(0, (+box.dataset.y || 0) + delta));
    box.dataset.y = cur; inn.style.transform = `translateY(${-cur}px)`;
    const sb = el.querySelector('.sb i'), track = el.querySelector('.sb');
    if (sb && track) {
      const h = max ? Math.max(14, track.clientHeight * box.clientHeight / inn.scrollHeight) : track.clientHeight;
      sb.style.height = h + 'px'; sb.style.top = (max ? (track.clientHeight - h) * cur / max : 0) + 'px';
    }
    return cur;
  }

  /* ---------------------------------------------------------------- views */
  const MENU = [
    { k: 'works', ic: '▣', t: '作品集', s: 'WORKS' },
    { k: 'about', ic: '☺', t: '关于我', s: 'ABOUT' },
    { k: 'exp', ic: '✎', t: '经历', s: 'CAREER' },
    { k: 'contact', ic: '✉', t: '联系', s: 'CONTACT' },
    { k: 'sound', ic: '♪', t: '声音', s: 'SOUND' },
    { k: 'info', ic: 'i', t: '关于本站', s: 'INFO' },
  ];
  // spatial nav for the home menu: index -> {up,down,left,right}
  const HNAV = {
    0: { down: 1 }, 1: { up: 0, right: 2, down: 3 }, 2: { up: 0, left: 1, down: 5 },
    3: { up: 1, right: 4 }, 4: { up: 1, left: 3, right: 5 }, 5: { up: 2, left: 4 },
  };

  function clockSvg(d) {
    const h = (d.getHours() % 12) * 30 + d.getMinutes() * 0.5, m = d.getMinutes() * 6, s = d.getSeconds() * 6;
    let ticks = '';
    for (let i = 0; i < 12; i++) ticks += `<rect x="49" y="8" width="2" height="${i % 3 ? 4 : 7}" fill="${i % 3 ? '#ffb8cb' : '#ff6f9a'}" transform="rotate(${i * 30} 50 50)"/>`;
    return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#ffb8cb" stroke-width="3"/>${ticks}
      <line x1="50" y1="50" x2="50" y2="27" stroke="#4a3b42" stroke-width="4" stroke-linecap="round" transform="rotate(${h} 50 50)"/>
      <line x1="50" y1="50" x2="50" y2="16" stroke="#4a3b42" stroke-width="2.5" stroke-linecap="round" transform="rotate(${m} 50 50)"/>
      <line x1="50" y1="56" x2="50" y2="14" stroke="#ff6f9a" stroke-width="1.2" transform="rotate(${s} 50 50)"/>
      <circle cx="50" cy="50" r="3.5" fill="#ff6f9a"/></svg>`;
  }
  function calHtml(d) {
    const y = d.getFullYear(), mo = d.getMonth(), first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
    let cells = '', day = 1 - first;
    for (let r = 0; r < 6; r++) {
      cells += '<tr>';
      for (let c = 0; c < 7; c++, day++) {
        const ok = day >= 1 && day <= days;
        cells += `<td class="${c === 0 ? 'sun ' : ''}${ok && day === d.getDate() ? 'today' : ''}${ok ? '' : ' dim'}"><span>${ok ? day : ''}</span></td>`;
      }
      cells += '</tr>';
    }
    return `<div class="cal"><div class="mh"><span>${y} / ${mo + 1}月</span><span style="font-size:7px;color:#9b8790">星期${WD[d.getDay()]}</span></div>
      <table><tr>${WD.map((w) => `<th>${w}</th>`).join('')}</tr>${cells}</table></div>`;
  }

  const page = () => Math.floor(S.wsel / PER);
  const pages = () => Math.max(1, Math.ceil(S.works.length / PER));
  const contacts = () => {
    const p = S.profile || {}, list = [];
    if (p.email) list.push({ label: 'Email', url: 'mailto:' + p.email, icon: '✉', sub: p.email });
    for (const l of p.links || []) if (!(p.email && /^mailto:/i.test(l.url || ''))) list.push({ label: l.label, url: l.url, icon: l.icon || '◆', sub: (l.url || '').replace(/^(https?:\/\/|mailto:)/, '') });
    return list;
  };
  const INFO = [
    { t: '这是什么？', d: '一个以粉色掌机为外形的个人作品集。上屏展示，下屏可以点击，也可以用键盘操作。' },
    { t: '键盘操作', d: '方向键 = 十字键　X / Enter = A　Z / Esc = B　Q / W = L / R　Enter = START　Shift = SELECT' },
    { t: '非官方致敬', d: '本站外观为致敬掌机设计的原创绘制，非官方作品，与任何游戏机厂商无关，不含其商标。' },
    { t: '管理后台', d: '站长可在 /admin 登录后台管理作品与资料。', url: '/admin' },
  ];

  function renderTop() {
    const p = S.profile || {}, d = new Date();
    let h = '';
    switch (S.mode) {
      case 'boot':
        h = `<div class="boot-top">${heartSvg}<div class="logo">${esc(p.name || 'Portfolio')}</div><div class="sub">PORTFOLIO&nbsp;LITE</div></div>`;
        break;
      case 'home':
        h = bar(p.name || '') + `<div class="home-top grid-bg"><div class="clock" data-clockface>${clockSvg(d)}<div class="dig" data-clock>${pad2(d.getHours())}:${pad2(d.getMinutes())}</div><div class="date">${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}</div></div>${calHtml(d)}</div>
          <div class="welcome">${esc(p.tagline || '欢迎来到我的作品集')}</div>`;
        break;
      case 'works': {
        const w = S.works[S.wsel];
        h = bar('作品集') + (w ? `<div class="wprev"><div class="img" style="background-image:${cssUrl(w.cover)}"><div class="cap"><b>${esc(w.title)}</b><span>${esc([w.category, w.year].filter(Boolean).join(' · '))}</span></div></div>
          <div class="meta">${(w.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}<span style="flex:1"></span><span style="font-size:6.5px;color:#9b8790;white-space:nowrap">${esc(w.summary || '')}</span></div></div>` : `<div class="empty-msg">还没有作品</div>`);
        break;
      }
      case 'about':
        h = bar('关于我') + `<div class="prof grid-bg">${avatar(p)}<div class="info"><h2>${esc(p.name)}</h2><div class="t">${esc(p.title)}</div><div class="tl">${esc(p.tagline)}</div>${p.location ? `<div class="t">◎ ${esc(p.location)}</div>` : ''}</div>
          <div class="skills">${(p.skills || []).map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div></div>`;
        break;
      case 'exp': {
        const e = (p.experience || [])[S.exp];
        h = bar('经历') + (e ? `<div class="big-card grid-bg"><span class="per">${esc(e.period)}</span><h3>${esc(e.role)}</h3><div class="org">${esc(e.org)}</div><p>${esc(e.desc)}</p></div>` : `<div class="empty-msg">暂无经历</div>`);
        break;
      }
      case 'contact': {
        const c = contacts()[S.contact];
        h = bar('联系') + (c ? `<div class="big-card grid-bg" style="align-items:center;justify-content:center;text-align:center"><div class="glyph">${esc(c.icon)}</div><h3>${esc(c.label)}</h3><div class="org" style="word-break:break-all">${esc(c.sub)}</div><p style="color:#9b8790">按 A 或点击下屏打开</p></div>` : `<div class="empty-msg">暂无联系方式</div>`);
        break;
      }
      case 'info': {
        const it = INFO[S.info];
        h = bar('关于本站') + `<div class="big-card grid-bg"><div class="glyph">${heartSvg}</div><h3>${esc(it.t)}</h3><p>${esc(it.d)}</p></div>`;
        break;
      }
    }
    lcdTop.innerHTML = h;
  }

  function renderBot() {
    const p = S.profile || {};
    let h = '';
    switch (S.mode) {
      case 'boot':
        h = `<div class="warn" data-act="ok"><h3>⚠ 注意</h3><p>本站是一件非官方的致敬作品，</p><p>外观为原创绘制，与任何厂商无关。</p><p style="color:#9b8790">可使用鼠标、触摸或键盘（方向键 / X / Z）操作。</p><div class="tap">— 触碰下屏或按任意键继续 —</div></div>`;
        break;
      case 'home': {
        const first = S.works[0];
        const it = (i, cls = '') => {
          const m = MENU[i];
          const sub = m.k === 'sound' ? (S.sound ? 'ON' : 'OFF') : m.s;
          return `<div class="mi ${cls} ${S.home === i ? 'sel' : ''}" data-act="menu" data-i="${i}" role="button" aria-label="${m.t}"><div class="ic">${m.ic}</div><div class="tx"><b>${m.t}</b><small>${sub}</small></div>${i === 0 ? `<div class="cart" style="--cart:${first ? cssUrl(first.cover) : 'none'}"></div>` : ''}</div>`;
        };
        h = `<div class="grid-bg" style="position:absolute;inset:0"></div><div class="menu">${it(0, 'big')}${it(1)}${it(2)}<div class="small-row">${it(3)}${it(4)}${it(5)}</div></div>` + foot(`${S.works.length} 件作品`, keyA('打开'));
        break;
      }
      case 'works': {
        const pg = page(), start = pg * PER;
        let tiles = '';
        for (let i = start; i < start + PER; i++) {
          const w = S.works[i];
          tiles += w ? `<div class="cart-tile ${i === S.wsel ? 'sel' : ''}" data-act="work" data-i="${i}" role="button" aria-label="${esc(w.title)}"><div class="lab" style="background-image:${cssUrl(w.cover)}"></div><div class="nm">${esc(w.title)}</div></div>` : `<div class="cart-tile empty"></div>`;
        }
        h = `<div class="grid-bg" style="position:absolute;inset:0"></div><div class="pager"><span class="k" data-act="prev">◀ L</span><span>${pg + 1} / ${pages()}</span><span class="k" data-act="next">R ▶</span></div><div class="wgrid">${tiles}</div>` + foot(keyB, keyA('查看'));
        break;
      }
      case 'about':
        h = `<div class="title-strip">${esc(p.name)} 的自我介绍</div>` + scroller('sc', (p.bio || '').split(/\n{2,}/).map((t) => `<p>${esc(t)}</p>`).join('')) + foot(keyB, '▲▼ 滚动');
        break;
      case 'exp': {
        const ex = p.experience || [];
        h = `<div class="title-strip">经历 · ${ex.length}</div><div class="list">${ex.map((e, i) => `<div class="li ${i === S.exp ? 'sel' : ''}" data-act="pick" data-i="${i}"><div class="ic">${i + 1}</div><div class="tx"><b>${esc(e.role)}</b><small>${esc(e.period)} · ${esc(e.org)}</small></div></div>`).join('')}</div>` + foot(keyB, '▲▼ 选择');
        break;
      }
      case 'contact': {
        const cs = contacts();
        h = `<div class="title-strip">联系方式</div><div class="list">${cs.map((c, i) => `<div class="li ${i === S.contact ? 'sel' : ''}" data-act="pick" data-i="${i}"><div class="ic">${esc(c.icon)}</div><div class="tx"><b>${esc(c.label)}</b><small>${esc(c.sub)}</small></div></div>`).join('')}</div>` + foot(keyB, keyA('打开'));
        break;
      }
      case 'info':
        h = `<div class="title-strip">关于本站</div><div class="list">${INFO.map((c, i) => `<div class="li ${i === S.info ? 'sel' : ''}" data-act="pick" data-i="${i}"><div class="ic">${i + 1}</div><div class="tx"><b>${esc(c.t)}</b></div></div>`).join('')}</div>` + foot(keyB, '▲▼ 选择');
        break;
    }
    lcdBot.innerHTML = h;
    // keep the selected list row in view
    const list = lcdBot.querySelector('.list'), sel = list && list.querySelector('.sel');
    if (sel) { const off = sel.offsetTop + sel.offsetHeight - list.clientHeight; list.scrollTop = off > 0 ? off + 4 : 0; }
    if (S.mode === 'about') updScroll(lcdBot, 0);
  }
  const render = () => { renderTop(); renderBot(); };

  /* ---------------------------------------------------------------- navigation */
  function go(mode) { S.mode = mode; render(); }
  function openMenu(i) {
    const k = MENU[i].k;
    if (k === 'sound') { toggleSound(); return; }
    sfx.ok(); go(k);
  }
  function toggleSound() {
    S.sound = !S.sound; localStorage.setItem('pl_sound', S.sound ? '1' : '0');
    if (S.sound) sfx.ok();
    if (S.mode === 'home') renderBot();
  }
  function finishBoot() {
    sessionStorage.setItem('pl_booted', '1');
    sfx.chime(); go('home');
  }
  function wmove(d) {
    const n = S.works.length; if (!n) return sfx.nope();
    const next = S.wsel + d;
    if (next < 0 || next >= n) return sfx.nope();
    S.wsel = next; sfx.move(); render();
  }
  function wpage(d) {
    const pg = page() + d;
    if (pg < 0 || pg >= pages()) return sfx.nope();
    S.wsel = Math.min(S.works.length - 1, pg * PER + (S.wsel % PER)); sfx.move(); render();
  }
  function listMove(key, len, d) {
    if (!len) return;
    const v = S[key] + d; if (v < 0 || v >= len) return sfx.nope();
    S[key] = v; sfx.move(); render();
  }

  function press(b) {
    if (b === 'power') return togglePower();
    if (!S.power || S.busy) return;
    if (S.mode === 'detail') { if (b === 'b' || b === 'start') closeDetail(); return; }
    if (S.mode === 'boot') return finishBoot();
    if (b === 'start') { if (S.mode !== 'home') { sfx.back(); go('home'); } return; }
    if (b === 'select') return toggleSound();
    if (b === 'b' && S.mode !== 'home') { sfx.back(); return go('home'); }
    switch (S.mode) {
      case 'home': {
        if (b === 'a') return openMenu(S.home);
        const n = HNAV[S.home][b];
        if (n !== undefined) { S.home = n; sfx.move(); render(); } else if (['up', 'down', 'left', 'right'].includes(b)) sfx.nope();
        return;
      }
      case 'works':
        if (b === 'left') return wmove(-1);
        if (b === 'right') return wmove(1);
        if (b === 'up') return wmove(-3);
        if (b === 'down') return wmove(3);
        if (b === 'l') return wpage(-1);
        if (b === 'r') return wpage(1);
        if (b === 'a' && S.works[S.wsel]) return openDetail(S.works[S.wsel]);
        return;
      case 'about':
        if (b === 'up' || b === 'l') { updScroll(lcdBot, -40); sfx.move(); }
        if (b === 'down' || b === 'r') { updScroll(lcdBot, 40); sfx.move(); }
        return;
      case 'exp':
        if (b === 'up') listMove('exp', (S.profile.experience || []).length, -1);
        if (b === 'down') listMove('exp', (S.profile.experience || []).length, 1);
        return;
      case 'contact': {
        const cs = contacts();
        if (b === 'up') listMove('contact', cs.length, -1);
        if (b === 'down') listMove('contact', cs.length, 1);
        if (b === 'a' && cs[S.contact]) openLink(cs[S.contact].url);
        return;
      }
      case 'info':
        if (b === 'up') listMove('info', INFO.length, -1);
        if (b === 'down') listMove('info', INFO.length, 1);
        if (b === 'a' && INFO[S.info].url) location.href = INFO[S.info].url;
    }
  }
  function openLink(u) {
    sfx.ok();
    const href = safeHref(u);
    if (href === '#') return;
    if (/^mailto:|^tel:/i.test(href)) location.href = href; else window.open(href, '_blank', 'noopener');
  }
  function togglePower() {
    S.power = !S.power;
    document.getElementById('scrTop').classList.toggle('off', !S.power);
    document.getElementById('scrBot').classList.toggle('off', !S.power);
    $('#powerKnob').setAttribute('cx', S.power ? 1276 : 1250);
    $('#ledPower').setAttribute('fill', S.power ? 'url(#gLedOn)' : '#c26b84');
    if (S.power) sfx.chime();
  }

  /* ---------------------------------------------------------------- detail */
  const detail = $('#detail'), dBody = $('#dBody');
  let lastMode = 'works', lastFocus = null;
  async function openDetail(w) {
    sfx.ok(); S.busy = true; lastFocus = document.activeElement;
    let full = w;
    try { const r = await fetch('/api/works/' + w.id); if (r.ok) full = await r.json(); } catch (e) { /* use list data */ }
    const imgs = (full.images || []).filter((u) => u && u !== full.cover);
    dBody.innerHTML = `<span class="d-cat">${esc([full.category, full.year].filter(Boolean).join(' · '))}</span><h1 id="dTitle">${esc(full.title)}</h1>
      <div class="d-meta">${(full.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      ${full.cover ? `<img class="d-hero" src="${esc(full.cover)}" alt="${esc(full.title)} 封面">` : ''}
      <div class="d-text">${esc(full.description || full.summary || '')}</div>
      ${imgs.length ? `<div class="d-gal">${imgs.map((u, i) => `<img loading="lazy" src="${esc(u)}" alt="${esc(full.title)} 图 ${i + 1}">`).join('')}</div>` : ''}
      ${full.link ? `<a class="d-link" href="${esc(safeHref(full.link))}" target="_blank" rel="noopener">访问项目 ↗</a>` : ''}`;
    const compact = document.body.classList.contains('compact');
    if (!compact) { device.classList.add('closed'); tone(300, 0.12, 'triangle', 0.06, 0.6); await wait(780); }
    lastMode = S.mode; S.mode = 'detail';
    detail.hidden = false; detail.scrollTop = 0;
    requestAnimationFrame(() => detail.classList.add('show'));
    $('.d-close', detail).focus({ preventScroll: true });
    S.busy = false;
  }
  async function closeDetail() {
    sfx.back(); S.busy = true;
    detail.classList.remove('show'); await wait(300); detail.hidden = true;
    device.classList.remove('closed');
    S.mode = lastMode; render();
    if (!document.body.classList.contains('compact')) await wait(700);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    S.busy = false;
  }
  detail.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) press('b'); });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------------------------------------------------------- input: touch screen */
  lcdBot.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (S.mode === 'boot') return finishBoot();
    if (!t || S.busy || !S.power) return;
    const i = +t.dataset.i, a = t.dataset.act;
    if (a === 'back') return press('b');
    if (a === 'ok') return press('a');
    if (a === 'prev') return press('l');
    if (a === 'next') return press('r');
    if (a === 'menu') { S.home = i; return openMenu(i); }
    if (a === 'work') { S.wsel = i; return openDetail(S.works[i]); }
    if (a === 'pick') {
      const key = S.mode === 'exp' ? 'exp' : S.mode === 'contact' ? 'contact' : 'info';
      if (S[key] === i && key === 'contact') return openLink(contacts()[i].url);
      if (S[key] === i && key === 'info' && INFO[i].url) return (location.href = INFO[i].url);
      S[key] = i; sfx.move(); render();
    }
  });
  lcdBot.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-act="work"]');
    if (t && S.mode === 'works' && +t.dataset.i !== S.wsel) { S.wsel = +t.dataset.i; renderTop(); $$('.cart-tile', lcdBot).forEach((x) => x.classList.toggle('sel', +x.dataset.i === S.wsel)); }
  });
  lcdBot.addEventListener('wheel', (e) => { if (S.mode === 'about') { e.preventDefault(); updScroll(lcdBot, e.deltaY * 0.4); } }, { passive: false });
  let ty = null;
  lcdBot.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
  lcdBot.addEventListener('touchmove', (e) => { if (S.mode === 'about' && ty != null) { const y = e.touches[0].clientY; updScroll(lcdBot, (ty - y) * 0.6); ty = y; e.preventDefault(); } }, { passive: false });

  /* ---------------------------------------------------------------- input: hardware buttons */
  function flash(b) {
    const els = $$(`[data-btn="${b}"]`);
    if (['up', 'down', 'left', 'right'].includes(b)) {
      const d = $('#dpad'); d.classList.add('p-' + b); setTimeout(() => d.classList.remove('p-' + b), 110);
    } else els.forEach((el) => { el.classList.add('pressed'); setTimeout(() => el.classList.remove('pressed'), 110); });
  }
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('[data-btn]'); if (!t) return;
    e.preventDefault(); flash(t.dataset.btn); press(t.dataset.btn);
  });
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    x: 'a', X: 'a', z: 'b', Z: 'b', Escape: 'b', Backspace: 'b',
    s: 'x', S: 'x', a: 'y', A: 'y', q: 'l', Q: 'l', w: 'r', W: 'r', Shift: 'select',
  };
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    let b = KEYMAP[e.key];
    if (e.key === 'Enter' || e.key === ' ') b = S.mode === 'home' || S.mode === 'works' || S.mode === 'contact' || S.mode === 'info' || S.mode === 'boot' ? 'a' : 'start';
    if (S.mode === 'detail') {
      if (b === 'b') { e.preventDefault(); flash('b'); press('b'); }
      return; // let the reading view scroll naturally
    }
    if (!b) return;
    e.preventDefault(); if (e.repeat && !['up', 'down', 'left', 'right'].includes(b)) return;
    flash(b); press(b);
  });

  /* ---------------------------------------------------------------- clock tick */
  setInterval(() => {
    const d = new Date(), hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    $$('[data-clock]').forEach((el) => { if (el.textContent !== hm) el.textContent = hm; });
    const face = lcdTop.querySelector('[data-clockface] svg');
    if (face) face.outerHTML = clockSvg(d);
  }, 1000);

  /* ---------------------------------------------------------------- start */
  (async () => {
    fit();
    await load();
    if (sessionStorage.getItem('pl_booted')) S.mode = 'home';
    render(); fit();
    if (S.mode === 'boot') sfx.chime();
  })();
})();
