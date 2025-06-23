import * as vscode from 'vscode';
import { getMdpParameter, MDP_PARAMETERS } from '../constants/mdpParameters';

export class MdpCodeActionProvider implements vscode.CodeActionProvider {
  
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    
    const actions: vscode.CodeAction[] = [];
    
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'mdp') {
        continue;
      }
      
      switch (diagnostic.code) {
        case 'unknown-parameter':
          actions.push(...this.createUnknownParameterActions(document, diagnostic));
          break;
        case 'invalid-enum-value':
          actions.push(...this.createInvalidEnumValueActions(document, diagnostic));
          break;
        case 'missing-equals':
          actions.push(this.createAddEqualsAction(document, diagnostic));
          break;
        case 'duplicate-parameter':
          actions.push(this.createRemoveDuplicateAction(document, diagnostic));
          break;
        case 'missing-required-parameter':
          actions.push(...this.createAddRequiredParameterActions(document, diagnostic));
          break;
        case 'invalid-format':
          actions.push(this.createFixFormatAction(document, diagnostic));
          break;
      }
    }
    
    return actions;
  }
  
  private createUnknownParameterActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const line = document.lineAt(diagnostic.range.start.line);
    const paramMatch = line.text.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)/);
    
    if (!paramMatch) {
      return actions;
    }
    
    const wrongParam = paramMatch[1];
    const suggestions = this.getSimilarParameterNames(wrongParam);
    
    for (const suggestion of suggestions) {
      const action = new vscode.CodeAction(
        `Replace with '${suggestion}'`,
        vscode.CodeActionKind.QuickFix
      );
      
      action.edit = new vscode.WorkspaceEdit();
      action.edit.replace(
        document.uri,
        diagnostic.range,
        suggestion
      );
      
      action.diagnostics = [diagnostic];
      actions.push(action);
    }
    
    // 添加删除整行的选项
    const deleteAction = new vscode.CodeAction(
      'Delete this line',
      vscode.CodeActionKind.QuickFix
    );
    
    deleteAction.edit = new vscode.WorkspaceEdit();
    deleteAction.edit.delete(
      document.uri,
      line.rangeIncludingLineBreak
    );
    
    deleteAction.diagnostics = [diagnostic];
    actions.push(deleteAction);
    
    return actions;
  }
  
  private createInvalidEnumValueActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const line = document.lineAt(diagnostic.range.start.line);
    const paramMatch = line.text.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*([^;]*?)\s*(;.*)?$/);
    
    if (!paramMatch) {
      return actions;
    }
    
    const paramName = paramMatch[1];
    const currentValue = paramMatch[2].trim();
    const parameter = getMdpParameter(paramName);
    
    if (!parameter || !parameter.validValues) {
      return actions;
    }
    
    // 提供相似的有效值
    const suggestions = this.getSimilarValues(currentValue, parameter.validValues);
    for (const suggestion of suggestions) {
      const action = new vscode.CodeAction(
        `Replace with '${suggestion}'`,
        vscode.CodeActionKind.QuickFix
      );
      
      action.edit = new vscode.WorkspaceEdit();
      action.edit.replace(
        document.uri,
        diagnostic.range,
        suggestion
      );
      
      action.diagnostics = [diagnostic];
      actions.push(action);
    }
    
    // 提供默认值
    if (parameter.defaultValue) {
      const defaultAction = new vscode.CodeAction(
        `Use default value '${parameter.defaultValue}'`,
        vscode.CodeActionKind.QuickFix
      );
      
      defaultAction.edit = new vscode.WorkspaceEdit();
      defaultAction.edit.replace(
        document.uri,
        diagnostic.range,
        parameter.defaultValue
      );
      
      defaultAction.diagnostics = [diagnostic];
      actions.push(defaultAction);
    }
    
    return actions;
  }
  
  private createAddEqualsAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Add missing "="',
      vscode.CodeActionKind.QuickFix
    );
    
    const line = document.lineAt(diagnostic.range.start.line);
    const paramMatch = line.text.match(/^\s*([a-zA-Z][a-zA-Z0-9_-]*)\s+(.*)$/);
    
    if (paramMatch) {
      const paramName = paramMatch[1];
      const value = paramMatch[2];
      const newText = `${paramName} = ${value}`;
      
      action.edit = new vscode.WorkspaceEdit();
      action.edit.replace(
        document.uri,
        line.range,
        line.text.replace(line.text.trim(), newText)
      );
    }
    
    action.diagnostics = [diagnostic];
    return action;
  }
  
  private createRemoveDuplicateAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Remove duplicate parameter',
      vscode.CodeActionKind.QuickFix
    );
    
    const line = document.lineAt(diagnostic.range.start.line);
    action.edit = new vscode.WorkspaceEdit();
    action.edit.delete(
      document.uri,
      line.rangeIncludingLineBreak
    );
    
    action.diagnostics = [diagnostic];
    return action;
  }
  
  private createAddRequiredParameterActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const message = diagnostic.message;
    const paramMatch = message.match(/Missing required parameter: (.+)/);
    
    if (!paramMatch) {
      return actions;
    }
    
    const paramName = paramMatch[1];
    const parameter = getMdpParameter(paramName);
    
    if (!parameter) {
      return actions;
    }
    
    const action = new vscode.CodeAction(
      `Add required parameter '${paramName}'`,
      vscode.CodeActionKind.QuickFix
    );
    
    const insertText = parameter.defaultValue
      ? `${paramName} = ${parameter.defaultValue}\n`
      : `${paramName} = \n`;
    
    action.edit = new vscode.WorkspaceEdit();
    action.edit.insert(
      document.uri,
      new vscode.Position(document.lineCount, 0),
      insertText
    );
    
    action.diagnostics = [diagnostic];
    actions.push(action);
    
    return actions;
  }
  
  private createFixFormatAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      'Comment out invalid line',
      vscode.CodeActionKind.QuickFix
    );
    
    const line = document.lineAt(diagnostic.range.start.line);
    const commentedLine = `; ${line.text.trim()}`;
    
    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(
      document.uri,
      line.range,
      line.text.replace(line.text.trim(), commentedLine)
    );
    
    action.diagnostics = [diagnostic];
    return action;
  }
  
  private getSimilarParameterNames(input: string): string[] {
    const allParams = MDP_PARAMETERS.map(p => p.name);
    const suggestions: string[] = [];
    
    for (const param of allParams) {
      const similarity = this.calculateSimilarity(input.toLowerCase(), param.toLowerCase());
      if (similarity > 0.6) {
        suggestions.push(param);
      }
    }
    
    return suggestions.slice(0, 3);
  }
  
  private getSimilarValues(input: string, validValues: string[]): string[] {
    const suggestions: string[] = [];
    const inputLower = input.toLowerCase();
    
    for (const value of validValues) {
      const similarity = this.calculateSimilarity(inputLower, value.toLowerCase());
      if (similarity > 0.6) {
        suggestions.push(value);
      }
    }
    
    return suggestions.slice(0, 3);
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private getEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}
