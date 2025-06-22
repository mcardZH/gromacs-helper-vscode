# GROMACS Helper for VS Code

[![Version](https://img.shields.io/vscode-marketplace/v/mcardzh.gromacs-helper-vscode.svg?style=flat-square&label=vscode%20marketplace)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Installs](https://img.shields.io/vscode-marketplace/i/mcardzh.gromacs-helper-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Rating](https://img.shields.io/vscode-marketplace/r/mcardzh.gromacs-helper-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=mcardzh.gromacs-helper-vscode)
[![Build Status](https://img.shields.io/github/actions/workflow/status/mcardzh/gromacs-helper-vscode/build-and-release.yml?branch=master&style=flat-square&label=build)](https://github.com/mcardzh/gromacs-helper-vscode/actions)
[![License](https://img.shields.io/github/license/mcardzh/gromacs-helper-vscode.svg?style=flat-square)](https://github.com/mcardzh/gromacs-helper-vscode/blob/main/LICENSE)

A comprehensive VS Code extension providing full support for GROMACS molecular dynamics simulation files. Supports `.mdp`, `.top`, `.itp`, `.gro`, `.ndx`, `.pdb` and other GROMACS file formats with syntax highlighting, intelligent completion, parameter hints, error checking and more.

> [中文文档](README_ZH.md) | [English Documentation](README.md)

## ✨ Key Features

### 🎨 Syntax Highlighting
- **MDP Files** (`.mdp`) - Molecular Dynamics Parameter files
- **TOP Files** (`.top`, `.itp`) - Topology structure files
- **GRO Files** (`.gro`, `.pdb`) - Structure coordinate files
- **NDX Files** (`.ndx`) - Index group files

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

### 📝 Code Snippets
- Common MDP configuration templates
- One-click generation of standard simulation workflow configurations
- **🆕 Custom Snippet Management** - Create, edit, and manage personalized MDP snippets
  - Add custom snippets with intelligent placeholders
  - Edit snippet content, prefix, and descriptions
  - Quick insertion from sidebar view or auto-completion
  - Built-in snippet manager with visual interface

### 🎯 Error Checking
- Parameter syntax validation
- Value range checking
- Format error notifications

## 🚀 Supported File Formats

| File Type | Extensions | Description | Feature Support |
|-----------|------------|-------------|----------------|
| MDP | `.mdp` | Molecular Dynamics Parameter files | Syntax highlighting, intelligent completion, hover hints, error checking |
| Topology | `.top`, `.itp` | Topology structure files | Syntax highlighting, symbol navigation, code folding |
| Structure | `.gro`, `.pdb` | Structure coordinate files | Syntax highlighting, symbol navigation |
| Index | `.ndx` | Index group files | Syntax highlighting, symbol navigation, code folding |
| XVG Data | `.xvg` | GROMACS plotting data files | Syntax highlighting, interactive chart preview, data analysis |

## 📦 Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` to open the Extensions panel
3. Search for "GROMACS Helper"
4. Click Install

Or install directly from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=gromacs-helper-vscode).

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

### [0.0.6] - 2025-06-23

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
