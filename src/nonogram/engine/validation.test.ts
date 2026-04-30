import { describe, it, expect } from 'vitest';
import {
  validatePuzzleDefinition,
  validatePuzzleUniqueness,
  type ValidationError,
} from './validation';
import type { PuzzleDefinition, ClueRun, ValidatedPuzzle } from '../types';
import { colorId } from '../types';
import { crossPuzzle, heartPuzzle } from '../puzzles/samples';
import { cherryPuzzle } from '../puzzles/samples-15x15';

const B = colorId('black');
const run = (length: number, c = B): ClueRun => ({ length, colorId: c });

/** Minimal valid 3×3 B&W puzzle (diagonal). */
function make3x3BW(): PuzzleDefinition {
  return {
    id: 'test-3x3',
    name: 'Test',
    kind: 'bw',
    rows: 3,
    cols: 3,
    palette: [{ id: B, name: 'Black', value: '#000' }],
    solution: [
      [B, null, null],
      [null, B, null],
      [null, null, B],
    ],
    rowClues: [[run(1)], [run(1)], [run(1)]],
    colClues: [[run(1)], [run(1)], [run(1)]],
  };
}

function expectErrors(result: ReturnType<typeof validatePuzzleDefinition>): ValidationError[] {
  expect(Array.isArray(result)).toBe(true);
  return result as ValidationError[];
}

describe('validatePuzzleDefinition', () => {
  describe('valid puzzles', () => {
    it('accepts a valid B&W puzzle (sample cross)', () => {
      // crossPuzzle was validated at module load; re-validate to confirm
      const result = validatePuzzleDefinition(crossPuzzle);
      expect(Array.isArray(result)).toBe(false);
      expect((result as ValidatedPuzzle).id).toBe(crossPuzzle.id);
    });

    it('accepts a valid B&W puzzle (sample heart)', () => {
      const result = validatePuzzleDefinition(heartPuzzle);
      expect(Array.isArray(result)).toBe(false);
      expect((result as ValidatedPuzzle).id).toBe(heartPuzzle.id);
    });

    it('accepts a minimal 3×3 B&W puzzle', () => {
      const result = validatePuzzleDefinition(make3x3BW());
      expect(Array.isArray(result)).toBe(false);
    });

    it('accepts a valid color puzzle', () => {
      const red = colorId('red');
      const blue = colorId('blue');
      const puzzle: PuzzleDefinition = {
        id: 'color-2x2',
        name: 'Color Test',
        kind: 'color',
        rows: 2,
        cols: 2,
        palette: [
          { id: red, name: 'Red', value: '#f00' },
          { id: blue, name: 'Blue', value: '#00f' },
        ],
        solution: [
          [red, blue],
          [blue, red],
        ],
        rowClues: [
          [
            { length: 1, colorId: red },
            { length: 1, colorId: blue },
          ],
          [
            { length: 1, colorId: blue },
            { length: 1, colorId: red },
          ],
        ],
        colClues: [
          [
            { length: 1, colorId: red },
            { length: 1, colorId: blue },
          ],
          [
            { length: 1, colorId: blue },
            { length: 1, colorId: red },
          ],
        ],
      };
      const result = validatePuzzleDefinition(puzzle);
      expect(Array.isArray(result)).toBe(false);
    });
  });

  describe('palette errors', () => {
    it('rejects empty palette', () => {
      const puzzle = { ...make3x3BW(), palette: [] };
      const errors = expectErrors(validatePuzzleDefinition(puzzle));
      expect(errors.some((e) => e.message.includes('at least one color'))).toBe(true);
    });

    it('rejects duplicate palette color IDs', () => {
      const puzzle: PuzzleDefinition = {
        ...make3x3BW(),
        kind: 'color',
        palette: [
          { id: B, name: 'Black', value: '#000' },
          { id: B, name: 'Also Black', value: '#111' },
        ],
      };
      const errors = expectErrors(validatePuzzleDefinition(puzzle));
      expect(errors.some((e) => e.message.includes('duplicate color IDs'))).toBe(true);
    });

    it('rejects B&W puzzle with multiple colors', () => {
      const red = colorId('red');
      const puzzle = {
        ...make3x3BW(),
        palette: [
          { id: B, name: 'Black', value: '#000' },
          { id: red, name: 'Red', value: '#f00' },
        ],
      };
      const errors = expectErrors(validatePuzzleDefinition(puzzle));
      expect(errors.some((e) => e.message.includes('exactly 1 palette color'))).toBe(true);
    });
  });

  describe('dimension mismatches', () => {
    it('rejects row clue count mismatch', () => {
      const puzzle = { ...make3x3BW(), rowClues: [[run(1)], [run(1)]] };
      const errors = expectErrors(validatePuzzleDefinition(puzzle));
      expect(errors.some((e) => e.message.includes('rowClues.length'))).toBe(true);
    });

    it('rejects column clue count mismatch', () => {
      const puzzle = { ...make3x3BW(), colClues: [[run(1)], [run(1)]] };
      const errors = expectErrors(validatePuzzleDefinition(puzzle));
      expect(errors.some((e) => e.message.includes('colClues.length'))).toBe(true);
    });

    it('rejects solution row length mismatch', () => {
      const puzzle: PuzzleDefinition = {
        ...make3x3BW(),
        solution: [
          [B, null], // too short
          [null, B, null],
          [null, null, B],
        ],
      };
      const errors = expectErrors(validatePuzzleDefinition(puzzle));
      expect(errors.some((e) => e.message.includes('solution[0].length'))).toBe(true);
    });
  });

  describe('clue validation', () => {
    it('rejects clue that does not match solution', () => {
      const puzzle: PuzzleDefinition = {
        ...make3x3BW(),
        rowClues: [[run(2)], [run(1)], [run(1)]], // row 0 says 2 but solution has 1
      };
      const errors = expectErrors(validatePuzzleDefinition(puzzle));
      expect(errors.some((e) => e.message.includes('rowClues[0] does not match'))).toBe(true);
    });

    it('rejects clue referencing unknown color', () => {
      const unknown = colorId('purple');
      const puzzle: PuzzleDefinition = {
        ...make3x3BW(),
        rowClues: [[{ length: 1, colorId: unknown }], [run(1)], [run(1)]],
      };
      const errors = expectErrors(validatePuzzleDefinition(puzzle));
      expect(errors.some((e) => e.message.includes('not in palette'))).toBe(true);
    });

    it('rejects clue run with length 0', () => {
      const puzzle: PuzzleDefinition = {
        ...make3x3BW(),
        rowClues: [[{ length: 0, colorId: B }], [run(1)], [run(1)]],
      };
      const errors = expectErrors(validatePuzzleDefinition(puzzle));
      expect(errors.some((e) => e.message.includes('must be >= 1'))).toBe(true);
    });

    it('rejects clue runs that exceed line length', () => {
      const puzzle: PuzzleDefinition = {
        ...make3x3BW(),
        rowClues: [[run(2), run(2)], [run(1)], [run(1)]],
        // Row 0 needs min 5 cells (2+1+2) but only 3 cols available
      };
      const errors = expectErrors(validatePuzzleDefinition(puzzle));
      expect(errors.some((e) => e.message.includes('exceed'))).toBe(true);
    });
  });
});

describe('validatePuzzleUniqueness', () => {
  it('accepts a uniquely solvable puzzle', () => {
    const result = validatePuzzleUniqueness(crossPuzzle);
    expect(Array.isArray(result)).toBe(false);
  });

  it('accepts the heart puzzle as unique', () => {
    const result = validatePuzzleUniqueness(heartPuzzle);
    expect(Array.isArray(result)).toBe(false);
  });

  it('accepts cherry 15×15 as uniquely solvable (fixed in S5)', () => {
    const result = validatePuzzleUniqueness(cherryPuzzle);
    expect(Array.isArray(result)).toBe(false);
  });

  it('rejects a puzzle with ambiguous 2×2 checkerboard clues', () => {
    // Clues [1],[1] / [1],[1] on a 2×2 grid have two solutions
    const ambiguous = validatePuzzleDefinition({
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
    });
    expect(Array.isArray(ambiguous)).toBe(false); // Structurally valid

    const uniqueness = validatePuzzleUniqueness(ambiguous as ValidatedPuzzle);
    expect(Array.isArray(uniqueness)).toBe(true);
    const errors = uniqueness as ValidationError[];
    expect(errors[0].message).toContain('ambiguous');
  });

  it('respects maxNodes budget', () => {
    const result = validatePuzzleUniqueness(crossPuzzle, { maxNodes: 10_000 });
    expect(Array.isArray(result)).toBe(false);
  });
});
