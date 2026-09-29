/* Kern Studio drawing set. Chapters 07 to 09 and coda. */
(function () {
'use strict';
var K = window.KERN; if (!K) return;
var $ = K.$, $$ = K.$$, clamp = K.clamp, lerp = K.lerp;

/* ---------- 07 The Site: pinned horizontal track, carousel on small screens ---------- */
K.mods.push(function () {
  var wrap = $('[data-track]'); if (!wrap) return;
  var vp = $('#trV'), track = $('#trT'), items = $$('.sh7', track), n = items.length;
  var cnt = $('#trN'), bar = $('#trB'), dots = $$('#trD button'), tip = $('#mkTip'), cur = -1, dist = 0, mode = '';
  function setIdx(i) {
    if (i === cur) return; cur = i; cnt.textContent = (i + 1) + ' / ' + n;
    dots.forEach(function (d, j) { if (j === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  }
  function hideTip() { tip.classList.remove('on'); $$('.mk.on', wrap).forEach(function (b) { b.classList.remove('on'); }); }
  function showTip(b) {
    hideTip(); tip.textContent = b.getAttribute('data-t'); b.classList.add('on');
    var r = b.getBoundingClientRect(), tw = 264, th = tip.offsetHeight || 90, vw = window.innerWidth, vh = window.innerHeight;
    var left = clamp(r.left + r.width / 2 - tw / 2, 8, vw - tw - 8), top = r.top - th - 10;
    if (top < 8) top = Math.min(vh - th - 8, r.bottom + 10);
    tip.style.left = left.toFixed(0) + 'px'; tip.style.top = top.toFixed(0) + 'px'; tip.classList.add('on');
  }
  $$('.mk', wrap).forEach(function (b) {
    b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') showTip(b); });
    b.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') hideTip(); });
    b.addEventListener('focus', function () { showTip(b); });
    b.addEventListener('blur', hideTip);
    b.addEventListener('click', function () { if (b.classList.contains('on') && b.__tap) { hideTip(); b.__tap = false; } else { showTip(b); b.__tap = true; } });
  });
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest || !e.target.closest('.mk')) hideTip(); });
  function layout() {
    var car = K.narrow() || K.reduced; mode = car ? 'car' : 'pin';
    wrap.classList.toggle('car', car);
    track.style.transform = '';
    if (car) { wrap.style.height = ''; vp.scrollLeft = 0; onCar(); return; }
    var vw = vp.clientWidth; dist = Math.max(0, track.scrollWidth - vw);
    wrap.style.height = Math.round(dist * 0.85 + window.innerHeight) + 'px';
    K.tickNow();
  }
  function onCar() {
    var w = items[0].offsetWidth + 32, i = clamp(Math.round(vp.scrollLeft / Math.max(1, w)), 0, n - 1); setIdx(i);
  }
  vp.addEventListener('scroll', function () { if (mode === 'car') { onCar(); hideTip(); } }, { passive: true });
  dots.forEach(function (d, i) { d.addEventListener('click', function () { var it = items[i]; if (mode === 'car') vp.scrollTo({ left: it.offsetLeft - (vp.clientWidth - it.offsetWidth) / 2, behavior: K.reduced ? 'auto' : 'smooth' }); }); });
  K.onScroll(function (s) {
    if (mode !== 'pin') return;
    var r = wrap.getBoundingClientRect(), total = Math.max(1, r.height - s.vh), p = clamp(-r.top / total, 0, 1);
    track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
    bar.style.width = (p * 100).toFixed(1) + '%';
    setIdx(clamp(Math.floor(p * n * 0.999), 0, n - 1));
    if (tip.classList.contains('on')) hideTip();
  });
  /* keyboard focus inside the pinned track brings that sheet into view */
  track.addEventListener('focusin', function (e) {
    if (mode !== 'pin') return;
    var li = e.target.closest ? e.target.closest('.sh7') : null; if (!li) return;
    var i = items.indexOf(li), r = wrap.getBoundingClientRect(), total = Math.max(1, r.height - window.innerHeight);
    var want = (window.pageYOffset + r.top) + (i / Math.max(1, n - 1)) * total * 0.98;
    window.scrollTo(0, want);
  });
  layout(); setIdx(0);
  var rt = 0; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(layout, 80); });
});
/* ---------- 08 The Details: copy hex, live type, icons, toggle demo ---------- */
K.mods.push(function () {
  var toast = $('#toast'), tt = 0;
  function say(t) { if (!toast) return; toast.textContent = t; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 1700); }
  function fallback(hex) {
    var ok = false;
    try {
      var ta = document.createElement('textarea'); ta.value = hex; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) {}
    say(ok ? 'Copied ' + hex : 'Copy blocked. Hex: ' + hex);
  }
  function copy(hex) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(hex).then(function () { say('Copied ' + hex); }, function () { fallback(hex); }); return; } } catch (e) {}
    fallback(hex);
  }
  $$('.sl').forEach(function (b) { b.addEventListener('click', function () { copy(b.getAttribute('data-hex')); }); });
  /* live type specimen */
  var ty = $('.ds-ty'), tw = $('#tyW'), tg = $('#tyG'), ti = $('#tyI'), two = $('#tyWo'), tgo = $('#tyGo');
  if (ty && tw && tg && ti) {
    tw.value = 90; tg.value = 700;
    var upd = function () { ty.style.setProperty('--tw', tw.value); ty.style.setProperty('--tg', tg.value); two.textContent = tw.value; tgo.textContent = tg.value; };
    var txt = function () { var v = ti.value.trim() || 'Kern Studio'; $$('#tyA,#tyF1,#tyF2,#tyF3').forEach(function (e) { e.textContent = v; }); };
    tw.addEventListener('input', upd); tg.addEventListener('input', upd); ti.addEventListener('input', txt); upd();
  }
  /* icons: stop the entry animation after it has played so hover can replay cleanly */
  $$('.icg').forEach(function (g) { g.addEventListener('kern:in', function () { setTimeout(function () { g.classList.add('done'); }, 1600); }); });
  /* component toggle demo */
  $$('.pill.demo').forEach(function (p) { p.addEventListener('click', function () { p.setAttribute('aria-pressed', p.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }); });
});
/* ---------- 09 The Numbers and the coda ---------- */
K.mods.push(function () {
  var b = $('#lsBtn'), w = $('#lsWords');
  if (b && w) {
    w.setAttribute('hidden', '');
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open ? 'true' : 'false'); $('.wlb', b).textContent = open ? 'Hide the words' : 'Show the words';
      if (open) w.removeAttribute('hidden'); else w.setAttribute('hidden', '');
    });
  }
  /* footer wordmark plays the logo animation in reverse as the reader reaches the bottom */
  var fw = $('#footWm');
  if (fw) {
    K.wm.set(fw, 0, 0); K.wm.scroll(fw);
    var fr = 0;
    window.addEventListener('resize', function () {
      clearTimeout(fr);
      fr = setTimeout(function () { if (K.reduced) K.wm.set(fw, 0, 0); else K.tickNow(); }, 150);
    });
  }
});
})();
