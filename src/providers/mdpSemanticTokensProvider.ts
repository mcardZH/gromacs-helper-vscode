import * as vscode from 'vscode';
import { BaseSemanticTokensProvider, SemanticTokenTypes, SemanticTokenModifiers } from './baseSemanticTokensProvider';
import { getMdpParameter } from '../constants/mdpParameters';

/**
 * MDP 语义令牌提供器
 * 为 MDP 文件提供语义着色，不同分组的参数使用不同颜色但统一加粗
 * 注释严格按照注释颜色着色，参数值与参数名同色但不加粗
 */
export class MdpSemanticTokensProvider extends BaseSemanticTokensProvider {
    
    provideDocumentSemanticTokens(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.SemanticTokens> {
        this.resetBuilder();
        
        for (let i = 0; i < document.lineCount; i++) {
            if (token.isCancellationRequested) {
                return undefined;
            }
            
            const line = document.lineAt(i);
            const lineText = line.text;
            
            // 处理参数行（在注释之前处理，以便正确处理行内注释）
            const parameterProcessed = this.processParameterLine(lineText, i);
            
            // 处理注释（只处理不是参数行一部分的注释）
            if (!parameterProcessed) {
                this.processComments(lineText, i);
            }
        }
        
        return this.tokensBuilder.build();
    }
    
    /**
     * 处理注释
     */
    private processComments(lineText: string, lineNumber: number): void {
        const commentMatch = lineText.match(/;\s*(.*)/);
        if (commentMatch) {
            const commentStart = lineText.indexOf(';');
            this.addToken(
                lineNumber, 
                commentStart, 
                lineText.length - commentStart,
                SemanticTokenTypes.COMMENT
            );
        }
    }
    
    /**
     * 处理参数行
     * @returns true 如果这是一个参数行，false 否则
     */
    private processParameterLine(lineText: string, lineNumber: number): boolean {
        // 匹配参数行格式: parameter = value [; comment]
        const parameterMatch = lineText.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*([^;]*?)\s*(;.*)?$/);
        
        if (!parameterMatch) {
            return false;
        }
        
        const [, paramName, paramValue, comment] = parameterMatch;
        const parameter = getMdpParameter(paramName);
        
        // 获取参数名在行中的位置
        const paramNameStart = lineText.indexOf(paramName);
        
        // 为参数名着色（根据分类确定颜色，并加粗）
        const paramTokenType = this.getParameterTokenType(parameter?.category || 'other');
        this.addToken(
            lineNumber,
            paramNameStart,
            paramName.length,
            paramTokenType,
            [SemanticTokenModifiers.BOLD]
        );
        
        // 为参数值着色（与参数名同色但不加粗）
        if (paramValue.trim()) {
            const equalSignIndex = lineText.indexOf('=');
            const valueStart = lineText.substring(equalSignIndex + 1).search(/\S/);
            if (valueStart !== -1) {
                const actualValueStart = equalSignIndex + 1 + valueStart;
                // 计算从第一个非空白字符到参数值结束的长度
                const trimmedValue = paramValue.trim();
                const valueLength = trimmedValue.length;
                
                // 使用与参数名相同的令牌类型，但不加粗
                this.addToken(
                    lineNumber,
                    actualValueStart,
                    valueLength,
                    paramTokenType  // 使用与参数名相同的类型
                );
            }
        }
        
        // 处理行内注释
        if (comment) {
            const commentStart = lineText.indexOf(';');
            this.addToken(
                lineNumber,
                commentStart,
                comment.length,
                SemanticTokenTypes.COMMENT
            );
        }
        
        return true;
    }
    
    /**
     * 根据参数分类获取对应的语义令牌类型
     */
    private getParameterTokenType(category: string): string {
        const categoryMap: { [key: string]: string } = {
            'run-control': SemanticTokenTypes.MDP_PARAM_RUN_CONTROL,
            'output-control': SemanticTokenTypes.MDP_PARAM_OUTPUT_CONTROL,
            'neighbor-searching': SemanticTokenTypes.MDP_PARAM_NEIGHBOR_SEARCHING,
            'electrostatics': SemanticTokenTypes.MDP_PARAM_ELECTROSTATICS,
            'van-der-waals': SemanticTokenTypes.MDP_PARAM_VAN_DER_WAALS,
            'temperature-coupling': SemanticTokenTypes.MDP_PARAM_TEMPERATURE_COUPLING,
            'pressure-coupling': SemanticTokenTypes.MDP_PARAM_PRESSURE_COUPLING,
            'velocity-generation': SemanticTokenTypes.MDP_PARAM_VELOCITY_GENERATION,
            'bonds': SemanticTokenTypes.MDP_PARAM_BONDS,
            'energy-minimization': SemanticTokenTypes.MDP_PARAM_ENERGY_MINIMIZATION,
            'free-energy': SemanticTokenTypes.MDP_PARAM_FREE_ENERGY,
            'nonbonded': SemanticTokenTypes.MDP_PARAM_NONBONDED,
            'ewald': SemanticTokenTypes.MDP_PARAM_EWALD,
            'preprocessing': SemanticTokenTypes.MDP_PARAM_PREPROCESSING,
            'langevin-dynamics': SemanticTokenTypes.MDP_PARAM_RUN_CONTROL,
            'shell-molecular-dynamics': SemanticTokenTypes.MDP_PARAM_RUN_CONTROL,
            'test-particle-insertion': SemanticTokenTypes.MDP_PARAM_RUN_CONTROL,
            'simulated-annealing': SemanticTokenTypes.MDP_PARAM_TEMPERATURE_COUPLING,
            'tables': SemanticTokenTypes.MDP_PARAM_NONBONDED,
            'energy-group-exclusions': SemanticTokenTypes.MDP_PARAM_NONBONDED,
            'walls': SemanticTokenTypes.MDP_PARAM_NONBONDED,
            'swap': SemanticTokenTypes.MDP_PARAM_OTHER,
            'user-defined-thermo-libs': SemanticTokenTypes.MDP_PARAM_OTHER,
            'lambda-dynamics': SemanticTokenTypes.MDP_PARAM_FREE_ENERGY,
            'expanded-ensemble': SemanticTokenTypes.MDP_PARAM_FREE_ENERGY,
            'non-equilibrium': SemanticTokenTypes.MDP_PARAM_FREE_ENERGY,
            'electric-fields': SemanticTokenTypes.MDP_PARAM_ELECTROSTATICS,
            'rotational-enforcement': SemanticTokenTypes.MDP_PARAM_OTHER,
            'essential-dynamics': SemanticTokenTypes.MDP_PARAM_OTHER,
            'density-guided-simulation': SemanticTokenTypes.MDP_PARAM_OTHER,
            'qm-mm': SemanticTokenTypes.MDP_PARAM_OTHER,
            'computational-electrophysiology': SemanticTokenTypes.MDP_PARAM_OTHER,
            'freezing': SemanticTokenTypes.MDP_PARAM_OTHER,
            'cosine-acceleration': SemanticTokenTypes.MDP_PARAM_OTHER,
            'noe-restraints': SemanticTokenTypes.MDP_PARAM_OTHER,
            'free-energy-control': SemanticTokenTypes.MDP_PARAM_FREE_ENERGY
        };
        
        return categoryMap[category] || SemanticTokenTypes.MDP_PARAM_OTHER;
    }
}
