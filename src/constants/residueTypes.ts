/**
 * Standard amino acid residues and their properties
 */
export interface ResidueInfo {
    name: string;
    type: 'acidic' | 'basic' | 'polar' | 'nonpolar' | 'aromatic' | 'special' | 'nucleotide' | 'ion' | 'water' | 'other';
    threeLetterCode: string;
    oneLetterCode?: string;
    description: string;
}

/**
 * Standard amino acid residues
 */
export const AMINO_ACIDS: { [key: string]: ResidueInfo } = {
    // Nonpolar amino acids
    'ALA': { name: 'Alanine', type: 'nonpolar', threeLetterCode: 'ALA', oneLetterCode: 'A', description: 'Nonpolar, hydrophobic' },
    'VAL': { name: 'Valine', type: 'nonpolar', threeLetterCode: 'VAL', oneLetterCode: 'V', description: 'Nonpolar, hydrophobic' },
    'LEU': { name: 'Leucine', type: 'nonpolar', threeLetterCode: 'LEU', oneLetterCode: 'L', description: 'Nonpolar, hydrophobic' },
    'ILE': { name: 'Isoleucine', type: 'nonpolar', threeLetterCode: 'ILE', oneLetterCode: 'I', description: 'Nonpolar, hydrophobic' },
    'MET': { name: 'Methionine', type: 'nonpolar', threeLetterCode: 'MET', oneLetterCode: 'M', description: 'Nonpolar, hydrophobic' },
    'PHE': { name: 'Phenylalanine', type: 'aromatic', threeLetterCode: 'PHE', oneLetterCode: 'F', description: 'Aromatic, hydrophobic' },
    'TRP': { name: 'Tryptophan', type: 'aromatic', threeLetterCode: 'TRP', oneLetterCode: 'W', description: 'Aromatic, hydrophobic' },
    'PRO': { name: 'Proline', type: 'special', threeLetterCode: 'PRO', oneLetterCode: 'P', description: 'Cyclic, structural' },
    'GLY': { name: 'Glycine', type: 'special', threeLetterCode: 'GLY', oneLetterCode: 'G', description: 'Smallest, flexible' },
    
    // Polar amino acids
    'SER': { name: 'Serine', type: 'polar', threeLetterCode: 'SER', oneLetterCode: 'S', description: 'Polar, hydroxyl group' },
    'THR': { name: 'Threonine', type: 'polar', threeLetterCode: 'THR', oneLetterCode: 'T', description: 'Polar, hydroxyl group' },
    'CYS': { name: 'Cysteine', type: 'polar', threeLetterCode: 'CYS', oneLetterCode: 'C', description: 'Polar, disulfide bonds' },
    'TYR': { name: 'Tyrosine', type: 'aromatic', threeLetterCode: 'TYR', oneLetterCode: 'Y', description: 'Aromatic, polar' },
    'ASN': { name: 'Asparagine', type: 'polar', threeLetterCode: 'ASN', oneLetterCode: 'N', description: 'Polar, amide group' },
    'GLN': { name: 'Glutamine', type: 'polar', threeLetterCode: 'GLN', oneLetterCode: 'Q', description: 'Polar, amide group' },
    
    // Charged amino acids
    'ASP': { name: 'Aspartic acid', type: 'acidic', threeLetterCode: 'ASP', oneLetterCode: 'D', description: 'Negatively charged' },
    'GLU': { name: 'Glutamic acid', type: 'acidic', threeLetterCode: 'GLU', oneLetterCode: 'E', description: 'Negatively charged' },
    'LYS': { name: 'Lysine', type: 'basic', threeLetterCode: 'LYS', oneLetterCode: 'K', description: 'Positively charged' },
    'ARG': { name: 'Arginine', type: 'basic', threeLetterCode: 'ARG', oneLetterCode: 'R', description: 'Positively charged' },
    'HIS': { name: 'Histidine', type: 'basic', threeLetterCode: 'HIS', oneLetterCode: 'H', description: 'Positively charged at low pH' },
    
    // Alternate forms
    'HID': { name: 'Histidine (delta protonated)', type: 'basic', threeLetterCode: 'HID', description: 'Histidine delta protonated' },
    'HIE': { name: 'Histidine (epsilon protonated)', type: 'basic', threeLetterCode: 'HIE', description: 'Histidine epsilon protonated' },
    'HIP': { name: 'Histidine (doubly protonated)', type: 'basic', threeLetterCode: 'HIP', description: 'Histidine doubly protonated' },
    'CYX': { name: 'Cysteine (disulfide bonded)', type: 'polar', threeLetterCode: 'CYX', description: 'Cysteine in disulfide bond' },
    'CYM': { name: 'Cysteine (deprotonated)', type: 'polar', threeLetterCode: 'CYM', description: 'Deprotonated cysteine' },
};

/**
 * Nucleotide bases
 */
export const NUCLEOTIDES: { [key: string]: ResidueInfo } = {
    'DA': { name: 'Deoxyadenosine', type: 'nucleotide', threeLetterCode: 'DA', description: 'DNA adenine' },
    'DT': { name: 'Deoxythymidine', type: 'nucleotide', threeLetterCode: 'DT', description: 'DNA thymine' },
    'DG': { name: 'Deoxyguanosine', type: 'nucleotide', threeLetterCode: 'DG', description: 'DNA guanine' },
    'DC': { name: 'Deoxycytidine', type: 'nucleotide', threeLetterCode: 'DC', description: 'DNA cytosine' },
    'A': { name: 'Adenosine', type: 'nucleotide', threeLetterCode: 'A', description: 'RNA adenine' },
    'U': { name: 'Uridine', type: 'nucleotide', threeLetterCode: 'U', description: 'RNA uracil' },
    'G': { name: 'Guanosine', type: 'nucleotide', threeLetterCode: 'G', description: 'RNA guanine' },
    'C': { name: 'Cytidine', type: 'nucleotide', threeLetterCode: 'C', description: 'RNA cytosine' },
};

/**
 * Common ions and water
 */
export const COMMON_MOLECULES: { [key: string]: ResidueInfo } = {
    'SOL': { name: 'Water', type: 'water', threeLetterCode: 'SOL', description: 'Water molecule' },
    'WAT': { name: 'Water', type: 'water', threeLetterCode: 'WAT', description: 'Water molecule' },
    'HOH': { name: 'Water', type: 'water', threeLetterCode: 'HOH', description: 'Water molecule' },
    'NA': { name: 'Sodium', type: 'ion', threeLetterCode: 'NA', description: 'Sodium ion' },
    'CL': { name: 'Chloride', type: 'ion', threeLetterCode: 'CL', description: 'Chloride ion' },
    'K': { name: 'Potassium', type: 'ion', threeLetterCode: 'K', description: 'Potassium ion' },
    'MG': { name: 'Magnesium', type: 'ion', threeLetterCode: 'MG', description: 'Magnesium ion' },
    'CA': { name: 'Calcium', type: 'ion', threeLetterCode: 'CA', description: 'Calcium ion' },
    'ZN': { name: 'Zinc', type: 'ion', threeLetterCode: 'ZN', description: 'Zinc ion' },
};

/**
 * All known residues
 */
export const ALL_RESIDUES: { [key: string]: ResidueInfo } = {
    ...AMINO_ACIDS,
    ...NUCLEOTIDES,
    ...COMMON_MOLECULES
};

/**
 * Get residue info by three-letter code
 */
export function getResidueInfo(threeLetterCode: string): ResidueInfo | undefined {
    return ALL_RESIDUES[threeLetterCode.toUpperCase()];
}

/**
 * Get residue type by three-letter code
 */
export function getResidueType(threeLetterCode: string): string {
    const residue = getResidueInfo(threeLetterCode);
    return residue ? residue.type : 'other';
}

/**
 * Check if a string is a known residue
 */
export function isKnownResidue(threeLetterCode: string): boolean {
    return threeLetterCode.toUpperCase() in ALL_RESIDUES;
}

/**
 * Get all residues of a specific type
 */
export function getResiduesByType(type: ResidueInfo['type']): ResidueInfo[] {
    return Object.values(ALL_RESIDUES).filter(residue => residue.type === type);
}
