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

    // 新增：特殊REMARK记录的描述
    private remarkDescriptions: { [key: number]: string } = {
        465: '⚠️ MISSING RESIDUES - 指示结构中缺失的残基',
        470: '⚠️ ZERO OCCUPANCY - 零占有率原子',
        475: '⚠️ ZERO OCCUPANCY ATOM DETAILS - 零占有率原子详情',
        500: '🔍 GEOMETRY AND STEREOCHEMISTRY - 几何和立体化学问题',
        610: '❌ MISSING HETEROGENS - 缺失的杂原子或配体',
        620: '🔗 METAL COORDINATION - 金属配位问题',
        2: '📊 RESOLUTION - 实验分辨率信息',
        3: '📈 REFINEMENT - 结构精修统计信息'
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

        // 处理REMARK记录的特殊情况
        if (recordType === 'REMARK') {
            return this.handleRemarkHover(line, position, wordRange);
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

    private handleRemarkHover(line: string, position: vscode.Position, wordRange: vscode.Range): vscode.ProviderResult<vscode.Hover> {
        const remarkMatch = line.match(/^REMARK\s+(\d+)/);
        if (!remarkMatch) {
            return null;
        }

        const remarkNumber = parseInt(remarkMatch[1]);
        const markdown = new vscode.MarkdownString();

        // 通用REMARK信息
        if (this.remarkDescriptions[remarkNumber]) {
            markdown.appendMarkdown(`**REMARK ${remarkNumber}**\n\n`);
            markdown.appendMarkdown(this.remarkDescriptions[remarkNumber]);
        }

        // 具体的REMARK处理
        switch (remarkNumber) {
            case 465:
                return this.handleMissingResiduesRemark(line, markdown);
            case 2:
                return this.handleResolutionRemark(line, markdown);
            case 3:
                return this.handleRefinementRemark(line, markdown);
            case 500:
                return this.handleGeometryRemark(line, markdown);
            default:
                if (this.remarkDescriptions[remarkNumber]) {
                    return new vscode.Hover(markdown, wordRange);
                }
                return null;
        }
    }

    private handleMissingResiduesRemark(line: string, markdown: vscode.MarkdownString): vscode.ProviderResult<vscode.Hover> {
        markdown.appendMarkdown('\n\n**影响：**\n');
        markdown.appendMarkdown('- 缺失残基可能导致分子动力学模拟不稳定\n');
        markdown.appendMarkdown('- 建议在使用前修复或补全缺失残基\n');
        markdown.appendMarkdown('- 可以使用工具如MODELLER或SWISS-MODEL来预测缺失区域\n');

        // 检查是否是具体的缺失残基记录
        const missingResidueMatch = line.match(/REMARK\s+465\s+([A-Z]{3})\s+([A-Z])\s+(\d+)/);
        if (missingResidueMatch) {
            const [, resName, chainId, resNum] = missingResidueMatch;
            markdown.appendMarkdown(`\n\n**缺失残基详情：**\n`);
            markdown.appendMarkdown(`- 残基类型: ${resName}\n`);
            markdown.appendMarkdown(`- 链标识: ${chainId}\n`);
            markdown.appendMarkdown(`- 残基编号: ${resNum}\n`);
        }

        return new vscode.Hover(markdown);
    }

    private handleResolutionRemark(line: string, markdown: vscode.MarkdownString): vscode.ProviderResult<vscode.Hover> {
        const resolutionMatch = line.match(/RESOLUTION\.\s*([\d.]+)\s*ANGSTROMS/i);
        if (resolutionMatch) {
            const resolution = parseFloat(resolutionMatch[1]);
            markdown.appendMarkdown(`\n\n**分辨率: ${resolution}Å**\n\n`);
            
            if (resolution <= 1.5) {
                markdown.appendMarkdown('✅ **极高分辨率** - 结构质量非常好，适合精确分析\n');
            } else if (resolution <= 2.0) {
                markdown.appendMarkdown('✅ **高分辨率** - 结构质量很好\n');
            } else if (resolution <= 2.5) {
                markdown.appendMarkdown('⚡ **中等分辨率** - 结构质量可接受\n');
            } else if (resolution <= 3.0) {
                markdown.appendMarkdown('⚠️ **中低分辨率** - 可能影响细节准确性\n');
            } else {
                markdown.appendMarkdown('❌ **低分辨率** - 结构细节可能不够准确，使用时需谨慎\n');
            }
            
            markdown.appendMarkdown('\n**建议：**\n');
            markdown.appendMarkdown('- 高分辨率结构(≤2.0Å)适合药物设计和精确分析\n');
            markdown.appendMarkdown('- 低分辨率结构(>3.0Å)可能需要额外验证\n');
        }

        return new vscode.Hover(markdown);
    }

    private handleRefinementRemark(line: string, markdown: vscode.MarkdownString): vscode.ProviderResult<vscode.Hover> {
        // 处理R因子
        const rFactorMatch = line.match(/R\s+VALUE\s+\(WORKING\s+SET\)\s*:\s*([\d.]+)/i);
        if (rFactorMatch) {
            const rFactor = parseFloat(rFactorMatch[1]);
            markdown.appendMarkdown(`\n\n**R因子: ${rFactor}**\n\n`);
            
            if (rFactor <= 0.15) {
                markdown.appendMarkdown('✅ **优秀** - R因子很低，结构精度很高\n');
            } else if (rFactor <= 0.20) {
                markdown.appendMarkdown('✅ **良好** - R因子在可接受范围内\n');
            } else if (rFactor <= 0.25) {
                markdown.appendMarkdown('⚠️ **可接受** - R因子稍高，但仍可使用\n');
            } else {
                markdown.appendMarkdown('❌ **警告** - R因子过高，结构精度可能有问题\n');
            }
        }

        // 处理R-free
        const rFreeMatch = line.match(/R\s+VALUE\s+\(FREE\)\s*:\s*([\d.]+)/i);
        if (rFreeMatch) {
            const rFree = parseFloat(rFreeMatch[1]);
            markdown.appendMarkdown(`\n\n**R-free: ${rFree}**\n\n`);
            markdown.appendMarkdown('R-free是用于验证结构精修质量的独立指标\n');
        }

        return new vscode.Hover(markdown);
    }

    private handleGeometryRemark(line: string, markdown: vscode.MarkdownString): vscode.ProviderResult<vscode.Hover> {
        markdown.appendMarkdown('\n\n**几何质量检查：**\n');
        markdown.appendMarkdown('- 原子间距离和角度是否合理\n');
        markdown.appendMarkdown('- 立体化学冲突检测\n');
        markdown.appendMarkdown('- 键长和键角异常值报告\n');
        
        if (line.includes('CLOSE CONTACTS')) {
            markdown.appendMarkdown('\n**发现近距离接触：**\n');
            markdown.appendMarkdown('⚠️ 某些原子间距离过近，可能影响结构稳定性\n');
        }

        return new vscode.Hover(markdown);
    }
}
