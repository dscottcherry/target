# Upstream

The contents of this repository are an unmodified import of:

- **Source:** https://github.com/jaredrhod/fullstack-agent
- **Commit:** `d3c7374c89680628f38e1e63aa9d64a0a7170f7b` (`main`)
- **Commit date:** 2026-08-23
- **Imported:** 2026-08-26

Every tracked file except this one is a verbatim copy of that commit.

## License

The upstream project is licensed under the **GNU Affero General Public License,
version 3 or later (AGPL-3.0-or-later)**, Copyright (c) 2026 Jared Rhodenizer.
The full text is in `LICENSE`, and that license governs this copy too: any
modifications distributed from here, or run as a network service others use,
must ship under the same license with source available.

## Re-syncing with upstream

```
git remote add upstream https://github.com/jaredrhod/fullstack-agent
git fetch upstream
git diff HEAD upstream/main -- . ':!UPSTREAM.md'
```

Note that `update.sh` / `update.bat` in this repo pull from the *upstream*
remotes of the installed pieces, not from this fork.
