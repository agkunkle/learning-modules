// Module content: Say the shot. META, GLOSSARY, CHECKS, DIAGRAMS, PICS, CLIPS, and the tiny 3D
// renderer they share. Claims trace to ../research/brief.md ([S#], [D], [M]), the taste sources
// T1-T6 in ../plan.md, and the field notes [F] in ../research/field_notes.md.
//
// The cast and set are the Applying Gravity music video's (Ada in green, Rosie in pink, a
// classroom with a chalkboard, a globe and a bowling-ball pendulum), redrawn here from scratch.
// Every picture and clip is a real perspective render: a pinhole camera with a position, a
// look-at target, a vertical field of view (like three.js) and a roll. So the clips are
// code-rendered 3D, driven by the same three numbers the module teaches.

const { ROUND, paint_el, txt, frame, bubble, thought } = PIC_KIT;  // tools/module_kit/pics_lib.js

// ---- Vectors ----
const D2R = Math.PI / 180;
const v_add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const v_sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const v_mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const v_dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const v_cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2],
                           a[0] * b[1] - a[1] * b[0]];
const v_len = a => Math.sqrt(v_dot(a, a));
const v_norm = a => v_mul(a, 1 / (v_len(a) || 1));
const v_lerp = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const NEAR = 0.05;

// ---- Camera ----
// cam = {pos, target, fov, roll?, up?}: fov is the vertical angle in degrees (three.js style).
function cam_basis(cam) {
  const f = v_norm(v_sub(cam.target, cam.pos));
  let r = v_cross(f, cam.up || [0, 1, 0]);
  if (v_len(r) < 1e-6) r = v_cross(f, [0, 0, -1]);  // looking straight down or up
  r = v_norm(r);
  let u = v_cross(r, f);
  const a = (cam.roll || 0) * D2R;
  if (a) {
    const c = Math.cos(a), s = Math.sin(a);
    [r, u] = [v_add(v_mul(r, c), v_mul(u, s)), v_sub(v_mul(u, c), v_mul(r, s))];
  }
  return { f, r, u };
}
const hfov = (fov, aspect) => 2 * Math.atan(Math.tan(fov * D2R / 2) * aspect) / D2R;
// Distance at which a frame of height h (metres) fits the vertical fov.
const dist_for = (h, fov) => (h / 2) / Math.tan(fov * D2R / 2);

// ---- Renderer ----
// Items (world metres, y up): ball {c, r}, stick {a, b, r} (a capsule), face {pts, n?} (a
// polygon; n = outward normal for back-face culling), line {a, b, w}, text {c, size, s, n?}.
// Each has fill (or color) and an optional layer: 0 room shell, 1 things on the wall, 2 objects.
// Within a layer, far things are drawn first (painter's algorithm).
const SET_C = { wall: "#2b3140", floor: "#6a4f3a", plank: "#5a4230", board: "#28463b",
                wood: "#8a6a48", chalk: "#e8eaee", globe: "#3f8f84", land: "#86b35e",
                stand: "#59606d", ball: "#5b3a6e", rope: "#c9b79c", top: "#9a7552",
                side: "#6b4f36", pumpkin: "#e07b28", stem: "#5a6b2a", sky: "#1b1f27",
                outline: "#101318", shoe: "#1f232b" };
let vp_uid = 0;

// min_text: skip scene text smaller than this (pictures shown small set it).
function render3d(g, items, cam, vp, { sky = SET_C.sky, outline = SET_C.outline,
                                       min_text = 0 } = {}) {
  const { f, r, u } = cam_basis(cam);
  const F = (vp.h / 2) / Math.tan(cam.fov * D2R / 2);
  const cx = vp.x + vp.w / 2, cy = vp.y + vp.h / 2;
  const ow = Math.max(1.2, vp.h / 300);
  const to_cam = p => { const d = v_sub(p, cam.pos); return [v_dot(d, r), v_dot(d, u), v_dot(d, f)]; };
  const scr = c => [cx + c[0] * F / c[2], cy - c[1] * F / c[2]];
  const dist = p => v_len(v_sub(p, cam.pos));
  const clip_seg = (a, b) => {
    if (a[2] < NEAR && b[2] < NEAR) return null;
    const cut = (p, q) => v_lerp(p, q, (NEAR - p[2]) / (q[2] - p[2]));
    if (a[2] < NEAR) a = cut(a, b);
    if (b[2] < NEAR) b = cut(b, a);
    return [a, b];
  };
  const clip_poly = pts => {
    const out = [];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const pin = p[2] >= NEAR, qin = q[2] >= NEAR;
      if (pin) out.push(p);
      if (pin !== qin) out.push(v_lerp(p, q, (NEAR - p[2]) / (q[2] - p[2])));
    });
    return out;
  };
  const facing = (it, c) => !it.n || v_dot(it.n, v_sub(cam.pos, c)) > 0;
  const draws = [];
  const add = (layer, depth, fn) => draws.push({ layer, depth: depth + (cur.bias || 0), fn });
  let cur = null;  // the item being added: its bias (metres) pushes it back in the draw order

  for (const it of items) {
    const layer = it.layer ?? 2;
    cur = it;
    if (it.t === "ball") {
      const c = to_cam(it.c);
      if (c[2] < NEAR + it.r * 0.5) continue;
      const [x, y] = scr(c), rad = it.r * F / c[2];
      add(layer, dist(it.c), root => paint_el(el("circle", { cx: x, cy: y, r: rad,
        "stroke-width": it.thin ? ow * 0.6 : ow }, root), it.fill, it.stroke || outline));
    } else if (it.t === "stick" || it.t === "line") {
      const s = clip_seg(to_cam(it.a), to_cam(it.b));
      if (!s) continue;
      const zm = (s[0][2] + s[1][2]) / 2;
      const [x1, y1] = scr(s[0]), [x2, y2] = scr(s[1]);
      const mid = v_lerp(it.a, it.b, 0.5);
      if (it.t === "line") {
        const w = Math.max(1, it.w * F / zm);
        add(layer, dist(mid), root => el("line", { x1, y1, x2, y2, stroke: it.color,
          "stroke-width": w, "stroke-linecap": "round", opacity: it.alpha ?? 1 }, root));
      } else {
        const w = 2 * it.r * F / zm;
        add(layer, dist(mid), root => {
          el("line", { x1, y1, x2, y2, stroke: outline, "stroke-width": w + 2 * ow,
                       "stroke-linecap": "round" }, root);
          el("line", { x1, y1, x2, y2, stroke: it.fill, "stroke-width": w,
                       "stroke-linecap": "round" }, root);
        });
      }
    } else if (it.t === "face") {
      const centre = v_mul(it.pts.reduce(v_add, [0, 0, 0]), 1 / it.pts.length);
      if (!facing(it, centre)) continue;
      const pts = clip_poly(it.pts.map(to_cam));
      if (pts.length < 3) continue;
      const d = pts.map(scr).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
      add(layer, dist(centre), root => paint_el(el("polygon", { points: d,
        "stroke-width": ow * 0.7, "stroke-linejoin": "round" }, root), it.fill,
        it.stroke || outline));
    } else if (it.t === "text") {
      if (!facing(it, it.c)) continue;
      const c = to_cam(it.c);
      if (c[2] < NEAR) continue;
      const [x, y] = scr(c), size = it.size * F / c[2];
      if (size < min_text) continue;
      add(layer, dist(it.c), root => {
        const e = label(root, it.s, x, y, { size, fill: it.fill, weight: 600 });
        e.style.fontFamily = "var(--ui, sans-serif)";
      });
    }
  }
  draws.sort((a, b) => (a.layer - b.layer) || (b.depth - a.depth));
  const id = `vp${++vp_uid}`;
  el("rect", { x: vp.x, y: vp.y, width: vp.w, height: vp.h },
     el("clipPath", { id }, g));
  const root = el("g", { "clip-path": `url(#${id})` }, g);
  el("rect", { x: vp.x, y: vp.y, width: vp.w, height: vp.h, fill: sky }, root);
  for (const d of draws) d.fn(root);
  return root;
}

// ---- Primitives ----
const ball = (c, r, fill, o = {}) => ({ t: "ball", c, r, fill, ...o });
const stick = (a, b, r, fill, o = {}) => ({ t: "stick", a, b, r, fill, ...o });
const face = (pts, fill, n, o = {}) => ({ t: "face", pts, fill, n, ...o });
// An axis-aligned box: centre c, size s; top / side / front colours.
function box3(c, s, top, side, front = side) {
  const [x, y, z] = c, [hx, hy, hz] = s.map(v => v / 2);
  const P = (i, j, k) => [x + i * hx, y + j * hy, z + k * hz];
  return [
    face([P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)], top, [0, 1, 0]),
    face([P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], front, [0, 0, 1]),
    face([P(-1, -1, -1), P(1, -1, -1), P(1, 1, -1), P(-1, 1, -1)], side, [0, 0, -1]),
    face([P(1, -1, -1), P(1, -1, 1), P(1, 1, 1), P(1, 1, -1)], side, [1, 0, 0]),
    face([P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)], side, [-1, 0, 0]),
  ];
}

// ---- The cast ----
// Toy style: capsule limbs, sphere heads. Stands at (x, z), facing `yaw` degrees (0 = facing +z,
// towards the default camera). Dials: arms 0 down .. 1 up; hold 0..1 = both hands forward
// (Rosie's pumpkin); bob = small vertical hop in metres.
const CAST = {
  ada: { name: "Ada", body: "#3f9b5a", legs: "#2d3340", skin: "#f1c9a5", hair: "#3b2a22",
         goggles: "#cfe3e6", x: -0.55, z: 0, yaw: 20 },
  rosie: { name: "Rosie", body: "#e0629a", legs: "#6b3a78", skin: "#f0c09a", hair: "#d9603a",
           goggles: "#f29cc8", x: 0.55, z: 0.1, yaw: -20 },
};
const EYE_Y = 1.43;  // eye height of both girls, metres

function person(who, o = {}) {
  const C = CAST[who];
  const p = { x: C.x, z: C.z, yaw: C.yaw, arms: 0, hold: 0, bob: 0, pumpkin: false, ...o };
  const cy = Math.cos(p.yaw * D2R), sy = Math.sin(p.yaw * D2R);
  const L = (lx, ly, lz) => [p.x + lx * cy + lz * sy, ly + p.bob, p.z - lx * sy + lz * cy];
  const items = [];
  for (const s of [-1, 1]) {
    items.push(stick(L(s * 0.09, 0.1, 0.02), L(s * 0.09, 0.74, 0), 0.065, C.legs));
    items.push(ball(L(s * 0.09, 0.06, 0.07), 0.07, SET_C.shoe));
    const sh = L(s * 0.2, 1.12, 0.04);
    const down = [s * 0.27, 0.7, 0.1], up = [s * 0.32, 1.78, 0.06], fwd = [s * 0.13, 0.98, 0.32];
    let hand = down.map((v, i) => lerp(v, up[i], p.arms));
    hand = hand.map((v, i) => lerp(v, fwd[i], p.hold));
    const elbow = [lerp(s * 0.3, s * 0.36, p.arms), lerp(0.9, 1.4, p.arms), lerp(0.06, 0.18, p.hold)];
    items.push(stick(sh, L(...elbow), 0.052, C.body));
    items.push(stick(L(...elbow), L(...hand), 0.05, C.body));
    items.push(ball(L(...hand), 0.055, C.skin));
    items.push(ball(L(s * 0.075, EYE_Y, 0.195), 0.026, SET_C.outline, { thin: true }));
    items.push(ball(L(s * 0.075, 1.555, 0.165), 0.046, C.goggles));
  }
  items.push(stick(L(0, 0.84, 0), L(0, 1.08, 0), 0.17, C.body));
  items.push(stick(L(0, 1.12, -0.02), L(0, 1.24, -0.02), 0.06, C.skin, { bias: 0.2 }));
  items.push(ball(L(0, 1.42, 0), 0.21, C.skin));
  items.push(ball(L(0, 1.5, -0.06), 0.22, C.hair));
  items.push(ball(L(0, 1.585, 0.09), 0.12, C.hair, { stroke: C.hair }));  // fringe
  const smile = [L(-0.055, 1.36, 0.185), L(0, 1.325, 0.205), L(0.055, 1.36, 0.185)];
  items.push(stick(smile[0], smile[1], 0.008, SET_C.outline), stick(smile[1], smile[2], 0.008,
                                                                         SET_C.outline));
  if (who === "ada") items.push(ball(L(0, 1.47, -0.25), 0.085, C.hair));  // ponytail
  else for (const s of [-1, 1]) items.push(ball(L(s * 0.22, 1.4, -0.06), 0.09, C.hair));
  if (p.pumpkin) items.push(...pumpkin(L(0, 1.0, 0.36)));
  return items;
}
const pumpkin = c => [ball(c, 0.14, SET_C.pumpkin),
                      stick(v_add(c, [0, 0.12, 0]), v_add(c, [0.01, 0.19, 0]), 0.018, SET_C.stem)];
// Where to aim at a girl: a point on her centre line at height y.
const at = (who, y, o = {}) => [o.x ?? CAST[who].x, y, o.z ?? CAST[who].z];

// ---- The set: a classroom after the bell ----
const WALL_Z = -3;
const GLOBE = [-2.4, 1.25, -1.8], PENDULUM = [2.3, 1.05, -1.6];
const BENCH = { c: [2.5, 0.45, 1.6], s: [1.4, 0.9, 0.6] };
const STOOL = { c: [-2.3, 0.3, 2.1], s: [0.5, 0.6, 0.5] };

function classroom({ ada = {}, rosie = {}, extra = [], board = true,
                    cast = ["ada", "rosie"] } = {}) {
  const S = SET_C, it = [];
  it.push(face([[-9, 0, WALL_Z], [9, 0, WALL_Z], [9, 3.4, WALL_Z], [-9, 3.4, WALL_Z]], S.wall,
               null, { layer: 0 }));
  it.push(face([[-9, 0, WALL_Z], [-9, 0, 9], [9, 0, 9], [9, 0, WALL_Z]], S.floor, null,
               { layer: 0 }));
  for (let x = -8.4; x <= 8.4; x += 0.6) {
    it.push({ t: "line", a: [x, 0, WALL_Z], b: [x, 0, 9], w: 0.02, color: S.plank, layer: 0.5 });
  }
  if (board) {
    it.push(face([[-1.7, 0.9, -2.99], [1.7, 0.9, -2.99], [1.7, 2.5, -2.99], [-1.7, 2.5, -2.99]],
                 S.wood, [0, 0, 1], { layer: 1 }));
    it.push(face([[-1.6, 1.0, -2.98], [1.6, 1.0, -2.98], [1.6, 2.4, -2.98], [-1.6, 2.4, -2.98]],
                 S.board, [0, 0, 1], { layer: 1.2, stroke: S.board }));
    it.push({ t: "text", c: [0.35, 2.12, -2.97], size: 0.32, s: "g = 9.8 m/s²", fill: S.chalk,
              n: [0, 0, 1], layer: 1.5 });
    // A chalk drop: the gaps grow as the ball speeds up.
    for (let k = 0; k < 5; k++) {
      it.push(ball([-1.1, 2.2 - 0.05 * k * k, -2.97], 0.05, S.board,
                   { stroke: S.chalk, thin: true, layer: 1.5 }));
    }
  }
  it.push(stick([GLOBE[0], 0, GLOBE[2]], [GLOBE[0], 1.0, GLOBE[2]], 0.03, S.stand));
  it.push(ball(GLOBE, 0.26, S.globe));
  it.push(ball(v_add(GLOBE, [0.08, 0.06, 0.15]), 0.11, S.land, { stroke: S.land }));
  it.push(stick([PENDULUM[0], 3.4, PENDULUM[2]], v_add(PENDULUM, [0, 0.15, 0]), 0.012, S.rope));
  it.push(ball(PENDULUM, 0.17, S.ball));
  it.push(...box3(BENCH.c, BENCH.s, S.top, S.side));
  it.push(...box3(STOOL.c, STOOL.s, S.top, S.side));
  if (cast.includes("ada")) it.push(...person("ada", ada));
  if (cast.includes("rosie")) it.push(...person("rosie", rosie));
  it.push(...extra);
  return it;
}

// A camera that frames a frame-height h (metres) around point aim, seen from compass direction
// `from` (degrees; 0 = from +z, the front), at camera height y (default: aim height).
function framing(aim, h, { from = 0, fov = 30, y = null, roll = 0 } = {}) {
  const d = dist_for(h, fov);
  const pos = [aim[0] + d * Math.sin(from * D2R), y ?? aim[1], aim[2] + d * Math.cos(from * D2R)];
  return { pos, target: aim, fov, roll };
}

// ---- Maps: where the camera is ----
// A top view (x right, z down the page) or a side view (z right, y up) of the set, with the
// camera, its view cone and its target. `pal` = {ink, panel, dim, cam}: COLORS in clips, paint
// values in pictures (where the camera is ink, never blue).
const clear = g => { while (g.firstChild) g.removeChild(g.firstChild); return g; };
const MAP_TOP = { a: [-4.6, 4.6], b: [-3.4, 7.4] }, MAP_SIDE = { a: [-3.4, 7.4], b: [-0.4, 5.6] };

function draw_map(g, vp, cams, { mode = "top", ada = {}, rosie = {}, pal, names = true,
                                 aspect = 16 / 9, bounds = null, cam_labels = [],
                                 cone = 3000 } = {}) {
  const B = bounds || (mode === "top" ? MAP_TOP : MAP_SIDE);
  const k = Math.min(vp.w / (B.a[1] - B.a[0]), vp.h / (B.b[1] - B.b[0]));
  const ox = vp.x + (vp.w - k * (B.a[1] - B.a[0])) / 2, oy = vp.y + (vp.h - k * (B.b[1] - B.b[0])) / 2;
  // World point -> map point. Top: (x, z). Side: (z, y), y up.
  const M = mode === "top" ? p => [ox + (p[0] - B.a[0]) * k, oy + (p[2] - B.b[0]) * k]
                           : p => [ox + (p[2] - B.a[0]) * k, oy + (B.b[1] - p[1]) * k];
  const id = `map${++vp_uid}`;
  el("rect", { x: vp.x, y: vp.y, width: vp.w, height: vp.h, rx: 10 }, el("clipPath", { id }, g));
  const root = el("g", { "clip-path": `url(#${id})`, ...ROUND }, g);
  paint_el(el("rect", { x: vp.x, y: vp.y, width: vp.w, height: vp.h }, root), pal.panel, "none");
  const line = (a, b, stroke, w, extra = {}) => {
    const [x1, y1] = M(a), [x2, y2] = M(b);
    return paint_el(el("line", { x1, y1, x2, y2, "stroke-width": w, ...extra }, root), "none", stroke);
  };
  const poly = (pts, fill, stroke, w = 2, extra = {}) => paint_el(el("polygon", {
    points: pts.map(M).map(([x, y]) => `${x},${y}`).join(" "), "stroke-width": w, ...extra }, root),
    fill, stroke);
  const dot = (p, r, fill, stroke) => {
    const [x, y] = M(p);
    return paint_el(el("circle", { cx: x, cy: y, r: r * k, "stroke-width": 2 }, root), fill, stroke);
  };
  if (mode === "top") {
    for (let x = -4; x <= 4; x++) line([x, 0, B.b[0]], [x, 0, B.b[1]], pal.dim, 1, { opacity: 0.35 });
    for (let z = -3; z <= 7; z++) line([B.a[0], 0, z], [B.a[1], 0, z], pal.dim, 1, { opacity: 0.35 });
    line([-9, 0, WALL_Z], [9, 0, WALL_Z], pal.ink, 6);
    line([-1.6, 0, WALL_Z + 0.12], [1.6, 0, WALL_Z + 0.12], SET_C.board, 12);
    for (const b of [BENCH, STOOL]) {
      const [x, , z] = b.c, [w, , d] = b.s;
      poly([[x - w / 2, 0, z - d / 2], [x + w / 2, 0, z - d / 2], [x + w / 2, 0, z + d / 2],
            [x - w / 2, 0, z + d / 2]], SET_C.top, pal.ink);
    }
    dot(GLOBE, 0.26, SET_C.globe, pal.ink);
    dot(PENDULUM, 0.17, SET_C.ball, pal.ink);
    for (const [who, o] of [["ada", ada], ["rosie", rosie]]) {
      if (o === null) continue;
      const C = CAST[who], x = o.x ?? C.x, z = o.z ?? C.z, yaw = (o.yaw ?? C.yaw) * D2R;
      line([x, 0, z], [x + 0.5 * Math.sin(yaw), 0, z + 0.5 * Math.cos(yaw)], pal.ink, 4);
      dot([x, 0, z], 0.24, C.body, pal.ink);
      if (names) {
        const [mx, my] = M([x, 0, z]);
        txt(root, C.name, mx, my - 0.5 * k, { size: 24, fill: pal.ink });
      }
    }
  } else {
    line([0, 0, B.a[0]], [0, 0, B.a[1]], pal.ink, 4);  // the floor
    line([0, 0, WALL_Z], [0, 3.4, WALL_Z], pal.ink, 6);
    line([0, 1.0, WALL_Z + 0.08], [0, 2.4, WALL_Z + 0.08], SET_C.board, 10);
    for (const who of ["ada", "rosie"]) {
      const C = CAST[who], z = C.z;
      poly([[0, 0, z - 0.17], [0, 0, z + 0.17], [0, 1.2, z + 0.17], [0, 1.2, z - 0.17]], C.body, pal.ink);
      dot([0, 1.42, z], 0.21, C.skin, pal.ink);
    }
  }
  // Cameras: a view cone, a body and a dashed line to the target, worked out on the map
  // itself (the map is a uniform scale of the world, so angles carry over).
  cams.forEach((cam, i) => {
    const [cx, cy] = M(cam.pos), [tx, ty] = M(cam.target);
    const ang = Math.atan2(ty - cy, tx - cx);
    if (Math.hypot(tx - cx, ty - cy) > 2) {
      const half = (mode === "top" ? hfov(cam.fov, aspect) : cam.fov) * D2R / 2, R = cone;
      const edge = s => [cx + R * Math.cos(ang + s * half), cy + R * Math.sin(ang + s * half)];
      const [l, r] = [edge(-1), edge(1)];
      el("polygon", { points: `${cx},${cy} ${l} ${r}`, fill: pal.cam, "fill-opacity": 0.13 }, root)
        .style.fill = pal.cam;
      for (const [x2, y2] of [l, r]) {
        paint_el(el("line", { x1: cx, y1: cy, x2, y2, "stroke-width": 2, opacity: 0.7 }, root),
                 "none", pal.cam);
      }
      paint_el(el("line", { x1: cx, y1: cy, x2: tx, y2: ty, "stroke-width": 2,
                            "stroke-dasharray": "6 8", opacity: 0.8 }, root), "none", pal.ink);
      paint_el(el("path", { d: `M${tx - 9} ${ty} h18 M${tx} ${ty - 9} v18`, "stroke-width": 4 },
                  root), "none", pal.ink);
    }
    const body = el("g", { transform: `translate(${cx} ${cy}) rotate(${ang / D2R})` }, root);
    paint_el(el("rect", { x: -26, y: -16, width: 34, height: 32, rx: 5, "stroke-width": 2 }, body),
             pal.cam, pal.ink);
    paint_el(el("path", { d: "M8 -9 L 24 -16 L 24 16 L 8 9 Z", "stroke-width": 2 }, body),
             pal.cam, pal.ink);
    // The label sits beside the camera, clear of its cone and of the map edge.
    if (cam_labels[i]) txt(root, cam_labels[i], cx - 50 * Math.sin(ang),
                           cy + 50 * Math.cos(ang) + 10, { size: 28, fill: pal.ink });
  });
  paint_el(el("rect", { x: vp.x, y: vp.y, width: vp.w, height: vp.h, rx: 10, "stroke-width": 2 }, g),
           "none", pal.dim);
  return M;
}

// ---- Clip stage: top view on the left, camera view on the right, three.js lines below ----
const MAP_VP = { x: 60, y: 120, w: 600, h: 652 };
const VIEW_VP = { x: 700, y: 120, w: 1160, h: 652.5 };
const CLIP_PAL = { ink: COLORS.fg, panel: COLORS.panel, dim: COLORS.dim, cam: COLORS.blue };
const num = v => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1).padStart(4);
const vec = p => p.map(num).join(", ");

// Three lines of three.js, each with a highlighter bar that lights while that value changes.
function readout(g, x = 60, y = 822) {
  const rows = [0, 1, 2].map(i => {
    const bar = el("rect", { x: x - 12, y: y + i * 42 - 20, width: 760, height: 40, rx: 6,
                             fill: COLORS.yellow, "fill-opacity": 0.18 }, g);
    const t = label(g, "", x, y + i * 42, { size: 30, anchor: "start", font: MONO });
    t.style.whiteSpace = "pre";
    return { bar, t };
  });
  return (cam, hot = [0, 0, 0]) => {
    rows[0].t.textContent = `camera.position.set(${vec(cam.pos)})`;
    rows[1].t.textContent = `camera.lookAt(${vec(cam.target)})`;
    rows[2].t.textContent = `camera.fov = ${cam.fov.toFixed(0)}`;
    rows.forEach((r, i) => { r.bar.style.opacity = hot[i]; });
  };
}

function stage(g, { mode = "top", term = "" } = {}) {
  label(g, mode === "top" ? "Top view" : "Side view", MAP_VP.x + MAP_VP.w / 2, 90,
        { size: 32, fill: COLORS.grey });
  label(g, "Camera view", VIEW_VP.x + VIEW_VP.w / 2, 90, { size: 32, fill: COLORS.grey });
  const map_g = el("g", {}, g), view_g = el("g", {}, g);
  const ro = readout(g);
  label(g, term, 1860, 864, { size: 60, weight: 600, anchor: "end" });
  return (cam, { hot, ada = {}, rosie = {}, extra = [] } = {}) => {
    draw_map(clear(map_g), MAP_VP, [cam], { mode, ada, rosie, pal: CLIP_PAL });
    render3d(clear(view_g), classroom({ ada, rosie, extra }), cam, VIEW_VP);
    paint_el(el("rect", { ...rect_of(VIEW_VP), "stroke-width": 2 }, view_g), "none", COLORS.dim);
    ro(cam, hot);
  };
}
const rect_of = vp => ({ x: vp.x, y: vp.y, width: vp.w, height: vp.h });

// A status word on the stage: icon + word, in a status colour.
const stage_status = (g, x, y) => label(g, "", x, y, { size: 46, weight: 600 });
function set_status(e, text, color, alpha) {
  e.textContent = text;
  e.style.fill = color;
  e.style.opacity = alpha;
}

// ---- Shots used by pictures and clips ----
const BASE = { pos: [0, 1.45, 6], target: [0, 1.15, 0], fov: 34 };
const ROSIE_AIM = [0.55, 1.2, 0.1];
const PUMPKIN_AT = [0.55 + 0.36 * Math.sin(-20 * D2R), 1.0, 0.1 + 0.36 * Math.cos(-20 * D2R)];
const SHOTS = {
  wide: { pos: [0, 1.6, 6.6], target: [0, 1.05, 0], fov: 38 },
  ms2: framing([0, 1.15, 0.05], 1.3, { fov: 30 }),
  mcu_ada: framing(at("ada", 1.3), 0.75, { from: 25 }),
  cu_rosie: framing(at("rosie", 1.42), 0.48, { from: -25 }),
  insert: framing([PUMPKIN_AT[0], 1.02, PUMPKIN_AT[2]], 0.45, { from: -20, y: 1.25 }),
  low: framing([0, 1.3, 0.05], 1.9, { fov: 40, y: 0.35 }),
};
const SHOT_KIND = { wide: "wide", ms2: "medium", mcu_ada: "medium", low: "medium",
                    cu_rosie: "close", insert: "insert" };
const SHOT_NAME = { wide: "Wide", ms2: "MS two-shot", mcu_ada: "MCU Ada", low: "Low angle",
                    cu_rosie: "CU Rosie", insert: "Insert" };
const KIND_COLOR = { wide: COLORS.blue, medium: COLORS.orange, close: COLORS.aqua,
                     insert: COLORS.purple };

// ---- Pictures ----
// A rendered frame with a thin ink border and a label under it.
function thumb(g, paint, cam, x, y, w, h, { scene = {}, lines = [], size = 26 } = {}) {
  render3d(g, classroom(scene), cam, { x, y, w, h }, { min_text: 26 });
  paint_el(el("rect", { x, y, width: w, height: h, "stroke-width": 2 }, g), "none", paint.ink);
  lines.forEach((s, i) => {
    const [text, fill] = Array.isArray(s) ? s : [s, paint.ink];
    txt(g, text, x + w / 2, y + h + 30 + i * (size + 8), { size, fill });
  });
}
const FACE_FRONT = { ada: { yaw: 0 }, rosie: { yaw: 0, x: 1.0 } };

const PICS = {
  brief: {
    alt: "Two notes. Left: 'Make it more dramatic!', marked vague. Right: a low-angle " +
         "medium close-up of Rosie with the note 'MCU on Rosie, low angle, slow push-in, 3 s', " +
         "marked clear.",
    caption: "The same wish, written two ways.",
    width: 1160, height: 470,
    draw(g, paint) {
      bubble(g, 40, 70, 470, 150, ["Make it more", "dramatic!"],
             { tx: 140, ty: 300, ink: paint.ink, paper: paint.paper, size: 44, speech: true });
      txt(g, "✗ Vague: the AI has to guess", 275, 360, { size: 30, fill: paint.crit });
      txt(g, "Bigger? Closer? Faster? Darker?", 275, 405, { size: 26, fill: paint.muted, weight: 500 });
      const cam = framing(at("rosie", 1.25), 0.8, { from: -15, y: 0.55 });
      thumb(g, paint, cam, 600, 30, 520, 292.5, {
        scene: { rosie: { pumpkin: true, hold: 1 } },
        lines: ["MCU on Rosie, low angle, slow push-in, 3 s",
                ["✓ Clear: one way to read it", paint.good]] });
    },
  },

  shot_sizes: {
    alt: "Seven frames of Ada, from an extreme close-up of her eyes to a wide shot of the " +
         "classroom: close-up, medium close-up, medium shot, cowboy shot and full shot between.",
    caption: "Shot sizes: where the frame cuts the body.",
    width: 1400, height: 560,
    draw(g, paint) {
      // Aim at the front of the body (the face is 0.2 m in front of the head's centre), so a
      // frame height is measured where the viewer looks.
      const A = y => at("ada", y, { z: 0.2 });
      const fr = (y, h) => framing(A(y), h, { fov: 30 });
      const cells = [
        [fr(1.44, 0.17), "Extreme close-up (ECU)"], [fr(1.43, 0.52), "Close-up (CU)"],
        [fr(1.33, 0.8), "Medium close-up (MCU)"], [fr(1.18, 1.1), "Medium shot (MS)"],
        [fr(1.08, 1.32), "Cowboy (medium wide)"], [fr(0.92, 2.0), "Full shot"],
        [{ pos: [0, 1.7, 7.2], target: [0, 1.1, 0], fov: 45 }, "Wide (establishing)"],
      ];
      cells.forEach(([cam, name], i) => {
        const row = i < 4 ? 0 : 1, col = row ? i - 4 : i;
        const x = row ? 182 + col * 348 : 8 + col * 348;
        thumb(g, paint, cam, x, 8 + row * 275, 330, 185.6,
              { scene: { ada: FACE_FRONT.ada, rosie: FACE_FRONT.rosie }, lines: [name] });
      });
    },
  },

  angles: {
    alt: "Six frames of Ada from different camera heights: eye level, high angle, low angle, " +
         "top-down, worm's-eye and a Dutch angle with the horizon rolled.",
    caption: "Angles: where the camera sits against her eyes.",
    width: 1340, height: 610,
    draw(g, paint) {
      const A = at("ada", 1.2, { x: 0 }), scene = { cast: ["ada"], ada: { x: 0, yaw: 0 } };
      const cells = [
        [framing(A, 1.3, { y: EYE_Y }), "Eye level"],
        [{ pos: [0, 3.0, 2.0], target: [0, 0.95, 0], fov: 40 }, "High angle"],
        [{ pos: [0, 0.35, 1.9], target: [0, 1.3, 0], fov: 46 }, "Low angle"],
        [{ pos: [0, 3.1, 0.01], target: [0, 0, 0], fov: 50, up: [0, 0, -1] }, "Top-down (bird's-eye)"],
        [{ pos: [0.1, 0.08, 1.3], target: [0, 1.25, 0], fov: 72 }, "Worm's-eye"],
        [{ ...framing(A, 1.3, { y: EYE_Y }), roll: 18 }, "Dutch angle (rolled)"],
      ];
      cells.forEach(([cam, name], i) => {
        const x = 8 + (i % 3) * 444, y = 8 + Math.floor(i / 3) * 300;
        thumb(g, paint, cam, x, y, 420, 236.25, { scene, lines: [name] });
      });
    },
  },

  ots_pov: {
    alt: "Left: over the shoulder: Rosie's shoulder and hair fill the near edge, and Ada faces " +
         "the camera. Right: point of view: what Rosie sees, Ada straight ahead, with no part of " +
         "Rosie in the frame.",
    caption: "OTS shows the listener's shoulder. POV is the listener's eyes.",
    width: 1180, height: 400,
    draw(g, paint) {
      const scene = { ada: { x: -0.6, z: 0, yaw: 90 },
                      rosie: { x: 0.6, z: 0, yaw: -90, pumpkin: true, hold: 1 } };
      thumb(g, paint, { pos: [1.45, 1.6, 0.8], target: [-0.6, 1.3, 0], fov: 30 },
            8, 8, 560, 315, { scene, lines: ["Over the shoulder (OTS)"] });
      thumb(g, paint, { pos: [0.39, EYE_Y, 0], target: [-0.6, 1.1, 0], fov: 50 },
            612, 8, 560, 315, { scene, lines: ["Point of view (POV): Rosie's eyes"] });
    },
  },

  compression: {
    alt: "Two frames with Ada the same size. Left, from close with a wide field of view: the " +
         "chalkboard behind her looks small and far. Right, from far away with a narrow field " +
         "of view: the board looks big and close behind her.",
    caption: "Same Ada, same size. Only the camera distance changed (and the FOV to match).",
    width: 1180, height: 420,
    draw(g, paint) {
      const A = at("ada", 1.2, { x: 0 }), scene = { cast: ["ada"], ada: { x: 0, yaw: 0 } };
      thumb(g, paint, framing(A, 1.15, { fov: 60 }), 8, 8, 560, 315,
            { scene, lines: ["Close (1 m), wide FOV (60°)"] });
      thumb(g, paint, framing(A, 1.15, { fov: 14 }), 612, 8, 560, 315,
            { scene, lines: ["Far (4.7 m), narrow FOV (14°)"] });
    },
  },

  aspect: {
    alt: "Left: a 16:9 frame of the classroom with a dashed outline of a tall 9:16 slice in " +
         "the middle. Right: the 9:16 frame rendered with the same fov: only that narrow slice.",
    caption: "Same camera, same fov. three.js keeps the vertical angle, so 9:16 sees a slice.",
    width: 1000, height: 420,
    draw(g, paint) {
      const cam = { pos: [0, 1.45, 5.4], target: [0, 1.15, 0], fov: 34 };
      thumb(g, paint, cam, 8, 8, 560, 315, { lines: ["16:9, fov = 34"] });
      const sw = 315 * 9 / 16;
      paint_el(el("rect", { x: 8 + 280 - sw / 2, y: 8, width: sw, height: 315, "stroke-width": 3,
                            "stroke-dasharray": "10 8" }, g), "none", "#ffffff");
      thumb(g, paint, cam, 700, 8, sw, 315, { lines: ["9:16, same fov"] });
      txt(g, "→", 640, 165, { size: 48, fill: paint.muted });
    },
  },

  line_180: {
    alt: "Top view: Ada and Rosie face each other; a dashed line runs through them. Cameras A " +
         "and B sit on the front side, camera C on the far side. Frames from A and C: in A Ada " +
         "is on the left facing right; in C she jumps to the right, facing left.",
    caption: "Stay on one side of the line, and Ada stays on the left.",
    width: 1340, height: 560,
    draw(g, paint) {
      const ada = { x: -0.6, z: 0, yaw: 90 }, rosie = { x: 0.6, z: 0, yaw: -90 };
      const A = { pos: [0, 1.5, 4.2], target: [0, 1.2, 0], fov: 32 };
      const Bc = { pos: [2.6, 1.5, 2.6], target: [-0.6, 1.3, 0], fov: 28 };
      const C = { pos: [0.2, 1.5, -2.6], target: [0, 1.2, 0], fov: 40 };
      const pal = { ink: paint.ink, panel: paint.paper, dim: paint.muted, cam: paint.muted };
      const vp = { x: 8, y: 8, w: 520, h: 540 };
      const bounds = { a: [-3.2, 3.6], b: [-3.3, 5.2] };
      const M = draw_map(g, vp, [A, Bc, C], { ada, rosie, pal, bounds, cone: 110,
                                              cam_labels: ["A", "B", "C"] });
      const [x1, y1] = M([-3.4, 0, 0]), [x2, y2] = M([3.8, 0, 0]);
      paint_el(el("line", { x1, y1, x2, y2, "stroke-width": 3, "stroke-dasharray": "14 10" }, g),
               "none", paint.crit);
      txt(g, "the line", x2 - 70, y2 - 26, { size: 26, fill: paint.crit });
      thumb(g, paint, A, 580, 20, 360, 202.5, { scene: { ada, rosie },
        lines: ["Camera A: Ada left", ["✓ Same side", paint.good]] });
      thumb(g, paint, C, 970, 20, 360, 202.5, { scene: { ada, rosie },
        lines: ["Camera C: Ada jumps right", ["✗ Crossed the line", paint.crit]] });
      thumb(g, paint, Bc, 775, 320, 360, 202.5, { scene: { ada, rosie },
        lines: ["Camera B: closer, same side ✓"] });
    },
  },

  thirds: {
    alt: "Two medium close-ups of Ada looking to the right, with a rule-of-thirds grid. Left: " +
         "she sits on the left third, eyes on the top line, with space in front of her. Right: " +
         "she sits at the right edge and looks out of the frame.",
    caption: "Thirds, headroom and lead room. The grid is for planning; it is not in the video.",
    width: 1180, height: 410,
    draw(g, paint) {
      const ada = { x: 0, yaw: 75 }, scene = { cast: ["ada"], ada };
      const good = { pos: [0.48, 1.36, 2.2], target: [0.48, 1.22, 0], fov: 30 };
      const bad = { pos: [-0.5, 1.36, 2.2], target: [-0.5, 1.22, 0], fov: 30 };
      const grid = x => {
        for (const k of [1, 2]) {
          paint_el(el("line", { x1: x + 560 * k / 3, y1: 8, x2: x + 560 * k / 3, y2: 323,
                                "stroke-width": 2, opacity: 0.7 }, g), "none", "#ffffff");
          paint_el(el("line", { x1: x, y1: 8 + 315 * k / 3, x2: x + 560, y2: 8 + 315 * k / 3,
                                "stroke-width": 2, opacity: 0.7 }, g), "none", "#ffffff");
        }
      };
      thumb(g, paint, good, 8, 8, 560, 315, { scene,
        lines: [["✓ Lead room: space where she looks", paint.good]] });
      grid(8);
      thumb(g, paint, bad, 612, 8, 560, 315, { scene,
        lines: [["✗ No lead room: she looks out of frame", paint.crit]] });
      grid(612);
    },
  },
};

// ---- Clips ----
// Easing curves for the easing clip: linear, Remotion-style Easing.inOut(Easing.cubic), and
// Remotion's spring() with its defaults (mass 1, stiffness 100, damping 10: it overshoots) [S9].
const EASE = {
  linear: u => clamp01(u),
  inout: u => { u = clamp01(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
  spring: s => {  // s = seconds since the start
    if (s <= 0) return 0;
    const w = 10, z = 0.5, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * s) * (Math.cos(wd * s) + (z * w / wd) * Math.sin(wd * s));
  },
};

// Music for the rhythm clip: the Applying Gravity chorus runs at about 143.6 BPM; four
// lyric phrases of 8 beats each.
const BEAT = 60 / 143.6;
const PHRASES = ["We're applying gravity!", "Nine-point-eight for you and me!",
                 "Faster every second as it falls,", "The same for pumpkins and ping-pong balls!"];
// Edits: lists of [start beat, shot]. Each shot runs to the next start (or beat 32).
const EDITS = {
  every_beat: Array.from({ length: 32 }, (_, k) =>
    [k, ["wide", "mcu_ada", "cu_rosie", "insert", "ms2", "low"][k % 6]]),
  one_hold: [[0, "wide"]],
  phrases: [[0, "wide"], [8, "mcu_ada"], [16, "cu_rosie"], [20, "insert"], [24, "low"],
            [26, "mcu_ada"], [28, "cu_rosie"], [29, "wide"]],
};
const shot_at = (edit, beat) => {
  let cur = edit[0][1];
  for (const [b, s] of edit) if (beat >= b) cur = s;
  return cur;
};

// The timeline under the rhythm clip: phrases, beat ticks, one bar per shot, a playhead.
const TL = { x: 120, w: 1680, y: 790 };
function timeline(g, edit, beats = 32, { speed = null } = {}) {
  const X = b => TL.x + TL.w * b / beats;
  if (beats === 32) {
    PHRASES.forEach((s, i) => {
      paint_el(el("rect", { x: X(i * 8) + 3, y: TL.y - 22, width: X(8) - X(0) - 6, height: 40,
                            rx: 6, "stroke-width": 2 }, g), COLORS.panel, COLORS.dim);
      label(g, s, X(i * 8 + 4), TL.y - 2, { size: 24, fill: COLORS.fg });
    });
  }
  for (let b = 0; b <= beats; b++) {
    el("line", { x1: X(b), y1: TL.y + 26, x2: X(b), y2: TL.y + (b % 4 ? 36 : 44),
                 stroke: COLORS.grey, "stroke-width": b % 4 ? 2 : 3 }, g);
  }
  edit.forEach(([b, shot], i) => {
    const e = i + 1 < edit.length ? edit[i + 1][0] : beats;
    const color = KIND_COLOR[SHOT_KIND[shot]];
    el("rect", { x: X(b) + 1, y: TL.y + 50, width: X(e) - X(b) - 2, height: 44, rx: 4,
                 fill: color, "fill-opacity": 0.85 }, g);
    if (X(e) - X(b) > 150) label(g, SHOT_NAME[shot], (X(b) + X(e)) / 2, TL.y + 72,
                                 { size: 24, fill: COLORS.fg, weight: 600 });
  });
  if (speed) {
    speed.forEach(([b, e, s]) => label(g, s, (X(b) + X(e)) / 2, TL.y - 2, { size: 26 }));
  }
  const head = el("line", { y1: TL.y - 30, y2: TL.y + 100, stroke: COLORS.yellow,
                            "stroke-width": 5 }, g);
  return beat => set(head, { x1: X(beat), x2: X(beat) });
}

// A legend for shot colours (identity hues, with words).
function shot_legend(g, x, y) {
  [["Wide", "wide"], ["Medium", "medium"], ["Close", "close"], ["Insert", "insert"]]
    .forEach(([name, kind], i) => {
      el("rect", { x, y: y + i * 48 - 12, width: 30, height: 24, rx: 4,
                   fill: KIND_COLOR[kind] }, g);
      label(g, name, x + 42, y + i * 48, { size: 26, anchor: "start", fill: COLORS.grey });
    });
}

const RHYTHM_VP = { x: 380, y: 96, w: 1100, h: 618.75 };

// One version of the chorus edit: the view plays the shot under the playhead.
function chorus_scene(edit_name, cap1, cap2, status, ok) {
  return { title: cap1.split(":")[0], build(g, b) {
    const view = el("g", {}, g);
    const head = timeline(g, EDITS[edit_name]);
    shot_legend(g, 1530, 130);
    const st = stage_status(g, 1680, 420);
    const w1 = b.say(cap1, 6.7), w2 = b.say(cap2, 6.7);
    const song = [w1[0], w1[0] + 32 * BEAT];
    void w2;
    return t => {
      const s = clamp01((t - song[0]) / (song[1] - song[0])) * (song[1] - song[0]);
      const beat = s / BEAT, phase = beat - Math.floor(beat);
      const bob = 0.03 * (1 - phase) * (1 - phase);
      const shot = shot_at(EDITS[edit_name], Math.min(beat, 31.999));
      render3d(clear(view), classroom({
        ada: { bob, arms: beat < 8 ? Math.sin(Math.PI * beat / 8) : 0 },
        rosie: { bob, pumpkin: true, hold: 1 } }), SHOTS[shot], RHYTHM_VP);
      paint_el(el("rect", { ...rect_of(RHYTHM_VP), "stroke-width": 2 }, view), "none", COLORS.dim);
      head(Math.min(beat, 32));
      set_status(st, status, ok ? COLORS.green : COLORS.red, clamp01((t - w2[0]) / 0.4));
    };
  } };
}

const CLIPS = {
  moves: {
    title: "Turn the camera, or move it",
    caption: "Pan, truck, the lookAt trap, orbit and crane, with the three.js values.",
    scenes: [
      { title: "Pan", build(g, b) {
        const draw = stage(g, { term: "Pan" });
        const w1 = b.say("Pan: the camera turns left or right. It stays in one place.", 4);
        const w2 = b.say("The near bench and the far board keep their places. No parallax.", 4);
        const tx = track(-2.4, [[w1, 2.3], [w2, -2.4]]);
        return t => {
          const moving = Math.max(prog(w1, t) * (1 - prog(w1, t)), prog(w2, t) * (1 - prog(w2, t)));
          draw({ ...BASE, target: [tx(t), 1.2, -1.7] }, { hot: [0, clamp01(moving * 8), 0] });
        };
      } },
      { title: "Truck", build(g, b) {
        const draw = stage(g, { term: "Truck" });
        const w1 = b.say("Truck: the whole camera slides sideways. Its aim slides with it.", 4);
        const w2 = b.say("Near things slide past far things. That is parallax.", 4);
        const dx = track(-2.2, [[w1, 2.2], [w2, -2.2]]);
        return t => {
          const moving = Math.max(prog(w1, t) * (1 - prog(w1, t)), prog(w2, t) * (1 - prog(w2, t)));
          const h = clamp01(moving * 8);
          draw({ ...BASE, pos: v_add(BASE.pos, [dx(t), 0, 0]),
                 target: v_add(BASE.target, [dx(t), 0, 0]) }, { hot: [h, h, 0] });
        };
      } },
      { title: "The lookAt trap", build(g, b) {
        const draw = stage(g, { term: "Truck + pan" });
        const st = stage_status(g, VIEW_VP.x + VIEW_VP.w / 2, VIEW_VP.y + 50);
        const w1 = b.say("In code, lookAt(the girls) on every frame keeps them in the centre.", 4.5);
        const w2 = b.say("So the slide also turns the camera: a truck plus a pan.", 4);
        const dx = track(-2.6, [[w1, 2.6], [w2, -2.6]]);
        return t => {
          const moving = Math.max(prog(w1, t) * (1 - prog(w1, t)), prog(w2, t) * (1 - prog(w2, t)));
          draw({ ...BASE, pos: v_add(BASE.pos, [dx(t), 0, 0]) }, { hot: [clamp01(moving * 8), 0, 0] });
          set_status(st, "⚠ Not a pure truck", COLORS.amber, prog(head_of(w2, 0.5), t));
        };
      } },
      { title: "Orbit", build(g, b) {
        const draw = stage(g, { term: "Orbit (arc)" });
        const w1 = b.say("Orbit, or arc: the camera circles the girls. The aim stays on them.", 5);
        const w2 = b.say("The room swings behind them. Save it for a moment that matters.", 4);
        const a = track(-50, [[w1, 50], [w2, 0]]);
        const centre = [0, 1.15, 0.05];
        return t => {
          const r = 4.6, ang = a(t) * D2R;
          const moving = Math.max(prog(w1, t) * (1 - prog(w1, t)), prog(w2, t) * (1 - prog(w2, t)));
          draw({ pos: [r * Math.sin(ang), 1.6, 0.05 + r * Math.cos(ang)], target: centre, fov: 34 },
               { hot: [clamp01(moving * 8), 0, 0] });
        };
      } },
      { title: "Crane", build(g, b) {
        const draw = stage(g, { mode: "side", term: "Crane" });
        const w1 = b.say("Crane: the camera rises on an arm. Here the aim stays on the girls…", 5);
        const w2 = b.say("…so the camera tilts down as it rises. Good to open or close a scene.", 2);
        const u = track(0, [[w1, 1]]);
        void w2;
        return t => {
          const p = u(t);
          draw({ pos: [0, lerp(0.9, 4.3, p), lerp(5.6, 4.4, p)], target: [0, 1.1, 0], fov: 38 },
               { hot: [clamp01(prog(w1, t) * (1 - prog(w1, t)) * 8), 0, 0] });
        };
      } },
    ],
  },

  push_vs_zoom: {
    title: "A zoom is not a push-in",
    caption: "Push-in moves the camera. Zoom narrows the FOV. A dolly zoom does both.",
    scenes: [
      { title: "Push-in", build(g, b) {
        const draw = stage(g, { term: "Push-in" });
        const w1 = b.say("Push-in (dolly in): the camera moves closer. The FOV stays the same.", 5);
        const w2 = b.say("The bench slides out of frame. The board grows only a little.", 2);
        const z = track(6.6, [[w1, 2.3]]);
        void w2;
        return t => draw({ pos: [0.55, 1.3, z(t)], target: ROSIE_AIM, fov: 34 },
                         { hot: [clamp01(prog(w1, t) * (1 - prog(w1, t)) * 8), 0, 0],
                           rosie: { pumpkin: true, hold: 1 } });
      } },
      { title: "Zoom", build(g, b) {
        const draw = stage(g, { term: "Zoom" });
        const w1 = b.say("Zoom: the camera stays put. Only the FOV narrows.", 5);
        const w2 = b.say("Everything grows by the same amount. It is a crop of the first frame.", 2);
        const fz = 2 * Math.atan(Math.tan(17 * D2R) * 2.2 / 6.5) / D2R;
        const fov = track(34, [[w1, fz]]);
        void w2;
        return t => draw({ pos: [0.55, 1.3, 6.6], target: ROSIE_AIM, fov: fov(t) },
                         { hot: [0, 0, clamp01(prog(w1, t) * (1 - prog(w1, t)) * 8)],
                           rosie: { pumpkin: true, hold: 1 } });
      } },
      { title: "Compare", build(g, b) {
        const fz = 2 * Math.atan(Math.tan(17 * D2R) * 2.2 / 6.5) / D2R;
        const L = { x: 60, y: 200, w: 880, h: 495 }, R = { x: 980, y: 200, w: 880, h: 495 };
        const scene = { rosie: { pumpkin: true, hold: 1 } };
        render3d(g, classroom(scene), { pos: [0.55, 1.3, 2.3], target: ROSIE_AIM, fov: 34 }, L);
        render3d(g, classroom(scene), { pos: [0.55, 1.3, 6.6], target: ROSIE_AIM, fov: fz }, R);
        label(g, "Push-in: close, FOV 34°", L.x + L.w / 2, 150, { size: 40, weight: 600 });
        label(g, `Zoom: far, FOV ${fz.toFixed(0)}°`, R.x + R.w / 2, 150, { size: 40, weight: 600 });
        const hl = el("rect", { x: 0, y: 0, width: 0, height: 0, fill: "none",
                                stroke: COLORS.yellow, "stroke-width": 6, rx: 6 }, g);
        const w1 = b.say("Same Rosie, same size. Look behind her.", 0.5);
        const w2 = b.say("The push-in shows more of the room, and it looks deep.", 3);
        const w3 = b.say("The zoom shows less of the room, and the board looks close and flat.", 3);
        void w1;
        return t => {
          const r = t >= w3[0] ? R : L;
          set(hl, { x: r.x - 6, y: r.y - 6, width: r.w + 12, height: r.h + 12 });
          hl.style.opacity = t >= w2[0] ? 1 : 0;
        };
      } },
      { title: "Dolly zoom", build(g, b) {
        const draw = stage(g, { term: "Dolly zoom" });
        const w1 = b.say("Dolly zoom: move back and zoom in, at the same time.", 6);
        const w2 = b.say("Rosie stays the same size. The room seems to grow behind her.", 2);
        const z = track(2.3, [[w1, 6.6]]);
        void w2;
        return t => {
          const d = z(t) - 0.1;
          const fov = 2 * Math.atan(2.2 * Math.tan(17 * D2R) / d) / D2R;
          const h = clamp01(prog(w1, t) * (1 - prog(w1, t)) * 8);
          draw({ pos: [0.55, 1.3, z(t)], target: ROSIE_AIM, fov }, { hot: [h, 0, h],
                 rosie: { pumpkin: true, hold: 1 } });
        };
      } },
    ],
  },

  easing: {
    title: "Linear, eased, spring",
    caption: "The same push-in with three timing curves.",
    scenes: ["linear", "inout", "spring"].map((kind, k) => ({
      title: ["Linear", "Ease in-out", "Spring"][k],
      build(g, b) {
        const vp = { x: 60, y: 120, w: 1040, h: 585 };
        const gx = 1200, gy = 170, gw = 640, gh = 470;
        const X = s => gx + gw * s / 3, Y = u => gy + gh - gh * u / 1.25;
        // Axes (recessive) and labels.
        el("line", { x1: gx, y1: Y(0), x2: gx + gw, y2: Y(0), stroke: COLORS.dim, "stroke-width": 2 }, g);
        el("line", { x1: gx, y1: gy, x2: gx, y2: Y(0), stroke: COLORS.dim, "stroke-width": 2 }, g);
        el("line", { x1: gx, y1: Y(1), x2: gx + gw, y2: Y(1), stroke: COLORS.dim,
                     "stroke-width": 1, "stroke-dasharray": "6 6" }, g);
        for (const s of [0, 1, 2, 3]) label(g, `${s}`, X(s), Y(0) + 30, { size: 26, fill: COLORS.grey });
        label(g, "seconds", gx + gw / 2, Y(0) + 68, { size: 26, fill: COLORS.grey });
        label(g, "done", gx - 14, Y(1), { size: 26, fill: COLORS.grey, anchor: "end" });
        label(g, "start", gx - 14, Y(0), { size: 26, fill: COLORS.grey, anchor: "end" });
        label(g, "How far the push-in has gone", gx + gw / 2, gy - 40, { size: 30 });
        const kinds = ["linear", "inout", "spring"], colors = [COLORS.blue, COLORS.orange, COLORS.aqua];
        const names = ["Linear", "Ease in-out", "Spring"];
        const curve = (kd, s) => kd === "spring" ? EASE.spring(s) : EASE[kd](s / 3);
        const paths = kinds.map((kd, i) => el("polyline", { fill: "none", stroke: colors[i],
          "stroke-width": 5, "stroke-linejoin": "round", opacity: i <= k ? 1 : 0 }, g));
        kinds.forEach((kd, i) => {  // legend: swatch + name in text colour
          el("rect", { x: gx + i * 220, y: 760, width: 34, height: 8, rx: 4, fill: colors[i] }, g);
          label(g, names[i], gx + i * 220 + 46, 764, { size: 26, anchor: "start",
                fill: i === k ? COLORS.fg : COLORS.grey, weight: i === k ? 600 : 400 });
        });
        const dotc = el("circle", { r: 11, fill: colors[k], stroke: COLORS.bg, "stroke-width": 3 }, g);
        const view = el("g", {}, g);
        const code = label(g, "", 60, 830, { size: 28, anchor: "start", font: MONO });
        code.style.whiteSpace = "pre";
        code.textContent = [
          "interpolate(frame, [0, 90], [6.6, 2.3])",
          "interpolate(frame, [0, 90], [6.6, 2.3], { easing: Easing.inOut(Easing.cubic) })",
          "interpolate(spring({ frame, fps: 30 }), [0, 1], [6.6, 2.3])"][k];
        const caps = [
          ["Linear: full speed at once, then a dead stop.", "It reads as mechanical: the jolt a viewer calls “jittery”."],
          ["Ease in-out: starts slow, speeds up, then settles.", "It feels like a person moved the camera."],
          ["Spring: a quick start, a small overshoot, a soft settle.", "Lively. It suits a hit on the beat."]][k];
        const w1 = b.say(caps[0], 3.4), w2 = b.say(caps[1], 0.5);
        void w2;
        const pts = (kd, upto) => {
          const out = [];
          for (let s = 0; s <= upto + 1e-9; s += 0.02) out.push(`${X(s)},${Y(curve(kd, s))}`);
          return out.join(" ");
        };
        kinds.forEach((kd, i) => { if (i < k) set(paths[i], { points: pts(kd, 3) }); });
        return t => {
          const s = Math.min(3, Math.max(0, t - w1[0] - 0.2));
          set(paths[k], { points: pts(kinds[k], s) });
          const u = curve(kinds[k], s);
          set(dotc, { cx: X(s), cy: Y(u) });
          render3d(clear(view), classroom({ rosie: { pumpkin: true, hold: 1 } }),
                   { pos: [0.55, 1.3, lerp(6.6, 2.3, u)], target: ROSIE_AIM, fov: 34 }, vp);
          paint_el(el("rect", { ...rect_of(vp), "stroke-width": 2 }, view), "none", COLORS.dim);
        };
      },
    })),
  },

  rhythm: {
    title: "One chorus, three edits",
    caption: "The same 13 seconds of the Applying Gravity chorus, cut three ways.",
    scenes: [
      chorus_scene("every_beat", "Edit 1: a cut on every beat. 32 shots in 13 seconds.",
                   "No shot stays long enough to read.", "✗ Tiring", false),
      chorus_scene("one_hold", "Edit 2: one wide shot for the whole chorus.",
                   "After a few seconds the eye has seen it all.", "✗ Static", false),
      chorus_scene("phrases", "Edit 3: cut on the phrases, and change the size each time.",
                   "Faster near the end, then hold the last wide shot.", "✓ Rhythm", true),
      { title: "Speed ramp", build(g, b) {
        const view = el("g", {}, g);
        const edit = [[0, "insert_low"], [8, "wide"]];
        const head = timeline(g, edit.map(([bt, s]) => [bt, s === "insert_low" ? "insert" : s]), 12,
                              { speed: [[0, 2, "×1"], [2, 6.2, "×0.25"], [6.2, 8, "×1"]] });
        const st = stage_status(g, 1680, 420);
        const w1 = b.say("Slow motion under a song: the song keeps real time. Only the scene slows.", 5);
        const w2 = b.say("The ramp back to ×1 lets the cut land on its beat.", 1);
        const song = [w1[0], w1[0] + 12 * BEAT];
        const cam_ins = framing([PUMPKIN_AT[0], 0.55, PUMPKIN_AT[2]], 1.35, { from: -20, y: 0.45, fov: 34 });
        // Scene time: x1 for 2 beats, x0.25 to beat 6.2, back to x1 by beat 8 (eased).
        const scene_time = s => {
          const b1 = 2 * BEAT, b2 = 6.2 * BEAT, b3 = 8 * BEAT;
          if (s <= b1) return s;
          if (s <= b2) return b1 + 0.25 * (s - b1);
          const u = Math.min(s, b3) - b2, span = b3 - b2;
          const ramp = 0.25 * u + 0.75 * u * u / (2 * span);  // speed rises linearly 0.25 -> 1
          return b1 + 0.25 * (b2 - b1) + ramp + Math.max(0, s - b3);
        };
        const drop_at = 2 * BEAT;  // scene time when Rosie lets go
        return t => {
          const s = clamp01((t - song[0]) / (song[1] - song[0])) * (song[1] - song[0]);
          const beat = s / BEAT, st_t = scene_time(s);
          const fall = Math.max(0, st_t - drop_at);
          const y = Math.max(0.14, PUMPKIN_AT[1] - 0.5 * 9.8 * fall * fall);
          const extra = pumpkin([PUMPKIN_AT[0], y, PUMPKIN_AT[2]]);
          const cam = beat < 8 ? cam_ins : SHOTS.wide;
          render3d(clear(view), classroom({ rosie: { hold: fall > 0 ? 0.6 : 1 }, extra }),
                   cam, RHYTHM_VP);
          paint_el(el("rect", { ...rect_of(RHYTHM_VP), "stroke-width": 2 }, view), "none", COLORS.dim);
          head(Math.min(beat, 12));
          set_status(st, "✓ On the beat", COLORS.green, clamp01((beat - 8) / 0.5));
          void w2;
        };
      } },
    ],
  },
};

// ---- Page content ----
const META = {
  title: "Say the shot",
  subtitle: "Camera language for directing AI-made video: the words that get you the shot " +
            "you imagine.",
  minutes: 50,
  audience: "creators who make videos with Claude or another AI, no film school needed",
  source: "Film terms: common practice. Tools: three.js, Remotion, Blender and Unreal docs; " +
          "Veo, Runway, Kling, Luma and MiniMax prompting guides; accessed October 2026",
  internal: false,
  prereqs: ["You have watched a lot of YouTube", "Nothing else"],
  objectives: [
    "Name a shot by its size, angle and move",
    "Tell apart the pairs people mix up: zoom and push-in, pan and truck, tilt and Dutch, OTS and POV",
    "Say what each move does to a 3D camera's position, target and field of view",
    "Ask for timing: holds, easing, cuts on the phrase, slow motion under a song",
    "Use taste on purpose: shot length, variety and rhythm",
    "Write a shot list or a review note that an AI can act on without guessing",
  ],
};

// Terms the reader may not know. Key ideas are defined in the sentence; these are the rest.
const GLOSSARY = {
  "establishing shot": "a wide shot at the start of a scene that shows where we are",
  "two-shot": "a shot with two people in the frame",
  "B-roll": "extra footage cut over the main track: hands, places, details",
  "keyframes": "values you set at chosen frames; the software fills in the frames between",
  "focal length": "a lens's length in millimetres; longer means a narrower view",
  "sensor": "the chip (or film) that records the image; its size links focal length to field of view",
  "bokeh": "the look of the blurred, out-of-focus parts of an image",
  "f-stop": "the aperture number of a lens; a lower number gives a shallower depth of field",
  "post effect": "an effect applied to the finished frame, after the 3D render",
  "frame rate": "how many pictures per second the video shows, for example 24, 30 or 60",
  "motion blur": "the smear of a moving thing within one frame, as a real shutter records it",
  "lip sync": "a singer's mouth moving in time with recorded vocals",
  "jump cut": "a cut inside one shot, so time jumps while the framing stays the same",
  "Ken Burns effect": "a slow pan or zoom over a still image, to give it motion",
  "montage": "a run of short shots that compresses time or builds a feeling",
  "average shot length": "a film's running time divided by its number of shots",
  "headroom": "the space between the top of the head and the top of the frame",
  "telephoto": "a long lens with a narrow field of view",
  "Remotion": "a tool that renders video from React code, frame by frame",
  "three.js": "a JavaScript library that draws 3D scenes in a browser",
};

// ---- Checks. Comments name the source tags in research/brief.md and plan.md. ----
const CHECKS = {
  // 1. Size and angle
  size_match: {  // [M], S25, D2
    kind: "match",
    prompt: "Match each plain-word wish to the shot size.",
    pairs: [
      ["“Just her eyes, really big”", "Extreme close-up (ECU)"],
      ["“Her face, so we see she is singing”", "Close-up (CU)"],
      ["“Head and chest, like a news anchor”", "Medium close-up (MCU)"],
      ["“From mid-thigh up, hands on hips”", "Cowboy (medium wide)"],
      ["“Head to toe, for the dance step”", "Full shot"],
      ["“Show the whole classroom first”", "Wide (establishing)"],
    ],
    explain: "<p>Name a size by where the bottom of the frame cuts the body: eyes, chin, " +
             "chest, waist, thigh, feet, or the whole place.</p>",
  },
  floor_up: {  // F, S11
    kind: "choice",
    prompt: "A review note says: “camera angle from the floor looking up”. Which term " +
            "says that?",
    options: [
      { text: "Worm's-eye shot (or a very low angle)", correct: true,
        why: "Worm's-eye: the camera is at ground level and looks steeply up. A milder " +
             "version is a low angle." },
      { text: "Top-down shot", why: "Top-down (bird's-eye) is the opposite: straight down from above." },
      { text: "Dutch angle", why: "A Dutch angle rolls the horizon. It says nothing about height." },
      { text: "Tilt down", why: "A tilt is a move: the camera turns up or down. From the floor, " +
                                "looking up, it would be a tilt up, and it still is not an angle." },
    ],
  },
  ots_pov: {  // [M], S40
    kind: "choice",
    prompt: "You want the viewer to see Ada exactly as Rosie sees her, with no part of " +
            "Rosie in front of the lens except her hands. Which shot?",
    options: [
      { text: "A POV shot from Rosie's eyes", correct: true,
        why: "Point of view: the camera is the character's eyes. At most her own hands show." },
      { text: "An over-the-shoulder shot", why: "OTS puts Rosie's shoulder and head in the " +
                                               "frame. It shows both of them." },
      { text: "A two-shot", why: "A two-shot shows both girls from outside." },
      { text: "A high angle", why: "That is a camera height, not a point of view." },
    ],
  },

  // 2. Turn or move
  pan_truck: {  // S27, S28, D3, S22
    kind: "choice",
    prompt: "In a shot, the bench in front slides across the frame faster than the board " +
            "at the back. What did the camera do?",
    options: [
      { text: "It moved: a truck (or another move that changes position)", correct: true,
        why: "Near things slide past far things only when the camera position changes. That " +
             "is parallax." },
      { text: "It panned", why: "A pan turns the camera in place. Near and far move together, " +
                               "so there is no parallax." },
      { text: "It zoomed", why: "A zoom changes only the FOV. Everything grows by the same amount." },
      { text: "It tilted", why: "A tilt turns the camera up or down in place: no parallax." },
    ],
  },
  lookat_trap: {  // S2, D
    kind: "choice",
    prompt: "Claude's code moves <code>camera.position.x</code> from -2 to 2 and calls " +
            "<code>camera.lookAt(rosie)</code> on every frame. What does the viewer see?",
    options: [
      { text: "A truck plus a pan: Rosie stays centred while the room swings behind her",
        correct: true,
        why: "The position slides, and lookAt turns the camera to keep aiming at Rosie. For a " +
             "pure truck, move the target by the same amount." },
      { text: "A pure truck", why: "A pure truck keeps the aim direction. Here lookAt turns it." },
      { text: "A zoom", why: "The fov did not change." },
      { text: "A pan", why: "A pan keeps the position fixed. Here the position moves." },
    ],
  },
  move_values: {  // D table in brief §3
    kind: "match",
    prompt: "Match each move to what changes in the 3D camera.",
    pairs: [
      ["Pan", "Only the aim turns; position stays"],
      ["Truck", "Position and target slide sideways together"],
      ["Push-in", "Position moves towards the subject"],
      ["Orbit", "Position circles; target stays"],
      ["Zoom", "Only the fov changes"],
    ],
  },

  // 3. Zoom is not a push-in
  zoom_which: {  // S1, S22, S23
    kind: "choice",
    prompt: "Rosie grows in the frame. The board behind her grows by exactly the same " +
            "amount, and nothing slides. Which was it?",
    options: [
      { text: "A zoom (the FOV narrowed)", correct: true,
        why: "A zoom magnifies everything equally: it is a crop. Perspective does not change." },
      { text: "A push-in", why: "A push-in moves the camera: Rosie grows faster than the board, " +
                                "and the near bench slides away." },
      { text: "A dolly zoom", why: "In a dolly zoom, Rosie keeps her size and the room changes." },
      { text: "An orbit", why: "An orbit circles the subject; the background swings sideways." },
    ],
  },
  dolly_zoom: {  // S33, D
    kind: "choice",
    prompt: "You want the room to seem to stretch behind Rosie while she stays the same " +
            "size. What does Claude animate?",
    options: [
      { text: "Camera moves away from her while the fov narrows (or the reverse)", correct: true,
        why: "A dolly zoom: the move and the zoom work in opposite directions, so the subject " +
             "size holds and the background changes." },
      { text: "Camera moves towards her while the fov narrows",
        why: "Both make her bigger, so she grows fast. That doubles the effect on her size." },
      { text: "Only the fov changes", why: "That is a plain zoom: she grows too." },
      { text: "Only the camera moves", why: "That is a push-in or pull-out: her size changes." },
    ],
  },

  // 4. Lens, focus and depth
  compress: {  // S20, S21, S22, D1
    kind: "choice",
    prompt: "You want the chalkboard to look big and close behind Ada. What do you ask for?",
    options: [
      { text: "Move the camera far back and narrow the FOV to keep Ada's size", correct: true,
        why: "Distance changes perspective. From far away, Ada and the board are at more " +
             "similar distances, so the board looks bigger next to her (the ASC's point)." },
      { text: "Zoom in from where the camera is now",
        why: "A zoom from the same place is a crop. The proportions stay the same." },
      { text: "Move closer with a wide FOV", why: "That makes the board look smaller and further away." },
      { text: "Lower the f-stop", why: "That changes depth of field (blur), not size." },
    ],
  },
  fov_value: {  // S1
    kind: "choice",
    prompt: "In three.js, which value is the camera's vertical view angle, in degrees?",
    options: [
      { text: "<code>camera.fov</code>", correct: true,
        why: "three.js: “The vertical field of view, from bottom to top of view, in degrees.”" },
      { text: "<code>camera.zoom</code>", why: "A multiplier on the FOV (default 1)." },
      { text: "<code>camera.filmGauge</code>", why: "The film size in millimetres (default 35)." },
      { text: "<code>camera.focus</code>", why: "A distance used only by stereo and depth-of-field effects." },
    ],
  },
  shorts: {  // S1, S38, D
    kind: "choice",
    prompt: "Claude renders a 9:16 Short from a 16:9 three.js scene and keeps " +
            "<code>fov = 34</code>. What happens?",
    options: [
      { text: "The view gets much narrower from side to side", correct: true,
        why: "three.js keeps the vertical angle. A tall frame then covers a thin slice. Re-frame " +
             "each shot for 9:16." },
      { text: "Nothing: the frame just gets taller", why: "The height angle stays; the width angle shrinks." },
      { text: "The view gets wider", why: "The opposite happens with a vertical fov." },
      { text: "three.js refuses to render", why: "It renders fine; the framing is what changes." },
    ],
  },

  // 5. Composition and continuity
  line: {  // S30, D7
    kind: "choice",
    prompt: "Ada is on the left and Rosie on the right. The next shot comes from the far " +
            "side of the line between them. What does the viewer see?",
    options: [
      { text: "Ada jumps to the right, and the two seem to swap places", correct: true,
        why: "Crossing the 180-degree line flips screen positions and directions." },
      { text: "Nothing changes", why: "Screen sides flip when the camera crosses the line." },
      { text: "Only the background changes", why: "The girls' screen positions flip too." },
      { text: "A jump cut", why: "A jump cut is a cut within one shot. This is a continuity flip." },
    ],
    explain: "<p>It is a guideline, not a law: cross on purpose, or move the camera across the " +
             "line during a shot so the viewer sees it happen.</p>",
  },
  coverage: {  // S39, S34
    kind: "order",
    prompt: "Put a simple coverage plan for one chorus in the usual order.",
    items: ["A wide master of the whole chorus", "A medium of both girls",
            "Close-ups of each girl", "Inserts: the pumpkin, the stopwatch"],
    explain: "<p>Widest first, then closer (the “V” plan). The master lets the editor cut " +
             "back to the whole picture at any time.</p>",
  },

  // 6. Time
  slowmo: {  // S5, S35, D
    kind: "choice",
    prompt: "Lip-synced 3D music video: you want the pumpkin drop in slow motion. What " +
            "does Claude slow?",
    options: [
      { text: "Only the scene time for that shot. The song and the cut points stay on real time",
        correct: true,
        why: "The song cannot slow down, or the sync breaks. Remap the scene clock, and ramp " +
             "back so the next cut lands on its beat." },
      { text: "The whole video, song included", why: "The song would drag, and every lip-sync line would break." },
      { text: "The frame rate", why: "Fewer frames per second looks choppy, not slow." },
      { text: "Nothing: slow motion needs a real camera", why: "In code you render time; you can slow it freely." },
    ],
  },
  jitter: {  // F, S4, S9
    kind: "choice",
    prompt: "Your note says the camera feels “jittery and bouncy”. The moves are linear. " +
            "What do you ask for?",
    options: [
      { text: "Ease in and out on every move (or a spring with no overshoot)", correct: true,
        why: "Linear moves start and stop at full speed: the jolt reads as jitter. Easing " +
             "removes it." },
      { text: "A higher frame rate", why: "More frames do not remove a sudden change of speed." },
      { text: "A zoom instead of a move", why: "A zoom has the same problem if it is linear." },
      { text: "More camera shake", why: "Shake adds jitter on purpose; that is the opposite." },
    ],
  },
  flicker: {  // S8
    kind: "choice",
    prompt: "A Remotion render flickers, but the preview looks fine. What is the likely cause?",
    options: [
      { text: "Something animates from a timer or CSS animation, not from useCurrentFrame()",
        correct: true,
        why: "Remotion renders frames in several tabs that share no state. Every value must " +
             "come from the frame number." },
      { text: "The frame rate is wrong", why: "A wrong fps changes speed, not consistency." },
      { text: "There is no motion blur", why: "Blur does not fix values that differ between tabs." },
      { text: "The FOV is too wide", why: "FOV has nothing to do with flicker." },
    ],
  },

  // 7. Taste
  chorus: {  // T1, T3, S34
    kind: "choice",
    prompt: "Which edit of a 13-second chorus usually works best?",
    options: [
      { text: "Cuts on the phrases, with a change of shot size each time, faster near the end",
        correct: true,
        why: "Each shot lasts long enough to read, sizes vary, and the pace builds. A music-video " +
             "guide warns that cutting every beat is the classic over-edit." },
      { text: "A cut on every beat", why: "About 0.4 s per shot: nothing can be read, and it tires the eye." },
      { text: "One wide shot for the whole chorus", why: "It goes static after a few seconds." },
      { text: "Random cut points", why: "Cuts that ignore the music feel careless." },
    ],
  },
  hold_len: {  // T2, T3
    kind: "choice",
    prompt: "Which shot can usually be the shortest?",
    options: [
      { text: "An insert of the stopwatch", correct: true,
        why: "One small subject is read at once. Close shots can be cut shorter than wide ones." },
      { text: "The wide establishing shot of the stage",
        why: "Wide shots need time: the eye scans more detail." },
      { text: "A full shot of a dance step", why: "The step must finish, or it reads as cut off." },
      { text: "They should all be the same length", why: "Equal lengths feel mechanical; vary them." },
    ],
  },
  style_match: {  // T1, T3, [M]
    kind: "match",
    prompt: "Match each style to a starting shot length.",
    pairs: [
      ["Talking-head tutorial", "5-15 s on the speaker, with cutaways"],
      ["Modern film or cinematic short", "About 3-4 s on average"],
      ["Calm, classic feel", "About 10 s"],
      ["Music video chorus", "About 2 s"],
    ],
    explain: "<p>The film and music-video numbers are measured averages; the tutorial range is " +
             "a rule of thumb. All are starting points, not rules.</p>",
  },

  // 8. Writing the brief
  prompt: {  // S13, S15, S16, S11
    kind: "choice",
    prompt: "Which prompt is best for an AI video generator?",
    options: [
      { text: "“Medium close-up of a girl in a pink cardigan holding a pumpkin, low angle. " +
              "The camera slowly pushes in.”", correct: true,
        why: "Shot size, angle, one move, a clear subject: what the guides recommend." },
      { text: "“Make it cinematic and cool.”", why: "Too vague: the guides call this a weak cue." },
      { text: "“Static camera with a fast push-in and an orbit.”",
        why: "Contradictory, and more than one move in one shot." },
      { text: "“No shake, don't cut, no zoom.”",
        why: "The guides say to describe what you want, not what you don't." },
    ],
  },
  rewrite: {  // F
    kind: "choice",
    prompt: "Your note: “it feels boring camera-wise”. Which rewrite gives Claude something to do?",
    options: [
      { text: "“The wide shot holds for 12 s. Cut it at the phrase at 0:45, then an MCU of " +
              "Ada, then an insert of the stopwatch. Slow push-in on the MCU.”", correct: true,
        why: "It names the problem (a long hold), the cut points, the sizes and one motivated move." },
      { text: "“Make it more exciting.”", why: "Still a feeling, not an instruction." },
      { text: "“Add lots of camera moves.”", why: "Unmotivated moves make it busy, not better." },
      { text: "“Cut faster.”", why: "Better, but it does not say where, to what, or how fast." },
    ],
  },
  pipeline_match: {  // S1-S19, F
    kind: "match",
    prompt: "Match each pipeline to how it makes a “slow push-in on Rosie”.",
    pairs: [
      ["Code-rendered 3D", "Keyframes on the camera position, eased: exact and repeatable"],
      ["AI video generator", "Words in a prompt: results vary, so make a few"],
      ["Stills with pan and zoom", "A slow crop of the image: no parallax"],
      ["Live crew", "A dolly or a slider moves the real camera"],
    ],
  },

  // Review
  r_notes: {  // F
    kind: "match",
    prompt: "Match each note from the Applying Gravity review to the term.",
    pairs: [
      ["“quick pan to Rosie”", "Whip pan"],
      ["“sweeping around it”", "Orbit (arc)"],
      ["“stay on the blackboard for the whole phrase”", "Hold; cut on the phrase"],
      ["“close and then quick zoom out”", "Crash zoom out (or a fast pull-out)"],
    ],
  },
  r_tilt: {  // S32, D5
    kind: "choice",
    prompt: "You want the horizon to lean, for a dizzy moment. What do you write?",
    options: [
      { text: "“Dutch angle” (or “canted angle”)", correct: true,
        why: "A roll of the camera about its lens axis. “Tilt” means turning up or down." },
      { text: "“Tilt the camera”", why: "Ambiguous: in film a tilt is up or down." },
      { text: "“Low angle”", why: "That is camera height, not a lean." },
      { text: "“Pan”", why: "A pan turns left or right." },
    ],
  },
  r_parallax: {  // S22, D
    kind: "choice",
    prompt: "Which moves show parallax (near things sliding past far things)? Pick all.",
    options: [
      { text: "Truck", correct: true, why: "The position changes." },
      { text: "Push-in", correct: true, why: "The position changes." },
      { text: "Orbit", correct: true, why: "The position changes, on a circle." },
      { text: "Pan", why: "The camera only turns." },
      { text: "Zoom", why: "Only the FOV changes." },
    ],
  },
  r_default_fov: {  // S1, D
    kind: "choice",
    prompt: "three.js's default <code>fov = 50</code> at 16:9 is like which lens, with its " +
            "default 35 mm film gauge?",
    options: [
      { text: "A wide lens, about 21 mm", correct: true,
        why: "50 degrees is the vertical angle. At 16:9 the horizontal angle is about 80 " +
             "degrees: a wide view." },
      { text: "A 50 mm lens", why: "Degrees are not millimetres. 50 mm gives about 22 degrees vertical at 16:9." },
      { text: "A telephoto, about 200 mm", why: "That would be a narrow angle of a few degrees." },
      { text: "It depends on the screen", why: "It depends on the aspect ratio and the film gauge, not the screen." },
    ],
  },
  r_negative: {  // S15, S11
    kind: "choice",
    prompt: "A generator keeps adding shake and cuts. Which prompt line follows the guides?",
    options: [
      { text: "“Static camera. Continuous, seamless shot.”", correct: true,
        why: "Say what you want. Runway suggests “continuous, seamless shot” against unwanted " +
             "cuts. Even then, a video model may add a little motion." },
      { text: "“No shake. Don't cut.”", why: "The guides advise against negative phrasing." },
      { text: "“Cinematic.”", why: "Vague; it does not address the problem." },
      { text: "“Handheld.”", why: "That asks for shake." },
    ],
  },
  r_shutter: {  // S31, S10
    kind: "choice",
    prompt: "A 3D music video renders at 30 fps with a 180-degree shutter. How long is each " +
            "frame's “exposure” for motion blur?",
    options: [
      { text: "1/60 s: half of each frame interval", correct: true,
        why: "180 degrees = open for half the frame time. It is the film norm and Remotion's " +
             "CameraMotionBlur default." },
      { text: "1/30 s", why: "That is the whole frame interval: a 360-degree shutter, very smeary." },
      { text: "1/180 s", why: "The angle is a share of the frame time, not a fraction of a second." },
      { text: "No blur at 30 fps", why: "Blur depends on the shutter angle, not only on fps." },
    ],
  },
  r_cut_move: {  // F
    kind: "choice",
    prompt: "Your note says “go to the blackboard”. Claude makes a slow camera move, but " +
            "you wanted an instant change. What should the note say?",
    options: [
      { text: "“Hard cut to the blackboard”", correct: true,
        why: "A hard cut switches instantly. “Move to” or “push in to” means a continuous move." },
      { text: "“Zoom to the blackboard”", why: "Zoom is a continuous FOV change." },
      { text: "“Pan to the blackboard”", why: "A pan is a continuous turn." },
      { text: "“Faster”", why: "Still a move, just a faster one." },
    ],
  },
  r_murch: {  // Murch T5
    kind: "choice",
    prompt: "Murch ranks what makes a good cut. What comes first?",
    options: [
      { text: "Emotion: does the cut serve what the viewer should feel?", correct: true,
        why: "Emotion, then story, then rhythm, then eye trace, then the 2D and 3D continuity " +
             "of the frame." },
      { text: "The 180-degree rule", why: "Continuity rules come last in his list." },
      { text: "Rhythm", why: "Third, after emotion and story." },
      { text: "Eye trace", why: "Fourth." },
    ],
  },
};

// ---- Diagram: one wish, four pipelines ----
const DIAGRAMS = {
  pipelines: {
    title: "One wish, four ways to make it",
    width: 1200, height: 470,
    intro: "<p class='hint'>Click a box for details, or step through a flow.</p>",
    nodes: [
      { id: "words", label: "Your words", sub: "“slow push-in on Rosie”", x: 110, y: 235, w: 190,
        detail: "<p>The same wish starts every flow. The clearer it is, the less any pipeline " +
                "has to guess.</p>" },
      { id: "claude", label: "Claude", x: 360, y: 235, w: 150,
        detail: "<p>Claude turns the words into code, a prompt, an edit plan or a shot list.</p>" },
      { id: "code3d", label: "Code-rendered 3D", sub: "three.js, Remotion", x: 660, y: 60, w: 230,
        detail: "<p>Keyframes on <code>camera.position</code>, eased over 90 frames. Exact and " +
                "repeatable. Any move is possible; optics such as depth of field are extra work.</p>" },
      { id: "gen", label: "AI video generator", sub: "Veo, Runway, Kling", x: 660, y: 175, w: 230,
        detail: "<p>A prompt: shot size, angle, one move. Results vary between runs, so make a " +
                "few. One generation is one shot; cuts happen in the edit.</p>" },
      { id: "stills", label: "Stills + pan/zoom", sub: "Ken Burns", x: 660, y: 295, w: 230,
        detail: "<p>A still image cannot move its camera. The push-in becomes a slow zoom into " +
                "the picture: a crop, with no parallax.</p>" },
      { id: "live", label: "Live crew", sub: "shot list", x: 660, y: 410, w: 230,
        detail: "<p>A shot-list line: “MCU Rosie, dolly in, 3 s”. A slider or dolly moves the " +
                "real camera.</p>" },
      { id: "edit", label: "Edit", x: 960, y: 235, w: 130,
        detail: "<p>Shots meet the music here: cut points, holds, speed ramps.</p>" },
      { id: "video", label: "Video", x: 1120, y: 235, w: 120,
        detail: "<p>The finished video.</p>" },
    ],
    edges: [
      { from: "words", to: "claude" },
      { from: "claude", to: "code3d", label: "code" },
      { from: "claude", to: "gen", label: "prompt" },
      { from: "claude", to: "stills", label: "edit plan" },
      { from: "claude", to: "live", label: "shot list" },
      { from: "code3d", to: "edit" }, { from: "gen", to: "edit" },
      { from: "stills", to: "edit" }, { from: "live", to: "edit" },
      { from: "edit", to: "video" },
    ],
    flows: [
      { title: "Code-rendered 3D", steps: [
        { nodes: ["words"], text: "You write: “slow push-in on Rosie, 3 s, eased”." },
        { nodes: ["claude"], edges: ["words>claude"], text: "Claude reads the move and the timing." },
        { nodes: ["code3d"], edges: ["claude>code3d"], text: "It writes keyframes: the camera " +
          "position moves from 6.6 m to 2.3 m over 90 frames with an ease in-out.",
          show: "code3d" },
        { nodes: ["edit", "video"], edges: ["code3d>edit", "edit>video"],
          text: "The render is exact. Change one number and render again." },
      ] },
      { title: "AI video generator", steps: [
        { nodes: ["words", "claude"], edges: ["words>claude"], text: "Same wish." },
        { nodes: ["gen"], edges: ["claude>gen"], text: "Claude writes a prompt: “Medium close-up of a " +
          "girl in a pink cardigan. The camera slowly pushes in.” One move, plain words.",
          show: "gen" },
        { nodes: ["edit", "video"], edges: ["gen>edit", "edit>video"],
          text: "Make a few versions, pick the best, and cut it in the edit." },
      ] },
      { title: "Stills with pan and zoom", steps: [
        { nodes: ["words", "claude"], edges: ["words>claude"], text: "Same wish." },
        { nodes: ["stills"], edges: ["claude>stills"], text: "A still has no camera to move: the " +
          "push-in becomes a slow zoom into the picture.", show: "stills" },
        { nodes: ["edit", "video"], edges: ["stills>edit", "edit>video"],
          text: "It works, but it looks flat: no parallax." },
      ] },
      { title: "Live crew", steps: [
        { nodes: ["words", "claude"], edges: ["words>claude"], text: "Same wish." },
        { nodes: ["live"], edges: ["claude>live"], text: "Claude writes a shot-list line the crew " +
          "can shoot.", show: "live" },
        { nodes: ["edit", "video"], edges: ["live>edit", "edit>video"],
          text: "Shoot several takes; the editor picks one." },
      ] },
    ],
  },
};
