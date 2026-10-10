"""Tests for tools/module_kit/kit.py. The Chrome test is skipped when no browser is found."""
import json
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


def test_shot_plan_only_filters():
  assert {p[0] for p in kit.shot_plan(REPORT, only=("clips",))} == {"clip_c"}


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
