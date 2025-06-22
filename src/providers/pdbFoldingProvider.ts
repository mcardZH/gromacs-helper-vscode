import * as vscode from 'vscode';

export class PdbFoldingProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(document: vscode.TextDocument): vscode.ProviderResult<vscode.FoldingRange[]> {
        const foldingRanges: vscode.FoldingRange[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        
        let modelStart: number | null = null;
        let remarkStart: number | null = null;
        let currentChain: string | null = null;
        let chainStart: number | null = null;
        let headerStart: number | null = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const recordType = line.substring(0, 6).trim();
            
            switch (recordType) {
                case 'HEADER':
                case 'TITLE':
                case 'COMPND':
                case 'SOURCE':
                case 'KEYWDS':
                case 'EXPDTA':
                case 'AUTHOR':
                case 'REVDAT':
                case 'JRNL':
                    if (headerStart === null) {
                        headerStart = i;
                    }
                    break;
                    
                case 'REMARK':
                    if (remarkStart === null) {
                        remarkStart = i;
                    }
                    break;
                    
                case 'MODEL':
                    // 结束之前的区域
                    if (headerStart !== null) {
                        foldingRanges.push(new vscode.FoldingRange(headerStart, i - 1, vscode.FoldingRangeKind.Region));
                        headerStart = null;
                    }
                    if (remarkStart !== null) {
                        foldingRanges.push(new vscode.FoldingRange(remarkStart, i - 1, vscode.FoldingRangeKind.Comment));
                        remarkStart = null;
                    }
                    if (chainStart !== null && currentChain !== null) {
                        foldingRanges.push(new vscode.FoldingRange(chainStart, i - 1, vscode.FoldingRangeKind.Region));
                        chainStart = null;
                        currentChain = null;
                    }
                    
                    modelStart = i;
                    break;
                    
                case 'ENDMDL':
                    if (modelStart !== null) {
                        foldingRanges.push(new vscode.FoldingRange(modelStart, i, vscode.FoldingRangeKind.Region));
                        modelStart = null;
                    }
                    if (chainStart !== null && currentChain !== null) {
                        foldingRanges.push(new vscode.FoldingRange(chainStart, i - 1, vscode.FoldingRangeKind.Region));
                        chainStart = null;
                        currentChain = null;
                    }
                    break;
                    
                case 'ATOM':
                case 'HETATM':
                    // 结束之前的区域
                    if (headerStart !== null) {
                        foldingRanges.push(new vscode.FoldingRange(headerStart, i - 1, vscode.FoldingRangeKind.Region));
                        headerStart = null;
                    }
                    if (remarkStart !== null) {
                        foldingRanges.push(new vscode.FoldingRange(remarkStart, i - 1, vscode.FoldingRangeKind.Comment));
                        remarkStart = null;
                    }
                    
                    if (line.length >= 22) {
                        const chainId = line.substring(21, 22).trim() || 'Unknown';
                        
                        if (currentChain !== chainId) {
                            // 结束前一个链
                            if (chainStart !== null && currentChain !== null) {
                                foldingRanges.push(new vscode.FoldingRange(chainStart, i - 1, vscode.FoldingRangeKind.Region));
                            }
                            
                            // 开始新链
                            currentChain = chainId;
                            chainStart = i;
                        }
                    }
                    break;
                    
                case 'TER':
                    if (chainStart !== null && currentChain !== null) {
                        foldingRanges.push(new vscode.FoldingRange(chainStart, i, vscode.FoldingRangeKind.Region));
                        chainStart = null;
                        currentChain = null;
                    }
                    break;
                    
                case 'CONECT':
                    // CONECT记录组
                    let connectStart = i;
                    while (i + 1 < lines.length && lines[i + 1].startsWith('CONECT')) {
                        i++;
                    }
                    if (i > connectStart) {
                        foldingRanges.push(new vscode.FoldingRange(connectStart, i, vscode.FoldingRangeKind.Region));
                    }
                    break;
                    
                default:
                    // 处理其他记录类型的连续组
                    if (recordType && i + 1 < lines.length) {
                        const nextRecordType = lines[i + 1].substring(0, 6).trim();
                        if (recordType === nextRecordType && !['ATOM', 'HETATM', 'TER'].includes(recordType)) {
                            let groupStart = i;
                            while (i + 1 < lines.length && lines[i + 1].substring(0, 6).trim() === recordType) {
                                i++;
                            }
                            if (i > groupStart) {
                                const kind = recordType === 'REMARK' ? vscode.FoldingRangeKind.Comment : vscode.FoldingRangeKind.Region;
                                foldingRanges.push(new vscode.FoldingRange(groupStart, i, kind));
                            }
                        }
                    }
                    break;
            }
        }
        
        // 处理文件末尾的未关闭区域
        if (headerStart !== null) {
            foldingRanges.push(new vscode.FoldingRange(headerStart, lines.length - 1, vscode.FoldingRangeKind.Region));
        }
        if (remarkStart !== null) {
            foldingRanges.push(new vscode.FoldingRange(remarkStart, lines.length - 1, vscode.FoldingRangeKind.Comment));
        }
        if (chainStart !== null && currentChain !== null) {
            foldingRanges.push(new vscode.FoldingRange(chainStart, lines.length - 1, vscode.FoldingRangeKind.Region));
        }
        if (modelStart !== null) {
            foldingRanges.push(new vscode.FoldingRange(modelStart, lines.length - 1, vscode.FoldingRangeKind.Region));
        }
        
        return foldingRanges;
    }
}
