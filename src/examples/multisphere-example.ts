/**
 * 多球拟合功能使用示例
 * 
 * 这个示例展示了如何为单分子结构（如CNT.pdb）生成多球拟合几何体
 */

import * as vscode from 'vscode';
import { PackmolStructureParser, MultisphereConfig, PackmolInput } from '../providers/packmolStructureParser';

/**
 * 示例：为碳纳米管生成多球拟合
 */
export async function exampleCNTMultisphere() {
  // 模拟一个Packmol输入，包含单个CNT分子
  const packmolInput: PackmolInput = {
    config: {
      tolerance: 2.0,
      output: 'system.pdb'
    },
    structures: [
      {
        id: 'cnt_1',
        filename: 'CNT.pdb',
        number: 1,  // 关键：number为1表示单分子
        center: [0, 0, 0],
        fixed: [-10, -10, -10, 10, 10, 10],
        constraints: []
      },
      {
        id: 'water_1',
        filename: 'water.pdb',
        number: 1000,  // 多分子
        constraints: [
          {
            type: 'outside',
            geometry: {
              type: 'sphere',
              parameters: [0, 0, 0, 15]
            }
          }
        ]
      }
    ]
  };

  // 创建多球拟合配置
  const multisphereConfig: MultisphereConfig = {
    maxSpheres: 8,           // 最多8个球
    minRadius: 1.5,          // 最小半径1.5 Å
    tolerance: 0.3,          // 容差0.3 Å
    method: 'adaptive'       // 使用自适应方法
  };

  // 假设Packmol文件路径
  const packmolUri = vscode.Uri.file('/path/to/input.inp');

  try {
    // 为CNT结构生成多球拟合
    const cntStructure = packmolInput.structures[0];
    const geometry = await PackmolStructureParser.generateMultisphereGeometry(
      cntStructure,
      packmolUri,
      multisphereConfig
    );

    if (geometry && geometry.type === 'multi_sphere' && geometry.spheres) {
      console.log('CNT多球拟合结果:');
      console.log(`生成了 ${geometry.spheres.length} 个球体`);
      
      geometry.spheres.forEach((sphere, index) => {
        console.log(`球体 ${index + 1}:`);
        console.log(`  中心: (${sphere.center.map(c => c.toFixed(2)).join(', ')})`);
        console.log(`  半径: ${sphere.radius.toFixed(2)} Å`);
      });
    }

    // 生成完整的场景数据
    const sceneData = await PackmolStructureParser.generateSceneData(packmolInput, packmolUri);
    
    console.log('场景数据:');
    sceneData.structures.forEach(structure => {
      console.log(`结构 ${structure.filename}:`);
      console.log(`  类型: ${structure.type}`);
      console.log(`  分子数: ${structure.number}`);
      console.log(`  原子数: ${structure.visualInfo.atomCount || 'N/A'}`);
      
      if (structure.geometry?.type === 'multi_sphere') {
        console.log(`  多球拟合: ${structure.geometry.spheres?.length || 0} 个球体`);
      }
    });

  } catch (error) {
    console.error('多球拟合失败:', error);
  }
}

/**
 * 示例：不同配置的多球拟合比较
 */
export async function compareMultisphereMethods() {
  const structure = {
    id: 'protein_1',
    filename: 'protein.pdb',
    number: 1,
    constraints: []
  };

  const packmolUri = vscode.Uri.file('/path/to/input.inp');

  // 不同的拟合方法配置
  const configs: { name: string; config: MultisphereConfig }[] = [
    {
      name: '精细拟合 (自适应)',
      config: {
        maxSpheres: 15,
        minRadius: 1.0,
        tolerance: 0.2,
        method: 'adaptive'
      }
    },
    {
      name: '快速拟合 (K-means)',
      config: {
        maxSpheres: 8,
        minRadius: 2.0,
        tolerance: 0.5,
        method: 'kmeans'
      }
    },
    {
      name: '层次聚类',
      config: {
        maxSpheres: 10,
        minRadius: 1.5,
        tolerance: 0.3,
        method: 'hierarchical'
      }
    }
  ];

  console.log('比较不同多球拟合方法:');
  
  for (const { name, config } of configs) {
    try {
      console.log(`\n--- ${name} ---`);
      const startTime = Date.now();
      
      const geometry = await PackmolStructureParser.generateMultisphereGeometry(
        structure,
        packmolUri,
        config
      );
      
      const endTime = Date.now();
      
      if (geometry && geometry.spheres) {
        console.log(`球体数量: ${geometry.spheres.length}`);
        console.log(`计算时间: ${endTime - startTime} ms`);
        
        // 计算总体积
        const totalVolume = geometry.spheres.reduce((sum, sphere) => 
          sum + (4/3) * Math.PI * Math.pow(sphere.radius, 3), 0
        );
        console.log(`总体积: ${totalVolume.toFixed(1)} Å³`);
        
        // 计算平均半径
        const avgRadius = geometry.spheres.reduce((sum, sphere) => 
          sum + sphere.radius, 0) / geometry.spheres.length;
        console.log(`平均半径: ${avgRadius.toFixed(2)} Å`);
      }
      
    } catch (error) {
      console.error(`${name} 失败:`, error);
    }
  }
}

/**
 * 检查结构是否适合多球拟合
 */
export function isSuitableForMultisphere(structure: any): boolean {
  return PackmolStructureParser.isSingleMoleculeStructure(structure);
}
