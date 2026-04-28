import { describe, it, expect } from 'vitest';
import { quantizeBW } from './quantize-bw';
import { createPixelGrid } from './types';

describe('quantizeBW', () => {
  it('marks dark pixels as filled', () => {
    // 2×1: black, white
    const data = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    const grid = createPixelGrid(2, 1, data);
    const result = quantizeBW(grid);
    expect(result.cells[0]).toBe(true); // black = filled
    expect(result.cells[1]).toBe(false); // white = empty
  });

  it('respects custom threshold', () => {
    // Gray pixel (128, 128, 128)
    const data = new Uint8ClampedArray([128, 128, 128, 255]);
    const grid = createPixelGrid(1, 1, data);

    // Default threshold 128: gray(128,128,128) luminance ≈ 128 (boundary — exact behavior depends on float precision)
    // Threshold 200: clearly above gray → filled
    expect(quantizeBW(grid, 200).cells[0]).toBe(true);
    // Threshold 50: clearly below gray → empty
    expect(quantizeBW(grid, 50).cells[0]).toBe(false);
  });

  it('treats transparent pixels as empty', () => {
    // Black pixel but fully transparent
    const data = new Uint8ClampedArray([0, 0, 0, 0]);
    const grid = createPixelGrid(1, 1, data);
    expect(quantizeBW(grid).cells[0]).toBe(false);
  });

  it('uses luminance weighting (green contributes most)', () => {
    // Pure green (0, 255, 0) has luminance ~150, so with default threshold 128 → empty
    const greenData = new Uint8ClampedArray([0, 255, 0, 255]);
    const greenGrid = createPixelGrid(1, 1, greenData);
    expect(quantizeBW(greenGrid).cells[0]).toBe(false);

    // Pure blue (0, 0, 255) has luminance ~29, so with default threshold → filled
    const blueData = new Uint8ClampedArray([0, 0, 255, 255]);
    const blueGrid = createPixelGrid(1, 1, blueData);
    expect(quantizeBW(blueGrid).cells[0]).toBe(true);
  });

  it('handles a 3×3 cross pattern', () => {
    // White background with black cross
    const W = [255, 255, 255, 255]; // white
    const B = [0, 0, 0, 255]; // black
    const data = new Uint8ClampedArray([
      ...W, ...B, ...W, // row 0
      ...B, ...B, ...B, // row 1
      ...W, ...B, ...W, // row 2
    ]);
    const grid = createPixelGrid(3, 3, data);
    const result = quantizeBW(grid);
    expect(result.cells).toEqual([
      false, true, false,
      true, true, true,
      false, true, false,
    ]);
  });

  it('returns correct dimensions', () => {
    const data = new Uint8ClampedArray(5 * 3 * 4);
    const grid = createPixelGrid(5, 3, data);
    const result = quantizeBW(grid);
    expect(result.width).toBe(5);
    expect(result.height).toBe(3);
    expect(result.cells.length).toBe(15);
  });
});
