import type { PuzzleDefinition, ValidatedPuzzle, ColorId, LineClue, ClueRun } from '../types';

/** A single validation error with a human-readable message. */
export interface ValidationError {
  readonly message: string;
}

/**
 * Derive the expected line clue from a row/column of the solution grid.
 * Groups consecutive same-color filled cells into ClueRun entries.
 */
function deriveLineClue(cells: readonly (ColorId | null)[]): LineClue {
  const runs: ClueRun[] = [];
  let i = 0;
  while (i < cells.length) {
    const c = cells[i];
    if (c !== null) {
      let length = 1;
      while (i + length < cells.length && cells[i + length] === c) {
        length++;
      }
      runs.push({ length, colorId: c });
      i += length;
    } else {
      i++;
    }
  }
  return runs;
}

/**
 * Compare two LineClue arrays for structural equality.
 */
function lineCluesEqual(a: LineClue, b: LineClue): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length || a[i].colorId !== b[i].colorId) {
      return false;
    }
  }
  return true;
}

/**
 * Compute the minimum line length needed to fit a set of clue runs.
 * B&W: separators between all adjacent runs.
 * Color: separators only between adjacent same-color runs.
 */
function minLineLength(clue: LineClue, isBW: boolean): number {
  if (clue.length === 0) return 0;
  let total = clue[0].length;
  for (let i = 1; i < clue.length; i++) {
    const needSep = isBW || clue[i].colorId === clue[i - 1].colorId;
    if (needSep) total += 1;
    total += clue[i].length;
  }
  return total;
}

/**
 * Validates a puzzle definition against all documented invariants.
 *
 * @returns A branded `ValidatedPuzzle` if all invariants hold, or an array
 *          of `ValidationError` objects describing every violation found.
 */
export function validatePuzzleDefinition(
  puzzle: PuzzleDefinition,
): ValidatedPuzzle | ValidationError[] {
  const errors: ValidationError[] = [];
  const paletteIds = new Set<ColorId>(puzzle.palette.map((c) => c.id));

  // B&W must have exactly one palette color
  if (puzzle.kind === 'bw' && puzzle.palette.length !== 1) {
    errors.push({
      message: `B&W puzzle must have exactly 1 palette color, got ${puzzle.palette.length}`,
    });
  }

  // Palette must have at least one color
  if (puzzle.palette.length === 0) {
    errors.push({ message: 'Palette must contain at least one color' });
  }

  // Palette IDs must be unique
  if (paletteIds.size !== puzzle.palette.length) {
    errors.push({ message: 'Palette contains duplicate color IDs' });
  }

  // Dimension checks
  if (puzzle.rowClues.length !== puzzle.rows) {
    errors.push({
      message: `rowClues.length (${puzzle.rowClues.length}) !== rows (${puzzle.rows})`,
    });
  }
  if (puzzle.colClues.length !== puzzle.cols) {
    errors.push({
      message: `colClues.length (${puzzle.colClues.length}) !== cols (${puzzle.cols})`,
    });
  }
  if (puzzle.solution.length !== puzzle.rows) {
    errors.push({
      message: `solution.length (${puzzle.solution.length}) !== rows (${puzzle.rows})`,
    });
  }

  // Validate solution row lengths and cell colors
  for (let r = 0; r < puzzle.solution.length; r++) {
    const row = puzzle.solution[r];
    if (row.length !== puzzle.cols) {
      errors.push({
        message: `solution[${r}].length (${row.length}) !== cols (${puzzle.cols})`,
      });
    }
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell !== null && !paletteIds.has(cell)) {
        errors.push({
          message: `solution[${r}][${c}] references unknown color "${cell}"`,
        });
      }
    }
  }

  // Validate clue runs: positive lengths, colors in palette, fit within line
  const isBW = puzzle.kind === 'bw';

  for (let r = 0; r < puzzle.rowClues.length; r++) {
    const clue = puzzle.rowClues[r];
    for (let i = 0; i < clue.length; i++) {
      if (clue[i].length < 1) {
        errors.push({
          message: `rowClues[${r}][${i}].length must be >= 1, got ${clue[i].length}`,
        });
      }
      if (!paletteIds.has(clue[i].colorId)) {
        errors.push({
          message: `rowClues[${r}][${i}].colorId "${clue[i].colorId}" not in palette`,
        });
      }
    }
    if (minLineLength(clue, isBW) > puzzle.cols) {
      errors.push({
        message: `rowClues[${r}] runs exceed available columns (${puzzle.cols})`,
      });
    }
  }

  for (let c = 0; c < puzzle.colClues.length; c++) {
    const clue = puzzle.colClues[c];
    for (let i = 0; i < clue.length; i++) {
      if (clue[i].length < 1) {
        errors.push({
          message: `colClues[${c}][${i}].length must be >= 1, got ${clue[i].length}`,
        });
      }
      if (!paletteIds.has(clue[i].colorId)) {
        errors.push({
          message: `colClues[${c}][${i}].colorId "${clue[i].colorId}" not in palette`,
        });
      }
    }
    if (minLineLength(clue, isBW) > puzzle.rows) {
      errors.push({
        message: `colClues[${c}] runs exceed available rows (${puzzle.rows})`,
      });
    }
  }

  // Clues must match solution
  for (let r = 0; r < Math.min(puzzle.rowClues.length, puzzle.solution.length); r++) {
    const derived = deriveLineClue(puzzle.solution[r]);
    if (!lineCluesEqual(puzzle.rowClues[r], derived)) {
      errors.push({
        message: `rowClues[${r}] does not match the solution`,
      });
    }
  }

  for (let c = 0; c < puzzle.colClues.length && c < puzzle.cols; c++) {
    const colCells: (ColorId | null)[] = [];
    for (let r = 0; r < puzzle.solution.length; r++) {
      if (c < puzzle.solution[r].length) {
        colCells.push(puzzle.solution[r][c]);
      }
    }
    const derived = deriveLineClue(colCells);
    if (!lineCluesEqual(puzzle.colClues[c], derived)) {
      errors.push({
        message: `colClues[${c}] does not match the solution`,
      });
    }
  }

  if (errors.length > 0) return errors;

  return puzzle as ValidatedPuzzle;
}
