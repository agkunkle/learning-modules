# Linux ELF: from ARM64 file bytes to a running process

Status: outline approved by the user. Research done, module built and checked
(`dist/linux_elf.html`). Not committed or published. See `HANDOFF.md`.
Required: at least one captioned animation showing how ELF headers and section contents
relate to loading into process memory.

## Purpose
- Kind: concept.
- Reader: a Linux developer who knows basic C, files, processes, and hexadecimal numbers.
  No prior ELF knowledge or ARM64 assembly expertise is required.
- Duration: about 40 minutes.
- Architecture: ELF64 for Linux AArch64 (ARM64), with little-endian examples.
- After the module, the reader can:
  1. Identify an AArch64 ELF file and explain its main header fields.
  2. Distinguish sections used by build tools from segments used to create the process image.
  3. Translate a file offset into a virtual address within a loadable segment.
  4. Trace the kernel, dynamic linker, and program startup without confusing entry with `main`.
  5. Use `readelf` to inspect symbols, relocations, and dependencies without running the file.

## Source
- Research brief: `research/brief.md`.
- Planned primary references: the generic ELF ABI; Arm's AAELF64 ABI; Linux `elf(5)`;
  GNU Binutils `readelf` documentation; pinned upstream Linux loader excerpts where useful.
- Record exact ABI releases and source revisions before extracting code for the module.
- Examples will be small, module-owned AArch64 build artifacts. Do not run inspected files.
- Public technical subject. Do not include local host details or private source code.

## Outline

| # | Section | Key idea | Rich element | Checks |
|---|---------|----------|--------------|--------|
| 1 | Recognize an ELF file | Magic, class, byte order, machine, and file type answer different questions. | Annotated ELF64 header and `readelf -h` output. | Match header fields to questions; identify AArch64 independently of ELF64. |
| 2 | Two views of one file | Sections describe link-time pieces; segments describe the process image. | Interactive diagram with file, section-table, and program-header views. | Match section/segment roles; decide which table loading uses. |
| 3 | Map bytes into memory | A `PT_LOAD` entry connects file offsets to virtual addresses; memory can extend beyond file bytes. | Captioned clip showing a small file-backed range and a zero-filled tail. | Calculate one address; explain `p_filesz` versus `p_memsz`; identify an alignment rule. |
| 4 | Follow program startup | The kernel and dynamic linker have different jobs; ELF entry is not C `main`. | Interactive startup sequence for a dynamically linked program, with a static-program contrast. | Order startup stages; assign work to kernel, dynamic linker, or startup code. |
| 5 | Read symbols and AArch64 relocations | Symbols name things; relocations tell a tool how to finish a reference. | Tiny AArch64 object example; annotated relocation output; instruction/data fixup clip. | Match symbol states; explain an unresolved call; recognize a relative relocation. |
| 6 | Understand PIE and shared libraries | File type, load bias, interpreter, and dynamic metadata must be read together. | Address translation diagram and annotated dynamic metadata. | Explain unchanged file offsets under relocation; reject an `ET_DYN`-only classification. |
| 7 | Inspect without executing | A short `readelf` workflow connects the earlier concepts using one example. | Guided `-h`, `-l`, `-S`, `-s`, `-r`, and `-d` inspection. | Choose the correct command; find evidence for a dependency or zero-filled memory. |
| 8 | Diagnose common surprises | Missing section headers, stripped symbols, and platform choices do not invalidate the basic model. | Three compact evidence-based inspection cases and a troubleshooting checklist. | Distinguish missing metadata from missing load information; diagnose a startup misconception. |

Each section has two or three checks. All visuals use the existing kit; no new runtime widgets.
The required loading video is an embedded, silent, captioned clip. It follows the ELF header
into the program-header table, selects `PT_LOAD` entries, maps section-containing file ranges
into process virtual memory, shows permissions, and zero-fills the memory-only tail. It keeps
section labels visible as an explanatory overlay, while explicitly showing that the loader
uses program headers rather than section headers. The clip distinguishes virtual mappings
from physical RAM and labels illustrative addresses and any assumed load bias.
The final deliverable is one offline HTML page. Commands and outputs are embedded examples,
not a requirement for the reader to have an ARM64 machine.

## Review quiz
Eight items drawn from all sections:
1. Which fields identify ELF64, little-endian data, and AArch64 respectively?
2. Which ELF table describes loadable segments?
3. Given a file offset and a `PT_LOAD` entry, what is the corresponding virtual address?
4. Why can a loadable segment need more memory than it occupies in the file?
5. What happens between a successful `execve` and a call to C `main`?
6. Why does an AArch64 relocatable object contain a relocation for an external call?
7. Why does `ET_DYN` alone not distinguish a PIE executable from a shared library?
8. Which `readelf` output supports a claim about dependencies, symbols, or mapping?

## Accuracy and boundaries
- Research must ground claims in specification headings, verified source excerpts, or
  `file:line` references in `research/brief.md`.
- Use one pinned version for each upstream source; record it in `META.source`.
- Snapshot code excerpts with `kit.py excerpt`; never hand-copy upstream code.
- Label invented address examples as illustrative; do not present them as measured output.
- Do not imply that ELF64 means AArch64, or that all AArch64 ELF files are little-endian.
- Do not assume a fixed Linux ARM64 page size or a universal dynamic-linker path.
- Do not imply that every section has its own segment, or that `.bss` is a separate segment.
- Keep kernel loading separate from dynamic linking and user-space startup.
- Do not imply that relocation always happens at runtime; distinguish link-time fixups.
- Avoid claiming that every stripped binary lacks a symbol table of every kind.
- Out of scope: full relocation catalog, linker implementation, TLS internals, symbol
  interposition edge cases, BTI/PAC, memory tagging, core dumps, and non-Linux platforms.
- Open decisions: exact release pins and example build strategy, to be resolved from research.

## Verification after approval
- Add tests for address calculations, quiz expectations, and example metadata where useful.
- Run `kit.py check linux_elf` and `kit.py check linux_elf --reveal --theme dark`.
- Fix every warning and error. Open every generated sheet and inspect the drawings.
- Use targeted `kit.py shot` checks for fixes, then run a final full check.
- Do not publish, commit, or push without the user's request.
