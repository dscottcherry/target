#!/bin/bash
# SessionStart hook: restore book-to-skill's extractor dependencies.
#
# Claude Code on the web runs in an ephemeral container, so pip installs do
# not survive between sessions even though the vendored skill files do.
# Without this, PDF extraction fails on every fresh session.
set -euo pipefail

# Web only. Locally, pip installs persist and we do not touch the user's
# Python environment uninvited.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
REQS="$PROJECT_DIR/.claude/hooks/book-to-skill-requirements.txt"
PY="${PYTHON:-python3}"

[ -f "$REQS" ] || exit 0

CHECK='import pypdf, ebooklib, bs4, docx, striprtf'

# Idempotent fast path: nothing to do if the extractors already import.
if "$PY" -c "$CHECK" >/dev/null 2>&1; then
  exit 0
fi

# The Debian-packaged `cryptography` in this image ships without a working
# `_cffi_backend`, which makes `import pypdf` abort with a pyo3 panic.
# Upgrading cffi repairs it. Non-fatal: pypdf may still import without this.
"$PY" -m pip install --quiet --upgrade cffi >/dev/null 2>&1 || true

if ! "$PY" -m pip install --quiet -r "$REQS" >/dev/null 2>&1; then
  echo "book-to-skill: dependency install failed; PDF extraction will not work." >&2
  exit 0
fi

if ! "$PY" -c "$CHECK" >/dev/null 2>&1; then
  echo "book-to-skill: extractors still unavailable after install; PDF/EPUB support is degraded." >&2
fi

exit 0
