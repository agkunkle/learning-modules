"""Tests for the linux_elf module: fixture numbers, address maths and the quiz answers.

The tests only read files (the built fixtures and the readelf text output). They never run a
fixture. Tests that need `fixtures/build/` skip when it is missing.
"""
import re
import struct
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "fixtures" / "build"
OUTPUT = ROOT / "fixtures" / "output"
MODULE_JS = (ROOT / "module" / "module.js").read_text()

PT_LOAD, PT_INTERP, PT_DYNAMIC = 1, 3, 2
PF_X, PF_W, PF_R = 1, 2, 4


def read_elf(path):
  data = path.read_bytes()
  (e_type, e_machine, _v, e_entry, e_phoff, e_shoff, _fl, _eh, e_phentsize, e_phnum, _shes,
   e_shnum, _shstr) = struct.unpack_from("<HHIQQQIHHHHHH", data, 0x10)
  phdrs = []
  for i in range(e_phnum):
    (p_type, p_flags, p_offset, p_vaddr, _pa, p_filesz, p_memsz, p_align) = struct.unpack_from(
        "<IIQQQQQQ", data, e_phoff + i * e_phentsize)
    phdrs.append(dict(type=p_type, flags=p_flags, offset=p_offset, vaddr=p_vaddr,
                      filesz=p_filesz, memsz=p_memsz, align=p_align))
  return dict(data=data, type=e_type, machine=e_machine, entry=e_entry, phoff=e_phoff,
              shoff=e_shoff, phnum=e_phnum, shnum=e_shnum, phdrs=phdrs)


def vaddr_of(elf, offset, bias=0):
  """The rule from the module: bias + p_vaddr + (offset - p_offset), inside a PT_LOAD file range."""
  for p in elf["phdrs"]:
    if p["type"] == PT_LOAD and p["offset"] <= offset < p["offset"] + p["filesz"]:
      return bias + p["vaddr"] + (offset - p["offset"])
  raise ValueError(f"offset {offset:#x} is in no PT_LOAD file range")


needs_build = pytest.mark.skipif(not (BUILD / "demo.elf").exists(), reason="fixtures not built")


# ---- demo.elf ------------------------------------------------------------------------------

@needs_build
def test_demo_header_identity():
  e = read_elf(BUILD / "demo.elf")
  d = e["data"]
  assert d[:4] == b"\x7fELF"
  assert d[4] == 2          # EI_CLASS: ELFCLASS64
  assert d[5] == 1          # EI_DATA: little endian
  assert e["type"] == 2     # ET_EXEC
  assert e["machine"] == 183  # EM_AARCH64 = 0xb7
  assert e["entry"] == 0x4000e8
  assert (e["phoff"], e["phnum"]) == (64, 3)
  assert (e["shoff"], e["shnum"]) == (0x2f8, 8)
  assert len(d) == 1272


@needs_build
def test_demo_program_headers_match_clip_constants():
  e = read_elf(BUILD / "demo.elf")
  got = [(p["flags"], p["offset"], p["vaddr"], p["filesz"], p["memsz"]) for p in e["phdrs"]]
  assert got == [
      (PF_R | PF_X, 0x0, 0x400000, 0x108, 0x108),
      (PF_R, 0x108, 0x410108, 0xc, 0xc),
      (PF_R | PF_W, 0x114, 0x420114, 0x8, 0x1008),
  ]
  assert all(p["type"] == PT_LOAD for p in e["phdrs"])
  # The same numbers appear in the clip's SEG table.
  for flags, off, vaddr, filesz, memsz in got:
    for n in (off, vaddr, filesz, memsz):
      assert f"{n:#x}" in MODULE_JS, f"{n:#x} missing from module.js"


@needs_build
def test_offset_to_address_examples():
  e = read_elf(BUILD / "demo.elf")
  assert vaddr_of(e, 0x10a) == 0x41010a   # the clip and the prose
  assert vaddr_of(e, 0x118) == 0x420118   # quiz: offset 0x118
  assert vaddr_of(e, 0x0) == 0x400000
  with pytest.raises(ValueError):
    vaddr_of(e, 0x120)  # symbol table: in the file, in no PT_LOAD


@needs_build
def test_demo_zero_tail_is_memsz_minus_filesz():
  e = read_elf(BUILD / "demo.elf")
  rw = e["phdrs"][2]
  assert rw["memsz"] - rw["filesz"] == 0x1000
  assert rw["vaddr"] + rw["filesz"] == 0x42011c       # tail start shown in the clip
  assert rw["vaddr"] + rw["memsz"] == 0x42111c        # tail end shown in the clip


@needs_build
def test_load_alignment_congruence():
  """Offset and vaddr must agree modulo p_align (the prose says so)."""
  e = read_elf(BUILD / "demo.elf")
  for p in e["phdrs"]:
    assert p["align"] == 0x10000
    assert (p["vaddr"] - p["offset"]) % p["align"] == 0


@needs_build
def test_bl_relocation_arithmetic():
  p, s, a = 0x4000f8, 0x400104, 0
  delta = s + a - p
  assert delta == 0xc
  assert delta % 4 == 0
  imm26 = delta // 4
  assert imm26 == 3
  assert 0x94000000 | imm26 == 0x94000003
  e = read_elf(BUILD / "demo.elf")
  word = struct.unpack_from("<I", e["data"], 0xf8)[0]   # .text is at file offset 0xe8
  assert word == 0x94000003


# ---- dyn.elf and libstub.so ----------------------------------------------------------------

@needs_build
def test_dyn_is_a_pie_with_an_interpreter():
  e = read_elf(BUILD / "dyn.elf")
  assert e["type"] == 3  # ET_DYN
  types = [p["type"] for p in e["phdrs"]]
  assert PT_INTERP in types and PT_DYNAMIC in types
  assert e["entry"] == 0x2d0


@needs_build
def test_libstub_is_dyn_without_interpreter():
  e = read_elf(BUILD / "libstub.so")
  assert e["type"] == 3
  assert PT_INTERP not in [p["type"] for p in e["phdrs"]]
  assert e["entry"] == 0


@needs_build
def test_dyn_bias_example():
  e = read_elf(BUILD / "dyn.elf")
  load2 = [p for p in e["phdrs"] if p["type"] == PT_LOAD][1]
  assert (load2["offset"], load2["vaddr"]) == (0xe80, 0x10e80)
  bias = 0xaaaa00000000
  assert vaddr_of(e, 0x1008, bias) == bias + 0x11008       # quiz: B + 0x11008
  assert vaddr_of(e, 0x1008) == 0x11008                    # the wrong answer 0x11008 needs B = 0
  assert 0x1008 != 0x11008                                 # offset is not the address


# ---- surprise cases ------------------------------------------------------------------------

@needs_build
def test_nosect_copy_keeps_its_program_headers():
  whole, bare = read_elf(BUILD / "demo.elf"), read_elf(BUILD / "demo_nosect.elf")
  assert (bare["shoff"], bare["shnum"]) == (0, 0)
  assert bare["phdrs"] == whole["phdrs"]


def test_stripped_output_has_no_symbol_listing():
  assert (OUTPUT / "stripped_s.txt").read_text().strip() == ""
  sections = (OUTPUT / "stripped_S.txt").read_text()
  assert ".symtab" not in sections and ".strtab" not in sections


# ---- readelf text output (works without the build directory) -------------------------------

def test_recorded_readelf_output_agrees_with_clip():
  text = (OUTPUT / "demo_l.txt").read_text()
  assert "Entry point 0x4000e8" in text
  assert "There are 3 program headers, starting at offset 64" in text
  assert re.search(r"LOAD\s+0x000114 0x0+420114 .* 0x000008 0x001008 RW", text)
  head = (OUTPUT / "demo_h.txt").read_text()
  assert "Start of section headers:          760" in head


# ---- quiz expectations ---------------------------------------------------------------------

def test_every_check_option_has_a_why():
  # An option without a `why` would be a `{ text: "...", correct: true }` with no why after it.
  assert not re.search(r"\{ text: \"[^\"]*\"(?:, correct: true)? \}", MODULE_JS)


def test_quiz_values_are_consistent_with_the_fixtures():
  assert "0x420118" in MODULE_JS      # offset 0x118 in demo.elf
  assert "B + 0x11008" in MODULE_JS   # offset 0x1008 in dyn.elf
  assert "0x420114 + (0x118 &minus; 0x114) = 0x420118" in MODULE_JS


def test_module_avoids_fixed_page_size_and_interpreter_claims():
  # Page size is always labelled illustrative; the interpreter path is "our link command".
  assert "illustrative" in MODULE_JS
  assert "AT_PAGESZ" in (ROOT / "module" / "content.html").read_text()
