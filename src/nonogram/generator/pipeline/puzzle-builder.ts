import type { PuzzleDefinition, ValidatedPuzzle, ColorId, PaletteColor } from '../../types';
import { colorId } from '../../types';
import type { ValidationError } from '../../engine/validation';
import { validatePuzzleDefinition } from '../../engine/validation';
import type { SolverResult } from '../../engine/solver';
import { solvePuzzle } from '../../engine/solver';
import type { PixelGrid, GeneratorSettings, RGBColor } from './types';
import { quantizeBW } from './quantize-bw';
import { quantizeColor } from './quantize-color';
import { deriveClues } from './clue-derivation';

import { repairPuzzle } from './repair';

/** Solvability assessment from the constraint solver. */
export type SolvabilityInfo =
  | { readonly solvable: true; readonly repaired?: boolean; readonly cellsChanged?: number }
  | { readonly solvable: false; readonly reason: string; readonly hint: string };

/** Result of puzzle building — either a validated puzzle or structured errors. */
export type BuildPuzzleResult =
  | { readonly ok: true; readonly puzzle: ValidatedPuzzle; readonly solvability: SolvabilityInfo }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

/**
 * Build a PuzzleDefinition from a resized PixelGrid + settings.
 *
 * Orchestrates the full pipeline: quantization → solution grid → clue derivation → validation.
 * Returns a structured result, not a thrown error.
 */
export function buildPuzzle(grid: PixelGrid, settings: GeneratorSettings): BuildPuzzleResult {
  if (grid.width !== settings.targetCols || grid.height !== settings.targetRows) {
    return {
      ok: false,
      errors: [
        {
          message: `Grid dimensions (${grid.width}×${grid.height}) do not match settings (${settings.targetCols}×${settings.targetRows})`,
        },
      ],
    };
  }

  let solution: (ColorId | null)[][];
  let palette: PaletteColor[];
  let kind: 'bw' | 'color';

  if (settings.kind === 'bw') {
    kind = 'bw';
    const bwGrid = quantizeBW(grid, settings.bwThreshold);
    const fillColor = createBWPalette();
    palette = [fillColor];
    solution = bwGridToSolution(bwGrid, fillColor.id);
  } else {
    kind = 'color';
    const colorGrid = quantizeColor(
      grid,
      settings.maxColors ?? 4,
      settings.backgroundMode ?? { kind: 'auto' },
    );

    if (colorGrid.palette.length === 0) {
      return {
        ok: false,
        errors: [{ message: 'All pixels were detected as background — no filled colors found' }],
      };
    }

    palette = colorGrid.palette.map((rgb, i) => rgbToPaletteColor(rgb, i));
    solution = colorGridToSolution(colorGrid, palette);
  }

  const { rowClues, colClues } = deriveClues(solution);

  const puzzleDef: PuzzleDefinition = {
    id: crypto.randomUUID(),
    name: settings.name,
    kind,
    rows: settings.targetRows,
    cols: settings.targetCols,
    palette,
    rowClues,
    colClues,
    solution,
  };

  const result = validatePuzzleDefinition(puzzleDef);
  if (Array.isArray(result)) {
    return { ok: false, errors: result };
  }

  // Run solver to verify unique solvability
  const solvability = assessSolvability(result);

  // If ambiguous, attempt automatic repair
  if (!solvability.solvable && solvability.reason.includes('multiple solutions')) {
    const repairResult = repairPuzzle(result);
    if (repairResult.success && repairResult.puzzle) {
      return {
        ok: true,
        puzzle: repairResult.puzzle,
        solvability: { solvable: true, repaired: true, cellsChanged: repairResult.changes.length },
      };
    }
  }

  return { ok: true, puzzle: result, solvability };
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Run the constraint solver and return a solvability assessment. */
function assessSolvability(puzzle: ValidatedPuzzle): SolvabilityInfo {
  try {
    const solverResult: SolverResult = solvePuzzle(puzzle, { maxNodes: 10_000 });
    if (solverResult.solved) {
      return { solvable: true };
    }
    switch (solverResult.reason) {
      case 'stuck':
        return {
          solvable: false,
          reason: 'Puzzle may have multiple solutions or require guessing.',
          hint: 'Try a smaller grid size or adjust the threshold/colors for more contrast.',
        };
      case 'contradiction':
        return {
          solvable: false,
          reason: 'Puzzle has contradictory clues.',
          hint: 'This is unexpected for a generated puzzle — try regenerating.',
        };
      case 'budget-exceeded':
        return {
          solvable: false,
          reason: 'Puzzle is too complex for the solver to verify.',
          hint: 'Try a smaller grid size. Large puzzles with many colors are harder to verify.',
        };
    }
  } catch {
    // Solver failure shouldn't block puzzle creation, but shouldn't claim solvability
    return {
      solvable: false,
      reason: 'Solver verification failed unexpectedly.',
      hint: 'The puzzle may still be valid — try saving and testing it.',
    };
  }
}

/** Create the single palette color for B&W puzzles. */
function createBWPalette(): PaletteColor {
  return { id: colorId('black'), name: 'Black', value: '#000000' };
}

/** Convert a BWGrid to a solution grid. */
function bwGridToSolution(
  bwGrid: { width: number; height: number; cells: readonly boolean[] },
  fillId: ColorId,
): (ColorId | null)[][] {
  const solution: (ColorId | null)[][] = [];
  for (let r = 0; r < bwGrid.height; r++) {
    const row: (ColorId | null)[] = [];
    for (let c = 0; c < bwGrid.width; c++) {
      row.push(bwGrid.cells[r * bwGrid.width + c] ? fillId : null);
    }
    solution.push(row);
  }
  return solution;
}

/**
 * Convert an RGB color to a PaletteColor with a deterministic ColorId.
 * ID is derived from the hex value for stability.
 */
function rgbToPaletteColor(rgb: RGBColor, index: number): PaletteColor {
  const hex = rgbToHex(rgb);
  return {
    id: colorId(hex),
    name: `Color ${index + 1}`,
    value: `#${hex}`,
  };
}

/** Convert RGB to a 6-char lowercase hex string. */
function rgbToHex(rgb: RGBColor): string {
  return [rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Convert a ColorGrid to a solution grid using the generated palette. */
function colorGridToSolution(
  colorGrid: { width: number; height: number; cells: readonly (number | null)[] },
  palette: PaletteColor[],
): (ColorId | null)[][] {
  const solution: (ColorId | null)[][] = [];
  for (let r = 0; r < colorGrid.height; r++) {
    const row: (ColorId | null)[] = [];
    for (let c = 0; c < colorGrid.width; c++) {
      const idx = colorGrid.cells[r * colorGrid.width + c];
      row.push(idx !== null ? palette[idx].id : null);
    }
    solution.push(row);
  }
  return solution;
}
