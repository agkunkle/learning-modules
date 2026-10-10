// Learning module runtime. Inlined by tools/module_kit/kit.py build after engine.js, EXCERPTS
// (from excerpts.json) and the module's own module.js, which may define:
//   META      {title, subtitle, minutes, audience, prereqs[], source, internal, objectives[]}
//   CHECKS    {id: {kind: choice|line|order|match, prompt, ...}}   (see SKILL.md)
//   NOTES     {key: [[line or "a-b", html], ...]}                  (code annotations, in order)
//   CLIPS     {name: {title, scenes: [{title, build(g, b) -> render(t)}]}}  (explainer engine)
//   DIAGRAMS  {name: {width, height, nodes, edges, groups, flows, intro}}
// The page body (content.html) places them with data-meta, data-code, data-check, data-clip,
// data-diagram and data-summary elements. Nothing is saved: a reload starts fresh.
//
// URL hash options (used by `kit.py check`): #debug (publish a JSON report), #reveal (show
// every answer), #at=<element id>, #y=<scroll px>, #theme=light|dark, #solo=clip:<name>&t=<s>,
// #solo=diagram:<name>&flow=<i>&step=<k>&node=<id>, #solo=check:<id>, #solo=code:<ref>.
(() => {
"use strict";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const params = new URLSearchParams(location.hash.slice(1));
const problems = [], warnings = [];
const problem = msg => problems.push(msg);
const warn = msg => warnings.push(msg);
const G = name => (typeof globalThis[name] !== "undefined" ? globalThis[name] : null);
const META_ = typeof META !== "undefined" ? META : { title: document.title };
const CHECKS_ = typeof CHECKS !== "undefined" ? CHECKS : {};
const NOTES_ = typeof NOTES !== "undefined" ? NOTES : {};
const CLIPS_ = typeof CLIPS !== "undefined" ? CLIPS : {};
const DIAGRAMS_ = typeof DIAGRAMS !== "undefined" ? DIAGRAMS : {};
const EXCERPTS_ = typeof EXCERPTS !== "undefined" ? EXCERPTS : {};
void G;

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "html") e.innerHTML = v;
    else if (k === "text") e.textContent = v;
    else if (k === "class") e.className = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid !== null && kid !== undefined && kid !== false) e.append(kid);
  }
  return e;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;",
                                                       '"': "&quot;" }[c]));
const strip_html = s => { const d = document.createElement("div"); d.innerHTML = s; return d.textContent; };
function hash_str(s) {
  let x = 2166136261;
  for (const c of String(s)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); }
  return (x >>> 0) || 1;
}
// Deterministic permutation of 0..n-1 (stable across reloads); never the identity when n > 1.
function shuffled(n, seed) {
  const idx = [...Array(n).keys()];
  let s = seed >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (n > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift());
  return idx;
}
function parse_range(r) {
  const [a, b] = String(r).split("-").map(Number);
  return [a, Number.isFinite(b) ? b : a];
}
// Run a render step; on failure record a problem and show it in place instead of the element.
function guarded(where, host, fn) {
  try { return fn(); } catch (e) {
    problem(`${where}: ${e.message}`);
    const box = h("div", { class: "callout gotcha", text: `Could not render ${where}: ${e.message}` });
    if (host && host.isConnected) host.replaceWith(box);
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Syntax highlighting (small, offline): python, bash, json; anything else is plain text.
// ---------------------------------------------------------------------------------------------

const PY_KW = new Set(("False None True and as assert async await break class continue def del " +
  "elif else except finally for from global if import in is lambda nonlocal not or pass raise " +
  "return try while with yield match case").split(" "));
const PY_BI = new Set(("self cls print len range isinstance dict list str int float bool tuple " +
  "set type super open sorted min max sum any all enumerate zip getattr setattr hasattr object " +
  "Exception ValueError TypeError KeyError RuntimeError OSError TimeoutError").split(" "));
const RULES = {
  python: [
    ["com", /#[^\n]*/y],
    ["str", /(?:[rRbBuUfF]{1,2})?(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/y],
    ["dec", /@[A-Za-z_][\w.]*/y],
    ["num", /\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?/y],
    ["word", /[A-Za-z_]\w*/y], ["sp", /\s+/y], ["pun", /./y]],
  bash: [
    ["com", /#[^\n]*/y], ["str", /"(?:\\.|[^"\\])*"|'[^']*'/y], ["kw", /--?[A-Za-z][\w-]*/y],
    ["num", /\d+(?:\.\d+)?/y], ["word", /[A-Za-z_][\w./-]*/y], ["sp", /\s+/y], ["pun", /./y]],
  json: [
    ["str", /"(?:\\.|[^"\\])*"/y], ["num", /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y],
    ["word", /[A-Za-z_]\w*/y], ["sp", /\s+/y], ["pun", /./y]],
};
function classify_py(word, prev, next_char) {
  if (PY_KW.has(word)) return "kw";
  if (prev === "def") return "fn";
  if (prev === "class") return "cls";
  if (PY_BI.has(word)) return "bi";
  if (next_char === "(") return "fn";
  if (/^[A-Z][a-z0-9]+[A-Z]/.test(word) || /^[A-Z][a-z]+$/.test(word)) return "cls";
  return null;
}
// Returns one HTML string per source line.
function highlight(text, lang) {
  if (lang === "diff") {
    return text.split("\n").map(line => {
      const cls = line.startsWith("@@") ? "hunk" : line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : null;
      return cls ? `<span class="tk-${cls}">${esc(line)}</span>` : esc(line);
    });
  }
  const rules = RULES[lang];
  const tokens = [];
  if (!rules) tokens.push([null, text]);
  else {
    let i = 0, prev = "";
    while (i < text.length) {
      let hit = false;
      for (const [type, re] of rules) {
        re.lastIndex = i;
        const m = re.exec(text);
        if (!m || !m[0].length) continue;
        let cls = type;
        if (type === "word") {
          cls = lang === "python" ? classify_py(m[0], prev, text[i + m[0].length])
              : lang === "json" && /^(true|false|null)$/.test(m[0]) ? "kw" : null;
          prev = m[0];
        } else if (type === "sp" || type === "pun") cls = null;
        tokens.push([cls, m[0]]);
        i += m[0].length;
        hit = true;
        break;
      }
      if (!hit) { tokens.push([null, text[i]]); i += 1; }
    }
  }
  const lines = [""];
  for (const [cls, str] of tokens) {
    str.split("\n").forEach((part, k) => {
      if (k > 0) lines.push("");
      if (part) lines[lines.length - 1] += cls ? `<span class="tk-${cls}">${esc(part)}</span>` : esc(part);
    });
  }
  return lines;
}

// ---------------------------------------------------------------------------------------------
// Code excerpts with numbered notes and a walk-through stepper.
// spec: {ref, lines: [a, b]} (an EXCERPTS entry, optionally a sub-range of file lines)
//    or {file, start, lang, text} (inline code).
// ---------------------------------------------------------------------------------------------

function code_lines(spec, where) {
  let src;
  if (spec.ref) {
    src = EXCERPTS_[spec.ref];
    if (!src) { problem(`${where}: unknown excerpt "${spec.ref}"`); return null; }
  } else {
    src = { file: spec.file || "", start: spec.start || 1, text: spec.text || "", lang: spec.lang };
  }
  const all = highlight(src.text.replace(/\n$/, ""), spec.lang || src.lang || "text");
  let a = src.start, b = src.start + all.length - 1;
  if (spec.lines) {
    const [la, lb] = spec.lines;
    if (la < a || lb > b || la > lb) problem(`${where}: lines ${la}-${lb} outside ${src.file}:${a}-${b}`);
    a = Math.max(a, la);
    b = Math.min(b, lb);
  }
  return { file: src.file, a, b, lang: spec.lang || src.lang || "text",
           rows: all.slice(a - src.start, b - src.start + 1) };
}

function render_code(spec, { notes = null, caption = null, where = "code" } = {}) {
  const src = code_lines(spec, where);
  if (!src) throw new Error(`no code for ${spec.ref || "inline excerpt"}`);
  const fig = h("figure", { class: "code" });
  fig.append(h("figcaption", {},
    h("span", { class: "path", text: src.file ? `${src.file}:${src.a}–${src.b}` : "" }),
    caption ? h("span", { class: "sp", html: caption }) : null));
  const tbody = h("tbody");
  const rows = new Map();
  src.rows.forEach((html, k) => {
    const ln = src.a + k;
    const diff_cls = src.lang !== "diff" ? null
      : html.startsWith('<span class="tk-add">') ? "d-add" : html.startsWith('<span class="tk-del">') ? "d-del" : null;
    const tr = h("tr", { "data-ln": ln, class: diff_cls }, h("td", { class: "ln", text: ln }), h("td", { class: "nt" }),
                 h("td", { class: "src", html: html || " " }));
    rows.set(ln, tr);
    tbody.append(tr);
  });
  fig.append(h("div", { class: "code-body" }, h("table", {}, tbody)));
  const api = { fig, rows, src, activate: () => {} };
  if (notes && notes.length) attach_notes(api, notes, where);
  return api;
}

function attach_notes(api, notes, where) {
  const items = notes.map(([range, html], k) => ({ range: parse_range(range), html, k }));
  const list = h("ol", { class: "notes" });
  const status = h("span", { class: "txt" });
  let active = -1;
  function activate(k) {
    active = k;
    api.rows.forEach(tr => tr.classList.remove("on", "dim"));
    $$("button.pin", api.fig).forEach(p => p.classList.toggle("active", +p.dataset.k === k));
    [...list.children].forEach(li => li.classList.toggle("active", +li.dataset.k === k));
    if (k >= 0) {
      const [a, b] = items[k].range;
      api.rows.forEach((tr, ln) => tr.classList.add(ln >= a && ln <= b ? "on" : "dim"));
    }
    status.textContent = k >= 0 ? `Note ${k + 1} of ${items.length}`
                                : `${items.length} notes: step through them or click a number`;
  }
  const toggle = k => activate(active === k ? -1 : k);
  for (const it of items) {
    const tr = api.rows.get(it.range[0]);
    if (!tr) { problem(`${where}: note ${it.k + 1} (line ${it.range[0]}) is outside the excerpt`); continue; }
    tr.querySelector(".nt").append(h("button", { class: "pin", "data-k": it.k, text: it.k + 1,
                                                 title: "Show note", onclick: () => toggle(it.k) }));
    list.append(h("li", { "data-k": it.k, onclick: () => toggle(it.k) },
                  h("span", { class: "pin", text: it.k + 1 }), h("div", { html: it.html })));
  }
  const n = items.length;
  api.fig.append(h("div", { class: "walk" },
    h("button", { class: "btn", text: "◀ Prev", onclick: () => activate(active <= 0 ? n - 1 : active - 1) }),
    h("button", { class: "btn", text: "Next ▶", onclick: () => activate((active + 1) % n) }),
    h("button", { class: "btn", text: "Show all", onclick: () => activate(-1) }),
    status), list);
  api.activate = activate;
  activate(-1);
}

// ---------------------------------------------------------------------------------------------
// Checks. Each kind: validate, correct(spec) -> answer, wrong(spec) -> answer|null,
// grade(spec, answer) -> bool, render(box, spec, ctx) -> {read, set, mark, lock}.
// ---------------------------------------------------------------------------------------------

const KIND_LABEL = { choice: "Pick one answer", multi: "Pick every answer that is true",
                     line: "Click the line in the code", order: "Drag or move the items into order",
                     match: "Choose a match for each row" };
const KINDS = {
  choice: {
    validate(spec, where) {
      if (!Array.isArray(spec.options) || spec.options.length < 2) return problem(`${where}: needs 2+ options`);
      if (!spec.options.some(o => o.correct)) problem(`${where}: no option is marked correct`);
      if (spec.options.every(o => o.correct)) problem(`${where}: every option is correct`);
      spec.options.forEach((o, i) => { if (!o.why) warn(`${where}: option ${i + 1} has no "why"`); });
    },
    correct: spec => spec.options.map((o, i) => (o.correct ? i : -1)).filter(i => i >= 0),
    wrong: spec => { const w = spec.options.findIndex(o => !o.correct); return w >= 0 ? [w] : null; },
    grade(spec, ans) {
      const c = KINDS.choice.correct(spec);
      return ans.length === c.length && c.every(i => ans.includes(i));
    },
    render(box, spec, ctx) {
      const order = spec.shuffle === false ? spec.options.map((_, i) => i)
                                           : shuffled(spec.options.length, hash_str(ctx.id));
      const items = order.map(i => {
        const o = spec.options[i];
        const input = h("input", { type: ctx.multi ? "checkbox" : "radio", name: `q-${ctx.id}`,
                                   value: i, onchange: ctx.on_change });
        const mk = h("span", { class: "mk" });
        const opt = h("label", { class: "opt" }, input,
                      h("div", {}, h("div", { html: o.text }), h("div", { class: "why", html: o.why || "" })), mk);
        return { i, input, opt, mk };
      });
      box.append(h("ul", { class: "opts" }, items.map(x => h("li", {}, x.opt))));
      return {
        read: () => { const s = items.filter(x => x.input.checked).map(x => x.i); return s.length ? s : null; },
        set: ans => items.forEach(x => { x.input.checked = ans.includes(x.i); }),
        mark: (ans, full) => items.forEach(x => {
          const o = spec.options[x.i];
          x.opt.classList.remove("right", "wrong", "show");
          x.mk.textContent = "";
          if (!ans) return;
          const sel = ans.includes(x.i);
          if (sel || (full && o.correct)) {
            x.opt.classList.add(o.correct ? "right" : "wrong");
            x.mk.textContent = o.correct ? "✓" : "✗";
          }
          if (sel || full) x.opt.classList.add("show");
        }),
        lock: () => items.forEach(x => { x.input.disabled = true; }),
      };
    },
  },
  line: {
    validate(spec, where) {
      if (!spec.code) problem(`${where}: a "line" check needs code`);
      if (!Array.isArray(spec.answer) || !spec.answer.length) problem(`${where}: needs answer: [line, ...]`);
    },
    correct: spec => spec.answer.slice(),
    wrong: spec => [Math.max(...spec.answer) + 100000],
    grade: (spec, ans) => ans.length === spec.answer.length && spec.answer.every(l => ans.includes(l)),
    render(box, spec, ctx) {
      const rows = ctx.code ? ctx.code.rows : new Map();
      spec.answer.forEach(l => { if (!rows.has(l)) problem(`${ctx.where}: answer line ${l} is not in the code shown`); });
      const picked = new Set();
      const single = spec.answer.length === 1;
      let locked = false;
      const paint = () => rows.forEach((tr, ln) => tr.classList.toggle("picked", picked.has(ln)));
      rows.forEach((tr, ln) => tr.addEventListener("click", () => {
        if (locked) return;
        if (picked.has(ln)) picked.delete(ln);
        else { if (single) picked.clear(); picked.add(ln); }
        paint();
        ctx.on_change();
      }));
      if (!single) box.querySelector(".kind").textContent = `Click the ${spec.answer.length} lines in the code`;
      return {
        read: () => (picked.size ? [...picked] : null),
        set: ans => { picked.clear(); ans.forEach(l => picked.add(l)); paint(); },
        mark: (ans, full) => rows.forEach((tr, ln) => {
          tr.classList.remove("right", "wrong");
          if (!ans) return;
          const is = spec.answer.includes(ln);
          if (ans.includes(ln) || (full && is)) tr.classList.add(is ? "right" : "wrong");
        }),
        lock: () => { locked = true; },
      };
    },
  },
  order: {
    validate(spec, where) {
      if (!Array.isArray(spec.items) || spec.items.length < 3) problem(`${where}: needs 3+ items`);
    },
    correct: spec => spec.items.map((_, i) => i),
    wrong: spec => { const a = spec.items.map((_, i) => i); [a[0], a[1]] = [a[1], a[0]]; return a; },
    grade: (spec, ans) => ans.every((v, i) => v === i),
    hint: (spec, ans) => `${ans.filter((v, i) => v === i).length} of ${ans.length} are in the right place.`,
    render(box, spec, ctx) {
      const ol = h("ol", { class: "order" });
      let locked = false;
      const renumber = () => [...ol.children].forEach((li, k) => { li.querySelector(".pos").textContent = `${k + 1}.`; });
      const move = (li, d) => {
        if (locked) return;
        if (d < 0 && li.previousElementSibling) ol.insertBefore(li, li.previousElementSibling);
        else if (d > 0 && li.nextElementSibling) ol.insertBefore(li.nextElementSibling, li);
        renumber();
        ctx.on_change();
      };
      const drag = (e, li) => {
        if (locked) return;
        e.preventDefault();
        li.classList.add("dragging");
        const on_move = ev => {
          const over = [...ol.children].find(o => {
            if (o === li) return false;
            const r = o.getBoundingClientRect();
            return ev.clientY > r.top && ev.clientY < r.bottom;
          });
          if (!over) return;
          const r = over.getBoundingClientRect();
          ol.insertBefore(li, ev.clientY < r.top + r.height / 2 ? over : over.nextSibling);
          renumber();
        };
        const on_up = () => {
          li.classList.remove("dragging");
          window.removeEventListener("pointermove", on_move);
          window.removeEventListener("pointerup", on_up);
          ctx.on_change();
        };
        window.addEventListener("pointermove", on_move);
        window.addEventListener("pointerup", on_up);
      };
      for (const i of shuffled(spec.items.length, hash_str(ctx.id))) {
        const li = h("li", { "data-i": i });
        li.append(h("span", { class: "grip", text: "⠿", title: "Drag to reorder",
                              onpointerdown: e => drag(e, li) }),
                  h("span", { class: "pos" }), h("span", { class: "txt", html: spec.items[i] }),
                  h("button", { text: "↑", "aria-label": "Move up", onclick: () => move(li, -1) }),
                  h("button", { text: "↓", "aria-label": "Move down", onclick: () => move(li, 1) }));
        ol.append(li);
      }
      renumber();
      box.append(ol);
      return {
        read: () => [...ol.children].map(li => +li.dataset.i),
        set: ans => { ans.forEach(i => ol.append(ol.querySelector(`[data-i="${i}"]`))); renumber(); },
        mark: ans => [...ol.children].forEach((li, k) => {
          li.classList.remove("right", "wrong");
          if (ans) li.classList.add(+li.dataset.i === k ? "right" : "wrong");
        }),
        lock: () => { locked = true; $$("button", ol).forEach(b => { b.disabled = true; }); },
      };
    },
  },
  match: {
    validate(spec, where) {
      if (!Array.isArray(spec.pairs) || spec.pairs.length < 2) return problem(`${where}: needs 2+ pairs`);
      const rights = spec.pairs.map(p => strip_html(p[1]));
      if (new Set(rights).size !== rights.length) problem(`${where}: right-hand answers must be unique`);
    },
    correct: spec => spec.pairs.map((_, i) => i),
    wrong: spec => { const a = spec.pairs.map((_, i) => i); [a[0], a[1]] = [a[1], a[0]]; return a; },
    grade: (spec, ans) => ans.every((v, i) => v === i),
    hint: (spec, ans) => `${ans.filter((v, i) => v === i).length} of ${ans.length} are matched correctly.`,
    render(box, spec, ctx) {
      const order = shuffled(spec.pairs.length, hash_str(ctx.id + "/match"));
      const rows = spec.pairs.map(([left], i) => {
        const sel = h("select", { onchange: ctx.on_change, "aria-label": `Match for item ${i + 1}` },
                      h("option", { value: "-1", text: "Choose…" }),
                      order.map(j => h("option", { value: j, text: strip_html(spec.pairs[j][1]) })));
        return { tr: h("tr", {}, h("td", { html: left }), h("td", {}, sel)), sel };
      });
      box.append(h("table", { class: "match" }, h("tbody", {}, rows.map(r => r.tr))));
      return {
        read: () => { const a = rows.map(r => +r.sel.value); return a.some(v => v < 0) ? null : a; },
        set: ans => rows.forEach((r, i) => { r.sel.value = ans[i]; }),
        mark: ans => rows.forEach((r, i) => {
          r.tr.classList.remove("right", "wrong");
          if (ans) r.tr.classList.add(ans[i] === i ? "right" : "wrong");
        }),
        lock: () => rows.forEach(r => { r.sel.disabled = true; }),
      };
    },
  },
};

const STATE = {};      // check id -> {attempts, solved, first_try, revealed, section, prompt}
const REVEALERS = {};  // check id -> function that shows the answer

function render_check(id, spec, host) {
  const where = `check "${id}"`;
  const kind = KINDS[spec.kind];
  if (!kind) throw new Error(`unknown kind "${spec.kind}"`);
  kind.validate(spec, where);
  const multi = spec.kind === "choice" && KINDS.choice.correct(spec).length > 1;
  const box = h("div", { class: `check${spec.kind === "line" ? " line-pick" : ""}`, id: `check-${id}` });
  box.append(h("div", { class: "kind", text: spec.label || KIND_LABEL[multi ? "multi" : spec.kind] }),
             h("div", { class: "prompt", html: spec.prompt || "" }));
  host.replaceWith(box);
  let code = null;
  if (spec.code) {
    code = render_code(spec.code, { where, caption: spec.code.caption });
    box.append(code.fig);
  }
  const section = box.closest("section");
  const st = STATE[id] = { attempts: 0, solved: false, first_try: null, revealed: false,
                           section: section ? section.id : null, prompt: strip_html(spec.prompt || id) };
  const result = h("span", { class: "result", "aria-live": "polite" });
  const explain = h("div", { class: "explain", html: spec.explain || "" });
  const done = () => st.solved || st.revealed;
  const ui = kind.render(box, spec, {
    id, code, multi, where,
    on_change: () => { if (!done()) { ui.mark(null); result.textContent = ""; result.className = "result"; } },
  });
  const btn_check = h("button", { class: "btn primary", text: "Check" });
  const btn_show = h("button", { class: "btn", text: "Show answer", hidden: true });
  box.append(h("div", { class: "actions" }, btn_check, btn_show, result), explain);
  const finish = () => {
    explain.classList.add("show");
    btn_check.disabled = true;
    btn_show.hidden = true;
    ui.lock();
  };
  btn_check.onclick = () => {
    const ans = ui.read();
    if (!ans) { result.textContent = "Answer every part first."; result.className = "result"; return; }
    st.attempts += 1;
    const ok = kind.grade(spec, ans);
    if (st.first_try === null) st.first_try = ok;
    if (ok) {
      st.solved = true;
      ui.mark(ans, true);
      finish();
      result.textContent = st.attempts === 1 ? "✓ Correct." : `✓ Correct, on attempt ${st.attempts}.`;
      result.className = "result ok";
    } else {
      ui.mark(ans, false);
      result.textContent = `✗ ${kind.hint ? kind.hint(spec, ans) : "Not quite. Change your answer and check again."}`;
      result.className = "result bad";
      btn_show.hidden = false;
    }
    changed();
  };
  const reveal = () => {
    if (done()) return;
    st.revealed = true;
    const ans = kind.correct(spec);
    ui.set(ans);
    ui.mark(ans, true);
    finish();
    result.textContent = "◐ Answer shown.";
    result.className = "result";
    changed();
  };
  btn_show.onclick = reveal;
  REVEALERS[id] = reveal;
}

function self_test() {
  return Object.entries(CHECKS_).map(([id, spec]) => {
    const kind = KINDS[spec.kind];
    if (!kind) return { id, ok: false, why: "unknown kind" };
    try {
      const right_ok = kind.grade(spec, kind.correct(spec));
      const wrong = kind.wrong(spec);
      const wrong_ok = wrong === null ? true : !kind.grade(spec, wrong);
      return { id, ok: right_ok && wrong_ok, right_ok, wrong_ok };
    } catch (e) {
      return { id, ok: false, why: e.message };
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Clips: embedded silent explainer players (engine.js scenes), one playing at a time.
// ---------------------------------------------------------------------------------------------

const PLAYERS = {};
const ICON = { play: "M6 4v16l14-8z", pause: "M6 5h4v14H6zM14 5h4v14h-4z",
               replay: "M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" };
const icon = n => `<svg viewBox="0 0 24 24"><path d="${ICON[n]}"/></svg>`;
const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

function make_clip(name, def, host) {
  const svg = el("svg", { viewBox: "0 0 1920 1080", role: "img", "aria-label": `Animation: ${def.title}` });
  const cap_span = h("span");
  const cap = h("div", { class: "clip-cap" }, cap_span);
  const poster_d = h("div", { class: "d" });
  const poster = h("div", { class: "clip-poster" }, h("div", { class: "t", text: def.title }), poster_d,
                   h("div", { class: "play", html: icon("play") }));
  const stage = h("div", { class: "clip-stage fresh", tabindex: 0, role: "button",
                           "aria-label": `Play or pause: ${def.title}` }, svg, cap, poster);
  const b_play = h("button", { title: "Play/pause (Space)", html: icon("play") });
  const b_cc = h("button", { title: "Captions", text: "CC" });
  const fill = h("div", { class: "fill" });
  const knob = h("div", { class: "knob" });
  const scrub = h("div", { class: "clip-scrub", role: "slider", "aria-label": "Seek" },
                  h("div", { class: "rail" }, fill), knob);
  const time = h("span", { class: "time" });
  const fig = h("figure", { class: "clip wide", id: `clip-${name}` }, stage,
                h("div", { class: "clip-bar" }, b_play, time, scrub, b_cc),
                def.caption ? h("figcaption", { html: def.caption }) : null);
  host.replaceWith(fig);  // in the document before building, so scenes can measure text

  const scenes = [], cues = [];
  let total = 0;
  def.scenes.forEach((sd, i) => {
    const g = el("g", {}, svg);
    const b = new Beats();
    const render = sd.build(g, b);
    const last = i === def.scenes.length - 1;
    const fade = last ? 0 : SCENE_FADE;
    const dur = b.t + (last ? END_HOLD : 0.2 + SCENE_FADE);
    scenes.push({ title: sd.title, g, render, start: total, dur, fade });
    for (const c of b.cues) cues.push({ ...c, start: c.start + total, end: c.end + total });
    total += dur;
  });
  poster_d.textContent = `${fmt(total)}, silent, with captions. Click to play.`;

  let now = 0, playing = false, last_ts = null, cc = true;
  const scene_at = t => {
    for (let i = 0; i < scenes.length; i++) if (t < scenes[i].start + scenes[i].dur) return i;
    return scenes.length - 1;
  };
  function render_at(t) {
    const i = scene_at(t);
    scenes.forEach((s, j) => { s.g.style.display = j === i ? "" : "none"; });
    const s = scenes[i], local = t - s.start;
    s.render(local);
    s.g.style.opacity = s.fade ? 1 - prog([s.dur - s.fade, s.dur], local) : 1;
    const cue = cues.find(c => t >= c.start && t < c.end);
    const text = cue ? cue.text : "";
    if (cap_span.textContent !== text) cap_span.textContent = text;
    const pct = `${(100 * t / total).toFixed(3)}%`;
    fill.style.width = pct;
    knob.style.left = pct;
    time.textContent = `${fmt(t)} / ${fmt(total)}`;
    b_play.innerHTML = icon(playing ? "pause" : t >= total ? "replay" : "play");
  }
  function tick(ts) {
    if (!playing) return;
    if (last_ts !== null) now = Math.min(total, now + Math.min(0.1, (ts - last_ts) / 1000));
    last_ts = ts;
    render_at(now);
    if (now >= total) { pause(); return; }
    requestAnimationFrame(tick);
  }
  function play() {
    Object.values(PLAYERS).forEach(p => { if (p.name !== name) p.pause(); });
    if (now >= total) now = 0;
    poster.classList.add("hidden");
    stage.classList.remove("fresh");
    playing = true;
    last_ts = null;
    requestAnimationFrame(tick);
  }
  function pause() { playing = false; render_at(now); }
  function seek(t) {
    poster.classList.add("hidden");
    stage.classList.remove("fresh");
    now = Math.min(total, Math.max(0, t));
    render_at(now);
  }
  const toggle = () => (playing ? pause() : play());
  stage.onclick = toggle;
  b_play.onclick = toggle;
  b_cc.onclick = () => { cc = !cc; cap.classList.toggle("off", !cc); b_cc.classList.toggle("off", !cc); };
  stage.addEventListener("keydown", e => {
    if (e.key === " " || e.key === "k") toggle();
    else if (e.key === "ArrowLeft") seek(now - 5);
    else if (e.key === "ArrowRight") seek(now + 5);
    else return;
    e.preventDefault();
  });
  let scrubbing = false, resume = false;
  const seek_from = e => {
    const r = scrub.firstElementChild.getBoundingClientRect();
    seek(clamp01((e.clientX - r.left) / r.width) * total);
  };
  scrub.addEventListener("pointerdown", e => {
    scrubbing = true; resume = playing; playing = false;
    scrub.setPointerCapture(e.pointerId);
    seek_from(e);
  });
  scrub.addEventListener("pointermove", e => { if (scrubbing) seek_from(e); });
  scrub.addEventListener("pointerup", () => { scrubbing = false; if (resume && now < total) play(); });
  // Pause when scrolled mostly out of view.
  new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting && playing) pause(); }),
                           { threshold: 0.25 }).observe(stage);
  render_at(0);
  PLAYERS[name] = { name, total, cues, scenes: scenes.map(s => ({ title: s.title, start: s.start, dur: s.dur })),
                    play, pause, seek };
}

// ---------------------------------------------------------------------------------------------
// Interactive diagrams: nodes you can click for details, edges, groups, and step-through flows.
// ---------------------------------------------------------------------------------------------

const DIAGRAM_API = {};

function make_diagram(name, def, host) {
  const where = `diagram "${name}"`;
  const VW = def.width || 1000, VH = def.height || 520;
  const svg = el("svg", { viewBox: `0 0 ${VW} ${VH}`, role: "group", "aria-label": def.title || name });
  const panel = h("div", { class: "dg-panel", "aria-live": "polite" });
  const intro = def.intro || "<p class='hint'>Click a component to see what it does and where it lives.</p>";
  const nodes = {}, edges = {};
  for (const gr of def.groups || []) {
    el("rect", { class: "dg-group", x: gr.x, y: gr.y, width: gr.w, height: gr.h, rx: 6 }, svg);
    const t = el("text", { class: "dg-group-label", x: gr.x + 14, y: gr.y + 24 }, svg);
    t.textContent = gr.label;
  }
  const edge_layer = el("g", {}, svg);
  for (const n of def.nodes) {
    const w = n.w || 180, hh = n.h || (n.sub ? 64 : 52);
    const g = el("g", { class: `dg-node${n.kind === "device" ? " device" : ""}`, tabindex: 0,
                        role: "button", "aria-label": n.label }, svg);
    // Highlighter mark behind the box: shown when a flow step lights the node.
    el("rect", { class: "hl", x: n.x - w / 2 - 7, y: n.y - hh / 2 - 7, width: w + 14, height: hh + 14,
                 rx: 4 }, g);
    el("rect", { class: "box", x: n.x - w / 2, y: n.y - hh / 2, width: w, height: hh,
                 rx: n.kind === "device" ? 2 : 6 }, g);
    const t = el("text", { x: n.x, y: n.sub ? n.y - 10 : n.y }, g);
    t.textContent = n.label;
    if (n.sub) {
      const s = el("text", { class: "sub", x: n.x, y: n.y + 13 }, g);
      s.textContent = n.sub;
    }
    nodes[n.id] = { def: n, g, w, h: hh };
    g.addEventListener("click", () => select(n.id));
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(n.id); } });
  }
  const border = (n, tx, ty) => {  // point on node n's border toward (tx, ty)
    const cx = n.def.x, cy = n.def.y, dx = tx - cx, dy = ty - cy;
    const s = Math.min(dx ? (n.w / 2 + 4) / Math.abs(dx) : Infinity, dy ? (n.h / 2 + 4) / Math.abs(dy) : Infinity);
    return [cx + dx * s, cy + dy * s];
  };
  for (const e of def.edges || []) {
    const a = nodes[e.from], b = nodes[e.to];
    if (!a || !b) { problem(`${where}: edge ${e.from}>${e.to} names a missing node`); continue; }
    const key = `${e.from}>${e.to}`;
    const g = el("g", { class: "dg-edge" }, edge_layer);
    const mx = (a.def.x + b.def.x) / 2, my = (a.def.y + b.def.y) / 2;
    const len = Math.hypot(b.def.x - a.def.x, b.def.y - a.def.y) || 1;
    const bend = e.bend || 0;
    const cx = mx - (b.def.y - a.def.y) / len * bend, cy = my + (b.def.x - a.def.x) / len * bend;
    const p1 = border(a, bend ? cx : b.def.x, bend ? cy : b.def.y);
    const p2 = border(b, bend ? cx : a.def.x, bend ? cy : a.def.y);
    const d = bend ? `M${p1} Q${cx},${cy} ${p2}` : `M${p1} L${p2}`;
    el("path", { class: "hl", d, pathLength: 1 }, g);  // highlighter stroke, drawn on when lit
    el("path", { class: "wire", d }, g);
    const ang = Math.atan2(p2[1] - (bend ? cy : p1[1]), p2[0] - (bend ? cx : p1[0]));
    const hl = 11, hw = 6;
    const bx = p2[0] - Math.cos(ang) * hl, by = p2[1] - Math.sin(ang) * hl;
    el("polygon", { points: `${p2} ${bx + Math.sin(ang) * hw},${by - Math.cos(ang) * hw} ` +
                            `${bx - Math.sin(ang) * hw},${by + Math.cos(ang) * hw}` }, g);
    if (e.label) {
      const lx = bend ? 0.25 * p1[0] + 0.5 * cx + 0.25 * p2[0] : (p1[0] + p2[0]) / 2;
      const ly = (bend ? 0.25 * p1[1] + 0.5 * cy + 0.25 * p2[1] : (p1[1] + p2[1]) / 2) - 6;
      for (const cls of ["bg", ""]) {
        const t = el("text", { class: cls, x: lx, y: ly }, g);
        t.textContent = e.label;
      }
    }
    edges[key] = g;
  }
  function select(id) {
    Object.entries(nodes).forEach(([k, n]) => n.g.classList.toggle("sel", k === id));
    panel.replaceChildren();
    if (!id) { panel.innerHTML = intro; return; }
    const n = nodes[id].def;
    panel.append(h("h4", { text: n.label }));
    if (n.files) panel.append(h("div", { class: "files", text: n.files.join("\n"), style: "white-space: pre-line" }));
    if (n.detail) panel.append(h("div", { html: n.detail }));
    if (n.code) {
      guarded(`${where} node ${id} code`, null, () => panel.append(render_code(n.code, {
        where: `${where} node ${id}`, notes: n.code.notes ? NOTES_[n.code.notes] : null }).fig));
    }
  }
  // Flows: step-through walks over nodes and edges.
  const flows = def.flows || [];
  let flow_i = 0, step = -1;
  const flow_txt = h("div", { class: "txt" });
  const stepno = h("span", { class: "stepno" });
  for (const f of flows) {
    f.steps.forEach((s, k) => {
      (s.nodes || []).forEach(id => { if (!nodes[id]) problem(`${where} flow "${f.title}" step ${k + 1}: no node ${id}`); });
      (s.edges || []).forEach(key => { if (!edges[key]) problem(`${where} flow "${f.title}" step ${k + 1}: no edge ${key}`); });
    });
  }
  function apply_step() {
    const f = flows[flow_i];
    const s = f && step >= 0 ? f.steps[step] : null;
    Object.entries(nodes).forEach(([k, n]) => {
      n.g.classList.toggle("lit", !!s && (s.nodes || []).includes(k));
      n.g.classList.toggle("faded", !!s && !(s.nodes || []).includes(k));
    });
    Object.entries(edges).forEach(([k, g]) => {
      g.classList.toggle("lit", !!s && (s.edges || []).includes(k));
      g.classList.toggle("faded", !!s && !(s.edges || []).includes(k));
    });
    if (f) {
      stepno.textContent = s ? `Step ${step + 1} of ${f.steps.length}` : `${f.steps.length} steps`;
      flow_txt.innerHTML = s ? s.text : (f.intro || `Press <b>Next</b> to walk through: ${esc(f.title)}.`);
    }
    if (s && s.show) select(s.show);
  }
  const children = [h("div", { class: "dg-svg" }, svg)];
  let pick = null;
  if (flows.length) {
    pick = flows.length > 1
      ? h("select", { "aria-label": "Choose a flow", onchange: e => { flow_i = +e.target.value; step = -1; apply_step(); } },
          flows.map((f, i) => h("option", { value: i, text: f.title })))
      : h("strong", { text: flows[0].title });
    const n_steps = () => flows[flow_i].steps.length;
    children.push(h("div", { class: "dg-flow" }, pick,
      h("button", { class: "btn", text: "◀ Prev", onclick: () => { step = Math.max(-1, step - 1); apply_step(); } }),
      h("button", { class: "btn primary", text: "Next ▶", onclick: () => { step = Math.min(n_steps() - 1, step + 1); apply_step(); } }),
      h("button", { class: "btn", text: "Reset", onclick: () => { step = -1; apply_step(); select(null); } }),
      stepno, flow_txt));
  }
  children.push(panel);
  const fig = h("figure", { class: "diagram wide", id: `diagram-${name}` }, ...children);
  if (def.caption) fig.append(h("figcaption", { html: def.caption, style: "padding: 0 0 8px" }));
  host.replaceWith(fig);
  select(null);
  apply_step();
  DIAGRAM_API[name] = {
    flows: flows.map(f => ({ title: f.title, steps: f.steps.length })),
    nodes: Object.keys(nodes),
    go(fi, k) {
      flow_i = Math.max(0, Math.min(flows.length - 1, fi));
      step = Math.max(-1, Math.min(flows[flow_i].steps.length - 1, k));
      if (pick && pick.tagName === "SELECT") pick.value = flow_i;
      apply_step();
    },
    select,
  };
}

// ---------------------------------------------------------------------------------------------
// Header, sidebar, progress, summaries.
// ---------------------------------------------------------------------------------------------

function render_header(host) {
  const m = META_;
  host.append(h("h1", { text: m.title }));
  if (m.subtitle) host.append(h("p", { class: "lead", html: m.subtitle }));
  const bits = [];
  if (m.minutes) bits.push(`About ${m.minutes} minutes`);
  if (m.audience) bits.push(`For: ${m.audience}`);
  if (m.source) bits.push(`Source: ${m.source}`);
  if (m.internal) bits.push("<span class='internal'>Team-internal. Do not share it outside the team.</span>");
  host.append(h("ul", { class: "mod-meta" }, bits.map(b => h("li", { html: b }))));
  if (m.prereqs && m.prereqs.length) {
    host.append(h("p", {}, h("strong", { text: "You should already know: " }), h("span", { html: m.prereqs.join("; ") })));
  }
  if (m.objectives && m.objectives.length) {
    host.append(h("div", { class: "objectives" }, h("h3", { text: "By the end you can" }),
                  h("ul", {}, m.objectives.map(o => h("li", { html: o })))));
  }
  host.append(h("div", { class: "callout tip" }, h("span", { class: "ttl", text: "How this module works" }),
    h("span", { html: "Read top to bottom. The checks are for you: answer, press <b>Check</b>, " +
      "and retry as often as you like. The sidebar shows your progress. Nothing is saved or sent " +
      "anywhere; reloading the page starts fresh." })));
}

let sections = [];
const visited = new Set();

function build_sidebar() {
  sections = $$("main section[id]");
  let num = 0;
  const toc = h("ul", { id: "toc" });
  for (const s of sections) {
    const h2 = s.querySelector("h2");
    const title = s.dataset.title || (h2 ? h2.textContent : s.id);
    if (!s.dataset.title && !h2) warn(`section "${s.id}" has no h2 or data-title`);
    s.dataset.title = title;  // before numbering, so reports and summaries use the bare title
    let label = title;
    if (s.dataset.num !== "none") {
      num += 1;
      if (h2) h2.prepend(h("span", { class: "sec-num", text: `${num}`, "aria-hidden": "true" }));
      label = `${num}. ${title}`;
    }
    s._toc = h("a", { href: `#${s.id}` }, h("span", { class: "st", text: "○" }), h("span", { text: label }),
               h("span", { class: "cnt" }));
    s._toc.addEventListener("click", e => {
      e.preventDefault();
      s.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${s.id}`);
    });
    toc.append(h("li", {}, s._toc));
  }
  const theme_btn = h("button", { class: "btn", id: "theme-btn" });
  const sidebar = h("aside", { id: "sidebar" },
    h("div", { class: "mod-title" }, META_.title),
    h("div", { id: "progress" },
      h("div", { class: "bar", role: "meter", "aria-label": "Checks done", "aria-valuemin": 0 }, h("div")),
      h("div", { id: "progress-txt" }), h("div", { id: "progress-first" })),
    h("nav", { "aria-label": "Sections" }, toc),
    h("ul", { class: "legend" }, [["○", "not read"], ["◔", "read, checks open"], ["●", "done"],
                                   ["◐", "done, worth a second look"]]
      .map(([i, t]) => h("li", {}, h("span", { class: "st", text: i }), t))),
    h("div", { class: "tools" }, theme_btn,
      h("button", { class: "btn", text: "Start over", onclick: () => {
        if (confirm("Clear all answers and start over?")) { history.replaceState(null, "", " "); location.reload(); }
      } })));
  document.body.prepend(sidebar);
  return theme_btn;
}

function section_checks(id) { return Object.entries(STATE).filter(([, st]) => st.section === id); }

function update_toc() {
  const mark_y = window.innerHeight * 0.35;
  let current = sections[0];
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.7) visited.add(s.id);
    if (r.top <= mark_y) current = s;
  }
  for (const s of sections) {
    const cs = section_checks(s.id);
    const fin = cs.filter(([, st]) => st.solved || st.revealed);
    const clean = fin.every(([, st]) => st.first_try && !st.revealed);
    let icon_ = "○", cls = "";
    if (cs.length && fin.length === cs.length) { icon_ = clean ? "●" : "◐"; cls = clean ? "done" : "missed"; }
    else if (visited.has(s.id)) { icon_ = cs.length ? "◔" : "●"; cls = cs.length ? "visited" : "done"; }
    const st = s._toc.querySelector(".st");
    st.textContent = icon_;
    st.className = `st ${cls}`;
    s._toc.querySelector(".cnt").textContent = cs.length ? `${fin.length}/${cs.length}` : "";
    s._toc.classList.toggle("current", s === current);
  }
}

function update_progress() {
  const all = Object.values(STATE);
  const solved = all.filter(s => s.solved || s.revealed).length;
  const first = all.filter(s => s.first_try).length;
  const txt = $("#progress-txt");
  if (txt) txt.textContent = `${solved} of ${all.length} checks done`;
  const fst = $("#progress-first");
  if (fst) fst.textContent = `${first} right on the first try`;
  const bar = $("#progress .bar");
  if (bar) {
    bar.setAttribute("aria-valuemax", all.length);
    bar.setAttribute("aria-valuenow", solved);
    bar.firstChild.style.width = `${all.length ? 100 * solved / all.length : 0}%`;
  }
}

function render_summary(host) {
  const scope = host.dataset.summary || "all";
  const entries = Object.entries(STATE).filter(([, st]) => scope === "all" || st.section === scope);
  const first = entries.filter(([, st]) => st.first_try).length;
  const solved = entries.filter(([, st]) => st.solved).length;
  const shown = entries.filter(([, st]) => st.revealed).length;
  const open_ = entries.filter(([, st]) => !st.solved && !st.revealed);
  const revisit = entries.filter(([, st]) => st.first_try === false || st.revealed);
  const title_of = id => { const s = sections.find(x => x.id === id); return s ? (s.dataset.title || s.querySelector("h2")?.textContent || id) : ""; };
  const link = ([id, st]) => h("li", {}, h("a", { href: `#check-${id}`, text: `${title_of(st.section).replace(/^\d+\./, "").trim()}: ${st.prompt.slice(0, 80)}${st.prompt.length > 80 ? "…" : ""}` }));
  host.replaceChildren(
    h("div", { class: "hero" }, h("span", { class: "big", text: `${first} of ${entries.length}` }),
      h("span", { class: "lbl", text: "right on the first try" })),
    h("ul", { class: "counts" }, h("li", { text: `${solved} solved` }),
      h("li", { text: `${shown} answers shown` }), h("li", { text: `${open_.length} not answered yet` })),
    revisit.length ? h("div", {}, h("p", { html: "<b>Worth revisiting:</b>" }), h("ul", {}, revisit.map(link))) : null,
    open_.length && scope !== "all" ? h("div", {}, h("p", { html: "<b>Not answered yet:</b>" }), h("ul", {}, open_.map(link))) : null,
    !open_.length && !revisit.length && entries.length ? h("p", { text: "Everything right on the first try. Nice work." }) : null);
}

function changed() {
  update_toc();
  update_progress();
  $$(".summary-host").forEach(render_summary);
}

// ---------------------------------------------------------------------------------------------
// Boot.
// ---------------------------------------------------------------------------------------------

let theme = params.get("theme") || "auto";
const apply_theme = btn => {
  const dark = theme === "dark" || (theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  if (btn) btn.textContent = `Theme: ${theme}`;
};
apply_theme(null);
document.title = META_.title;

$$("[data-meta]").forEach(host => guarded("header", host, () => render_header(host)));
$$("[data-code]").forEach(host => guarded(`code "${host.dataset.code}"`, host, () => {
  const ref = host.dataset.code;
  const key = host.dataset.notes;
  if (key && key !== "none" && !NOTES_[key]) problem(`code "${ref}": unknown notes "${key}"`);
  const notes = key === "none" ? null : NOTES_[key || (host.dataset.lines ? "" : ref)] || null;
  const api = render_code({ ref, lines: host.dataset.lines ? parse_range(host.dataset.lines) : null },
                          { notes, caption: host.dataset.caption, where: `code "${ref}"` });
  if (host.id) api.fig.id = host.id;
  host.replaceWith(api.fig);
}));
const placed = new Set();
$$("[data-check]").forEach(host => guarded(`check "${host.dataset.check}"`, host, () => {
  const id = host.dataset.check;
  if (placed.has(id)) throw new Error("placed twice");
  placed.add(id);
  if (!CHECKS_[id]) throw new Error("not defined in CHECKS");
  render_check(id, CHECKS_[id], host);
}));
Object.keys(CHECKS_).forEach(id => { if (!placed.has(id)) warn(`check "${id}" is defined but never placed`); });
$$("[data-diagram]").forEach(host => guarded(`diagram "${host.dataset.diagram}"`, host, () => {
  const def = DIAGRAMS_[host.dataset.diagram];
  if (!def) throw new Error("not defined in DIAGRAMS");
  make_diagram(host.dataset.diagram, def, host);
}));
$$("[data-clip]").forEach(host => guarded(`clip "${host.dataset.clip}"`, host, () => {
  const def = CLIPS_[host.dataset.clip];
  if (!def) throw new Error("not defined in CLIPS");
  make_clip(host.dataset.clip, def, host);
}));
$$("[data-summary]").forEach(host => { host.classList.add("summary", "summary-host"); });

const theme_btn = build_sidebar();
apply_theme(theme_btn);
theme_btn.onclick = () => { theme = { auto: "light", light: "dark", dark: "auto" }[theme]; apply_theme(theme_btn); };
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => apply_theme(theme_btn));
window.addEventListener("scroll", () => update_toc(), { passive: true });
window.addEventListener("resize", () => update_toc());
changed();

// ---- Review / screenshot / report modes ----
if (params.has("reveal")) Object.values(REVEALERS).forEach(r => r());
const solo = params.get("solo");
if (solo) {
  const [kind, name] = [solo.slice(0, solo.indexOf(":")), solo.slice(solo.indexOf(":") + 1)];
  const target = { clip: `#clip-${name}`, diagram: `#diagram-${name}`, check: `#check-${name}` }[kind];
  let elem = target ? $(target) : null;
  if (kind === "code") elem = $$("figure.code").find(f => f.querySelector(".path")?.textContent.startsWith(EXCERPTS_[name]?.file || "\u0000"));
  if (elem) {
    const host_ = h("div", { class: "solo-host" });
    $("main").append(host_);
    host_.append(elem);
    document.body.classList.add("solo");
    if (kind === "clip" && PLAYERS[name]) PLAYERS[name].seek(parseFloat(params.get("t") || "0"));
    if (kind === "diagram" && DIAGRAM_API[name]) {
      if (params.has("node")) DIAGRAM_API[name].select(params.get("node"));
      if (params.has("step")) DIAGRAM_API[name].go(+(params.get("flow") || 0), +params.get("step"));
    }
  } else problem(`solo target not found: ${solo}`);
}
if (params.has("at")) {
  document.documentElement.style.scrollBehavior = "auto";
  const t = document.getElementById(params.get("at"));
  if (t) { t.scrollIntoView(); visited.add(t.id); }
  update_toc();
}
if (params.has("y")) {
  // Headless Chrome's --screenshot ignores scrolling, so shift the page content instead.
  $("main").style.transform = `translateY(${-params.get("y")}px)`;
  update_toc();
}
if (params.has("debug")) {
  const report = {
    height: document.documentElement.scrollHeight,
    title: META_.title,
    sections: sections.map(s => ({ id: s.id, title: s.dataset.title || s.querySelector("h2")?.textContent || s.id,
                                   checks: section_checks(s.id).map(([id]) => id) })),
    checks: Object.fromEntries(Object.entries(CHECKS_).map(([id, c]) => [id, c.kind])),
    clips: Object.fromEntries(Object.values(PLAYERS).map(p => [p.name, { total: p.total, scenes: p.scenes, cues: p.cues }])),
    diagrams: Object.fromEntries(Object.entries(DIAGRAM_API).map(([k, d]) => [k, { flows: d.flows, nodes: d.nodes }])),
    selftest: self_test(), problems, warnings,
  };
  document.body.append(h("pre", { id: "kit-report", hidden: true, text: JSON.stringify(report) }));
}
})();
