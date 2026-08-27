/**
 * GROMACS Binary File Type Definitions
 *
 * Shared type definitions for parsing GROMACS binary file formats.
 * Each file format has its own interface, but they all extend BinaryFileInfo
 * to provide common metadata (filename, size, magic, endianness, etc.).
 *
 * The actual parsing implementations live in:
 * - src/parsers/xtc/index.ts
 * - src/parsers/trr/index.ts
 * - src/parsers/edr/index.ts
 * - src/parsers/tpr/index.ts
 *
 * Each entry point currently returns mock data (TODO markers) — real parsing
 * will be implemented later.
 */

/**
 * Common metadata for all GROMACS binary files
 */
export interface BinaryFileInfo {
  /** Full filename (basename) */
  filename: string;
  /** Absolute path on disk */
  filePath: string;
  /** File size in bytes */
  fileSize: number;
  /** Format identifier */
  format: 'xtc' | 'trr' | 'edr' | 'tpr';
  /** Magic number as integer (e.g. 0xC2A7 for XTC) */
  magic: number;
  /** Human-readable magic number (e.g. "0xC2A7") */
  magicDisplay: string;
  /** XDR (External Data Representation) for XTC/TRR/EDR; native for TPR */
  encoding: 'XDR' | 'native';
  /** Byte order of the file */
  endianness: 'little-endian' | 'big-endian';
  /** Format-specific version string if applicable */
  version?: string;
}

/**
 * XTC (Compressed Trajectory) file info
 */
export interface XtcFileInfo extends BinaryFileInfo {
  format: 'xtc';
  /** Number of frames in the trajectory */
  frameCount: number;
  /** Number of atoms per frame */
  atomCount: number;
  /** First frame time in ps (typically 0) */
  timeOffset: number;
  /** Time between consecutive frames in ps */
  deltaTime: number;
  /** All frame times in ps (sampled, full list if requested) */
  times: number[];
  /** XTC precision in nm (typically 0.001) */
  precision: number;
  /** Fixed header size in bytes (52 for XTC) */
  headerSize: number;
}

/**
 * TRR (Trajectory) file info — full-precision uncompressed
 */
export interface TrrFileInfo extends BinaryFileInfo {
  format: 'trr';
  /** Number of frames in the trajectory */
  frameCount: number;
  /** Number of atoms per frame */
  atomCount: number;
  /** First frame time in ps */
  timeOffset: number;
  /** Time between consecutive frames in ps */
  deltaTime: number;
  /** All frame times in ps */
  times: number[];
  /** Float precision */
  precision: 'single' | 'double';
  /** Whether velocity data is present */
  hasVelocities: boolean;
  /** Whether force data is present */
  hasForces: boolean;
  /** Approximate header size in bytes (100 for TRR header) */
  headerSize: number;
}

/**
 * Per-term statistics for EDR energy files
 */
export interface EnergyTermStats {
  /** Term name (e.g. "Temperature", "Pressure", "Potential") */
  name: string;
  /** Unit string (e.g. "K", "bar", "kJ/mol") */
  unit: string;
  /** Minimum value across all frames */
  min: number;
  /** Maximum value across all frames */
  max: number;
  /** Arithmetic mean across all frames */
  mean: number;
  /** Standard deviation across all frames */
  std: number;
  /**
   * Sparse sample of the time series for sparkline rendering.
   * Down-sampled to ~64 points regardless of total frame count.
   */
  sparkline: number[];
}

/**
 * EDR (Energy) file info
 */
export interface EdrFileInfo extends BinaryFileInfo {
  format: 'edr';
  /** Number of frames in the energy file */
  frameCount: number;
  /** Number of energy terms */
  termCount: number;
  /** Names of all energy terms in declaration order */
  termNames: string[];
  /** Per-term statistics + sparkline samples */
  termStats: EnergyTermStats[];
  /** First frame time in ps */
  timeOffset: number;
  /** Time between consecutive frames in ps */
  deltaTime: number;
}

/**
 * Sub-section of a TPR file (collapsible groups in the UI)
 */
export interface TprSection {
  /** Section title shown as heading (e.g. "Force Field") */
  title: string;
  /** Key-value pairs within this section */
  entries: { key: string; value: string }[];
}

/**
 * TPR (Topology / Run Parameters) file info
 */
export interface TprFileInfo extends BinaryFileInfo {
  format: 'tpr';
  /** GROMACS version that produced the file (e.g. "2025.2") */
  gromacsVersion: string;
  /** Precision flag from the file */
  precision: 'single' | 'double';
  /** Total number of atoms in the system */
  atomCount: number;
  /** Number of molecules */
  moleculeCount: number;
  /** Number of distinct residue types */
  residueTypeCount: number;
  /** Number of distinct atom types */
  atomTypeCount: number;
  /** Integrator algorithm (e.g. "md", "steep", "l-bfgs") */
  integrator: string;
  /** Total number of MD steps */
  nsteps: number;
  /** Integration time step in ps */
  dt: number;
  /** Total simulation time in ns (computed: nsteps * dt / 1000) */
  totalTimeNs: number;
  /** Organised sections for collapsible UI */
  sections: TprSection[];
}

/**
 * Discriminated union of all GROMACS file info types
 */
export type GromacsFileInfo = XtcFileInfo | TrrFileInfo | EdrFileInfo | TprFileInfo;

/**
 * Detect format from file extension
 */
export function detectFormat(uriOrPath: { fsPath: string }): GromacsFileInfo['format'] | null {
  const path = uriOrPath.fsPath.toLowerCase();
  if (path.endsWith('.xtc')) {
    return 'xtc';
  }
  if (path.endsWith('.trr')) {
    return 'trr';
  }
  if (path.endsWith('.edr')) {
    return 'edr';
  }
  if (path.endsWith('.tpr')) {
    return 'tpr';
  }
  return null;
}
