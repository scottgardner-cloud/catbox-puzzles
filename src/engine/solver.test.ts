import { describe, it, expect } from 'vitest';
import {
  solveLine,
  solvePuzzle,
  solveStep,
  createSolverBoard,
  type SolverCell,
  type SolverBoard,
} from './solver';
import type { LineClue, ClueRun, ColorId, ValidatedPuzzle } from '../types';
import { colorId } from '../types';
import {
  crossPuzzle,
  heartPuzzle,
  flagPuzzle,
} from '../puzzles/samples';
import {
  anchorPuzzle,
  catPuzzle,
  housePuzzle,
  skullPuzzle,
  treePuzzle,
  boatPuzzle,
  cherryPuzzle,
  flowerPuzzle,
  mushroomPuzzle,
  sunsetPuzzle,
} from '../puzzles/samples-15x15';
import {
  castlePuzzle,
  dogPuzzle,
  guitarPuzzle,
  lighthousePuzzle,
  rocketPuzzle,
  cactusPuzzle,
  cupcakePuzzle,
  parrotPuzzle,
  rainbowPuzzle,
  robotPuzzle,
} from '../puzzles/samples-20x20';

const B = colorId('black');
const run = (length: number, c: ColorId = B): ClueRun => ({ length, colorId: c });

// Helper to create a SolverCell array from a string pattern
// 'X' = filled (black), '.' = empty, '?' = unknown
function cells(pattern: string, color: ColorId = B): SolverCell[] {
  return pattern.split('').map((ch) => {
    if (ch === 'X') return color;
    if (ch === '.') return null;
    return 'unknown';
  });
}

// Helper to format SolverCell array for readable assertions
function fmt(arr: SolverCell[] | null): string | null {
  if (arr === null) return null;
  return arr
    .map((c) => {
      if (c === 'unknown') return '?';
      if (c === null) return '.';
      return 'X';
    })
    .join('');
}

describe('solveLine', () => {
  describe('B&W basics', () => {
    it('empty clue → all cells empty', () => {
      const result = solveLine([], cells('???'), true);
      expect(fmt(result)).toBe('...');
    });

    it('empty clue with already-empty cells', () => {
      const result = solveLine([], cells('...'), true);
      expect(fmt(result)).toBe('...');
    });

    it('empty clue contradicts filled cell', () => {
      const result = solveLine([], cells('?X?'), true);
      expect(result).toBeNull();
    });

    it('full-length single run → all filled', () => {
      const result = solveLine([run(5)], cells('?????'), true);
      expect(fmt(result)).toBe('XXXXX');
    });

    it('full-length single run with known fill', () => {
      const result = solveLine([run(5)], cells('??X??'), true);
      expect(fmt(result)).toBe('XXXXX');
    });

    it('single run in tight space → overlap', () => {
      // Line of 5, run of 3: leftmost 0-2, rightmost 2-4, overlap at cell 2
      const result = solveLine([run(3)], cells('?????'), true);
      expect(fmt(result)).toBe('??X??');
    });

    it('single run of 1 in line of 1', () => {
      const result = solveLine([run(1)], cells('?'), true);
      expect(fmt(result)).toBe('X');
    });

    it('single run of 1 in line of 3 — no deduction', () => {
      const result = solveLine([run(1)], cells('???'), true);
      expect(fmt(result)).toBe('???');
    });

    it('run forced by known empty cells', () => {
      // Line of 5, run of 2, cell 0 is empty → run is in 1-4
      // Overlap: leftmost 1-2, rightmost 3-4, no overlap — but cell 0 known empty
      const result = solveLine([run(2)], cells('.????'), true);
      expect(fmt(result)).toBe('.????');
      // No additional deduction possible
    });

    it('run forced by known filled cell', () => {
      // Line of 5, run of 2, cell 4 is filled → run must end at 4
      // Only valid: positions 3-4
      const result = solveLine([run(2)], cells('????X'), true);
      expect(fmt(result)).toBe('...XX');
    });

    it('two runs fill entire line', () => {
      // [2, 2] in line of 5: 2+1+2 = 5, exactly fits
      const result = solveLine([run(2), run(2)], cells('?????'), true);
      expect(fmt(result)).toBe('XX.XX');
    });

    it('two runs with overlap deduction', () => {
      // [3, 3] in line of 8: min = 3+1+3 = 7, so 1 slack
      // Run 0: leftmost 0-2, rightmost 1-3, overlap 1-2
      // Run 1: leftmost 4-6, rightmost 5-7, overlap 5-6
      const result = solveLine([run(3), run(3)], cells('????????'), true);
      expect(fmt(result)).toBe('?XX??XX?');
    });

    it('contradiction: runs exceed line length', () => {
      // [3, 3] in line of 5: needs 7 cells minimum
      const result = solveLine([run(3), run(3)], cells('?????'), true);
      expect(result).toBeNull();
    });

    it('contradiction: filled cell where must be empty', () => {
      // [5] in line of 5, but cell 2 is empty → can't place
      const result = solveLine([run(5)], cells('??..?'), true);
      expect(result).toBeNull();
    });
  });

  describe('B&W with partial state', () => {
    it('known fill restricts run position', () => {
      // [2] in line of 5, cell 0 filled → run at 0-1
      const result = solveLine([run(2)], cells('X????'), true);
      expect(fmt(result)).toBe('XX...');
    });

    it('known empty splits line', () => {
      // [1, 1] in line of 5, cell 2 empty → run 0 in 0-1, run 1 in 3-4
      const result = solveLine([run(1), run(1)], cells('??.??'), true);
      expect(fmt(result)).toBe('??.??');
    });

    it('preserves already-known cells', () => {
      const result = solveLine([run(3)], cells('.XXX.'), true);
      expect(fmt(result)).toBe('.XXX.');
    });
  });

  describe('color puzzles', () => {
    const R = colorId('red');
    const G = colorId('green');
    const colorRun = (length: number, c: ColorId): ClueRun => ({ length, colorId: c });

    it('different-color runs can be adjacent', () => {
      // [R:2, G:2] in line of 4: no gap needed between different colors
      const result = solveLine(
        [colorRun(2, R), colorRun(2, G)],
        cells('????'),
        false,
      );
      // Only valid placement: RR GG
      expect(result).not.toBeNull();
      expect(result![0]).toBe(R);
      expect(result![1]).toBe(R);
      expect(result![2]).toBe(G);
      expect(result![3]).toBe(G);
    });

    it('same-color runs need gap in color mode', () => {
      // [R:1, R:1] in line of 3: need gap between same color
      const result = solveLine(
        [colorRun(1, R), colorRun(1, R)],
        cells('???'),
        false,
      );
      expect(result).not.toBeNull();
      expect(result![0]).toBe(R);
      expect(result![1]).toBe(null);
      expect(result![2]).toBe(R);
    });

    it('color contradiction: different color in filled cell', () => {
      // [R:3] but cell 1 is green
      const input: SolverCell[] = ['unknown', G, 'unknown'];
      const result = solveLine([colorRun(3, R)], input, false);
      expect(result).toBeNull();
    });

    it('mixed color runs with partial state', () => {
      // [R:1, G:1, R:1] in line of 3: can touch, so R G R
      const result = solveLine(
        [colorRun(1, R), colorRun(1, G), colorRun(1, R)],
        cells('???'),
        false,
      );
      expect(result).not.toBeNull();
      expect(result![0]).toBe(R);
      expect(result![1]).toBe(G);
      expect(result![2]).toBe(R);
    });
  });

  describe('edge cases', () => {
    it('zero-length line with empty clue', () => {
      const result = solveLine([], [], true);
      expect(result).toEqual([]);
    });

    it('single cell, single run of 1', () => {
      const result = solveLine([run(1)], cells('?'), true);
      expect(fmt(result)).toBe('X');
    });

    it('already solved line unchanged', () => {
      const result = solveLine([run(2)], cells('XX...'), true);
      expect(fmt(result)).toBe('XX...');
    });

    it('large run overlap', () => {
      // Run of 9 in line of 10: overlap = 8 cells
      const result = solveLine([run(9)], cells('??????????'), true);
      expect(fmt(result)).toBe('?XXXXXXXX?');
    });
  });
});

describe('solvePuzzle', () => {
  it('solves the 5×5 cross puzzle', () => {
    const result = solvePuzzle(crossPuzzle);
    expect(result.solved).toBe(true);
    if (result.solved) {
      // Verify solution matches the puzzle's solution
      for (let r = 0; r < crossPuzzle.rows; r++) {
        for (let c = 0; c < crossPuzzle.cols; c++) {
          const expected = crossPuzzle.solution[r][c];
          expect(result.board[r][c]).toBe(expected);
        }
      }
    }
  });

  it('solves the 10×10 heart puzzle', () => {
    const result = solvePuzzle(heartPuzzle);
    expect(result.solved).toBe(true);
    if (result.solved) {
      for (let r = 0; r < heartPuzzle.rows; r++) {
        for (let c = 0; c < heartPuzzle.cols; c++) {
          const expected = heartPuzzle.solution[r][c];
          expect(result.board[r][c]).toBe(expected);
        }
      }
    }
  });

  it('solves the color flag puzzle', () => {
    const result = solvePuzzle(flagPuzzle);
    expect(result.solved).toBe(true);
    if (result.solved) {
      for (let r = 0; r < flagPuzzle.rows; r++) {
        for (let c = 0; c < flagPuzzle.cols; c++) {
          const expected = flagPuzzle.solution[r][c];
          expect(result.board[r][c]).toBe(expected);
        }
      }
    }
  });

  it('detects a puzzle that requires guessing', () => {
    // A 2×2 puzzle with ambiguous solution (checkerboard)
    // Clues: rows [1,1], [1,1]; cols [1,1], [1,1]
    // Two valid solutions: X./. X or .X/X. — needs guessing
    const ambiguous: ValidatedPuzzle = {
      id: 'ambiguous-2x2',
      name: 'Ambiguous',
      kind: 'bw',
      rows: 2,
      cols: 2,
      palette: [{ id: B, name: 'Black', value: '#000' }],
      solution: [
        [B, null],
        [null, B],
      ],
      rowClues: [[run(1)], [run(1)]],
      colClues: [[run(1)], [run(1)]],
      __validated: true,
    } as ValidatedPuzzle;

    const result = solvePuzzle(ambiguous);
    expect(result.solved).toBe(false);
    if (!result.solved) {
      expect(result.reason).toBe('stuck');
    }
  });
});

describe('solveStep', () => {
  it('finds first deducible step on empty board', () => {
    const board = createSolverBoard(crossPuzzle.rows, crossPuzzle.cols);
    const result = solveStep(crossPuzzle, board);
    expect(result.progress).toBe(true);
    if (result.progress) {
      expect(result.cells.length).toBeGreaterThan(0);
    }
  });

  it('returns no-progress on ambiguous board', () => {
    const ambiguous: ValidatedPuzzle = {
      id: 'ambiguous-2x2',
      name: 'Ambiguous',
      kind: 'bw',
      rows: 2,
      cols: 2,
      palette: [{ id: B, name: 'Black', value: '#000' }],
      solution: [
        [B, null],
        [null, B],
      ],
      rowClues: [[run(1)], [run(1)]],
      colClues: [[run(1)], [run(1)]],
      __validated: true,
    } as ValidatedPuzzle;

    const board = createSolverBoard(2, 2);
    const result = solveStep(ambiguous, board);
    expect(result.progress).toBe(false);
    if (!result.progress) {
      expect(result.reason).toBe('no-progress');
    }
  });

  it('detects contradiction on invalid board', () => {
    const board = createSolverBoard(crossPuzzle.rows, crossPuzzle.cols);
    // Fill a cell incorrectly — row 0 clue is [1,1] but we fill cell 0
    // which should be empty in the solution
    board[1][0] = null; // Row 1 clue is [5] — all filled. Setting cell 0 to empty is a contradiction.
    const result = solveStep(crossPuzzle, board);
    // Row 1 should detect contradiction since it can't fit [5] with cell 0 empty
    expect(result.progress).toBe(false);
    if (!result.progress) {
      expect(result.reason).toBe('contradiction');
    }
  });
});

describe('solvePuzzle — all sample puzzles', () => {
  // Note: cherry 15×15 is excluded — solver correctly identifies it as ambiguous
  // (4 cells have two valid placements). The clues don't uniquely determine the solution.
  const allPuzzles: [string, ValidatedPuzzle][] = [
    // 15×15 B&W
    ['anchor 15×15', anchorPuzzle],
    ['cat 15×15', catPuzzle],
    ['house 15×15', housePuzzle],
    ['skull 15×15', skullPuzzle],
    ['tree 15×15', treePuzzle],
    // 15×15 color (cherry excluded — ambiguous)
    ['boat 15×15 color', boatPuzzle],
    ['flower 15×15 color', flowerPuzzle],
    ['mushroom 15×15 color', mushroomPuzzle],
    ['sunset 15×15 color', sunsetPuzzle],
    // 20×20 B&W
    ['castle 20×20', castlePuzzle],
    ['dog 20×20', dogPuzzle],
    ['guitar 20×20', guitarPuzzle],
    ['lighthouse 20×20', lighthousePuzzle],
    ['rocket 20×20', rocketPuzzle],
    // 20×20 color
    ['cactus 20×20 color', cactusPuzzle],
    ['cupcake 20×20 color', cupcakePuzzle],
    ['parrot 20×20 color', parrotPuzzle],
    ['rainbow 20×20 color', rainbowPuzzle],
    ['robot 20×20 color', robotPuzzle],
  ];

  it.each(allPuzzles)('solves %s', (_name, puzzle) => {
    const result = solvePuzzle(puzzle);
    expect(result.solved).toBe(true);
    if (!result.solved) return;

    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        expect(result.board[r][c]).toBe(puzzle.solution[r][c]);
      }
    }
  });
});

describe('solvePuzzle — ambiguous puzzles', () => {
  it('correctly identifies cherry 15×15 as ambiguous', () => {
    const result = solvePuzzle(cherryPuzzle);
    expect(result.solved).toBe(false);
    if (!result.solved) {
      expect(result.reason).toBe('stuck');
    }
  });
});
