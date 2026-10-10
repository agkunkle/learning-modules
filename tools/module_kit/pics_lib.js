// Drawing helpers for PICS and clip scenes. kit.py inlines this file right after engine.js, so
// it can use el(). It defines one global, PIC_KIT, so its names cannot clash with a module's;
// a module picks what it needs:
//   const { ROUND, paint_el, txt, frame, bubble, thought } = PIC_KIT;
// Colours: pass paint.ink / paint.paper (pictures) or COLORS.fg / COLORS.bg (clips). Keep yellow
// and blue out of drawings (see module.css).
const PIC_KIT = (() => {
  const ROUND = { "stroke-linecap": "round", "stroke-linejoin": "round" };

  // Set fill and stroke as style properties: they accept hex, currentColor and var().
  function paint_el(e, fill, stroke) {
    if (fill !== undefined) e.style.fill = fill;
    if (stroke !== undefined) e.style.stroke = stroke;
    return e;
  }

  // One line of text centred on (x, y) by default.
  function txt(g, s, x, y,
               { size = 22, weight = 600, anchor = "middle", fill = "currentColor" } = {}) {
    const t = el("text", { x, y, "text-anchor": anchor, "dominant-baseline": "central",
                           "font-size": size, "font-weight": weight }, g);
    t.style.fill = fill;
    t.style.stroke = "none";
    t.textContent = s;
    return t;
  }

  // A group in another drawing's frame: base point (x, y), scale s, frame origin (ox, oy).
  // Draw a character once around its own origin, then place it anywhere at any size.
  const frame = (g, x, y, s, ox, oy, attrs = {}) =>
    el("g", { transform: `translate(${x} ${y}) scale(${s}) translate(${-ox} ${-oy})`,
              "stroke-width": 4, ...ROUND, ...attrs }, g);

  // A thought bubble with up to three short lines, trailing dots towards (tx, ty).
  function thought(g, x, y, w, h, lines, { tx, ty, ink = "currentColor", paper = "var(--paper)",
                                           size = 20 } = {}) {
    const bg = el("g", { "stroke-width": 3 }, g);
    if (tx !== undefined) {
      // Two dots from (tx, ty) towards the bubble's lower-left corner: small first, then bigger.
      const ax = x + Math.min(30, h / 2) * 0.3, ay = y + h - Math.min(30, h / 2) * 0.3;
      for (const [u, r] of [[0, 4], [0.55, 6]]) {
        const dot = el("circle", { cx: tx + (ax - tx) * u, cy: ty + (ay - ty) * u, r }, bg);
        paint_el(dot, paper, ink);
      }
    }
    paint_el(el("rect", { x, y, width: w, height: h, rx: Math.min(30, h / 2) }, bg), paper, ink);
    lines.forEach((line, k) => {
      const t = el("text", { x: x + w / 2, y: y + h / 2 + (k - (lines.length - 1) / 2) * size * 1.2,
                             "text-anchor": "middle", "dominant-baseline": "central" }, bg);
      Object.assign(t.style, { fill: ink, stroke: "none",
                               font: `600 ${size}px var(--ui, sans-serif)` });
      t.textContent = line;
    });
    return bg;
  }

  // A speech bubble (speech: true) or a thought bubble; the tail points at (tx, ty).
  function bubble(g, x, y, w, h, lines, { tx, ty, ink = "currentColor", paper = "var(--paper)",
                                          size = 22, speech = false } = {}) {
    if (!speech) return thought(g, x, y, w, h, lines, { tx, ty, ink, paper, size });
    const bg = el("g", { "stroke-width": 3, ...ROUND }, g);
    const cx = x + w / 2, cy = y + h / 2;
    const bx = Math.max(x + 24, Math.min(x + w - 24, tx)), by = ty < y ? y : y + h;
    const tail = `M${bx - 12} ${by} L ${tx} ${ty} L ${bx + 12} ${by} Z`;
    paint_el(el("path", { d: tail }, bg), paper, ink);
    paint_el(el("rect", { x, y, width: w, height: h, rx: Math.min(24, h / 2) }, bg), paper, ink);
    // Cover the seam between tail and box with a paper stroke.
    const seam = `M${bx - 10} ${by} L ${bx + 10} ${by}`;
    paint_el(el("path", { d: seam, "stroke-width": 5 }, bg), "none", paper);
    lines.forEach((line, k) => txt(bg, line, cx, cy + (k - (lines.length - 1) / 2) * size * 1.2,
                                   { size, fill: ink }));
    return bg;
  }

  return { ROUND, paint_el, txt, frame, thought, bubble };
})();
