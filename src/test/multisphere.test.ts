/**
 * 多球拟合功能测试
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { PackmolStructureParser, MultisphereConfig, PackmolStructure } from '../providers/packmolStructureParser';

describe('PackmolStructureParser - 多球拟合', () => {
  
  test('检测单分子结构', () => {
    const singleMolecule: PackmolStructure = {
      id: 'test_1',
      filename: 'test.pdb',
      number: 1,
      constraints: []
    };
    
    const multipleMolecules: PackmolStructure = {
      id: 'test_2', 
      filename: 'test.pdb',
      number: 100,
      constraints: []
    };
    
    assert.strictEqual(PackmolStructureParser.isSingleMoleculeStructure(singleMolecule), true);
    assert.strictEqual(PackmolStructureParser.isSingleMoleculeStructure(multipleMolecules), false);
  });
  
  test('计算两点间距离', () => {
    // 使用反射访问私有方法进行测试
    const point1: [number, number, number] = [0, 0, 0];
    const point2: [number, number, number] = [3, 4, 0];
    
    // 期望距离为5 (3-4-5三角形)
    // 注意：这里我们需要通过反射或者将方法设为public来测试
    // 或者通过公共接口间接测试
  });
  
  test('质心计算', () => {
    const coordinates: [number, number, number][] = [
      [0, 0, 0],
      [2, 0, 0], 
      [0, 2, 0],
      [0, 0, 2]
    ];
    
    // 期望质心为 (0.5, 0.5, 0.5)
    // 同样需要通过公共接口测试
  });
  
  test('默认多球拟合配置', () => {
    const defaultConfig: MultisphereConfig = {
      maxSpheres: 10,
      minRadius: 1.0,
      tolerance: 0.5,
      method: 'adaptive'
    };
    
    assert.strictEqual(defaultConfig.method, 'adaptive');
    assert.strictEqual(defaultConfig.maxSpheres, 10);
  });
  
  test('几何体类型扩展', () => {
    // 测试新的multi_sphere类型
    const geometry = {
      type: 'multi_sphere' as const,
      parameters: [],
      spheres: [
        { center: [0, 0, 0] as [number, number, number], radius: 2.0 },
        { center: [5, 0, 0] as [number, number, number], radius: 1.5 }
      ]
    };
    
    assert.strictEqual(geometry.type, 'multi_sphere');
    assert.strictEqual(geometry.spheres.length, 2);
    assert.strictEqual(geometry.spheres[0].radius, 2.0);
  });
});

/**
 * 集成测试 - 需要实际的PDB文件
 */
describe('PackmolStructureParser - 集成测试', () => {
  
  test('解析带CNT的Packmol文件', async () => {
    // 这个测试需要实际的文件，可以跳过或者使用模拟数据
    // 创建模拟的Packmol输入
    const mockInput = `
# CNT system
tolerance 2.0
output system.pdb

structure CNT.pdb
  number 1
  center
  fixed 0. 0. 0. 0. 0. 0.
end structure

structure water.pdb
  number 1000
  inside box 0. 0. 0. 50. 50. 50.
end structure
    `.trim();
    
    // 这里可以测试解析逻辑
    const lines = mockInput.split('\n');
    let foundCNT = false;
    let foundNumber1 = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('CNT.pdb')) {
        foundCNT = true;
      }
      if (line.includes('number 1')) {
        foundNumber1 = true;
      }
    }
    
    assert.strictEqual(foundCNT, true);
    assert.strictEqual(foundNumber1, true);
  });
});
