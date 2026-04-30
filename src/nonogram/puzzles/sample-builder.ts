/**
 * Helper for building sample puzzles from solution grids.
 * Clues are derived at load time — no hand-authored clue arrays needed.
 */
import type { ColorId, PaletteColor, PuzzleDefinition, ValidatedPuzzle } from '../types';
import { validatePuzzleDefinition } from '../engine/validation';
import { deriveClues } from '../generator/pipeline/clue-derivation';

/** Minimal sample definition: solution grid + metadata. Clues are derived. */
export interface SampleDefinition {
  readonly id: string;
  readonly name: string;
  readonly kind: 'bw' | 'color';
  readonly palette: readonly PaletteColor[];
  readonly solution: readonly (readonly (ColorId | null)[])[];
}

/** Build a ValidatedPuzzle from a solution-only sample definition. */
export function buildSample(def: SampleDefinition): ValidatedPuzzle {
  const { rowClues, colClues } = deriveClues(def.solution);
  const puzzle: PuzzleDefinition = {
    id: def.id,
    name: def.name,
    kind: def.kind,
    rows: def.solution.length,
    cols: def.solution.length > 0 ? def.solution[0].length : 0,
    palette: def.palette,
    rowClues,
    colClues,
    solution: def.solution,
  };
  const result = validatePuzzleDefinition(puzzle);
  if (Array.isArray(result)) {
    throw new Error(
      `Sample puzzle "${def.id}" failed validation:\n${result.map((e) => `  - ${e.message}`).join('\n')}`,
    );
  }
  return result;
}
