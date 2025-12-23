# GROMACS Helper VS Code Extension - AI Coding Agent Instructions

## Project Overview

This is a VS Code extension providing comprehensive language support for GROMACS molecular dynamics simulation files (`.mdp`, `.top`, `.gro`, `.pdb`, `.ndx`, `.xvg`, `.pka`, `.packmol`). The extension combines TextMate grammar-based syntax highlighting with programmatic semantic token providers, offering intelligent completion, validation, and visualization features.

## Architecture Patterns

### Dual-Layer Syntax Highlighting
The project uses a **two-tier highlighting approach** that differs from typical VS Code extensions:

1. **TextMate Grammars** (`syntaxes/*/`) - Base syntax coloring via scope-based patterns
2. **Semantic Tokens Providers** (`src/providers/*SemanticTokensProvider.ts`) - Context-aware runtime highlighting

Semantic tokens override TextMate scopes and provide dynamic coloring based on residue types, parameter categories, etc. Defined in [baseSemanticTokensProvider.ts](src/providers/baseSemanticTokensProvider.ts) with custom token types registered in [package.json](package.json) `semanticTokenTypes`.

### Language Support Module Pattern
Each file format follows a consistent activation pattern in [src/languages/](src/languages/):

```typescript
export class XxxLanguageSupport {
  public activate(context: vscode.ExtensionContext): void {
    // Register providers: completion, hover, diagnostics, semantic tokens, etc.
    context.subscriptions.push(/* disposables */);
  }
}
```

Main entry point [src/extension.ts](src/extension.ts) instantiates and activates all language modules. **Critical**: Use `context.subscriptions.push()` for all disposables to prevent memory leaks.

### Domain-Specific Constant Definitions
- **Residue Types**: [src/constants/residueTypes.ts](src/constants/residueTypes.ts) - Amino acid classifications (acidic, basic, polar, nonpolar, aromatic, special, nucleotide, ion, water)
- **MDP Parameters**: [src/constants/mdpParameters.ts](src/constants/mdpParameters.ts) - All GROMACS 2025.2 parameters with categories, types, units, defaults, and validation rules

These drive both semantic highlighting and intelligent features like diagnostics/completion.

### Custom Snippet Management
Unlike standard snippet files, this project uses [src/snippetManager.ts](src/snippetManager.ts) to store user-editable snippets in global storage (`context.globalStorageUri`), not workspace files. Snippets support VSCode placeholder syntax (`${1:default}`, `${1|option1,option2|}`).

## Development Workflows

### Build & Package
```bash
npm run compile        # Development build via webpack
npm run watch          # Auto-rebuild on changes (use for development)
npm run package        # Production build (minified, hidden source maps)
./build.sh            # Interactive version bump + package VSIX
```

**Webpack Configuration**: [webpack.config.js](webpack.config.js) bundles TypeScript to `dist/extension.js`. The `media/` folder is copied to `dist/media/` for WebView resources (Packmol preview HTML).

### Testing
```bash
npm run pretest        # Compile tests + lint
npm test              # Run extension tests
npm run test:ci       # CI-specific test config
```

Tests use `@vscode/test-electron`. Test files in [src/test/](src/test/). Run via `npm: watch-tests` task for watch mode.

### Debugging
Use the "Run Extension" launch configuration (`.vscode/launch.json` if present). Webpack watch mode (`npm run watch`) enables live reload without repackaging.

## Key Technical Patterns

### Parameter Validation (MDP Files)
[src/providers/mdpDiagnosticProvider.ts](src/providers/mdpDiagnosticProvider.ts) performs two-pass validation:
1. Parse all parameter lines, check format (`parameter = value`)
2. Validate values against type/range rules from `MDP_PARAMETERS` constant

Example: Temperature must be positive number, `integrator` must be one of predefined values. **Important**: Diagnostics update on document change via `vscode.workspace.onDidChangeTextDocument`.

### Semantic Token Color Management
[src/providers/colorManager.ts](src/providers/colorManager.ts) singleton manages runtime color updates via `vscode.window.createTextEditorDecorationType()`. Colors read from workspace config `gromacsHelper.colors.*` and apply via decoration ranges, **not** via theme contribution (allows user customization without theme editing).

### WebView Panels (3D Visualization)
Packmol preview uses both:
- **Panel**: [PackmolPreviewPanel.ts](src/providers/packmolPreviewPanel.ts) - Standalone preview window
- **Sidebar View**: [PackmolPreviewProvider.ts](src/providers/packmolPreviewProvider.ts) - Activity bar webview

Both render [media/packmol_preview.html](media/packmol_preview.html) with Three.js for 3D geometry visualization. **Critical**: Use `asWebviewUri()` for all resource references in webviews.

### Residue-Aware Highlighting
Structure files (GRO, PDB, TOP) classify residues by type (acidic, basic, etc.) via lookup in `AMINO_ACIDS` map. Each residue type has a custom semantic token. Users can configure colors per-type in settings (`gromacsHelper.colors.residue_*`).

## File Format Specifics

### MDP Files (Molecular Dynamics Parameters)
- **Grammar**: [syntaxes/mdp/mdp.tmLanguage.json](syntaxes/mdp/mdp.tmLanguage.json)
- **Providers**: Completion, Hover, Diagnostics, Formatting, Semantic Tokens, Symbol (outline)
- **Validation**: Parameter existence, type checking, value ranges, inter-parameter dependencies
- **15 parameter categories** color-coded via semantic tokens (run control, electrostatics, temperature coupling, etc.)

### Structure Files (GRO, PDB)
- **10 residue type categories** with customizable colors + bold settings
- **Coordinate parsing**: Fixed-width format for PDB, space-delimited for GRO
- **Hover**: Shows residue name, type, properties from `AMINO_ACIDS` map

### XVG Files (Plot Data)
- **Chart preview**: [XvgPreviewProvider.ts](src/providers/xvgPreviewProvider.ts) parses data columns and renders with Chart.js in webview
- **Comment directives**: `@` lines configure axes, titles (XMGrace format)

### Packmol Files
- **3D Preview**: Parses structure commands (`structure`, `atoms`, constraints like `inside cube`, `outside sphere`) and visualizes geometry
- **Syntax**: Keywords, commands, constraints, geometry shapes as distinct semantic tokens

## Project Conventions

### Naming Conventions
- **Language IDs**: `gromacs_xxx_file` (e.g., `gromacs_mdp_file`)
- **Scope names**: `source.xxx` for TextMate (e.g., `source.mdp`)
- **Provider classes**: `Xxx{Feature}Provider` (e.g., `MdpCompletionProvider`)

### TextMate Grammar Rules
- **Oniguruma regex syntax** (not JavaScript regex)
- **Match priority**: Most specific patterns first
- **Captures**: Use numbered groups with `name` keys for scope assignment
- Example scope structure: `keyword.control.{category}.mdp`

### Changelog Updates
Per [.cursor/rules/changelog.mdc](.cursor/rules/changelog.mdc): **Always update [CHANGELOG.md](CHANGELOG.md)** when making changes. Categories: 新增 (Added), 优化 (Optimized), 修复 (Fixed).

### Version Management
Follows SemVer. Use [build.sh](build.sh) or [build.bat](build.bat) for interactive version bumping + VSIX packaging.

## Common Tasks

**Adding a new MDP parameter**:
1. Add to `MDP_PARAMETERS` in [src/constants/mdpParameters.ts](src/constants/mdpParameters.ts)
2. Assign a `category` (determines color)
3. Update completion/hover providers (automatically use constant)
4. Add diagnostic validation rules if needed

**Creating new language support**:
1. Add grammar to `syntaxes/xxx/xxx.tmLanguage.json`
2. Add language configuration to `syntaxes/xxx/xxx-language-configuration.json`
3. Register in [package.json](package.json) `languages` and `grammars`
4. Create `src/languages/xxx/index.ts` with LanguageSupport class
5. Activate in [src/extension.ts](src/extension.ts)

**Modifying semantic token colors**:
- Colors defined in [package.json](package.json) `configuration.properties` as `gromacsHelper.colors.*`
- Applied via ColorManager or via `semanticTokenScopes` mapping
- Users can override in settings

**Testing new features**:
- Add tests to [src/test/](src/test/)
- Use fixtures in [src/test/fixtures/](src/test/fixtures/)
- Run with `npm test` or "Extension Tests" launch config

## Dependencies & Tools

- **Webpack**: Bundles extension code (not tree-shaken - all code included)
- **TypeScript**: Strict mode enabled, target ES2022, Node16 modules
- **VS Code API**: Minimum version 1.60.0
- **Three.js**: Used in Packmol webview (loaded via CDN in HTML)
- **Chart.js**: Used in XVG preview webview

## Known Architectural Decisions

1. **Why two highlighting systems?** TextMate provides fast static highlighting; semantic tokens add context-aware coloring (e.g., residue-specific colors) that can't be achieved with regex alone.

2. **Why global storage for snippets?** Allows users to customize snippets without modifying workspace files or extension installation.

3. **Why both Panel and WebviewView for Packmol?** Panel for dedicated preview window, View for always-visible sidebar preview.

4. **Why category-based MDP parameter coloring?** Helps users visually identify parameter types in complex configuration files (14+ categories).

## Documentation Links

- Main README: [README.md](README.md)
- Build Guide: [BUILD_GUIDE.md](BUILD_GUIDE.md)
- Custom Snippets: [CUSTOM_SNIPPETS_GUIDE.md](CUSTOM_SNIPPETS_GUIDE.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

---

**When making changes**: Always test with `npm run watch` + "Run Extension" launch config. Update CHANGELOG.md. Follow existing naming patterns. Ensure all disposables are added to `context.subscriptions`.
