/**
 * Copyright (c) 2022 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * Adapted from NGL.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 *
 * TypeScript conversion: dead-code parser kept for API parity with molstar's TRR parser.
 * The streaming reader in `./stream-reader.ts` is what the extension actually uses.
 */

// Local stand-ins for the molstar types this module historically consumed.
// See `src/parsers/xtc/parser.ts` for the rationale behind the local definitions.

export interface TrrFile {
    frames: {
        count: number;
        x: Float32Array;
        y: Float32Array;
        z: Float32Array;
    }[];
    boxes: Float32Array[];
    times: number[];
    timeOffset: number;
    deltaTime: number;
}

export interface ParseContext {
    update(progress: { current?: number; max?: number; canAbort?: boolean; message?: string }): Promise<void> | void;
}

export type ParseResult<T> =
    | { kind: 'success'; value: T }
    | { kind: 'error'; error: string };

const Result = {
    success<T>(value: T): ParseResult<T> { return { kind: 'success', value }; },
    error(message: string): ParseResult<never> { return { kind: 'error', error: message }; }
};

interface Task<T> {
    run(ctx: ParseContext): Promise<ParseResult<T>>;
}

const Task = {
    async create<T>(name: string, runner: (ctx: ParseContext) => Promise<ParseResult<T>>): Promise<Task<T>> {
        return { run: runner };
    }
};

async function parseInternal(data: Uint8Array): Promise<TrrFile> {
    // https://github.com/gromacs/gromacs/blob/master/src/gromacs/fileio/trrio.cpp
    const dv = new DataView(data.buffer);
    const f: TrrFile = {
        frames: [],
        boxes: [],
        times: [],
        timeOffset: 0,
        deltaTime: 0
    };

    const coordinates = f.frames;
    const boxes = f.boxes;
    const times = f.times;

    let offset = 0;
    while (true) {
        offset += 8;
        const versionSize = dv.getInt32(offset);
        offset += 4;
        offset += versionSize;

        const boxSize = dv.getInt32(offset + 8);
        const virSize = dv.getInt32(offset + 12);
        const presSize = dv.getInt32(offset + 16);
        const coordSize = dv.getInt32(offset + 28);
        const velocitySize = dv.getInt32(offset + 32);
        const forceSize = dv.getInt32(offset + 36);
        const natoms = dv.getInt32(offset + 40);
        offset += 52;

        const floatSize = boxSize / 9;
        const natoms3 = natoms * 3;

        if (floatSize === 8) {
            times.push(dv.getFloat64(offset));
        } else {
            times.push(dv.getFloat32(offset));
        }
        offset += 2 * floatSize;

        if (boxSize) {
            const box = new Float32Array(9);
            if (floatSize === 8) {
                for (let i = 0; i < 9; ++i) {
                    box[i] = dv.getFloat64(offset) * 10;
                    offset += 8;
                }
            } else {
                for (let i = 0; i < 9; ++i) {
                    box[i] = dv.getFloat32(offset) * 10;
                    offset += 4;
                }
            }
            boxes.push(box);
        }

        offset += virSize;
        offset += presSize;

        if (coordSize) {
            const x = new Float32Array(natoms);
            const y = new Float32Array(natoms);
            const z = new Float32Array(natoms);
            if (floatSize === 8) {
                for (let i = 0; i < natoms; ++i) {
                    x[i] = dv.getFloat64(offset) * 10;
                    y[i] = dv.getFloat64(offset + 8) * 10;
                    z[i] = dv.getFloat64(offset + 16) * 10;
                    offset += 24;
                }
            } else {
                const tmp = new Uint32Array(data.buffer, offset, natoms3);
                for (let i = 0; i < natoms3; ++i) {
                    const value = tmp[i];
                    tmp[i] = (((value & 0xFF) << 24) | ((value & 0xFF00) << 8) |
                        ((value >> 8) & 0xFF00) | ((value >> 24) & 0xFF));
                }
                const frameCoords = new Float32Array(data.buffer, offset, natoms3);
                for (let i = 0; i < natoms; ++i) {
                    x[i] = frameCoords[i * 3] * 10;
                    y[i] = frameCoords[i * 3 + 1] * 10;
                    z[i] = frameCoords[i * 3 + 2] * 10;
                    offset += 12;
                }
            }
            coordinates.push({ count: natoms, x, y, z });
        }

        offset += velocitySize;
        offset += forceSize;
        if (offset >= data.byteLength) {
            break;
        }
    }

    if (times.length >= 1) {
        f.timeOffset = times[0];
    }
    if (times.length >= 2) {
        f.deltaTime = times[1] - times[0];
    }
    return f;
}

export function parseTrr(data: Uint8Array): Promise<Task<TrrFile>> {
    return Task.create<TrrFile>('Parse TRR', async (ctx) => {
        try {
            await ctx.update({ canAbort: true, message: 'Parsing trajectory...' });
            const file = await parseInternal(data);
            return Result.success(file);
        } catch (e) {
            return Result.error('' + e);
        }
    });
}

// Streaming reader re-exported for parity with the original module shape.
export { TrrStreamReader } from './stream-reader';
