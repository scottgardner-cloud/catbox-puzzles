import type { PixelGrid } from './types';
import { createPixelGrid } from './types';

/**
 * Resize an image to a target grid by averaging pixel colors within each cell.
 * Pure function — operates on raw RGBA data, no Canvas dependency.
 *
 * @param source - Source image pixel data
 * @param targetCols - Target grid columns (5–25)
 * @param targetRows - Target grid rows (5–25)
 * @returns A PixelGrid where each pixel represents one grid cell's averaged color
 */
export function resizeToGrid(
  source: PixelGrid,
  targetCols: number,
  targetRows: number,
): PixelGrid {
  if (targetCols < 1 || targetRows < 1) {
    throw new Error(`Target dimensions must be >= 1, got ${targetCols}×${targetRows}`);
  }

  const data = new Uint8ClampedArray(targetCols * targetRows * 4);

  const cellWidth = source.width / targetCols;
  const cellHeight = source.height / targetRows;

  for (let row = 0; row < targetRows; row++) {
    for (let col = 0; col < targetCols; col++) {
      const srcStartX = Math.floor(col * cellWidth);
      const srcEndX = Math.floor((col + 1) * cellWidth);
      const srcStartY = Math.floor(row * cellHeight);
      const srcEndY = Math.floor((row + 1) * cellHeight);

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;

      for (let sy = srcStartY; sy < srcEndY; sy++) {
        for (let sx = srcStartX; sx < srcEndX; sx++) {
          const si = (sy * source.width + sx) * 4;
          rSum += source.data[si];
          gSum += source.data[si + 1];
          bSum += source.data[si + 2];
          aSum += source.data[si + 3];
          count++;
        }
      }

      // Avoid division by zero for degenerate cases (source smaller than target)
      if (count === 0) count = 1;

      const di = (row * targetCols + col) * 4;
      data[di] = Math.round(rSum / count);
      data[di + 1] = Math.round(gSum / count);
      data[di + 2] = Math.round(bSum / count);
      data[di + 3] = Math.round(aSum / count);
    }
  }

  return createPixelGrid(targetCols, targetRows, data);
}
