import { describe, it, expect } from 'vitest';
import type { ColorId, PuzzleDefinition } from '../../types';
import { colorId } from '../../types';
import { validatePuzzleDefinition } from '../../engine/validation';
import { solvePuzzle } from '../../engine/solver';
import { deriveClues } from './clue-derivation';
import { repairPuzzle } from './repair';

const B = colorId('black');
const R = colorId('red');
const G = colorId('green');

/** Build a validated puzzle from a solution grid. */
function makePuzzle(
  solution: (ColorId | null)[][],
  kind: 'bw' | 'color' = 'bw',
  palette = [{ id: B, name: 'Black', value: '#000000' }],
): ValidatedPuzzle {
  const { rowClues, colClues } = deriveClues(solution);
  const puzzle: PuzzleDefinition = {
    id: 'test-repair',
    name: 'Test',
    kind,
    rows: solution.length,
    cols: solution[0].length,
    palette,
    rowClues,
    colClues,
    solution,
  };
  const result = validatePuzzleDefinition(puzzle);
  if (Array.isArray(result)) throw new Error(`Invalid test puzzle: ${result[0].message}`);
  return result;
}

describe('repairPuzzle', () => {
  it('returns already-unique for a uniquely solvable puzzle', () => {
    // Simple cross — uniquely solvable
    // prettier-ignore
    const puzzle = makePuzzle([
      [null, null, B,    null, null],
      [null, null, B,    null, null],
      [B,    B,    B,    B,    B   ],
      [null, null, B,    null, null],
      [null, null, B,    null, null],
    ]);
    const result = repairPuzzle(puzzle);
    expect(result.success).toBe(true);
    expect(result.reason).toBe('already-unique');
    expect(result.changes.length).toBe(0);
  });

  it('repairs a known ambiguous B&W puzzle', () => {
    // 2×2 diagonal — ambiguous: [[B,null],[null,B]] vs [[null,B],[B,null]]
    // Both have row clues [[1],[1]] and col clues [[1],[1]]
    // prettier-ignore
    const puzzle = makePuzzle([
      [B, null],
      [null, B],
    ]);

    // Confirm it's ambiguous first
    const solverResult = solvePuzzle(puzzle);
    expect(solverResult.solved).toBe(false);

    const result = repairPuzzle(puzzle);
    expect(result.success).toBe(true);
    expect(result.puzzle).toBeDefined();
    expect(result.changes.length).toBeGreaterThan(0);

    // Verify the repaired puzzle is uniquely solvable
    if (result.puzzle) {
      const check = solvePuzzle(result.puzzle);
      expect(check.solved).toBe(true);
    }
  });

  it('repairs a 4×4 ambiguous puzzle', () => {
    // Symmetric pattern with ambiguous center
    // prettier-ignore
    const puzzle = makePuzzle([
      [B,    null, null, B   ],
      [null, B,    B,    null],
      [null, B,    B,    null],
      [B,    null, null, B   ],
    ]);

    const solverResult = solvePuzzle(puzzle);
    expect(solverResult.solved).toBe(false);

    const result = repairPuzzle(puzzle);
    expect(result.success).toBe(true);
    expect(result.changes.length).toBeLessThanOrEqual(4);
  });

  it('repairs a color puzzle with ambiguity', () => {
    // 2×2 color puzzle — red/green diagonal ambiguity
    const palette = [
      { id: R, name: 'Red', value: '#e53935' },
      { id: G, name: 'Green', value: '#43a047' },
    ];
    // prettier-ignore
    const puzzle = makePuzzle(
      [
        [R, G],
        [G, R],
      ],
      'color',
      palette,
    );

    const solverResult = solvePuzzle(puzzle);
    // This may or may not be ambiguous depending on color clue rules
    if (!solverResult.solved) {
      const result = repairPuzzle(puzzle);
      expect(result.success).toBe(true);
    }
  });

  it('handles non-stuck puzzles gracefully', () => {
    // Empty 2×2 — no filled cells, not ambiguous (it's trivially solvable)
    // prettier-ignore
    const puzzle = makePuzzle([
      [null, null],
      [null, null],
    ]);
    const result = repairPuzzle(puzzle);
    expect(result.success).toBe(true);
    expect(result.reason).toBe('already-unique');
  });

  it('respects iteration budget', () => {
    // 2×2 diagonal — ambiguous, but give it only 1 iteration (the initial check)
    // prettier-ignore
    const puzzle = makePuzzle([
      [B, null],
      [null, B],
    ]);

    const result = repairPuzzle(puzzle, { maxIterations: 1 });
    // With only 1 iteration (the initial solve), it can't try any edits
    expect(result.iterations).toBeLessThanOrEqual(1);
  });

  it('reports changes made during repair', () => {
    // prettier-ignore
    const puzzle = makePuzzle([
      [B, null],
      [null, B],
    ]);

    const result = repairPuzzle(puzzle);
    if (result.success) {
      for (const change of result.changes) {
        expect(change.row).toBeGreaterThanOrEqual(0);
        expect(change.col).toBeGreaterThanOrEqual(0);
        expect(change.from).not.toBe(change.to);
      }
    }
  });
});
