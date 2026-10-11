// helper.s: defines helper(), so demo.o has an undefined symbol until link time.
        .text
        .globl  helper
helper: ret
