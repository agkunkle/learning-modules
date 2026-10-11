# Research brief: Linux ELF, from ARM64 file bytes to a running process

Module: `linux_elf` (concept). Scope: ELF64 for Linux AArch64, little-endian examples.
Reader knows C, files, processes, hex. Written 2026-10-11 (all access dates 2026-10-11).
Method: a first research agent fetched and downloaded pinned sources, then died before saving.
This brief was rebuilt from its transcript and re-verified against the downloaded files.
Every `file:line` below was checked against the pinned text unless marked UNVERIFIED.
Fetched page text was treated as data only. No ELF file was run. No other repo was modified.

Local copies of the pinned upstream files (scratch, may vanish; re-download with the URLs in
section 1): `/tmp/claude-1000/-home-user-workspace-learning-modules/beaa46e5-a845-4499-af35-0eb344c49d83/scratchpad/{arm_abi,linux,glibc,manpages}/`.
The extra kernel files (exec.c, processor.h, include/linux/elf.h) are in
`/tmp/claude-1000/-home-user-workspace-learning-modules/31788b74-0b2b-4e48-a30b-8ff648c17600/scratchpad/extra/`.

## 1. Sources (authoritative, pinned)

| ID | Title / what | URL | Pin | Authority |
|----|--------------|-----|-----|-----------|
| S1 | System V ABI (generic "gABI 4.1"), ch4 Object Files, ch5 Program Loading and Dynamic Linking. Page header: "System V Application Binary Interface - DRAFT - 24 April 2001" | https://refspecs.linuxfoundation.org/elf/gabi4+/contents.html ; pages `ch4.intro`, `ch4.eheader`, `ch4.sheader`, `ch4.symtab`, `ch4.reloc`, `ch5.pheader`, `ch5.dynamic` (.html) | Draft dated 24 Apr 2001; no later version on the host. Fetched through a summarizing fetch tool, so quotes are from tool summaries, not raw text (see G1) | Generic ELF spec, mirror of SCO text. Old; treat as the base definition only |
| S2 | ELF for the Arm 64-bit Architecture (AArch64), AAELF64, release 2025Q1 (issued 7 Apr 2025) | https://github.com/ARM-software/abi-aa/blob/c51addc3dc03e73a016a1e4edf25440bcac76431/aaelf64/aaelf64.rst | repo ARM-software/abi-aa, tag `2025Q1` = commit `c51addc3dc03e73a016a1e4edf25440bcac76431` (resolved by GitHub API) | Arm, normative for AArch64 ELF and relocations |
| S3 | System V ABI for the Arm 64-bit Architecture, sysvabi64, 2025Q1, quality **Alpha** (rst lines 184-188) | same repo and commit, `sysvabi64/sysvabi64.rst` | same commit | Arm; Alpha means incompatible changes are possible. Covers loading, dynamic section, PIE |
| S4 | Procedure Call Standard for the Arm 64-bit Architecture (AAPCS64) 2025Q1 | same repo and commit, `aapcs64/aapcs64.rst` | same commit | Arm. Scope only: it defines function calls, not process entry or `main`. Mostly out of scope for this module |
| S5 | Linux kernel `fs/binfmt_elf.c` | https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/fs/binfmt_elf.c | tag `v6.12` (annotated tag object `06090c9b622a...`, tagger date 2024-11-17) -> commit `adc218676eef25575469234709c2d87185ca223a` | Upstream source of truth for what the kernel does |
| S6 | Linux `arch/arm64/include/asm/elf.h` (arm64 ELF constants, `elf_check_arch`, `ELF_ET_DYN_BASE`, `ELF_PLAT_INIT`) | same commit, path `arch/arm64/include/asm/elf.h` | v6.12 commit above | Upstream |
| S7 | Linux `arch/arm64/Kconfig` (page size choice) | same commit, path `arch/arm64/Kconfig` | v6.12 commit above | Upstream |
| S8 | Linux `fs/exec.c`, `include/linux/elf.h`, `arch/arm64/include/asm/processor.h` (execve path, `START_THREAD`, `start_thread`) | same commit, those paths | v6.12 commit above | Upstream |
| S9 | glibc 2.41: `sysdeps/aarch64/start.S`, `sysdeps/aarch64/dl-start.S`, `sysdeps/aarch64/dl-machine.h`, `csu/libc-start.c`, `sysdeps/nptl/libc_start_call_main.h`, `elf/rtld.c`, `sysdeps/unix/sysv/linux/aarch64/shlib-versions` | https://github.com/bminor/glibc/blob/74f59e9271cbb4071671e5a474e7d4f1622b186f/<path> | tag `glibc-2.41` (tag object `abfcddcc4963...`, 2025-01-28) -> commit `74f59e9271cbb4071671e5a474e7d4f1622b186f` | Upstream. One libc only: musl and others differ (see section 8) |
| S10 | `elf(5)` Linux man-pages | https://git.kernel.org/pub/scm/docs/man-pages/man-pages.git/plain/man/man5/elf.5?h=man-pages-6.15 | tag `man-pages-6.15`; file md5 `c87f78c2abfaefe7ff2e9531a24c8106` (a re-download matched the stored copy). Commit id of the tag: UNVERIFIED (git.kernel.org page showed `9b5bd2e62db0...` but the tag-to-commit mapping was not checked) | Linux documentation; descriptive, not normative |
| S11 | GNU Binutils 2.44 documentation, `readelf` | https://sourceware.org/binutils/docs-2.44/binutils/readelf.html | binutils 2.44 docs page; read through a summarizing fetch tool | GNU, authoritative for readelf options |
| S12 | GCC 14.2.0 manual, Link Options (`-pie`, `-no-pie`, `-shared`, `-static-pie`) | https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Link-Options.html | GCC 14.2.0 docs; summarizing fetch tool | GCC |

Pin to record in `META.source` (proposal): "Linux v6.12 (adc218676eef), glibc 2.41 (74f59e9271cb),
Arm abi-aa 2025Q1 (c51addc3dc03), gABI draft 24 Apr 2001, man-pages 6.15, binutils 2.44".
The module's own fixtures use the locally installed toolchain (clang 14.0.0, GNU
`aarch64-linux-gnu-as`/`ld`, `ld.lld-14`, `readelf`, `llvm-readelf`); record their versions
when the fixtures are built. The readelf version may differ from the 2.44 docs (UNVERIFIED match).

## 2. Package / flow map (where each step lives)

### 2.1 Kernel side (Linux v6.12; all lines in S5 unless noted)

```
execve syscall                     fs/exec.c:2097   SYSCALL_DEFINE3(execve...)  [S8]
 -> bprm_execve                    fs/exec.c:1821
   -> exec_binprm                  fs/exec.c:1777
     -> search_binary_handler      fs/exec.c:1730   reads first BINPRM_BUF_SIZE bytes (1678-1687),
                                                    loops over formats, calls fmt->load_binary (1752)
       -> load_elf_binary          binfmt_elf.c:819
```

`load_elf_binary` phases (line numbers in `fs/binfmt_elf.c`):

| Step | What happens | Lines |
|------|--------------|-------|
| 1 | Check `e_ident` magic (`ELFMAG`), `e_type` is `ET_EXEC` or `ET_DYN`, `elf_check_arch`, not FDPIC, file has `mmap` | 843-853 |
| 1a | arm64 `elf_check_arch(x)` is only `(x)->e_machine == EM_AARCH64` | S6 `elf.h:97` |
| 2 | Read the program-header table: `load_elf_phdrs` checks `e_phentsize == sizeof(struct elf_phdr)` and table size `<= 65536` and `<= ELF_MIN_ALIGN`, then reads `e_phnum` entries at `e_phoff` | 506-535 (call at 855) |
| 3 | Find `PT_INTERP`: size check `p_filesz` in [2, PATH_MAX], read path at `p_offset`, require NUL terminator, `open_exec` the interpreter, read its ELF header | 868-915 |
| 4 | Scan for `PT_GNU_STACK` (exec stack flag) and arch program headers | 924-940 |
| 5 | `begin_new_exec` (point of no return), personality, `PF_RANDOMIZE` from `randomize_va_space`, `setup_new_exec`, `setup_arg_pages` (stack) | 996-1014 |
| 6 | Loop over program headers; for each `PT_LOAD`: `make_prot(p_flags)` -> `PROT_READ/WRITE/EXEC`, then `elf_load` | 1028-1167 |
| 6a | First `PT_LOAD`, `ET_EXEC`: `MAP_FIXED_NOREPLACE` at the file's own `p_vaddr` | 1055-1059 |
| 6b | First `PT_LOAD`, `ET_DYN`: compute `total_size = total_mapping_size(...)` and `alignment = maximum_alignment(...)` | 1085, 1093 |
| 6c | `ET_DYN` **with** `PT_INTERP` (a PIE program): `load_bias = ELF_ET_DYN_BASE (+ arch_mmap_rnd() if PF_RANDOMIZE)`, aligned down to `alignment`, then `MAP_FIXED_NOREPLACE`. `ET_DYN` **without** `PT_INTERP` (a loader such as ld.so run as a program): loaded into the mmap region | 1097-1155 (the 1118-1125 branch is the PIE case) |
| 6d | `load_bias = ELF_PAGESTART(load_bias - vaddr)` then `elf_load(file, load_bias + vaddr, ...)`; after the first segment of an `ET_DYN`, `load_bias += error - ELF_PAGESTART(load_bias + vaddr)` | 1164-1180 |
| 6e | Find the segment that contains the program-header table (`e_phoff` inside `[p_offset, p_offset+p_filesz)`), compute `phdr_addr = e_phoff - p_offset + p_vaddr` | 1188-1191 |
| 6f | Sanity: `p_filesz > p_memsz` is rejected; track `start_code/end_code/start_data/end_data/elf_brk` | 1194-1221 |
| 7 | `e_entry = elf_ex->e_entry + load_bias`; add `load_bias` to the other tracked addresses; set `start_brk = brk = ELF_PAGEALIGN(elf_brk)` | 1224-1232 |
| 8 | With `PT_INTERP`: `load_elf_interp` maps the interpreter (own load bias), `elf_entry = interp_load_addr + interp e_entry`. Without: `elf_entry = e_entry` | 1235-1260 |
| 9 | `set_binfmt`, `ARCH_SETUP_ADDITIONAL_PAGES` (arm64 vDSO), `create_elf_tables` (argv, envp, auxv on the new stack) | 1268-1276 |
| 10 | `ELF_PLAT_INIT(regs, reloc_func_desc)` (arm64: `regs[0] = 0`), `finalize_exec`, `START_THREAD(elf_ex, regs, elf_entry, bprm->p)` | 1336-1340 |
| 11 | arm64 `start_thread` zeroes `pt_regs`, sets `pc = elf_entry`, `pstate = PSR_MODE_EL0t`, `sp = bprm->p` | S8 `processor.h:288-306` |

`START_THREAD` is a macro that calls `start_thread(regs, elf_entry, start_stack)`:
S8 `include/linux/elf.h:25-28`. arm64 sets `x0 = 0` (no `atexit` handler): S6 `elf.h:155-159`
(comment: "a1 contains a pointer to a function to be registered with atexit ... 0 means no handler").

Mapping helpers (S5):

| Function | Lines | Role |
|----------|-------|------|
| `ELF_PAGESTART / ELF_PAGEOFFSET / ELF_PAGEALIGN` | 97-99 | Page masks using `ELF_MIN_ALIGN` (= `PAGE_SIZE`, or `ELF_EXEC_PAGESIZE` if larger; lines 87-91). On arm64 `ELF_EXEC_PAGESIZE = PAGE_SIZE` (S6 `elf.h:123`) |
| `padzero` | 118-129 | Clears the bytes from `address` to the end of its page with `clear_user`. Comment at 113-117: zero the tail of the page after `p_filesz` (e.g. bss) so file junk is not visible |
| `elf_map` | 356-397 | `size = p_filesz + pageoffset(p_vaddr)`, `off = p_offset - pageoffset(p_vaddr)`, page-align, `vm_mmap(file, addr, size, prot, type, off)`. Comment 352-355: p_filesz is rounded up to a page, so extra file bytes must be wiped |
| `elf_load` | 400-447 | Calls `elf_map` if `p_filesz != 0`; if `p_memsz > p_filesz`, `padzero` the rest of the last file page, then `vm_brk_flags(zero_start, zero_end - zero_start, ...)` for whole pages up to `p_memsz` (anonymous memory). If `p_filesz == 0` only the `vm_brk_flags` part runs. Comment 395-399: "Memory from p_filesz through p_memsz rounded up to the next page is zeroed" |
| `total_mapping_size` | 449-464 | `max(p_vaddr+p_memsz) - min(pagestart(p_vaddr))` over `PT_LOAD` |
| `maximum_alignment` | 477-495 | Largest power-of-two `p_align` among `PT_LOAD`, at least one page; non-power-of-two ignored |
| `make_prot` | 611-624 | `PF_R/PF_W/PF_X` -> `PROT_READ/WRITE/EXEC`, then `arch_elf_adjust_prot` (arm64: BTI, UNVERIFIED details; out of scope) |
| `create_elf_tables` | 156- (auxv at 242-257) | Builds argv/envp/auxv. Entries include `AT_PAGESZ` (242), `AT_PHDR` (244), `AT_PHENT`, `AT_PHNUM`, `AT_BASE = interp_load_addr` (247), `AT_ENTRY = e_entry` (251), `AT_RANDOM` (257). arm64 `ARCH_DLINFO` adds `AT_SYSINFO_EHDR` (vDSO): S6/S8 `elf.h:168-170` (arm64 header) |

Page size: arm64 Kconfig offers 4KB, 16KB, and 64KB pages (S7 `Kconfig:1310-1330`; default
`ARM64_4K_PAGES` at 1310). `AT_PAGESZ` tells user space the actual value.

### 2.2 User space, glibc 2.41 on AArch64 (dynamic program)

```
kernel jumps to interpreter entry (AT_BASE + interp e_entry)
ld.so _start        sysdeps/aarch64/dl-start.S:23   bl _dl_start (32), result = user entry in x0->x21
 _dl_start          elf/rtld.c:518   self-relocates; _dl_sysdep_start(arg, &dl_main) at 496 [in _dl_start_final]
  dl_main           elf/rtld.c:1302  main_map from AT_PHDR/AT_ENTRY; _dl_map_object_deps at 1928;
                                     _dl_relocate_object at 2240/2267; *user_entry = main_map->l_entry (1559, direct-run case only)
 _dl_start_user     dl-start.S:56-74 bl _dl_init (68) then `br x16` to user entry x21 (74)
program _start      sysdeps/aarch64/start.S:63-112  (crt1.o)
 __libc_start_main  csu/libc-start.c  (_dl_relocate_static_pie 274; rtld_fini atexit 312; call_init 347/355)
 __libc_start_call_main  sysdeps/nptl/libc_start_call_main.h:58 `result = main(...)`, 74 `exit(result)`
 main
```

Checked facts (S9): `start.S:45-50` says `x0` holds a function pointer to register with `atexit`
(`rtld_fini`, set by ld.so for dynamic programs); `start.S:73-98` loads `argc`/`argv` from `sp`,
passes `main` and calls `__libc_start_main`; `start.S:100-101` `bl abort` "should never get here".
`dl-start.S:29-33` "Load and relocate all library dependencies ... Returns user entry point in x0".
`dl-start.S:60-74` computes argc/argv/envp, calls `_dl_init`, loads `_dl_fini`, jumps to the user entry.

Static (non-PIE, no interpreter) contrast: no `PT_INTERP`, so the kernel sets `elf_entry = e_entry`
(binfmt_elf.c:1259) and the first user instruction is the program's own `_start`. In glibc
`__libc_start_main` then does its own setup (`_dl_aux_init`, `__tunables_init`, IREL relocations,
TLS setup; `csu/libc-start.c` ~160-310 `#ifndef SHARED` paths).
`_dl_relocate_static_pie` (libc-start.c:274) is the static-PIE self-relocation step.
`ld.so` run directly as a command is a special case: `rtld.c:1329-1330` detects "We are the
program itself" and rewrites AT_PHDR/AT_PHNUM/AT_ENTRY (1570-1577). Do not teach it as the normal path.

## 3. Key abstractions (claims with sources)

Claim tags: [S#] source id, `(L)` = verified line pin, `(H)` = spec heading.

### 3.1 Identification and header
- C1. First bytes `7f 45 4c 46` mark an ELF file: `e_ident` "The initial bytes mark the file as an object file" [S1 ch4.eheader "ELF Identification"]; kernel checks `memcmp(e_ident, ELFMAG, SELFMAG)` [S5 binfmt_elf.c:843-844 (L)].
- C2. `EI_CLASS` selects the structure sizes (`ELFCLASS32`/`ELFCLASS64`); `EI_DATA` selects byte order (`ELFDATA2LSB`/`2MSB`). They are independent properties [S1 ch4.eheader (H)]. `e_machine` names the architecture and is a third, separate field [S1 "e_machine"; S2 "ELF Header" (aaelf64.rst:565-571 L)].
- C3. AArch64 needs `e_machine = EM_AARCH64 (183, 0xB7)` [S2 aaelf64.rst:570-571 (L)]. `EI_CLASS` is `ELFCLASS64` for ELF64 (and `ELFCLASS32` is a Beta ILP32 variant) [S2 aaelf64.rst:587-592 (L)]. `EI_DATA` "may be either ELFDATA2LSB or ELFDATA2MSB ... governed by the default data order in the execution environment" [S2 aaelf64.rst:594-595 (L)]. So ELF64 does not imply AArch64, and AArch64 does not imply little-endian.
- C4. `e_flags` shall be zero on AArch64 (no processor flags) [S2 aaelf64.rst:578-579 (L)]. `EI_OSABI` shall be zero unless OS-specific section indexes are used [S2 aaelf64.rst:597-598 (L)].
- C5. `e_entry` is "the virtual address to which the system first transfers control"; zero if no entry point [S1 "e_entry"; S10 elf.5:492-495 (L)]. For a PIE the kernel adds the load bias (`e_entry = elf_ex->e_entry + load_bias`) [S5:1224 (L)].
- C6. `e_phoff`, `e_phnum`, `e_shoff`, `e_shnum` locate the two tables; each is zero if the table is absent [S1 "Entry, offsets, and counts" (H)]. The ELF header "is the only structure with a fixed file position" [S1 ch4.intro "ELF object-file views" (H)].
- C7. Linux (kernel) loads only `ET_EXEC` and `ET_DYN` [S5:846-847 (L)]. Types: `ET_REL`, `ET_EXEC`, `ET_DYN`, `ET_CORE` [S1 "e_type"].
- C8. Struct field order of `Elf64_Phdr`: `p_type, p_flags, p_offset, p_vaddr, p_paddr, p_filesz, p_memsz, p_align` [S10 elf.5:645-653 (L)]. Sizes (ELF64: header 64 bytes, program header 56 bytes, section header 64 bytes) follow from the field widths in [S10 `Elf64_Ehdr`/`Elf64_Phdr`/`Elf64_Shdr`]; the numbers are derived, not printed in the sources. The kernel requires `e_phentsize == sizeof(struct elf_phdr)` [S5:515-516 (L)].

### 3.2 Two views, sections vs segments
- C9. Linking view: sections; "A section header table is required for files used during linking; the program header table is optional." Execution view: segments; "A program header table is required for files used to create a process image; the section header table is optional." [S1 ch4.intro (H)].
- C10. "Sections serve linking; segments serve program execution. Their order in the file is unspecified." [S1 ch4.intro (H)]. Segments are not one-to-one with sections: several sections can sit inside one segment (inference from C9; not a quoted rule; see section 8).
- C11. The kernel loader reads program headers only: `load_elf_phdrs` and the `PT_LOAD` loop. `grep -n 'e_shoff\|e_shnum\|e_shentsize' binfmt_elf.c` at v6.12 finds hits only at lines 1983-2068, which are core-dump code (`fill_extnum_info`), not loading [S5 (L), verified by grep]. Teach: "the loader works from program headers".
- C12. `SHT_NOBITS`: "takes no space in the file, though its size may be nonzero"; `sh_offset` is "conceptual" [S1 ch4.sheader (H); S10 elf.5:978-984 (L)]. `.bss` is an `SHT_NOBITS` section "included in a program's memory image", zero-initialized at start [S1 ch4.sheader (H)].
- C13. `sh_addr`: "the address where a section's first byte should reside if the section is placed in a process memory image; otherwise zero" [S1 ch4.sheader (H)].

### 3.3 PT_LOAD and address translation
- C14. `PT_LOAD`: `p_filesz` is size in file, `p_memsz` size in memory; if memory size is larger the extra bytes are zero, following the initialized area; file size cannot exceed memory size [S1 ch5.pheader "Program Header" (H); S10 elf.5:671-683 (L)]. The kernel rejects `p_filesz > p_memsz` [S5:1205 (L)].
- C15. "The bytes from the file are mapped to the beginning of the memory segment" [S10 elf.5:674-675 (L)]. Translation rule (derived): for a file offset `off` with `p_offset <= off < p_offset + p_filesz`, runtime address = `load_bias + p_vaddr + (off - p_offset)`; `load_bias = 0` for `ET_EXEC`. Support: `elf_map` maps file offset `p_offset - pageoffset(p_vaddr)` at `ELF_PAGESTART(addr)` [S5:361-364 (L)] and `phdr_addr = e_phoff - p_offset + p_vaddr` [S5:1190-1191 (L)] uses the same formula. Offsets outside every `[p_offset, p_offset+p_filesz)` range have no mapping from that segment.
- C16. `p_align`: 0 or 1 means no alignment; otherwise a power of two with `p_vaddr == p_offset (mod p_align)` [S1 ch5.pheader (H); S10 elf.5:785-801 (L)]. Arm adds: offsets and addresses must be congruent modulo the page size; recommends `p_align` = 64KiB for compatibility with 64KiB-page systems [S3 sysvabi64.rst:961-976 (L)]. Linux uses `maximum_alignment` of the `PT_LOAD` `p_align` values only for `ET_DYN` placement [S5:477-495, 1093, 1124 (L)].
- C17. The zero-filled tail is built from two pieces: (a) zeroing the rest of the last file-backed page with `padzero` [S5:118-129, 421 (L)]; (b) anonymous pages from `vm_brk_flags` for whole pages beyond [S5:437-444 (L)]. If the segment is not writable the `padzero` failure is ignored [S5:417-422 (L)].
- C18. `.bss` is not a segment. It is an `SHT_NOBITS` section that lives in the tail of the writable `PT_LOAD` where `p_memsz > p_filesz` (inference from C12, C14; not stated as one sentence in a source). A linker may or may not give data and bss separate `PT_LOAD` entries (see gotchas).
- C19. Permissions come from `p_flags`: `PF_R/PF_W/PF_X` -> `PROT_*` [S5:611-624 (L); S10 elf.5:~750-770 (L)]. Text is commonly R+X, data R+W [S10 elf.5:~765-772].
- C20. The kernel maps with `MAP_PRIVATE` file mappings via `vm_mmap` [S5:1041 `elf_flags = MAP_PRIVATE`, 356-397 (L)]. A mapping is a virtual-memory-area entry; physical pages are filled on demand (page faults). Source for demand paging: Arm text "in most systems with demand paging, when the actual page is mapped into physical memory depends on the execution behaviour of the program" [S3 sysvabi64.rst:961-970 (L)].
- C21. Base address: "a loadable segment's actual memory address may differ from its virtual address in the file; the difference is the base address" [S1 ch5.pheader "Base Address" (H)]. In the kernel it is `load_bias` [S5:822, 1164-1180, 1224 (L)].

### 3.4 PIE, ET_DYN, shared libraries, interpreter
- C22. Shared objects have base virtual address 0 in the file; `ET_EXEC` has fixed addresses; "Position-independent executables ... have an ELF `e_type` of `ET_DYN`" and "are mapped in the same way as shared objects" [S3 sysvabi64.rst:998-1012 (L)].
- C23. The kernel treats two kinds of `ET_DYN` differently: with `PT_INTERP` (programs, PIE) the program gets `ELF_ET_DYN_BASE` plus random offset; without `PT_INTERP` ("loaders ... since they _are_ the ELF interpreter") it goes to the mmap region [S5:1097-1115 comment (L), 1118-1130 (L)]. So `ET_DYN` alone does not classify a file as a PIE executable or a shared library; look at `PT_INTERP`, `DT_FLAGS_1 = DF_1_PIE` (UNVERIFIED; not researched), and `e_entry`. The kernel does not distinguish "shared library" from "program" by type: any `ET_DYN` can be executed (inference from C7).
- C24. `PT_INTERP` holds a NUL-terminated path; at most once; must precede loadable segments [S1 ch5.pheader (H); S10 elf.5:695-700 (L)]. The kernel reads it from `p_offset` for `p_filesz` bytes [S5:868-890 (L)].
- C25. The interpreter path is not universal. glibc names its AArch64 loader `ld-linux-aarch64.so.1` (`ld-linux-aarch64_be.so.1` for big-endian) [S9 `sysdeps/unix/sysv/linux/aarch64/shlib-versions:4,6` (L)]. Other libcs or toolchains differ (UNVERIFIED). The directory part (e.g. `/lib/` vs `/lib64/`) is distribution-dependent (UNVERIFIED, not in sources). Show the path as read from a fixture with `readelf -l` instead of a claim.
- C26. `PT_DYNAMIC` holds the `.dynamic` array; "If an object file participates in dynamic linking, its program header table will have an element of type PT_DYNAMIC" [S1 ch5.dynamic "Dynamic Section" (H)]. `DT_NEEDED` = "string table offset of a null-terminated string, giving the name of a needed library"; `DT_NULL` ends the array [S1 ch5.dynamic (H)]. Other tags: `DT_STRTAB`, `DT_SYMTAB`, `DT_RELA`, `DT_RELASZ`, `DT_JMPREL`, `DT_PLTGOT`, `DT_SONAME` [S1 ch5.dynamic (H)]. On AArch64 `DT_PLTGOT` is the address of `.got.plt` [S3 sysvabi64.rst:1027-1029 (L)].
- C27. GCC: `-pie` = dynamically linked PIE; `-no-pie` prevents it; `-shared` = shared object; `-static-pie` = static PIE "loads at any address without a dynamic linker" (needs matching `-fpie`/`-fPIE`/`-fpic`) [S12 (H, tool summary)]. Use for the "static PIE" contrast; an `ET_DYN` file without `PT_INTERP` can be a static PIE or a loader (C23).

### 3.5 Entry, auxv, main
- C28. `e_entry` is where control first goes; for a dynamically linked program the kernel enters the **interpreter's** entry, not `e_entry` [S5:1235-1243 (L), 1340 (L)]. `AT_ENTRY` tells the interpreter where the program's entry is (`e_entry` + bias) [S5:251 (L)]; `AT_BASE` is the interpreter base (zero without interpreter) [S5:247 (L)]; `AT_PHDR/AT_PHENT/AT_PHNUM` locate the program headers in memory [S5:244-246 (L)].
- C29. In glibc the interpreter returns the user entry from `_dl_start`, runs `_dl_init`, and jumps to it [S9 dl-start.S:23-74 (L)]. The user entry is `_start` from `crt1.o`; it calls `__libc_start_main`, which calls `main` and then `exit(result)` [S9 start.S:63-98; libc_start_call_main.h:58,74 (L)]. `main` is a C function that `_start` calls; it is not the ELF entry [S1 "e_entry" defines the entry as the first transfer of control; S4 scope: AAPCS64 does not describe process entry].
- C30. At the program `_start`, `sp` points to `argc`, then `argv[]`, NULL, `envp[]`, NULL [S9 start.S:52-59 (L)].

### 3.6 Symbols
- C31. Symbol value meaning: in `ET_REL` a defined symbol's `st_value` is a section offset; in executables and shared objects it is a virtual address [S1 ch4.symtab "Symbol Values" (H)].
- C32. Bindings: `STB_LOCAL` stays inside its object; `STB_GLOBAL` visible across objects; `STB_WEAK` lower precedence, unresolved weak resolves to zero [S1 ch4.symtab (H)]. `SHN_UNDEF` marks an undefined (external) symbol [S10 elf.5:837 (L)].
- C33. `.symtab` vs `.dynsym` roles: NOT established in the fetched text. Do not teach a precise definition from these sources. Safe wording: `readelf -s` prints the symbol tables the file has; `readelf --dyn-syms` prints dynamic symbols [S11 (H)]. A stripped file may keep `.dynsym` (a general fact, UNVERIFIED in the fetched text; confirm with the fixture's own output).

### 3.7 AArch64 relocations (S2 `aaelf64.rst`)
- C34. Static vs dynamic: "A static relocation relocates a place in an ELF relocatable file (`e_type = ET_REL`); a static linker processes it. A dynamic relocation ... in an ELF executable file or dynamic shared object (`ET_EXEC, ET_DYN`) ... handled by a dynamic linker" [aaelf64.rst:916-926 (L)]. "A well-formed executable file or dynamic shared object has no static relocations after static linking" [aaelf64.rst:~937 (L)]. A static linker either resolves a relocation fully or turns it into a dynamic relocation [aaelf64.rst:~935 (L)].
- C35. `r_offset`: in `ET_REL` a byte offset in the section being modified; in executables and shared objects a virtual address. `r_info` = symbol index + relocation type. `Rel` has implicit addend, `Rela` explicit `r_addend` [S1 ch4.reloc (H)]. AArch64 operations use `S` symbol address, `A` addend, `P` place address [aaelf64.rst:1026-1033 (L)].
- C36. `R_AARCH64_CALL26` (ELF64 code 283), `S+A-P`, sets the immediate of a `BL` to bits [27:2]; range -2^27 <= X < 2^27 (about +/-128 MB) [aaelf64.rst:1225 (L); veneer text 1335-1355 (L)]. A linker may insert a veneer if the target is undefined/external or out of range [aaelf64.rst:1339-1349 (L)]. `R_AARCH64_JUMP26` (282) is the same for `B` [aaelf64.rst:1223 (L)].
- C37. `R_AARCH64_ADR_PREL_PG_HI21` (275): `Page(S+A)-Page(P)`, ADRP immediate = bits [32:12], range +/-4 GiB (2^32) [aaelf64.rst:1186 (L)]. `R_AARCH64_ADD_ABS_LO12_NC` (277): `S+A`, ADD immediate = bits [11:0], no overflow check, "Used with" ADR_PREL_PG_HI21 [aaelf64.rst:1190-1191 (L)]. "_NC" = non-checking [aaelf64.rst:1051 (L)]. The pair is the standard way to address data: `adrp x0, sym` then `add x0, x0, :lo12:sym` [aaelf64.rst:1428-1429 (L)]. They are resolved at link time for a fixed layout (no run-time relocation needed for position-independent pc-relative access).
- C38. `Page(expr)` = `expr & ~0xFFF` "even if the machine page size supported by the platform has a different value" [aaelf64.rst:1035 (L)]. So ADRP's page is always 4 KiB for relocation math, even on Linux kernels with 16/64 KiB pages (see D4).
- C39. Dynamic relocations (codes from 1024 in ELF64) [aaelf64.rst:1769-1795 (L)]: `R_AARCH64_COPY` 1024, `GLOB_DAT` 1025 (`S+A`), `JUMP_SLOT` 1026 (`S+A`), `RELATIVE` 1027 (`Delta(S)+A`), `IRELATIVE` 1032. Kernel header defines `R_AARCH64_RELATIVE 1027` [S6 elf.h:68 (L)].
- C40. `RELATIVE`: "a relative adjustment to the place based on the load address of the object relative to its original link address"; null symbol (index 0) -> adjustment of the segment defining the place; "an optimization; a static linker can use it to replace GLOB_DAT when the symbol is known at static link time to always resolve to the current link unit" [aaelf64.rst:1840 (L)]. glibc implements it as `*reloc_addr = map->l_addr + reloc->r_addend` [S9 dl-machine.h:177-178 (L)].
- C41. `GLOB_DAT` "relocates a GOT entry used to hold the address of a (data) symbol which must be resolved at load time" [aaelf64.rst:1828 (L)]. `JUMP_SLOT` "is used to mark code targets that will be executed"; may be lazy; initial value is the stub offset adjusted by the load offset [aaelf64.rst:1830-1836 (L)]. glibc: `GLOB_DAT`/`JUMP_SLOT` store `value + r_addend` [S9 dl-machine.h:198-201 (L)].
- C42. `Delta(S)` = difference between the static link address and the execution address [aaelf64.rst:1043 (L)]; so a RELATIVE entry fixes a stored pointer for the load bias.
- C43. For an external `bl` in an `ET_REL` object the assembler cannot know the target, so it emits a `CALL26` relocation against the undefined symbol [derived from C34, C36; assembler behavior to be confirmed from the fixture's `readelf -r` output].

### 3.8 readelf (S11, tool summary)
`-h` file header; `-l` program headers (segments); `-S` section headers; `-s` symbols; `--dyn-syms` dynamic symbols; `-r` relocations; `-d` dynamic section; `-n` notes; `-W` no line wrapping; `--version`. Handles 32- and 64-bit ELF (cross-architecture inspection works). No `ldd` warning in the fetched text (G3). `readelf` never executes the file. UNVERIFIED: `readelf -l` prints a "Section to Segment mapping" table (known tool behavior, not in fetched text; confirm with fixture output).

## 4. Excerpt candidates (10-12)

Snapshot with `kit.py excerpt linux_elf <id> <file> <a-b> [--rev R]`. Problem: `snapshot()` stores
`repo`/`commit` from the file's git root; the upstream files are plain downloads, so `commit` would
be `None`. Either save the pinned files in a throwaway git repo (never commit), or record the pin in
`META.source` by hand. All upstream files here are GPL (Linux, glibc) or CC-BY-SA/Apache (Arm):
the repo is public, so keep excerpts short and attributed; confirm licensing before publishing.
Do not hand-copy; line ranges below match the pinned text.

| # | Id (proposal) | File and lines | Purpose |
|---|---------------|----------------|---------|
| E1 | `ehdr_e_ident` | S10 `elf.5` struct `Elf64_Ehdr` (starts 127-160) or fixture `readelf -h` output | ELF header fields |
| E2 | `phdr_struct` | S10 `elf.5:645-653` (`Elf64_Phdr`) | Program-header fields |
| E3 | `ptload_semantics` | S10 `elf.5:671-683` | filesz/memsz rule |
| E4 | `palign_rule` | S10 `elf.5:785-801` | congruence rule |
| E5 | `kernel_checks` | S5 `binfmt_elf.c:843-853` | What the kernel verifies first |
| E6 | `kernel_elf_map` | S5 `binfmt_elf.c:356-370` | file offset to page-aligned mmap |
| E7 | `kernel_elf_load` | S5 `binfmt_elf.c:400-445` | file-backed part plus zero tail |
| E8 | `kernel_make_prot` | S5 `binfmt_elf.c:611-624` | p_flags to PROT |
| E9 | `kernel_load_bias` | S5 `binfmt_elf.c:1118-1125` and `1164-1180`, or `1224` | ASLR bias; entry plus bias |
| E10 | `kernel_start_thread` | S5 `binfmt_elf.c:1336-1340` and S8 `processor.h:299-306` | pc = entry, EL0, sp |
| E11 | `glibc_start_s` | S9 `start.S:63-98` | `_start` calls `__libc_start_main` |
| E12 | `glibc_relative` | S9 `dl-machine.h:177-178` (+ `198-201`) | RELATIVE vs GLOB_DAT/JUMP_SLOT |
| E13 (spare) | `aaelf64_relocs` | S2 `aaelf64.rst:1186,1190-1191,1225` | Table rows for ADRP/ADD/CALL26 (rst table, not code) |

Fixture excerpts (module-owned, built later): `readelf -h/-l/-S/-s/-r/-d` output of the assembly
fixtures and the `.s` source. These have no upstream commit; give provenance as toolchain
version and source hash (open decision from plan.md).

## 5. Fixture and test notes (from the handoff; not yet built)
- Installed (per HANDOFF): clang 14.0.0, `readelf`, `llvm-readelf`, `aarch64-linux-gnu-as`, `aarch64-linux-gnu-ld`, `ld.lld-14`; no cross GCC.
- A no-libc static fixture with a linker script (RX incl. headers, R `.rodata`, RW `.data` + `.bss`) makes three `PT_LOAD`; read real values from output. Do not run it (the host is not required to be ARM64 anyway).
- An object with `bl ext` + `adrp/add` shows `CALL26`, `ADR_PREL_PG_HI21`, `ADD_ABS_LO12_NC` in `readelf -r`. An optional tiny `-shared` object with a data pointer shows `R_AARCH64_RELATIVE`.
- A dynamic example (`PT_INTERP`, `DT_NEEDED`, `GLOB_DAT`, `JUMP_SLOT`) needs a libc link; a cross GCC and sysroot are missing, so UNVERIFIED whether it can be built here; otherwise use `ld` with a stub `.so` built by the same tools. If no dynamic fixture is built, label dynamic-linking figures "illustrative".
- Tests: (a) offset-to-vaddr helper with the C15 formula; (b) quiz answer key; (c) fixture metadata (values from `readelf` text) match the numbers on the page.
- Illustrative addresses in the clip must be labelled "illustrative". Example numbers (invented, self-consistent, flagged as such): segment `p_offset=0x1000`, `p_vaddr=0x401000`, `p_filesz=0x230`, `p_memsz=0x400`; file offset `0x1100` -> vaddr `0x401100`; tail covers `p_vaddr+0x230 .. +0x400`.

## 6. Quiz items (8) with right and wrong answers

Q1. Which fields identify ELF64, little-endian data, and AArch64? [C2, C3]
- Right: `e_ident[EI_CLASS] = ELFCLASS64` (ELF64); `e_ident[EI_DATA] = ELFDATA2LSB` (little-endian); `e_machine = EM_AARCH64` (183, 0xB7).
- Wrong (tempting): "ELFCLASS64 means AArch64" (class is only structure size; x86-64 is also ELF64). "e_type says the machine" (e_type says object kind). "AArch64 is always little-endian" (S2 allows `ELFDATA2MSB`). elf.5 says EI_CLASS "identifies the architecture" (D2): do not repeat it.
- Why: three independent header fields; source S1 + S2.

Q2. Which ELF table describes loadable segments? [C9-C11]
- Right: the program header table (`PT_LOAD` entries), located by `e_phoff`/`e_phnum`.
- Wrong: the section header table (link-time view; optional for execution); `.symtab`; `.dynamic` (dynamic linking info, found via `PT_DYNAMIC`).
- Why: S1 ch4.intro; kernel loop at S5:1028-1035.

Q3. Given a file offset and a `PT_LOAD` entry, what is the virtual address? [C15]
- Use the invented example in section 5: `p_offset=0x1000`, `p_vaddr=0x401000`, `p_filesz=0x230`; offset `0x1100` -> `0x401100`; with load bias `0x7f0000000000` (illustrative) -> `0x7f0000401100`. Offset `0x1300` (>= `p_offset + p_filesz`) is not in this segment's file bytes.
- Wrong: `p_vaddr + off` (forgets the subtraction of `p_offset`); `off + load_bias` (forgets `p_vaddr`); adding bias to the file offset itself (offsets never change under bias).
- Why: S5 elf_map 361-364, 1190-1191; S1 "Base Address".

Q4. Why can a loadable segment need more memory than it occupies in the file? [C14, C17, C18]
- Right: `p_memsz > p_filesz`; the extra bytes are zero-initialized memory (typical for `.bss`); the kernel zeroes the page tail and adds anonymous zero pages, so the file stores no bytes for them.
- Wrong: "the loader pads the file on disk"; "the extra memory is uninitialized garbage"; "`.bss` is its own segment" (it is a section in the tail of a data `PT_LOAD` segment); "memory is physical RAM reserved up front" (virtual mappings, filled on demand).
- Why: S1 ch5.pheader; S5:118-129, 400-445.

Q5. What happens between a successful `execve` and a call to C `main`? [flows 2.1, 2.2]
- Right (dynamic glibc program): kernel `load_elf_binary` maps `PT_LOAD` segments of the program and interpreter, builds stack/auxv, sets `pc` to the interpreter entry; ld.so loads `DT_NEEDED` libraries, relocates, runs initializers, jumps to the program's `e_entry` (`_start`); `_start` calls `__libc_start_main`, which does libc setup and calls `main`. For a static program the kernel jumps directly to `e_entry`.
- Wrong: "the kernel calls `main`"; "`e_entry` is `main`"; "the kernel resolves shared libraries"; "ld.so runs after `main` returns".
- Why: S5:1235-1340; S9 dl-start.S, start.S, libc_start_call_main.h. glibc-specific for user space (D5 caveat).

Q6. Why does an AArch64 relocatable object contain a relocation for an external call? [C34-C36, C43]
- Right: at assembly time the target of `bl` is not known (undefined symbol, address not final); the assembler leaves the immediate zero and emits `R_AARCH64_CALL26` so the linker can patch the `BL` offset (`S+A-P`, 26-bit word offset, +/-128 MB) or add a veneer.
- Wrong: "the dynamic linker patches it at run time" (this is a static relocation in `ET_REL`); "the call uses an absolute 64-bit address"; "CALL26 is the ADRP relocation".
- Why: S2 aaelf64.rst:916-926, 1225, 1339-1349.

Q7. Why does `ET_DYN` alone not distinguish a PIE executable from a shared library? [C22, C23, C27]
- Right: both are `ET_DYN` and are mapped the same way; other evidence is needed (`PT_INTERP`, entry point, `.dynamic` flags). The kernel itself branches on `PT_INTERP` presence, not on any "library" marker.
- Wrong: "`ET_DYN` means shared library"; "PIE has `ET_EXEC` with a flag"; "no `PT_INTERP` always means a shared library" (static PIE and ld.so itself also lack it).
- Why: S3 sysvabi64.rst:1011-1012; S5:1097-1130; S12.

Q8. Which `readelf` output supports a claim about dependencies, symbols, or mapping? [3.8]
- Right: dependencies -> `readelf -d` (`NEEDED` lines); symbols -> `readelf -s` / `--dyn-syms`; mapping and zero tail -> `readelf -l` (`FileSiz` < `MemSiz`, `Flg`, `Offset`/`VirtAddr`); relocations -> `-r`; header -> `-h`.
- Wrong: using `-S` alone for loading claims (sections are the link view); running the file (`ldd`) to find dependencies (executes the loader; the module never runs files; no `ldd` warning appears in S11, so do not cite one: G3).
- Why: S11 option list; S1 ch4.intro.

Each section (1-8 in plan.md) also needs 2-3 checks; reuse the C-claims as the answer basis.

## 7. Glossary
- ELF: Executable and Linkable Format; one file format for object files, executables, shared objects, core files.
- AArch64: Arm 64-bit execution state; ELF `e_machine = 183`.
- ELF64: 64-bit structures (class), not a CPU name.
- Program header (Phdr): entry that describes a segment (or note, dynamic info, interpreter).
- Segment: contiguous range described by a program header; execution view.
- Section: named range described by a section header; link view (`.text`, `.data`, `.bss`, `.rodata`, `.symtab`, `.dynamic`...).
- `PT_LOAD`: segment to map into memory. `PT_INTERP`: path of the interpreter. `PT_DYNAMIC`: dynamic linking array.
- `p_offset`/`p_vaddr`/`p_filesz`/`p_memsz`/`p_align`/`p_flags`: file position, virtual address, bytes in file, bytes in memory, alignment, R/W/X.
- Load bias (base address): runtime address minus file virtual address; 0 for `ET_EXEC`, nonzero for PIE and shared objects.
- Zero-filled tail: memory from `p_filesz` to `p_memsz`, zero at start.
- Entry point (`e_entry`): first address executed; not `main`.
- Interpreter / dynamic linker: user-space program named by `PT_INTERP`; on glibc, ld.so.
- Auxiliary vector (auxv): key/value pairs the kernel puts on the new stack after `envp` (e.g. `AT_PHDR`, `AT_ENTRY`, `AT_BASE`, `AT_PAGESZ`, `AT_RANDOM`).
- Symbol: named address or value (`st_name`, `st_value`, `st_info`, `st_shndx`).
- Relocation: record telling a tool how to fix a place (`r_offset`, `r_info`, `r_addend`). Static: linker. Dynamic: dynamic linker.
- GOT / PLT: table of addresses filled at load time / call stubs that use it (`R_AARCH64_GLOB_DAT`, `JUMP_SLOT`).
- PIE: position-independent executable, `ET_DYN`, loaded at a random base.
- ADRP: Arm instruction that forms a 4 KiB page address from a PC-relative immediate. Veneer: linker-made stub that extends branch range.
- Virtual memory vs physical RAM: a mapping describes address-space layout; pages are filled by page faults.

## 8. Gotchas and boundaries (checked or flagged)
1. ELF64 != AArch64; AArch64 != little-endian (C3). Show `ELFDATA2LSB` as the example, not as a rule.
2. Do not state a page size. Linux/arm64 supports 4K, 16K, 64K (S7 Kconfig:1310-1330); read `AT_PAGESZ`. The linker's `p_align` (often 64 KiB for AArch64 per S3 advice) is separate from the kernel page size.
3. Do not state an interpreter path as universal (C25). Print it from the fixture.
4. `.bss` is not a separate segment (C18). A linker may emit one RW `PT_LOAD` with `p_memsz > p_filesz`, or separate entries. Show what the fixture shows.
5. `e_entry` is not `main` (C29). `_start` -> `__libc_start_main` -> `main` (glibc).
6. Section headers are not needed to run a program (C9, C11). A stripped or section-less file can still load. `readelf -S` may show "no sections"; `-l` still works.
7. Load bias never changes file offsets (C15, C21). It adds to `p_vaddr`.
8. The kernel does not copy the file: `vm_mmap` file mappings plus anonymous zero pages (C20). Say "mapped", "virtual".
9. Kernel vs ld.so vs startup code are three stages. The kernel does not load `DT_NEEDED` libraries (S5 only maps `PT_INTERP`; `rtld.c:1928` `_dl_map_object_deps` does).
10. Relocation is not always at run time. Static relocations (`ET_REL`) are resolved by the linker; `CALL26` and ADRP/ADD in a linked executable are already resolved (C34, C37). Linkers may relax or veneer; do not teach linker-specific relaxations (S2 "Relocation optimization" aaelf64.rst:1371+ exists; keep out).
11. Stripped != no symbols of any kind (C33). `-s` shows what exists.
12. ADRP "page" is 4 KiB by definition even on 16/64 KiB kernels (C38, D4).
13. The kernel requires the program-header table to fit in one page and `<= 65536` bytes (S5:524-526): fine for fixtures; mention only if asked.
14. Clip honesty: show sections as an overlay; the loader uses program headers (C11). Label addresses "illustrative". The tail permissions: `vm_brk_flags` lives in `mm/mmap.c`, not researched. UNVERIFIED how it sets RW vs RX for the tail; draw the tail with the segment's `p_flags` and say only "zero-filled".
15. glibc `start.S:41-42` comment claims the `.init` code "has already been run ... This includes _init and _libc_init"; the code path in `csu/libc-start.c` shows `call_init` run from `__libc_start_main` (lines 347/355). Treat the comment as stale (D3). Do not repeat it.
16. Kernel comment at `binfmt_elf.c` (PT_INTERP loop, 871-873 (text at 873)): "assume that this is an a.out format binary" is stale; ignore (D6).
17. This kernel reads interpreter and program ELF headers without checking `EI_CLASS`/`EI_DATA` in `load_elf_binary` at v6.12 (grep found those only in core-dump code, S5:1472-1473). Do not say "the kernel checks class and byte order".

## 9. Disagreements and caveats (D#)
- D1. gABI (S1) says `p_vaddr` and `p_offset` congruent modulo `p_align`; Arm (S3) says modulo the page size and recommends 64 KiB `p_align`; Linux (S5) maps in units of `PAGE_SIZE` (`elf_map` rounds with `ELF_PAGESTART/OFFSET`, 97-99, 361-364). Teach: all three constraints exist at different layers; the kernel needs `p_vaddr` and `p_offset` congruent modulo its own page size (inference: `mmap` needs a page-aligned file offset, `off = p_offset - pageoffset(p_vaddr)`).
- D2. `elf(5)` (S10:195-196) says the fifth byte (`EI_CLASS`) "identifies the architecture for this binary"; gABI and AAELF64 say class gives structure capacity (32/64-bit); architecture is `e_machine`. Module follows S1/S2.
- D3. glibc `start.S` comment vs code about who runs `.init` (section 8, item 15).
- D4. AAELF64 `Page()` uses `~0xFFF` regardless of machine page size (S2:1035) while Linux/arm64 can use 16K or 64K pages (S7). Not a conflict, but easy to misread as "ADRP page = kernel page". Source of the original agent's note; this brief confirms it.
- D5. gABI (2001 draft) describes generic behavior and says nothing about Linux; AAELF64 delegates program loading to SYSVABI64 ("The information on program loading has moved to SYSVABI64", S2 "Program Loading" heading) which is Alpha quality; Linux behavior comes from S5. Where they differ in detail, cite S5 for "what Linux does".
- D6. `binfmt_elf.c` PT_INTERP comment ("assume that this is an a.out format binary") is out of date (section 8, item 16).
- D7. gABI `e_entry` text says "the virtual address to which the system first transfers control". With a dynamic interpreter the system first transfers control to the interpreter entry, not `e_entry` (S5:1235-1243, 1340). Say "the program's entry, reached after the interpreter finishes".
- D8. S1 (ch5.pheader summary) says `PT_LOAD` entries sorted by `p_vaddr` (also S10:680-682); the v6.12 loader does not require this ordering in its loop (not checked line by line; UNVERIFIED). Teach: "conventionally ascending".

## 10. Tempting claims with no source (keep out of the module)
1. A concrete interpreter path like `/lib/ld-linux-aarch64.so.1` or `/lib64/...` as universal (only the file name for glibc is sourced, C25).
2. "Linux ARM64 pages are 4 KiB" (default is 4K but it is a Kconfig choice).
3. "ELF64 implies 8-byte alignment of every field" or other layout claims not in sources.
4. "`.symtab` is removed by strip but `.dynsym` always stays" (not in fetched text).
5. Exact on-disk numeric sizes (64/56/64 bytes) presented as quoted from a source (derived only).
6. "The kernel verifies `EI_CLASS`/`EI_DATA`" (not at v6.12 `load_elf_binary`).
7. "Lazy binding is default on AArch64 Linux" (S2 says only "may be performed lazily"; policy is the libc's; `BIND_NOW` not researched).
8. PLT stub layout and `DT_FLAGS_1`/`DF_1_PIE` details (not researched).
9. Relaxation behavior of any specific linker (ld, lld, gold) for ADRP/ADD or CALL26.
10. Behavior of musl, bionic, or other libcs; behavior of kernels other than v6.12.
11. BTI, PAC, MTE, GCS, TLS, symbol interposition, `ld.so` search paths and `LD_*` variables (out of scope).
12. "Sections are copied into segments one for one" and "each segment equals one section".
13. Timing or performance claims about demand paging, ASLR entropy values, or the numeric value of `ELF_ET_DYN_BASE` (it is a macro of `TASK_SIZE_64`/`DEFAULT_MAP_WINDOW_64`, S6:131-133).
14. That `main` "is called by the kernel" or that argv/envp are copied by the loader (kernel builds them: `create_elf_tables`).
15. Anything from the third-party blogs or other sources not listed in section 1.

## 11. Gaps and UNVERIFIED summary
- G1. gABI, binutils, and GCC pages were read through a summarizing fetch tool, not raw text; quotes are summaries. Re-fetch raw if an exact quote is placed in the module.
- G2. `elf(5)` tag-to-commit mapping for man-pages-6.15 not resolved (file content matched md5).
- G3. No `ldd` warning found in the readelf doc; do not claim one.
- G4. The kernel's non-use of section headers (C11) rests on a grep for `e_shoff/e_shnum/e_shentsize` (hits only in core-dump code); no full read of the file.
- G5. `mm/mmap.c` `vm_brk_flags` (zero-tail permissions) and arm64 `arch_elf_adjust_prot` (BTI) not read.
- G6. `DT_FLAGS_1`/`DF_1_PIE`, `.symtab` vs `.dynsym` contents, `readelf -l` "Section to Segment mapping", and the interpreter directory part: UNVERIFIED.
- G7. `shlib-versions` is the Linux/aarch64 file (6 lines of content, `ld=` names at lines 4 and 6); only the glibc loader name is sourced.
- G8. Fixture-dependent facts (what the toolchain emits for a given `.s`) are unmeasured until the fixtures are built.
- G9. AAPCS64 was only checked for scope (not about entry/`main`); register and stack facts (x0-x7, x30, 16-byte SP) were confirmed in the transcript summary only, and are not needed for the plan.
