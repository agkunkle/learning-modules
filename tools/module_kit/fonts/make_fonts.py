"""Make the kit's embedded web fonts: pin variable axes, subset to Latin, write woff2.

Sources are the OFL fonts from github.com/google/fonts (ofl/barlowsemicondensed, ofl/sourceserif4,
ofl/jetbrainsmono). Download them into one folder, then:

  python3 make_fonts.py <source_dir>

Needs fonttools and brotli (pip install fonttools brotli). The .woff2 files are committed, so a
normal build does not need this script or the network.
"""
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = Path(__file__).resolve().parent
# Basic Latin, Latin-1, general punctuation, arrows, ✓ ✗, ▶ ◀, ○ ◔ ● ◐, ≥ ≤ ×
UNICODES = ("U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-203A,U+2190-2199,U+2212,U+2264-2265,"
            "U+00D7,U+2713,U+2717,U+25B2,U+25B6,U+25BC,U+25C0,U+25CB,U+25D0,U+25D4,U+25CF")

# out name -> (source file, axis pins)
FONTS = {
  "ui-500": ("barlowsemicondensed__BarlowSemiCondensed-Medium.ttf", None),
  "ui-600": ("barlowsemicondensed__BarlowSemiCondensed-SemiBold.ttf", None),
  "text-400": ("sourceserif4__SourceSerif4[opsz,wght].ttf", {"wght": 400, "opsz": 18}),
  "text-600": ("sourceserif4__SourceSerif4[opsz,wght].ttf", {"wght": 600, "opsz": 18}),
  "text-400i": ("sourceserif4__SourceSerif4-Italic[opsz,wght].ttf", {"wght": 400, "opsz": 18}),
  "mono-400": ("jetbrainsmono__JetBrainsMono[wght].ttf", {"wght": 400}),
  "mono-700": ("jetbrainsmono__JetBrainsMono[wght].ttf", {"wght": 700}),
}


def make(src_dir: Path) -> None:
  for name, (src, pins) in FONTS.items():
    font = TTFont(src_dir / src)
    if pins:
      font = instancer.instantiateVariableFont(font, pins)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "liga", "calt", "tnum", "lnum", "onum", "case"]
    opts.name_IDs = ["*"]
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    out = HERE / f"{name}.woff2"
    font.flavor = "woff2"
    font.save(out)
    print(f"{out.name}: {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
  make(Path(sys.argv[1]))
