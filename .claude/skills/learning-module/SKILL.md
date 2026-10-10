---
name: learning-module
description: Build a single-file HTML learning module (prose, annotated code, interactive
  diagrams, silent captioned clips, self-check questions) about a codebase, a code change (PR /
  diff, linked from a code-review description) or a technical concept. Use when the user asks
  for a module, course, onboarding page, review primer or "explain this PR/repo" page.
---

# Learning modules

One module = one self-contained HTML file (`<module>/dist/<module>.html`, no network, no
storage). The reader scrolls one page with a sticky table of contents, and answers checks as
they go. Results are self-check only: nothing is saved or sent.

Tools: `tools/module_kit/kit.py` (`new`, `excerpt`, `build`, `check`). Setup:
`tools/check_setup.sh`. Tests: `python3 -m pytest tools/tests`.

## Workflow

1. **Kind and scope.** Pick the kind:
   - *onboarding*: a codebase (pilot: `robodog_onboarding/`);
   - *change*: one PR or diff, linked from the CR description. The reader is a reviewer who
     "knows nothing about this". Goal: context and confidence before they read the diff;
   - *concept*: a technical idea, with code as examples.
2. **Research brief.** Send a subagent (read-only) to write `<module>/research/brief.md`:
   package map, main flows with `file:line`, key abstractions, how to change things, tests,
   conventions, 10-12 excerpt candidates, 8 quiz items with right and wrong answers and why,
   glossary, gotchas, doc/code disagreements. Read all of it yourself.
3. **Outline for approval.** `kit.py new <module>` creates `plan.md` from a template. Fill it
   (objectives, sections, rich elements, checks per section, review quiz) and **show it to the
   user before you build**. (The robodog pilot was the only exception.)
4. **Excerpts.** Snapshot every code excerpt with `kit.py excerpt` (never paste code by hand).
   Pick one version and use `--rev <commit>` so line numbers match it; say the commit in
   `META.source`. Excerpts are not re-checked later (by design).
5. **Write** `module/module.js` and `module/content.html` (spec below).
6. **Check** and look: `kit.py check <module>`, then `--reveal --theme dark`. Open every sheet
   in `<module>/check/`. Fix text overflow in clips, crowded diagram labels, and any
   `PROBLEM`, `SELFTEST FAIL`, `JS ERROR` or `WARN`.
7. **Deliver** `dist/<module>.html` (tracked in git). For a change module, link it from the CR
   description. To share by link, `kit.py publish <module>` (only when the user asks: see
   Publishing).

Size: 30-45 min, 6-8 numbered sections, 2-3 checks per section, a review quiz of 6-8 items at
the end. Write in plain, short sentences (about 80% of ASD-STE100).

## Change modules (for code review)

Answer, in this order: why the change exists; the before/after picture (diagram flow or clip);
the diff, in reviewable pieces; what can go wrong; what to look at in review; how it is tested.

- Diff excerpts: `kit.py excerpt <m> <id> <file> --diff main...feature` (text starts at the
  first `@@`, rendered with add/del row colours). Use `--rev` excerpts for the "before" code.
- Good checks: "which line in this hunk changes behaviour X" (`line`), "what does the caller
  see now" (`choice`), "order the new flow" (`order`).
- End with a "Review checklist" section: the 3-5 things a reviewer must verify.

## Commands

```
kit.py new <module>
kit.py excerpt <module> <id> <file> <a-b> [--rev <commit>]
kit.py excerpt <module> <id> <file> --diff <rev or a...b>
kit.py build <module>
kit.py check <module> [--reveal] [--theme light|dark] [--only pages,clips,diagrams,pics] [--no-shots]
kit.py publish <module> [--force]
kit.py unpublish <module>
```

### Publishing

`publish` builds the module, uploads it to Netlify as `index.html` and prints a **public** link
(anyone with the URL can open it). It writes `<module>/publish.json` (site id, URL; ignored by
git), so the next `publish` updates the same link and `unpublish` deletes the site. Token:
`$NETLIFY_AUTH_TOKEN` or `~/.config/netlify/token` (mode 600; never print it). A module with
`META.internal = true` is refused unless you pass `--force`; use `--force` only when the user
says so for that module. If `publish` warns that the site is private, the Netlify team's default
project visibility is private: change it in Team settings > General > Visitor access.

`check` exits 1 on JS errors, problems or self-test failures. It replaces `<module>/check/`
(its own output only) with `report.json`, `frames/` and the sheets: `pages_N.jpg`,
`clip_<name>.jpg` (one frame per caption), `diagram_<name>.jpg` (overview + every flow step),
`pics.jpg` (every picture, solo).

## Spec reference

### content.html

Sections are `<section id="...">` with an `<h2>`; the runtime numbers them and builds the
sidebar. `data-num="none"` = unnumbered (use for `intro` and `review`). Placeholders:

| Element | Renders |
|---|---|
| `<header data-meta></header>` | title, badge, meta, prereqs, objectives, "how this works" |
| `<div data-code="ref" data-lines="a-b" data-notes="key\|none" data-caption="...">` | annotated code |
| `<div data-check="id">` | a check |
| `<div data-clip="name">` | a clip player |
| `<div data-pic="name">` (`class="side"`: floated right, prose wraps; `"wide"`: wide column) | a static drawing, at most its natural size |
| `<div class="wide" data-diagram="name">` | an interactive diagram |
| `<div data-summary="all\|<section id>">` | score summary |

Notes default to the excerpt id only when no `data-lines` is given. Prose helpers:
`.callout.tip|warn|gotcha` with `<span class="ttl">`, `table.grid`, `ol.steps`, `ul.tight`.

### module.js globals

- `META = {title, subtitle, minutes, audience, source, internal, prereqs[], objectives[]}`
- `NOTES = {excerpt_id: [["line" or "a-b", html], ...]}`: file line numbers; shown as pins with
  a Prev/Next walk.
- `CHECKS = {id: {kind, prompt, explain?, label?, ...}}`:

| kind | fields | graded |
|---|---|---|
| `choice` | `options: [{text, correct?, why}]`, `shuffle?` | exact set; 2+ correct = multi-select |
| `line` | `code: {ref, lines?}` or `{file, start, lang, text}`; `answer: [line, ...]` | exact set |
| `order` | `items` in the right order (shown shuffled) | all in place |
| `match` | `pairs: [[left, right], ...]` (rights unique) | all pairs |

  Every option needs a `why`. Retry is allowed; "Show answer" appears after a wrong try.
  Shuffles are deterministic per check id.
- `DIAGRAMS = {name: {width, height, intro?, groups[], nodes[], edges[], flows[]}}`
  - node `{id, label, sub?, kind?, x, y, w?=180, h?, detail, files?, code?: {ref, lines?, notes?}}`;
    `kind: "device"` draws hardware (a solid block) instead of code (an outlined box)
  - edge `{from, to, label?, bend?}`, referred to as `"from>to"`
  - group `{label, x, y, w, h}`
  - flow `{title, intro?, steps: [{nodes, edges?, text, show?}]}`
- `CLIPS = {name: {title, caption?, scenes: [{title, build(g, b)}]}}`: the explainer engine
  (`engine.js`). `build` draws into SVG `g` (1920x1080), plans timing with
  `b.say(caption, run)` and returns `render(t)`. **Every frame is a pure function of t.**
  Helpers: `box, label, arrow, draw_arrow, appear, code_block, highlight_line, prog, stagger,
  head_of, track, color_track, text_track, show_text, set, el, COLORS, MONO`.
  `COLORS`: identity hues `blue, orange, aqua` (validated together, use them in that order; add
  `purple` only with direct labels), status `green` (pass), `red` (fail), `amber` (warning),
  `yellow` = the highlighter ("look here now"), plus `fg, grey, dim, bg, panel`.
  Captions over 90 characters get a warning. The stage is always dark.
- `PICS = {name: {alt, caption?, width?=800, height?=500, draw(g, paint)}}`: static SVG drawings
  (cartoons, spot illustrations) that sit in the prose. `draw` builds into `g` with `el` and
  colours with `paint.ink` / `paint.paper` / `paint.muted` (and `paint.good` / `paint.crit`
  for a status word beside its ✓ or ✗), set as style properties
  (`e.style.fill = paint.paper`), so the drawing follows the page theme; plain hex stays fixed.
  The colour rules apply: no yellow, no blue. A drawing reused in a clip takes the colours as
  parameters (in a clip, ink = `COLORS.fg`, paper = `COLORS.bg`).

### Hash parameters (for debugging and screenshots)

`#reveal`, `#theme=light|dark`, `#at=<section id>`, `#y=<px>`, `#debug` (JSON report in
`<pre id="kit-report">`), `#solo=clip:<name>&t=<s>`,
`#solo=diagram:<name>&flow=<i>&step=<k>&node=<id>`, `#solo=check:<id>`, `#solo=code:<ref>`, `#solo=pic:<name>`.

## Visual design

The kit has one look for every module; the rules are at the top of `tools/module_kit/module.css`.
Keep them when you add styles or write clips and diagrams:

- **Highlighter yellow = where you are now**: focused code lines, the lit flow path, the current
  section, the active element in a clip. Nothing else is yellow.
- **Blue = you can press it** (links, buttons, pins, the progress meter).
- **Status colours always come with an icon and a word** (✓ Correct, ✗ Not quite, ⚠ callout
  title). In clips, say pass/fail in the caption too.
- Only checks sit on a raised sheet; prose, objectives and callouts are not boxed.
- Type: Kit UI (Barlow Semi Condensed) for headings, controls, diagram and clip text; Kit Text
  (Source Serif 4) for reading; Kit Mono (JetBrains Mono) for code and paths only. The fonts are
  embedded (`tools/module_kit/fonts/*.woff2`, OFL, about 130 KB), so every reader sees the same
  page offline. Regenerate them with `fonts/make_fonts.py` (needs `pip install fonttools
  brotli`); a normal build needs neither.
- No all-caps labels, no middle-dot meta strings, no pill badges.
- Colour choices were checked with the `dataviz` skill's validator (clip identity hues: all
  pairs, dark stage; text tokens: 4.5:1). Re-run it if you change a hue.

These rules distil the `frontend-design` plugin and the `dataviz` skill, so a normal module does
**not** invoke either one. Call them only in these cases:

| Situation | Invoke |
|---|---|
| The module needs a chart, plot, meter or table of numbers (benchmarks, sizes, timings) | `dataviz`: read it before you write the chart |
| A clip or diagram needs a hue that is not in `COLORS`, or you change a palette value | `dataviz`: run its `validate_palette.js` (find the script through the skill; its path changes between versions) |
| You change the kit's look, or add a new kind of UI element (a new check kind, a new widget) | `frontend-design`, with the rules above as the brief |

Do not run `frontend-design` for each module: it gives each brief its own visual identity, and
the kit needs one consistent look. If neither skill is installed, follow the rules above.

## Lessons

- Scrolled headless screenshots come out blank or garbled. `check` takes tall windows (up to
  12,000 px) and slices them into 900 px tiles. A text row cut by a tile edge looks garbled in
  the JPEG sheet; open `frames/NNN.png` before you chase it.
- Contact sheets used to stretch a chunk's short last tile to full height (giant, smeared text).
  `contact_sheet` now keeps the aspect ratio; if you see stretched text, suspect the sheet first.
- Python `0 in (None, False)` is `True`. URL builders that drop "false" values must test
  `is None` / `is False`, or `step=0` disappears.
- Size SVG text by hand: monospace is about `0.6 x size` px per character. Split long labels
  into two lines instead of shrinking them.
- A diagram reads best with 8-10 nodes on a grid; put each process or device in a group and
  avoid edges that cross nodes.
- Researching a project that controls hardware: read only. Do not run its commands, and do not
  run tests that might reach a real device unless the user says so.
- Teach one committed version. Uncommitted work changes line numbers and behaviour.

## Dependencies (Ubuntu 22.04+ or WSL2, with Claude Code)

| Need | Why | Install |
|---|---|---|
| Claude Code | writes the module | `curl -fsSL https://claude.ai/install.sh \| bash` |
| git | excerpts (`--rev`, `--diff`), commits | `sudo apt install git` |
| Python 3.10+ | `kit.py` | `sudo apt install python3 python3-pip` |
| Pillow | contact sheets, tile slicing | `pip install Pillow` or `sudo apt install python3-pil` |
| pytest | kit tests | `pip install pytest` or `sudo apt install python3-pytest` |
| Chrome or Chromium | `check`: report, JS errors, screenshots | see below |
| fonts | readable screenshots | `sudo apt install fonts-dejavu` |
| `frontend-design`, `dataviz` | optional, see Visual design | `/plugin` (frontend-design); `dataviz` ships with Claude Code |

Chrome: `wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb` then
`sudo apt install ./google-chrome-stable_current_amd64.deb`. Chromium also works (on Ubuntu
it is a snap: `sudo snap install chromium`), and so does a Playwright Chromium in
`~/.cache/ms-playwright`. Or set `CHROME=/path/to/chrome`. `tools/check_setup.sh` checks all
of this. No Node, npm or ffmpeg is needed. Run `sudo` commands in a normal terminal (the `!`
prefix in Claude Code has no TTY).
