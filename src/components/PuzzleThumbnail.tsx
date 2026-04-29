import { useRef, useEffect, memo } from 'react';
import type { ValidatedPuzzle } from '../types';

/** Props for the {@link PuzzleThumbnail} component. */
export interface PuzzleThumbnailProps {
  /** The puzzle to render a preview for. */
  readonly puzzle: ValidatedPuzzle;
  /** Whether the puzzle has been solved (shows full color vs gray silhouette). */
  readonly solved: boolean;
  /** Canvas size in CSS pixels (default 64). The canvas scales to fit. */
  readonly size?: number;
}

const SILHOUETTE_COLOR = '#bdbdbd';
const EMPTY_COLOR = '#ffffff';

/**
 * Renders a small canvas preview of a puzzle's solution.
 *
 * - **Solved**: Shows the full-color solution image.
 * - **Unsolved**: Shows a gray silhouette (filled cells in gray, empty cells white).
 *
 * Uses `image-rendering: pixelated` for crisp pixel art scaling.
 */
export const PuzzleThumbnail = memo(function PuzzleThumbnail({
  puzzle,
  solved,
  size = 64,
}: PuzzleThumbnailProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { rows, cols, solution, palette } = puzzle;

  // Build a color lookup from the palette
  const colorMap = new Map<string, string>();
  for (const color of palette) {
    colorMap.set(color.id as string, color.value);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw each cell as a single pixel (canvas is rows×cols, CSS scales it)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = solution[r][c];
        if (cell === null) {
          ctx.fillStyle = EMPTY_COLOR;
        } else if (solved) {
          ctx.fillStyle = colorMap.get(cell as string) ?? SILHOUETTE_COLOR;
        } else {
          ctx.fillStyle = SILHOUETTE_COLOR;
        }
        ctx.fillRect(c, r, 1, 1);
      }
    }
  });

  return (
    <canvas
      ref={canvasRef}
      width={cols}
      height={rows}
      className="pap-browser__thumbnail"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${puzzle.name} preview`}
    />
  );
});
