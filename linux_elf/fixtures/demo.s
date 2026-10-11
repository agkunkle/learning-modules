// demo.s: tiny AArch64 Linux example for the ELF module. Never executed.
        .text
        .globl  _start
_start:
        adrp    x0, msg                 // page of msg
        add     x0, x0, :lo12:msg       // low 12 bits of msg
        adrp    x1, counter
        add     x1, x1, :lo12:counter
        bl      helper                  // external call: needs a CALL26 relocation
        mov     x8, #93                 // exit
        svc     #0

        .section .rodata
msg:    .asciz  "hello, elf\n"

        .data
        .globl  counter
counter: .quad  7

        .bss
        .globl  buffer
buffer: .skip   4096
