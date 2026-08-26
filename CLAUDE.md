# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

`gromacs-helper-vscode` is a VS Code extension (`mcardzh.gromacs-helper-vscode`, v0.4.1) that provides full language support for GROMACS molecular dynamics simulation files: `.mdp`, `.top`, `.itp`, `.gro`, `.ndx`, `.pdb`, `.xvg`, `.pka`, `.packmol` / `.inp`, plus trajectory viewers for `.xtc` / `.trr`. It combines TextMate grammars with programmatic semantic-token providers, and ships a Mol*-based 3D structure/trajectory viewer in a WebView.

## Build, Lint, Test

All commands run from repo root. Two webpack configs must build together — `compile` and `package` already do this.

```bash
npm install                  # first time only
npm run compile              # dev build: webpack (extension) + webpack.viewer.config.js
npm run compile:extension    # main extension bundle → dist/extension.js
npm run compile:viewer       # Mol* viewer bundle   → dist/viewer/molstar-viewer.js
npm run watch                # auto-rebuild extension
npm run watch:viewer         # auto-rebuild viewer
npm run package              # production VSIX-ready build (minified, hidden source maps)
./build.sh                   # interactive: bump version → compile → package VSIX (macOS/Linux)
build.bat                    # same, for Windows

npm run lint                 # eslint src/**/*.ts (excludes src/viewer)
npm run compile-tests        # tsc → out/  (required before npm test)
npm test                     # full pretest + vscode-test
npm run test:ci              # CI variant of vscode-test

# Run a single test file — vscode-test reads .vscode-test.mjs by default.
# To run only one suite, temporarily narrow `files` in .vscode-test.mjs to e.g.:
#   'out/test/build.test.js'
# then `npm run compile-tests && npm test`.
```

Webpack details: `webpack.config.js` (Node target, entry `src/extension.ts`) bundles the extension and copies `media/` + `scripts/` into `dist/`. `webpack.viewer.config.js` (Web target, entry `src/viewer/index.tsx`) bundles the Mol* viewer UMD into `dist/viewer/`. `src/viewer/**` is excluded from the extension's ts-loader so its React/TSX code never ships in the extension bundle.

## Architecture

### Entry point & module activation
- `src/extension.ts` — `activate(context)` is the single composition root. It instantiates each language-support module, registers top-level providers/commands, and pushes every disposable onto `context.subscriptions`. **All disposables MUST go through `context.subscriptions.push(...)`** (or be collected on a module-local `disposables[]` that gets spread at the end).
- Module pattern (see `src/languages/mdp/index.ts` for the canonical example): a `XxxLanguageSupport` class with `activate(context)`, an internal `disposables[]` it adds registrations to, plus a `dispose()` for explicit teardown. NDX/PDB skip the wrapper class and register providers inline in `extension.ts`.

### Layered language features
For every file format the extension layers multiple providers on top of one grammar:

1. **TextMate grammar** in `syntaxes/{format}/{format}.tmLanguage.json` — base static highlighting (Oniguruma regex).
2. **Language config** in `syntaxes/{format}/{format}-language-configuration.json` — comments, brackets, folding markers, auto-closing pairs.
3. **Programmatic providers** in `src/providers/*` — Completion, Hover, Diagnostics, Formatting, Symbol, Folding, CodeAction, SemanticTokens. Each language picks a subset.
4. **Semantic tokens** (`baseSemanticTokensProvider.ts` + per-language subclass like `MdpSemanticTokensProvider`) override TextMate scopes with context-aware coloring (residue types, MDP parameter categories). Token types/modifiers are declared in `package.json` under `contributes.semanticTokenTypes` / `semanticTokenModifiers`, and theme mapping goes through `contributes.semanticTokenScopes`.

### Constants drive intelligence
- `src/constants/residueTypes.ts` — amino acid classification map (acidic / basic / polar / nonpolar / aromatic / special / nucleotide / ion / water / other). Used by GRO/PDB/TOP semantic tokens and hover providers.
- `src/constants/mdpParameters.ts` — every GROMACS 2025.2 parameter with `category`, `type`, units, defaults, validation. **Adding a new MDP parameter means editing this file**; completion/hover/diagnostic/semantic-token code reads it directly. Categories here also determine the semantic-token color.

### Two webview-based subsystems
- **Packmol 3D preview** — `src/providers/packmolPreviewPanel.ts` (detached editor panel) + `src/providers/packmolPreviewProvider.ts` (sidebar `WebviewView`). Both render `media/packmol_preview.html` (Three.js loaded from CDN). The `gromacs-helper.previewPackmol` command updates panel + sidebar in parallel. Resource refs in webviews MUST go through `asWebviewUri()`.
- **Mol* viewer** — `src/providers/molstarViewerPanel.ts` (panel + serializer for state restore across reloads). Backed by the UMD bundle from `src/viewer/index.tsx` + custom React components in `src/viewer/components/` and helpers in `src/viewer/util/` (core, trajectory, trajectory-controls).

### Trajectory streaming
- `src/parsers/{xtc,trr}/stream-reader.ts` — actively used; reads XTC/TRR frames lazily with an LRU cache (`src/util/lru-cache.ts`) and an offset index built on open.
- `src/parsers/{xtc,trr}/parser.ts` — kept for API parity with molstar's batch parser; not currently called from extension code. Safe to delete if confirmed unused.
- `src/util/stream_provider.ts` — `StreamingTrajectoryProvider` is the single entry point the Mol* webview talks to; it picks TRR vs XTC and exposes `getFrame` / `getFrames` / `getFrameRange`. File I/O happens in the extension host (Node.js), never in the webview.

### Other notable providers
- `src/providers/gromacsMonitorProvider.ts` + `src/languages/monitor/index.ts` — status-bar monitor for local/remote (SSH) GROMACS processes; targets configured under `gromacsHelper.monitor.targets` in `package.json`.
- `src/providers/commandsViewProvider.ts` — "GROMACS Commands" activity-bar view with grouped, user-editable command templates (`{pdb|gro}`, `{output.gro}`, `{basename}` placeholders resolved at run time).
- `src/providers/snippetTreeProvider.ts` + `src/snippetManager.ts` — sidebar tree + manager for user-editable MDP snippets. **Snippets are persisted in `context.globalStorageUri`** (not workspace files), so they survive across workspaces but are per-machine.
- `src/providers/unitConverter.ts` — unit-conversion WebView panel.
- `src/providers/colorManager.ts` — singleton that reads `gromacsHelper.colors.*` from settings and pushes them into `vscode.window.createTextEditorDecorationType()` so colors are user-tweakable without editing a theme.

### Tests
- Tests live in `src/test/` and compile to `out/test/*.test.js`. `vscode-test` is driven by `.vscode-test.mjs` (developer) and `.vscode-test.ci.mjs` (CI).
- Shared GROMACS sample files are in `test-fixtures/` (referenced from tests, do not move into `src/`).
- Patterns covered: build, extension smoke, language features, multisphere, unit converter.

## Conventions

- **Language IDs** (use exactly): `gromacs_mdp_file`, `gromacs_top_file`, `gromacs_gro_file`, `gromacs_ndx_file`, `gromacs_pdb_file`, `gromacs_xvg_file`, `gromacs_pka_file`, `packmol`.
- **TextMate scopes**: `source.{format}` root, e.g. `source.mdp`, `source.gro`. Match priority: most specific patterns first. Uses Oniguruma regex (not JS).
- **Provider class names**: `Xxx{Feature}Provider` — `MdpCompletionProvider`, `NdxHoverProvider`, etc.
- **File names**: kebab-case (`packmolStructureParser.ts`).
- **Constants**: `UPPER_SNAKE_CASE` for top-level constant maps (`MDP_PARAMETERS`, `AMINO_ACIDS`).
- **Disposables**: every event listener, provider registration, and command MUST be pushed onto `context.subscriptions` (or a module-local disposables array spread at the end of `activate`). No raw `addEventListener` / `setInterval` left unmanaged.
- **Settings namespace**: all user-facing config under `gromacsHelper.*` — declared in `package.json` `contributes.configuration.properties`.

## Changelog rule

From `.cursor/rules/changelog.mdc` (always-on): whenever you change, add, or fix anything, **append an entry to `CHANGELOG.md` under the current top version, in one of three categories — 新增 (Added), 优化 (Optimized), 修复 (Fixed)**. Match the style of existing entries.

## Workflow reminders

- Use `npm run watch` + the "Run Extension" launch config in `.vscode/launch.json` while developing — webpack rebuilds and the Extension Development Host auto-reloads.
- `pretest` already runs `compile-tests && compile && lint`, so `npm test` alone is enough for a full check.
- After dependency or build-config changes, run `npm run compile` (both bundles) before testing — a half-built dist leaves the extension importing stale code.
- Webview HTMLs must use `asWebviewUri()` for any local resource; CSP is set per webview, do not loosen it without a reason.
