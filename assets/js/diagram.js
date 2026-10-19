/* ==========================================================================
   diagram.js: Transaktionspfeile aus Deklarationen bauen
   <div class="diagram">
     <div class="ego ego--er" data-node="L.ER">ER</div> …
     <svg class="arrows">
       <g class="arrow arrow--reiz" data-from="L.ER" data-to="R.ER" data-offset="-16"
          data-step="1" data-anim="draw"></g>
   Optionen am <g>: data-offset (px, quer zur Richtung), data-dashed (psychologische Ebene).
   ========================================================================== */
(function () {
  'use strict';

  const TA = (window.TA = window.TA || {});
  const NS = 'http://www.w3.org/2000/svg';
  const GAP = 12;        // Abstand Pfeil ↔ Kreisrand
  const HEAD_LEN = 30;   // Länge der Pfeilspitze
  const HEAD_HALF = 16;  // halbe Breite der Pfeilspitze
  let maskCounter = 0;

  function svg(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function nodesOf(diagram) {
    const nodes = {};
    diagram.querySelectorAll('[data-node]').forEach((el) => {
      // offset*-Werte sind Layout-Koordinaten, unabhängig von Skalierung und Transformationen
      nodes[el.dataset.node] = {
        x: el.offsetLeft + el.offsetWidth / 2,
        y: el.offsetTop + el.offsetHeight / 2,
        r: el.offsetWidth / 2
      };
    });
    return nodes;
  }

  function geometry(a, b, offset) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;        // Normale (links der Laufrichtung)
    const py = ux;
    const sx = a.x + ux * (a.r + GAP) + px * offset;
    const sy = a.y + uy * (a.r + GAP) + py * offset;
    const tx = b.x - ux * (b.r + GAP) + px * offset;  // Spitze
    const ty = b.y - uy * (b.r + GAP) + py * offset;
    const bx = tx - ux * HEAD_LEN;                    // Basis der Spitze
    const by = ty - uy * HEAD_LEN;
    const f = (n) => n.toFixed(1);
    return {
      shaft: `M${f(sx)} ${f(sy)} L${f(bx + ux * 2)} ${f(by + uy * 2)}`,
      head: `M${f(tx)} ${f(ty)} L${f(bx + px * HEAD_HALF)} ${f(by + py * HEAD_HALF)} L${f(bx - px * HEAD_HALF)} ${f(by - py * HEAD_HALF)} Z`
    };
  }

  function buildArrow(g, nodes) {
    const a = nodes[g.dataset.from];
    const b = nodes[g.dataset.to];
    if (!a || !b) {
      console.warn('[diagram] Unbekannter Knoten:', g.dataset.from, '→', g.dataset.to);
      return;
    }
    const geo = geometry(a, b, parseFloat(g.dataset.offset || '0'));
    g.textContent = '';

    if (g.hasAttribute('data-dashed')) {
      // Gestrichelte Pfeile: eine durchgezogene Maske zeichnet sich, die Striche bleiben stehen.
      const id = `ta-mask-${++maskCounter}`;
      const mask = svg('mask', { id, maskUnits: 'userSpaceOnUse' });
      mask.appendChild(svg('path', { class: 'mask-path', d: geo.shaft, pathLength: '1', stroke: '#fff', 'stroke-width': '24', fill: 'none' }));
      g.appendChild(mask);
      g.classList.add('arrow--dashed');
      g.appendChild(svg('path', { class: 'shaft is-dashed', d: geo.shaft, mask: `url(#${id})` }));
    } else {
      g.appendChild(svg('path', { class: 'shaft', d: geo.shaft, pathLength: '1' }));
      g.appendChild(svg('path', { class: 'flow', d: geo.shaft }));
    }
    g.appendChild(svg('path', { class: 'head', d: geo.head }));
  }

  TA.diagram = {
    /** Baut alle Pfeile in allen .diagram-Containern (einmal beim Start). */
    buildAll(scope = document) {
      scope.querySelectorAll('.diagram').forEach((diagram) => {
        const svgEl = diagram.querySelector('svg.arrows');
        if (!svgEl) return;
        svgEl.setAttribute('viewBox', `0 0 ${diagram.offsetWidth} ${diagram.offsetHeight}`);
        const nodes = nodesOf(diagram);
        svgEl.querySelectorAll('.arrow[data-from]').forEach((g) => buildArrow(g, nodes));
      });
    }
  };
})();
