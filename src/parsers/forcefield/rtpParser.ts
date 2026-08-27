import * as vscode from 'vscode';
import {
  ResidueTopology,
  ResidueAtom,
  BondDefinition,
  ImproperDefinition,
  CmapDefinition,
} from '../../types/forcefield';
import { ParserUtils, Section } from './common';

/**
 * RtpParser - 解析 *.rtp 文件（残基拓扑模板）
 */
export class RtpParser {
  /**
   * 解析 .rtp 文件
   */
  public parse(document: vscode.TextDocument): Map<string, ResidueTopology> {
    console.log(`[RtpParser] 开始解析: ${document.uri.fsPath}`);
    const residues = new Map<string, ResidueTopology>();
    const sections = ParserUtils.splitIntoSections(document);

    let currentResidue: Partial<ResidueTopology> | null = null;

    for (const section of sections) {
      // 检查是否是残基定义（大写字母开头）
      if (section.name.match(/^[A-Z][A-Z0-9]+$/)) {
        // 完成前一个残基
        if (currentResidue && currentResidue.name) {
          residues.set(currentResidue.name, this.finalizeResidue(currentResidue));
        }

        // 开始新残基
        console.log(`[RtpParser]   发现残基: ${section.name}`);
        currentResidue = {
          name: section.name,
          atoms: [],
          bonds: [],
          impropers: [],
          cmaps: [],
          location: section.location,
        };
      } else if (currentResidue) {
        // 处理残基内的子段
        switch (section.name) {
          case 'atoms':
            currentResidue.atoms = this.parseAtoms(section, document);
            console.log(`[RtpParser]     - ${currentResidue.atoms!.length} 个原子`);
            break;
          case 'bonds':
            currentResidue.bonds = this.parseBonds(section, document);
            console.log(`[RtpParser]     - ${currentResidue.bonds!.length} 个键`);
            break;
          case 'impropers':
            currentResidue.impropers = this.parseImpropers(section, document);
            console.log(`[RtpParser]     - ${currentResidue.impropers!.length} 个impropers`);
            break;
          case 'cmap':
            currentResidue.cmaps = this.parseCmaps(section, document);
            console.log(`[RtpParser]     - ${currentResidue.cmaps!.length} 个cmaps`);
            break;
        }
      }
    }

    // 完成最后一个残基
    if (currentResidue && currentResidue.name) {
      residues.set(currentResidue.name, this.finalizeResidue(currentResidue));
    }

    console.log(`[RtpParser] 解析完成，共 ${residues.size} 个残基`);
    return residues;
  }

  /**
   * 解析 [ atoms ] 段
   * 格式：atom_name  atom_type  charge  charge_group
   */
  private parseAtoms(section: Section, document: vscode.TextDocument): ResidueAtom[] {
    const atoms: ResidueAtom[] = [];

    for (const line of section.lines) {
      const match = line.text.match(/^(\S+)\s+(\S+)\s+([-+]?\d+\.\d+)\s+(\d+)/);
      if (match) {
        const [, name, type, chargeStr, chargeGroupStr] = match;
        atoms.push({
          name,
          type,
          charge: parseFloat(chargeStr),
          chargeGroup: parseInt(chargeGroupStr, 10),
          location: line.location,
        });
      }
    }

    return atoms;
  }

  /**
   * 解析 [ bonds ] 段
   * 格式：atom1  atom2  [atom3...]
   */
  private parseBonds(section: Section, document: vscode.TextDocument): BondDefinition[] {
    const bonds: BondDefinition[] = [];

    for (const line of section.lines) {
      const atoms = line.text.trim().split(/\s+/).filter(a => a);
      if (atoms.length >= 2) {
        bonds.push({
          atoms,
          location: line.location,
        });
      }
    }

    return bonds;
  }

  /**
   * 解析 [ impropers ] 段
   * 格式：atom1  atom2  atom3  atom4
   */
  private parseImpropers(section: Section, document: vscode.TextDocument): ImproperDefinition[] {
    const impropers: ImproperDefinition[] = [];

    for (const line of section.lines) {
      const atoms = line.text.trim().split(/\s+/).filter(a => a);
      if (atoms.length >= 4) {
        impropers.push({
          atoms: [atoms[0], atoms[1], atoms[2], atoms[3]],
          location: line.location,
        });
      }
    }

    return impropers;
  }

  /**
   * 解析 [ cmap ] 段
   * 格式：atom1  atom2  atom3  atom4  atom5
   */
  private parseCmaps(section: Section, document: vscode.TextDocument): CmapDefinition[] {
    const cmaps: CmapDefinition[] = [];

    for (const line of section.lines) {
      const atoms = line.text.trim().split(/\s+/).filter(a => a);
      if (atoms.length >= 5) {
        cmaps.push({
          atoms: [atoms[0], atoms[1], atoms[2], atoms[3], atoms[4]],
          location: line.location,
        });
      }
    }

    return cmaps;
  }

  /**
   * 完成残基定义（填充默认值）
   */
  private finalizeResidue(residue: Partial<ResidueTopology>): ResidueTopology {
    return {
      name: residue.name!,
      atoms: residue.atoms || [],
      bonds: residue.bonds || [],
      impropers: residue.impropers || [],
      cmaps: residue.cmaps || [],
      location: residue.location!,
    };
  }
}
