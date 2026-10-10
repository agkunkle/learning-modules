# learning-modules

Workspace for single-file HTML learning modules: prose, annotated code, interactive diagrams,
silent captioned clips and self-check questions, all in one offline `.html`. Audience: team
members onboarding to a codebase, or reviewers who need context before a code review.
How-to and spec: the `learning-module` skill (`.claude/skills/learning-module/SKILL.md`).

## Rules for agents working here
- **Outline first.** Write `<module>/plan.md` and get the user's approval before you build a
  module. (Only the robodog pilot was built without this step.)
- **Research is read-only.** Never run a source project's commands, and never modify its repo.
  For projects that control hardware (robodog), do not run anything that could reach a device.
- **Accuracy over punch.** Every claim about code must trace to an excerpt or a `file:line` in
  `research/brief.md`. Put doc/code disagreements in the brief, not as facts in the module.
- **Look at the output.** Run `kit.py check` (and `--reveal --theme dark`) and open the sheets
  before you call a module done.
- **Ask before deleting files.** Never print or commit secrets.
- Modules may be team-internal (`META.internal = true`): real hostnames and IPs may stay.
  Nothing leaves this machine without the user's say.
- **The GitHub repo (agkunkle/learning-modules) is public.** A module about a private repo, or
  one with internal details, stays local: add its folder to `.gitignore` when you create it.
  Check `git status` for module folders before every commit.

## Layout
```
tools/module_kit/      kit.py, engine.js (clip engine), module.js (runtime), module.css,
                       shell.html, starter/, fonts/ (embedded OFL web fonts)
tools/tests/           pytest tests for the kit
tools/check_setup.sh   toolchain check (Ubuntu)
<module>/
  plan.md              outline, sources, accuracy notes
  research/brief.md    research brief (file:line references)
  module/              content.html, module.js, excerpts.json  (the sources)
  dist/<module>.html   the deliverable (tracked)
  check/               screenshots and sheets from kit.py check (ignored)
```

## Conventions
- Python: snake_case, 2-space indent, 100-column lines, pytest.
- Module JS: plain browser JS, no build step, no network. Clip frames are pure functions of t.
- Visual design rules (highlighter = where you are, blue = pressable, status = icon + word)
  live at the top of `module.css` and in the skill; keep them.
- Code excerpts come from `kit.py excerpt` (with `--rev <commit>` when the tree is dirty), never
  hand-copied. Name the commit in `META.source`.
- The clip engine (`engine.js`) is a copy of the one in `~/workspace/youtube-videos`
  (`tools/html_explainer/engine.js`); port fixes across by hand. Only the header comment
  differs. Nothing here loads or runs that project.

## Pipeline
1. `tools/check_setup.sh`
2. `kit.py new <module>`; research brief via a subagent; outline in `plan.md` -> user approval
3. `kit.py excerpt ...` for each excerpt
4. write `module/content.html` + `module/module.js`
5. `kit.py check <module>`; review sheets; iterate
6. commit `dist/<module>.html`; link it where readers will find it (e.g. a CR description)

## Known pitfalls
- Headless Chrome screenshots after scrolling are unreliable; `check` uses tall windows sliced
  into tiles. Do not "fix" the page for an artefact you only see at a tile edge in a sheet.
- `</script` inside any inlined JS ends the page script; `build` refuses it.
- `pkill -f "pattern"` can match its own shell; use `pkill -f "[p]attern"`.
- `sudo` and browser logins need a real terminal (the `!` prefix has no TTY).
