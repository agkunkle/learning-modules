#!/usr/bin/env python3
"""Learning modules: one self-contained HTML file per module (prose, code, diagrams, clips, checks).

  kit.py new <module>                               start <module>/ from the starter
  kit.py excerpt <module> <id> <file> <a-b>         snapshot lines a-b of a file into excerpts.json
  kit.py excerpt <module> <id> <file> --diff <rev>  snapshot `git diff <rev> -- <file>` instead
      add --rev <commit> to take the lines from a commit instead of the working tree
  kit.py build <module>                             -> <module>/dist/<module name>.html
  kit.py check <module> [--reveal] [--theme dark] [--only pages,clips,diagrams,pics] [--no-shots]
      build, open it in headless Chrome, report problems, JS errors and the check self-test,
      and write review sheets (pages, every clip caption, every diagram flow step) to
      <module>/check/
      --only replaces just those kinds of sheet and keeps the rest
  kit.py shot <module> <fragment>...                screenshot hash fragments, e.g.
      "solo=clip:intro&t=4.5" "solo=diagram:map&flow=0&step=2" "at=setup&reveal", into
      <module>/check/shots/ (plus shots.jpg with more than one): to check one fix quickly
  kit.py publish <module> [--force]                 build and deploy to Netlify; print the link
      (public). Redeploys to the same link if <module>/publish.json exists. Refuses a
      META.internal module without --force. Token: $NETLIFY_AUTH_TOKEN or ~/.config/netlify/token
  kit.py unpublish <module>                         delete the module's Netlify site

A module's sources live in <module>/module/: content.html (the prose and placeholders),
module.js (META, CHECKS, NOTES, CLIPS, DIAGRAMS) and excerpts.json (code snapshots).
"""
import argparse
import base64
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
SHELL, CSS, ENGINE, RUNTIME = (HERE / n for n in ("shell.html", "module.css", "engine.js", "module.js"))
PICS_LIB = HERE / "pics_lib.js"  # drawing helpers (PIC_KIT), inlined right after engine.js
STARTER = HERE / "starter"
FONTS = HERE / "fonts"
# fonts/<role>-<weight>[i].woff2 -> CSS family (OFL fonts; made by fonts/make_fonts.py)
FONT_FAMILIES = {"ui": "Kit UI", "text": "Kit Text", "mono": "Kit Mono"}
SRC = Path("module")
CONTENT, MODULE_JS, EXCERPTS = "content.html", "module.js", "excerpts.json"
MARKS = ("/*@@CSS@@*/", "<!--@@CONTENT@@-->", "//@@ENGINE@@", "//@@EXCERPTS@@", "//@@MODULE@@",
         "//@@RUNTIME@@")
LANGS = {".py": "python", ".sh": "bash", ".bash": "bash", ".json": "json", ".ps1": "text",
         ".js": "text", ".md": "text", ".toml": "text", ".yaml": "text", ".yml": "text"}
PAGE_W, PAGE_H = 1440, 900       # page screenshots: tiles of one browser window
PAGE_CHUNK = 12000               # tallest window per page shot (Chrome copes with ~16k)
CLIP_W, CLIP_H = 1280, 800       # solo clip screenshots
PIC_W, PIC_H = 900, 640          # solo picture screenshots
ONLY_ALL = ("pages", "clips", "diagrams", "pics")  # what check screenshots by default
SHEET_PREFIX = {"pages": "pages_", "clips": "clip_", "diagrams": "diagram_", "pics": "pics"}
SHEET_PAGES = 6                  # page shots per sheet
NETLIFY_API = "https://api.netlify.com/api/v1"
TOKEN_FILE = Path.home() / ".config" / "netlify" / "token"
PUBLISH_LOG = "publish.json"     # <module>/publish.json: the Netlify site of the last publish


class KitError(Exception):
  pass


# ---- building ------------------------------------------------------------------------------

def js_safe_json(data):
  """JSON that can sit inside a <script> element (no '</script' can close it early)."""
  return json.dumps(data, indent=1, ensure_ascii=False).replace("</", "<\\/")


def build_page(shell, css, engine, excerpts, module_js, content, runtime):
  """Return the page with every part inlined at its marker."""
  for name, code in (("engine.js", engine), ("module.js", module_js), ("runtime", runtime)):
    if re.search(r"</script", code, re.IGNORECASE):
      raise KitError(f"{name} contains '</script'; write it as '<\\/script' inside strings")
  for mark in MARKS:
    if shell.count(mark) != 1:
      raise KitError(f"shell must contain {mark} exactly once")
  parts = dict(zip(MARKS, (css, content, engine, f"const EXCERPTS = {js_safe_json(excerpts)};",
                           module_js, runtime)))
  return re.sub("|".join(re.escape(m) for m in MARKS), lambda m: parts[m.group(0)], shell)


def font_faces(folder=FONTS):
  """@font-face rules with every fonts/*.woff2 inlined as base64, so the page needs no network."""
  rules = []
  for path in sorted(Path(folder).glob("*.woff2")):
    m = re.fullmatch(r"(\w+)-(\d{3})(i?)", path.stem)
    if not m or m.group(1) not in FONT_FAMILIES:
      raise KitError(f"unexpected font file name: {path.name}")
    data = base64.b64encode(path.read_bytes()).decode()
    style = "italic" if m.group(3) else "normal"
    rules.append(f'@font-face {{ font-family: "{FONT_FAMILIES[m.group(1)]}"; font-weight: '
                 f'{m.group(2)}; font-style: {style}; font-display: block; '
                 f'src: url(data:font/woff2;base64,{data}) format("woff2"); }}')
  return "\n".join(rules) + "\n"


def out_path(module):
  module = Path(module)
  return module / "dist" / f"{module.resolve().name}.html"


def load_excerpts(module):
  path = Path(module) / SRC / EXCERPTS
  return json.loads(path.read_text()) if path.exists() else {}


def build(module):
  module = Path(module)
  src = module / SRC
  for name in (CONTENT, MODULE_JS):
    if not (src / name).exists():
      raise KitError(f"{src / name} not found (start a module with: kit.py new {module})")
  engine = ENGINE.read_text() + "\n" + PICS_LIB.read_text()
  page = build_page(SHELL.read_text(), font_faces() + CSS.read_text(), engine,
                    load_excerpts(module),
                    (src / MODULE_JS).read_text(), (src / CONTENT).read_text(), RUNTIME.read_text())
  out = out_path(module)
  out.parent.mkdir(parents=True, exist_ok=True)
  out.write_text(page)
  return out


def new_module(module):
  """Copy the starter into <module>/ without overwriting anything."""
  module = Path(module)
  if (module / SRC).exists():
    raise KitError(f"{module / SRC} already exists")
  (module / SRC).mkdir(parents=True)
  (module / "research").mkdir(exist_ok=True)
  for name in (CONTENT, MODULE_JS, EXCERPTS):
    shutil.copyfile(STARTER / name, module / SRC / name)
  if not (module / "plan.md").exists():
    shutil.copyfile(STARTER / "plan.md", module / "plan.md")
  return module


# ---- excerpts ------------------------------------------------------------------------------

def git(cwd, *args):
  res = subprocess.run(["git", "-C", str(cwd), *args], capture_output=True, text=True)
  if res.returncode:
    raise KitError(f"git {' '.join(args)}: {res.stderr.strip()}")
  return res.stdout


def snapshot(file, lines=None, diff=None, rev=None):
  """Excerpt record for lines (a, b) of `file` (at commit `rev`, default the working tree), or
  for `git diff <diff> -- file`."""
  file = Path(file).resolve()
  if not file.exists() and not (diff or rev):
    raise KitError(f"{file} not found")
  try:
    root = Path(git(file.parent, "rev-parse", "--show-toplevel").strip())
    rel, commit = str(file.relative_to(root)), git(root, "rev-parse", "--short", "HEAD").strip()
  except KitError:
    root, rel, commit = file.parent, file.name, None
  rec = {"file": rel, "repo": root.name, "commit": commit}
  if diff:
    text = git(root, "diff", "--no-color", diff, "--", rel)
    if "@@" not in text:
      raise KitError(f"git diff {diff} -- {rel} is empty")
    text = text[text.index("@@"):]
    return {**rec, "file": f"{rel} ({diff})", "start": 1, "lang": "diff", "text": text.rstrip("\n")}
  if rev:
    rec["commit"] = git(root, "rev-parse", "--short", rev).strip()
    src = git(root, "show", f"{rev}:{rel}").splitlines()
  else:
    src = file.read_text().splitlines()
  a, b = lines
  if not (1 <= a <= b <= len(src)):
    raise KitError(f"lines {a}-{b} outside {rel} (1-{len(src)})")
  return {**rec, "start": a, "lang": LANGS.get(file.suffix, "text"), "text": "\n".join(src[a - 1:b])}


def add_excerpt(module, ex_id, file, lines=None, diff=None, rev=None):
  path = Path(module) / SRC / EXCERPTS
  data = load_excerpts(module)
  data[ex_id] = snapshot(file, lines, diff, rev)
  path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
  return data[ex_id]


# ---- checking in headless Chrome -----------------------------------------------------------

def find_chrome():
  """Path to a Chrome/Chromium binary, or None. $CHROME wins."""
  if os.environ.get("CHROME"):
    return os.environ["CHROME"]
  for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
    if shutil.which(name):
      return shutil.which(name)
  cache = sorted(Path.home().glob(".cache/ms-playwright/chromium-*/chrome-linux*/chrome"))
  return str(cache[-1]) if cache else None


def run_chrome(chrome, url, *args, timeout=120):
  with tempfile.TemporaryDirectory(prefix="module_kit_chrome_") as profile:
    cmd = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
           "--no-default-browser-check", f"--user-data-dir={profile}", *args, url]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def page_url(page, **frag):
  parts = [k if v is True else f"{k}={v}" for k, v in frag.items()
           if v is not None and v is not False]  # keep 0: 0 == False in Python
  return Path(page).resolve().as_uri() + "#" + "&".join(parts)


def read_report(chrome, page):
  """(report dict or None, JS error lines) for a built page."""
  res = run_chrome(chrome, page_url(page, debug=True), "--enable-logging=stderr", "--v=0",
                   f"--window-size={PAGE_W},{PAGE_H}", "--dump-dom")
  errors = [line for line in res.stderr.splitlines()
            if ":CONSOLE" in line and ("Uncaught" in line or "ERROR:CONSOLE" in line)]
  m = re.search(r'<pre id="kit-report"[^>]*>(.*?)</pre>', res.stdout, re.DOTALL)
  report = json.loads(html.unescape(m.group(1))) if m else None
  if report is None and not errors:
    errors.append("page did not publish its report (the runtime crashed before the end?)")
  return report, errors


def shot_plan(report, only=ONLY_ALL, reveal=False, theme=None):
  """[(sheet name, label, fragment dict, (w, h))] for every screenshot to take."""
  plan = []
  common = {"reveal": reveal, "theme": theme}
  if "pages" in only:
    # One tall window per chunk (scrolled shots are unreliable); check() slices them into tiles.
    for y in range(0, report["height"], PAGE_CHUNK):
      plan.append(("pages", f"y={y}", {**common, "y": y},
                   (PAGE_W, min(PAGE_CHUNK, report["height"] - y))))
  if "clips" in only:
    for name, clip in report["clips"].items():
      for cue in clip["cues"]:
        t = round(max(cue["start"], cue["end"] - 0.05), 2)
        plan.append((f"clip_{name}", f"t={t}", {"solo": f"clip:{name}", "t": t}, (CLIP_W, CLIP_H)))
  if "diagrams" in only:
    for name, d in report["diagrams"].items():
      plan.append((f"diagram_{name}", "overview", {**common, "solo": f"diagram:{name}"}, (PAGE_W, PAGE_H)))
      for fi, flow in enumerate(d["flows"]):
        for k in range(flow["steps"]):
          plan.append((f"diagram_{name}", f"flow {fi + 1} step {k + 1}",
                       {**common, "solo": f"diagram:{name}", "flow": fi, "step": k}, (PAGE_W, PAGE_H)))
  if "pics" in only:
    for name in report.get("pics", []):
      plan.append(("pics", name, {**common, "solo": f"pic:{name}"}, (PIC_W, PIC_H)))
  return plan


def lint(report):
  """Readability warnings the page cannot see itself."""
  warns = []
  for name, clip in report["clips"].items():
    for c in clip["cues"]:
      if len(c["text"]) > 90:
        warns.append(f"clip {name}: long caption ({len(c['text'])} chars): {c['text']!r}")
  for s in report["sections"]:
    if not s["checks"] and s["id"] not in ("intro", "review"):
      warns.append(f"section {s['id']!r} has no checks")
  return warns


def contact_sheet(frames, out, cols, tile_w):
  """Tile (label, png) frames into one JPEG with the label in each tile's corner."""
  from PIL import Image, ImageDraw
  with Image.open(frames[0][1]) as im:
    tile_h = round(tile_w * im.height / im.width)
  rows = (len(frames) + cols - 1) // cols
  sheet = Image.new("RGB", (tile_w * cols, tile_h * rows), "black")
  draw = ImageDraw.Draw(sheet)
  for k, (label, png) in enumerate(frames):
    x, y = (k % cols) * tile_w, (k // cols) * tile_h
    with Image.open(png) as im:
      # Keep the aspect ratio: a short last tile is pasted at the top, not stretched to fill.
      h = min(tile_h, round(tile_w * im.height / im.width))
      sheet.paste(im.convert("RGB").resize((tile_w, round(tile_w * im.height / im.width)))
                  .crop((0, 0, tile_w, h)), (x, y))
    draw.rectangle([x, y, x + 8 + 7 * len(label), y + 18], fill="black")
    draw.text((x + 4, y + 3), label, fill="white")
  sheet.save(out, quality=88)
  return out


def slice_tiles(png, y0):
  """Cut a tall page shot into PAGE_H tiles; returns [(page y, tile png)]."""
  from PIL import Image
  out = []
  with Image.open(png) as im:
    for top in range(0, im.height, PAGE_H):
      tile = png.with_name(f"{png.stem}_{top:05d}.png")
      im.crop((0, top, im.width, min(top + PAGE_H, im.height))).save(tile)
      out.append((y0 + top, tile))
  return out


def frame_name(sheet, k, label):
  """frames/<sheet>_<k>_<label>.png, e.g. clip_brushing_007_t_41.9.png: easy to find by eye."""
  return f"{sheet}_{k:03d}_{re.sub(r'[^A-Za-z0-9.]+', '_', label).strip('_')}.png"


def clear_check_output(out_dir, only):
  """Delete the sheets and frames of the kinds in `only`; keep the others (check --only)."""
  prefixes = tuple(SHEET_PREFIX[k] for k in only if k in SHEET_PREFIX)
  if not prefixes:
    return
  for path in [*out_dir.glob("*.jpg"), *(out_dir / "frames").glob("*.png")]:
    if path.name.startswith(prefixes):
      path.unlink()


def parse_fragment(frag):
  """'solo=clip:x&t=4&reveal' -> {'solo': 'clip:x', 't': '4', 'reveal': True}."""
  pairs = urllib.parse.parse_qsl(frag.lstrip("#"), keep_blank_values=True)
  return {k: (v if v != "" else True) for k, v in pairs}


def shot_size(frag):
  kind = str(frag.get("solo", "")).split(":")[0]
  return {"clip": (CLIP_W, CLIP_H), "pic": (PIC_W, PIC_H)}.get(kind, (PAGE_W, PAGE_H))


def shot(module, frags, jobs=4):
  """Build, then screenshot each hash fragment into <module>/check/shots/. With more than one
  fragment, also tile them into shots.jpg. Returns [png paths] (+ the sheet)."""
  module = Path(module)
  page = build(module)
  chrome = find_chrome()
  if not chrome:
    raise KitError("no Chrome/Chromium found; install google-chrome or set $CHROME")
  out_dir = module / "check" / "shots"
  out_dir.mkdir(parents=True, exist_ok=True)
  jobs_ = []
  for k, text in enumerate(frags):
    frag = parse_fragment(text)
    jobs_.append((text, frag, out_dir / frame_name("shot", k, text)))

  def take(job):
    _, frag, png = job
    w, h = shot_size(frag)
    run_chrome(chrome, page_url(page, **frag), f"--screenshot={png}", f"--window-size={w},{h}")

  with ThreadPoolExecutor(jobs) as pool:
    list(pool.map(take, jobs_))
  missing = [text for text, _, png in jobs_ if not png.exists()]
  if missing:
    raise KitError(f"Chrome wrote no screenshot for: {', '.join(missing)}")
  out = [png for _, _, png in jobs_]
  if len(out) > 1:
    frames = [(text, png) for text, _, png in jobs_]
    out.append(contact_sheet(frames, out_dir / "shots.jpg", 2, 960))
  return out


def check(module, only=ONLY_ALL, reveal=False, theme=None, shots=True, jobs=4):
  """Build and inspect. Returns 0 when the page is clean, else 1."""
  module = Path(module)
  page = build(module)
  chrome = find_chrome()
  if not chrome:
    raise KitError("no Chrome/Chromium found; install google-chrome or set $CHROME")
  report, errors = read_report(chrome, page)
  for e in errors:
    print(f"JS ERROR: {e}")
  if report is None:
    return 1
  kinds = {}
  for k in report["checks"].values():
    kinds[k] = kinds.get(k, 0) + 1
  print(f"{report['title']}: {len(report['sections'])} sections, {len(report['checks'])} checks "
        f"{kinds}, {len(report['clips'])} clips, {len(report['diagrams'])} diagrams, "
        f"{len(report.get('pics', []))} pics, "
        f"page height {report['height']} px")
  for s in report["sections"]:
    print(f"  {s['id']:<24} {len(s['checks'])} checks  {s['title']}")
  for name, c in report["clips"].items():
    print(f"  clip {name}: {c['total']:.1f} s, {len(c['cues'])} captions")
  bad_tests = [t for t in report["selftest"] if not t["ok"]]
  for t in bad_tests:
    print(f"SELFTEST FAIL: check {t['id']}: {t}")
  for p in report["problems"]:
    print(f"PROBLEM: {p}")
  for w in report["warnings"] + lint(report):
    print(f"WARN: {w}")

  out_dir = module / "check"
  if shots:
    if set(only) >= set(ONLY_ALL) and out_dir.exists():
      shutil.rmtree(out_dir)  # only ever holds this tool's own output
    elif out_dir.exists():
      clear_check_output(out_dir, only)  # --only: keep the other kinds' sheets
    (out_dir / "frames").mkdir(parents=True, exist_ok=True)
    (out_dir / "report.json").write_text(json.dumps(report, indent=1))
    plan = shot_plan(report, only, reveal, theme)
    counts = {}
    jobs_ = []
    for sheet, label, frag, size in plan:
      k = counts[sheet] = counts.get(sheet, -1) + 1
      jobs_.append((sheet, label, frag, size, out_dir / "frames" / frame_name(sheet, k, label)))

    def take(job):
      _, _, frag, (w, h), png = job
      run_chrome(chrome, page_url(page, **frag), f"--screenshot={png}", f"--window-size={w},{h}")

    with ThreadPoolExecutor(jobs) as pool:
      list(pool.map(take, jobs_))
    groups = {}
    for sheet, label, frag, _, png in jobs_:
      if not png.exists():
        continue
      if sheet == "pages":
        for k, (y, tile) in enumerate(slice_tiles(png, frag["y"]), start=len(groups.get("tiles", []))):
          groups.setdefault(f"pages_{k // SHEET_PAGES + 1}", []).append((f"y={y}", tile))
          groups.setdefault("tiles", []).append(tile)
      else:
        groups.setdefault(sheet, []).append((label, png))
    groups.pop("tiles", None)
    for sheet, frames in groups.items():
      if frames:
        cols, tile_w = (2, 720) if sheet.startswith(("pages", "diagram")) else (3, 640)
        print(f"sheet: {contact_sheet(frames, out_dir / f'{sheet}.jpg', cols, tile_w)}")
  print(f"page: {page} ({page.stat().st_size / 1024:.0f} KB)")
  return 1 if errors or report["problems"] or bad_tests else 0


# ---- publishing (Netlify) ------------------------------------------------------------------

class NetlifyError(KitError):
  def __init__(self, status, msg):
    super().__init__(msg)
    self.status = status


def netlify_token():
  """The token from $NETLIFY_AUTH_TOKEN or TOKEN_FILE. Never print it."""
  token = os.environ.get("NETLIFY_AUTH_TOKEN", "").strip()
  if not token and TOKEN_FILE.exists():
    token = TOKEN_FILE.read_text().strip()
  if not token:
    raise KitError(f"no Netlify token: set NETLIFY_AUTH_TOKEN or write it to {TOKEN_FILE}")
  return token


def netlify(method, path, token, data=None):
  """One Netlify API call. data: a dict (sent as JSON) or bytes (a file body). Returns the
  parsed JSON, or None if empty."""
  req = urllib.request.Request(NETLIFY_API + path, method=method,
                               headers={"Authorization": f"Bearer {token}"})
  if isinstance(data, dict):
    req.data = json.dumps(data).encode()
    req.add_header("Content-Type", "application/json")
  elif data is not None:
    req.data = data
    req.add_header("Content-Type", "application/octet-stream")
  try:
    with urllib.request.urlopen(req, timeout=120) as res:
      body = res.read()
  except urllib.error.HTTPError as e:
    detail = e.read()[:200].decode(errors="replace").strip()
    raise NetlifyError(e.code, f"Netlify {method} {path}: HTTP {e.code} {detail}") from None
  except urllib.error.URLError as e:
    raise KitError(f"Netlify {method} {path}: {e.reason}") from None
  return json.loads(body) if body.strip() else None


def is_internal(module):
  js = (Path(module) / SRC / MODULE_JS).read_text()
  return re.search(r"\binternal\s*:\s*true\b", js) is not None


def deploy_manifest(body):
  """The file-digest deploy body: the page as /index.html, so the site root serves it as HTML.
  (A zip deploy of the same file came out as "/" with type text/plain: raw source.)"""
  return {"files": {"/index.html": hashlib.sha1(body).hexdigest()}}


def publish(module, force=False, wait=90, sleep=time.sleep):
  """Build the module and deploy it to Netlify. A module with a publish log is redeployed to
  the same site (same link); otherwise a new site is created. Returns the log record."""
  module = Path(module)
  if is_internal(module) and not force:
    raise KitError(f"{module} is team-internal (META.internal = true) and a Netlify link is "
                   "public; add --force to publish it anyway")
  page = build(module)
  token = netlify_token()
  log_path = module / PUBLISH_LOG
  old = json.loads(log_path.read_text()) if log_path.exists() else None
  body = Path(page).read_bytes()
  site_id = deploy = None
  if old:
    try:
      deploy = netlify("POST", f"/sites/{old['site_id']}/deploys", token, deploy_manifest(body))
      site_id = old["site_id"]
    except NetlifyError as e:
      if e.status != 404:
        raise
  if site_id is None:  # first publish, or the old site was deleted
    site_id = netlify("POST", "/sites", token, {})["id"]
    deploy = netlify("POST", f"/sites/{site_id}/deploys", token, deploy_manifest(body))
  deploy_id = deploy["id"]
  if deploy.get("required"):  # Netlify lacks this file version: upload it
    netlify("PUT", f"/deploys/{deploy_id}/files/index.html", token, body)
  state = None
  for _ in range(max(1, wait // 2)):
    state = netlify("GET", f"/deploys/{deploy_id}", token)["state"]
    if state in ("ready", "error"):
      break
    sleep(2)
  if state != "ready":
    raise KitError(f"Netlify deploy {deploy_id} of site {site_id} ended in state {state!r}")
  # the create response can lack ssl_url, so read the site back
  site = netlify("GET", f"/sites/{site_id}", token)
  rec = {"site_id": site_id, "url": site.get("ssl_url") or site.get("url"),
         "deploy_id": deploy_id, "private": bool(site.get("sso_login")),
         "published": datetime.now(timezone.utc).isoformat(timespec="seconds")}
  log_path.write_text(json.dumps(rec, indent=2) + "\n")
  return rec


def unpublish(module):
  """Delete the module's Netlify site and its publish log. Returns the old log record."""
  log_path = Path(module) / PUBLISH_LOG
  if not log_path.exists():
    raise KitError(f"{log_path} not found: this module is not published")
  rec = json.loads(log_path.read_text())
  try:
    netlify("DELETE", f"/sites/{rec['site_id']}", netlify_token())
  except NetlifyError as e:
    if e.status != 404:  # 404: already deleted (e.g. in the Netlify UI)
      raise
  log_path.unlink()
  return rec


# ---- CLI -----------------------------------------------------------------------------------

def main(argv=None):
  ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
  sub = ap.add_subparsers(dest="cmd", required=True)
  sub.add_parser("new").add_argument("module")
  sub.add_parser("build").add_argument("module")
  p = sub.add_parser("excerpt")
  p.add_argument("module")
  p.add_argument("id")
  p.add_argument("file")
  p.add_argument("lines", nargs="?", help="a-b (1-based, inclusive)")
  p.add_argument("--diff", help="git revision or range, e.g. HEAD~1 or main...feature")
  p.add_argument("--rev", help="take the lines from this commit, not the working tree")
  p = sub.add_parser("check")
  p.add_argument("module")
  p.add_argument("--only", default=",".join(ONLY_ALL))
  p.add_argument("--reveal", action="store_true", help="page shots with every answer shown")
  p.add_argument("--theme", choices=("light", "dark"))
  p.add_argument("--no-shots", action="store_true")
  p.add_argument("--jobs", type=int, default=4)
  p = sub.add_parser("shot")
  p.add_argument("module")
  p.add_argument("fragments", nargs="+", help='hash fragments, e.g. "solo=clip:intro&t=4.5"')
  p.add_argument("--jobs", type=int, default=4)
  p = sub.add_parser("publish")
  p.add_argument("module")
  p.add_argument("--force", action="store_true", help="publish a META.internal module too")
  sub.add_parser("unpublish").add_argument("module")
  args = ap.parse_args(argv)
  try:
    if args.cmd == "new":
      print(f"created {new_module(args.module)}")
    elif args.cmd == "build":
      out = build(args.module)
      print(f"built {out} ({out.stat().st_size / 1024:.0f} KB)")
    elif args.cmd == "excerpt":
      if not args.lines and not args.diff:
        raise KitError("give a line range a-b or --diff <rev>")
      lines = tuple(int(x) for x in args.lines.split("-")) if args.lines else None
      if lines and len(lines) == 1:
        lines = (lines[0], lines[0])
      rec = add_excerpt(args.module, args.id, args.file, lines, args.diff, args.rev)
      print(f"{args.id}: {rec['file']}:{rec['start']} ({len(rec['text'].splitlines())} lines, "
            f"{rec['lang']}, commit {rec['commit']})")
    elif args.cmd == "shot":
      for path in shot(args.module, args.fragments, args.jobs):
        print(f"shot: {path}")
    elif args.cmd == "publish":
      rec = publish(args.module, args.force)
      print(f"published {rec['url']} (site {rec['site_id']})")
      if rec["private"]:
        print("warning: the site is private (Netlify team login); set the team's default project "
              "visibility to public, or make this project public in the Netlify UI",
              file=sys.stderr)
    elif args.cmd == "unpublish":
      rec = unpublish(args.module)
      print(f"deleted {rec['url']} (site {rec['site_id']})")
    else:
      return check(args.module, tuple(args.only.split(",")), args.reveal, args.theme,
                   not args.no_shots, args.jobs)
  except KitError as e:
    print(f"error: {e}", file=sys.stderr)
    return 1
  return 0


if __name__ == "__main__":
  sys.exit(main())
