/**
 * KeyValueTree (KVT) reader for modern TPR files (fileVersion >= 137).
 *
 * GROMACS 2019+ uses KeyValueTree to serialize inputrec and other structured
 * data. The KVT format is a recursive tree of key-value pairs where values
 * can be primitives (int, float, string) or nested trees.
 *
 * XDR layout (see src/gromacs/utility/keyvaluetree.cpp:serializeKeyValueTree):
 *   nEntries: int32
 *   For each entry:
 *     key: xdr_string (length-prefixed)
 *     type: int32 (0=int32, 1=int64, 2=float, 3=double, 4=string, 5=object)
 *     value: depends on type
 *       - int32: int32
 *       - int64: int64
 *       - float: float
 *       - double: double
 *       - string: xdr_string
 *       - object: recursive KVT
 */

import { readInt32BE, readInt64BE, readFloat32BE, readFloat64BE, readXdrString } from '../xdrReader';

export interface KVTValue {
  type: 'int32' | 'int64' | 'float' | 'double' | 'string' | 'object';
  value: number | string | KVTObject;
}

export interface KVTObject {
  [key: string]: KVTValue;
}

export interface KVTReadResult {
  tree: KVTObject;
  bytesConsumed: number;
}

/**
 * Read a KeyValueTree from a buffer.
 */
export function readKVT(buf: Uint8Array, offset: number): KVTReadResult {
  let cursor = offset;
  const nEntries = readInt32BE(buf, cursor);
  cursor += 4;

  const tree: KVTObject = {};

  for (let i = 0; i < nEntries; i++) {
    // Read key
    const keyResult = readXdrString(buf, cursor);
    const key = keyResult.value;
    cursor += keyResult.bytesConsumed;

    // Read type
    const type = readInt32BE(buf, cursor);
    cursor += 4;

    // Read value based on type
    let value: KVTValue;
    switch (type) {
      case 0: // int32
        value = { type: 'int32', value: readInt32BE(buf, cursor) };
        cursor += 4;
        break;
      case 1: // int64
        value = { type: 'int64', value: Number(readInt64BE(buf, cursor)) };
        cursor += 8;
        break;
      case 2: // float
        value = { type: 'float', value: readFloat32BE(buf, cursor) };
        cursor += 4;
        break;
      case 3: // double
        value = { type: 'double', value: readFloat64BE(buf, cursor) };
        cursor += 8;
        break;
      case 4: // string
        const strResult = readXdrString(buf, cursor);
        value = { type: 'string', value: strResult.value };
        cursor += strResult.bytesConsumed;
        break;
      case 5: // object (nested KVT)
        const objResult = readKVT(buf, cursor);
        value = { type: 'object', value: objResult.tree };
        cursor += objResult.bytesConsumed;
        break;
      default:
        throw new Error(`Unknown KVT type: ${type}`);
    }

    tree[key] = value;
  }

  return { tree, bytesConsumed: cursor - offset };
}

/**
 * Helper to extract a value from a KVT path (e.g., "input-rec/integrator").
 */
export function getKVTValue(tree: KVTObject, path: string): KVTValue | undefined {
  const parts = path.split('/');
  let current: KVTValue | undefined = { type: 'object', value: tree };

  for (const part of parts) {
    if (!current || current.type !== 'object') {
      return undefined;
    }
    current = (current.value as KVTObject)[part];
  }

  return current;
}
