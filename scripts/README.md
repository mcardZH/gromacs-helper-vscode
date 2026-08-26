# Scripts

Development-time utilities for the gromacs-helper-vscode extension.

## Layout

| Subdirectory | Purpose |
|--------------|---------|
| `shell/` | Bash scripts invoked from a developer shell |
| `python/` | Python utilities + their input/output data |

## Shell scripts

| File | When to run |
|------|-------------|
| `shell/release.sh` | Cutting a new release (packaging + publishing) |
| `shell/test-actions.sh` | Smoke-testing GitHub Actions locally |
| `shell/gromacs_monitor.sh` | **Bundled with the extension** — uploaded to a remote GROMACS host at runtime by `src/providers/gromacsMonitorProvider.ts`. The webpack build copies it into `dist/scripts/shell/gromacs_monitor.sh`; do not move it without updating that provider. |

## Python utilities

| File | What it does |
|------|--------------|
| `python/parse_mdp_docs.py` | Parses GROMACS MDP documentation (`.rst`) into a TypeScript parameter table. Run with `python scripts/python/parse_mdp_docs.py scripts/python/data/<input>.rst`. |
| `python/data/` | Sample inputs and generated outputs for `parse_mdp_docs.py` |
