"""Tests for tools/module_kit/kit.py. The Chrome test is skipped when no browser is found."""
import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "module_kit"))
import kit  # noqa: E402

SHELL = "<style>/*@@CSS@@*/</style><main><!--@@CONTENT@@--></main><script>//@@ENGINE@@\n" \
        "//@@EXCERPTS@@\n//@@MODULE@@\n//@@RUNTIME@@</script>"


def make_page(**over):
  parts = dict(shell=SHELL, css="b{}", engine="const E=1;", excerpts={}, module_js="const M=1;",
               content="<p>hi</p>", runtime="run();")
  parts.update(over)
  return kit.build_page(**parts)


# ---- building ------------------------------------------------------------------------------

def test_build_page_inlines_every_part():
  page = make_page(excerpts={"a": {"text": "x"}})
  for piece in ("b{}", "<p>hi</p>", "const E=1;", "const M=1;", "run();", "const EXCERPTS ="):
    assert piece in page
  assert "@@" not in page


def test_build_page_rejects_closing_script_tag_in_code():
  with pytest.raises(kit.KitError, match="module.js"):
    make_page(module_js='const s = "</script>";')


def test_build_page_needs_each_marker_once():
  with pytest.raises(kit.KitError, match="exactly once"):
    make_page(shell=SHELL.replace("//@@RUNTIME@@", ""))


def test_js_safe_json_escapes_closing_tags_and_round_trips():
  data = {"text": "x = '</script>'"}
  out = kit.js_safe_json(data)
  assert "</" not in out
  assert json.loads(out.replace("<\\/", "</")) == data


def test_new_module_copies_starter_and_refuses_to_overwrite(tmp_path):
  mod = tmp_path / "demo"
  kit.new_module(mod)
  for name in ("content.html", "module.js", "excerpts.json"):
    assert (mod / "module" / name).exists()
  assert (mod / "plan.md").exists() and (mod / "research").is_dir()
  with pytest.raises(kit.KitError, match="already exists"):
    kit.new_module(mod)


def test_build_writes_dist_page(tmp_path):
  mod = tmp_path / "demo"
  kit.new_module(mod)
  out = kit.build(mod)
  assert out == mod / "dist" / "demo.html"
  assert "TtlCache" in out.read_text()


# ---- excerpts ------------------------------------------------------------------------------

@pytest.fixture
def repo(tmp_path):
  root = tmp_path / "repo"
  root.mkdir()
  run = lambda *a: subprocess.run(["git", "-C", str(root), *a], check=True, capture_output=True)
  run("init", "-q", "-b", "main")
  run("config", "user.email", "t@example.com")
  run("config", "user.name", "t")
  src = root / "pkg.py"
  src.write_text("".join(f"line{i}\n" for i in range(1, 11)))
  run("add", ".")
  run("commit", "-q", "-m", "one")
  src.write_text("".join(f"line{i}\n" for i in range(1, 11)).replace("line5", "CHANGED"))
  return root, src


def test_snapshot_takes_working_tree_lines(repo):
  _, src = repo
  rec = kit.snapshot(src, (4, 6))
  assert rec["file"] == "pkg.py" and rec["start"] == 4 and rec["lang"] == "python"
  assert rec["text"] == "line4\nCHANGED\nline6"


def test_snapshot_rev_takes_committed_lines(repo):
  _, src = repo
  assert kit.snapshot(src, (5, 5), rev="HEAD")["text"] == "line5"


def test_snapshot_diff_starts_at_first_hunk(repo):
  _, src = repo
  rec = kit.snapshot(src, diff="HEAD")
  assert rec["lang"] == "diff" and rec["text"].startswith("@@")
  assert "-line5" in rec["text"] and "+CHANGED" in rec["text"]


@pytest.mark.parametrize("lines", [(0, 2), (3, 2), (9, 11)])
def test_snapshot_rejects_bad_ranges(repo, lines):
  _, src = repo
  with pytest.raises(kit.KitError, match="outside"):
    kit.snapshot(src, lines)


def test_add_excerpt_writes_json(repo, tmp_path):
  _, src = repo
  mod = tmp_path / "demo"
  kit.new_module(mod)
  kit.add_excerpt(mod, "five", src, (5, 5))
  data = json.loads((mod / "module" / "excerpts.json").read_text())
  assert data["five"]["text"] == "CHANGED"


# ---- checking ------------------------------------------------------------------------------

def test_page_url_keeps_zero_and_drops_none_false():
  url = kit.page_url("x.html", solo="diagram:a", flow=0, step=0, reveal=False, theme=None,
                     debug=True)
  assert url.endswith("#solo=diagram:a&flow=0&step=0&debug")


REPORT = {
  "height": 25000,
  "clips": {"c": {"cues": [{"start": 0, "end": 2, "text": "short"},
                           {"start": 2, "end": 4, "text": "x" * 91}]}},
  "diagrams": {"d": {"flows": [{"title": "f", "steps": 2}]}},
  "pics": ["p", "q"],
  "sections": [{"id": "intro", "checks": []}, {"id": "body", "checks": []},
               {"id": "more", "checks": ["q"]}],
}


def test_shot_plan_chunks_pages_and_covers_every_step():
  plan = kit.shot_plan(REPORT)
  pages = [p for p in plan if p[0] == "pages"]
  assert [p[2]["y"] for p in pages] == [0, 12000, 24000]
  assert pages[-1][3] == (kit.PAGE_W, 1000)
  assert len([p for p in plan if p[0] == "clip_c"]) == 2
  steps = [p[2].get("step") for p in plan if p[0] == "diagram_d"]
  assert steps == [None, 0, 1]
  pics = [p for p in plan if p[0] == "pics"]
  assert [p[2]["solo"] for p in pics] == ["pic:p", "pic:q"]
  assert pics[0][3] == (kit.PIC_W, kit.PIC_H)


def test_shot_plan_tolerates_reports_without_pics():
  old = {k: v for k, v in REPORT.items() if k != "pics"}
  assert not [p for p in kit.shot_plan(old) if p[0] == "pics"]


def test_shot_plan_only_filters():
  assert {p[0] for p in kit.shot_plan(REPORT, only=("clips",))} == {"clip_c"}
  assert {p[0] for p in kit.shot_plan(REPORT, only=("pics",))} == {"pics"}


def test_lint_flags_long_captions_and_sections_without_checks():
  warns = kit.lint(REPORT)
  assert any("long caption" in w for w in warns)
  assert any("'body'" in w for w in warns)
  assert not any("'intro'" in w or "'more'" in w for w in warns)


def test_slice_tiles_cuts_page_height_tiles(tmp_path):
  Image = pytest.importorskip("PIL.Image")
  png = tmp_path / "000.png"
  Image.new("RGB", (100, 2000), "white").save(png)
  tiles = kit.slice_tiles(png, 12000)
  assert [y for y, _ in tiles] == [12000, 12900, 13800]
  with Image.open(tiles[-1][1]) as last:
    assert last.size == (100, 200)


def test_contact_sheet_does_not_stretch_a_short_tile(tmp_path):
  Image = pytest.importorskip("PIL.Image")
  full, short = tmp_path / "a.png", tmp_path / "b.png"
  Image.new("RGB", (100, 90), "white").save(full)
  Image.new("RGB", (100, 30), "red").save(short)
  out = kit.contact_sheet([("a", full), ("b", short)], tmp_path / "s.jpg", cols=2, tile_w=100)
  with Image.open(out) as sheet:
    assert sheet.size == (200, 90)
    assert sheet.getpixel((150, 25))[0] > 200          # the red tile, at the top
    assert max(sheet.getpixel((150, 80))) < 30         # black below it, not stretched red


def test_font_faces_inline_every_font_and_reject_odd_names(tmp_path):
  (tmp_path / "ui-600.woff2").write_bytes(b"abc")
  (tmp_path / "text-400i.woff2").write_bytes(b"xyz")
  css = kit.font_faces(tmp_path)
  assert 'font-family: "Kit UI"; font-weight: 600; font-style: normal' in css
  assert 'font-family: "Kit Text"; font-weight: 400; font-style: italic' in css
  assert "base64,YWJj" in css and "base64,eHl6" in css
  (tmp_path / "fancy.woff2").write_bytes(b"")
  with pytest.raises(kit.KitError):
    kit.font_faces(tmp_path)


def test_kit_fonts_exist_with_licenses():
  names = {p.stem for p in kit.FONTS.glob("*.woff2")}
  assert {"ui-500", "ui-600", "text-400", "text-600", "text-400i", "mono-400", "mono-700"} <= names
  assert len(list(kit.FONTS.glob("OFL_*.txt"))) == 3


# ---- publishing (a local bare repo as origin and a fake gh: no network) --------------------

class FakeGh:
  """Stands in for kit.gh: records calls; Pages is on or off; builds report `states` in turn."""

  def __init__(self, pages_on=False, states=("built",)):
    self.calls, self.pages_on, self.states, self.commit = [], pages_on, list(states), None

  def __call__(self, *args):
    self.calls.append(args)
    if args[1] == "-X":  # turn Pages on
      self.pages_on = True
      return "{}"
    if args[1].endswith("/pages/builds/latest"):
      state = self.states.pop(0) if len(self.states) > 1 else self.states[0]
      return json.dumps({"status": state, "commit": self.commit})
    if not self.pages_on:
      raise kit.KitError("gh api repos/o/r/pages: Not Found (HTTP 404)")
    return "{}"


def run_git(cwd, *args):
  return subprocess.run(["git", "-C", str(cwd), *args], capture_output=True, text=True,
                        check=True).stdout


@pytest.fixture
def pages(monkeypatch, tmp_path):
  """(use, module, origin): `use(**kw)` installs a FakeGh; origin is a bare repo."""
  origin = tmp_path / "origin.git"
  subprocess.run(["git", "init", "--quiet", "--bare", str(origin)], check=True)
  monkeypatch.setattr(kit, "github_slug", lambda remote: "Owner/repo")
  for k, v in (("GIT_AUTHOR_NAME", "t"), ("GIT_AUTHOR_EMAIL", "t@example.com"),
               ("GIT_COMMITTER_NAME", "t"), ("GIT_COMMITTER_EMAIL", "t@example.com")):
    monkeypatch.setenv(k, v)
  mod = tmp_path / "demo"
  kit.new_module(mod)

  def use(**kw):
    fake = FakeGh(**kw)
    monkeypatch.setattr(kit, "gh", fake)
    real_push = kit.pages_push

    def push(work, message):  # tell the fake which commit the build is for
      fake.commit = real_push(work, message)
      return fake.commit
    monkeypatch.setattr(kit, "pages_push", push)
    return fake
  return use, mod, origin


def pages_files(origin):
  return set(run_git(origin, "ls-tree", "-r", "--name-only", "gh-pages").split())


def test_github_slug_reads_https_and_ssh_remotes():
  monkey = kit.github_slug
  assert monkey("https://github.com/agkunkle/learning-modules.git") == "agkunkle/learning-modules"
  assert monkey("git@github.com:a/b") == "a/b"
  with pytest.raises(kit.KitError, match="not a GitHub remote"):
    monkey("/tmp/origin.git")


def test_pages_url_is_lowercase_owner_repo_module():
  assert kit.pages_url("AgKunkle/learning-modules", "linux_elf") == \
    "https://agkunkle.github.io/learning-modules/linux_elf/"


def test_publish_pushes_index_html_turns_pages_on_and_writes_log(pages):
  use, mod, origin = pages
  fake = use(states=("building", "built"))
  rec = kit.publish(mod, remote=str(origin), sleep=lambda s: None)
  assert rec["url"] == "https://owner.github.io/repo/demo/" and rec["branch"] == "gh-pages"
  assert pages_files(origin) == {".nojekyll", "demo/index.html"}
  page = (mod / "dist" / "demo.html").read_text()
  assert run_git(origin, "show", "gh-pages:demo/index.html") == page  # publish builds first
  assert run_git(origin, "rev-parse", "gh-pages").strip() == rec["commit"]
  posts = [c for c in fake.calls if c[1] == "-X"]
  assert len(posts) == 1 and "source[branch]=gh-pages" in posts[0]
  assert json.loads((mod / "publish.json").read_text())["commit"] == rec["commit"]


def test_publish_again_updates_the_page_and_keeps_other_modules(pages):
  use, mod, origin = pages
  fake = use(pages_on=True)
  kit.publish(mod, remote=str(origin), sleep=lambda s: None)
  other = mod.parent / "other"
  kit.new_module(other)
  kit.publish(other, remote=str(origin), sleep=lambda s: None)
  (mod / "module" / "content.html").write_text("<p>changed</p>")
  rec = kit.publish(mod, remote=str(origin), sleep=lambda s: None)
  assert pages_files(origin) == {".nojekyll", "demo/index.html", "other/index.html"}
  assert "changed" in run_git(origin, "show", "gh-pages:demo/index.html")
  assert not [c for c in fake.calls if c[1] == "-X"]  # Pages was already on
  assert run_git(origin, "rev-list", "--count", "gh-pages").strip() == "3"
  assert rec["commit"] == run_git(origin, "rev-parse", "gh-pages").strip()


def test_publish_of_an_unchanged_module_makes_no_new_commit(pages):
  use, mod, origin = pages
  use(pages_on=True)
  first = kit.publish(mod, remote=str(origin), sleep=lambda s: None)
  assert kit.publish(mod, remote=str(origin), sleep=lambda s: None)["commit"] == first["commit"]


def test_publish_refuses_private_modules_before_pushing(pages):
  use, mod, origin = pages
  fake = use()
  js = mod / "module" / "module.js"
  js.write_text(js.read_text().replace("internal: false", "internal: true"))
  with pytest.raises(kit.KitError, match="team-internal"):
    kit.publish(mod, remote=str(origin))
  js.write_text(js.read_text().replace("internal: true", "internal: false"))
  run_git(mod.parent, "init", "--quiet")
  (mod.parent / ".gitignore").write_text("demo/\n")
  with pytest.raises(kit.KitError, match="ignored by git"):
    kit.publish(mod, remote=str(origin))
  assert fake.calls == []
  assert run_git(origin, "branch", "--list").strip() == ""


def test_publish_fails_when_the_pages_build_fails_or_never_starts(pages):
  use, mod, origin = pages
  use(pages_on=True, states=("errored",))
  with pytest.raises(kit.KitError, match="errored"):
    kit.publish(mod, remote=str(origin), sleep=lambda s: None)
  assert not (mod / "publish.json").exists()
  use(pages_on=True, states=("queued",))
  with pytest.raises(kit.KitError, match="queued"):
    kit.publish(mod, remote=str(origin), wait=10, sleep=lambda s: None)


def test_unpublish_removes_the_folder_and_log(pages):
  use, mod, origin = pages
  use(pages_on=True)
  other = mod.parent / "other"
  kit.new_module(other)
  kit.publish(other, remote=str(origin), sleep=lambda s: None)
  kit.publish(mod, remote=str(origin), sleep=lambda s: None)
  assert kit.unpublish(mod, remote=str(origin))["url"].endswith("/demo/")
  assert pages_files(origin) == {".nojekyll", "other/index.html"}
  assert not (mod / "publish.json").exists()
  with pytest.raises(kit.KitError, match="not published"):
    kit.unpublish(mod, remote=str(origin))


def test_ensure_pages_accepts_pages_that_github_turned_on_meanwhile(monkeypatch):
  calls = []

  def fake(*args):
    calls.append(args)
    if args[1] == "-X":
      raise kit.KitError("gh api -X POST: HTTP 422")
    if len(calls) == 1:
      raise kit.KitError("gh api repos/o/r/pages: Not Found (HTTP 404)")
    return "{}"
  monkeypatch.setattr(kit, "gh", fake)
  kit.ensure_pages("o/r")  # the re-check finds Pages on: no error
  assert len(calls) == 3
  monkeypatch.setattr(kit, "gh", lambda *a: (_ for _ in ()).throw(
    kit.KitError("gh api: Not Found (HTTP 404)")))
  with pytest.raises(kit.KitError, match="404"):
    kit.ensure_pages("o/r")


def test_ensure_pages_rethrows_errors_other_than_not_found(monkeypatch):
  def boom(*args):
    raise kit.KitError("gh api repos/o/r/pages: HTTP 403")
  monkeypatch.setattr(kit, "gh", boom)
  with pytest.raises(kit.KitError, match="403"):
    kit.ensure_pages("o/r")


@pytest.mark.skipif(not kit.find_chrome(), reason="no Chrome/Chromium")
def test_starter_page_reports_clean_in_chrome(tmp_path):
  mod = tmp_path / "demo"
  kit.new_module(mod)
  report, errors = kit.read_report(kit.find_chrome(), kit.build(mod))
  assert errors == []
  assert report["problems"] == []
  assert report["selftest"] and all(t["ok"] for t in report["selftest"])
  assert set(report["checks"].values()) == {"choice", "line", "order", "match"}
  assert report["clips"]["expiry"]["total"] > 5
  assert report["pics"] == ["stopwatch"]
  assert report["warnings"] == []


def test_frame_names_are_per_sheet_and_readable():
  assert kit.frame_name("clip_brushing", 7, "t=41.9") == "clip_brushing_007_t_41.9.png"
  assert kit.frame_name("diagram_map", 2, "flow 1 step 3") == "diagram_map_002_flow_1_step_3.png"


def test_clear_check_output_keeps_other_kinds(tmp_path):
  (tmp_path / "frames").mkdir()
  names = ["pages_1.jpg", "clip_a.jpg", "diagram_m.jpg", "pics.jpg"]
  frames = ["pages_000_y_0.png", "clip_a_000_t_1.png", "diagram_m_000_overview.png",
            "pics_000_p.png"]
  for n in names:
    (tmp_path / n).write_text("x")
  for n in frames:
    (tmp_path / "frames" / n).write_text("x")
  kit.clear_check_output(tmp_path, ("clips",))
  assert sorted(p.name for p in tmp_path.glob("*.jpg")) == ["diagram_m.jpg", "pages_1.jpg",
                                                            "pics.jpg"]
  assert not (tmp_path / "frames" / "clip_a_000_t_1.png").exists()
  assert len(list((tmp_path / "frames").glob("*.png"))) == 3


def test_parse_fragment_and_shot_size():
  frag = kit.parse_fragment("#solo=clip:x&t=4.5&reveal")
  assert frag == {"solo": "clip:x", "t": "4.5", "reveal": True}
  assert kit.shot_size(frag) == (kit.CLIP_W, kit.CLIP_H)
  assert kit.shot_size(kit.parse_fragment("solo=pic:p")) == (kit.PIC_W, kit.PIC_H)
  assert kit.shot_size(kit.parse_fragment("at=intro")) == (kit.PAGE_W, kit.PAGE_H)


@pytest.mark.skipif(not kit.find_chrome(), reason="no Chrome/Chromium")
def test_shot_writes_one_png_per_fragment_and_a_sheet(tmp_path):
  mod = tmp_path / "demo"
  kit.new_module(mod)
  out = kit.shot(mod, ["solo=pic:stopwatch", "solo=clip:expiry&t=2"])
  assert [p.name for p in out] == ["shot_000_solo_pic_stopwatch.png",
                                   "shot_001_solo_clip_expiry_t_2.png", "shots.jpg"]
  assert all(p.exists() and p.stat().st_size > 1000 for p in out)


LAYOUT_FAULTS_JS = """
CLIPS.wrap = { title: "Wrap", scenes: [{ title: "s", build(g, b) {
  b.say("Weeks to months is normal. No progress after a few weeks? Get professional help.", 1);
  return () => {};
} }] };
DIAGRAMS.cut = { width: 600, height: 200, nodes: [
  { id: "a", label: "A", x: 100, y: 100, w: 150, detail: "<p>a</p>" },
  { id: "b", label: "B", x: 300, y: 100, w: 150, detail: "<p>b</p>" }],
  edges: [{ from: "a", to: "b", label: "a label much wider than the gap" }] };
PICS.tiny = { alt: "Tiny text", width: 800, height: 200, draw(g) {
  el("text", { x: 10, y: 50, "font-size": 14 }, g).textContent = "tiny";
} };
"""
LAYOUT_FAULTS_HTML = """<section id="faults"><h2>Faults</h2>
  <div class="callout warn"><span class="ttl">⚠ Icon twice</span><p>x</p></div>
  <div data-pic="tiny" class="side"></div><p>Text beside the picture.</p>
  <div data-clip="wrap"></div><div data-diagram="cut"></div>
</section>
"""


@pytest.mark.skipif(not kit.find_chrome(), reason="no Chrome/Chromium")
def test_layout_lints_flag_wraps_cut_labels_tiny_text_and_double_icons(tmp_path):
  mod = tmp_path / "demo"
  kit.new_module(mod)
  js, html_ = mod / "module" / "module.js", mod / "module" / "content.html"
  js.write_text(js.read_text() + LAYOUT_FAULTS_JS)
  html_.write_text(html_.read_text().replace('<section id="review"',
                                             LAYOUT_FAULTS_HTML + '<section id="review"'))
  report, errors = kit.read_report(kit.find_chrome(), kit.build(mod))
  assert errors == [] and report["problems"] == []
  warns = "\n".join(report["warnings"])
  assert 'clip wrap: caption wraps to two lines' in warns
  assert 'edge label "a label much wider than the gap" (a>b) is cut by node' in warns
  assert "pic tiny: text renders at" in warns
  assert 'callout "⚠ Icon twice": remove the icon' in warns
  assert "stopwatch" not in warns and "expiry" not in warns  # the starter itself stays clean


@pytest.mark.skipif(not kit.find_chrome(), reason="no Chrome/Chromium")
def test_summary_has_no_stray_null_text(tmp_path):
  mod = tmp_path / "demo"
  kit.new_module(mod)
  res = kit.run_chrome(kit.find_chrome(), kit.page_url(kit.build(mod)),
                       f"--window-size={kit.PAGE_W},{kit.PAGE_H}", "--dump-dom")
  m = re.search(r'<div[^>]*data-summary="all"[^>]*>(.*?)</section>', res.stdout, re.DOTALL)
  assert m and "right on the first try" in m.group(1)
  text = re.sub(r"<[^>]+>", " ", m.group(1))
  assert "null" not in text


@pytest.mark.skipif(not kit.find_chrome(), reason="no Chrome/Chromium")
def test_header_has_no_how_this_module_works_block(tmp_path):
  mod = tmp_path / "demo"
  kit.new_module(mod)
  res = kit.run_chrome(kit.find_chrome(), kit.page_url(kit.build(mod)),
                       f"--window-size={kit.PAGE_W},{kit.PAGE_H}", "--dump-dom")
  assert "How this module works" not in res.stdout
  assert 'class="objectives"' in res.stdout


@pytest.mark.skipif(not kit.find_chrome(), reason="no Chrome/Chromium")
def test_glossary_marks_first_use_only_and_warns_about_unused_terms(tmp_path):
  mod = tmp_path / "demo"
  kit.new_module(mod)
  js, html_ = mod / "module" / "module.js", mod / "module" / "content.html"
  js.write_text(js.read_text() + 'GLOSSARY["never used"] = "x";\nGLOSSARY["stage"] = "y";\n')
  html_.write_text(html_.read_text().replace(
      '<section id="review"',
      '<section id="more"><h2>More</h2><p>The lazily thing again, on a stage. A stage twice.</p>'
      '<div data-glossary></div></section><section id="review"'))
  report, errors = kit.read_report(kit.find_chrome(), kit.build(mod))
  assert errors == [] and report["problems"] == []
  assert report["glossary"].count("lazily") == 1      # the first use only
  assert report["glossary"].count("stage") == 1
  assert 'glossary term "never used" never appears in the prose' in "\n".join(report["warnings"])
