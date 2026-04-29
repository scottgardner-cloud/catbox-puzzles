import { useRef, useEffect, memo } from 'react';
import type { ValidatedPuzzle, PlayerCellState } from '../types';

/** Props for the {@link PuzzleThumbnail} component. */
export interface PuzzleThumbnailProps {
  /** The puzzle to render a preview for. */
  readonly puzzle: ValidatedPuzzle;
  /** Current puzzle status. */
  readonly status: 'new' | 'in-progress' | 'solved';
  /** Player's current board (for in-progress preview). */
  readonly playerBoard?: readonly (readonly PlayerCellState[])[];
  /** Canvas size in CSS pixels (default 64). */
  readonly size?: number;
}

const UNKNOWN_COLOR = '#e8e8e8';
const EMPTY_COLOR = '#ffffff';
const FALLBACK_COLOR = '#bdbdbd';

/**
 * Renders a puzzle preview thumbnail.
 *
 * - **New**: Question mark placeholder (no spoilers).
 * - **In Progress**: Canvas showing the player's current board state.
 * - **Solved**: Canvas showing the full-color solution image.
 */
export const PuzzleThumbnail = memo(function PuzzleThumbnail({
  puzzle,
  status,
  playerBoard,
  size = 64,
}: PuzzleThumbnailProps): React.JSX.Element {
  if (status === 'new' || (status === 'in-progress' && !playerBoard)) {
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

  if (status === 'in-progress' && playerBoard) {
    return <ProgressCanvas puzzle={puzzle} playerBoard={playerBoard} size={size} />;
  }

  return <SolvedCanvas puzzle={puzzle} size={size} />;
});

/** Build a color lookup from a puzzle palette. */
function buildColorMap(puzzle: ValidatedPuzzle): Map<string, string> {
  const map = new Map<string, string>();
  for (const color of puzzle.palette) {
    map.set(color.id as string, color.value);
  }
  return map;
}

/** Canvas rendering of a player's in-progress board. */
function ProgressCanvas({
  puzzle,
  playerBoard,
  size,
}: {
  readonly puzzle: ValidatedPuzzle;
  readonly playerBoard: readonly (readonly PlayerCellState[])[];
  readonly size: number;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { rows, cols } = puzzle;
  const colorMap = buildColorMap(puzzle);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = playerBoard[r][c];
        switch (cell.kind) {
          case 'filled':
            ctx.fillStyle = colorMap.get(cell.colorId as string) ?? FALLBACK_COLOR;
            break;
          case 'empty':
            ctx.fillStyle = EMPTY_COLOR;
            break;
          case 'unknown':
            ctx.fillStyle = UNKNOWN_COLOR;
            break;
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
      aria-label={`${puzzle.name} — in progress`}
    />
  );
}

/** Canvas rendering of a solved puzzle's solution. */
function SolvedCanvas({
  puzzle,
  size,
}: {
  readonly puzzle: ValidatedPuzzle;
  readonly size: number;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { rows, cols, solution } = puzzle;
  const colorMap = buildColorMap(puzzle);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = solution[r][c];
        ctx.fillStyle =
          cell === null ? EMPTY_COLOR : (colorMap.get(cell as string) ?? FALLBACK_COLOR);
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
