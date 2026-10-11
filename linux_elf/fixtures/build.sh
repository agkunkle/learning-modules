#!/usr/bin/env bash
# Build the AArch64 fixtures for the linux_elf module. Assemble and link only: never run output.
set -euo pipefail
cd "$(dirname "$0")"
AS=aarch64-linux-gnu-as
LD=aarch64-linux-gnu-ld
RE=readelf
mkdir -p build output
$AS demo.s -o build/demo.o
$AS helper.s -o build/helper.o
$LD -T demo.ld build/demo.o build/helper.o -o build/demo.elf
$AS stub.s -o build/stub.o
$LD -shared -soname libstub.so build/stub.o -o build/libstub.so
$AS dyn.s -o build/dyn.o
$LD -pie --no-as-needed -dynamic-linker /lib/ld-linux-aarch64.so.1 \
    build/dyn.o -Lbuild -l:libstub.so -o build/dyn.elf
{ $LD --version | head -1; $AS --version | head -1; } > output/tools.txt
$RE -h  build/demo.elf  > output/demo_h.txt
$RE -lW build/demo.elf  > output/demo_l.txt
$RE -SW build/demo.elf  > output/demo_S.txt
$RE -rW build/demo.o    > output/demo_o_r.txt
$RE -sW build/demo.o    > output/demo_o_s.txt
$RE -sW build/demo.elf  > output/demo_s.txt
$RE -h  build/dyn.elf   > output/dyn_h.txt
$RE -lW build/dyn.elf   > output/dyn_l.txt
$RE -dW build/dyn.elf   > output/dyn_d.txt
$RE -rW build/dyn.elf   > output/dyn_r.txt
$RE -SW build/dyn.elf   > output/dyn_S.txt
$RE -h  build/libstub.so > output/libstub_h.txt
OD=aarch64-linux-gnu-objdump
$OD -dr build/demo.o  > output/demo_o_dis.txt
$OD -d  build/demo.elf > output/demo_dis.txt
$OD -s -j .text -j .rodata -j .data build/demo.elf > output/demo_hex.txt
xxd -l 64 build/demo.elf > output/demo_hex64.txt
# Surprise cases (section 8): a copy with the section header table removed, and a stripped copy.
python3 - <<'PY'
import struct
d = bytearray(open("build/demo.elf", "rb").read())
struct.pack_into("<Q", d, 0x28, 0)      # e_shoff
struct.pack_into("<HHH", d, 0x3A, 0, 0, 0)  # e_shentsize, e_shnum, e_shstrndx
open("build/demo_nosect.elf", "wb").write(d)
PY
aarch64-linux-gnu-strip -o build/demo_stripped.elf build/demo.elf
$RE -SW build/demo_nosect.elf   > output/nosect_S.txt
$RE -lW build/demo_nosect.elf   > output/nosect_l.txt
$RE -sW build/demo_stripped.elf > output/stripped_s.txt 2>&1 || true
$RE -SW build/demo_stripped.elf > output/stripped_S.txt
$RE -lW build/demo_stripped.elf > output/stripped_l.txt
echo "fixtures built"
