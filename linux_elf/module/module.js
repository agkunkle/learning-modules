// Module content: Linux ELF on AArch64. META, NOTES, CHECKS, DIAGRAMS, CLIPS, PICS.
// All numbers about demo.elf and dyn.elf come from linux_elf/fixtures (build.sh): the files were
// assembled and linked, never run. Page size and the load bias B are illustrative: labelled so.

const META = {
  title: "Linux ELF: from ARM64 file bytes to a running process",
  subtitle: "Headers, sections, segments and relocations on 64-bit Arm Linux, using a tiny " +
            "example that we read but never run.",
  minutes: 40,
  audience: "Linux developers who know C, files, processes and hexadecimal numbers",
  source: "Linux v6.12 (adc218676eef), glibc 2.41 (74f59e9271cb), Arm abi-aa 2025Q1 " +
          "(c51addc3dc03), System V gABI draft of 24 April 2001, man-pages 6.15 (elf.5); " +
          "examples built with GNU binutils 2.38 (linux_elf/fixtures)",
  internal: false,
  prereqs: ["Basic C and the idea of a process", "Reading hexadecimal numbers",
            "No Arm assembly skills needed"],
  objectives: [
    "Identify an AArch64 ELF file and explain the main fields of its header",
    "Tell sections (used by build tools) from segments (used to build the process image)",
    "Turn a file offset into a virtual address inside a loadable segment",
    "Trace the kernel, the dynamic linker and the startup code, and say why the entry point is not main",
    "Use readelf to inspect symbols, relocations and dependencies without running the file",
  ],
};

// ---- code notes (line numbers are the line numbers of the source file) -------------------------

const NOTES = {
  demo_h: [
    ["3", "<code>EI_CLASS</code>: ELF64. This says only how big the structures are."],
    ["4", "<code>EI_DATA</code>: little endian. The AArch64 ABI also allows big endian."],
    ["8", "<code>e_type</code>: EXEC. Fixed addresses. A PIE file says DYN here."],
    ["9", "<code>e_machine</code>: AArch64. This field names the CPU architecture."],
    ["11", "<code>e_entry</code>: where control first goes. It is not <code>main</code>."],
    ["12-13", "Where the two tables start: program headers at byte 64, section headers at byte 760."],
    ["17", "Number of program headers: 3."],
    ["19", "Number of section headers: 8."],
  ],
  phdr_struct: [
    ["645", "<code>p_type</code>: what kind of entry: <code>PT_LOAD</code>, <code>PT_INTERP</code>, ..."],
    ["646", "<code>p_flags</code>: read, write and execute bits."],
    ["647", "<code>p_offset</code>: where the segment starts in the file."],
    ["648", "<code>p_vaddr</code>: the virtual address the file asks for."],
    ["650", "<code>p_filesz</code>: how many bytes the file stores."],
    ["651", "<code>p_memsz</code>: how many bytes the segment needs in memory."],
    ["652", "<code>p_align</code>: alignment rule for offset and address."],
  ],
  demo_l: [
    ["8", "LOAD 1: file offset 0 goes to 0x400000. Flags R E. It holds the ELF header, the program headers and <code>.text</code>."],
    ["9", "LOAD 2: read only. It holds <code>.rodata</code>."],
    ["10", "LOAD 3: FileSiz 0x8 but MemSiz 0x1008. The extra 0x1000 bytes are zero in memory."],
    ["12-16", "Which sections sit in which segment. This table is for people. The loader works from the program headers above."],
  ],
  demo_S: [
    ["6", "<code>.text</code>: PROGBITS (bytes stored in the file). Flags AX: allocated and executable."],
    ["9", "<code>.bss</code>: NOBITS. It takes no bytes in the file, but it has size 0x1000."],
    ["10-12", "Symbols and string tables. The file keeps them, but no PT_LOAD range contains them."],
  ],
  demo_asm: [
    ["5-6", "<code>adrp</code> then <code>add</code>: the usual pair to form the address of data. Page from <code>adrp</code>, low 12 bits from <code>add</code>."],
    ["9", "<code>bl helper</code>: <code>helper</code> is defined in another file. The assembler cannot know its address."],
    ["14", "<code>msg</code> goes into <code>.rodata</code>."],
    ["18", "<code>counter</code> goes into <code>.data</code>: 8 bytes, with the value 7 stored in the file."],
    ["22", "<code>buffer</code> goes into <code>.bss</code>: 4096 zero bytes that take no space in the file."],
  ],
  demo_ld: [
    ["4-6", "Three PT_LOAD segments with flags 5 (R+X), 4 (R) and 6 (R+W). The first one also holds the file header and program headers."],
    ["9", "Start at 0x400000 plus the size of the headers."],
    ["11", "Keep file offset and address equal modulo 0x10000."],
    ["13", "The same rule again for the data segment."],
  ],
  demo_o_s: [
    ["9", "<code>msg</code>: LOCAL. Only <code>demo.o</code> can see it."],
    ["12", "<code>_start</code>: GLOBAL and defined, in section 1 (<code>.text</code>)."],
    ["14", "<code>helper</code>: GLOBAL but UND (undefined). Another file must define it."],
  ],
  demo_o_r: [
    ["4-7", "Two <code>adrp</code>/<code>add</code> pairs: one for <code>.rodata</code>, one for <code>counter</code>."],
    ["8", "<code>R_AARCH64_CALL26</code> for the <code>bl helper</code>."],
  ],
  demo_o_dis: [
    ["8", "<code>adrp x0, 0</code>: the page part is zero for now."],
    ["16", "The <code>bl</code> has offset zero (94000000). The relocation line below it asks the linker to fill it."],
  ],
  demo_dis: [
    ["8-9", "After linking, <code>adrp</code> and <code>add</code> hold the real page and low bits of <code>.rodata</code>. (objdump names the nearest symbol, so the <code>+0xfefc</code> is not meaningful.)"],
    ["12", "The <code>bl</code> now reads 94000003: 3 words forward, which is 12 bytes, which is 0x400104 &minus; 0x4000f8."],
  ],
  k_elf_map: [
    ["361", "Size to map: the file bytes plus the part of the page that comes before <code>p_vaddr</code>."],
    ["362", "File offset to map from: <code>p_offset</code> minus the same in-page part."],
    ["363-364", "Round the start down and the size up to whole pages."],
  ],
  k_elf_load: [
    ["407-408", "If the segment has file bytes, map them (<code>elf_map</code>)."],
    ["411-415", "If memory is bigger than the file part, find where the zero tail starts and ends."],
    ["417-421", "Zero the rest of the last file page, so the file bytes that follow do not show."],
    ["437-441", "Add anonymous zero pages for the whole pages beyond. No file stands behind them."],
  ],
  k_make_prot: [
    ["616-621", "<code>p_flags</code> become memory protection: <code>PF_R</code> to read, <code>PF_W</code> to write, <code>PF_X</code> to execute."],
    ["623", "An architecture may adjust the result. This module does not cover that."],
  ],
  k_load_bias: [
    ["1118-1119", "A PIE (ET_DYN with PT_INTERP) gets a base address <code>ELF_ET_DYN_BASE</code> ..."],
    ["1120-1121", "... plus a random offset when randomisation is on ..."],
    ["1122-1124", "... rounded down to the largest alignment in the file."],
  ],
  g_start: [
    ["70", "<code>x0</code> holds a function that the dynamic linker passed (for <code>atexit</code>). <code>_start</code> keeps it in <code>x5</code>."],
    ["73-74", "<code>argc</code> is at the top of the stack. <code>x1</code> = argc, <code>x2</code> = address of argv."],
    ["79-90", "The address of <code>main</code> goes into <code>x0</code>."],
    ["98", "<code>bl __libc_start_main</code>: it sets up libc, calls <code>main</code>, then calls <code>exit</code> with the result."],
  ],
  g_reloc: [
    ["177-178", "<code>RELATIVE</code>: store the load bias (<code>l_addr</code>) plus the addend in the slot. No symbol lookup."],
  ],
  dyn_l: [
    ["9-10", "PT_INTERP names the dynamic linker. The kernel maps it too, and starts it first. We chose this path in our link command: other systems can use another path."],
    ["11", "The first LOAD starts at VirtAddr 0: this file expects to be loaded with a bias."],
    ["13", "PT_DYNAMIC: where the dynamic section is."],
  ],
  dyn_d: [
    ["4", "NEEDED: a library the dynamic linker must load."],
    ["15-16", "JMPREL and RELA: where the dynamic relocation tables are."],
    ["19", "FLAGS_1 with PIE: a flag that marks a position-independent executable."],
  ],
  dyn_r: [
    ["4", "<code>RELATIVE</code>: the slot at 0x11008 must hold the load bias plus 0x2d0, the address of <code>_start</code> in the file."],
    ["8", "<code>JUMP_SLOT</code>: the slot the dynamic linker fills for <code>stub_call</code>."],
  ],
  nosect_l: [
    ["8-10", "The three LOAD entries are all still here. There is no section-to-segment table, because there are no sections."],
  ],
  stripped_S: [
    ["9", "The last section header is <code>.shstrtab</code>. The <code>.symtab</code> and <code>.strtab</code> sections are gone."],
  ],
  demo_s: [
    ["16", "<code>_start</code> is at 0x4000e8: the same address as the entry point in the ELF header."],
    ["15", "<code>helper</code> is now defined: the linker found it in <code>helper.o</code>."],
  ],
};

// ---- checks ---------------------------------------------------------------------------------------

const CHECKS = {
  // 1 Recognize
  match_fields: {
    kind: "match",
    prompt: "Match each ELF header field to the question it answers.",
    pairs: [
      ["<code>EI_CLASS</code>", "Which structure layout: 32-bit or 64-bit?"],
      ["<code>EI_DATA</code>", "Which byte order do multi-byte fields use?"],
      ["<code>e_machine</code>", "Which CPU architecture is the code for?"],
      ["<code>e_type</code>", "Object file, executable, shared object or core file?"],
    ],
  },
  class_64: {
    kind: "choice",
    prompt: "A file has <code>Class: ELF64</code>. What can you conclude?",
    options: [
      { text: "The structures use the 64-bit layout. The CPU architecture is a separate field.", correct: true,
        why: "EI_CLASS gives the structure size. e_machine names the architecture." },
      { text: "The file is for AArch64.", why: "x86-64 files are ELF64 too. Only e_machine says AArch64." },
      { text: "The file is little endian.", why: "Byte order is EI_DATA. The AArch64 ABI allows both orders." },
    ],
  },
  line_machine: {
    kind: "line",
    prompt: "Which line of this <code>readelf -h</code> output tells you the code is for AArch64?",
    code: { ref: "demo_h", lines: [1, 20] },
    answer: [9],
    explain: "<p>Line 9, <code>Machine: AArch64</code>, is the <code>e_machine</code> field. Line 3 (class) and line 4 (data) say nothing about the CPU.</p>",
  },

  // 2 Two views
  which_table: {
    kind: "choice",
    prompt: "The kernel runs <code>execve</code> on an ELF file. Which table does it read to decide what to map into memory?",
    options: [
      { text: "The program header table", correct: true,
        why: "Each PT_LOAD entry in it describes one range of file bytes to map." },
      { text: "The section header table", why: "Sections are the link-time view. The table is optional for a file that only has to run." },
      { text: "The <code>.symtab</code> symbol table", why: "Symbols name things. They do not say what to map." },
    ],
  },
  match_roles: {
    kind: "match",
    prompt: "Match each ELF term to its role.",
    pairs: [
      ["<code>.text</code>", "A section: a named range of code bytes, for build tools"],
      ["<code>PT_LOAD</code>", "A segment type: map this range into memory"],
      ["Section header table", "Optional when the file only has to run"],
      ["Program header table", "Needed to create a process image"],
    ],
  },

  // 3 Map bytes into memory
  calc_addr: {
    kind: "choice",
    prompt: "In <code>demo.elf</code>, what is the virtual address of the byte at file offset 0x118? (See the program headers above.)",
    options: [
      { text: "0x420118", correct: true,
        why: "Offset 0x118 is inside LOAD 3 (file range 0x114 to 0x11c). 0x420114 + (0x118 &minus; 0x114) = 0x420118." },
      { text: "0x400118", why: "That adds the base of LOAD 1. Offset 0x118 is not in LOAD 1's file range." },
      { text: "0x42022c", why: "That is p_vaddr + offset. You must subtract p_offset first." },
      { text: "0x118", why: "A file offset is not an address. The program header links the two." },
    ],
    explain: "<p>Rule: address = p_vaddr + (offset &minus; p_offset), for an offset inside [p_offset, p_offset + p_filesz). Add the load bias for a PIE. Here the bias is 0.</p>",
  },
  tail_zero: {
    kind: "choice",
    prompt: "LOAD 3 has FileSiz 0x8 and MemSiz 0x1008. What fills the extra 0x1000 bytes in memory?",
    options: [
      { text: "Zeros. The file stores no bytes for them.", correct: true,
        why: "The kernel zeroes the end of the last file page and maps anonymous zero pages for the rest." },
      { text: "0x1000 more bytes stored in the file", why: "The whole file has 1272 bytes. It cannot hold them." },
      { text: "Whatever the stack left there", why: "The pages are zero-filled by the kernel. A program can rely on that for .bss." },
      { text: "The symbol table, read from the file", why: ".symtab is in the file, but no PT_LOAD range covers it, and the tail is zeroed." },
    ],
  },
  line_zero_pages: {
    kind: "line",
    prompt: "Which line of <code>elf_load</code> asks for the anonymous zero pages beyond the file-backed part?",
    code: { ref: "k_elf_load", lines: [407, 446] },
    answer: [440],
    explain: "<p>Line 440 calls <code>vm_brk_flags</code>. That call adds anonymous memory, which starts as zeros. Line 421 (<code>padzero</code>) clears only the rest of the last file-backed page.</p>",
  },

  // 4 Startup
  order_startup: {
    kind: "order",
    prompt: "Put the steps of a dynamically linked glibc program in order, from <code>execve</code> to <code>main</code>.",
    items: [
      "The kernel maps the program's and the interpreter's PT_LOAD segments",
      "The kernel starts the interpreter at its entry point",
      "The dynamic linker loads the DT_NEEDED libraries and relocates",
      "The dynamic linker jumps to the program's e_entry",
      "<code>_start</code> calls <code>__libc_start_main</code>",
      "<code>__libc_start_main</code> calls <code>main</code>",
    ],
  },
  match_who: {
    kind: "match",
    prompt: "Match each stage to the job it does.",
    pairs: [
      ["The kernel", "Maps PT_LOAD segments and builds argv, envp and the auxiliary vector"],
      ["The dynamic linker", "Loads the DT_NEEDED libraries"],
      ["<code>_start</code> (crt1.o)", "Calls <code>__libc_start_main</code>"],
      ["<code>__libc_start_main</code>", "Calls <code>main</code>, then <code>exit</code>"],
    ],
  },
  static_entry: {
    kind: "choice",
    prompt: "A non-PIE static program has no PT_INTERP. Where does the kernel send control first?",
    options: [
      { text: "To <code>e_entry</code> of the program", correct: true,
        why: "With no interpreter, the kernel sets the first instruction to e_entry (plus the load bias, which is 0 for ET_EXEC)." },
      { text: "To <code>main</code>", why: "The kernel never calls main. Startup code calls it." },
      { text: "To the dynamic linker anyway", why: "No PT_INTERP means no interpreter is mapped." },
    ],
  },

  // 5 Symbols and relocations
  match_symbols: {
    kind: "match",
    prompt: "Match each symbol in <code>demo.o</code> to its state.",
    pairs: [
      ["<code>helper</code>", "Global and undefined: the linker must find a definition"],
      ["<code>_start</code>", "Global and defined in <code>.text</code>"],
      ["<code>msg</code>", "Local: only <code>demo.o</code> can see it"],
    ],
  },
  why_call26: {
    kind: "choice",
    prompt: "Why does <code>demo.o</code> hold an <code>R_AARCH64_CALL26</code> relocation for <code>bl helper</code>?",
    options: [
      { text: "The assembler cannot know where <code>helper</code> will be. The linker fills in the branch offset later.", correct: true,
        why: "The bl in the object has offset 0. CALL26 tells the linker to write S + A &minus; P, divided by 4, into the instruction." },
      { text: "The dynamic linker patches the call at run time.", why: "This is a static relocation in a relocatable object. The linker resolves it before the program exists." },
      { text: "A bl needs a full 64-bit address.", why: "A bl holds a 26-bit offset in words, so it reaches about 128 MB either way." },
    ],
  },
  why_relative: {
    kind: "choice",
    prompt: "<code>dyn.elf</code> has an <code>R_AARCH64_RELATIVE</code> entry for a slot in <code>.data</code>. Why is it there?",
    options: [
      { text: "The slot holds an address of something in the file. The address changes with the load bias, so the dynamic linker adds the bias.", correct: true,
        why: "RELATIVE means: store load bias + addend. No symbol lookup is needed." },
      { text: "The slot holds the address of a symbol in another library.", why: "That would be GLOB_DAT or JUMP_SLOT, with a symbol to look up." },
      { text: "The static linker could not resolve the slot.", why: "The linker did resolve the target. It cannot know the bias, so it leaves a dynamic relocation." },
    ],
  },

  // 6 PIE and shared libraries
  bias_offsets: {
    kind: "choice",
    prompt: "A PIE is loaded with bias B. What happens to the file offsets in its program headers?",
    options: [
      { text: "Nothing. Only the virtual addresses move: runtime address = B + p_vaddr + (offset &minus; p_offset).", correct: true,
        why: "The bias describes where memory goes. The file does not change." },
      { text: "B is added to every p_offset.", why: "Offsets are positions in the file. They never change." },
      { text: "B replaces p_vaddr.", why: "B is added to p_vaddr. The file still decides the layout." },
    ],
  },
  dyn_only: {
    kind: "choice",
    prompt: "<code>readelf -h</code> shows <code>Type: DYN</code>. What can you say?",
    options: [
      { text: "Not enough. PIE programs and shared libraries are both ET_DYN. Look at PT_INTERP, the entry point and the dynamic flags.", correct: true,
        why: "In our files, dyn.elf (a PIE) has PT_INTERP and FLAGS_1 PIE. libstub.so has Entry 0x0 and no interpreter." },
      { text: "It is a shared library.", why: "A PIE program is ET_DYN too." },
      { text: "It is a PIE program.", why: "A shared library is ET_DYN too." },
    ],
  },
  line_interp: {
    kind: "line",
    prompt: "Which line shows the program interpreter that the kernel starts first?",
    code: { ref: "dyn_l", lines: [2, 14] },
    answer: [10],
    explain: "<p>Line 10 prints the interpreter path from the PT_INTERP entry on line 9.</p>",
  },

  // 7 Inspect
  match_readelf: {
    kind: "match",
    prompt: "Match each <code>readelf</code> option to what it shows.",
    pairs: [
      ["<code>-h</code>", "The ELF header: class, machine, entry"],
      ["<code>-l</code>", "Program headers: segments, flags, FileSiz and MemSiz"],
      ["<code>-S</code>", "Section headers"],
      ["<code>-d</code>", "The dynamic section, with NEEDED libraries"],
      ["<code>-r</code>", "Relocations"],
    ],
  },
  zero_evidence: {
    kind: "choice",
    prompt: "How do you show from the file that a segment has a zero-filled tail?",
    options: [
      { text: "<code>readelf -l</code>: the segment's FileSiz is smaller than its MemSiz", correct: true,
        why: "Program headers describe loading. FileSiz is in the file, MemSiz is in memory." },
      { text: "<code>readelf -s</code>: look for the symbol <code>.bss</code>", why: "Symbols name things. They say nothing about how much the loader maps." },
      { text: "Run the file and dump its memory", why: "This module never runs the files. readelf reads the file and is enough." },
    ],
  },
  needed_libs: {
    kind: "choice",
    prompt: "Which command lists the libraries a PIE program asks for, without running it?",
    options: [
      { text: "<code>readelf -d</code>, and look for the NEEDED lines", correct: true,
        why: "NEEDED entries live in the dynamic section." },
      { text: "<code>readelf -r</code>", why: "That lists relocations. A relocation can name a symbol, but not the library list." },
      { text: "<code>readelf -h</code>", why: "The ELF header does not list libraries." },
    ],
  },

  // 8 Surprises
  no_sections: {
    kind: "choice",
    prompt: "<code>readelf -S</code> says <code>There are no sections in this file</code>, but <code>readelf -l</code> shows three LOAD entries. What does that mean for loading?",
    options: [
      { text: "The load information is complete. Only the link-time names are missing.", correct: true,
        why: "The loader works from the program headers. The section header table is optional for a file that must run." },
      { text: "The file cannot be loaded.", why: "The program headers still say what to map." },
      { text: "The kernel will rebuild the sections.", why: "The kernel does not read section headers to load a file." },
    ],
  },
  entry_main: {
    kind: "choice",
    prompt: "A colleague says: \"The entry point 0x4000e8 is the address of <code>main</code>.\" What do you answer, using <code>demo.elf</code>?",
    options: [
      { text: "0x4000e8 is <code>_start</code>. This file has no <code>main</code> at all.", correct: true,
        why: "The symbol table lists _start at 0x4000e8. In a glibc program, _start calls __libc_start_main, which calls main." },
      { text: "That is right: the entry point is always <code>main</code>.", why: "The entry point is where the first instruction runs. Startup code calls main later." },
      { text: "The kernel calls <code>main</code> after the entry point.", why: "The kernel never calls main." },
    ],
  },

  // Review quiz
  rq_fields: {
    kind: "match",
    prompt: "Match each header value in <code>demo.elf</code> to its meaning.",
    pairs: [
      ["<code>EI_CLASS = 2</code>", "ELF64 structures"],
      ["<code>EI_DATA = 1</code>", "Little endian"],
      ["<code>e_machine = 0xb7</code>", "AArch64"],
      ["<code>e_type = 2</code>", "Executable at fixed addresses"],
    ],
  },
  rq_table: {
    kind: "choice",
    prompt: "Which ELF table describes the loadable segments?",
    options: [
      { text: "The program header table", correct: true, why: "PT_LOAD entries are program headers." },
      { text: "The section header table", why: "It names sections for the linker and for readelf -S." },
      { text: "The dynamic section", why: "It lists dynamic-linking data, such as NEEDED libraries." },
    ],
  },
  rq_calc: {
    kind: "choice",
    prompt: "In <code>dyn.elf</code>, LOAD 2 has Offset 0xe80 and VirtAddr 0x10e80. The load bias is B. At what address does file offset 0x1008 appear?",
    options: [
      { text: "B + 0x11008", correct: true, why: "B + 0x10e80 + (0x1008 &minus; 0xe80) = B + 0x11008." },
      { text: "B + 0x1008", why: "That forgets that the segment's address is 0x10e80, not 0xe80." },
      { text: "0x11008", why: "That is right only if B is 0. A PIE has a nonzero bias." },
    ],
  },
  rq_tail: {
    kind: "choice",
    prompt: "Why can a loadable segment need more memory than it occupies in the file?",
    options: [
      { text: "Its p_memsz is larger than its p_filesz. The extra bytes start as zeros (typical for .bss).", correct: true,
        why: "The file stores no bytes for the tail. The kernel makes zero-filled memory." },
      { text: "The loader pads the file on disk.", why: "The kernel never changes the file." },
      { text: "The extra memory is physical RAM reserved at once.", why: "A mapping is a virtual range. Pages are filled on first use." },
    ],
  },
  rq_entry: {
    kind: "choice",
    prompt: "Which statement about <code>e_entry</code> and a dynamically linked program is correct?",
    options: [
      { text: "The kernel starts the interpreter first. The interpreter jumps to the program's e_entry later.", correct: true,
        why: "e_entry is the program's own first instruction. _start there calls libc's startup, which calls main." },
      { text: "The kernel jumps to e_entry, which is main.", why: "The kernel does neither: it starts the interpreter, and e_entry is _start." },
      { text: "e_entry is where the dynamic linker begins.", why: "The interpreter's own entry point is in the interpreter's ELF header." },
    ],
  },
  rq_call26: {
    kind: "choice",
    prompt: "In <code>demo.o</code> the <code>bl</code> has the bytes 94000000. In <code>demo.elf</code> it has 94000003. What happened?",
    options: [
      { text: "The linker computed (S + A &minus; P) / 4 = 3 and wrote it into the instruction.", correct: true,
        why: "helper is at 0x400104, the bl is at 0x4000f8. The difference is 0xc bytes, which is 3 words." },
      { text: "The dynamic linker patched it at run time.", why: "The file on disk already holds 94000003." },
      { text: "The assembler guessed the address.", why: "The assembler left 0 and emitted a relocation." },
    ],
  },
  rq_dyn: {
    kind: "choice",
    prompt: "A file has <code>e_type = ET_DYN</code> and no PT_INTERP. What can it be? (Select all that apply.)",
    options: [
      { text: "A shared library", correct: true, why: "Shared libraries have no interpreter of their own." },
      { text: "A static PIE program", correct: true, why: "A static PIE has no dynamic linker to name." },
      { text: "The dynamic linker itself", correct: true, why: "An interpreter is an ET_DYN file with no PT_INTERP. The kernel treats that case differently." },
      { text: "A dynamically linked PIE program", why: "That kind of program has a PT_INTERP naming its dynamic linker." },
    ],
  },
  rq_evidence: {
    kind: "line",
    prompt: "Which line of this <code>readelf -d</code> output shows a library the program depends on?",
    code: { ref: "dyn_d", lines: [2, 21] },
    answer: [4],
    explain: "<p>Line 4, the NEEDED entry, names <code>libstub.so</code>.</p>",
  },
};

// ---- diagrams ---------------------------------------------------------------------------------

const DIAGRAMS = {
  views: {
    width: 940, height: 520,
    intro: "One ELF file has two tables. Click a box, then step through each view.",
    groups: [
      { label: "Execution view", x: 100, y: 130, w: 300, h: 380 },
      { label: "Linking view", x: 540, y: 130, w: 300, h: 380 },
    ],
    nodes: [
      { id: "ehdr", label: "ELF header", sub: "64 bytes at offset 0", x: 600, y: 60, w: 240,
        detail: "<p>Always at the start of the file. It says which tables exist and where: <code>e_phoff</code>, <code>e_phnum</code>, <code>e_shoff</code>, <code>e_shnum</code>.</p>",
        code: { ref: "demo_h" } },
      { id: "phdr", label: "Program headers", sub: "e_phoff, e_phnum", x: 250, y: 200, w: 250,
        detail: "<p>An array of entries, 56 bytes each in ELF64. Each entry describes one segment or one special item (<code>PT_LOAD</code>, <code>PT_INTERP</code>, <code>PT_DYNAMIC</code>).</p>",
        code: { ref: "demo_l" } },
      { id: "shdr", label: "Section headers", sub: "e_shoff, e_shnum", x: 690, y: 200, w: 250,
        detail: "<p>An array of entries, 64 bytes each in ELF64. Each entry names a section and gives its type, flags, address, offset and size.</p>",
        code: { ref: "demo_S" } },
      { id: "segs", label: "Segments", sub: "PT_LOAD and others", x: 250, y: 330, w: 250,
        detail: "<p>Ranges of file bytes, with flags and a virtual address. A PT_LOAD segment is mapped into the process. One segment can hold several sections.</p>" },
      { id: "secs", label: "Sections", sub: ".text .data .symtab ...", x: 690, y: 330, w: 250,
        detail: "<p>Named ranges for tools. <code>.bss</code> is a section of type NOBITS: it has a size but no bytes in the file.</p>" },
      { id: "kern", label: "Kernel loader", sub: "execve", x: 250, y: 455, w: 250,
        detail: "<p>In Linux v6.12, <code>load_elf_binary</code> (<code>fs/binfmt_elf.c:819</code>) reads the program headers and maps each PT_LOAD entry.</p>" },
      { id: "tools", label: "Linker, readelf -S", sub: "link-time view", x: 690, y: 455, w: 250,
        detail: "<p>A linker combines sections from many object files. <code>readelf -S</code> prints the section header table.</p>" },
    ],
    edges: [
      { from: "ehdr", to: "phdr", label: "e_phoff" },
      { from: "ehdr", to: "shdr", label: "e_shoff" },
      { from: "phdr", to: "segs", label: "describes" },
      { from: "shdr", to: "secs", label: "describes" },
      { from: "segs", to: "kern", label: "mapped by" },
      { from: "secs", to: "tools", label: "read by" },
    ],
    flows: [
      { title: "Execution view: what the kernel uses", steps: [
        { nodes: ["ehdr", "phdr"], edges: ["ehdr>phdr"],
          text: "The ELF header says where the program header table starts and how many entries it has." },
        { nodes: ["phdr", "segs"], edges: ["phdr>segs"],
          text: "Each program header describes one segment: a range of file bytes, and what to do with it." },
        { nodes: ["segs", "kern"], edges: ["segs>kern"], show: "kern",
          text: "The kernel maps the PT_LOAD segments to build the process image. It does not need the section header table." },
      ] },
      { title: "Linking view: what build tools use", steps: [
        { nodes: ["ehdr", "shdr"], edges: ["ehdr>shdr"],
          text: "The ELF header also says where the section header table starts." },
        { nodes: ["shdr", "secs"], edges: ["shdr>secs"],
          text: "Each section header names a range: .text, .data, .symtab and so on." },
        { nodes: ["secs", "tools"], edges: ["secs>tools"], show: "tools",
          text: "Linkers and readelf -S read the sections. A file that only has to run may have none." },
      ] },
    ],
  },

  startup: {
    width: 1060, height: 520,
    intro: "Three stages share the work between execve and main. User space here is glibc 2.41.",
    groups: [
      { label: "Kernel", x: 30, y: 30, w: 280, h: 470 },
      { label: "Dynamic linker (ld.so)", x: 390, y: 30, w: 280, h: 470 },
      { label: "Program and libc startup", x: 750, y: 30, w: 280, h: 470 },
    ],
    nodes: [
      { id: "execve", label: "execve", sub: "system call", x: 170, y: 120, w: 220,
        detail: "<p>The program calls <code>execve</code>. The kernel reads the first bytes of the file and picks a loader for the format. For ELF, that is <code>load_elf_binary</code> (<code>fs/exec.c</code>, <code>fs/binfmt_elf.c:819</code>).</p>" },
      { id: "loadelf", label: "load_elf_binary", sub: "maps PT_LOAD, builds stack", x: 170, y: 250, w: 250,
        detail: "<p>It checks the magic, <code>e_type</code> (ET_EXEC or ET_DYN) and <code>e_machine</code>. It reads the program headers, finds <code>PT_INTERP</code>, maps every <code>PT_LOAD</code> of the program and of the interpreter, and builds the new stack: argv, envp and the auxiliary vector (<code>AT_PHDR</code>, <code>AT_ENTRY</code>, <code>AT_BASE</code>, <code>AT_PAGESZ</code>, ...).</p>",
        code: { ref: "k_elf_load" } },
      { id: "start", label: "start_thread", sub: "set pc, go to user mode", x: 170, y: 380, w: 230,
        detail: "<p>The kernel sets the program counter to the first user instruction and the stack pointer to the new stack. With a <code>PT_INTERP</code> the first instruction is the interpreter's entry. Without one, it is the program's <code>e_entry</code> (<code>fs/binfmt_elf.c:1235-1260, 1336-1340</code>).</p>" },
      { id: "ldso", label: "ld.so entry", sub: "dl-start.S", x: 530, y: 160, w: 220,
        detail: "<p>The interpreter starts at its own entry. In glibc, the AArch64 <code>_start</code> in <code>dl-start.S</code> calls <code>_dl_start</code>, which relocates ld.so itself and then calls <code>dl_main</code>.</p>" },
      { id: "dlwork", label: "ld.so work", sub: "libraries, relocations", x: 530, y: 340, w: 220,
        detail: "<p><code>dl_main</code> loads every <code>DT_NEEDED</code> library (<code>_dl_map_object_deps</code>) and applies relocations such as <code>R_AARCH64_RELATIVE</code>. Then <code>_dl_init</code> runs initializers, and ld.so jumps to the program's entry (<code>dl-start.S:56-74</code>).</p>",
        code: { ref: "g_reloc" } },
      { id: "crt", label: "_start", sub: "crt1.o", x: 890, y: 120, w: 220,
        detail: "<p>The program's <code>e_entry</code> points at <code>_start</code>. It is a few instructions of assembly: it sets up arguments and calls <code>__libc_start_main</code>.</p>",
        code: { ref: "g_start" } },
      { id: "libcmain", label: "__libc_start_main", sub: "libc setup", x: 890, y: 250, w: 260,
        detail: "<p>libc sets up what it needs, then calls <code>main</code> and passes the result to <code>exit</code> (<code>sysdeps/nptl/libc_start_call_main.h:58, 74</code>).</p>" },
      { id: "main", label: "main", sub: "your code", x: 890, y: 380, w: 220,
        detail: "<p>The C function you wrote. Nothing in the ELF header names it. The entry point is <code>_start</code>.</p>" },
    ],
    edges: [
      { from: "execve", to: "loadelf" },
      { from: "loadelf", to: "start" },
      { from: "start", to: "ldso", label: "pc = ld.so entry" },
      { from: "ldso", to: "dlwork" },
      { from: "dlwork", to: "crt", label: "jump to e_entry" },
      { from: "crt", to: "libcmain" },
      { from: "libcmain", to: "main", label: "calls" },
      { from: "start", to: "crt", label: "pc = e_entry", bend: 0 },
    ],
    flows: [
      { title: "Dynamically linked program", steps: [
        { nodes: ["execve", "loadelf"], edges: ["execve>loadelf"],
          text: "The program calls execve. The kernel picks the ELF loader." },
        { nodes: ["loadelf", "start"], edges: ["loadelf>start"], show: "loadelf",
          text: "The kernel maps the program's and the interpreter's PT_LOAD segments, then builds the stack." },
        { nodes: ["start", "ldso"], edges: ["start>ldso"],
          text: "The first user instruction is the interpreter's entry, not the program's." },
        { nodes: ["ldso", "dlwork"], edges: ["ldso>dlwork"], show: "dlwork",
          text: "The dynamic linker loads the DT_NEEDED libraries and applies relocations." },
        { nodes: ["dlwork", "crt"], edges: ["dlwork>crt"], show: "crt",
          text: "It jumps to the program's e_entry, which is _start." },
        { nodes: ["crt", "libcmain", "main"], edges: ["crt>libcmain", "libcmain>main"], show: "main",
          text: "_start calls __libc_start_main, which calls main. The entry point is not main." },
      ] },
      { title: "Static program (no PT_INTERP)", steps: [
        { nodes: ["execve", "loadelf", "start"], edges: ["execve>loadelf", "loadelf>start"],
          text: "The kernel work is the same, but there is no interpreter to map." },
        { nodes: ["start", "crt"], edges: ["start>crt"], show: "crt",
          text: "With no PT_INTERP the first user instruction is the program's e_entry (binfmt_elf.c:1259)." },
        { nodes: ["crt", "libcmain", "main"], edges: ["crt>libcmain", "libcmain>main"], show: "libcmain",
          text: "glibc's startup code does its own setup in __libc_start_main, then calls main. No dynamic linker runs." },
      ] },
    ],
  },
};

// ---- clips ------------------------------------------------------------------------------------

// The three PT_LOAD entries of demo.elf: values from `readelf -l` (excerpt demo_l).
const SEG = [
  { name: "LOAD 1", flags: "R E", off: 0x0, vaddr: 0x400000, filesz: 0x108, memsz: 0x108, color: COLORS.blue },
  { name: "LOAD 2", flags: "R", off: 0x108, vaddr: 0x410108, filesz: 0xc, memsz: 0xc, color: COLORS.orange },
  { name: "LOAD 3", flags: "RW", off: 0x114, vaddr: 0x420114, filesz: 0x8, memsz: 0x1008, color: COLORS.aqua },
];
const hx = n => "0x" + n.toString(16);

// Layout of the loading clip (stage units). Cards on top, file bar, beams, memory bar.
const CARD = { y: 90, w: 560, h: 205, xs: [120, 710, 1300] };
const FILE_Y = 380, FILE_H = 100, MEM_Y = 690, MEM_H = 100;
const FILE_BLOCKS = [  // x, w, seg index (or -1), label lines, start offset text, section name
  { x: 120, w: 220, seg: 0, lines: ["ELF header"], off: "0x000", sec: null },
  { x: 350, w: 250, seg: 0, lines: ["Program", "headers"], off: "0x040", sec: null },
  { x: 610, w: 160, seg: 0, lines: ["bytes"], off: "0x0e8", sec: ".text" },
  { x: 780, w: 170, seg: 1, lines: ["bytes"], off: "0x108", sec: ".rodata" },
  { x: 960, w: 130, seg: 2, lines: ["bytes"], off: "0x114", sec: ".data" },
  { x: 1100, w: 340, seg: -1, lines: ["symbols,", "strings"], off: "0x120", sec: ".symtab ..." },
  { x: 1450, w: 340, seg: -1, lines: ["Section", "headers"], off: "0x2f8", sec: "section table" },
];
const MEM_BLOCKS = [  // regions of process memory (virtual addresses)
  { x: 120, w: 430, seg: 0, text: "R E", addr: "0x400000" },
  { x: 700, w: 300, seg: 1, text: "R", addr: "0x410108" },
  { x: 1150, w: 150, seg: 2, text: "RW", addr: "0x420114" },
];
const TAIL = { x: 1300, w: 490, addr_start: "0x42011c", addr_end: "0x42111c" };

function rect_at(g, x, y, w, h, color, fill_opacity, { dash = null, sw = 4, rx = 10 } = {}) {
  const r = el("rect", { x, y, width: w, height: h, rx, fill: color, "fill-opacity": fill_opacity,
                         stroke: color, "stroke-width": sw }, g);
  if (dash) r.setAttribute("stroke-dasharray", dash);
  return r;
}
function lines_at(g, lines, cx, cy, { size = 34, fill = COLORS.fg, step = 40, font = null, weight = 500 } = {}) {
  return lines.map((s, i) => label(g, s, cx, cy + (i - (lines.length - 1) / 2) * step,
                                   { size, fill, font, weight }));
}

// Builds every part of the loading picture. Scenes set opacity and focus from t.
function loading_view(g) {
  const v = { g };
  v.cards_h = label(g, "Program header table", 120, 52, { size: 36, fill: COLORS.grey, anchor: "start", weight: 600 });
  v.cards = SEG.map((s, i) => {
    const cg = el("g", {}, g), x = CARD.xs[i];
    rect_at(cg, x, CARD.y, CARD.w, CARD.h, s.color, 0.14);
    const outline = el("rect", { x: x - 6, y: CARD.y - 6, width: CARD.w + 12, height: CARD.h + 12, rx: 14,
                                 fill: "none", stroke: COLORS.yellow, "stroke-width": 6 }, cg);
    outline.style.opacity = 0;
    label(cg, `${s.name}   PT_LOAD   ${s.flags}`, x + 24, CARD.y + 38, { size: 36, weight: 700, anchor: "start" });
    label(cg, `Offset   ${hx(s.off)}`, x + 24, CARD.y + 88, { size: 32, anchor: "start", font: MONO });
    label(cg, `VirtAddr ${hx(s.vaddr)}`, x + 24, CARD.y + 128, { size: 32, anchor: "start", font: MONO });
    label(cg, `FileSiz ${hx(s.filesz)} MemSiz ${hx(s.memsz)}`, x + 24, CARD.y + 170, { size: 30, anchor: "start", font: MONO });
    return { g: cg, outline };
  });
  v.file_h = label(g, "File on disk", 120, 342, { size: 36, fill: COLORS.grey, anchor: "start", weight: 600 });
  v.blocks = FILE_BLOCKS.map(b => {
    const bg = el("g", {}, g);
    const color = b.seg >= 0 ? SEG[b.seg].color : COLORS.dim;
    rect_at(bg, b.x, FILE_Y, b.w, FILE_H, color, b.seg >= 0 ? 0.2 : 0.1);
    const names = lines_at(bg, b.lines, b.x + b.w / 2, FILE_Y + FILE_H / 2, { size: 32, step: 38 });
    const off = label(bg, b.off, b.x + b.w / 2, FILE_Y + FILE_H + 36, { size: 30, fill: COLORS.grey, font: MONO });
    const out = el("rect", { x: b.x - 6, y: FILE_Y - 6, width: b.w + 12, height: FILE_H + 12, rx: 14,
                             fill: "none", stroke: COLORS.yellow, "stroke-width": 6 }, bg);
    out.style.opacity = 0;
    return { g: bg, names, off, outline: out, b };
  });
  v.mem_h = label(g, "Process memory: virtual addresses", 1800, 640,
                  { size: 36, fill: COLORS.grey, anchor: "end", weight: 600 });
  v.page_note = label(g, "page size 4 KiB (illustrative)", 1800, 905,
                      { size: 30, fill: COLORS.grey, anchor: "end" });
  const mem = el("g", {}, g);
  v.gaps = [[550, 150], [1000, 150]].map(([x, w]) => {
    const r = rect_at(mem, x, MEM_Y, w, MEM_H, COLORS.dim, 0.04, { dash: "10 10", sw: 3 });
    const t = label(mem, "unmapped", x + w / 2, MEM_Y + MEM_H / 2, { size: 30, fill: COLORS.dim });
    return { r, t };
  });
  v.beams = SEG.map((s, i) => {
    const bs = FILE_BLOCKS.filter(b => b.seg === i), m = MEM_BLOCKS[i];
    const x0 = bs[0].x, x1 = bs[bs.length - 1].x + bs[bs.length - 1].w;
    const pts = `${x0},${FILE_Y + FILE_H + 70} ${x1},${FILE_Y + FILE_H + 70} ${m.x + m.w},${MEM_Y} ${m.x},${MEM_Y}`;
    return el("polygon", { points: pts, fill: s.color, "fill-opacity": 0.22, stroke: s.color, "stroke-width": 3 }, g);
  });
  v.regions = MEM_BLOCKS.map((m, i) => {
    const rg = el("g", {}, g), s = SEG[i];
    rect_at(rg, m.x, MEM_Y, m.w, MEM_H, s.color, 0.28);
    label(rg, m.text, m.x + m.w / 2, MEM_Y + MEM_H / 2, { size: 44, weight: 700 });
    label(rg, m.addr, m.x + m.w / 2, MEM_Y + MEM_H + 36, { size: 30, fill: COLORS.grey, font: MONO });
    return rg;
  });
  v.tail = el("g", {}, g);
  rect_at(v.tail, TAIL.x, MEM_Y, TAIL.w, MEM_H, COLORS.aqua, 0.06, { dash: "14 10", sw: 4 });
  v.tail_text = label(v.tail, "zeros: no bytes in the file", TAIL.x + TAIL.w / 2, MEM_Y + MEM_H / 2, { size: 34, fill: COLORS.fg });
  label(v.tail, TAIL.addr_end, TAIL.x + TAIL.w, MEM_Y + MEM_H + 36, { size: 30, fill: COLORS.grey, font: MONO, anchor: "end" });
  v.tail_start = label(v.tail, TAIL.addr_start, TAIL.x, MEM_Y + MEM_H + 76, { size: 30, fill: COLORS.grey, font: MONO, anchor: "start" });
  return v;
}
const vis = (e, a) => { e.style.opacity = a; };
function show_all(v, { cards = 1, blocks = 1, mem = 1, segs = [1, 1, 1], tail = 1, gaps = 1, offsets = 1 } = {}) {
  vis(v.cards_h, cards); v.cards.forEach(c => vis(c.g, cards));
  vis(v.file_h, blocks); v.blocks.forEach(b => { vis(b.g, blocks); vis(b.off, blocks * offsets); });
  vis(v.mem_h, mem); vis(v.page_note, mem); v.gaps.forEach(g2 => { vis(g2.r, gaps * mem); vis(g2.t, gaps * mem); });
  v.beams.forEach((b, i) => vis(b, segs[i])); v.regions.forEach((r, i) => vis(r, segs[i]));
  vis(v.tail, tail);
}

const CLIPS = {
  loading: {
    title: "From the ELF file to process memory",
    caption: "How the program headers of demo.elf turn file bytes into mappings. Addresses are from the real file; the page size is illustrative.",
    scenes: [
      { title: "Find the tables", build(g, b) {
        const v = loading_view(g);
        const fact = label(g, "e_phoff = 64,   e_phnum = 3", 960, 590, { size: 42, font: MONO });
        const w_a = b.say("A process starts as a file. The ELF header is at offset 0.", 1.5);
        const w_b = b.say("It says: the program header table starts at byte 64 and has 3 entries.", 0.8);
        const w_c = b.say("Each program header describes one piece of the process image.", 1.2);
        const w_d = b.say("All three are PT_LOAD: map this part of the file into memory.", 1);
        return t => {
          show_all(v, { cards: prog(w_c, t), blocks: prog(w_a, t), mem: 0, segs: [0, 0, 0], tail: 0 });
          v.blocks.forEach((bl, i) => {
            const on = (i === 0 ? prog(w_b, t) * (1 - prog(w_c, t)) : i === 1 ? prog(w_c, t) * (1 - prog(w_d, t)) : 0);
            vis(bl.outline, on);
          });
          vis(fact, prog(w_b, t) * (1 - prog(w_c, t)));
          v.cards.forEach(c => vis(c.outline, prog(w_d, t)));
        };
      } },
      { title: "Segment 1", build(g, b) {
        const v = loading_view(g);
        const w_a = b.say("Header 1: map file bytes from offset 0 to address 0x400000.", 1.5);
        const w_b = b.say("Flags R E: read and execute. The headers and .text arrive together.", 1);
        return t => {
          const u = prog(w_a, t);
          show_all(v, { mem: 1, segs: [u, 0, 0], tail: 0, gaps: 1 });
          v.cards.forEach((c, i) => vis(c.outline, i === 0 ? 1 : 0));
          v.cards.forEach((c, i) => vis(c.g, i === 0 ? 1 : 0.45));
          v.blocks.forEach((bl, i) => vis(bl.outline, i < 3 ? prog(w_b, t) : 0));
        };
      } },
      { title: "Segment 2", build(g, b) {
        const v = loading_view(g);
        const mark = el("g", {}, g);
        const dot_f = el("circle", { cx: 780 + 170 * (2 / 12), cy: FILE_Y + FILE_H, r: 9, fill: COLORS.yellow }, mark);
        const dot_m = el("circle", { cx: 700 + 300 * (2 / 12), cy: MEM_Y, r: 9, fill: COLORS.yellow }, mark);
        el("line", { x1: 780 + 170 * (2 / 12), y1: FILE_Y + FILE_H, x2: 700 + 300 * (2 / 12), y2: MEM_Y,
                     stroke: COLORS.yellow, "stroke-width": 4 }, mark);
        const l_f = label(mark, "offset 0x10a", 836, 580, { size: 34, font: MONO, anchor: "start" });
        const l_m = label(mark, "address 0x41010a", 792, 650, { size: 34, font: MONO, anchor: "start" });
        const w_a = b.say("Header 2: file offset 0x108 goes to address 0x410108, read only.", 1.5);
        const w_b = b.say("The offset and the address are different numbers.", 0.4);
        const w_c = b.say("The header links them: the byte at offset 0x10a appears at 0x41010a.", 1);
        return t => {
          show_all(v, { mem: 1, segs: [1, prog(w_a, t), 0], tail: 0 });
          v.cards.forEach((c, i) => { vis(c.outline, i === 1 ? 1 : 0); vis(c.g, i === 1 ? 1 : 0.45); });
          vis(v.blocks[3].outline, prog(w_b, t));
          vis(mark, prog(w_c, t));
        };
      } },
      { title: "Segment 3 and the zero tail", build(g, b) {
        const v = loading_view(g);
        const w_a = b.say("Header 3: 8 bytes of .data go to address 0x420114, read and write.", 1.5);
        const w_b = b.say("But MemSiz is 0x1008. The file holds only 8 of those bytes.", 1);
        const w_c = b.say("The other 0x1000 bytes are zeros in memory. The file stores none.", 1.5);
        const w_d = b.say("The kernel also clears the rest of the last file page.", 0.8);
        return t => {
          show_all(v, { mem: 1, segs: [1, 1, prog(w_a, t)], tail: prog(w_c, t) });
          v.cards.forEach((c, i) => { vis(c.outline, i === 2 ? 1 : 0); vis(c.g, i === 2 ? 1 : 0.45); });
          vis(v.blocks[4].outline, prog(w_a, t) * (1 - prog(w_b, t)));
          v.tail_text.textContent = prog(w_d, t) > 0.5 ? "zeros: old page, new pages" : "zeros: no bytes in the file";
        };
      } },
      { title: "Sections are labels", build(g, b) {
        const v = loading_view(g);
        const note = label(g, "not used to decide the mapping", 1620, 560, { size: 36, fill: COLORS.grey });
        const w_a = b.say("Sections are names for ranges of the file. Tools use them.", 1.5);
        const w_b = b.say("The kernel decided every mapping from the program headers alone.", 1);
        const w_c = b.say("It did not need the section header table to start the process.", 1);
        return t => {
          show_all(v, { mem: 1, tail: 1 });
          const p = prog(w_a, t);
          v.blocks.forEach(bl => {
            if (bl.b.sec) {
              bl.off.textContent = p > 0.5 ? bl.b.sec : bl.b.off;
              bl.off.style.fill = p > 0.5 ? COLORS.fg : COLORS.grey;
            }
          });
          v.tail_text.textContent = p > 0.5 ? ".bss: zeros" : "zeros: no bytes in the file";
          vis(v.blocks[6].outline, prog(w_c, t));
          vis(note, prog(w_c, t));
          v.cards.forEach(c => vis(c.outline, prog(w_b, t) * (1 - prog(w_c, t))));
        };
      } },
      { title: "Virtual, not RAM", build(g, b) {
        const v = loading_view(g);
        const ram = el("g", {}, g);
        rect_at(ram, 120, 850, 430, 90, COLORS.grey, 0.06, { dash: "10 10", sw: 3 });
        label(ram, "physical RAM", 535, 895, { size: 34, fill: COLORS.grey, anchor: "end" });
        const page = el("g", {}, g);
        rect_at(page, 150, 868, 150, 54, COLORS.blue, 0.5);
        label(page, "one page", 225, 895, { size: 30 });
        const pc = el("g", {}, g);
        el("circle", { cx: 120 + 430 * 0.3, cy: MEM_Y + MEM_H / 2, r: 11, fill: COLORS.yellow }, pc);
        label(pc, "pc = 0x4000e8", 120 + 430 * 0.3 + 24, MEM_Y - 24, { size: 32, font: MONO, anchor: "start" });
        const faulted = el("line", { x1: 225, y1: 868, x2: 120 + 430 * 0.3, y2: MEM_Y + MEM_H + 4,
                                     stroke: COLORS.yellow, "stroke-width": 4 }, g);
        const w_a = b.say("These are virtual addresses. Nothing was copied into RAM yet.", 1.5);
        const w_b = b.say("A mapping only records the range. A page arrives when it is used.", 1);
        const w_c = b.say("The first instruction fetch, at 0x4000e8, brings in the first page.", 1.5);
        const w_d = b.say("Zero pages work the same way: they are made on first use.", 1);
        return t => {
          show_all(v, { cards: 0.35, mem: 1, tail: 1 });
          vis(ram, prog(w_b, t));
          vis(pc, prog(w_c, t));
          vis(page, prog(w_c, t));
          vis(faulted, prog(w_c, t));
        };
      } },
    ],
  },

  fixup: {
    title: "How a relocation gets filled in",
    caption: "The call to helper in demo.o becomes a real branch offset. Then a pointer in a PIE is fixed at load time.",
    scenes: [
      { title: "Before the link", build(g, b) {
        const cb = code_block(g, [
          "demo.o, before linking",
          "  0:  90000000  adrp  x0, 0",
          "  4:  91000000  add   x0, x0, #0",
          "  8:  90000001  adrp  x1, 0",
          "  c:  91000021  add   x1, x1, #0",
          " 10:  94000000  bl    0",
        ], 120, 180, { size: 42, width: 1100 });
        const tags = ["", "ADR_PREL_PG_HI21  .rodata", "ADD_ABS_LO12_NC  .rodata",
                      "ADR_PREL_PG_HI21  counter", "ADD_ABS_LO12_NC  counter", "CALL26  helper"]
          .map((s, i) => label(g, s, 1260, cb.y + cb.pad + (i + 0.5) * cb.step, { size: 36, fill: COLORS.orange, anchor: "start" }));
        const w_a = b.say("In demo.o no address is known yet. Every operand is zero.", 1.5);
        const w_b = b.say("Each zero has a relocation: a note that tells the linker how to fill it.", 1.5);
        const w_c = b.say("The call to helper() needs R_AARCH64_CALL26.", 1);
        return t => {
          appear(cb.g, prog(w_a, t), 0, 20);
          tags.forEach((e, i) => vis(e, prog(stagger(w_b, i, 6, 0.4), t)));
          highlight_line(cb, 5, prog(w_c, t));
        };
      } },
      { title: "The linker computes", build(g, b) {
        const cb = code_block(g, ["bl at P = 0x4000f8", "helper at S = 0x400104"], 120, 170, { size: 46, width: 1100 });
        const sum = label(g, "", 160, 480, { size: 48, anchor: "start", font: MONO });
        const sum2 = label(g, "", 160, 570, { size: 48, anchor: "start", font: MONO });
        const bytes = label(g, "", 160, 700, { size: 52, anchor: "start", font: MONO });
        const w_a = b.say("The linker places .text at 0x4000e8, and helper at 0x400104.", 1.5);
        const w_b = b.say("Offset = S + A - P = 0x400104 - 0x4000f8 = 0xc.", 1);
        const w_c = b.say("A bl counts 4-byte words: 0xc divided by 4 is 3.", 1);
        const w_d = b.say("The linker writes 3 into the instruction: 94000000 becomes 94000003.", 1.5);
        const eq = text_track("", [[w_b, "S + A - P = 0x400104 + 0 - 0x4000f8 = 0xc"]]);
        const wd = text_track("", [[w_c, "0xc / 4 = 3 words"]]);
        const bt = text_track("94000000  bl  0", [[w_d, "94000003  bl  0x400104 <helper>"]]);
        return t => {
          appear(cb.g, prog(w_a, t), 0, 20);
          show_text(sum, eq(t), prog(w_b, t) > 0 ? 1 : 0);
          show_text(sum2, wd(t), prog(w_c, t) > 0 ? 1 : 0);
          show_text(bytes, bt(t), prog(w_c, t) > 0 ? 1 : 0);
          bytes.style.fill = prog(w_d, t) > 0.5 ? COLORS.green : COLORS.fg;
        };
      } },
      { title: "At load time", build(g, b) {
        const slot = box(g, "slot at 0x11008", 560, 440, 560, 130, { size: 46, color: COLORS.aqua });
        const rel = label(g, "R_AARCH64_RELATIVE, addend 0x2d0", 560, 610, { size: 36, font: MONO });
        const bias = label(g, "B = 0xaaaa00000000 (illustrative)", 960, 260, { size: 40, font: MONO, anchor: "middle" });
        const arrow_ = arrow(g, 860, 440, 1130, 440, COLORS.grey, 6);
        const out = box(g, "B + 0x2d0", 1380, 440, 460, 130, { size: 50, color: COLORS.orange });
        const who = label(g, "ld.so stores B + addend", 1380, 610, { size: 36, fill: COLORS.grey });
        const w_a = b.say("A PIE can load at any base B. A pointer stored in data must follow.", 1.5);
        const w_b = b.say("The file lists the slot, 0x11008, with addend 0x2d0 (the address of _start).", 1.5);
        const w_c = b.say("At load time ld.so stores B + 0x2d0 in the slot.", 1);
        const w_d = b.say("B can change from run to run, so the file cannot hold the final value.", 1);
        return t => {
          vis(bias, prog(w_a, t));
          appear(slot.g, prog(w_b, t), 0, 20);
          vis(rel, prog(w_b, t));
          draw_arrow(arrow_, prog(w_c, t));
          appear(out.g, prog(w_c, t), 20, 0);
          vis(who, prog(w_c, t));
        };
      } },
    ],
  },
};

// ---- pictures ---------------------------------------------------------------------------------

const { paint_el, txt } = PIC_KIT;

function mono_txt(g, s, x, y, { size = 26, fill = "currentColor", anchor = "start", weight = 500 } = {}) {
  const t = txt(g, s, x, y, { size, fill, anchor, weight });
  t.style.fontFamily = MONO;
  return t;
}

const PICS = {
  ehdr_bytes: {
    alt: "The first 64 bytes of demo.elf, field by field: the magic number, class, data, type, machine, entry point and table counts.",
    caption: "The ELF header of demo.elf, read from the bytes (little endian). The three identity fields are marked.",
    width: 1140, height: 770,
    draw(g, paint) {
      const rows = [
        ["0x00", "7f 45 4c 46", "magic", "7f 'E' 'L' 'F'", 0],
        ["0x04", "02", "EI_CLASS", "2 = ELFCLASS64", 1],
        ["0x05", "01", "EI_DATA", "1 = little endian", 1],
        ["0x10", "02 00", "e_type", "2 = ET_EXEC", 0],
        ["0x12", "b7 00", "e_machine", "0xb7 = 183 = AArch64", 1],
        ["0x18", "e8 00 40 00 00 00 00 00", "e_entry", "0x4000e8", 0],
        ["0x20", "40 00 00 00 00 00 00 00", "e_phoff", "64", 0],
        ["0x28", "f8 02 00 00 00 00 00 00", "e_shoff", "0x2f8 = 760", 0],
        ["0x36", "38 00", "e_phentsize", "56", 0],
        ["0x38", "03 00", "e_phnum", "3", 0],
        ["0x3a", "40 00", "e_shentsize", "64", 0],
        ["0x3c", "08 00", "e_shnum", "8", 0],
      ];
      const x0 = 30, x1 = 150, x2 = 550, x3 = 760, y0 = 40, step = 52;
      for (const [x, s] of [[x0, "offset"], [x1, "bytes"], [x2, "field"], [x3, "meaning"]]) {
        mono_txt(g, s, x, y0, { size: 26, fill: paint.muted, weight: 600 });
      }
      el("line", { x1: 20, y1: y0 + 26, x2: 1120, y2: y0 + 26, "stroke-width": 2 }, g).style.stroke = paint.muted;
      rows.forEach(([off, bytes, field, mean, ident], i) => {
        const y = y0 + 60 + i * step;
        if (ident) {
          const bar = el("rect", { x: 14, y: y - 22, width: 1112, height: 44, rx: 8, "fill-opacity": 0.16 }, g);
          paint_el(bar, "#199e70", "none");
        }
        mono_txt(g, off, x0, y, { fill: paint.muted });
        mono_txt(g, bytes, x1, y, { fill: paint.ink, weight: ident ? 700 : 500 });
        mono_txt(g, field, x2, y, { fill: paint.ink, weight: 700 });
        mono_txt(g, mean, x3, y, { fill: paint.ink });
      });
      txt(g, "Shaded rows: the three fields that identify the file (class, data, machine).", 30, y0 + 60 + 12 * step + 10,
          { size: 26, anchor: "start", fill: paint.muted, weight: 500 });
    },
  },

  bias_table: {
    alt: "A table for dyn.elf: file offset never changes; the runtime address is the load bias B plus the address in the file.",
    caption: "The same bytes of dyn.elf, three ways. B is the load bias chosen at exec time. The offset column never changes.",
    width: 1100, height: 440,
    draw(g, paint) {
      const cols = [[30, "what"], [280, "file offset"], [490, "address in the file"], [820, "runtime address"]];
      const y0 = 40, step = 64;
      for (const [x, s] of cols) mono_txt(g, s, x, y0, { size: 26, fill: paint.muted, weight: 600 });
      el("line", { x1: 20, y1: y0 + 26, x2: 1080, y2: y0 + 26, "stroke-width": 2 }, g).style.stroke = paint.muted;
      const rows = [
        ["LOAD 1 (R E)", "0x0", "0x0", "B + 0x0"],
        ["LOAD 2 (RW)", "0xe80", "0x10e80", "B + 0x10e80"],
        ["entry point", "", "0x2d0", "B + 0x2d0"],
        ["pointer slot", "0x1008", "0x11008", "B + 0x11008"],
      ];
      rows.forEach((r, i) => {
        const y = y0 + 62 + i * step;
        r.forEach((s, k) => {
          const x = cols[k][0];
          mono_txt(g, s, x, y, { fill: k === 3 ? "#d95926" : paint.ink, weight: k === 3 ? 700 : 500 });
        });
      });
      const yb = y0 + 62 + 4 * step - 6;
      mono_txt(g, "the offset column never changes", 280, yb, { size: 26, fill: paint.muted });
      mono_txt(g, "ld.so stores B + 0x2d0 in the pointer slot", 30, yb + 56, { size: 26, fill: paint.muted });
    },
  },
};
