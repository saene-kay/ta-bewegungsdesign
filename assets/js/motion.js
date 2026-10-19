/* ==========================================================================
   motion.js: Bewegungsmodi, Akzente (data-fx) und Morph zwischen Folien
   ========================================================================== */
(function () {
  'use strict';

  const TA = (window.TA = window.TA || {});
  const root = document.documentElement;
  const MODES = ['full', 'reduced', 'off'];
  const MODE_LABEL = { full: 'voll', reduced: 'reduziert', off: 'aus' };
  const STORE_KEY = 'ta-motion-mode';

  const pendingTimers = new Set();
  const running = new Set();
  const morphCleanups = new Set();

  /** Liest ein Zeit-Token aus tokens.css (z. B. "--dur-morph") in Millisekunden. */
  function ms(name, fallback = 0) {
    const raw = getComputedStyle(root).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return fallback;
    if (raw.endsWith('ms')) return n;
    if (raw.endsWith('s')) return n * 1000;
    return n;
  }

  function readStoredMode() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }

  function storeMode(mode) {
    try { localStorage.setItem(STORE_KEY, mode); } catch (e) { /* privater Modus o. Ä. */ }
  }

  function track(anim) {
    running.add(anim);
    anim.finished.catch(() => {}).finally(() => running.delete(anim));
    return anim;
  }

  function later(fn, delay) {
    if (!delay) { fn(); return; }
    const id = setTimeout(() => { pendingTimers.delete(id); fn(); }, delay);
    pendingTimers.add(id);
  }

  // ------------------------------------------------------------------------
  // Akzente: einmalig, nur vorwärts, nur im Modus «voll».
  // Achtung: Eine laufende CSS-Transition auf derselben Eigenschaft hat Vorrang.
  // Akzente auf transform daher erst nach dem Eintritt starten (data-fx-delay).
  // ------------------------------------------------------------------------
  const FX = {
    /** Ring breitet sich aus: «Botschaft kommt an». */
    pulse(el) {
      const ring = document.createElement('span');
      ring.className = 'fx-ring';
      el.appendChild(ring);
      const a = track(ring.animate(
        [{ transform: 'scale(1)', opacity: 0.85 }, { transform: 'scale(1.75)', opacity: 0 }],
        { duration: ms('--dur-l', 780) * 1.1, easing: 'cubic-bezier(.16,1,.3,1)' }
      ));
      a.finished.catch(() => {}).finally(() => ring.remove());
    },

    /** Kurzes Schütteln: Gereiztheit. */
    shake(el) {
      track(el.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-12px) rotate(-1deg)' },
          { transform: 'translateX(10px) rotate(1deg)' },
          { transform: 'translateX(-7px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(0)' }
        ],
        { duration: 520, easing: 'ease-out' }
      ));
    },

    /** Daumen wackelt: Aufforderung zur Reaktion. */
    wobble(el) {
      track(el.animate(
        [
          { transform: 'rotate(0deg) scale(1)' },
          { transform: 'rotate(-16deg) scale(1.15)' },
          { transform: 'rotate(10deg) scale(1.1)' },
          { transform: 'rotate(-6deg) scale(1.04)' },
          { transform: 'rotate(0deg) scale(1)' }
        ],
        { duration: 900, easing: 'ease-in-out' }
      ));
    },

    /** Leitmotiv «kippen»: Wort kippt kurz und richtet sich wieder auf. */
    tip(el) {
      track(el.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(11deg) translateY(4px)', offset: 0.35 },
          { transform: 'rotate(7deg) translateY(3px)', offset: 0.6 },
          { transform: 'rotate(0deg)' }
        ],
        { duration: 1400, easing: 'cubic-bezier(.65,0,.35,1)' }
      ));
    },

    /** «… tippt»-Anzeige vor einer Chat-Antwort. */
    typing(el) {
      track(el.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }],
        { duration: 900, easing: 'linear' }
      ));
    },

    /** Funke am Kreuzungspunkt: gekreuzte Transaktion. */
    spark(el) {
      [...el.children].forEach((ring, i) => {
        track(ring.animate(
          [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }],
          { duration: 700, delay: i * 140, easing: 'cubic-bezier(.16,1,.3,1)' }
        ));
      });
    },

    /** Zahl zählt hoch. Der Endwert steht im HTML (wichtig für Rückwärts und Druck). */
    count(el) {
      const target = parseFloat(el.dataset.value ?? el.textContent);
      if (Number.isNaN(target)) return;
      const prefix = el.dataset.prefix || '';
      const finalText = el.textContent;
      const dur = ms('--dur-l', 780) * 1.3;
      const t0 = performance.now();
      const frame = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = p < 1 ? prefix + Math.round(target * eased) : finalText;
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }
  };

  // ------------------------------------------------------------------------
  // Morph («Magic Move»): Elemente mit gleichem data-morph auf zwei
  // aufeinanderfolgenden Folien fliegen von der alten an die neue Position.
  // Technik: deckende Geister-Kopien in der Morph-Ebene, Originale solange unsichtbar.
  // ------------------------------------------------------------------------
  const SKIP_STYLE = /^(transition|animation|will-change|view-transition|cursor|pointer-events|visibility)/;

  function copyStyle(src, dst) {
    const cs = getComputedStyle(src);
    let css = '';
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (!SKIP_STYLE.test(p)) css += `${p}:${cs.getPropertyValue(p)};`;
    }
    dst.style.cssText = css;
  }

  function snapshot(el) {
    const clone = el.cloneNode(true);
    const srcNodes = [el, ...el.querySelectorAll('*')];
    const dstNodes = [clone, ...clone.querySelectorAll('*')];
    srcNodes.forEach((s, i) => {
      const d = dstNodes[i];
      copyStyle(s, d);
      d.removeAttribute('id');
      for (const attr of [...d.attributes]) {
        if (attr.name.startsWith('data-')) d.removeAttribute(attr.name);
      }
    });
    clone.setAttribute('aria-hidden', 'true');
    return clone;
  }

  /** Effektive Sichtbarkeit innerhalb der Folie (Deckkraft der Folie selbst zählt nicht). */
  function isShown(el, slide) {
    let o = 1;
    for (let n = el; n && n !== slide; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      o *= parseFloat(cs.opacity);
    }
    return o > 0.5;
  }

  function box(el, stageRect, scale) {
    const r = el.getBoundingClientRect();
    return {
      x: (r.left - stageRect.left) / scale,
      y: (r.top - stageRect.top) / scale,
      w: r.width / scale,
      h: r.height / scale
    };
  }

  function placeGhost(ghost, b, layer) {
    Object.assign(ghost.style, {
      position: 'absolute',
      left: `${b.x}px`,
      top: `${b.y}px`,
      width: `${b.w}px`,
      height: `${b.h}px`,
      margin: '0',
      transform: 'none',
      transformOrigin: '50% 50%',
      translate: 'none',
      rotate: 'none',
      scale: 'none',
      opacity: '1',
      zIndex: '1'
    });
    layer.appendChild(ghost);
    return ghost;
  }

  /**
   * Findet Morph-Paare zwischen zwei Folien. data-morph darf mehrere Schlüssel
   * enthalten («ego-el-l ego-el»): Der erste, den die andere Folie kennt, gewinnt.
   * So kann ein Element auf zwei Ziele aufgeteilt werden (ein EL → zwei Personen).
   * Elemente, die auf der Zielfolie erst später erscheinen, werden ausgelassen.
   */
  function keysOf(el) {
    return el.dataset.morph.trim().split(/\s+/);
  }

  function morphPairs(fromSlide, toSlide) {
    const from = new Map();
    fromSlide.querySelectorAll('[data-morph]').forEach((el) => {
      if (!isShown(el, fromSlide)) return;
      keysOf(el).forEach((k) => { if (!from.has(k)) from.set(k, el); });
    });
    const pairs = [];
    toSlide.querySelectorAll('[data-morph]').forEach((b) => {
      const key = keysOf(b).find((k) => from.has(k));
      if (key && isShown(b, toSlide)) pairs.push([from.get(key), b]);
    });
    return pairs;
  }

  function morph(fromSlide, toSlide, { stage, layer, scale }) {
    if (motion.mode !== 'full') return;
    const pairs = morphPairs(fromSlide, toSlide);
    if (!pairs.length) return;

    const stageRect = stage.getBoundingClientRect();
    const dur = ms('--dur-morph', 950);
    const easing = 'cubic-bezier(.65,0,.35,1)';

    const jobs = pairs.map(([a, b]) => {
      const A = box(a, stageRect, scale);
      const B = box(b, stageRect, scale);
      // Gleiche Gestalt (gleicher Text, ähnliches Seitenverhältnis): ein Geist genügt.
      // Sonst Überblendung zwischen alter und neuer Gestalt («Restyling»).
      const ratioA = A.w / (A.h || 1);
      const ratioB = B.w / (B.h || 1);
      const sameShape = a.textContent.trim() === b.textContent.trim() &&
        Math.abs(ratioA - ratioB) / Math.max(ratioA, ratioB) < 0.15;
      return { a, b, A, B, ga: sameShape ? null : snapshot(a), gb: snapshot(b) };
    });

    jobs.forEach(({ a, b, A, B, ga, gb }) => {
      if (ga) placeGhost(ga, A, layer);
      placeGhost(gb, B, layer);
      a.style.visibility = 'hidden';
      b.style.visibility = 'hidden';

      // Verankert links-mittig: Texte beginnen am selben Punkt, Kreise bleiben deckungsgleich.
      const dx = B.x - A.x;
      const dy = (B.y + B.h / 2) - (A.y + A.h / 2);
      const sAB = A.h ? B.h / A.h : 1;
      const sBA = B.h ? A.h / B.h : 1;
      const from = `translate(${-dx}px, ${-dy}px) scale(${sBA})`;
      const opts = { duration: dur, easing, fill: 'forwards' };
      const anims = [];

      if (ga) {
        ga.style.transformOrigin = '0 50%';
        gb.style.transformOrigin = '0 50%';
        anims.push(track(ga.animate(
          [
            { transform: 'none', opacity: 1 },
            { opacity: 1, offset: 0.3 },
            { opacity: 0, offset: 0.6 },
            { transform: `translate(${dx}px, ${dy}px) scale(${sAB})`, opacity: 0 }
          ],
          opts
        )));
        anims.push(track(gb.animate(
          [
            { transform: from, opacity: 0 },
            { opacity: 0, offset: 0.35 },
            { opacity: 1, offset: 0.65 },
            { transform: 'none', opacity: 1 }
          ],
          opts
        )));
      } else {
        gb.style.transformOrigin = '0 50%';
        anims.push(track(gb.animate([{ transform: from }, { transform: 'none' }], opts)));
      }

      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        morphCleanups.delete(cleanup);
        anims.forEach((an) => an.cancel());
        if (ga) ga.remove();
        gb.remove();
        a.style.visibility = '';
        b.style.visibility = '';
      };
      morphCleanups.add(cleanup);
      Promise.allSettled(anims.map((an) => an.finished)).then(cleanup);
    });
  }

  // ------------------------------------------------------------------------
  // Öffentliche Schnittstelle
  // ------------------------------------------------------------------------
  const motion = (TA.motion = {
    mode: 'full',
    modes: MODES,
    label: (m) => MODE_LABEL[m] || m,
    ms,

    init({ forceMode } = {}) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const stored = readStoredMode();
      const mode = forceMode || (MODES.includes(stored) ? stored : prefersReduced ? 'reduced' : 'full');
      this.setMode(mode, { persist: false });
    },

    setMode(mode, { persist = true } = {}) {
      if (!MODES.includes(mode)) return;
      this.mode = mode;
      MODES.forEach((m) => root.classList.toggle(`motion-${m}`, m === mode));
      if (persist) storeMode(mode);
    },

    cycleMode() {
      const next = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length];
      this.setMode(next);
      return next;
    },

    /** Spielt die Akzente eines Elements ab (data-fx="pulse shake", data-fx-delay="400"). */
    play(el, delay = 0) {
      if (this.mode !== 'full') return;
      const names = (el.dataset.fx || '').split(/\s+/).filter(Boolean);
      later(() => names.forEach((n) => FX[n] && FX[n](el)), delay);
    },

    morph,

    /** Bricht geplante Akzente ab und setzt laufende Animationen ans Ende. */
    settle() {
      pendingTimers.forEach(clearTimeout);
      pendingTimers.clear();
      [...morphCleanups].forEach((fn) => fn());
      [...running].forEach((a) => { try { a.finish(); } catch (e) { a.cancel(); } });
    },

    /** Erweiterungspunkt: eigene Akzente registrieren. */
    register(name, fn) { FX[name] = fn; }
  });
})();
