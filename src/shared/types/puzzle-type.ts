import type { RouteObject } from 'react-router-dom';
import type { PuzzleEntry } from '../../nonogram/puzzles/types';

/**
 * Contract for a puzzle type module in CatBox Puzzles.
 *
 * Each puzzle type (nonogram, skyscraper, etc.) exports a module conforming
 * to this interface. The top-level app mounts routes and renders the browser
 * for whatever types are registered.
 *
 * Not wired up yet — defined during Phase 0 for Phase 1 alignment.
 *
 * Note: Importing `PuzzleEntry` from `../puzzles/types` creates a cross-layer
 * reference. Phase 1 restructure will move `PuzzleEntry` to shared types.
 */
export interface PuzzleTypeModule {
  /** Unique slug identifier (e.g., 'nonogram', 'skyscraper'). */
  readonly id: string;
  /** Display name shown in UI navigation. */
  readonly name: string;
  /** Emoji or icon for visual identification. */
  readonly icon: string;
  /** React Router route definitions for this puzzle type's pages. */
  readonly routes: RouteObject[];
  /** Returns all browsable puzzle entries for this type. */
  getBrowserEntries(): PuzzleEntry[];
  /** Validates that a saved game blob belongs to and is valid for this puzzle type. */
  validateSave(data: unknown): boolean;
}
