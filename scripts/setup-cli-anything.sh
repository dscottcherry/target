#!/usr/bin/env bash
# Set up CLI-Anything (CLI-Hub) in an isolated venv.
#
# CLI-Hub is a package manager for "agent-native" CLIs: harnesses that wrap
# desktop software (Blender, GIMP, QGIS, Obsidian, ...) behind a JSON-speaking
# command line an AI agent can drive. See https://github.com/HKUDS/CLI-Anything
#
# Usage:  ./scripts/setup-cli-anything.sh [venv-path]
set -euo pipefail

VENV="${1:-$HOME/.cli-anything}"

# cli-hub installs harnesses with `sys.executable -m pip`, so whichever
# interpreter runs cli-hub is where the harnesses land. A dedicated venv keeps
# them out of the system site-packages and, importantly, gives them modern
# setuptools: Debian/Ubuntu's patched setuptools fails these harnesses' legacy
# `setup.py bdist_wheel` path with `AttributeError: install_layout`.
if [ ! -x "$VENV/bin/python" ]; then
  echo "==> creating venv at $VENV"
  python3 -m venv "$VENV"
fi

echo "==> upgrading build tooling"
"$VENV/bin/pip" install --quiet --upgrade pip setuptools wheel

echo "==> installing cli-anything-hub"
"$VENV/bin/pip" install --quiet --upgrade cli-anything-hub

# cli-hub ships opt-out telemetry (PostHog / Umami). Turn it off by default;
# delete this block if you would rather leave it on.
mkdir -p "$HOME/.cli-hub"
if ! grep -qs CLI_HUB_NO_ANALYTICS "$HOME/.bashrc" 2>/dev/null; then
  echo 'export CLI_HUB_NO_ANALYTICS=1' >> "$HOME/.bashrc"
fi

echo
echo "Installed: $("$VENV/bin/cli-hub" --version)"
echo
echo "Add to PATH:  export PATH=\"$VENV/bin:\$PATH\""
echo "Then:         export CLI_HUB_NO_ANALYTICS=1"
echo "              cli-hub list"
echo
echo "If 'cli-hub list' cannot reach hkuds.github.io (restricted egress),"
echo "seed the cache offline:  ./scripts/seed-registry-cache.sh"
