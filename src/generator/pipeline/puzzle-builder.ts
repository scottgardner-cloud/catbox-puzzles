import type { PuzzleDefinition, ValidatedPuzzle, ColorId, PaletteColor } from '../../types';
import { colorId } from '../../types';
import type { ValidationError } from '../../engine/validation';
import { validatePuzzleDefinition } from '../../engine/validation';
import type { PixelGrid, GeneratorSettings, RGBColor } from './types';
import { quantizeBW } from './quantize-bw';
import { quantizeColor } from './quantize-color';
import { deriveClues } from './clue-derivation';

/** Result of puzzle building — either a validated puzzle or structured errors. */
export type BuildPuzzleResult =
  | { readonly ok: true; readonly puzzle: ValidatedPuzzle }
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

  return { ok: true, puzzle: result };
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Create the single palette color for B&W puzzles. */
function createBWPalette(): PaletteColor {
  return { id: colorId('black'), name: 'Black', value: '#000000' };
}

/** Convert a BWGrid to a solution grid. */
function bwGridToSolution(bwGrid: { width: number; height: number; cells: readonly boolean[] }, fillId: ColorId): (ColorId | null)[][] {
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
