/* Kern Studio drawing set. Chapters 01 to 04. */
(function () {
'use strict';
var K = window.KERN; if (!K) return;
var $ = K.$, $$ = K.$$, clamp = K.clamp, lerp = K.lerp;

/* ---------- 02 The Research: audit matrix callouts ---------- */
K.mods.push(function () {
  var mx = $('.mx'); if (!mx) return;
  var tip = $('#mxTip'), rows = $$('.mx-r', mx);
  function show(li) {
    rows.forEach(function (r) { r.classList.toggle('on', r === li); });
    tip.textContent = li.getAttribute('data-note');
    var idx = rows.indexOf(li), top = li.offsetTop + li.offsetHeight + 6;
    if (idx >= 9) top = li.offsetTop - tip.offsetHeight - 6;
    tip.style.top = top + 'px'; tip.classList.add('on');
  }
  function hide() { rows.forEach(function (r) { r.classList.remove('on'); }); tip.classList.remove('on'); }
  rows.forEach(function (li) {
    li.addEventListener('pointerenter', function () { show(li); });
    li.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') hide(); });
    var b = $('.mx-b', li);
    b.addEventListener('focus', function () { show(li); });
    b.addEventListener('blur', hide);
    b.addEventListener('click', function () { show(li); });
  });
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest || !e.target.closest('.mx-r')) hide(); });
});
/* ---------- 03 The Insight ---------- */
K.mods.push(function () {
  /* section cut: lower half of the quote slides two units right on scroll */
  var pq = $('[data-pq]');
  if (pq) {
    var b = $('.pq-b', pq);
    K.onScroll(function (s) {
      var unit = clamp(window.innerWidth * 0.008, 6, 12), sh = unit * 2, p;
      if (K.reduced) p = 1;
      else { var r = pq.getBoundingClientRect(), c = r.top + r.height * 0.55; p = clamp((s.vh * 0.8 - c) / (s.vh * 0.5), 0, 1); }
      b.style.transform = 'translateX(' + (K.ease.draft(p) * sh).toFixed(2) + 'px)';
    });
  }
  /* persona sheets fan out */
  var st = $('[data-fan]');
  if (st) {
    var cards = $$('.ps', st);
    K.onScroll(function (s) {
      var step = K.mobile() ? 10 : 24, base = cards[0].offsetTop, p;
      if (K.reduced) p = 1;
      else { var r = st.getBoundingClientRect(); p = K.ease.draft(clamp((s.vh * 0.85 - r.top) / (s.vh * 0.5), 0, 1)); }
      cards.forEach(function (c, i) {
        var dy = -(c.offsetTop - base) * (1 - p);
        c.style.transform = 'translate(' + (i * step * p).toFixed(2) + 'px,' + dy.toFixed(2) + 'px) rotate(' + (i * p).toFixed(3) + 'deg)';
      });
    });
  }
  /* wireframe wipe */
  var wp = $('[data-wipe]');
  if (wp) {
    var fr = $('.wipe-frame', wp), h = $('.dh', wp), tx = $('.dh-t', wp), v = 50, drag = false;
    var set = function (nv) {
      v = clamp(nv, 2, 98);
      fr.style.setProperty('--w1', v + '%'); fr.style.setProperty('--w2', Math.min(100, v + 30) + '%');
      h.setAttribute('aria-valuenow', Math.round(v));
      h.setAttribute('aria-valuetext', Math.round(v) + ' percent near-final');
      tx.textContent = Math.round(v / 100 * 640 * 0.2646) + ' mm';
    };
    var at = function (e) { var r = fr.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    fr.addEventListener('pointerdown', function (e) { drag = true; try { fr.setPointerCapture(e.pointerId); } catch (er) {} at(e); });
    fr.addEventListener('pointermove', function (e) { if (drag) at(e); });
    var up = function () { drag = false; };
    fr.addEventListener('pointerup', up); fr.addEventListener('pointercancel', up);
    h.addEventListener('keydown', function (e) {
      var d = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(v - d); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(v + d); e.preventDefault(); }
      else if (e.key === 'Home') { set(2); e.preventDefault(); }
      else if (e.key === 'End') { set(98); e.preventDefault(); }
    });
    set(50);
  }
});
/* ---------- 04 The Structure: accessible tab panel ---------- */
K.mods.push(function () {
  $$('[data-tabs]').forEach(function (root) {
    var tabs = $$('[role="tab"]', root), panels = $$('[role="tabpanel"]', root);
    function sel(i, focus) {
      tabs.forEach(function (t, j) {
        var on = j === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false'); t.setAttribute('tabindex', on ? '0' : '-1');
        if (panels[j]) { if (on) panels[j].removeAttribute('hidden'); else panels[j].setAttribute('hidden', ''); }
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { sel(i); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown') { sel((i + 1) % n, true); e.preventDefault(); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp') { sel((i + n - 1) % n, true); e.preventDefault(); }
        else if (k === 'Home') { sel(0, true); e.preventDefault(); }
        else if (k === 'End') { sel(n - 1, true); e.preventDefault(); }
      });
    });
    sel(0);
  });
});
})();
