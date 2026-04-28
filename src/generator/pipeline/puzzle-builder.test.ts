import { describe, it, expect } from 'vitest';
import { buildPuzzle } from './puzzle-builder';
import { createPixelGrid } from './types';
import type { GeneratorSettings } from './types';

/** Create a 3×3 grid with a cross pattern (center row + center column filled black). */
function make3x3CrossPixels(): ReturnType<typeof createPixelGrid> {
  const W = [255, 255, 255, 255]; // white
  const B = [0, 0, 0, 255]; // black
  const data = new Uint8ClampedArray([
    ...W, ...B, ...W, // row 0
    ...B, ...B, ...B, // row 1
    ...W, ...B, ...W, // row 2
  ]);
  return createPixelGrid(3, 3, data);
}

describe('buildPuzzle', () => {
  it('builds a valid B&W puzzle from a cross pattern', () => {
    const grid = make3x3CrossPixels();
    const settings: GeneratorSettings = {
      name: 'Test Cross',
      kind: 'bw',
      targetRows: 3,
      targetCols: 3,
    };
    const result = buildPuzzle(grid, settings);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const puzzle = result.puzzle;
    expect(puzzle.name).toBe('Test Cross');
    expect(puzzle.kind).toBe('bw');
    expect(puzzle.rows).toBe(3);
    expect(puzzle.cols).toBe(3);
    expect(puzzle.palette).toHaveLength(1);

    // Verify solution matches cross pattern
    const fillId = puzzle.palette[0].id;
    expect(puzzle.solution[0]).toEqual([null, fillId, null]);
    expect(puzzle.solution[1]).toEqual([fillId, fillId, fillId]);
    expect(puzzle.solution[2]).toEqual([null, fillId, null]);
  });

  it('builds a valid color puzzle', () => {
    // 2×2: red, green, blue, yellow
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 0, 255,
    ]);
    const grid = createPixelGrid(2, 2, data);
    const settings: GeneratorSettings = {
      name: 'Test Color',
      kind: 'color',
      targetRows: 2,
      targetCols: 2,
      maxColors: 4,
      backgroundMode: { kind: 'none' },
    };
    const result = buildPuzzle(grid, settings);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.puzzle.kind).toBe('color');
    expect(result.puzzle.palette.length).toBeGreaterThanOrEqual(2);
  });

  it('returns error for dimension mismatch', () => {
    const grid = createPixelGrid(3, 3, new Uint8ClampedArray(3 * 3 * 4));
    const settings: GeneratorSettings = {
      name: 'Bad',
      kind: 'bw',
      targetRows: 5,
      targetCols: 5,
    };
    const result = buildPuzzle(grid, settings);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].message).toContain('dimensions');
  });

  it('returns error when all pixels are background (color mode)', () => {
    // All transparent
    const data = new Uint8ClampedArray(2 * 2 * 4); // all zeros = transparent
    const grid = createPixelGrid(2, 2, data);
    const settings: GeneratorSettings = {
      name: 'Empty',
      kind: 'color',
      targetRows: 2,
      targetCols: 2,
      backgroundMode: { kind: 'alpha' },
    };
    const result = buildPuzzle(grid, settings);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].message).toContain('background');
  });

  it('generates a unique puzzle ID', () => {
    const grid = make3x3CrossPixels();
    const settings: GeneratorSettings = {
      name: 'Test',
      kind: 'bw',
      targetRows: 3,
      targetCols: 3,
    };
    const r1 = buildPuzzle(grid, settings);
    const r2 = buildPuzzle(grid, settings);
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.puzzle.id).not.toBe(r2.puzzle.id);
  });

  it('handles B&W puzzle with all cells filled', () => {
    const data = new Uint8ClampedArray(2 * 2 * 4);
    // All black, opaque
    for (let i = 0; i < 4; i++) {
      data[i * 4 + 3] = 255; // alpha
    }
    const grid = createPixelGrid(2, 2, data);
    const settings: GeneratorSettings = {
      name: 'Full',
      kind: 'bw',
      targetRows: 2,
      targetCols: 2,
    };
    const result = buildPuzzle(grid, settings);
    expect(result.ok).toBe(true);
  });

  it('handles B&W puzzle with all cells empty', () => {
    const data = new Uint8ClampedArray(2 * 2 * 4);
    for (let i = 0; i < 4; i++) {
      data[i * 4] = 255;
      data[i * 4 + 1] = 255;
      data[i * 4 + 2] = 255;
      data[i * 4 + 3] = 255;
    }
    const grid = createPixelGrid(2, 2, data);
    const settings: GeneratorSettings = {
      name: 'Empty BW',
      kind: 'bw',
      targetRows: 2,
      targetCols: 2,
    };
    const result = buildPuzzle(grid, settings);
    expect(result.ok).toBe(true);
  });
});
