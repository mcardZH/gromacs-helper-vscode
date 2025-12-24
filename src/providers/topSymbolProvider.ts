import * as vscode from 'vscode';

export class TopSymbolProvider implements vscode.DocumentSymbolProvider {

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {

    const symbols: vscode.DocumentSymbol[] = [];
    // Using simple split for now; for massive files, one might consider line-by-line via document.lineAt
    // but document.getText() already allocates.
    const lines = document.getText().split('\n');

    let currentSection: vscode.DocumentSymbol | null = null;

    for (let i = 0; i < lines.length; i++) {
      // Allow cancellation to prevent freezing on extremely large files
      if (i % 1000 === 0 && token.isCancellationRequested) {
        return [];
      }

      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (trimmedLine === '' || trimmedLine.startsWith(';')) {
        continue;
      }

      // Check for Section Header [ name ]
      const sectionMatch = trimmedLine.match(/^\[\s*([^\]]+)\s*\]$/);
      if (sectionMatch) {
        // If there is an active section, close it (set its end range)
        if (currentSection) {
          const prevStart = currentSection.range.start;
          const prevEndLine = Math.max(prevStart.line, i - 1);
          currentSection.range = new vscode.Range(prevStart, new vscode.Position(prevEndLine, lines[prevEndLine].length));
        }

        const sectionName = sectionMatch[1].trim();
        const sectionRange = new vscode.Range(i, 0, i, line.length);

        // Create new section symbol
        currentSection = new vscode.DocumentSymbol(
          sectionName,
          '',
          vscode.SymbolKind.Namespace,
          sectionRange,
          sectionRange
        );

        symbols.push(currentSection);
        continue; // Done with this line
      }

      // Check for Preprocessor Directives
      const directiveMatch = trimmedLine.match(/^#(include|define|ifdef|ifndef|endif|else)\b(.*)$/);
      if (directiveMatch) {
        const directiveName = directiveMatch[1];
        const directiveValue = directiveMatch[2].trim();

        const directiveRange = new vscode.Range(i, 0, i, line.length);
        const directiveSymbol = new vscode.DocumentSymbol(
          `#${directiveName} ${directiveValue}`,
          'Preprocessor directive',
          vscode.SymbolKind.Constant,
          directiveRange,
          directiveRange
        );

        // Add to current section if exists, otherwise add to root
        if (currentSection) {
          currentSection.children.push(directiveSymbol);
        } else {
          symbols.push(directiveSymbol);
        }
        continue;
      }

      // Parse Line Content (if inside a section)
      if (currentSection) {
        this.parseLineContent(line, i, currentSection);
      }
    }

    // Close the last section
    if (currentSection) {
      const lastLineIndex = lines.length - 1;
      const prevStart = currentSection.range.start;
      currentSection.range = new vscode.Range(prevStart, new vscode.Position(lastLineIndex, lines[lastLineIndex].length));
    }

    return symbols;
  }

  private parseLineContent(
    line: string,
    lineNumber: number,
    parentSymbol: vscode.DocumentSymbol
  ): void {
    const sectionName = parentSymbol.name.toLowerCase();

    // Switch based on section type
    switch (sectionName) {
      case 'moleculetype':
        this.parseMoleculeType(line, lineNumber, parentSymbol);
        break;
      case 'atoms':
        this.parseAtoms(line, lineNumber, parentSymbol);
        break;
      case 'bonds':
      case 'angles':
      case 'dihedrals':
      case 'impropers':
      case 'pairs':
      case 'cmap':
        this.parseInteractions(line, lineNumber, parentSymbol, sectionName);
        break;
      case 'system':
        this.parseSystem(line, lineNumber, parentSymbol);
        break;
      case 'molecules':
        this.parseMolecules(line, lineNumber, parentSymbol);
        break;
      default:
        // Generic entry for unknown sections
        this.parseGenericEntry(line, lineNumber, parentSymbol);
        break;
    }
  }

  private parseMoleculeType(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol): void {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 1) {
      const moleculeName = parts[0];
      const nrexcl = parts[1] || '';

      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        moleculeName,
        nrexcl ? `nrexcl: ${nrexcl}` : '',
        vscode.SymbolKind.Class,
        range,
        range
      );

      parentSymbol.children.push(symbol);
    }
  }

  private parseAtoms(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol): void {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5) {
      const atomId = parts[0];
      const atomType = parts[1];
      const residueId = parts[2];
      const residueName = parts[3];
      const atomName = parts[4];
      const charge = parts[5] || '';
      const mass = parts[6] || '';

      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        `${atomName} (${atomId})`,
        `${residueName}${residueId} ${atomType} q=${charge} m=${mass}`,
        vscode.SymbolKind.Variable,
        range,
        range
      );

      parentSymbol.children.push(symbol);
    }
  }

  private parseInteractions(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol, type: string): void {
    const parts = line.trim().split(/\s+/);
    const atomCount = this.getInteractionAtomCount(type);

    if (parts.length >= atomCount) {
      const atomIndices = parts.slice(0, atomCount).join('-');
      const funcType = parts[atomCount] || '';

      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        atomIndices,
        `${type} func: ${funcType}`,
        vscode.SymbolKind.Method,
        range,
        range
      );

      parentSymbol.children.push(symbol);
    }
  }

  private getInteractionAtomCount(type: string): number {
    switch (type) {
      case 'bonds':
      case 'pairs':
        return 2;
      case 'angles':
        return 3;
      case 'dihedrals':
      case 'impropers':
        return 4;
      case 'cmap':
        return 5;
      default:
        return 2;
    }
  }

  private parseSystem(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol): void {
    const systemName = line.trim();
    if (systemName) {
      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        systemName,
        'System name',
        vscode.SymbolKind.String,
        range,
        range
      );

      parentSymbol.children.push(symbol);
    }
  }

  private parseMolecules(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol): void {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const moleculeName = parts[0];
      const count = parts[1];

      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        moleculeName,
        `Count: ${count}`,
        vscode.SymbolKind.Object,
        range,
        range
      );

      parentSymbol.children.push(symbol);
    }
  }

  private parseGenericEntry(line: string, lineNumber: number, parentSymbol: vscode.DocumentSymbol): void {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      const parts = trimmedLine.split(/\s+/);
      const firstPart = parts[0];
      const restParts = parts.slice(1).join(' ');

      const range = new vscode.Range(lineNumber, 0, lineNumber, line.length);
      const symbol = new vscode.DocumentSymbol(
        firstPart,
        restParts,
        vscode.SymbolKind.Property,
        range,
        range
      );

      parentSymbol.children.push(symbol);
    }
  }
}
