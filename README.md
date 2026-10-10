# learning-modules

Single-file HTML learning modules about code: prose, annotated code excerpts, interactive
architecture diagrams, silent captioned animations, and self-check questions (choice, click
the line, ordering, matching). Each module is one offline `.html` file. Nothing is saved or
sent.

Use them to onboard people to a codebase, or link one from a code-review description so a
reviewer gets the context before they read the diff.

## Modules

This repository is public and holds the kit, the skill and the tests. Modules about private code
stay on the author's machine (listed in `.gitignore`); share their `dist/*.html` through a private
channel. The first module, `robodog_onboarding/` (onboarding, ~40 min), is one of these.

## Quick start (Ubuntu 22.04+ / WSL2)

```bash
tools/check_setup.sh                      # git, Python 3.10+, Pillow, pytest, Chrome, fonts
python3 tools/module_kit/kit.py new my_module
python3 tools/module_kit/kit.py check my_module   # builds dist/my_module.html + review sheets
python3 -m pytest tools/tests
```

Missing pieces: `sudo apt install git python3 python3-pip fonts-dejavu`,
`pip install Pillow pytest`, and Google Chrome
(`wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb &&
sudo apt install ./google-chrome-stable_current_amd64.deb`) or Chromium (`$CHROME` may point to
any Chrome binary). Modules are written with Claude Code
(`curl -fsSL https://claude.ai/install.sh | bash`).

The full workflow and spec are in `.claude/skills/learning-module/SKILL.md`.
