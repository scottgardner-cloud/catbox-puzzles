import { useMemo } from 'react';
import { hasSave, loadGame, restoreGameState } from '../state/persistence';
import { isSolved } from '../engine';
import type { ValidatedPuzzle } from '../types';
import './PuzzleBrowser.css';

/** Progress status for a puzzle. */
type PuzzleStatus = 'new' | 'in-progress' | 'solved';

/** Props for the {@link PuzzleBrowser} component. */
export interface PuzzleBrowserProps {
  /** Available puzzles to display. */
  readonly puzzles: readonly ValidatedPuzzle[];
  /** Called when the player selects a puzzle, with its index in the array. */
  readonly onSelectPuzzle: (index: number) => void;
}

/** Determine progress status for a single puzzle. Safe against corrupt saves. */
function getPuzzleStatus(puzzle: ValidatedPuzzle): PuzzleStatus {
  try {
    if (!hasSave(puzzle.id)) return 'new';
    const save = loadGame(puzzle.id);
    if (!save) return 'new';
    const state = restoreGameState(save, puzzle.rows, puzzle.cols);
    return isSolved(state, puzzle) ? 'solved' : 'in-progress';
  } catch {
    return 'new';
  }
}

/**
 * A puzzle selection screen that displays puzzle cards in a responsive grid.
 *
 * Shows puzzle name, dimensions, type (B&W / Color), and progress status
 * (New, In Progress, Solved) for each available puzzle.
 */
export function PuzzleBrowser({ puzzles, onSelectPuzzle }: PuzzleBrowserProps): React.JSX.Element {
  const statuses = useMemo(() => puzzles.map(getPuzzleStatus), [puzzles]);

  return (
    <div className="pap-browser">
      <div className="pap-browser__grid" role="list">
        {puzzles.map((puzzle, index) => {
          const status = statuses[index];
          const cardClass = [
            'pap-browser__card',
            status === 'in-progress' && 'pap-browser__card--in-progress',
            status === 'solved' && 'pap-browser__card--solved',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={puzzle.id}
              type="button"
              className={cardClass}
              role="listitem"
              onClick={() => onSelectPuzzle(index)}
            >
              <p className="pap-browser__card-name">{puzzle.name}</p>
              <div className="pap-browser__card-meta">
                <span className="pap-browser__badge pap-browser__badge--size">
                  {puzzle.rows}×{puzzle.cols}
                </span>
                <span
                  className={`pap-browser__badge ${
                    puzzle.kind === 'bw' ? 'pap-browser__badge--bw' : 'pap-browser__badge--color'
                  }`}
                >
                  {puzzle.kind === 'bw' ? 'B&W' : 'Color'}
                </span>
              </div>
              <span className={`pap-browser__status pap-browser__status--${status}`}>
                {status === 'new' && 'New'}
                {status === 'in-progress' && 'In Progress'}
                {status === 'solved' && 'Solved ✓'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
