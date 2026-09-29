/* Kern Studio drawing set. Chapter 06: orthographic linework model engine (Canvas 2D) and stage. */
(function () {
'use strict';
var K = window.KERN; if (!K) return;
var $ = K.$, $$ = K.$$, clamp = K.clamp, lerp = K.lerp;
var D2R = Math.PI / 180;

/* ================= geometry ================= */
function prism(x0, x1, pts, o) {
  o = o || {};
  return { x0: x0, x1: x1, pts: pts, lv: o.lv || 0, yb: o.yb || 0, nw: !!o.nw, rk: o.rk === undefined ? 1 : o.rk, open: !!o.open, gl: !!o.gl };
}
function box(x0, x1, z0, z1, y0, y1, o) { return prism(x0, x1, [[z0, y0], [z1, y0], [z1, y1], [z0, y1]], o); }
function plane(x0, x1, za, ya, zb, yb2, t, o) { return prism(x0, x1, [[za, ya], [zb, yb2], [zb, yb2 - t], [za, ya - t]], o); }
function walls(x0, x1, z0, z1, y0, y1, t, o) {
  return [box(x0, x1, z0, z0 + t, y0, y1, o), box(x0, x1, z1 - t, z1, y0, y1, o),
    box(x0, x0 + t, z0 + t, z1 - t, y0, y1, o), box(x1 - t, x1, z0 + t, z1 - t, y0, y1, o)];
}
function line(a, b, o) { o = o || {}; return { a: a, b: b, lv: o.lv || 0, yb: o.yb || 0, nw: !!o.nw }; }

function buildPrairie() {
  var P = [], L = [], t = 0.3;
  /* existing two-storey house at the front of the lot */
  var h0 = { lv: 0, yb: 0, rk: 0 }, h1 = { lv: 1, yb: 3 }, h0w = { lv: 0, yb: 0 };
  P.push(box(0, 9.8, -8, 0, -0.3, 0, h0));
  P.push(box(0, 9.8, -8, 0, 2.7, 3, h0));
  P = P.concat(walls(0, 9.8, -8, 0, 0, 2.7, t, h0w));
  P = P.concat(walls(0, 9.8, -8, 0, 3, 6, t, h1));
  P.push(plane(0, 9.8, -8.25, 6, -4, 8, 0.25, h1));
  P.push(plane(0, 9.8, -4, 8, 0.25, 6, 0.25, h1));
  P.push(prism(0, t, [[-8, 6], [0, 6], [-4, 8]], h1));
  P.push(prism(9.8 - t, 9.8, [[-8, 6], [0, 6], [-4, 8]], h1));
  /* new addition: 9.8 x 12.2 m, one folded roof, three ridges */
  var n0 = { lv: 0, yb: 0, nw: true }, n1 = { lv: 1, yb: 3, nw: true };
  var z1 = 12.2 / 3, z2 = 2 * z1, z3 = 12.2;
  P.push(box(0, 9.8, 0, 12.2, -0.3, 0, { lv: 0, yb: 0, rk: 0, nw: true }));
  P.push(box(0, t, 0, 12.2, 0, 3, n0));
  P.push(box(9.8 - t, 9.8, 0, 12.2, 0, 3, n0));
  P.push(box(t, 9.8 - t, 12.2 - t, 12.2, 0, 3, { lv: 0, yb: 0, nw: true, gl: true }));
  var pw = [[0, 3], [12.2, 3], [12.2, 6.9], [z2, 6.0], [z2, 5.4], [z1, 4.5], [z1, 3.9]];
  P.push(prism(0, t, pw, n1));
  P.push(prism(9.8 - t, 9.8, pw, n1));
  P.push(plane(0, 9.8, 0, 3.25, z1, 4.15, 0.25, { lv: 1, yb: 3, nw: true, open: true }));
  P.push(plane(0, 9.8, z1, 4.75, z2, 5.65, 0.25, { lv: 1, yb: 3, nw: true, open: true }));
  P.push(plane(0, 9.8, z2, 6.25, z3, 7.15, 0.25, { lv: 1, yb: 3, nw: true, open: true }));
  P.push(box(t, 9.8 - t, z1 - 0.06, z1, 3.9, 4.75, { lv: 1, yb: 3, nw: true, gl: true }));
  P.push(box(t, 9.8 - t, z2 - 0.06, z2, 5.4, 6.25, { lv: 1, yb: 3, nw: true, gl: true }));
  P.push(box(t, 9.8 - t, z3 - 0.06, z3, 6.9, 7.15, { lv: 1, yb: 3, nw: true, gl: true }));
  return {
    id: 'prairie', name: 'Prairie Fold House', sheet: 'A-601', levels: 2, sort: 'depth', prisms: P, lines: L,
    bb: { x0: 0, x1: 9.8, y0: -0.3, y1: 8, z0: -8.25, z1: 12.2 }, plan: 1.2, planA: 0, scale: { plan: '1:100', section: '1:50', axon: 'NTS', detail: '1:5' },
    hot: [
      { p: [4.9, 7.6, -4.2], t: 'Existing house', d: 'The two-storey house stays as found. The addition is drawn in cyanotype so new and old read apart.' },
      { p: [4.9, 4.2, 4.0], t: 'Fold one clerestory', d: 'A glazed step in the first fold lets light fall onto the kitchen bay.' },
      { p: [4.9, 7.2, 11.6], t: 'Third ridge', d: 'The tallest fold. Three ridges step up across the lot and each one is a clerestory.' },
      { p: [4.9, 1.6, 12.2], t: 'Garden door', d: 'A glazed garden door at the far end of the living bay opens the plan to the yard.' }
    ]
  };
}

function buildWarehouse() {
  var P = [], L = [], pitch = 5.7, sw = { x0: 12, x1: 18, z0: 14, z1: 26 }, k, i, j;
  for (k = 0; k < 4; k++) {
    var yb = k * pitch, o = { lv: k, yb: yb, rk: 0 };
    P.push(box(0, 12, 0, 50, yb - 0.3, yb, o));
    P.push(box(18, 30, 0, 50, yb - 0.3, yb, o));
    P.push(box(12, 18, 0, sw.z0, yb - 0.3, yb, o));
    P.push(box(12, 18, sw.z1, 50, yb - 0.3, yb, o));
    for (i = 0; i <= 5; i++) for (j = 0; j <= 8; j++) {
      var cx = i * 6, cz = j * 6;
      if (cx >= 12 && cx <= 18 && cz >= 14 && cz <= 26) continue;
      P.push(box(Math.min(cx, 29.6), Math.min(cx, 29.6) + 0.4, Math.min(cz, 49.6), Math.min(cz, 49.6) + 0.4, yb, yb + 3.9, { lv: k, yb: yb }));
    }
    var no = { lv: k, yb: yb, nw: true, gl: true }, h = 5.4;
    P.push(box(sw.x0, sw.x0 + 0.1, sw.z0, sw.z1, yb, yb + h, no));
    P.push(box(sw.x1 - 0.1, sw.x1, sw.z0, sw.z1, yb, yb + h, no));
    P.push(box(sw.x0 + 0.1, sw.x1 - 0.1, sw.z0, sw.z0 + 0.1, yb, yb + h, no));
    P.push(box(sw.x0 + 0.1, sw.x1 - 0.1, sw.z1 - 0.1, sw.z1, yb, yb + h, no));
  }
  var y3 = 3 * pitch, ry = 4 * pitch, ro = { lv: 3, yb: y3, rk: 0 };
  P.push(box(0, 12, 0, 50, ry - 0.3, ry, ro));
  P.push(box(18, 30, 0, 50, ry - 0.3, ry, ro));
  P.push(box(12, 18, 0, sw.z0, ry - 0.3, ry, ro));
  P.push(box(12, 18, sw.z1, 50, ry - 0.3, ry, ro));
  P.push(prism(11.4, 18.6, [[13.4, ry], [26.6, ry], [26.6, ry + 1.2], [20, ry + 1.9], [13.4, ry + 1.2]], { lv: 3, yb: y3, nw: true, gl: true }));
  return {
    id: 'warehouse', name: 'No. 9 Warehouse', sheet: 'A-611', levels: 4, sort: 'level', prisms: P, lines: L,
    bb: { x0: 0, x1: 30, y0: -0.3, y1: ry + 1.9, z0: 0, z1: 50 }, plan: 1.2, planA: 0, scale: { plan: '1:200', section: '1:200', axon: 'NTS', detail: '1:5' },
    hot: [
      { p: [0.2, 2.2, 0.2], t: 'Steel columns, 1911', d: 'The original steel columns stand on a 6 m grid. They are kept and drawn in ink.' },
      { p: [15, 9, 20], t: 'Light well', d: 'A new light well drops through all four levels. New work is drawn in cyanotype.' },
      { p: [30, 12, 42], t: 'Exploded floors', d: 'Floors are pulled 1.5 m apart so each level can be read on its own.' },
      { p: [15, 24.4, 20], t: 'Roof lantern', d: 'A new lantern over the well brings daylight down to the ground floor.' }
    ]
  };
}

function buildCordage() {
  var P = [], L = [], i, n = 9, W = 0.18, o0 = { lv: 0, yb: 0 }, o1 = { lv: 1, yb: 3 };
  P.push(box(0, 20, 0, 11, -0.3, 0, { lv: 0, yb: 0, rk: 0 }));
  for (i = 0; i < n; i++) {
    var x = i * 2.5, xa = Math.max(0, x - W / 2), xb = Math.min(20, x + W / 2);
    P.push(box(xa, xb, 0.4, 0.7, 0, 3, o0));
    P.push(box(xa, xb, 0.4, 0.7, 3, 3.3, o1));
    P.push(box(xa, xb, 10.3, 10.6, 0, 3, o0));
    P.push(box(xa, xb, 10.3, 10.6, 3, 5.6, o1));
    P.push(plane(xa, xb, 0.4, 3.3, 10.6, 5.6, 0.4, o1));
    L.push(line([x, 3.1, 0.55], [x, 0, 10.45], { lv: 1, yb: 3, nw: true }));
  }
  P.push(plane(-0.4, 20.4, -0.6, 3.5, 11.2, 5.85, 0.08, { lv: 1, yb: 3, open: true }));
  var bays = [0, 3, 6];
  bays.forEach(function (b) {
    var xa = b * 2.5, xb = xa + 2.5;
    L.push(line([xa, 0, 10.45], [xb, 5.5, 10.45], { lv: 1, yb: 3, nw: true }));
    L.push(line([xa, 5.5, 10.45], [xb, 0, 10.45], { lv: 1, yb: 3, nw: true }));
    L.push(line([xa, 0, 0.55], [xb, 3.2, 0.55], { lv: 1, yb: 3, nw: true }));
    L.push(line([xa, 3.2, 0.55], [xb, 0, 0.55], { lv: 1, yb: 3, nw: true }));
    L.push(line([xa, 3.35, 0.55], [xb, 5.7, 10.45], { lv: 1, yb: 3, nw: true }));
    L.push(line([xa, 5.7, 10.45], [xb, 3.35, 0.55], { lv: 1, yb: 3, nw: true }));
  });
  return {
    id: 'cordage', name: 'Cordage Pavilion', sheet: 'A-621', levels: 2, sort: 'depth', prisms: P, lines: L,
    bb: { x0: -0.4, x1: 20.4, y0: -0.3, y1: 6, z0: -0.6, z1: 11.2 }, plan: 1.2, planA: 90, scale: { plan: '1:100', section: '1:50', axon: 'NTS', detail: '1:5' },
    hot: [
      { p: [5, 4.4, 5.5], t: 'Glulam frame', d: 'Glulam frames every 2.5 m carry a single pitch roof and stand on a timber deck.' },
      { p: [12.5, 2.6, 10.45], t: 'Tension cables', d: 'Tensioned cables brace the frames like rigging on a mast, so the posts can stay slim.' },
      { p: [17.5, 5.9, 8], t: 'Roof to the water', d: 'The roof pitches up toward the water to catch light and to shed wind over the deck.' },
      { p: [10, 0, 3], t: 'Timber deck', d: 'A timber deck at land level. The shelter is open on three sides and faces the lake.' }
    ]
  };
}

var MODELS = { prairie: buildPrairie(), warehouse: buildWarehouse(), cordage: buildCordage() };
Object.keys(MODELS).forEach(function (k) {
  var b = MODELS[k].bb; MODELS[k].corners = [];
  [b.x0, b.x1].forEach(function (x) { [b.y0, b.y1].forEach(function (y) { [b.z0, b.z1].forEach(function (z) { MODELS[k].corners.push([x, y, z]); }); }); });
});

/* ================= camera and rendering ================= */
function camVec(a, f) {
  var sa = Math.sin(a), ca = Math.cos(a), sf = Math.sin(f), cf = Math.cos(f);
  return { R: [sa, 0, ca], U: [sf * ca, cf, -sf * sa], D: [-ca * cf, sf, sa * cf] };
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function fitCam(m, cam, W, H, pad) {
  var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, i, c, sx, sy;
  for (i = 0; i < m.corners.length; i++) {
    c = m.corners[i]; sx = dot(c, cam.R); sy = -dot(c, cam.U);
    if (sx < minx) minx = sx; if (sx > maxx) maxx = sx; if (sy < miny) miny = sy; if (sy > maxy) maxy = sy;
  }
  var s = Math.min((W - 2 * pad) / Math.max(0.001, maxx - minx), (H - 2 * pad) / Math.max(0.001, maxy - miny));
  return { s: s, ox: W / 2 - s * (minx + maxx) / 2, oy: H / 2 - s * (miny + maxy) / 2, cam: cam };
}
function proj(fit, p) { return [fit.s * dot(p, fit.cam.R) + fit.ox, -fit.s * dot(p, fit.cam.U) + fit.oy]; }

function clipPolyY(pts, c) {
  var out = [], n = pts.length, i, a, b, ia, ib, t;
  for (i = 0; i < n; i++) {
    a = pts[i]; b = pts[(i + 1) % n]; ia = a[1] <= c + 1e-9; ib = b[1] <= c + 1e-9;
    if (ia) out.push(a);
    if (ia !== ib) { t = (c - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, c]); }
  }
  return out.length >= 3 ? out : null;
}
function area(pts) { var s = 0, i, a, b; for (i = 0; i < pts.length; i++) { a = pts[i]; b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }

/* expand prisms into drawable items for a given extrusion and cut */
function prep(m, build, cut) {
  var items = [];
  m.prisms.forEach(function (p) {
    var e = clamp(build - p.lv, 0, 1); if (e <= 0.001) return;
    var pts = p.pts.map(function (q) { return [q[0], p.yb + (q[1] - p.yb) * e]; });
    var x0 = p.x0, x1 = p.x1, capX = false, capsY = [];
    if (cut && cut.axis === 'x') { if (x1 <= cut.c) return; if (x0 < cut.c) { x0 = cut.c; capX = true; } }
    if (cut && cut.axis === 'y') {
      pts = clipPolyY(pts, cut.c); if (!pts) return;
      for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; if (Math.abs(a[1] - cut.c) < 1e-6 && Math.abs(b[1] - cut.c) < 1e-6) capsY.push([a[0], b[0]]); }
    }
    var sg = area(pts) >= 0 ? 1 : -1, faces = [], n = pts.length, j, a2, b2, dz, dy, cx = 0, cy = 0, cz = 0;
    var mk = function (vs, nn, cap) { faces.push({ v: vs, n: nn, cap: cap }); };
    mk(pts.map(function (q) { return [x0, q[1], q[0]]; }), [-1, 0, 0], capX);
    mk(pts.map(function (q) { return [x1, q[1], q[0]]; }), [1, 0, 0], false);
    for (j = 0; j < n; j++) {
      a2 = pts[j]; b2 = pts[(j + 1) % n];
      if (cut && cut.axis === 'y' && Math.abs(a2[1] - cut.c) < 1e-6 && Math.abs(b2[1] - cut.c) < 1e-6) continue;
      dz = b2[0] - a2[0]; dy = b2[1] - a2[1];
      if (Math.abs(dz) < 1e-9 && Math.abs(dy) < 1e-9) continue;
      mk([[x0, a2[1], a2[0]], [x1, a2[1], a2[0]], [x1, b2[1], b2[0]], [x0, b2[1], b2[0]]], [0, -dz * sg, dy * sg], false);
    }
    capsY.forEach(function (c2) { mk([[x0, cut.c, c2[0]], [x1, cut.c, c2[0]], [x1, cut.c, c2[1]], [x0, cut.c, c2[1]]], [0, 1, 0], true); });
    pts.forEach(function (q) { cy += q[1]; cz += q[0]; });
    cx = (x0 + x1) / 2; cy /= n; cz /= n;
    items.push({ faces: faces, c: [cx, cy, cz], lv: p.lv, rk: p.rk, nw: p.nw, open: p.open, gl: p.gl, x0: x0, x1: x1, pts: pts });
  });
  var lines = [];
  m.lines.forEach(function (l) {
    var e = clamp(build - l.lv, 0, 1); if (e <= 0.001) return;
    var a = [l.a[0], l.yb + (l.a[1] - l.yb) * e, l.a[2]], b = [l.b[0], l.yb + (l.b[1] - l.yb) * e, l.b[2]];
    if (cut && cut.axis === 'x') {
      if (a[0] < cut.c && b[0] < cut.c) return;
      if (a[0] < cut.c || b[0] < cut.c) { var t = (cut.c - a[0]) / (b[0] - a[0]); var q = [cut.c, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; if (a[0] < cut.c) a = q; else b = q; }
    }
    if (cut && cut.axis === 'y') {
      if (a[1] > cut.c && b[1] > cut.c) return;
      if (a[1] > cut.c || b[1] > cut.c) { var t2 = (cut.c - a[1]) / (b[1] - a[1]); var q2 = [a[0] + (b[0] - a[0]) * t2, cut.c, a[2] + (b[2] - a[2]) * t2]; if (a[1] > cut.c) a = q2; else b = q2; }
    }
    lines.push({ a: a, b: b, nw: l.nw });
  });
  return { items: items, lines: lines };
}

function sortItems(items, D, mode) {
  items.forEach(function (it) { it.k = dot(it.c, D) - (it.rk === 0 ? 3 : 0); });
  items.sort(function (p, q) {
    if (mode === 'level') { if (p.lv !== q.lv) return p.lv - q.lv; if (p.rk !== q.rk) return p.rk - q.rk; }
    return p.k - q.k;
  });
}

function readColors() {
  var cs = getComputedStyle(K.root || document.documentElement);
  var g = function (n, d) { var v = cs.getPropertyValue(n).trim(); return v || d; };
  return { ground: g('--ground', '#0D1633'), ink: g('--ink', '#F2F0EB'), cyan: g('--cyan', '#9DB3FF'), rule: g('--rule', 'rgba(242,240,235,.18)'), gr: g('--graphite', '#AAB2CE') };
}

/* draw a state onto ctx (css pixel space). st: {a,f,build,cut,plane}. opts: {collect, linesOnly, pad, grid} */
function draw(ctx, W, H, m, st, col, opts) {
  opts = opts || {};
  var cam = camVec(st.a, st.f), fit = fitCam(m, cam, W, H, opts.pad === undefined ? 36 : opts.pad);
  var segs = opts.collect ? [] : null;
  ctx.setLineDash([]); ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  if (!opts.linesOnly && opts.grid !== false) {
    var b = m.bb, gx0 = Math.floor((b.x0 - 2) / 5) * 5, gx1 = Math.ceil((b.x1 + 2) / 5) * 5, gz0 = Math.floor((b.z0 - 2) / 5) * 5, gz1 = Math.ceil((b.z1 + 2) / 5) * 5, gx, gz, p1, p2;
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.beginPath();
    for (gx = gx0; gx <= gx1; gx += 5) { p1 = proj(fit, [gx, 0, gz0]); p2 = proj(fit, [gx, 0, gz1]); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); }
    for (gz = gz0; gz <= gz1; gz += 5) { p1 = proj(fit, [gx0, 0, gz]); p2 = proj(fit, [gx1, 0, gz]); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); }
    ctx.stroke();
  }
  var pr = prep(m, st.build, st.cut), items = pr.items;
  sortItems(items, cam.D, m.sort);
  items.forEach(function (it) {
    it.faces.forEach(function (f) {
      var vis = f.cap ? dot(f.n, cam.D) > -0.0001 : dot(f.n, cam.D) > 1e-6;
      if (f.cap && dot(f.n, cam.D) <= 1e-6) vis = false;
      if (!vis) return;
      var pts = f.v.map(function (v) { return proj(fit, v); }), i;
      if (segs) for (i = 0; i < pts.length; i++) { var a = pts[i], c2 = pts[(i + 1) % pts.length]; segs.push([a[0], a[1], c2[0], c2[1], it.nw ? 1 : 0]); }
      if (opts.linesOnly) return;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      var stroke = it.nw ? col.cyan : col.ink;
      if (f.cap) { ctx.fillStyle = stroke; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); return; }
      if (!it.open) { ctx.fillStyle = col.ground; ctx.fill(); }
      ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.globalAlpha = it.open ? 0.8 : 1; ctx.stroke(); ctx.globalAlpha = 1;
    });
  });
  pr.lines.forEach(function (l) {
    var a = proj(fit, l.a), b = proj(fit, l.b);
    if (segs) segs.push([a[0], a[1], b[0], b[1], 1]);
    if (opts.linesOnly) return;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = col.cyan; ctx.lineWidth = 1; ctx.stroke();
  });
  if (!opts.linesOnly && st.cut && st.plane !== false) {
    var bb = m.bb, c = st.cut.c, q;
    if (st.cut.axis === 'x') q = [[c, bb.y0, bb.z0], [c, bb.y0, bb.z1], [c, bb.y1, bb.z1], [c, bb.y1, bb.z0]];
    else q = [[bb.x0, c, bb.z0], [bb.x1, c, bb.z0], [bb.x1, c, bb.z1], [bb.x0, c, bb.z1]];
    var pp = q.map(function (v) { return proj(fit, v); });
    ctx.beginPath(); ctx.moveTo(pp[0][0], pp[0][1]); for (var i2 = 1; i2 < 4; i2++) ctx.lineTo(pp[i2][0], pp[i2][1]); ctx.closePath();
    ctx.globalAlpha = 0.07; ctx.fillStyle = col.cyan; ctx.fill(); ctx.globalAlpha = 1;
    ctx.setLineDash([6, 4]); ctx.strokeStyle = col.cyan; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
  }
  return { fit: fit, segs: segs };
}

function setupCanvas(cv, w, h) {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
}
var VIEWS = { axon: { a: 45 * D2R, f: 35.264 * D2R }, section: { a: 0, f: 0 }, plan: { a: 0, f: 90 * D2R } };
function viewAng(mm, v) { return v === 'plan' ? { a: (mm.planA || 0) * D2R, f: 90 * D2R } : VIEWS[v]; }
function stateFor(m, view, frac) {
  var v = viewAng(m, view), cut;
  if (view === 'plan') cut = { axis: 'y', c: m.plan };
  else cut = { axis: 'x', c: m.bb.x0 + (frac === undefined ? 0.5 : frac) * (m.bb.x1 - m.bb.x0) };
  return { a: v.a, f: v.f, build: m.levels, cut: cut, plane: false };
}
/* still drawings for thumbnails and the lightbox */
K.model = {
  models: MODELS,
  still: function (pid, view, cv, w, h, o) {
    o = o || {}; var m = MODELS[pid], ctx = setupCanvas(cv, w, h), st = stateFor(m, view, o.frac);
    if (view === 'axon' && !o.cut) st.cut = null;
    ctx.clearRect(0, 0, w, h); draw(ctx, w, h, m, st, readColors(), { pad: o.pad === undefined ? 14 : o.pad, grid: o.grid });
  }
};

/* ================= words: text equivalents ================= */
var WORDS = {
  prairie: {
    plan: 'Plan of the Prairie Fold House. The existing two-storey house sits at the front of the lot. Behind it a 9.8 by 12.2 metre single-storey addition holds the kitchen, dining and living bays in a row and ends at a garden door.',
    section: 'Long section through the Prairie Fold House addition. Three roof folds step up from left to right; a clerestory in each fold lets daylight fall onto the kitchen, dining and living bays below. The existing house stands at the far left and a garden door opens at the far right.',
    axon: 'Axonometric of the Prairie Fold House. One folded roof with three ridges runs across the lot and each fold ends in a clerestory. The existing house rises behind the addition and is drawn in ink; the addition is drawn in cyanotype.',
    detail: 'Detail at 1 to 5 of a clerestory head: a timber rafter, the roof build-up, the glazing frame and a metal flashing where one fold meets the next.'
  },
  warehouse: {
    plan: 'Plan of No. 9 Warehouse, a 1911 building 30 by 50 metres. Steel columns stand on a 6 metre grid in ink. A new light well, drawn in cyanotype, cuts a 6 by 12 metre opening through the middle of every floor.',
    section: 'Section through No. 9 Warehouse. Four floors are pulled apart by 1.5 metres. The light well passes through all four levels and ends in a new roof lantern.',
    axon: 'Axonometric of No. 9 Warehouse with its four floors exploded 1.5 metres apart. Original steel columns are in ink; new work, the light well and the lantern above it, is in cyanotype.',
    detail: 'Detail at 1 to 5 of the new light-well wall meeting an existing concrete floor and a steel column: a glazed frame in cyanotype fixed to a steel angle.'
  },
  cordage: {
    plan: 'Plan of the Cordage Pavilion, 20 by 11 metres. Nine glulam frames stand every 2.5 metres along a timber deck, with tensioned cables bracing the end bays.',
    section: 'Section through a frame of the Cordage Pavilion. A low post on the land side and a tall post on the water side carry a single pitch roof that rises toward the water; a cable crosses the frame like rigging.',
    axon: 'Axonometric of the Cordage Pavilion. Nine glulam frames stand under one pitched roof, braced by tensioned cables, and open to the water.',
    detail: 'Detail at 1 to 5 of a cable connection: a steel plate bolted to a glulam post and a pin that takes the tensioned cable.'
  }
};
var PARTI = {
  prairie: 'One folded roof turns a narrow lot into three rooms of light.',
  warehouse: 'Keep every column, cut one light well, and let daylight find the old floors.',
  cordage: 'A roof that leans toward the water, held up like a ship\'s rigging.'
};
var META = {
  prairie: { sheets: ['A-601', 'A-602', 'A-603', 'A-604'], place: 'Residential, Oak Park' },
  warehouse: { sheets: ['A-611', 'A-612', 'A-613', 'A-614'], place: 'Adaptive reuse, West Loop' },
  cordage: { sheets: ['A-621', 'A-622', 'A-623', 'A-624'], place: 'Public, Lakefront' }
};
K.model.words = WORDS; K.model.parti = PARTI; K.model.meta = META;

/* ================= stage controller ================= */
K.mods.push(function () {
  var stage = $('[data-stage]'); if (!stage) return;
  var cv = $('#mdCanvas'), wrapC = $('#mdWrap'), hotWrap = $('#mdHot'), tip = $('#mdTip');
  if (!cv || !wrapC) return;
  var ctx = null, W = 0, H = 0, colors = readColors();
  var S = { proj: 'prairie', view: 'axon', a: VIEWS.axon.a, f: VIEWS.axon.f, oa: 0, of: 0, tOa: 0, tOf: 0, build: 0, bt: 0, fx: 0.5, cut: true,
    on: false, sweep: null, swept: false, hand: false, cam: null, dis: null, tween: null, drag: null };
  var m = function () { return MODELS[S.proj]; };
  var viewBtns = $$('[data-view]', stage), slider = $('#mdCut'), readout = $('#mdCutR'), wordsBtn = $('#mdWordsBtn'), wordsBox = $('#mdWords');
  var resetBtn = $('#mdReset'), title = $('#mdTitle'), parti = $('#mdParti'), sheetL = $('#mdSheet'), placeL = $('#mdPlace');
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };

  function cutState() {
    var mm = m();
    if (S.view === 'plan') return { axis: 'y', c: mm.plan_c !== undefined ? mm.plan_c : mm.plan };
    if (!S.cut) return null;
    return { axis: 'x', c: mm.bb.x0 + S.fx * (mm.bb.x1 - mm.bb.x0) };
  }
  function syncSlider() {
    var mm = m(), cs = cutState();
    if (S.view === 'plan') {
      var top = mm.bb.y1, c = mm.plan_c !== undefined ? mm.plan_c : mm.plan;
      slider.value = Math.round(c / top * 1000); readout.textContent = 'Height ' + fmt(c * 1000) + ' mm';
    } else {
      slider.value = Math.round(S.fx * 1000); readout.textContent = 'x ' + fmt(S.fx * (mm.bb.x1 - mm.bb.x0) * 1000) + ' mm';
    }
    slider.setAttribute('aria-valuetext', readout.textContent);
    return cs;
  }
  function words() {
    var w = WORDS[S.proj][S.view]; wordsBox.textContent = w;
  }
  function markDirty() { if (!S.raf && S.on) S.raf = requestAnimationFrame(frame); }
  function resize() {
    var r = wrapC.getBoundingClientRect(); W = Math.max(200, Math.round(r.width)); H = Math.max(200, Math.round(r.height));
    ctx = setupCanvas(cv, W, H); colors = readColors(); markDirty();
  }
  var last = 0;
  function frame(now) {
    S.raf = 0; if (!S.on) return;
    var dt = last ? Math.min(64, now - last) : 16; last = now;
    var busy = false;
    /* build */
    if (Math.abs(S.build - S.bt) > 0.0005) { var stp = dt / 450; S.build += clamp(S.bt - S.build, -stp, stp); busy = true; }
    else S.build = S.bt;
    /* sweep */
    if (S.sweep) {
      var sw = S.sweep, t = (now - sw.t0) / sw.dur;
      if (t < 1) { var e = K.ease.draft(t); S.fx = sw.from + (sw.to - sw.from) * e; }
      else { S.fx = sw.to; S.sweep = null; S.hand = true; }
      S.cut = true; syncSlider(); busy = true;
    }
    /* orbit ease */
    if (!S.drag) { S.tOa *= 1; }
    var k = S.drag ? 0.5 : 0.14;
    var da = S.tOa - S.oa, df = S.tOf - S.of;
    if (Math.abs(da) > 0.0002 || Math.abs(df) > 0.0002) { S.oa += da * k; S.of += df * k; busy = true; }
    else { S.oa = S.tOa; S.of = S.tOf; }
    if (!S.drag && (S.tOa !== 0 || S.tOf !== 0) && S.release) { S.tOa = 0; S.tOf = 0; S.release = false; busy = true; }
    render(now);
    if (busy || S.dis || S.tween || S.drag) markDirty();
  }
  function stNow() {
    return { a: S.a + S.oa, f: clamp(S.f + S.of, 0, Math.PI / 2), build: S.build, cut: S.build > 0.02 ? cutState() : null, plane: true };
  }
  function render(now) {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var mm = m();
    if (S.dis) { drawDissolve(now); return; }
    var res = draw(ctx, W, H, mm, stNow(), colors, {});
    S.fit = res.fit; placeHot();
  }
  function placeHot() {
    var mm = m(), fit = S.fit; if (!fit) return;
    $$('.hot', hotWrap).forEach(function (b, i) {
      var h = mm.hot[i]; if (!h) return;
      var p = proj(fit, h.p);
      b.style.transform = 'translate(' + p[0].toFixed(1) + 'px,' + p[1].toFixed(1) + 'px)';
      var cs = S.build > 0.02 ? cutState() : null, gone = cs && cs.axis === 'x' && h.p[0] < cs.c, show = S.build > 0.98 && !S.dis && !gone;
      b.style.opacity = show ? 1 : 0; b.style.visibility = show ? 'visible' : 'hidden';
    });
    if (tip.__on !== undefined && tip.__on !== null) positionTip();
  }
  /* hotspots */
  function fillHot() {
    var mm = m(), bs = $$('.hot', hotWrap);
    bs.forEach(function (b, i) {
      var h = mm.hot[i]; b.setAttribute('aria-label', h.t + '. ' + h.d); b.setAttribute('data-i', i);
    });
    hideTip();
  }
  function showTip(b) {
    var i = parseInt(b.getAttribute('data-i'), 10), h = m().hot[i]; if (!h) return;
    tip.__on = b; tip.querySelector('b').textContent = h.t; tip.querySelector('span').textContent = h.d;
    tip.classList.add('on'); positionTip();
  }
  function positionTip() {
    var b = tip.__on; if (!b) return;
    var i = parseInt(b.getAttribute('data-i'), 10), h = m().hot[i], p = S.fit ? proj(S.fit, h.p) : [W / 2, H / 2];
    var tw = tip.offsetWidth || 220, th = tip.offsetHeight || 90;
    var left = p[0] > W / 2 ? p[0] - 34 - tw : p[0] + 34, top = clamp(p[1] - th - 26, 8, H - th - 8);
    tip.style.transform = 'translate(' + clamp(left, 8, W - tw - 8).toFixed(1) + 'px,' + top.toFixed(1) + 'px)';
    var ln = tip.querySelector('i');
    /* leader line from the callout box to the point */
    var ax = clamp(left, 8, W - tw - 8), bx = p[0] > W / 2 ? ax + tw : ax, by = top + th;
    var dx = p[0] - bx, dy = p[1] - by, len = Math.sqrt(dx * dx + dy * dy);
    ln.style.width = len.toFixed(1) + 'px';
    ln.style.transform = 'translate(' + (bx - ax).toFixed(1) + 'px,' + th + 'px) rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(2) + 'deg)';
  }
  function hideTip() { tip.__on = null; tip.classList.remove('on'); }
  $$('.hot', hotWrap).forEach(function (b) {
    b.addEventListener('pointerenter', function () { showTip(b); });
    b.addEventListener('focus', function () { showTip(b); });
    b.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') hideTip(); });
    b.addEventListener('blur', hideTip);
    b.addEventListener('click', function () { if (tip.__on === b && b.__tapped) { hideTip(); b.__tapped = false; } else { showTip(b); b.__tapped = true; } });
  });

  /* views */
  function setView(v, instant) {
    if (!VIEWS[v]) return;
    S.view = v; hideTip(); if (v === 'section') S.cut = true;
    viewBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === v ? 'true' : 'false'); });
    if (S.tween) S.tween.cancel();
    var va = viewAng(m(), v), a0 = S.a, f0 = S.f, a1 = va.a, f1 = va.f;
    if (instant || K.reduced) { S.a = a1; S.f = f1; }
    else S.tween = K.tween(600, K.ease.draft, function (e) { S.a = lerp(a0, a1, e); S.f = lerp(f0, f1, e); markDirty(); }, function () { S.tween = null; markDirty(); });
    S.hand = true; if (S.sweep) S.sweep = null;
    syncSlider(); words(); refreshStrip(); markDirty();
    cv.setAttribute('aria-label', m().name + ' interactive model, ' + v + ' view. Arrow keys orbit, P, S and A change view, the bracket keys move the cut plane, R resets.');
  }
  viewBtns.forEach(function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-view')); }); });

  /* cut plane slider */
  slider.addEventListener('input', function () {
    var fr = parseFloat(slider.value) / 1000; S.hand = true; S.sweep = null;
    if (S.view === 'plan') m().plan_c = fr * m().bb.y1; else { S.fx = fr; S.cut = true; }
    syncSlider(); markDirty();
  });
  function nudgeCut(d) { slider.value = clamp(parseFloat(slider.value) + d, 0, 1000); slider.dispatchEvent(new Event('input')); }

  /* orbit within +-20 degrees */
  var LIM = 20 * D2R;
  function orbit(da, df) { S.tOa = clamp(S.tOa + da, -LIM, LIM); S.tOf = clamp(S.tOf + df, -LIM, LIM); S.release = false; markDirty(); }
  cv.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' || K.mobile()) return;
    S.drag = { x: e.clientX, y: e.clientY, oa: S.tOa, of: S.tOf }; S.hand = true; S.sweep = null;
    try { cv.setPointerCapture(e.pointerId); } catch (er) {} markDirty();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!S.drag) return;
    S.tOa = clamp(S.drag.oa + (e.clientX - S.drag.x) * 0.006, -LIM, LIM);
    S.tOf = clamp(S.drag.of + (e.clientY - S.drag.y) * 0.006, -LIM, LIM); markDirty();
  });
  var endDrag = function () { if (S.drag) { S.drag = null; S.release = true; markDirty(); } };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  function resetView() { S.tOa = 0; S.tOf = 0; setView('axon'); S.release = false; markDirty(); }
  if (resetBtn) resetBtn.addEventListener('click', resetView);
  cv.addEventListener('keydown', function (e) {
    var k = e.key, s = 4 * D2R, used = true;
    if (k === 'ArrowLeft') orbit(-s, 0); else if (k === 'ArrowRight') orbit(s, 0);
    else if (k === 'ArrowUp') orbit(0, s); else if (k === 'ArrowDown') orbit(0, -s);
    else if (k === 'p' || k === 'P') setView('plan'); else if (k === 's' || k === 'S') setView('section'); else if (k === 'a' || k === 'A') setView('axon');
    else if (k === '[') nudgeCut(-20); else if (k === ']') nudgeCut(20);
    else if (k === 'r' || k === 'R') resetView(); else used = false;
    if (used) e.preventDefault();
  });
  cv.addEventListener('keyup', function (e) { if (e.key.indexOf('Arrow') === 0) { S.release = true; markDirty(); } });

  /* words */
  if (wordsBtn) wordsBtn.addEventListener('click', function () {
    var open = wordsBtn.getAttribute('aria-expanded') !== 'true';
    wordsBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); wordsBtn.querySelector('.wlb').textContent = open ? 'Hide the words' : 'Show the words';
    if (open) wordsBox.removeAttribute('hidden'); else wordsBox.setAttribute('hidden', '');
    wordsBox.classList.toggle('on', open);
  });

  /* ---- project switching with a 900 ms line dissolve ---- */
  function resample(segs, N) {
    var tot = 0, i; segs.forEach(function (s) { s[5] = Math.hypot(s[2] - s[0], s[3] - s[1]); tot += s[5]; });
    var out = [];
    segs.forEach(function (s) {
      var n = Math.max(1, Math.round(s[5] / Math.max(1, tot) * N)), j;
      for (j = 0; j < n; j++) { var t0 = j / n, t1 = (j + 1) / n; out.push([lerp(s[0], s[2], t0), lerp(s[1], s[3], t0), lerp(s[0], s[2], t1), lerp(s[1], s[3], t1), s[4]]); }
    });
    var rnd = function (i2) { var x = Math.sin(i2 * 12.9898) * 43758.5453; return x - Math.floor(x); };
    while (out.length > N) out.splice(Math.floor(rnd(out.length) * out.length), 1);
    while (out.length < N && out.length) { var q = out[Math.floor(rnd(out.length + 7) * out.length)]; out.push([q[0], q[1], (q[0] + q[2]) / 2, (q[1] + q[3]) / 2, q[4]]); }
    out.sort(function (a, b) { return (a[0] + a[2]) * 0.5 + (a[1] + a[3]) * 0.35 - ((b[0] + b[2]) * 0.5 + (b[1] + b[3]) * 0.35); });
    return out;
  }
  function segsFor(pid) {
    var mm = MODELS[pid], save = S.proj; S.proj = pid;
    var st = { a: S.a + S.oa, f: clamp(S.f + S.of, 0, Math.PI / 2), build: mm.levels, cut: (S.view === 'plan') ? { axis: 'y', c: mm.plan } : (S.cut ? { axis: 'x', c: mm.bb.x0 + S.fx * (mm.bb.x1 - mm.bb.x0) } : null), plane: false };
    var tmp = document.createElement('canvas'), c2 = setupCanvas(tmp, W, H), r = draw(c2, W, H, mm, st, colors, { collect: true, linesOnly: true, grid: false });
    S.proj = save; return r.segs;
  }
  function switchProject(pid, instant) {
    if (pid === S.proj && !instant) return;
    var prev = S.proj;
    if (K.reduced || instant || !ctx || S.build < 0.5) { applyProject(pid); return; }
    var src = resample(segsFor(prev), 1500);
    applyProject(pid, true);
    var dst = resample(segsFor(pid), 1500), N = 1500, i, del = [], amp = [];
    for (i = 0; i < N; i++) { del.push(Math.random() * 0.3); amp.push((Math.random() - 0.5) * 120); }
    S.dis = { t0: performance.now(), dur: 900, src: src, dst: dst, del: del, amp: amp };
    hideTip(); markDirty();
  }
  function drawDissolve(now) {
    var d = S.dis, t = clamp((now - d.t0) / d.dur, 0, 1), i, N = d.src.length;
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (i = 0; i < N; i++) {
      var s = d.src[i], e = d.dst[i], tt = clamp((t - d.del[i]) / 0.7, 0, 1), q = K.ease.draft(tt), sway = Math.sin(tt * Math.PI) * d.amp[i];
      var nx = lerp(s[0], e[0], q) + sway * 0.5, ny = lerp(s[1], e[1], q) - Math.abs(sway) * 0.6;
      var nx2 = lerp(s[2], e[2], q) + sway * 0.5, ny2 = lerp(s[3], e[3], q) - Math.abs(sway) * 0.6;
      ctx.strokeStyle = (tt < 0.5 ? s[4] : e[4]) ? colors.cyan : colors.ink;
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx2, ny2); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    if (t >= 1) { S.dis = null; markDirty(); }
  }
  function applyProject(pid) {
    S.proj = pid; var mm = m();
    S.build = mm.levels; S.bt = mm.levels;
    var vv = viewAng(mm, S.view); S.a = vv.a; S.f = vv.f;
    if (title) title.textContent = mm.name; if (parti) parti.textContent = PARTI[pid];
    var meta = META[pid]; if (sheetL) sheetL.textContent = meta.sheets[0] + ' to ' + meta.sheets[3]; if (placeL) placeL.textContent = meta.place;
    $$('[data-proj]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-proj') === pid ? 'true' : 'false'); });
    fillHot(); syncSlider(); words(); refreshStrip();
    cv.setAttribute('aria-label', mm.name + ' interactive model, ' + S.view + ' view. Arrow keys orbit, P, S and A change view, the bracket keys move the cut plane, R resets.');
    try { K.root.dispatchEvent(new CustomEvent('kern:proj', { detail: pid })); } catch (e) {}
    markDirty();
  }
  $$('[data-proj]').forEach(function (b) { b.addEventListener('click', function () { switchProject(b.getAttribute('data-proj')); }); });

  /* ---- drawing strip and lightbox ---- */
  var strip = $$('.dw', stage), lb = $('#lb');
  var VN = { plan: 'Plan', section: 'Section', axon: 'Axonometric', detail: 'Detail' }, ORDER = ['plan', 'section', 'axon', 'detail'];
  function refreshStrip() {
    var meta = META[S.proj];
    strip.forEach(function (b, i) {
      var v = ORDER[i], c = $('canvas', b), r = b.getBoundingClientRect();
      $('.dw-n', b).textContent = meta.sheets[i]; $('.dw-t', b).textContent = VN[v];
      b.setAttribute('aria-label', 'Open drawing ' + meta.sheets[i] + ': ' + m().name + ', ' + VN[v]);
      if (v === 'detail') {
        var holder = $('.dw-svg', b); holder.textContent = '';
        var src = document.getElementById('dt-' + S.proj); if (src) { var cl = src.cloneNode(true); cl.removeAttribute('id'); holder.appendChild(cl); }
      } else if (c) {
        var w = Math.max(120, Math.round(c.parentNode.clientWidth || 200)), h = Math.round(w * 0.62);
        K.model.still(S.proj, v, c, w, h, { frac: 0.5, cut: true, pad: 8 });
        c.style.width = w + 'px'; c.style.height = h + 'px';
      }
    });
  }
  function openLb(i) {
    if (!lb) return;
    var v = ORDER[i], mm = m(), meta = META[S.proj], fig = $('.lb-fig', lb);
    $('#lbSheet', lb).textContent = meta.sheets[i]; $('#lbT', lb).textContent = mm.name + ', ' + VN[v];
    $('#lbScale', lb).textContent = v === 'detail' ? mm.scale.detail : mm.scale[v];
    fig.textContent = '';
    if (v === 'detail') {
      var src = document.getElementById('dt-' + S.proj), cl = src.cloneNode(true); cl.removeAttribute('id'); cl.setAttribute('class', 'lb-svg'); fig.appendChild(cl);
    } else {
      var c = document.createElement('canvas'); c.className = 'lb-cv'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', WORDS[S.proj][v]);
      fig.appendChild(c);
      try { lb.showModal(); } catch (e) { lb.setAttribute('open', ''); }
      var w = fig.clientWidth || 900, h = Math.round(Math.min(w * 0.6, window.innerHeight * 0.6));
      c.style.width = w + 'px'; c.style.height = h + 'px';
      K.model.still(S.proj, v, c, w, h, { frac: 0.5, cut: true, pad: 24 });
      $('#lbCap', lb).textContent = WORDS[S.proj][v];
      var cb = $('#lbX', lb); if (cb) cb.focus();
      return;
    }
    $('#lbCap', lb).textContent = WORDS[S.proj].detail;
    try { lb.showModal(); } catch (e2) { lb.setAttribute('open', ''); }
    var cb2 = $('#lbX', lb); if (cb2) cb2.focus();
  }
  strip.forEach(function (b, i) { b.addEventListener('click', function () { openLb(i); }); });
  if (lb) {
    var closeLb = function () { try { lb.close(); } catch (e) { lb.removeAttribute('open'); } };
    var lx = $('#lbX', lb); if (lx) lx.addEventListener('click', closeLb);
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });
  }

  /* ---- pinned scroll sequencing ---- */
  var pinned = function () { return window.innerWidth > 1100 && window.innerHeight >= 620; };
  function progress(s) {
    var r = stage.getBoundingClientRect();
    if (!pinned()) return clamp((s.vh * 0.85 - r.top) / (s.vh * 0.6), 0, 1) * 0.5;
    return clamp(-r.top / Math.max(1, r.height - s.vh), 0, 1);
  }
  function startSweep() {
    if (S.sweep || S.swept || S.view !== 'axon') return;
    S.swept = true; S.hand = false; S.cut = true;
    S.sweep = { t0: performance.now(), dur: 3400, from: 0, to: 1 };
    var seq = S.sweep; markDirty();
    setTimeout(function () { if (S.sweep === seq && !S.hand) { S.sweep = { t0: performance.now(), dur: 900, from: 1, to: 0.5 }; markDirty(); } }, 3450);
  }
  K.onScroll(function (s) {
    var p = K.reduced ? 1 : progress(s);
    var want = p > 0.05 ? m().levels : 0;
    if (K.reduced) { S.bt = S.build = want; if (!S.swept) { S.swept = true; S.fx = 0.5; S.cut = true; syncSlider(); } markDirty(); return; }
    if (S.bt !== want) { S.bt = want; if (want === 0) { S.swept = false; S.sweep = null; S.cut = false; S.fx = 0.5; syncSlider(); } markDirty(); }
    if (p > 0.2 && S.build >= m().levels - 0.01 && !S.swept && S.view === 'axon') startSweep();
    if (p > 0.2 && !S.swept && S.build >= m().levels - 0.01) markDirty();
  });
  /* pause when off screen: initialise only when within one viewport */
  K.io(stage, function (isIn) { S.on = isIn; if (isIn) { if (!ctx) resize(); markDirty(); } }, { rootMargin: '100% 0px 100% 0px' });
  var rto = 0; window.addEventListener('resize', function () { clearTimeout(rto); rto = setTimeout(function () { if (ctx) { resize(); refreshStrip(); } }, 120); });
  var recolor = function () { setTimeout(function () { colors = readColors(); markDirty(); refreshStrip(); if (K.model.thumbs) K.model.thumbs(); }, 480); };
  K.root.addEventListener('kern:sheet', recolor);
  $$('.js-theme').forEach(function (tb) { tb.addEventListener('click', recolor); });
  wordsBox.setAttribute('hidden', '');
  applyProject('prairie'); S.build = 0; S.bt = 0; S.cut = false; setView('axon', true); syncSlider();
  K.model.S = S; K.model.switchProject = switchProject;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { colors = readColors(); markDirty(); });
  setTimeout(function () { if (K.reduced) { S.on = true; resize(); refreshStrip(); K.tickNow(); } }, 300);
  /* one-time thumbnails for the project list follower */
  K.model.thumbs = function () {
    $$('.pj-th').forEach(function (c) { var pid = c.getAttribute('data-p'); K.model.still(pid, 'axon', c, 320, 220, { pad: 10 }); });
  };
  K.model.thumbs(); refreshStrip();
});

/* ---------- project list: axonometric follows the cursor ---------- */
K.mods.push(function () {
  var list = $('.pj'), fol = $('#pjFol'); if (!list || !fol) return;
  var cvs = $$('.pj-th', fol), pos = { x: 0, y: 0 }, tgt = { x: 0, y: 0 }, vx = 0, on = false, raf = 0, tl = 0;
  var show = function (pid) { cvs.forEach(function (c) { c.style.display = c.getAttribute('data-p') === pid ? 'block' : 'none'; }); };
  function loop(now) {
    var dt = Math.min(64, now - (tl || now)); tl = now;
    var k = 1 - Math.exp(-dt / 120), nx = pos.x + (tgt.x - pos.x) * k, ny = pos.y + (tgt.y - pos.y) * k;
    vx = nx - pos.x; pos.x = nx; pos.y = ny;
    var tilt = clamp(vx * 0.35, -2, 2);
    fol.style.transform = 'translate(' + (pos.x + 24).toFixed(1) + 'px,' + (pos.y - 100).toFixed(1) + 'px) rotate(' + tilt.toFixed(2) + 'deg)';
    if (on || Math.abs(tgt.x - pos.x) > 0.5 || Math.abs(tgt.y - pos.y) > 0.5) raf = requestAnimationFrame(loop); else raf = 0;
  }
  if (!K.fine || K.reduced) return;
  $$('.pj-b', list).forEach(function (b) {
    b.addEventListener('pointerenter', function (e) {
      show(b.getAttribute('data-proj')); on = true; fol.classList.add('on');
      tgt.x = e.clientX; tgt.y = e.clientY; if (!raf) { pos.x = e.clientX; pos.y = e.clientY; tl = 0; raf = requestAnimationFrame(loop); }
    });
    b.addEventListener('pointermove', function (e) { tgt.x = e.clientX; tgt.y = e.clientY; });
    b.addEventListener('pointerleave', function () { on = false; fol.classList.remove('on'); });
  });
});
})();
