# GROMACS Helper for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/mcardzh.gromacs-helper-vscode.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Installs](https://img.shields.io/vscode-marketplace/i/mcardzh.gromacs-helper-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Rating](https://img.shields.io/vscode-marketplace/r/mcardzh.gromacs-helper-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Build Status](https://img.shields.io/github/actions/workflow/status/mcardzh/gromacs-helper-vscode/build-and-release.yml?branch=master&style=flat-square&label=build)](https://github.com/mcardzh/gromacs-helper-vscode/actions)
[![License](https://img.shields.io/github/license/mcardzh/gromacs-helper-vscode.svg?style=flat-square)](https://github.com/mcardzh/gromacs-helper-vscode/blob/main/LICENSE)

A comprehensive VS Code extension providing full support for GROMACS molecular dynamics simulation files. Supports `.mdp`, `.top`, `.itp`, `.gro`, `.ndx`, `.pdb`, `.pka` and other GROMACS file formats with syntax highlighting, intelligent completion, parameter hints, error checking and more.

> [中文文档](README_ZH.md) | [English Documentation](README.md)

## ✨ Key Features

### 🎨 Syntax Highlighting
- **MDP Files** (`.mdp`) - Molecular Dynamics Parameter files with semantic coloring for different parameters
- **TOP Files** (`.top`, `.itp`) - Topology structure files  
- **STRUCTURE Files** (`.gro`, `.pdb`) - Structure coordinate files with semantic coloring for different residues
- **NDX Files** (`.ndx`) - Index group files
- **PKA Files** (`.pka`) - PROPKA pKa prediction result files with comprehensive analysis support
- **Packmol Files** (`.packmol`, `.inp`) - Packmol input files with syntax highlighting and structure preview
- **Trajectory Files** (`.xtc`, `.trr`) - GROMACS trajectory files with Mol* 3D viewer and streaming support

### 💡 Intelligent Completion
- Auto-completion for MDP parameters, including all GROMACS 2025.2 supported parameters
- Quick template insertion (energy minimization, NVT, NPT, MD, etc.)
- Smart parameter value suggestions

### 📖 Hover Documentation
- Detailed MDP parameter descriptions
- Parameter types, units, valid value ranges
- Default values and usage recommendations

### 🔍 Symbol Navigation
- Document outline view
- Quick jump to specific parameters
- Code folding support

### 🧮 Unit Converter
- **Professional Unit Conversion Calculator** - Designed specifically for molecular dynamics simulations
  - Length units: nm, Å, pm, m, cm, mm
  - Time units: fs, ps, ns, μs, ms, s
  - Temperature units: K, °C (including temperature offset conversion)
  - Energy units: J, kJ/mol, kJ/kg, J/g, eV, cal, kcal/mol
  - Area units: nm², Å², m², cm²
  - Electric potential units: V, mV, kV
  - Common conversion reference tables and quick conversion buttons
  - Modern WebView interface with VS Code theme support
  - Access via Command Palette: "GROMACS Helper: Open Unit Converter"

### 📝 Code Snippets
- Common MDP configuration templates
- One-click generation of standard simulation workflow configurations
- **🆕 Custom Snippet Management** - Create, edit, and manage personalized MDP snippets
  - Add custom snippets with intelligent placeholders
  - Edit snippet content, prefix, and descriptions
  - Quick insertion from sidebar view or auto-completion
  - Built-in snippet manager with visual interface

### 🎯 GROMACS Commands View
- **Visual Command Management** - Manage and execute GROMACS commands from the sidebar
  - 📂 **Grouped Organization**: Commands organized by category (Structure Preparation, Simulation, Analysis, etc.)
  - 🔍 **Smart Placeholders**:
    - `{pdb|gro}` - Auto-search and select .pdb or .gro files in workspace
    - `{output.gro}` - Prompt for output filename
    - `{basename}` - Prompt for base name (without extension)
  - 📁 **Relative Paths**: File selection automatically uses relative paths to avoid path errors
  - 💻 **Terminal Execution**: Commands automatically sent to dedicated "GROMACS" terminal
  - ✏️ **Custom Commands**: Add, edit, delete custom commands and command groups
  - 🚀 **Quick Execution**: Click commands or use inline buttons for fast execution
  - 📋 **Built-in Templates**: Pre-configured common commands (pdb2gmx, editconf, solvate, grompp, mdrun, energy, rms, etc.)

### 🎯 Error Checking
- Parameter syntax validation for MDP files
- Value range checking with enhanced validation
- Format error notifications
- PDB file key marker analysis

## 🚀 Supported File Formats

| File Type | Extensions | Description | Feature Support |
|-----------|------------|-------------|----------------|
| MDP | `.mdp` | Molecular Dynamics Parameter files | Syntax highlighting, intelligent completion, hover hints, error checking, semantic coloring |
| Topology | `.top`, `.itp` | Topology structure files | Syntax highlighting, symbol navigation, code folding |
| Structure | `.gro`, `.pdb` | Structure coordinate files | Syntax highlighting, symbol navigation, semantic coloring for residues |
| Index | `.ndx` | Index group files | Syntax highlighting, symbol navigation, code folding |
| XVG Data | `.xvg` | GROMACS plotting data files | Syntax highlighting, interactive chart preview, data analysis |
| PKA Results | `.pka` | PROPKA pKa prediction files | Syntax highlighting, hover hints, symbol navigation, code folding |
| Packmol | `.packmol`, `.inp` | Packmol input files | Syntax highlighting, structure preview, formatting, completion |
| Trajectory | `.xtc`, `.trr` | GROMACS trajectory files | Mol* 3D viewer, streaming loading, multi-frame playback |

## 📦 Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` to open the Extensions panel
3. Search for "GROMACS Helper"
4. Click Install

Or install directly from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode).

## 🎮 Usage

### MDP File Editing
1. Create or open an `.mdp` file
2. Type parameter names and the extension will automatically provide completion suggestions
3. Hover over parameters to see detailed descriptions
4. Use code snippets to quickly insert templates

**Example:**
```mdp
; Energy minimization parameters
integrator = steep
emtol = 1000.0
emstep = 0.01
nsteps = 50000

; Output control
nstxout = 0
nstvout = 0
nstenergy = 100
nstlog = 100
```

### Using Code Snippets
- Type `em` + Tab - Insert energy minimization template
- Type `nvt` + Tab - Insert NVT equilibration template
- Type `md` + Tab - Insert production MD template

### 🆕 Custom MDP Snippets
- **Manage Snippets**: Press `Ctrl+Shift+P` and search "Manage MDP Snippets"
- **Create Custom Templates**: Add your own MDP configuration templates with placeholders
- **Quick Access**: View and insert snippets from the "MDP Snippets" panel in Explorer
- **Smart Editing**: Use VS Code snippet syntax with `${1:default}` and `${1|option1,option2|}`

**Creating a Custom Snippet:**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Search for "Manage MDP Snippets"
3. Select "Add New Snippet"
4. Fill in name, prefix, and description
5. Edit content in the MDP editor with syntax highlighting
6. Save and use with auto-completion

See [Custom Snippets Guide](CUSTOM_SNIPPETS_GUIDE.md) for detailed usage instructions.

### TOP/ITP File Support
- Automatically recognize molecule types, atom types, bonding parameters, etc.
- Provide document outline and symbol navigation
- Support code folding

### GRO File Support
- Structured display of atomic coordinates
- Symbol navigation for quick positioning
- Syntax highlighting to distinguish different fields

### NDX File Support
- Index group syntax highlighting
- Code folding support
- Group name hover hints

### XVG File Preview
- **Interactive Chart Visualization**: Click the chart icon (📊) in the title bar or right-click on an XVG file and select "Preview XVG Chart"
- **Real-time Data Analysis**: View statistical information including data points count, value ranges, and averages
- **Multi-series Support**: Automatically detect and display multiple data series with different colors
- **Responsive Charts**: Zoom, pan, and hover over data points for detailed values
- **GROMACS Metadata Support**: Automatically parse title, axis labels, and legend information from XVG files

**Supported XVG Features:**
- Energy plots (potential, kinetic, total energy)
- Temperature and pressure data
- RMSD and distance measurements
- Custom analysis output from GROMACS tools

**Usage:**
1. Open any `.xvg` file in VS Code
2. Click the chart icon (📊) in the editor title bar
3. View the interactive plot in a side panel
4. Hover over data points to see exact values

### Packmol File Support
- **Structure Input File Editing**: Full support for Packmol input files with syntax highlighting
- **Interactive Structure Preview**: Click the preview icon to visualize molecular arrangements
- **Intelligent Code Completion**: Auto-completion for Packmol keywords and parameters
- **Automatic Formatting**: Format Packmol files with proper indentation and structure
- **Error Detection**: Real-time validation of Packmol syntax and parameters

**Features:**
- Syntax highlighting for keywords, structures, and constraints
- Document outline for quick navigation between sections
- Code folding for better organization of complex input files
- Hover hints for parameter explanations

### PKA File Support
- **PROPKA Results Analysis**: Complete support for PROPKA pKa prediction output files
- **Intelligent Parsing**: Automatic recognition of different sections (header, residue table, summary, energy analysis)
- **Smart Hover Information**: Detailed explanations for residue types, pKa values, interaction contributions
- **Symbol Navigation**: Quick jump to specific residues, analysis sections, and key findings
- **Code Folding**: Organize complex pKa files by folding sections (header, references, residue entries, summary)

**Features:**
- Syntax highlighting for residue names, pKa values, interaction data, and section headers
- Document outline for quick navigation between analysis sections
- Hover hints explaining residue properties, pKa significance, and interaction types
- Code folding for better organization of complex PROPKA output files

### Unit Converter Tool
- **Access**: Press `Ctrl+Shift+P` and search "GROMACS Helper: Open Unit Converter"
- **Professional Calculator**: Designed specifically for molecular dynamics simulations
- **Multiple Unit Categories**: Length, time, temperature, energy, area, and electric potential
- **Quick Conversions**: Common reference tables and one-click conversion buttons
- **Modern Interface**: WebView panel that adapts to your VS Code theme

### 🎬 Mol* Trajectory Viewer
- **3D Molecular Visualization**: Preview XTC and TRR trajectory files directly in VS Code using the Mol* library
- **Streaming Trajectory Loading**: Efficiently load extra-large trajectory files with on-demand frame loading
  - Significantly reduced memory usage by loading frames as needed
  - Support for streaming remote trajectory files
  - Automatic frame indexing for fast frame navigation
  - Suitable for GB-level long-term simulation trajectories
- **Multi-Panel Support**: Open multiple Mol* viewers simultaneously, each managed independently by file path
- **State Persistence**: Viewer state is preserved across VS Code restarts

**Usage:**
1. Right-click on an `.xtc` or `.trr` file in the Explorer
2. Select "Open with Mol* Viewer"
3. Select or confirm the topology file (`.gro` or `.pdb`)
4. Use the playback controls to navigate through trajectory frames

## ⚙️ Configuration Options

The extension currently uses default configurations. More customization options will be added in future versions.

## 🔧 Development and Contributing

### Local Development
```bash
# Clone the repository
git clone https://github.com/mcardzh/gromacs-helper-vscode.git
cd gromacs-helper-vscode

# Install dependencies
npm install

# Compile project
npm run compile

# Start watch mode
npm run watch
```

### Building Extension Package
```bash
npm run package
```

## 📋 System Requirements

- Visual Studio Code version 1.101.0 or higher
- No other special dependencies

## 🐛 Known Issues

- Parsing performance for large TOP files needs optimization
- Limited support for complex nested #include directives

If you encounter issues, please report them in [GitHub Issues](https://github.com/mcardzh/gromacs-helper-vscode/issues).

## 🗂️ Changelog

### [0.4.0] - 2025-12-25

#### ✨ Added
- 🎬 **Mol* Trajectory Viewer** - New molecular trajectory visualization system
  - Support for previewing XTC and TRR trajectory files directly in VS Code
  - Integrated Mol* molecular visualization library for professional 3D rendering
  - Support for loading topology files (GRO, PDB) with trajectory files
  - **Streaming Trajectory Loader** - Efficiently load extra-large trajectory files
    - On-demand frame data loading to significantly reduce memory usage
    - Support for streaming remote trajectory files
    - Automatic frame indexing for fast frame navigation
    - Suitable for GB-level long-term simulation trajectories
  - Support for multiple Mol* viewers open simultaneously, independently managed by file path
  - Viewer state persistence, automatically restored after restart

#### 🔧 Improved
- Optimized Webpack build configuration with watch mode for better development experience

### [0.3.4] - 2025-12-24

#### ✨ Added
- 🎯 **GROMACS Commands View** - New command management and execution system
  - Added "GROMACS Commands" view container in Activity Bar
  - Support for grouped command management (Structure Preparation, Simulation, Analysis, etc.)
  - Smart placeholder system (`{pdb|gro}`, `{output.gro}`, `{basename}`)
  - File selection automatically uses relative paths
  - Commands automatically sent to dedicated "GROMACS" terminal
  - Support for adding, editing, deleting custom commands and command groups
  - Built-in common GROMACS command templates

### [0.3.3] - 2025-12-24

#### 🚀 Features & Fixes
- **Optimized TOP Parsing**: Significantly improved performance for large topology files (O(N) single-pass algorithm).
- **Fixed SSH Monitor**: Corrected the deployment path for the remote monitoring script.

### [0.3.2] - 2025-12-24

#### 🔧 Improvements
- Improved MDP formatting with smarter alignment and indentation.
- Added translations for MDP parameter hints.

### [0.3.0] - 2025-12-23

#### ✨ Added
- 🎉 **Smart Welcome and Update Notification System**
  - Automatic welcome notification on first install with links to language-specific README documentation
  - Automatic update notification on version updates with changelog access
  - Adaptive language support: automatically selects Chinese or English documentation based on VS Code locale
  - Smart deduplication: notifications only show once per version
  - Configurable disable option: "Don't show again" button available
  - Configuration setting: `gromacsHelper.disableWelcomeNotifications` for manual control
- 🔍 **GROMACS Process Monitor** - Real-time monitoring of GROMACS execution status in VS Code status bar
  - Local process monitoring: automatically detects local `gmx` processes (pgrep + lsof)
  - Remote SSH monitoring: connects to remote servers via SSH with automatic script deployment
  - Intelligent log parsing: automatically analyzes mdrun logs to extract remaining time, simulation time, current step, etc.
  - Multi-target management: unified configuration for local and remote monitoring targets with custom names
  - Merged display mode: multiple targets auto-rotate with configurable intervals (pauses on mouse hover)
  - Independent display mode: create dedicated status bar items for important targets
  - Error handling: displays error icon with detailed error messages on connection or parsing failures
  - Click interaction: local monitoring allows clicking status bar to open working directory
  - Flexible configuration: customizable refresh intervals, rotation intervals, SSH port/key settings, etc.
  - 10-second timeout control: prevents SSH connection blocking with automatic timeout handling
  - 🆕 **Default Local Monitoring Enabled**: works out-of-the-box, automatically monitors local GROMACS processes
  - 🆕 **Interactive Configuration Wizard**: quickly add and manage monitoring targets via Command Palette
    - "GROMACS Helper: Add GROMACS Monitor Target" - interactive wizard for adding new monitors
    - "GROMACS Helper: Manage GROMACS Monitor Targets" - manage existing monitoring targets

### [0.2.3] - 2025-08-11

#### ✨ Added
- **PROPKA pKa Results File Support** - Complete support for PROPKA program output files
  - Support for `.pka` file extension and filename pattern matching
  - Comprehensive syntax highlighting including residue types, pKa values, interaction data, section headers
  - Intelligent hover hints: residue information, parameter explanations, numerical value meanings
  - Document symbol navigation: quick jump to specific residues, summary sections, energy analysis
  - Code folding support: collapsible file header, references, residue tables, summary, energy and charge analysis sections
  - Code snippet templates: provides PROPKA header, residue entries, summary entries and other common templates
  - Full language support integration into the main extension system

#### 🔧 Improved
- Enhanced extension support for bioinformatics file formats
- Optimized language support system extensibility

### [0.2.0] - 2025-06-24

#### ✨ Added
- **Packmol File Support** - Complete support for Packmol input files
  - Syntax highlighting for keywords, structures, and constraints
  - Interactive structure preview with 3D visualization
  - Intelligent code completion for Packmol parameters
  - Automatic formatting and error detection
- **Enhanced Semantic Coloring** - Improved visual distinction for different elements
  - MDP parameters now have individual semantic coloring
  - GRO and PDB files support residue-specific coloring
  - Better visual organization for complex files
- **Advanced Error Checking** - Enhanced validation and diagnostics
  - Comprehensive MDP parameter syntax validation
  - Cross-parameter relationship validation
  - PDB file key marker analysis and validation
- 🧮 **Professional Unit Converter** - Specialized tool for molecular dynamics simulations
  - Support for length units: nm, Å, pm, m, cm, mm
  - Support for time units: fs, ps, ns, μs, ms, s
  - Support for temperature units: K, °C (including temperature offset conversion)
  - Support for energy units: J, kJ/mol, kJ/kg, J/g, eV, cal, kcal/mol
  - Support for area units: nm², Å², m², cm²
  - Support for electric potential units: V, mV, kV
  - Common conversion reference tables and quick conversion buttons
  - Modern WebView interface with VS Code theme support
  - Access via Command Palette: "GROMACS Helper: Open Unit Converter"

#### 🐛 Fixed
- Various bug fixes and stability improvements

### [0.1.2] - 2025-06-24

#### 🐛 Fixed
- Allow setting marker size to 0 when previewing XVG files

### [0.1.1] - 2025-06-24

#### 🐛 Fixed
- Fixed various incorrectly named links in the project

#### ✨ Added
- **Custom MDP Snippet Management** - Complete user-defined snippet functionality
  - Create custom MDP snippets with intelligent placeholder syntax (`${1:default}` and `${1|option1,option2|}`)
  - Full snippet editing capabilities: modify name, prefix, description, and content
  - Visual snippet management interface with add, delete, edit, and preview functions
  - "MDP Snippets" sidebar panel for easy access and quick insertion
  - Integration with auto-completion system with custom snippets prioritized
  - Command palette support via "Manage MDP Snippets" command
  - Context menu support: right-click in MDP files to manage snippets directly

#### 🔧 Improved
- Enhanced MDP auto-completion with custom snippet prioritization
- Optimized snippet storage using VS Code global storage for cross-workspace availability
- Improved code snippet user experience and discoverability

### [0.0.5] - 2025-06-22

#### ✨ Added
- **XVG File Visualization Preview** - Interactive chart preview for GROMACS data files
  - Support for clicking chart icon to preview XVG data as line charts in sidebar
  - Automatic parsing of XVG file metadata (title, axis labels, legends, etc.)
  - Multi-data series support with different colors
  - Real-time data statistics display (data points count, value ranges, averages, etc.)
  - Support for chart zooming, panning, and hover to display specific values
- Added XVG file syntax highlighting support
- Added XVG file hover hint functionality
- Added XVG file code snippet templates
- Provided syntax highlighting support for `.pdb` files

#### 🔧 Changed
- Modified some file names for more standardized naming
- Optimized project structure for enhanced maintainability

### [0.0.4] - 2025-06-22

#### ✨ Added
- Added GitHub Actions workflow support for custom release notes
- Support for automatically reading version change information from CHANGELOG.md

#### 🔧 Improved
- Optimized build and release process

### [0.0.2] - 2025-06-22

#### ✨ Added
- Complete MDP file syntax highlighting support
- TOP file syntax highlighting and symbol navigation
- GRO file format support and hover hints
- NDX file syntax highlighting and folding functionality
- Intelligent code completion and parameter hints
- Code snippet support

#### 🔧 Improved
- Optimized syntax highlighting rules
- Improved hover hint information
- Enhanced symbol navigation functionality

#### 🐛 Fixed
- Fixed syntax parsing errors in certain situations
- Improved file format detection

### [0.0.1] - 2025-06-22

#### ✨ Added
- Initial version release
- Basic GROMACS file support
- MDP parameter syntax highlighting
- Basic code completion functionality

## 📚 Related Resources

- [GROMACS Official Documentation](https://manual.gromacs.org/)
- [GROMACS MDP Options Reference](https://manual.gromacs.org/current/user-guide/mdp-options.html)
- [Molecular Dynamics Simulation Tutorials](https://tutorials.gromacs.org/)

## 🤝 Contributing

Bug reports, feature requests, and code contributions are welcome!

## 📄 License

This project is open sourced under the GPLv2 license

## 👨‍💻 Author

- Project Maintainer: [mcardzh](https://github.com/mcardzh)

## 🙏 Acknowledgments

- Thanks to the GROMACS development team for providing excellent molecular dynamics simulation software
- Thanks to the VS Code team for providing a powerful editor platform

## 📞 Support

If this extension helps you, please give us a ⭐️!

Questions or suggestions? Please contact us through:
- [GitHub Issues](https://github.com/mcardzh/gromacs-helper-vscode/issues)
- [Email](mailto:mcardzh@gmail.com)

---

**Enjoy your GROMACS development experience!** 🧬⚗️
