import { describe, it, expect } from 'vitest';
import { resizeToGrid, buildPuzzle, createPixelGrid } from './pipeline';
import type { GeneratorSettings } from './pipeline';

/**
 * Integration tests for the full generator pipeline.
 * Tests the complete flow: raw pixels → resize → build → ValidatedPuzzle.
 */
describe('Generator pipeline integration', () => {
  it('generates a valid B&W puzzle from a 6×6 checkerboard', () => {
    // 6×6 checkerboard: alternating black and white
    const data = new Uint8ClampedArray(6 * 6 * 4);
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const i = (r * 6 + c) * 4;
        const isWhite = (r + c) % 2 === 0;
        data[i] = isWhite ? 255 : 0;
        data[i + 1] = isWhite ? 255 : 0;
        data[i + 2] = isWhite ? 255 : 0;
        data[i + 3] = 255;
      }
    }
    const src = createPixelGrid(6, 6, data);

    // Resize 6×6 → 6×6 (no resize, just pass through)
    const grid = resizeToGrid(src, 6, 6);

    const settings: GeneratorSettings = {
      name: 'Checkerboard',
      kind: 'bw',
      targetRows: 6,
      targetCols: 6,
    };

    const result = buildPuzzle(grid, settings);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const puzzle = result.puzzle;
    expect(puzzle.name).toBe('Checkerboard');
    expect(puzzle.kind).toBe('bw');
    expect(puzzle.rows).toBe(6);
    expect(puzzle.cols).toBe(6);
    expect(puzzle.palette).toHaveLength(1);

    // Every row should have 3 filled cells (alternating)
    for (const rowClue of puzzle.rowClues) {
      const totalFilled = rowClue.reduce((sum, run) => sum + run.length, 0);
      expect(totalFilled).toBe(3);
    }
  });

  it('generates a valid color puzzle with transparent background', () => {
    // 4×4 image: transparent border, red center
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const i = (r * 4 + c) * 4;
        if (r >= 1 && r <= 2 && c >= 1 && c <= 2) {
          // Red center
          data[i] = 255;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255;
        } else {
          // Transparent border
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        }
      }
    }
    const src = createPixelGrid(4, 4, data);
    const grid = resizeToGrid(src, 4, 4);

    const settings: GeneratorSettings = {
      name: 'Red Square',
      kind: 'color',
      targetRows: 4,
      targetCols: 4,
      maxColors: 4,
      backgroundMode: { kind: 'alpha' },
    };

    const result = buildPuzzle(grid, settings);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const puzzle = result.puzzle;
    expect(puzzle.kind).toBe('color');
    // Center 2×2 should be filled, border should be empty
    expect(puzzle.solution[0].every((c) => c === null)).toBe(true);
    expect(puzzle.solution[3].every((c) => c === null)).toBe(true);
    expect(puzzle.solution[1][0]).toBeNull();
    expect(puzzle.solution[1][1]).not.toBeNull();
    expect(puzzle.solution[1][2]).not.toBeNull();
    expect(puzzle.solution[1][3]).toBeNull();
  });

  it('solid-color image in color mode with auto background produces valid puzzle', () => {
    // 10×10 solid red — should NOT fail with "all background"
    const data = new Uint8ClampedArray(10 * 10 * 4);
    for (let i = 0; i < 100; i++) {
      data[i * 4] = 255;
      data[i * 4 + 3] = 255;
    }
    const grid = createPixelGrid(10, 10, data);

    const settings: GeneratorSettings = {
      name: 'Solid Red',
      kind: 'color',
      targetRows: 10,
      targetCols: 10,
      maxColors: 4,
      backgroundMode: { kind: 'auto' },
    };

    const result = buildPuzzle(grid, settings);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.puzzle.palette.length).toBe(1);
  });

  it('handles resize + generate for a larger image downscaled to 5×5', () => {
    // 100×100 solid blue image → downscale to 5×5 B&W
    const data = new Uint8ClampedArray(100 * 100 * 4);
    for (let i = 0; i < 100 * 100; i++) {
      data[i * 4] = 0;
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 200;
      data[i * 4 + 3] = 255;
    }
    const src = createPixelGrid(100, 100, data);
    const grid = resizeToGrid(src, 5, 5);

    expect(grid.width).toBe(5);
    expect(grid.height).toBe(5);

    const settings: GeneratorSettings = {
      name: 'Blue Solid',
      kind: 'bw',
      targetRows: 5,
      targetCols: 5,
    };

    const result = buildPuzzle(grid, settings);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Blue is dark → all cells should be filled
    for (const row of result.puzzle.solution) {
      for (const cell of row) {
        expect(cell).not.toBeNull();
      }
    }
  });

  it('produces unique puzzle IDs across multiple generations', () => {
    const data = new Uint8ClampedArray(5 * 5 * 4).fill(255);
    // Make it opaque
    for (let i = 3; i < data.length; i += 4) data[i] = 255;
    const grid = createPixelGrid(5, 5, data);

    const settings: GeneratorSettings = {
      name: 'Test',
      kind: 'bw',
      targetRows: 5,
      targetCols: 5,
    };

    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const result = buildPuzzle(grid, settings);
      expect(result.ok).toBe(true);
      if (result.ok) ids.add(result.puzzle.id);
    }
    expect(ids.size).toBe(5);
  });
});
