/**
 * GROMACS MDP 参数定义
 * 包含所有 GROMACS 参数的类型、默认值、有效值范围和描述信息
 */
import * as vscode from 'vscode';

export interface MdpParameter {
  name: string;
  type: 'string' | 'integer' | 'real' | 'boolean' | 'enum';
  description: string;
  descriptionZh?: string; // 中文描述（自动翻译自 description 字段，若无则需补充）
  defaultValue?: string;
  validValues?: string[];
  unit?: string;
  range?: {
    min?: number;
    max?: number;
  };
  category: string; // 参数类别，例如 'run-control', 'output-control', 'neighbor-search' 等
  version?: string; // 引入的 GROMACS 版本
}
// 自动生成的 GROMACS MDP 参数定义，基于 2025 年 6 月 22 日，Gromacs 2025.2

export const MDP_PARAMETERS: MdpParameter[] = [
  // 预处理 / Preprocessing
  {
    name: 'include',
    type: 'string',
    description: 'directories to include in your topology. Format: -I/home/john/mylib -I../otherlib',
    descriptionZh: '要包含在拓扑中的目录。格式：-I/home/john/mylib -I../otherlib',
    category: 'preprocessing'
  },
  {
    name: 'define',
    type: 'string',
    description: 'defines to pass to the preprocessor, default is no defines. You can use any defines to control options in your customized topology files. Options that act on existing top file mechanisms include\n\n-DFLEXIBLE will use flexible water instead of rigid water into your topology, this can be useful for normal mode analysis.\n\n-DPOSRES will trigger the inclusion of posre.itp into your topology, used for implementing position restraints.',
    descriptionZh: '传递给预处理器的定义，默认无定义。您可以使用任何定义来控制自定义拓扑文件中的选项。作用于现有拓扑文件机制的选项包括：\n\n-DFLEXIBLE 将在拓扑中使用柔性水而不是刚性水，这对正常模式分析很有用。\n\n-DPOSRES 将触发在拓扑中包含 posre.itp，用于实现位置约束。',
    category: 'preprocessing'
  },

  // 运行控制 / Run Control
  {
    name: 'integrator',
    type: 'enum',
    description: '(Despite the name, this list includes algorithms that are not actually integrators over time. integrator=steep and all entries following it are in this category)\n\nA leap-frog algorithm for integrating Newton\'s equations of motion.\n\nA velocity Verlet algorithm for integrating Newton\'s equations of motion.  For constant NVE simulations started from corresponding points in the same trajectory, the trajectories are analytically, but not binary, identical to the integrator=md leap-frog integrator. The kinetic energy is determined from the whole step velocities and is therefore slightly too high. The advantage of this integrator is more accurate, reversible Nose-Hoover and Parrinello-Rahman coupling integration based on Trotter expansion, as well as (slightly too small) full step velocity output. This all comes at the cost of extra computation, especially with constraints and extra communication in parallel. Note that for nearly all production simulations the integrator=md integrator is accurate enough.\n\nA velocity Verlet algorithm identical to integrator=md-vv, except that the kinetic energy is determined as the average of the two half step kinetic energies as in the integrator=md integrator, and this thus more accurate.  With Nose-Hoover and/or Parrinello-Rahman coupling this comes with a slight increase in computational cost.\n\nAn accurate and efficient leap-frog stochastic dynamics integrator. With constraints, coordinates needs to be constrained twice per integration step. Depending on the computational cost of the force calculation, this can take a significant part of the simulation time. The temperature for one or more groups of atoms (tc-grps) is set with ref-t, the inverse friction constant for each group is set with tau-t.  The parameters tcoupl and nsttcouple are ignored. The random generator is initialized with ld-seed. When used as a thermostat, an appropriate value for tau-t is 2 ps, since this results in a friction that is lower than the internal friction of water, while it is high enough to remove excess heat NOTE: temperature deviations decay twice as fast as with a Berendsen thermostat with the same tau-t.\n\nAn Euler integrator for Brownian or position Langevin dynamics. The velocity is the force divided by a friction coefficient (bd-fric) plus random thermal noise (ref-t). When bd-fric is 0, the friction coefficient for each particle is calculated as mass/ tau-t, as for the integrator integrator=sd. The random generator is initialized with ld-seed.\n\nA steepest descent algorithm for energy minimization. The maximum step size is emstep, the tolerance is emtol.\n\nA conjugate gradient algorithm for energy minimization, the tolerance is emtol. CG is more efficient when a steepest descent step is done every once in a while, this is determined by nstcgsteep. For a minimization prior to a normal mode analysis, which requires a very high accuracy, Gromacs should be compiled in double precision.\n\nA quasi-Newtonian algorithm for energy minimization according to the low-memory Broyden-Fletcher-Goldfarb-Shanno approach. In practice this seems to converge faster than Conjugate Gradients, but due to the correction steps necessary it is not (yet) parallelized.\n\nNormal mode analysis is performed on the structure in the tpr file.  Gromacs should be compiled in double precision.\n\nTest particle insertion. The last molecule in the topology is the test particle. A trajectory must be provided to ``mdrun -rerun``. This trajectory should not contain the molecule to be inserted. Insertions are performed nsteps times in each frame at random locations and with random orientations of the molecule. When nstlist is larger than one, nstlist insertions are performed in a sphere with radius rtpi around a the same random location using the same pair list. Since pair list construction is expensive, one can perform several extra insertions with the same list almost for free. The random seed is set with ld-seed. The temperature for the Boltzmann weighting is set with ref-t, this should match the temperature of the simulation of the original trajectory. Dispersion correction is implemented correctly for TPI. All relevant quantities are written to the file specified with mdrun -tpi. The distribution of insertion energies is written to the file specified with mdrun -tpid. No trajectory or energy file is written. Parallel TPI gives identical results to single-node TPI. For charged molecules, using PME with a fine grid is most accurate and also efficient, since the potential in the system only needs to be calculated once per frame.\n\nTest particle insertion into a predefined cavity location. The procedure is the same as for integrator=tpi, except that one coordinate extra is read from the trajectory, which is used as the insertion location. The molecule to be inserted should be centered at 0,0,0. Gromacs does not do this for you, since for different situations a different way of centering might be optimal. Also rtpi sets the radius for the sphere around this location. Neighbor searching is done only once per frame, nstlist is not used. Parallel integrator=tpic gives identical results to single-rank integrator=tpic.\n\nEnable MiMiC QM/MM coupling to run hybrid molecular dynamics. Keey in mind that its required to launch CPMD compiled with MiMiC as well. In this mode all options regarding integration (T-coupling, P-coupling, timestep and number of steps) are ignored as CPMD will do the integration instead. Options related to forces computation (cutoffs, PME parameters, etc.) are working as usual. Atom selection to define QM atoms is read from QMMM-grps',
    descriptionZh: '（尽管名称如此，此列表包含实际上不是时间积分器的算法。integrator=steep 及其后的所有条目都属于此类别）\n\n用于积分牛顿运动方程的蛙跳算法。\n\n用于积分牛顿运动方程的速度 Verlet 算法。对于从同一轨迹的相应点开始的恒定 NVE 模拟，轨迹在解析上（但不是二进制）与 integrator=md 蛙跳积分器相同。动能由全步速度确定，因此略高。此积分器的优势是基于 Trotter 展开的更准确、可逆的 Nose-Hoover 和 Parrinello-Rahman 耦合积分，以及（略小的）全步速度输出。这些都以额外计算为代价，特别是在约束和并行中的额外通信。注意，对于几乎所有生产模拟，integrator=md 积分器已足够准确。\n\n与 integrator=md-vv 相同的速度 Verlet 算法，除了动能被确定为两个半步动能的平均值（如 integrator=md 积分器），因此更准确。使用 Nose-Hoover 和/或 Parrinello-Rahman 耦合时，计算成本略有增加。\n\n准确高效的蛙跳随机动力学积分器。使用约束时，每个积分步骤需要约束坐标两次。根据力计算的计算成本，这可能占用模拟时间的很大一部分。一个或多个原子组（tc-grps）的温度用 ref-t 设置，每组的逆摩擦常数用 tau-t 设置。参数 tcoupl 和 nsttcouple 被忽略。随机生成器用 ld-seed 初始化。用作恒温器时，tau-t 的适当值为 2 ps，因为这导致的摩擦低于水的内部摩擦，同时足够高以去除多余热量。注意：温度偏差的衰减速度是相同 tau-t 的 Berendsen 恒温器的两倍。\n\n用于布朗或位置朗之万动力学的欧拉积分器。速度是力除以摩擦系数（bd-fric）加上随机热噪声（ref-t）。当 bd-fric 为 0 时，每个粒子的摩擦系数计算为 mass/tau-t，如积分器 integrator=sd。随机生成器用 ld-seed 初始化。\n\n用于能量最小化的最陡下降算法。最大步长为 emstep，容差为 emtol。\n\n用于能量最小化的共轭梯度算法，容差为 emtol。当偶尔执行最陡下降步骤时，CG 更高效，这由 nstcgsteep 确定。对于正常模式分析之前需要非常高精度的最小化，Gromacs 应该以双精度编译。\n\n根据低内存 Broyden-Fletcher-Goldfarb-Shanno 方法的准牛顿能量最小化算法。实际上这似乎比共轭梯度收敛更快，但由于必要的校正步骤，它尚未并行化。\n\n对 tpr 文件中的结构执行正常模式分析。Gromacs 应该以双精度编译。\n\n测试粒子插入。拓扑中的最后一个分子是测试粒子。必须向 mdrun -rerun 提供轨迹。此轨迹不应包含要插入的分子。在每帧中以随机位置和分子的随机取向执行 nsteps 次插入。当 nstlist 大于 1 时，使用相同的对列表在同一随机位置周围半径为 rtpi 的球体中执行 nstlist 次插入。由于对列表构建昂贵，可以用相同列表几乎免费执行几次额外插入。随机种子用 ld-seed 设置。玻尔兹曼加权的温度用 ref-t 设置，这应该与原始轨迹模拟的温度匹配。TPI 正确实现了色散校正。所有相关量都写入用 mdrun -tpi 指定的文件。插入能量分布写入用 mdrun -tpid 指定的文件。不写入轨迹或能量文件。并行 TPI 给出与单节点 TPI 相同的结果。对于带电分子，使用精细网格的 PME 最准确且高效，因为系统中的势只需每帧计算一次。\n\n测试粒子插入到预定义的空腔位置。程序与 integrator=tpi 相同，除了从轨迹中读取一个额外坐标，用作插入位置。要插入的分子应以 0,0,0 为中心。Gromacs 不会为您执行此操作，因为对于不同情况，不同的居中方式可能是最佳的。rtpi 还设置此位置周围球体的半径。邻居搜索每帧只执行一次，不使用 nstlist。并行 integrator=tpic 给出与单等级 integrator=tpic 相同的结果。\n\n启用 MiMiC QM/MM 耦合以运行混合分子动力学。请记住，还需要启动用 MiMiC 编译的 CPMD。在此模式下，所有关于积分的选项（T 耦合、P 耦合、时间步长和步数）都被忽略，因为 CPMD 将执行积分。与力计算相关的选项（截断、PME 参数等）照常工作。定义 QM 原子的原子选择从 QMMM-grps 读取。',
    defaultValue: 'md',
    validValues: ['md', 'md-vv', 'md-vv-avek', 'sd', 'bd', 'steep', 'cg', 'l-bfgs', 'nm', 'tpi', 'tpic', 'mimic'],
    unit: 'ps',
    category: 'run-control'
  },
  {
    name: 'tinit',
    type: 'real',
    description: 'starting time for your run (only makes sense for time-based integrators)',
    descriptionZh: '运行的起始时间（仅对基于时间的积分器有意义）',
    defaultValue: '0',
    unit: 'ps',
    category: 'run-control'
  },
  {
    name: 'dt',
    type: 'real',
    description: 'time step for integration (only makes sense for time-based integrators)',
    descriptionZh: '积分的时间步长（仅对基于时间的积分器有意义）',
    defaultValue: '0.001',
    unit: 'ps',
    range: { min: 0.0001, max: 0.01 },
    category: 'run-control'
  },
  {
    name: 'nsteps',
    type: 'integer',
    description: 'maximum number of steps to integrate or minimize, -1 is no maximum',
    descriptionZh: '积分或最小化的最大步数，-1 表示无最大值',
    defaultValue: '0',
    range: { min: 0 },
    category: 'run-control'
  },
  {
    name: 'init-step',
    type: 'integer',
    description: 'The starting step. The time at step i in a run is calculated as: t = tinit + dt * (init-step + i). The free-energy lambda is calculated as: lambda = init-lambda + delta-lambda * (init-step + i). Also non-equilibrium MD parameters can depend on the step number. Thus for exact restarts or redoing part of a run it might be necessary to set init-step to the step number of the restart frame. gmx convert-tpr does this automatically.',
    descriptionZh: '起始步数。运行中第 i 步的时间计算为：t = tinit + dt * (init-step + i)。自由能 lambda 计算为：lambda = init-lambda + delta-lambda * (init-step + i)。非平衡 MD 参数也可能依赖于步数。因此，对于精确重启或重做运行的一部分，可能需要将 init-step 设置为重启帧的步数。gmx convert-tpr 会自动执行此操作。',
    defaultValue: '0',
    category: 'run-control'
  },
  {
    name: 'simulation-part',
    type: 'string',
    description: 'A simulation can consist of multiple parts, each of which has a part number. This option specifies what that number will be, which helps keep track of parts that are logically the same simulation. This option is generally useful to set only when coping with a crashed simulation where files were lost.',
    descriptionZh: '一个模拟可以由多个部分组成，每部分有编号。此选项指定编号，有助于追踪逻辑上属于同一模拟的部分。通常仅在处理崩溃导致文件丢失时需要设置。',
    defaultValue: '0',
    category: 'run-control'
  },
  {
    name: 'mts',
    type: 'enum',
    description: 'Evaluate all forces at every integration step.\n\nUse a multiple timing-stepping integrator to evaluate some forces, as specified by mts-level2-forces every mts-level2-factor integration steps. All other forces are evaluated at every step. MTS is currently only supported with integrator=md.',
    descriptionZh: '每步都计算所有力。\n\n使用多时间步积分器，每隔 mts-level2-factor 步对 mts-level2-forces 指定的力进行计算，其余力每步都计算。MTS 目前仅支持 integrator=md。',
    validValues: ['no', 'yes'],
    category: 'run-control'
  },
  {
    name: 'mts-levels',
    type: 'integer',
    description: 'The number of levels for the multiple time-stepping scheme. Currently only 2 is supported.',
    descriptionZh: '多时间步方案的层数。目前仅支持 2 层。',
    defaultValue: '2',
    category: 'run-control'
  },
  {
    name: 'mts-level2-forces',
    type: 'integer',
    description: 'A list of one or more force groups that will be evaluated only every mts-level2-factor steps. Supported entries are: longrange-nonbonded, nonbonded, pair, dihedral, angle, pull and awh. With pair the listed pair forces (such as 1-4) are selected. With dihedral all dihedrals are selected, including cmap. All other forces, including all restraints, are evaluated and integrated every step. When PME or Ewald is used for electrostatics and/or LJ interactions, longrange-nonbonded can not be omitted here.',
    descriptionZh: '仅每隔 mts-level2-factor 步计算一次的力组列表。支持：longrange-nonbonded、nonbonded、pair、dihedral、angle、pull、awh。pair 选择指定的对力（如 1-4），dihedral 选择所有二面角（含 cmap）。其余力（含所有约束）每步都计算。若静电或 LJ 相互作用用 PME/Ewald，longrange-nonbonded 不能省略。',
    defaultValue: 'longrange-nonbonded',
    category: 'run-control'
  },
  {
    name: 'mts-level2-factor',
    type: 'real',
    description: 'Interval for computing the forces in level 2 of the multiple time-stepping scheme',
    descriptionZh: '多时间步方案中第 2 层力的计算间隔',
    defaultValue: '2',
    unit: 'steps',
    category: 'run-control'
  },
  {
    name: 'mass-repartition-factor',
    type: 'real',
    description: 'Scales the masses of the lightest atoms in the system by this factor to the mass mMin. All atoms with a mass lower than mMin also have their mass set to that mMin. The mass change is subtracted from the mass of the atom the light atom is bound to. If there is no bound atom a warning is generated. If there is more than one atom bound an error is generated. If the mass of the bound atom would become lower than mMin an error is generated. For typical atomistic systems only the masses of hydrogens are scaled. With constraints=h-bonds, a factor of 3 will usually enable a time step of 4 fs.',
    descriptionZh: '将体系中最轻原子的质量按该因子缩放至 mMin。所有质量低于 mMin 的原子质量也设为 mMin。质量变化从所绑定的原子质量中扣除。若无绑定原子则警告，若绑定多个原子则报错。若绑定原子质量低于 mMin 也报错。典型原子系统通常只缩放氢原子质量。constraints=h-bonds 时，因子为 3 通常可用 4 fs 步长。',
    defaultValue: '1',
    unit: 'fs',
    category: 'run-control'
  },
  {
    name: 'comm-mode',
    type: 'enum',
    description: 'Remove center of mass translational velocity\n\nRemove center of mass translational and rotational velocity\n\nRemove center of mass translational velocity. Correct the center of mass position assuming linear acceleration over nstcomm steps. This is useful for cases where an acceleration is expected on the center of mass which is nearly constant over nstcomm steps. This can occur for example when pulling on a group using an absolute reference.\n\nNo restriction on the center of mass motion',
    descriptionZh: '去除质心平动速度\n\n去除质心平动和转动速度\n\n去除质心平动速度，并假设 nstcomm 步内线性加速度修正质心位置。适用于质心存在近似恒定加速度（如对分组施加绝对参考拉力）。\n\n对质心运动无限制。',
    validValues: ['Linear', 'Angular', 'Linear-acceleration-correction', 'None'],
    category: 'run-control'
  },
  {
    name: 'nstcomm',
    type: 'integer',
    description: 'interval for center of mass motion removal',
    descriptionZh: '去除质心运动的间隔步数',
    defaultValue: '100',
    unit: 'steps',
    category: 'run-control'
  },
  {
    name: 'comm-grps',
    type: 'string',
    description: 'group(s) for center of mass motion removal, default is the whole system',
    descriptionZh: '用于去除质心运动的分组，默认是整个系统',
    defaultValue: 's',
    category: 'run-control'
  },

  // 朗之万动力学 / Langevin Dynamics
  {
    name: 'bd-fric',
    type: 'integer',
    description: 'Brownian dynamics friction coefficient. When bd-fric is 0, the friction coefficient for each particle is calculated as mass/ tau-t.',
    descriptionZh: '布朗动力学摩擦系数。若 bd-fric 为 0，每个粒子的摩擦系数为 mass/tau-t。',
    defaultValue: '0',
    unit: 'amu ps\ ^-1',
    category: 'langevin-dynamics'
  },
  {
    name: 'ld-seed',
    type: 'integer',
    description: 'used to initialize random generator for thermal noise for stochastic and Brownian dynamics. When ld-seed is set to -1, a pseudo random seed is used. When running BD or SD on multiple processors, each processor uses a seed equal to ld-seed plus the processor number.',
    descriptionZh: '用于初始化随机生成器，以产生随机和布朗动力学的热噪声。ld-seed 设为 -1 时使用伪随机种子。多处理器运行 BD 或 SD 时，每个处理器的种子为 ld-seed 加处理器编号。',
    defaultValue: '-1',
    unit: 'integer',
    category: 'langevin-dynamics'
  },

  // 能量最小化 / Energy Minimization
  {
    name: 'emtol',
    type: 'real',
    description: 'the minimization is converged when the maximum force is smaller than this value',
    descriptionZh: '当最大力小于该值时，最小化收敛',
    defaultValue: '10.0',
    unit: 'kJ mol\ ^-1 nm\ ^-1',
    category: 'energy-minimization'
  },
  {
    name: 'emstep',
    type: 'real',
    description: 'initial step-size',
    descriptionZh: '初始步长',
    defaultValue: '0.01',
    unit: 'nm',
    category: 'energy-minimization'
  },
  {
    name: 'nstcgsteep',
    type: 'integer',
    description: 'interval of performing 1 steepest descent step while doing conjugate gradient energy minimization.',
    descriptionZh: '共轭梯度能量最小化时执行一次最陡下降步的间隔',
    defaultValue: '1000',
    unit: 'steps',
    category: 'energy-minimization'
  },
  {
    name: 'nbfgscorr',
    type: 'integer',
    description: 'Number of correction steps to use for L-BFGS minimization. A higher number is (at least theoretically) more accurate, but slower.',
    descriptionZh: 'L-BFGS 最小化的修正步数。数值越大理论上越精确，但速度更慢。',
    defaultValue: '10',
    category: 'energy-minimization'
  },

  // 壳层分子动力学 / Shell Molecular Dynamics
  {
    name: 'niter',
    type: 'integer',
    description: 'maximum number of iterations for optimizing the shell positions and the flexible constraints.',
    descriptionZh: '优化壳层位置和柔性约束的最大迭代次数',
    defaultValue: '20',
    category: 'shell-molecular-dynamics'
  },
  {
    name: 'fcstep',
    type: 'integer',
    description: 'the step size for optimizing the flexible constraints. Should be chosen as mu/(d2V/dq2) where mu is the reduced mass of two particles in a flexible constraint and d2V/dq2 is the second derivative of the potential in the constraint direction. Hopefully this number does not differ too much between the flexible constraints, as the number of iterations and thus the runtime is very sensitive to fcstep. Try several values!',
    descriptionZh: '优化柔性约束的步长。应选为 mu/(d2V/dq2)，mu 为柔性约束中两粒子的约化质量，d2V/dq2 为约束方向的势能二阶导。希望不同柔性约束间该值差别不大，否则迭代次数和运行时间对 fcstep 很敏感。建议多尝试几个值！',
    defaultValue: '0',
    unit: 'ps\ ^2',
    category: 'shell-molecular-dynamics'
  },

  // 测试粒子插入 / Test Particle Insertion
  {
    name: 'rtpi',
    type: 'string',
    description: 'the test particle insertion radius, see integrators integrator=tpi and integrator=tpic',
    descriptionZh: '测试粒子插入半径，详见 integrator=tpi 和 integrator=tpic',
    defaultValue: '0.05',
    unit: 'nm',
    category: 'test-particle-insertion'
  },

  // 输出控制 / Output Control
  {
    name: 'nstxout',
    type: 'integer',
    description: 'number of steps that elapse between writing coordinates to the output trajectory file (trr), the first and last coordinates are always written unless 0, which means coordinates are not written into the trajectory file.',
    descriptionZh: '写入坐标到输出轨迹文件（trr）之间经过的步数，除非为 0（表示坐标不写入轨迹文件），否则总是写入第一个和最后一个坐标。',
    defaultValue: '0',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'nstvout',
    type: 'integer',
    description: 'number of steps that elapse between writing velocities to the output trajectory file (trr), the first and last velocities are always written unless 0, which means velocities are not written into the trajectory file.',
    descriptionZh: '写入速度到输出轨迹文件（trr）之间经过的步数，除非为 0（表示速度不写入轨迹文件），否则总是写入第一个和最后一个速度。',
    defaultValue: '0',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'nstfout',
    type: 'integer',
    description: 'number of steps that elapse between writing forces to the output trajectory file (trr), the first and last forces are always written, unless 0, which means forces are not written into the trajectory file.',
    descriptionZh: '写入力到输出轨迹文件（trr）之间经过的步数，除非为 0（表示力不写入轨迹文件），否则总是写入第一个和最后一个力。',
    defaultValue: '0',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'nstlog',
    type: 'integer',
    description: 'number of steps that elapse between writing energies to the log file, the first and last energies are always written.',
    descriptionZh: '写入能量到日志文件之间经过的步数，总是写入第一个和最后一个能量。',
    defaultValue: '1000',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'nstcalcenergy',
    type: 'integer',
    description: 'number of steps that elapse between calculating the energies, 0 is never. This option is only relevant with dynamics. This option affects the performance in parallel simulations, because calculating energies requires global communication between all processes which can become a bottleneck at high parallelization.',
    descriptionZh: '每隔多少步计算一次能量，0 表示从不计算。仅对动力学相关。该选项会影响并行模拟性能，因为能量计算需全局通信，高并行时可能成为瓶颈。',
    defaultValue: '100',
    category: 'output-control'
  },
  {
    name: 'nstenergy',
    type: 'integer',
    description: 'number of steps that elapse between writing energies to the energy file (edr), the first and last energies are always written, should be a multiple of nstcalcenergy. Note that the exact sums and fluctuations over all MD steps modulo nstcalcenergy are stored in the energy file, so gmx energy can report exact energy averages and fluctuations also when nstenergy > 1',
    descriptionZh: '每隔多少步将能量写入能量文件（edr），首末步总会写入，且应为 nstcalcenergy 的倍数。注意所有 MD 步长模 nstcalcenergy 的能量总和和波动都会存储在能量文件中，因此即使 nstenergy > 1，gmx energy 也能报告精确的能量均值和波动。',
    defaultValue: '1000',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'nstxout-compressed',
    type: 'integer',
    description: 'number of steps that elapse between writing position coordinates using lossy compression (xtc file), the first and last coordinates are always written, unless 0, which means that there is no compressed coordinates output.',
    descriptionZh: '每隔多少步用有损压缩（xtc 文件）写入坐标，首末步总会写入。为 0 表示不输出压缩坐标。',
    defaultValue: '0',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'compressed-x-precision',
    type: 'real',
    description: 'precision with which to write to the compressed trajectory file',
    descriptionZh: '写入压缩轨迹文件的精度',
    defaultValue: '1000',
    unit: 'real',
    category: 'output-control'
  },
  {
    name: 'compressed-x-grps',
    type: 'string',
    description: 'group(s) to write to the compressed trajectory file, by default the whole system is written (if nstxout-compressed > 0)',
    descriptionZh: '写入压缩轨迹文件的分组，默认写入整个系统（若 nstxout-compressed > 0）',
    defaultValue: 's',
    category: 'output-control'
  },
  {
    name: 'energygrps',
    type: 'string',
    description: 'group(s) for which to write to write short-ranged non-bonded potential energies to the energy file (not supported on GPUs)',
    descriptionZh: '写入能量文件的短程非键合势能分组（GPU 不支持）',
    defaultValue: 's',
    category: 'output-control'
  },

  // 邻居搜索 / Neighbor Searching
  {
    name: 'cutoff-scheme',
    type: 'enum',
    description: 'Generate a pair list with buffering. The buffer size is automatically set based on verlet-buffer-tolerance, unless this is set to -1, in which case rlist will be used.\n\nGenerate a pair list for groups of atoms, corresponding to the charge groups in the topology. This option is no longer supported.',
    descriptionZh: '生成带缓冲的对列表。缓冲区大小基于 verlet-buffer-tolerance 自动设置，除非设置为 -1，在这种情况下将使用 rlist。\n\n为原子组生成对列表，对应于拓扑中的电荷组。此选项不再受支持。',
    defaultValue: 'Verlet',
    validValues: ['Verlet', 'group'],
    category: 'neighbor-searching'
  },
  {
    name: 'nstlist',
    type: 'integer',
    description: 'Interval between steps that update the neighbor list. When dynamics and verlet-buffer-tolerance set, nstlist is actually a minimum value and gmx mdrun might increase it, unless it is set to 1. With parallel simulations and/or non-bonded force calculation on the GPU, a value of 20 or 40 often gives the best performance. With energy minimization this parameter is not used as the pair list is updated when at least one atom has moved by more than half the pair list buffer size.\n\nThe neighbor list is only constructed once and never updated. This is mainly useful for vacuum simulations in which all particles see each other. But vacuum simulations are (temporarily) not supported.\n\nUnused.',
    descriptionZh: '更新邻居列表的步数间隔。当设置了动力学和 verlet-buffer-tolerance 时，nstlist 实际上是最小值，gmx mdrun 可能会增加它，除非设置为 1。对于并行模拟和/或 GPU 上的非键合力计算，值为 20 或 40 通常能提供最佳性能。对于能量最小化，此参数不使用，因为当至少一个原子移动超过对列表缓冲区大小的一半时，对列表会更新。\n\n邻居列表只构建一次，从不更新。这主要用于所有粒子都能看到彼此的真空模拟。但真空模拟（暂时）不受支持。\n\n未使用。',
    defaultValue: '10',
    range: { min: 0, max: 1000000 },
    unit: 'steps',
    category: 'neighbor-searching'
  },
  {
    name: 'pbc',
    type: 'enum',
    description: 'Use periodic boundary conditions in all directions.\n\nUse no periodic boundary conditions, ignore the box. To simulate without cut-offs, set all cut-offs and nstlist to 0. For best performance without cut-offs on a single MPI rank, set nstlist to zero.\n\nUse periodic boundary conditions in x and y directions only. This can be used in combination with walls_. Without walls or with only one wall the system size is infinite in the z direction. Therefore pressure coupling or Ewald summation methods can not be used. These disadvantages do not apply when two walls are used.',
    descriptionZh: '在所有方向使用周期性边界条件。\n\n不使用周期性边界条件，忽略盒子。要在没有截断的情况下模拟，将所有截断和 nstlist 设置为 0。对于单个 MPI 等级上没有截断的最佳性能，将 nstlist 设置为零。\n\n仅在 x 和 y 方向使用周期性边界条件。这可以与壁结合使用。没有壁或只有一个壁时，系统在 z 方向的大小是无限的。因此不能使用压力耦合或 Ewald 求和方法。使用两个壁时这些缺点不适用。',
    defaultValue: 'xyz',
    validValues: ['xyz', 'no', 'xy'],
    category: 'neighbor-searching'
  },
  {
    name: 'periodic-molecules',
    type: 'enum',
    description: 'molecules are finite, fast molecular PBC can be used\n\nfor systems with molecules that couple to themselves through the periodic boundary conditions, this requires a slower PBC algorithm and molecules are not made whole in the output',
    descriptionZh: '分子是有限的，可使用快速分子周期性边界条件（PBC）\n\n对于通过周期性边界条件自耦的分子体系，需要较慢的 PBC 算法，且输出中分子不会被还原为完整结构',
    validValues: ['no', 'yes'],
    category: 'neighbor-searching'
  },
  {
    name: 'verlet-buffer-tolerance',
    type: 'real',
    description: 'Used when performing a simulation with dynamics. This sets the maximum allowed error for pair interactions per particle caused by the Verlet buffer, which indirectly sets rlist. As both nstlist and the Verlet buffer size are fixed (for performance reasons), particle pairs not in the pair list can occasionally get within the cut-off distance during nstlist -1 steps. This causes very small jumps in the energy. In a constant-temperature ensemble, these very small energy jumps can be estimated for a given cut-off and rlist. The estimate assumes a homogeneous particle distribution, hence the errors might be slightly underestimated for multi-phase systems. (See the reference manual for details). For longer pair-list life-time (nstlist -1) * dt the buffer is overestimated, because the interactions between particles are ignored. Combined with cancellation of errors, the actual drift of the total energy is usually one to two orders of magnitude smaller. Note that the generated buffer size takes into account that the Gromacs pair-list setup leads to a reduction in the drift by a factor 10, compared to a simple particle-pair based list. Without dynamics (energy minimization etc.), the buffer is 5% of the cut-off. For NVE simulations the initial temperature is used, unless this is zero, in which case a buffer of 10% is used. For NVE simulations the tolerance usually needs to be lowered to achieve proper energy conservation on the nanosecond time scale. To override the automated buffer setting, use verlet-buffer-tolerance =-1 and set rlist manually.',
    descriptionZh: '用于动力学模拟时，设置每个粒子因 Verlet 缓冲区导致的对相互作用最大允许误差，间接决定 rlist。由于 nstlist 和缓冲区大小都固定，未在对列表中的粒子对有时会在 nstlist-1 步内进入截断距离，导致能量出现极小跳变。在恒温系综下，这些能量跳变可根据截断和 rlist 估算。估算假设粒子均匀分布，多相体系误差可能略小估。对列表寿命越长，缓冲区越大，因忽略了粒子间相互作用。误差抵消后，总能量漂移通常比估算小 1-2 个数量级。Gromacs 的对列表设置可将漂移降低 10 倍。无动力学（如能量最小化）时，缓冲区为截断的 5%。NVE 模拟用初始温度，若为 0 则缓冲区为 10%。NVE 模拟通常需降低容差以保证纳秒尺度能量守恒。要手动设置缓冲区，用 verlet-buffer-tolerance =-1 并手动设 rlist。',
    defaultValue: '0.005',
    unit: 'kJ mol\ ^-1 ps\ ^-1',
    category: 'neighbor-searching'
  },
  {
    name: 'verlet-buffer-pressure-tolerance',
    type: 'real',
    description: 'Used when performing a simulation with dynamics and only active when verlet-buffer-tolerance is positive. This sets the maximum tolerated error in the average pressure due to missing Lennard-Jones interactions of particle pairs that are not in the pair list, but come within rvdw range as the pair list ages. As for the drift tolerance, the (over)estimate of the pressure error is tight at short times. At longer time it turns into a significant overestimate, because interactions limit the displacement of particles. Note that the default tolerance of 0.5 bar corresponds to a maximum relative deviation of the density of liquid water of 2e-5.',
    descriptionZh: '用于动力学模拟，且仅在 verlet-buffer-tolerance 为正时生效。设置因对列表外粒子对进入 rvdw 范围而缺失的 Lennard-Jones 相互作用导致的平均压力最大容许误差。短时间内压力误差估算较准，长时间则高估，因为相互作用限制了粒子位移。默认容差 0.5 bar 对应液态水密度最大相对偏差 2e-5。',
    defaultValue: '0.5',
    unit: 'bar',
    category: 'neighbor-searching'
  },
  {
    name: 'rlist',
    type: 'real',
    description: 'Cut-off distance for the short-range neighbor list. With dynamics, this is by default set by the verlet-buffer-tolerance and verlet-buffer-pressure-tolerance options and the value of rlist is ignored. Without dynamics, this is by default set to the maximum cut-off plus 5% buffer, except for test particle insertion, where the buffer is managed exactly and automatically. For NVE simulations, where the automated setting is not possible, the advised procedure is to run gmx grompp with an NVT setup with the expected temperature and copy the resulting value of rlist to the NVE setup.',
    descriptionZh: '短程邻居列表的截断距离。动力学模拟时默认由 verlet-buffer-tolerance 和 verlet-buffer-pressure-tolerance 决定，rlist 值被忽略。无动力学时默认为最大截断加 5% 缓冲，测试粒子插入则自动精确管理缓冲。NVE 模拟无法自动设置时，建议用 NVT 设置和期望温度运行 gmx grompp，并将结果 rlist 用于 NVE 设置。',
    defaultValue: '1',
    unit: 'nm',
    range: { min: 0 },
    category: 'neighbor-searching'
  },

  // 静电相互作用 / Electrostatics
  {
    name: 'coulombtype',
    type: 'enum',
    description: 'Plain cut-off with pair list radius rlist and Coulomb cut-off rcoulomb, where rlist >= rcoulomb. Note that with the (default) setting of coulomb-modifier =Potential-shift not only the potentials between interacting pairs are shifted to be zero at the cut-off, but the same shift is also applied to excluded pairs. This does not lead to forces between excluded pairs, but does add a constant offset to the total Coulomb potential.\n\nClassical Ewald sum electrostatics. The real-space cut-off rcoulomb should be equal to rlist. Use *e.g.* rlist =0.9, rcoulomb =0.9. The highest magnitude of wave vectors used in reciprocal space is controlled by fourierspacing. The relative accuracy of direct/reciprocal space is controlled by ewald-rtol.\n\nNOTE: Ewald scales as O(N\ ^3/2) and is thus extremely slow for large systems. It is included mainly for reference - in most cases PME will perform much better.\n\nFast smooth Particle-Mesh Ewald (SPME) electrostatics. Direct space is similar to the Ewald sum, while the reciprocal part is performed with FFTs. Grid dimensions are controlled with fourierspacing and the interpolation order with pme-order. With a grid spacing of 0.1 nm and cubic interpolation the electrostatic forces have an accuracy of 2-3*10\ ^-4. Since the error from the vdw-cutoff is larger than this you might try 0.15 nm. When running in parallel the interpolation parallelizes better than the FFT, so try decreasing grid dimensions while increasing interpolation.\n\nParticle-Particle Particle-Mesh algorithm with analytical derivative for for long-range electrostatic interactions. The method and code is identical to SPME, except that the influence function is optimized for the grid. This gives a slight increase in accuracy.\n\nReaction field electrostatics with Coulomb cut-off rcoulomb, where rlist >= rvdw. The dielectric constant beyond the cut-off is epsilon-rf. The dielectric constant can be set to infinity by setting epsilon-rf =0.\n\nCurrently unsupported. gmx mdrun will now expect to find a file table.xvg with user-defined potential functions for repulsion, dispersion and Coulomb. When pair interactions are present, :ref:`gmx mdrun` also expects to find a file tablep.xvg for the pair interactions. When the same interactions should be used for non-bonded and pair interactions the user can specify the same file name for both table files. These files should contain 7 columns: the x value, f(x), -f\'(x), g(x), -g\'(x), h(x), -h\'(x), where f(x) is the Coulomb function, g(x) the dispersion function and h(x) the repulsion function. When vdwtype is not set to User the values for g, -g\', h and -h\' are ignored. For the non-bonded interactions x values should run from 0 to the largest cut-off distance + table-extension and should be uniformly spaced. For the pair interactions the table length in the file will be used. The optimal spacing, which is used for non-user tables, is 0.002 nm when you run in mixed precision or 0.0005 nm when you run in double precision. The function value at x=0 is not important. More information is in the printed manual.\n\nCurrently unsupported. A combination of PME and a switch function for the direct-space part (see above). rcoulomb is allowed to be smaller than rlist.\n\nCurrently unsupported. A combination of PME and user tables (see above). rcoulomb is allowed to be smaller than rlist. The PME mesh contribution is subtracted from the user table by gmx mdrun. Because of this subtraction the user tables should contain about 10 decimal places.\n\nCurrently unsupported. A combination of PME-User and a switching function (see above). The switching function is applied to final particle-particle interaction, *i.e.* both to the user supplied function and the PME Mesh correction part.',
    descriptionZh: '简单截断，对列表半径为 rlist，库仑截断为 rcoulomb，其中 rlist >= rcoulomb。注意，使用（默认）设置 coulomb-modifier=Potential-shift 时，不仅相互作用对之间的势在截断处被移位为零，相同的移位也应用于排除对。这不会导致排除对之间的力，但会为总库仑势添加常数偏移。\n\n经典 Ewald 求和静电学。实空间截断 rcoulomb 应等于 rlist。例如使用 rlist=0.9，rcoulomb=0.9。倒易空间中使用的波矢量的最高幅度由 fourierspacing 控制。直接/倒易空间的相对精度由 ewald-rtol 控制。\n\n注意：Ewald 的标度为 O(N^3/2)，因此对大系统极其缓慢。它主要用于参考 - 在大多数情况下 PME 性能会好得多。\n\n快速平滑粒子网格 Ewald（SPME）静电学。直接空间类似于 Ewald 求和，而倒易部分用 FFT 执行。网格维度由 fourierspacing 控制，插值阶数由 pme-order 控制。使用 0.1 nm 网格间距和三次插值，静电力的精度为 2-3*10^-4。由于 vdw-cutoff 的误差比这更大，您可以尝试 0.15 nm。并行运行时插值比 FFT 并行化更好，因此尝试减少网格维度同时增加插值。\n\n用于长程静电相互作用的粒子-粒子粒子-网格算法，具有解析导数。方法和代码与 SPME 相同，除了影响函数针对网格进行了优化。这略微提高了精度。\n\n反应场静电学，库仑截断为 rcoulomb，其中 rlist >= rvdw。截断之外的介电常数为 epsilon-rf。通过设置 epsilon-rf=0 可以将介电常数设置为无穷大。\n\n目前不支持。gmx mdrun 现在期望找到一个包含用户定义的排斥、色散和库仑势函数的 table.xvg 文件。当存在对相互作用时，gmx mdrun 还期望找到用于对相互作用的 tablep.xvg 文件。当非键合和对相互作用应使用相同相互作用时，用户可以为两个表文件指定相同的文件名。这些文件应包含 7 列：x 值、f(x)、-f\'(x)、g(x)、-g\'(x)、h(x)、-h\'(x)，其中 f(x) 是库仑函数，g(x) 是色散函数，h(x) 是排斥函数。当 vdwtype 未设置为 User 时，g、-g\'、h 和 -h\' 的值被忽略。对于非键合相互作用，x 值应从 0 到最大截断距离 + table-extension，并应均匀间隔。对于对相互作用，将使用文件中的表长度。用于非用户表的最佳间距在混合精度下为 0.002 nm，在双精度下为 0.0005 nm。x=0 处的函数值不重要。更多信息在印刷手册中。\n\n目前不支持。PME 和直接空间部分的开关函数的组合（见上文）。rcoulomb 允许小于 rlist。\n\n目前不支持。PME 和用户表的组合（见上文）。rcoulomb 允许小于 rlist。PME 网格贡献由 gmx mdrun 从用户表中减去。由于这种减法，用户表应包含约 10 位小数。\n\n目前不支持。PME-User 和开关函数的组合（见上文）。开关函数应用于最终粒子-粒子相互作用，即既应用于用户提供的函数，也应用于 PME 网格校正部分。',
    defaultValue: 'PME',
    validValues: ['Cut-off', 'Ewald', 'PME', 'P3M-AD', 'Reaction-Field', 'User', 'PME-Switch', 'PME-User', 'PME-User-Switch'],
    unit: 'nm',
    category: 'electrostatics'
  },
  {
    name: 'rcoulomb',
    type: 'real',
    description: 'The distance for the Coulomb cut-off. Note that with PME this value can be increased by the PME tuning in gmx mdrun along with the PME grid spacing.',
    descriptionZh: '库仑截断的距离。注意，使用 PME 时，此值可以通过 gmx mdrun 中的 PME 调优与 PME 网格间距一起增加。',
    defaultValue: '1',
    unit: 'nm',
    range: { min: 0 },
    category: 'electrostatics'
  },
  {
    name: 'coulomb-modifier',
    type: 'enum',
    description: 'Shift the Coulomb potential by a constant such that it is zero at the cut-off. This makes the potential the integral of the force. Note that this does not affect the forces or the sampling.\n\nUse an unmodified Coulomb potential. This can be useful when comparing energies with those computed with other software.',
    descriptionZh: '将库仑势移位一个常数，使其在截断处为零。这使得势是力的积分。注意，这不会影响力和采样。\n使用未修改的库仑势。这在比较来自其他软件的能量时可能有用。',
    validValues: ['Potential-shift', 'None', 'Potential-shift-Verlet'],
    category: 'electrostatics'
  },
  {
    name: 'rcoulomb-switch',
    type: 'real',
    description: 'where to start switching the Coulomb potential, only relevant when force or potential switching is used',
    descriptionZh: '库仑势切换开始的位置，仅在使用力或势切换时相关',
    defaultValue: '0',
    unit: 'nm',
    category: 'electrostatics'
  },
  {
    name: 'rcoulomb',
    type: 'real',
    description: 'The distance for the Coulomb cut-off. Note that with PME this value can be increased by the PME tuning in gmx mdrun along with the PME grid spacing.',
    descriptionZh: '库仑截断的距离。注意，使用 PME 时，此值可随 gmx mdrun 的 PME 调优和 PME 网格间距一起增大。',
    defaultValue: '1',
    unit: 'nm',
    range: { min: 0 },
    category: 'electrostatics'
  },
  {
    name: 'epsilon-r',
    type: 'string',
    description: 'The relative dielectric constant. A value of 0 means infinity.',
    descriptionZh: '相对介电常数。0 表示无穷大。',
    defaultValue: '1',
    category: 'electrostatics'
  },
  {
    name: 'epsilon-rf',
    type: 'string',
    description: 'The relative dielectric constant of the reaction field. This is only used with reaction-field electrostatics. A value of 0 means infinity.',
    descriptionZh: '反应场的相对介电常数，仅用于反应场静电。0 表示无穷大。',
    defaultValue: '0',
    category: 'electrostatics'
  },

  // 范德华相互作用 / Van der Waals
  {
    name: 'vdwtype',
    type: 'enum',
    description: 'Plain cut-off with pair list radius rlist and VdW cut-off rvdw, where rlist >= rvdw.\n\nFast smooth Particle-mesh Ewald (SPME) for VdW interactions. The grid dimensions are controlled with fourierspacing in the same way as for electrostatics, and the interpolation order is controlled with pme-order. The relative accuracy of direct/reciprocal space is controlled by ewald-rtol-lj, and the specific combination rules that are to be used by the reciprocal routine are set using lj-pme-comb-rule.\n\nThis functionality is deprecated and replaced by using vdwtype=Cut-off with vdw-modifier=Force-switch. The LJ (not Buckingham) potential is decreased over the whole range and the forces decay smoothly to zero between rvdw-switch and rvdw.\n\nThis functionality is deprecated and replaced by using vdwtype=Cut-off with vdw-modifier=Potential-switch. The LJ (not Buckingham) potential is normal out to rvdw-switch, after which it is switched off to reach zero at rvdw. Both the potential and force functions are continuously smooth, but be aware that all switch functions will give rise to a bulge (increase) in the force (since we are switching the potential).\n\nCurrently unsupported. See coulombtype=User for instructions. The function value at zero is not important. When you want to use LJ correction, make sure that rvdw corresponds to the cut-off in the user-defined function. When coulombtype is not set to User the values for the f and -f\' columns are ignored.',
    descriptionZh: '简单截断，对列表半径为 rlist，范德华截断为 rvdw，其中 rlist >= rvdw。\n\n用于范德华相互作用的快速平滑粒子网格 Ewald（SPME）。网格维度以与静电学相同的方式由 fourierspacing 控制，插值阶数由 pme-order 控制。直接/倒易空间的相对精度由 ewald-rtol-lj 控制，倒易例程使用的特定组合规则由 lj-pme-comb-rule 设置。\n\n此功能已弃用，被 vdwtype=Cut-off 与 vdw-modifier=Force-switch 结合使用取代。LJ（非 Buckingham）势能在整个范围内减小，力在 rvdw-switch 和 rvdw 之间平滑衰减为零。\n\n此功能已弃用，被 vdwtype=Cut-off 与 vdw-modifier=Potential-switch 结合使用取代。LJ（非 Buckingham）势能正常至 rvdw-switch，此后被关闭以在 rvdw 处达到零。势能和力函数都是连续平滑的，但要注意所有开关函数都会导致力出现隆起（增加）（因为我们在切换势能）。\n\n目前不支持。请参阅 coulombtype=User 的说明。零处的函数值不重要。当您想使用 LJ 校正时，请确保 rvdw 对应于用户定义函数中的截断。当 coulombtype 未设置为 User 时，f 和 -f\' 列的值被忽略。',
    defaultValue: 'Cut-off',
    validValues: ['Cut-off', 'PME', 'Shift', 'Switch', 'User'],
    category: 'van-der-waals'
  },
  {
    name: 'vdw-modifier',
    type: 'enum',
    description: 'Shift the Van der Waals potential by a constant such that it is zero at the cut-off. This makes the potential the integral of the force. Note that this does not affect the forces or the sampling.\n\nUse an unmodified Van der Waals potential. This can be useful when comparing energies with those computed with other software.\n\nSmoothly switches the forces to zero between rvdw-switch and rvdw. This shifts the potential shift over the whole range and switches it to zero at the cut-off. Note that this is more expensive to calculate than a plain cut-off and it is not required for energy conservation, since Potential-shift conserves energy just as well.\n\nSmoothly switches the potential to zero between rvdw-switch and rvdw. Note that this introduces articifically large forces in the switching region and is much more expensive to calculate. This option should only be used if the force field you are using requires this.',
    descriptionZh: '将范德华势能整体平移，使其在截断处为零。这使得势能成为力的积分。注意，这不会影响力或采样。\n\n使用未修饰的范德华势能。这在与其他软件计算的能量进行比较时很有用。\n\n在 rvdw-switch 和 rvdw 之间平滑地将力切换为零。这会使势能在整个范围内平移，并在截断处切为零。注意，这比普通截断计算更耗时，但对能量守恒不是必须的，因为 Potential-shift 同样能很好地守恒能量。\n\n在 rvdw-switch 和 rvdw 之间平滑地将势能切换为零。注意，这会在切换区引入人为增大的力，且计算更耗时。只有在所用力场要求时才应使用此选项。',
    validValues: ['Potential-shift', 'None', 'Force-switch', 'Potential-switch', 'Potential-shift-Verlet'],
    category: 'van-der-waals'
  },
  {
    name: 'rvdw-switch',
    type: 'real',
    description: 'where to start switching the LJ force and possibly the potential, only relevant when force or potential switching is used',
    descriptionZh: 'LJ 力和可能势能切换的起始位置，仅在使用力或势能切换时相关',
    defaultValue: '0',
    unit: 'nm',
    category: 'van-der-waals'
  },
  {
    name: 'rvdw',
    type: 'real',
    description: 'distance for the LJ or Buckingham cut-off',
    descriptionZh: 'LJ 或 Buckingham 截断的距离',
    defaultValue: '1',
    unit: 'nm',
    range: { min: 0 },
    category: 'van-der-waals'
  },
  {
    name: 'DispCorr',
    type: 'enum',
    description: 'do not apply any correction\n\napply long-range dispersion corrections for Energy and Pressure\n\napply long-range dispersion corrections for Energy only',
    descriptionZh: '不应用任何校正\n\n为能量和压力应用长程色散校正\n\n仅为能量应用长程色散校正',
    validValues: ['no', 'EnerPres', 'Ener'],
    category: 'van-der-waals'
  },

  // 表格 / Tables
  {
    name: 'table-extension',
    type: 'real',
    description: 'Extension of the non-bonded potential lookup tables beyond the largest cut-off distance. With actual non-bonded interactions the tables are never accessed beyond the cut-off. But a longer table length might be needed for the 1-4 interactions, which are always tabulated irrespective of the use of tables for the non-bonded interactions.',
    descriptionZh: '非键合势能查找表超出最大截断距离的扩展。对于实际非键合相互作用，表永远不会在截断之外被访问。但对于 1-4 相互作用，可能需要更长的表长度，这些相互作用总是被制表，无论是否对非键合相互作用使用表。',
    defaultValue: '1',
    unit: 'nm',
    category: 'tables'
  },
  {
    name: 'energygrp-table',
    type: 'real',
    description: 'Currently unsupported. When user tables are used for electrostatics and/or VdW, here one can give pairs of energy groups for which separate user tables should be used. The two energy groups will be appended to the table file name, in order of their definition in energygrps, separated by underscores. For example, if ``energygrps = Na Cl Sol and energygrp-table = Na Na Na Cl``, gmx mdrun will read table_Na_Na.xvg and table_Na_Cl.xvg in addition to the normal table.xvg which will be used for all other energy group pairs.',
    descriptionZh: '目前不支持。当对静电学和/或 VdW 使用用户表时，这里可以给出需要使用单独用户表的能量组对。两个能量组将按其在 energygrps 中的定义顺序附加到表文件名，用下划线分隔。例如，如果 energygrps = Na Cl Sol 且 energygrp-table = Na Na Na Cl，gmx mdrun 将读取 table_Na_Na.xvg 和 table_Na_Cl.xvg 以及正常的 table.xvg，后者用于所有其他能量组对。',
    category: 'tables'
  },

  // Ewald求和 / Ewald
  {
    name: 'fourierspacing',
    type: 'real',
    description: 'For ordinary Ewald, the ratio of the box dimensions and the spacing determines a lower bound for the number of wave vectors to use in each (signed) direction. For PME and P3M, that ratio determines a lower bound for the number of Fourier-space grid points that will be used along that axis. In all cases, the number for each direction can be overridden by entering a non-zero value for that fourier-nx direction. For optimizing the relative load of the particle-particle interactions and the mesh part of PME, it is useful to know that the accuracy of the electrostatics remains nearly constant when the Coulomb cut-off and the PME grid spacing are scaled by the same factor. Note that this spacing can be scaled up along with rcoulomb by the PME tuning in gmx mdrun.',
    defaultValue: '0.12',
    unit: 'nm',
    range: { min: 0.05, max: 0.5 },
    category: 'ewald'
  },
  {
    name: 'fourier-nx',
    type: 'integer',
    description: '',
    descriptionZh: '',
    category: 'ewald'
  },
  {
    name: 'fourier-ny',
    type: 'integer',
    description: '',
    descriptionZh: '',
    category: 'ewald'
  },
  {
    name: 'fourier-nz',
    type: 'integer',
    description: 'Highest magnitude of wave vectors in reciprocal space when using Ewald. Grid size when using PME or P3M. These values override fourierspacing per direction. The best choice is powers of 2, 3, 5 and 7. Avoid large primes. Note that these grid sizes can be reduced along with scaling up rcoulomb by the PME tuning in gmx mdrun.',
    descriptionZh: '使用 Ewald 时倒易空间中波矢量的最高幅度。使用 PME 或 P3M 时的网格大小。这些值按方向覆盖 fourierspacing。最佳选择是 2、3、5 和 7 的幂。避免大质数。注意，这些网格大小可以随 rcoulomb 的放大而减小，由 gmx mdrun 中的 PME 调优实现。',
    category: 'ewald'
  },
  {
    name: 'pme-order',
    type: 'integer',
    description: 'The number of grid points along a dimension to which a charge is mapped. The actual order of the PME interpolation is one less, e.g. the default of 4 gives cubic interpolation. Supported values are 3 to 12 (max 8 for P3M-AD). When running in parallel, it can be worth to switch to 5 and simultaneously increase the grid spacing. Note that on the CPU only values 4 and 5 have SIMD acceleration and GPUs only support the value 4.',
    descriptionZh: '将电荷映射到维度上的网格点数。实际 PME 插值阶数比此少 1，例如默认的 4 给出三次插值。支持的值为 3 到 12（P3M-AD 最大 8）。并行运行时，增加网格间距同时切换到 5 可能值得。注意，在 CPU 上只有值 4 和 5 有 SIMD 加速，GPU 只支持值 4。',
    defaultValue: '4',
    range: { min: 3, max: 12 },
    category: 'ewald'
  },
  {
    name: 'ewald-rtol',
    type: 'string',
    description: 'The relative strength of the Ewald-shifted direct potential at rcoulomb is given by ewald-rtol. Decreasing this will give a more accurate direct sum, but then you need more wave vectors for the reciprocal sum.',
    descriptionZh: 'Ewald 移位直接势在 rcoulomb 处的相对强度由 ewald-rtol 给出。减小此值将给出更准确的直接和，但随后需要更多波矢进行倒数和。',
    defaultValue: '10\ ^-5',
    category: 'ewald'
  },
  {
    name: 'ewald-rtol-lj',
    type: 'string',
    description: 'When doing PME for VdW-interactions, ewald-rtol-lj is used to control the relative strength of the dispersion potential at rvdw in the same way as ewald-rtol controls the electrostatic potential.',
    descriptionZh: '对于 VdW 相互作用进行 PME 时，ewald-rtol-lj 以与 ewald-rtol 控制静电势相同的方式控制色散势在 rvdw 处的相对强度。',
    defaultValue: '10\ ^-3',
    category: 'ewald'
  },
  {
    name: 'lj-pme-comb-rule',
    type: 'enum',
    description: 'The combination rules used to combine VdW-parameters in the reciprocal part of LJ-PME. Geometric rules are much faster than Lorentz-Berthelot and usually the recommended choice, even when the rest of the force field uses the Lorentz-Berthelot rules.\n\nApply geometric combination rules\n\nApply Lorentz-Berthelot combination rules',
    descriptionZh: 'LJ-PME 倒数部分中组合 VdW 参数的组合规则。几何规则快得多，Lorentz-Berthelot 通常是推荐选择，即使力场的其余部分使用 Lorentz-Berthelot 规则。应用几何组合规则应用 Lorentz-Berthelot 组合规则',
    defaultValue: 'Geometric',
    validValues: ['Geometric', 'Lorentz-Berthelot'],
    category: 'ewald'
  },
  {
    name: 'ewald-geometry',
    type: 'enum',
    description: 'The Ewald sum is performed in all three dimensions.\n\nThe reciprocal sum is still performed in 3D, but a force and potential correction applied in the z dimension to produce a pseudo-2D summation. If your system has a slab geometry in the x-y plane you can try to increase the z-dimension of the box (a box height of 3 times the slab height is usually ok) and use this option.',
    descriptionZh: 'Ewald 和在所有三个维度中执行。倒数和仍在 3D 中执行，但应用力势和势校正以在 z 维度中产生伪 2D 求和。如果您的系统在 x-y 平面中有板几何，您可以尝试增加盒子的 z 维度（板高度的 3 倍通常可以）。',
    validValues: ['3d', '3dc'],
    category: 'ewald'
  },
  {
    name: 'epsilon-surface',
    type: 'integer',
    description: 'This controls the dipole correction to the Ewald summation in 3D. The default value of zero means it is turned off. Turn it on by setting it to the value of the relative permittivity of the imaginary surface around your infinite system. Be careful - you should not use this if you have free mobile charges in your system. This value does not affect the slab 3DC variant of the long-range corrections.',
    category: 'ewald'
  },

  // 温度耦合 / Temperature Coupling
  {
    name: 'ensemble-temperature-setting',
    type: 'enum',
    description: 'With this setting gmx grompp will determine which of the next three settings is available and choose the appropriate one. When all atoms are coupled to a temperature bath with the same temperature, a constant ensemble temperature is chosen and the value is taken from the temperature bath.\n\nThe system has a constant ensemble temperature given by ensemble-temperature. A constant ensemble temperature is required for certain sampling algorithms such as AWH.\n\nThe system has a variable ensemble temperature due to simulated annealing or simulated tempering. The system ensemble temperature is set dynamically during the simulation.\n\nThe system has no ensemble temperature.',
    descriptionZh: '使用此设置，gmx grompp 将确定接下来三个设置中哪个可用并选择适当的设置。当所有原子都耦合到具有相同温度的温度浴时，选择恒定系综温度，值取自温度浴。\n\n系统具有由 ensemble-temperature 给出的恒定系综温度。某些采样算法（如 AWH）需要恒定的系综温度。\n\n由于模拟退火或模拟回火，系统具有可变的系综温度。系统系综温度在模拟过程中动态设置。\n\n系统没有系综温度。',
    validValues: ['auto', 'constant', 'variable', 'not-available'],
    category: 'temperature-coupling'
  },
  {
    name: 'ensemble-temperature',
    type: 'real',
    description: 'The ensemble temperature for the system. The input value is only used with ensemble-temperature-setting=constant. By default the ensemble temperature is copied from the temperature of the thermal bath (when used).',
    descriptionZh: '系统的系综温度。输入值仅在 ensemble-temperature-setting=constant 时使用。默认情况下，系综温度从热浴的温度复制（当使用时）。',
    defaultValue: '-1',
    unit: 'K',
    category: 'temperature-coupling'
  },
  {
    name: 'tcoupl',
    type: 'enum',
    description: 'No temperature coupling.\n\nTemperature coupling with a Berendsen thermostat to a bath with temperature ref-t, with time constant tau-t. Several groups can be coupled separately, these are specified in the tc-grps field separated by spaces. This is a historical thermostat needed to be able to reproduce previous simulations, but we strongly recommend not to use it for new production runs. Consult the manual for details.\n\nTemperature coupling using a Nose-Hoover extended ensemble. The reference temperature and coupling groups are selected as above, but in this case tau-t controls the period of the temperature fluctuations at equilibrium, which is slightly different from a relaxation time. For NVT simulations the conserved energy quantity is written to the energy and log files.\n\nTemperature coupling by randomizing a fraction of the particle velocities at each timestep. Reference temperature and coupling groups are selected as above. tau-t is the average time between randomization of each molecule. Inhibits particle dynamics somewhat, but has little or no ergodicity issues. Currently only implemented with velocity Verlet, and not implemented with constraints.\n\nTemperature coupling by randomizing velocities of all particles at infrequent timesteps. Reference temperature and coupling groups are selected as above. tau-t is the time between randomization of all molecules. Inhibits particle dynamics somewhat, but has little or no ergodicity issues. Currently only implemented with velocity Verlet.\n\nTemperature coupling using velocity rescaling with a stochastic term (JCP 126, 014101). This thermostat is similar to Berendsen coupling, with the same scaling using tau-t, but the stochastic term ensures that a proper canonical ensemble is generated. The random seed is set with ld-seed. This thermostat works correctly even for tau-t =0. For NVT simulations the conserved energy quantity is written to the energy and log file.',
    descriptionZh: '无温度耦合。\n\n使用 Berendsen 恒温器进行温度耦合，耦合到温度为 ref-t 的浴，时间常数为 tau-t。可以单独耦合几个组，这些组在 tc-grps 字段中用空格分隔指定。这是一个历史恒温器，需要能够重现以前的模拟，但我们强烈建议不要将其用于新的生产运行。详情请参阅手册。\n\n使用 Nose-Hoover 扩展系综进行温度耦合。参考温度和耦合组的选择如上所述，但在这种情况下，tau-t 控制平衡时温度波动的周期，这与弛豫时间略有不同。对于 NVT 模拟，守恒能量量写入能量和日志文件。\n\n通过在每个时间步随机化粒子速度的一部分进行温度耦合。参考温度和耦合组的选择如上所述。tau-t 是每个分子随机化之间的平均时间。在一定程度上抑制粒子动力学，但几乎没有遍历性问题。目前仅在速度 Verlet 中实现，未在约束中实现。\n\n通过在不频繁的时间步随机化所有粒子的速度进行温度耦合。参考温度和耦合组的选择如上所述。tau-t 是所有分子随机化之间的时间。在一定程度上抑制粒子动力学，但几乎没有遍历性问题。目前仅在速度 Verlet 中实现。\n\n使用带随机项的速度重标进行温度耦合（JCP 126, 014101）。此恒温器类似于 Berendsen 耦合，使用 tau-t 进行相同的标度，但随机项确保生成适当的正则系综。随机种子用 ld-seed 设置。即使对于 tau-t=0，此恒温器也能正确工作。对于 NVT 模拟，守恒能量量写入能量和日志文件。',
    defaultValue: 'no',
    validValues: ['no', 'berendsen', 'nose-hoover', 'andersen', 'andersen-massive', 'v-rescale'],
    category: 'temperature-coupling'
  },
  {
    name: 'tc-grps',
    type: 'string',
    description: 'groups to couple to separate temperature baths',
    descriptionZh: '要耦合到单独温度浴的组',
    category: 'temperature-coupling'
  },
  {
    name: 'tau-t',
    type: 'string',
    description: '[ps] time constant for coupling (one for each group in tc-grps), -1 means no temperature coupling',
    descriptionZh: '[ps] 耦合的时间常数（tc-grps 中每个组一个），-1 表示无温度耦合',
    category: 'temperature-coupling'
  },
  {
    name: 'ref-t',
    type: 'string',
    description: '[K] reference temperature for coupling (one for each group in tc-grps)',
    descriptionZh: '[K] 耦合的参考温度（tc-grps 中每个组一个）',
    category: 'temperature-coupling'
  },
  {
    name: 'nsttcouple',
    type: 'integer',
    description: 'The interval between steps that couple the temperature. The default value of -1 sets nsttcouple equal to 100, or fewer steps if required for accurate integration (5 steps per tau for first order coupling, 20 steps per tau for second order coupling). Note that the default value is large in order to reduce the overhead of the additional computation and communication required for obtaining the kinetic energy. For velocity Verlet integrators nsttcouple is set to 1.',
    descriptionZh: '耦合温度的步数间隔。默认值 -1 将 nsttcouple 设置为 100，或根据准确积分需要更少的步数（第一阶耦合每 tau 5 步，第二阶耦合每 tau 20 步）。注意，默认值很大，以减少获得动能所需的额外计算和通信开销。对于速度 Verlet 积分器，nsttcouple 设置为 1。',
    defaultValue: '-1',
    category: 'temperature-coupling'
  },
  {
    name: 'nh-chain-length',
    type: 'integer',
    description: 'The number of chained Nose-Hoover thermostats for velocity Verlet integrators, the leap-frog integrator=md integrator only supports 1. Data for the NH chain variables is not printed to the edr file by default, but can be turned on with the print-nose-hoover-chain-variables option.',
    descriptionZh: '速度 Verlet 积分器的链式 Nose-Hoover 恒温器的数量，蛙跳积分器 integrator=md 只支持 1。Nose-Hoover 链变量的数据默认不写入 edr 文件，但可以使用 print-nose-hoover-chain-variables 选项打开。',
    defaultValue: '10',
    category: 'temperature-coupling'
  },
  {
    name: 'print-nose-hoover-chain-variables',
    type: 'enum',
    description: 'Do not store Nose-Hoover chain variables in the energy file.\n\nStore all positions and velocities of the Nose-Hoover chain in the energy file.',
    descriptionZh: '不要将 Nose-Hoover 链变量存储在能量文件中。将 Nose-Hoover 链的所有位置和速度存储在能量文件中。',
    validValues: ['no', 'yes'],
    category: 'temperature-coupling'
  },
  {
    name: 'tc-grps',
    type: 'string',
    description: 'groups to couple to separate temperature baths',
    descriptionZh: '耦合到单独温度浴的组',
    category: 'temperature-coupling'
  },
  {
    name: 'tau-t',
    type: 'string',
    description: '[ps] time constant for coupling (one for each group in tc-grps), -1 means no temperature coupling',
    descriptionZh: '[ps] 耦合时间常数（tc-grps 中每个组一个），-1 表示无温度耦合',
    category: 'temperature-coupling'
  },
  {
    name: 'ref-t',
    type: 'string',
    description: '[K] reference temperature for coupling (one for each group in tc-grps)',
    category: 'temperature-coupling'
  },

  // 压力耦合 / Pressure Coupling
  {
    name: 'pcoupl',
    type: 'enum',
    description: 'No pressure coupling. This means a fixed box size.\n\nExponential relaxation pressure coupling with time constant tau-p. The box is scaled every nstpcouple steps. This barostat does not yield a correct thermodynamic ensemble; it is only included to be able to reproduce previous runs, and we strongly recommend against using it for new simulations. See the manual for details.\n\nExponential relaxation pressure coupling with time constant tau-p, including a stochastic term to enforce correct volume fluctuations.  The box is scaled every nstpcouple steps. It can be used for both equilibration and production.\n\nExtended-ensemble pressure coupling where the box vectors are subject to an equation of motion. The equation of motion for the atoms is coupled to this. No instantaneous scaling takes place. As for Nose-Hoover temperature coupling the time constant tau-p is the period of pressure fluctuations at equilibrium. This is a good method when you want to apply pressure scaling during data collection, but beware that you can get very large oscillations if you are starting from a different pressure. For simulations where the exact fluctations of the NPT ensemble are important, or if the pressure coupling time is very short, it may not be appropriate, as the previous time step pressure is used in some steps of the Gromacs implementation for the current time step pressure.\n\nMartyna-Tuckerman-Tobias-Klein implementation, only useable with integrator=md-vv or integrator=md-vv-avek, very similar to Parrinello-Rahman. As for Nose-Hoover temperature coupling the time constant tau-p is the period of pressure fluctuations at equilibrium. This is probably a better method when you want to apply pressure scaling during data collection, but beware that you can get very large oscillations if you are starting from a different pressure. This requires a constant ensemble temperature for the system. It only supports isotropic scaling, and only works without constraints. MTTK coupling is deprecated.',
    descriptionZh: '无压力耦合。这意味着固定的盒子大小。\n\n具有时间常数 tau-p 的指数弛豫压力耦合。盒子每 nstpcouple 步缩放一次。此恒压器不产生正确的热力学系综；它仅用于能够重现以前的运行，我们强烈建议不要将其用于新的模拟。详情请参阅手册。\n\n具有时间常数 tau-p 的指数弛豫压力耦合，包括随机项以强制正确的体积波动。盒子每 nstpcouple 步缩放一次。它可用于平衡和生产。\n\n扩展系综压力耦合，其中盒子矢量受运动方程约束。原子的运动方程与此耦合。不发生瞬时缩放。对于 Nose-Hoover 温度耦合，时间常数 tau-p 是平衡时压力波动的周期。当您想在数据收集期间应用压力缩放时，这是一个好方法，但要注意，如果从不同压力开始，可能会得到非常大的振荡。对于 NPT 系综的精确波动很重要的模拟，或者如果压力耦合时间很短，可能不合适，因为在 Gromacs 实现的某些步骤中，前一时间步的压力用于当前时间步的压力。\n\nMartyna-Tuckerman-Tobias-Klein 实现，仅可与 integrator=md-vv 或 integrator=md-vv-avek 一起使用，与 Parrinello-Rahman 非常相似。对于 Nose-Hoover 温度耦合，时间常数 tau-p 是平衡时压力波动的周期。当您想在数据收集期间应用压力缩放时，这可能是更好的方法，但要注意，如果从不同压力开始，可能会得到非常大的振荡。这需要系统的恒定系综温度。它仅支持各向同性缩放，并且仅在没有约束的情况下工作。MTTK 耦合已弃用。',
    defaultValue: 'no',
    validValues: ['no', 'Berendsen', 'C-rescale', 'Parrinello-Rahman', 'MTTK'],
    category: 'pressure-coupling'
  },
  {
    name: 'pcoupltype',
    type: 'enum',
    description: 'Specifies the kind of isotropy of the pressure coupling used. Each kind takes one or more values for compressibility and ref-p. Only a single value is permitted for tau-p.\n\nIsotropic pressure coupling with time constant tau-p. One value each for compressibility and ref-p is required.\n\nPressure coupling which is isotropic in the x and y direction, but different in the z direction. This can be useful for membrane simulations. Two values each for compressibility and ref-p are required, for x/y and z directions respectively.\n\nSame as before, but 6 values are needed for xx, yy, zz, xy/yx, xz/zx and yz/zy components, respectively. When the off-diagonal compressibilities are set to zero, a rectangular box will stay rectangular. Beware that anisotropic scaling can lead to extreme deformation of the simulation box.\n\nSurface tension coupling for surfaces parallel to the xy-plane. Uses normal pressure coupling for the z-direction, while the surface tension is coupled to the x/y dimensions of the box. The first ref-p value is the reference surface tension times the number of surfaces bar nm, the second value is the reference z-pressure bar. The two compressibility values are the compressibility in the x/y and z direction respectively. The value for the z-compressibility should be reasonably accurate since it influences the convergence of the surface-tension, it can also be set to zero to have a box with constant height.',
    descriptionZh: '指定所使用的压力耦合的各向同性类型。每种类型需要一个或多个压缩性和 ref-p 值。tau-p 只允许单个值。\n\n具有时间常数 tau-p 的各向同性压力耦合。压缩性和 ref-p 各需要一个值。\n\n在 x 和 y 方向各向同性但在 z 方向不同的压力耦合。这对膜模拟很有用。压缩性和 ref-p 各需要两个值，分别用于 x/y 和 z 方向。\n\n与之前相同，但需要 6 个值，分别用于 xx、yy、zz、xy/yx、xz/zx 和 yz/zy 分量。当非对角压缩性设置为零时，矩形盒子将保持矩形。注意各向异性缩放可能导致模拟盒子的极端变形。\n\n用于平行于 xy 平面的表面的表面张力耦合。对 z 方向使用正常压力耦合，而表面张力耦合到盒子的 x/y 维度。第一个 ref-p 值是参考表面张力乘以表面数 bar nm，第二个值是参考 z 压力 bar。两个压缩性值分别是 x/y 和 z 方向的压缩性。z 压缩性的值应该相当准确，因为它影响表面张力的收敛，也可以设置为零以获得恒定高度的盒子。',
    validValues: ['isotropic', 'semiisotropic', 'anisotropic', 'surface-tension'],
    unit: 'nm',
    category: 'pressure-coupling'
  },
  {
    name: 'tau-p',
    type: 'string',
    description: 'The time constant for pressure coupling (one value for all directions).',
    descriptionZh: '压力耦合的时间常数（所有方向一个值）。',
    category: 'pressure-coupling'
  },
  {
    name: 'ref-p',
    type: 'real',
    description: '[bar] The reference pressure for coupling. The number of required values is implied by pcoupltype.',
    descriptionZh: '[bar] 耦合的参考压力。所需值的数量由 pcoupltype 决定。',
    unit: 'bar',
    category: 'pressure-coupling'
  },
  {
    name: 'nstpcouple',
    type: 'integer',
    description: 'The interval between steps that couple the pressure. The default value of -1 sets nstpcouple equal to 100, or fewer steps if required for accurate integration (5 steps per tau for first order coupling, 20 steps per tau for second order coupling). Note that the default value is large in order to reduce the overhead of the additional computation and communication required for obtaining the virial and kinetic energy. For velocity Verlet integrators nsttcouple is set to 1.',
    descriptionZh: '耦合压力的步数间隔。默认值 -1 将 nstpcouple 设置为 100，或根据准确积分需要更少的步数（第一阶耦合每 tau 5 步，第二阶耦合每 tau 20 步）。注意，默认值很大，以减少获得维里和动能所需的额外计算和通信开销。对于速度 Verlet 积分器，nsttcouple 设置为 1。',
    defaultValue: '-1',
    category: 'pressure-coupling'
  },
  {
    name: 'tau-p',
    type: 'string',
    description: 'The time constant for pressure coupling (one value for all directions).',
    descriptionZh: '压力耦合的时间常数。',
    category: 'pressure-coupling'
  },
  {
    name: 'compressibility',
    type: 'integer',
    description: '[bar\ ^-1] The compressibility (NOTE: this is now really in bar\ ^-1) For water at 1 atm and 300 K the compressibility is 4.5e-5 bar\ ^-1. The number of required values is implied by pcoupltype.',
    descriptionZh: '[bar^-1] 压缩率（注意：这现在真的是 bar^-1）。对于 1 atm 和 300 K 的水，压缩率为 4.5e-5 bar^-1。所需值的数量由 pcoupltype 隐含。',
    unit: 'bar\ ^-1',
    category: 'pressure-coupling'
  },
  {
    name: 'ref-p',
    type: 'real',
    description: '[bar] The reference pressure for coupling. The number of required values is implied by pcoupltype.',
    descriptionZh: '[bar] 耦合的参考压力。所需值的数量由 pcoupltype 隐含。',
    unit: 'bar',
    category: 'pressure-coupling'
  },
  {
    name: 'refcoord-scaling',
    type: 'enum',
    description: 'The reference coordinates for position restraints are not modified. Note that with this option the virial and pressure might be ill defined, see here <reference-manual-position-restraints> for more details.\n\nThe reference coordinates are scaled with the scaling matrix of the pressure coupling.\n\nScale the center of mass of the reference coordinates with the scaling matrix of the pressure coupling. The vectors of each reference coordinate to the center of mass are not scaled. Only one COM is used, even when there are multiple molecules with position restraints. For calculating the COM of the reference coordinates in the starting configuration, periodic boundary conditions are not taken into account. Note that with this option the virial and pressure might be ill defined, see here <reference-manual-position-restraints> for more details.',
    descriptionZh: '位置约束的参考坐标不被修改。请注意，使用此选项时，维里和压力可能不合理，见位置约束参考手册 <reference-manual-position-restraints> 以获取更多细节。用压力耦合的缩放矩阵缩放参考坐标的质心。用压力耦合的缩放矩阵缩放每个参考坐标到质心的向量，但不缩放向量。如果有多个具有位置约束的分子，只使用一个 COM 用于计算起始构象中参考坐标的 COM。如果使用此选项，维里和压力可能不合理，见位置约束参考手册 <reference-manual-position-restraints> 以获取更多细节。',
    validValues: ['no', 'all', 'com'],
    category: 'pressure-coupling'
  },

  // 模拟退火 / Simulated Annealing
  {
    name: 'annealing',
    type: 'enum',
    description: 'Type of annealing for each temperature group\n\nNo simulated annealing - just couple to reference temperature value.\n\nA single sequence of annealing points. If your simulation is longer than the time of the last point, the temperature will be coupled to this constant value after the annealing sequence has reached the last time point.\n\nThe annealing will start over at the first reference point once the last reference time is reached. This is repeated until the simulation ends.',
    validValues: ['no', 'single', 'periodic'],
    category: 'simulated-annealing'
  },
  {
    name: 'annealing-npoints',
    type: 'integer',
    description: 'A list with the number of annealing reference/control points used for each temperature group. Use 0 for groups that are not annealed. The number of entries should equal the number of temperature groups.',
    descriptionZh: '用于每个温度组的退火参考/控制点的数量列表。为未退火的组使用 0。条目数量应等于温度组的数量。',
    category: 'simulated-annealing'
  },
  {
    name: 'annealing-time',
    type: 'integer',
    description: 'List of times at the annealing reference/control points for each group. If you are using periodic annealing, the times will be used modulo the last value, *i.e.* if the values are 0, 5, 10, and 15, the coupling will restart at the 0ps value after 15ps, 30ps, 45ps, etc. The number of entries should equal the sum of the numbers given in annealing-npoints.',
    descriptionZh: '每个组的退火参考/控制点的时间列表。如果使用周期性退火，时间将模最后值使用，即如果值为 0、5、10 和 15，则耦合将在 15ps 后重新开始，30ps、45ps 等。条目数量应等于 annealing-npoints 中给定的数字总和。',
    category: 'simulated-annealing'
  },
  {
    name: 'annealing-temp',
    type: 'real',
    description: 'List of temperatures at the annealing reference/control points for each group. The number of entries should equal the sum of the numbers given in annealing-npoints.',
    descriptionZh: '每个组的退火参考/控制点的温度列表。条目数量应等于 annealing-npoints 中给定的数字总和。',
    category: 'simulated-annealing'
  },

  // 速度生成 / Velocity Generation
  {
    name: 'gen-vel',
    type: 'enum',
    description: 'Do not generate velocities. The velocities are set to zero when there are no velocities in the input structure file.\n\nGenerate velocities in gmx grompp according to a Maxwell distribution at temperature gen-temp, with random seed gen-seed. This is only meaningful with integrator=md.',
    defaultValue: 'no',
    validValues: ['no', 'yes'],
    category: 'velocity-generation'
  },
  {
    name: 'gen-temp',
    type: 'real',
    description: 'temperature for Maxwell distribution',
    descriptionZh: 'Maxwell 分布的温度',
    defaultValue: '300',
    unit: 'K',
    category: 'velocity-generation'
  },
  {
    name: 'gen-seed',
    type: 'integer',
    description: 'used to initialize random generator for random velocities, when gen-seed is set to -1, a pseudo random seed is used.',
    defaultValue: '-1',
    unit: 'integer',
    category: 'velocity-generation'
  },

  // 键参数 / Bonds
  {
    name: 'constraints',
    type: 'enum',
    description: 'Controls which bonds in the topology will be converted to rigid holonomic constraints. Note that typical rigid water models do not have bonds, but rather a specialized [settles] directive, so are not affected by this keyword.\n\nNo bonds converted to constraints.\n\nConvert the bonds with H-atoms to constraints.\n\nConvert all bonds to constraints.\n\nConvert all bonds to constraints and convert the angles that involve H-atoms to bond-constraints.\n\nConvert all bonds to constraints and all angles to bond-constraints.',
    descriptionZh: '控制拓扑中哪些键将转换为刚性完整约束。注意典型的刚性水模型没有键，而是有专门的 [settles] 指令，因此不受此关键字影响。\n\n不将键转换为约束。\n\n将含 H 原子的键转换为约束。\n\n将所有键转换为约束。\n\n将所有键转换为约束，并将涉及 H 原子的角度转换为键约束。\n\n将所有键转换为约束，并将所有角度转换为键约束。',
    defaultValue: 'none',
    validValues: ['none', 'h-bonds', 'all-bonds', 'h-angles', 'all-angles', 'hbonds'],
    unit: 'settles',
    category: 'bonds'
  },
  {
    name: 'constraint-algorithm',
    type: 'enum',
    description: 'Chooses which solver satisfies any non-SETTLE holonomic constraints.\n\nLINear Constraint Solver. With domain decomposition the parallel version P-LINCS is used. The accuracy in set with lincs-order, which sets the number of matrices in the expansion for the matrix inversion. After the matrix inversion correction the algorithm does an iterative correction to compensate for lengthening due to rotation. The number of such iterations can be controlled with lincs-iter. The root mean square relative constraint deviation is printed to the log file every nstlog steps. If a bond rotates more than lincs-warnangle in one step, a warning will be printed both to the log file and to stderr. LINCS should not be used with coupled angle constraints.\n\nSHAKE is slightly slower and less stable than LINCS, but does work with angle constraints. The relative tolerance is set with shake-tol, 0.0001 is a good value for "normal" MD. SHAKE does not support constraints between atoms on different decomposition domains, so it can only be used with domain decomposition when so-called update-groups are used, which is usually the case when only bonds involving hydrogens are constrained. SHAKE can not be used with energy minimization.',
    descriptionZh: '选择满足任何非 SETTLE 完整约束的求解器。\n\n线性约束求解器。使用域分解时使用并行版本 P-LINCS。精度通过 lincs-order 设置，它设置矩阵求逆展开中的矩阵数量。矩阵求逆校正后，算法进行迭代校正以补偿由于旋转引起的伸长。此类迭代的次数可通过 lincs-iter 控制。均方根相对约束偏差每 nstlog 步打印到日志文件。如果键在一步中旋转超过 lincs-warnangle，将向日志文件和 stderr 打印警告。LINCS 不应与耦合角约束一起使用。\n\nSHAKE 比 LINCS 稍慢且不太稳定，但确实适用于角约束。相对容差用 shake-tol 设置，0.0001 是"正常"MD 的好值。SHAKE 不支持不同分解域上原子之间的约束，因此只能在使用所谓的更新组时与域分解一起使用，这通常是仅约束涉及氢的键的情况。SHAKE 不能用于能量最小化。',
    validValues: ['LINCS', 'SHAKE'],
    category: 'bonds'
  },
  {
    name: 'lincs-order',
    type: 'integer',
    description: 'Highest order in the expansion of the constraint coupling matrix. When constraints form triangles, an additional expansion of the same order is applied on top of the normal expansion only for the couplings within such triangles. For "normal" MD simulations an order of 4 usually suffices, 6 is needed for large time-steps with virtual sites or BD. For accurate energy minimization in double precision an order of 8 or more might be required. Note that in single precision an order higher than 6 will often lead to worse accuracy due to amplification of rounding errors. With domain decomposition, the cell size is limited by the distance spanned by lincs-order +1 constraints. When one wants to scale further than this limit, one can decrease lincs-order and increase lincs-iter, since the accuracy does not deteriorate when (1+ lincs-iter )* lincs-order remains constant.',
    descriptionZh: '约束耦合矩阵展开中的最高阶数。当约束形成三角形时，仅对此类三角形内的耦合在正常展开之上应用相同阶数的额外展开。对于"正常"MD 模拟，阶数 4 通常足够，对于具有虚拟位点或 BD 的大时间步长需要 6。对于双精度的准确能量最小化，可能需要 8 或更高的阶数。注意在单精度中，高于 6 的阶数通常会由于舍入误差的放大而导致更差的精度。使用域分解时，单元大小受 lincs-order +1 约束跨越的距离限制。当想要超出此限制进行缩放时，可以减少 lincs-order 并增加 lincs-iter，因为当 (1+ lincs-iter )* lincs-order 保持常数时精度不会恶化。',
    defaultValue: '4',
    category: 'bonds'
  },
  {
    name: 'lincs-iter',
    type: 'integer',
    description: 'Number of iterations to correct for rotational lengthening in LINCS. For normal runs a single step is sufficient, but for NVE runs where you want to conserve energy accurately or for accurate energy minimization in double precision you might want to increase it to 2. Note that in single precision using more than 1 iteration will often lead to worse accuracy due to amplification of rounding errors.',
    descriptionZh: 'LINCS 中校正旋转伸长的迭代次数。对于正常运行，单步就足够了，但对于想要准确守恒能量的 NVE 运行或双精度的准确能量最小化，您可能想将其增加到 2。注意在单精度中使用超过 1 次迭代通常会由于舍入误差的放大而导致更差的精度。',
    defaultValue: '1',
    category: 'bonds'
  },
  {
    name: 'continuation',
    type: 'enum',
    description: 'This option was formerly known as unconstrained-start.\n\napply constraints to the start configuration and reset shells\n\ndo not apply constraints to the start configuration and do not reset shells, useful for exact continuation and reruns',
    descriptionZh: '此选项以前称为 unconstrained-start。应用约束到起始构象并重置壳不要应用约束到起始构象也不重置壳，对精确延续和重运行有用',
    defaultValue: 'no',
    validValues: ['no', 'yes'],
    category: 'bonds'
  },
  {
    name: 'shake-tol',
    type: 'string',
    description: 'relative tolerance for SHAKE',
    descriptionZh: 'SHAKE 的相对容差',
    defaultValue: '0.0001',
    category: 'bonds'
  },
  {
    name: 'lincs-order',
    type: 'integer',
    description: 'Highest order in the expansion of the constraint coupling matrix. When constraints form triangles, an additional expansion of the same order is applied on top of the normal expansion only for the couplings within such triangles. For "normal" MD simulations an order of 4 usually suffices, 6 is needed for large time-steps with virtual sites or BD. For accurate energy minimization in double precision an order of 8 or more might be required. Note that in single precision an order higher than 6 will often lead to worse accuracy due to amplification of rounding errors. With domain decomposition, the cell size is limited by the distance spanned by lincs-order +1 constraints. When one wants to scale further than this limit, one can decrease lincs-order and increase lincs-iter, since the accuracy does not deteriorate when (1+ lincs-iter )* lincs-order remains constant.',
    descriptionZh: '约束耦合矩阵展开的最高阶。当约束形成三角形时，在正常展开之上应用相同阶的附加展开仅用于三角形内的耦合。对于“正常” MD 模拟，阶数 4 通常足够，6 需要虚拟位点或 BD 的较大时间步长。精确能量最小化在双精度中可能需要 8 或更多阶。注意，在单精度中，高于 6 的阶数通常会由于舍入误差放大而导致更差的准确性。域分解时，lincs-order +1 个约束跨越的距离限制单元大小。当想要扩展超过此限制时，可以减少 lincs-order 并增加 lincs-iter，因为当 (1+ lincs-iter )* lincs-order 保持不变时，准确性不会下降。',
    defaultValue: '4',
    category: 'bonds'
  },
  {
    name: 'lincs-iter',
    type: 'integer',
    description: 'Number of iterations to correct for rotational lengthening in LINCS. For normal runs a single step is sufficient, but for NVE runs where you want to conserve energy accurately or for accurate energy minimization in double precision you might want to increase it to 2. Note that in single precision using more than 1 iteration will often lead to worse accuracy due to amplification of rounding errors.',
    descriptionZh: '在 LINCS 中校正旋转拉长的迭代次数。对于正常运行，单次迭代就足够，但对于 NVE 运行，如果要准确守恒能量或在双精度中进行准确能量最小化，则可能想要增加到 2。注意，在单精度中使用超过 1 次迭代通常会由于舍入误差放大而导致更差的准确性。',
    defaultValue: '1',
    category: 'bonds'
  },
  {
    name: 'lincs-warnangle',
    type: 'string',
    description: 'maximum angle that a bond can rotate before LINCS will complain',
    descriptionZh: '键旋转的最大角度，LINCS 将抱怨',
    defaultValue: '30',
    unit: 'deg',
    category: 'bonds'
  },
  {
    name: 'morse',
    type: 'enum',
    description: 'bonds are represented by a harmonic potential\n\nbonds are represented by a Morse potential',
    descriptionZh: '键由谐波势表示键由 Morse 势表示',
    validValues: ['no', 'yes'],
    category: 'bonds'
  },

  // 能量组排除 / Energy Group Exclusions
  {
    name: 'energygrp-excl',
    type: 'real',
    description: 'Exclusion between pairs of energy groups are currently not supported.',
    category: 'energy-group-exclusions'
  },

  // 壁面 / Walls
  {
    name: 'nwall',
    type: 'real',
    description: 'When set to 1 there is a wall at z=0, when set to 2 there is also a wall at z=z-box. Walls can only be used with pbc =xy. When set to 2, pressure coupling and Ewald summation can be used (it is usually best to use semiisotropic pressure coupling with the x/y compressibility set to 0, as otherwise the surface area will change). Walls interact wit the rest of the system through an optional wall-atomtype. Energy groups wall0 and wall1 (for nwall =2) are added automatically to monitor the interaction of energy groups with each wall. The center of mass motion removal will be turned off in the z-direction.',
    defaultValue: '0',
    category: 'walls'
  },
  {
    name: 'wall-atomtype',
    type: 'string',
    description: 'the atom type name in the force field for each wall. By (for example) defining a special wall atom type in the topology with its own combination rules, this allows for independent tuning of the interaction of each atomtype with the walls.',
    descriptionZh: '每个壁的力场中的原子类型名称。通过（例如）在拓扑中定义特殊的壁原子类型与其自己的组合规则，这允许独立调整每个原子类型与壁的相互作用。',
    category: 'walls'
  },
  {
    name: 'wall-type',
    type: 'enum',
    description: 'LJ integrated over the volume behind the wall: 9-3 potential\n\nLJ integrated over the wall surface: 10-4 potential\n\ndirect LJ potential with the z distance from the wall\n\nuser-defined potentials indexed with the z distance from the wall, the tables are read analogously to the energygrp-table option, where the first name is for a "normal" energy group and the second name is wall0 or wall1, only the dispersion and repulsion columns are used',
    descriptionZh: 'LJ 在壁后面体积上积分：9-3 势LJ 在壁表面上积分：10-4 势直接 LJ 势与壁的 z 距离用户定义的势按 z 距离索引，表类似 energygrp-table 选项读取，其中第一个名称用于“正常”能量组，第二个名称为 wall0 或 wall1，仅使用色散和排斥列',
    validValues: ['9-3', '10-4', '12-6', 'table'],
    category: 'walls'
  },
  {
    name: 'wall-r-linpot',
    type: 'real',
    description: 'Below this distance from the wall the potential is continued linearly and thus the force is constant. Setting this option to a postive value is especially useful for equilibration when some atoms are beyond a wall. When the value is <=0 (<0 for wall-type =table), a fatal error is generated when atoms are beyond a wall.',
    descriptionZh: '壁下方此距离处，势继续线性延伸，因此力恒定。设置此选项为正值对于平衡特别有用，当一些原子超出壁时。当值为 <=0（wall-type =table 时 <0），如果原子超出壁则致命错误。',
    defaultValue: '-1',
    unit: 'nm',
    category: 'walls'
  },
  {
    name: 'wall-density',
    type: 'string',
    description: '[nm\ ^-3] / [nm\ ^-2] the number density of the atoms for each wall for wall types 9-3 and 10-4',
    descriptionZh: '[nm^-3] / [nm^-2] 每个壁的原子数密度，对于壁类型 9-3 和 10-4',
    unit: 'nm\ ^-3',
    category: 'walls'
  },
  {
    name: 'wall-ewald-zfac',
    type: 'string',
    description: 'The scaling factor for the third box vector for Ewald summation only, the minimum is 2. Ewald summation can only be used with nwall =2, where one should use ewald-geometry =3dc. The empty layer in the box serves to decrease the unphysical Coulomb interaction between periodic images.',
    descriptionZh: 'Ewald 求和中仅第三个盒向量的缩放因子，最小为 2。Ewald 求和只能与 nwall =2 一起使用，其中一个应该使用 ewald-geometry =3dc。盒子中的空层用于减少周期图像之间的不物理库仑相互作用。',
    defaultValue: '3',
    category: 'walls'
  },

  // 质心牵引 / COM Pulling
  {
    name: 'pull',
    type: 'enum',
    description: 'No center of mass pulling. All the following pull options will be ignored (and if present in the mdp file, they unfortunately generate warnings)\n\nCenter of mass pulling will be applied on 1 or more groups using 1 or more pull coordinates.',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-cylinder-r',
    type: 'string',
    description: 'the radius of the cylinder for pull-coord1-geometry=cylinder',
    descriptionZh: '拉动坐标1几何 =圆柱的圆柱半径',
    defaultValue: '1.5',
    unit: 'nm',
    category: 'com-pulling'
  },
  {
    name: 'pull-constr-tol',
    type: 'integer',
    description: 'the relative constraint tolerance for constraint pulling',
    descriptionZh: '约束拉动的相对约束容差',
    defaultValue: '10\ ^-6',
    category: 'com-pulling'
  },
  {
    name: 'pull-print-com',
    type: 'enum',
    description: 'do not print the COM for any group\n\nprint the COM of all groups for all pull coordinates to the pullx.xvg file.',
    descriptionZh: '不要打印任何组的 COM将所有拉动坐标的所有组的 COM 打印到 pullx.xvg 文件。',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-print-ref-value',
    type: 'enum',
    description: 'do not print the reference value for each pull coordinate\n\nprint the reference value for each pull coordinate to the pullx.xvg file.',
    descriptionZh: '不要打印每个拉动坐标的参考值将每个拉动坐标的参考值打印到 pullx.xvg 文件。',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-print-components',
    type: 'enum',
    description: 'only print the distance for each pull coordinate\n\nprint the distance and Cartesian components selected in pull-coord1-dim to the pullx.xvg file.',
    descriptionZh: '仅打印每个拉动坐标的距离将距离和在 pull-coord1-dim 中选择的笛卡尔分量打印到 pullx.xvg 文件。',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-nstxout',
    type: 'integer',
    description: 'interval for writing out the COMs of all the pull groups (0 is never) to the pullx.xvg file.',
    descriptionZh: '将所有拉动组的 COM 写入 pullx.xvg 文件的间隔（0 表示从不）。',
    defaultValue: '50',
    category: 'com-pulling'
  },
  {
    name: 'pull-nstfout',
    type: 'integer',
    description: 'interval for writing out the force of all the pulled groups (0 is never) to the pullf.xvg file.',
    descriptionZh: '将所有拉动组的力写入 pullf.xvg 文件的间隔（0 表示从不）。',
    defaultValue: '50',
    category: 'com-pulling'
  },
  {
    name: 'pull-pbc-ref-prev-step-com',
    type: 'enum',
    description: 'Use the reference atom (pull-group1-pbcatom) for the treatment of periodic boundary conditions.\n\nUse the COM of the previous step as reference for the treatment of periodic boundary conditions. The reference is initialized using the reference atom (pull-group1-pbcatom), which should be located centrally in the group. Using the COM from the previous step can be useful if one or more pull groups are large or very flexible.',
    descriptionZh: '使用参考原子（pull-group1-pbcatom）进行周期边界条件的处理。使用前一步的 COM 作为周期边界条件处理的参考。初始化使用参考原子（pull-group1-pbcatom），该原子应位于组的中心。使用前一步的 COM 在组很大或非常灵活时可能有用。',
    defaultValue: 'pull-group1-pbcatom',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-xout-average',
    type: 'enum',
    description: 'Write the instantaneous coordinates for all the pulled groups.\n\nWrite the average coordinates (since last output) for all the pulled groups. N.b., some analysis tools might expect instantaneous pull output.',
    descriptionZh: '为所有拉动组写入瞬时坐标。为所有拉动组写入平均坐标（自上次输出以来）。注意，一些分析工具可能期望瞬时拉动输出。',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-fout-average',
    type: 'enum',
    description: 'Write the instantaneous force for all the pulled groups.\n\nWrite the average force (since last output) for all the pulled groups. N.b., some analysis tools might expect instantaneous pull output.',
    descriptionZh: '为所有拉动组写入瞬时力。为所有拉动组写入平均力（自上次输出以来）。注意，一些分析工具可能期望瞬时拉动输出。',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-ngroups',
    type: 'integer',
    description: 'The number of pull groups, not including the absolute reference group, when used. Pull groups can be reused in multiple pull coordinates. Below only the pull options for group 1 are given, further groups simply increase the group index number.',
    descriptionZh: '拉动组的数量，不包括绝对参考组（如果使用）。拉动组可以在多个拉动坐标中重复使用。下面仅给出组 1 的拉动选项，进一步组只需增加组索引号。',
    defaultValue: '1',
    category: 'com-pulling'
  },
  {
    name: 'pull-ncoords',
    type: 'integer',
    description: 'The number of pull coordinates. Below only the pull options for coordinate 1 are given, further coordinates simply increase the coordinate index number.',
    descriptionZh: '拉动坐标的数量。下面仅给出坐标 1 的拉动选项，进一步坐标只需增加坐标索引号。',
    defaultValue: '1',
    category: 'com-pulling'
  },
  {
    name: 'pull-group1-name',
    type: 'string',
    description: 'The name of the pull group, is looked up in the index file or in the default groups to obtain the atoms involved.',
    descriptionZh: '拉动组的名称，从索引文件或默认组中查找以获取涉及的原子。',
    category: 'com-pulling'
  },
  {
    name: 'pull-group1-weights',
    type: 'integer',
    description: 'Optional relative weights which are multiplied with the masses of the atoms to give the total weight for the COM. The number of weights should be 0, meaning all 1, or the number of atoms in the pull group.',
    descriptionZh: '可选相对权重，与原子的质量相乘以给出 COM 的总权重。权重数量应为 0，表示全部 1，或拉动组中的原子数量。',
    category: 'com-pulling'
  },
  {
    name: 'pull-group1-pbcatom',
    type: 'real',
    description: 'The reference atom for the treatment of periodic boundary conditions inside the group (this has no effect on the treatment of the pbc between groups). This option is only important when the diameter of the pull group is larger than half the shortest box vector. For determining the COM, all atoms in the group are put at their periodic image which is closest to pull-group1-pbcatom. A value of 0 means that the middle atom (number wise) is used, which is only safe for small groups. gmx grompp checks that the maximum distance from the reference atom (specifically chosen, or not) to the other atoms in the group is not too large. This parameter is not used with pull-coord1-geometry cylinder. A value of -1 turns on cosine weighting, which is useful for a group of molecules in a periodic system, *e.g.* a water slab (see Engin et al. J. Chem. Phys. B 2010).',
    descriptionZh: '组内周期边界条件的参考原子（这对组间 pbc 处理没有影响）。此选项仅在拉动组的直径大于最短盒向量的一半时重要。对于计算 COM，所有原子放在其相对于 pull-group1-pbcatom 的周期图像中。值为 0 表示使用编号中间的原子（仅对小组安全）。gmx grompp 检查从参考原子（具体选择，或不）到组中其他原子的最大距离是否太大。此参数不用于 pull-coord1-geometry 圆柱。值为 -1 打开余弦加权，这对周期系统中的分子组有用，例如水板（见 Engin et al. J. Chem. Phys. B 2010）。',
    defaultValue: '0',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-type',
    type: 'enum',
    description: 'Center of mass pulling using an umbrella potential between the reference group and one or more groups.\n\nCenter of mass pulling using a constraint between the reference group and one or more groups. The setup is identical to the option umbrella, except for the fact that a rigid constraint is applied instead of a harmonic potential. Note that this type is not supported in combination with multiple time stepping.\n\nCenter of mass pulling using a linear potential and therefore a constant force. For this option there is no reference position and therefore the parameters pull-coord1-init and pull-coord1-rate are not used.\n\nAt distances above pull-coord1-init a harmonic potential is applied, otherwise no potential is applied.\n\nAt distances below pull-coord1-init a harmonic potential is applied, otherwise no potential is applied.\n\nAn external potential that needs to be provided by another module.',
    descriptionZh: '使用伞势在参考组和一个或多个组之间进行 COM 拉动。设置与伞相同，只是用刚性约束代替谐波势。使用约束在参考组和一个或多个组之间进行 COM 拉动。设置与伞相同，只是用刚性约束代替谐波势。注意，此类型与多时间步长不兼容。使用线性势和因此恒定力进行 COM 拉动。对于此选项，没有参考位置，因此参数 pull-coord1-init 和 pull-coord1-rate 不使用。在高于 pull-coord1-init 的距离处应用谐波势，否则不应用势。在低于 pull-coord1-init 的距离处应用谐波势，否则不应用势。需要由另一个模块提供的外部势。',
    validValues: ['umbrella', 'constraint', 'constant-force', 'flat-bottom', 'flat-bottom-high', 'external-potential'],
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-potential-provider',
    type: 'string',
    description: 'The name of the external module that provides the potential for the case where pull-coord1-type=external-potential.',
    descriptionZh: '提供 pull-coord1-type=external-potential 情况下的势的外部模块名称。',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-geometry',
    type: 'enum',
    description: 'Pull along the vector connecting the two groups. Components can be selected with pull-coord1-dim.\n\nPull in the direction of pull-coord1-vec.\n\nAs pull-coord1-geometry=direction, but does not apply periodic box vector corrections to keep the distance within half the box length. This is (only) useful for pushing groups apart by more than half the box length by continuously changing the reference location using a pull rate. With this geometry the box should not be dynamic (*e.g.* no pressure scaling) in the pull dimensions and the pull force is not added to the virial.\n\nAs pull-coord1-geometry=direction, but the pull vector is the vector that points from the COM of a third to the COM of a fourth pull group. This means that 4 groups need to be supplied in pull-coord1-groups. Note that the pull force will give rise to a torque on the pull vector, which is turn leads to forces perpendicular to the pull vector on the two groups defining the vector. If you want a pull group to move between the two groups defining the vector, simply use the union of these two groups as the reference group.\n\nDesigned for pulling with respect to a layer where the reference COM is given by a local cylindrical part of the reference group. The pulling is in the direction of pull-coord1-vec. From the first of the two groups in pull-coord1-groups a cylinder is selected around the axis going through the COM of the second group with direction pull-coord1-vec with radius pull-cylinder-r. Weights of the atoms decrease continuously to zero as the radial distance goes from 0 to pull-cylinder-r (mass weighting is also used). The radial dependence gives rise to radial forces on both pull groups. Note that the radius should be smaller than half the box size. For tilted cylinders they should be even smaller than half the box size since the distance of an atom in the reference group from the COM of the pull group has both a radial and an axial component. This geometry is not supported with constraint pulling.\n\nPull along an angle defined by four groups. The angle is defined as the angle between two vectors: the vector connecting the COM of the first group to the COM of the second group and the vector connecting the COM of the third group to the COM of the fourth group.\n\nAs pull-coord1-geometry=angle but the second vector is given by pull-coord1-vec. Thus, only the two groups that define the first vector need to be given.\n\nPull along a dihedral angle defined by six groups. These pairwise define three vectors: the vector connecting the COM of group 1 to the COM of group 2, the COM of group 3 to the COM of group 4, and the COM of group 5 to the COM group 6. The dihedral angle is then defined as the angle between two planes: the plane spanned by the the two first vectors and the plane spanned the two last vectors.\n\nTransforms other pull coordinates using a mathematical expression defined by pull-coord1-expression. Pull coordinates of lower indices, and time, can be used as variables to this pull coordinate. Thus, pull transformation coordinates should have a higher pull coordinate index than all pull coordinates they transform.',
    descriptionZh: '沿连接两组的向量拉动。可以使用 pull-coord1-dim 选择分量。沿 pull-coord1-vec 方向拉动。与 pull-coord1-geometry=direction 相同，但不应用周期盒向量校正以保持距离在半盒长度内。这（仅）用于通过连续改变参考位置将组拉开超过半盒长度而推开组。与此几何，盒子不应是动态的（例如无压力缩放）在拉动维度中，拉动力不添加到维里。与 pull-coord1-geometry=direction 相同，但拉动向量是第三个到第四个拉动组的 COM 的向量。这意味着需要提供 4 个组在 pull-coord1-groups 中。注意，拉动力将在拉动向量上产生扭矩，这反过来在定义向量的两个组上产生垂直于拉动向量的力。如果您想让拉动组在定义向量的两个组之间移动，只需使用这两个组的并集作为参考组。设计用于相对于层拉动，其中参考 COM 由参考组的局部圆柱部分给出。拉动在 pull-coord1-vec 方向。使用 pull-cylinder-r 半径围绕通过第二组 COM 的轴从第一组选择圆柱。权重从 0 到 pull-cylinder-r 的径向距离连续减少（质量加权也使用）。径向距离给出径向力在两个拉动组上。注意，半径应小于盒大小的一半。对于倾斜圆柱，它们应甚至小于盒大小的一半，因为参考组中原子的距离从拉动组的 COM 有径向和轴向分量。此几何不与约束拉动兼容。沿由四个组定义的角度拉动。角度由第一组到第二组的向量和第三组到第四组的向量之间的角度定义。与 pull-coord1-geometry=angle 相同，但第二个向量由 pull-coord1-vec 给出。因此，只需要定义第一个向量的两个组。沿由六个组定义的二面角拉动。这些成对定义三个向量：组 1 到组 2 的向量，组 3 到组 4 的向量，组 5 到组 6 的向量。然后二面角由两个平面之间的角度定义：由前两个向量和由后两个向量跨越的平面。使用 pull-coord1-expression 中定义的数学表达式变换其他拉动坐标。因此，拉动变换坐标应具有更高的拉动坐标索引高于所有它变换的拉动坐标。',
    validValues: ['distance', 'direction', 'direction-periodic', 'direction-relative', 'cylinder', 'angle', 'angle-axis', 'dihedral', 'transformation'],
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-expression',
    type: 'real',
    description: 'Mathematical expression to transform pull coordinates of lower indices to a new one. The pull coordinates are referred to as variables in the equation so that pull-coord1\'s value becomes \'x1\', pull-coord2 value becomes \'x2\' etc. Time can also be used a variable, becoming \'t\'. Note that angular coordinates use units of radians in the expression. The mathematical expression are evaluated using muParser. Only relevant if pull-coord1-geometry=transformation.',
    unit: 'radian',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-dx',
    type: 'string',
    description: 'Size of finite difference to use in numerical derivation of the pull coordinate with respect to other pull coordinates. The current implementation uses a simple first order finite difference method to perform derivation so that f\'(x) = (f(x+dx)-f(x))/dx Only relevant if pull-coord1-geometry=transformation.',
    defaultValue: '1e-9',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-groups',
    type: 'integer',
    description: 'The group indices on which this pull coordinate will operate. The number of group indices required is geometry dependent. The first index is the reference group and can be 0, in which case an absolute reference of pull-coord1-origin is used. With an absolute reference the system is no longer translation invariant and one should think about what to do with the center of mass motion.',
    descriptionZh: '此拉动坐标将对其操作的组索引。所需组索引的数量是几何依赖的。第一个索引是参考组，可以是 0，在这种情况下使用 pull-coord1-origin 的绝对参考。与绝对参考，系统不再是平移不变的，您应该考虑对质心运动做什么。',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-dim',
    type: 'real',
    description: 'Selects the dimensions that this pull coordinate acts on and that are printed to the output files when pull-print-components = pull-coord1-start=yes. With pull-coord1-geometry = pull-coord1-geometry=distance, only Cartesian components set to Y contribute to the distance. Thus setting this to Y Y N results in a distance in the x/y plane. With other geometries all dimensions with non-zero entries in pull-coord1-vec should be set to Y, the values for other dimensions only affect the output.',
    descriptionZh: '选择此拉动坐标作用的维度，并在输出文件中打印时 pull-print-components = pull-coord1-start=yes 时打印笛卡尔分量。与 pull-coord1-geometry = pull-coord1-geometry=distance，只有在 pull-coord1-dim 中设置的笛卡尔分量贡献到距离。因此，设置为 Y Y N 结果在 x/y 平面中的距离。与其他几何，所有在 pull-coord1-vec 中有非零条目的维度应设置为 Y，其他维度仅影响输出。',
    defaultValue: 'Y Y Y',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-origin',
    type: 'string',
    description: 'The pull reference position for use with an absolute reference.',
    descriptionZh: '绝对参考的拉动参考位置。',
    defaultValue: '0.0',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-vec',
    type: 'boolean',
    description: 'The pull direction. gmx grompp normalizes the vector.',
    descriptionZh: '拉动方向。gmx grompp 规范化向量。',
    defaultValue: '0.0',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-start',
    type: 'enum',
    description: 'do not modify pull-coord1-init\n\nadd the COM distance of the starting conformation to pull-coord1-init',
    descriptionZh: '不要修改 pull-coord1-init将起始构象的 COM 距离添加到 pull-coord1-init',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-init',
    type: 'real',
    description: '(0.0) [nm] or [deg] The reference distance or reference angle at t=0.',
    descriptionZh: '(0.0) [nm] 或 [deg] t=0 时的参考距离或参考角度。',
    defaultValue: '0.0',
    unit: 'nm',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-rate',
    type: 'string',
    description: '(0) [nm/ps] or [deg/ps] The rate of change of the reference position or reference angle.',
    descriptionZh: '(0) [nm/ps] 或 [deg/ps] 参考位置或参考角度的变化率。',
    defaultValue: '0',
    unit: 'nm/ps',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-k',
    type: 'real',
    description: '(0) [kJ mol\ ^-1 nm\ ^-2] or [kJ mol\ ^-1 nm\ ^-1] or [kJ mol\ ^-1 rad\ ^-2] or [kJ mol\ ^-1 rad\ ^-1] The force constant. For umbrella pulling this is the harmonic force constant in kJ mol\ ^-1 nm\ ^-2 (or kJ mol\ ^-1 rad\ ^-2 for angles). For constant force pulling this is the force constant of the linear potential, and thus the negative (!) of the constant force in kJ mol\ ^-1 nm\ ^-1 (or kJ mol\ ^-1 rad\ ^-1 for angles). Note that for angles the force constant is expressed in terms of radians (while pull-coord1-init and pull-coord1-rate are expressed in degrees).',
    descriptionZh: '(0) [kJ mol^-1 nm^-2] 或 [kJ mol^-1 nm^-1] 或 [kJ mol^-1 rad^-2] 或 [kJ mol^-1 rad^-1] 力常数。对于伞拉动，这是 kJ mol^-1 nm^-2 中的谐波力常数（或角度的 kJ mol^-1 rad^-2）。对于恒定力拉动，这是线性势的力常数，因此是恒定力的负值（角度的 kJ mol^-1 nm^-1 或 kJ mol^-1 rad^-1）。注意，对于角度，力常数以弧度表示（而 pull-coord1-init 和 pull-coord1-rate 以度表示）。',
    defaultValue: '0',
    unit: 'kJ mol\ ^-1 nm\ ^-2',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-kB',
    type: 'real',
    description: '(pull-k1) [kJ mol\ ^-1 nm\ ^-2] or [kJ mol\ ^-1 nm\ ^-1] or [kJ mol\ ^-1 rad\ ^-2] or [kJ mol\ ^-1 rad\ ^-1] As pull-coord1-k, but for state B. This is only used when free-energy is turned on. The force constant is then (1 - lambda) * pull-coord1-k + lambda * pull-coord1-kB.',
    descriptionZh: '(pull-k1) [kJ mol^-1 nm^-2] 或 [kJ mol^-1 nm^-1] 或 [kJ mol^-1 rad^-2] 或 [kJ mol^-1 rad^-1] 与 pull-coord1-k 相同，但对于状态 B。这仅在开启自由能时使用。力常数然后是 (1 - lambda) * pull-coord1-k + lambda * pull-coord1-kB。',
    defaultValue: 'pull-k1',
    unit: 'kJ mol\ ^-1 nm\ ^-2',
    category: 'com-pulling'
  },

  // AWH自适应偏置 / AWH Adaptive Biasing
  {
    name: 'awh',
    type: 'enum',
    description: 'No biasing.\n\nAdaptively bias a reaction coordinate using the AWH method and estimate the corresponding PMF. This requires a constant ensemble temperature to be available. The PMF and other AWH data are written to the energy file (edr) at an interval set by awh-nstout and can be extracted with the gmx awh tool. The AWH coordinate can be multidimensional and is defined by mapping each dimension to a pull coordinate index (and/or up to one alchemical free lambda state dimension free-energy). This is only allowed if pull-coord1-type=external-potential and pull-coord1-potential-provider = awh for the concerned pull coordinate indices. Pull geometry \'direction-periodic\' and transformation coordinates that depend on time are not supported by AWH.',
    validValues: ['no', 'yes'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-potential',
    type: 'enum',
    description: 'The applied biasing potential is the convolution of the bias function and a set of harmonic umbrella potentials (see awh-potential=umbrella below). This results in a smooth potential function and force. The resolution of the potential is set by the force constant of each umbrella, see awh1-dim1-force-constant. This option is not compatible with using the free energy lambda state as an AWH reaction coordinate dimension.\n\nThe potential bias is applied by controlling the position of a harmonic potential using Monte-Carlo sampling.  The force constant is set with awh1-dim1-force-constant. The umbrella location is sampled using Monte-Carlo every awh-nstsample steps. This is option is required when using the free energy lambda state as an AWH reaction coordinate dimension. Apart from that, this option is mainly for comparison and testing purposes as there are no advantages to using an umbrella.',
    descriptionZh: '应用的偏置势是偏置函数和一组谐波伞势的卷积（见 awh-potential=umbrella 下面）。这产生一个平滑的势函数和力。势的分辨率由每个伞的力常数设置，见 awh1-dim1-force-constant。此选项与使用自由能 lambda 状态作为 AWH 反应坐标维度不兼容。通过控制谐波势的位置使用蒙特卡罗采样应用势偏置。力常数用 awh1-dim1-force-constant 设置。伞位置使用蒙特卡罗每 awh-nstsample 步采样。此选项在开启自由能 lambda 状态作为 AWH 反应坐标维度时需要。除了那之外，此选项主要用于比较和测试，因为使用伞没有优势。',
    validValues: ['convolved', 'umbrella'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-share-multisim',
    type: 'enum',
    description: 'AWH will not share biases across simulations started with gmx mdrun option -multidir. The biases will be independent.\n\nWith gmx mdrun and option -multidir the bias and PMF estimates for biases with awh1-share-group >0 will be shared across simulations with the biases with the same awh1-share-group value. The simulations should have the same AWH settings for sharing to make sense. gmx mdrun will check whether the simulations are technically compatible for sharing, but the user should check that bias sharing physically makes sense.',
    descriptionZh: 'AWH 不会跨使用 gmx mdrun 选项 -multidir 启动的模拟共享偏差。偏差将是独立的。使用 gmx mdrun 和选项 -multidir 时，具有 awh1-share-group >0 的偏差的偏差和 PMF 估计将在模拟之间共享，具有相同 awh1-share-group 值的偏差。模拟应该具有相同的 AWH 设置以使共享有意义。gmx mdrun 将检查模拟在技术上是否兼容共享，但用户应该检查偏差共享在物理上是否有意义。',
    validValues: ['no', 'yes'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-seed',
    type: 'string',
    description: '(-1) Random seed for Monte-Carlo sampling the umbrella position, where -1 indicates to generate a seed. Only used with awh-potential=umbrella.',
    descriptionZh: '(-1) 用于初始化与 Colvars 中实现的某些随机方法相关的随机生成器的种子。-1 的默认值生成随机种子。',
    defaultValue: '-1',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-nstout',
    type: 'integer',
    description: 'Number of steps between printing AWH data to the energy file, should be a multiple of nstenergy.',
    descriptionZh: '将 AWH 数据写入能量文件的步数间隔，应是 nstenergy 的倍数。',
    defaultValue: '100000',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-nstsample',
    type: 'integer',
    description: 'Number of steps between sampling of the coordinate value. This sampling is the basis for updating the bias and estimating the PMF and other AWH observables.',
    descriptionZh: '采样坐标值的步数间隔。此采样是更新偏差和估计 PMF 和其他 AWH 可观测量的基础。',
    defaultValue: '10',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-nsamples-update',
    type: 'integer',
    description: 'The number of coordinate samples used for each AWH update. The update interval in steps is awh-nstsample times this value.',
    descriptionZh: '每个 AWH 更新的坐标样本数量。更新间隔以步为单位是 awh-nstsample 乘以此值。',
    defaultValue: '100',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-nbias',
    type: 'integer',
    description: 'The number of biases, each acting on its own coordinate. The following options should be specified for each bias although below only the options for bias number 1 is shown. Options for other bias indices are  obtained by replacing \'1\' by the bias index.',
    defaultValue: '1',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-error-init',
    type: 'integer',
    description: 'Estimated initial average error of the PMF for this bias. This value together with an estimate of the crossing time, based on the length of the sampling interval and the given diffusion constant(s) awh1-dim1-diffusion, determine the initial biasing rate. With multiple dimensions, the longest crossing time is used. The error is obviously not known *a priori*. Only a rough estimate of awh1-error-init is needed however. As a  general guideline, leave awh1-error-init to its default value when starting a new simulation. On the other hand, when there is *a priori* knowledge of the PMF (e.g. when an initial PMF estimate is provided, see the awh1-user-data option) then awh1-error-init should reflect that knowledge.',
    descriptionZh: '此偏差的 PMF 的估计初始平均误差。此值与基于采样间隔长度和给定的扩散常数 awh1-dim1-diffusion 的穿越时间估计一起，确定初始偏置率。对于多个维度，使用最长的穿越时间。误差显然不是先验已知的。只有粗略估计 awh1-error-init 才需要。然而，当有先验 PMF 知识时（例如，当提供初始 PMF 估计时，见 awh1-user-data 选项），awh1-error-init 应反映该知识。',
    defaultValue: '10.0',
    unit: 'kJ mol\ ^-1',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-growth',
    type: 'enum',
    description: 'Each bias keeps a reference weight histogram for the coordinate samples. Its size sets the magnitude of the bias function and free energy estimate updates (few samples corresponds to large updates and vice versa). Thus, its growth rate sets the maximum convergence rate.\n\nBy default, there is an initial stage in which the histogram grows close to exponentially (but slower than the sampling rate). In the final stage that follows, the growth rate is linear and equal to the sampling rate (set by awh-nstsample). The initial stage is typically necessary for efficient convergence when starting a new simulation where high free energy barriers have not yet been flattened by the bias.\n\nAs awh1-growth=exp-linear but skip the initial stage. This may be useful if there is *a priori* knowledge (see awh1-error-init) which eliminates the need for an initial stage. This is also the setting compatible with awh1-target=local-boltzmann.',
    descriptionZh: '每个偏差保持一个参考权重直方图，用于坐标样本。其大小设置偏差函数和自由能估计更新的幅度（少样本对应大更新，反之亦然）。因此，其增长率设置最大收敛率。默认情况下，有一个初始阶段，其中直方图接近指数增长（但比采样率慢）。然后是最终阶段，其中增长率是线性的，等于采样率（由 awh-nstsample 设置）。初始阶段对于开始新模拟通常必要，其中高自由能障碍尚未被偏差平坦化。与 awh1-growth=exp-linear 相同，但跳过初始阶段。这在有先验知识时可能有用（见 awh1-error-init），它消除了初始阶段的需要。这也与 awh1-target=local-boltzmann 兼容，因为对于 awh1-growth=exp-linear，直方图在初始阶段全局重新缩放。',
    validValues: ['exp-linear', 'linear'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-growth-factor',
    type: 'real',
    description: 'The growth factor \gamma during the exponential phase with awh1-growth=exp-linear. Should be larger than 1.',
    descriptionZh: '指数相期间的增长因子 \gamma 与 awh1-growth=exp-linear。应大于 1。',
    defaultValue: '2',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-equilibrate-histogram',
    type: 'enum',
    description: 'Do not equilibrate the histogram.\n\nBefore entering the initial stage (see awh1-growth=exp-linear), make sure the histogram of sampled weights is following the target distribution closely enough (specifically, at least 80% of the target region needs to have a local relative error of less than 20%). This option would typically only be used when awh1-share-group > 0 and the initial configurations poorly represent the target distribution.',
    descriptionZh: '不要平衡直方图。在进入初始阶段之前（见 awh1-growth=exp-linear），确保采样的权重直方图遵循目标分布足够接近（具体来说，至少 80% 的目标区域需要局部相对误差小于 20%）。此选项通常仅在 awh1-share-group > 0 和初始配置不能很好地代表目标分布时使用。',
    validValues: ['no', 'yes'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-target',
    type: 'enum',
    description: 'The bias is tuned towards a constant (uniform) coordinate distribution in the defined sampling interval (defined by  [awh1-dim1-start, awh1-dim1-end]).\n\nSimilar to awh1-target=constant, but the target distribution is proportional to 1/(1 + exp(F - awh1-target=cutoff)), where F is the free energy relative to the estimated global minimum. This provides a smooth switch of a flat target distribution in regions with free energy lower than the cut-off to a Boltzmann distribution in regions with free energy higher than the cut-off.\n\nThe target distribution is a Boltzmann distribtution with a scaled beta (inverse temperature) factor given by awh1-target-beta-scaling. *E.g.*, a value of 0.1 would give the same coordinate distribution as sampling with a simulation temperature scaled by 10.\n\nSame target distribution and use of awh1-target-beta-scaling but the convergence towards the target distribution is inherently local *i.e.*, the rate of change of the bias only depends on the local sampling. This local convergence property is only compatible with awh1-growth=linear, since for awh1-growth=exp-linear histograms are globally rescaled in the initial stage.',
    descriptionZh: '偏差针对定义的采样间隔中的恒定（均匀）坐标分布进行调整（由 [awh1-dim1-start, awh1-dim1-end] 定义）。与 awh1-target=constant 相似，但目标分布与 1/(1 + exp(F - awh1-target=cutoff)) 成比例，其中 F 是相对于估计全局最小值的自由能。这提供平坦目标分布在自由能低于截止的区域的平滑开关，到高于截止的区域的玻尔兹曼分布。目标分布是具有 awh1-target-beta-scaling 给定的缩放 beta 因子（逆温度）的玻尔兹曼分布。例如，值为 0.1 将给出与以 10 缩放的模拟温度采样相同的坐标分布。与 awh1-target=boltzmann 和 awh1-target-beta-scaling 的使用相同，但收敛向目标分布本质上是局部的，即偏差的变化率仅取决于局部采样。此局部收敛属性仅与 awh1-growth=linear 兼容，因为对于 awh1-growth=exp-linear，直方图在初始阶段全局重新缩放。',
    defaultValue: 'uniform',
    validValues: ['constant', 'cutoff', 'boltzmann', 'local-boltzmann'],
    unit: 'awh1-dim1-start, awh1-dim1-end',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-target-beta-scaling',
    type: 'string',
    description: 'For awh1-target=boltzmann and awh1-target=local-boltzmann it is the unitless beta scaling factor taking values in (0,1).',
    descriptionZh: '对于 awh1-target=boltzmann 和 awh1-target=local-boltzmann，它是无量纲 beta 缩放因子，取值在 (0,1)。',
    defaultValue: '0',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-target-cutoff',
    type: 'string',
    description: 'For awh1-target=cutoff this is the cutoff, should be > 0.',
    descriptionZh: '对于 awh1-target=cutoff，这是截止，应 > 0。',
    defaultValue: '0',
    unit: 'kJ mol\ ^-1',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-user-data',
    type: 'enum',
    description: 'Initialize the PMF and target distribution with default values.\n\nInitialize the PMF and target distribution with user provided data. For awh-nbias = 1, gmx mdrun will expect a file awhinit.xvg to be present in the run directory. For multiple biases, gmx mdrun expects files awhinit1.xvg, awhinit2.xvg, etc. The file name can be changed with the -awh option. The first awh1-ndim columns of each input file should contain the coordinate values, such that each row defines a point in coordinate space. Column awh1-ndim + 1 should contain the PMF value (in kT) for each point. The target distribution column can either follow the PMF (column  awh1-ndim + 2) or be in the same column as written by gmx awh.',
    descriptionZh: '使用默认值初始化 PMF 和目标分布。使用用户提供的 PMF 和目标分布数据初始化。对于 awh-nbias = 1，gmx mdrun 将期望 awhinit.xvg 文件存在于运行目录中。对于多个偏差，gmx mdrun 期望文件 awhinit1.xvg、awhinit2.xvg 等。文件名称可以使用 -awh 选项更改。每个输入文件的第一个 awh1-ndim 列应包含坐标值，使得每行定义坐标空间中的点。列 awh1-ndim + 1 应包含每个点的 PMF 值（以 kT 为单位）。目标分布列可以跟随 PMF（列 awh1-ndim + 2）或与 gmx awh 写入的相同列。',
    validValues: ['no', 'yes'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-share-group',
    type: 'enum',
    description: 'Do not share the bias.\n\nShare the bias and PMF estimates between simulations. This currently only works between biases with the same index. Note that currently sharing within a single simulation is not supported. The bias will be shared across simulations that specify the same value for awh1-share-group. To enable this, use awh-share-multisim=yes and the gmx mdrun option -multidir. Sharing may increase convergence initially, although the starting configurations can be critical, especially when sharing between many biases. N.b., multiple walkers sharing a degenerate reaction coordinate may have problems overlapping their sampling, possibly making it difficult to cover the sampling interval.',
    descriptionZh: '不要共享偏差。在模拟之间共享偏差和 PMF 估计。这目前仅适用于具有相同索引的偏差。注意，目前不支持在单个模拟内共享。具有相同 awh1-share-group 值的偏差的偏差将在模拟之间共享。要启用此，使用 awh-share-multisim=yes 和 gmx mdrun 选项 -multidir。共享可能最初增加收敛，尽管起始配置可能至关重要，尤其是对于许多偏差共享时。注意，多个行走者共享退化反应坐标可能有问题，重叠其采样，可能难以覆盖采样间隔。',
    validValues: ['0', 'positive'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-target-metric-scaling',
    type: 'enum',
    description: 'Do not scale the target distribution based on the AWH friction metric.\n\nScale the target distribution based on the AWH friction metric. Regions with high friction (long autocorrelation times) will be sampled more. The diffusion metric is the inverse of the friction metric. This scaling can be used with any awh1-target type and is applied after user-provided target distribution modifications (awh1-user-data), if any. If awh1-growth=exp-linear, the target distribution scaling starts after leaving the initial phase.',
    descriptionZh: '不要基于 AWH 摩擦度量缩放目标分布。基于 AWH 摩擦度量缩放目标分布。高摩擦区域（长自相关时间）将被更多采样。扩散度量是摩擦度量的逆。此缩放可以与任何 awh1-target 类型一起使用，并在用户提供的目标分布修改之后应用（如果有 awh1-user-data）。如果 awh1-growth=exp-linear，目标分布缩放在离开初始阶段后开始。',
    validValues: ['no', 'yes'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-target-metric-scaling-limit',
    type: 'boolean',
    description: 'The upper limit of scaling, relative to the average, when awh1-target-metric-scaling is enabled. The lower limit will be the inverse of this value. This upper limit should be > 1.',
    descriptionZh: '启用 awh1-target-metric-scaling 时缩放的上限，相对于平均值。此上限应 > 1。',
    defaultValue: '10',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-ndim',
    type: 'integer',
    description: 'Number of dimensions of the coordinate, each dimension maps to 1 pull coordinate. The following options should be specified for each such dimension. Below only the options for dimension number 1 is shown. Options for other dimension indices are obtained by replacing \'1\' by the dimension index.',
    defaultValue: '1',
    unit: 'integer',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-coord-provider',
    type: 'enum',
    description: 'The pull module is providing the reaction coordinate for this dimension. With multiple time-stepping, AWH and pull should be in the same MTS level.\n\nThe free energy free-energy lambda state is the reaction coordinate for this dimension. The lambda states to use are specified by fep-lambdas, vdw-lambdas, coul-lambdas etc. This is not compatible with delta-lambda. It also requires calc-lambda-neighbors=-1. With multiple time-stepping, AWH should be in the slow level. This option requires awh-potential=umbrella.',
    descriptionZh: '拉动模块提供此维度的反应坐标。与多时间步长，AWH 和拉动应在同一 MTS 级别。自由能自由能 lambda 状态是此维度的反应坐标。使用的 lambda 状态由 fep-lambdas、vdw-lambdas、bonded-lambdas 等指定。这与 delta-lambda 不兼容。它还需要 calc-lambda-neighbors=-1。与多时间步长，AWH 应在慢级别。',
    validValues: ['pull', 'fep-lambda'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-coord-index',
    type: 'string',
    description: 'Index of the pull coordinate defining this coordinate dimension.',
    descriptionZh: '定义此坐标维度的拉动坐标的索引。',
    defaultValue: '1',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-force-constant',
    type: 'integer',
    description: '(0) [kJ mol\ ^-1 nm\ ^-2] or [kJ mol\ ^-1 rad\ ^-2] Force constant for the (convolved) umbrella potential(s) along this coordinate dimension.',
    descriptionZh: '(0) [kJ mol^-1 nm^-2] 或 [kJ mol^-1 rad^-2] 此坐标维度沿的（卷积）伞势的力常数。',
    defaultValue: '0',
    unit: 'kJ mol\ ^-1 nm\ ^-2',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-start',
    type: 'integer',
    description: '(0.0) [nm] or [deg] Start value of the sampling interval along this dimension. The range of allowed values depends on the relevant pull geometry (see pull-coord1-geometry). For dihedral geometries awh1-dim1-start greater than awh1-dim1-end is allowed. The interval will then wrap around from +period/2 to -period/2. For the direction geometry, the dimension is made periodic when the direction is along a box vector and covers more than 95% of the box length. Note that one should not apply pressure coupling along a periodic dimension.',
    descriptionZh: '(0.0) [nm] 或 [deg] 此维度采样间隔的起始值。允许值的范围取决于相关拉动几何（见 pull-coord1-geometry）。对于二面角几何，awh1-dim1-start 大于 awh1-dim1-end 是允许的。间隔将从 +period/2 到 -period/2 环绕。对于方向几何，当方向沿盒向量且覆盖超过 95% 盒长度时，维度被设为周期。注意，不应沿周期维度应用压力耦合。',
    defaultValue: '0.0',
    unit: 'nm',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-end',
    type: 'integer',
    description: '(0.0) [nm] or [deg] End value defining the sampling interval together with awh1-dim1-start.',
    descriptionZh: '(0.0) [nm] 或 [deg] 与 awh1-dim1-start 一起定义采样间隔的结束值。',
    defaultValue: '0.0',
    unit: 'nm',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-diffusion',
    type: 'boolean',
    description: '(10\ ^-5) [nm\ ^2/ps], [rad\ ^2/ps] or [ps\ ^-1] Estimated diffusion constant for this coordinate dimension determining the initial biasing rate. This needs only be a rough estimate and should not critically affect the results unless it is set to something very low, leading to slow convergence, or very high, forcing the system far from equilibrium. Not setting this value explicitly generates a warning.',
    descriptionZh: '(10^-5) [nm^2/ps]、[rad^2/ps] 或 [ps^-1] 确定初始偏置率的此坐标维度的估计扩散常数。这只需要粗略估计，并且不应严重影响结果，除非设置为非常低，导致慢收敛，或非常高，迫使系统远离平衡。不明确设置此值将生成警告。',
    defaultValue: '10\ ^-5',
    unit: 'nm\ ^2/ps',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-cover-diameter',
    type: 'integer',
    description: '(0.0) [nm] or [deg] Diameter that needs to be sampled by a single simulation around a coordinate value before the point is considered covered in the initial stage (see awh1-growth=exp-linear). A value > 0  ensures that for each covering there is a continuous transition of this diameter across each coordinate value. This is trivially true for independent simulations but not for for multiple bias-sharing simulations (awh1-share-group>0). For a diameter = 0, covering occurs as soon as the simulations have sampled the whole interval, which for many sharing simulations does not guarantee transitions across free energy barriers. On the other hand, when the diameter >= the sampling interval length, covering occurs when a single simulation has independently sampled the whole interval.',
    descriptionZh: '(0.0) [nm] 或 [deg] 在初始阶段（见 awh1-growth=exp-linear）单个模拟必须在此坐标值周围采样的直径，然后点被认为是覆盖的。对于独立模拟，这是微不足道的，但对于偏差共享模拟（awh1-share-group>0），不是，因为它们不保证跨越自由能障碍的过渡。对于直径 = 0，覆盖发生在单个模拟独立采样整个间隔时，这对于许多共享模拟不保证过渡。然而，当直径 >= 采样间隔长度时，覆盖发生在单个模拟独立采样整个间隔时。',
    defaultValue: '0.0',
    unit: 'nm',
    category: 'awh-adaptive-biasing'
  },

  // 强制旋转 / Enforced Rotation
  {
    name: 'rotation',
    type: 'enum',
    description: 'No enforced rotation will be applied. All enforced rotation options will be ignored (and if present in the mdp file, they unfortunately generate warnings).\n\nApply the rotation potential specified by rot-type0 to the group of atoms given under the rot-group0 option.',
    validValues: ['no', 'yes'],
    category: 'enforced-rotation'
  },
  {
    name: 'rot-ngroups',
    type: 'integer',
    description: 'Number of rotation groups.',
    descriptionZh: '旋转组的数量。',
    defaultValue: '1',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-group0',
    type: 'string',
    description: 'Name of rotation group 0 in the index file.',
    descriptionZh: '索引文件中的旋转组 0 的名称。',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-type0',
    type: 'string',
    description: 'Type of rotation potential that is applied to rotation group 0. Can be of of the following: iso, iso-pf, pm, pm-pf, rm, rm-pf, rm2, rm2-pf, flex, flex-t, flex2, or flex2-t.',
    descriptionZh: '应用于旋转组 0 的旋转势类型。可以是 iso、iso-pf、pm、pm-pf、rm、rm-pf、rm2、rm2-pf、flex、flex-t、flex2 或 flex2-t 之一。',
    defaultValue: 'iso',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-massw0',
    type: 'string',
    description: 'Use mass weighted rotation group positions.',
    descriptionZh: '使用质量加权的旋转组位置。',
    defaultValue: 'no',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-vec0',
    type: 'boolean',
    description: 'Rotation vector, will get normalized.',
    descriptionZh: '旋转向量，将被规范化。',
    defaultValue: '1.0',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-pivot0',
    type: 'string',
    description: 'Pivot point for the potentials iso, pm, rm, and rm2.',
    descriptionZh: 'iso、pm、rm 和 rm2 势的枢轴点。',
    defaultValue: '0.0',
    unit: 'nm',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-rate0',
    type: 'string',
    description: 'Reference rotation rate of group 0.',
    descriptionZh: '组 0 的参考旋转率。',
    defaultValue: '0',
    unit: 'degree ps\ ^-1',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-k0',
    type: 'real',
    description: 'Force constant for group 0.',
    descriptionZh: '组 0 的力常数。',
    defaultValue: '0',
    unit: 'kJ mol\ ^-1 nm\ ^-2',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-slab-dist0',
    type: 'real',
    description: 'Slab distance, if a flexible axis rotation type was chosen.',
    descriptionZh: '选择柔性轴旋转类型时的板距离。',
    defaultValue: '1.5',
    unit: 'nm',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-min-gauss0',
    type: 'real',
    description: 'Minimum value (cutoff) of Gaussian function for the force to be evaluated (for the flexible axis potentials).',
    descriptionZh: '高斯函数的力被评估的最小值（截止）（对于柔性轴势）。',
    defaultValue: '0.001',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-eps0',
    type: 'string',
    description: 'Value of additive constant epsilon for rm2* and flex2* potentials.',
    descriptionZh: 'rm2* 和 flex2* 势的加性常数 epsilon 的值。',
    defaultValue: '0.0001',
    unit: 'nm\ ^2',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-fit-method0',
    type: 'boolean',
    description: 'Fitting method when determining the actual angle of a rotation group (can be one of rmsd, norm, or potential).',
    descriptionZh: '确定旋转组的实际角度时使用的拟合方法（可以是 rmsd、norm 或 potential 之一）。',
    defaultValue: 'rmsd',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-potfit-nsteps0',
    type: 'integer',
    description: 'For fit type potential, the number of angular positions around the reference angle for which the rotation potential is evaluated.',
    descriptionZh: '对于拟合类型 potential，在参考角度周围评估旋转势的角度位置数量。',
    defaultValue: '21',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-potfit-step0',
    type: 'integer',
    description: 'For fit type potential, the distance in degrees between two angular positions.',
    descriptionZh: '对于拟合类型 potential，两个角度位置之间的度数距离。',
    defaultValue: '0.25',
    unit: 'degree',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-nstrout',
    type: 'integer',
    description: 'Output interval (in steps) for the angle of the rotation group, as well as for the torque and the rotation potential energy.',
    descriptionZh: '将旋转组的角度以及扭矩和旋转势能量写入能量文件的步数间隔。',
    defaultValue: '100',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-nstsout',
    type: 'integer',
    description: 'Output interval (in steps) for per-slab data of the flexible axis potentials, i.e. angles, torques and slab centers.',
    descriptionZh: '将柔性轴势的每板数据写入能量文件的步数间隔，即角度、扭矩和板中心。',
    defaultValue: '1000',
    category: 'enforced-rotation'
  },

  // NMR精修 / NMR Refinement
  {
    name: 'disre',
    type: 'enum',
    description: 'ignore distance restraint information in topology file\n\nsimple (per-molecule) distance restraints.\n\ndistance restraints over an ensemble of molecules in one simulation box. Normally, one would perform ensemble averaging over multiple simulations, using ``mdrun -multidir``. The environment variable GMX_DISRE_ENSEMBLE_SIZE sets the number of systems within each ensemble (usually equal to the number of directories supplied to mdrun -multidir).',
    validValues: ['no', 'simple', 'ensemble'],
    category: 'nmr-refinement'
  },
  {
    name: 'disre-weighting',
    type: 'enum',
    description: 'divide the restraint force equally over all atom pairs in the restraint\n\nthe forces are the derivative of the restraint potential, this results in an weighting of the atom pairs to the reciprocal seventh power of the displacement. The forces are conservative when disre-tau is zero.',
    descriptionZh: '将约束力平均分配给约束中的所有原子对力是约束势的导数，这导致原子对到位移的倒第七次幂的加权。当 disre-tau 为零时，力是保守的。',
    validValues: ['equal', 'conservative'],
    category: 'nmr-refinement'
  },
  {
    name: 'disre-mixed',
    type: 'enum',
    description: 'the violation used in the calculation of the restraint force is the time-averaged violation\n\nthe violation used in the calculation of the restraint force is the square root of the product of the time-averaged violation and the instantaneous violation',
    descriptionZh: '用于计算约束力的违规是时间平均违规用于计算约束力的违规是时间平均违规和瞬时违规的平方根乘积',
    validValues: ['no', 'yes'],
    category: 'nmr-refinement'
  },
  {
    name: 'disre-fc',
    type: 'real',
    description: 'force constant for distance restraints, which is multiplied by a (possibly) different factor for each restraint given in the fac column of the interaction in the topology file.',
    descriptionZh: '距离约束的力常数，与拓扑中相互作用的 fac 列中给出的（可能不同的）因子相乘。',
    defaultValue: '1000',
    unit: 'kJ mol\ ^-1 nm\ ^-2',
    category: 'nmr-refinement'
  },
  {
    name: 'disre-tau',
    type: 'real',
    description: 'time constant for distance restraints running average. A value of zero turns off time averaging.',
    descriptionZh: '距离约束运行平均的时间常数。值为零关闭时间平均。',
    defaultValue: '0',
    unit: 'ps',
    category: 'nmr-refinement'
  },
  {
    name: 'nstdisreout',
    type: 'integer',
    description: 'period between steps when the running time-averaged and instantaneous distances of all atom pairs involved in restraints are written to the energy file (can make the energy file very large)',
    descriptionZh: '将所有原子对的运行时间平均和瞬时距离写入能量文件的步数周期（可以使能量文件非常大）',
    defaultValue: '100',
    unit: 'steps',
    category: 'nmr-refinement'
  },
  {
    name: 'orire',
    type: 'enum',
    description: 'ignore orientation restraint information in topology file\n\nuse orientation restraints, ensemble averaging can be performed with mdrun -multidir',
    descriptionZh: '忽略拓扑文件中的方向约束信息使用方向约束，系综平均可以使用 mdrun -multidir 执行',
    validValues: ['no', 'yes'],
    category: 'nmr-refinement'
  },
  {
    name: 'orire-fc',
    type: 'real',
    description: 'force constant for orientation restraints, which is multiplied by a (possibly) different weight factor for each restraint, can be set to zero to obtain the orientations from a free simulation',
    descriptionZh: '方向约束的力常数，与每个约束的（可能不同的）权重因子相乘，可以设置为零以从自由模拟获得方向',
    defaultValue: '0',
    unit: 'kJ mol\ ^-1',
    category: 'nmr-refinement'
  },
  {
    name: 'orire-tau',
    type: 'real',
    description: 'time constant for orientation restraints running average. A value of zero turns off time averaging.',
    descriptionZh: '方向约束运行平均的时间常数。值为零关闭时间平均。',
    defaultValue: '0',
    unit: 'ps',
    category: 'nmr-refinement'
  },
  {
    name: 'orire-fitgrp',
    type: 'string',
    description: 'fit group for orientation restraining. This group of atoms is used to determine the rotation **R** of the system with respect to the reference orientation. The reference orientation is the starting conformation of the first subsystem. For a protein, backbone is a reasonable choice',
    descriptionZh: '方向约束的拟合组。此原子组用于确定系统相对于参考方向的旋转 **R**。对于蛋白质，主链是一个合理的选择。参考方向是第一个子系统的起始构象。对于计算起始构象中参考坐标的 COM，周期边界条件不考虑。',
    category: 'nmr-refinement'
  },
  {
    name: 'nstorireout',
    type: 'integer',
    description: 'period between steps when the running time-averaged and instantaneous orientations for all restraints, and the molecular order tensor are written to the energy file (can make the energy file very large)',
    descriptionZh: '将所有约束的运行时间平均和瞬时方向，以及分子阶张量写入能量文件的步数周期（可以使能量文件非常大）',
    defaultValue: '100',
    unit: 'steps',
    category: 'nmr-refinement'
  },

  // 自由能计算 / Free Energy Calculations
  {
    name: 'free-energy',
    type: 'enum',
    description: 'Only use topology A.\n\nInterpolate between topology A (lambda=0) to topology B (lambda=1) and write the derivative of the Hamiltonian with respect to lambda (as specified with dhdl-derivatives), or the Hamiltonian differences with respect to other "foreign" lambda values (as specified with calc-lambda-neighbors) to the energy file and/or to dhdl.xvg, where they can be processed by, for example gmx bar. The potentials, bond-lengths and angles are interpolated linearly as described in the manual. When sc-alpha is larger than zero, soft-core potentials are used for the LJ and Coulomb interactions.\n\nTurns on expanded ensemble simulation, where the alchemical state becomes a dynamic variable, allowing jumping between different Hamiltonians. See the expanded ensemble options for controlling how expanded ensemble simulations are performed. The different Hamiltonians used in expanded ensemble simulations are defined by the other free energy options.',
    validValues: ['no', 'yes', 'expanded'],
    unit: 'bar',
    category: 'free-energy-calculations'
  },
  {
    name: 'init-lambda',
    type: 'integer',
    description: 'starting value for lambda (float). Generally, this should only be used with slow growth (*i.e.* nonzero delta-lambda). In other cases, init-lambda-state should be specified instead. If a lambda vector is given, init-lambda is used to interpolate the vector instead of setting lambda directly. Must be greater than or equal to 0.',
    descriptionZh: 'lambda 的起始值（浮点）。通常，这只应与慢增长（即非零 delta-lambda）一起使用。在其他情况下，应指定 init-lambda-state 而不是。如果给出 lambda 向量，init-lambda 用于插值向量而不是直接设置 lambda。必须大于或等于 0。',
    defaultValue: '-1',
    category: 'free-energy-calculations'
  },
  {
    name: 'delta-lambda',
    type: 'real',
    description: 'increment per time step for lambda',
    descriptionZh: '每时间步的 lambda 增量',
    defaultValue: '0',
    category: 'free-energy-calculations'
  },
  {
    name: 'init-lambda-state',
    type: 'real',
    description: 'starting value for the lambda state (integer). Specifies which column of the lambda vector (coul-lambdas, vdw-lambdas, bonded-lambdas, restraint-lambdas, mass-lambdas, temperature-lambdas, fep-lambdas) should be used. This is a zero-based index: init-lambda-state=0 means the first column, and so on.',
    descriptionZh: 'lambda 状态的起始值（整数）。指定应使用 lambda 向量（coul-lambdas、vdw-lambdas、bonded-lambdas、restraint-lambdas、mass-lambdas、temperature-lambdas、fep-lambdas）的哪一列。这是一个零基索引：init-lambda-state=0 表示第一列，等等。',
    defaultValue: '-1',
    category: 'free-energy-calculations'
  },
  {
    name: 'fep-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps. Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. Free energy differences between different lambda values can then be determined with gmx bar. fep-lambdas is different from the other -lambdas keywords because all components of the lambda vector that are not specified will use fep-lambdas.',
    descriptionZh: '[array] 零、一个或多个 lambda 值，将确定 Delta H 值并每 nstdhdl 步写入 dhdl.xvg。值必须大于或等于 0；大于 1 的值是允许的，但应小心使用。自由能差异随后可以使用 gmx bar 在不同 lambda 值之间确定。fep-lambdas 与其他 -lambdas 关键字不同，因为所有未指定的 lambda 向量组件都使用 fep-lambdas。',
    unit: 'array',
    category: 'free-energy-calculations'
  },
  {
    name: 'coul-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps. Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. If soft-core potentials are used, values must be between 0 and 1. Only the electrostatic interactions are controlled with this component of the lambda vector (and only if the lambda=0 and lambda=1 states have differing electrostatic interactions).',
    descriptionZh: '[array] 零、一个或多个 lambda 值，将确定 Delta H 值并每 nstdhdl 步写入 dhdl.xvg。值必须大于或等于 0；大于 1 的值是允许的，但应小心使用。如果使用软核势，值必须在 0 和 1 之间。只有 lambda=0 和 lambda=1 状态有不同静电相互作用时，lambda 向量的此组件才控制静电相互作用。',
    unit: 'array',
    range: { min: 0.0, max: 1.0 },
    category: 'free-energy-calculations'
  },
  {
    name: 'vdw-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps.  Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. If soft-core potentials are used, values must be between 0 and 1. Only the van der Waals interactions are controlled with this component of the lambda vector.',
    descriptionZh: '[array] 零、一个或多个 lambda 值，将确定 Delta H 值并每 nstdhdl 步写入 dhdl.xvg。值必须大于或等于 0；大于 1 的值是允许的，但应小心使用。如果使用软核势，值必须在 0 和 1 之间。只有 lambda 向量的此组件控制 van der Waals 相互作用。',
    unit: 'array',
    range: { min: 0.0, max: 1.0 },
    category: 'free-energy-calculations'
  },
  {
    name: 'bonded-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps.  Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. Only the bonded interactions are controlled with this component of the lambda vector.',
    descriptionZh: '[array] 零、一个或多个 lambda 值，将确定 Delta H 值并每 nstdhdl 步写入 dhdl.xvg。值必须大于或等于 0；大于 1 的值是允许的，但应小心使用。只有 lambda 向量的此组件控制键合相互作用。',
    unit: 'array',
    category: 'free-energy-calculations'
  },
  {
    name: 'restraint-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps.  Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. Only the restraint interactions: dihedral restraints, and the pull code restraints are controlled with this component of the lambda vector.',
    descriptionZh: '[array] 零、一个或多个 lambda 值，将确定 Delta H 值并每 nstdhdl 步写入 dhdl.xvg。值必须大于或等于 0；大于 1 的值是允许的，但应小心使用。只有二面角约束和拉动代码约束由 lambda 向量的此组件控制。',
    unit: 'array',
    category: 'free-energy-calculations'
  },
  {
    name: 'mass-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps.  Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. Only the particle masses are controlled with this component of the lambda vector.',
    descriptionZh: '[array] 零、一个或多个 lambda 值，将确定 Delta H 值并每 nstdhdl 步写入 dhdl.xvg。值必须大于或等于 0；大于 1 的值是允许的，但应小心使用。只有粒子质量由 lambda 向量的此组件控制。',
    unit: 'array',
    category: 'free-energy-calculations'
  },
  {
    name: 'temperature-lambdas',
    type: 'real',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps.  Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. Only the temperatures are controlled with this component of the lambda vector. Note that these lambdas should not be used for replica exchange, only for simulated tempering.',
    descriptionZh: '[array] 零、一个或多个 lambda 值，将确定 Delta H 值并每 nstdhdl 步写入 dhdl.xvg。值必须大于或等于 0；大于 1 的值是允许的，但应小心使用。只有温度由 lambda 向量的此组件控制。注意，这些 lambdas 不应用于副本交换，只用于模拟退火。',
    unit: 'array',
    category: 'free-energy-calculations'
  },
  {
    name: 'calc-lambda-neighbors',
    type: 'integer',
    description: 'Controls the number of lambda values for which Delta H values will be calculated and written out, if init-lambda-state has been set. These lambda values are referred to as "foreign" lambdas. A positive value will limit the number of lambda points calculated to only the nth neighbors of init-lambda-state: for example, if init-lambda-state is 5 and this parameter has a value of 2, energies for lambda points 3-7 will be calculated and writen out. A value of -1 means all lambda points will be written out. For normal BAR such as with gmx bar, a value of 1 is sufficient, while for MBAR -1 should be used.',
    descriptionZh: '控制将计算 Delta H 值并写出的 lambda 值数量，如果设置了 init-lambda-state。这些 lambda 值被称为“外国” lambda。正值将限制计算的 lambda 点数量，仅为 init-lambda-state 的第 n 个邻居：例如，如果 init-lambda-state 是 5，此参数的值为 2，则 lambda 点 3-7 将被计算并写出。对于正常 BAR 如 gmx bar，值为 1 就足够，而对于 MBAR -1 应该使用。',
    defaultValue: '1',
    unit: 'bar',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-function',
    type: 'enum',
    description: 'Beutler *et al.* soft-core function\n\nGapsys *et al.* soft-core function',
    descriptionZh: 'Beutler 等人的软核函数Gapsys 等人的软核函数',
    defaultValue: 'beutler',
    validValues: ['beutler', 'gapsys'],
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-alpha',
    type: 'string',
    description: 'for `sc-function=beutler` the soft-core alpha parameter, a value of 0 results in linear interpolation of the LJ and Coulomb interactions. Used only with `sc-function=beutler`',
    descriptionZh: '对于 sc-function=beutler，软核 alpha 参数，值为 0 导致 LJ 和 Coulomb 相互作用的线性插值。仅与 sc-function=beutler 一起使用',
    defaultValue: '0',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-r-power',
    type: 'string',
    description: 'power 6 for the radial term in the soft-core equation. Used only with `sc-function=beutler`',
    descriptionZh: '软核方程中径向项的幂 6。仅与 sc-function=beutler 一起使用',
    defaultValue: '6',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-coul',
    type: 'boolean',
    description: 'Whether to apply the soft-core free energy interaction transformation to the Coulombic interaction of a molecule. Default is no, as it is generally more efficient to turn off the Coulombic interactions linearly before turning off the van der Waals interactions. Note that it is only taken into account when there are multiple lambda components, and you can still turn off soft-core interactions by setting sc-alpha to 0. Used only with `sc-function=beutler`',
    descriptionZh: '是否将软核自由能相互作用变换应用于分子的 Coulomb 相互作用。默认是 no，因为通常更有效的是线性关闭 Coulomb 相互作用，然后关闭 van der Waals 相互作用。注意，即使您稍后设置 sc-alpha 为 0，您仍然可以关闭软核相互作用。仅与 sc-function=beutler 一起使用',
    defaultValue: 'no',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-power',
    type: 'string',
    description: 'the power for lambda in the soft-core function, only the values 1 and 2 are supported. Used only with `sc-function=beutler`',
    descriptionZh: '软核函数中 lambda 的幂，值 1 和 2 支持。仅与 sc-function=beutler 一起使用',
    defaultValue: '1',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-sigma',
    type: 'string',
    description: 'for `sc-function=beutler` the soft-core sigma for particles which have a C6 or C12 parameter equal to zero or a sigma smaller than sc-sigma. Used only with `sc-function=beutler`',
    descriptionZh: '对于 sc-function=beutler，具有 C6 或 C12 参数等于零或小于 sc-sigma 的 sigma 的粒子软核 sigma。仅与 sc-function=beutler 一起使用',
    defaultValue: '0.3',
    unit: 'nm',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-gapsys-scale-linpoint-lj',
    type: 'real',
    description: 'for `sc-function=gapsys` it is the unitless alphaLJ parameter. It controls the softness of the van der Waals interactions by scaling the point for linearizing the vdw force. Setting it to 0 will result in the standard hard-core van der Waals interactions. Used only with `sc-function=gapsys`',
    descriptionZh: '对于 sc-function=gapsys，它是无量纲 alphaLJ 参数。它控制 van der Waals 相互作用的软度，通过缩放线性化力的点。设置为 0 将导致标准硬核 van der Waals 相互作用。仅与 sc-function=gapsys 一起使用',
    defaultValue: '0.85',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-gapsys-scale-linpoint-q',
    type: 'string',
    description: 'For `sc-function=gapsys` the alphaQ parameter with a default value of 0.3. It controls the softness of the Coulombic interactions. Setting it to 0 will result in the standard hard-core Coulombic interactions. Used only with `sc-function=gapsys`',
    descriptionZh: '对于 sc-function=gapsys，alphaQ 参数，默认值为 0.3。它控制 Coulomb 相互作用的软度。设置为 0 将导致标准硬核 Coulomb 相互作用。仅与 sc-function=gapsys 一起使用',
    defaultValue: '0.3',
    unit: 'nm/e^2',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-gapsys-sigma-lj',
    type: 'string',
    description: 'for `sc-function=gapsys` the soft-core sigma for particles which have a C6 or C12 parameter equal to zero. Used only with `sc-function=gapsys`',
    descriptionZh: '对于 sc-function=gapsys，具有 C6 或 C12 参数等于零的粒子的软核 sigma。仅与 sc-function=gapsys 一起使用',
    defaultValue: '0.3',
    unit: 'nm',
    category: 'free-energy-calculations'
  },
  {
    name: 'couple-moltype',
    type: 'real',
    description: 'Here one can supply a molecule type (as defined in the topology) for calculating solvation or coupling free energies. There is a special option system that couples all molecule types in the system. This can be useful for equilibrating a system starting from (nearly) random coordinates. free-energy has to be turned on. The Van der Waals interactions and/or charges in this molecule type can be turned on or off between lambda=0 and lambda=1, depending on the settings of couple-lambda0 and couple-lambda1. If you want to decouple one of several copies of a molecule, you need to copy and rename the molecule definition in the topology.',
    descriptionZh: '这里您可以提供一个分子类型（在拓扑中定义）用于计算溶剂化或耦合自由能。有特殊选项 system，它耦合系统中的所有分子类型。这可以用于从（几乎）随机坐标开始平衡系统。free-energy 必须开启。Van der Waals 相互作用和/或电荷在此分子类型中可以在 lambda=0 和 lambda=1 之间开启或关闭，取决于 couple-lambda0 和 couple-lambda1 的设置。如果您想解耦几个拷贝中的一个，您需要在拓扑中复制并重命名分子定义。',
    defaultValue: 'as defined in the topology',
    category: 'free-energy-calculations'
  },
  {
    name: 'couple-lambda0',
    type: 'enum',
    description: 'all interactions are on at lambda=0\n\nthe charges are zero (no Coulomb interactions) at lambda=0\n\nthe Van der Waals interactions are turned off at lambda=0; soft-core interactions will be required to avoid singularities\n\nthe Van der Waals interactions are turned off and the charges are zero at lambda=0; soft-core interactions will be required to avoid singularities.',
    descriptionZh: 'lambda=0 时所有相互作用都开启lambda=0 时电荷为零（无 Coulomb 相互作用）lambda=0 时 Van der Waals 相互作用关闭；软核相互作用将是必需的以避免奇点lambda=0 时 Van der Waals 相互作用关闭且电荷为零；软核相互作用将是必需的以避免奇点。',
    validValues: ['vdw-q', 'vdw', 'q', 'none'],
    category: 'free-energy-calculations'
  },
  {
    name: 'couple-lambda1',
    type: 'string',
    description: 'analogous to couple-lambda0, but for lambda=1',
    descriptionZh: '与 couple-lambda0 类似，但对于 lambda=1',
    category: 'free-energy-calculations'
  },
  {
    name: 'couple-intramol',
    type: 'enum',
    description: 'All intra-molecular non-bonded interactions for moleculetype couple-moltype are replaced by exclusions and explicit pair interactions. In this manner the decoupled state of the molecule corresponds to the proper vacuum state without periodicity effects.\n\nThe intra-molecular Van der Waals and Coulomb interactions are also turned on/off. This can be useful for partitioning free-energies of relatively large molecules, where the intra-molecular non-bonded interactions might lead to kinetically trapped vacuum conformations. The 1-4 pair interactions are not turned off.',
    descriptionZh: '分子类型 couple-moltype 的所有分子内非键合相互作用被排除和显式对相互作用替换。这样，解耦分子的状态对应于正确的真空状态，而无周期性效应。分子内 Van der Waals 和 Coulomb 相互作用也被开启/关闭。这可以用于分区相对大分子的自由能，其中分子内非键合相互作用可能导致动力学陷阱真空构象。1-4 对相互作用不关闭。',
    validValues: ['no', 'yes'],
    category: 'free-energy-calculations'
  },
  {
    name: 'nstdhdl',
    type: 'integer',
    description: 'the interval for writing dH/dlambda and possibly Delta H to dhdl.xvg, 0 means no ouput, should be a multiple of nstcalcenergy.',
    descriptionZh: '将 dH/dlambda 和可能 Delta H 写入 dhdl.xvg 的间隔，0 表示无输出，应是 nstcalcenergy 的倍数。',
    defaultValue: '100',
    category: 'free-energy-calculations'
  },
  {
    name: 'dhdl-derivatives',
    type: 'boolean',
    description: 'If yes (the default), the derivatives of the Hamiltonian with respect to lambda at each nstdhdl step are written out. These values are needed for interpolation of linear energy differences with gmx bar (although the same can also be achieved with the right calc-lambda-neighbors setting, that may not be as flexible), or with thermodynamic integration',
    descriptionZh: '如果 yes（默认），每个 nstdhdl 步 lambda 相对于 lambda 的哈密顿导数写入。这些值对于使用 gmx bar 插值线性能量差异是必需的（虽然使用正确的 calc-lambda-neighbors 设置也可以实现相同），或用于热力学积分',
    defaultValue: 'yes',
    unit: 'bar',
    category: 'free-energy-calculations'
  },
  {
    name: 'dhdl-print-energy',
    type: 'boolean',
    description: 'Include either the total or the potential energy in the dhdl file. Options are \'no\', \'potential\', or \'total\'. This information is needed for later free energy analysis if the states of interest are at different temperatures. If all states are at the same temperature, this information is not needed. \'potential\' is useful in case one is using mdrun -rerun to generate the dhdl.xvg file. When rerunning from an existing trajectory, the kinetic energy will often not be correct, and thus one must compute the residual free energy from the potential alone, with the kinetic energy component computed analytically.',
    defaultValue: 'no',
    category: 'free-energy-calculations'
  },
  {
    name: 'separate-dhdl-file',
    type: 'enum',
    description: 'The free energy values that are calculated (as specified with calc-lambda-neighbors and dhdl-derivatives settings) are written out to a separate file, with the default name dhdl.xvg. This file can be used directly with :ref:`gmx bar`.\n\nThe free energy values are written out to the energy output file (ener.edr, in accumulated blocks at every nstenergy steps), where they can be extracted with gmx energy or used directly with gmx bar.',
    descriptionZh: '计算的自由能值（根据 calc-lambda-neighbors 和 dhdl-derivatives 设置指定）写入单独的文件，默认名称 dhdl.xvg。此文件可以直接与 gmx bar 一起使用。自由能值写入能量输出文件（ener.edr，在每个 nstenergy 步的累积块中），其中可以使用 gmx energy 提取或直接与 gmx bar 一起使用。',
    validValues: ['yes', 'no'],
    unit: 'bar',
    category: 'free-energy-calculations'
  },
  {
    name: 'dh-hist-size',
    type: 'real',
    description: 'If nonzero, specifies the size of the histogram into which the Delta H values (specified with calc-lambda-neighbors) and the derivative dH/dl values are binned, and written to ener.edr. This can be used to save disk space while calculating free energy differences. One histogram gets written for each foreign lambda and two for the dH/dl, at every nstenergy step. Be aware that incorrect histogram settings (too small size or too wide bins) can introduce errors. Do not use histograms unless you are certain you need it.',
    descriptionZh: '如果非零，指定将 Delta H 值（根据 calc-lambda-neighbors 指定）和 dH/dl 值装入的直方图大小，并每 nstenergy 步写入 ener.edr。这可以用于在计算自由能差异时节省磁盘空间。每个外国 lambda 写入一个直方图，dH/dl 写入两个。注意，错误的直方图设置（大小太小或箱宽太宽）可以引入错误。仅在您确定需要时使用直方图。',
    defaultValue: '0',
    category: 'free-energy-calculations'
  },
  {
    name: 'dh-hist-spacing',
    type: 'real',
    description: 'Specifies the bin width of the histograms, in energy units. Used in conjunction with dh-hist-size. This size limits the accuracy with which free energies can be calculated. Do not use histograms unless you are certain you need it.',
    descriptionZh: '指定直方图的箱宽，以能量单位。与 dh-hist-size 一起使用。此大小限制了可以计算自由能的准确性。仅在您确定需要时使用直方图。',
    defaultValue: '0.1',
    category: 'free-energy-calculations'
  },

  // 扩展系综计算 / Expanded Ensemble Calculations
  {
    name: 'nstexpanded',
    type: 'integer',
    description: 'The number of integration steps beween attempted moves changing the system Hamiltonian in expanded ensemble simulations. Must be a multiple of nstcalcenergy, but can be greater or less than nstdhdl.',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-stats',
    type: 'enum',
    description: 'No Monte Carlo in state space is performed.\n\nUses the Metropolis weights to update the expanded ensemble weight of each state. Min{1,exp(-(beta_new u_new - beta_old u_old)}\n\nUses the Barker transition critera to update the expanded ensemble weight of each state i, defined by exp(-beta_new u_new)/(exp(-beta_new u_new)+exp(-beta_old u_old))\n\nUses the Wang-Landau algorithm (in state space, not energy space) to update the expanded ensemble weights.\n\nUses the minimum variance updating method of Escobedo et al. to update the expanded ensemble weights. Weights will not be the free energies, but will rather emphasize states that need more sampling to give even uncertainty.',
    descriptionZh: '不执行状态空间中的蒙特卡罗。使用 Metropolis 权重更新每个状态的扩展系综权重。Min{1,exp(-(beta_new u_new - beta_old u_old))}使用 Barker 跃迁标准更新每个状态的扩展系综权重，定义为 exp(-beta_new u_new)/(exp(-beta_new u_new)+exp(-beta_old u_old))使用 Wang-Landau 算法（在状态空间中，不是能量空间中）更新扩展系综权重。使用 Escobedo 等人的最小方差更新方法更新扩展系综权重。权重将不是自由能，而是将强调需要更多采样以获得均匀不确定性的状态。',
    validValues: ['no', 'metropolis-transition', 'barker-transition', 'wang-landau', 'min-variance'],
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-mc-move',
    type: 'enum',
    description: 'No Monte Carlo in state space is performed.\n\nRandomly chooses a new state up or down, then uses the Metropolis criteria to decide whether to accept or reject: Min{1,exp(-(beta_new u_new - beta_old u_old)}\n\nRandomly chooses a new state up or down, then uses the Barker transition criteria to decide whether to accept or reject: exp(-beta_new u_new)/(exp(-beta_new u_new)+exp(-beta_old u_old))\n\nUses the conditional weights of the state given the coordinate (exp(-beta_i u_i) / sum_k exp(beta_i u_i) to decide which state to move to.\n\nUses the conditional weights of the state given the coordinate (exp(-beta_i u_i) / sum_k exp(beta_i u_i) to decide which state to move to, EXCLUDING the current state, then uses a rejection step to ensure detailed balance. Always more efficient that Gibbs, though only marginally so in many situations, such as when only the nearest neighbors have decent phase space overlap.',
    descriptionZh: '不执行状态空间中的蒙特卡罗。随机选择新状态向上或向下，然后使用 Metropolis 标准决定接受或拒绝：Min{1,exp(-(beta_new u_new - beta_old u_old))}随机选择新状态向上或向下，然后使用 Barker 跃迁标准决定接受或拒绝：exp(-beta_new u_new)/(exp(-beta_new u_new)+exp(-beta_old u_old))使用坐标给状态的条件权重（exp(-beta_i u_i) / sum_k exp(beta_i u_i)）决定移动到哪个状态。使用坐标给状态的条件权重（exp(-beta_i u_i) / sum_k exp(beta_i u_i)）决定移动到哪个状态，排除当前状态，然后使用拒绝步骤以确保详细平衡。总是在许多情况下比 Gibbs 更有效，尽管只是略微如此。',
    validValues: ['no', 'metropolis-transition', 'barker-transition', 'gibbs', 'metropolized-gibbs'],
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-seed',
    type: 'string',
    description: 'random seed to use for Monte Carlo moves in state space. When lmc-seed is set to -1, a pseudo random seed is us',
    descriptionZh: '用于状态空间中蒙特卡罗移动的随机种子。当 lmc-seed 设置为 -1 时，使用伪随机种子。',
    defaultValue: '-1',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'mc-temperature',
    type: 'real',
    description: 'Temperature used for acceptance/rejection for Monte Carlo moves. If not specified, the temperature of the simulation specified in the first group of ref-t is used.',
    descriptionZh: '用于蒙特卡罗移动的接受/拒绝的温度。如果未指定，使用 ref-t 的第一个组中指定的模拟温度。',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'wl-ratio',
    type: 'integer',
    description: 'The cutoff for the histogram of state occupancies to be reset, and the free energy incrementor to be changed from delta to delta * wl-scale. If we define the Nratio = (number of samples at each histogram) / (average number of samples at each histogram). wl-ratio of 0.8 means that means that the histogram is only considered flat if all Nratio > 0.8 AND simultaneously all 1/Nratio > 0.8.',
    descriptionZh: '重置状态占用直方图的截止，以及将自由能增量从 delta 更改为 delta * wl-scale。如果我们定义 Nratio = （每个直方图的样本数量） / （每个直方图的平均样本数量）。wl-ratio 为 0.8 表示意味着只有当所有 Nratio > 0.8 且同时所有 1/Nratio > 0.8 时，直方图才被认为是平坦的。',
    defaultValue: '0.8',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'wl-scale',
    type: 'real',
    description: 'Each time the histogram is considered flat, then the current value of the Wang-Landau incrementor for the free energies is multiplied by wl-scale. Value must be between 0 and 1.',
    descriptionZh: '每次直方图被认为是平坦时，当前 Wang-Landau 自由能的增量乘以 wl-scale。值必须在 0 和 1 之间。',
    defaultValue: '0.8',
    range: { min: 0.0, max: 1.0 },
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'init-wl-delta',
    type: 'real',
    description: 'The initial value of the Wang-Landau incrementor in kT. Some value near 1 kT is usually most efficient, though sometimes a value of 2-3 in units of kT works better if the free energy differences are large.',
    descriptionZh: 'Wang-Landau 增量的初始值，以 kT 为单位。有些值接近 1 kT 通常最有效，尽管有时值为 2-3 以 kT 为单位的作品更好，如果自由能差异很大。',
    defaultValue: '1.0',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'wl-oneovert',
    type: 'integer',
    description: 'Set Wang-Landau incrementor to scale with 1/(simulation time) in the large sample limit. There is significant evidence that the standard Wang-Landau algorithms in state space presented here result in free energies getting \'burned in\' to incorrect values that depend on the initial state. when wl-oneovert is true, then when the incrementor becomes less than 1/N, where N is the number of samples collected (and thus proportional to the data collection time, hence \'1 over t\'), then the Wang-Lambda incrementor is set to 1/N, decreasing every step. Once this occurs, wl-ratio is ignored, but the weights will still stop updating when the equilibration criteria set in lmc-weights-equil is achieved.',
    defaultValue: 'no',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-repeats',
    type: 'integer',
    description: 'Controls the number of times that each Monte Carlo swap type is performed each iteration. In the limit of large numbers of Monte Carlo repeats, then all methods converge to Gibbs sampling. The value will generally not need to be different from 1.',
    descriptionZh: '控制每个迭代执行的蒙特卡罗交换类型数量。在大蒙特卡罗重复次数的极限中，所有方法收敛到 Gibbs 采样。该值通常不需要不同于 1。',
    defaultValue: '1',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-gibbsdelta',
    type: 'real',
    description: 'Limit Gibbs sampling to selected numbers of neighboring states. For Gibbs sampling, it is sometimes inefficient to perform Gibbs sampling over all of the states that are defined. A positive value of lmc-gibbsdelta means that only states plus or minus lmc-gibbsdelta are considered in exchanges up and down. A value of -1 means that all states are considered. For less than 100 states, it is probably not that expensive to include all states.',
    descriptionZh: '将 Gibbs 采样限制到选定的邻近状态数量。对于 Gibbs 采样，有时在所有定义的状态上执行 Gibbs 采样效率低下。正 lmc-gibbsdelta 值意味着只有状态加上或减去 lmc-gibbsdelta 被考虑在向上和向下交换中。值为 -1 意味着所有状态被考虑。对于少于 100 个状态，通常不那么昂贵包括所有状态。',
    defaultValue: '-1',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-forced-nstart',
    type: 'integer',
    description: 'Force initial state space sampling to generate weights. In order to come up with reasonable initial weights, this setting allows the simulation to drive from the initial to the final lambda state, with lmc-forced-nstart steps at each state before moving on to the next lambda state. If lmc-forced-nstart is sufficiently long (thousands of steps, perhaps), then the weights will be close to correct. However, in most cases, it is probably better to simply run the standard weight equilibration algorithms.',
    descriptionZh: '强制初始状态空间采样以生成权重。为了获得合理的初始权重，此设置允许模拟从初始驱动到最终 lambda 状态，每个状态 lmc-forced-nstart 步，然后移动到下一个 lambda 状态。如果 lmc-forced-nstart 足够长（数千步，或许），则权重将接近正确。然而，在大多数情况下，最好简单运行标准权重平衡算法。',
    defaultValue: '0',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'nst-transition-matrix',
    type: 'integer',
    description: 'Interval of outputting the expanded ensemble transition matrix. A negative number means it will only be printed at the end of the simulation.',
    descriptionZh: '输出扩展系综跃迁矩阵的间隔。负数意味着它只在模拟结束时打印。',
    defaultValue: '-1',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'symmetrized-transition-matrix',
    type: 'real',
    description: 'Whether to symmetrize the empirical transition matrix. In the infinite limit the matrix will be symmetric, but will diverge with statistical noise for short timescales. Forced symmetrization, by using the matrix T_sym = 1/2 (T + transpose(T)), removes problems like the existence of (small magnitude) negative eigenvalues.',
    descriptionZh: '是否对称化经验跃迁矩阵。在无限极限中矩阵将是 symmetric，但由于统计噪声在短时间尺度上会发散。强制对称化，通过使用矩阵 T_sym = 1/2 (T + transpose(T))，移除（小幅度）负特征值的问题。',
    defaultValue: 'no',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'mininum-var-min',
    type: 'integer',
    description: 'The min-variance strategy (option of lmc-stats is only valid for larger number of samples, and can get stuck if too few samples are used at each state. mininum-var-min is the minimum number of samples that each state that are allowed before the min-variance strategy is activated if selected.',
    descriptionZh: '最小方差策略（lmc-stats 的选项）仅对较大样本数量有效，并且如果使用太少样本在每个状态可以卡住。mininum-var-min 是允许每个状态的最小样本数量，然后激活最小方差策略如果选择。',
    defaultValue: '100',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'init-lambda-weights',
    type: 'string',
    description: 'The initial weights (free energies) used for the expanded ensemble states. Default is a vector of zero weights. format is similar to the lambda vector settings in fep-lambdas, except the weights can be any floating point number. Units are kT. Its length must match the lambda vector lengths.',
    descriptionZh: '用于扩展系综状态的初始权重（自由能）。默认是一个零权重向量。格式类似于 lambda 向量设置在 fep-lambdas 中，除了权重可以是任何浮点数。以 kT 为单位。其长度必须匹配 lambda 向量长度。',
    defaultValue: 'free energies',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'init-wl-histogram-counts',
    type: 'real',
    description: 'The initial counts used for the Wang-Landau histogram of visiting expanded ensemble states. The flatness of this histogram is used to decide whether to decrement the histogram-building incrementor. This option is only generally useful if continuing a shorter simulation from a previous one, as the smaller the incrementor gets, the longer it takes for the histogram to become flat, often longer than a short simulation takes, requiring the histogram population to be carried over from the previous simulation. The default is a vector of zeros. The format is similar to the lambda vector settings in fep-lambdas. The value can be a floating point number or an integer, as some methods increment multiple histogram bins at the same time with fractional weights. Its length must match the lambda vector lengths.',
    descriptionZh: '用于 Wang-Landau 访问扩展系综状态的直方图的初始计数。此直方图的平坦度用于决定是否递减直方图构建增量。此选项通常仅在从较短模拟继续到另一个时有用，因为增量变得越小，需要的时间越长，通常比短模拟运行的时间长，要求从前一个模拟携带直方图填充。默认是一个零向量。格式类似于 lambda 向量设置在 fep-lambdas。其值可以是浮点数或整数，因为一些方法在同一时间增量多个直方图箱与分数权重。',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'init-lambda-counts',
    type: 'integer',
    description: 'The initial counts used for the number of times each expanded ensemble state is visited states. Several algorithms set by lmc-weights-equil use various functions of the number of visits to each state states to decide whether to switch to different phases of weight determination. These include number-all-lambda which requires the mumber of times each lambda state is visited to be equal to or greater than this number, number-samples, which requires the total number of visits to all lambda states to be greater than or equal to this, and count-ratio, which requires the number of states visited at each state to be within a given ratio of equal visitation. This option is only generally useful if continuing a shorter simulation from a previous one, as most methods will reach the triggering conditions with relatively low number of samples collected. The default is a vector of zeros. The format is similar to the lambda vector settings in fep-lambdas.  Unlike init-wl-histogram, the value can only be an integer. Its length must match the lambda vector lengths.',
    descriptionZh: '用于访问每个扩展系综状态的状态数量的初始计数。几种算法由 lmc-weights-equil 设置使用各种函数的每个状态访问数量来决定是否切换到权重确定的不同阶段。这些包括 number-all-lambda，要求每个 lambda 状态的访问数量大于或等于此，number-samples，要求所有 lambda 状态的总访问数量大于或等于此，count-ratio，要求每个状态的访问数量在相等访问的给定比率内。此选项通常仅在从较短模拟继续到另一个时有用，因为大多数方法将达到触发条件与相对低数量的样本收集。默认是一个零向量。格式类似于 lambda 向量设置在 fep-lambdas。与 init-wl-histogram 不同，其值只能是整数。其长度必须匹配 lambda 向量长度。',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-weights-equil',
    type: 'enum',
    description: 'Expanded ensemble weights continue to be updated throughout the simulation.\n\nThe input expanded ensemble weights are treated as equilibrated, and are not updated throughout the simulation.\n\nExpanded ensemble weight updating is stopped when the Wang-Landau incrementor falls below this value.\n\nExpanded ensemble weight updating is stopped when the number of samples at all of the lambda states is greater than this value.\n\nExpanded ensemble weight updating is stopped when the number of steps is greater than the level specified by this value.\n\nExpanded ensemble weight updating is stopped when the number of total samples across all lambda states is greater than the level specified by this value.\n\nExpanded ensemble weight updating is stopped when the ratio of samples at the least sampled lambda state and most sampled lambda state greater than this value.',
    descriptionZh: '扩展系综权重在整个模拟中继续更新。输入扩展系综权重被视为平衡的，并在整个模拟中不更新。扩展系综权重更新在 Wang-Landau 增量低于此值时停止。扩展系综权重更新在所有 lambda 状态的样本数量大于此值时停止。扩展系综权重更新在步数大于此级别时停止。扩展系综权重更新在所有 lambda 状态的总样本数量大于此级别时停止。扩展系综权重更新在最少采样 lambda 状态和最多采样 lambda 状态的样本比率大于此值时停止。',
    validValues: ['no', 'yes', 'wl-delta', 'number-all-lambda', 'number-steps', 'number-samples', 'count-ratio'],
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'simulated-tempering',
    type: 'boolean',
    description: 'Turn simulated tempering on or off. Simulated tempering is implemented as expanded ensemble sampling with different temperatures instead of different Hamiltonians.',
    descriptionZh: '开启或关闭模拟退火。模拟退火作为扩展系综采样实现，不同哈密顿而是不同温度。',
    defaultValue: 'no',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'sim-temp-low',
    type: 'real',
    description: 'Low temperature for simulated tempering.',
    descriptionZh: '模拟退火的低温。',
    defaultValue: '300',
    unit: 'K',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'sim-temp-high',
    type: 'real',
    description: 'High temperature for simulated tempering.',
    descriptionZh: '模拟退火的高温。',
    defaultValue: '300',
    unit: 'K',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'simulated-tempering-scaling',
    type: 'enum',
    description: 'Controls the way that the temperatures at intermediate lambdas are calculated from the temperature-lambdas part of the lambda vector.\n\nLinearly interpolates the temperatures using the values of temperature-lambdas, *i.e.* if sim-temp-low =300, sim-temp-high =400, then lambda=0.5 correspond to a temperature of 350. A nonlinear set of temperatures can always be implemented with uneven spacing in lambda.\n\nInterpolates temperatures geometrically between sim-temp-low and sim-temp-high. The i:th state has temperature sim-temp-low * (sim-temp-high / sim-temp-low) raised to the power of (i/(ntemps-1)). This should give roughly equal exchange for constant heat capacity, though of course things simulations that involve protein folding have very high heat capacity peaks.\n\nInterpolates temperatures exponentially between sim-temp-low and sim-temp-high. The i:th state has temperature sim-temp-low + (sim-temp-high - sim-temp-low)*((exp(temperature-lambdas (i))-1)/(exp(1.0)-i)).',
    descriptionZh: '控制温度如何从温度-lambdas 部分 lambda 向量在中间 lambda 处计算。使用温度-lambdas 的值线性插值温度，即如果 sim-temp-low =300，sim-temp-high =400，则 lambda=0.5 对应温度 350。非线性温度集总是可以通过 lambda 中的不均匀间距实现。在 sim-temp-low 和 sim-temp-high 之间几何插值温度。第 i 个状态具有温度 sim-temp-low * (sim-temp-high / sim-temp-low) 提高到幂 (i/(ntemps-1))。这应该给出恒定热容的近似相等交换，尽管当然模拟涉及蛋白质折叠有非常高的热容峰。在 sim-temp-low 和 sim-temp-high 之间指数插值温度。第 i 个状态具有温度 sim-temp-low + (sim-temp-high - sim-temp-low)*((exp(温度-lambdas (i))-1)/(exp(1.0)-i))。',
    validValues: ['linear', 'geometric', 'exponential'],
    category: 'expanded-ensemble-calculations'
  },

  // 非平衡MD / Non-equilibrium MD
  {
    name: 'acc-grps',
    type: 'real',
    description: 'groups for constant acceleration (*e.g.* Protein Sol) all atoms in groups Protein and Sol will experience constant acceleration as specified in the accelerate line. Note that the kinetic energy of the center of mass of accelerated groups contributes to the kinetic energy and temperature of the system. If this is not desired, make each accelerate group also a separate temperature coupling group.',
    defaultValue: '*e.g.* Protein Sol',
    category: 'non-equilibrium-md'
  },
  {
    name: 'accelerate',
    type: 'string',
    description: 'acceleration for acc-grps; x, y and z for each group (*e.g.* 0.1 0.0 0.0 -0.1 0.0 0.0 means that first group has constant acceleration of 0.1 nm ps\ ^-2 in X direction, second group the opposite).',
    descriptionZh: 'acc-grps 的加速度；x、y 和 z 为每个组（例如 0.1 0.0 0.0 -0.1 0.0 0.0 表示第一组在 X 方向有恒定加速度 0.1 nm ps^-2，第二组相反）。',
    defaultValue: '0',
    unit: 'nm ps\ ^-2',
    category: 'non-equilibrium-md'
  },
  {
    name: 'freezegrps',
    type: 'string',
    description: 'Groups that are to be frozen (*i.e.* their X, Y, and/or Z position will not be updated; *e.g.* Lipid SOL). freezedim specifies for which dimension(s) the freezing applies. Note that the virial and pressure are usually not meaningful when frozen atoms are present. Note that coordinates of frozen atoms are not scaled by pressure-coupling algorithms.',
    descriptionZh: '要冻结的组（即它们的 X、Y 和/或 Z 位置不会更新；例如 Lipid SOL）。freezedim 指定冻结适用于哪些维度。注意，当存在冻结原子时，维里和压力通常没有意义。注意，冻结原子的坐标不被压力耦合算法缩放。',
    category: 'non-equilibrium-md'
  },
  {
    name: 'freezedim',
    type: 'string',
    description: 'dimensions for which groups in freezegrps should be frozen, specify Y or N for X, Y and Z and for each group (*e.g.* Y Y N N N N means that particles in the first group can move only in Z direction. The particles in the second group can move in any direction).',
    descriptionZh: 'freezegrps 中组应冻结的维度，为 X、Y 和 Z 指定 Y 或 N 以及每个组（例如 Y Y N N N N 表示第一组中的粒子只能在 Z 方向移动。第二组中的粒子可以在任何方向移动）。',
    category: 'non-equilibrium-md'
  },
  {
    name: 'cos-acceleration',
    type: 'real',
    description: 'the amplitude of the acceleration profile for calculating the viscosity. The acceleration is in the X-direction and the magnitude is cos-acceleration cos(2 pi z/boxheight). Two terms are added to the energy file: the amplitude of the velocity profile and 1/viscosity.',
    descriptionZh: '用于计算粘度的加速度轮廓幅度。加速度在 X 方向，幅度为 cos-acceleration cos(2 pi z/boxheight)。两个项添加到能量文件中：速度轮廓的幅度和 1/粘度。',
    defaultValue: '0',
    unit: 'nm ps\ ^-2',
    category: 'non-equilibrium-md'
  },
  {
    name: 'deform',
    type: 'integer',
    description: 'The velocities of deformation for the box elements: a(x) b(y) c(z) b(x) c(x) c(y). Each step the box elements for which deform is non-zero are calculated as: box(ts)+(t-ts)*deform, off-diagonal elements are corrected for periodicity. The time ts is set to t at the first step and at steps at which x and v are written to trajectory to ensure exact restarts. Deformation can be used together with semiisotropic or anisotropic pressure coupling when the appropriate compressibilities are set to zero. The diagonal elements can be used to strain a solid. The off-diagonal elements can be used to shear a solid or a liquid. Note that the atom positions are not affected directly by this option. Instead, the deform option only modifies the velocities of particles that are shifted by a periodic box vector such that their new velocities match the virtual velocity flow field corresponding to the box deformation. As the deform option never accelerates the remaining particles in the system, the matching velocity flow field should be set up at the beginning of the simulation to make the particles follow the deformation. This can be done with the deform-init-flow option. The flow field is removed from the kinetic energy by gmx mdrun so the actual temperature and pressure of the system are reported.',
    descriptionZh: '盒子元素的变形速度：a(x) b(y) c(z) b(x) c(x) c(y)。每个步，如果 deform 非零，则盒子元素计算为：box(ts)+(t-ts)*deform，非对角元素为周期性校正。时间 ts 在第一步设置，并在轨迹中写入 x 和 v 的步中设置，以确保精确重启。变形可以与半各向同性或各向异性压力耦合一起使用，当适当的压缩率设置为零时。对角元素可用于拉伸固体。非对角元素可用于剪切固体或液体。注意，原子位置不直接受此选项影响。相反，deform 选项仅修改通过周期盒向量移位的粒子的速度，使得它们的新的速度匹配盒子变形对应的虚拟速度流场。由于 deform 选项从不加速系统中的其余粒子，匹配速度流场应该在模拟开始时设置，以使粒子跟随变形。这可以使用 deform-init-flow 选项完成。流场从动能中移除，以便 gmx mdrun 报告系统的实际温度和压力。',
    defaultValue: '0',
    unit: 'nm ps\ ^-1',
    category: 'non-equilibrium-md'
  },
  {
    name: 'deform-init-flow',
    type: 'enum',
    description: 'Do not modify the velocities. Only use this option when the velocities of the atoms in the initial configuration already obey the flow field.\n\nWhen the deform option is active, add a velocity profile corresponding to the box deformation to the initial velocities. This is done after computing observables from the initial state such as the initial temperature.',
    descriptionZh: '不要修改速度。只在初始构象中的原子速度已经遵守流场时使用此选项。当 deform 选项激活时，将对应于盒子变形的速度轮廓添加到初始速度中。这在计算初始状态的可观测之前完成，例如初始温度。',
    validValues: ['no', 'yes'],
    category: 'non-equilibrium-md'
  },

  // 电场 / Electric Fields
  {
    name: 'electric-field-x',
    type: 'string',
    description: '',
    category: 'electric-fields'
  },
  {
    name: 'electric-field-y',
    type: 'string',
    description: '',
    descriptionZh: '',
    category: 'electric-fields'
  },
  {
    name: 'electric-field-z',
    type: 'string',
    description: 'Here you can specify an electric field that optionally can be alternating and pulsed. The general expression for the field has the form of a gaussian laser pulse:\n\nFor example, the four parameters for direction x are set in the fields of electric-field-x (and similar for electric-field-y and electric-field-z) like\n\nelectric-field-x  = E0 omega t0 sigma\n\nwith units (respectively) V nm\ ^-1, ps\ ^-1, ps, ps.\n\nIn the special case that sigma = 0, the exponential term is omitted and only the cosine term is used. In this case, t0 must be set to 0. If also omega = 0 a static electric field is applied.\n\nRead more at electric fields and in ref. \ 146 <refCaleman2008a>.',
    descriptionZh: '这里您可以指定一个可选交变和脉冲的电场。一般表达式具有高斯激光脉冲的形式：例如，方向 x 的四个参数在 electric-field-x 的字段中设置（对于 electric-field-y 和 electric-field-z 类似）如electric-field-x = E0 omega t0 sigma单位分别为（V nm^-1、ps^-1、ps、ps）。在特殊情况下 sigma = 0，指数项被省略，只使用余弦项。在这种情况下，t0 必须设置为 0。如果也 omega = 0，则应用静态电场。更多阅读见电场和参考 146 <refCaleman2008a>。',
    unit: 'ps',
    category: 'electric-fields'
  },

  // QM/MM
  {
    name: 'QMMM-grps',
    type: 'enum',
    description: 'groups to be described at the QM level for MiMiC QM/MM\n\nQM/MM is no longer supported via these .mdp options. For MiMic, use no here.',
    validValues: ['no'],
    category: 'qmmm'
  },

  // 计算电生理学 / Computational Electrophysiology
  {
    name: 'swapcoords',
    type: 'enum',
    description: 'Do not enable ion/water position exchanges.\n\nAllow for ion/water position exchanges along the chosen direction. In a typical setup with the membranes parallel to the x-y plane, ion/water pairs need to be exchanged in Z direction to sustain the requested ion concentrations in the compartments.',
    validValues: ['no', 'X'],
    category: 'computational-electrophysiology'
  },
  {
    name: 'swap-frequency',
    type: 'integer',
    description: '(1) The swap attempt frequency, i.e. every how many time steps the ion counts per compartment are determined and exchanges made if necessary. Normally, it is not necessary to check at every time step. For typical Computational Electrophysiology setups, a value of about 100 is sufficient and yields a negligible performance impact.',
    descriptionZh: '(1) 交换尝试频率，即每多少时间步确定每个隔室的离子计数并进行交换如果必要。通常，不需要在每个时间步检查。对于典型的计算电生理设置，约 100 的值就足够，并产生可忽略的性能影响。',
    defaultValue: '1',
    category: 'computational-electrophysiology'
  },
  {
    name: 'split-group0',
    type: 'string',
    description: 'Name of the index group of the membrane-embedded part of channel #0. The center of mass of these atoms defines one of the compartment boundaries and should be chosen such that it is near the center of the membrane.',
    descriptionZh: '通道嵌入部分的索引组名称 #0。原子质心的中心定义隔室边界之一，应该选择靠近膜中心。',
    category: 'computational-electrophysiology'
  },
  {
    name: 'split-group1',
    type: 'string',
    description: 'Defines the position of the other compartment boundary.',
    descriptionZh: '定义另一个隔室边界的。',
    category: 'computational-electrophysiology'
  },
  {
    name: 'massw-split0',
    type: 'enum',
    description: '(no) Defines whether or not mass-weighting is used to calculate the split group center.\n\nUse the geometrical center.\n\nUse the center of mass.',
    descriptionZh: '(no) 定义是否使用质量加权来计算分割组中心。使用几何中心。使用质心。',
    defaultValue: 'no',
    validValues: ['no', 'yes'],
    category: 'computational-electrophysiology'
  },
  {
    name: 'massw-split1',
    type: 'boolean',
    description: '(no) As above, but for split-group1.',
    descriptionZh: '(no) 与上面相同，但对于 split-group1。',
    defaultValue: 'no',
    category: 'computational-electrophysiology'
  },
  {
    name: 'solvent-group',
    type: 'string',
    description: 'Name of the index group of solvent molecules.',
    descriptionZh: '溶剂分子的索引组名称。',
    category: 'computational-electrophysiology'
  },
  {
    name: 'coupl-steps',
    type: 'integer',
    description: '(10) Average the number of ions per compartment over these many swap attempt steps. This can be used to prevent that ions near a compartment boundary (diffusing through a channel, e.g.) lead to unwanted back and forth swaps.',
    descriptionZh: '(10) 在这些交换尝试步上平均每个隔室的离子数量。这可以用于防止靠近隔室边界（例如通过通道扩散）的离子导致不需要的来回交换。',
    defaultValue: '10',
    category: 'computational-electrophysiology'
  },
  {
    name: 'iontypes',
    type: 'integer',
    description: '(1) The number of different ion types to be controlled. These are during the simulation exchanged with solvent molecules to reach the desired reference numbers.',
    descriptionZh: '(1) 要控制的不同离子类型的数量。这些在模拟期间与溶剂分子交换以达到期望的参考数量。',
    defaultValue: '1',
    category: 'computational-electrophysiology'
  },
  {
    name: 'iontype0-name',
    type: 'string',
    description: 'Name of the first ion type.',
    descriptionZh: '第一离子类型的名称。',
    category: 'computational-electrophysiology'
  },
  {
    name: 'iontype0-in-A',
    type: 'integer',
    description: '(-1) Requested (=reference) number of ions of type 0 in compartment A. The default value of -1 means: use the number of ions as found in time step 0 as reference value.',
    descriptionZh: '(-1) 隔室 A 中类型 0 离子的请求（=参考）数量。默认值 -1 表示：使用时间步 0 中找到的离子数量作为参考值。',
    defaultValue: '-1',
    category: 'computational-electrophysiology'
  },
  {
    name: 'iontype0-in-B',
    type: 'integer',
    description: '(-1) Reference number of ions of type 0 for compartment B.',
    descriptionZh: '(-1) 隔室 B 中类型 0 离子的参考数量。',
    defaultValue: '-1',
    category: 'computational-electrophysiology'
  },
  {
    name: 'bulk-offsetA',
    type: 'real',
    description: '(0.0) Offset of the first swap layer from the compartment A midplane. By default (i.e. bulk offset = 0.0), ion/water exchanges happen between layers at maximum distance (= bulk concentration) to the split group layers. However, an offset b (-1.0 < b < +1.0) can be specified to offset the bulk layer from the middle at 0.0 towards one of the compartment-partitioning layers (at +/- 1.0).',
    descriptionZh: '(0.0) 第一交换层的偏移从隔室 A 中平面。默认情况下（即 bulk offset = 0.0），离子/水交换发生在最大距离（= bulk 浓度）到分割组层的层之间。然而，可以指定偏移 b (-1.0 < b < +1.0) 以从中间在 0.0 向一个隔室分区层（在 +/- 1.0）偏移 bulk 层。',
    defaultValue: '0.0',
    category: 'computational-electrophysiology'
  },
  {
    name: 'bulk-offsetB',
    type: 'string',
    description: '(0.0) Offset of the other swap layer from the compartment B midplane.',
    descriptionZh: '(0.0) 另一个交换层的偏移从隔室 B 中平面。',
    defaultValue: '0.0',
    category: 'computational-electrophysiology'
  },
  {
    name: 'threshold',
    type: 'string',
    description: '(1) Only swap ions if threshold difference to requested count is reached.',
    descriptionZh: '(1) 仅在达到请求计数的阈值差异时交换离子。',
    defaultValue: '1',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl0-r',
    type: 'boolean',
    description: '(2.0) [nm] Radius of the split cylinder #0. Two split cylinders (mimicking the channel pores) can optionally be defined relative to the center of the split group. With the help of these cylinders it can be counted which ions have passed which channel. The split cylinder definition has no impact on whether or not ion/water swaps are done.',
    descriptionZh: '(2.0) [nm] 分割圆柱 #0 的半径。可选定义两个分割圆柱（模仿通道孔）相对于分割组中心。使用这些圆柱可以计数哪些离子已通过哪些通道。分割圆柱定义对是否进行离子/水交换没有影响。',
    defaultValue: '2.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl0-up',
    type: 'string',
    description: '(1.0) [nm] Upper extension of the split cylinder #0.',
    descriptionZh: '(1.0) [nm] 分割圆柱 #0 的上延伸。',
    defaultValue: '1.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl0-down',
    type: 'string',
    description: '(1.0) [nm] Lower extension of the split cylinder #0.',
    descriptionZh: '(1.0) [nm] 分割圆柱 #0 的下延伸。',
    defaultValue: '1.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl1-r',
    type: 'string',
    description: '(2.0) [nm] Radius of the split cylinder #1.',
    descriptionZh: '(2.0) [nm] 分割圆柱 #1 的半径。',
    defaultValue: '2.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl1-up',
    type: 'string',
    description: '(1.0) [nm] Upper extension of the split cylinder #1.',
    descriptionZh: '(1.0) [nm] 分割圆柱 #1 的上延伸。',
    defaultValue: '1.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl1-down',
    type: 'string',
    description: '(1.0) [nm] Lower extension of the split cylinder #1.',
    descriptionZh: '(1.0) [nm] 分割圆柱 #1 的下延伸。',
    defaultValue: '1.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },

  // 密度引导模拟 / Density-guided Simulations
  {
    name: 'density-guided-simulation-active',
    type: 'boolean',
    description: '(no) Activate density-guided simulations.',
    defaultValue: 'no',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-group',
    type: 'real',
    description: '(protein) The atoms that are subject to the forces from the density-guided simulation and contribute to the simulated density.',
    descriptionZh: '(protein) 受密度引导模拟力和贡献于模拟密度的原子。',
    defaultValue: 'protein',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-similarity-measure',
    type: 'enum',
    description: '(inner-product) Similarity measure between the density that is calculated from the atom positions and the reference density.\n\nTakes the sum of the product of reference density and simulated density voxel values.\n\nUses the negative relative entropy (or Kullback-Leibler divergence) between reference density and simulated density as similarity measure. Negative density values are ignored.\n\nUses the Pearson correlation coefficient between reference density and simulated density as similarity measure.',
    descriptionZh: '(inner-product) 模拟密度从原子位置计算的密度与参考密度的相似性度量。取参考密度和模拟密度体素值的乘积之和。使用参考密度和模拟密度之间的负相对熵（或 Kullback-Leibler 散度）作为相似性度量。忽略负密度值。使用参考密度和模拟密度之间的 Pearson 相关系数作为相似性度量。',
    defaultValue: 'inner-product',
    validValues: ['inner-product', 'relative-entropy', 'cross-correlation'],
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-atom-spreading-weight',
    type: 'enum',
    description: '(unity) Determines the multiplication factor for the Gaussian kernel when spreading atoms on the grid.\n\nEvery atom in the density fitting group is assigned the same unit factor.\n\nAtoms contribute to the simulated density proportional to their mass.\n\nAtoms contribute to the simulated density proportional to their charge.',
    descriptionZh: '(unity) 确定原子在网格上的扩展的乘法因子。密度引导组中的每个原子分配相同的单位因子。原子按质量比例贡献于模拟密度。原子按电荷比例贡献于模拟密度。',
    defaultValue: 'unity',
    validValues: ['unity', 'mass', 'charge'],
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-force-constant',
    type: 'integer',
    description: '(1e+09) [kJ mol\ ^-1] The scaling factor for density-guided simulation forces. May also be negative.',
    descriptionZh: '(1e+09) [kJ mol^-1] 密度引导模拟力的缩放因子。也可能为负。',
    defaultValue: '1e+09',
    unit: 'kJ mol\ ^-1',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-gaussian-transform-spreading-width',
    type: 'real',
    description: '(0.2) [nm] The Gaussian RMS width for the spread kernel for the simulated density.',
    descriptionZh: '(0.2) [nm] 模拟密度的扩展内核的高斯 RMS 宽度。',
    defaultValue: '0.2',
    unit: 'nm',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-gaussian-transform-spreading-range-in-multiples-of-width',
    type: 'real',
    description: '(4) The range after which the gaussian is cut off in multiples of the Gaussian RMS width described above.',
    descriptionZh: '(4) 之后高斯被切断的范围，以高斯 RMS 宽度的倍数。',
    defaultValue: '4',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-reference-density-filename',
    type: 'real',
    description: '(reference.mrc) Reference density file name using an absolute path or a path relative to the to the folder from which gmx mdrun is called.',
    descriptionZh: '(reference.mrc) 参考密度文件名称，使用绝对路径或相对于 gmx mdrun 调用文件夹的路径。',
    defaultValue: 'reference.mrc',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-nst',
    type: 'integer',
    description: '(1) Interval in steps at which the density fitting forces are evaluated and applied. The forces are scaled by this number when applied (See the reference manual for details).',
    descriptionZh: '(1) 评估和应用密度拟合力的步间隔。应用时力按此数字缩放（见参考手册以获取细节）。',
    defaultValue: '1',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-normalize-densities',
    type: 'boolean',
    description: '(true) Normalize the sum of density voxel values to one for the reference density as well as the simulated density.',
    descriptionZh: '(true) 规范化参考密度以及模拟密度的体素值总和为 1。',
    defaultValue: 'true',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-adaptive-force-scaling',
    type: 'enum',
    description: '(false) Adapt the force constant to ensure a steady increase in similarity between simulated and reference density.\n\nDo not use adaptive force scaling.\n\nUse adaptive force scaling.',
    descriptionZh: '(false) 适应力常数以确保相似性与参考密度之间的稳定增加。不要使用自适应力缩放。使用自适应力缩放。',
    defaultValue: 'false',
    validValues: ['true'],
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-adaptive-force-scaling-time-constant',
    type: 'integer',
    description: '(4) [ps] Couple force constant to increase in similarity with reference density with this time constant. Larger times result in looser coupling.',
    descriptionZh: '(4) [ps] 以此时间常数耦合力常数到相似性增加与参考密度。较大的时间导致更松散耦合。',
    defaultValue: '4',
    unit: 'ps',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-shift-vector',
    type: 'real',
    description: '(0,0,0) [nm] Add this vector to all atoms in the density-guided-simulation-group before calculating forces and energies for density-guided simulations. Affects only the density-guided simulation forces and energies. Corresponds to a shift of the input density in the opposite direction by (-1) * density-guided-simulation-shift-vector.',
    descriptionZh: '(0,0,0) [nm] 在计算密度引导模拟的力和能量之前，将此向量添加到密度引导组中的所有原子。仅影响密度引导模拟力和能量。对应于以 (-1) * density-guided-simulation-shift-vector 方向变换输入密度。',
    defaultValue: '0,0,0',
    unit: 'nm',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-transformation-matrix',
    type: 'real',
    description: '(1,0,0,0,1,0,0,0,1) Multiply all atoms with this matrix in the density-guided-simulation-group before calculating forces and energies for density-guided simulations. Affects only the density-guided simulation forces and energies. Corresponds to a transformation of the input density by the inverse of this matrix. The matrix is given in row-major order. This option allows, e.g., rotation of the density-guided atom group around the z-axis by \theta degrees by using the following input: (\cos \theta , -\sin \theta , 0 , \sin \theta , \cos \theta , 0 , 0 , 0 , 1) .',
    descriptionZh: '(1,0,0,0,1,0,0,0,1) 在计算密度引导模拟的力和能量之前，将此矩阵乘以密度引导组中的所有原子。仅影响密度引导模拟力和能量。对应于以此矩阵的逆变换输入密度。矩阵以行主序给出。此选项允许，例如，围绕 z 轴旋转密度引导原子组 theta 度通过使用以下输入：(\cos theta , -\sin theta , 0 , \sin theta , \cos theta , 0 , 0 , 0 , 1) 。',
    defaultValue: '1,0,0,0,1,0,0,0,1',
    unit: 'degree',
    category: 'density-guided-simulations'
  },

  // QM/MM CP2K接口 / QM/MM CP2K Interface
  {
    name: 'qmmm-cp2k-active',
    type: 'boolean',
    description: '(false) Activate QM/MM simulations. Requires CP2K to be linked with Gromacs',
    defaultValue: 'false',
    category: 'qmmm-cp2k'
  },
  {
    name: 'qmmm-cp2k-qmgroup',
    type: 'string',
    description: '(System) Index group with atoms that are treated with QM.',
    descriptionZh: '(System) 用 QM 处理的原子索引组。',
    defaultValue: 'System',
    category: 'qmmm-cp2k'
  },
  {
    name: 'qmmm-cp2k-qmmethod',
    type: 'enum',
    description: '(PBE) Method used to describe the QM part of the system.\n\nDFT using PBE functional and DZVP-MOLOPT basis set.\n\nDFT using BLYP functional and DZVP-MOLOPT basis set.\n\nProvide an external input file for CP2K when running gmx grompp with the -qmi command-line option. External input files are subject to the limitations that are described in qmmm.',
    descriptionZh: '(PBE) 用于描述系统 QM 部分的 QM 方法。使用 PBE 泛函和 DZVP-MOLOPT 基组的 DFT。使用 BLYP 泛函和 DZVP-MOLOPT 基组的 DFT。提供外部输入文件用于 CP2K 当使用 gmx grompp 的 -qmi 命令行选项运行时。外部输入文件受 qmmm 中描述的限制。',
    defaultValue: 'PBE',
    validValues: ['PBE', 'BLYP', 'INPUT'],
    category: 'qmmm-cp2k'
  },
  {
    name: 'qmmm-cp2k-qmcharge',
    type: 'string',
    description: '(0) Total charge of the QM part.',
    descriptionZh: '(0) QM 部分的总电荷。',
    defaultValue: '0',
    category: 'qmmm-cp2k'
  },
  {
    name: 'qmmm-cp2k-qmmultiplicity',
    type: 'string',
    description: '(1) Multiplicity or spin-state of QM part. Default value 1 means singlet state.',
    descriptionZh: '(1) QM 部分的多样性或自旋状态。默认值 1 表示单重态。',
    defaultValue: '1',
    category: 'qmmm-cp2k'
  },
  {
    name: 'qmmm-cp2k-qmfilenames',
    type: 'string',
    description: '() Names of the CP2K files that will be generated during the simulation. When using the default, empty, value the name of the simulation input file will be used with an additional _cp2k suffix.',
    descriptionZh: '() 将在模拟期间生成的 CP2K 文件名称。当使用默认、空值时，使用模拟输入文件的名称加上 _cp2k 后缀。',
    category: 'qmmm-cp2k'
  },

  // 集体变量 / Collective Variables
  {
    name: 'colvars-active',
    type: 'boolean',
    description: '(false) Activate Colvars computation in the current run. Requires that the Colvars library was compiled with Gromacs, which is the default in a typical installation.',
    defaultValue: 'false',
    category: 'colvars'
  },
  {
    name: 'colvars-configfile',
    type: 'string',
    description: 'Name of the Colvars configuration file, using options specific to Colvars that are documented at: `https://colvars.github.io/gromacs-2025/colvars-refman-gromacs.html <https://colvars.github.io/gromacs-2025/colvars-refman-gromacs.html>`_. The file name can be either an absolute path, or a path relative to the working directory when gmx grompp is called.',
    descriptionZh: 'Colvars 配置文件的名称，使用特定于 Colvars 的选项记录在：`https://colvars.github.io/gromacs-2025/colvars-refman-gromacs.html <https://colvars.github.io/gromacs-2025/colvars-refman-gromacs.html>`_。文件名称可以是绝对路径，或相对于 gmx grompp 调用时的工 作目录。',
    category: 'colvars'
  },
  {
    name: 'colvars-seed',
    type: 'string',
    description: '(-1) [integer] Seed used to initialize the random generator associated with certain stochastic methods implemented within Colvars.  The default value of -1 generates a random seed.',
    descriptionZh: '(-1) [integer] 与 Colvars 中实现的某些随机方法相关的随机生成器的种子。-1 的默认值生成随机种子。',
    defaultValue: '-1',
    unit: 'integer',
    category: 'colvars'
  },
];

// 按类别分组的参数
export const MDP_PARAMETERS_BY_CATEGORY: Record<string, MdpParameter[]> = {
  'preprocessing': MDP_PARAMETERS.filter(p => p.category === 'preprocessing'),
  'run-control': MDP_PARAMETERS.filter(p => p.category === 'run-control'),
  'langevin-dynamics': MDP_PARAMETERS.filter(p => p.category === 'langevin-dynamics'),
  'energy-minimization': MDP_PARAMETERS.filter(p => p.category === 'energy-minimization'),
  'shell-molecular-dynamics': MDP_PARAMETERS.filter(p => p.category === 'shell-molecular-dynamics'),
  'test-particle-insertion': MDP_PARAMETERS.filter(p => p.category === 'test-particle-insertion'),
  'output-control': MDP_PARAMETERS.filter(p => p.category === 'output-control'),
  'neighbor-searching': MDP_PARAMETERS.filter(p => p.category === 'neighbor-searching'),
  'electrostatics': MDP_PARAMETERS.filter(p => p.category === 'electrostatics'),
  'van-der-waals': MDP_PARAMETERS.filter(p => p.category === 'van-der-waals'),
  'tables': MDP_PARAMETERS.filter(p => p.category === 'tables'),
  'ewald': MDP_PARAMETERS.filter(p => p.category === 'ewald'),
  'temperature-coupling': MDP_PARAMETERS.filter(p => p.category === 'temperature-coupling'),
  'pressure-coupling': MDP_PARAMETERS.filter(p => p.category === 'pressure-coupling'),
  'simulated-annealing': MDP_PARAMETERS.filter(p => p.category === 'simulated-annealing'),
  'velocity-generation': MDP_PARAMETERS.filter(p => p.category === 'velocity-generation'),
  'bonds': MDP_PARAMETERS.filter(p => p.category === 'bonds'),
  'energy-group-exclusions': MDP_PARAMETERS.filter(p => p.category === 'energy-group-exclusions'),
  'walls': MDP_PARAMETERS.filter(p => p.category === 'walls'),
  'com-pulling': MDP_PARAMETERS.filter(p => p.category === 'com-pulling'),
  'awh-adaptive-biasing': MDP_PARAMETERS.filter(p => p.category === 'awh-adaptive-biasing'),
  'enforced-rotation': MDP_PARAMETERS.filter(p => p.category === 'enforced-rotation'),
  'nmr-refinement': MDP_PARAMETERS.filter(p => p.category === 'nmr-refinement'),
  'free-energy-calculations': MDP_PARAMETERS.filter(p => p.category === 'free-energy-calculations'),
  'expanded-ensemble-calculations': MDP_PARAMETERS.filter(p => p.category === 'expanded-ensemble-calculations'),
  'non-equilibrium-md': MDP_PARAMETERS.filter(p => p.category === 'non-equilibrium-md'),
  'electric-fields': MDP_PARAMETERS.filter(p => p.category === 'electric-fields'),
  'qmmm': MDP_PARAMETERS.filter(p => p.category === 'qmmm'),
  'computational-electrophysiology': MDP_PARAMETERS.filter(p => p.category === 'computational-electrophysiology'),
  'density-guided-simulations': MDP_PARAMETERS.filter(p => p.category === 'density-guided-simulations'),
  'qmmm-cp2k': MDP_PARAMETERS.filter(p => p.category === 'qmmm-cp2k'),
  'colvars': MDP_PARAMETERS.filter(p => p.category === 'colvars'),
};

// 获取 VS Code 的界面语言
function getVSCodeLanguage(): string {
  return vscode.env.language;
}

// 根据参数名获取参数信息（自动根据语言环境返回对应描述）
export function getMdpParameter(name: string): MdpParameter | undefined {
  const param = MDP_PARAMETERS.find(p => 
    p.name.toLowerCase() === name.toLowerCase() || 
    p.name.replace(/-/g, '_').toLowerCase() === name.toLowerCase() ||
    p.name.replace(/_/g, '-').toLowerCase() === name.toLowerCase()
  );
  
  if (!param) {
    return undefined;
  }
  
  // 获取当前语言环境
  const locale = getVSCodeLanguage();
  
  // 如果是中文环境且有中文描述，创建一个新对象，用中文描述替换英文描述
  if (locale.startsWith('zh') && param.descriptionZh) {
    return {
      ...param,
      description: param.descriptionZh
    };
  }
  
  // 否则返回原始参数（使用英文描述）
  return param;
}

// 根据语言环境获取参数描述（保留此函数以便需要显式指定语言的场景）
export function getParameterDescription(param: MdpParameter, locale?: string): string {
  // 如果没有指定语言，使用 VS Code 的语言设置
  const lang = locale || getVSCodeLanguage();
  
  // 如果是中文环境且有中文描述，返回中文描述，否则返回英文描述
  return (lang.startsWith('zh') && param.descriptionZh) ? param.descriptionZh : param.description;
}

// 根据参数名和语言环境获取描述（保留此函数以便需要显式指定语言的场景）
export function getParameterDescriptionByName(name: string, locale?: string): string | undefined {
  // 先获取原始参数（不经过语言转换）
  const param = MDP_PARAMETERS.find(p => 
    p.name.toLowerCase() === name.toLowerCase() || 
    p.name.replace(/-/g, '_').toLowerCase() === name.toLowerCase() ||
    p.name.replace(/_/g, '-').toLowerCase() === name.toLowerCase()
  );
  
  return param ? getParameterDescription(param, locale) : undefined;
}
export function getAllParameterNames(): string[] {
  const names: string[] = [];
  MDP_PARAMETERS.forEach(param => {
    names.push(param.name);
    if (param.name.includes('-')) {
      names.push(param.name.replace(/-/g, '_'));
    }
    if (param.name.includes('_')) {
      names.push(param.name.replace(/_/g, '-'));
    }
  });
  return [...new Set(names)];
}

// 根据类别获取参数
export function getParametersByCategory(category: string): MdpParameter[] {
  return MDP_PARAMETERS.filter(param => param.category === category);
}
