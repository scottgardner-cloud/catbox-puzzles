/**
 * Shared pixel grid types used across the generator pipeline.
 * All pipeline modules operate on these pure data types — no DOM/Canvas dependency.
 */

/** RGBA pixel data in a flat row-major buffer (matches ImageData.data layout). */
export interface PixelGrid {
  readonly width: number;
  readonly height: number;
  /** Row-major RGBA data. Length = width * height * 4. */
  readonly data: Uint8ClampedArray;
}

/** RGB color (no alpha). */
export interface RGBColor {
  readonly r: number; // 0–255
  readonly g: number; // 0–255
  readonly b: number; // 0–255
}

/** A B&W grid where each cell is filled (true) or empty (false). */
export interface BWGrid {
  readonly width: number;
  readonly height: number;
  /** Row-major. Length = width * height. */
  readonly cells: readonly boolean[];
}

/**
 * A color-quantized grid where each cell maps to a palette index, or null for background/empty.
 */
export interface ColorGrid {
  readonly width: number;
  readonly height: number;
  /** Row-major. Length = width * height. Index into palette, or null for empty. */
  readonly cells: readonly (number | null)[];
  /** Quantized palette of filled colors (does NOT include background). */
  readonly palette: readonly RGBColor[];
}

/**
 * How to detect background (empty) cells in color mode.
 * - `'alpha'`: pixels with alpha below threshold are empty (for transparent PNGs)
 * - `'color'`: pixels close to a specific color are empty
 * - `'auto'`: try alpha first, fall back to most-frequent-edge-color
 * - `'none'`: no background detection — all pixels are filled
 */
export type BackgroundMode =
  | { readonly kind: 'alpha'; readonly threshold?: number }
  | { readonly kind: 'color'; readonly color: RGBColor; readonly tolerance?: number }
  | { readonly kind: 'auto' }
  | { readonly kind: 'none' };

/** Settings for the puzzle generation pipeline. */
export interface GeneratorSettings {
  readonly name: string;
  readonly kind: 'bw' | 'color';
  readonly targetRows: number; // 10–35
  readonly targetCols: number; // 10–35
  /** B&W threshold (0–255). Pixels darker than this → filled. Default: 128. */
  readonly bwThreshold?: number;
  /** Max filled colors for color mode (2–8). Does not count background. Default: 4. */
  readonly maxColors?: number;
  /** Background detection mode for color mode. Default: { kind: 'auto' }. */
  readonly backgroundMode?: BackgroundMode;
}

// ── PixelGrid helpers ───────────────────────────────────────────────

/** Get the RGBA values for a pixel at (row, col). */
export function getPixel(
  grid: PixelGrid,
  row: number,
  col: number,
): { r: number; g: number; b: number; a: number } {
  const i = (row * grid.width + col) * 4;
  return { r: grid.data[i], g: grid.data[i + 1], b: grid.data[i + 2], a: grid.data[i + 3] };
}

/** Create a PixelGrid from dimensions and a flat RGBA buffer. */
export function createPixelGrid(width: number, height: number, data: Uint8ClampedArray): PixelGrid {
  if (data.length !== width * height * 4) {
    throw new Error(`PixelGrid data length ${data.length} !== expected ${width * height * 4}`);
  }
  return { width, height, data };
}
