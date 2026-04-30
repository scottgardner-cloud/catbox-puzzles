import type { PuzzleEntry as SharedPuzzleEntry } from '../../shared/types/puzzle-entry';
import type { BrowserCardOptions } from '../../shared/types/puzzle-type';
import type { PuzzleEntry } from '../puzzles/types';
import { PuzzleThumbnail } from './PuzzleThumbnail';

/** Renders a nonogram puzzle card for the browser. */
export function NonogramBrowserCard(
  entry: SharedPuzzleEntry,
  options: BrowserCardOptions,
): React.ReactNode {
  const { puzzle } = entry as PuzzleEntry;
  return (
    <button type="button" className="cb-browser__card-select" onClick={options.onSelect}>
      <PuzzleThumbnail puzzle={puzzle} status={options.hasSave ? 'in-progress' : 'new'} />
      <p className="cb-browser__card-name">{puzzle.name}</p>
      <div className="cb-browser__card-meta">
        <span className="cb-browser__badge cb-browser__badge--size">
          {puzzle.rows}×{puzzle.cols}
        </span>
        <span
          className={`cb-browser__badge ${
            puzzle.kind === 'bw' ? 'cb-browser__badge--bw' : 'cb-browser__badge--color'
          }`}
        >
          {puzzle.kind === 'bw' ? 'B&W' : 'Color'}
        </span>
      </div>
    </button>
  );
}
