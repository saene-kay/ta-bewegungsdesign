/* ==========================================================================
   deck.js – Navigation, Schritt-Zustände, Skalierung, Referenten-Synchronisation
   Attribute im HTML:
     data-step="2"      sichtbar ab Schritt 2   ·   data-step="1-2"  nur in Schritt 1–2
     data-anim="rise"   Art des Erscheinens (siehe motion.css)
     data-i="1"         Index für Versatz (stagger)   ·   data-delay="300"  zusätzliche ms
     data-mod="3:is-dimmed 1-1:is-sending"   Klasse je Schritt-Bereich
     data-fx="pulse"    Akzent beim Vorwärtsgehen (data-fx-step, data-fx-delay)
     data-morph="key"   Morph zur Nachbarfolie mit gleichem Schlüssel
     data-cue="…"       Stichwort für die Referentenansicht
   ========================================================================== */
(function () {
  'use strict';

  const TA = (window.TA = window.TA || {});
  const motion = TA.motion;
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const EMBED = params.has('embed');
  const PRINT = params.has('print');

  const viewport = document.querySelector('.viewport');
  const stage = document.getElementById('stage');
  const layer = document.getElementById('morph-layer');
  const slides = [...stage.querySelectorAll('.slide')];

  let scale = 1;
  let cur = -1;
  let step = 0;
  let leaveTimer = 0;
  let presenter = null;
  let gotoBuffer = '';

  // ------------------------------------------------------------------------
  // Struktur einlesen
  // ------------------------------------------------------------------------
  function parseRange(value) {
    const m = String(value).trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return [0, Infinity];
    return [Number(m[1]), m[2] !== undefined ? Number(m[2]) : Infinity];
  }

  function rangeOf(el, slide) {
    const holder = el.closest('[data-step]');
    return holder && slide.contains(holder) ? parseRange(holder.dataset.step) : [0, Infinity];
  }

  function cueText(el) {
    return el.dataset.cue || '';
  }

  const meta = slides.map((s, index) => {
    const anims = [...s.querySelectorAll('[data-anim]')].map((el) => ({ el, r: rangeOf(el, s) }));
    const mods = [...s.querySelectorAll('[data-mod]')].flatMap((el) =>
      el.dataset.mod.trim().split(/\s+/).map((token) => {
        const [range, cls] = token.split(':');
        return { el, r: parseRange(range), cls };
      })
    );
    const fx = [...s.querySelectorAll('[data-fx]')].map((el) => ({
      el,
      at: el.dataset.fxStep !== undefined ? Number(el.dataset.fxStep) : rangeOf(el, s)[0],
      delay: Number(el.dataset.fxDelay || 0)
    }));

    const bounds = [];
    s.querySelectorAll('[data-step]').forEach((el) => {
      const [a, b] = parseRange(el.dataset.step);
      bounds.push(a);
      if (Number.isFinite(b)) bounds.push(b + 1);
    });
    mods.forEach(({ r }) => { bounds.push(r[0]); if (Number.isFinite(r[1])) bounds.push(r[1] + 1); });
    fx.forEach(({ at }) => bounds.push(at));

    const cues = {};
    s.querySelectorAll('[data-cue]').forEach((el) => {
      const at = el.hasAttribute('data-step') ? parseRange(el.dataset.step)[0] : rangeOf(el, s)[0];
      cues[at] = cues[at] ? `${cues[at]} · ${cueText(el)}` : cueText(el);
    });

    anims.forEach(({ el }) => {
      if (el.dataset.i) el.style.setProperty('--i', el.dataset.i);
      if (el.dataset.delay) el.style.setProperty('--d', `${el.dataset.delay}ms`);
    });

    const notesEl = s.querySelector('.notes');
    return {
      s,
      index,
      anims,
      mods,
      fx,
      cues,
      steps: Math.max(0, ...bounds),
      label: s.dataset.label || (s.querySelector('h1, h2') || {}).textContent || `Folie ${index + 1}`,
      time: s.dataset.time || '',
      hidden: s.hasAttribute('data-hidden'),
      notes: notesEl ? notesEl.innerHTML.trim() : ''
    };
  });

  const shownSlides = meta.filter((m) => !m.hidden);

  // ------------------------------------------------------------------------
  // Kapitel-Tracker aus der Agenda erzeugen (eine Quelle für beide)
  // ------------------------------------------------------------------------
  function buildTrackers() {
    const chapters = [...document.querySelectorAll('.agenda li')].map((li, i) => ({
      num: i + 1,
      label: (li.querySelector('[data-morph$="-label"]') || li).textContent.trim()
    }));
    document.querySelectorAll('.tracker').forEach((nav) => {
      const slide = nav.closest('.slide');
      const chapter = Number(slide.dataset.chapter || 0);
      const [subNow, subTotal] = (slide.dataset.sub || '').split('/').map(Number);
      nav.setAttribute('aria-label', 'Kapitel');
      nav.innerHTML = chapters.map(({ num, label }) => {
        const state = num < chapter ? 'is-done' : num === chapter ? 'is-current' : '';
        let dots = '';
        if (num === chapter && subTotal) {
          dots = '<span class="tr-dots" aria-hidden="true">' +
            Array.from({ length: subTotal }, (_, k) =>
              `<i class="${k + 1 < subNow ? 'is-done' : k + 1 === subNow ? 'is-current' : ''}"></i>`).join('') +
            '</span>';
        }
        return `<span class="tr-item ${state}"><b data-morph="ag${num}-num">${num}</b>` +
          `<span data-morph="ag${num}-label">${label}</span>${dots}</span>`;
      }).join('');
    });
  }

  // ------------------------------------------------------------------------
  // Zustände anwenden
  // ------------------------------------------------------------------------
  function within(n, r) { return n >= r[0] && n <= r[1]; }

  function applyState(i, n, instant) {
    const m = meta[i];
    if (instant) m.s.classList.add('no-motion');
    m.anims.forEach(({ el, r }) => el.classList.toggle('is-on', within(n, r)));
    const want = new Map();
    m.mods.forEach(({ el, r, cls }) => {
      const key = el;
      if (!want.has(key)) want.set(key, new Map());
      const classes = want.get(key);
      classes.set(cls, classes.get(cls) || within(n, r));
    });
    want.forEach((classes, el) => classes.forEach((on, cls) => el.classList.toggle(cls, on)));
    if (instant) {
      void m.s.offsetWidth;
      m.s.classList.remove('no-motion');
    }
  }

  /** Morph-Ziele (und ihre animierten Vorfahren) sofort sichtbar machen. */
  function preShowMorphTargets(i, n) {
    const m = meta[i];
    const targets = new Set();
    m.s.querySelectorAll('[data-morph]').forEach((el) => {
      if (!within(n, rangeOf(el, m.s))) return;
      for (let node = el; node && node !== m.s; node = node.parentElement) {
        if (node.hasAttribute('data-anim')) targets.add(node);
      }
    });
    targets.forEach((el) => el.classList.add('no-motion', 'is-on'));
    void m.s.offsetWidth;
    targets.forEach((el) => el.classList.remove('no-motion'));
  }

  function runFx(i, n) {
    meta[i].fx.forEach(({ el, at, delay }) => { if (at === n) motion.play(el, delay); });
  }

  function clearLeaving() {
    clearTimeout(leaveTimer);
    slides.forEach((s) => s.classList.remove('is-leaving'));
  }

  function settle() {
    motion.settle();
    clearLeaving();
  }

  // ------------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------------
  function show(i, n, { dir = 0, morph = false } = {}) {
    if (i < 0 || i >= meta.length) return;
    const m = meta[i];
    n = Math.max(0, Math.min(n, m.steps));
    if (i === cur) { setStep(n); return; }

    settle();
    const prev = cur;
    const entering = dir > 0 && n === 0;
    const doMorph = morph && prev >= 0 && motion.mode === 'full';

    if (entering) {
      applyState(i, -1, true);
      if (doMorph) preShowMorphTargets(i, 0);
    } else {
      applyState(i, n, true);
    }

    if (prev >= 0) {
      meta[prev].s.classList.remove('is-active');
      meta[prev].s.classList.add('is-leaving');
    }
    m.s.classList.add('is-active');
    m.s.setAttribute('aria-hidden', 'false');
    if (prev >= 0) meta[prev].s.setAttribute('aria-hidden', 'true');
    cur = i;
    step = n;

    if (doMorph) motion.morph(meta[prev].s, m.s, { stage, layer, scale });
    leaveTimer = setTimeout(clearLeaving, motion.ms('--dur-slide', 560) + 80);

    if (entering) {
      requestAnimationFrame(() => {
        if (cur !== i || step !== 0) return;
        applyState(i, 0, false);
        runFx(i, 0);
      });
    }
    sync();
  }

  function setStep(n) {
    const m = meta[cur];
    n = Math.max(0, Math.min(n, m.steps));
    if (n === step) return;
    motion.settle();
    const forwardByOne = n === step + 1;
    applyState(cur, n, Math.abs(n - step) > 1);
    if (forwardByOne) runFx(cur, n);
    step = n;
    sync();
  }

  function neighbour(i, dir) {
    for (let j = i + dir; j >= 0 && j < meta.length; j += dir) {
      if (!meta[j].hidden) return j;
    }
    return -1;
  }

  function next() {
    if (step < meta[cur].steps) { setStep(step + 1); return; }
    const j = neighbour(cur, 1);
    if (j >= 0) show(j, 0, { dir: 1, morph: true });
  }

  function prev() {
    if (step > 0) { setStep(step - 1); return; }
    const j = neighbour(cur, -1);
    if (j >= 0) show(j, meta[j].steps, { dir: -1, morph: true });
  }

  function nextSlide() {
    const j = neighbour(cur, 1);
    if (j >= 0) show(j, 0, { dir: 1 });
  }

  function prevSlide() {
    const j = neighbour(cur, -1);
    if (j >= 0) show(j, 0, { dir: -1 });
  }

  function goto(slideNumber, n = 0) {
    show(slideNumber - 1, n, { dir: n === 0 ? 1 : 0 });
  }

  // ------------------------------------------------------------------------
  // Adresse (#/folie/schritt), HUD, Referentenansicht
  // ------------------------------------------------------------------------
  function parseHash() {
    const m = location.hash.match(/^#\/?(\d+)(?:[/.](\d+))?/);
    return m ? { slide: Number(m[1]), step: Number(m[2] || 0) } : null;
  }

  function nextPosition() {
    if (step < meta[cur].steps) return { slide: cur + 1, step: step + 1, cue: meta[cur].cues[step + 1] || '' };
    const j = neighbour(cur, 1);
    return j >= 0 ? { slide: j + 1, step: 0, cue: meta[j].label } : null;
  }

  function state() {
    const m = meta[cur];
    return {
      slide: cur + 1,
      step,
      steps: m.steps,
      label: m.label,
      time: m.time,
      notes: m.notes,
      cue: m.cues[step] || '',
      next: nextPosition(),
      shownIndex: shownSlides.indexOf(m) + 1,
      shownTotal: shownSlides.length,
      motion: motion.label(motion.mode),
      outline: meta.map((x) => ({ slide: x.index + 1, label: x.label, time: x.time, hidden: x.hidden, steps: x.steps }))
    };
  }

  const hud = document.querySelector('.hud');
  const hudFill = document.querySelector('.hud-fill');
  const hudCount = document.querySelector('.hud-count');

  function updateHud() {
    if (!hud) return;
    const m = meta[cur];
    const pos = shownSlides.indexOf(m);
    const total = shownSlides.length;
    const fraction = pos >= 0 ? (pos + (m.steps ? step / (m.steps + 1) : 0)) / total : 1;
    hudFill.style.width = `${Math.min(1, fraction) * 100}%`;
    hudCount.textContent = pos >= 0
      ? `${pos + 1} / ${total} · ${step}/${m.steps}`
      : `Anhang · ${m.label}`;
  }

  function sync() {
    if (!EMBED) history.replaceState(null, '', `#/${cur + 1}/${step}`);
    updateHud();
    document.dispatchEvent(new CustomEvent('ta:change', { detail: { slide: cur + 1, step } }));
    if (presenter && !presenter.closed) presenter.postMessage({ ta: 'state', ...state() }, '*');
  }

  function openPresenter() {
    if (presenter && !presenter.closed) { presenter.focus(); return; }
    presenter = window.open('presenter.html', 'ta-presenter', 'popup,width=1320,height=860');
    if (!presenter) toast('Pop-up blockiert – bitte für diese Seite erlauben.');
  }

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object' || !('ta' in d)) return;

    if (EMBED) {
      if (e.source === window.parent && d.ta === 'goto') show(d.slide - 1, d.step || 0);
      return;
    }

    let fromPresenter = e.source === presenter;
    if (!fromPresenter && e.source) {
      try { fromPresenter = e.source.opener === window; } catch (err) { fromPresenter = false; }
    }
    if (!fromPresenter) return;
    presenter = e.source;

    switch (d.ta) {
      case 'hello': sync(); break;
      case 'next': next(); break;
      case 'prev': prev(); break;
      case 'nextSlide': nextSlide(); break;
      case 'prevSlide': prevSlide(); break;
      case 'goto': goto(d.slide, d.step || 0); break;
      case 'blackout': toggleBlackout(); break;
      default: break;
    }
  });

  // ------------------------------------------------------------------------
  // Hilfsmittel: Toast, Blackout, Safe-Zone, Hilfe, Vollbild
  // ------------------------------------------------------------------------
  const toastEl = document.querySelector('.toast');
  let toastTimer = 0;
  function toast(text) {
    if (!toastEl || EMBED) return;
    toastEl.textContent = text;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 1600);
  }

  const blackout = document.querySelector('.blackout');
  function toggleBlackout() { blackout && blackout.classList.toggle('is-on'); }

  const safezone = document.querySelector('.safezone');
  const help = document.querySelector('.help');

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => toast('Vollbild nicht verfügbar'));
  }

  let idleTimer = 0;
  function poke() {
    if (!hud || EMBED) return;
    hud.classList.add('is-visible');
    viewport.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      hud.classList.remove('is-visible');
      viewport.classList.add('is-idle');
    }, 2200);
  }

  // ------------------------------------------------------------------------
  // Eingaben
  // ------------------------------------------------------------------------
  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;

    if (help && !help.hidden && k !== '?' && k !== 'h' && k !== 'H') {
      if (k === 'Escape') help.hidden = true;
      return;
    }
    if (/^\d$/.test(k)) { gotoBuffer += k; toast(`Gehe zu Folie ${gotoBuffer} … (Enter)`); return; }

    switch (k) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
      case 'n':
        e.preventDefault();
        if (e.shiftKey) nextSlide(); else next();
        break;
      case 'Enter':
        e.preventDefault();
        if (gotoBuffer) { goto(Number(gotoBuffer)); gotoBuffer = ''; } else next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        e.preventDefault();
        if (e.shiftKey) prevSlide(); else prev();
        break;
      case 'Home': show(neighbour(-1, 1), 0, { dir: 1 }); break;
      case 'End': { const last = neighbour(meta.length, -1); show(last, meta[last].steps); break; }
      case 'b': case 'B': case '.': toggleBlackout(); break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'p': case 'P': openPresenter(); break;
      case 's': case 'S': if (safezone) safezone.hidden = !safezone.hidden; break;
      case 'm': case 'M': toast(`Bewegung: ${motion.label(motion.cycleMode())}`); sync(); break;
      case '?': case 'h': case 'H': if (help) help.hidden = !help.hidden; break;
      case 'Escape':
        gotoBuffer = '';
        if (blackout && blackout.classList.contains('is-on')) toggleBlackout();
        break;
      default: break;
    }
    // Kein HUD bei Tastendruck: Das Publikum sieht im geteilten Fenster sonst jedes Mal die Leiste.
  }

  // ------------------------------------------------------------------------
  // Skalierung, Übersicht/Druck, Start
  // ------------------------------------------------------------------------
  function fit() {
    scale = Math.max(0.05, Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    stage.style.setProperty('--scale', scale);
    root.style.setProperty('--print-zoom', Math.max(0.1, Math.min(1, (window.innerWidth - 32) / 1920)));
  }

  function enterPrintLayout() {
    settle();
    root.classList.add('is-print');
    meta.forEach((m, i) => applyState(i, m.steps, true));
  }

  function leavePrintLayout() {
    root.classList.remove('is-print');
    meta.forEach((m, i) => { if (i !== cur) applyState(i, -1, true); });
    applyState(cur, step, true);
  }

  function start() {
    motion.init({ forceMode: EMBED || PRINT ? 'off' : undefined });
    if (EMBED) root.classList.add('is-embed');
    buildTrackers();
    TA.diagram.buildAll(stage);
    slides.forEach((s) => s.setAttribute('aria-hidden', 'true'));
    fit();
    window.addEventListener('resize', () => { settle(); fit(); });

    if (PRINT) {
      enterPrintLayout();
      return;
    }

    const h = parseHash();
    const first = neighbour(-1, 1);
    if (h && h.slide >= 1 && h.slide <= meta.length) show(h.slide - 1, h.step, { dir: h.step === 0 ? 1 : 0 });
    else show(first, 0, { dir: 1 });

    window.addEventListener('hashchange', () => {
      const p = parseHash();
      if (p && (p.slide - 1 !== cur || p.step !== step)) show(p.slide - 1, p.step);
    });
    window.addEventListener('beforeprint', enterPrintLayout);
    window.addEventListener('afterprint', leavePrintLayout);

    if (EMBED) return;
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousemove', poke);
    viewport.addEventListener('click', (e) => {
      if (e.button !== 0 || e.target.closest('.help')) return;
      next();
    });
    viewport.addEventListener('contextmenu', (e) => { e.preventDefault(); prev(); });
    poke();
  }

  TA.deck = { next, prev, nextSlide, prevSlide, goto, state, meta };
  start();
})();
