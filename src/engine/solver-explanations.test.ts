import { describe, it, expect } from 'vitest';
import { solveLineWithReasons, type LineWithReasons } from './solver-explanations';
import { getHint } from './solver';
import type { ClueRun, ColorId, PlayerCellState } from '../types';
import { colorId } from '../types';
import { crossPuzzle } from '../puzzles/samples';

const B = colorId('black');
const R = colorId('red');
const G = colorId('green');
const run = (length: number, c: ColorId = B): ClueRun => ({ length, colorId: c });

/** Helper to create a SolverCell array from a string pattern. */
function cells(pattern: string, color: ColorId = B) {
  return pattern.split('').map((ch) => {
    if (ch === 'X') return color;
    if (ch === '.') return null;
    return 'unknown' as const;
  });
}

/** Extract reason kinds from a LineWithReasons result. */
function reasonKinds(result: LineWithReasons): (string | undefined)[] {
  return result.reasons.map((r) => r?.kind);
}

describe('solveLineWithReasons', () => {
  describe('empty-cell reasons', () => {
    it('empty clue: all cells are unreachable', () => {
      const result = solveLineWithReasons([], cells('?????'), true)!;
      expect(result).not.toBeNull();
      expect(reasonKinds(result)).toEqual([
        'unreachable',
        'unreachable',
        'unreachable',
        'unreachable',
        'unreachable',
      ]);
    });

    it('unreachable: cells before first run and after last run', () => {
      // Clue [2] on 5 cells: run must be at positions 0-3
      // With cells "..?X?" the run is forced to positions 2-3 or 3-4
      // Actually let's use a clearer case:
      // Clue [1] on 5 cells, with cell 4 filled: run is at position 4
      // Cells 0-3 are unreachable
      const result = solveLineWithReasons([run(1)], cells('????X'), true)!;
      expect(result).not.toBeNull();
      // Cells 0-3 should be empty with unreachable reason
      for (let i = 0; i < 4; i++) {
        expect(result.reasons[i]?.kind).toBe('unreachable');
      }
    });

    it('forced-separator: cell between two same-color runs', () => {
      // Clue [1, 1] on 3 cells: must be X.X
      const result = solveLineWithReasons([run(1), run(1)], cells('???'), true)!;
      expect(result).not.toBeNull();
      // Cell 1 must be empty as separator
      expect(result.reasons[1]?.kind).toBe('forced-separator');
    });
  });

  describe('filled-cell reasons', () => {
    it('overlap: run overlaps at center cells', () => {
      // Clue [3] on 5 cells: run can be at 0-2, 1-3, or 2-4
      // Cells 2 is covered in ALL positions → overlap
      const result = solveLineWithReasons([run(3)], cells('?????'), true)!;
      expect(result).not.toBeNull();
      // Cell 2 is the only determined cell (overlap of all positions)
      expect(result.cells[2]).toBe(B);
      expect(result.reasons[2]?.kind).toBe('overlap');
    });

    it('single-placement: run has exactly one valid position', () => {
      // Clue [3] on 3 cells: only one position possible
      const result = solveLineWithReasons([run(3)], cells('???'), true)!;
      expect(result).not.toBeNull();
      for (let i = 0; i < 3; i++) {
        expect(result.reasons[i]?.kind).toBe('single-placement');
      }
    });

    it('overlap with partial state narrows run positions', () => {
      // Clue [4] on 5 cells: "?X???" — run must cover cell 1
      // Valid positions: 0-3, 1-4 → overlap at cells 2,3
      // Cell 1 is already known, so no reason for it
      const result = solveLineWithReasons([run(4)], cells('?X???'), true)!;
      expect(result).not.toBeNull();
      expect(result.cells[2]).toBe(B);
      expect(result.cells[3]).toBe(B);
      // Cell 1 already known — no reason. Cells 2,3 are newly determined.
      expect(result.reasons[1]).toBeUndefined();
      expect(result.reasons[2]?.kind).toBe('overlap');
      expect(result.reasons[3]?.kind).toBe('overlap');
    });
  });

  describe('mixed reasons in one line', () => {
    it('line with both overlap and unreachable', () => {
      // Clue [3] on 5 cells, cell 0 is empty: ".????"
      // Run can be at 1-3, 2-4 → overlap at cells 2,3
      // Cell 0 already empty (no reason needed), cell 4 can be empty
      const result = solveLineWithReasons([run(3)], cells('.????'), true)!;
      expect(result).not.toBeNull();
      // Cells 2,3 filled by overlap
      expect(result.reasons[2]?.kind).toBe('overlap');
      expect(result.reasons[3]?.kind).toBe('overlap');
    });
  });

  describe('color puzzles', () => {
    it('different color runs can be adjacent (no separator)', () => {
      // Clue [1(R), 1(G)] on 2 cells: R then G, no gap needed
      const result = solveLineWithReasons([run(1, R), run(1, G)], cells('??'), false)!;
      expect(result).not.toBeNull();
      expect(result.cells[0]).toBe(R);
      expect(result.cells[1]).toBe(G);
      expect(result.reasons[0]?.kind).toBe('single-placement');
      expect(result.reasons[1]?.kind).toBe('single-placement');
    });
  });

  it('returns null on contradiction', () => {
    // Clue [3] but cell 1 is empty — impossible
    const result = solveLineWithReasons([run(3)], cells('?.?'), true);
    expect(result).toBeNull();
  });

  it('does not classify already-known cells', () => {
    // All cells already determined — no reasons needed
    const result = solveLineWithReasons([run(3)], cells('XXX'), true)!;
    expect(result).not.toBeNull();
    expect(result.reasons.every((r) => r === undefined)).toBe(true);
  });
});

describe('getHint with explanations', () => {
  it('returns reasons on hint cells for cross puzzle', () => {
    const puzzle = crossPuzzle;
    const emptyBoard: PlayerCellState[][] = Array.from({ length: puzzle.rows }, () =>
      Array.from({ length: puzzle.cols }, () => ({ kind: 'unknown' as const })),
    );
    const result = getHint(puzzle, emptyBoard);
    expect(result.kind).toBe('hint');
    if (result.kind === 'hint') {
      // Every cell should have a reason
      for (const cell of result.cells) {
        expect(cell.reason).toBeDefined();
        expect([
          'overlap',
          'single-placement',
          'intersection',
          'unreachable',
          'forced-separator',
          'elimination',
        ]).toContain(cell.reason!.kind);
      }
    }
  });
});
