import { useRef, useEffect, memo } from 'react';
import type { ValidatedPuzzle } from '../types';

/** Props for the {@link PuzzleThumbnail} component. */
export interface PuzzleThumbnailProps {
  /** The puzzle to render a preview for. */
  readonly puzzle: ValidatedPuzzle;
  /** Whether the puzzle has been solved (shows full color vs placeholder). */
  readonly solved: boolean;
  /** Canvas size in CSS pixels (default 64). The canvas scales to fit. */
  readonly size?: number;
}

/**
 * Renders a puzzle preview thumbnail.
 *
 * - **Solved**: Canvas showing the full-color solution image.
 * - **Unsolved**: Question mark placeholder (no spoilers).
 *
 * Uses `image-rendering: pixelated` for crisp pixel art scaling on canvas.
 */
export const PuzzleThumbnail = memo(function PuzzleThumbnail({
  puzzle,
  solved,
  size = 64,
}: PuzzleThumbnailProps): React.JSX.Element {
  if (!solved) {
    return (
      <div
        className="pap-browser__thumbnail pap-browser__thumbnail--placeholder"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${puzzle.name} — not yet solved`}
      >
        ?
      </div>
    );
  }

  return <SolvedCanvas puzzle={puzzle} size={size} />;
});

/** Canvas rendering of a solved puzzle's solution. */
function SolvedCanvas({
  puzzle,
  size,
}: {
  readonly puzzle: ValidatedPuzzle;
  readonly size: number;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { rows, cols, solution, palette } = puzzle;

  const colorMap = new Map<string, string>();
  for (const color of palette) {
    colorMap.set(color.id as string, color.value);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = solution[r][c];
        ctx.fillStyle = cell === null ? '#ffffff' : (colorMap.get(cell as string) ?? '#bdbdbd');
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
}
