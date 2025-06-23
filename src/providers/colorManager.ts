import * as vscode from 'vscode';

export class ColorManager {
    private static instance: ColorManager;
    private readonly defaultColors = {
        // Residue colors
        residue_acidic: "#FF6B6B",
        residue_basic: "#4ECDC4",
        residue_polar: "#45B7D1",
        residue_nonpolar: "#96CEB4",
        residue_aromatic: "#FFEAA7",
        residue_special: "#DDA0DD",
        residue_nucleotide: "#74B9FF",
        residue_ion: "#FD79A8",
        residue_water: "#00CEC9",
        residue_other: "#B2BEC3",
        
        // Atom and coordinate colors
        atom_name: "#A29BFE",
        atom_index: "#6C5CE7",
        coordinate: "#00B894",
        chain_id: "#E17055",
        
        // MDP parameter colors
        mdp_param_run_control: "#E74C3C",
        mdp_param_output_control: "#3498DB",
        mdp_param_neighbor_searching: "#2ECC71",
        mdp_param_electrostatics: "#F39C12",
        mdp_param_van_der_waals: "#9B59B6",
        mdp_param_temperature_coupling: "#E67E22",
        mdp_param_pressure_coupling: "#1ABC9C",
        mdp_param_velocity_generation: "#34495E",
        mdp_param_bonds: "#16A085",
        mdp_param_energy_minimization: "#8E44AD",
        mdp_param_free_energy: "#C0392B",
        mdp_param_nonbonded: "#D35400",
        mdp_param_ewald: "#27AE60",
        mdp_param_preprocessing: "#2980B9",
        mdp_param_other: "#7F8C8D",
        mdp_value: "#A8D8B9",
        
        // General colors
        comment: "#5CB85C",
        number: "#00CEC9",
        keyword: "#FD79A8",
        
        // Packmol colors
        packmol_keyword: "#D63031",
        packmol_command: "#0984E3",
        packmol_constraint: "#00B894",
        packmol_geometry: "#E17055",
        packmol_number: "#A29BFE",
        packmol_filename: "#00CEC9",
        packmol_comment: "#636E72"
    };

    private readonly defaultBoldSettings = {
        // Residue bold settings
        residue_acidic_bold: false,
        residue_basic_bold: false,
        residue_polar_bold: false,
        residue_nonpolar_bold: false,
        residue_aromatic_bold: false,
        residue_special_bold: true,
        residue_nucleotide_bold: false,
        residue_ion_bold: true,
        residue_water_bold: false,
        residue_other_bold: false,
        
        // Atom and coordinate bold settings
        atom_name_bold: false,
        atom_index_bold: false,
        coordinate_bold: false,
        chain_id_bold: true,
        
        // Packmol bold settings
        packmol_keyword_bold: true,
        packmol_command_bold: true,
        packmol_constraint_bold: false,
        packmol_geometry_bold: false,
        packmol_number_bold: false,
        packmol_filename_bold: false,
        packmol_comment_bold: false
    };

    private constructor() {}

    public static getInstance(): ColorManager {
        if (!ColorManager.instance) {
            ColorManager.instance = new ColorManager();
        }
        return ColorManager.instance;
    }

    /**
     * 应用语言特定的颜色主题
     */
    public async applyLanguageSpecificColors(): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        const currentTokenColors = config.get('editor.tokenColorCustomizations') || {};
        
        // 为每种支持的语言创建特定的颜色规则
        const languageSpecificRules = {
            // GROMACS GRO 文件
            "textMateRules": [
                // Residue colors for GRO files
                {
                    "scope": "entity.name.type.residue.acidic.gro",
                    "settings": this.createStyleSettings('residue_acidic', 'residue_acidic_bold')
                },
                {
                    "scope": "entity.name.type.residue.basic.gro",
                    "settings": this.createStyleSettings('residue_basic', 'residue_basic_bold')
                },
                {
                    "scope": "entity.name.type.residue.polar.gro",
                    "settings": this.createStyleSettings('residue_polar', 'residue_polar_bold')
                },
                {
                    "scope": "entity.name.type.residue.nonpolar.gro",
                    "settings": this.createStyleSettings('residue_nonpolar', 'residue_nonpolar_bold')
                },
                {
                    "scope": "entity.name.type.residue.aromatic.gro",
                    "settings": this.createStyleSettings('residue_aromatic', 'residue_aromatic_bold')
                },
                {
                    "scope": "entity.name.type.residue.special.gro",
                    "settings": this.createStyleSettings('residue_special', 'residue_special_bold')
                },
                {
                    "scope": "entity.name.type.residue.nucleotide.gro",
                    "settings": this.createStyleSettings('residue_nucleotide', 'residue_nucleotide_bold')
                },
                {
                    "scope": "entity.name.type.residue.ion.gro",
                    "settings": this.createStyleSettings('residue_ion', 'residue_ion_bold')
                },
                {
                    "scope": "entity.name.type.residue.water.gro",
                    "settings": this.createStyleSettings('residue_water', 'residue_water_bold')
                },
                {
                    "scope": "entity.name.type.residue.other.gro",
                    "settings": this.createStyleSettings('residue_other', 'residue_other_bold')
                },
                {
                    "scope": "entity.name.function.atom.gro",
                    "settings": this.createStyleSettings('atom_name', 'atom_name_bold')
                },
                {
                    "scope": "constant.numeric.atom-index.gro",
                    "settings": this.createStyleSettings('atom_index', 'atom_index_bold')
                },
                {
                    "scope": "constant.numeric.coordinate.gro",
                    "settings": this.createStyleSettings('coordinate', 'coordinate_bold')
                },
                {
                    "scope": "entity.name.tag.chain.gro",
                    "settings": this.createStyleSettings('chain_id', 'chain_id_bold')
                },
                
                // PDB file colors - 为每种残基类型创建单独的规则
                {
                    "scope": "entity.name.type.residue.acidic.pdb",
                    "settings": { "foreground": this.getColor('residue_acidic') }
                },
                {
                    "scope": "entity.name.type.residue.basic.pdb",
                    "settings": { "foreground": this.getColor('residue_basic') }
                },
                {
                    "scope": "entity.name.type.residue.polar.pdb",
                    "settings": { "foreground": this.getColor('residue_polar') }
                },
                {
                    "scope": "entity.name.type.residue.nonpolar.pdb",
                    "settings": { "foreground": this.getColor('residue_nonpolar') }
                },
                {
                    "scope": "entity.name.type.residue.aromatic.pdb",
                    "settings": { "foreground": this.getColor('residue_aromatic') }
                },
                {
                    "scope": "entity.name.type.residue.special.pdb",
                    "settings": { "foreground": this.getColor('residue_special') }
                },
                {
                    "scope": "entity.name.type.residue.nucleotide.pdb",
                    "settings": { "foreground": this.getColor('residue_nucleotide') }
                },
                {
                    "scope": "entity.name.type.residue.ion.pdb",
                    "settings": { "foreground": this.getColor('residue_ion') }
                },
                {
                    "scope": "entity.name.type.residue.water.pdb",
                    "settings": { "foreground": this.getColor('residue_water') }
                },
                {
                    "scope": "entity.name.type.residue.other.pdb",
                    "settings": { "foreground": this.getColor('residue_other') }
                },
                {
                    "scope": "entity.name.function.atom.pdb",
                    "settings": { "foreground": this.getColor('atom_name') }
                },
                {
                    "scope": "constant.numeric.atom-index.pdb",
                    "settings": { "foreground": this.getColor('atom_index') }
                },
                {
                    "scope": "constant.numeric.coordinate.pdb",
                    "settings": { "foreground": this.getColor('coordinate') }
                },
                {
                    "scope": "entity.name.tag.chain.pdb",
                    "settings": { "foreground": this.getColor('chain_id') }
                },
                
                // TOP file colors
                {
                    "scope": "entity.name.type.residue.acidic.top",
                    "settings": { "foreground": this.getColor('residue_acidic') }
                },
                {
                    "scope": "entity.name.type.residue.basic.top",
                    "settings": { "foreground": this.getColor('residue_basic') }
                },
                {
                    "scope": "entity.name.type.residue.polar.top",
                    "settings": { "foreground": this.getColor('residue_polar') }
                },
                {
                    "scope": "entity.name.type.residue.nonpolar.top",
                    "settings": { "foreground": this.getColor('residue_nonpolar') }
                },
                {
                    "scope": "entity.name.type.residue.aromatic.top",
                    "settings": { "foreground": this.getColor('residue_aromatic') }
                },
                {
                    "scope": "entity.name.type.residue.special.top",
                    "settings": { "foreground": this.getColor('residue_special') }
                },
                {
                    "scope": "entity.name.type.residue.nucleotide.top",
                    "settings": { "foreground": this.getColor('residue_nucleotide') }
                },
                {
                    "scope": "entity.name.type.residue.ion.top",
                    "settings": { "foreground": this.getColor('residue_ion') }
                },
                {
                    "scope": "entity.name.type.residue.water.top",
                    "settings": { "foreground": this.getColor('residue_water') }
                },
                {
                    "scope": "entity.name.type.residue.other.top",
                    "settings": { "foreground": this.getColor('residue_other') }
                },
                
                // MDP file colors
                {
                    "scope": "keyword.control.run.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_run_control') }
                },
                {
                    "scope": "keyword.control.output.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_output_control') }
                },
                {
                    "scope": "keyword.control.neighbor.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_neighbor_searching') }
                },
                {
                    "scope": "keyword.control.electrostatics.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_electrostatics') }
                },
                {
                    "scope": "keyword.control.vdw.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_van_der_waals') }
                },
                {
                    "scope": "keyword.control.temperature.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_temperature_coupling') }
                },
                {
                    "scope": "keyword.control.pressure.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_pressure_coupling') }
                },
                {
                    "scope": "keyword.control.velocity.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_velocity_generation') }
                },
                {
                    "scope": "keyword.control.bonds.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_bonds') }
                },
                {
                    "scope": "keyword.control.minimization.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_energy_minimization') }
                },
                {
                    "scope": "keyword.control.freeenergy.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_free_energy') }
                },
                {
                    "scope": "keyword.control.nonbonded.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_nonbonded') }
                },
                {
                    "scope": "keyword.control.ewald.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_ewald') }
                },
                {
                    "scope": "keyword.control.preprocessing.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_preprocessing') }
                },
                {
                    "scope": "keyword.control.other.mdp",
                    "settings": { "foreground": this.getColor('mdp_param_other') }
                },
                {
                    "scope": "string.unquoted.value.mdp",
                    "settings": { "foreground": this.getColor('mdp_value') }
                },
                
                // NDX file colors
                {
                    "scope": "constant.numeric.atom-index.ndx",
                    "settings": { "foreground": this.getColor('atom_index') }
                },
                
                // XVG file colors
                {
                    "scope": "comment.line.xvg",
                    "settings": { "foreground": this.getColor('comment') }
                },
                {
                    "scope": "constant.numeric.xvg",
                    "settings": { "foreground": this.getColor('number') }
                },
                {
                    "scope": "keyword.control.xvg",
                    "settings": { "foreground": this.getColor('keyword') }
                },
                
                // Packmol file colors
                {
                    "scope": "keyword.control.packmol",
                    "settings": this.createStyleSettings('packmol_keyword', 'packmol_keyword_bold')
                },
                {
                    "scope": "entity.name.function.command.packmol",
                    "settings": this.createStyleSettings('packmol_command', 'packmol_command_bold')
                },
                {
                    "scope": "entity.name.function.constraint.packmol",
                    "settings": this.createStyleSettings('packmol_constraint', 'packmol_constraint_bold')
                },
                {
                    "scope": "entity.name.function.geometry.packmol",
                    "settings": this.createStyleSettings('packmol_geometry', 'packmol_geometry_bold')
                },
                {
                    "scope": "constant.numeric.packmol",
                    "settings": this.createStyleSettings('packmol_number', 'packmol_number_bold')
                },
                {
                    "scope": "string.quoted.double.filename.packmol",
                    "settings": this.createStyleSettings('packmol_filename', 'packmol_filename_bold')
                },
                {
                    "scope": "comment.line.hash.packmol",
                    "settings": this.createStyleSettings('packmol_comment', 'packmol_comment_bold')
                }
            ]
        };

        // 合并现有配置和新的语言特定规则
        const updatedTokenColors = {
            ...currentTokenColors,
            ...languageSpecificRules
        };

        // 应用配置
        await config.update(
            'editor.tokenColorCustomizations',
            updatedTokenColors,
            vscode.ConfigurationTarget.Global
        );
    }

    /**
     * 获取颜色值，优先从用户配置获取，否则使用默认值
     */
    private getColor(colorName: keyof typeof this.defaultColors): string {
        const config = vscode.workspace.getConfiguration('gromacsHelper.colors');
        const userColor = config.get<string>(colorName);
        
        // 验证用户提供的颜色是否为有效的HEX格式
        if (userColor && typeof userColor === 'string' && this.isValidHexColor(userColor)) {
            return userColor;
        }
        
        return this.defaultColors[colorName];
    }

    /**
     * 获取加粗设置
     */
    private getBoldSetting(boldKey: keyof typeof this.defaultBoldSettings): boolean {
        const config = vscode.workspace.getConfiguration('gromacsHelper.colors');
        const userBold = config.get<boolean>(boldKey);
        return userBold !== undefined && userBold !== null ? userBold : this.defaultBoldSettings[boldKey];
    }

    /**
     * 验证HEX颜色格式
     */
    private isValidHexColor(color: string): boolean {
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexColorRegex.test(color);
    }

    /**
     * 创建样式设置对象，包含颜色和字体粗细
     */
    private createStyleSettings(colorName: keyof typeof this.defaultColors, boldKey?: keyof typeof this.defaultBoldSettings): any {
        const settings: any = {
            foreground: this.getColor(colorName)
        };
        
        if (boldKey && this.getBoldSetting(boldKey)) {
            settings.fontStyle = "bold";
        }
        
        return settings;
    }

    /**
     * 设置特定颜色
     */
    public async setColor(colorName: keyof typeof this.defaultColors, color: string): Promise<void> {
        // 验证颜色格式
        if (!this.isValidHexColor(color)) {
            throw new Error(`Invalid hex color format: ${color}. Please use format #RRGGBB or #RGB`);
        }
        
        const config = vscode.workspace.getConfiguration();
        await config.update(
            `gromacsHelper.colors.${colorName}`,
            color,
            vscode.ConfigurationTarget.Global
        );
        
        // 重新应用颜色
        await this.applyLanguageSpecificColors();
    }

    /**
     * 设置特定颜色的加粗选项
     */
    public async setBoldSetting(boldKey: keyof typeof this.defaultBoldSettings, bold: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        await config.update(
            `gromacsHelper.colors.${boldKey}`,
            bold,
            vscode.ConfigurationTarget.Global
        );
        
        // 重新应用颜色
        await this.applyLanguageSpecificColors();
    }

    /**
     * 同时设置颜色和加粗选项
     */
    public async setColorAndBold(
        colorName: keyof typeof this.defaultColors, 
        color: string, 
        boldKey: keyof typeof this.defaultBoldSettings, 
        bold: boolean
    ): Promise<void> {
        // 验证颜色格式
        if (!this.isValidHexColor(color)) {
            throw new Error(`Invalid hex color format: ${color}. Please use format #RRGGBB or #RGB`);
        }
        
        const config = vscode.workspace.getConfiguration();
        
        // 同时更新颜色和加粗设置
        await Promise.all([
            config.update(`gromacsHelper.colors.${colorName}`, color, vscode.ConfigurationTarget.Global),
            config.update(`gromacsHelper.colors.${boldKey}`, bold, vscode.ConfigurationTarget.Global)
        ]);
        
        // 重新应用颜色
        await this.applyLanguageSpecificColors();
    }

    /**
     * 重置所有颜色到默认值
     */
    public async resetColorsToDefault(): Promise<void> {
        const config = vscode.workspace.getConfiguration();
        
        // 清除所有自定义颜色配置
        const colorPromises = Object.keys(this.defaultColors).map(colorName =>
            config.update(
                `gromacsHelper.colors.${colorName}`,
                undefined,
                vscode.ConfigurationTarget.Global
            )
        );

        // 清除所有自定义加粗配置
        const boldPromises = Object.keys(this.defaultBoldSettings).map(boldKey =>
            config.update(
                `gromacsHelper.colors.${boldKey}`,
                undefined,
                vscode.ConfigurationTarget.Global
            )
        );
        
        // 等待所有配置清除完成
        await Promise.all([...colorPromises, ...boldPromises]);
        
        // 重新应用默认颜色
        await this.applyLanguageSpecificColors();
    }

    /**
     * 获取所有默认颜色
     */
    public getDefaultColors(): typeof this.defaultColors {
        return { ...this.defaultColors };
    }

    /**
     * 获取所有默认加粗设置
     */
    public getDefaultBoldSettings(): typeof this.defaultBoldSettings {
        return { ...this.defaultBoldSettings };
    }

    /**
     * 验证并获取当前所有颜色配置
     */
    public getCurrentColorSettings(): { 
        colors: { [K in keyof typeof ColorManager.prototype.defaultColors]: string }; 
        boldSettings: { [K in keyof typeof ColorManager.prototype.defaultBoldSettings]: boolean }; 
        invalid: string[] 
    } {
        const currentColors = { ...this.defaultColors };
        const currentBoldSettings = { ...this.defaultBoldSettings };
        const invalidColors: string[] = [];

        // 检查所有颜色配置
        Object.keys(this.defaultColors).forEach(colorName => {
            const key = colorName as keyof typeof this.defaultColors;
            const color = this.getColor(key);
            if (!this.isValidHexColor(color)) {
                invalidColors.push(colorName);
            } else {
                currentColors[key] = color;
            }
        });

        // 检查所有加粗配置
        Object.keys(this.defaultBoldSettings).forEach(boldKey => {
            const key = boldKey as keyof typeof this.defaultBoldSettings;
            currentBoldSettings[key] = this.getBoldSetting(key);
        });

        return {
            colors: currentColors,
            boldSettings: currentBoldSettings,
            invalid: invalidColors
        };
    }
}
