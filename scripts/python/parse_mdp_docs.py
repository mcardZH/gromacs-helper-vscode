#!/usr/bin/env python3
"""
GROMACS MDP 参数文档解析器
解析 GROMACS 官方文档中的 MDP 参数定义，生成 TypeScript 格式的参数数组
"""

import re
import json
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict


@dataclass
class MdpParameter:
    """MDP 参数数据结构"""
    name: str
    type: str
    description: str
    defaultValue: Optional[str] = None
    validValues: Optional[List[str]] = None
    unit: Optional[str] = None
    range: Optional[Dict[str, Any]] = None
    category: str = "general"
    version: Optional[str] = None


class MdpDocParser:
    """MDP 文档解析器"""

    def __init__(self):
        self.parameters: List[MdpParameter] = []
        self.current_category = "general"

    def parse_document(self, content: str) -> List[MdpParameter]:
        """解析整个文档内容"""
        lines = content.split('\n')
        i = 0

        while i < len(lines):
            line = lines[i].strip()

            # 检测章节标题
            if self._is_section_header(line, lines, i):
                self.current_category = self._extract_category(line)
                i += 1
                continue

            # 检测参数定义
            if line.startswith('.. mdp::'):
                param, next_i = self._parse_parameter_block(lines, i)
                if param:
                    self.parameters.append(param)
                i = next_i
                continue

            i += 1

        return self.parameters

    def _is_section_header(self, line: str, lines: List[str], index: int) -> bool:
        """检查是否为章节标题"""
        if not line or index + 1 >= len(lines):
            return False

        next_line = lines[index + 1].strip()
        # 检查下一行是否为装饰符
        if re.match(r'^[\^=\-~`#*+<>]+$', next_line) and len(next_line) >= len(line) - 2:
            return True
        return False

    def _extract_category(self, line: str) -> str:
        """从章节标题提取类别"""
        category_map = {
            'preprocessing': 'preprocessing',
            'run control': 'run-control',
            'langevin dynamics': 'langevin-dynamics',
            'energy minimization': 'energy-minimization',
            'shell molecular dynamics': 'shell-molecular-dynamics',
            'test particle insertion': 'test-particle-insertion',
            'output control': 'output-control',
            'neighbor searching': 'neighbor-searching',
            'neighbour searching': 'neighbor-searching',
            'electrostatics': 'electrostatics',
            'van der waals': 'van-der-waals',
            'tables': 'tables',
            'ewald': 'ewald',
            'temperature coupling': 'temperature-coupling',
            'pressure coupling': 'pressure-coupling',
            'simulated annealing': 'simulated-annealing',
            'velocity generation': 'velocity-generation',
            'bonds': 'bonds',
            'energy group exclusions': 'energy-group-exclusions',
            'walls': 'walls',
            'com pulling': 'com-pulling',
            'awh adaptive biasing': 'awh-adaptive-biasing',
            'enforced rotation': 'enforced-rotation',
            'nmr refinement': 'nmr-refinement',
            'free energy calculations': 'free-energy-calculations',
            'expanded ensemble calculations': 'expanded-ensemble-calculations',
            'non-equilibrium md': 'non-equilibrium-md',
            'electric fields': 'electric-fields',
            'mixed quantum/classical molecular dynamics': 'qmmm',
            'computational electrophysiology': 'computational-electrophysiology',
            'density-guided simulations': 'density-guided-simulations',
            'qm/mm simulations with cp2k interface': 'qmmm-cp2k',
            'collective variables (colvars) module': 'colvars'
        }

        line_lower = line.lower().strip()
        return category_map.get(line_lower, 'general')

    def _parse_parameter_block(self, lines: List[str], start_index: int) -> Tuple[Optional[MdpParameter], int]:
        """解析单个参数块，返回参数对象和下一个解析位置"""
        line = lines[start_index].strip()

        # 提取参数名
        match = re.match(r'^\.\. mdp::\s*([a-zA-Z0-9_-]+)', line)
        if not match:
            return None, start_index + 1

        param_name = match.group(1)

        # 收集参数信息
        description_lines = []
        valid_values = []
        default_value = None
        unit = None
        param_type = "string"

        i = start_index + 1
        base_indent = None

        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            # 如果遇到新的 mdp 指令或章节，停止解析
            if stripped.startswith('.. mdp::') or self._is_section_header(stripped, lines, i):
                break

            # 空行处理
            if not stripped:
                if description_lines and description_lines[-1] != "":
                    description_lines.append("")
                i += 1
                continue

            # 设置基础缩进
            if base_indent is None and not stripped.startswith('..'):
                base_indent = len(line) - len(line.lstrip())

            # 处理 mdp-value 定义
            if '.. mdp-value::' in stripped:
                value_match = re.search(
                    r'\.\. mdp-value::\s*([a-zA-Z0-9_-]+)', stripped)
                if value_match:
                    valid_values.append(value_match.group(1))
                    param_type = "enum"
                i += 1
                continue

            # 跳过其他指令
            if stripped.startswith('..'):
                i += 1
                continue

            # 处理描述文本
            current_indent = len(line) - len(line.lstrip())
            if base_indent is None or current_indent >= base_indent:
                clean_line = self._clean_description_line(stripped)
                if clean_line:
                    # 尝试从第一行提取默认值和单位
                    if not default_value and not description_lines:
                        default_value, unit = self._extract_default_and_unit(
                            clean_line)

                    description_lines.append(clean_line)
            else:
                # 缩进减少，可能是新的参数或章节
                break

            i += 1

        # 构建描述
        description = self._build_description(description_lines)

        # 如果没有提取到默认值，尝试从参数名推断
        if not default_value:
            default_value = self._infer_default_value(param_name)

        # 如果没有有效值，根据参数名和描述推断类型
        if not valid_values:
            param_type = self._infer_parameter_type(param_name, description)

        # 如果没有提取到单位，尝试从描述中推断
        if not unit:
            unit = self._infer_unit_from_description(description)

        # 推断数值范围
        param_range = self._infer_range(param_name, param_type, description)

        param = MdpParameter(
            name=param_name,
            type=param_type,
            description=description,
            defaultValue=default_value,
            validValues=valid_values if valid_values else None,
            unit=unit,
            range=param_range,
            category=self.current_category
        )

        return param, i

    def _clean_description_line(self, line: str) -> str:
        """清理描述行，移除RST标记"""
        # 移除各种RST标记
        line = re.sub(r':mdp:`([^`]+)`', r'\1', line)
        line = re.sub(r':mdp-value:`([^`]+)`', r'\1', line)
        line = re.sub(r':ref:`([^`]+)`', r'\1', line)
        line = re.sub(r'``([^`]+)``', r'\1', line)
        line = re.sub(r'`([^`]+)`_', r'\1', line)
        line = re.sub(r'\|([^|]+)\|', r'\1', line)
        line = re.sub(r':sup:`([^`]+)`', r'^\1', line)
        line = re.sub(r':math:`([^`]+)`', r'\1', line)

        return line.strip()

    def _extract_default_and_unit(self, line: str) -> Tuple[Optional[str], Optional[str]]:
        """从描述行中提取默认值和单位"""
        default_value = None
        unit = None

        # 匹配 (默认值) [单位] 格式
        match = re.search(r'\(([^)]+)\)\s*(?:\[([^\]]+)\])?', line)
        if match:
            default_value = match.group(1).strip()
            if match.group(2):
                unit = match.group(2).strip()

        # 处理特殊的默认值格式
        if default_value:
            # 移除多余的描述
            if ' ' in default_value and not default_value.replace('.', '').replace('-', '').replace('+', '').isdigit():
                # 如果默认值包含空格且不是纯数字，取第一个词
                parts = default_value.split()
                if parts[0].replace('.', '').replace('-', '').replace('+', '').isdigit():
                    default_value = parts[0]
                elif len(parts) == 1:
                    default_value = parts[0]
                else:
                    # 如果是复杂描述，保持原样
                    pass

        return default_value, unit

    def _build_description(self, description_lines: List[str]) -> str:
        """构建参数描述"""
        if not description_lines:
            return ""

        # 移除空行和只包含默认值信息的行
        filtered_lines = []
        skip_first = False

        for i, line in enumerate(description_lines):
            if not line:
                if filtered_lines:  # 避免开头的空行
                    filtered_lines.append("")
                continue

            # 如果第一行只包含默认值和单位信息，跳过
            if i == 0 and re.match(r'^\([^)]*\)(\s*\[[^\]]*\])?\s*$', line):
                skip_first = True
                continue

            # 如果第一行被跳过，第二行成为实际的描述开始
            if skip_first and i == 1:
                skip_first = False

            filtered_lines.append(line)

        # 合并行，保持段落结构
        description = ""
        current_paragraph = []

        for line in filtered_lines:
            if not line:  # 空行表示段落结束
                if current_paragraph:
                    description += " ".join(current_paragraph) + "\n\n"
                    current_paragraph = []
            else:
                current_paragraph.append(line)

        # 添加最后一个段落
        if current_paragraph:
            description += " ".join(current_paragraph)

        return description.strip()

    def _infer_parameter_type(self, name: str, description: str) -> str:
        """推断参数类型"""
        name_lower = name.lower()
        desc_lower = description.lower()

        # 整数类型的关键词
        if any(keyword in name_lower for keyword in ['nst', 'step', 'iter', 'order', 'chain', 'number', 'num']):
            return "integer"

        # 实数类型的关键词
        if any(keyword in name_lower for keyword in ['dt', 'tau', 'ref', 'tolerance', 'precision', 'temp', 'radius', 'spacing', 'factor']):
            return "real"

        # 布尔类型的关键词
        if any(keyword in name_lower for keyword in ['gen-', 'print-', 'use-', 'apply-', 'enable-', 'active']):
            return "boolean"

        # 基于描述推断
        if any(keyword in desc_lower for keyword in ['steps', 'number of', 'interval', 'frequency']):
            return "integer"

        if any(keyword in desc_lower for keyword in ['time', 'temperature', 'pressure', 'distance', 'energy', 'force']):
            return "real"

        if any(keyword in desc_lower for keyword in ['yes', 'no', 'true', 'false', 'enable', 'disable']):
            return "boolean"

        return "string"

    def _infer_default_value(self, name: str) -> Optional[str]:
        """根据参数名推断常见默认值"""
        default_map = {
            'integrator': 'md',
            'dt': '0.002',
            'nsteps': '50000',
            'nstlist': '10',
            'rlist': '1.0',
            'rcoulomb': '1.0',
            'rvdw': '1.0',
            'coulombtype': 'PME',
            'vdwtype': 'Cut-off',
            'tcoupl': 'no',
            'pcoupl': 'no',
            'gen-vel': 'no',
            'constraints': 'none',
            'continuation': 'no',
            'cutoff-scheme': 'Verlet',
            'pbc': 'xyz',
            'verlet-buffer-tolerance': '0.005',
            'fourierspacing': '0.12',
            'pme-order': '4'
        }

        return default_map.get(name)

    def _infer_unit_from_description(self, description: str) -> Optional[str]:
        """从描述中推断单位"""
        unit_patterns = [
            (r'\[([^\]]+)\]', 1),  # [单位] 格式
            (r'\bps\b', 'ps'),
            (r'\bfs\b', 'fs'),
            (r'\bnm\b', 'nm'),
            (r'\bÅ\b|\bangstrom\b', 'angstrom'),
            (r'\bK\b(?!\w)', 'K'),
            (r'\bkelvin\b', 'K'),
            (r'\bbar\b(?!\w)', 'bar'),
            (r'\batm\b', 'atm'),
            (r'kJ\s*mol.*?-1|kJ/mol', 'kJ/mol'),
            (r'kcal\s*mol.*?-1|kcal/mol', 'kcal/mol'),
            (r'\bdeg\b|degree', 'degree'),
            (r'\brad\b|radian', 'radian')
        ]

        for pattern, unit in unit_patterns:
            match = re.search(pattern, description, re.IGNORECASE)
            if match:
                if isinstance(unit, int):  # 组号
                    return match.group(unit)
                else:
                    return unit

        return None

    def _infer_range(self, name: str, param_type: str, description: str) -> Optional[Dict[str, Any]]:
        """推断数值范围"""
        if param_type not in ['integer', 'real']:
            return None

        # 从描述中提取范围信息
        range_info = {}

        # 查找明确的范围描述
        range_patterns = [
            r'between\s+([0-9.-]+)\s+and\s+([0-9.-]+)',
            r'from\s+([0-9.-]+)\s+to\s+([0-9.-]+)',
            r'range\s+([0-9.-]+)\s*-\s*([0-9.-]+)',
            r'minimum\s+(?:of\s+)?([0-9.-]+)',
            r'maximum\s+(?:of\s+)?([0-9.-]+)',
            r'at\s+least\s+([0-9.-]+)',
            r'no\s+more\s+than\s+([0-9.-]+)'
        ]

        for pattern in range_patterns:
            match = re.search(pattern, description.lower())
            if match:
                if 'between' in pattern or 'from' in pattern or 'range' in pattern:
                    range_info['min'] = float(match.group(1))
                    range_info['max'] = float(match.group(2))
                elif 'minimum' in pattern or 'at least' in pattern:
                    range_info['min'] = float(match.group(1))
                elif 'maximum' in pattern or 'no more than' in pattern:
                    range_info['max'] = float(match.group(1))

        # 基于参数名的常见范围
        if not range_info:
            range_map = {
                'dt': {'min': 0.0001, 'max': 0.01},
                'nsteps': {'min': 0},
                'nstlist': {'min': 0},
                'rlist': {'min': 0},
                'rcoulomb': {'min': 0},
                'rvdw': {'min': 0},
                'epsilon-r': {'min': 1},
                'ref-t': {'min': 0},
                'tau-t': {'min': 0},
                'tau-p': {'min': 0},
                'pme-order': {'min': 3, 'max': 12},
                'fourierspacing': {'min': 0.05, 'max': 0.5}
            }
            range_info = range_map.get(name, {})

        return range_info if range_info else None

    def generate_typescript(self) -> str:
        """生成TypeScript代码"""
        # 按类别分组参数
        categories = {}
        for param in self.parameters:
            if param.category not in categories:
                categories[param.category] = []
            categories[param.category].append(param)

        ts_code = []
        ts_code.append("// 自动生成的 GROMACS MDP 参数定义")
        ts_code.append("// Generated GROMACS MDP parameter definitions")
        ts_code.append("")
        ts_code.append("export interface MdpParameter {")
        ts_code.append("  name: string;")
        ts_code.append(
            "  type: 'string' | 'integer' | 'real' | 'boolean' | 'enum';")
        ts_code.append("  description: string;")
        ts_code.append("  defaultValue?: string;")
        ts_code.append("  validValues?: string[];")
        ts_code.append("  unit?: string;")
        ts_code.append("  range?: { min?: number; max?: number };")
        ts_code.append("  category: string;")
        ts_code.append("  version?: string;")
        ts_code.append("}")
        ts_code.append("")
        ts_code.append("export const MDP_PARAMETERS: MdpParameter[] = [")

        # 按类别输出参数
        first_category = True
        for category, params in categories.items():
            if not first_category:
                ts_code.append("")

            ts_code.append(f"  // {self._get_category_name(category)}")
            first_category = False

            for param in params:
                param_lines = ["  {"]
                param_lines.append(f"    name: '{param.name}',")
                param_lines.append(f"    type: '{param.type}',")

                # 转义描述中的引号和换行符
                description = param.description.replace(
                    "'", "\\'").replace('\n', '\\n')
                param_lines.append(f"    description: '{description}',")

                if param.defaultValue:
                    param_lines.append(
                        f"    defaultValue: '{param.defaultValue}',")

                if param.validValues:
                    values_str = "', '".join(param.validValues)
                    param_lines.append(f"    validValues: ['{values_str}'],")

                if param.unit:
                    param_lines.append(f"    unit: '{param.unit}',")

                if param.range:
                    range_parts = []
                    if 'min' in param.range:
                        range_parts.append(f"min: {param.range['min']}")
                    if 'max' in param.range:
                        range_parts.append(f"max: {param.range['max']}")
                    if range_parts:
                        param_lines.append(
                            f"    range: {{ {', '.join(range_parts)} }},")

                param_lines.append(f"    category: '{param.category}'")

                if param.version:
                    param_lines.append(f"    version: '{param.version}'")

                param_lines.append("  },")

                ts_code.extend(param_lines)

        ts_code.append("];")
        ts_code.append("")
        ts_code.append("// 按类别分组的参数")
        ts_code.append(
            "export const MDP_PARAMETERS_BY_CATEGORY: Record<string, MdpParameter[]> = {")

        for category in categories.keys():
            ts_code.append(
                f"  '{category}': MDP_PARAMETERS.filter(p => p.category === '{category}'),")

        ts_code.append("};")

        return "\n".join(ts_code)

    def _get_category_name(self, category: str) -> str:
        """获取类别的中文名称"""
        category_names = {
            'preprocessing': '预处理 / Preprocessing',
            'run-control': '运行控制 / Run Control',
            'langevin-dynamics': '朗之万动力学 / Langevin Dynamics',
            'energy-minimization': '能量最小化 / Energy Minimization',
            'shell-molecular-dynamics': '壳层分子动力学 / Shell Molecular Dynamics',
            'test-particle-insertion': '测试粒子插入 / Test Particle Insertion',
            'output-control': '输出控制 / Output Control',
            'neighbor-searching': '邻居搜索 / Neighbor Searching',
            'electrostatics': '静电相互作用 / Electrostatics',
            'van-der-waals': '范德华相互作用 / Van der Waals',
            'tables': '表格 / Tables',
            'ewald': 'Ewald求和 / Ewald',
            'temperature-coupling': '温度耦合 / Temperature Coupling',
            'pressure-coupling': '压力耦合 / Pressure Coupling',
            'simulated-annealing': '模拟退火 / Simulated Annealing',
            'velocity-generation': '速度生成 / Velocity Generation',
            'bonds': '键参数 / Bonds',
            'energy-group-exclusions': '能量组排除 / Energy Group Exclusions',
            'walls': '壁面 / Walls',
            'com-pulling': '质心牵引 / COM Pulling',
            'awh-adaptive-biasing': 'AWH自适应偏置 / AWH Adaptive Biasing',
            'enforced-rotation': '强制旋转 / Enforced Rotation',
            'nmr-refinement': 'NMR精修 / NMR Refinement',
            'free-energy-calculations': '自由能计算 / Free Energy Calculations',
            'expanded-ensemble-calculations': '扩展系综计算 / Expanded Ensemble Calculations',
            'non-equilibrium-md': '非平衡MD / Non-equilibrium MD',
            'electric-fields': '电场 / Electric Fields',
            'qmmm': 'QM/MM',
            'computational-electrophysiology': '计算电生理学 / Computational Electrophysiology',
            'density-guided-simulations': '密度引导模拟 / Density-guided Simulations',
            'qmmm-cp2k': 'QM/MM CP2K接口 / QM/MM CP2K Interface',
            'colvars': '集体变量 / Collective Variables',
            'general': '通用参数 / General'
        }
        return category_names.get(category, category.replace('-', ' ').title())

    def generate_summary(self) -> str:
        """生成解析结果摘要"""
        summary = []
        summary.append("=== GROMACS MDP 参数解析结果摘要 ===")
        summary.append(f"总参数数量: {len(self.parameters)}")
        summary.append("")

        # 按类别统计
        categories = {}
        types = {}
        has_default = 0
        has_enum = 0
        has_unit = 0
        has_range = 0

        for param in self.parameters:
            categories[param.category] = categories.get(param.category, 0) + 1
            types[param.type] = types.get(param.type, 0) + 1

            if param.defaultValue:
                has_default += 1
            if param.validValues:
                has_enum += 1
            if param.unit:
                has_unit += 1
            if param.range:
                has_range += 1

        summary.append("按类别分布:")
        for category, count in sorted(categories.items()):
            summary.append(f"  {self._get_category_name(category)}: {count}")

        summary.append("")
        summary.append("按类型分布:")
        for param_type, count in sorted(types.items()):
            summary.append(f"  {param_type}: {count}")

        summary.append("")
        summary.append("属性统计:")
        summary.append(f"  有默认值: {has_default}")
        summary.append(f"  有枚举值: {has_enum}")
        summary.append(f"  有单位: {has_unit}")
        summary.append(f"  有范围: {has_range}")

        return "\n".join(summary)


def main():
    """主函数"""
    import sys

    if len(sys.argv) != 2:
        print("使用方法: python parse_mdp_docs.py <input_file>")
        print("示例: python parse_mdp_docs.py sample_mdp_docs.rst")
        sys.exit(1)

    input_file = sys.argv[1]

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()

        print("开始解析 GROMACS MDP 参数文档...")
        parser = MdpDocParser()
        parameters = parser.parse_document(content)

        print(f"解析完成！共解析到 {len(parameters)} 个参数")

        # 生成摘要
        summary = parser.generate_summary()
        print("\n" + summary)

        # 生成 TypeScript 代码
        print("\n生成 TypeScript 代码...")
        ts_code = parser.generate_typescript()

        # 输出到文件
        output_file = input_file.replace(
            '.rst', '_parsed.ts').replace('.txt', '_parsed.ts')
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(ts_code)

        print(f"TypeScript 代码已保存到: {output_file}")

        # 生成 JSON 格式（用于调试和其他用途）
        print("生成 JSON 数据...")
        json_data = [asdict(param) for param in parameters]
        json_file = input_file.replace(
            '.rst', '_parsed.json').replace('.txt', '_parsed.json')
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)

        print(f"JSON 数据已保存到: {json_file}")

        # 保存解析摘要
        summary_file = input_file.replace(
            '.rst', '_summary.txt').replace('.txt', '_summary.txt')
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(summary)

        print(f"解析摘要已保存到: {summary_file}")

    except FileNotFoundError:
        print(f"错误: 找不到文件 {input_file}")
        sys.exit(1)
    except Exception as e:
        print(f"解析过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
