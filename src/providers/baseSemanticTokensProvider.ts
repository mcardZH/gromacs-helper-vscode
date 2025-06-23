import * as vscode from 'vscode';

/**
 * Semantic token types for GROMACS files
 */
export const enum SemanticTokenTypes {
    // Residue types
    RESIDUE_ACIDIC = 'residue_acidic',
    RESIDUE_BASIC = 'residue_basic',
    RESIDUE_POLAR = 'residue_polar',
    RESIDUE_NONPOLAR = 'residue_nonpolar',
    RESIDUE_AROMATIC = 'residue_aromatic',
    RESIDUE_SPECIAL = 'residue_special',
    RESIDUE_NUCLEOTIDE = 'residue_nucleotide',
    RESIDUE_ION = 'residue_ion',
    RESIDUE_WATER = 'residue_water',
    RESIDUE_OTHER = 'residue_other',
    
    // Structure elements
    ATOM_NAME = 'atom_name',
    ATOM_INDEX = 'atom_index',
    COORDINATE = 'coordinate',
    CHAIN_ID = 'chain_id',
    
    // MDP Parameter categories
    MDP_PARAM_RUN_CONTROL = 'mdp_param_run_control',
    MDP_PARAM_OUTPUT_CONTROL = 'mdp_param_output_control',
    MDP_PARAM_NEIGHBOR_SEARCHING = 'mdp_param_neighbor_searching',
    MDP_PARAM_ELECTROSTATICS = 'mdp_param_electrostatics',
    MDP_PARAM_VAN_DER_WAALS = 'mdp_param_van_der_waals',
    MDP_PARAM_TEMPERATURE_COUPLING = 'mdp_param_temperature_coupling',
    MDP_PARAM_PRESSURE_COUPLING = 'mdp_param_pressure_coupling',
    MDP_PARAM_VELOCITY_GENERATION = 'mdp_param_velocity_generation',
    MDP_PARAM_BONDS = 'mdp_param_bonds',
    MDP_PARAM_ENERGY_MINIMIZATION = 'mdp_param_energy_minimization',
    MDP_PARAM_FREE_ENERGY = 'mdp_param_free_energy',
    MDP_PARAM_NONBONDED = 'mdp_param_nonbonded',
    MDP_PARAM_EWALD = 'mdp_param_ewald',
    MDP_PARAM_PREPROCESSING = 'mdp_param_preprocessing',
    MDP_PARAM_OTHER = 'mdp_param_other',
    
    // MDP Values
    MDP_VALUE = 'mdp_value',
    
    // General
    COMMENT = 'comment',
    NUMBER = 'number',
    KEYWORD = 'keyword'
}

/**
 * Semantic token modifiers
 */
export const enum SemanticTokenModifiers {
    HIGHLIGHTED = 'highlighted',
    DEPRECATED = 'deprecated',
    BOLD = 'bold'
}

/**
 * Legend for semantic tokens
 */
export const SEMANTIC_TOKENS_LEGEND = new vscode.SemanticTokensLegend(
    [
        // Residue types
        SemanticTokenTypes.RESIDUE_ACIDIC,
        SemanticTokenTypes.RESIDUE_BASIC,
        SemanticTokenTypes.RESIDUE_POLAR,
        SemanticTokenTypes.RESIDUE_NONPOLAR,
        SemanticTokenTypes.RESIDUE_AROMATIC,
        SemanticTokenTypes.RESIDUE_SPECIAL,
        SemanticTokenTypes.RESIDUE_NUCLEOTIDE,
        SemanticTokenTypes.RESIDUE_ION,
        SemanticTokenTypes.RESIDUE_WATER,
        SemanticTokenTypes.RESIDUE_OTHER,
        
        // Structure elements
        SemanticTokenTypes.ATOM_NAME,
        SemanticTokenTypes.ATOM_INDEX,
        SemanticTokenTypes.COORDINATE,
        SemanticTokenTypes.CHAIN_ID,
        
        // MDP Parameter categories
        SemanticTokenTypes.MDP_PARAM_RUN_CONTROL,
        SemanticTokenTypes.MDP_PARAM_OUTPUT_CONTROL,
        SemanticTokenTypes.MDP_PARAM_NEIGHBOR_SEARCHING,
        SemanticTokenTypes.MDP_PARAM_ELECTROSTATICS,
        SemanticTokenTypes.MDP_PARAM_VAN_DER_WAALS,
        SemanticTokenTypes.MDP_PARAM_TEMPERATURE_COUPLING,
        SemanticTokenTypes.MDP_PARAM_PRESSURE_COUPLING,
        SemanticTokenTypes.MDP_PARAM_VELOCITY_GENERATION,
        SemanticTokenTypes.MDP_PARAM_BONDS,
        SemanticTokenTypes.MDP_PARAM_ENERGY_MINIMIZATION,
        SemanticTokenTypes.MDP_PARAM_FREE_ENERGY,
        SemanticTokenTypes.MDP_PARAM_NONBONDED,
        SemanticTokenTypes.MDP_PARAM_EWALD,
        SemanticTokenTypes.MDP_PARAM_PREPROCESSING,
        SemanticTokenTypes.MDP_PARAM_OTHER,
        
        // MDP Values
        SemanticTokenTypes.MDP_VALUE,
        
        // General
        SemanticTokenTypes.COMMENT,
        SemanticTokenTypes.NUMBER,
        SemanticTokenTypes.KEYWORD
    ],
    [
        SemanticTokenModifiers.HIGHLIGHTED,
        SemanticTokenModifiers.DEPRECATED,
        SemanticTokenModifiers.BOLD
    ]
);

/**
 * Base class for semantic tokens providers
 */
export abstract class BaseSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    protected tokensBuilder: vscode.SemanticTokensBuilder;

    constructor() {
        this.tokensBuilder = new vscode.SemanticTokensBuilder(SEMANTIC_TOKENS_LEGEND);
    }

    abstract provideDocumentSemanticTokens(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.SemanticTokens>;

    /**
     * Helper method to add a token
     */
    protected addToken(
        line: number,
        startChar: number,
        length: number,
        tokenType: string,
        tokenModifiers?: string[]
    ): void {
        const tokenTypeIndex = this.getTokenTypeIndex(tokenType);
        const tokenModifiersMask = this.getTokenModifiersMask(tokenModifiers);
        this.tokensBuilder.push(line, startChar, length, tokenTypeIndex, tokenModifiersMask);
    }

    /**
     * Helper method to get token type index
     */
    protected getTokenTypeIndex(tokenType: string): number {
        return SEMANTIC_TOKENS_LEGEND.tokenTypes.indexOf(tokenType);
    }

    /**
     * Helper method to get token modifiers mask
     */
    protected getTokenModifiersMask(tokenModifiers?: string[]): number {
        if (!tokenModifiers || tokenModifiers.length === 0) {
            return 0;
        }
        
        let mask = 0;
        for (const modifier of tokenModifiers) {
            const index = SEMANTIC_TOKENS_LEGEND.tokenModifiers.indexOf(modifier);
            if (index !== -1) {
                mask |= (1 << index);
            }
        }
        return mask;
    }

    /**
     * Reset the tokens builder
     */
    protected resetBuilder(): void {
        this.tokensBuilder = new vscode.SemanticTokensBuilder(SEMANTIC_TOKENS_LEGEND);
    }
}
