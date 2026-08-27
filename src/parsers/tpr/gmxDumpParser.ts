import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GmxDumpInputRec {
  integrator: string;
  nsteps: number;
  dt: number;
  tinit: number;
  init_step: number;
  simulation_part: number;
  nstcalcenergy: number;
  cutoff_scheme: string;
  nstlist: number;
  pbc: string;
  rlist: number;
  coulombtype: string;
  coulomb_modifier: string;
  rcoulomb: number;
  rcoulomb_switch: number;
  vdwtype: string;
  vdw_modifier: string;
  rvdw: number;
  rvdw_switch: number;
  fourierspacing: number;
  pme_order: number;
  ewald_rtol: number;
  tcoupl: string;
  nsttcouple: number;
  pcoupl: string;
  nstpcouple: number;
  tau_p: number;
  nstxout: number;
  nstvout: number;
  nstfout: number;
  nstlog: number;
  nstenergy: number;
  nstxout_compressed: number;
}

/**
 * Parse GROMACS TPR file using `gmx dump` command.
 * This is the most reliable way to extract inputrec parameters.
 */
export async function parseInputRecWithGmxDump(tprPath: string): Promise<GmxDumpInputRec | null> {
  try {
    // Check if gmx command exists
    try {
      await execAsync('which gmx', { timeout: 5000 });
    } catch {
      console.log('[gmxDumpParser] gmx command not found in PATH');
      return null;
    }

    // Run gmx dump and capture output
    const { stdout, stderr } = await execAsync(
      `gmx dump -s "${tprPath}" 2>&1 | grep -A 200 "inputrec:"`,
      {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }
    );

    if (!stdout) {
      console.log('[gmxDumpParser] gmx dump produced no output');
      return null;
    }

    // Parse the output
    const lines = stdout.split('\n');
    const params: Partial<GmxDumpInputRec> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Reading') || trimmed.startsWith('Note:')) {
        continue;
      }

      // Parse key = value format
      const match = trimmed.match(/^(\S+)\s*=\s*(.+)$/);
      if (!match) continue;

      const [, key, value] = match;
      const val = value.trim();

      switch (key) {
        case 'integrator':
          params.integrator = val;
          break;
        case 'nsteps':
          params.nsteps = parseInt(val, 10);
          break;
        case 'dt':
          params.dt = parseFloat(val);
          break;
        case 'tinit':
          params.tinit = parseFloat(val);
          break;
        case 'init-step':
          params.init_step = parseInt(val, 10);
          break;
        case 'simulation-part':
          params.simulation_part = parseInt(val, 10);
          break;
        case 'nstcalcenergy':
          params.nstcalcenergy = parseInt(val, 10);
          break;
        case 'cutoff-scheme':
          params.cutoff_scheme = val;
          break;
        case 'nstlist':
          params.nstlist = parseInt(val, 10);
          break;
        case 'pbc':
          params.pbc = val;
          break;
        case 'rlist':
          params.rlist = parseFloat(val);
          break;
        case 'coulombtype':
          params.coulombtype = val;
          break;
        case 'coulomb-modifier':
          params.coulomb_modifier = val;
          break;
        case 'rcoulomb':
          params.rcoulomb = parseFloat(val);
          break;
        case 'rcoulomb-switch':
          params.rcoulomb_switch = parseFloat(val);
          break;
        case 'vdw-type':
          params.vdwtype = val;
          break;
        case 'vdw-modifier':
          params.vdw_modifier = val;
          break;
        case 'rvdw':
          params.rvdw = parseFloat(val);
          break;
        case 'rvdw-switch':
          params.rvdw_switch = parseFloat(val);
          break;
        case 'fourierspacing':
          params.fourierspacing = parseFloat(val);
          break;
        case 'pme-order':
          params.pme_order = parseInt(val, 10);
          break;
        case 'ewald-rtol':
          params.ewald_rtol = parseFloat(val);
          break;
        case 'tcoupl':
          params.tcoupl = val;
          break;
        case 'nsttcouple':
          params.nsttcouple = parseInt(val, 10);
          break;
        case 'pcoupl':
          params.pcoupl = val;
          break;
        case 'nstpcouple':
          params.nstpcouple = parseInt(val, 10);
          break;
        case 'tau-p':
          params.tau_p = parseFloat(val);
          break;
        case 'nstxout':
          params.nstxout = parseInt(val, 10);
          break;
        case 'nstvout':
          params.nstvout = parseInt(val, 10);
          break;
        case 'nstfout':
          params.nstfout = parseInt(val, 10);
          break;
        case 'nstlog':
          params.nstlog = parseInt(val, 10);
          break;
        case 'nstenergy':
          params.nstenergy = parseInt(val, 10);
          break;
        case 'nstxout-compressed':
          params.nstxout_compressed = parseInt(val, 10);
          break;
      }
    }

    // Check if we got the essential fields
    if (!params.integrator || params.nsteps === undefined || params.dt === undefined) {
      console.log('[gmxDumpParser] Failed to parse essential fields from gmx dump output');
      return null;
    }

    return params as GmxDumpInputRec;

  } catch (error) {
    console.log('[gmxDumpParser] Error running gmx dump:', error);
    return null;
  }
}
