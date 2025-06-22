/**
 * GROMACS MDP 参数定义
 * 包含所有 GROMACS 参数的类型、默认值、有效值范围和描述信息
 */

export interface MdpParameter {
  name: string;
  type: 'string' | 'integer' | 'real' | 'boolean' | 'enum';
  description: string;
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
    category: 'preprocessing'
  },
  {
    name: 'define',
    type: 'string',
    description: 'defines to pass to the preprocessor, default is no defines. You can use any defines to control options in your customized topology files. Options that act on existing top file mechanisms include\n\n-DFLEXIBLE will use flexible water instead of rigid water into your topology, this can be useful for normal mode analysis.\n\n-DPOSRES will trigger the inclusion of posre.itp into your topology, used for implementing position restraints.',
    category: 'preprocessing'
  },

  // 运行控制 / Run Control
  {
    name: 'integrator',
    type: 'enum',
    description: '(Despite the name, this list includes algorithms that are not actually integrators over time. integrator=steep and all entries following it are in this category)\n\nA leap-frog algorithm for integrating Newton\'s equations of motion.\n\nA velocity Verlet algorithm for integrating Newton\'s equations of motion.  For constant NVE simulations started from corresponding points in the same trajectory, the trajectories are analytically, but not binary, identical to the integrator=md leap-frog integrator. The kinetic energy is determined from the whole step velocities and is therefore slightly too high. The advantage of this integrator is more accurate, reversible Nose-Hoover and Parrinello-Rahman coupling integration based on Trotter expansion, as well as (slightly too small) full step velocity output. This all comes at the cost of extra computation, especially with constraints and extra communication in parallel. Note that for nearly all production simulations the integrator=md integrator is accurate enough.\n\nA velocity Verlet algorithm identical to integrator=md-vv, except that the kinetic energy is determined as the average of the two half step kinetic energies as in the integrator=md integrator, and this thus more accurate.  With Nose-Hoover and/or Parrinello-Rahman coupling this comes with a slight increase in computational cost.\n\nAn accurate and efficient leap-frog stochastic dynamics integrator. With constraints, coordinates needs to be constrained twice per integration step. Depending on the computational cost of the force calculation, this can take a significant part of the simulation time. The temperature for one or more groups of atoms (tc-grps) is set with ref-t, the inverse friction constant for each group is set with tau-t.  The parameters tcoupl and nsttcouple are ignored. The random generator is initialized with ld-seed. When used as a thermostat, an appropriate value for tau-t is 2 ps, since this results in a friction that is lower than the internal friction of water, while it is high enough to remove excess heat NOTE: temperature deviations decay twice as fast as with a Berendsen thermostat with the same tau-t.\n\nAn Euler integrator for Brownian or position Langevin dynamics. The velocity is the force divided by a friction coefficient (bd-fric) plus random thermal noise (ref-t). When bd-fric is 0, the friction coefficient for each particle is calculated as mass/ tau-t, as for the integrator integrator=sd. The random generator is initialized with ld-seed.\n\nA steepest descent algorithm for energy minimization. The maximum step size is emstep, the tolerance is emtol.\n\nA conjugate gradient algorithm for energy minimization, the tolerance is emtol. CG is more efficient when a steepest descent step is done every once in a while, this is determined by nstcgsteep. For a minimization prior to a normal mode analysis, which requires a very high accuracy, Gromacs should be compiled in double precision.\n\nA quasi-Newtonian algorithm for energy minimization according to the low-memory Broyden-Fletcher-Goldfarb-Shanno approach. In practice this seems to converge faster than Conjugate Gradients, but due to the correction steps necessary it is not (yet) parallelized.\n\nNormal mode analysis is performed on the structure in the tpr file.  Gromacs should be compiled in double precision.\n\nTest particle insertion. The last molecule in the topology is the test particle. A trajectory must be provided to ``mdrun -rerun``. This trajectory should not contain the molecule to be inserted. Insertions are performed nsteps times in each frame at random locations and with random orientations of the molecule. When nstlist is larger than one, nstlist insertions are performed in a sphere with radius rtpi around a the same random location using the same pair list. Since pair list construction is expensive, one can perform several extra insertions with the same list almost for free. The random seed is set with ld-seed. The temperature for the Boltzmann weighting is set with ref-t, this should match the temperature of the simulation of the original trajectory. Dispersion correction is implemented correctly for TPI. All relevant quantities are written to the file specified with mdrun -tpi. The distribution of insertion energies is written to the file specified with mdrun -tpid. No trajectory or energy file is written. Parallel TPI gives identical results to single-node TPI. For charged molecules, using PME with a fine grid is most accurate and also efficient, since the potential in the system only needs to be calculated once per frame.\n\nTest particle insertion into a predefined cavity location. The procedure is the same as for integrator=tpi, except that one coordinate extra is read from the trajectory, which is used as the insertion location. The molecule to be inserted should be centered at 0,0,0. Gromacs does not do this for you, since for different situations a different way of centering might be optimal. Also rtpi sets the radius for the sphere around this location. Neighbor searching is done only once per frame, nstlist is not used. Parallel integrator=tpic gives identical results to single-rank integrator=tpic.\n\nEnable MiMiC QM/MM coupling to run hybrid molecular dynamics. Keey in mind that its required to launch CPMD compiled with MiMiC as well. In this mode all options regarding integration (T-coupling, P-coupling, timestep and number of steps) are ignored as CPMD will do the integration instead. Options related to forces computation (cutoffs, PME parameters, etc.) are working as usual. Atom selection to define QM atoms is read from QMMM-grps',
    defaultValue: 'md',
    validValues: ['md', 'md-vv', 'md-vv-avek', 'sd', 'bd', 'steep', 'cg', 'l-bfgs', 'nm', 'tpi', 'tpic', 'mimic'],
    unit: 'ps',
    category: 'run-control'
  },
  {
    name: 'tinit',
    type: 'real',
    description: 'starting time for your run (only makes sense for time-based integrators)',
    defaultValue: '0',
    unit: 'ps',
    category: 'run-control'
  },
  {
    name: 'dt',
    type: 'real',
    description: 'time step for integration (only makes sense for time-based integrators)',
    defaultValue: '0.001',
    unit: 'ps',
    range: { min: 0.0001, max: 0.01 },
    category: 'run-control'
  },
  {
    name: 'nsteps',
    type: 'integer',
    description: 'maximum number of steps to integrate or minimize, -1 is no maximum',
    defaultValue: '0',
    range: { min: 0 },
    category: 'run-control'
  },
  {
    name: 'init-step',
    type: 'integer',
    description: 'The starting step. The time at step i in a run is calculated as: t = tinit + dt * (init-step + i). The free-energy lambda is calculated as: lambda = init-lambda + delta-lambda * (init-step + i). Also non-equilibrium MD parameters can depend on the step number. Thus for exact restarts or redoing part of a run it might be necessary to set init-step to the step number of the restart frame. gmx convert-tpr does this automatically.',
    defaultValue: '0',
    category: 'run-control'
  },
  {
    name: 'simulation-part',
    type: 'string',
    description: 'A simulation can consist of multiple parts, each of which has a part number. This option specifies what that number will be, which helps keep track of parts that are logically the same simulation. This option is generally useful to set only when coping with a crashed simulation where files were lost.',
    defaultValue: '0',
    category: 'run-control'
  },
  {
    name: 'mts',
    type: 'enum',
    description: 'Evaluate all forces at every integration step.\n\nUse a multiple timing-stepping integrator to evaluate some forces, as specified by mts-level2-forces every mts-level2-factor integration steps. All other forces are evaluated at every step. MTS is currently only supported with integrator=md.',
    validValues: ['no', 'yes'],
    category: 'run-control'
  },
  {
    name: 'mts-levels',
    type: 'integer',
    description: 'The number of levels for the multiple time-stepping scheme. Currently only 2 is supported.',
    defaultValue: '2',
    category: 'run-control'
  },
  {
    name: 'mts-level2-forces',
    type: 'integer',
    description: 'A list of one or more force groups that will be evaluated only every mts-level2-factor steps. Supported entries are: longrange-nonbonded, nonbonded, pair, dihedral, angle, pull and awh. With pair the listed pair forces (such as 1-4) are selected. With dihedral all dihedrals are selected, including cmap. All other forces, including all restraints, are evaluated and integrated every step. When PME or Ewald is used for electrostatics and/or LJ interactions, longrange-nonbonded can not be omitted here.',
    defaultValue: 'longrange-nonbonded',
    category: 'run-control'
  },
  {
    name: 'mts-level2-factor',
    type: 'real',
    description: 'Interval for computing the forces in level 2 of the multiple time-stepping scheme',
    defaultValue: '2',
    unit: 'steps',
    category: 'run-control'
  },
  {
    name: 'mass-repartition-factor',
    type: 'real',
    description: 'Scales the masses of the lightest atoms in the system by this factor to the mass mMin. All atoms with a mass lower than mMin also have their mass set to that mMin. The mass change is subtracted from the mass of the atom the light atom is bound to. If there is no bound atom a warning is generated. If there is more than one atom bound an error is generated. If the mass of the bound atom would become lower than mMin an error is generated. For typical atomistic systems only the masses of hydrogens are scaled. With constraints=h-bonds, a factor of 3 will usually enable a time step of 4 fs.',
    defaultValue: '1',
    unit: 'fs',
    category: 'run-control'
  },
  {
    name: 'comm-mode',
    type: 'enum',
    description: 'Remove center of mass translational velocity\n\nRemove center of mass translational and rotational velocity\n\nRemove center of mass translational velocity. Correct the center of mass position assuming linear acceleration over nstcomm steps. This is useful for cases where an acceleration is expected on the center of mass which is nearly constant over nstcomm steps. This can occur for example when pulling on a group using an absolute reference.\n\nNo restriction on the center of mass motion',
    validValues: ['Linear', 'Angular', 'Linear-acceleration-correction', 'None'],
    category: 'run-control'
  },
  {
    name: 'nstcomm',
    type: 'integer',
    description: 'interval for center of mass motion removal',
    defaultValue: '100',
    unit: 'steps',
    category: 'run-control'
  },
  {
    name: 'comm-grps',
    type: 'string',
    description: 'group(s) for center of mass motion removal, default is the whole system',
    defaultValue: 's',
    category: 'run-control'
  },

  // 朗之万动力学 / Langevin Dynamics
  {
    name: 'bd-fric',
    type: 'integer',
    description: 'Brownian dynamics friction coefficient. When bd-fric is 0, the friction coefficient for each particle is calculated as mass/ tau-t.',
    defaultValue: '0',
    unit: 'amu ps\ ^-1',
    category: 'langevin-dynamics'
  },
  {
    name: 'ld-seed',
    type: 'integer',
    description: 'used to initialize random generator for thermal noise for stochastic and Brownian dynamics. When ld-seed is set to -1, a pseudo random seed is used. When running BD or SD on multiple processors, each processor uses a seed equal to ld-seed plus the processor number.',
    defaultValue: '-1',
    unit: 'integer',
    category: 'langevin-dynamics'
  },

  // 能量最小化 / Energy Minimization
  {
    name: 'emtol',
    type: 'real',
    description: 'the minimization is converged when the maximum force is smaller than this value',
    defaultValue: '10.0',
    unit: 'kJ mol\ ^-1 nm\ ^-1',
    category: 'energy-minimization'
  },
  {
    name: 'emstep',
    type: 'integer',
    description: 'initial step-size',
    defaultValue: '0.01',
    unit: 'nm',
    category: 'energy-minimization'
  },
  {
    name: 'nstcgsteep',
    type: 'integer',
    description: 'interval of performing 1 steepest descent step while doing conjugate gradient energy minimization.',
    defaultValue: '1000',
    unit: 'steps',
    category: 'energy-minimization'
  },
  {
    name: 'nbfgscorr',
    type: 'integer',
    description: 'Number of correction steps to use for L-BFGS minimization. A higher number is (at least theoretically) more accurate, but slower.',
    defaultValue: '10',
    category: 'energy-minimization'
  },

  // 壳层分子动力学 / Shell Molecular Dynamics
  {
    name: 'niter',
    type: 'integer',
    description: 'maximum number of iterations for optimizing the shell positions and the flexible constraints.',
    defaultValue: '20',
    category: 'shell-molecular-dynamics'
  },
  {
    name: 'fcstep',
    type: 'integer',
    description: 'the step size for optimizing the flexible constraints. Should be chosen as mu/(d2V/dq2) where mu is the reduced mass of two particles in a flexible constraint and d2V/dq2 is the second derivative of the potential in the constraint direction. Hopefully this number does not differ too much between the flexible constraints, as the number of iterations and thus the runtime is very sensitive to fcstep. Try several values!',
    defaultValue: '0',
    unit: 'ps\ ^2',
    category: 'shell-molecular-dynamics'
  },

  // 测试粒子插入 / Test Particle Insertion
  {
    name: 'rtpi',
    type: 'string',
    description: 'the test particle insertion radius, see integrators integrator=tpi and integrator=tpic',
    defaultValue: '0.05',
    unit: 'nm',
    category: 'test-particle-insertion'
  },

  // 输出控制 / Output Control
  {
    name: 'nstxout',
    type: 'integer',
    description: 'number of steps that elapse between writing coordinates to the output trajectory file (trr), the first and last coordinates are always written unless 0, which means coordinates are not written into the trajectory file.',
    defaultValue: '0',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'nstvout',
    type: 'integer',
    description: 'number of steps that elapse between writing velocities to the output trajectory file (trr), the first and last velocities are always written unless 0, which means velocities are not written into the trajectory file.',
    defaultValue: '0',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'nstfout',
    type: 'integer',
    description: 'number of steps that elapse between writing forces to the output trajectory file (trr), the first and last forces are always written, unless 0, which means forces are not written into the trajectory file.',
    defaultValue: '0',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'nstlog',
    type: 'integer',
    description: 'number of steps that elapse between writing energies to the log file, the first and last energies are always written.',
    defaultValue: '1000',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'nstcalcenergy',
    type: 'integer',
    description: 'number of steps that elapse between calculating the energies, 0 is never. This option is only relevant with dynamics. This option affects the performance in parallel simulations, because calculating energies requires global communication between all processes which can become a bottleneck at high parallelization.',
    defaultValue: '100',
    category: 'output-control'
  },
  {
    name: 'nstenergy',
    type: 'integer',
    description: 'number of steps that elapse between writing energies to the energy file (edr), the first and last energies are always written, should be a multiple of nstcalcenergy. Note that the exact sums and fluctuations over all MD steps modulo nstcalcenergy are stored in the energy file, so gmx energy can report exact energy averages and fluctuations also when nstenergy > 1',
    defaultValue: '1000',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'nstxout-compressed',
    type: 'integer',
    description: 'number of steps that elapse between writing position coordinates using lossy compression (xtc file), the first and last coordinates are always written, unless 0, which means that there is no compressed coordinates output.',
    defaultValue: '0',
    unit: 'steps',
    category: 'output-control'
  },
  {
    name: 'compressed-x-precision',
    type: 'real',
    description: 'precision with which to write to the compressed trajectory file',
    defaultValue: '1000',
    unit: 'real',
    category: 'output-control'
  },
  {
    name: 'compressed-x-grps',
    type: 'string',
    description: 'group(s) to write to the compressed trajectory file, by default the whole system is written (if nstxout-compressed > 0)',
    defaultValue: 's',
    category: 'output-control'
  },
  {
    name: 'energygrps',
    type: 'string',
    description: 'group(s) for which to write to write short-ranged non-bonded potential energies to the energy file (not supported on GPUs)',
    defaultValue: 's',
    category: 'output-control'
  },

  // 邻居搜索 / Neighbor Searching
  {
    name: 'cutoff-scheme',
    type: 'enum',
    description: 'Generate a pair list with buffering. The buffer size is automatically set based on verlet-buffer-tolerance, unless this is set to -1, in which case rlist will be used.\n\nGenerate a pair list for groups of atoms, corresponding to the charge groups in the topology. This option is no longer supported.',
    defaultValue: 'Verlet',
    validValues: ['Verlet', 'group'],
    category: 'neighbor-searching'
  },
  {
    name: 'nstlist',
    type: 'integer',
    description: 'Interval between steps that update the neighbor list. When dynamics and verlet-buffer-tolerance set, nstlist is actually a minimum value and gmx mdrun might increase it, unless it is set to 1. With parallel simulations and/or non-bonded force calculation on the GPU, a value of 20 or 40 often gives the best performance. With energy minimization this parameter is not used as the pair list is updated when at least one atom has moved by more than half the pair list buffer size.\n\nThe neighbor list is only constructed once and never updated. This is mainly useful for vacuum simulations in which all particles see each other. But vacuum simulations are (temporarily) not supported.\n\nUnused.',
    defaultValue: '10',
    range: { min: 0, max: 1000000 },
    unit: 'steps',
    category: 'neighbor-searching'
  },
  {
    name: 'pbc',
    type: 'enum',
    description: 'Use periodic boundary conditions in all directions.\n\nUse no periodic boundary conditions, ignore the box. To simulate without cut-offs, set all cut-offs and nstlist to 0. For best performance without cut-offs on a single MPI rank, set nstlist to zero.\n\nUse periodic boundary conditions in x and y directions only. This can be used in combination with walls_. Without walls or with only one wall the system size is infinite in the z direction. Therefore pressure coupling or Ewald summation methods can not be used. These disadvantages do not apply when two walls are used.',
    defaultValue: 'xyz',
    validValues: ['xyz', 'no', 'xy'],
    category: 'neighbor-searching'
  },
  {
    name: 'periodic-molecules',
    type: 'enum',
    description: 'molecules are finite, fast molecular PBC can be used\n\nfor systems with molecules that couple to themselves through the periodic boundary conditions, this requires a slower PBC algorithm and molecules are not made whole in the output',
    validValues: ['no', 'yes'],
    category: 'neighbor-searching'
  },
  {
    name: 'verlet-buffer-tolerance',
    type: 'real',
    description: 'Used when performing a simulation with dynamics. This sets the maximum allowed error for pair interactions per particle caused by the Verlet buffer, which indirectly sets rlist. As both nstlist and the Verlet buffer size are fixed (for performance reasons), particle pairs not in the pair list can occasionally get within the cut-off distance during nstlist -1 steps. This causes very small jumps in the energy. In a constant-temperature ensemble, these very small energy jumps can be estimated for a given cut-off and rlist. The estimate assumes a homogeneous particle distribution, hence the errors might be slightly underestimated for multi-phase systems. (See the reference manual for details). For longer pair-list life-time (nstlist -1) * dt the buffer is overestimated, because the interactions between particles are ignored. Combined with cancellation of errors, the actual drift of the total energy is usually one to two orders of magnitude smaller. Note that the generated buffer size takes into account that the Gromacs pair-list setup leads to a reduction in the drift by a factor 10, compared to a simple particle-pair based list. Without dynamics (energy minimization etc.), the buffer is 5% of the cut-off. For NVE simulations the initial temperature is used, unless this is zero, in which case a buffer of 10% is used. For NVE simulations the tolerance usually needs to be lowered to achieve proper energy conservation on the nanosecond time scale. To override the automated buffer setting, use verlet-buffer-tolerance =-1 and set rlist manually.',
    defaultValue: '0.005',
    unit: 'kJ mol\ ^-1 ps\ ^-1',
    category: 'neighbor-searching'
  },
  {
    name: 'verlet-buffer-pressure-tolerance',
    type: 'real',
    description: 'Used when performing a simulation with dynamics and only active when verlet-buffer-tolerance is positive. This sets the maximum tolerated error in the average pressure due to missing Lennard-Jones interactions of particle pairs that are not in the pair list, but come within rvdw range as the pair list ages. As for the drift tolerance, the (over)estimate of the pressure error is tight at short times. At longer time it turns into a significant overestimate, because interactions limit the displacement of particles. Note that the default tolerance of 0.5 bar corresponds to a maximum relative deviation of the density of liquid water of 2e-5.',
    defaultValue: '0.5',
    unit: 'bar',
    category: 'neighbor-searching'
  },
  {
    name: 'rlist',
    type: 'real',
    description: 'Cut-off distance for the short-range neighbor list. With dynamics, this is by default set by the verlet-buffer-tolerance and verlet-buffer-pressure-tolerance options and the value of rlist is ignored. Without dynamics, this is by default set to the maximum cut-off plus 5% buffer, except for test particle insertion, where the buffer is managed exactly and automatically. For NVE simulations, where the automated setting is not possible, the advised procedure is to run gmx grompp with an NVT setup with the expected temperature and copy the resulting value of rlist to the NVE setup.',
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
    defaultValue: 'PME',
    validValues: ['Cut-off', 'Ewald', 'PME', 'P3M-AD', 'Reaction-Field', 'User', 'PME-Switch', 'PME-User', 'PME-User-Switch'],
    unit: 'nm',
    category: 'electrostatics'
  },
  {
    name: 'coulomb-modifier',
    type: 'enum',
    description: 'Shift the Coulomb potential by a constant such that it is zero at the cut-off. This makes the potential the integral of the force. Note that this does not affect the forces or the sampling.\n\nUse an unmodified Coulomb potential. This can be useful when comparing energies with those computed with other software.',
    validValues: ['Potential-shift', 'None', 'Potential-shift-Verlet'],
    category: 'electrostatics'
  },
  {
    name: 'rcoulomb-switch',
    type: 'real',
    description: 'where to start switching the Coulomb potential, only relevant when force or potential switching is used',
    defaultValue: '0',
    unit: 'nm',
    category: 'electrostatics'
  },
  {
    name: 'rcoulomb',
    type: 'real',
    description: 'The distance for the Coulomb cut-off. Note that with PME this value can be increased by the PME tuning in gmx mdrun along with the PME grid spacing.',
    defaultValue: '1',
    unit: 'nm',
    range: { min: 0 },
    category: 'electrostatics'
  },
  {
    name: 'epsilon-r',
    type: 'string',
    description: 'The relative dielectric constant. A value of 0 means infinity.',
    defaultValue: '1',
    category: 'electrostatics'
  },
  {
    name: 'epsilon-rf',
    type: 'string',
    description: 'The relative dielectric constant of the reaction field. This is only used with reaction-field electrostatics. A value of 0 means infinity.',
    defaultValue: '0',
    category: 'electrostatics'
  },

  // 范德华相互作用 / Van der Waals
  {
    name: 'vdwtype',
    type: 'enum',
    description: 'Plain cut-off with pair list radius rlist and VdW cut-off rvdw, where rlist >= rvdw.\n\nFast smooth Particle-mesh Ewald (SPME) for VdW interactions. The grid dimensions are controlled with fourierspacing in the same way as for electrostatics, and the interpolation order is controlled with pme-order. The relative accuracy of direct/reciprocal space is controlled by ewald-rtol-lj, and the specific combination rules that are to be used by the reciprocal routine are set using lj-pme-comb-rule.\n\nThis functionality is deprecated and replaced by using vdwtype=Cut-off with vdw-modifier=Force-switch. The LJ (not Buckingham) potential is decreased over the whole range and the forces decay smoothly to zero between rvdw-switch and rvdw.\n\nThis functionality is deprecated and replaced by using vdwtype=Cut-off with vdw-modifier=Potential-switch. The LJ (not Buckingham) potential is normal out to rvdw-switch, after which it is switched off to reach zero at rvdw. Both the potential and force functions are continuously smooth, but be aware that all switch functions will give rise to a bulge (increase) in the force (since we are switching the potential).\n\nCurrently unsupported. See coulombtype=User for instructions. The function value at zero is not important. When you want to use LJ correction, make sure that rvdw corresponds to the cut-off in the user-defined function. When coulombtype is not set to User the values for the f and -f\' columns are ignored.',
    defaultValue: 'Cut-off',
    validValues: ['Cut-off', 'PME', 'Shift', 'Switch', 'User'],
    category: 'van-der-waals'
  },
  {
    name: 'vdw-modifier',
    type: 'enum',
    description: 'Shift the Van der Waals potential by a constant such that it is zero at the cut-off. This makes the potential the integral of the force. Note that this does not affect the forces or the sampling.\n\nUse an unmodified Van der Waals potential. This can be useful when comparing energies with those computed with other software.\n\nSmoothly switches the forces to zero between rvdw-switch and rvdw. This shifts the potential shift over the whole range and switches it to zero at the cut-off. Note that this is more expensive to calculate than a plain cut-off and it is not required for energy conservation, since Potential-shift conserves energy just as well.\n\nSmoothly switches the potential to zero between rvdw-switch and rvdw. Note that this introduces articifically large forces in the switching region and is much more expensive to calculate. This option should only be used if the force field you are using requires this.',
    validValues: ['Potential-shift', 'None', 'Force-switch', 'Potential-switch', 'Potential-shift-Verlet'],
    category: 'van-der-waals'
  },
  {
    name: 'rvdw-switch',
    type: 'real',
    description: 'where to start switching the LJ force and possibly the potential, only relevant when force or potential switching is used',
    defaultValue: '0',
    unit: 'nm',
    category: 'van-der-waals'
  },
  {
    name: 'rvdw',
    type: 'real',
    description: 'distance for the LJ or Buckingham cut-off',
    defaultValue: '1',
    unit: 'nm',
    range: { min: 0 },
    category: 'van-der-waals'
  },
  {
    name: 'DispCorr',
    type: 'enum',
    description: 'do not apply any correction\n\napply long-range dispersion corrections for Energy and Pressure\n\napply long-range dispersion corrections for Energy only',
    validValues: ['no', 'EnerPres', 'Ener'],
    category: 'van-der-waals'
  },

  // 表格 / Tables
  {
    name: 'table-extension',
    type: 'real',
    description: 'Extension of the non-bonded potential lookup tables beyond the largest cut-off distance. With actual non-bonded interactions the tables are never accessed beyond the cut-off. But a longer table length might be needed for the 1-4 interactions, which are always tabulated irrespective of the use of tables for the non-bonded interactions.',
    defaultValue: '1',
    unit: 'nm',
    category: 'tables'
  },
  {
    name: 'energygrp-table',
    type: 'real',
    description: 'Currently unsupported. When user tables are used for electrostatics and/or VdW, here one can give pairs of energy groups for which separate user tables should be used. The two energy groups will be appended to the table file name, in order of their definition in energygrps, separated by underscores. For example, if ``energygrps = Na Cl Sol and energygrp-table = Na Na Na Cl``, gmx mdrun will read table_Na_Na.xvg and table_Na_Cl.xvg in addition to the normal table.xvg which will be used for all other energy group pairs.',
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
    category: 'ewald'
  },
  {
    name: 'fourier-ny',
    type: 'integer',
    description: '',
    category: 'ewald'
  },
  {
    name: 'fourier-nz',
    type: 'integer',
    description: 'Highest magnitude of wave vectors in reciprocal space when using Ewald. Grid size when using PME or P3M. These values override fourierspacing per direction. The best choice is powers of 2, 3, 5 and 7. Avoid large primes. Note that these grid sizes can be reduced along with scaling up rcoulomb by the PME tuning in gmx mdrun.',
    category: 'ewald'
  },
  {
    name: 'pme-order',
    type: 'integer',
    description: 'The number of grid points along a dimension to which a charge is mapped. The actual order of the PME interpolation is one less, e.g. the default of 4 gives cubic interpolation. Supported values are 3 to 12 (max 8 for P3M-AD). When running in parallel, it can be worth to switch to 5 and simultaneously increase the grid spacing. Note that on the CPU only values 4 and 5 have SIMD acceleration and GPUs only support the value 4.',
    defaultValue: '4',
    range: { min: 3, max: 12 },
    category: 'ewald'
  },
  {
    name: 'ewald-rtol',
    type: 'string',
    description: 'The relative strength of the Ewald-shifted direct potential at rcoulomb is given by ewald-rtol. Decreasing this will give a more accurate direct sum, but then you need more wave vectors for the reciprocal sum.',
    defaultValue: '10\ ^-5',
    category: 'ewald'
  },
  {
    name: 'ewald-rtol-lj',
    type: 'string',
    description: 'When doing PME for VdW-interactions, ewald-rtol-lj is used to control the relative strength of the dispersion potential at rvdw in the same way as ewald-rtol controls the electrostatic potential.',
    defaultValue: '10\ ^-3',
    category: 'ewald'
  },
  {
    name: 'lj-pme-comb-rule',
    type: 'enum',
    description: 'The combination rules used to combine VdW-parameters in the reciprocal part of LJ-PME. Geometric rules are much faster than Lorentz-Berthelot and usually the recommended choice, even when the rest of the force field uses the Lorentz-Berthelot rules.\n\nApply geometric combination rules\n\nApply Lorentz-Berthelot combination rules',
    defaultValue: 'Geometric',
    validValues: ['Geometric', 'Lorentz-Berthelot'],
    category: 'ewald'
  },
  {
    name: 'ewald-geometry',
    type: 'enum',
    description: 'The Ewald sum is performed in all three dimensions.\n\nThe reciprocal sum is still performed in 3D, but a force and potential correction applied in the z dimension to produce a pseudo-2D summation. If your system has a slab geometry in the x-y plane you can try to increase the z-dimension of the box (a box height of 3 times the slab height is usually ok) and use this option.',
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
    validValues: ['auto', 'constant', 'variable', 'not-available'],
    category: 'temperature-coupling'
  },
  {
    name: 'ensemble-temperature',
    type: 'real',
    description: 'The ensemble temperature for the system. The input value is only used with ensemble-temperature-setting=constant. By default the ensemble temperature is copied from the temperature of the thermal bath (when used).',
    defaultValue: '-1',
    unit: 'K',
    category: 'temperature-coupling'
  },
  {
    name: 'tcoupl',
    type: 'enum',
    description: 'No temperature coupling.\n\nTemperature coupling with a Berendsen thermostat to a bath with temperature ref-t, with time constant tau-t. Several groups can be coupled separately, these are specified in the tc-grps field separated by spaces. This is a historical thermostat needed to be able to reproduce previous simulations, but we strongly recommend not to use it for new production runs. Consult the manual for details.\n\nTemperature coupling using a Nose-Hoover extended ensemble. The reference temperature and coupling groups are selected as above, but in this case tau-t controls the period of the temperature fluctuations at equilibrium, which is slightly different from a relaxation time. For NVT simulations the conserved energy quantity is written to the energy and log files.\n\nTemperature coupling by randomizing a fraction of the particle velocities at each timestep. Reference temperature and coupling groups are selected as above. tau-t is the average time between randomization of each molecule. Inhibits particle dynamics somewhat, but has little or no ergodicity issues. Currently only implemented with velocity Verlet, and not implemented with constraints.\n\nTemperature coupling by randomizing velocities of all particles at infrequent timesteps. Reference temperature and coupling groups are selected as above. tau-t is the time between randomization of all molecules. Inhibits particle dynamics somewhat, but has little or no ergodicity issues. Currently only implemented with velocity Verlet.\n\nTemperature coupling using velocity rescaling with a stochastic term (JCP 126, 014101). This thermostat is similar to Berendsen coupling, with the same scaling using tau-t, but the stochastic term ensures that a proper canonical ensemble is generated. The random seed is set with ld-seed. This thermostat works correctly even for tau-t =0. For NVT simulations the conserved energy quantity is written to the energy and log file.',
    defaultValue: 'no',
    validValues: ['no', 'berendsen', 'nose-hoover', 'andersen', 'andersen-massive', 'v-rescale'],
    category: 'temperature-coupling'
  },
  {
    name: 'nsttcouple',
    type: 'integer',
    description: 'The interval between steps that couple the temperature. The default value of -1 sets nsttcouple equal to 100, or fewer steps if required for accurate integration (5 steps per tau for first order coupling, 20 steps per tau for second order coupling). Note that the default value is large in order to reduce the overhead of the additional computation and communication required for obtaining the kinetic energy. For velocity Verlet integrators nsttcouple is set to 1.',
    defaultValue: '-1',
    category: 'temperature-coupling'
  },
  {
    name: 'nh-chain-length',
    type: 'integer',
    description: 'The number of chained Nose-Hoover thermostats for velocity Verlet integrators, the leap-frog integrator=md integrator only supports 1. Data for the NH chain variables is not printed to the edr file by default, but can be turned on with the print-nose-hoover-chain-variables option.',
    defaultValue: '10',
    category: 'temperature-coupling'
  },
  {
    name: 'print-nose-hoover-chain-variables',
    type: 'enum',
    description: 'Do not store Nose-Hoover chain variables in the energy file.\n\nStore all positions and velocities of the Nose-Hoover chain in the energy file.',
    validValues: ['no', 'yes'],
    category: 'temperature-coupling'
  },
  {
    name: 'tc-grps',
    type: 'string',
    description: 'groups to couple to separate temperature baths',
    category: 'temperature-coupling'
  },
  {
    name: 'tau-t',
    type: 'real',
    description: '[ps] time constant for coupling (one for each group in tc-grps), -1 means no temperature coupling',
    unit: 'ps',
    range: { min: 0 },
    category: 'temperature-coupling'
  },
  {
    name: 'ref-t',
    type: 'real',
    description: '[K] reference temperature for coupling (one for each group in tc-grps)',
    unit: 'K',
    range: { min: 0 },
    category: 'temperature-coupling'
  },

  // 压力耦合 / Pressure Coupling
  {
    name: 'pcoupl',
    type: 'enum',
    description: 'No pressure coupling. This means a fixed box size.\n\nExponential relaxation pressure coupling with time constant tau-p. The box is scaled every nstpcouple steps. This barostat does not yield a correct thermodynamic ensemble; it is only included to be able to reproduce previous runs, and we strongly recommend against using it for new simulations. See the manual for details.\n\nExponential relaxation pressure coupling with time constant tau-p, including a stochastic term to enforce correct volume fluctuations.  The box is scaled every nstpcouple steps. It can be used for both equilibration and production.\n\nExtended-ensemble pressure coupling where the box vectors are subject to an equation of motion. The equation of motion for the atoms is coupled to this. No instantaneous scaling takes place. As for Nose-Hoover temperature coupling the time constant tau-p is the period of pressure fluctuations at equilibrium. This is a good method when you want to apply pressure scaling during data collection, but beware that you can get very large oscillations if you are starting from a different pressure. For simulations where the exact fluctations of the NPT ensemble are important, or if the pressure coupling time is very short, it may not be appropriate, as the previous time step pressure is used in some steps of the Gromacs implementation for the current time step pressure.\n\nMartyna-Tuckerman-Tobias-Klein implementation, only useable with integrator=md-vv or integrator=md-vv-avek, very similar to Parrinello-Rahman. As for Nose-Hoover temperature coupling the time constant tau-p is the period of pressure fluctuations at equilibrium. This is probably a better method when you want to apply pressure scaling during data collection, but beware that you can get very large oscillations if you are starting from a different pressure. This requires a constant ensemble temperature for the system. It only supports isotropic scaling, and only works without constraints. MTTK coupling is deprecated.',
    defaultValue: 'no',
    validValues: ['no', 'Berendsen', 'C-rescale', 'Parrinello-Rahman', 'MTTK'],
    category: 'pressure-coupling'
  },
  {
    name: 'pcoupltype',
    type: 'enum',
    description: 'Specifies the kind of isotropy of the pressure coupling used. Each kind takes one or more values for compressibility and ref-p. Only a single value is permitted for tau-p.\n\nIsotropic pressure coupling with time constant tau-p. One value each for compressibility and ref-p is required.\n\nPressure coupling which is isotropic in the x and y direction, but different in the z direction. This can be useful for membrane simulations. Two values each for compressibility and ref-p are required, for x/y and z directions respectively.\n\nSame as before, but 6 values are needed for xx, yy, zz, xy/yx, xz/zx and yz/zy components, respectively. When the off-diagonal compressibilities are set to zero, a rectangular box will stay rectangular. Beware that anisotropic scaling can lead to extreme deformation of the simulation box.\n\nSurface tension coupling for surfaces parallel to the xy-plane. Uses normal pressure coupling for the z-direction, while the surface tension is coupled to the x/y dimensions of the box. The first ref-p value is the reference surface tension times the number of surfaces bar nm, the second value is the reference z-pressure bar. The two compressibility values are the compressibility in the x/y and z direction respectively. The value for the z-compressibility should be reasonably accurate since it influences the convergence of the surface-tension, it can also be set to zero to have a box with constant height.',
    validValues: ['isotropic', 'semiisotropic', 'anisotropic', 'surface-tension'],
    unit: 'nm',
    category: 'pressure-coupling'
  },
  {
    name: 'nstpcouple',
    type: 'integer',
    description: 'The interval between steps that couple the pressure. The default value of -1 sets nstpcouple equal to 100, or fewer steps if required for accurate integration (5 steps per tau for first order coupling, 20 steps per tau for second order coupling). Note that the default value is large in order to reduce the overhead of the additional computation and communication required for obtaining the virial and kinetic energy. For velocity Verlet integrators nsttcouple is set to 1.',
    defaultValue: '-1',
    category: 'pressure-coupling'
  },
  {
    name: 'tau-p',
    type: 'real',
    description: 'The time constant for pressure coupling (one value for all directions).',
    defaultValue: '5',
    unit: 'ps',
    range: { min: 0 },
    category: 'pressure-coupling'
  },
  {
    name: 'compressibility',
    type: 'integer',
    description: '[bar\ ^-1] The compressibility (NOTE: this is now really in bar\ ^-1) For water at 1 atm and 300 K the compressibility is 4.5e-5 bar\ ^-1. The number of required values is implied by pcoupltype.',
    unit: 'bar\ ^-1',
    category: 'pressure-coupling'
  },
  {
    name: 'ref-p',
    type: 'real',
    description: '[bar] The reference pressure for coupling. The number of required values is implied by pcoupltype.',
    unit: 'bar',
    category: 'pressure-coupling'
  },
  {
    name: 'refcoord-scaling',
    type: 'enum',
    description: 'The reference coordinates for position restraints are not modified. Note that with this option the virial and pressure might be ill defined, see here <reference-manual-position-restraints> for more details.\n\nThe reference coordinates are scaled with the scaling matrix of the pressure coupling.\n\nScale the center of mass of the reference coordinates with the scaling matrix of the pressure coupling. The vectors of each reference coordinate to the center of mass are not scaled. Only one COM is used, even when there are multiple molecules with position restraints. For calculating the COM of the reference coordinates in the starting configuration, periodic boundary conditions are not taken into account. Note that with this option the virial and pressure might be ill defined, see here <reference-manual-position-restraints> for more details.',
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
    category: 'simulated-annealing'
  },
  {
    name: 'annealing-time',
    type: 'integer',
    description: 'List of times at the annealing reference/control points for each group. If you are using periodic annealing, the times will be used modulo the last value, *i.e.* if the values are 0, 5, 10, and 15, the coupling will restart at the 0ps value after 15ps, 30ps, 45ps, etc. The number of entries should equal the sum of the numbers given in annealing-npoints.',
    category: 'simulated-annealing'
  },
  {
    name: 'annealing-temp',
    type: 'real',
    description: 'List of temperatures at the annealing reference/control points for each group. The number of entries should equal the sum of the numbers given in annealing-npoints.',
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
    defaultValue: 'none',
    validValues: ['none', 'h-bonds', 'all-bonds', 'h-angles', 'all-angles', 'hbonds'],
    unit: 'settles',
    category: 'bonds'
  },
  {
    name: 'constraint-algorithm',
    type: 'enum',
    description: 'Chooses which solver satisfies any non-SETTLE holonomic constraints.\n\nLINear Constraint Solver. With domain decomposition the parallel version P-LINCS is used. The accuracy in set with lincs-order, which sets the number of matrices in the expansion for the matrix inversion. After the matrix inversion correction the algorithm does an iterative correction to compensate for lengthening due to rotation. The number of such iterations can be controlled with lincs-iter. The root mean square relative constraint deviation is printed to the log file every nstlog steps. If a bond rotates more than lincs-warnangle in one step, a warning will be printed both to the log file and to stderr. LINCS should not be used with coupled angle constraints.\n\nSHAKE is slightly slower and less stable than LINCS, but does work with angle constraints. The relative tolerance is set with shake-tol, 0.0001 is a good value for "normal" MD. SHAKE does not support constraints between atoms on different decomposition domains, so it can only be used with domain decomposition when so-called update-groups are used, which is usually the case when only bonds involving hydrogens are constrained. SHAKE can not be used with energy minimization.',
    validValues: ['LINCS', 'SHAKE'],
    category: 'bonds'
  },
  {
    name: 'continuation',
    type: 'enum',
    description: 'This option was formerly known as unconstrained-start.\n\napply constraints to the start configuration and reset shells\n\ndo not apply constraints to the start configuration and do not reset shells, useful for exact continuation and reruns',
    defaultValue: 'no',
    validValues: ['no', 'yes'],
    category: 'bonds'
  },
  {
    name: 'shake-tol',
    type: 'string',
    description: 'relative tolerance for SHAKE',
    defaultValue: '0.0001',
    category: 'bonds'
  },
  {
    name: 'lincs-order',
    type: 'integer',
    description: 'Highest order in the expansion of the constraint coupling matrix. When constraints form triangles, an additional expansion of the same order is applied on top of the normal expansion only for the couplings within such triangles. For "normal" MD simulations an order of 4 usually suffices, 6 is needed for large time-steps with virtual sites or BD. For accurate energy minimization in double precision an order of 8 or more might be required. Note that in single precision an order higher than 6 will often lead to worse accuracy due to amplification of rounding errors. With domain decomposition, the cell size is limited by the distance spanned by lincs-order +1 constraints. When one wants to scale further than this limit, one can decrease lincs-order and increase lincs-iter, since the accuracy does not deteriorate when (1+ lincs-iter )* lincs-order remains constant.',
    defaultValue: '4',
    category: 'bonds'
  },
  {
    name: 'lincs-iter',
    type: 'integer',
    description: 'Number of iterations to correct for rotational lengthening in LINCS. For normal runs a single step is sufficient, but for NVE runs where you want to conserve energy accurately or for accurate energy minimization in double precision you might want to increase it to 2. Note that in single precision using more than 1 iteration will often lead to worse accuracy due to amplification of rounding errors.',
    defaultValue: '1',
    category: 'bonds'
  },
  {
    name: 'lincs-warnangle',
    type: 'string',
    description: 'maximum angle that a bond can rotate before LINCS will complain',
    defaultValue: '30',
    unit: 'deg',
    category: 'bonds'
  },
  {
    name: 'morse',
    type: 'enum',
    description: 'bonds are represented by a harmonic potential\n\nbonds are represented by a Morse potential',
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
    category: 'walls'
  },
  {
    name: 'wall-type',
    type: 'enum',
    description: 'LJ integrated over the volume behind the wall: 9-3 potential\n\nLJ integrated over the wall surface: 10-4 potential\n\ndirect LJ potential with the z distance from the wall\n\nuser-defined potentials indexed with the z distance from the wall, the tables are read analogously to the energygrp-table option, where the first name is for a "normal" energy group and the second name is wall0 or wall1, only the dispersion and repulsion columns are used',
    validValues: ['9-3', '10-4', '12-6', 'table'],
    category: 'walls'
  },
  {
    name: 'wall-r-linpot',
    type: 'real',
    description: 'Below this distance from the wall the potential is continued linearly and thus the force is constant. Setting this option to a postive value is especially useful for equilibration when some atoms are beyond a wall. When the value is <=0 (<0 for wall-type =table), a fatal error is generated when atoms are beyond a wall.',
    defaultValue: '-1',
    unit: 'nm',
    category: 'walls'
  },
  {
    name: 'wall-density',
    type: 'string',
    description: '[nm\ ^-3] / [nm\ ^-2] the number density of the atoms for each wall for wall types 9-3 and 10-4',
    unit: 'nm\ ^-3',
    category: 'walls'
  },
  {
    name: 'wall-ewald-zfac',
    type: 'string',
    description: 'The scaling factor for the third box vector for Ewald summation only, the minimum is 2. Ewald summation can only be used with nwall =2, where one should use ewald-geometry =3dc. The empty layer in the box serves to decrease the unphysical Coulomb interaction between periodic images.',
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
    defaultValue: '1.5',
    unit: 'nm',
    category: 'com-pulling'
  },
  {
    name: 'pull-constr-tol',
    type: 'integer',
    description: 'the relative constraint tolerance for constraint pulling',
    defaultValue: '10\ ^-6',
    category: 'com-pulling'
  },
  {
    name: 'pull-print-com',
    type: 'enum',
    description: 'do not print the COM for any group\n\nprint the COM of all groups for all pull coordinates to the pullx.xvg file.',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-print-ref-value',
    type: 'enum',
    description: 'do not print the reference value for each pull coordinate\n\nprint the reference value for each pull coordinate to the pullx.xvg file.',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-print-components',
    type: 'enum',
    description: 'only print the distance for each pull coordinate\n\nprint the distance and Cartesian components selected in pull-coord1-dim to the pullx.xvg file.',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-nstxout',
    type: 'integer',
    description: 'interval for writing out the COMs of all the pull groups (0 is never) to the pullx.xvg file.',
    defaultValue: '50',
    category: 'com-pulling'
  },
  {
    name: 'pull-nstfout',
    type: 'integer',
    description: 'interval for writing out the force of all the pulled groups (0 is never) to the pullf.xvg file.',
    defaultValue: '50',
    category: 'com-pulling'
  },
  {
    name: 'pull-pbc-ref-prev-step-com',
    type: 'enum',
    description: 'Use the reference atom (pull-group1-pbcatom) for the treatment of periodic boundary conditions.\n\nUse the COM of the previous step as reference for the treatment of periodic boundary conditions. The reference is initialized using the reference atom (pull-group1-pbcatom), which should be located centrally in the group. Using the COM from the previous step can be useful if one or more pull groups are large or very flexible.',
    defaultValue: 'pull-group1-pbcatom',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-xout-average',
    type: 'enum',
    description: 'Write the instantaneous coordinates for all the pulled groups.\n\nWrite the average coordinates (since last output) for all the pulled groups. N.b., some analysis tools might expect instantaneous pull output.',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-fout-average',
    type: 'enum',
    description: 'Write the instantaneous force for all the pulled groups.\n\nWrite the average force (since last output) for all the pulled groups. N.b., some analysis tools might expect instantaneous pull output.',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-ngroups',
    type: 'integer',
    description: 'The number of pull groups, not including the absolute reference group, when used. Pull groups can be reused in multiple pull coordinates. Below only the pull options for group 1 are given, further groups simply increase the group index number.',
    defaultValue: '1',
    category: 'com-pulling'
  },
  {
    name: 'pull-ncoords',
    type: 'integer',
    description: 'The number of pull coordinates. Below only the pull options for coordinate 1 are given, further coordinates simply increase the coordinate index number.',
    defaultValue: '1',
    category: 'com-pulling'
  },
  {
    name: 'pull-group1-name',
    type: 'string',
    description: 'The name of the pull group, is looked up in the index file or in the default groups to obtain the atoms involved.',
    category: 'com-pulling'
  },
  {
    name: 'pull-group1-weights',
    type: 'integer',
    description: 'Optional relative weights which are multiplied with the masses of the atoms to give the total weight for the COM. The number of weights should be 0, meaning all 1, or the number of atoms in the pull group.',
    category: 'com-pulling'
  },
  {
    name: 'pull-group1-pbcatom',
    type: 'real',
    description: 'The reference atom for the treatment of periodic boundary conditions inside the group (this has no effect on the treatment of the pbc between groups). This option is only important when the diameter of the pull group is larger than half the shortest box vector. For determining the COM, all atoms in the group are put at their periodic image which is closest to pull-group1-pbcatom. A value of 0 means that the middle atom (number wise) is used, which is only safe for small groups. gmx grompp checks that the maximum distance from the reference atom (specifically chosen, or not) to the other atoms in the group is not too large. This parameter is not used with pull-coord1-geometry cylinder. A value of -1 turns on cosine weighting, which is useful for a group of molecules in a periodic system, *e.g.* a water slab (see Engin et al. J. Chem. Phys. B 2010).',
    defaultValue: '0',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-type',
    type: 'enum',
    description: 'Center of mass pulling using an umbrella potential between the reference group and one or more groups.\n\nCenter of mass pulling using a constraint between the reference group and one or more groups. The setup is identical to the option umbrella, except for the fact that a rigid constraint is applied instead of a harmonic potential. Note that this type is not supported in combination with multiple time stepping.\n\nCenter of mass pulling using a linear potential and therefore a constant force. For this option there is no reference position and therefore the parameters pull-coord1-init and pull-coord1-rate are not used.\n\nAt distances above pull-coord1-init a harmonic potential is applied, otherwise no potential is applied.\n\nAt distances below pull-coord1-init a harmonic potential is applied, otherwise no potential is applied.\n\nAn external potential that needs to be provided by another module.',
    validValues: ['umbrella', 'constraint', 'constant-force', 'flat-bottom', 'flat-bottom-high', 'external-potential'],
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-potential-provider',
    type: 'string',
    description: 'The name of the external module that provides the potential for the case where pull-coord1-type=external-potential.',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-geometry',
    type: 'enum',
    description: 'Pull along the vector connecting the two groups. Components can be selected with pull-coord1-dim.\n\nPull in the direction of pull-coord1-vec.\n\nAs pull-coord1-geometry=direction, but does not apply periodic box vector corrections to keep the distance within half the box length. This is (only) useful for pushing groups apart by more than half the box length by continuously changing the reference location using a pull rate. With this geometry the box should not be dynamic (*e.g.* no pressure scaling) in the pull dimensions and the pull force is not added to the virial.\n\nAs pull-coord1-geometry=direction, but the pull vector is the vector that points from the COM of a third to the COM of a fourth pull group. This means that 4 groups need to be supplied in pull-coord1-groups. Note that the pull force will give rise to a torque on the pull vector, which is turn leads to forces perpendicular to the pull vector on the two groups defining the vector. If you want a pull group to move between the two groups defining the vector, simply use the union of these two groups as the reference group.\n\nDesigned for pulling with respect to a layer where the reference COM is given by a local cylindrical part of the reference group. The pulling is in the direction of pull-coord1-vec. From the first of the two groups in pull-coord1-groups a cylinder is selected around the axis going through the COM of the second group with direction pull-coord1-vec with radius pull-cylinder-r. Weights of the atoms decrease continuously to zero as the radial distance goes from 0 to pull-cylinder-r (mass weighting is also used). The radial dependence gives rise to radial forces on both pull groups. Note that the radius should be smaller than half the box size. For tilted cylinders they should be even smaller than half the box size since the distance of an atom in the reference group from the COM of the pull group has both a radial and an axial component. This geometry is not supported with constraint pulling.\n\nPull along an angle defined by four groups. The angle is defined as the angle between two vectors: the vector connecting the COM of the first group to the COM of the second group and the vector connecting the COM of the third group to the COM of the fourth group.\n\nAs pull-coord1-geometry=angle but the second vector is given by pull-coord1-vec. Thus, only the two groups that define the first vector need to be given.\n\nPull along a dihedral angle defined by six groups. These pairwise define three vectors: the vector connecting the COM of group 1 to the COM of group 2, the COM of group 3 to the COM of group 4, and the COM of group 5 to the COM group 6. The dihedral angle is then defined as the angle between two planes: the plane spanned by the the two first vectors and the plane spanned the two last vectors.\n\nTransforms other pull coordinates using a mathematical expression defined by pull-coord1-expression. Pull coordinates of lower indices, and time, can be used as variables to this pull coordinate. Thus, pull transformation coordinates should have a higher pull coordinate index than all pull coordinates they transform.',
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
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-dim',
    type: 'real',
    description: 'Selects the dimensions that this pull coordinate acts on and that are printed to the output files when pull-print-components = pull-coord1-start=yes. With pull-coord1-geometry = pull-coord1-geometry=distance, only Cartesian components set to Y contribute to the distance. Thus setting this to Y Y N results in a distance in the x/y plane. With other geometries all dimensions with non-zero entries in pull-coord1-vec should be set to Y, the values for other dimensions only affect the output.',
    defaultValue: 'Y Y Y',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-origin',
    type: 'string',
    description: 'The pull reference position for use with an absolute reference.',
    defaultValue: '0.0',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-vec',
    type: 'boolean',
    description: 'The pull direction. gmx grompp normalizes the vector.',
    defaultValue: '0.0',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-start',
    type: 'enum',
    description: 'do not modify pull-coord1-init\n\nadd the COM distance of the starting conformation to pull-coord1-init',
    validValues: ['no', 'yes'],
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-init',
    type: 'real',
    description: '(0.0) [nm] or [deg] The reference distance or reference angle at t=0.',
    defaultValue: '0.0',
    unit: 'nm',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-rate',
    type: 'string',
    description: '(0) [nm/ps] or [deg/ps] The rate of change of the reference position or reference angle.',
    defaultValue: '0',
    unit: 'nm/ps',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-k',
    type: 'real',
    description: '(0) [kJ mol\ ^-1 nm\ ^-2] or [kJ mol\ ^-1 nm\ ^-1] or [kJ mol\ ^-1 rad\ ^-2] or [kJ mol\ ^-1 rad\ ^-1] The force constant. For umbrella pulling this is the harmonic force constant in kJ mol\ ^-1 nm\ ^-2 (or kJ mol\ ^-1 rad\ ^-2 for angles). For constant force pulling this is the force constant of the linear potential, and thus the negative (!) of the constant force in kJ mol\ ^-1 nm\ ^-1 (or kJ mol\ ^-1 rad\ ^-1 for angles). Note that for angles the force constant is expressed in terms of radians (while pull-coord1-init and pull-coord1-rate are expressed in degrees).',
    defaultValue: '0',
    unit: 'kJ mol\ ^-1 nm\ ^-2',
    category: 'com-pulling'
  },
  {
    name: 'pull-coord1-kB',
    type: 'real',
    description: '(pull-k1) [kJ mol\ ^-1 nm\ ^-2] or [kJ mol\ ^-1 nm\ ^-1] or [kJ mol\ ^-1 rad\ ^-2] or [kJ mol\ ^-1 rad\ ^-1] As pull-coord1-k, but for state B. This is only used when free-energy is turned on. The force constant is then (1 - lambda) * pull-coord1-k + lambda * pull-coord1-kB.',
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
    validValues: ['convolved', 'umbrella'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-share-multisim',
    type: 'enum',
    description: 'AWH will not share biases across simulations started with gmx mdrun option -multidir. The biases will be independent.\n\nWith gmx mdrun and option -multidir the bias and PMF estimates for biases with awh1-share-group >0 will be shared across simulations with the biases with the same awh1-share-group value. The simulations should have the same AWH settings for sharing to make sense. gmx mdrun will check whether the simulations are technically compatible for sharing, but the user should check that bias sharing physically makes sense.',
    validValues: ['no', 'yes'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-seed',
    type: 'string',
    description: '(-1) Random seed for Monte-Carlo sampling the umbrella position, where -1 indicates to generate a seed. Only used with awh-potential=umbrella.',
    defaultValue: '-1',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-nstout',
    type: 'integer',
    description: 'Number of steps between printing AWH data to the energy file, should be a multiple of nstenergy.',
    defaultValue: '100000',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-nstsample',
    type: 'integer',
    description: 'Number of steps between sampling of the coordinate value. This sampling is the basis for updating the bias and estimating the PMF and other AWH observables.',
    defaultValue: '10',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh-nsamples-update',
    type: 'integer',
    description: 'The number of coordinate samples used for each AWH update. The update interval in steps is awh-nstsample times this value.',
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
    defaultValue: '10.0',
    unit: 'kJ mol\ ^-1',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-growth',
    type: 'enum',
    description: 'Each bias keeps a reference weight histogram for the coordinate samples. Its size sets the magnitude of the bias function and free energy estimate updates (few samples corresponds to large updates and vice versa). Thus, its growth rate sets the maximum convergence rate.\n\nBy default, there is an initial stage in which the histogram grows close to exponentially (but slower than the sampling rate). In the final stage that follows, the growth rate is linear and equal to the sampling rate (set by awh-nstsample). The initial stage is typically necessary for efficient convergence when starting a new simulation where high free energy barriers have not yet been flattened by the bias.\n\nAs awh1-growth=exp-linear but skip the initial stage. This may be useful if there is *a priori* knowledge (see awh1-error-init) which eliminates the need for an initial stage. This is also the setting compatible with awh1-target=local-boltzmann.',
    validValues: ['exp-linear', 'linear'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-growth-factor',
    type: 'real',
    description: 'The growth factor \gamma during the exponential phase with awh1-growth=exp-linear. Should be larger than 1.',
    defaultValue: '2',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-equilibrate-histogram',
    type: 'enum',
    description: 'Do not equilibrate the histogram.\n\nBefore entering the initial stage (see awh1-growth=exp-linear), make sure the histogram of sampled weights is following the target distribution closely enough (specifically, at least 80% of the target region needs to have a local relative error of less than 20%). This option would typically only be used when awh1-share-group > 0 and the initial configurations poorly represent the target distribution.',
    validValues: ['no', 'yes'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-target',
    type: 'enum',
    description: 'The bias is tuned towards a constant (uniform) coordinate distribution in the defined sampling interval (defined by  [awh1-dim1-start, awh1-dim1-end]).\n\nSimilar to awh1-target=constant, but the target distribution is proportional to 1/(1 + exp(F - awh1-target=cutoff)), where F is the free energy relative to the estimated global minimum. This provides a smooth switch of a flat target distribution in regions with free energy lower than the cut-off to a Boltzmann distribution in regions with free energy higher than the cut-off.\n\nThe target distribution is a Boltzmann distribtution with a scaled beta (inverse temperature) factor given by awh1-target-beta-scaling. *E.g.*, a value of 0.1 would give the same coordinate distribution as sampling with a simulation temperature scaled by 10.\n\nSame target distribution and use of awh1-target-beta-scaling but the convergence towards the target distribution is inherently local *i.e.*, the rate of change of the bias only depends on the local sampling. This local convergence property is only compatible with awh1-growth=linear, since for awh1-growth=exp-linear histograms are globally rescaled in the initial stage.',
    defaultValue: 'uniform',
    validValues: ['constant', 'cutoff', 'boltzmann', 'local-boltzmann'],
    unit: 'awh1-dim1-start, awh1-dim1-end',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-target-beta-scaling',
    type: 'string',
    description: 'For awh1-target=boltzmann and awh1-target=local-boltzmann it is the unitless beta scaling factor taking values in (0,1).',
    defaultValue: '0',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-target-cutoff',
    type: 'string',
    description: 'For awh1-target=cutoff this is the cutoff, should be > 0.',
    defaultValue: '0',
    unit: 'kJ mol\ ^-1',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-user-data',
    type: 'enum',
    description: 'Initialize the PMF and target distribution with default values.\n\nInitialize the PMF and target distribution with user provided data. For awh-nbias = 1, gmx mdrun will expect a file awhinit.xvg to be present in the run directory. For multiple biases, gmx mdrun expects files awhinit1.xvg, awhinit2.xvg, etc. The file name can be changed with the -awh option. The first awh1-ndim columns of each input file should contain the coordinate values, such that each row defines a point in coordinate space. Column awh1-ndim + 1 should contain the PMF value (in kT) for each point. The target distribution column can either follow the PMF (column  awh1-ndim + 2) or be in the same column as written by gmx awh.',
    validValues: ['no', 'yes'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-share-group',
    type: 'enum',
    description: 'Do not share the bias.\n\nShare the bias and PMF estimates between simulations. This currently only works between biases with the same index. Note that currently sharing within a single simulation is not supported. The bias will be shared across simulations that specify the same value for awh1-share-group. To enable this, use awh-share-multisim=yes and the gmx mdrun option -multidir. Sharing may increase convergence initially, although the starting configurations can be critical, especially when sharing between many biases. N.b., multiple walkers sharing a degenerate reaction coordinate may have problems overlapping their sampling, possibly making it difficult to cover the sampling interval.',
    validValues: ['0', 'positive'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-target-metric-scaling',
    type: 'enum',
    description: 'Do not scale the target distribution based on the AWH friction metric.\n\nScale the target distribution based on the AWH friction metric. Regions with high friction (long autocorrelation times) will be sampled more. The diffusion metric is the inverse of the friction metric. This scaling can be used with any awh1-target type and is applied after user-provided target distribution modifications (awh1-user-data), if any. If awh1-growth=exp-linear, the target distribution scaling starts after leaving the initial phase.',
    validValues: ['no', 'yes'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-target-metric-scaling-limit',
    type: 'boolean',
    description: 'The upper limit of scaling, relative to the average, when awh1-target-metric-scaling is enabled. The lower limit will be the inverse of this value. This upper limit should be > 1.',
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
    validValues: ['pull', 'fep-lambda'],
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-coord-index',
    type: 'string',
    description: 'Index of the pull coordinate defining this coordinate dimension.',
    defaultValue: '1',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-force-constant',
    type: 'integer',
    description: '(0) [kJ mol\ ^-1 nm\ ^-2] or [kJ mol\ ^-1 rad\ ^-2] Force constant for the (convolved) umbrella potential(s) along this coordinate dimension.',
    defaultValue: '0',
    unit: 'kJ mol\ ^-1 nm\ ^-2',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-start',
    type: 'integer',
    description: '(0.0) [nm] or [deg] Start value of the sampling interval along this dimension. The range of allowed values depends on the relevant pull geometry (see pull-coord1-geometry). For dihedral geometries awh1-dim1-start greater than awh1-dim1-end is allowed. The interval will then wrap around from +period/2 to -period/2. For the direction geometry, the dimension is made periodic when the direction is along a box vector and covers more than 95% of the box length. Note that one should not apply pressure coupling along a periodic dimension.',
    defaultValue: '0.0',
    unit: 'nm',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-end',
    type: 'integer',
    description: '(0.0) [nm] or [deg] End value defining the sampling interval together with awh1-dim1-start.',
    defaultValue: '0.0',
    unit: 'nm',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-diffusion',
    type: 'boolean',
    description: '(10\ ^-5) [nm\ ^2/ps], [rad\ ^2/ps] or [ps\ ^-1] Estimated diffusion constant for this coordinate dimension determining the initial biasing rate. This needs only be a rough estimate and should not critically affect the results unless it is set to something very low, leading to slow convergence, or very high, forcing the system far from equilibrium. Not setting this value explicitly generates a warning.',
    defaultValue: '10\ ^-5',
    unit: 'nm\ ^2/ps',
    category: 'awh-adaptive-biasing'
  },
  {
    name: 'awh1-dim1-cover-diameter',
    type: 'integer',
    description: '(0.0) [nm] or [deg] Diameter that needs to be sampled by a single simulation around a coordinate value before the point is considered covered in the initial stage (see awh1-growth=exp-linear). A value > 0  ensures that for each covering there is a continuous transition of this diameter across each coordinate value. This is trivially true for independent simulations but not for for multiple bias-sharing simulations (awh1-share-group>0). For a diameter = 0, covering occurs as soon as the simulations have sampled the whole interval, which for many sharing simulations does not guarantee transitions across free energy barriers. On the other hand, when the diameter >= the sampling interval length, covering occurs when a single simulation has independently sampled the whole interval.',
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
    defaultValue: '1',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-group0',
    type: 'string',
    description: 'Name of rotation group 0 in the index file.',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-type0',
    type: 'string',
    description: 'Type of rotation potential that is applied to rotation group 0. Can be of of the following: iso, iso-pf, pm, pm-pf, rm, rm-pf, rm2, rm2-pf, flex, flex-t, flex2, or flex2-t.',
    defaultValue: 'iso',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-massw0',
    type: 'string',
    description: 'Use mass weighted rotation group positions.',
    defaultValue: 'no',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-vec0',
    type: 'boolean',
    description: 'Rotation vector, will get normalized.',
    defaultValue: '1.0',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-pivot0',
    type: 'string',
    description: 'Pivot point for the potentials iso, pm, rm, and rm2.',
    defaultValue: '0.0',
    unit: 'nm',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-rate0',
    type: 'string',
    description: 'Reference rotation rate of group 0.',
    defaultValue: '0',
    unit: 'degree ps\ ^-1',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-k0',
    type: 'real',
    description: 'Force constant for group 0.',
    defaultValue: '0',
    unit: 'kJ mol\ ^-1 nm\ ^-2',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-slab-dist0',
    type: 'real',
    description: 'Slab distance, if a flexible axis rotation type was chosen.',
    defaultValue: '1.5',
    unit: 'nm',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-min-gauss0',
    type: 'real',
    description: 'Minimum value (cutoff) of Gaussian function for the force to be evaluated (for the flexible axis potentials).',
    defaultValue: '0.001',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-eps0',
    type: 'string',
    description: 'Value of additive constant epsilon for rm2* and flex2* potentials.',
    defaultValue: '0.0001',
    unit: 'nm\ ^2',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-fit-method0',
    type: 'boolean',
    description: 'Fitting method when determining the actual angle of a rotation group (can be one of rmsd, norm, or potential).',
    defaultValue: 'rmsd',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-potfit-nsteps0',
    type: 'integer',
    description: 'For fit type potential, the number of angular positions around the reference angle for which the rotation potential is evaluated.',
    defaultValue: '21',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-potfit-step0',
    type: 'integer',
    description: 'For fit type potential, the distance in degrees between two angular positions.',
    defaultValue: '0.25',
    unit: 'degree',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-nstrout',
    type: 'integer',
    description: 'Output interval (in steps) for the angle of the rotation group, as well as for the torque and the rotation potential energy.',
    defaultValue: '100',
    category: 'enforced-rotation'
  },
  {
    name: 'rot-nstsout',
    type: 'integer',
    description: 'Output interval (in steps) for per-slab data of the flexible axis potentials, i.e. angles, torques and slab centers.',
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
    validValues: ['equal', 'conservative'],
    category: 'nmr-refinement'
  },
  {
    name: 'disre-mixed',
    type: 'enum',
    description: 'the violation used in the calculation of the restraint force is the time-averaged violation\n\nthe violation used in the calculation of the restraint force is the square root of the product of the time-averaged violation and the instantaneous violation',
    validValues: ['no', 'yes'],
    category: 'nmr-refinement'
  },
  {
    name: 'disre-fc',
    type: 'real',
    description: 'force constant for distance restraints, which is multiplied by a (possibly) different factor for each restraint given in the fac column of the interaction in the topology file.',
    defaultValue: '1000',
    unit: 'kJ mol\ ^-1 nm\ ^-2',
    category: 'nmr-refinement'
  },
  {
    name: 'disre-tau',
    type: 'real',
    description: 'time constant for distance restraints running average. A value of zero turns off time averaging.',
    defaultValue: '0',
    unit: 'ps',
    category: 'nmr-refinement'
  },
  {
    name: 'nstdisreout',
    type: 'integer',
    description: 'period between steps when the running time-averaged and instantaneous distances of all atom pairs involved in restraints are written to the energy file (can make the energy file very large)',
    defaultValue: '100',
    unit: 'steps',
    category: 'nmr-refinement'
  },
  {
    name: 'orire',
    type: 'enum',
    description: 'ignore orientation restraint information in topology file\n\nuse orientation restraints, ensemble averaging can be performed with mdrun -multidir',
    validValues: ['no', 'yes'],
    category: 'nmr-refinement'
  },
  {
    name: 'orire-fc',
    type: 'real',
    description: 'force constant for orientation restraints, which is multiplied by a (possibly) different weight factor for each restraint, can be set to zero to obtain the orientations from a free simulation',
    defaultValue: '0',
    unit: 'kJ mol\ ^-1',
    category: 'nmr-refinement'
  },
  {
    name: 'orire-tau',
    type: 'real',
    description: 'time constant for orientation restraints running average. A value of zero turns off time averaging.',
    defaultValue: '0',
    unit: 'ps',
    category: 'nmr-refinement'
  },
  {
    name: 'orire-fitgrp',
    type: 'string',
    description: 'fit group for orientation restraining. This group of atoms is used to determine the rotation **R** of the system with respect to the reference orientation. The reference orientation is the starting conformation of the first subsystem. For a protein, backbone is a reasonable choice',
    category: 'nmr-refinement'
  },
  {
    name: 'nstorireout',
    type: 'integer',
    description: 'period between steps when the running time-averaged and instantaneous orientations for all restraints, and the molecular order tensor are written to the energy file (can make the energy file very large)',
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
    defaultValue: '-1',
    category: 'free-energy-calculations'
  },
  {
    name: 'delta-lambda',
    type: 'real',
    description: 'increment per time step for lambda',
    defaultValue: '0',
    category: 'free-energy-calculations'
  },
  {
    name: 'init-lambda-state',
    type: 'real',
    description: 'starting value for the lambda state (integer). Specifies which column of the lambda vector (coul-lambdas, vdw-lambdas, bonded-lambdas, restraint-lambdas, mass-lambdas, temperature-lambdas, fep-lambdas) should be used. This is a zero-based index: init-lambda-state=0 means the first column, and so on.',
    defaultValue: '-1',
    category: 'free-energy-calculations'
  },
  {
    name: 'fep-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps. Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. Free energy differences between different lambda values can then be determined with gmx bar. fep-lambdas is different from the other -lambdas keywords because all components of the lambda vector that are not specified will use fep-lambdas.',
    unit: 'array',
    category: 'free-energy-calculations'
  },
  {
    name: 'coul-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps. Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. If soft-core potentials are used, values must be between 0 and 1. Only the electrostatic interactions are controlled with this component of the lambda vector (and only if the lambda=0 and lambda=1 states have differing electrostatic interactions).',
    unit: 'array',
    range: { min: 0.0, max: 1.0 },
    category: 'free-energy-calculations'
  },
  {
    name: 'vdw-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps.  Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. If soft-core potentials are used, values must be between 0 and 1. Only the van der Waals interactions are controlled with this component of the lambda vector.',
    unit: 'array',
    range: { min: 0.0, max: 1.0 },
    category: 'free-energy-calculations'
  },
  {
    name: 'bonded-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps.  Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. Only the bonded interactions are controlled with this component of the lambda vector.',
    unit: 'array',
    category: 'free-energy-calculations'
  },
  {
    name: 'restraint-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps.  Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. Only the restraint interactions: dihedral restraints, and the pull code restraints are controlled with this component of the lambda vector.',
    unit: 'array',
    category: 'free-energy-calculations'
  },
  {
    name: 'mass-lambdas',
    type: 'integer',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps.  Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. Only the particle masses are controlled with this component of the lambda vector.',
    unit: 'array',
    category: 'free-energy-calculations'
  },
  {
    name: 'temperature-lambdas',
    type: 'real',
    description: '[array] Zero, one or more lambda values for which Delta H values will be determined and written to dhdl.xvg every nstdhdl steps.  Values must be greater than or equal to 0; values greater than 1 are allowed but should be used carefully. Only the temperatures are controlled with this component of the lambda vector. Note that these lambdas should not be used for replica exchange, only for simulated tempering.',
    unit: 'array',
    category: 'free-energy-calculations'
  },
  {
    name: 'calc-lambda-neighbors',
    type: 'integer',
    description: 'Controls the number of lambda values for which Delta H values will be calculated and written out, if init-lambda-state has been set. These lambda values are referred to as "foreign" lambdas. A positive value will limit the number of lambda points calculated to only the nth neighbors of init-lambda-state: for example, if init-lambda-state is 5 and this parameter has a value of 2, energies for lambda points 3-7 will be calculated and writen out. A value of -1 means all lambda points will be written out. For normal BAR such as with gmx bar, a value of 1 is sufficient, while for MBAR -1 should be used.',
    defaultValue: '1',
    unit: 'bar',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-function',
    type: 'enum',
    description: 'Beutler *et al.* soft-core function\n\nGapsys *et al.* soft-core function',
    defaultValue: 'beutler',
    validValues: ['beutler', 'gapsys'],
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-alpha',
    type: 'string',
    description: 'for `sc-function=beutler` the soft-core alpha parameter, a value of 0 results in linear interpolation of the LJ and Coulomb interactions. Used only with `sc-function=beutler`',
    defaultValue: '0',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-r-power',
    type: 'string',
    description: 'power 6 for the radial term in the soft-core equation. Used only with `sc-function=beutler`',
    defaultValue: '6',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-coul',
    type: 'boolean',
    description: 'Whether to apply the soft-core free energy interaction transformation to the Coulombic interaction of a molecule. Default is no, as it is generally more efficient to turn off the Coulombic interactions linearly before turning off the van der Waals interactions. Note that it is only taken into account when there are multiple lambda components, and you can still turn off soft-core interactions by setting sc-alpha to 0. Used only with `sc-function=beutler`',
    defaultValue: 'no',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-power',
    type: 'string',
    description: 'the power for lambda in the soft-core function, only the values 1 and 2 are supported. Used only with `sc-function=beutler`',
    defaultValue: '1',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-sigma',
    type: 'string',
    description: 'for `sc-function=beutler` the soft-core sigma for particles which have a C6 or C12 parameter equal to zero or a sigma smaller than sc-sigma. Used only with `sc-function=beutler`',
    defaultValue: '0.3',
    unit: 'nm',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-gapsys-scale-linpoint-lj',
    type: 'real',
    description: 'for `sc-function=gapsys` it is the unitless alphaLJ parameter. It controls the softness of the van der Waals interactions by scaling the point for linearizing the vdw force. Setting it to 0 will result in the standard hard-core van der Waals interactions. Used only with `sc-function=gapsys`',
    defaultValue: '0.85',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-gapsys-scale-linpoint-q',
    type: 'string',
    description: 'For `sc-function=gapsys` the alphaQ parameter with a default value of 0.3. It controls the softness of the Coulombic interactions. Setting it to 0 will result in the standard hard-core Coulombic interactions. Used only with `sc-function=gapsys`',
    defaultValue: '0.3',
    unit: 'nm/e^2',
    category: 'free-energy-calculations'
  },
  {
    name: 'sc-gapsys-sigma-lj',
    type: 'string',
    description: 'for `sc-function=gapsys` the soft-core sigma for particles which have a C6 or C12 parameter equal to zero. Used only with `sc-function=gapsys`',
    defaultValue: '0.3',
    unit: 'nm',
    category: 'free-energy-calculations'
  },
  {
    name: 'couple-moltype',
    type: 'real',
    description: 'Here one can supply a molecule type (as defined in the topology) for calculating solvation or coupling free energies. There is a special option system that couples all molecule types in the system. This can be useful for equilibrating a system starting from (nearly) random coordinates. free-energy has to be turned on. The Van der Waals interactions and/or charges in this molecule type can be turned on or off between lambda=0 and lambda=1, depending on the settings of couple-lambda0 and couple-lambda1. If you want to decouple one of several copies of a molecule, you need to copy and rename the molecule definition in the topology.',
    defaultValue: 'as defined in the topology',
    category: 'free-energy-calculations'
  },
  {
    name: 'couple-lambda0',
    type: 'enum',
    description: 'all interactions are on at lambda=0\n\nthe charges are zero (no Coulomb interactions) at lambda=0\n\nthe Van der Waals interactions are turned off at lambda=0; soft-core interactions will be required to avoid singularities\n\nthe Van der Waals interactions are turned off and the charges are zero at lambda=0; soft-core interactions will be required to avoid singularities.',
    validValues: ['vdw-q', 'vdw', 'q', 'none'],
    category: 'free-energy-calculations'
  },
  {
    name: 'couple-lambda1',
    type: 'string',
    description: 'analogous to couple-lambda0, but for lambda=1',
    category: 'free-energy-calculations'
  },
  {
    name: 'couple-intramol',
    type: 'enum',
    description: 'All intra-molecular non-bonded interactions for moleculetype couple-moltype are replaced by exclusions and explicit pair interactions. In this manner the decoupled state of the molecule corresponds to the proper vacuum state without periodicity effects.\n\nThe intra-molecular Van der Waals and Coulomb interactions are also turned on/off. This can be useful for partitioning free-energies of relatively large molecules, where the intra-molecular non-bonded interactions might lead to kinetically trapped vacuum conformations. The 1-4 pair interactions are not turned off.',
    validValues: ['no', 'yes'],
    category: 'free-energy-calculations'
  },
  {
    name: 'nstdhdl',
    type: 'integer',
    description: 'the interval for writing dH/dlambda and possibly Delta H to dhdl.xvg, 0 means no ouput, should be a multiple of nstcalcenergy.',
    defaultValue: '100',
    category: 'free-energy-calculations'
  },
  {
    name: 'dhdl-derivatives',
    type: 'boolean',
    description: 'If yes (the default), the derivatives of the Hamiltonian with respect to lambda at each nstdhdl step are written out. These values are needed for interpolation of linear energy differences with gmx bar (although the same can also be achieved with the right calc-lambda-neighbors setting, that may not be as flexible), or with thermodynamic integration',
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
    validValues: ['yes', 'no'],
    unit: 'bar',
    category: 'free-energy-calculations'
  },
  {
    name: 'dh-hist-size',
    type: 'real',
    description: 'If nonzero, specifies the size of the histogram into which the Delta H values (specified with calc-lambda-neighbors) and the derivative dH/dl values are binned, and written to ener.edr. This can be used to save disk space while calculating free energy differences. One histogram gets written for each foreign lambda and two for the dH/dl, at every nstenergy step. Be aware that incorrect histogram settings (too small size or too wide bins) can introduce errors. Do not use histograms unless you are certain you need it.',
    defaultValue: '0',
    category: 'free-energy-calculations'
  },
  {
    name: 'dh-hist-spacing',
    type: 'real',
    description: 'Specifies the bin width of the histograms, in energy units. Used in conjunction with dh-hist-size. This size limits the accuracy with which free energies can be calculated. Do not use histograms unless you are certain you need it.',
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
    validValues: ['no', 'metropolis-transition', 'barker-transition', 'wang-landau', 'min-variance'],
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-mc-move',
    type: 'enum',
    description: 'No Monte Carlo in state space is performed.\n\nRandomly chooses a new state up or down, then uses the Metropolis criteria to decide whether to accept or reject: Min{1,exp(-(beta_new u_new - beta_old u_old)}\n\nRandomly chooses a new state up or down, then uses the Barker transition criteria to decide whether to accept or reject: exp(-beta_new u_new)/(exp(-beta_new u_new)+exp(-beta_old u_old))\n\nUses the conditional weights of the state given the coordinate (exp(-beta_i u_i) / sum_k exp(beta_i u_i) to decide which state to move to.\n\nUses the conditional weights of the state given the coordinate (exp(-beta_i u_i) / sum_k exp(beta_i u_i) to decide which state to move to, EXCLUDING the current state, then uses a rejection step to ensure detailed balance. Always more efficient that Gibbs, though only marginally so in many situations, such as when only the nearest neighbors have decent phase space overlap.',
    validValues: ['no', 'metropolis-transition', 'barker-transition', 'gibbs', 'metropolized-gibbs'],
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-seed',
    type: 'string',
    description: 'random seed to use for Monte Carlo moves in state space. When lmc-seed is set to -1, a pseudo random seed is us',
    defaultValue: '-1',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'mc-temperature',
    type: 'real',
    description: 'Temperature used for acceptance/rejection for Monte Carlo moves. If not specified, the temperature of the simulation specified in the first group of ref-t is used.',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'wl-ratio',
    type: 'integer',
    description: 'The cutoff for the histogram of state occupancies to be reset, and the free energy incrementor to be changed from delta to delta * wl-scale. If we define the Nratio = (number of samples at each histogram) / (average number of samples at each histogram). wl-ratio of 0.8 means that means that the histogram is only considered flat if all Nratio > 0.8 AND simultaneously all 1/Nratio > 0.8.',
    defaultValue: '0.8',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'wl-scale',
    type: 'real',
    description: 'Each time the histogram is considered flat, then the current value of the Wang-Landau incrementor for the free energies is multiplied by wl-scale. Value must be between 0 and 1.',
    defaultValue: '0.8',
    range: { min: 0.0, max: 1.0 },
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'init-wl-delta',
    type: 'real',
    description: 'The initial value of the Wang-Landau incrementor in kT. Some value near 1 kT is usually most efficient, though sometimes a value of 2-3 in units of kT works better if the free energy differences are large.',
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
    defaultValue: '1',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-gibbsdelta',
    type: 'real',
    description: 'Limit Gibbs sampling to selected numbers of neighboring states. For Gibbs sampling, it is sometimes inefficient to perform Gibbs sampling over all of the states that are defined. A positive value of lmc-gibbsdelta means that only states plus or minus lmc-gibbsdelta are considered in exchanges up and down. A value of -1 means that all states are considered. For less than 100 states, it is probably not that expensive to include all states.',
    defaultValue: '-1',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-forced-nstart',
    type: 'integer',
    description: 'Force initial state space sampling to generate weights. In order to come up with reasonable initial weights, this setting allows the simulation to drive from the initial to the final lambda state, with lmc-forced-nstart steps at each state before moving on to the next lambda state. If lmc-forced-nstart is sufficiently long (thousands of steps, perhaps), then the weights will be close to correct. However, in most cases, it is probably better to simply run the standard weight equilibration algorithms.',
    defaultValue: '0',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'nst-transition-matrix',
    type: 'integer',
    description: 'Interval of outputting the expanded ensemble transition matrix. A negative number means it will only be printed at the end of the simulation.',
    defaultValue: '-1',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'symmetrized-transition-matrix',
    type: 'real',
    description: 'Whether to symmetrize the empirical transition matrix. In the infinite limit the matrix will be symmetric, but will diverge with statistical noise for short timescales. Forced symmetrization, by using the matrix T_sym = 1/2 (T + transpose(T)), removes problems like the existence of (small magnitude) negative eigenvalues.',
    defaultValue: 'no',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'mininum-var-min',
    type: 'integer',
    description: 'The min-variance strategy (option of lmc-stats is only valid for larger number of samples, and can get stuck if too few samples are used at each state. mininum-var-min is the minimum number of samples that each state that are allowed before the min-variance strategy is activated if selected.',
    defaultValue: '100',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'init-lambda-weights',
    type: 'string',
    description: 'The initial weights (free energies) used for the expanded ensemble states. Default is a vector of zero weights. format is similar to the lambda vector settings in fep-lambdas, except the weights can be any floating point number. Units are kT. Its length must match the lambda vector lengths.',
    defaultValue: 'free energies',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'init-wl-histogram-counts',
    type: 'real',
    description: 'The initial counts used for the Wang-Landau histogram of visiting expanded ensemble states. The flatness of this histogram is used to decide whether to decrement the histogram-building incrementor. This option is only generally useful if continuing a shorter simulation from a previous one, as the smaller the incrementor gets, the longer it takes for the histogram to become flat, often longer than a short simulation takes, requiring the histogram population to be carried over from the previous simulation. The default is a vector of zeros. The format is similar to the lambda vector settings in fep-lambdas. The value can be a floating point number or an integer, as some methods increment multiple histogram bins at the same time with fractional weights. Its length must match the lambda vector lengths.',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'init-lambda-counts',
    type: 'integer',
    description: 'The initial counts used for the number of times each expanded ensemble state is visited states. Several algorithms set by lmc-weights-equil use various functions of the number of visits to each state states to decide whether to switch to different phases of weight determination. These include number-all-lambda which requires the mumber of times each lambda state is visited to be equal to or greater than this number, number-samples, which requires the total number of visits to all lambda states to be greater than or equal to this, and count-ratio, which requires the number of states visited at each state to be within a given ratio of equal visitation. This option is only generally useful if continuing a shorter simulation from a previous one, as most methods will reach the triggering conditions with relatively low number of samples collected. The default is a vector of zeros. The format is similar to the lambda vector settings in fep-lambdas.  Unlike init-wl-histogram, the value can only be an integer. Its length must match the lambda vector lengths.',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'lmc-weights-equil',
    type: 'enum',
    description: 'Expanded ensemble weights continue to be updated throughout the simulation.\n\nThe input expanded ensemble weights are treated as equilibrated, and are not updated throughout the simulation.\n\nExpanded ensemble weight updating is stopped when the Wang-Landau incrementor falls below this value.\n\nExpanded ensemble weight updating is stopped when the number of samples at all of the lambda states is greater than this value.\n\nExpanded ensemble weight updating is stopped when the number of steps is greater than the level specified by this value.\n\nExpanded ensemble weight updating is stopped when the number of total samples across all lambda states is greater than the level specified by this value.\n\nExpanded ensemble weight updating is stopped when the ratio of samples at the least sampled lambda state and most sampled lambda state greater than this value.',
    validValues: ['no', 'yes', 'wl-delta', 'number-all-lambda', 'number-steps', 'number-samples', 'count-ratio'],
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'simulated-tempering',
    type: 'boolean',
    description: 'Turn simulated tempering on or off. Simulated tempering is implemented as expanded ensemble sampling with different temperatures instead of different Hamiltonians.',
    defaultValue: 'no',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'sim-temp-low',
    type: 'real',
    description: 'Low temperature for simulated tempering.',
    defaultValue: '300',
    unit: 'K',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'sim-temp-high',
    type: 'real',
    description: 'High temperature for simulated tempering.',
    defaultValue: '300',
    unit: 'K',
    category: 'expanded-ensemble-calculations'
  },
  {
    name: 'simulated-tempering-scaling',
    type: 'enum',
    description: 'Controls the way that the temperatures at intermediate lambdas are calculated from the temperature-lambdas part of the lambda vector.\n\nLinearly interpolates the temperatures using the values of temperature-lambdas, *i.e.* if sim-temp-low =300, sim-temp-high =400, then lambda=0.5 correspond to a temperature of 350. A nonlinear set of temperatures can always be implemented with uneven spacing in lambda.\n\nInterpolates temperatures geometrically between sim-temp-low and sim-temp-high. The i:th state has temperature sim-temp-low * (sim-temp-high / sim-temp-low) raised to the power of (i/(ntemps-1)). This should give roughly equal exchange for constant heat capacity, though of course things simulations that involve protein folding have very high heat capacity peaks.\n\nInterpolates temperatures exponentially between sim-temp-low and sim-temp-high. The i:th state has temperature sim-temp-low + (sim-temp-high - sim-temp-low)*((exp(temperature-lambdas (i))-1)/(exp(1.0)-i)).',
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
    defaultValue: '0',
    unit: 'nm ps\ ^-2',
    category: 'non-equilibrium-md'
  },
  {
    name: 'freezegrps',
    type: 'string',
    description: 'Groups that are to be frozen (*i.e.* their X, Y, and/or Z position will not be updated; *e.g.* Lipid SOL). freezedim specifies for which dimension(s) the freezing applies. Note that the virial and pressure are usually not meaningful when frozen atoms are present. Note that coordinates of frozen atoms are not scaled by pressure-coupling algorithms.',
    category: 'non-equilibrium-md'
  },
  {
    name: 'freezedim',
    type: 'string',
    description: 'dimensions for which groups in freezegrps should be frozen, specify Y or N for X, Y and Z and for each group (*e.g.* Y Y N N N N means that particles in the first group can move only in Z direction. The particles in the second group can move in any direction).',
    category: 'non-equilibrium-md'
  },
  {
    name: 'cos-acceleration',
    type: 'real',
    description: 'the amplitude of the acceleration profile for calculating the viscosity. The acceleration is in the X-direction and the magnitude is cos-acceleration cos(2 pi z/boxheight). Two terms are added to the energy file: the amplitude of the velocity profile and 1/viscosity.',
    defaultValue: '0',
    unit: 'nm ps\ ^-2',
    category: 'non-equilibrium-md'
  },
  {
    name: 'deform',
    type: 'integer',
    description: 'The velocities of deformation for the box elements: a(x) b(y) c(z) b(x) c(x) c(y). Each step the box elements for which deform is non-zero are calculated as: box(ts)+(t-ts)*deform, off-diagonal elements are corrected for periodicity. The time ts is set to t at the first step and at steps at which x and v are written to trajectory to ensure exact restarts. Deformation can be used together with semiisotropic or anisotropic pressure coupling when the appropriate compressibilities are set to zero. The diagonal elements can be used to strain a solid. The off-diagonal elements can be used to shear a solid or a liquid. Note that the atom positions are not affected directly by this option. Instead, the deform option only modifies the velocities of particles that are shifted by a periodic box vector such that their new velocities match the virtual velocity flow field corresponding to the box deformation. As the deform option never accelerates the remaining particles in the system, the matching velocity flow field should be set up at the beginning of the simulation to make the particles follow the deformation. This can be done with the deform-init-flow option. The flow field is removed from the kinetic energy by gmx mdrun so the actual temperature and pressure of the system are reported.',
    defaultValue: '0',
    unit: 'nm ps\ ^-1',
    category: 'non-equilibrium-md'
  },
  {
    name: 'deform-init-flow',
    type: 'enum',
    description: 'Do not modify the velocities. Only use this option when the velocities of the atoms in the initial configuration already obey the flow field.\n\nWhen the deform option is active, add a velocity profile corresponding to the box deformation to the initial velocities. This is done after computing observables from the initial state such as the initial temperature.',
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
    category: 'electric-fields'
  },
  {
    name: 'electric-field-z',
    type: 'string',
    description: 'Here you can specify an electric field that optionally can be alternating and pulsed. The general expression for the field has the form of a gaussian laser pulse:\n\nFor example, the four parameters for direction x are set in the fields of electric-field-x (and similar for electric-field-y and electric-field-z) like\n\nelectric-field-x  = E0 omega t0 sigma\n\nwith units (respectively) V nm\ ^-1, ps\ ^-1, ps, ps.\n\nIn the special case that sigma = 0, the exponential term is omitted and only the cosine term is used. In this case, t0 must be set to 0. If also omega = 0 a static electric field is applied.\n\nRead more at electric fields and in ref. \ 146 <refCaleman2008a>.',
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
    defaultValue: '1',
    category: 'computational-electrophysiology'
  },
  {
    name: 'split-group0',
    type: 'string',
    description: 'Name of the index group of the membrane-embedded part of channel #0. The center of mass of these atoms defines one of the compartment boundaries and should be chosen such that it is near the center of the membrane.',
    category: 'computational-electrophysiology'
  },
  {
    name: 'split-group1',
    type: 'string',
    description: 'Defines the position of the other compartment boundary.',
    category: 'computational-electrophysiology'
  },
  {
    name: 'massw-split0',
    type: 'enum',
    description: '(no) Defines whether or not mass-weighting is used to calculate the split group center.\n\nUse the geometrical center.\n\nUse the center of mass.',
    defaultValue: 'no',
    validValues: ['no', 'yes'],
    category: 'computational-electrophysiology'
  },
  {
    name: 'massw-split1',
    type: 'boolean',
    description: '(no) As above, but for split-group1.',
    defaultValue: 'no',
    category: 'computational-electrophysiology'
  },
  {
    name: 'solvent-group',
    type: 'string',
    description: 'Name of the index group of solvent molecules.',
    category: 'computational-electrophysiology'
  },
  {
    name: 'coupl-steps',
    type: 'integer',
    description: '(10) Average the number of ions per compartment over these many swap attempt steps. This can be used to prevent that ions near a compartment boundary (diffusing through a channel, e.g.) lead to unwanted back and forth swaps.',
    defaultValue: '10',
    category: 'computational-electrophysiology'
  },
  {
    name: 'iontypes',
    type: 'integer',
    description: '(1) The number of different ion types to be controlled. These are during the simulation exchanged with solvent molecules to reach the desired reference numbers.',
    defaultValue: '1',
    category: 'computational-electrophysiology'
  },
  {
    name: 'iontype0-name',
    type: 'string',
    description: 'Name of the first ion type.',
    category: 'computational-electrophysiology'
  },
  {
    name: 'iontype0-in-A',
    type: 'integer',
    description: '(-1) Requested (=reference) number of ions of type 0 in compartment A. The default value of -1 means: use the number of ions as found in time step 0 as reference value.',
    defaultValue: '-1',
    category: 'computational-electrophysiology'
  },
  {
    name: 'iontype0-in-B',
    type: 'integer',
    description: '(-1) Reference number of ions of type 0 for compartment B.',
    defaultValue: '-1',
    category: 'computational-electrophysiology'
  },
  {
    name: 'bulk-offsetA',
    type: 'real',
    description: '(0.0) Offset of the first swap layer from the compartment A midplane. By default (i.e. bulk offset = 0.0), ion/water exchanges happen between layers at maximum distance (= bulk concentration) to the split group layers. However, an offset b (-1.0 < b < +1.0) can be specified to offset the bulk layer from the middle at 0.0 towards one of the compartment-partitioning layers (at +/- 1.0).',
    defaultValue: '0.0',
    category: 'computational-electrophysiology'
  },
  {
    name: 'bulk-offsetB',
    type: 'string',
    description: '(0.0) Offset of the other swap layer from the compartment B midplane.',
    defaultValue: '0.0',
    category: 'computational-electrophysiology'
  },
  {
    name: 'threshold',
    type: 'string',
    description: '(1) Only swap ions if threshold difference to requested count is reached.',
    defaultValue: '1',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl0-r',
    type: 'boolean',
    description: '(2.0) [nm] Radius of the split cylinder #0. Two split cylinders (mimicking the channel pores) can optionally be defined relative to the center of the split group. With the help of these cylinders it can be counted which ions have passed which channel. The split cylinder definition has no impact on whether or not ion/water swaps are done.',
    defaultValue: '2.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl0-up',
    type: 'string',
    description: '(1.0) [nm] Upper extension of the split cylinder #0.',
    defaultValue: '1.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl0-down',
    type: 'string',
    description: '(1.0) [nm] Lower extension of the split cylinder #0.',
    defaultValue: '1.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl1-r',
    type: 'string',
    description: '(2.0) [nm] Radius of the split cylinder #1.',
    defaultValue: '2.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl1-up',
    type: 'string',
    description: '(1.0) [nm] Upper extension of the split cylinder #1.',
    defaultValue: '1.0',
    unit: 'nm',
    category: 'computational-electrophysiology'
  },
  {
    name: 'cyl1-down',
    type: 'string',
    description: '(1.0) [nm] Lower extension of the split cylinder #1.',
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
    defaultValue: 'protein',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-similarity-measure',
    type: 'enum',
    description: '(inner-product) Similarity measure between the density that is calculated from the atom positions and the reference density.\n\nTakes the sum of the product of reference density and simulated density voxel values.\n\nUses the negative relative entropy (or Kullback-Leibler divergence) between reference density and simulated density as similarity measure. Negative density values are ignored.\n\nUses the Pearson correlation coefficient between reference density and simulated density as similarity measure.',
    defaultValue: 'inner-product',
    validValues: ['inner-product', 'relative-entropy', 'cross-correlation'],
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-atom-spreading-weight',
    type: 'enum',
    description: '(unity) Determines the multiplication factor for the Gaussian kernel when spreading atoms on the grid.\n\nEvery atom in the density fitting group is assigned the same unit factor.\n\nAtoms contribute to the simulated density proportional to their mass.\n\nAtoms contribute to the simulated density proportional to their charge.',
    defaultValue: 'unity',
    validValues: ['unity', 'mass', 'charge'],
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-force-constant',
    type: 'integer',
    description: '(1e+09) [kJ mol\ ^-1] The scaling factor for density-guided simulation forces. May also be negative.',
    defaultValue: '1e+09',
    unit: 'kJ mol\ ^-1',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-gaussian-transform-spreading-width',
    type: 'real',
    description: '(0.2) [nm] The Gaussian RMS width for the spread kernel for the simulated density.',
    defaultValue: '0.2',
    unit: 'nm',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-gaussian-transform-spreading-range-in-multiples-of-width',
    type: 'real',
    description: '(4) The range after which the gaussian is cut off in multiples of the Gaussian RMS width described above.',
    defaultValue: '4',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-reference-density-filename',
    type: 'real',
    description: '(reference.mrc) Reference density file name using an absolute path or a path relative to the to the folder from which gmx mdrun is called.',
    defaultValue: 'reference.mrc',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-nst',
    type: 'integer',
    description: '(1) Interval in steps at which the density fitting forces are evaluated and applied. The forces are scaled by this number when applied (See the reference manual for details).',
    defaultValue: '1',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-normalize-densities',
    type: 'boolean',
    description: '(true) Normalize the sum of density voxel values to one for the reference density as well as the simulated density.',
    defaultValue: 'true',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-adaptive-force-scaling',
    type: 'enum',
    description: '(false) Adapt the force constant to ensure a steady increase in similarity between simulated and reference density.\n\nDo not use adaptive force scaling.\n\nUse adaptive force scaling.',
    defaultValue: 'false',
    validValues: ['true'],
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-adaptive-force-scaling-time-constant',
    type: 'integer',
    description: '(4) [ps] Couple force constant to increase in similarity with reference density with this time constant. Larger times result in looser coupling.',
    defaultValue: '4',
    unit: 'ps',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-shift-vector',
    type: 'real',
    description: '(0,0,0) [nm] Add this vector to all atoms in the density-guided-simulation-group before calculating forces and energies for density-guided simulations. Affects only the density-guided simulation forces and energies. Corresponds to a shift of the input density in the opposite direction by (-1) * density-guided-simulation-shift-vector.',
    defaultValue: '0,0,0',
    unit: 'nm',
    category: 'density-guided-simulations'
  },
  {
    name: 'density-guided-simulation-transformation-matrix',
    type: 'real',
    description: '(1,0,0,0,1,0,0,0,1) Multiply all atoms with this matrix in the density-guided-simulation-group before calculating forces and energies for density-guided simulations. Affects only the density-guided simulation forces and energies. Corresponds to a transformation of the input density by the inverse of this matrix. The matrix is given in row-major order. This option allows, e.g., rotation of the density-guided atom group around the z-axis by \theta degrees by using the following input: (\cos \theta , -\sin \theta , 0 , \sin \theta , \cos \theta , 0 , 0 , 0 , 1) .',
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
    defaultValue: 'System',
    category: 'qmmm-cp2k'
  },
  {
    name: 'qmmm-cp2k-qmmethod',
    type: 'enum',
    description: '(PBE) Method used to describe the QM part of the system.\n\nDFT using PBE functional and DZVP-MOLOPT basis set.\n\nDFT using BLYP functional and DZVP-MOLOPT basis set.\n\nProvide an external input file for CP2K when running gmx grompp with the -qmi command-line option. External input files are subject to the limitations that are described in qmmm.',
    defaultValue: 'PBE',
    validValues: ['PBE', 'BLYP', 'INPUT'],
    category: 'qmmm-cp2k'
  },
  {
    name: 'qmmm-cp2k-qmcharge',
    type: 'string',
    description: '(0) Total charge of the QM part.',
    defaultValue: '0',
    category: 'qmmm-cp2k'
  },
  {
    name: 'qmmm-cp2k-qmmultiplicity',
    type: 'string',
    description: '(1) Multiplicity or spin-state of QM part. Default value 1 means singlet state.',
    defaultValue: '1',
    category: 'qmmm-cp2k'
  },
  {
    name: 'qmmm-cp2k-qmfilenames',
    type: 'string',
    description: '() Names of the CP2K files that will be generated during the simulation. When using the default, empty, value the name of the simulation input file will be used with an additional _cp2k suffix.',
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
    category: 'colvars'
  },
  {
    name: 'colvars-seed',
    type: 'string',
    description: '(-1) [integer] Seed used to initialize the random generator associated with certain stochastic methods implemented within Colvars.  The default value of -1 generates a random seed.',
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

// 根据参数名获取参数信息
export function getMdpParameter(name: string): MdpParameter | undefined {
  return MDP_PARAMETERS.find(param => 
    param.name === name || 
    param.name.replace(/-/g, '_') === name ||
    param.name.replace(/_/g, '-') === name
  );
}

// 获取所有参数名（包括下划线和连字符变体）
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
