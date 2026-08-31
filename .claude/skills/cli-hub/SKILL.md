---
name: cli-hub
description: >-
  Find and use agent-native CLIs for real software — Blender, GIMP, QGIS,
  Obsidian, Kdenlive, Ollama, and ~100 more — through the CLI-Hub registry.
  Use when a task needs to drive desktop or GUI software (edit an image,
  render a 3D scene, build a video, author a diagram, query a note vault)
  and no local tool already covers it.
---

# CLI-Hub

CLI-Hub is a package manager for *agent-native CLIs*: harnesses that wrap
software with no usable command line behind one that speaks JSON. Instead of
automating a GUI, install the harness and call it.

Upstream: [HKUDS/CLI-Anything](https://github.com/HKUDS/CLI-Anything) (Apache-2.0).

## Setup

Run once per machine:

```bash
./scripts/setup-cli-anything.sh
export PATH="$HOME/.cli-anything/bin:$PATH"
export CLI_HUB_NO_ANALYTICS=1
```

The venv matters: `cli-hub` installs harnesses with `sys.executable -m pip`,
so they land beside whichever interpreter runs it.

## Finding a CLI

```bash
cli-hub list                  # whole registry, grouped by category
cli-hub search image          # by name, description, or category
cli-hub info gimp             # requirements, entry point, install status
cli-hub can "transcribe audio"   # find a capability across workflow matrices
```

`cli-hub info` first — the `Requires:` field says whether the harness needs
upstream software installed (Blender, GIMP, a running Obsidian, an API key).
A harness with unmet requirements installs fine and then fails at run time.

## Using a CLI

```bash
cli-hub install mermaid              # installs the cli-anything-mermaid package
cli-anything-mermaid --help          # every harness has its own entry point
cli-anything-mermaid --json <cmd>    # always pass --json when driving it as an agent
```

Every harness ships a `SKILL.md` describing its commands. Read it before
guessing at flags — the command trees are not uniform:

```bash
find "$HOME/.cli-anything/lib" -path "*<name>/skills/SKILL.md"
```

Harnesses are stateful: most work against a project file you create, mutate
across several calls, then export.

```bash
cli-anything-mermaid --json project new -o diagram.json
cli-anything-mermaid --json --project diagram.json diagram set --file graph.mmd
cli-anything-mermaid --json --project diagram.json export render out.svg
```

Run a harness with no subcommand and it drops into an interactive REPL — not
what you want from a script.

## Workflow matrices

A matrix bundles a multi-tool workflow as capabilities × providers. Preflight
before installing, and scope the install to the capability you actually need:

```bash
cli-hub matrix list
cli-hub matrix preflight video-creation --json          # exit 3 = gaps
cli-hub matrix install video-creation --capability text.transcribe
```

Do not bulk-install a 14-CLI matrix for a one-capability task.

## Troubleshooting

- **`Failed to fetch registry`** — `cli-hub` reads its registries from
  `hkuds.github.io`. If egress blocks that host, run
  `./scripts/seed-registry-cache.sh`; the fetch falls back to the on-disk
  cache and everything but freshness keeps working.
- **`AttributeError: install_layout` during install** — a system Python with
  Debian's patched setuptools. Install into the venv from
  `scripts/setup-cli-anything.sh`, not system site-packages.
- **A harness reaches the network** — several render or query through cloud
  services (`mermaid.ink`, vendor APIs). Restricted egress fails those
  commands while offline ones still work.
- **Telemetry** — `cli-hub` reports usage to PostHog/Umami unless
  `CLI_HUB_NO_ANALYTICS=1` is set.
