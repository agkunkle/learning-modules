#!/usr/bin/env bash
# Check the toolchain for learning modules on Ubuntu (22.04+ or WSL). Prints one line per tool
# and an install hint for anything missing. Exit 1 if a required tool is missing.
set -u

missing=0
ok() { printf '  ok      %-14s %s\n' "$1" "$2"; }
bad() { printf '  MISSING %-14s install: %s\n' "$1" "$2"; missing=1; }
opt() { printf '  absent  %-14s (optional) %s\n' "$1" "$2"; }

echo "Learning-module toolchain:"

if command -v git >/dev/null; then ok git "$(git --version | cut -d' ' -f3)"
else bad git "sudo apt install git"; fi

if command -v python3 >/dev/null; then
  ver=$(python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])')
  if python3 -c 'import sys; sys.exit(sys.version_info < (3, 10))'; then ok python3 "$ver"
  else bad python3 "3.10 or newer (found $ver): sudo apt install python3"; fi
else bad python3 "sudo apt install python3 python3-pip"; fi

if python3 -c 'import PIL' 2>/dev/null; then ok Pillow "$(python3 -c 'import PIL; print(PIL.__version__)')"
else bad Pillow "pip install Pillow   (or: sudo apt install python3-pil)"; fi

if python3 -m pytest --version >/dev/null 2>&1; then
  ok pytest "$(python3 -m pytest --version 2>&1 | awk '{print $2}')"
else bad pytest "pip install pytest   (or: sudo apt install python3-pytest)"; fi

chrome=$(python3 -c 'import sys; sys.path.insert(0, "'"$(dirname "$0")"'/module_kit"); import kit; print(kit.find_chrome() or "")')
if [ -n "$chrome" ]; then ok chrome "$chrome"
else bad chrome "Google Chrome .deb (see AGENTS.md) or chromium; or set \$CHROME to a binary"; fi

if fc-list 2>/dev/null | grep -qi 'dejavu'; then ok fonts "DejaVu"
else opt fonts "sudo apt install fonts-dejavu (headless screenshots need some fonts)"; fi

if command -v claude >/dev/null; then ok claude "$(claude --version 2>/dev/null | head -1)"
else opt claude "Claude Code: curl -fsSL https://claude.ai/install.sh | bash"; fi

exit $missing
