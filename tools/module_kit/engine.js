// HTML explainer engine: timing, easing and SVG helpers. Inlined into every module by
// tools/module_kit/kit.py build. Nothing here knows about a particular topic.
// Copy of ~/workspace/youtube-videos/tools/html_explainer/engine.js (header differs); port
// fixes across by hand. Not loaded from there: this workspace has no runtime dependency on it.
//
// The model: a scene builds its SVG once, plans its beats with a Beats object, and returns
// render(t). render(t) must set every animated attribute from t alone (no state carried from
// the previous frame), so play, pause, scrub and #t= deep links all show the same frame.

const W = 1920, H = 1080, NS = "http://www.w3.org/2000/svg";
// Scenes may change these (e.g. COLORS.accent = "#ff8800") before they build.
// Identity hues (blue, orange, aqua, purple) are the dark-mode categorical slots of the dataviz
// reference palette, validated on the stage colour; green, red and amber are its status steps
// (pass, fail, warning); yellow is the highlighter ("look here now").
const COLORS = { blue: "#3987e5", orange: "#d95926", aqua: "#199e70", purple: "#9085e9",
                 green: "#0ca30c", red: "#d03b3b", amber: "#fab219", yellow: "#ffd84a",
                 grey: "#a3abb6", dim: "#5d6672", fg: "#e8eaee", bg: "#14181e", panel: "#1d2128" };
const MONO = "'Kit Mono', 'JetBrains Mono', ui-monospace, 'DejaVu Sans Mono', Menlo, monospace";
const READ_CPS = 16;     // caption reading speed, characters per second
const READ_MIN = 1.4;    // shortest time a caption stays up, seconds
const SCENE_FADE = 0.6;  // each scene (but the last) fades out over its final 0.6 s
const END_HOLD = 2.0;    // the last scene holds its final frame this long

const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;

// Eased 0..1 progress of time t through window [start, end]; a missing window gives 0.
function prog(win, t) {
  if (!win) return 0;
  const [a, b] = win;
  if (b <= a) return t >= a ? 1 : 0;
  return smooth((t - a) / (b - a));
}

// Sub-window for item i of n, like Manim's LaggedStart(lag_ratio=lag).
function stagger(win, i, n, lag = 0.3) {
  const d = (win[1] - win[0]) / (1 + (n - 1) * lag);
  const a = win[0] + i * lag * d;
  return [a, a + d];
}

// Short window at the start of `win`, for quick swaps and fade-outs.
const head_of = (win, len = 0.5) => [win[0], win[0] + len];

// A value that starts at `initial` and blends to each [window, value] in turn.
function track(initial, changes, blend = lerp) {
  return t => {
    let v = initial;
    for (const [win, next] of changes) {
      if (t < win[0]) break;
      v = blend(v, next, prog(win, t));
    }
    return v;
  };
}

const hex_rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgb_css = c => `rgb(${c.map(Math.round).join(",")})`;
function color_track(initial, changes) {
  const f = track(hex_rgb(initial), changes.map(([w, c]) => [w, hex_rgb(c)]),
                  (a, b, u) => a.map((v, i) => lerp(v, b[i], u)));
  return t => rgb_css(f(t));
}

// Text that swaps at each [window, text]: fades out, changes, fades back in.
function text_track(initial, changes) {
  return t => {
    let text = initial, alpha = 1;
    for (const [win, next] of changes) {
      if (t < win[0]) break;
      const p = clamp01((t - win[0]) / Math.max(win[1] - win[0], 1e-6));
      if (p < 0.5) { alpha = 1 - 2 * p; break; }
      text = next; alpha = 2 * p - 1;
    }
    return { text, alpha };
  };
}

function el(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  set(e, attrs);
  if (parent) parent.appendChild(e);
  return e;
}
function set(e, attrs) { for (const k in attrs) e.setAttribute(k, attrs[k]); }

function label(parent, str, x, y, { size = 44, fill = COLORS.fg, anchor = "middle", weight = 400,
                                    font = null } = {}) {
  const e = el("text", { x, y, "font-size": size, fill, "text-anchor": anchor,
                         "dominant-baseline": "central", "font-weight": weight }, parent);
  if (font) e.style.fontFamily = font;
  e.textContent = str;
  return e;
}

// Fade in with a small slide from offset (dx, dy). p = 0 hidden, 1 in place.
// It owns the element's transform attribute: position things with x/y or a parent <g>.
function appear(e, p, dx = 0, dy = 0) {
  e.style.opacity = p;
  e.setAttribute("transform", `translate(${(1 - p) * dx} ${(1 - p) * dy})`);
}

// Stroke-draw an element created with pathLength="1".
function draw(e, p) {
  e.style.strokeDasharray = "1 1";
  e.style.strokeDashoffset = 1 - p;
  e.style.opacity = p > 0 ? 1 : 0;
}

function show_text(e, state, alpha = 1) {
  if (e.textContent !== state.text) e.textContent = state.text;
  e.style.opacity = state.alpha * alpha;
}

function arrow(parent, x1, y1, x2, y2, color = COLORS.grey, width = 5, head = 24) {
  const g = el("g", {}, parent);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const bx = x2 - Math.cos(ang) * head, by = y2 - Math.sin(ang) * head;
  const px = Math.sin(ang) * head * 0.55, py = -Math.cos(ang) * head * 0.55;
  const line = el("line", { x1, y1, x2: bx, y2: by, stroke: color, "stroke-width": width,
                            "stroke-linecap": "round", pathLength: 1 }, g);
  const tip = el("polygon", { points: `${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`,
                              fill: color }, g);
  return { g, line, tip };
}
function draw_arrow(a, p) {
  draw(a.line, clamp01(p / 0.85));
  a.tip.style.opacity = clamp01((p - 0.8) / 0.2);
}

// Labelled box centred on (x, y): diagram nodes, array cells, pipeline stages.
function box(parent, text, x, y, w, h, { color = COLORS.blue, size = 40, fill_opacity = 0.15,
                                        radius = 10, text_fill = COLORS.fg, font = null } = {}) {
  const g = el("g", {}, parent);
  const rect = el("rect", { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: radius,
                            fill: color, "fill-opacity": fill_opacity, stroke: color,
                            "stroke-width": 4 }, g);
  const txt = label(g, text, x, y, { size, fill: text_fill, font });
  return { g, rect, text: txt, x, y, w, h };
}

// Monospace code listing with its top-left corner at (x, y); x = "center" centres it.
// Lines keep their indentation.
// Move cb.highlight with highlight_line(cb, line, alpha); `line` may be fractional to glide.
function code_block(parent, lines, x, y, { size = 34, line_h = 1.45, width = null,
                                          color = COLORS.fg, pad = 28 } = {}) {
  const g = el("g", {}, parent);
  const step = size * line_h;
  const w = width || Math.max(...lines.map(s => s.length)) * size * 0.62 + 2 * pad;
  const h = lines.length * step + 2 * pad;
  if (x === "center") x = (W - w) / 2;
  const bg = el("rect", { x, y, width: w, height: h, rx: 12, fill: COLORS.panel }, g);
  const highlight = el("rect", { x: x + 8, width: w - 16, height: step, rx: 6,
                                 fill: COLORS.yellow, "fill-opacity": 0.16 }, g);
  highlight.style.opacity = 0;
  const texts = lines.map((s, i) => {
    const e = label(g, s, x + pad, y + pad + (i + 0.5) * step,
                    { size, fill: color, anchor: "start", font: MONO });
    e.style.whiteSpace = "pre";
    return e;
  });
  return { g, bg, highlight, lines: texts, x, y, w, h, step, pad };
}
function highlight_line(cb, line, alpha = 1) {
  set(cb.highlight, { y: cb.y + cb.pad + line * cb.step });
  cb.highlight.style.opacity = alpha;
}

// Timing for one scene. say() shows a caption long enough to read; its animations run over
// the first `run` seconds. Returns that animation window [start, end] in scene time.
class Beats {
  constructor() { this.t = 0; this.cues = []; }
  say(text, run = 0) {
    const dur = Math.max(run, READ_MIN, 0.6 + text.length / READ_CPS);
    this.cues.push({ start: this.t, end: this.t + dur, text });
    const win = [this.t, this.t + run];
    this.t += dur;
    return win;
  }
  play(run) { const win = [this.t, this.t + run]; this.t += run; return win; }
  wait(d) { this.t += d; }
}
