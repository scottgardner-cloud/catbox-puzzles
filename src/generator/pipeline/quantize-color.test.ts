import { describe, it, expect } from 'vitest';
import { quantizeColor } from './quantize-color';
import { createPixelGrid } from './types';

describe('quantizeColor', () => {
  it('quantizes two distinct colors', () => {
    // 2×1: red, blue
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, // red
      0, 0, 255, 255, // blue
    ]);
    const grid = createPixelGrid(2, 1, data);
    const result = quantizeColor(grid, 2, { kind: 'none' });

    expect(result.palette.length).toBe(2);
    expect(result.cells.length).toBe(2);
    // Both should be assigned (not null)
    expect(result.cells[0]).not.toBeNull();
    expect(result.cells[1]).not.toBeNull();
    // Should map to different palette entries
    expect(result.cells[0]).not.toBe(result.cells[1]);
  });

  it('treats transparent pixels as background with alpha mode', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, // red, opaque
      0, 0, 255, 0, // blue, transparent
    ]);
    const grid = createPixelGrid(2, 1, data);
    const result = quantizeColor(grid, 4, { kind: 'alpha', threshold: 128 });

    expect(result.cells[0]).not.toBeNull(); // red = filled
    expect(result.cells[1]).toBeNull(); // transparent = background
    expect(result.palette.length).toBe(1); // only red in palette
  });

  it('detects background by color proximity', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, // red
      250, 252, 255, 255, // near-white
    ]);
    const grid = createPixelGrid(2, 1, data);
    const result = quantizeColor(grid, 4, {
      kind: 'color',
      color: { r: 255, g: 255, b: 255 },
      tolerance: 10,
    });

    expect(result.cells[0]).not.toBeNull();
    expect(result.cells[1]).toBeNull(); // near-white = background
  });

  it('respects maxColors limit', () => {
    // 4 pixels with 4 distinct colors, but maxColors = 2
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 0, 255,
    ]);
    const grid = createPixelGrid(4, 1, data);
    const result = quantizeColor(grid, 2, { kind: 'none' });

    expect(result.palette.length).toBe(2);
  });

  it('returns empty palette when all pixels are background', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 0, // transparent
      0, 0, 0, 0, // transparent
    ]);
    const grid = createPixelGrid(2, 1, data);
    const result = quantizeColor(grid, 4, { kind: 'alpha' });

    expect(result.palette.length).toBe(0);
    expect(result.cells[0]).toBeNull();
    expect(result.cells[1]).toBeNull();
  });

  it('sorts palette deterministically by luminance', () => {
    // Blue (low lum) and yellow (high lum)
    const data = new Uint8ClampedArray([
      255, 255, 0, 255, // yellow (high luminance)
      0, 0, 255, 255, // blue (low luminance)
    ]);
    const grid = createPixelGrid(2, 1, data);
    const result = quantizeColor(grid, 2, { kind: 'none' });

    // Palette should be sorted: blue (low lum) first, yellow (high lum) second
    const lum0 = 0.299 * result.palette[0].r + 0.587 * result.palette[0].g + 0.114 * result.palette[0].b;
    const lum1 = 0.299 * result.palette[1].r + 0.587 * result.palette[1].g + 0.114 * result.palette[1].b;
    expect(lum0).toBeLessThan(lum1);
  });

  it('handles single-pixel image', () => {
    const data = new Uint8ClampedArray([128, 64, 32, 255]);
    const grid = createPixelGrid(1, 1, data);
    const result = quantizeColor(grid, 4, { kind: 'none' });

    expect(result.palette.length).toBe(1);
    expect(result.cells[0]).toBe(0);
  });

  it('deduplicates palette for uniform-color image', () => {
    // 4 identical red pixels with maxColors=4 — should not produce duplicates
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
    ]);
    const grid = createPixelGrid(4, 1, data);
    const result = quantizeColor(grid, 4, { kind: 'none' });

    expect(result.palette.length).toBe(1); // deduplicated to 1
    expect(result.cells.every((c) => c === 0)).toBe(true);
  });

  it('deduplicates palette when maxColors exceeds unique colors', () => {
    // 2 colors but maxColors=8
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 0, 255, 255,
      0, 0, 255, 255,
    ]);
    const grid = createPixelGrid(4, 1, data);
    const result = quantizeColor(grid, 8, { kind: 'none' });

    expect(result.palette.length).toBe(2);
  });

  it('auto mode ignores single stray transparent pixel and uses edge-color detection', () => {
    // 10 pixels: 8 opaque white (edge bg), 1 transparent, 1 red (content)
    // Auto mode should NOT use alpha (only 1/10 = 10%, not > 10%)
    // Should detect white as edge background instead
    const data = new Uint8ClampedArray(10 * 1 * 4);
    for (let i = 0; i < 10; i++) {
      const pi = i * 4;
      data[pi] = 255; data[pi + 1] = 255; data[pi + 2] = 255; data[pi + 3] = 255;
    }
    data[4 * 4 + 3] = 0; // pixel 4 transparent
    // Make pixel 5 red (the content)
    data[5 * 4] = 255; data[5 * 4 + 1] = 0; data[5 * 4 + 2] = 0;

    const grid = createPixelGrid(10, 1, data);
    const result = quantizeColor(grid, 4, { kind: 'auto' });

    // Should have detected white as edge background → only the red pixel is filled
    // The transparent pixel's RGB is (255,255,255) so it's also background in color mode
    const filledCount = result.cells.filter((c) => c !== null).length;
    expect(filledCount).toBe(1); // only the red pixel
    expect(result.palette.length).toBe(1);
  });

  it('auto mode detects transparency', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, // opaque red
      0, 255, 0, 0, // transparent green
    ]);
    const grid = createPixelGrid(2, 1, data);
    const result = quantizeColor(grid, 4, { kind: 'auto' });

    expect(result.cells[0]).not.toBeNull();
    expect(result.cells[1]).toBeNull();
  });
});
