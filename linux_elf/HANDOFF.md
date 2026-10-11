# Linux ELF module: status

Status (2026-10-11): built and checked. Not committed, not pushed, not published.
Deliverable: `dist/linux_elf.html` (about 360 KB, offline).

## What exists
- `plan.md`: approved outline (user said "looks good"). No second approval needed.
- `research/brief.md`: research brief (read in full). Pins: Linux v6.12 (adc218676eef),
  glibc 2.41 (74f59e9271cb), Arm abi-aa 2025Q1 (c51addc3dc03), gABI draft 24 Apr 2001,
  man-pages 6.15, binutils 2.38 for the fixtures.
- `fixtures/`: AArch64 assembly sources, linker script, `build.sh`, `build/` (binaries) and
  `output/` (readelf/objdump/xxd text). We assemble, link and inspect. We never run them.
- `module/`: `content.html`, `module.js`, `excerpts.json` (24 excerpts).
- `tests/test_linux_elf.py`: fixture numbers, offset -> address maths, `bl` fixup maths, quiz
  values. Run `python3 -m pytest linux_elf/tests tools/tests` (54 pass).
- `check/` (ignored): sheets from the last `kit.py check`, light and dark. No WARN, PROBLEM or
  JS error.

## Module content
- Ten blocks: intro, eight numbered sections, review quiz (8 items). 30 checks.
- Required video: clip `loading` (about 95 s, 20 captions). ELF header -> program-header table
  -> three PT_LOAD entries -> virtual mappings, permissions, zero-filled tail. Section names
  appear as an overlay, and the clip says the kernel does not need the section table.
  The last scene separates virtual memory from physical RAM.
- Clip `fixup` (about 51 s): CALL26 in `demo.o` and a RELATIVE slot in a PIE.
- Diagrams `views` and `startup`; pictures `ehdr_bytes` and `bias_table`.

## Rules that still apply
- Never run a fixture or any source-project command. Ask before deleting files.
- Do not commit, push or publish unless the user asks. `kit.py publish` makes a public
  GitHub Pages link. The repo is public. This is a public topic, so the module may go in.
- If the user asks for a commit: the fixtures and `module/` are the sources. Consider adding
  `linux_elf/fixtures/build/` to `.gitignore` (binaries can be rebuilt by `build.sh`). The tests
  skip the binary tests when `build/` is missing. Re-snapshot fixture excerpts first if
  provenance must be exact (`fix_prov.py` set `commit: null` for fixtures by hand).

## Claims that rest on weaker evidence (keep the wording as it is)
- "The kernel does not read the section header table" rests on a grep of `fs/binfmt_elf.c`
  (brief G4). The module says the kernel decides mappings from program headers.
- `readelf` prints "PIE executable" only as a correlation with `FLAGS_1`; the module tells
  the reader to read `PT_INTERP`, entry and dynamic flags together.
- `R_AARCH64_GLOB_DAT` is named from the spec only. It is not in the fixtures.
- Page size (4 KiB) and the load bias `B` are labelled illustrative. The interpreter path is
  the one chosen in our link command.
