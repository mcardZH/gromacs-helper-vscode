import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TrrFileInfo } from '../gromacsFileTypes';
import { readInt32BE, readFloat32BE, readFloat64BE, readGmxString } from '../xdrReader';

/**
 * Parse a TRR (Trajectory) file using a head + tail probe.
 *
 * We read the first 256 bytes (frame 0's full header) and the last
 * 1 MB of the file (looking for the last frame's magic, 1993, to
 * extract the last `time` value). We do not walk every frame —
 * the summary panel only needs `frameCount`, `timeOffset`,
 * `deltaTime`, `lastTime`, `atomCount`, `precision`, and the
 * booleans `hasVelocities` / `hasForces`. For the per-frame
 * coordinates (Mol* playback), the streaming reader in
 * `./stream-reader.ts` is the source of truth.
 *
 * Reference for the TRR on-disk layout:
 * `src/gromacs/fileio/trrio.cpp:do_trr_frame_header()`.
 */
const TAIL_PROBE_BYTES = 1024 * 1024; // 1 MiB
const HEAD_PROBE_BYTES = 1024 * 1024; // 1 MiB — TRR frames are ~500 KB
                                       //         (20 734 atoms × 3 × 4 + 88 header + v)
                                       //         so the second frame often
                                       //         lies past 256 bytes.

export interface ParseProgress {
  bytesRead: number;
  totalBytes: number;
  framesParsed: number;
}

export async function parseTrr(
  uri: vscode.Uri,
  onProgress?: (p: ParseProgress) => void,
): Promise<TrrFileInfo> {
  const stat = await fs.promises.stat(uri.fsPath);
  const filename = path.basename(uri.fsPath);
  const fileSize = stat.size;

  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    fileHandle = await fs.promises.open(uri.fsPath, 'r');

    // ── Phase 1: read frame 0's header (256 bytes is plenty) ──────────
    const head = Buffer.alloc(HEAD_PROBE_BYTES);
    const headRead = (await fileHandle.read(head, 0, HEAD_PROBE_BYTES, 0)).bytesRead;
    if (headRead < 12) {
      throw new Error('TRR file is too small to contain a frame header');
    }
    const headView = new DataView(head.buffer, head.byteOffset, headRead);
    const firstMagic = headView.getInt32(0, false);
    if (firstMagic !== 1993) {
      throw new Error(
        `Not a TRR file: expected magic 1993 at offset 0, got ${firstMagic}`,
      );
    }

    // Skip past the GROMACS version string (double-length prefixed).
    const { value: version, bytesConsumed: versionBytes } = readGmxString(head, 4);
    let cursor = 4 + versionBytes;
    // 11 int32 fields (10 size fields + natoms), then step, nre, time, lambda.
    const irSize = headView.getInt32(cursor, false); cursor += 4;
    const eSize = headView.getInt32(cursor, false); cursor += 4;
    const boxSize = headView.getInt32(cursor, false); cursor += 4;
    const virSize = headView.getInt32(cursor, false); cursor += 4;
    const presSize = headView.getInt32(cursor, false); cursor += 4;
    const topSize = headView.getInt32(cursor, false); cursor += 4;
    const symSize = headView.getInt32(cursor, false); cursor += 4;
    const xSize = headView.getInt32(cursor, false); cursor += 4;
    const vSize = headView.getInt32(cursor, false); cursor += 4;
    const fSize = headView.getInt32(cursor, false); cursor += 4;
    const natoms = headView.getInt32(cursor, false); cursor += 4;
    // step (int32) and nre (int32)
    cursor += 8;
    const floatSize = boxSize / 9;
    const precision: 'single' | 'double' = floatSize === 8 ? 'double' : 'single';
    const firstTime = floatSize === 8
      ? headView.getFloat64(cursor, false)
      : headView.getFloat32(cursor, false);
    // skip lambda
    cursor += 2 * floatSize;

    const hasVelocities = vSize > 0;
    const hasForces = fSize > 0;

    // ── Phase 2: read the tail and find the last frame's time ─────────
    let lastTime: number = firstTime;
    if (fileSize > HEAD_PROBE_BYTES) {
      const tailSize = Math.min(TAIL_PROBE_BYTES, fileSize);
      const tailBuf = Buffer.alloc(tailSize);
      const tailRead = (await fileHandle.read(
        tailBuf, 0, tailSize, fileSize - tailSize,
      )).bytesRead;
      const tailView = new DataView(tailBuf.buffer, tailBuf.byteOffset, tailRead);
      // A TRR frame header is at least 4 (magic) + 4 (outer slen) +
      // 4 (inner slen) + 4 (min content) + 44 (sizes) + 4 + 4 + 16
      // = 80 bytes. We need at least 80 to safely read past the slen
      // and box_size. The `time` field is at offset
      //   4 (magic) + 4 (outer slen) + 4 (inner slen) + slen
      //   + 44 (sizes) + 4 + 4 (step + nre) = 60 + slen
      // For slen ≤ 64 (which covers "GMX_trn_file" comfortably), that's
      //   at most 124 bytes. The 1 MiB tail probe covers it.
      let lastMagicAt = -1;
      for (let off = tailRead - 4; off >= 0; off -= 4) {
        const v = tailView.getInt32(off, false);
        if (v === 1993) {
          lastMagicAt = off;
          break;
        }
      }
      if (lastMagicAt >= 0 && lastMagicAt + 80 <= tailRead) {
        // Parse the version string and locate `time`.
        const { bytesConsumed: slenBytes } = readGmxString(tailBuf, lastMagicAt + 4);
        let p = lastMagicAt + 4 + slenBytes;
        // Skip 11 size ints (10 sizes + natoms, 44 bytes total), then
        // step + nre (8 bytes). The `time` field follows.
        if (p + 44 + 8 <= tailRead) {
          p += 44 + 8;
          const frameBoxSize = tailView.getInt32(
            lastMagicAt + 4 + slenBytes + 8,
            false,
          );
          const frameFloatSize = frameBoxSize / 9;
          if (frameFloatSize === 8) {
            if (p + 8 <= tailRead) {
              const t = tailView.getFloat64(p, false);
              if (Number.isFinite(t)) { lastTime = t; }
            }
          } else {
            if (p + 4 <= tailRead) {
              const t = tailView.getFloat32(p, false);
              if (Number.isFinite(t)) { lastTime = t; }
            }
          }
        }
      }
    }

    // ── Phase 3: derive frameCount + Δt ───────────────────────────────
    // Cheap estimate: read the first two frames' time fields (the
    // second frame is at offset `firstFrameSize`).
    const firstFrameSize =
      4 /* magic */ +
      versionBytes /* slen + version, including the 4-byte outer length */ +
      44 /* 11 size ints + natoms */ +
      4 /* step */ +
      4 /* nre */ +
      2 * floatSize /* time + lambda */ +
      boxSize + virSize + presSize + xSize + vSize + fSize;

    let deltaTime = 0;
    if (fileSize >= 2 * firstFrameSize) {
      const head2 = Buffer.alloc(2 * firstFrameSize);
      const r2 = (await fileHandle.read(
        head2, 0, 2 * firstFrameSize, 0,
      )).bytesRead;
      if (r2 >= 2 * firstFrameSize) {
        const v2 = new DataView(head2.buffer, head2.byteOffset, r2);
        // Frame 1's `time` is at
        //   firstFrameSize + 4 (magic) + versionBytes (gmxString,
        //   including its outer length) + 44 (11 size ints incl.
        //   natoms) + 8 (step + nre)
        // from the start of the head probe.
        const t1Off = firstFrameSize + 4 + versionBytes + 44 + 8;
        if (floatSize === 8) {
          if (t1Off + 8 <= r2) {
            const t1 = v2.getFloat64(t1Off, false);
            if (Number.isFinite(t1) && t1 > firstTime) { deltaTime = t1 - firstTime; }
          }
        } else {
          if (t1Off + 4 <= r2) {
            const t1 = v2.getFloat32(t1Off, false);
            if (Number.isFinite(t1) && t1 > firstTime) { deltaTime = t1 - firstTime; }
          }
        }
      }
    }
    let frameCount: number;
    if (deltaTime > 0 && lastTime >= firstTime) {
      frameCount = Math.floor((lastTime - firstTime) / deltaTime) + 1;
    } else if (fileSize < firstFrameSize) {
      frameCount = 0;
    } else {
      frameCount = 1;
    }

    if (onProgress) {
      onProgress({ bytesRead: fileSize, totalBytes: fileSize, framesParsed: frameCount });
    }

    return {
      format: 'trr',
      filename,
      filePath: uri.fsPath,
      fileSize,
      magic: 1993,
      magicDisplay: '1993',
      encoding: 'XDR',
      endianness: 'big-endian',
      version: version || undefined,
      frameCount,
      atomCount: natoms,
      timeOffset: firstTime,
      deltaTime,
      // Just the two endpoints — the summary panel only needs them.
      times: [firstTime, lastTime],
      precision,
      hasVelocities,
      hasForces,
      headerSize: 4 + versionBytes + 44 + 4 + 4 + 2 * floatSize,
    };
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}
