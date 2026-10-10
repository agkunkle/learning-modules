// Module content: Oreo vs. the toothbrush. META, CHECKS, DIAGRAMS, PICS, CLIPS, and the drawing
// code they share. Every factual claim traces to a source tag [S#] in ../research/brief.md.
//
// Oreo, the module's tuxedo cat: one drawing used by every picture (PICS) and clip (CLIPS).
// oreo(g, pose) clears g and draws Oreo sitting, facing the reader, base centre at (x, y).
// Clips call it from render(t) with a pose computed from t, so every frame stays a pure
// function of t. Pictures call it once. Body language is a set of 0..1 dials:
//   ears    0 forward (relaxed) .. 1 flat to the sides
//   lids    0 open .. 0.6 narrowed .. 1 closed (a slow blink)
//   pupils  0 slits .. 1 round and wide (fear, arousal)
//   brows   0 none .. 1 cross
//   tail    -1 .. 1 sideways swish of the tip; puff 0 .. 1 bottle-brush tail
//   look    -1 (reader's left) .. 1 (right): where the pupils point
//   mouth   "flat" | "smile" | "hiss"
// Colours: ink and paper are style values (paint.ink etc. in a picture, COLORS.fg/bg in a
// clip). Fur, eye and pupil colours are fixed, so Oreo is the same cat in both themes.

const OREO_FUR = { fur: "#24272d", hi: "#e9ebee", white: "#fbfbfa", pink: "#e88a9a",
                   eye: "#5cbf8f", pupil: "#0d0f12", skin: "#f6dcc4", brush: "#199e70" };
const OREO_POSE = { x: 230, y: 310, s: 1, ink: "currentColor", paper: "var(--paper)",
                    ears: 0, lids: 0, pupils: 0.3, brows: 0, tail: 0, puff: 0, look: 0,
                    mouth: "flat" };
let oreo_uid = 0;
const { ROUND, paint_el, txt, frame, bubble, thought } = PIC_KIT;  // tools/module_kit/pics_lib.js

function oreo(g, pose = {}) {
  const p = { ...OREO_POSE, ...pose };
  const F = OREO_FUR;
  while (g.firstChild) g.removeChild(g.firstChild);
  const id = `oreo${++oreo_uid}`;
  // Drawn in its own 0..520 x 0..340 frame (base centre at 230, 310), then moved and scaled.
  const root = el("g", { transform: `translate(${p.x} ${p.y}) scale(${p.s}) translate(-230 -310)`,
                         "stroke-width": 4, "stroke-linecap": "round",
                         "stroke-linejoin": "round" }, g);
  const path = (d, fill, stroke = p.ink, attrs = {}) =>
    paint_el(el("path", { d, ...attrs }, root), fill, stroke);
  const defs = el("defs", {}, root);
  const head_d = "M145 115 a85 68 0 1 0 170 0 a85 68 0 1 0 -170 0 Z";
  const body_d = "M140 310 C 120 230, 150 170, 210 165 C 280 160, 300 230, 290 310 Z";
  el("path", { d: head_d }, el("clipPath", { id: `${id}-head` }, defs));
  el("path", { d: body_d }, el("clipPath", { id: `${id}-body` }, defs));

  // Tail: an outline stroke under a fur stroke; the tip swings with p.tail.
  const dx = 34 * p.tail, dy = -10 * Math.abs(p.tail);
  const tail_d = `M150 300 C 60 300, 40 ${230 + dy}, ${80 + dx} ${200 + dy} ` +
                 `C ${95 + dx} ${190 + dy}, ${110 + dx} ${205 + dy}, ${100 + dx} ${215 + dy}`;
  path(tail_d, "none", p.ink, { "stroke-width": 22 + 14 * p.puff });
  path(tail_d, "none", F.fur, { "stroke-width": 15 + 14 * p.puff });

  // Body, white bib, paws.
  path(body_d, F.fur);
  path("M185 312 C 180 255, 200 205, 220 190 C 242 205, 260 255, 255 312 Z", F.white, "none",
       { "clip-path": `url(#${id}-body)` });
  for (const cx of [190, 250]) {
    paint_el(el("ellipse", { cx, cy: 305, rx: 24, ry: 12 }, root), F.white, p.ink);
  }

  // Ears turn about their base: forward at 0, flat and sideways at 1.
  const ear = (d, inner, px, py, sign) => {
    const eg = el("g", { transform: `rotate(${sign * 62 * p.ears} ${px} ${py}) ` +
                                    `translate(0 ${14 * p.ears})` }, root);
    paint_el(el("path", { d }, eg), F.fur, p.ink);
    paint_el(el("path", { d: inner, "stroke-width": 5 }, eg), "none", F.pink);
  };
  ear("M160 95 L 150 30 L 200 70 Z", "M163 82 L 158 48 L 186 70", 180, 85, -1);
  ear("M262 70 L 300 22 L 302 92 Z", "M275 68 L 295 42 L 296 80", 282, 82, 1);

  // Head with white blaze and muzzle.
  path(head_d, F.fur);
  path("M230 72 C 224 95, 206 118, 194 140 C 186 170, 274 170, 266 140 " +
       "C 254 118, 236 95, 230 72 Z", F.white, "none", { "clip-path": `url(#${id}-head)` });
  path(head_d, "none");

  // Eyes: an almond whose height closes with lids; pupils widen with p.pupils.
  const up = 14 * (1 - p.lids), low = 10 * (1 - p.lids);
  for (const [k, cx] of [[0, 196], [1, 264]]) {
    const cy = 108;
    const eye_d = `M${cx - 18} ${cy} Q ${cx} ${cy - 2 * up} ${cx + 18} ${cy} ` +
                  `Q ${cx} ${cy + 2 * low} ${cx - 18} ${cy} Z`;
    if (p.lids > 0.95) {
      path(`M${cx - 18} ${cy} q 18 6 36 0`, "none", F.hi, { "stroke-width": 4 });
      continue;
    }
    el("path", { d: eye_d }, el("clipPath", { id: `${id}-eye${k}` }, defs));
    path(eye_d, F.eye, "none");
    paint_el(el("ellipse", { cx: cx + 7 * p.look, cy, rx: 2.5 + 7.5 * p.pupils, ry: 12,
                             "clip-path": `url(#${id}-eye${k})` }, root), F.pupil, "none");
  }
  if (p.brows > 0.02) {
    path("M174 96 l 42 6 M286 96 l -42 6", "none", F.hi,
         { "stroke-width": 5, opacity: Math.min(1, p.brows) });
  }

  // Nose, mouth, whiskers.
  path("M224 128 l 12 0 l -6 7 Z", F.pink, F.pupil, { "stroke-width": 2.5 });
  if (p.mouth === "hiss") {
    path("M214 142 q 16 -6 32 0 q -2 22 -16 22 q -14 0 -16 -22 Z", "#5a2a33", F.pupil,
         { "stroke-width": 3 });
    path("M219 143 l 3 9 l 3 -9 Z M235 143 l 3 9 l 3 -9 Z", F.white, "none");
  } else if (p.mouth === "smile") {
    path("M218 144 q 6 7 12 0 q 6 7 12 0", "none", F.pupil, { "stroke-width": 3 });
  } else {
    path("M218 148 l 24 0", "none", F.pupil);
  }
  path("M200 135 l -85 -8 M200 145 l -85 4 M260 135 l 85 -8 M260 145 l 85 4", "none", p.ink,
       { "stroke-width": 2.5 });
  return root;
}

// A hand holding Oreo's toothbrush, bristles up, handle end at (x, y). Not part of Oreo, so a
// clip can move it on its own.
function hand_brush(g, { x = 520, y = 220, angle = 0, ink = "currentColor" } = {}) {
  const F = OREO_FUR;
  const hg = el("g", { transform: `translate(${x} ${y}) rotate(${angle}) translate(-520 -220)`,
                       "stroke-width": 4, "stroke-linecap": "round",
                       "stroke-linejoin": "round" }, g);
  paint_el(el("path", { d: "M520 205 L 445 205 C 425 205, 425 235, 445 235 L 520 235" }, hg),
           F.skin, ink);
  paint_el(el("rect", { x: 345, y: 211, width: 105, height: 12, rx: 6 }, hg), F.brush, ink);
  paint_el(el("path", { d: "M350 211 l 0 -16 M358 211 l 0 -16 M366 211 l 0 -16 M374 211 l 0 -16",
                        "stroke-width": 3 }, hg), "none", ink);
  return hg;
}


// ---- More drawing: text, the owner, hands, props and the mouth close-up ----
// Same colour rules as Oreo: ink/paper are passed in; everything else is a fixed hex.
const PROP = { slate: "#4a5263", hair: "#3b2a22", steel: "#9aa3ad", towel: "#d95926",
               treat: "#a0683a", gum: "#e8909c", gum_dk: "#c0606e", tooth: "#fbfbfa",
               tartar: "#9a7a45" };



// A finger: an ink stroke under a skin stroke, along path d.
function finger(g, d, ink, w = 18) {
  paint_el(el("path", { d, "stroke-width": w + 7 }, g), "none", ink);
  paint_el(el("path", { d, "stroke-width": w }, g), "none", OREO_FUR.skin);
}

// The owner, sitting behind Oreo (draw before oreo() with the same x, y, s). head: false
// leaves out the owner's head, for scenes where the hands sit on top of Oreo's head.
function owner_behind(g, { x = 230, y = 310, s = 1, ink = "currentColor", head = true } = {}) {
  const og = frame(g, x, y, s, 230, 310);
  paint_el(el("path", { d: "M50 340 C 50 205, 120 158, 230 158 C 340 158, 410 205, 410 340 Z" },
              og), PROP.slate, ink);
  if (!head) return og;
  // The head peeks out above Oreo's (his head top is at y 47), so the face shows.
  paint_el(el("rect", { x: 208, y: 0, width: 44, height: 170 }, og), OREO_FUR.skin, ink);
  paint_el(el("circle", { cx: 230, cy: -40, r: 58 }, og), OREO_FUR.skin, ink);
  paint_el(el("path", { d: "M174 -54 C 180 -112, 280 -112, 286 -54 C 260 -72, 200 -72, 174 -54 Z" },
              og), PROP.hair, ink);
  for (const cx of [210, 250]) paint_el(el("circle", { cx, cy: -36, r: 6 }, og), PROP.hair, "none");
  paint_el(el("path", { d: "M214 -12 Q 230 -2, 246 -12", "stroke-width": 4, ...ROUND }, og), "none",
           PROP.hair);
  return og;
}

// The iCatCare head hold, in Oreo's frame: palm on top of the head towards the back; thumb and
// second finger on the cheekbones; index finger lifted off the eyes. grip 0..1 lowers them.
function head_hold(g, { x = 230, y = 310, s = 1, ink = "currentColor", grip = 1 } = {}) {
  const hg = frame(g, x, y, s, 230, 310);
  const r = 30 + 32 * grip;
  finger(hg, `M178 60 C 160 ${62 + r * 0.5}, 156 ${64 + r * 0.9}, 163 ${64 + r}`, ink);
  finger(hg, `M282 60 C 300 ${62 + r * 0.5}, 304 ${64 + r * 0.9}, 297 ${64 + r}`, ink);
  finger(hg, "M246 50 C 250 30, 256 16, 264 4", ink, 16);
  paint_el(el("path", { d: "M168 64 C 182 30, 278 30, 292 64 C 270 74, 190 74, 168 64 Z" }, hg),
           OREO_FUR.skin, ink);
  return hg;
}


function tube(g, x, y, { label = "Cat paste", ink = "currentColor", color = "#199e70", s = 1 } = {}) {
  const tg = frame(g, x, y, s, 0, 0);
  paint_el(el("path", { d: "M0 -26 L 130 -34 L 136 -30 L 136 30 L 130 34 L 0 26 Z" }, tg), color, ink);
  paint_el(el("rect", { x: 136, y: -14, width: 30, height: 28, rx: 5 }, tg), OREO_FUR.white, ink);
  paint_el(el("path", { d: "M0 -26 L 0 26", "stroke-width": 8 }, tg), "none", ink);
  txt(tg, label, 68, 0, { size: 21, fill: "#fbfbfa" });
  return tg;
}

function treat(g, x, y, { s = 1, ink = "currentColor" } = {}) {
  const tg = frame(g, x, y, s, 0, 0, { "stroke-width": 3 });
  paint_el(el("path", { d: "M-22 0 C -10 -14, 12 -14, 18 0 C 12 14, -10 14, -22 0 Z " +
                           "M16 0 L 30 -10 L 30 10 Z" }, tg), PROP.treat, ink);
  return tg;
}

function bowl(g, x, y, { s = 1, ink = "currentColor", full = true } = {}) {
  const bg = frame(g, x, y, s, 0, 0);
  if (full) {
    for (const [dx, dy] of [[-30, -6], [-8, -12], [14, -6], [32, -10], [-18, -18], [6, -20]]) {
      paint_el(el("circle", { cx: dx, cy: dy, r: 9, "stroke-width": 2.5 }, bg), PROP.treat, ink);
    }
  }
  paint_el(el("path", { d: "M-60 -4 L 60 -4 L 46 30 L -46 30 Z" }, bg), "#199e70", ink);
  return bg;
}

// The owner's hand, thumb up, with a plaster on the thumb.
function bandaged_hand(g, x, y, { s = 1, ink = "currentColor" } = {}) {
  const hg = frame(g, x, y, s, 0, 0);
  paint_el(el("path", { d: "M-60 120 L -60 20 C -60 0, -40 -6, -20 0 L 40 0 C 60 0, 64 26, 44 30 " +
                           "L 20 30 L 20 120 Z" }, hg), OREO_FUR.skin, ink);
  finger(hg, "M-30 4 C -34 -30, -30 -60, -16 -84", ink, 30);
  paint_el(el("rect", { x: -44, y: -62, width: 40, height: 26, rx: 6,
                        transform: "rotate(-14 -24 -49)" }, hg), "#e9d3a8", ink);
  for (const [dx, dy] of [[-32, -52], [-22, -54], [-30, -44], [-20, -46]]) {
    paint_el(el("circle", { cx: dx, cy: dy, r: 1.8, "stroke-width": 0 }, hg), "#b89a68", "none");
  }
  return hg;
}

// Close-up of Oreo's upper teeth from the side (front of the mouth on the left), in its own
// 800 x 420 frame. lip: 0 closed .. 1 lifted (the gumline shows). Returns gumline geometry so
// a clip can light it. tartar 0..1 paints a crust on the cheek teeth.
const MOUTH_TEETH = [
  { name: "canine", d: "M150 205 C 155 260, 172 310, 182 322 C 192 300, 200 250, 205 205 Z" },
  { name: "premolar", d: "M246 205 C 250 238, 262 252, 272 254 C 282 248, 292 232, 296 205 Z" },
  { name: "premolar", d: "M320 205 C 324 248, 344 268, 360 270 C 376 262, 392 240, 396 205 Z" },
  { name: "carnassial", d: "M420 205 C 424 262, 452 290, 476 286 C 500 296, 540 262, 548 205 Z" },
  { name: "molar", d: "M570 205 C 572 230, 584 240, 598 238 C 610 232, 618 222, 620 205 Z" },
];
const GUMLINE_D = "M140 205 C 300 212, 460 212, 630 205";

function mouth_closeup(g, { x = 0, y = 0, s = 1, ink = "currentColor", lip = 0, tartar = 0,
                            plaque = 0, thumb = true, thumb_x = 470 } = {}) {
  const F = OREO_FUR;
  const id = `mouth${++oreo_uid}`;
  const mg = frame(g, x, y, s, 0, 0);
  const defs = el("defs", {}, mg);
  el("rect", { x: 0, y: 0, width: 800, height: 420, rx: 40 }, el("clipPath", { id }, defs));
  const inner = el("g", { "clip-path": `url(#${id})` }, mg);
  paint_el(el("rect", { x: 0, y: 0, width: 800, height: 420 }, inner), F.fur, "none");
  paint_el(el("ellipse", { cx: -20, cy: 230, rx: 165, ry: 200 }, inner), F.white, "none");
  // Gum band and teeth (upper jaw).
  paint_el(el("path", { d: "M100 120 L 700 120 L 700 205 C 460 214, 300 214, 100 205 Z" }, inner),
           PROP.gum, "none");
  for (const t of MOUTH_TEETH) {
    paint_el(el("path", { d: t.d, "stroke-width": 3 }, inner), PROP.tooth, F.pupil);
  }
  if (plaque > 0) {
    paint_el(el("path", { d: "M244 207 C 330 214, 450 214, 552 207 L 552 232 C 450 240, 330 240, " +
                             "244 232 Z", opacity: 0.55 * plaque }, inner), "#d9cf9a", "none");
  }
  if (tartar > 0) {
    paint_el(el("path", { d: "M246 207 C 330 214, 450 214, 550 207 L 548 236 C 500 250, 470 236, " +
                             "430 246 C 400 236, 360 250, 320 238 C 290 246, 262 236, 248 240 Z",
                          opacity: tartar, "stroke-width": 2 }, inner), PROP.tartar, F.pupil);
  }
  paint_el(el("path", { d: GUMLINE_D, "stroke-width": 3 }, inner), "none", PROP.gum_dk);
  // Lower jaw (mouth closed): chin fur with a dark lip line.
  paint_el(el("path", { d: "M0 330 C 200 318, 500 318, 800 330 L 800 420 L 0 420 Z" }, inner),
           F.fur, "none");
  paint_el(el("ellipse", { cx: -20, cy: 230, rx: 165, ry: 200 }, inner), F.white, "none");
  // Upper lip: covers gum and teeth down to its edge; the edge rises as lip goes 0 -> 1.
  const edge = 330 - 185 * lip;
  const lip_d = `M0 0 L 800 0 L 800 ${edge - 8} C 560 ${edge + 6}, 260 ${edge + 6}, 0 ${edge - 8} Z`;
  const lid = `${id}-lip`;
  el("path", { d: lip_d }, el("clipPath", { id: lid }, defs));
  const lg = el("g", { "clip-path": `url(#${lid})` }, inner);
  paint_el(el("rect", { x: 0, y: 0, width: 800, height: 420 }, lg), F.fur, "none");
  paint_el(el("ellipse", { cx: -20, cy: 230, rx: 165, ry: 200 }, lg), F.white, "none");
  paint_el(el("path", { d: `M0 ${edge - 8} C 260 ${edge + 6}, 560 ${edge + 6}, 800 ${edge - 8}`,
                        "stroke-width": 6 }, inner), "none", "#2b1a1e");
  // Whisker dots on the muzzle.
  for (const [cx, cy] of [[60, 120], [90, 100], [80, 140], [110, 122]]) {
    paint_el(el("circle", { cx, cy, r: 4 }, lg), "#c9ced6", "none");
  }
  paint_el(el("rect", { x: 2, y: 2, width: 796, height: 416, rx: 40, "stroke-width": 4 }, mg),
           "none", ink);
  // The thumb that lifts the lip, coming in from the top.
  if (thumb && lip > 0.02) {
    const tx = thumb_x;
    finger(mg, `M${tx + 20} -60 C ${tx + 10} 40, ${tx + 5} ${edge - 70}, ${tx} ${edge - 26}`, ink, 34);
  }
  return { g: mg, edge, gum_y: 210 };
}

// A toothbrush seen from the side: bristle tips centred on (x, y), handle running out along
// angle (degrees, 0 = to the right). Bristles stick out on the head's left side.
function brush_side(g, x, y, { angle = -45, ink = "currentColor", s = 1 } = {}) {
  const bg = el("g", { transform: `translate(${x} ${y}) rotate(${angle}) scale(${s})`,
                       "stroke-width": 4, ...ROUND }, g);
  paint_el(el("rect", { x: 28, y: -50, width: 26, height: 100, rx: 10 }, bg), OREO_FUR.brush, ink);
  paint_el(el("rect", { x: 46, y: -12, width: 420, height: 24, rx: 12 }, bg), OREO_FUR.brush, ink);
  for (let k = -40; k <= 40; k += 10) {
    paint_el(el("path", { d: `M28 ${k} L 0 ${k}`, "stroke-width": 4 }, bg), "none", ink);
  }
  return bg;
}

const META = {
  title: "Oreo vs. the toothbrush",
  subtitle: "Brushing a hostile adult cat's teeth: effectively, and without getting hurt.",
  minutes: 40,
  audience: "cat owners whose adult cat objects to mouth handling",
  source: "International Cat Care, Cornell Feline Health Center, VCA, AVDC, VOHC, WSAVA, " +
          "AAFP/ISFM 2022; accessed October 2026",
  internal: false,
  prereqs: ["One cat (adult, opinionated)", "A vet you can call"],
  objectives: [
    "Explain why brushing matters, and what it cannot fix",
    "Decide when a vet must see your cat before any training",
    "Read the quiet stress signals and stop before the hiss",
    "Run a slow, food-paid training ladder, and step back after a bad day",
    "Brush with the sourced technique: back to you, lip lifted, 45 degrees, gentle circles",
    "Choose a Plan B, and say why anaesthesia-free cleaning is not one",
  ],
};

// ---- Checks. Each "why" names its source tag in research/brief.md (in a comment). ----
const CHECKS = {
  // 1. Why bother
  plaque_time: {  // S8, S9, S2
    kind: "choice",
    prompt: "Plaque is left on Oreo's teeth. About how soon can it start to harden into tartar?",
    options: [
      { text: "In about 1-2 days (36-48 hours)", correct: true,
        why: "VCA gives 36-48 hours, and “within 48 hours”. That is why the ideal is daily." },
      { text: "In about 6 months", why: "Far too slow. The sources give hours to days, not months." },
      { text: "Never, if he eats dry food",
        why: "No source says this. iCatCare: the link between diet and dental disease “is not clear”." },
      { text: "In about 2 weeks", why: "Too slow. VCA gives 36-48 hours." },
    ],
  },
  tartar: {  // S2, S12, S8, S10
    kind: "choice",
    prompt: "Oreo's back teeth have a hard yellow-brown crust. What will brushing do to it?",
    options: [
      { text: "Nothing useful: tartar needs a vet scale and polish under anaesthetic", correct: true,
        why: "Tartar “can't be removed by brushing” (iCatCare). See your vet first; brushing " +
             "helps after the cleaning." },
      { text: "Brush harder and it will come off",
        why: "Tartar resists brushing (VOHC), and no source advises harder brushing." },
      { text: "Scrape it off at home with a metal tool",
        why: "VCA warns against this: you can hurt the cat, the cat can hurt you, and scratched " +
             "enamel collects plaque faster." },
      { text: "Book an “anaesthesia-free” cleaning instead",
        why: "The AVDC calls it cosmetic only: it cannot clean below the gumline." },
    ],
  },
  hidden: {  // S2, S8, S5
    kind: "choice",
    prompt: "Oreo eats well and his breath is fine. Is his mouth healthy?",
    options: [
      { text: "Not necessarily: cats hide pain, and severe disease can show no signs", correct: true,
        why: "iCatCare: cats “often hide signs of pain” and can have severe disease with no " +
             "signs. A vet exam is the only way to know." },
      { text: "Yes: a cat in pain always stops eating",
        why: "Cornell: many cats keep eating until the disease is extreme." },
      { text: "Yes: no bad breath means no disease",
        why: "Bad breath is one sign among many, and it can be absent." },
    ],
  },
  // 2. Attitude or a sore mouth?
  hiss_first: {  // S3, S5, S17, S1
    kind: "choice",
    prompt: "Oreo hisses and swats every time your hand goes near his mouth. What is the best " +
            "first step?",
    options: [
      { text: "Book a vet exam, and ask about a feline behaviourist", correct: true,
        why: "Irritability is a sign of oral pain (Cornell). AAFP/ISFM: consider pain in any cat " +
             "that is hard to handle, and train cats with problem behaviour only with a " +
             "behaviourist's input." },
      { text: "Hold him firmly and brush fast to get it over with",
        why: "AAFP/ISFM: restraint increases fear, and one bad experience can make a cat more " +
             "reactive next time." },
      { text: "Scruff him to calm him down",
        why: "AAFP/ISFM: scruffing is “no longer recommended for cats at any life stage”." },
      { text: "Switch to a finger brush so you can feel what you're doing",
        why: "iCatCare advises against finger brushes in most cases: bite risk." },
    ],
  },
  pain_signs: {  // S2, S3, S5, S8, S17
    kind: "choice",
    prompt: "Which of these can be signs of a painful mouth? Pick every one that applies.",
    options: [
      { text: "Dropping food, or chewing on one side only", correct: true,
        why: "Both are listed signs (VCA, Cornell)." },
      { text: "Pawing at the mouth, or drooling", correct: true,
        why: "Both are listed signs (iCatCare)." },
      { text: "Red, sore or bleeding gums", correct: true, why: "A listed sign (iCatCare)." },
      { text: "Irritability: grumpier than usual", correct: true,
        why: "Cornell lists irritability as a sign of dental pain." },
      { text: "Ears forward and tail up while exploring",
        why: "AAFP/ISFM describes this as relaxed, engaging body language." },
    ],
  },
  // 3. Reading Oreo
  quiet_signals: {  // S9, S17, S1
    kind: "choice",
    prompt: "Mid-session, Oreo's ears turn sideways, he goes still, and his pupils get big. " +
            "What do you do?",
    options: [
      { text: "Stop, give a treat, and go back to an easier step next time", correct: true,
        why: "These are stress signals (VCA, AAFP/ISFM). iCatCare: stop, end on a positive note, " +
             "try again tomorrow." },
      { text: "Keep going: a still cat is a calm cat",
        why: "Freezing is “inhibition”, which AAFP/ISFM says is “often not recognized” " +
             "and can lead to hissing and biting." },
      { text: "Hold him more firmly",
        why: "AAFP/ISFM: restraint increases negative emotions and leads to faster, stronger " +
             "reactions." },
      { text: "Finish the whole mouth quickly",
        why: "VCA: “your pet gets to set the pace”." },
    ],
  },
  escalation: {  // S17
    kind: "order",
    prompt: "Nobody stops the session. Put Oreo's responses in the order the AAFP/ISFM model " +
            "describes.",
    items: ["Freezes; ears turn sideways (quiet)", "Turns away, tries to leave (away)",
            "Growls, hisses, swats or bites (loud)"],
    explain: "<p>Inhibition, then avoidance, then repelling. Each step happens when the one " +
             "before it does not work. Stop at the first one.</p>",
  },
  signal_match: {  // S1, S9, S17
    kind: "match",
    prompt: "Match what Oreo does to what you do.",
    pairs: [["Ears up and forward, tail up", "Carry on, with treats"],
            ["Freezes, ears turn sideways", "Stop: treat, an easier step next time"],
            ["Turns his head away, leans away", "Session over: end on a treat"],
            ["Hisses or swats", "Stop, and rethink with your vet or a behaviourist"]],
    explain: "<p>Every row ends the same way for anything but relaxed: the brush goes away. " +
             "What changes is how far back you go next time.</p>",
  },
  // 4. The slow ladder
  ladder_order: {  // S1, S3, S7, S14
    kind: "order",
    prompt: "Put one common training ladder in order, from first step to last.",
    items: ["Touch and stroke his face", "He licks cat toothpaste off your finger",
            "Lift his lip for a moment", "The brush touches one canine tooth",
            "Brush a few teeth", "Brush one whole side, 10 seconds"],
    explain: "<p>The sources use slightly different ladders, but all go from touch, to taste, to " +
             "lip, to brush, one small step at a time.</p>",
  },
  bad_session: {  // S1, S9, S14, S17
    kind: "choice",
    prompt: "Week 3. On the lip-lift step, Oreo's ears turn and he pulls away. What now?",
    options: [
      { text: "Stop, give a treat, and next time go back one step", correct: true,
        why: "VCA: take a break and start with an easier step next time. WSAVA: things may take " +
             "a backward step. That is normal." },
      { text: "Push through, so he learns that leaving doesn't work",
        why: "AAFP/ISFM: bad experiences make cats more reactive later. Releasing the cat must " +
             "always be an option." },
      { text: "Skip ahead to the brush: maybe he prefers it",
        why: "VCA: each step should be easily accepted before the next." },
      { text: "Give up for good", why: "Setbacks are expected. Go back one step and keep going." },
    ],
  },
  how_long: {  // S1, S3, S9
    kind: "choice",
    prompt: "How long can training a resistant adult cat take?",
    options: [
      { text: "Weeks to months; if there is no progress after a few weeks, get professional help",
        correct: true,
        why: "VCA: “a few minutes for some pets and a few months for others”, and ask a " +
             "behaviour professional if a few weeks show no progress." },
      { text: "One weekend, if you are firm", why: "No source supports this, and “firm” " +
             "usually means restraint, which AAFP/ISFM warns against." },
      { text: "It can't be done: adult cats can't learn this",
        why: "iCatCare: brushing can start at any age if done gradually; older cats need more time." },
      { text: "Exactly four weeks",
        why: "Cornell's plan has four weekly steps, but iCatCare says it doesn't matter how long " +
             "it takes." },
    ],
  },
  // 5. Kit and technique
  toothpaste: {  // S1, S3, S7, S8
    kind: "choice",
    prompt: "Which toothpaste goes on Oreo's brush?",
    options: [
      { text: "A toothpaste made for cats", correct: true,
        why: "All the sources say pet toothpaste only. It is made to be swallowed." },
      { text: "A pea-sized bit of your own toothpaste",
        why: "Human toothpaste is unsafe for cats: it foams, has ingredients such as fluoride " +
             "that should not be swallowed, and can upset the stomach (VCA, iCatCare, Cornell)." },
      { text: "Baking soda", why: "VCA: too alkaline, it can upset the stomach, and it tastes bad." },
      { text: "Anything: he'll rinse", why: "Cats don't rinse. They swallow it." },
    ],
  },
  surfaces: {  // S3, S7, S14
    kind: "choice",
    prompt: "Which part of Oreo's teeth matters most?",
    options: [
      { text: "The outside surfaces at the gumline, mainly the big cheek teeth and the canines",
        correct: true,
        why: "Plaque collects where gum meets tooth (VCA). Cornell and VCA: the outside " +
             "surfaces are the ones that need brushing." },
      { text: "The biting tips", why: "VCA: you don't need to worry about the tips." },
      { text: "Only the inside surfaces",
        why: "The tongue helps clean the inside (Cornell, VCA). WSAVA adds the inside “if " +
             "possible”, but never instead of the outside." },
      { text: "Only the small front teeth", why: "VCA points to the cheek teeth and canines first." },
    ],
  },
  position: {  // S1, S7, S17
    kind: "choice",
    prompt: "Where should Oreo be while you brush?",
    options: [
      { text: "Sitting with his back to you, on your lap or a towel on a table", correct: true,
        why: "iCatCare: less confrontational, and if he wriggles, he backs into you." },
      { text: "Face to face, with your hand holding his head from the front",
        why: "iCatCare chose back-to-you because face to face is more confrontational." },
      { text: "Scruffed, so he stays still", why: "AAFP/ISFM: not recommended at any life stage." },
      { text: "Wrapped tightly in a towel",
        why: "AAFP/ISFM: a towel can wrap loosely, but not to restrain tightly." },
    ],
  },
  // 6. Keeping all your fingers
  finger_habits: {  // S1, S7, S9, S17
    kind: "choice",
    prompt: "Which habits keep your fingers safe? Pick every one that applies.",
    options: [
      { text: "Use a brush with a handle, not a finger brush", correct: true,
        why: "iCatCare avoids finger brushes in most cases because of the bite risk." },
      { text: "Keep his mouth closed and lift only the lip", correct: true,
        why: "VCA: “the mouth can remain closed”. Never force it open." },
      { text: "Stop at the quiet signals", correct: true,
        why: "AAFP/ISFM: quiet signals that are ignored lead to hissing, swatting and biting." },
      { text: "Scruff him first", why: "AAFP/ISFM: scruffing causes negative responses, and the cat " +
             "remembers." },
      { text: "Open his mouth wide so you can see", why: "VCA: never force your pet's mouth open." },
    ],
  },
  bitten: {
    kind: "choice",
    prompt: "Despite everything, Oreo bites your hand and breaks the skin. What now?",
    options: [
      { text: "End the session, wash the bite well with soap and water, and contact a doctor",
        correct: true,
        why: "General first aid: a bite that breaks the skin needs a doctor's advice. This " +
             "module gives first aid only, not medical advice." },
      { text: "Finish the session first so he doesn't “win”",
        why: "There is no winning. Stop now; AAFP/ISFM: bad experiences make cats more " +
             "reactive next time." },
      { text: "Rub some cat toothpaste on it", why: "Nice try. Soap, water, and a doctor." },
    ],
  },
  // 7. Plan B
  plan_b: {  // S1, S2, S8, S11, S13
    kind: "choice",
    prompt: "Months of patient training later, Oreo still won't accept a brush. What has the " +
            "most support?",
    options: [
      { text: "Ask your vet about VOHC-accepted diets or treats, and keep up regular exams",
        correct: true,
        why: "iCatCare: a dental diet is “a good option” if brushing is not tolerated. " +
             "Exams: at least yearly, every 3-6 months for cats with dental problems." },
      { text: "Force it: brushing is the only thing that works",
        why: "iCatCare: it should not be a battle, and there are alternatives." },
      { text: "Any product that says “dental” on the pack",
        why: "Only products with the VOHC seal have met the VOHC standard." },
      { text: "Give up on his teeth", why: "Exams and passive products still help." },
    ],
  },
  npds: {  // S10, S8
    kind: "choice",
    prompt: "Why does the American Veterinary Dental College discourage “anaesthesia-free” " +
            "cleaning?",
    options: [
      { text: "It can't clean below the gumline or examine the whole mouth: the effect is cosmetic",
        correct: true,
        why: "AVDC: removing tartar from visible surfaces “has little effect on a pet's health” " +
             "and gives “a false sense of accomplishment”." },
      { text: "It is too expensive", why: "Cost is not one of the AVDC's reasons." },
      { text: "Because anaesthesia has no risk",
        why: "AVDC says anaesthesia “will never be 100% risk-free”; modern methods minimise " +
             "the risk." },
      { text: "Cats' teeth can't be scaled", why: "They are scaled routinely, under anaesthesia." },
    ],
  },
  // Review quiz
  r_crust_plan: {  // S1, S2, S14
    kind: "choice",
    prompt: "Review. Oreo has tartar and red gums. Which plan fits?",
    options: [
      { text: "Vet first: cleaning under anaesthetic, let the mouth heal, then start the ladder",
        correct: true,
        why: "Tartar needs a scale and polish (iCatCare). Home care often starts after it, once " +
             "the mouth has healed. Sore gums make brushing painful (Cornell)." },
      { text: "Start brushing today to scrub the tartar off", why: "Brushing can't remove tartar, and " +
             "brushing sore gums hurts." },
      { text: "Wait until he stops eating, then see the vet", why: "Cats hide pain and often keep " +
             "eating until the disease is severe." },
    ],
  },
  r_resorption: {  // S2, S3, S5
    kind: "choice",
    prompt: "Review. What do our sources support about tooth resorption?",
    options: [
      { text: "Its cause is unknown, it can be very painful, and it needs a vet to diagnose",
        correct: true,
        why: "Cornell: the cause is not known. Diagnosis needs X-rays under anaesthesia." },
      { text: "Daily brushing prevents it",
        why: "No source in this module says that; the cause is unknown." },
      { text: "It is caused by dry food", why: "No source says this." },
      { text: "You will always see it", why: "It can start below the gum, out of sight." },
    ],
  },
  r_brushes: {  // S1, S7, S14
    kind: "match",
    prompt: "Review. Match each tool to its note.",
    pairs: [["Cat toothbrush with a handle", "keeps your fingers out of his mouth"],
            ["Child's soft toothbrush", "a soft-bristled alternative"],
            ["Finger brush", "bite risk: iCatCare advises against for most cats"],
            ["Cotton bud", "a training step before the brush"]],
    explain: "<p>Sources differ on finger brushes: VCA and WSAVA list them as options. For a cat " +
             "that bites, iCatCare's caution wins on common sense.</p>",
  },
  r_scruff: {  // S17
    kind: "choice",
    prompt: "Review. Why is scruffing out?",
    options: [
      { text: "It causes fear and stress the cat remembers, which makes the next time harder",
        correct: true,
        why: "AAFP/ISFM: “a mistaken premise that scruffing makes patients easier to work with”." },
      { text: "It is fine for adults, just not kittens",
        why: "AAFP/ISFM: not recommended “at any life stage”." },
      { text: "It works, but it looks bad", why: "It doesn't work: it causes negative responses." },
    ],
  },
  r_seal: {  // S11, S12, S13
    kind: "choice",
    prompt: "Review. A dental treat has the VOHC seal. What does that tell you?",
    options: [
      { text: "The maker's trials met the VOHC standard for plaque or tartar control", correct: true,
        why: "VOHC reviews data that the maker submits; it does not test products itself. Check " +
             "which claim (plaque, tartar or both) the seal covers." },
      { text: "VOHC tested it in its own lab", why: "“The VOHC does not test products itself.”" },
      { text: "It works as well as brushing", why: "Brushing remains the gold standard (VOHC)." },
    ],
  },
  r_frequency: {  // S1, S3, S7, S14
    kind: "choice",
    prompt: "Review. Once Oreo accepts the brush, how often should you brush?",
    options: [
      { text: "Daily is ideal; VCA calls three times a week the minimum", correct: true,
        why: "Most sources say daily. VCA also gives three times a week as a minimum." },
      { text: "Once a month", why: "Plaque starts to harden within about two days." },
      { text: "Only when his breath smells",
        why: "By then there may already be disease, and bad breath can have other causes." },
    ],
  },
  r_bleeding: {  // S1, S3, S9
    kind: "choice",
    prompt: "Review. A few weeks in, you see a little blood on the brush. What does it mean?",
    options: [
      { text: "A little bleeding at first is common and should stop; tell your vet if it is more " +
              "than that", correct: true,
        why: "iCatCare: some bleeding at first is common and stops as you brush more. VCA: tell " +
             "your vet if gums bleed more than usual." },
      { text: "Stop brushing for good", why: "A little early bleeding is expected." },
      { text: "Brush harder to toughen the gums", why: "No source says this. Gentle circles only." },
    ],
  },
  r_first_tooth: {  // S1, S3, S7, S14 (D5)
    kind: "choice",
    prompt: "Review. Which teeth should you start with?",
    options: [
      { text: "Sources differ: the back cheek teeth (iCatCare) or the canines (Cornell, WSAVA)",
        correct: true,
        why: "This is a real disagreement. Both groups agree that the cheek teeth and canines " +
             "matter most. Pick one order and go slowly." },
      { text: "The small front teeth, always", why: "No source makes these the most important." },
      { text: "The inside surfaces first", why: "The outside surfaces matter most." },
    ],
  },
};

// ---- Diagrams ----
const DIAGRAMS = {
  escalation: {
    title: "How a session goes wrong",
    width: 1200, height: 400,
    intro: "<p class='hint'>Click a box for details, or step through a flow.</p>",
    groups: [
      { label: "Quiet (inhibition)", x: 340, y: 30, w: 250, h: 340 },
      { label: "Away (avoidance)", x: 635, y: 30, w: 250, h: 340 },
      { label: "Loud (repelling)", x: 930, y: 30, w: 240, h: 340 },
    ],
    nodes: [
      { id: "relaxed", label: "Relaxed", x: 100, y: 200, w: 150,
        detail: "<p>Ears up and forward, head and body upright, tail up, exploring " +
                "(AAFP/ISFM). Carry on, with treats.</p>" },
      { id: "freeze", label: "Freezes", x: 465, y: 120, w: 200,
        detail: "<p>Going still is a fear response, not calm. AAFP/ISFM: this quiet response " +
                "is “often not recognized”.</p>" },
      { id: "ears", label: "Ears turn sideways", x: 465, y: 200, w: 200,
        detail: "<p>Ears rotated to the side or back are a stress signal (VCA, AAFP/ISFM).</p>" },
      { id: "lips", label: "Tight lips, big pupils", x: 465, y: 280, w: 200,
        detail: "<p>Lips held tight and dilated pupils are on VCA's list of stress signals.</p>" },
      { id: "away", label: "Turns head away", x: 760, y: 160, w: 200,
        detail: "<p>Moving the head away, leaning away, trying to leave (VCA). The quiet " +
                "signals did not work, so he tries to escape.</p>" },
      { id: "leave", label: "Leans away, leaves", x: 760, y: 240, w: 200,
        detail: "<p>Let him go. AAFP/ISFM: releasing the cat must always be an option.</p>" },
      { id: "hiss", label: "Growls, hisses", x: 1050, y: 160, w: 190,
        detail: "<p>Repelling: growling, hissing (AAFP/ISFM). The session is over, and the " +
                "next one starts further down the ladder.</p>" },
      { id: "bite", label: "Swats, bites", x: 1050, y: 240, w: 190,
        detail: "<p>The last stage. If this happens often, ask your vet about pain and about " +
                "a feline behaviourist.</p>" },
    ],
    edges: [
      { from: "relaxed", to: "ears", label: "brush comes close" },
      { from: "ears", to: "away", label: "ignored" },
      { from: "away", to: "hiss", label: "ignored" },
      { from: "ears", to: "relaxed", label: "you stop", bend: 70 },
    ],
    flows: [
      { title: "Nobody stops", steps: [
        { nodes: ["relaxed"], text: "Oreo starts relaxed: ears forward, body loose." },
        { nodes: ["freeze", "ears", "lips"], edges: ["relaxed>ears"],
          text: "The brush comes close. He goes still and his ears turn. These are the quiet " +
                "signals." },
        { nodes: ["away", "leave"], edges: ["ears>away"],
          text: "Nobody stops. He turns away and tries to leave." },
        { nodes: ["hiss", "bite"], edges: ["away>hiss"],
          text: "Still nobody stops. Now he gets loud: growl, hiss, swat, bite.", show: "bite" },
      ] },
      { title: "You stop at the quiet signals", steps: [
        { nodes: ["relaxed"], text: "Same start: relaxed Oreo." },
        { nodes: ["freeze", "ears", "lips"], edges: ["relaxed>ears"],
          text: "Same quiet signals." },
        { nodes: ["ears", "relaxed"], edges: ["ears>relaxed"],
          text: "You stop here: brush away, treat, an easier step next time.", show: "relaxed" },
      ] },
    ],
  },
  plan_b: {
    title: "Plan B, from least to most effort for Oreo",
    width: 1200, height: 330,
    intro: "<p class='hint'>Click a box for details, or step through the flow.</p>",
    nodes: [
      { id: "help", label: "Ask the vet team", x: 110, y: 100, w: 180,
        detail: "<p>Some clinics offer a vet nurse appointment to show you how (iCatCare). No " +
                "progress after a few weeks: a behaviour consultant (VCA); a cat with problem " +
                "behaviour: a feline behaviourist (AAFP/ISFM).</p>" },
      { id: "products", label: "VOHC seal products", x: 421, y: 100, w: 190,
        detail: "<p>Dental diets, treats and water additives that need no handling. The seal " +
                "means the maker's trials met the VOHC standard; VOHC does not test products " +
                "itself. Check whether the claim is plaque, tartar or both. Chews “reduce " +
                "(but not prevent)” plaque and tartar (iCatCare).</p>" },
      { id: "exams", label: "Regular vet exams", x: 732, y: 100, w: 180,
        detail: "<p>At least every 12 months; every 3-6 months for cats with dental problems " +
                "(iCatCare).</p>" },
      { id: "cleaning", label: "Cleaning under anaesthesia", x: 1063, y: 100, w: 240,
        detail: "<p>A scale and polish removes tartar above and below the gumline, which " +
                "brushing cannot do. X-rays and probing also need anaesthesia (iCatCare, " +
                "Cornell). How often depends on the cat (VCA).</p>" },
      { id: "npds", label: "✗ Anaesthesia-free scaling", x: 732, y: 250, w: 260,
        detail: "<p>Not a Plan B. The AVDC calls it cosmetic only: it cannot reach below the " +
                "gumline or examine the whole mouth, and sharp tools near a moving head can " +
                "injure the cat, or the person may be bitten.</p>" },
    ],
    edges: [
      { from: "help", to: "products", label: "still no brush" },
      { from: "products", to: "exams" },
      { from: "exams", to: "cleaning", label: "vet advises" },
      { from: "exams", to: "npds", label: "not this" },
    ],
    flows: [
      { title: "Climbing the Plan B ladder", steps: [
        { nodes: ["help"], text: "First, get help: a vet nurse demo, or a behaviour professional." },
        { nodes: ["products"], edges: ["help>products"],
          text: "No brush? Passive products with the VOHC seal, chosen with your vet." },
        { nodes: ["exams"], edges: ["products>exams"],
          text: "Keep up regular exams: the vet can see what you can't." },
        { nodes: ["cleaning"], edges: ["exams>cleaning"],
          text: "When the vet advises it: a cleaning under anaesthesia.", show: "cleaning" },
        { nodes: ["npds"], edges: ["exams>npds"],
          text: "Not this: anaesthesia-free scaling is cosmetic only.", show: "npds" },
      ] },
    ],
  },
};

// ---- Pictures ----
// Oreo's frame: base centre (230, 310); tail reaches 185 px left of x, whiskers 115 px right.
const cat = (g, paint, pose) => oreo(el("g", {}, g), { ink: paint.ink, paper: paint.paper, ...pose });

const PICS = {
  day1: {
    alt: "Oreo, a black-and-white cat, glares sideways at a toothbrush held out by a hand. " +
         "He thinks: absolutely not.",
    caption: "Day 1. Oreo opens negotiations.",
    width: 520, height: 340,
    draw(g, paint) {
      cat(g, paint, { brows: 1, lids: 0.55, look: 0.7, tail: 0.6 });
      hand_brush(g, { ink: paint.ink });
      bubble(g, 345, 40, 165, 70, ["Absolutely", "not."],
             { tx: 318, ty: 100, ink: paint.ink, paper: paint.paper });
    },
  },
  hides_pain: {
    alt: "Oreo sits calmly and says: I'm fine. A thought bubble shows a sore tooth.",
    caption: "Cats hide pain. “I'm fine” is not a diagnosis.",
    width: 540, height: 340,
    draw(g, paint) {
      cat(g, paint, { lids: 0.25, pupils: 0.35 });
      bubble(g, 350, 150, 170, 64, ["I'm fine."],
             { tx: 300, ty: 170, ink: paint.ink, paper: paint.paper, speech: true, size: 30 });
      bubble(g, 340, 20, 130, 100, [], { tx: 300, ty: 70, ink: paint.ink, paper: paint.paper });
      const tg = frame(g, 405, 66, 0.5, 484, 250);
      paint_el(el("path", { d: MOUTH_TEETH[3].d, "stroke-width": 8 }, tg), PROP.tooth, paint.ink);
      for (const d of ["M378 220 l 18 -14 l -6 22 l 20 -12", "M590 222 l -16 -14 l 4 22 l -18 -12"]) {
        paint_el(el("path", { d, "stroke-width": 7 }, tg), "none", paint.ink);
      }
    },
  },
  vet: {
    alt: "Oreo sits on a vet's exam table. The vet, off to the left, says: say ahh. Oreo thinks: " +
         "say no.",
    caption: "Vet first. Pain can look a lot like attitude.",
    width: 560, height: 360,
    draw(g, paint) {
      paint_el(el("rect", { x: 60, y: 318, width: 440, height: 22, rx: 6, "stroke-width": 4 }, g),
               PROP.steel, paint.ink);
      paint_el(el("path", { d: "M120 340 L 120 360 M440 340 L 440 360", "stroke-width": 8 }, g),
               "none", paint.ink);
      cat(g, paint, { x: 300, y: 318, s: 0.86, ears: 0.35, look: -0.7, brows: 0.7, lids: 0.3,
                      tail: 0.4 });
      bubble(g, 10, 30, 130, 52, ["Say ahh."],
             { tx: 0, ty: 110, ink: paint.ink, paper: paint.paper, speech: true });
      bubble(g, 410, 40, 130, 52, ["Say no."], { tx: 385, ty: 110, ink: paint.ink, paper: paint.paper });
    },
  },
  signals: {
    alt: "Three Oreos. Relaxed: ears forward, soft eyes. Quiet signals: ears turned sideways, " +
         "wide pupils, frozen. Loud signals: ears flat, hissing, puffed tail.",
    caption: "Same cat, three moods. Stop at the middle one, not the last one.",
    width: 1080, height: 400,
    draw(g, paint) {
      const poses = [
        [{ lids: 0.45, pupils: 0.2, mouth: "smile", tail: -0.3 }, "Relaxed", "carry on"],
        [{ ears: 0.55, pupils: 0.85, look: 0.6 }, "Quiet signals", "stop here"],
        [{ ears: 1, pupils: 1, brows: 1, mouth: "hiss", tail: 1, puff: 1 }, "Loud signals",
         "too late: you missed the quiet ones"],
      ];
      poses.forEach(([pose, title, sub], k) => {
        const cx = 180 + k * 360;
        cat(g, paint, { x: cx + 30, y: 310, s: 0.95, ...pose });
        txt(g, title, cx, 344, { size: 30, fill: paint.ink });
        txt(g, sub, cx, 378, { size: 22, weight: 500, fill: paint.muted });
      });
    },
  },
  calendar: {
    alt: "An eight-week calendar of Oreo's training, with one week going back a step.",
    caption: "A realistic calendar. Yours will differ: Oreo sets the pace.",
    width: 720, height: 330,
    draw(g, paint) {
      const weeks = [
        ["Face rubs.", "Accepted, with", "suspicion."], ["Licked paste", "off a finger."],
        ["Lip lifted.", "Oreo left."], ["Back to", "week 2. Fine."],
        ["Lip lift:", "3 seconds!"], ["Brush touched", "one canine."],
        ["Three teeth.", "Treats: many."], ["One side,", "10 seconds."],
      ];
      weeks.forEach((lines, k) => {
        const x = 10 + (k % 4) * 177, y = 10 + Math.floor(k / 4) * 160;
        const cell = el("rect", { x, y, width: 165, height: 148, rx: 10, "stroke-width": 3 }, g);
        paint_el(cell, paint.paper, paint.ink);
        txt(g, `Week ${k + 1}`, x + 82, y + 26, { size: 22, fill: paint.ink });
        lines.forEach((line, j) => txt(g, line, x + 82, y + 66 + j * 24,
                                       { size: 18, weight: 500, fill: paint.muted }));
        if (k === 3) {
          paint_el(el("path", { d: `M${x + 30} ${y + 128} l -14 -10 l 14 -10 M${x + 16} ${y + 118} ` +
                                   `l 50 0`, "stroke-width": 3 }, g), "none", paint.ink);
        }
      });
    },
  },
  mouth: {
    alt: "Close-up of Oreo's upper teeth from the side, lip lifted, mouth closed. Labels: the " +
         "gumline, where to aim; the canine; the big cheek teeth.",
    caption: "Lip up, mouth shut. The gumline on the outside is the target.",
    width: 860, height: 560,
    draw(g, paint) {
      mouth_closeup(g, { x: 30, y: 80, ink: paint.ink, lip: 1 });
      const lead = (d) => paint_el(el("path", { d, "stroke-width": 3 }, g), "none", paint.ink);
      lead("M255 287 L 255 40");
      txt(g, "Gumline: aim here", 255, 24, { size: 26, fill: paint.ink });
      lead("M205 400 L 120 530");
      txt(g, "Canine", 120, 545, { size: 24, fill: paint.ink });
      lead("M520 370 L 600 530");
      txt(g, "Big cheek teeth", 600, 545, { size: 24, fill: paint.ink });
    },
  },
  toothpaste: {
    alt: "Two tubes. Cat toothpaste: yes. Human toothpaste: no. Oreo thinks: chicken?",
    caption: "Cat toothpaste only. It is made to be swallowed; ours is not.",
    width: 640, height: 300,
    draw(g, paint) {
      tube(g, 30, 80, { ink: paint.ink, label: "Cat paste" });
      txt(g, "✓ Yes", 115, 140, { size: 26, fill: paint.good });
      tube(g, 30, 220, { ink: paint.ink, label: "Human paste", color: "#7b8794" });
      txt(g, "✗ No", 115, 280, { size: 26, fill: paint.crit });
      cat(g, paint, { x: 470, y: 290, s: 0.62, look: -0.8, pupils: 0.7, ears: 0 });
      bubble(g, 380, 18, 130, 50, ["Chicken?"], { tx: 430, ty: 100, ink: paint.ink, paper: paint.paper });
    },
  },
  bandage: {
    alt: "A hand with a plaster on its thumb gives a thumbs-up. Oreo sits beside it, smug.",
    caption: "Fingers that stay outside the mouth tend to stay attached.",
    width: 560, height: 340,
    draw(g, paint) {
      bandaged_hand(g, 120, 210, { ink: paint.ink });
      cat(g, paint, { x: 380, y: 320, s: 0.9, lids: 0.55, mouth: "smile", tail: -0.4, look: -0.6 });
    },
  },
  plan_b: {
    alt: "Oreo sits behind a full bowl of dental kibble and says: Plan B is delicious.",
    caption: "Plan B: some dental diets and treats carry the VOHC seal.",
    width: 540, height: 340,
    draw(g, paint) {
      cat(g, paint, { x: 200, y: 300, s: 0.9, lids: 0.6, mouth: "smile", tail: -0.6 });
      bowl(g, 250, 306, { ink: paint.ink });
      bubble(g, 330, 40, 190, 54, ["Plan B is delicious."],
             { tx: 285, ty: 120, ink: paint.ink, paper: paint.paper, speech: true, size: 21 });
    },
  },
  finale: {
    alt: "Oreo gives a slow blink next to a toothbrush and a treat.",
    caption: "One day: 30 seconds per side, then a treat. Oreo calls it a draw.",
    width: 520, height: 340,
    draw(g, paint) {
      cat(g, paint, { lids: 1, mouth: "smile", tail: -0.3 });
      hand_brush(g, { x: 560, y: 260, ink: paint.ink });
      treat(g, 400, 300, { ink: paint.ink, s: 1.4 });
    },
  },
};

// ---- Clips (dark stage, 1920 x 1080). render(t) redraws the moving drawings from t. ----
const INK = { ink: COLORS.fg, paper: COLORS.bg };
const clear = g => { while (g.firstChild) g.removeChild(g.firstChild); return g; };

// One upper tooth and its gum in cross-section (cheek side on the left), in a 600 x 560 frame.
// The crevice between tooth and gum, where the bristles aim, is at (238, 300).
const CREVICE = [238, 300];
function tooth_section(g, { x = 0, y = 0, s = 1, ink = COLORS.fg } = {}) {
  const tg = frame(g, x, y, s, 0, 0);
  paint_el(el("path", { d: "M250 30 C 240 160, 230 260, 240 380 C 250 470, 290 520, 318 520 " +
                           "C 350 520, 380 470, 385 380 C 395 260, 385 160, 375 30 Z" }, tg),
           PROP.tooth, ink);
  paint_el(el("path", { d: "M60 30 L 250 30 C 241 150, 233 240, 238 300 C 200 312, 130 300, 60 270 Z" },
              tg), PROP.gum, ink);
  paint_el(el("path", { d: "M375 30 L 560 30 L 560 270 C 490 300, 430 312, 388 300 " +
                           "C 392 240, 386 150, 375 30 Z" }, tg), PROP.gum, ink);
  return tg;
}

// The table with a towel, used by most brushing scenes.
function table_towel(g) {
  paint_el(el("rect", { x: 460, y: 820, width: 1000, height: 30, rx: 6, "stroke-width": 4 }, g),
           "#6b5a4a", COLORS.fg);
  paint_el(el("path", { d: "M540 850 L 540 1080 M1380 850 L 1380 1080", "stroke-width": 14 }, g),
           "none", "#6b5a4a");
  paint_el(el("rect", { x: 640, y: 798, width: 640, height: 26, rx: 8, "stroke-width": 4 }, g),
           PROP.towel, COLORS.fg);
}

// Oreo on the table, the owner's torso behind him. Returns Oreo's frame for overlays.
const SEAT = { x: 960, y: 805, s: 1.5 };
function seated(g, pose, { owner = true, owner_head = true } = {}) {
  clear(g);
  if (owner) owner_behind(g, { ...SEAT, ink: COLORS.fg, head: owner_head });
  oreo(el("g", {}, g), { ...SEAT, ...INK, ...pose });
}
const at_seat = (fx, fy) => [SEAT.x + SEAT.s * (fx - 230), SEAT.y + SEAT.s * (fy - 310)];

// A status word on the stage: icon + word, in a status colour.
const stage_status = (g, x = 960, y = 80) => label(g, "", x, y, { size: 50, weight: 600 });
function set_status(e, text, color, alpha) {
  e.textContent = text;
  e.style.fill = color;
  e.style.opacity = alpha;
}

const CLIPS = {
  plaque: {
    title: "Plaque to tartar in about two days",
    caption: "Plaque is soft and brushes off. Tartar is not.",
    scenes: [
      { title: "Plaque", build(g, b) {
        const mg = el("g", {}, g), br = el("g", {}, g), st = stage_status(g);
        const w1 = b.say("Plaque: a soft film of bacteria, saliva and food. It collects at the gumline.", 2.5);
        const w2 = b.say("A brush wipes it off. ✓ Brushing works on plaque.", 3);
        return t => {
          const u = prog(w2, t);
          mouth_closeup(clear(mg), { x: 280, y: 160, s: 1.7, ink: COLORS.fg, lip: 1, thumb: false,
                                     plaque: prog(w1, t) * (1 - u) });
          clear(br);
          if (u > 0 && u < 1) {
            brush_side(br, 280 + 1.7 * lerp(560, 230, u), 160 + 1.7 * 222, { angle: 60, s: 1.3 });
          }
          set_status(st, "✓ Plaque gone", COLORS.green, clamp01((t - w2[1]) / 0.4));
        };
      } },
      { title: "Tartar", build(g, b) {
        const mg = el("g", {}, g), br = el("g", {}, g), st = stage_status(g);
        const clock = label(g, "", 1640, 80, { size: 50, weight: 600, fill: COLORS.grey });
        const w1 = b.say("Left alone, plaque starts to harden into tartar within about 36-48 hours.", 4);
        const w2 = b.say("Tartar is hard. ✗ A brush can't remove it.", 3);
        const hours = track(0, [[w1, 48]]);
        return t => {
          const p = prog(w1, t);
          mouth_closeup(clear(mg), { x: 280, y: 160, s: 1.7, ink: COLORS.fg, lip: 1, thumb: false,
                                     plaque: clamp01(p * 2), tartar: clamp01(p * 2 - 1) });
          clock.textContent = `${Math.round(hours(t))} h`;
          const u = prog(w2, t);
          clear(br);
          if (u > 0 && u < 1) {
            brush_side(br, 280 + 1.7 * lerp(560, 230, u), 160 + 1.7 * 222, { angle: 60, s: 1.3 });
          }
          set_status(st, "✗ Still there", COLORS.red, clamp01((t - w2[0] - 1) / 0.4));
        };
      } },
      { title: "The fix", build(g, b) {
        const mg = el("g", {}, g), st = stage_status(g);
        const w1 = b.say("A vet removes tartar with a scale and polish, under anaesthetic.", 2.5);
        const w2 = b.say("After that, daily brushing keeps new plaque from hardening.", 1);
        return t => {
          mouth_closeup(clear(mg), { x: 280, y: 160, s: 1.7, ink: COLORS.fg, lip: 1, thumb: false,
                                     tartar: 1 - prog(w1, t) });
          set_status(st, "✓ Clean, for now", COLORS.green, prog(w2, t));
        };
      } },
    ],
  },

  ladder: {
    title: "The slow ladder",
    caption: "Tiny steps, each paid for. One step back after a bad day is part of the plan.",
    scenes: [{ title: "Climbing", build(g, b) {
      const names = ["Touch face", "Taste paste", "Lift lip", "One tooth", "A few teeth", "One side"];
      const step_x = k => 150 + k * 275, step_y = k => 820 - k * 100;
      names.forEach((n, k) => {
        paint_el(el("rect", { x: step_x(k), y: step_y(k), width: 275, height: 1080 - step_y(k),
                              "stroke-width": 4 }, g), COLORS.panel, COLORS.dim);
        label(g, n, step_x(k) + 137, step_y(k) + 46, { size: 36, weight: 600, fill: COLORS.grey });
      });
      const hl = el("rect", { width: 275, height: 92, rx: 6, fill: "none", stroke: COLORS.yellow,
                              "stroke-width": 6 }, g);
      const cat_g = el("g", {}, g), st = stage_status(g);
      const w0 = b.say("Each step is tiny, and each one is paid for with a treat.", 1.5);
      const w1 = b.say("Step 1: touch his face, where he already likes it.", 0.1);
      const w2 = b.say("Step 2: he licks cat toothpaste off your finger.", 1.2);
      const w3 = b.say("Step 3: lift his lip for a moment. His mouth stays closed.", 1.2);
      const w4 = b.say("Step 4: the brush touches one canine tooth.", 1.2);
      const w5 = b.say("His ears turn sideways: a quiet signal.", 1.2);
      const w6 = b.say("So you stop, give a treat, and next time go back one step.", 1.2);
      const w7 = b.say("Days or weeks later: one tooth, a few teeth, one whole side.", 3);
      b.say("Weeks to months is normal. Stuck for weeks? Get professional help.", 0);
      const pos = track(0, [[w2, 1], [w3, 2], [w4, 3], [w6, 2], [w7, 5]]);
      const ears = track(0, [[w5, 0.6], [w6, 0]]);
      const pupils = track(0.3, [[w5, 0.9], [w6, 0.3]]);
      void w0; void w1;
      return t => {
        const p = pos(t), k = Math.round(p);
        const hop = Math.sin(Math.PI * (p - Math.floor(p))) * 60;
        const x = lerp(step_x(Math.floor(p)), step_x(Math.ceil(p)), p - Math.floor(p)) + 137;
        const y = lerp(step_y(Math.floor(p)), step_y(Math.ceil(p)), p - Math.floor(p)) - hop;
        oreo(cat_g, { x: x + 25, y: y + 4, s: 0.55, ...INK, ears: ears(t), pupils: pupils(t),
                      lids: 0.2, tail: Math.sin(t * 2) * 0.3 });
        set(hl, { x: step_x(k), y: step_y(k) });
        set_status(st, "⚠ Quiet signal: stop", COLORS.amber, prog(w5, t) * (1 - prog(w6, t)));
      };
    } }],
  },

  brushing: {
    title: "Brushing Oreo, start to finish",
    caption: "The whole routine, once Oreo has climbed the ladder. Each step is in the list below.",
    scenes: [
      { title: "Set up", build(g, b) {
        const door = el("g", {}, g);
        paint_el(el("rect", { x: 140, y: 250, width: 260, height: 570, rx: 6, "stroke-width": 5 }, door),
                 COLORS.panel, COLORS.dim);
        paint_el(el("circle", { cx: 360, cy: 560, r: 12 }, door), COLORS.grey, "none");
        const tb = el("g", {}, g);
        table_towel(tb);
        const items = [el("g", {}, g), el("g", {}, g), el("g", {}, g)];
        tube(items[0], 690, 760, { ink: COLORS.fg, s: 1.1 });
        brush_side(items[1], 880, 775, { angle: 0, s: 0.7, ink: COLORS.fg });
        [1250, 1320, 1390].forEach(x => treat(items[2], x, 780, { ink: COLORS.fg, s: 1.2 }));
        const w1 = b.say("Set up first: a quiet, small room with the door closed.", 1);
        const w2 = b.say("A towel on a low table (or your lap), paste on the brush, treats in reach.", 2);
        return t => {
          appear(door, prog(w1, t), 0, 30);
          appear(tb, prog(head_of(w2, 0.6), t), 0, 30);
          items.forEach((e, i) => appear(e, prog(stagger([w2[0] + 0.4, w2[1]], i, 3), t), 0, -40));
        };
      } },
      { title: "Position", build(g, b) {
        table_towel(g);
        const owner = el("g", {}, g), cat_g = el("g", {}, g);
        owner_behind(owner, { ...SEAT, ink: COLORS.fg });
        oreo(cat_g, { ...SEAT, ...INK, lids: 0.2 });
        const w1 = b.say("Oreo sits with his back to you, facing away. It's less confrontational.", 1.5);
        b.say("If he wriggles, he tends to move backwards, into you. Better control.", 0);
        return t => {
          appear(cat_g, clamp01(t / 0.6), 0, 30);
          appear(owner, prog([0.5, w1[1]], t), 0, 200);
        };
      } },
      { title: "Head hold", build(g, b) {
        table_towel(g);
        const scene = el("g", {}, g), hands = el("g", {}, g), notes = el("g", {}, g);
        seated(scene, { lids: 0.2 }, { owner_head: false });
        const pts = [at_seat(264, 8), at_seat(230, 50), at_seat(296, 120)];
        const texts = [["Index finger up, off his eyes"], ["Palm on top, towards the back"],
                       ["Thumb and second finger", "on his cheekbones"]];
        const rows = [300, 420, 560];
        const ann = texts.map((lines, i) => {
          const ag = el("g", {}, notes);
          lines.forEach((s, j) => label(ag, s, 1250, rows[i] + j * 48, { size: 38, anchor: "start" }));
          const a = arrow(ag, 1235, rows[i], pts[i][0] + 18, pts[i][1], COLORS.grey, 4, 18);
          return { ag, a };
        });
        const w1 = b.say("Head hold: your palm rests on top of his head, towards the back.", 2);
        const w2 = b.say("Thumb and second finger on his cheekbones. Index finger up, off his eyes.", 2);
        b.say("Practise this hold at other times too, not only when the brush is out.", 0);
        const grip = track(0, [[w1, 1]]);
        return t => {
          head_hold(clear(hands), { ...SEAT, ink: COLORS.fg, grip: grip(t) });
          hands.style.opacity = prog(head_of(w1, 0.5), t);
          ann.forEach((n, i) => {
            const win = i === 1 ? w1 : stagger(w2, i === 0 ? 1 : 0, 2);
            n.ag.style.opacity = prog(head_of(win, 0.6), t);
            draw_arrow(n.a, prog(win, t));
          });
        };
      } },
      { title: "Lift the lip", build(g, b) {
        const mg = el("g", {}, g);
        const hl = el("path", { d: GUMLINE_D, fill: "none", stroke: COLORS.yellow, "stroke-width": 9,
                                "stroke-linecap": "round", pathLength: 1,
                                transform: "translate(280 120) scale(1.7)" }, g);
        const tag = label(g, "Gumline", 1420, 70, { size: 46, weight: 600 });
        const w1 = b.say("Close-up. His mouth stays closed: never force it open. Your thumb lifts the lip.", 2.5);
        const w2 = b.say("Now you see the gumline, where gum meets tooth. Plaque collects there.", 1.5);
        return t => {
          mouth_closeup(clear(mg), { x: 280, y: 120, s: 1.7, ink: COLORS.fg, lip: prog(w1, t) });
          draw(hl, prog(w2, t));
          hl.style.opacity = 0.75 * prog(w2, t);
          tag.style.opacity = prog(w2, t);
          void w1;
        };
      } },
      { title: "Angle", build(g, b) {
        const S = 1.25, OX = 560, OY = 110;
        tooth_section(g, { x: OX, y: OY, s: S });
        const [cx, cy] = [OX + S * CREVICE[0], OY + S * CREVICE[1]];
        label(g, "Tooth", OX + S * 318, OY + S * 420, { size: 40, weight: 600, fill: COLORS.bg });
        label(g, "Gum", OX + S * 140, OY + S * 150, { size: 40, weight: 600, fill: COLORS.bg });
        const axis = el("path", { d: `M${cx} ${cy} L ${cx} ${cy + 260}`,
                                  stroke: COLORS.dim, "stroke-width": 4, "stroke-dasharray": "14 12" }, g);
        const br = el("g", {}, g);
        const dot = el("circle", { cx, cy, r: 18, fill: COLORS.yellow }, g);
        const arc = el("path", { d: `M${cx} ${cy + 150} A 150 150 0 0 1 ${cx - 106} ${cy + 106}`,
                                 fill: "none", stroke: COLORS.fg, "stroke-width": 4, pathLength: 1 }, g);
        const deg = label(g, "45°", cx - 110, cy + 190, { size: 46, weight: 600 });
        const w1 = b.say("Seen in cross-section: hold the bristles at 45 degrees to the tooth.", 2.5);
        const w2 = b.say("Aim them into the narrow gap between tooth and gum.", 1.2);
        return t => {
          const p = prog(w1, t);
          clear(br);
          const d = lerp(500, 0, p);
          brush_side(br, cx - d * 0.707, cy + d * 0.707, { angle: 135, s: 1.3, ink: COLORS.fg });
          draw(arc, prog([w1[1] - 0.8, w1[1]], t));
          deg.style.opacity = prog([w1[1] - 0.4, w1[1]], t);
          dot.style.opacity = 0.8 * prog(head_of(w2, 0.6), t);
          axis.style.opacity = 0.4 + 0.6 * p;
        };
      } },
      { title: "Brush", build(g, b) {
        const mg = el("g", {}, g);
        mouth_closeup(mg, { x: 280, y: 120, s: 1.7, ink: COLORS.fg, lip: 1 });
        const glow = el("circle", { r: 34, fill: COLORS.yellow, opacity: 0.45 }, g);
        const br = el("g", {}, g);
        const timer = label(g, "", 1640, 70, { size: 46, weight: 600, fill: COLORS.grey });
        const w1 = b.say("Small, gentle circles along the gumline: big cheek teeth and canine.", 4);
        b.say("At first, 10 seconds per side. Over the weeks, build up to about 30.", 0);
        b.say("Then the other side, the same way.", 0);
        return t => {
          const u = prog([w1[0], w1[1] + 2], t);
          const fx = lerp(560, 190, u) + 9 * Math.cos(t * 14), fy = 214 + 9 * Math.sin(t * 14);
          const [x, y] = [280 + 1.7 * fx, 120 + 1.7 * fy];
          set(glow, { cx: x, cy: y });
          brush_side(clear(br), x, y, { angle: 60, s: 1.3, ink: COLORS.fg });
          timer.textContent = `${Math.min(10, Math.floor(u * 10))} s`;
        };
      } },
      { title: "Read Oreo", build(g, b) {
        table_towel(g);
        const scene = el("g", {}, g), hands = el("g", {}, g), st = stage_status(g);
        const w1 = b.say("Watch him. Ears turning sideways, pupils getting big: a quiet signal.", 2.5);
        const w2 = b.say("⚠ Stop now. Brush away, hands off. Skip “just one more tooth”.", 1.5);
        const ears = track(0, [[w1, 0.6]]), pupils = track(0.3, [[w1, 0.9]]);
        return t => {
          seated(scene, { ears: ears(t), pupils: pupils(t), look: 0.6 * prog(w1, t) },
                 { owner_head: false });
          clear(hands);
          const off = prog(w2, t);
          const hg = frame(hands, SEAT.x + 500 * off, SEAT.y, SEAT.s, 230, 310);
          hand_brush(hg, { x: 430, y: 150, ink: COLORS.fg });
          head_hold(hands, { ...SEAT, ink: COLORS.fg });
          hands.style.opacity = 1 - off;
          set_status(st, "⚠ Quiet signal: stop", COLORS.amber, prog([w1[1] - 0.5, w1[1]], t));
        };
      } },
      { title: "Pay up", build(g, b) {
        table_towel(g);
        const scene = el("g", {}, g), tr = el("g", {}, g), st = stage_status(g);
        const [tx, ty] = at_seat(345, 300);
        treat(tr, tx, ty, { ink: COLORS.fg, s: 2 });
        const w1 = b.say("Pay up: a treat and praise, every time, even after a short session.", 2);
        const w2 = b.say("✓ End on a good note. Same time tomorrow.", 1);
        const ears = track(0.6, [[w1, 0]]), lids = track(0, [[w1, 0.5]]);
        return t => {
          seated(scene, { ears: ears(t), lids: lids(t), pupils: 0.4,
                          mouth: prog(w1, t) > 0.6 ? "smile" : "flat" }, { owner_head: false });
          appear(tr, prog(head_of(w1, 0.6), t), 0, -60);
          set_status(st, "✓ Session over, on a good note", COLORS.green, prog(w2, t));
        };
      } },
    ],
  },
};
