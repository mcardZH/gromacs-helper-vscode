# Parsers

Binary trajectory format parsers for GROMACS simulation files.

## Layout

| Subdirectory | Purpose |
|--------------|---------|
| `xtc/` | XTC (XDR Compressed) trajectory parser + streaming reader |
| `trr/` | TRR (XDR Real) trajectory parser + streaming reader |

## Streaming readers vs. legacy parsers

Each subdirectory contains two entry points:

- `stream-reader.ts` — actively used by the extension (`src/util/stream_provider.ts`). Reads frames lazily and indexes the file on open.
- `parser.ts` — kept for API parity with molstar's batch-mode `parseXtc` / `parseTrr` functions. Not currently called anywhere in the extension; see `src/util/README.md` ("向后兼容"). Lives here so that any future caller gets TypeScript types instead of untyped `.js`.

If `parser.ts` turns out to be permanently unused, it is safe to delete both it and this paragraph.
