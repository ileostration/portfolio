/* Kern Studio drawing set. Core systems: loader, top bar, timeline, cursor, theme, reveal, scramble, logo animation. */
(function () {
'use strict';
if (window.KERN) return;
var K = window.KERN = { mods: [], booted: false, cur: 0, override: null, sheetTheme: 'paper' };

/* ---------- helpers ---------- */
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
var lerp = function (a, b, t) { return a + (b - a) * t; };
var pad = function (n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; };
K.$ = $; K.$$ = $$; K.clamp = clamp; K.lerp = lerp; K.pad = pad;

function bez(x1, y1, x2, y2) {
  var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  function sx(t) { return ((ax * t + bx) * t + cx) * t; }
  function sy(t) { return ((ay * t + by) * t + cy) * t; }
  function dx(t) { return (3 * ax * t + 2 * bx) * t + cx; }
  return function (x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var t = x, i, d, dd;
    for (i = 0; i < 8; i++) { d = sx(t) - x; if (Math.abs(d) < 1e-5) return sy(t); dd = dx(t); if (Math.abs(dd) < 1e-6) break; t -= d / dd; }
    var lo = 0, hi = 1; t = x;
    while (lo < hi) { d = sx(t); if (Math.abs(d - x) < 1e-5) break; if (x > d) lo = t; else hi = t; t = (hi - lo) / 2 + lo; if (hi - lo < 1e-6) break; }
    return sy(t);
  };
}
K.ease = { draft: bez(0.65, 0, 0.35, 1), out: bez(0.16, 1, 0.3, 1), lin: function (t) { return t; } };
K.tween = function (dur, ease, fn, done) {
  var t0 = null, id = 0, dead = false;
  function f(now) {
    if (dead) return;
    if (t0 === null) t0 = now;
    var t = clamp((now - t0) / dur, 0, 1);
    fn(ease ? ease(t) : t, t);
    if (t < 1) id = requestAnimationFrame(f); else if (done) done();
  }
  id = requestAnimationFrame(f);
  return { cancel: function () { dead = true; cancelAnimationFrame(id); } };
};
var mq = function (q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
K.reduced = mq('(prefers-reduced-motion: reduce)');
K.fine = mq('(pointer: fine)');
K.mobile = function () { return window.innerWidth <= 600; };
K.narrow = function () { return window.innerWidth <= 1100; };
K.SHEETS = [
  { n: 'A-000', t: 'Cover', id: 'hero' }, { n: 'A-100', t: 'The Brief', id: 'ch1' }, { n: 'A-200', t: 'The Research', id: 'ch2' },
  { n: 'A-300', t: 'The Insight', id: 'ch3' }, { n: 'A-400', t: 'The Structure', id: 'ch4' },
  { n: 'A-600', t: 'The Drawings', id: 'ch6' }, { n: 'A-700', t: 'The Site', id: 'ch7' }, { n: 'A-800', t: 'The Details', id: 'ch8' },
  { n: 'A-900', t: 'The Numbers', id: 'ch9' }, { n: 'A-910', t: 'Issued', id: 'coda' }
];
K.io = function (els, cb, opt) {
  opt = opt || {};
  var list = (els && els.nodeType) ? [els] : (els || []);
  var o = new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting, e.target, e); }); },
    { threshold: opt.threshold || 0, rootMargin: opt.rootMargin || '0px' });
  list.forEach(function (el) { o.observe(el); });
  return o;
};

/* scroll bus: one passive listener, rAF throttled */
K.scroll = { y: 0, vh: 0, max: 1, dir: 0, dy: 0, p: 0 };
K.subs = [];
K.onScroll = function (fn) { K.subs.push(fn); try { fn(K.scroll); } catch (e) { console.error('[kern]', e); } };
var lastY = 0, ticking = false;
function scrollTick() {
  ticking = false;
  var s = K.scroll, de = document.documentElement;
  s.y = window.pageYOffset || de.scrollTop || 0;
  s.vh = window.innerHeight || de.clientHeight;
  s.max = Math.max(1, Math.max(de.scrollHeight, document.body ? document.body.scrollHeight : 0) - s.vh);
  s.dy = s.y - lastY; if (s.dy !== 0) s.dir = s.dy > 0 ? 1 : -1; lastY = s.y;
  s.p = clamp(s.y / s.max, 0, 1);
  for (var i = 0; i < K.subs.length; i++) { try { K.subs[i](s); } catch (e) { console.error('[kern]', e); } }
}
function reqTick() { if (!ticking) { ticking = true; requestAnimationFrame(scrollTick); } }
K.tickNow = scrollTick;

/* ---------- scramble and count-up ---------- */
K.scramble = function (el, dur) {
  if (el.__scr) return; el.__scr = true;
  var fin = el.getAttribute('data-v') || el.textContent; el.setAttribute('data-v', fin);
  if (K.reduced) { el.textContent = fin; return; }
  dur = dur || 500;
  var n = fin.length, t0 = performance.now();
  function f(now) {
    var t = clamp((now - t0) / dur, 0, 1), out = '', i, ch;
    for (i = 0; i < n; i++) {
      ch = fin.charAt(i);
      if (/[0-9]/.test(ch) && t < 0.35 + 0.65 * ((i + 1) / n)) out += Math.floor(Math.random() * 10); else out += ch;
    }
    el.textContent = out;
    if (t < 1) requestAnimationFrame(f); else el.textContent = fin;
  }
  requestAnimationFrame(f);
};
K.count = function (el, dur) {
  if (el.__cnt) return; el.__cnt = true;
  var end = parseFloat(el.getAttribute('data-count')), pre = el.getAttribute('data-pre') || '', suf = el.getAttribute('data-suf') || '';
  var dec = (String(el.getAttribute('data-count')).split('.')[1] || '').length;
  if (K.reduced || isNaN(end)) { el.textContent = pre + (isNaN(end) ? '' : end.toFixed(dec)) + suf; return; }
  dur = dur || 1400;
  K.tween(dur, K.ease.out, function (e) { el.textContent = pre + (end * e).toFixed(dec) + suf; });
};

/* ---------- reveal ---------- */
function enter(el) {
  if (el.__in) return; el.__in = true;
  el.classList.add('in');
  var figs = $$('.fig', el); if (el.classList.contains('fig')) figs.push(el);
  figs.forEach(function (f) { K.scramble(f, 500); });
  $$('[data-count]', el).forEach(function (c) { K.count(c); });
  if (el.hasAttribute('data-count')) K.count(el);
  try { el.dispatchEvent(new CustomEvent('kern:in', { bubbles: false })); } catch (e) {}
}
K.enter = enter;
function initReveal() {
  var els = $$('.rv, .fade, [data-io], .fig, [data-count]');
  var o = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { enter(e.target); o.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  els.forEach(function (el) { o.observe(el); });
  K.revealIO = o;
}

/* ---------- letter-roll buttons ---------- */
function initRoll() {
  $$('.roll').forEach(function (a) {
    var txt = a.textContent.trim(); if (!txt || a.__roll) return; a.__roll = true;
    if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', txt);
    a.textContent = '';
    var w = document.createElement('span'); w.className = 'rl'; w.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < txt.length; i++) {
      var ch = txt.charAt(i) === ' ' ? ' ' : txt.charAt(i);
      var c = document.createElement('span'); c.className = 'rc'; c.style.setProperty('--i', i);
      var s = document.createElement('span'); s.textContent = ch; var s2 = document.createElement('span'); s2.textContent = ch;
      c.appendChild(s); c.appendChild(s2); w.appendChild(c);
    }
    a.appendChild(w);
  });
}

/* ---------- restacking display words ---------- */
K.stack = function (el) {
  if (el.__stk || K.reduced) return; el.__stk = true;
  var txt = el.textContent.trim();
  if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', txt);
  el.textContent = '';
  var letters = [];
  for (var i = 0; i < txt.length; i++) {
    var s = document.createElement('span'); s.className = 'stl'; s.setAttribute('aria-hidden', 'true');
    s.style.transformOrigin = '0 0'; s.textContent = txt.charAt(i); el.appendChild(s); letters.push(s);
  }
  el.setAttribute('tabindex', '0');
  var up = el.getAttribute('data-stack') === 'up';
  function on() {
    var fs = parseFloat(getComputedStyle(el).fontSize) || 100, sc = 0.46, lh = fs * 0.86 * sc, n = letters.length;
    var base = el.getBoundingClientRect().left;
    letters.forEach(function (l, i) {
      var x = l.getBoundingClientRect().left - base;
      l.style.setProperty('--sx', (-x) + 'px');
      l.style.setProperty('--sy', (up ? -(n - 1 - i) * lh : i * lh) + 'px');
      l.style.setProperty('--ss', sc);
    });
    el.classList.add('stk-on');
  }
  function off() { el.classList.remove('stk-on'); }
  el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
  el.addEventListener('focus', on); el.addEventListener('blur', off);
};

/* ---------- marquee bands ---------- */
function initMarquee() {
  $$('[data-mq]').forEach(function (m, bi) {
    var t = $('.mq-t', m); if (!t || t.__f) return; t.__f = true;
    var rot = K.SHEETS.slice(bi % K.SHEETS.length).concat(K.SHEETS.slice(0, bi % K.SHEETS.length));
    rot.forEach(function (s) { var sp = document.createElement('span'); sp.textContent = s.n + ' ' + s.t; t.appendChild(sp); });
    var c = t.cloneNode(true); c.setAttribute('aria-hidden', 'true'); t.parentNode.appendChild(c);
    if (bi % 2) m.classList.add('rev');
  });
}

/* ---------- revision clouds ---------- */
K.cloudPath = function (w, h, d) {
  var x0 = 3, y0 = 3, x1 = w - 3, y1 = h - 3, dd = d || 26, out = 'M' + x0 + ' ' + y0, i, n, st, r;
  function side(len, ax, ay, sx, sy) {
    n = Math.max(2, Math.round(len / dd)); st = len / n; r = (st / 2) * 1.06;
    for (i = 1; i <= n; i++) { out += 'A' + r.toFixed(2) + ' ' + r.toFixed(2) + ' 0 0 1 ' + (ax + sx * st * i).toFixed(2) + ' ' + (ay + sy * st * i).toFixed(2); }
  }
  side(x1 - x0, x0, y0, 1, 0);
  side(y1 - y0, x1, y0, 0, 1);
  side(x1 - x0, x1, y1, -1, 0);
  side(y1 - y0, x0, y1, 0, -1);
  return out + 'Z';
};
K.cloud = function (svg, dd) {
  var b = svg.getBoundingClientRect(), w = Math.round(b.width), h = Math.round(b.height);
  if (w < 20 || h < 20) return;
  svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  var p = svg.querySelector('path'); if (p) p.setAttribute('d', K.cloudPath(w, h, dd || parseFloat(svg.getAttribute('data-cloud')) || 26));
};
function initClouds() {
  var all = $$('svg[data-cloud]');
  function run() { all.forEach(function (s) { K.cloud(s); }); }
  run();
  var to = 0; window.addEventListener('resize', function () { clearTimeout(to); to = setTimeout(run, 150); });
  K.cloudsRun = run;
}

/* ---------- line splitting for long display text ---------- */
K.split = function (el) {
  if (!el.__orig) el.__orig = el.textContent.replace(/\s+/g, ' ').trim();
  var words = el.__orig.split(' '), clone = el.hasAttribute('data-clone');
  el.textContent = '';
  var wrap = document.createElement('span'); wrap.className = 'sp'; wrap.setAttribute('aria-hidden', 'true');
  var spans = words.map(function (w) { var s = document.createElement('span'); s.textContent = w; wrap.appendChild(s); wrap.appendChild(document.createTextNode(' ')); return s; });
  if (!clone) { var v = document.createElement('span'); v.className = 'vh'; v.textContent = el.__orig; el.appendChild(v); }
  el.appendChild(wrap);
  var lines = [], top = null, cur = null;
  spans.forEach(function (s, i) {
    var t = s.offsetTop;
    if (top === null || Math.abs(t - top) > 6) { cur = []; lines.push(cur); top = t; }
    cur.push(words[i]);
  });
  wrap.textContent = '';
  lines.forEach(function (ws, i) {
    var ln = document.createElement('span'); ln.className = 'ln'; ln.style.setProperty('--i', i);
    var sp = document.createElement('span'); sp.textContent = ws.join(' '); ln.appendChild(sp); wrap.appendChild(ln);
  });
};
K.splitAll = function () {
  $$('[data-split]').forEach(function (el) {
    el.classList.add('no-t');
    try { K.split(el); } catch (e) { console.error('[kern] split', e); }
    requestAnimationFrame(function () { el.classList.remove('no-t'); });
  });
};
function initSplit() {
  K.splitAll();
  var to = 0, w0 = window.innerWidth;
  window.addEventListener('resize', function () { if (window.innerWidth === w0) return; w0 = window.innerWidth; clearTimeout(to); to = setTimeout(K.splitAll, 200); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(K.splitAll, 60); });
}

/* ---------- logo animation ---------- */
K.wm = {
  gaps: [2, 1, 3],
  set: function (el, p, dimO) {
    if (!el) return;
    var letters = $$('.wm-l', el), dims = $$('.dim', el);
    var wd = lerp(90, 125, p), ls = lerp(-0.02, 0.4, p);
    el.style.fontVariationSettings = '"wdth" ' + wd.toFixed(1);
    el.style.fontStretch = wd.toFixed(1) + '%';
    el.style.letterSpacing = ls.toFixed(3) + 'em';
    if (el.hasAttribute('data-fit') && letters.length > 1 && el.parentNode) {
      /* fit the four letters to the sheet width so the final state is always the whole word */
      el.style.fontSize = '';
      var f0 = parseFloat(getComputedStyle(el).fontSize) || 200, pw = el.parentNode.clientWidth;
      var ra = letters[0].getBoundingClientRect(), rb = letters[letters.length - 1].getBoundingClientRect();
      var vw = rb.right - ra.left - ls * f0;
      if (pw > 0 && vw > pw) el.style.fontSize = (f0 * pw / vw * 0.99).toFixed(2) + 'px';
    }
    if (!dims.length || !letters.length) return;
    var fs = parseFloat(getComputedStyle(el).fontSize) || 200, lsp = ls * fs, base = el.getBoundingClientRect();
    dims.forEach(function (d, i) {
      var r1 = letters[i + 1].getBoundingClientRect();
      var w = Math.max(14, lsp + 0.06 * fs), cx = r1.left - base.left - lsp / 2;
      d.style.left = (cx - w / 2).toFixed(1) + 'px'; d.style.width = w.toFixed(1) + 'px';
      var n = $('.dn', d); if (n) n.textContent = Math.round(lerp(K.wm.gaps[i], K.wm.gaps[i] + 60, p));
      d.style.opacity = dimO;
    });
  },
  play: function (el, opt) {
    opt = opt || {}; var rev = !!opt.reverse, dur = opt.dur || 1600;
    if (!el) return;
    if (el.__wmT) el.__wmT.cancel();
    if (K.reduced) { K.wm.set(el, rev ? 1 : 0, 0); return; }
    var dims = $$('.dim', el);
    dims.forEach(function (d) { d.style.transition = 'none'; });
    el.__wmT = K.tween(dur, K.ease.draft, function (e, t) {
      var p = rev ? e : 1 - e;
      var o = t < 0.12 ? t / 0.12 : 1;
      K.wm.set(el, p, o);
    }, function () {
      dims.forEach(function (d) { d.style.transition = 'opacity 500ms'; d.style.opacity = 0; });
      if (opt.done) opt.done();
    });
  },
  scroll: function (el) {
    if (K.reduced) { K.wm.set(el, 0, 0); return; }
    K.onScroll(function (s) {
      var rem = s.max - s.y, p = clamp(1 - rem / Math.max(320, s.vh * 0.6), 0, 1);
      K.wm.set(el, K.ease.draft(p), p > 0.02 && p < 0.98 ? 0.9 : 0);
    });
  }
};

/* ---------- loader ---------- */
K.loader = function (done) {
  var ld = $('#ld'), num = $('#ldNum'), skip = $('#ldSkip'), cells = ld ? $$('.ld-grid i', ld) : [];
  if (!ld) { done(); return; }
  var seen = false; try { seen = window.sessionStorage.getItem('kern-ld') === '1'; } catch (e) {}
  if (K.reduced || seen) { ld.classList.add('out'); ld.style.display = 'none'; done(); return; }
  var finished = false, tw;
  function finish() {
    if (finished) return; finished = true; if (tw) tw.cancel();
    try { window.sessionStorage.setItem('kern-ld', '1'); } catch (e) {}
    ld.classList.add('out'); setTimeout(function () { ld.style.display = 'none'; }, 380);
    done();
  }
  skip.addEventListener('click', finish);
  ld.addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'Esc') finish(); });
  try { ld.focus({ preventScroll: true }); } catch (e) {}
  var D = 1900;
  tw = K.tween(D, K.ease.draft, function (e, t) {
    num.textContent = 'A-' + pad(Math.round(e * 910), 3);
    var k = Math.floor(t * 1.15 * cells.length);
    cells.forEach(function (c, i) { if (i < k) c.classList.add('on'); });
  }, function () { num.textContent = 'A-910'; cells.forEach(function (c) { c.classList.add('on'); }); setTimeout(finish, 160); });
};

/* ---------- odometer ---------- */
function initOdo() {
  var host = $('#odoS'); if (!host) return;
  var pre = document.createElement('span'); pre.textContent = 'A-'; host.appendChild(pre);
  var cols = [];
  for (var c = 0; c < 3; c++) {
    var d = document.createElement('span'); d.className = 'odo-d'; var s = document.createElement('span');
    for (var n = 0; n < 10; n++) { var i = document.createElement('i'); i.textContent = n; s.appendChild(i); }
    d.appendChild(s); host.appendChild(d); cols.push(s);
  }
  K.setOdo = function (label) {
    var ds = label.replace('A-', '');
    cols.forEach(function (s, i) { s.style.transform = 'translateY(' + (-16 * parseInt(ds.charAt(i), 10)) + 'px)'; });
    var o = $('#odo'); if (o) o.setAttribute('aria-label', 'Current sheet ' + label + ' of A-910');
  };
  K.setOdo('A-000');
}

/* ---------- theme and current sheet ---------- */
K.applyTheme = function () {
  var t = K.override || K.sheetTheme;
  K.root.setAttribute('data-theme', t);
  $$('.js-theme').forEach(function (b) {
    b.setAttribute('aria-pressed', t === 'blueprint' ? 'true' : 'false');
    b.setAttribute('aria-label', (t === 'blueprint' ? 'Blueprint theme. Switch to Paper' : 'Paper theme. Switch to Blueprint') + (K.override ? ' (manual)' : ' (follows the sheet)'));
  });
  try { document.body.style.background = t === 'blueprint' ? '#0D1633' : '#F2F0EB'; } catch (e) {}
};
K.setSheet = function (el) {
  var i = parseInt(el.getAttribute('data-i'), 10); if (isNaN(i)) return;
  K.cur = i; K.sheetTheme = el.getAttribute('data-theme') || 'paper';
  if (K.override && K.override === K.sheetTheme) { /* keep manual choice */ }
  K.applyTheme();
  var s = K.SHEETS[i];
  $$('.nav a').forEach(function (a) { a.classList.toggle('cur', parseInt(a.getAttribute('data-i'), 10) === i); if (parseInt(a.getAttribute('data-i'), 10) === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  $$('#ruler button').forEach(function (b) { b.classList.toggle('cur', parseInt(b.getAttribute('data-i'), 10) === i); });
  if (K.setOdo) K.setOdo(s.n);
  var c = $('#cnt'); if (c) c.textContent = s.n;
  var fn = $('#fabN'); if (fn) fn.textContent = s.n;
  var fb = $('#idxFab'); if (fb) fb.setAttribute('aria-label', 'Open sheet index. Current sheet ' + s.n);
  try { K.root.dispatchEvent(new CustomEvent('kern:sheet', { detail: { i: i, n: s.n } })); } catch (e) {}
};
function initSheets() {
  var sheets = $$('[data-sheet][data-i]');
  K.io(sheets, function (isIn, el) { if (isIn) K.setSheet(el); }, { rootMargin: '-50% 0px -50% 0px' });
  $$('.js-theme').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var eff = K.override || K.sheetTheme, nxt = eff === 'paper' ? 'blueprint' : 'paper';
      K.override = (nxt === K.sheetTheme) ? null : nxt; K.applyTheme();
    });
  });
  K.applyTheme();
}
K.goto = function (id) {
  var el = document.getElementById(id); if (!el) return;
  try { el.scrollIntoView({ behavior: K.reduced ? 'auto' : 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
};

/* ---------- top bar, ruler, scale ---------- */
function initBars() {
  var scale = $('#scale'), fab = $('#idxFab');
  K.onScroll(function (s) {
    if (scale) scale.style.setProperty('--sp', (s.p * 100).toFixed(2) + '%');
    /* the small index button steps out of the way while reading down the page and returns on the way up */
    if (fab) {
      if (s.dir > 0 && s.y > 160 && Math.abs(s.dy) > 2) fab.classList.add('away');
      else if (s.dir < 0 || s.y < 120) fab.classList.remove('away');
    }
  });
  if (fab) fab.addEventListener('focus', function () { fab.classList.remove('away'); });
  $$('#ruler button').forEach(function (b) {
    b.addEventListener('click', function () { var s = K.SHEETS[parseInt(b.getAttribute('data-i'), 10)]; if (s) K.goto(s.id); });
  });
}

/* ---------- mobile index sheet ---------- */
function initIndex() {
  var dlg = $('#idx'), btn = $('#idxFab'), x = $('#idxX'), grab = $('#idxGrab'), head = $('.idx-head', dlg || document);
  if (!dlg || !btn) return;
  function open() { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } }
  function close() { try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); } dlg.style.transform = ''; }
  btn.addEventListener('click', open);
  if (x) x.addEventListener('click', close);
  $$('a', dlg).forEach(function (a) { a.addEventListener('click', close); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  var y0 = null, dy = 0;
  function down(e) { y0 = e.clientY; dy = 0; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) {} }
  function move(e) { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); dlg.style.transform = 'translateY(' + dy + 'px)'; }
  function up() { if (y0 === null) return; if (dy > 80) close(); else dlg.style.transform = ''; y0 = null; }
  [grab, head].forEach(function (g) { if (!g) return; g.style.touchAction = 'none'; g.addEventListener('pointerdown', down); g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up); });
}

/* ---------- CAD cursor ---------- */
function initCursor() {
  if (!K.fine || K.reduced) return;
  var root = K.root, cad = $('#cad'), xy = $('#cadXY'), tt = $('#cadT'); if (!cad) return;
  var labels = { drag: 'Drag', cut: 'Cut', open: 'Open', sheet: 'View sheet' };
  root.classList.add('cad-on');
  var TEXT = 'p,h1,h2,h3,h4,li,blockquote,figcaption,dd,dt,.txt,input,textarea,label';
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var tg = e.target && e.target.closest ? e.target.closest('[data-cursor]') : null;
    var txt = !tg && e.target && e.target.closest ? e.target.closest(TEXT) : null;
    cad.classList.toggle('on', !txt);
    cad.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    var mm = 0.2646, py = e.clientY + (window.pageYOffset || 0);
    xy.textContent = 'X ' + pad(Math.round(e.clientX * mm), 4) + '  Y ' + pad(Math.round(py * mm), 4);
    tt.textContent = tg ? (labels[tg.getAttribute('data-cursor')] || '') : '';
  }, { passive: true });
  document.addEventListener('pointerleave', function () { cad.classList.remove('on'); });
  document.addEventListener('mouseleave', function () { cad.classList.remove('on'); });
}

/* ---------- boot ---------- */
function safe(name, fn) { try { fn(); } catch (e) { console.error('[kern] ' + name, e); } }
K.boot = function () {
  if (K.booted) return; K.booted = true;
  var root = K.root = document.getElementById('kern');
  var hero = $('#heroWm');
  safe('hero-set', function () { if (!K.reduced) K.wm.set(hero, 1, 0); else K.wm.set(hero, 0, 0); });
  safe('odo', initOdo);
  safe('theme', initSheets);
  safe('bars', initBars);
  safe('index', initIndex);
  safe('roll', initRoll);
  safe('marquee', initMarquee);
  safe('clouds', initClouds);
  safe('split', initSplit);
  safe('reveal', function () {
    $$('.tb-scale .tb-val, .tb-date .tb-val').forEach(function (v) { v.classList.add('fig'); });
    initReveal();
  });
  safe('stack', function () { $$('[data-stack]').forEach(function (s) { K.stack(s); }); });
  safe('cursor', initCursor);
  safe('loader', function () {
    K.loader(function () {
      var h = $('#hero'); if (h) h.classList.add('on');
      K.wm.play(hero, { dur: 1700 });
      K.loaded = true;
      try { root.dispatchEvent(new CustomEvent('kern:loaded')); } catch (e) {}
    });
  });
  K.mods.forEach(function (m, i) { safe('module ' + i, function () { m(K); }); });
  window.addEventListener('scroll', reqTick, { passive: true });
  window.addEventListener('resize', reqTick);
  reqTick();
};
K.start = function () {
  if (K.booted || K.polling) return; K.polling = true;
  var tries = 0;
  (function poll() {
    if (K.booted) return;
    var r = document.getElementById('kern');
    if (r && r.querySelector('#main')) { K.polling = false; K.boot(); return; }
    if (tries++ < 200) setTimeout(poll, 50);
  })();
};
K.start();
})();
