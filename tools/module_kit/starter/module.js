// Module content: META, CHECKS, NOTES, CLIPS, DIAGRAMS, PICS. The engine (engine.js) helpers are
// available for clip scenes: el, label, box, arrow, code_block, prog, track, Beats, ...

const META = {
  title: "Starter: a tiny TTL cache",
  subtitle: "Replace this starter with your module.",
  minutes: 10,
  audience: "engineers new to the project",
  source: "example @ abc1234",
  internal: false,
  prereqs: ["Python classes and dicts"],
  objectives: ["Say where cached values live", "Explain when an entry expires"],
};

// Terms the reader may not know. The first use in the prose gets a dotted underline and the
// definition. Define key ideas in the sentence itself; use this for the rest.
const GLOSSARY = {
  lazily: "only when it is needed, not ahead of time",
};

const NOTES = {
  ttl_cache: [
    ["13", "The clock is injected, so tests can control time."],
    ["18-21", "A miss returns <code>None</code>; the caller cannot tell a miss from a stored None."],
    ["23-25", "Expired entries are removed lazily, on read."],
  ],
};

const CHECKS = {
  "where-ttl": {
    kind: "choice",
    prompt: "Where does the cache keep its values?",
    options: [
      { text: "In <code>self.items</code>, a dict of (value, time) pairs", correct: true,
        why: "put() stores a tuple of the value and the time it was stored." },
      { text: "In a file on disk", why: "Nothing in the class touches the filesystem." },
      { text: "In a background thread", why: "There are no threads: expiry happens on read." },
    ],
    explain: "<p>All state is the <code>items</code> dict.</p>",
  },
  "spot-expiry": {
    kind: "line",
    prompt: "Which line decides that an entry is too old?",
    code: { ref: "ttl_cache", lines: [18, 26] },
    answer: [23],
    explain: "<p>Line 23 compares the entry's age with <code>ttl</code>.</p>",
  },
  "get-order": {
    kind: "order",
    prompt: "Put the steps of <code>get()</code> in order.",
    items: ["Look up the key", "Return None on a miss", "Check the entry's age",
            "Delete it if expired", "Return the value"],
    explain: "<p>Lookup, miss check, age check, lazy delete, return.</p>",
  },
  "match-parts": {
    kind: "match",
    prompt: "Match each method to its job.",
    pairs: [["<code>put</code>", "stores a value with a timestamp"],
            ["<code>get</code>", "returns a fresh value or None"],
            ["<code>__init__</code>", "sets ttl, clock and the empty dict"]],
  },
};

const DIAGRAMS = {
  overview: {
    width: 900, height: 300,
    nodes: [
      { id: "caller", label: "Caller", x: 130, y: 150, detail: "<p>Any code that wants a value.</p>" },
      { id: "cache", label: "TtlCache", sub: "cache/ttl_cache.py", x: 450, y: 150, w: 220,
        detail: "<p>Stores values with a timestamp.</p>", code: { ref: "ttl_cache", lines: [18, 26] } },
      { id: "clock", label: "clock()", x: 770, y: 150, detail: "<p>Injected time source.</p>" },
    ],
    edges: [
      { from: "caller", to: "cache", label: "get(key)" },
      { from: "cache", to: "clock", label: "now?" },
      { from: "cache", to: "caller", label: "value | None", bend: 60 },
    ],
    flows: [{ title: "A cache read", steps: [
      { nodes: ["caller", "cache"], edges: ["caller>cache"], text: "The caller asks for a key." },
      { nodes: ["cache", "clock"], edges: ["cache>clock"], text: "The cache asks the clock for the time." },
      { nodes: ["cache", "caller"], edges: ["cache>caller"], text: "It returns the value, or None.", show: "cache" },
    ] }],
  },
};

const CLIPS = {
  expiry: {
    title: "How an entry expires",
    scenes: [{ title: "Expiry", build(g, b) {
      const entry = box(g, "key → value", 960, 420, 520, 140, { size: 52 });
      const age = label(g, "", 960, 600, { size: 48, fill: COLORS.grey });
      const w_in = b.say("put() stores the value with the time it was stored.", 1);
      const w_age = b.say("Time passes. Nothing happens until someone reads the key.", 3);
      const w_gone = b.say("On the next get(), an entry older than ttl is deleted.", 1);
      const secs = track(0, [[w_age, 75]]);
      const tint = color_track(COLORS.blue, [[w_gone, COLORS.red]]);
      return t => {
        appear(entry.g, prog(w_in, t), 0, 30);
        age.textContent = `age: ${Math.round(secs(t))} s  (ttl = 60 s)`;
        age.style.opacity = prog(w_in, t);
        const c = tint(t);
        set(entry.rect, { fill: c, stroke: c });
        entry.g.style.opacity = 1 - 0.7 * prog([w_gone[1], w_gone[1] + 0.6], t);
      };
    } }],
  },
};

// Static drawings. Use paint.ink / paint.paper / paint.muted as style values so the drawing
// follows the page theme; plain hex colours stay fixed. Keep yellow and blue out (see module.css).
// PIC_KIT (tools/module_kit/pics_lib.js) has shared helpers: paint_el, txt, frame, bubble, thought.
const { paint_el, txt } = PIC_KIT;
const PICS = {
  stopwatch: {
    alt: "A stopwatch: every cache entry has a time limit.",
    caption: "Every entry gets a stopwatch.",
    width: 300, height: 300,
    draw(g, paint) {
      const ink = { fill: "none", "stroke-width": 8, "stroke-linecap": "round" };
      const face = el("circle", { cx: 150, cy: 165, r: 105, "stroke-width": 8 }, g);
      paint_el(face, paint.paper, paint.ink);
      for (const d of ["M150 60 v-25", "M125 32 h50", "M150 165 L 205 120"]) {
        paint_el(el("path", { d, ...ink }, g), undefined, paint.ink);
      }
      const arc = el("path", { d: "M150 165 m-75 0 a75 75 0 0 1 75 -75", ...ink, "stroke-width": 14 },
                     g);
      paint_el(arc, undefined, "#199e70");
      txt(g, "TTL", 150, 205, { size: 30, fill: paint.ink });  // text >= 28 units: see SKILL.md
    },
  },
};
