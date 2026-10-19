/* ==========================================================================
   presenter.js: Referentenansicht mit Notizen, Vorschau, Timer gegen den Plan
   Wird aus der Präsentation mit Taste P geöffnet und spricht per postMessage mit ihr.
   ========================================================================== */
(function () {
  'use strict';

  const TARGET = 9 * 60;   // Ziel 9:00
  const LIMIT = 10 * 60;   // Zeitrahmen 10:00
  const deck = window.opener;
  const $ = (id) => document.getElementById(id);

  const ui = {
    position: $('p-position'),
    title: $('p-title'),
    steps: $('p-steps'),
    now: $('p-now'),
    next: $('p-next'),
    cueNow: $('p-cue-now'),
    cueNext: $('p-cue-next'),
    elapsed: $('p-elapsed'),
    status: $('p-status'),
    plan: $('p-plan'),
    segments: $('p-segments'),
    playhead: $('p-playhead'),
    toggle: $('p-toggle'),
    reset: $('p-reset'),
    notes: $('p-notes'),
    link: $('p-link')
  };

  let state = null;
  let outlineDrawn = false;
  let running = false;
  let startedAt = 0;
  let accumulated = 0;
  let autoStart = true;
  let notesSize = 22;
  const framesReady = { now: false, next: false };

  // ------------------------------------------------------------------------
  // Zeit
  // ------------------------------------------------------------------------
  function parseClock(s) {
    const [m, sec] = s.split(':').map(Number);
    return m * 60 + (sec || 0);
  }

  function parsePlan(range) {
    if (!range) return null;
    const [a, b] = range.split('-').map((x) => parseClock(x.trim()));
    return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null;
  }

  function fmt(seconds) {
    const sign = seconds < 0 ? '−' : '';
    const s = Math.abs(Math.round(seconds));
    return `${sign}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function elapsed() {
    return accumulated + (running ? (performance.now() - startedAt) / 1000 : 0);
  }

  function startTimer() {
    if (running) return;
    running = true;
    startedAt = performance.now();
    ui.toggle.textContent = 'Pause';
  }

  function pauseTimer() {
    if (!running) return;
    accumulated = elapsed();
    running = false;
    ui.toggle.textContent = 'Weiter';
  }

  function resetTimer() {
    running = false;
    accumulated = 0;
    autoStart = true;
    ui.toggle.textContent = 'Start';
    tick();
  }

  function setStatus(text, cls) {
    ui.status.textContent = text;
    ui.status.className = `p-status ${cls || ''}`;
  }

  function tick() {
    const t = elapsed();
    ui.elapsed.textContent = fmt(t);
    ui.playhead.style.left = `${Math.min(100, (t / LIMIT) * 100)}%`;

    const plan = state && parsePlan(state.time);
    if (!running && t === 0) { setStatus('bereit'); return; }
    if (t > LIMIT) { setStatus(`Zeitrahmen +${fmt(t - LIMIT)}`, 'is-late'); return; }
    if (!plan) { setStatus(t > TARGET ? 'Puffer' : 'läuft', t > TARGET ? 'is-warn' : ''); return; }

    const [a, b] = plan;
    if (t < a - 10) setStatus(`${fmt(a - t)} Vorsprung`, 'is-ahead');
    else if (t <= b) setStatus('im Plan', 'is-ok');
    else if (t <= b + 15) setStatus(`knapp +${fmt(t - b)}`, 'is-warn');
    else setStatus(`+${fmt(t - b)} über Plan`, 'is-late');
  }

  // ------------------------------------------------------------------------
  // Darstellung
  // ------------------------------------------------------------------------
  function drawOutline(outline) {
    ui.segments.innerHTML = '';
    outline.forEach((o) => {
      const plan = parsePlan(o.time);
      if (!plan || o.hidden) return;
      const seg = document.createElement('span');
      seg.className = 'p-seg';
      seg.dataset.slide = o.slide;
      seg.style.left = `${(plan[0] / LIMIT) * 100}%`;
      seg.style.width = `calc(${((plan[1] - plan[0]) / LIMIT) * 100}% - 2px)`;
      seg.textContent = o.slide;
      seg.title = `${o.slide} · ${o.label} (${o.time})`;
      ui.segments.appendChild(seg);
    });
    outlineDrawn = true;
  }

  function sendToFrame(frame, ready, pos) {
    if (!ready || !pos || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ ta: 'goto', slide: pos.slide, step: pos.step }, '*');
  }

  function updatePreviews() {
    if (!state) return;
    sendToFrame(ui.now, framesReady.now, { slide: state.slide, step: state.step });
    sendToFrame(ui.next, framesReady.next, state.next);
    ui.next.style.visibility = state.next ? 'visible' : 'hidden';
  }

  function render() {
    if (!outlineDrawn && state.outline) drawOutline(state.outline);
    ui.position.textContent = state.shownIndex
      ? `Folie ${state.shownIndex} / ${state.shownTotal} · Schritt ${state.step} / ${state.steps} · Bewegung ${state.motion}`
      : `Anhang · Schritt ${state.step} / ${state.steps}`;
    ui.title.textContent = state.label;
    ui.steps.innerHTML = Array.from({ length: state.steps + 1 }, (_, i) =>
      `<i class="${i < state.step ? 'is-done' : i === state.step ? 'is-current' : ''}"></i>`).join('');
    ui.notes.innerHTML = state.notes || '<p>(keine Notizen)</p>';
    ui.cueNow.textContent = state.cue || '';
    ui.cueNext.textContent = state.next ? (state.next.cue || '') : 'Ende der Präsentation';
    ui.plan.textContent = state.time
      ? `Plan für diese Folie: ${state.time.replace('-', '–')} · Ziel gesamt 9:00 · Limit 10:00`
      : 'Ziel gesamt 9:00 · Limit 10:00';
    ui.segments.querySelectorAll('.p-seg').forEach((seg) =>
      seg.classList.toggle('is-current', Number(seg.dataset.slide) === state.slide));
    updatePreviews();
    tick();
  }

  // ------------------------------------------------------------------------
  // Verbindung zur Präsentation
  // ------------------------------------------------------------------------
  function send(cmd, extra) {
    if (!deck || deck.closed) { ui.link.textContent = 'Präsentation geschlossen'; return; }
    deck.postMessage({ ta: cmd, ...(extra || {}) }, '*');
  }

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;

    // Vorschau meldet sich bereit (verlässlicher als das load-Event, das vor diesem Skript feuern kann)
    if (d.ta === 'embed-ready') {
      if (e.source === ui.now.contentWindow) framesReady.now = true;
      if (e.source === ui.next.contentWindow) framesReady.next = true;
      updatePreviews();
      return;
    }

    if (e.source !== deck || d.ta !== 'state') return;
    const moved = state && (state.slide !== d.slide || state.step !== d.step);
    state = d;
    ui.link.textContent = 'verbunden';
    if (moved && autoStart && !running) { autoStart = false; startTimer(); }
    render();
  });

  ui.now.addEventListener('load', () => { framesReady.now = true; updatePreviews(); });
  ui.next.addEventListener('load', () => { framesReady.next = true; updatePreviews(); });

  ui.toggle.addEventListener('click', () => {
    autoStart = false;
    if (running) pauseTimer(); else startTimer();
    tick();
  });
  ui.reset.addEventListener('click', resetTimer);

  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
        e.preventDefault(); send(e.shiftKey ? 'nextSlide' : 'next'); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
        e.preventDefault(); send(e.shiftKey ? 'prevSlide' : 'prev'); break;
      case 't': case 'T': ui.toggle.click(); break;
      case 'r': case 'R': resetTimer(); break;
      case 'b': case 'B': case '.': send('blackout'); break;
      case '+': notesSize = Math.min(40, notesSize + 2); document.documentElement.style.setProperty('--notes-size', `${notesSize}px`); break;
      case '-': notesSize = Math.max(14, notesSize - 2); document.documentElement.style.setProperty('--notes-size', `${notesSize}px`); break;
      default: break;
    }
  });

  if (!deck) {
    ui.title.textContent = 'Bitte die Präsentation öffnen und dort Taste P drücken.';
    ui.link.textContent = 'nicht verbunden';
  } else {
    send('hello');
  }
  // Falls die Vorschauen schon vor diesem Skript geladen waren: nachfragen.
  [ui.now, ui.next].forEach((f) => { if (f.contentWindow) f.contentWindow.postMessage({ ta: 'ping' }, '*'); });
  setInterval(tick, 250);
  tick();
})();
