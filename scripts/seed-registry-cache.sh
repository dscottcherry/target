#!/usr/bin/env bash
# Seed ~/.cli-hub/*_cache.json from a clone of HKUDS/CLI-Anything.
#
# cli-hub fetches its registries from hkuds.github.io. Where that host is
# blocked but github.com is reachable, this populates the on-disk cache from
# the JSON files that live in the repo itself. cli_hub.registry falls back to
# the cache (ignoring TTL) whenever a fetch fails, so list/search/info/install
# keep working offline.
set -euo pipefail

CLONE="${1:-}"
CACHE="$HOME/.cli-hub"

if [ -z "$CLONE" ]; then
  CLONE="$(mktemp -d)/CLI-Anything"
  echo "==> cloning HKUDS/CLI-Anything (shallow) to $CLONE"
  git clone --depth 1 --quiet https://github.com/HKUDS/CLI-Anything.git "$CLONE"
fi

mkdir -p "$CACHE"
python3 - "$CLONE" "$CACHE" <<'PY'
import json, pathlib, sys, time

src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
for name, cache in (("registry.json",        "registry_cache.json"),
                    ("public_registry.json", "public_registry_cache.json"),
                    ("matrix_registry.json", "matrix_registry_cache.json")):
    data = json.loads((src / name).read_text())
    (dst / cache).write_text(json.dumps({"_cached_at": time.time(), "data": data}, indent=2))
    count = len(data.get("clis", data.get("matrices", [])))
    print(f"seeded {cache:30s} entries={count}")
PY

echo
echo "Done. Try: cli-hub list"
