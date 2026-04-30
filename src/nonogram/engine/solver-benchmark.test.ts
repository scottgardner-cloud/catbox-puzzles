import { describe, it, expect } from 'vitest';
import type { ColorId, PuzzleDefinition } from '../types';
import { colorId } from '../types';
import { validatePuzzleDefinition } from '../engine/validation';
import { solvePuzzle } from '../engine/solver';
import { deriveClues } from '../generator/pipeline/clue-derivation';
import { getSamplePuzzles } from '../puzzles/samples';

// ── Helpers ──────────────────────────────────────────────────────────

const B = colorId('black');
const R = colorId('red');
const G = colorId('green');

/** Generate a diagonal stripe B&W pattern that's uniquely solvable. */
function generateDiagonalPuzzle(size: number): PuzzleDefinition {
  const solution: (ColorId | null)[][] = [];
  for (let r = 0; r < size; r++) {
    const row: (ColorId | null)[] = [];
    for (let c = 0; c < size; c++) {
      // Diagonal stripes: filled when (r + c) % 3 !== 0
      row.push((r + c) % 3 !== 0 ? B : null);
    }
    solution.push(row);
  }
  const { rowClues, colClues } = deriveClues(solution);
  return {
    id: `bench-diagonal-${size}`,
    name: `Bench Diagonal ${size}`,
    kind: 'bw',
    rows: size,
    cols: size,
    palette: [{ id: B, name: 'Black', value: '#000000' }],
    rowClues,
    colClues,
    solution,
  };
}

/** Generate a simple 2-color checkerboard-like pattern. */
function generateColorPuzzle(size: number): PuzzleDefinition {
  const solution: (ColorId | null)[][] = [];
  for (let r = 0; r < size; r++) {
    const row: (ColorId | null)[] = [];
    for (let c = 0; c < size; c++) {
      if ((r + c) % 4 === 0) row.push(null);
      else if ((r + c) % 2 === 0) row.push(R);
      else row.push(G);
    }
    solution.push(row);
  }
  const { rowClues, colClues } = deriveClues(solution);
  return {
    id: `bench-color-${size}`,
    name: `Bench Color ${size}`,
    kind: 'color',
    rows: size,
    cols: size,
    palette: [
      { id: R, name: 'Red', value: '#e53935' },
      { id: G, name: 'Green', value: '#43a047' },
    ],
    rowClues,
    colClues,
    solution,
  };
}

function benchmarkSolve(puzzle: PuzzleDefinition): { timeMs: number; solved: boolean } {
  const validated = validatePuzzleDefinition(puzzle);
  if (Array.isArray(validated)) {
    return { timeMs: 0, solved: false };
  }
  const start = performance.now();
  const result = solvePuzzle(validated);
  const timeMs = performance.now() - start;
  return { timeMs, solved: result.solved };
}

// ── Benchmarks ───────────────────────────────────────────────────────

describe('solver performance benchmarks', () => {
  const BW_SIZES = [5, 10, 15, 20, 25, 30, 35];
  const COLOR_SIZES = [5, 10, 15, 20];

  describe('B&W diagonal pattern', () => {
    it.each(BW_SIZES)('solves %d×%d B&W', (size) => {
      const puzzle = generateDiagonalPuzzle(size);
      const { timeMs, solved } = benchmarkSolve(puzzle);
      console.log(
        `  B&W ${size}×${size}: ${timeMs.toFixed(1)}ms (${solved ? 'solved' : 'FAILED'})`,
      );
      expect(solved).toBe(true);
      // Budget: 30 seconds max for any size
      expect(timeMs).toBeLessThan(30_000);
    });
  });

  describe('color pattern', () => {
    it.each(COLOR_SIZES)('solves %d×%d color', (size) => {
      const puzzle = generateColorPuzzle(size);
      const { timeMs, solved } = benchmarkSolve(puzzle);
      console.log(
        `  Color ${size}×${size}: ${timeMs.toFixed(1)}ms (${solved ? 'solved' : 'FAILED'})`,
      );
      expect(solved).toBe(true);
      expect(timeMs).toBeLessThan(30_000);
    });
  });

  describe('built-in sample puzzles', () => {
    it('solves all samples within budget', () => {
      const samples = getSamplePuzzles();
      const results: { name: string; timeMs: number; solved: boolean }[] = [];

      for (const puzzle of samples) {
        const start = performance.now();
        const result = solvePuzzle(puzzle);
        const timeMs = performance.now() - start;
        results.push({ name: puzzle.name, timeMs, solved: result.solved });
      }

      // Print timing table
      console.log('\n  Sample puzzle solve times:');
      console.log('  ' + '-'.repeat(50));
      for (const r of results.sort((a, b) => b.timeMs - a.timeMs)) {
        const status = r.solved ? '✓' : '✗';
        console.log(`  ${status} ${r.name.padEnd(30)} ${r.timeMs.toFixed(1)}ms`);
      }
      console.log('  ' + '-'.repeat(50));

      // Cherry is expected to be ambiguous (not solved)
      const nonCherry = results.filter((r) => !r.name.includes('Cherry'));
      for (const r of nonCherry) {
        expect(r.solved).toBe(true);
        expect(r.timeMs).toBeLessThan(30_000);
      }
    });
  });
});
