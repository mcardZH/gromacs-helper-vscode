import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { XtcFileInfo } from '../gromacsFileTypes';
import { readInt32BE, readFloat32BE } from '../xdrReader';

/**
 * Parse an XTC (Compressed Trajectory) file using a head + tail probe.
 *
 * Instead of walking every frame (which is O(file size) and useless for
 * a summary that just needs `frameCount`, `timeOffset`, `deltaTime`,
 * `lastTime`, `atomCount`, `precision`), we read:
 *   - the first 256 bytes (frame 0's full header + a few fields of the
 *     compressed block), and
 *   - the last ~1 MB of the file, from which we locate the last frame
 *     header by scanning for the XTC magic (1995 or 2023) and parse
 *     its `time` field.
 *
 * If both ends look consistent, we estimate `frameCount` from the time
 * range and the per-frame `deltaTime` (== time of frame 1 - time of
 * frame 0). For trajectories with constant dt this matches the true
 * count exactly; for non-uniform ones the estimate is a lower bound.
 *
 * The returned `times` array contains exactly two entries —
 * `[firstTime, lastTime]` — which is enough for the summary panel's
 * "Time Range" and "Duration" cards without keeping the full per-frame
 * series in memory.
 *
 * Callers that need the per-frame series (e.g. the Mol* trajectory
 * player) should use the streaming reader in `./stream-reader.ts`
 * instead.
 */

const TAIL_PROBE_BYTES = 1024 * 1024; // 1 MiB
const HEAD_PROBE_BYTES = 256;

export interface ParseProgress {
  bytesRead: number;
  totalBytes: number;
  framesParsed: number;
}

export async function parseXtc(
  uri: vscode.Uri,
  options: { onProgress?: (p: ParseProgress) => void } = {},
): Promise<XtcFileInfo> {
  const stat = await fs.promises.stat(uri.fsPath);
  const filename = path.basename(uri.fsPath);
  const fileSize = stat.size;

  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    fileHandle = await fs.promises.open(uri.fsPath, 'r');

    // ── Phase 1: read the first frame header ──────────────────────────
    const headBuf = Buffer.alloc(HEAD_PROBE_BYTES);
    const headRead = (await fileHandle.read(
      headBuf, 0, HEAD_PROBE_BYTES, 0,
    )).bytesRead;
    if (headRead < 16) {
      throw new Error('XTC file is too small to contain a frame header');
    }
    const headView = new DataView(headBuf.buffer, headBuf.byteOffset, headRead);
    const firstMagic = headView.getInt32(0, false);
    if (firstMagic !== 1995 && firstMagic !== 2023) {
      throw new Error(
        `Not an XTC file: expected magic 1995/2023 at offset 0, got ${firstMagic}`,
      );
    }
    const natoms = headView.getInt32(4, false);
    const firstTime = headView.getFloat32(12, false);
    const magic: number = firstMagic === 1995 ? 1995 : 2023;

    // precision: at offset 56 in the compressed block (frame 0 only).
    let precision = 0;
    if (natoms > 9 && headRead >= 60) {
      precision = headView.getFloat32(56, false);
    }
    if (!precision) {
      precision = 0.001; // GROMACS default
    }

    // ── Phase 2: read the tail and find the last frame's time ─────────
    let lastTime: number = firstTime;
    if (fileSize > HEAD_PROBE_BYTES) {
      const tailSize = Math.min(TAIL_PROBE_BYTES, fileSize);
      const tailBuf = Buffer.alloc(tailSize);
      const tailRead = (await fileHandle.read(
        tailBuf, 0, tailSize, fileSize - tailSize,
      )).bytesRead;
      const tailView = new DataView(tailBuf.buffer, tailBuf.byteOffset, tailRead);
      // The last 92 bytes of a frame contain the 52-byte header plus
      // a few reals; scanning backwards for the magic (1995/2023) lets
      // us skip the body of the final frame without parsing it.
      let lastMagicAt = -1;
      for (let off = tailRead - 4; off >= 0; off -= 4) {
        const v = tailView.getInt32(off, false);
        if (v === 1995 || v === 2023) {
          lastMagicAt = off;
          break;
        }
      }
      if (lastMagicAt >= 0 && lastMagicAt + 16 <= tailRead) {
        // Frame layout: magic(4) + natoms(4) + step(4) + time(4) + box(36) = 52
        const t = tailView.getFloat32(lastMagicAt + 12, false);
        if (Number.isFinite(t)) {
          lastTime = t;
        }
      }
    }

    // ── Phase 3: derive frameCount + Δt ───────────────────────────────
    // The compressed payload of frame 0 has a variable size, so we
    // can't just read 2 × 52 bytes to find frame 1's time. Scan a
    // head window (~256 KB) for the second 1995/2023 magic instead.
    // Cheap (one 256 KB read) and accurate for the typical case.
    const PROBE_FOR_DT = 256 * 1024;
    let deltaTime = 0;
    if (fileSize > PROBE_FOR_DT) {
      const headBuf = Buffer.alloc(PROBE_FOR_DT);
      const r2 = (await fileHandle.read(
        headBuf, 0, PROBE_FOR_DT, 0,
      )).bytesRead;
      const v2 = new DataView(headBuf.buffer, headBuf.byteOffset, r2);
      let frame0At = -1;
      let frame1At = -1;
      for (let off = 0; off + 4 <= r2; off += 4) {
        const v = v2.getInt32(off, false);
        if (v !== 1995 && v !== 2023) { continue; }
        if (frame0At < 0) {
          frame0At = off;
        } else {
          frame1At = off;
          break;
        }
      }
      if (frame0At >= 0 && frame1At >= 0) {
        const t0 = v2.getFloat32(frame0At + 12, false);
        const t1 = v2.getFloat32(frame1At + 12, false);
        if (Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0) {
          deltaTime = t1 - t0;
        }
      }
    } else if (fileSize >= 2 * 52) {
      // Tiny file — fall back to the naive 2 × 52 read; if frame 1's
      // time is NaN then the second frame simply doesn't fit.
      const head2 = Buffer.alloc(2 * 52);
      const r2 = (await fileHandle.read(head2, 0, 2 * 52, 0)).bytesRead;
      if (r2 >= 2 * 52) {
        const v2 = new DataView(head2.buffer, head2.byteOffset, r2);
        const t0 = v2.getFloat32(12, false);
        const t1 = v2.getFloat32(12 + 52, false);
        if (Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0) {
          deltaTime = t1 - t0;
        }
      }
    }
    let frameCount: number;
    if (deltaTime > 0 && lastTime >= firstTime) {
      frameCount = Math.floor((lastTime - firstTime) / deltaTime) + 1;
    } else if (fileSize < 52) {
      frameCount = 0;
    } else {
      // Single-frame file: last == first, frameCount is at least 1.
      frameCount = 1;
    }

    if (options.onProgress) {
      options.onProgress({ bytesRead: fileSize, totalBytes: fileSize, framesParsed: frameCount });
    }

    return {
      format: 'xtc',
      filename,
      filePath: uri.fsPath,
      fileSize,
      magic,
      magicDisplay: magic === 2023 ? '2023 (64-bit size)' : '1995 (32-bit size)',
      encoding: 'XDR',
      endianness: 'big-endian',
      version: magic === 2023 ? '2 (large-system)' : '1',
      frameCount,
      atomCount: natoms,
      timeOffset: firstTime,
      deltaTime,
      // Just the two endpoints — the summary panel only needs these to
      // compute duration and show start/end. Streaming consumers should
      // use the dedicated stream-reader for the full per-frame series.
      times: [firstTime, lastTime],
      precision,
      headerSize: 52,
    };
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}
