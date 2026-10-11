/* Three PT_LOAD segments: RX (headers + .text), R (.rodata), RW (.data + .bss). */
ENTRY(_start)
PHDRS {
  rx PT_LOAD FILEHDR PHDRS FLAGS(5);
  ro PT_LOAD FLAGS(4);
  rw PT_LOAD FLAGS(6);
}
SECTIONS {
  . = 0x400000 + SIZEOF_HEADERS;
  .text   : { *(.text*) }   :rx
  . = ALIGN(0x10000) + (. & 0xffff);
  .rodata : { *(.rodata*) } :ro
  . = ALIGN(0x10000) + (. & 0xffff);
  .data   : { *(.data*) }   :rw
  .bss    : { *(.bss*) *(COMMON) } :rw
}
