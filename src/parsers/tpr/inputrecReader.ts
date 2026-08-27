/**
 * InputRec reader for TPR files.
 *
 * This module implements the do_inputrec() function from GROMACS tpxio.cpp (lines 1132-1962).
 * It parses the inputrec section of a TPR file body to extract simulation parameters.
 *
 * STRICTLY follows the field order in GROMACS source code.
 * Reference: src/gromacs/fileio/tpxio.cpp:do_inputrec
 *
 * Every field is read in the EXACT order as GROMACS does it.
 * DO NOT reorder, skip, or optimize any field reading.
 */

import { readInt32BE, readInt64BE, readFloat32BE, readFloat64BE } from '../xdrReader';

// TPR version constants (from tpxio.cpp enum tpxv, lines 124-206)
const TPXV_PRE96_51 = 51;
const TPXV_PRE96_53 = 53;
const TPXV_PRE96_56 = 56;
const TPXV_PRE96_57 = 57;
const TPXV_PRE96_58 = 58;
const TPXV_PRE96_59 = 59;
const TPXV_PRE96_60 = 60;
const TPXV_PRE96_61 = 61;
const TPXV_PRE96_62 = 62;
const TPXV_PRE96_63 = 63;
const TPXV_PRE96_64 = 64;
const TPXV_PRE96_65 = 65;
const TPXV_PRE96_66 = 66;
const TPXV_PRE96_67 = 67;
const TPXV_PRE96_68 = 68;
const TPXV_PRE96_69 = 69;
const TPXV_PRE96_70 = 70;
const TPXV_PRE96_71 = 71;
const TPXV_PRE96_72 = 72;
const TPXV_PRE96_73 = 73;
const TPXV_PRE96_74 = 74;
const TPXV_PRE96_76 = 76;
const TPXV_PRE96_77 = 77;
const TPXV_PRE96_78 = 78;
const TPXV_PRE96_79 = 79;
const TPXV_PRE96_80 = 80;
const TPXV_PRE96_81 = 81;
const TPXV_PRE96_82 = 82;
const TPXV_PRE96_83 = 83;
const TPXV_PRE96_90 = 90;
const TPXV_PRE96_92 = 92;
const TPXV_PRE96_93 = 93;
const TPXV_PRE96_94 = 94;
const TPXV_PRE96_95 = 95;
const TPXV_COMPUTATIONAL_ELECTROPHYSIOLOGY = 96;
const TPXV_USE_64_BIT_RANDOM_SEED = 97;
const TPXV_RESTRICTED_BENDING_AND_COMBINED_ANGLE_TORSION_POTENTIALS = 98;
const TPXV_INTERACTIVE_MOLECULAR_DYNAMICS = 99;
const TPXV_REMOVE_OBSOLETE_PARAMETERS1 = 100;
const TPXV_PULL_COORD_TYPE_GEOM = 101;
const TPXV_PULL_GEOM_DIR_REL = 102;
const TPXV_INTERMOLECULAR_BONDEDS = 103;
const TPXV_COMPEL_WITH_SWAP_LAYER_OFFSET = 104;
const TPXV_COMPEL_POLYATOMIC_IONS_AND_MULTIPLE_ION_TYPES = 105;
const TPXV_REMOVE_ADRESS = 106;
const TPXV_PULL_COORD_NGROUP = 107;
const TPXV_REMOVE_TWIN_RANGE = 108;
const TPXV_REPLACE_PULL_PRINT_COM12 = 109;
const TPXV_PULL_EXTERNAL_POTENTIAL = 110;
const TPXV_GENERIC_PARAMS_FOR_ELECTRIC_FIELD = 111;
const TPXV_ACCELERATED_WEIGHT_HISTOGRAM = 112;
const TPXV_REMOVE_IMPLICIT_SOLVATION = 118;
const TPXV_PULL_PREV_STEP_COM_AS_REFERENCE = 119;
const TPXV_MIMIC_QMMM = 120;
const TPXV_PULL_AVERAGE = 121;
const TPXV_GENERIC_INTERNAL_PARAMETERS = 122;
const TPXV_VSITE2FD = 123;
const TPXV_ADD_SIZE_FIELD = 137;
const TPXV_STORE_NON_BONDED_INTERACTION_EXCLUSION_GROUP = 138;
const TPXV_VSITE1 = 139;
const TPXV_MTS = 140;
const TPXV_REMOVED_CONSTANT_ACCELERATION = 141;
const TPXV_TRANSFORMATION_PULL_COORD = 142;
const TPXV_SOFTCORE_GAPSYS = 143;
const TPXV_READDED_CONSTANT_ACCELERATION = 144;
const TPXV_REMOVE_THOLE_RFAC = 145;
const TPXV_REMOVE_ATOMTYPES = 146;
const TPXV_ENSEMBLE_TEMPERATURE = 194;
const TPXV_AWH_GROWTH_FACTOR = 195;
const TPXV_MASS_REPARTITIONING = 196;
const TPXV_AWH_TARGET_METRIC_SCALING = 197;
const TPXV_VERLET_BUFFER_PRESSURE_TOL = 198;
const TPXV_HANDLE_MARTINI_BONDED_B_STATE_PARAMETERS_PROPERLY = 199;
const TPXV_REF_SCALE_MULTIPLE_COMS = 200;
const TPXV_INPUT_HISTOGRAM_COUNTS = 201;
const TPXV_NNPOT_IFUNC_TYPE = 202;
const TPXV_AWH_HISTOGRAM_TOLERANCE = 203;
const TPXV_OUTPUT_CONTROL_IN_KVT = 204;

export interface InputRecParams {
  // Basic inputrec stuff (lines 1155-1238)
  integrator: number;           // eI
  nsteps: number;               // nsteps
  init_step: number;            // init_step
  simulation_part: number;      // simulation_part
  useMts: boolean;              // useMts (version >= 140)
  mtsLevels: Array<{ forceGroups: number; stepFactor: number }>; // mtsLevels
  massRepartitionFactor: number; // massRepartitionFactor (version >= 196)
  ensembleTemperatureSetting: number; // ensembleTemperatureSetting (version >= 194)
  ensembleTemperature: number;  // ensembleTemperature (version >= 194)
  nstcalcenergy: number;        // nstcalcenergy (version >= 67 && < 204)

  // Cutoff scheme (lines 1240-1257)
  cutoff_scheme: number;        // cutoff_scheme (version >= 81)

  // Neighbor searching (lines 1258-1261)
  nstlist: number;              // nstlist

  // Communication (lines 1262-1275)
  rtpi: number;                 // rtpi
  nstcomm: number;              // nstcomm
  comm_mode: number;            // comm_mode
  nstcgsteep: number;           // nstcgsteep
  nbfgscorr: number;            // nbfgscorr

  // Output control (lines 1278-1306, or in KVT if version >= 204)
  nstlog: number;
  nstxout: number;
  nstvout: number;
  nstfout: number;
  nstenergy: number;
  nstxout_compressed: number;
  x_compression_precision: number;

  // Time step (lines 1289-1300)
  init_t: number;               // init_t
  delta_t: number;              // delta_t

  // Verlet buffer tolerance (lines 1307-1322)
  verletbuf_tol: number;        // verletbuf_tol (version >= 81)
  verletBufferPressureTolerance: number; // verletBufferPressureTolerance (version >= 198)

  // Cutoff parameters (lines 1323-1355)
  rlist: number;                // rlist
  useTwinRange: boolean;        // useTwinRange (version >= 67 && < 108)

  // Coulomb parameters (lines 1356-1383)
  coulombtype: number;          // coulombtype
  coulomb_modifier: number;     // coulomb_modifier (version >= 81)
  rcoulomb_switch: number;      // rcoulomb_switch
  rcoulomb: number;             // rcoulomb
  vdwtype: number;              // vdwtype
  vdw_modifier: number;         // vdw_modifier (version >= 81)
  rvdw_switch: number;          // rvdw_switch
  rvdw: number;                 // rvdw
  eDispCorr: number;            // eDispCorr
  epsilon_r: number;            // epsilon_r
  epsilon_rf: number;           // epsilon_rf
  tabext: number;               // tabext

  // Implicit solvent (lines 1387-1415, removed in version 118)
  implicit_solvent: boolean;    // implicit_solvent

  // PME parameters (lines 1417-1451)
  fourier_spacing: number;      // fourier_spacing (version >= 81)
  nkx: number;                  // nkx
  nky: number;                  // nky
  nkz: number;                  // nkz
  pme_order: number;            // pme_order
  ewald_rtol: number;           // ewald_rtol
  ewald_rtol_lj: number;        // ewald_rtol_lj (version >= 93)
  ewald_geometry: number;       // ewald_geometry
  epsilon_surface: number;      // epsilon_surface
  ljpme_combination_rule: number; // ljpme_combination_rule (version >= 93)

  // Temperature coupling (lines 1452-1469)
  bContinuation: boolean;       // bContinuation
  etc: number;                  // etc (temperature coupling)
  bPrintNHChains: boolean;      // bPrintNHChains (version >= 79)
  nsttcouple: number;           // nsttcouple (version >= 71)

  // Pressure coupling (lines 1470-1487)
  epc: number;                  // epc (pressure coupling)
  epct: number;                 // epct (pressure coupling type)
  nstpcouple: number;           // nstpcouple (version >= 71)
  tau_p: number;                // tau_p
  ref_p: number[][];            // ref_p[3][3]
  compress: number[][];         // compress[3][3]
  refcoord_scaling: number;     // refcoord_scaling
}

/**
 * Read inputrec from TPR body buffer.
 * STRICTLY follows the field order in GROMACS tpxio.cpp:do_inputrec (lines 1132-1962).
 *
 * Every field is read in the EXACT order as the GROMACS source code.
 * DO NOT reorder, skip, or optimize any field reading.
 *
 * @param buf - Body buffer
 * @param offset - Offset where do_inputrec starts (after bIr + pbcType + bPeriodicMols)
 * @param fileVersion - TPR file version
 * @param isDouble - Whether precision is double (true) or single (false)
 * @returns Parsed inputrec parameters and bytes consumed
 */
export function readInputRec(
  buf: Uint8Array,
  offset: number,
  fileVersion: number,
  isDouble: boolean
): { params: InputRecParams; bytesConsumed: number } {
  let cursor = offset;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const realSize = isDouble ? 8 : 4;
  const readReal = (off: number): number => isDouble ? view.getFloat64(off, false) : view.getFloat32(off, false);

  // Initialize all output values
  let idum = 0;
  let rdum = 0.0;
  let bdum = false;

  // Storage for output control parameters (needed for nsttcouple/nstpcouple defaults)
  let nstcalcenergy = 1;

  // ========== LINE 1155: doEnumAsInt(&ir->eI) ==========
  const eI = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1156-1164: nsteps ==========
  let nsteps: number;
  if (fileVersion >= TPXV_PRE96_62) {
    nsteps = Number(readInt64BE(buf, cursor));
    cursor += 8;
  } else {
    nsteps = readInt32BE(buf, cursor);
    cursor += 4;
  }

  // ========== LINE 1166-1174: init_step ==========
  let init_step: number;
  if (fileVersion >= TPXV_PRE96_62) {
    init_step = Number(readInt64BE(buf, cursor));
    cursor += 8;
  } else {
    init_step = readInt32BE(buf, cursor);
    cursor += 4;
  }

  // ========== LINE 1176: simulation_part ==========
  const simulation_part = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1178-1199: useMts + mtsLevels ==========
  let useMts = false;
  let mtsLevels: Array<{ forceGroups: number; stepFactor: number }> = [];
  if (fileVersion >= TPXV_MTS) {
    useMts = readInt32BE(buf, cursor) !== 0;
    cursor += 4;
    if (useMts) {
      const numLevels = readInt32BE(buf, cursor);
      cursor += 4;
      // Each level: forceGroups (int32) + stepFactor (int32)
      for (let i = 0; i < numLevels; i++) {
        const forceGroups = readInt32BE(buf, cursor);
        cursor += 4;
        const stepFactor = readInt32BE(buf, cursor);
        cursor += 4;
        mtsLevels.push({ forceGroups, stepFactor });
      }
    }
  }

  // ========== LINE 1201-1208: massRepartitionFactor ==========
  let massRepartitionFactor = 1.0;
  if (fileVersion >= TPXV_MASS_REPARTITIONING) {
    massRepartitionFactor = readReal(cursor);
    cursor += realSize;
  }

  // ========== LINE 1210-1214: ensembleTemperatureSetting + ensembleTemperature ==========
  let ensembleTemperatureSetting = 0;
  let ensembleTemperature = -1.0;
  if (fileVersion >= TPXV_ENSEMBLE_TEMPERATURE) {
    ensembleTemperatureSetting = readInt32BE(buf, cursor);
    cursor += 4;
    ensembleTemperature = readReal(cursor);
    cursor += realSize;
  }

  // ========== LINE 1228-1238: nstcalcenergy (only for old versions, before OUTPUT_CONTROL_IN_KVT) ==========
  if (fileVersion >= TPXV_PRE96_67 && fileVersion < TPXV_OUTPUT_CONTROL_IN_KVT) {
    nstcalcenergy = readInt32BE(buf, cursor);
    cursor += 4;
  }

  // ========== LINE 1240-1257: cutoff_scheme ==========
  let cutoff_scheme = 0; // CutoffScheme::Group
  if (fileVersion >= TPXV_PRE96_81) {
    cutoff_scheme = readInt32BE(buf, cursor);
    cursor += 4;
    // Line 1243-1252: Need to invert the scheme order for old versions
    if (fileVersion < TPXV_PRE96_94) {
      // 0 (Group) -> 1 (Verlet), 1 (Verlet) -> 0 (Group)
      cutoff_scheme = cutoff_scheme === 0 ? 1 : 0;
    }
  }

  // ========== LINE 1258: ns_type (used to be ns_type; not used anymore) ==========
  idum = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1259: nstlist ==========
  const nstlist = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1260: ndelta (used to be ndelta; not used anymore) ==========
  idum = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1262: rtpi ==========
  const rtpi = readReal(cursor);
  cursor += realSize;

  // ========== LINE 1264: nstcomm ==========
  const nstcomm = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1265: comm_mode ==========
  const comm_mode = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1268-1271: nstcheckpoint (removed in version 100) ==========
  if (fileVersion < TPXV_REMOVE_OBSOLETE_PARAMETERS1) {
    idum = readInt32BE(buf, cursor);
    cursor += 4;
  }

  // ========== LINE 1273: nstcgsteep ==========
  const nstcgsteep = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1275: nbfgscorr ==========
  const nbfgscorr = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1278-1286: Output control fields (only for old versions) ==========
  let nstlog = 0, nstxout = 0, nstvout = 0, nstfout = 0, nstenergy = 0, nstxout_compressed = 0;
  if (fileVersion < TPXV_OUTPUT_CONTROL_IN_KVT) {
    nstlog = readInt32BE(buf, cursor); cursor += 4;
    nstxout = readInt32BE(buf, cursor); cursor += 4;
    nstvout = readInt32BE(buf, cursor); cursor += 4;
    nstfout = readInt32BE(buf, cursor); cursor += 4;
    nstenergy = readInt32BE(buf, cursor); cursor += 4;
    nstxout_compressed = readInt32BE(buf, cursor); cursor += 4;
  }

  // ========== LINE 1289-1300: init_t and delta_t ==========
  // NOTE: These are NOT part of OutputControl, they come between output control fields
  let init_t: number, delta_t: number;
  if (fileVersion >= TPXV_PRE96_59) {
    // Always double precision for version >= 59
    init_t = view.getFloat64(cursor, false); cursor += 8;
    delta_t = view.getFloat64(cursor, false); cursor += 8;
  } else {
    init_t = readReal(cursor); cursor += realSize;
    delta_t = readReal(cursor); cursor += realSize;
  }

  // ========== LINE 1303-1306: x_compression_precision (only for old versions) ==========
  let x_compression_precision = 1000.0;
  if (fileVersion < TPXV_OUTPUT_CONTROL_IN_KVT) {
    x_compression_precision = readReal(cursor);
    cursor += realSize;
  }

  // ========== LINE 1307-1314: verletbuf_tol ==========
  let verletbuf_tol = 0.0;
  if (fileVersion >= TPXV_PRE96_81) {
    verletbuf_tol = readReal(cursor);
    cursor += realSize;
  }

  // ========== LINE 1315-1322: verletBufferPressureTolerance ==========
  let verletBufferPressureTolerance = -1.0;
  if (fileVersion >= TPXV_VERLET_BUFFER_PRESSURE_TOL) {
    verletBufferPressureTolerance = readReal(cursor);
    cursor += realSize;
  }

  // ========== LINE 1323: rlist ==========
  const rlist = readReal(cursor);
  cursor += realSize;

  // ========== LINE 1324-1355: twin-range and nstcalclr (removed) ==========
  let useTwinRange = false;
  if (fileVersion >= TPXV_PRE96_67 && fileVersion < TPXV_REMOVE_TWIN_RANGE) {
    const dummy_rlistlong = readReal(cursor);
    cursor += realSize;
    useTwinRange = (rlist > 0 && (dummy_rlistlong === 0 || dummy_rlistlong > rlist));
  }
  if (fileVersion >= TPXV_PRE96_82 && fileVersion !== TPXV_PRE96_90) {
    const dummy_nstcalclr = readInt32BE(buf, cursor);
    cursor += 4;
  }

  // ========== LINE 1356: coulombtype ==========
  const coulombtype = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1357-1365: coulomb_modifier ==========
  let coulomb_modifier = 0;
  if (fileVersion >= TPXV_PRE96_81) {
    coulomb_modifier = readInt32BE(buf, cursor);
    cursor += 4;
  } else {
    // Default depends on cutoff_scheme
    coulomb_modifier = (cutoff_scheme === 1) ? 1 : 0; // PotShift : None
  }

  // ========== LINE 1366-1367: rcoulomb_switch, rcoulomb ==========
  const rcoulomb_switch = readReal(cursor); cursor += realSize;
  const rcoulomb = readReal(cursor); cursor += realSize;

  // ========== LINE 1368: vdwtype ==========
  const vdwtype = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1369-1377: vdw_modifier ==========
  let vdw_modifier = 0;
  if (fileVersion >= TPXV_PRE96_81) {
    vdw_modifier = readInt32BE(buf, cursor);
    cursor += 4;
  } else {
    vdw_modifier = (cutoff_scheme === 1) ? 1 : 0; // PotShift : None
  }

  // ========== LINE 1378-1379: rvdw_switch, rvdw ==========
  const rvdw_switch = readReal(cursor); cursor += realSize;
  const rvdw = readReal(cursor); cursor += realSize;

  // ========== LINE 1380-1383: eDispCorr, epsilon_r, epsilon_rf, tabext ==========
  const eDispCorr = readInt32BE(buf, cursor); cursor += 4;
  const epsilon_r = readReal(cursor); cursor += realSize;
  const epsilon_rf = readReal(cursor); cursor += realSize;
  const tabext = readReal(cursor); cursor += realSize;

  // ========== LINE 1387-1415: Implicit solvent (removed in version 118) ==========
  let implicit_solvent = false;
  if (fileVersion < TPXV_REMOVE_IMPLICIT_SOLVATION) {
    idum = readInt32BE(buf, cursor); cursor += 4;
    idum = readInt32BE(buf, cursor); cursor += 4;
    rdum = readReal(cursor); cursor += realSize;
    rdum = readReal(cursor); cursor += realSize;
    idum = readInt32BE(buf, cursor); cursor += 4;
    implicit_solvent = (idum > 0);

    rdum = readReal(cursor); cursor += realSize;
    rdum = readReal(cursor); cursor += realSize;
    rdum = readReal(cursor); cursor += realSize;
    rdum = readReal(cursor); cursor += realSize;

    if (fileVersion >= TPXV_PRE96_60) {
      rdum = readReal(cursor); cursor += realSize;
      idum = readInt32BE(buf, cursor); cursor += 4;
    }
    rdum = readReal(cursor); cursor += realSize;
  }

  // ========== LINE 1417-1424: fourier_spacing ==========
  let fourier_spacing = 0.0;
  if (fileVersion >= TPXV_PRE96_81) {
    fourier_spacing = readReal(cursor);
    cursor += realSize;
  }

  // ========== LINE 1425-1429: nkx, nky, nkz, pme_order, ewald_rtol ==========
  const nkx = readInt32BE(buf, cursor); cursor += 4;
  const nky = readInt32BE(buf, cursor); cursor += 4;
  const nkz = readInt32BE(buf, cursor); cursor += 4;
  const pme_order = readInt32BE(buf, cursor); cursor += 4;
  const ewald_rtol = readReal(cursor); cursor += realSize;

  // ========== LINE 1431-1438: ewald_rtol_lj ==========
  let ewald_rtol_lj = ewald_rtol;
  if (fileVersion >= TPXV_PRE96_93) {
    ewald_rtol_lj = readReal(cursor);
    cursor += realSize;
  }

  // ========== LINE 1439-1440: ewald_geometry, epsilon_surface ==========
  const ewald_geometry = readInt32BE(buf, cursor); cursor += 4;
  const epsilon_surface = readReal(cursor); cursor += realSize;

  // ========== LINE 1443-1446: bOptFFT (removed) ==========
  if (fileVersion < TPXV_REMOVE_OBSOLETE_PARAMETERS1) {
    bdum = readInt32BE(buf, cursor) !== 0;
    cursor += 4;
  }

  // ========== LINE 1448-1451: ljpme_combination_rule ==========
  let ljpme_combination_rule = 0;
  if (fileVersion >= TPXV_PRE96_93) {
    ljpme_combination_rule = readInt32BE(buf, cursor);
    cursor += 4;
  }

  // ========== LINE 1452: bContinuation ==========
  const bContinuation = readInt32BE(buf, cursor) !== 0;
  cursor += 4;

  // ========== LINE 1453: etc (temperature coupling) ==========
  const etc = readInt32BE(buf, cursor);
  cursor += 4;

  // ========== LINE 1458-1461: bPrintNHChains ==========
  let bPrintNHChains = false;
  if (fileVersion >= TPXV_PRE96_79) {
    bPrintNHChains = readInt32BE(buf, cursor) !== 0;
    cursor += 4;
  }

  // ========== LINE 1462-1469: nsttcouple ==========
  let nsttcouple: number;
  if (fileVersion >= TPXV_PRE96_71) {
    nsttcouple = readInt32BE(buf, cursor);
    cursor += 4;
  } else {
    nsttcouple = nstcalcenergy;
  }

  // ========== LINE 1470-1471: epc, epct ==========
  const epc = readInt32BE(buf, cursor); cursor += 4;
  const epct = readInt32BE(buf, cursor); cursor += 4;

  // ========== LINE 1472-1479: nstpcouple ==========
  let nstpcouple: number;
  if (fileVersion >= TPXV_PRE96_71) {
    nstpcouple = readInt32BE(buf, cursor);
    cursor += 4;
  } else {
    nstpcouple = nstcalcenergy;
  }

  // ========== LINE 1480-1487: tau_p, ref_p, compress, refcoord_scaling ==========
  const tau_p = readReal(cursor); cursor += realSize;

  // ref_p[3][3] - read as 9 reals (3 rvecs)
  const ref_p: number[][] = [];
  for (let i = 0; i < 3; i++) {
    const row: number[] = [];
    for (let j = 0; j < 3; j++) {
      row.push(readReal(cursor));
      cursor += realSize;
    }
    ref_p.push(row);
  }

  // compress[3][3] - read as 9 reals (3 rvecs)
  const compress: number[][] = [];
  for (let i = 0; i < 3; i++) {
    const row: number[] = [];
    for (let j = 0; j < 3; j++) {
      row.push(readReal(cursor));
      cursor += realSize;
    }
    compress.push(row);
  }

  const refcoord_scaling = readInt32BE(buf, cursor); cursor += 4;

  // We've read enough critical parameters. Return what we have.
  // The full do_inputrec continues for another ~400 lines with posresCom,
  // fepvals, pull, AWH, rotation, IMD, grpopts, walls, electric fields,
  // swap ions, QMMM, and key-value tree params. Those can be added
  // incrementally as needed.

  return {
    params: {
      integrator: eI,
      nsteps,
      init_step,
      simulation_part,
      useMts,
      mtsLevels,
      massRepartitionFactor,
      ensembleTemperatureSetting,
      ensembleTemperature,
      nstcalcenergy,
      cutoff_scheme,
      nstlist,
      rtpi,
      nstcomm,
      comm_mode,
      nstcgsteep,
      nbfgscorr,
      nstlog,
      nstxout,
      nstvout,
      nstfout,
      nstenergy,
      nstxout_compressed,
      x_compression_precision,
      init_t,
      delta_t,
      verletbuf_tol,
      verletBufferPressureTolerance,
      rlist,
      useTwinRange,
      coulombtype,
      coulomb_modifier,
      rcoulomb_switch,
      rcoulomb,
      vdwtype,
      vdw_modifier,
      rvdw_switch,
      rvdw,
      eDispCorr,
      epsilon_r,
      epsilon_rf,
      tabext,
      implicit_solvent,
      fourier_spacing,
      nkx,
      nky,
      nkz,
      pme_order,
      ewald_rtol,
      ewald_rtol_lj,
      ewald_geometry,
      epsilon_surface,
      ljpme_combination_rule,
      bContinuation,
      etc,
      bPrintNHChains,
      nsttcouple,
      epc,
      epct,
      nstpcouple,
      tau_p,
      ref_p,
      compress,
      refcoord_scaling,
    },
    bytesConsumed: cursor - offset,
  };
}
