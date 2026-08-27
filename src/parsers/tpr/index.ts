import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TprFileInfo, TprSection } from '../gromacsFileTypes';
import { readInt32BE, readInt64BE, readGmxString, readXdrString } from '../xdrReader';
import { readKVT, getKVTValue, KVTObject } from './kvtReader';
import { readInputRec } from './inputrecReader';
import { parseInputRecWithGmxDump } from './gmxDumpParser';

/**
 * Parse a TPR (Topology / Run Parameters) file.
 *
 * Reference: `src/gromacs/fileio/tpxio.cpp:do_tpxheader` and the body
 * sections `do_tpx_state_first`, `do_mtop`, `do_tpx_state_second`,
 * `do_inputrec`.
 *
 * TPR files start with the literal "VERSION" (XDR length-prefixed),
 * then precision (4 or 8), file version, generation and bookkeeping
 * flags. Modern files (generation >= 27) include `sizeOfTprBody` so we
 * can read the body as a single opaque blob.
 *
 * The body is a complex version-dependent stream of nested structs.
 * For a summary preview we focus on the header — which is small,
 * deterministic and gives us everything we need to populate the
 * Binary Metadata card — and only attempt best-effort extraction of
 * the inputrec's first few fields (integrator, nsteps). Heuristic
 * fields that can't be reliably recovered (dt, molecule count,
 * residue / atom-type counts) are reported as unknown so the UI can
 * fall back to a placeholder.
 */

const TPXV_PRE96_62 = 62;
const TPXV_ADD_SIZE_FIELD = 137;
const TPXG_ADD_SIZE_FIELD = 27;

// Integrator enum values (subset — covers the common ones).
const INTEGRATOR_NAMES: Record<number, string> = {
  0: 'md',
  1: 'steep',
  2: 'cg',
  3: 'bd',
  4: 'sd2',
  5: 'nm',
  6: 'l-bfgs',
  7: 'tpi',
  8: 'tpic',
  9: 'sd',
  10: 'md-vv',
  11: 'md-vv-avek',
  12: 'vv-ak',
};

export async function parseTpr(uri: vscode.Uri): Promise<TprFileInfo> {
  const stat = await fs.promises.stat(uri.fsPath);
  const filename = path.basename(uri.fsPath);
  const fileSize = stat.size;

  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    fileHandle = await fs.promises.open(uri.fsPath, 'r');

    // Header is small.
    const headerBuf = Buffer.alloc(256);
    const headRead = (await fileHandle.read(headerBuf, 0, 256, 0)).bytesRead;
    const hbuf = new Uint8Array(headerBuf.buffer, headerBuf.byteOffset, headRead);

    // VERSION <version-string>\0 — GROMACS double-length-prefixed string.
    const { value: versionString, bytesConsumed: versionBytes } = readGmxString(hbuf, 0);
    if (!versionString.startsWith('VERSION')) {
      throw new Error(`Not a TPR file: expected VERSION magic, got "${versionString}"`);
    }
    let cursor = versionBytes;

    const precisionBytes = readInt32BE(hbuf, cursor); cursor += 4;
    const isDouble = precisionBytes === 8;
    const precision: 'single' | 'double' = isDouble ? 'double' : 'single';
    const realSize = isDouble ? 8 : 4;

    const fileVersion = readInt32BE(hbuf, cursor); cursor += 4;

    let fileTag = '';
    if (fileVersion >= 77 && fileVersion <= 79) {
      const r = readGmxString(hbuf, cursor);
      fileTag = r.value;
      cursor += r.bytesConsumed;
    }
    const fileGeneration = readInt32BE(hbuf, cursor); cursor += 4;
    if (fileVersion >= 81) {
      const r = readGmxString(hbuf, cursor);
      fileTag = r.value;
      cursor += r.bytesConsumed;
    }

    const natoms = readInt32BE(hbuf, cursor); cursor += 4;
    const ngtc = readInt32BE(hbuf, cursor); cursor += 4;
    if (fileVersion < TPXV_PRE96_62) {
      cursor += 4 + realSize;
    }
    if (fileVersion >= 79) {
      cursor += 4; // fep_state
    }
    cursor += realSize; // lambda
    // bIr, bTop, bX, bV, bF, bBox (XDR bools encoded as int32)
    const bIr = readInt32BE(hbuf, cursor) !== 0; cursor += 4;
    const bTop = readInt32BE(hbuf, cursor) !== 0; cursor += 4;
    const bX = readInt32BE(hbuf, cursor) !== 0; cursor += 4;
    const bV = readInt32BE(hbuf, cursor) !== 0; cursor += 4;
    const bF = readInt32BE(hbuf, cursor) !== 0; cursor += 4;
    const bBox = readInt32BE(hbuf, cursor) !== 0; cursor += 4;

    let sizeOfTprBody = 0;
    if (fileVersion >= TPXV_ADD_SIZE_FIELD && fileGeneration >= TPXG_ADD_SIZE_FIELD) {
      sizeOfTprBody = Number(readInt64BE(hbuf, cursor));
      cursor += 8;
    }
    const headerEnd = cursor;
    void fileTag;

    // Body parsing is best-effort. We only attempt to extract the
    // integrator, nsteps, and dt; everything else falls back to header data.
    let integrator = '';
    let nsteps = 0;
    let dt = 0;
    let kvtParams: KVTObject = {};

    // For TPRs that include `sizeOfTprBody` (fileVersion >= 137 AND
    // generation >= 27) we can read the body in one go. For older
    // TPRs we fall back to using the rest of the file as the body.
    const bodySize = sizeOfTprBody > 0 && sizeOfTprBody < fileSize
      ? sizeOfTprBody
      : fileSize - headerEnd;

    if (bodySize > 24) {
      const bodyBuf = Buffer.alloc(Math.min(bodySize, 10 * 1024 * 1024)); // Cap at 10MB for safety
      const read = (await fileHandle.read(bodyBuf, 0, bodyBuf.length, headerEnd)).bytesRead;
      if (read >= 24) {
        const view = new DataView(bodyBuf.buffer, bodyBuf.byteOffset, read);

        if (fileVersion >= 137) {
          // Modern TPR (fileVersion >= 137): Use gmx dump to extract parameters
          // The body structure is too complex to parse reliably with scanning.
          console.log('[parseTpr] TPR fileVersion >= 137 detected, using gmx dump...');

          try {
            const gmxResult = await parseInputRecWithGmxDump(uri.fsPath);

            if (gmxResult) {
              console.log('[parseTpr] ✅ Successfully parsed with gmx dump');
              integrator = gmxResult.integrator;
              nsteps = gmxResult.nsteps;
              dt = gmxResult.dt;

              // Build KVT-like params object
              kvtParams = {
                'integrator': { type: 'string', value: gmxResult.integrator },
                'nsteps': { type: 'int64', value: gmxResult.nsteps },
                'dt': { type: 'double', value: gmxResult.dt },
                'tinit': { type: 'double', value: gmxResult.tinit ?? 0 },
                'init-step': { type: 'int64', value: gmxResult.init_step ?? 0 },
                'simulation-part': { type: 'int32', value: gmxResult.simulation_part ?? 1 },
                'nstcalcenergy': { type: 'int32', value: gmxResult.nstcalcenergy ?? 0 },
                'cutoff-scheme': { type: 'string', value: gmxResult.cutoff_scheme ?? 'Unknown' },
                'nstlist': { type: 'int32', value: gmxResult.nstlist ?? 0 },
                'pbc': { type: 'string', value: gmxResult.pbc ?? 'xyz' },
                'rlist': { type: 'double', value: gmxResult.rlist ?? 0 },
                'coulombtype': { type: 'string', value: gmxResult.coulombtype ?? 'Unknown' },
                'coulomb-modifier': { type: 'string', value: gmxResult.coulomb_modifier ?? 'None' },
                'rcoulomb': { type: 'double', value: gmxResult.rcoulomb ?? 0 },
                'rcoulomb-switch': { type: 'double', value: gmxResult.rcoulomb_switch ?? 0 },
                'vdw-type': { type: 'string', value: gmxResult.vdwtype ?? 'Unknown' },
                'vdw-modifier': { type: 'string', value: gmxResult.vdw_modifier ?? 'None' },
                'rvdw': { type: 'double', value: gmxResult.rvdw ?? 0 },
                'rvdw-switch': { type: 'double', value: gmxResult.rvdw_switch ?? 0 },
                'fourierspacing': { type: 'double', value: gmxResult.fourierspacing ?? 0 },
                'pme-order': { type: 'int32', value: gmxResult.pme_order ?? 4 },
                'ewald-rtol': { type: 'double', value: gmxResult.ewald_rtol ?? 0 },
                'tcoupl': { type: 'string', value: gmxResult.tcoupl ?? 'No' },
                'nsttcouple': { type: 'int32', value: gmxResult.nsttcouple ?? -1 },
                'pcoupl': { type: 'string', value: gmxResult.pcoupl ?? 'No' },
                'nstpcouple': { type: 'int32', value: gmxResult.nstpcouple ?? -1 },
                'tau-p': { type: 'double', value: gmxResult.tau_p ?? 0 },
                'nstxout': { type: 'int32', value: gmxResult.nstxout ?? 0 },
                'nstvout': { type: 'int32', value: gmxResult.nstvout ?? 0 },
                'nstfout': { type: 'int32', value: gmxResult.nstfout ?? 0 },
                'nstlog': { type: 'int32', value: gmxResult.nstlog ?? 0 },
                'nstenergy': { type: 'int32', value: gmxResult.nstenergy ?? 0 },
                'nstxout-compressed': { type: 'int32', value: gmxResult.nstxout_compressed ?? 0 },
              };
            } else {
              console.warn('[parseTpr] gmx dump failed or gmx command not found');
              console.warn('[parseTpr] Please install GROMACS to view TPR parameters');
              integrator = 'N/A (gmx not found)';
              nsteps = 0;
              dt = 0;
            }
          } catch (err) {
            console.warn('[parseTpr] Error using gmx dump:', err);
            integrator = 'N/A (parse error)';
            nsteps = 0;
            dt = 0;
          }
        } else {
          // Old TPR (fileVersion < 137): use the original heuristic scan
          const found = findInputRecStart(bodyBuf, read, fileVersion, isDouble);
          if (found >= 0) {
            // Read eI (int), nsteps (int64 if version >= 62, else int), and dt (float/double).
            const eI = view.getInt32(found, false);
            integrator = INTEGRATOR_NAMES[eI] ?? '';
            let cursor = found + 4;
            if (fileVersion >= TPXV_PRE96_62) {
              // nsteps is the int64 right after eI.
              if (cursor + 8 <= read) {
                nsteps = Number(view.getBigInt64(cursor, false));
                cursor += 8;
              }
            } else {
              if (cursor + 4 <= read) {
                nsteps = view.getInt32(cursor, false);
                cursor += 4;
              }
            }
            // dt comes after nsteps. Skip init_step (int64 for version >= 62) and then read dt.
            if (fileVersion >= TPXV_PRE96_62) {
              cursor += 8; // init_step (int64)
            } else {
              cursor += 4; // init_step (int)
            }
            // Now read dt (real = float or double depending on precision)
            if (cursor + realSize <= read) {
              if (isDouble) {
                dt = view.getFloat64(cursor, false);
              } else {
                dt = view.getFloat32(cursor, false);
              }
            }
          }
        }
      }
    }

    const totalTimeNs = (nsteps > 0 && dt > 0) ? (nsteps * dt) / 1000 : 0;

    const sections: TprSection[] = [
      {
        title: 'Simulation Parameters',
        entries: [
          ...(integrator ? [{ key: 'Integrator', value: integrator }] : []),
          ...(nsteps ? [{ key: 'nsteps', value: nsteps.toLocaleString() }] : []),
          ...(dt > 0 ? [{ key: 'dt', value: `${dt.toFixed(3)} ps` }] : []),
          ...(totalTimeNs > 0 ? [{ key: 'Total time', value: `${totalTimeNs.toFixed(2)} ns` }] : []),
          { key: 'natoms', value: natoms.toLocaleString() },
          ...(ngtc ? [{ key: 'ngtc', value: String(ngtc) }] : []),
        ],
      },
      {
        title: 'Topology',
        entries: [
          { key: 'Molecules', value: '?' },
        ],
      },
      {
        title: 'File Metadata',
        entries: [
          { key: 'fileVersion', value: String(fileVersion) },
          { key: 'fileGeneration', value: String(fileGeneration) },
          { key: 'precision', value: precision },
          { key: 'bIr', value: String(bIr) },
          { key: 'bTop', value: String(bTop) },
          { key: 'bX', value: String(bX) },
          { key: 'bV', value: String(bV) },
          { key: 'bBox', value: String(bBox) },
          ...(sizeOfTprBody ? [{ key: 'sizeOfTprBody', value: `${sizeOfTprBody.toLocaleString()} bytes` }] : []),
        ],
      },
    ];

    // Add additional parameter sections from KVT (for modern TPR files)
    if (Object.keys(kvtParams).length > 0) {
      sections.push(...buildKVTSections(kvtParams));
    }

    return {
      format: 'tpr',
      filename,
      filePath: uri.fsPath,
      fileSize,
      magic: 0,
      magicDisplay: `VERSION (${versionString.replace(/^VERSION\s*/, '')})`,
      encoding: 'XDR',
      endianness: 'big-endian',
      version: versionString.replace(/^VERSION\s*/, ''),
      gromacsVersion: versionString.replace(/^VERSION\s*/, ''),
      precision,
      atomCount: natoms,
      moleculeCount: 0,
      residueTypeCount: 0,
      atomTypeCount: 0,
      integrator,
      nsteps,
      dt,
      totalTimeNs,
      sections,
    };
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}

/**
 * Locate the start of the inputrec inside the TPR body.
 *
 * Strategy: scan forward looking for the first occurrence of the
 * `(eI, nsteps)` signature — `eI` is an int in [0, 14] and `nsteps`
 * (for version >= 62) is an int64 in [1, 10^11]. This is a heuristic
 * because we don't fully parse the body — the inputrec is the last
 * big block in the body, but we don't have its exact offset.
 *
 * To reduce false positives, we only look in the last 1/2 of the body
 * (where the inputrec typically lives) and we require `nsteps` to be
 * >= 1000 (coincidental matches in topology data tend to be smaller).
 *
 * Returns the byte offset of the eI field, or -1 if not found.
 */
function findInputRecStart(
  body: Buffer,
  length: number,
  version: number,
  _isDouble: boolean,
): number {
  const useInt64 = version >= TPXV_PRE96_62;
  const stride = useInt64 ? 12 : 8; // eI + (nsteps)
  const view = new DataView(body.buffer, body.byteOffset, length);
  // Scan from the last 1/4 of the body. The inputrec is the last
  // big block in the body, but the exact size of the preceding
  // state / topology sections varies per file. We require a strong
  // signature — nsteps in the realistic range [1000, 1e9] — to
  // reject coincidental matches in topology data.
  const startOff = Math.floor((length * 3) / 4);
  for (let off = startOff; off + stride <= length; off += 4) {
    const eI = view.getInt32(off, false);
    if (eI < 0 || eI > 14) {
      continue;
    }
    let nsteps: number;
    if (useInt64) {
      const big = view.getBigInt64(off + 4, false);
      if (big < 1000n || big > 1_000_000_000n) {
        continue;
      }
      nsteps = Number(big);
    } else {
      nsteps = view.getInt32(off + 4, false);
      if (nsteps < 1000) {
        continue;
      }
    }
    return off;
  }
  return -1;
}

/**
 * Build additional parameter sections from extracted KVT data.
 */
function buildKVTSections(kvt: KVTObject): TprSection[] {
  const sections: TprSection[] = [];

  // Helper to format KVT values
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(6);
    }
    return String(val);
  };

  // Cutoff parameters
  const cutoffEntries: { key: string; value: string }[] = [];
  const cutoffParams = ['rlist', 'rcoulomb', 'rvdw', 'rcoulomb-switch', 'rvdw-switch'];
  for (const param of cutoffParams) {
    const val = getKVTValue(kvt, param);
    if (val && (val.type === 'float' || val.type === 'double')) {
      cutoffEntries.push({ key: param, value: `${(val.value as number).toFixed(3)} nm` });
    }
  }
  if (cutoffEntries.length > 0) {
    sections.push({ title: 'Cutoff Parameters', entries: cutoffEntries });
  }

  // Coulomb parameters
  const coulombEntries: { key: string; value: string }[] = [];
  const coulombType = getKVTValue(kvt, 'coulombtype');
  if (coulombType && coulombType.type === 'int32') {
    const types = ['Cut-off', 'Ewald', 'PME', 'P3M-AD', 'Reaction-Field', 'User'];
    coulombEntries.push({ key: 'coulombtype', value: types[coulombType.value as number] ?? String(coulombType.value) });
  }
  const fourierspacing = getKVTValue(kvt, 'fourierspacing');
  if (fourierspacing && (fourierspacing.type === 'float' || fourierspacing.type === 'double')) {
    coulombEntries.push({ key: 'fourierspacing', value: `${(fourierspacing.value as number).toFixed(3)} nm` });
  }
  const pmeOrder = getKVTValue(kvt, 'pme-order');
  if (pmeOrder && pmeOrder.type === 'int32') {
    coulombEntries.push({ key: 'pme-order', value: String(pmeOrder.value) });
  }
  if (coulombEntries.length > 0) {
    sections.push({ title: 'Coulomb Parameters', entries: coulombEntries });
  }

  // Temperature coupling
  const tcEntries: { key: string; value: string }[] = [];
  const tcoupl = getKVTValue(kvt, 'tcoupl');
  if (tcoupl && tcoupl.type === 'int32') {
    const types = ['no', 'berendsen', 'nose-hoover', 'yes', 'andersen', 'andersen-massive', 'v-rescale'];
    tcEntries.push({ key: 'tcoupl', value: types[tcoupl.value as number] ?? String(tcoupl.value) });
  }
  const tauT = getKVTValue(kvt, 'tau-t');
  if (tauT && (tauT.type === 'float' || tauT.type === 'double')) {
    tcEntries.push({ key: 'tau-t', value: `${(tauT.value as number).toFixed(2)} ps` });
  }
  const refT = getKVTValue(kvt, 'ref-t');
  if (refT && (refT.type === 'float' || refT.type === 'double')) {
    tcEntries.push({ key: 'ref-t', value: `${(refT.value as number).toFixed(1)} K` });
  }
  if (tcEntries.length > 0) {
    sections.push({ title: 'Temperature Coupling', entries: tcEntries });
  }

  // Pressure coupling
  const pcEntries: { key: string; value: string }[] = [];
  const pcoupl = getKVTValue(kvt, 'pcoupl');
  if (pcoupl && pcoupl.type === 'int32') {
    const types = ['no', 'berendsen', 'parrinello-rahman', 'mttk'];
    pcEntries.push({ key: 'pcoupl', value: types[pcoupl.value as number] ?? String(pcoupl.value) });
  }
  const tauP = getKVTValue(kvt, 'tau-p');
  if (tauP && (tauP.type === 'float' || tauP.type === 'double')) {
    pcEntries.push({ key: 'tau-p', value: `${(tauP.value as number).toFixed(2)} ps` });
  }
  const refP = getKVTValue(kvt, 'ref-p');
  if (refP && (refP.type === 'float' || refP.type === 'double')) {
    pcEntries.push({ key: 'ref-p', value: `${(refP.value as number).toFixed(1)} bar` });
  }
  const compressibility = getKVTValue(kvt, 'compressibility');
  if (compressibility && (compressibility.type === 'float' || compressibility.type === 'double')) {
    pcEntries.push({ key: 'compressibility', value: `${(compressibility.value as number).toExponential(2)} bar⁻¹` });
  }
  if (pcEntries.length > 0) {
    sections.push({ title: 'Pressure Coupling', entries: pcEntries });
  }

  // Constraints
  const constraintEntries: { key: string; value: string }[] = [];
  const constraints = getKVTValue(kvt, 'constraints');
  if (constraints && constraints.type === 'int32') {
    const types = ['none', 'h-bonds', 'all-bonds', 'h-angles', 'all-angles'];
    constraintEntries.push({ key: 'constraints', value: types[constraints.value as number] ?? String(constraints.value) });
  }
  const constraintAlgorithm = getKVTValue(kvt, 'constraint-algorithm');
  if (constraintAlgorithm && constraintAlgorithm.type === 'int32') {
    const types = ['LINCS', 'SHAKE'];
    constraintEntries.push({ key: 'constraint-algorithm', value: types[constraintAlgorithm.value as number] ?? String(constraintAlgorithm.value) });
  }
  if (constraintEntries.length > 0) {
    sections.push({ title: 'Constraints', entries: constraintEntries });
  }

  // Output control
  const outputEntries: { key: string; value: string }[] = [];
  const outputParams = ['nstxout', 'nstvout', 'nstfout', 'nstlog', 'nstcalcenergy', 'nstenergy', 'nstxout-compressed'];
  for (const param of outputParams) {
    const val = getKVTValue(kvt, param);
    if (val && (val.type === 'int32' || val.type === 'int64')) {
      const numVal = val.value as number;
      if (numVal > 0) {
        outputEntries.push({ key: param, value: numVal.toLocaleString() });
      }
    }
  }
  if (outputEntries.length > 0) {
    sections.push({ title: 'Output Control', entries: outputEntries });
  }

  return sections;
}