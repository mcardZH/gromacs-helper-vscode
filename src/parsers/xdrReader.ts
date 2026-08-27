/**
 * XDR (External Data Representation) binary reader helpers.
 *
 * GROMACS uses XDR (RFC 4506) for its on-disk binary formats
 * (XTC / TRR / EDR / TPR). XDR is big-endian and uses length-prefixed
 * strings.
 *
 * The reference for these readers is `src/gromacs/fileio/xdrf.h` and
 * `src/gromacs/fileio/libxdrf.cpp` in the GROMACS source.
 *
 * Every helper takes a `Buffer` (or `Uint8Array`) and a byte offset and
 * returns the parsed value plus the number of bytes consumed. Strings
 * use the XDR convention: a 32-bit length (including the terminating
 * null byte), followed by `length` raw bytes — see
 * `xdr_string()` in libxdrf.cpp.
 */

export function readInt32BE(buf: Uint8Array, offset: number): number {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return dv.getInt32(offset, false);
}

export function readUInt32BE(buf: Uint8Array, offset: number): number {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return dv.getUint32(offset, false);
}

export function readInt64BE(buf: Uint8Array, offset: number): bigint {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return dv.getBigInt64(offset, false);
}

export function readFloat32BE(buf: Uint8Array, offset: number): number {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return dv.getFloat32(offset, false);
}

export function readFloat64BE(buf: Uint8Array, offset: number): number {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return dv.getFloat64(offset, false);
}

/**
 * Read a GROMACS-flavoured length-prefixed string.
 *
 * GROMACS writers (TRR via `gmx_fio_do_string` in
 * `src/gromacs/fileio/gmxfio_xdr.cpp:580`, and TPR via
 * `XdrSerializer::doString` in
 * `src/gromacs/fileio/xdr_serializer.cpp:340`) emit **two** consecutive
 * int32 length fields before the string content:
 *
 *   1. An outer length written by an explicit `xdr_int` call, equal
 *      to `strlen(s) + 1`.
 *   2. The standard `xdr_string` length, also equal to `strlen(s) + 1`.
 *
 * EDR (enxio.cpp:edr_string) uses the plain `xdr_string` format
 * instead, so this helper is **not** appropriate for EDR.
 */
export function readGmxString(
  buf: Uint8Array,
  offset: number,
): { value: string; bytesConsumed: number } {
  // Outer GROMACS length — read it but do not use it; the inner
  // xdr_string length is the source of truth for the byte count.
  const outer = readInt32BE(buf, offset);
  offset += 4;
  void outer;
  const inner = readXdrString(buf, offset);
  return { value: inner.value, bytesConsumed: 4 + inner.bytesConsumed };
}

/**
 * Read a standard XDR length-prefixed string (RFC 4506 `xdr_string`).
 *
 * The encoded form is a 32-bit length `n` (= `strlen(s)`, **not**
 * including the terminating null) followed by exactly `n` bytes of
 * content, padded with up to 3 null bytes to the next 4-byte
 * alignment. The returned value excludes the trailing null; if the
 * content itself is empty, length is 0 and the next field starts
 * immediately on the 4-byte boundary.
 *
 * EDR (enxio.cpp:edr_string) uses this format directly.
 */
export function readXdrString(
  buf: Uint8Array,
  offset: number,
): { value: string; bytesConsumed: number } {
  const length = readInt32BE(buf, offset);
  if (length < 0) {
    throw new Error(`Invalid XDR string length: ${length}`);
  }
  const charCount = length;
  // Read length bytes of content.
  const bytes = buf.subarray(offset + 4, offset + 4 + charCount);
  const value = new TextDecoder('utf-8').decode(bytes);
  // XDR pads the content to a 4-byte boundary; account for that.
  const padded = Math.ceil(charCount / 4) * 4;
  return { value, bytesConsumed: 4 + padded };
}