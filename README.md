# target

CLI-Anything / CLI-Hub setup.

[CLI-Anything](https://github.com/HKUDS/CLI-Anything) (HKUDS, Apache-2.0) wraps
software that has no usable command line — Blender, GIMP, QGIS, Obsidian,
Kdenlive, Ollama, ~100 others — in JSON-speaking CLIs an AI agent can drive.
`cli-hub` is its package manager.

## Setup

```bash
./scripts/setup-cli-anything.sh
export PATH="$HOME/.cli-anything/bin:$PATH"
export CLI_HUB_NO_ANALYTICS=1

cli-hub list
cli-hub info blender
cli-hub install mermaid
cli-anything-mermaid --json project new -o diagram.json
```

Claude Code picks up `.claude/skills/cli-hub/SKILL.md` automatically, so an
agent in this repo can find and install the right harness for a task on its
own. To install the skill globally instead of per-repo, use upstream's:

```bash
npx skills add HKUDS/CLI-Anything --skill cli-hub-meta-skill -g -y
```

## Scripts

| Script | Purpose |
|---|---|
| `scripts/setup-cli-anything.sh` | Create the venv, install `cli-anything-hub`, disable telemetry. Idempotent. |
| `scripts/seed-registry-cache.sh` | Populate `~/.cli-hub/*_cache.json` from a repo clone, for hosts that cannot reach `hkuds.github.io`. |

## Why a venv

`cli-hub install <name>` shells out to `sys.executable -m pip`, so harnesses
install beside whichever interpreter runs `cli-hub`. Two reasons not to let
that be the system Python:

1. Harnesses use a legacy `setup.py bdist_wheel` build. Debian and Ubuntu ship
   a patched setuptools that fails it with `AttributeError: install_layout`.
   A venv with current `setuptools`/`wheel` builds them cleanly.
2. Each harness is its own package with its own console script. That is a lot
   of packages to spray into system site-packages.

## Notes

- **Telemetry.** `cli-hub` reports usage to PostHog/Umami by default. The
  setup script exports `CLI_HUB_NO_ANALYTICS=1`.
- **Registry host.** Registries are served from `hkuds.github.io`, separate
  from the GitHub repo itself. `cli_hub.registry` falls back to its on-disk
  cache when a fetch fails, which is what `seed-registry-cache.sh` exploits.
- **Upstream requirements.** `cli-hub info <name>` shows a `Requires:` field.
  A harness for GUI software still needs that software installed; the install
  succeeds either way and fails later.
- **Network at run time.** Some harnesses call cloud services (`mermaid.ink`,
  vendor APIs) for rendering or queries.
