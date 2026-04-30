/**
 * Base puzzle entry type used by the shared app shell.
 *
 * Each puzzle type module defines its own narrower entry type (e.g., with
 * `puzzle: ValidatedPuzzle` for nonogram), which is structurally assignable
 * to this base type since any specific type extends `unknown`.
 */
export interface PuzzleEntry {
  /** Opaque puzzle data — type-specific modules narrow this. */
  readonly puzzle: unknown;
  /** Where this puzzle came from. */
  readonly source: 'builtin' | 'custom';
  /** Stable key used for saves and selection. Namespaced: 'builtin:<id>' or 'custom:<uuid>'. */
  readonly entryId: string;
  /** When this puzzle was added to the library (custom only). */
  readonly createdAt?: string;
}
