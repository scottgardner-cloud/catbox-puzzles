import type { ColorId, ClueRun, LineClue } from '../../types';

/**
 * Derive row and column clues from a solution grid.
 *
 * Groups consecutive same-color filled cells into ClueRun entries.
 * Empty cells (null) act as separators. Logic is identical for B&W and color —
 * the difference is only in separator requirements, which is a validation concern.
 *
 * Note: This duplicates logic from the engine's internal `deriveLineClue`,
 * which is not exported. `validatePuzzleDefinition()` will catch any mismatch
 * between these clues and the solution, providing a safety net.
 *
 * @param solution - Grid of ColorId | null, indexed as solution[row][col]
 */
export function deriveClues(solution: readonly (readonly (ColorId | null)[])[]): {
  rowClues: readonly LineClue[];
  colClues: readonly LineClue[];
} {
  const rows = solution.length;
  const cols = rows > 0 ? solution[0].length : 0;

  const rowClues: LineClue[] = [];
  for (let r = 0; r < rows; r++) {
    rowClues.push(deriveLine(solution[r]));
  }

  const colClues: LineClue[] = [];
  for (let c = 0; c < cols; c++) {
    const colCells: (ColorId | null)[] = [];
    for (let r = 0; r < rows; r++) {
      colCells.push(solution[r][c]);
    }
    colClues.push(deriveLine(colCells));
  }

  return { rowClues, colClues };
}

/** Derive clue runs for a single line (row or column). */
function deriveLine(cells: readonly (ColorId | null)[]): LineClue {
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
