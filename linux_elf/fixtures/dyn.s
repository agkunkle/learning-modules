// dyn.s: dynamically linked PIE example (AArch64). Never executed.
        .text
        .globl  _start
_start:
        adrp    x0, ptr_slot
        add     x0, x0, :lo12:ptr_slot
        bl      stub_call               // defined in libstub.so
        mov     x8, #93
        svc     #0

        .data
        .balign 8
        .globl  ptr_slot
ptr_slot: .quad  _start                 // absolute address in data: needs R_AARCH64_RELATIVE in a PIE
