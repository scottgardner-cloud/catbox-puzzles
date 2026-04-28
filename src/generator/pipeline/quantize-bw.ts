import type { PixelGrid, BWGrid } from './types';

/**
 * Convert a PixelGrid to B&W by grayscale conversion + threshold.
 *
 * Grayscale uses standard luminance weights (ITU-R BT.601):
 *   gray = 0.299*R + 0.587*G + 0.114*B
 *
 * Pixels with alpha below 128 are treated as empty (above threshold → not filled).
 * Pixels darker than threshold → filled (true). Lighter → empty (false).
 *
 * @param grid - Source pixel grid
 * @param threshold - Brightness threshold 0–255 (default: 128). Lower = more filled cells.
 */
export function quantizeBW(grid: PixelGrid, threshold: number = 128): BWGrid {
  const cells: boolean[] = new Array(grid.width * grid.height);

  for (let i = 0; i < grid.width * grid.height; i++) {
    const pi = i * 4;
    const r = grid.data[pi];
    const g = grid.data[pi + 1];
    const b = grid.data[pi + 2];
    const a = grid.data[pi + 3];

    // Transparent pixels are empty
    if (a < 128) {
      cells[i] = false;
      continue;
    }

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    cells[i] = gray < threshold;
  }

  return { width: grid.width, height: grid.height, cells };
}
