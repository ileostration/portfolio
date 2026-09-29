/* The Meridian Biennial: seven lines, one city. Behaviour for the case-study page. */
(function () {
  'use strict';
  var W = window, D = document;
  var D2R = Math.PI / 180, TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- data */
  var ZONES = [
    { n: 1, name: 'Furnace', hex: '#E8401C', tx: '#111111', lon: -87, freq: 523.25, venue: 'Halsted Works', hood: 'Pilsen', cities: [['Chicago', 41.88], ['Tegucigalpa', 14.07]] },
    { n: 2, name: 'Sodium', hex: '#F2862A', tx: '#111111', lon: -74, freq: 587.33, venue: 'Fulton Hall', hood: 'West Loop', cities: [['New York', 40.71], ['Bogotá', 4.71]] },
    { n: 3, name: 'Yolk', hex: '#EFC231', tx: '#111111', lon: 2, freq: 659.25, venue: 'Forum Yard', hood: 'Bronzeville', cities: [['Paris', 48.86], ['Niamey', 13.51]] },
    { n: 4, name: 'Verdigris', hex: '#2E9E68', tx: '#111111', lon: 37, freq: 783.99, venue: 'The Oriel Rooms', hood: 'Hyde Park', cities: [['Moscow', 55.76], ['Nairobi', -1.29]] },
    { n: 5, name: 'Harbour', hex: '#1F86C8', tx: '#111111', lon: 77, freq: 880.00, venue: 'Argyle Depot', hood: 'Uptown', cities: [['Delhi', 28.61], ['Bengaluru', 12.97]] },
    { n: 6, name: 'Indigo', hex: '#5A4FCF', tx: '#FFFFFF', lon: 116, freq: 1046.50, venue: 'Wentworth Hall', hood: 'Chinatown', cities: [['Beijing', 39.90], ['Perth', -31.95]] },
    { n: 7, name: 'Fuchsia', hex: '#C8388F', tx: '#FFFFFF', lon: 151, freq: 1174.66, venue: 'Wabash Arcade', hood: 'the Loop', cities: [['Sydney', -33.87], ['Magadan', 59.57]] }
  ];
  var CHAPTERS = 10; // 01 to 09 and the coda

  /* ------------------------------------------------------------- helpers */
  function qs(s, r) { return (r || D).querySelector(s); }
  function qsa(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pad(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }
  function fmtLon(l) { var r = Math.round(l); return (r === 0 ? '0' : Math.abs(r)) + '°' + (r < 0 ? 'W' : r === 0 ? '' : 'E'); }
  function fmtLat(v) { return Math.abs(v).toFixed(2) + '°' + (v < 0 ? 'S' : 'N'); }
  function wrap180(d) { d = ((d + 180) % 360 + 360) % 360 - 180; return d; }
  function bez(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function sx(t) { return ((ax * t + bx) * t + cx) * t; }
    function sy(t) { return ((ay * t + by) * t + cy) * t; }
    function dx(t) { return (3 * ax * t + 2 * bx) * t + cx; }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x, i, e, d;
      for (i = 0; i < 8; i++) { e = sx(t) - x; if (Math.abs(e) < 1e-5) return sy(t); d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
      var lo = 0, hi = 1; t = x;
      while (lo < hi) { var v = sx(t); if (Math.abs(v - x) < 1e-5) break; if (x > v) lo = t; else hi = t; t = (hi - lo) / 2 + lo; if (hi - lo < 1e-6) break; }
      return sy(t);
    };
  }
  var easeTurn = bez(0.45, 0, 0.2, 1), easeLine = bez(0.7, 0, 0.2, 1);
  function nearestZone(lon) {
    var best = 0, bd = 999;
    for (var i = 0; i < 7; i++) { var d = Math.abs(wrap180(lon - ZONES[i].lon)); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  /* --------------------------------------------------------------- Globe */
  function Globe(cv, opt) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.opt = opt || {};
    this.lon0 = this.opt.lon0 != null ? this.opt.lon0 : -87;
    this.tilt = (this.opt.tilt != null ? this.opt.tilt : 20) * D2R;
    this.ct = Math.cos(this.tilt); this.st = Math.sin(this.tilt);
    this.focus = -1; this.amt = [0, 0, 0, 0, 0, 0, 0];
    this.anim = null; this.labels = this.opt.labels !== false;
    this.resize();
    if (this.opt.mode === 'dots') this.buildDots();
  }
  Globe.prototype.resize = function () {
    var r = this.cv.getBoundingClientRect();
    var dpr = Math.min(2, W.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) {
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    }
    this.dpr = dpr; this.w = w; this.h = h; this.cx = w / 2; this.cy = h / 2;
    this.R = Math.min(w, h) * (this.opt.scale || 0.42);
  };
  Globe.prototype.buildDots = function () {
    var lon = [], lat = [], sp = 1.46, i, l, a, n, k;
    for (l = -180; l < 180; l += 30) {
      n = Math.round(180 / sp);
      for (k = 1; k < n; k++) { lon.push(l); lat.push(-90 + 180 * k / n); }
    }
    [0, 30, -30, 60, -60].forEach(function (p) {
      var c = Math.cos(p * D2R); n = Math.round(360 * c / sp);
      for (k = 0; k < n; k++) { lon.push(-180 + 360 * k / n); lat.push(p); }
    });
    this.gLon = new Float32Array(lon); this.gLat = new Float32Array(lat);
    this.zLon = []; this.zLat = [];
    for (i = 0; i < 7; i++) {
      var zl = [], zt = []; n = 164;
      for (k = 1; k < n; k++) { zl.push(ZONES[i].lon); zt.push(-90 + 180 * k / n); }
      this.zLon.push(new Float32Array(zl)); this.zLat.push(new Float32Array(zt));
    }
    this.count = lon.length;
  };
  Globe.prototype.rotateTo = function (lon, dur, done) {
    var from = this.lon0, diff = wrap180(lon - from);
    if (!dur) { this.lon0 = from + diff; this.anim = null; if (done) done(); return; }
    this.anim = { from: from, to: from + diff, t0: null, dur: dur, done: done };
  };
  Globe.prototype.step = function (dt, now) {
    var a = this.anim;
    if (a) {
      if (a.t0 == null) a.t0 = now;
      var p = clamp((now - a.t0) / a.dur, 0, 1);
      this.lon0 = lerp(a.from, a.to, easeTurn(p));
      if (p >= 1) { this.anim = null; if (a.done) a.done(); }
    }
    var k = Math.min(1, dt * 6);
    for (var i = 0; i < 7; i++) this.amt[i] += ((i === this.focus ? 1 : 0) - this.amt[i]) * k;
  };
  Globe.prototype.draw = function (viewLon) {
    var ctx = this.ctx, dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.vl = viewLon != null ? viewLon : this.lon0;
    if (this.opt.mode === 'dots') this.drawDots(); else this.drawLines();
  };
  Globe.prototype.plot = function (lons, lats, color, aF, aB, r0) {
    var ctx = this.ctx, vl = this.vl, ct = this.ct, st = this.st, cx = this.cx, cy = this.cy, R = this.R;
    var pf = new Path2D(), pb = new Path2D(), n = lons.length, i, dl, la, cl, x, y, z, y2, z2, sx, sy, r;
    for (i = 0; i < n; i++) {
      dl = (lons[i] - vl) * D2R; la = lats[i] * D2R; cl = Math.cos(la);
      x = cl * Math.sin(dl); y = Math.sin(la); z = cl * Math.cos(dl);
      y2 = y * ct - z * st; z2 = y * st + z * ct;
      sx = cx + R * x; sy = cy - R * y2;
      if (z2 >= 0) { r = r0 * (0.75 + 0.5 * z2); pf.moveTo(sx + r, sy); pf.arc(sx, sy, r, 0, TAU); }
      else { r = r0 * 0.7; pb.moveTo(sx + r, sy); pb.arc(sx, sy, r, 0, TAU); }
    }
    ctx.fillStyle = color;
    ctx.globalAlpha = aB; ctx.fill(pb);
    ctx.globalAlpha = aF; ctx.fill(pf);
    ctx.globalAlpha = 1;
  };
  Globe.prototype.pt = function (lon, lat) {
    var dl = (lon - this.vl) * D2R, la = lat * D2R, cl = Math.cos(la);
    var x = cl * Math.sin(dl), y = Math.sin(la), z = cl * Math.cos(dl);
    var y2 = y * this.ct - z * this.st, z2 = y * this.st + z * this.ct;
    return [this.cx + this.R * x, this.cy - this.R * y2, z2];
  };
  Globe.prototype.cityMarks = function (only) {
    var ctx = this.ctx, i, j, p, z, c;
    for (i = 0; i < 7; i++) {
      if (only != null && only !== i) continue;
      z = ZONES[i];
      for (j = 0; j < 2; j++) {
        c = z.cities[j]; p = this.pt(z.lon, c[1]);
        if (p[2] < 0.05) continue;
        ctx.beginPath(); ctx.arc(p[0], p[1], 5.5, 0, TAU);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = z.hex; ctx.stroke();
        if (this.labels && (only === i)) {
          ctx.font = '500 12px "IBM Plex Mono",ui-monospace,monospace';
          ctx.textBaseline = 'middle';
          var t = c[0] + '  ' + fmtLat(c[1]);
          var right = p[0] < this.cx + this.R * 0.3;
          ctx.textAlign = right ? 'left' : 'right';
          var tx = p[0] + (right ? 12 : -12);
          ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.strokeText(t, tx, p[1]);
          ctx.fillStyle = '#111111'; ctx.fillText(t, tx, p[1]);
        }
      }
    }
  };
  Globe.prototype.drawDots = function () {
    var ctx = this.ctx, i;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, this.R, 0, TAU);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(17,17,17,0.22)'; ctx.stroke();
    var s = this.R / 340;
    this.plot(this.gLon, this.gLat, '#111111', 0.92, 0.14, 1.15 * Math.max(0.8, s));
    for (i = 0; i < 7; i++) {
      var f = this.amt[i];
      this.plot(this.zLon[i], this.zLat[i], ZONES[i].hex, 0.95, 0.16 + 0.1 * f, (1.7 + 0.9 * f) * Math.max(0.8, s));
    }
    this.cityMarks(this.focus >= 0 ? this.focus : null);
  };
  Globe.prototype.poly = function (pts, front, back, wF, wB) {
    // pts: array of [lon,lat]; draws front and back parts with separate styles
    var ctx = this.ctx, pf = new Path2D(), pb = new Path2D(), n = pts.length, i, a, b, pf0 = false, pb0 = false;
    var prev = this.pt(pts[0][0], pts[0][1]);
    for (i = 1; i < n; i++) {
      b = this.pt(pts[i][0], pts[i][1]); a = prev; prev = b;
      if ((a[2] + b[2]) / 2 >= 0) { pf.moveTo(a[0], a[1]); pf.lineTo(b[0], b[1]); }
      else { pb.moveTo(a[0], a[1]); pb.lineTo(b[0], b[1]); }
    }
    ctx.lineCap = 'round';
    if (back) { ctx.strokeStyle = back; ctx.lineWidth = wB; ctx.stroke(pb); }
    ctx.strokeStyle = front; ctx.lineWidth = wF; ctx.stroke(pf);
  };
  Globe.prototype.drawLines = function () {
    var ctx = this.ctx, i, l, la, pts, k, foc = this.focus >= 0;
    var ink = this.opt.ink || '#111111', gr = this.opt.grid || 'rgba(17,17,17,0.28)', grb = this.opt.gridBack || 'rgba(17,17,17,0.09)';
    ctx.beginPath(); ctx.arc(this.cx, this.cy, this.R, 0, TAU);
    ctx.lineWidth = 1.5; ctx.strokeStyle = ink; ctx.stroke();
    for (l = -180; l < 180; l += 30) {
      pts = []; for (k = -90; k <= 90; k += 3) pts.push([l, k]);
      this.poly(pts, gr, grb, 1, 1);
    }
    [0, 30, -30, 60, -60].forEach(function (p) {
      var pp = [], q; for (q = -180; q <= 180; q += 4) pp.push([q, p]);
      this.poly(pp, gr, grb, 1, 1);
    }, this);
    for (i = 0; i < 7; i++) {
      pts = []; for (k = -90; k <= 90; k += 2) pts.push([ZONES[i].lon, k]);
      var f = this.amt[i], dim = foc ? 0.3 : 0.85;
      var a = dim + (1 - dim) * f;
      if (f > 0.04) { ctx.globalAlpha = Math.min(1, f * 1.2); this.poly(pts, '#111111', 'rgba(0,0,0,0)', 4.6 * f + 0.01, 0.1); }
      ctx.globalAlpha = a;
      this.poly(pts, ZONES[i].hex, 'rgba(17,17,17,0.10)', 1.4 + 1.6 * f, 1);
      ctx.globalAlpha = 1;
    }
    if (foc && this.opt.cities !== false) this.cityMarks(this.focus);
  };

  /* -------------------------------------------------------------- mount */
  function mount(root) {
    var S = { rm: false, fine: false, sound: false, zone: 1, chapter: 0, entered: false, over: null, lonNeedle: -180 };
    var rmq = W.matchMedia('(prefers-reduced-motion: reduce)');
    var fineq = W.matchMedia('(hover: hover) and (pointer: fine)');
    S.rm = rmq.matches; S.fine = fineq.matches;
    var cleanups = [];
    function on(t, ev, fn, o) { t.addEventListener(ev, fn, o); cleanups.push(function () { t.removeEventListener(ev, fn, o); }); }
    on(rmq, 'change', function () { S.rm = rmq.matches; });
    on(fineq, 'change', function () { S.fine = fineq.matches; });
    root.classList.add('js');
    var page = qs('#page', root), bar = qs('#bar', root);

    /* ---- shared loop for canvases: runs only while a watched element is near the viewport */
    var loops = [], raf = 0, last = 0;
    function frame(now) {
      raf = 0; var dt = Math.min(0.1, (now - last) / 1000); last = now; var any = false;
      for (var i = 0; i < loops.length; i++) { var l = loops[i]; if (l.vis) { any = true; l.fn(dt, now); } }
      if (any) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function watch(el, fn, margin) {
      var rec = { fn: fn, vis: false };
      loops.push(rec);
      var io = new IntersectionObserver(function (es) {
        rec.vis = es[es.length - 1].isIntersecting;
        if (rec.vis) { if (rec.enter) rec.enter(); kick(); }
      }, { rootMargin: margin || '160px 0px' });
      io.observe(el); cleanups.push(function () { io.disconnect(); });
      return rec;
    }
    cleanups.push(function () { if (raf) cancelAnimationFrame(raf); });

    /* ---- toast + copy */
    var toastEl = qs('#toast', root), toastT = 0;
    function toast(msg) {
      if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('on');
      clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 1600);
    }
    function copyText(text, ok) {
      function fallback() {
        try {
          var ta = D.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
          root.appendChild(ta); ta.select(); var good = D.execCommand('copy'); root.removeChild(ta);
          return good;
        } catch (e) { return false; }
      }
      if (W.navigator.clipboard && W.navigator.clipboard.writeText) {
        W.navigator.clipboard.writeText(text).then(function () { ok(true); }, function () { ok(fallback()); });
      } else ok(fallback());
    }
    S.toast = toast; S.copy = copyText;

    /* ---- sound */
    var actx = null;
    function chime(z) {
      if (!S.sound) return;
      try {
        if (!actx) { var AC = W.AudioContext || W.webkitAudioContext; if (!AC) return; actx = new AC(); }
        if (actx.state === 'suspended') actx.resume();
        var t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = ZONES[z - 1].freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.94);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 1);
      } catch (e) { /* audio unavailable */ }
    }
    S.chime = chime;
    var snd = qs('#snd', root), sndT = qs('#snd-t', root);
    if (snd) on(snd, 'click', function () {
      S.sound = !S.sound;
      snd.setAttribute('aria-pressed', S.sound ? 'true' : 'false');
      sndT.textContent = S.sound ? '( Sound on )' : '( Sound off )';
      if (S.sound) chime(S.zone);
      toast(S.sound ? 'Sound on' : 'Sound off');
    });
    var lastChime = 0;
    function chimeFrom(e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-chime]') : null;
      if (!el) return;
      if (e.type === 'mouseover' && e.relatedTarget && el.contains(e.relatedTarget)) return;
      var now = performance.now(); if (now - lastChime < 140) return; lastChime = now;
      chime(parseInt(el.getAttribute('data-chime'), 10));
    }
    on(root, 'mouseover', chimeFrom); on(root, 'focusin', chimeFrom);

    /* ---- zone state: chips, label, mobile counter */
    var chips = qsa('.chip', root), barLbl = qs('#bar-lbl', root), ctr = qs('#ctr', root);
    function setZone(z) {
      if (z === S.zone && S.zoneSet) return; S.zone = z; S.zoneSet = true;
      chips.forEach(function (c) {
        if (parseInt(c.getAttribute('data-z'), 10) === z) c.setAttribute('aria-current', 'location'); else c.removeAttribute('aria-current');
      });
      if (barLbl) barLbl.textContent = '( Zone ' + pad(z, 2) + ' )';
      liveMark(true);
    }
    S.setZone = setZone;

    /* ---- top bar symbol: a small globe that turns with the page */
    var mk = qs('#mk-live', root), mm = mk ? qsa('.mm', mk) : [], mkPhase = 0;
    function liveMark(force) {
      if (!mm.length) return;
      for (var j = 0; j < 7; j++) {
        var a = (j * 11 + mkPhase) * D2R;
        var rx = 46 * Math.abs(Math.sin(a));
        mm[j].setAttribute('rx', rx.toFixed(2));
        mm[j].style.stroke = (j === S.zone - 1) ? ZONES[S.zone - 1].hex : '';
      }
    }

    /* ---- ruler */
    var ruler = qs('#ruler', root), needle = qs('#needle', root), odo = qs('#odo', root);
    var cols = odo ? qsa('.col > span', odo) : [], sfx = odo ? qs('.sfx > span', odo) : null;
    var odoLast = '';
    function setLon(lon) {
      S.lonNeedle = lon;
      if (!ruler || !needle) return;
      var w = ruler.clientWidth, x = (lon + 180) / 360 * w;
      needle.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
      var ow = odo.offsetWidth;
      odo.style.transform = 'translateX(' + clamp(x - ow / 2, 0, w - ow).toFixed(1) + 'px)';
      var r = Math.round(Math.abs(lon)), s = pad(r, 3);
      if (s !== odoLast) {
        odoLast = s;
        for (var i = 0; i < 3; i++) {
          var h = cols[i].firstElementChild ? cols[i].firstElementChild.offsetHeight : 22;
          cols[i].style.transform = 'translateY(' + (-parseInt(s.charAt(i), 10) * h) + 'px)';
        }
        var hh = sfx.firstElementChild ? sfx.firstElementChild.offsetHeight : 22;
        sfx.style.transform = 'translateY(' + (lon < 0 ? 0 : -hh) + 'px)';
      }
    }

    /* ---- chapter tracking, theme, needle, bar */
    var chapters = qsa('[data-ch]', root);
    var scrubs = [], lastY = 0, ticking = false;
    function metrics() {
      var rr = root.getBoundingClientRect(), vh = W.innerHeight;
      return { y: -rr.top, total: Math.max(1, rr.height - vh), vh: vh };
    }
    function sectionProgress(el) {
      var r = el.getBoundingClientRect(), vh = W.innerHeight;
      return clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
    }
    function viewProgress(el) {
      var r = el.getBoundingClientRect(), vh = W.innerHeight;
      return clamp((vh - r.top) / (vh + r.height), 0, 1);
    }
    S.sectionProgress = sectionProgress; S.viewProgress = viewProgress;
    function update() {
      ticking = false;
      var m = metrics(), y = m.y, dy = y - lastY;
      if (S.entered) {
        if (y > 120 && dy > 6) bar.classList.add('off');
        else if (dy < -6 || y <= 120) bar.classList.remove('off');
      }
      lastY = y;
      var p = clamp(y / m.total, 0, 1);
      // chapter under the middle of the viewport
      var mid = m.vh * 0.5, cur = null, i;
      for (i = 0; i < chapters.length; i++) {
        var r = chapters[i].getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) { cur = chapters[i]; break; }
      }
      if (cur) {
        var th = cur.getAttribute('data-theme') || 'light';
        if (root.getAttribute('data-theme') !== th) root.setAttribute('data-theme', th);
        var cz = parseInt(cur.getAttribute('data-zone'), 10) || 1;
        var cn = parseInt(cur.getAttribute('data-ch'), 10) || 0;
        if (!S.over) setZone(cz);
        if (cn !== S.chapter) { S.chapter = cn; if (ctr) ctr.textContent = pad(cn, 2) + ' / ' + pad(CHAPTERS, 2); }
      }
      if (!S.over) setLon(-180 + p * 360);
      mkPhase = p * 360; liveMark();
      for (i = 0; i < scrubs.length; i++) scrubs[i](m);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    on(W, 'scroll', onScroll, { passive: true, capture: true });
    on(W, 'resize', function () { onScroll(); });
    S.scrub = function (fn) { scrubs.push(fn); };
    // gallery and other sections take over the needle for a while
    S.override = function (zone) {
      if (zone) { S.over = zone; setZone(zone); setLon(ZONES[zone - 1].lon); }
      else { S.over = null; onScroll(); }
    };
    S.update = update;

    /* ---- reveals */
    var rvObs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.closest('.hero') && !S.entered) return; // wait until the gate opens
        el.classList.add('in'); rvObs.unobserve(el);
        if (el.hasAttribute('data-scramble') || el.querySelector('[data-scramble]')) scramble(el);
        qsa('[data-count]', el).concat(el.hasAttribute('data-count') ? [el] : []).forEach(countUp);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    function observeReveals() {
      qsa('[data-rv],[data-fade],[data-vr]', root).forEach(function (el) {
        if (el.hasAttribute('data-vr')) el.classList.add('vr');
        rvObs.observe(el);
      });
    }
    S.observeReveals = observeReveals;
    cleanups.push(function () { rvObs.disconnect(); });
    function scramble(host) {
      var els = host.hasAttribute('data-scramble') ? [host] : qsa('[data-scramble]', host);
      els.forEach(function (el) {
        if (el._scr) return; el._scr = true;
        var fin = el.textContent;
        if (S.rm) return;
        var t0 = performance.now();
        (function tick(now) {
          var p = (now - t0) / 500;
          if (p >= 1) { el.textContent = fin; return; }
          el.textContent = fin.replace(/[0-9]/g, function () { return String(Math.floor(Math.random() * 10)); });
          requestAnimationFrame(tick);
        })(t0);
      });
    }
    function countUp(el) {
      if (el._cnt) return; el._cnt = true;
      var target = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-suffix') || '', dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      var comma = el.getAttribute('data-comma') !== 'no';
      function fmt(v) { var s = v.toFixed(dec); if (comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return s + suf; }
      if (S.rm) { el.textContent = fmt(target); return; }
      var t0 = performance.now(), dur = 1400;
      (function tick(now) {
        var p = clamp((now - t0) / dur, 0, 1);
        el.textContent = fmt(target * easeTurn(p));
        if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(target);
      })(t0);
    }
    S.countUp = countUp;

    /* ---- numerals restack on hover or focus */
    qsa('[data-restack]', root).forEach(function (el) {
      var txt = el.textContent, out = '';
      el.setAttribute('aria-label', txt);
      for (var i = 0; i < txt.length; i++) {
        out += '<span class="rs-d" aria-hidden="true" style="--i:' + i + '"><span>' + txt.charAt(i) + '</span><span>' + txt.charAt(i) + '</span></span>';
      }
      el.innerHTML = out; el.classList.add('rs');
    });

    /* ---- meridian cursor */
    var cur = qs('#cur', root), curR = qs('#cur-r', root), curX = 0, curY = 0, curRaf = 0;
    if (cur) {
      on(D, 'pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        if (!S.fine || S.rm || !S.entered) return;
        curX = e.clientX; curY = e.clientY;
        if (!curRaf) curRaf = requestAnimationFrame(function () {
          curRaf = 0;
          cur.classList.add('on');
          cur.style.transform = 'translateX(' + curX + 'px)';
          var lon = -180 + curX / W.innerWidth * 360;
          curR.textContent = pad(Math.round(Math.abs(lon)), 3) + '°' + (lon < 0 ? 'W' : 'E');
          curR.style.top = clamp(curY + 18, 60, W.innerHeight - 60) + 'px';
          if (curX > W.innerWidth - 90) { curR.style.left = 'auto'; curR.style.right = '8px'; } else { curR.style.left = '8px'; curR.style.right = 'auto'; }
          var el = D.elementFromPoint(curX, curY), zc = el && el.closest ? el.closest('[data-cz]') : null;
          if (zc) cur.style.setProperty('--cc', 'var(--z' + zc.getAttribute('data-cz') + ')'); else cur.style.removeProperty('--cc');
        });
      });
      on(D.documentElement, 'mouseleave', function () { cur.classList.remove('on'); });
    }

    /* ---- marquee bands */
    var CITIES = [];
    ZONES.forEach(function (z) { z.cities.forEach(function (c) { CITIES.push({ n: c[0], z: z.n, lon: z.lon }); }); });
    qsa('.marq', root).forEach(function (b) {
      var track = qs('.mq-t', b), html = '', i;
      var off = parseInt(b.getAttribute('data-off') || '0', 10);
      var set = '';
      for (i = 0; i < CITIES.length; i++) {
        var c = CITIES[(i + off) % CITIES.length];
        set += '<span class="mq-i"><u class="mq-s z' + c.z + '"></u><b>' + c.n + '</b><i>' + fmtLon(c.lon) + '</i></span>';
      }
      track.innerHTML = '<span class="mq-set">' + set + '</span><span class="mq-set" aria-hidden="true">' + set + '</span>';
      on(b, 'click', function () {
        var pr = b.getAttribute('aria-pressed') === 'true';
        b.setAttribute('aria-pressed', pr ? 'false' : 'true');
      });
    });

    /* ---- mobile zones sheet */
    var sheet = qs('#sheet', root), zbtn = qs('#zones-btn', root);
    if (sheet && zbtn) {
      var sx0 = 0, sheetP = qs('.sheet-p', sheet);
      var openSheet = function () {
        sheet.hidden = false; page.setAttribute('inert', ''); zbtn.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(function () { sheet.classList.add('on'); qs('#sheet-x', sheet).focus(); });
      };
      var closeSheet = function (refocus) {
        sheet.classList.remove('on'); page.removeAttribute('inert'); zbtn.setAttribute('aria-expanded', 'false');
        setTimeout(function () { sheet.hidden = true; }, S.rm ? 0 : 260);
        if (refocus !== false) zbtn.focus();
      };
      on(zbtn, 'click', openSheet);
      on(qs('#sheet-x', sheet), 'click', function () { closeSheet(); });
      on(qs('.sheet-bg', sheet), 'click', function () { closeSheet(); });
      on(sheet, 'keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closeSheet(); } });
      qsa('a', sheet).forEach(function (a) { on(a, 'click', function () { closeSheet(false); }); });
      on(sheetP, 'touchstart', function (e) { sx0 = e.touches[0].clientY; }, { passive: true });
      on(sheetP, 'touchend', function (e) { var dy = e.changedTouches[0].clientY - sx0; if (dy > 70) closeSheet(); }, { passive: true });
    }

    /* ---------------------------------------------------- intro (loader + gate) */
    var intro = qs('#intro', root);
    function lock(v) {
      D.documentElement.classList.toggle('mer-lock', v);
      if (v) page.setAttribute('inert', ''); else page.removeAttribute('inert');
    }
    function finishIntro() {
      S.entered = true; lock(false);
      if (intro) intro.hidden = true;
      var h = qs('#h-hero', root); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
      qsa('.hero [data-fade],.hero [data-vr],.hero [data-rv]', root).forEach(function (el) { el.classList.add('in'); });
      onScroll();
    }
    function initIntro() {
      if (!intro) { S.entered = true; return; }
      lock(true);
      var ld = qs('#ld', root), gate = qs('#gate', root), num = qs('#ld-num', root), skip = qs('#ld-skip', root),
        enter = qs('#enter', root), lines = qsa('.ld-lines i', intro), pl = qs('#gate-pl', root), hint = qs('#gate-h', root),
        hl = qs('#half-l', root), hr = qs('#half-r', root), lineWrap = qs('.ld-lines', intro);
      var seen = false; try { seen = W.sessionStorage.getItem('meridian-intro') === '1'; } catch (e) { seen = false; }
      var stage = 'loader', done = false, ldRaf = 0;
      function showGate() {
        stage = 'gate'; ld.hidden = true; gate.hidden = false;
        lines.forEach(function (l) { l.classList.add('go'); l.classList.remove('flash'); });
        try { W.sessionStorage.setItem('meridian-intro', '1'); } catch (e) { /* storage unavailable */ }
        if (S.rm) hint.textContent = ''; else hint.textContent = ' ';
        try { enter.focus({ preventScroll: true }); } catch (e) { enter.focus(); }
      }
      function runLoader() {
        var t0 = performance.now(), dur = 1800, passed = [false, false, false, false, false, false, false];
        try { skip.focus({ preventScroll: true }); } catch (e) { skip.focus(); }
        (function tick(now) {
          if (stage !== 'loader') return;
          var p = clamp((now - t0) / dur, 0, 1), lon = -180 + 360 * easeTurn(p);
          num.textContent = pad(Math.round(Math.abs(lon)), 3) + '°' + (lon < 0 ? 'W' : 'E');
          for (var i = 0; i < 7; i++) {
            if (!passed[i] && lon >= ZONES[i].lon) {
              passed[i] = true; lines[i].classList.add('go', 'flash');
              (function (l) { setTimeout(function () { l.classList.remove('flash'); }, 380); })(lines[i]);
            }
          }
          if (p >= 1) { showGate(); return; }
          ldRaf = requestAnimationFrame(tick);
        })(t0);
      }
      function skipLoader() { if (stage !== 'loader') return; cancelAnimationFrame(ldRaf); showGate(); }
      on(skip, 'click', skipLoader);
      function openGate(points) {
        if (done) return; done = true; stage = 'open';
        var vw = W.innerWidth, vh = W.innerHeight;
        if (S.rm) { intro.classList.add('fade'); setTimeout(finishIntro, 160); return; }
        var q = points.slice().sort(function (a, b) { return a[1] - b[1]; });
        var step = Math.max(1, Math.ceil(q.length / 48)), r = [], i;
        for (i = 0; i < q.length; i += step) r.push(q[i]);
        r.push(q[q.length - 1]);
        var line = [[r[0][0], 0]].concat(r, [[r[r.length - 1][0], vh]]);
        var ps = line.map(function (p) { return Math.round(p[0]) + 'px ' + Math.round(p[1]) + 'px'; }).join(',');
        var left = 'polygon(0px 0px,' + ps + ',0px ' + vh + 'px)';
        var right = 'polygon(' + ps + ',' + vw + 'px ' + vh + 'px,' + vw + 'px 0px)';
        hl.style.clipPath = left; hr.style.clipPath = right;
        var pstr = line.map(function (p) { return Math.round(p[0]) + ',' + Math.round(p[1]); }).join(' ');
        [hl, hr].forEach(function (h) { var s = qs('svg', h); s.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh); qs('polyline', s).setAttribute('points', pstr); h.hidden = false; });
        intro.classList.add('split');
        gate.hidden = true; lineWrap.hidden = true;
        void intro.offsetWidth;
        intro.classList.add('open');
        setTimeout(finishIntro, 940);
      }
      // draw a line from top to bottom
      var pts = [], drawing = false;
      on(intro, 'pointerdown', function (e) {
        if (stage !== 'gate' || (e.target.closest && e.target.closest('button'))) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        drawing = true; pts = [[e.clientX, e.clientY]];
        try { intro.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        pl.setAttribute('points', pts.join(' ')); hint.textContent = ' ';
      });
      on(intro, 'pointermove', function (e) {
        if (!drawing) return;
        pts.push([e.clientX, e.clientY]);
        pl.setAttribute('points', pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '));
        var ys = pts.map(function (p) { return p[1]; }), ext = Math.max.apply(null, ys) - Math.min.apply(null, ys);
        var pc = Math.min(100, Math.round(ext / (W.innerHeight * 0.4) * 100));
        hint.textContent = pc >= 100 ? 'Release to enter' : 'Keep going: ' + pc + '%';
      });
      function endDraw(e, cancel) {
        if (!drawing) return; drawing = false;
        var ys = pts.map(function (p) { return p[1]; }), xs = pts.map(function (p) { return p[0]; });
        var ext = Math.max.apply(null, ys) - Math.min.apply(null, ys), spread = Math.max.apply(null, xs) - Math.min.apply(null, xs);
        if (!cancel && ext >= W.innerHeight * 0.4 && ext >= spread) openGate(pts);
        else { pl.setAttribute('points', ''); hint.textContent = cancel ? '' : 'Draw the full height, top to bottom'; }
      }
      on(intro, 'pointerup', function (e) { endDraw(e, false); });
      on(intro, 'pointercancel', function (e) { endDraw(e, true); });
      on(enter, 'click', function () { openGate([[W.innerWidth / 2, 0], [W.innerWidth / 2, W.innerHeight]]); });
      on(intro, 'keydown', function (e) {
        if (e.key === 'Escape' && stage === 'loader') { e.preventDefault(); skipLoader(); }
        else if (e.key === 'Enter' && stage === 'gate' && e.target === intro) { e.preventDefault(); enter.click(); }
      });
      intro.setAttribute('tabindex', '-1');
      if (S.rm || seen) showGate(); else runLoader();
    }

    /* ------------------------------------------------------------- hero globe */
    function initHero() {
      var cv = qs('#hero-cv', root); if (!cv) return;
      var g = new Globe(cv, { mode: 'dots', lon0: -87, tilt: 18, scale: 0.42 });
      var wrap = qs('#hero-globe', root);
      var hcN = qs('#hc-n', root), hcS = qs('#hc-s', root), hcC = qs('#hc-c', root), hcStamp = qs('#hc-stamp', root);
      var st = { vel: 5.5, auto: 5.5, drag: false, idle: 9, lx: 0, lt: 0, zi: -1 };
      var off = 0;
      function caption(zi) {
        if (zi === st.zi) return; st.zi = zi; var z = ZONES[zi];
        hcStamp.className = 'stamp z' + z.n; hcN.textContent = pad(z.n, 2);
        hcS.textContent = 'Zone ' + pad(z.n, 2) + ' · ' + fmtLon(z.lon);
        hcC.textContent = z.cities[0][0] + ' ' + fmtLat(z.cities[0][1]) + ' · ' + z.cities[1][0] + ' ' + fmtLat(z.cities[1][1]);
        g.focus = zi;
      }
      function view() { return g.lon0 + off; }
      var rec = watch(wrap, function (dt, now) {
        g.step(dt, now);
        if (!S.rm && !g.anim && !st.drag) {
          st.idle += dt;
          if (st.idle < 3) { g.lon0 += st.vel * dt; st.vel *= Math.pow(0.9, dt * 60); }
          else { st.vel += (st.auto - st.vel) * Math.min(1, dt * 1.2); g.lon0 += st.vel * dt; }
        }
        if (!S.rm) { var m = metrics(); off = clamp(m.y, 0, m.vh) / m.vh * 46; } else off = 0;
        caption(nearestZone(view()));
        g.draw(view());
      });
      rec.enter = function () { g.resize(); };
      on(W, 'resize', function () { g.resize(); if (S.rm) g.draw(view()); });
      // drag, fine pointers only
      on(cv, 'pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0 || S.rm) return;
        st.drag = true; st.lx = e.clientX; st.lt = performance.now(); g.anim = null; st.vel = 0;
        try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      });
      on(cv, 'pointermove', function (e) {
        if (!st.drag) return;
        var dx = e.clientX - st.lx, now = performance.now(), dt = Math.max(1, now - st.lt) / 1000;
        var deg = -dx / g.R / D2R; g.lon0 += deg;
        st.vel = lerp(st.vel, deg / dt, 0.5); st.lx = e.clientX; st.lt = now; st.idle = 0;
      });
      function up() { if (!st.drag) return; st.drag = false; st.idle = 0; st.vel = clamp(st.vel, -240, 240); }
      on(cv, 'pointerup', up); on(cv, 'pointercancel', up);
      function go(dir) {
        var zi = nearestZone(view()), ni = (zi + dir + 7) % 7;
        st.idle = 0; st.vel = 0;
        // land so the chosen meridian faces the viewer once the scroll offset is applied
        g.rotateTo(ZONES[ni].lon - off, S.rm ? 0 : 1400);
        if (S.rm) { caption(ni); g.draw(view()); }
        chime(ni + 1);
      }
      on(qs('#hz-prev', root), 'click', function () { go(-1); });
      on(qs('#hz-next', root), 'click', function () { go(1); });
      // the reduced-motion globe is a still: draw once on load and after resize
      if (S.rm) { caption(0); g.draw(view()); }
      D.fonts && D.fonts.ready && D.fonts.ready.then(function () { if (S.rm) g.draw(view()); });
    }

    /* ---------------------------------------------------------------- go */
    S.ns = { Globe: Globe, ZONES: ZONES, qs: qs, qsa: qsa, clamp: clamp, lerp: lerp, pad: pad, fmtLon: fmtLon, fmtLat: fmtLat, wrap180: wrap180, easeTurn: easeTurn, easeLine: easeLine, on: on, watch: watch, nearestZone: nearestZone, metrics: metrics, D2R: D2R, TAU: TAU };
    var parts = W.MeridianParts || [];
    initIntro();
    initHero();
    parts.forEach(function (fn) { try { fn(root, S); } catch (e) { if (W.console) console.error('[meridian] part failed', e); } });
    observeReveals();
    setZone(1); update();
    return { destroy: function () { cleanups.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); }, state: S };
  }

  W.MeridianParts = W.MeridianParts || [];
  W.MeridianPage = { mount: mount };
  /* ============================================================ chapters 01 and 02 */
  W.MeridianParts.push(function (root, S) {
    var N = S.ns, qs = N.qs, qsa = N.qsa, clamp = N.clamp, on = N.on;

    /* waffle charts: 100 dots, filled one by one */
    qsa('svg[data-waffle]', root).forEach(function (svg) {
      var n = parseInt(svg.getAttribute('data-waffle'), 10), out = '';
      for (var k = 0; k < 100; k++) {
        out += '<circle cx="' + (5 + 10 * (k % 10)) + '" cy="' + (5 + 10 * Math.floor(k / 10)) + '" r="3.7" class="' + (k < n ? 'f' : '') + '" style="--i:' + k + '"></circle>';
      }
      svg.innerHTML = out;
    });

    /* sheet tabs */
    qsa('[data-tabs]', root).forEach(function (host) {
      var tabs = qsa('[role="tab"]', host), panels = tabs.map(function (t) { return qs('#' + t.getAttribute('aria-controls'), host); });
      function pick(i, focus) {
        tabs.forEach(function (t, j) {
          var sel = i === j; t.setAttribute('aria-selected', sel ? 'true' : 'false'); t.tabIndex = sel ? 0 : -1;
          panels[j].hidden = !sel;
        });
        if (focus) tabs[i].focus();
      }
      tabs.forEach(function (t, i) {
        on(t, 'click', function () { pick(i, false); });
        on(t, 'keydown', function (e) {
          var k = e.key, n = tabs.length, j = -1;
          if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % n;
          else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + n) % n;
          else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1;
          if (j >= 0) { e.preventDefault(); pick(j, true); }
        });
      });
    });

    /* cliche tiles: the red line draws as the tile crosses the screen */
    var tiles = qsa('.tile[data-strike]', root);
    if (tiles.length) {
      if (S.rm) tiles.forEach(function (t) { t.style.setProperty('--p', '1'); });
      S.scrub(function () {
        if (S.rm) return;
        tiles.forEach(function (t) {
          var p = clamp((S.viewProgress(t) - 0.34) / 0.2, 0, 1), s = p.toFixed(3);
          if (t._p !== s) { t._p = s; t.style.setProperty('--p', s); }
        });
      });
    }

    /* dot-grid world map, land drawn from a coarse mask of outlines */
    var map = qs('#map', root), cv = qs('#map-cv', root);
    if (!map || !cv) return;
    var LAND = [
      // Eurasia
      [-9,37,-9,43.5,-1.8,43.4,-1.5,46.2,-4.7,48.4,-1.5,49.7,1.5,50.8,4,52,8,53.6,8.3,55.5,10.5,57.6,10.6,56,9.9,54.8,12,54.2,14.2,54,19,54.4,21,56,21.3,57.5,24,57.3,24.3,59.3,29,59.9,23,60,21.5,61,21.5,63,25,65.4,22,65.7,19,63.2,17.3,61,18.6,59.5,16.6,57.3,16.2,56.2,13.2,55.4,12.7,56.5,11.2,58.3,8.3,58.3,5.7,59,5,61,7,63,10.6,64.6,13.3,67,16.5,68.6,20,70,25,71,31,70.2,33.5,69.3,36,66.4,33.5,66.5,34,64.8,37,64.3,40,64.7,44,66.4,44,68.2,52,68.4,59,69.2,67,69,69,72.5,73,72.8,80,73.5,87.5,75,95,76,104,77.7,113,75,113.5,73.5,125,73.5,133,71.5,141,72.7,150,71.5,160,70.3,170,70,180,69,180,65.5,177,64.6,171,63,166,60.5,163,59.7,162,57.5,160.5,54.7,157.5,51.5,156.3,52.8,156.2,56,158,58,160,61.4,155,59.4,150,59.4,143,59.4,139.5,57.3,136,54.6,139.6,54.2,141.3,52.3,140.4,49.5,138,46.5,135.5,43.2,131,42.5,129.5,41,128,39.5,129.4,37,129,35.2,126.8,34.6,126.3,36,125.2,37.8,125,39.6,121.5,39,122.2,40.5,121.2,40.8,119,39.2,118,38.5,119,37.2,122.5,37.4,120,35.5,121,32,122,30,121.5,28,119.6,25.5,117,23.4,113.5,22.2,110.5,21,109.5,21.5,108.3,21.6,106.7,20.1,105.8,19.2,107,17,109.3,13.5,109.2,11.5,106.7,10,105,8.7,104.8,10.5,103.2,10.6,102.5,12.5,100.8,12.7,99.9,10.7,100.4,8.4,101.7,6.9,103.4,4.5,103.5,2.4,104.2,1.3,101.8,2.7,100.4,5.4,98.9,8,98.4,10.5,98.7,12.5,97.7,16.5,94.5,16,94.2,18.8,92.4,21.5,91.5,22.6,90,22.2,88,21.6,86.6,20.3,84.7,19.3,82.2,16.5,80.2,15.7,80.2,13,79.8,10.6,78.2,8.9,77.5,8.1,76.2,9.6,74.9,12.3,73.4,16.5,72.7,20.1,72.6,21.2,70.4,20.9,70,22.5,68.7,23.5,67,24.8,64.4,25.2,61.7,25.2,58.5,25.5,56.8,27.1,54.3,26.6,51.5,27.9,50,30,48.5,30,48.6,28,50.2,26.5,51.5,25.2,52,24.2,54,24.2,56,25.5,56.3,26.3,56.5,24.4,58.5,23.5,59.8,22.5,57.7,19,55.5,17.2,52.2,16,48.7,14.1,45,12.8,43.3,12.7,42.8,15,42.9,16.7,41.2,19.5,39,22,38.5,24.3,35.5,27.9,34.9,29.5,34.2,31.3,35.2,33.5,36,35.8,36.2,36.6,34,36.2,31,36.6,29.4,36.6,27.4,37,26.3,39.5,26.2,40.1,29,41.1,31.5,41.2,35,42,38,41,41.5,41.5,41.7,43.5,38,44.8,35.5,45.3,33.5,44.4,32.5,45.5,30.5,46.5,29.6,45.3,28.7,44,28,43.2,27.7,42.2,28,41.7,26.3,40.9,24,40.6,23,40.2,22.9,38.5,23.6,37.9,22.7,36.5,21.6,37,21.2,38.4,20.2,39.5,19.4,41,19,42.4,16,43.5,15.5,43.9,13.7,45.4,12.3,45.3,12.6,44.1,14,42.6,16,41.9,16.5,40.4,18.5,40.1,17.2,39.3,16.5,38.4,15.7,38,16,39,15.6,40,14,40.8,12.5,41.5,10.5,43,9,44.2,7.5,43.8,5,43.3,3.2,43.2,3.2,42,0.7,40.5,-0.3,39.2,0.2,38.7,-1,37.6,-2.2,36.7,-4.5,36.5,-5.6,36,-6.4,36.8,-7.5,37.2,-9,37],
      // North America
      [-168,66,-163,69,-156,71.3,-141,69.7,-128,70.2,-115,68,-100,68,-95,72,-88,68,-82,68,-80,63.5,-94,60,-94,58.5,-92,57,-85,55.3,-82,52.8,-79.5,51.5,-79,54,-77,58,-78,62,-73,62,-70,60,-65,60,-62,57,-56,52.5,-60,50,-66,50,-64,47.5,-61,46,-66,44,-70,43.5,-70,41.7,-74,40.5,-76,37,-75.5,35,-81,31.5,-80,26,-82,26.5,-82.7,28,-84,30,-89,30.2,-94,29.5,-97,26,-97.5,22,-96,19,-94,18.2,-91,18.7,-90.5,21,-87,21.5,-88,17.5,-88,15.8,-83.3,15,-83.5,11,-82,9,-80,9.2,-77.8,8.5,-77.5,7.6,-80,7.3,-81.5,7.7,-83,8.4,-85.7,10,-87,13,-91,14,-94,16,-97,15.8,-101,17.5,-105.5,20,-105.5,23,-109,25.5,-109.5,27,-112,29.5,-114.7,31.7,-114.7,30,-112.5,28.5,-110,23.5,-110,22.9,-112,24.5,-115,28,-116.5,31.5,-117,32.5,-118.5,34,-120.6,34.5,-122.5,37.5,-124.2,40.3,-124.5,43,-124,46.2,-124.7,48.4,-123,48.5,-124,49.5,-127,51,-130,54.5,-134,58,-138,59.5,-144,60,-148,60,-152,59,-154,57.5,-158,56,-162,55,-160,58.5,-165,60.5,-166,62.5,-161,64.5,-166,65.5,-168,66],
      // South America
      [-77.4,8.6,-75.5,10.8,-72,12,-71.3,11.2,-68,10.6,-64,10.6,-61.5,10.5,-60,8.5,-57,6,-52,5,-51,3.5,-50,1.5,-48.5,-0.5,-44.5,-2.4,-40,-2.9,-37,-4.8,-35,-6,-34.8,-8,-36.5,-10.5,-39,-13.5,-39,-17.5,-40.5,-20.5,-42,-22.9,-45,-23.7,-48.5,-26,-48.7,-28.5,-52,-32,-53.5,-33.7,-55,-34.9,-57,-34.5,-56,-36,-57.5,-38,-62,-39,-65,-41,-64,-43,-65.5,-45,-67.5,-46.5,-66,-48,-69,-51,-68.5,-53,-67,-55.2,-70,-55,-74,-52,-75.5,-48,-73.7,-44,-73.5,-40,-73.5,-37,-71.6,-32,-71.5,-28,-70.3,-23,-70.2,-18.5,-75,-15,-76.5,-13.5,-79,-8,-81,-6,-81,-4.5,-80,-2.7,-80.9,-2,-80,0.5,-78.8,1.7,-77.5,4,-77.4,6.5,-77.4,8.6],
      // Africa
      [-17,21,-16,24,-13,27.5,-9.7,29.5,-9.7,31,-5.9,35.8,-2,35.2,3,36.8,10,37.2,11,35,10.3,33.8,11.5,33,15.3,32.3,19,30.3,20.1,31.2,23,32.6,25,31.7,29,30.9,31.2,31.6,32.5,31.1,34.2,31.3,34.9,29.5,33.6,27.9,32.5,29.9,32.6,28.5,34,26.5,35.5,24,37.2,21,37.4,18.3,39.6,15.5,41.5,13.5,43.1,12.7,44.5,10.4,47.5,11.2,51.2,11.8,50,9,48,5,45.5,2,42,-1,40.2,-3,39.2,-5,39.4,-8,40.5,-10.5,40.6,-16,38.5,-20,35,-24.5,32.8,-26,32.9,-28.5,30.5,-31.5,27.5,-33.5,25.5,-34,22,-34.2,20,-34.8,18.4,-34,17.8,-31,16.4,-28.6,14.5,-22.5,11.8,-17.2,11.7,-14,13.5,-11.5,13,-8.5,12,-5.7,9.7,-2.5,9.4,0.5,9.7,3.9,8.7,4.5,6,4.3,4,6.4,1,6,-2,4.8,-4.5,5.2,-7.5,4.4,-10,6,-12.5,7.5,-13.5,9.5,-15.5,11,-16.7,12.5,-17.4,14.7,-16.5,16.5,-16.3,19.5,-17,21],
      // Australia
      [113.5,-22,114,-26,115,-30,115,-34,118,-35,123,-34,126,-32.3,131,-31.5,134,-32.7,135,-34,138,-35.6,140,-38,144,-38.5,146.5,-39.1,150,-37.5,151,-34,153,-30,153.3,-27,151,-23.5,149,-21,146,-18.5,145.4,-15,143.5,-13.7,142.5,-10.7,141.5,-13,141.5,-16.5,139.5,-17.5,137,-15.7,135.5,-15,136.7,-12.2,132.5,-11.4,130.5,-12.4,129.5,-15,125.5,-14.3,123,-17,122,-18.5,118,-20.5,114,-22,113.5,-22],
      // Greenland, Baffin, Arctic islands
      [-73,78,-68,80.5,-40,83.5,-30,83.5,-20,82,-19,78,-22,72,-25,70,-32,68,-40,65,-43,60,-48,61,-52,65,-55,68,-56,72,-62,76,-73,78],
      [-80,73.5,-72,71.5,-67,69,-62,66.5,-65,63,-72,63.5,-78,64.5,-73,68,-82,69.5,-89,73.5,-80,73.5],
      [-118,72,-105,73,-101,70,-113,68.5,-118,70,-118,72],
      [-90,80,-62,82.5,-75,78.5,-90,76.5,-90,80],
      [-100,77,-92,77.5,-96,74.5,-104,75,-100,77],
      [-24,65.5,-22,66.4,-16,66.5,-13.5,65,-19,63.4,-23,64,-24,65.5],
      [11,78.5,17,80.2,27,80,20,77,11,78.5],
      [52,71,57,75,68,77,60,73.5,55,70.7,52,71],
      // British Isles
      [-5.5,50,1.5,51,1.7,52.7,-0.5,54,-1.5,55.5,-2.5,56.5,-2,57.6,-4,58.5,-6,58.3,-5.7,56.5,-5,55,-3,54.8,-3,53.4,-4.7,52.8,-5.2,51.7,-3.5,51.3,-5.5,50],
      [-10,52,-6,52,-6,54.5,-8,55.2,-10,54,-10,52],
      // Japan, Sakhalin, Taiwan, Hainan, Philippines
      [130.8,33.5,132,34.5,135,35.5,137,37,139.5,38,140,40.5,141.5,41.5,142,39.5,141,37,140.8,35.5,139.5,35,137,34.6,135.5,33.5,132.5,33.5,130.8,33.5],
      [140,42,141.5,45.4,145.5,43.5,143.3,42,140,42],
      [129.7,33,131.5,33.5,131.7,31.4,130.2,31,129.7,33],
      [142,46,143.5,49,143,54,142,53,142.5,49.5,142,46],
      [120.2,22.5,121.9,25,121,25.2,120,23.5,120.2,22.5],
      [108.7,19.7,110.5,20,110,18.4,108.7,19.7],
      [120,18.5,122.3,18.3,122,14.5,124,13,121,13.5,120.5,15,120,18.5],
      [122,7,126.5,9.5,126.5,6.5,125,5.8,123.5,7,122,7],
      [79.8,9.7,81.8,7.5,80.2,6,79.8,9.7],
      // maritime southeast Asia
      [109,1.5,110,2,113,3.5,116,6.5,119,5,117,1,116.5,-3.8,114,-4,110.5,-3,109,-1,109,1.5],
      [95.2,5.5,97.5,5.2,100.4,2,104,-1.5,106,-3,105.8,-5.8,102.3,-4,98.5,0.5,95.2,5.5],
      [105.5,-6.5,108,-6.3,111,-6.5,114.5,-7.7,114.4,-8.7,110,-8.3,106,-7.4,105.5,-6.5],
      [119.5,-5.5,120.5,-2.8,121.5,-1,123,0.5,125,1.5,124.5,0,122,-0.8,122.5,-3,121.5,-4.5,120.5,-5.5,119.5,-5.5],
      [131,-1,134.5,-0.7,138,-1.6,141,-2.6,145,-4.8,147.5,-6,147.6,-8.4,143.5,-8.8,141,-9.1,138.5,-8.3,137.8,-5,134,-3.9,132,-2.8,131,-1],
      // Madagascar, New Zealand, Tasmania, Caribbean, Sicily, Sardinia
      [43.5,-16,44.5,-15,49.5,-12,50.5,-15.5,49.5,-19.5,47.5,-24.5,45,-25.5,43.5,-22,44.3,-19,43.8,-16.5,43.5,-16],
      [172.7,-34.5,175,-36.5,178.5,-37.7,177,-39.3,175.3,-41.5,173.7,-39.3,174.5,-37,172.7,-34.5],
      [172.7,-40.6,174.3,-41.7,174,-43.5,171,-44.5,168.5,-46.6,166.5,-46,168.5,-44,171.5,-41.5,172.7,-40.6],
      [144.7,-40.7,148.3,-40.9,148,-43.2,146,-43.6,144.7,-40.7],
      [-85,22,-82,23,-77,21.7,-74.2,20.2,-77.5,20,-80,21.6,-85,22],
      [-74.4,18.5,-72,19.9,-68.5,18.5,-71,17.7,-74.4,18.5],
      [12.5,38.1,15.6,38.2,15,36.7,12.5,38.1],
      [8.2,41,9.7,41,9.5,39,8.4,39,8.2,41]
    ];
    var HOLES = [[47,45,50,46.5,53,46.8,53.5,44,51,41,53.5,40,54,37.5,50,37,49,38.5,49,41,47.5,43,47,45]];
    function inside(poly, x, y) {
      var c = false, n = poly.length, i, j;
      for (i = 0, j = n - 2; i < n; j = i, i += 2) {
        var xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    }
    var cells = [], i, j, k;
    for (j = 0; j < 47; j++) {
      var lat = 82.5 - 3 * j;
      for (i = 0; i < 120; i++) {
        var lon = -178.5 + 3 * i, land = false;
        for (k = 0; k < LAND.length && !land; k++) if (inside(LAND[k], lon, lat)) land = true;
        for (k = 0; k < HOLES.length && land; k++) if (inside(HOLES[k], lon, lat)) land = false;
        if (land) cells.push([(lon + 180) / 360, (84 - lat) / 142]);
      }
    }
    S.mapCells = cells.length;
    function drawMap() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, W.devicePixelRatio || 1);
      var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var rad = Math.max(1.1, w / 120 * 0.27);
      ctx.fillStyle = '#111111'; ctx.beginPath();
      for (var q = 0; q < cells.length; q++) { var x = cells[q][0] * w, y = cells[q][1] * h; ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, N.TAU); }
      ctx.fill();
    }
    drawMap();
    on(W, 'resize', drawMap);
    var lines = qsa('.mline', map), groups = qsa('.mz', map);
    function paintMap(q) {
      groups.forEach(function (g, gi) {
        var d = clamp(q * 7 - gi, 0, 1);
        lines[gi].style.setProperty('--d', d.toFixed(3));
        var cs = qsa('.mc', g);
        cs.forEach(function (c, ci) { c.classList.toggle('on', d >= 0.6 + ci * 0.25); });
      });
    }
    if (S.rm) paintMap(1);
    else { paintMap(0); S.scrub(function () { paintMap(clamp((S.viewProgress(map) - 0.3) / 0.38, 0, 1)); }); }
  });
  /* ============================================================ chapter 03 */
  W.MeridianParts.push(function (root, S) {
    var N = S.ns, qsa = N.qsa, on = N.on;
    qsa('.hex', root).forEach(function (b) {
      on(b, 'click', function () {
        var hex = b.getAttribute('data-copy');
        S.copy(hex, function (ok) { S.toast(ok ? 'Copied' : 'Copy blocked. The value is ' + hex); });
      });
    });
  });
  /* ============================================================ chapter 04 */
  W.MeridianParts.push(function (root, S) {
    var N = S.ns, qs = N.qs, qsa = N.qsa, clamp = N.clamp, on = N.on, Z = N.ZONES;

    /* directions: rationale opens on hover or focus, and on tap; tabs on small screens */
    var dirBs = qsa('.dir-b', root);
    dirBs.forEach(function (b) {
      on(b, 'click', function () {
        var open = b.getAttribute('aria-expanded') === 'true';
        dirBs.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
    });
    var dts = qsa('[data-dt]', root);
    dts.forEach(function (t) {
      on(t, 'click', function () {
        var id = 'dir-' + t.getAttribute('data-dt');
        dts.forEach(function (o) { o.setAttribute('aria-pressed', o === t ? 'true' : 'false'); });
        qsa('.dir', root).forEach(function (d) { d.classList.toggle('on', d.id === id); });
      });
    });

    /* construction: four callouts draw in as the section scrolls */
    var cons = qs('#cons', root);
    if (cons) {
      var steps = qsa('[data-step]', cons), shown = 0;
      var mark = function (n) {
        if (n === shown) return; shown = n;
        steps.forEach(function (el) { el.classList.toggle('on', parseInt(el.getAttribute('data-step'), 10) <= n); });
      };
      if (S.rm) mark(4);
      else S.scrub(function () {
        var p = S.sectionProgress(cons);
        mark(p > 0.8 ? 4 : p > 0.58 ? 3 : p > 0.34 ? 2 : p > 0.1 ? 1 : 0);
      });
    }

    /* mini globe beside the zone versions */
    var mcv = qs('#mini-cv', root);
    if (mcv) {
      var mini = new N.Globe(mcv, { mode: 'lines', lon0: Z[0].lon, tilt: 16, scale: 0.44, cities: false });
      mini.focus = 0; mini.amt[0] = 1;
      var mrec = N.watch(mcv, function (dt, now) { mini.step(dt, now); mini.draw(); });
      mrec.enter = function () { mini.resize(); };
      var turn = function (i) {
        mini.focus = i; mini.rotateTo(Z[i].lon, S.rm ? 0 : 900);
        if (S.rm) { for (var k = 0; k < 7; k++) mini.amt[k] = k === i ? 1 : 0; mini.draw(); }
      };
      qsa('.zv', root).forEach(function (b) {
        var i = parseInt(b.getAttribute('data-zv'), 10);
        on(b, 'mouseenter', function () { turn(i); });
        on(b, 'focus', function () { turn(i); });
        on(b, 'click', function () { turn(i); });
      });
      on(W, 'resize', function () { mini.resize(); if (S.rm) mini.draw(); });
      if (S.rm) mini.draw();
    }

    /* misuse tiles flip to the fix */
    qsa('.mu', root).forEach(function (b) {
      on(b, 'click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
    });

    /* animated globe */
    var acv = qs('#ag-cv', root);
    if (acv) {
      var g = new N.Globe(acv, { mode: 'lines', lon0: Z[0].lon, tilt: 18, scale: 0.42 });
      g.focus = 0; g.amt[0] = 1;
      var btns = qsa('.agb', root), cap = qs('#ag-cap', root), pause = qs('#ag-pause', root);
      var idx = 0, playing = !S.rm, timer = 0, vis = false;
      var pick = function (i, user) {
        idx = i; g.focus = i; g.rotateTo(Z[i].lon, S.rm ? 0 : 1400);
        btns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
        cap.textContent = 'Zone ' + N.pad(i + 1, 2) + ' · ' + Z[i].name + ' · ' + N.fmtLon(Z[i].lon);
        if (S.rm) { for (var k = 0; k < 7; k++) g.amt[k] = k === i ? 1 : 0; g.draw(); }
        if (user) S.chime(i + 1);
      };
      var arm = function () {
        clearTimeout(timer);
        if (playing && vis) timer = setTimeout(function () { pick((idx + 1) % 7, false); arm(); }, 2000);
      };
      var setPlay = function (v) {
        playing = v; pause.setAttribute('aria-pressed', v ? 'false' : 'true');
        pause.textContent = v ? 'Pause' : 'Play'; arm();
      };
      pause.textContent = playing ? 'Pause' : 'Play'; pause.setAttribute('aria-pressed', playing ? 'false' : 'true');
      btns.forEach(function (b, i) { on(b, 'click', function () { setPlay(false); pick(i, true); }); });
      on(pause, 'click', function () { setPlay(!playing); });
      var arec = N.watch(acv, function (dt, now) { g.step(dt, now); g.draw(); });
      arec.enter = function () { g.resize(); vis = true; arm(); };
      var vio = new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; if (!vis) clearTimeout(timer); else arm(); }, { threshold: 0.2 });
      vio.observe(acv);
      on(W, 'resize', function () { g.resize(); if (S.rm) g.draw(); });
      if (S.rm) g.draw();
    }
  });
  /* ============================================================ chapter 05 */
  W.MeridianParts.push(function (root, S) {
    var N = S.ns, qs = N.qs, qsa = N.qsa, clamp = N.clamp, on = N.on, Z = N.ZONES;
    var gal = qs('#gal', root); if (!gal) return;
    var gs = qs('#gal-s', root), gt = qs('#gal-t', root), items = qsa('.gp-i', gt), n = items.length;
    var btns = qsa('.gp', gt), cnt = qs('#gal-n', root), page = qs('#page', root);
    var small = W.matchMedia('(max-width: 640px)');
    var idx = -1, travel = 0;

    function layout() {
      var vh = W.innerHeight;
      if (small.matches) { gal.style.height = ''; gt.style.transform = ''; return; }
      var ph = Math.min(vh * 0.7, (W.innerWidth - 80) * 1.5), pw = ph * 2 / 3, gap = 56;
      gal.style.setProperty('--ph', ph + 'px'); gal.style.setProperty('--pw', pw + 'px'); gal.style.setProperty('--gap', gap + 'px');
      travel = (n - 1) * (pw + gap);
      gal.style.height = Math.round(vh + travel) + 'px';
    }
    function setActive(i, chimeIt) {
      if (i === idx) return;
      idx = i;
      items.forEach(function (it, j) { it.classList.toggle('act', j === i); });
      cnt.textContent = (i + 1) + ' of ' + n;
      var z = parseInt(btns[i].getAttribute('data-z'), 10);
      if (!small.matches) {
        if (z > 0) { S.override(z); if (chimeIt) S.chime(z); }
        else if (S.over) S.override(null);
      }
    }
    function pinned() {
      var r = gal.getBoundingClientRect();
      return r.top <= 1 && r.bottom >= W.innerHeight - 1;
    }
    function galTop() { return gal.getBoundingClientRect().top + W.pageYOffset; }
    function goTo(i) {
      i = clamp(i, 0, n - 1);
      if (small.matches) {
        var it = items[i]; gt.scrollTo({ left: it.offsetLeft - (gt.clientWidth - it.offsetWidth) / 2, behavior: S.rm ? 'auto' : 'smooth' });
        return;
      }
      var y = galTop() + (i / (n - 1)) * travel;
      W.scrollTo({ top: y, behavior: S.rm ? 'auto' : 'smooth' });
    }
    layout();
    on(W, 'resize', function () { layout(); S.update(); });
    S.scrub(function () {
      if (small.matches) return;
      var p = S.sectionProgress(gal);
      gt.style.transform = 'translate3d(' + (-p * travel).toFixed(1) + 'px,0,0)';
      var i = Math.round(p * (n - 1));
      if (pinned() || (p > 0 && p < 1)) { setActive(i, true); }
      else { if (S.over && idx >= 0) S.override(null); idx = -1; cnt.textContent = (p >= 1 ? n : 1) + ' of ' + n; items.forEach(function (it, j) { it.classList.toggle('act', j === (p >= 1 ? n - 1 : 0)); }); }
    });
    items.forEach(function (it, j) { it.classList.toggle('act', j === 0); });
    // small screens: the counter follows the swipe
    on(gt, 'scroll', function () {
      if (!small.matches) return;
      var c = gt.scrollLeft + gt.clientWidth / 2, best = 0, bd = 1e9;
      items.forEach(function (it, j) { var d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - c); if (d < bd) { bd = d; best = j; } });
      cnt.textContent = (best + 1) + ' of ' + n; idx = best;
      items.forEach(function (it, j) { it.classList.toggle('act', j === best); });
    }, { passive: true });
    on(qs('#gal-prev', root), 'click', function () { goTo((idx < 0 ? 0 : idx) - 1); });
    on(qs('#gal-next', root), 'click', function () { goTo((idx < 0 ? 0 : idx) + 1); });
    // keyboard focus on a poster brings it to the middle
    on(gt, 'focusin', function (e) {
      var b = e.target.closest ? e.target.closest('.gp') : null; if (!b) return;
      gs.scrollLeft = 0;
      if (!small.matches) { var j = btns.indexOf(b); if (j !== idx) goTo(j); }
    });

    /* lightbox */
    var lb = qs('#lb', root), use = qs('#lb-use', root), lsvg = qs('#lb-svg', root), lcap = qs('#lb-c', root);
    var lbx = qs('#lb-x', root), lbi = 0, opener = null;
    function render() {
      var b = btns[lbi];
      use.setAttribute('href', b.querySelector('use').getAttribute('href'));
      lsvg.setAttribute('aria-label', b.querySelector('svg').getAttribute('aria-label'));
      var parts = []; qs('.gp-c', items[lbi]).childNodes.forEach(function (nd) { if (nd.nodeType === 3) parts.push(nd.nodeValue.trim()); });
      lcap.textContent = parts.join(' — ');
      var z = parseInt(b.getAttribute('data-z'), 10); if (z > 0) S.chime(z);
    }
    function openLb(i, op) { lbi = i; opener = op; lb.hidden = false; page.setAttribute('inert', ''); render(); lbx.focus(); }
    function closeLb() { lb.hidden = true; page.removeAttribute('inert'); if (opener) { try { opener.focus({ preventScroll: true }); } catch (e) { opener.focus(); } } }
    btns.forEach(function (b, j) { on(b, 'click', function () { openLb(j, b); }); });
    on(qs('#lb-prev', root), 'click', function () { lbi = (lbi - 1 + n) % n; render(); });
    on(qs('#lb-next', root), 'click', function () { lbi = (lbi + 1) % n; render(); });
    on(lbx, 'click', closeLb);
    on(qs('.lb-bg', lb), 'click', closeLb);
    on(lb, 'keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); lbi = (lbi - 1 + n) % n; render(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); lbi = (lbi + 1) % n; render(); }
      else if (e.key === 'Tab') {
        var f = qsa('button', lb), first = f[0], lastb = f[f.length - 1];
        if (e.shiftKey && D.activeElement === first) { e.preventDefault(); lastb.focus(); }
        else if (!e.shiftKey && D.activeElement === lastb) { e.preventDefault(); first.focus(); }
      }
    });
  });
  /* ============================================================ chapter 06 */
  W.MeridianParts.push(function (root, S) {
    var N = S.ns, qs = N.qs, qsa = N.qsa, on = N.on;
    var cat = qs('#cat', root); if (!cat) return;
    var book = qs('#book', root), leaves = qsa('.leaf', book), win = qs('#cat-win', root);
    var st = qs('#cat-st', root), live = qs('#cat-live', root), ths = qsa('.th', cat);
    var small = W.matchMedia('(max-width: 640px)');
    var names = ['Cover', 'Contents', 'Essay', 'Zone 01', 'Zone 03', 'Zone 05', 'Zone 07', 'Artist index', 'Colophon'];
    var t = 0, side = 'R', opened = false;
    var front = leaves.map(function (l) { return qs('.fr', l); }), back = leaves.map(function (l) { return qs('.bk', l); });
    function zFor(i) { return i < t ? i + 1 : 9 - i; }
    function faces() {
      front.concat(back).forEach(function (f) { f.setAttribute('aria-hidden', 'true'); f.setAttribute('inert', ''); });
      function show(f) { f.removeAttribute('aria-hidden'); f.removeAttribute('inert'); }
      if (t === 0) show(front[0]);
      else {
        if (!small.matches || side === 'L') show(back[t - 1]);
        if (t <= 8 && (!small.matches || side === 'R')) show(front[t]);
      }
    }
    function status() {
      var s = t === 0 ? 'Cover' : 'Spread ' + t + ' of 8 · ' + names[t] + (small.matches ? (side === 'L' ? ' · left page' : ' · right page') : '');
      st.textContent = s; live.textContent = s;
      ths.forEach(function (b) { b.setAttribute('aria-current', parseInt(b.getAttribute('data-s'), 10) === t ? 'true' : 'false'); });
    }
    function setT(nt, ns) {
      nt = Math.max(0, Math.min(8, nt));
      if (ns) side = ns; else if (!small.matches) side = 'R';
      if (nt !== t) {
        var from = Math.min(t, nt), to = Math.max(t, nt), dir = nt > t ? 1 : -1, k = 0, i;
        var seq = []; for (i = from; i < to; i++) seq.push(i);
        if (dir < 0) seq.reverse();
        var old = t; t = nt;
        seq.forEach(function (idx, order) {
          var lf = leaves[idx], delay = S.rm ? 0 : order * 70;
          lf.style.setProperty('--d', delay + 'ms'); lf.style.zIndex = 30;
          lf.classList.toggle('flip', idx < t);
          setTimeout(function () { lf.style.zIndex = zFor(idx); }, S.rm ? 0 : delay + 520);
        });
      }
      book.setAttribute('data-t', String(t)); cat.setAttribute('data-side', side);
      faces(); status();
    }
    function next() {
      if (small.matches) {
        if (t === 0) setT(1, 'L'); else if (side === 'L') setT(t, 'R'); else if (t < 8) setT(t + 1, 'L');
      } else setT(t + 1);
    }
    function prev() {
      if (small.matches) {
        if (t === 0) return;
        if (side === 'R' && t >= 1) setT(t, 'L'); else if (t > 1) setT(t - 1, 'R'); else setT(0, 'R');
      } else setT(t - 1);
    }
    leaves.forEach(function (l, i) { l.style.zIndex = 9 - i; });
    setT(0, 'R');
    on(qs('#cat-next', root), 'click', next);
    on(qs('#cat-prev', root), 'click', prev);
    ths.forEach(function (b) { on(b, 'click', function () { setT(parseInt(b.getAttribute('data-s'), 10), 'L'); opened = true; }); });
    function keys(e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    }
    on(book, 'keydown', keys); on(qs('#cat-next', root), 'keydown', keys); on(qs('#cat-prev', root), 'keydown', keys);
    // swipe
    var sx = 0, sy = 0, sd = false;
    on(win, 'pointerdown', function (e) { sd = true; sx = e.clientX; sy = e.clientY; });
    on(win, 'pointerup', function (e) {
      if (!sd) return; sd = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (dx < 0) next(); else prev(); }
    });
    on(win, 'pointercancel', function () { sd = false; });
    on(small, 'change', function () { side = small.matches ? (t === 0 ? 'R' : 'L') : 'R'; setT(t, side); });
    // the cover opens as the book scrolls into view
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !opened) { opened = true; setTimeout(function () { if (t === 0) setT(1, 'L'); }, S.rm ? 0 : 500); }
      });
    }, { threshold: 0.6 });
    io.observe(win);
  });
  /* ============================================================ chapter 07 */
  W.MeridianParts.push(function (root, S) {
    var N = S.ns, qs = N.qs, qsa = N.qsa, clamp = N.clamp, on = N.on;
    var way = qs('#way', root); if (!way) return;
    var line = qs('#way-line', way), head = qs('#way-head', way), sg = qsa('.sgp', way), li = qsa('.way-l li', way), mk = qsa('.smk', way);
    var total = line.getTotalLength ? line.getTotalLength() : 1, th = [0.01, 0.15, 0.25, 0.425, 0.9];
    var small = W.matchMedia('(max-width: 640px)'), lastN = -1, lastQ = -1;
    function paint(q) {
      line.style.setProperty('--d', q.toFixed(4));
      var pt = line.getPointAtLength(q * total); head.setAttribute('cx', pt.x.toFixed(1)); head.setAttribute('cy', pt.y.toFixed(1));
      var n = 0; th.forEach(function (t, i) { if (q >= t) n = i + 1; });
      var ln = li[li.length - 1]; if (ln && ln.hasAttribute('data-line')) ln.classList.toggle('on', q > 0.01);
      if (n === lastN) return; lastN = n;
      sg.forEach(function (f, i) {
        f.classList.toggle('on', small.matches ? i < n : i === n - 1);
        f.classList.toggle('past', !small.matches && i < n - 1);
      });
      li.forEach(function (l, i) { l.classList.toggle('on', l.hasAttribute('data-line') ? q > 0.01 : i < n); });
      mk.forEach(function (m, i) { m.classList.toggle('on', i < n); });
    }
    paint(0);
    S.scrub(function () {
      var q = clamp((S.sectionProgress(way) - 0.06) / 0.82, 0, 1);
      if (Math.abs(q - lastQ) < 0.0005) return; lastQ = q; paint(q);
    });
    qsa('.pi', root).forEach(function (b) {
      on(b, 'click', function () { b.classList.remove('play'); void b.offsetWidth; b.classList.add('play'); });
      on(b, 'animationend', function () { b.classList.remove('play'); });
    });
  });
  /* ============================================================ chapter 08 */
  W.MeridianParts.push(function (root, S) {
    var N = S.ns, qsa = N.qsa, qs = N.qs, on = N.on;
    qsa('.hs', root).forEach(function (b) {
      on(b, 'click', function () {
        var co = qs('#' + b.getAttribute('aria-controls'), root);
        var open = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
        co.hidden = open;
      });
    });
  });
  /* ============================================================ chapter 09 and coda */
  W.MeridianParts.push(function (root, S) {
    var N = S.ns, qs = N.qs, qsa = N.qsa, clamp = N.clamp, on = N.on, Z = N.ZONES, NS = 'http://www.w3.org/2000/svg';
    function el(tag, attrs, parent) {
      var e = D.createElementNS(NS, tag), k;
      for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e); return e;
    }
    function rows(tbl) {
      return qsa('tbody tr', tbl).map(function (r) { return { f: r.getAttribute('data-f'), t: r.getAttribute('data-t'), n: parseInt(r.getAttribute('data-n'), 10) }; });
    }
    function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

    /* numerals restack on hover once they have finished counting */
    qsa('.goals-g li, .ach li', root).forEach(function (li) {
      var n = qs('.goal-n, .ach-n', li), built = false;
      function build() {
        if (built || !n) return; built = true;
        var txt = n.textContent, out = '', i;
        n.setAttribute('aria-label', txt);
        for (i = 0; i < txt.length; i++) out += '<span class="rs-d" aria-hidden="true" style="--i:' + i + '"><span>' + txt.charAt(i) + '</span><span>' + txt.charAt(i) + '</span></span>';
        n.innerHTML = out; n.classList.add('rs');
      }
      on(li, 'mouseenter', function () {
        if (!n._cnt && n.hasAttribute('data-count')) return;
        var done = !n.hasAttribute('data-count') || /^[0-9,]+[+%]?$/.test(n.textContent);
        if (!done) return;
        build(); li.classList.add('rs-h', 'hot');
      });
      on(li, 'mouseleave', function () { li.classList.remove('hot'); });
    });

    /* Sankey: drawn from the two hidden tables */
    var sk = qs('#sankey', root), svg = qs('#sk-svg', root), tip = qs('#sk-tip', root);
    if (sk && svg) {
      var F1 = rows(qs('#sk-t1', root)), F2 = rows(qs('#sk-t2', root));
      var Wd = 1140, sc = 0.4, gap = 11, top = 46, nw = 18, colX = [120, 520, 940];
      var cols = [{ nodes: {}, keys: ['1', '2', '3', '4', '5', '6', '7'] }, { nodes: {}, keys: ['1', '2', '3', '4', '5', '6', '7', 'X'] }, { nodes: {}, keys: ['1', '2', '3', '4', '5', '6', '7', 'X'] }];
      function tally(c, key, v, dir) { var n = cols[c].nodes[key] || (cols[c].nodes[key] = { key: key, out: 0, inn: 0 }); n[dir] += v; }
      F1.forEach(function (r) { tally(0, r.f, r.n, 'out'); tally(1, r.t, r.n, 'inn'); });
      F2.forEach(function (r) { tally(1, r.f, r.n, 'out'); tally(2, r.t, r.n, 'inn'); });
      cols.forEach(function (c, ci) {
        var y = top;
        c.keys.forEach(function (k) {
          var nd = c.nodes[k]; if (!nd) return;
          nd.v = ci === 0 ? nd.out : nd.inn; nd.h = nd.v * sc; nd.y = y; nd.x = colX[ci];
          nd.so = 0; nd.to = 0; y += nd.h + (k === '7' ? 22 : gap);
        });
      });
      var clip = el('clipPath', { id: 'sk-clip' }, svg), cr = el('rect', { x: 0, y: 0, width: 0, height: 540 }, clip);
      var g = el('g', { 'class': 'sk-fl', 'clip-path': 'url(#sk-clip)' }, svg), ribs = [];
      function ribbon(from, to, v, c0, c1, key) {
        var a = cols[c0].nodes[from], b = cols[c1].nodes[to], h = v * sc;
        var x0 = a.x + nw, x1 = b.x, y0 = a.y + a.so, y1 = b.y + b.to, xm = (x0 + x1) / 2;
        a.so += h; b.to += h;
        var d = 'M' + x0 + ' ' + y0 + 'C' + xm + ' ' + y0 + ' ' + xm + ' ' + y1 + ' ' + x1 + ' ' + y1 + 'L' + x1 + ' ' + (y1 + h) + 'C' + xm + ' ' + (y1 + h) + ' ' + xm + ' ' + (y0 + h) + ' ' + x0 + ' ' + (y0 + h) + 'Z';
        var p = el('path', { d: d, 'class': 'sk-f ' + (to === 'X' ? 'zx' : 'z' + from) }, g);
        p._info = { c0: c0, c1: c1, from: from, to: to, v: v };
        ribs.push(p);
      }
      function stage(F, c0, c1) {
        cols[c0].keys.forEach(function (fk) {
          cols[c1].keys.forEach(function (tk) {
            F.forEach(function (r) { if (r.f === fk && r.t === tk) ribbon(fk, tk, r.n, c0, c1); });
          });
        });
      }
      // order inflows by source so the ribbons stack without crossing inside a node
      stage(F1, 0, 1); stage(F2, 1, 2);
      var heads = ['First venue', 'Second venue', 'Third venue'];
      heads.forEach(function (h, i) { var t = el('text', { x: colX[i] + (i === 0 ? 0 : i === 2 ? nw : nw / 2), y: 22, 'class': 'sk-ch', 'text-anchor': i === 0 ? 'start' : i === 2 ? 'end' : 'middle' }, svg); t.textContent = h; });
      var nodes = [];
      cols.forEach(function (c, ci) {
        c.keys.forEach(function (k) {
          var nd = c.nodes[k]; if (!nd) return;
          var gg = el('g', { 'class': 'sk-n' + (k === 'X' ? ' sk-nx' : ' z' + k) }, svg);
          el('rect', { x: nd.x, y: nd.y, width: nw, height: Math.max(2, nd.h) }, gg);
          var right = ci < 2, lx = ci === 2 ? nd.x - 10 : ci === 0 ? nd.x - 10 : nd.x - 10;
          var lab = el('text', { x: lx, y: nd.y + nd.h / 2 + 4, 'text-anchor': 'end', 'class': 'sk-lb' }, gg);
          lab.textContent = k === 'X' ? (ci === 1 ? 'Left after one · ' : 'Left after two · ') + nd.v : '0' + k + ' · ' + nd.v;
          if (ci === 2 && k !== 'X') { lab.setAttribute('x', nd.x + nw + 10); lab.setAttribute('text-anchor', 'start'); }
          if (ci === 2 && k === 'X') { lab.setAttribute('x', nd.x + nw + 10); lab.setAttribute('text-anchor', 'start'); }
          gg._nd = { ci: ci, key: k, v: nd.v }; nodes.push(gg);
        });
      });
      function zname(k) { return k === 'X' ? 'left' : 'zone 0' + k; }
      function say(t) { tip.textContent = t; }
      function focusNode(nd) {
        g.classList.add('dim');
        ribs.forEach(function (r) {
          var i = r._info, hit = (i.c0 === nd.ci && i.from === nd.key) || (i.c1 === nd.ci && i.to === nd.key);
          r.classList.toggle('hi', hit);
        });
        say((nd.key === 'X' ? 'Left after ' + (nd.ci === 1 ? 'one' : 'two') + ' venues' : 'Zone 0' + nd.key + ', ' + ['first', 'second', 'third'][nd.ci] + ' venue') + ': ' + nd.v + ' of 1,000 visitors');
      }
      function reset() { g.classList.remove('dim'); ribs.forEach(function (r) { r.classList.remove('hi'); }); say('Point at a bar or a flow for the count.'); }
      nodes.forEach(function (n) {
        on(n, 'mouseenter', function () { focusNode(n._nd); }); on(n, 'mouseleave', reset);
        on(n, 'click', function () { focusNode(n._nd); });
      });
      ribs.forEach(function (r) {
        var i = r._info;
        on(r, 'mouseenter', function () {
          g.classList.add('dim'); ribs.forEach(function (o) { o.classList.toggle('hi', o === r); });
          say((i.to === 'X' ? 'Zone 0' + i.from + ' visitors who left: ' : 'Zone 0' + i.from + ' to zone 0' + i.to + ': ') + i.v + ' visitors');
        });
        on(r, 'mouseleave', reset);
        on(r, 'click', function () { g.classList.add('dim'); ribs.forEach(function (o) { o.classList.toggle('hi', o === r); }); say((i.to === 'X' ? 'Zone 0' + i.from + ' visitors who left: ' : 'Zone 0' + i.from + ' to zone 0' + i.to + ': ') + i.v + ' visitors'); });
      });
      var smallSk = W.matchMedia('(max-width: 640px)'), skw = qs('.sk-w', sk);
      function skFocus() { if (smallSk.matches) { skw.setAttribute('tabindex', '0'); skw.setAttribute('role', 'region'); skw.setAttribute('aria-label', 'Sankey diagram, scrolls sideways'); } else { skw.removeAttribute('tabindex'); skw.removeAttribute('role'); skw.removeAttribute('aria-label'); } }
      skFocus(); on(smallSk, 'change', skFocus);
      if (S.rm) cr.setAttribute('width', Wd);
      else S.scrub(function () { cr.setAttribute('width', (clamp((S.viewProgress(sk) - 0.22) / 0.3, 0, 1) * Wd).toFixed(1)); });
    }

    /* sixteen-week strip and projected line, drawn from the hidden table */
    var cal = qs('#cal', root), csvg = qs('#cal-svg', root);
    if (cal && csvg) {
      var trs = qsa('#cal-t tbody tr', root), n = trs.length, L = 70, R = 940, ymin = 350, ymax = 200, vmax = 16000;
      function X(i) { return L + i * (R - L) / (n - 1); }
      function Y(v) { return ymin - v / vmax * (ymin - ymax); }
      var starts = ['6 Mar', '13 Mar', '20 Mar', '27 Mar', '3 Apr', '10 Apr', '17 Apr', '24 Apr', '1 May', '8 May', '15 May', '22 May', '29 May', '5 Jun', '12 Jun', '19 Jun'];
      var i, r, t;
      [0, 4000, 8000, 12000, 16000].forEach(function (v) {
        el('path', { d: 'M' + L + ' ' + Y(v) + 'H' + R, 'class': 'cl-gr' }, csvg);
        t = el('text', { x: L - 12, y: Y(v) + 4, 'text-anchor': 'end', 'class': 'cl-t2' }, csvg); t.textContent = v === 0 ? '0' : fmt(v);
      });
      for (i = 0; i < n; i++) {
        t = el('text', { x: X(i), y: 20, 'text-anchor': 'middle', 'class': 'cl-tx' }, csvg); t.textContent = 'W' + (i + 1);
        t = el('text', { x: X(i), y: 38, 'text-anchor': 'middle', 'class': 'cl-t2' }, csvg); t.textContent = starts[i];
        if (i < n - 1) el('rect', { x: X(i) - 5, y: 62, width: 10, height: 10, 'class': 'cl-th' }, csvg);
      }
      t = el('text', { x: L - 12, y: 71, 'text-anchor': 'end', 'class': 'cl-t2' }, csvg); t.textContent = 'Late Thu';
      // events
      el('path', { d: 'M' + (X(0) - 14) + ' 160H' + (X(0) + 14) + 'V172H' + (X(0) - 14) + 'Z', 'class': 'cl-sc' }, csvg);
      t = el('text', { x: X(0) + 24, y: 170, 'class': 'cl-tx' }, csvg); t.textContent = 'Opening week';
      el('path', { d: 'M' + X(2) + ' 76V132', 'class': 'cl-sc' }, csvg); el('rect', { x: X(2) - 6, y: 126, width: 12, height: 12, 'class': 'cl-ev', transform: 'rotate(45 ' + X(2) + ' 132)' }, csvg);
      t = el('text', { x: X(2) + 14, y: 136, 'class': 'cl-tx' }, csvg); t.textContent = 'Catalogue launch, Thu 25 Mar';
      el('path', { d: 'M' + (X(8) - 14) + ' 154V146H' + (X(11) + 14) + 'V154', 'class': 'cl-sc' }, csvg);
      t = el('text', { x: (X(8) + X(11)) / 2, y: 140, 'text-anchor': 'middle', 'class': 'cl-tx' }, csvg); t.textContent = 'School weeks';
      el('path', { d: 'M' + (X(15) - 14) + ' 160H' + (X(15) + 14) + 'V172H' + (X(15) - 14) + 'Z', 'class': 'cl-sc' }, csvg);
      t = el('text', { x: X(15) - 24, y: 170, 'text-anchor': 'end', 'class': 'cl-tx' }, csvg); t.textContent = 'Closing weekend';
      // line
      var pts = trs.map(function (tr, k) { return [X(k), Y(parseInt(tr.getAttribute('data-v'), 10))]; });
      var ln = el('path', { d: 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L'), 'class': 'cl-ln', pathLength: 1 }, csvg);
      pts.forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 5, 'class': 'cl-pt' }, csvg); });
      [[0, 'above'], [2, 'below'], [15, 'above']].forEach(function (a) {
        var k = a[0], v = parseInt(trs[k].getAttribute('data-v'), 10);
        t = el('text', { x: pts[k][0] + (k === 15 ? -12 : 12), y: pts[k][1] + (a[1] === 'above' ? -12 : 26), 'text-anchor': k === 15 ? 'end' : 'start', 'class': 'cl-vl' }, csvg); t.textContent = fmt(v);
      });
      t = el('text', { x: X(5), y: Y(8400) + 46, 'class': 'cl-lg' }, csvg); t.textContent = 'Concept target';
      t = el('text', { x: R, y: 388, 'text-anchor': 'end', 'class': 'cl-t2' }, csvg); t.textContent = 'Total over sixteen weeks: 150,000';
      if (S.rm) ln.style.setProperty('--d', '1');
      else { ln.style.setProperty('--d', '0'); S.scrub(function () { ln.style.setProperty('--d', clamp((S.viewProgress(cal) - 0.3) / 0.3, 0, 1).toFixed(3)); }); }
    }
  });
  /* ============================================================ sideways-scrolling figures on phones */
  W.MeridianParts.push(function (root, S) {
    var N = S.ns, qsa = N.qsa, on = N.on, mq = W.matchMedia('(max-width: 640px)'), els = qsa('[data-hscroll]', root);
    function apply() {
      els.forEach(function (e) {
        if (mq.matches) { e.setAttribute('tabindex', '0'); e.setAttribute('role', 'region'); e.setAttribute('aria-label', e.getAttribute('data-hscroll')); }
        else { e.removeAttribute('tabindex'); e.removeAttribute('role'); e.removeAttribute('aria-label'); }
      });
    }
    apply(); on(mq, 'change', apply);
  });
  /*@@PARTS@@*/
})();
