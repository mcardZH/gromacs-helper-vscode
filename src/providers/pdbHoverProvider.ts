import * as vscode from 'vscode';

export class PdbHoverProvider implements vscode.HoverProvider {
    private recordDescriptions: { [key: string]: string } = {
        'HEADER': 'Contains the classification of the molecule(s), the deposition date, and the ID code.',
        'TITLE': 'Contains a description of the experiment or analysis that was performed.',
        'COMPND': 'Describes the macromolecular contents of the entry.',
        'SOURCE': 'Describes the source of the macromolecule.',
        'KEYWDS': 'Contains keywords describing the structure.',
        'EXPDTA': 'Identifies the experimental technique(s) used to determine the structure.',
        'AUTHOR': 'Contains the names of the people responsible for the deposition of the entry.',
        'REVDAT': 'Describes modification dates and revision history.',
        'JRNL': 'Contains the primary citation for the structure.',
        'REMARK': 'Contains comments about the entry and explains unusual features.',
        'DBREF': 'Contains cross-references to sequence databases.',
        'SEQRES': 'Contains the amino acid or nucleic acid sequence of residues.',
        'MODRES': 'Contains details about modifications to standard residues.',
        'HET': 'Contains the chemical formula for non-standard groups.',
        'HELIX': 'Identifies the position and type of helices in the structure.',
        'SHEET': 'Identifies the position and type of beta-sheets in the structure.',
        'SSBOND': 'Identifies disulfide bonds between cysteine residues.',
        'LINK': 'Specifies connectivity between residues that is not implied by the primary structure.',
        'CRYST1': 'Contains unit cell parameters and space group.',
        'ATOM': 'Contains atomic coordinate records for standard residues.',
        'HETATM': 'Contains atomic coordinate records for non-standard residues.',
        'TER': 'Indicates the end of a chain of residues.',
        'CONECT': 'Specifies connectivity between atoms.',
        'MODEL': 'Specifies the model serial number when multiple models are present.',
        'ENDMDL': 'Indicates the end of a model.',
        'END': 'Indicates the end of the PDB file.'
    };

    private atomFieldDescriptions: { [key: string]: string } = {
        'serial': 'Atom serial number (columns 7-11)',
        'name': 'Atom name (columns 13-16)',
        'altLoc': 'Alternate location indicator (column 17)',
        'resName': 'Residue name (columns 18-20)',
        'chainID': 'Chain identifier (column 22)',
        'resSeq': 'Residue sequence number (columns 23-26)',
        'iCode': 'Code for insertion of residues (column 27)',
        'x': 'Orthogonal coordinates for X in Angstroms (columns 31-38)',
        'y': 'Orthogonal coordinates for Y in Angstroms (columns 39-46)',
        'z': 'Orthogonal coordinates for Z in Angstroms (columns 47-54)',
        'occupancy': 'Occupancy (columns 55-60)',
        'tempFactor': 'Temperature factor (columns 61-66)',
        'element': 'Element symbol (columns 77-78)',
        'charge': 'Charge on the atom (columns 79-80)'
    };

    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
        const line = document.lineAt(position.line).text;
        const wordRange = document.getWordRangeAtPosition(position);
        
        if (!wordRange) {
            return null;
        }

        const word = document.getText(wordRange);
        const recordType = line.substring(0, 6).trim();

        // 如果悬停在记录类型上
        if (position.character < 6 && this.recordDescriptions[recordType]) {
            const markdown = new vscode.MarkdownString();
            markdown.appendMarkdown(`**${recordType}**\n\n`);
            markdown.appendMarkdown(this.recordDescriptions[recordType]);
            
            if (recordType === 'ATOM' || recordType === 'HETATM') {
                markdown.appendMarkdown('\n\n**Format:**\n');
                markdown.appendCodeblock(
                    'ATOM      1  N   ALA A   1      20.154   1.615  12.321  1.00 11.91           N',
                    'pdb'
                );
            }
            
            return new vscode.Hover(markdown, wordRange);
        }

        // 为ATOM/HETATM记录提供字段特定的悬停信息
        if (recordType === 'ATOM' || recordType === 'HETATM') {
            const col = position.character;
            let fieldInfo = '';
            
            if (col >= 6 && col <= 11) {
                fieldInfo = this.atomFieldDescriptions['serial'];
            } else if (col >= 12 && col <= 16) {
                fieldInfo = this.atomFieldDescriptions['name'];
            } else if (col === 16) {
                fieldInfo = this.atomFieldDescriptions['altLoc'];
            } else if (col >= 17 && col <= 19) {
                fieldInfo = this.atomFieldDescriptions['resName'];
            } else if (col === 21) {
                fieldInfo = this.atomFieldDescriptions['chainID'];
            } else if (col >= 22 && col <= 25) {
                fieldInfo = this.atomFieldDescriptions['resSeq'];
            } else if (col === 26) {
                fieldInfo = this.atomFieldDescriptions['iCode'];
            } else if (col >= 30 && col <= 37) {
                fieldInfo = this.atomFieldDescriptions['x'];
            } else if (col >= 38 && col <= 45) {
                fieldInfo = this.atomFieldDescriptions['y'];
            } else if (col >= 46 && col <= 53) {
                fieldInfo = this.atomFieldDescriptions['z'];
            } else if (col >= 54 && col <= 59) {
                fieldInfo = this.atomFieldDescriptions['occupancy'];
            } else if (col >= 60 && col <= 65) {
                fieldInfo = this.atomFieldDescriptions['tempFactor'];
            } else if (col >= 76 && col <= 77) {
                fieldInfo = this.atomFieldDescriptions['element'];
            } else if (col >= 78 && col <= 79) {
                fieldInfo = this.atomFieldDescriptions['charge'];
            }
            
            if (fieldInfo) {
                const markdown = new vscode.MarkdownString();
                markdown.appendMarkdown(`**${recordType} Field**\n\n`);
                markdown.appendMarkdown(fieldInfo);
                return new vscode.Hover(markdown, wordRange);
            }
        }

        return null;
    }
}
