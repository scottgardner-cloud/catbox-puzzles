import { describe, it, expect } from 'vitest';
import { resizeToGrid } from './resize';
import { createPixelGrid } from './types';

/** Helper: create a solid-color PixelGrid. */
function solidGrid(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a: number = 255,
): ReturnType<typeof createPixelGrid> {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return createPixelGrid(width, height, data);
}

describe('resizeToGrid', () => {
  it('returns same pixels when source matches target size', () => {
    const src = solidGrid(3, 3, 100, 150, 200);
    const result = resizeToGrid(src, 3, 3);
    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
    // Every pixel should be the same color
    for (let i = 0; i < 9; i++) {
      expect(result.data[i * 4]).toBe(100);
      expect(result.data[i * 4 + 1]).toBe(150);
      expect(result.data[i * 4 + 2]).toBe(200);
      expect(result.data[i * 4 + 3]).toBe(255);
    }
  });

  it('averages 2×2 blocks into 1×1', () => {
    // 2×2 grid: TL=black, TR=white, BL=white, BR=black → average = gray
    const data = new Uint8ClampedArray([
      0,
      0,
      0,
      255,
      255,
      255,
      255,
      255, // row 0
      255,
      255,
      255,
      255,
      0,
      0,
      0,
      255, // row 1
    ]);
    const src = createPixelGrid(2, 2, data);
    const result = resizeToGrid(src, 1, 1);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    // Average of (0+255+255+0)/4 = 127.5 → 128
    expect(result.data[0]).toBe(128);
    expect(result.data[1]).toBe(128);
    expect(result.data[2]).toBe(128);
  });

  it('downscales 4×4 to 2×2', () => {
    // 4×4 grid with 4 quadrants of different colors
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const i = (r * 4 + c) * 4;
        const isTop = r < 2;
        const isLeft = c < 2;
        if (isTop && isLeft) {
          data[i] = 255;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255; // red
        } else if (isTop && !isLeft) {
          data[i] = 0;
          data[i + 1] = 255;
          data[i + 2] = 0;
          data[i + 3] = 255; // green
        } else if (!isTop && isLeft) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 255;
          data[i + 3] = 255; // blue
        } else {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 0;
          data[i + 3] = 255; // yellow
        }
      }
    }
    const src = createPixelGrid(4, 4, data);
    const result = resizeToGrid(src, 2, 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    // Top-left should be red
    expect(result.data[0]).toBe(255);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
    // Top-right should be green
    expect(result.data[4]).toBe(0);
    expect(result.data[5]).toBe(255);
    expect(result.data[6]).toBe(0);
  });

  it('preserves alpha in averaging', () => {
    const data = new Uint8ClampedArray([
      100,
      100,
      100,
      0,
      100,
      100,
      100,
      255, // row 0: transparent + opaque
      100,
      100,
      100,
      0,
      100,
      100,
      100,
      255, // row 1
    ]);
    const src = createPixelGrid(2, 2, data);
    const result = resizeToGrid(src, 1, 1);
    // Alpha average: (0+255+0+255)/4 = 127.5 → 128
    expect(result.data[3]).toBe(128);
  });

  it('handles 1×1 source to 1×1 target', () => {
    const src = solidGrid(1, 1, 42, 84, 126);
    const result = resizeToGrid(src, 1, 1);
    expect(result.data[0]).toBe(42);
    expect(result.data[1]).toBe(84);
    expect(result.data[2]).toBe(126);
  });

  it('throws for invalid target dimensions', () => {
    const src = solidGrid(2, 2, 0, 0, 0);
    expect(() => resizeToGrid(src, 0, 5)).toThrow();
    expect(() => resizeToGrid(src, 5, 0)).toThrow();
  });

  it('upscales 1×1 to 2×2 by replicating the source pixel', () => {
    const src = solidGrid(1, 1, 42, 84, 126);
    const result = resizeToGrid(src, 2, 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    for (let i = 0; i < 4; i++) {
      expect(result.data[i * 4]).toBe(42);
      expect(result.data[i * 4 + 1]).toBe(84);
      expect(result.data[i * 4 + 2]).toBe(126);
      expect(result.data[i * 4 + 3]).toBe(255);
    }
  });

  it('handles non-integer downscale ratio (3×1 to 2×1)', () => {
    // 3 pixels: red, green, blue
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]);
    const src = createPixelGrid(3, 1, data);
    const result = resizeToGrid(src, 2, 1);
    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
    // Should produce two valid colors (not black/transparent)
    expect(result.data[3]).toBe(255); // alpha
    expect(result.data[7]).toBe(255);
  });
});
