import type { PuzzleDefinition, ValidatedPuzzle } from '../types';

/** A puzzle with its source metadata. Used by the app/UI layer. */
export interface PuzzleEntry {
  /** The validated puzzle data. */
  readonly puzzle: ValidatedPuzzle;
  /** Where this puzzle came from. */
  readonly source: 'builtin' | 'custom';
  /** Stable key used for saves and selection. Namespaced: 'builtin:<id>' or 'custom:<uuid>'. */
  readonly entryId: string;
  /** When this puzzle was added to the library (custom only). */
  readonly createdAt?: string;
}

/** Internal storage format for custom puzzles in localStorage. */
export interface StoredCustomPuzzle {
  readonly version: 1;
  /** The raw puzzle definition (will be re-validated on load). */
  readonly puzzle: PuzzleDefinition;
  /** UUID assigned when saved. */
  readonly internalId: string;
  /** ISO timestamp when the puzzle was created/imported. */
  readonly createdAt: string;
}

/** Export/import format for sharing puzzles. */
export interface ExportedPuzzle {
  readonly version: 1;
  readonly puzzle: PuzzleDefinition;
  readonly solvability: null | { uniqueSolution: boolean; difficulty?: string };
  readonly exportedAt: string;
}
