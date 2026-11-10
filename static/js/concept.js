/* TimeTraveler concept animation.
   One looping story on a cooking stream: Record, then three questions asked at 0:28
   (look back, look now, look ahead). Everything is drawn from update(T), so any
   moment can be shown by calling update with that time. */
(function () {
  'use strict';
  var root = document.getElementById('concept');
  if (!root) return;

  var NS = 'http://www.w3.org/2000/svg';
  var C = {
    past: '#a40f16', cur: '#1d58a7', fut: '#ff5f05', futText: '#c84113',
    ink: '#13294b', soft: '#4b586c', faint: '#8590a0', line: '#e2e1da',
    card: '#ffffff', wash: '#f2f1ec',
    pastTint: '#f8ebeb', curTint: '#eaf0f8', futTint: '#fff1e8'
  };
  var SERIF = 'Spectral, Georgia, serif';
  var SANS = '"Public Sans", -apple-system, "Segoe UI", sans-serif';

  var W = 760, H = 366;
  var X0 = 40, X1 = 720, SMAX = 40, TQ = 28, TF = 36;
  var TRACK = 200, CARD_Y = 222, CARD_W = 96, CARD_H = 66, FR_Y = 104, FR_W = 82, FR_H = 60;
  function X(s) { return X0 + (X1 - X0) * s / SMAX; }

  /* timing (seconds of animation) */
  var REC_END = 7.2;                  // stream reaches 0:28
  var CH = [0, 8, 15.5, 21];          // chapter starts
  var FUT_A = 23.2, FUT_B = 28.2;     // stream runs 0:28 -> 0:36 while waiting
  var LOOP = 31;

  var KEYS = [
    { s: 3,  f: 'OBJECTS', v: ['3 tomatoes', 'on a board'],   icon: 'tomato', score: 0.22 },
    { s: 9,  f: 'TEXT',    v: ['jar label:', '“SEA SALT”'], icon: 'jar', score: 0.94 },
    { s: 15, f: 'ACTIONS', v: ['cracks eggs', 'into a bowl'], icon: 'eggs',   score: 0.30 },
    { s: 21, f: 'OBJECTS', v: ['a blue pan', 'on the stove'], icon: 'pan',    score: 0.18 },
    { s: 28, f: 'ACTIONS', v: ['stirs with a', 'wooden spoon'], icon: 'spoon', score: 0.36 },
    { s: 36, f: 'ACTIONS', v: ['omelette on', 'the plate'],   icon: 'plate',  score: 0 }
  ];
  var QS = [
    null,
    { key: 'past', q: 'What did the jar label say?', a: 'Sea salt', how: 'read from the 0:09 entry, Text field', target: 1, ax: 262 },
    { key: 'cur',  q: 'What is the person holding right now?', a: 'A wooden spoon', how: 'read from the newest entry, 0:28', target: 4, ax: 500 },
    { key: 'fut',  q: 'Tell me when the omelette is plated.', a: 'It is on the plate now', how: 'answered once, at 0:36, when the gate said yes', target: 5, ax: 556 }
  ];
  var CAPS = [
    { n: 'Record', t: 'Every second, a small frozen captioner writes the frame into the <b>Time Dictionary</b>: one structured entry with objects, actions, on-screen text and layout.' },
    { n: 'Look back', t: 'The planner picks <b class="t-past">Past</b>. Entries are scored against the question, older ones slightly penalized. The tiny jar label was kept as text, so it is still readable.' },
    { n: 'Look now', t: 'The planner picks <b class="t-current">Current</b> and reads only the newest entry, so older, similar moments cannot distract the answer.' },
    { n: 'Look ahead', t: 'The planner picks <b class="t-future">Future</b>. The answer is held while a light gate checks each new entry, and the answer model runs once, when the gate says yes.' }
  ];

  /* ---------- helpers ---------- */
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var a = { x: x, y: y };
    for (var k in attrs) a[k] = attrs[k];
    var t = el('text', a, parent);
    t.textContent = s;
    return t;
  }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ramp(T, a, b) { return clamp((T - a) / (b - a)); }
  function ease(p) { return p * p * (3 - 2 * p); }
  function win(T, a, b, fin, fout) { // fade in at a, fade out ending at b
    return ease(ramp(T, a, a + (fin || 0.4))) * (1 - ease(ramp(T, b - (fout || 0.35), b)));
  }
  function streamAt(T) {
    if (T < REC_END) return TQ * T / REC_END;
    if (T < FUT_A) return TQ;
    if (T < FUT_B) return TQ + (TF - TQ) * (T - FUT_A) / (FUT_B - FUT_A);
    return TF;
  }
  function crossT(s) { // animation time at which the stream reaches second s
    return s <= TQ ? s * REC_END / TQ : FUT_A + (s - TQ) * (FUT_B - FUT_A) / (TF - TQ);
  }
  function clock(s) { s = Math.floor(s); return '0:' + (s < 10 ? '0' : '') + s; }

  /* ---------- frame icons ---------- */
  function icon(g, kind) {
    var cx = FR_W / 2, cy = FR_H / 2;
    if (kind === 'tomato') {
      el('rect', { x: 10, y: 34, width: 62, height: 14, rx: 4, fill: '#d9bf98' }, g);
      [[24, 30], [41, 28], [58, 30]].forEach(function (p) {
        el('circle', { cx: p[0], cy: p[1], r: 9, fill: '#cf4b35' }, g);
        el('path', { d: 'M' + (p[0] - 4) + ' ' + (p[1] - 8) + ' l4 3 l4 -3', stroke: '#5c7a37', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, g);
      });
    } else if (kind === 'jar') {
      el('rect', { x: 28, y: 10, width: 26, height: 7, rx: 2, fill: '#7a6249' }, g);
      el('rect', { x: 25, y: 16, width: 32, height: 36, rx: 6, fill: '#e6edf0', stroke: '#a9b8bf', 'stroke-width': 1.2 }, g);
      el('rect', { x: 28, y: 27, width: 26, height: 12, rx: 1.5, fill: '#ffffff', stroke: '#c9d2d6', 'stroke-width': 0.8 }, g);
      txt(g, 41, 35.2, 'SEA SALT', { 'text-anchor': 'middle', 'font-size': 5.2, 'font-weight': 700, fill: C.ink, 'font-family': SANS, 'letter-spacing': '0.02em' });
    } else if (kind === 'eggs') {
      el('ellipse', { cx: 30, cy: 22, rx: 7, ry: 9, fill: '#f6ecd4', stroke: '#d8c7a0', 'stroke-width': 1 }, g);
      el('ellipse', { cx: 50, cy: 20, rx: 7, ry: 9, fill: '#f6ecd4', stroke: '#d8c7a0', 'stroke-width': 1 }, g);
      el('path', { d: 'M14 32 h54 a27 18 0 0 1 -54 0 z', fill: '#d6dde4', stroke: '#b4bec8', 'stroke-width': 1 }, g);
      el('ellipse', { cx: 41, cy: 33, rx: 13, ry: 3, fill: '#f2c14e' }, g);
    } else if (kind === 'pan' || kind === 'spoon') {
      el('circle', { cx: 36, cy: 32, r: 21, fill: '#3d4552' }, g);
      el('circle', { cx: 36, cy: 32, r: 17, fill: '#2f5d8a' }, g);
      el('rect', { x: 55, y: 29, width: 22, height: 6, rx: 3, fill: '#2b3440' }, g);
      if (kind === 'spoon') {
        el('ellipse', { cx: 34, cy: 33, rx: 11, ry: 9, fill: '#f2c14e' }, g);
        el('g', {}, g).appendChild(el('rect', { x: 30, y: 6, width: 5, height: 34, rx: 2.5, fill: '#b98b55', transform: 'rotate(28 32 23)' }));
        el('ellipse', { cx: 41, cy: 36, rx: 5, ry: 7, fill: '#a87a46', transform: 'rotate(28 41 36)' }, g);
      }
    } else if (kind === 'plate') {
      el('ellipse', { cx: cx, cy: cy + 2, rx: 30, ry: 22, fill: '#ffffff', stroke: '#c7ccd2', 'stroke-width': 1.2 }, g);
      el('ellipse', { cx: cx, cy: cy + 2, rx: 21, ry: 14, fill: 'none', stroke: '#e3e6ea', 'stroke-width': 1 }, g);
      el('path', { d: 'M' + (cx - 16) + ' ' + (cy + 4) + ' a16 11 0 0 1 32 0 z', fill: '#f2c14e', stroke: '#d9a53a', 'stroke-width': 1 }, g);
    }
  }

  /* ---------- build ---------- */
  var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
    'aria-label': 'Concept animation. A cooking stream is recorded into the Time Dictionary, one structured entry per second. Three questions arrive at 0:28. Look back: the jar label is read from the 0:09 entry. Look now: the newest entry says the person holds a wooden spoon. Look ahead: a gate checks new entries until the omelette is plated at 0:36.' });
  var defs = el('defs', {}, svg);
  [['past', C.past], ['cur', C.cur], ['fut', C.fut]].forEach(function (m) {
    var mk = el('marker', { id: 'cc-' + m[0], viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: m[1] }, mk);
  });
  var mkEnd = el('marker', { id: 'cc-end', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto' }, defs);
  el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: C.fut }, mkEnd);

  var all = el('g', {}, svg);

  /* record headline */
  var recHead = el('g', {}, all);
  txt(recHead, W / 2, 46, 'Recording', { 'text-anchor': 'middle', 'font-family': SERIF, 'font-size': 22, 'font-weight': 600, fill: C.ink });
  txt(recHead, W / 2, 70, 'one structured entry per second', { 'text-anchor': 'middle', 'font-family': SANS, 'font-size': 13, fill: C.soft });
  var recDot = el('circle', { cx: W / 2 - 62, cy: 39, r: 5, fill: C.past }, recHead);

  /* frames */
  var frames = KEYS.map(function (k) {
    var g = el('g', { transform: 'translate(' + (X(k.s) - FR_W / 2) + ' ' + FR_Y + ')' }, all);
    el('rect', { x: 0, y: 0, width: FR_W, height: FR_H, rx: 7, fill: '#f6f3ec', stroke: C.line, 'stroke-width': 1 }, g);
    icon(g, k.icon);
    return g;
  });

  /* track */
  var trackPast = el('line', { x1: X0, y1: TRACK, x2: X0, y2: TRACK, stroke: C.past, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, all);
  var trackFut = el('line', { x1: X0, y1: TRACK, x2: X1 + 22, y2: TRACK, stroke: C.fut, 'stroke-width': 2.5, 'stroke-dasharray': '7 7', 'marker-end': 'url(#cc-end)' }, all);
  var ticks = [], stubs = [];
  for (var s = 0; s <= SMAX; s++) {
    ticks.push(el('rect', { x: X(s) - 3.5, y: TRACK - 7, width: 7, height: 14, rx: 2, 'stroke-width': 1.3 }, all));
    stubs.push(el('rect', { x: X(s) - 2.5, y: TRACK + 12, width: 5, height: 5, rx: 1, fill: '#d3d0c6' }, all));
  }
  txt(all, X0, TRACK - 16, '0:00', { 'text-anchor': 'middle', 'font-family': SANS, 'font-size': 11, fill: C.faint });
  var nowG = el('g', {}, all);
  var nowLabel = txt(nowG, 0, TRACK - 16, 'now 0:28', { 'text-anchor': 'middle', 'font-family': SANS, 'font-size': 11.5, 'font-weight': 700, fill: C.cur });
  var nowLabelBg = el('rect', { x: -30, y: TRACK - 28, width: 60, height: 16, rx: 3, fill: '#ffffff' }, null);
  nowG.insertBefore(nowLabelBg, nowLabel);

  /* dictionary cards */
  var cards = KEYS.map(function (k) {
    var g = el('g', {}, all);
    var x = X(k.s) - CARD_W / 2;
    var link = el('line', { x1: X(k.s), y1: TRACK + 8, x2: X(k.s), y2: CARD_Y, stroke: C.line, 'stroke-width': 1.2, 'stroke-dasharray': '2 3' }, g);
    var box = el('rect', { x: x, y: CARD_Y, width: CARD_W, height: CARD_H, rx: 7, fill: C.card, stroke: C.line, 'stroke-width': 1.2 }, g);
    txt(g, x + 9, CARD_Y + 17, clock(k.s) + ' · ' + k.f, { 'font-family': SANS, 'font-size': 9.5, 'font-weight': 700, fill: C.faint, 'letter-spacing': '0.06em' });
    txt(g, x + 9, CARD_Y + 35, k.v[0], { 'font-family': SANS, 'font-size': 12, fill: C.ink });
    txt(g, x + 9, CARD_Y + 50, k.v[1], { 'font-family': SANS, 'font-size': 12, fill: C.ink, 'font-weight': k.icon === 'jar' ? 700 : 400 });
    var barBg = el('rect', { x: x + 9, y: CARD_Y + 57, width: CARD_W - 18, height: 3.5, rx: 1.75, fill: '#efeee8' }, g);
    var bar = el('rect', { x: x + 9, y: CARD_Y + 57, width: 0, height: 3.5, rx: 1.75, fill: C.past }, g);
    var check = el('g', { transform: 'translate(' + (x + CARD_W - 4) + ' ' + (CARD_Y + 4) + ')' }, g);
    el('circle', { cx: 0, cy: 0, r: 9, fill: C.fut }, check);
    el('path', { d: 'M -4 0 l 3 3 l 5 -6', stroke: '#fff', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, check);
    return { g: g, box: box, link: link, bar: bar, barBg: barBg, check: check, k: k };
  });

  /* question, planner, arrows, answer */
  var qG = el('g', {}, all);
  var qSmall = txt(qG, 520, 14, 'a question arrives at 0:28', { 'text-anchor': 'middle', 'font-family': SANS, 'font-size': 11.5, fill: C.soft });
  var qBox = el('rect', { x: 0, y: 22, width: 10, height: 38, rx: 10, fill: C.card, stroke: C.ink, 'stroke-width': 2 }, qG);
  var qText = txt(qG, 520, 47, '', { 'text-anchor': 'middle', 'font-family': SERIF, 'font-size': 17, 'font-weight': 600, fill: C.ink });

  var chipDefs = [{ key: 'past', n: 'Look back', x: 418, c: C.past, tint: C.pastTint },
                  { key: 'cur', n: 'Look now', x: 520, c: C.cur, tint: C.curTint },
                  { key: 'fut', n: 'Look ahead', x: 622, c: C.fut, tint: C.futTint, tc: C.futText }];
  var chipG = el('g', {}, all);
  txt(chipG, 362, 87, 'planner', { 'text-anchor': 'end', 'font-family': SANS, 'font-size': 11, 'font-weight': 600, fill: C.faint, 'letter-spacing': '0.06em' });
  var chips = chipDefs.map(function (d) {
    var g = el('g', {}, chipG);
    var r = el('rect', { x: d.x - 46, y: 70, width: 92, height: 25, rx: 12.5, fill: C.card, stroke: C.line, 'stroke-width': 1.2 }, g);
    var t = txt(g, d.x, 87.5, d.n, { 'text-anchor': 'middle', 'font-family': SERIF, 'font-size': 14, 'font-weight': 600, fill: C.faint });
    return { r: r, t: t, d: d };
  });

  var arrows = {
    past: el('path', { d: 'M 418 96 C 404 168, 236 150, 196 ' + (CARD_Y - 4), fill: 'none', stroke: C.past, 'stroke-width': 2.2, 'marker-end': 'url(#cc-past)', pathLength: 1 }, all),
    cur: el('path', { d: 'M 520 96 L ' + X(TQ) + ' ' + (CARD_Y - 4), fill: 'none', stroke: C.cur, 'stroke-width': 2.2, 'marker-end': 'url(#cc-cur)', pathLength: 1 }, all),
    fut: el('path', { d: 'M 622 96 C 640 130, 652 150, ' + X(TF) + ' ' + (TRACK - 33), fill: 'none', stroke: C.fut, 'stroke-width': 2.2, 'marker-end': 'url(#cc-fut)', pathLength: 1 }, all)
  };

  var aG = el('g', {}, all);
  var aBox = el('rect', { x: 0, y: 302, width: 10, height: 50, rx: 10, fill: C.card, stroke: C.ink, 'stroke-width': 1.6 }, aG);
  var aLine = txt(aG, W / 2, 323, '', { 'text-anchor': 'middle', 'font-family': SERIF, 'font-size': 17, 'font-weight': 600, fill: C.ink });
  var aLab = el('tspan', { 'font-family': SANS, 'font-size': 11, 'font-weight': 700, 'letter-spacing': '0.08em' }, aLine);
  var aVal = el('tspan', {}, aLine);
  var aHow = txt(aG, W / 2, 342, '', { 'text-anchor': 'middle', 'font-family': SANS, 'font-size': 11.5, fill: C.soft });

  var waitG = el('g', {}, all);
  var waitT = txt(waitG, 556, 330, '', { 'text-anchor': 'middle', 'font-family': SANS, 'font-size': 13, 'font-style': 'italic', fill: C.futText });

  /* ---------- HTML chrome ---------- */
  var stage = document.createElement('div');
  stage.className = 'concept-stage';
  stage.appendChild(svg);
  root.appendChild(stage);
  var bar = document.createElement('div');
  bar.className = 'concept-bar';
  var play = document.createElement('button');
  play.type = 'button'; play.className = 'concept-play'; play.setAttribute('aria-label', 'Pause');
  bar.appendChild(play);
  var chipBtns = CAPS.map(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'concept-step s' + i;
    b.innerHTML = '<span class="num">' + (i + 1) + '</span>' + c.n + '<i class="prog"></i>';
    b.addEventListener('click', function () { jump(i); });
    bar.appendChild(b);
    return b;
  });
  root.appendChild(bar);
  var cap = document.createElement('p');
  cap.className = 'concept-cap';
  cap.setAttribute('aria-live', 'polite');
  root.appendChild(cap);

  /* ---------- update ---------- */
  function setChip(ch, on, vis) {
    var d = ch.d;
    ch.r.setAttribute('fill', on ? d.c : C.card);
    ch.r.setAttribute('stroke', on ? d.c : C.line);
    ch.t.setAttribute('fill', on ? '#ffffff' : C.faint);
  }
  function fitBox(box, textEl, cx, padX) {
    var w = 0;
    try { w = textEl.getComputedTextLength(); } catch (e) { w = 200; }
    box.setAttribute('width', w + padX * 2);
    box.setAttribute('x', cx - (w + padX * 2) / 2);
  }
  var lastCh = -1, lastQ = -1, userPan = false;
  function mix(a, b, p) { return a + (b - a) * ease(clamp(p)); }
  function focusAt(T, s) {
    if (T < CH[1]) return Math.max(210, Math.min(560, X(s)));
    if (T < CH[2]) return T < 11.0 ? mix(Math.max(210, Math.min(560, X(TQ))), 520, ramp(T, 8.0, 8.6))
                                   : mix(520, 285, ramp(T, 11.0, 12.0));
    if (T < CH[3]) return mix(285, 505, ramp(T, CH[2], CH[2] + 0.6));
    return Math.max(mix(505, 560, ramp(T, CH[3], CH[3] + 0.6)), Math.min(600, X(s) - 30));
  }
  ['touchstart', 'wheel'].forEach(function (ev) {
    stage.addEventListener(ev, function () { userPan = true; }, { passive: true });
  });

  function chapterOf(T) { var c = 0; for (var i = 0; i < CH.length; i++) if (T >= CH[i]) c = i; return c; }

  function update(T) {
    var s = streamAt(T);
    var si = Math.floor(s + 1e-6);
    var fadeAll = 1 - ease(ramp(T, LOOP - 0.5, LOOP));
    all.setAttribute('opacity', (fadeAll * ease(ramp(T, 0, 0.35))).toFixed(3));
    var ch = chapterOf(T);

    recHead.setAttribute('opacity', win(T, 0.1, 7.9, 0.4, 0.5).toFixed(3));
    recDot.setAttribute('opacity', (0.35 + 0.65 * (Math.sin(T * 6) > 0 ? 1 : 0)).toFixed(2));

    /* track and ticks */
    trackPast.setAttribute('x2', X(s));
    trackFut.setAttribute('x1', X(s));
    for (var i = 0; i <= SMAX; i++) {
      var t = ticks[i];
      if (i < si && i > TQ) { t.setAttribute('fill', C.futTint); t.setAttribute('stroke', C.fut); t.removeAttribute('stroke-dasharray'); t.setAttribute('opacity', 1); }
      else if (i < si) { t.setAttribute('fill', C.pastTint); t.setAttribute('stroke', C.past); t.removeAttribute('stroke-dasharray'); t.setAttribute('opacity', 1); }
      else if (i === si) { t.setAttribute('fill', C.curTint); t.setAttribute('stroke', C.cur); t.removeAttribute('stroke-dasharray'); t.setAttribute('opacity', 1); }
      else { t.setAttribute('fill', '#ffffff'); t.setAttribute('stroke', C.fut); t.setAttribute('stroke-dasharray', '2 2'); t.setAttribute('opacity', 0.75); }
      var isKey = KEYS.some(function (k) { return k.s === i; });
      stubs[i].setAttribute('opacity', (!isKey && i <= si) ? ease(ramp(T, crossT(i) + 0.1, crossT(i) + 0.35)) : 0);
    }
    nowG.setAttribute('transform', 'translate(' + X(s) + ' 0)');
    nowLabel.textContent = 'now ' + clock(s);

    /* frames and cards */
    var dim = 1 - 0.62 * ease(ramp(T, 7.9, 8.6));
    KEYS.forEach(function (k, j) {
      var tc = crossT(k.s);
      var seen = s >= k.s - 1e-6;
      var fo = seen ? ease(ramp(T, tc, tc + 0.3)) : 0;
      var fdim = (k.s === TF) ? 1 : dim;
      frames[j].setAttribute('opacity', (fo * fdim).toFixed(3));
      var co = seen ? ease(ramp(T, tc + 0.25, tc + 0.65)) : 0;
      var c = cards[j];
      c.g.setAttribute('opacity', co.toFixed(3));
      c.g.setAttribute('transform', 'translate(0 ' + ((1 - co) * -8).toFixed(2) + ')');
      /* reset styling */
      var stroke = C.line, fill = C.card, sw = 1.2, barW = 0, check = 0;
      if (ch === 1) {
        var pb = ease(ramp(T, 9.8 + j * 0.12, 10.6 + j * 0.12)) * (1 - ease(ramp(T, 15.1, 15.5)));
        barW = (CARD_W - 18) * k.score * pb;
        if (j === 1) {
          var h = ease(ramp(T, 11.5, 11.9)) * (1 - ease(ramp(T, 15.1, 15.5)));
          if (h > 0.01) { stroke = C.past; fill = C.pastTint; sw = 1.2 + 1.2 * h; }
        }
      } else if (ch === 2 && j === 4) {
        var h2 = ease(ramp(T, 17.3, 17.7)) * (1 - ease(ramp(T, 20.6, 21)));
        if (h2 > 0.01) { stroke = C.cur; fill = C.curTint; sw = 1.2 + 1.2 * h2; }
      } else if (ch === 3 && j === 5) {
        stroke = C.fut; fill = C.futTint; sw = 2.4;
        check = ease(ramp(T, FUT_B + 0.3, FUT_B + 0.6));
      }
      c.box.setAttribute('stroke', stroke); c.box.setAttribute('fill', fill); c.box.setAttribute('stroke-width', sw);
      c.bar.setAttribute('width', barW.toFixed(2));
      c.barBg.setAttribute('opacity', ch === 1 ? (1 - ease(ramp(T, 15.1, 15.5))) * ease(ramp(T, 9.6, 9.9)) : 0);
      c.check.setAttribute('opacity', check.toFixed(3));
    });

    /* question chapters */
    var q = QS[ch];
    var qa = 0, chipA = 0, lit = 0, arr = 0, ans = 0, wait = 0;
    if (q) {
      var a = CH[ch], end = ch === 3 ? LOOP - 0.5 : CH[ch + 1];
      qa = win(T, a + 0.1, end, 0.45, 0.4);
      chipA = win(T, a + 0.6, end, 0.4, 0.4);
      lit = ease(ramp(T, a + 1.1, a + 1.35));
      if (ch === 1) { arr = ramp(T, 11.0, 11.8); ans = win(T, 12.2, end, 0.4, 0.4); }
      if (ch === 2) { arr = ramp(T, 16.9, 17.5); ans = win(T, 17.9, end, 0.4, 0.4); }
      if (ch === 3) {
        arr = ramp(T, 22.3, 22.9);
        wait = win(T, 22.9, FUT_B + 0.35, 0.35, 0.3);
        ans = win(T, FUT_B + 0.5, end, 0.4, 0.4);
      }
      if (lastQ !== ch) {
        qText.textContent = q.q;
        fitBox(qBox, qText, 520, 18);
        aLab.textContent = 'ANSWER  ';
        aVal.textContent = q.a;
        aHow.textContent = q.how;
        var col = q.key === 'past' ? C.past : q.key === 'cur' ? C.cur : C.futText;
        aLab.setAttribute('fill', col);
        aBox.setAttribute('stroke', q.key === 'fut' ? C.fut : col);
        aLine.setAttribute('x', q.ax); aHow.setAttribute('x', q.ax);
        lastQ = ch;
      }
      fitBox(aBox, aHow.getComputedTextLength() > aLine.getComputedTextLength() ? aHow : aLine, q.ax, 22);
      chips.forEach(function (c) { setChip(c, lit > 0.5 && c.d.key === q.key); });
    } else {
      lastQ = -1;
    }
    qG.setAttribute('opacity', qa.toFixed(3));
    chipG.setAttribute('opacity', chipA.toFixed(3));
    ['past', 'cur', 'fut'].forEach(function (k) {
      var on = q && q.key === k;
      var p = on ? ease(arr) : 0;
      var fadeOut = on ? qa : 0;
      arrows[k].setAttribute('stroke-dasharray', '1');
      arrows[k].setAttribute('stroke-dashoffset', (1 - p).toFixed(3));
      arrows[k].setAttribute('opacity', (p > 0.001 ? fadeOut : 0).toFixed(3));
    });
    aG.setAttribute('opacity', ans.toFixed(3));
    nowG.setAttribute('opacity', (ch === 2 ? 1 - ease(ramp(T, 16.7, 17.0)) * qa : 1).toFixed(3));
    waitG.setAttribute('opacity', wait.toFixed(3));
    if (wait > 0) waitT.textContent = si <= TQ ? 'waiting: the gate will check each new entry'
      : 'waiting: the gate checks the ' + clock(si) + ' entry' + (si < TF ? ', not yet' : ', yes');

    /* narrow screens: the stage scrolls sideways and a camera follows the action */
    var over = stage.scrollWidth - stage.clientWidth;
    if (over > 4) {
      var k = svg.getBoundingClientRect().width / W;
      var f = focusAt(T, s);
      recHead.setAttribute('transform', 'translate(' + (f - W / 2).toFixed(1) + ' 0)');
      if (!userPan) stage.scrollLeft = Math.max(0, Math.min(over, f * k - stage.clientWidth / 2));
    } else {
      recHead.removeAttribute('transform');
    }

    /* chrome */
    if (ch !== lastCh) {
      userPan = false;
      cap.innerHTML = CAPS[ch].t;
      chipBtns.forEach(function (b, i) { b.classList.toggle('on', i === ch); });
      lastCh = ch;
    }
    var segEnd = ch < 3 ? CH[ch + 1] : LOOP;
    chipBtns.forEach(function (b, i) {
      var p = i < ch ? 1 : i > ch ? 0 : (T - CH[ch]) / (segEnd - CH[ch]);
      b.querySelector('.prog').style.transform = 'scaleX(' + clamp(p).toFixed(3) + ')';
    });
  }

  /* ---------- playback ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var T = 0, playing = !reduce, visible = true, last = null;
  var HOLD = [7.6, 14.8, 20.4, 30.2]; // a still that tells each chapter's story
  function setPlaying(p) {
    playing = p;
    play.classList.toggle('paused', !p);
    play.setAttribute('aria-label', p ? 'Pause' : 'Play');
    last = null;
  }
  function jump(i) {
    T = reduce ? HOLD[i] : CH[i] + 0.001;
    update(T);
    if (!reduce) setPlaying(true);
  }
  play.addEventListener('click', function () {
    if (reduce) { jump((chapterOf(T) + 1) % 4); return; }
    setPlaying(!playing);
  });
  function tick(now) {
    if (playing && visible) {
      if (last !== null) {
        T += Math.min(0.1, (now - last) / 1000);
        if (T >= LOOP) T = 0;
        update(T);
      }
      last = now;
    } else {
      last = null;
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.15 }).observe(root);
  }
  setPlaying(playing);
  if (reduce) T = HOLD[0];
  update(T);
  requestAnimationFrame(tick);

  window.__ttConcept = { set: function (t) { T = t; setPlaying(false); update(T); }, loop: LOOP, chapters: CH };
})();
