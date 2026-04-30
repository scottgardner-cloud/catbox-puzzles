import type { RouteObject } from 'react-router-dom';
import type { PuzzleEntry } from './puzzle-entry';

/** A navigation item declared by a puzzle type module. */
export interface NavItem {
  /** Display label shown in the nav bar. */
  readonly label: string;
  /** Path relative to the type root (e.g., '' for browser, 'generator'). */
  readonly path: string;
}

/**
 * Contract for a puzzle type module in CatBox Puzzles.
 *
 * Each puzzle type (nonogram, skyscraper, etc.) exports a module conforming
 * to this interface. The top-level app mounts routes and renders the browser
 * for whatever types are registered.
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
  /** Navigation items shown when this type is active. */
  readonly navItems: readonly NavItem[];
  /** Returns all browsable puzzle entries for this type. */
  getBrowserEntries(): PuzzleEntry[];
  /** Validates that a saved game blob belongs to and is valid for this puzzle type. */
  validateSave(data: unknown): boolean;
}
