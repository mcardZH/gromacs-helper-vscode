import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EdrFileInfo, EnergyTermStats } from '../gromacsFileTypes';
import { readInt32BE, readFloat64BE, readFloat32BE, readXdrString } from '../xdrReader';

/**
 * Parse an EDR (GROMACS Energy) file.
 *
 * Layout (XDR = big-endian), see `src/gromacs/fileio/enxio.cpp`:
 *
 *   ## Names block (do_enxnms_count + readEnxNames) ##
 *   magic          : int32   (-55555)
 *   version        : int32   (5 = current enx_version)
 *   nre            : int32   (number of energy terms)
 *   For each term:
 *     name         : XDR length-prefixed string (standard xdr_string)
 *     unit         : XDR length-prefixed string (only if version >= 2)
 *
 *   ## Repeated for each frame (do_eheader + do_enx body) ##
 *   first_real     : float (4 if single, 8 if double) — writer writes
 *                    -2e10 for v1 compat; the value is not used by the
 *                    summary parser.
 *   magic          : int32   (-7777777)
 *   version        : int32
 *   t              : float64
 *   step           : int64
 *   nsum           : int32
 *   [nsteps        : int64   if version >= 3]
 *   [dt            : float64 if version >= 5]
 *   nre            : int32
 *   [reserved      : int32   if version >= 4]
 *   nblock         : int32
 *   --- For each block: block_id (int32), nsub (int32),
 *                       for each sub: type (int32), nr (int32)
 *                       (block headers only — no data yet) ---
 *   e_size         : int32   (size in bytes of the energy payload:
 *                              nre*16 = single, nre*32 = double)
 *   reserved       : int32   (always 0)
 *   reserved       : int32   (always 0)
 *   --- Body (read by do_enx) ---
 *   primary reals  : nre values, real-sized (4 bytes if single, 8 if double)
 *   --- For each block: for each subblock: nr values of `type` ---
 *
 * The summary parser walks frame-by-frame. After reading every
 * CHUNK_SIZE frames it yields to the event loop, fires `onProgress`,
 * and (if provided) `onStatsUpdate` with the current per-term stats
 * so the UI can render incrementally.
 */

const XDR_FLOAT = 1;
const XDR_DOUBLE = 6;

function elemSize(type: number): number {
  switch (type) {
    case XDR_DOUBLE:
      return 8;
    case XDR_FLOAT:
      return 4;
    default:
      return 0;
  }
}

export interface EdrParseProgress {
  bytesRead: number;
  totalBytes: number;
  framesParsed: number;
}

export interface EdrParseOptions {
  /** Called every CHUNK_SIZE frames with progress info. */
  onProgress?: (p: EdrParseProgress) => void;
  /** Called every CHUNK_SIZE frames with the latest per-term stats and current time range. */
  onStatsUpdate?: (stats: EnergyTermStats[], context: { currentFrameCount: number; currentTimeEnd: number; deltaTime: number }) => void;
  /** Cancel flag — set to true to abort the parse early. */
  signal?: { aborted: boolean };
}

const CHUNK_SIZE = 200; // frames per chunk
const SPARK_SIZE = 64; // sparkline downsample target

/**
 * Read just the names block of the EDR file (fast, sub-millisecond
 * for files with < 200 terms). Lets the UI render the term list and
 * start the frame walk in the background.
 */
export interface EdrNames {
  version: string;
  termNames: string[];
  termUnits: string[];
  fileSize: number;
  /**
   * Best-effort estimates derived from reading the last frame in the
   * file (the names block is at the head, so the last frame gives us
   * `tEnd` and `dt` without having to walk every frame). For
   * non-uniform-Δt EDRs these are still useful as the panel's initial
   * "loading" view; the streaming walk refines them.
   */
  tStart: number;
  tEnd: number;
  frameCount: number;
  deltaTime: number;
}

const TAIL_PROBE_BYTES = 1024 * 1024; // 1 MiB

/**
 * Read the last frame's header from the tail of an EDR file to derive
 * `tEnd`, `dt`, and an initial `frameCount` estimate. Returns zeros if
 * the tail probe can't find a frame header.
 */
async function readEdrTailFrame(
  fileHandle: fs.promises.FileHandle,
  fileSize: number,
): Promise<{ tEnd: number; deltaTime: number; frameCount: number }> {
  if (fileSize <= 8) {
    return { tEnd: 0, deltaTime: 0, frameCount: 0 };
  }
  const tailSize = Math.min(TAIL_PROBE_BYTES, fileSize);
  const tailBuf = Buffer.alloc(tailSize);
  const tailRead = (await fileHandle.read(
    tailBuf, 0, tailSize, fileSize - tailSize,
  )).bytesRead;
  const tailView = new DataView(tailBuf.buffer, tailBuf.byteOffset, tailRead);

  // First decide precision from the first_real field at the file
  // tail. A single-precision -2e10 is 4 bytes; a double-precision
  // -2e10 is 8 bytes. We probe both possibilities by scanning
  // backwards for the -7777777 magic.
  // The frame header (single precision) is 72 bytes. The first_real
  // field is 4 bytes, so the magic sits at byte +4. In double
  // precision the header is 76 bytes and the magic is at +8.
  // We need a contiguous 76-byte window; the 1 MiB probe gives us
  // plenty.
  const magic = -7777777;
  let lastMagicAt = -1;
  for (let off = tailRead - 4; off >= 0; off -= 4) {
    const v = tailView.getInt32(off, false);
    if (v === magic) {
      lastMagicAt = off;
      break;
    }
  }
  // The first 4 bytes of every frame body are the `first_real_to_check`
  // marker (-2e10 as float32 = 0xCB000000, or 0xC0BFCD36 as the high
  // 4 bytes of a float64). We try both single and double precision
  // layouts and pick the one whose `t` field reads as a plausible
  // simulation time (positive, finite, < 1e9 ps).
  //
  // Layout for a v5 frame: first_real(4|8) + magic(4) + version(4) +
  // t(8) + step(8) + nsum(4) + nsteps(8) + dt(8) + nre(4) + reserved(4)
  // + nblock(4) + e_size(4) + dum(4) + dum(4) = 72 (single) or 76 (double).
  // Empirical offsets (verified against real GROMACS files):
  //   t       at first_real + 12  (8 bytes, float64)
  //   step    at first_real + 20  (8 bytes, int64)
  //   nsum    at first_real + 28  (4 bytes, int32)
  //   nsteps  at first_real + 32  (8 bytes, int64)
  //   dt      at first_real + 40  (8 bytes, float64)
  //   nre     at first_real + 48  (4 bytes, int32)
  //   e_size  at first_real + 56  (4 bytes, int32)
  if (lastMagicAt < 0 || lastMagicAt + 76 > tailRead) {
    return { tEnd: 0, deltaTime: 0, frameCount: 0 };
  }
  // The GROMACS `dt` field in the EDR is the MD integration
  // timestep, not the per-frame output interval. The latter is
  // dt × nstenergy (e.g. 0.002 × 5000 = 10 ps). We can't infer nstenergy
  // from a single frame, so we read TWO frames from the tail: the
  // last frame gives tEnd, the second-to-last gives tEnd-dt, and the
  // difference is the true per-frame interval.
  const last = readFrameHeader(lastMagicAt);
  if (!last) { return { tEnd: 0, deltaTime: 0, frameCount: 0 }; }
  let perFrameDt = 0;
  // Look for the previous -7777777 magic before the last one. The
  // previous frame's `t` is smaller than the last's, so we compute
  // perFrameDt = last.tEnd - prev.tEnd.
  for (let off = lastMagicAt - 4; off >= 0; off -= 4) {
    if (tailView.getInt32(off, false) === -7777777) {
      const prev = readFrameHeader(off);
      if (prev && last.tEnd > prev.tEnd) {
        perFrameDt = last.tEnd - prev.tEnd;
      }
      break;
    }
  }
  const tEnd = last.tEnd;
  // Estimate frameCount from tEnd / perFrameDt. For typical EDRs
  // (uniform-Δt outputs starting at t=0) this matches the true count.
  const frameCount = perFrameDt > 0
    ? Math.floor(tEnd / perFrameDt) + 1
    : 0;
  return { tEnd, deltaTime: perFrameDt, frameCount };

  function readFrameHeader(magicAt: number): {
    tEnd: number;
    nre: number;
  } | null {
    for (const firstRealSize of [4, 8]) {
      const firstRealStart = magicAt - firstRealSize;
      const tOff = firstRealStart + 12;
      if (tOff + 8 > tailRead) { continue; }
      const candidateT = tailView.getFloat64(tOff, false);
      if (!Number.isFinite(candidateT) || candidateT <= 0 || candidateT > 1e9) {
        continue;
      }
      const nreOff = firstRealStart + 48;
      if (nreOff + 4 > tailRead) { return null; }
      const nre = tailView.getInt32(nreOff, false);
      return { tEnd: candidateT, nre };
    }
    return null;
  }
}

export async function parseEdrNames(uri: vscode.Uri): Promise<EdrNames> {
  const stat = await fs.promises.stat(uri.fsPath);
  const fileSize = stat.size;
  const fileHandle = await fs.promises.open(uri.fsPath, 'r');
  try {
    // Read the names block. Its size depends on the number of terms
    // (typically ~30 bytes/term — 8 KB handles ~270 terms). For files
    // with hundreds of terms (e.g. residue-level EDRs with nre ~ 500)
    // we read in 8 KB chunks and grow until the names block is fully
    // present, with a hard cap of 256 KB to avoid runaway memory on
    // corrupt files.
    const fileVersion0 = 0;
    const MAX_NAMES_BYTES = 256 * 1024;
    const chunks: Buffer[] = [];
    let total = 0;
    let cursor = 0;
    let fileVersion = fileVersion0;
    let nre = 0;
    let nreReady = false;
    while (total < MAX_NAMES_BYTES) {
      const want = Math.min(8192, fileSize - total);
      if (want <= 0) break;
      const chunk = Buffer.alloc(want);
      const r = (await fileHandle.read(chunk, 0, want, total)).bytesRead;
      if (r === 0) break;
      chunks.push(chunk.subarray(0, r));
      total += r;
      const merged = Buffer.concat(chunks, total);
      // Parse magic + version + nre.
      cursor = 0;
      const magic = readInt32BE(merged, cursor); cursor += 4;
      if (magic > 0) {
        throw new Error(`EDR appears to be in pre-v2 format (nre=${magic}); not supported`);
      }
      if (magic !== -55555) {
        throw new Error(`Not an EDR file: expected names magic -55555, got ${magic}`);
      }
      fileVersion = readInt32BE(merged, cursor); cursor += 4;
      nre = readInt32BE(merged, cursor); cursor += 4;
      nreReady = true;
      // Walk the term names + units to see if we have them all.
      const termNames: string[] = [];
      const termUnits: string[] = [];
      let parsedAll = true;
      for (let i = 0; i < nre; i++) {
        if (cursor + 4 > total) { parsedAll = false; break; }
        const nameLen = readInt32BE(merged, cursor);
        if (nameLen < 0 || nameLen > 4096) { parsedAll = false; break; }
        if (cursor + 4 + nameLen > total) { parsedAll = false; break; }
        const name = new TextDecoder('utf-8').decode(merged.subarray(cursor + 4, cursor + 4 + nameLen));
        cursor += 4 + Math.ceil(nameLen / 4) * 4;
        termNames.push(name);
        let unit = 'kJ/mol';
        if (fileVersion >= 2) {
          if (cursor + 4 > total) { parsedAll = false; break; }
          const unitLen = readInt32BE(merged, cursor);
          if (unitLen < 0 || unitLen > 4096) { parsedAll = false; break; }
          if (cursor + 4 + unitLen > total) { parsedAll = false; break; }
          unit = new TextDecoder('utf-8').decode(merged.subarray(cursor + 4, cursor + 4 + unitLen));
          cursor += 4 + Math.ceil(unitLen / 4) * 4;
        }
        termUnits.push(unit);
      }
      if (parsedAll) {
        // Tail probe for tEnd/dt/frameCount.
        const tail = await readEdrTailFrame(fileHandle, fileSize);
        return {
          version: String(fileVersion),
          termNames,
          termUnits,
          fileSize,
          tStart: 0,
          tEnd: tail.tEnd,
          frameCount: tail.frameCount,
          deltaTime: tail.deltaTime,
        };
      }
      // Need more data.
      if (total >= fileSize) break;
    }
    throw new Error(
      `EDR names block too large (>${MAX_NAMES_BYTES} bytes); file may be corrupt`,
    );
  } finally {
    await fileHandle.close();
  }
}

export async function parseEdr(
  uri: vscode.Uri,
  options: EdrParseOptions = {},
): Promise<EdrFileInfo> {
  const { onProgress, onStatsUpdate, signal } = options;
  const stat = await fs.promises.stat(uri.fsPath);
  const filename = path.basename(uri.fsPath);
  const fileSize = stat.size;

  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    fileHandle = await fs.promises.open(uri.fsPath, 'r');

    // ── Phase 1: names block ──────────────────────────────────────────
    // The names block is small for typical EDRs but can be much
    // larger for residue-level EDRs (nre ~ 500 terms, ~30 bytes
    // each). We read in 8 KB chunks and grow until the names block
    // is fully present, with a hard cap of 256 KB.
    const MAX_NAMES_BYTES = 256 * 1024;
    const chunks: Buffer[] = [];
    let total = 0;
    let fileVersion = 0;
    let nre = 0;
    let cursor = 0;
    const termNames: string[] = [];
    const termUnits: string[] = [];
    while (total < MAX_NAMES_BYTES) {
      const want = Math.min(8192, fileSize - total);
      if (want <= 0) { break; }
      const chunk = Buffer.alloc(want);
      const r = (await fileHandle.read(chunk, 0, want, total)).bytesRead;
      if (r === 0) { break; }
      chunks.push(chunk.subarray(0, r));
      total += r;
      const merged = Buffer.concat(chunks, total);
      cursor = 0;
      const magic = readInt32BE(merged, cursor); cursor += 4;
      if (magic > 0) {
        throw new Error(`EDR appears to be in pre-v2 format (nre=${magic}); not supported`);
      }
      if (magic !== -55555) {
        throw new Error(`Not an EDR file: expected names magic -55555, got ${magic}`);
      }
      fileVersion = readInt32BE(merged, cursor); cursor += 4;
      nre = readInt32BE(merged, cursor); cursor += 4;
      termNames.length = 0;
      termUnits.length = 0;
      let parsedAll = true;
      for (let i = 0; i < nre; i++) {
        if (cursor + 4 > total) { parsedAll = false; break; }
        const nameLen = readInt32BE(merged, cursor);
        if (nameLen < 0 || nameLen > 4096) { parsedAll = false; break; }
        if (cursor + 4 + nameLen > total) { parsedAll = false; break; }
        const name = new TextDecoder('utf-8').decode(
          merged.subarray(cursor + 4, cursor + 4 + nameLen),
        );
        cursor += 4 + Math.ceil(nameLen / 4) * 4;
        let unit = 'kJ/mol';
        if (fileVersion >= 2) {
          if (cursor + 4 > total) { parsedAll = false; break; }
          const unitLen = readInt32BE(merged, cursor);
          if (unitLen < 0 || unitLen > 4096) { parsedAll = false; break; }
          if (cursor + 4 + unitLen > total) { parsedAll = false; break; }
          unit = new TextDecoder('utf-8').decode(
            merged.subarray(cursor + 4, cursor + 4 + unitLen),
          );
          cursor += 4 + Math.ceil(unitLen / 4) * 4;
        }
        termNames.push(name);
        termUnits.push(unit);
      }
      if (parsedAll) break;
      if (total >= fileSize) break;
    }
    if (cursor === 0 || termNames.length === 0) {
      throw new Error(`EDR names block too large (>${MAX_NAMES_BYTES} bytes); file may be corrupt`);
    }
    const namesBlockEnd = cursor;

    // ── Phase 2: probe precision + per-frame body width ───────────────
    const probe = Buffer.alloc(96);
    const probeRead = (await fileHandle.read(
      probe, 0, probe.length, namesBlockEnd,
    )).bytesRead;
    if (probeRead < 12) {
      throw new Error('EDR file is truncated before the first frame');
    }
    const probeBuf = new Uint8Array(probe.buffer, probe.byteOffset, probeRead);
    // Quick sanity: the magic must be -7777777 at offset 4 (single) or 8 (double).
    const magicProbeSingle = readInt32BE(probeBuf, 4);
    const magicProbeDouble = readInt32BE(probeBuf, 8);
    const isSingle = magicProbeSingle === -7777777;
    const isDouble = magicProbeDouble === -7777777;
    if (!isSingle && !isDouble) {
      throw new Error(
        `EDR: no frame magic found at start of first frame (got ${magicProbeSingle} / ${magicProbeDouble})`,
      );
    }
    const firstRealSize = isSingle ? 4 : 8;
    const headerSize = isSingle ? 72 : 76;
    const eSize = readInt32BE(probeBuf, headerSize - 12);
    const realSize = eSize / nre === 16 ? 4 : 8;

    // Some GROMACS builds write 3 reals per term (e + sumSqDev + esum)
    // for every frame after the initial one, even when nsum=1. Detect
    // this by reading the first two frame magics and measuring the
    // distance between them.
    const firstFrameEnd = namesBlockEnd + headerSize;
    const probe2 = Buffer.alloc(nre * 4 * realSize + 8192);
    const probe2Read = (await fileHandle.read(
      probe2, 0, probe2.length, firstFrameEnd,
    )).bytesRead;
    let realsPerTermFirst = 1;
    let realsPerTermRest = 1;
    if (probe2Read >= firstRealSize + 4) {
      const p2 = new Uint8Array(probe2.buffer, probe2.byteOffset, probe2Read);
      let frame1Start = -1;
      for (let i = 0; i + firstRealSize + 4 <= probe2Read; i += 4) {
        if (readInt32BE(p2, i + firstRealSize) === -7777777) {
          frame1Start = i;
          break;
        }
      }
      if (frame1Start > 0) {
        const frame0Body = frame1Start;
        if (frame0Body > 0 && frame0Body % nre === 0) {
          realsPerTermFirst = frame0Body / (realSize * nre);
        }
        const searchFrom = frame1Start + firstRealSize + 4;
        let frame2Start = -1;
        for (let i = searchFrom; i + firstRealSize + 4 <= probe2Read; i += 4) {
          if (readInt32BE(p2, i + firstRealSize) === -7777777) {
            frame2Start = i;
            break;
          }
        }
        if (frame2Start > frame1Start) {
          const frame1Body = frame2Start - frame1Start - headerSize;
          if (frame1Body > 0 && frame1Body % nre === 0) {
            realsPerTermRest = frame1Body / (realSize * nre);
          }
        }
      }
    }
    const bodyStrideFirst = realsPerTermFirst * realSize;
    const bodyStrideRest = realsPerTermRest * realSize;

    // ── Phase 3: walk frames ───────────────────────────────────────────
    // Per-term accumulators: each term stores the full series and
    // running min/max/mean/std over that series.
    const SAMPLES_TARGET = Infinity; // No downsampling, keep all frames
    const termSeries: number[][] = termNames.map(() => []);
    const termMin: number[] = new Array(nre).fill(Infinity);
    const termMax: number[] = new Array(nre).fill(-Infinity);
    const termSum: number[] = new Array(nre).fill(0);
    const termCount: number[] = new Array(nre).fill(0);

    let frameCount = 0;
    let firstTime: number | null = null;
    let prevTime: number | null = null;
    let deltaTime = 0;
    let offset = namesBlockEnd;
    const frameBuf = Buffer.alloc(96);
    const realBuf = Buffer.alloc(realSize);

    while (offset < fileSize) {
      if (signal?.aborted) {
        break;
      }
      // Read enough bytes for a full frame header.
      const want = Math.min(frameBuf.length, fileSize - offset);
      if (want < headerSize) {
        break;
      }
      const { bytesRead: hdrRead } = await fileHandle.read(frameBuf, 0, want, offset);
      if (hdrRead < headerSize) {
        break;
      }
      const fbuf = new Uint8Array(frameBuf.buffer, frameBuf.byteOffset, hdrRead);

      const frameMagic = readInt32BE(fbuf, firstRealSize);
      if (frameMagic !== -7777777) {
        break;
      }

      let p = firstRealSize + 4;
      const fversion = readInt32BE(fbuf, p); p += 4;
      const t = readFloat64BE(fbuf, p); p += 8;
      p += 8; // step (int64)
      p += 4; // nsum (int32)
      if (fversion >= 3) { p += 8; }
      if (fversion >= 5) { p += 8; }
      const frameNre = readInt32BE(fbuf, p); p += 4;
      if (fversion >= 4) { p += 4; }
      const nblock = readInt32BE(fbuf, p); p += 4;
      p += 12; // e_size + 2 dummies

      if (firstTime === null) { firstTime = t; }
      if (prevTime !== null && deltaTime === 0) {
        const cand = t - prevTime;
        if (Number.isFinite(cand) && cand > 0) { deltaTime = cand; }
      }
      prevTime = t;

      let bodyOffset = offset + p;

      if (nblock > 0) {
        let pp = p;
        const probeEnd = hdrRead;
        for (let b = 0; b < nblock && pp + 8 <= probeEnd; b++) {
          pp += 8; // block_id, nsub
          const nsub = readInt32BE(fbuf, pp - 4);
          for (let s = 0; s < nsub && pp + 8 <= probeEnd; s++) {
            pp += 8; // type, nr
          }
        }
        if (pp > probeEnd) {
          const bigBuf = Buffer.alloc(1024);
          const { bytesRead: br } = await fileHandle.read(
            bigBuf, 0, bigBuf.length, offset + p,
          );
          let pp2 = 0;
          for (let b = 0; b < nblock && pp2 + 8 <= br; b++) {
            pp2 += 8;
            const nsub = readInt32BE(bigBuf, pp2 - 4);
            for (let s = 0; s < nsub && pp2 + 8 <= br; s++) {
              pp2 += 8;
            }
          }
          bodyOffset = offset + p + pp2;
        } else {
          bodyOffset = offset + pp;
        }
      }

      // Read the nre primary reals.
      const stride = frameCount === 0 ? bodyStrideFirst : bodyStrideRest;
      const values = new Array<number>(frameNre);
      for (let i = 0; i < frameNre; i++) {
        const { bytesRead: rr } = await fileHandle.read(
          realBuf, 0, realSize, bodyOffset,
        );
        if (rr < realSize) {
          offset = fileSize;
          break;
        }
        const rbuf = new Uint8Array(realBuf.buffer, realBuf.byteOffset, rr);
        values[i] = realSize === 4 ? readFloat32BE(rbuf, 0) : readFloat64BE(rbuf, 0);
        bodyOffset += stride;
      }
      if (offset >= fileSize) { break; }

      if (nblock > 0) {
        const headersBuf = Buffer.alloc(8);
        for (let b = 0; b < nblock; b++) {
          const { bytesRead: br } = await fileHandle.read(headersBuf, 0, 8, bodyOffset);
          if (br < 8) {
            offset = fileSize;
            break;
          }
          const hb = new Uint8Array(headersBuf.buffer, headersBuf.byteOffset, br);
          const nsub = readInt32BE(hb, 4);
          bodyOffset += 8;
          for (let s = 0; s < nsub; s++) {
            const subHeader = Buffer.alloc(8);
            const { bytesRead: shr } = await fileHandle.read(subHeader, 0, 8, bodyOffset);
            if (shr < 8) {
              offset = fileSize;
              break;
            }
            const shb = new Uint8Array(subHeader.buffer, subHeader.byteOffset, shr);
            const nr = readInt32BE(shb, 0);
            const type = readInt32BE(shb, 4);
            bodyOffset += 8 + nr * elemSize(type);
          }
        }
      }

      // Store every frame's values and update running stats.
      frameCount++;
      for (let i = 0; i < frameNre && i < termSeries.length; i++) {
        const series = termSeries[i];
        series.push(values[i]);
        // Update running stats incrementally.
        const v = values[i];
        if (Number.isFinite(v)) {
          if (v < termMin[i]) { termMin[i] = v; }
          if (v > termMax[i]) { termMax[i] = v; }
          termSum[i] += v;
          termCount[i]++;
        }
      }

      offset = bodyOffset;

      // Periodically notify the caller and yield to the event loop.
      if (frameCount % CHUNK_SIZE === 0) {
        if (onProgress) {
          onProgress({ bytesRead: offset, totalBytes: fileSize, framesParsed: frameCount });
        }
        if (onStatsUpdate) {
          const currentTimeEnd = prevTime !== null ? prevTime : (firstTime ?? 0);
          const currentDeltaTime = frameCount > 1 && firstTime !== null && prevTime !== null
            ? (prevTime - firstTime) / (frameCount - 1)
            : 0;
          onStatsUpdate(
            buildTermStats(termNames, termUnits, termSeries, termMin, termMax, termSum, termCount),
            { currentFrameCount: frameCount, currentTimeEnd, deltaTime: currentDeltaTime }
          );
        }
        // Yield to the event loop so the UI can render updates.
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    if (deltaTime === 0 && frameCount > 1 && firstTime !== null && prevTime !== null) {
      deltaTime = (prevTime - firstTime) / (frameCount - 1);
    }

    const termStats = buildTermStats(termNames, termUnits, termSeries, termMin, termMax, termSum, termCount);

    // Final progress notification so the bar reaches 100% in the UI.
    if (onProgress) {
      onProgress({ bytesRead: offset, totalBytes: fileSize, framesParsed: frameCount });
    }

    return {
      format: 'edr',
      filename,
      filePath: uri.fsPath,
      fileSize,
      magic: -55555,
      magicDisplay: '-55555',
      encoding: 'XDR',
      endianness: 'big-endian',
      version: String(fileVersion),
      frameCount,
      termCount: termNames.length,
      termNames,
      termStats,
      timeOffset: firstTime ?? 0,
      deltaTime,
    };
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}

/**
 * Build per-term stats from the accumulated series.
 */
function buildTermStats(
  termNames: string[],
  termUnits: string[],
  termSeries: number[][],
  termMin: number[],
  termMax: number[],
  termSum: number[],
  termCount: number[],
): EnergyTermStats[] {
  return termNames.map((name, idx) => {
    const series = termSeries[idx];
    // Return the full series without downsampling
    const spark = series.slice();
    const finite = spark.filter((v) => Number.isFinite(v));
    const min = Number.isFinite(termMin[idx]) ? termMin[idx] : 0;
    const max = Number.isFinite(termMax[idx]) ? termMax[idx] : 0;
    const mean = termCount[idx] > 0 ? termSum[idx] / termCount[idx] : 0;
    let varSum = 0;
    for (const v of finite) {
      varSum += (v - mean) * (v - mean);
    }
    const std = finite.length > 0 ? Math.sqrt(varSum / finite.length) : 0;
    return {
      name,
      unit: termUnits[idx] || 'kJ/mol',
      min,
      max,
      mean,
      std,
      sparkline: spark,
    };
  });
}
