import { useMemo } from 'react';
import { hasSave, loadGame, restoreGameState } from '../state/persistence';
import { isSolved } from '../engine';
import type { PuzzleEntry } from '../puzzles/types';
import './PuzzleBrowser.css';

/** Progress status for a puzzle. */
type PuzzleStatus = 'new' | 'in-progress' | 'solved';

/** Props for the {@link PuzzleBrowser} component. */
export interface PuzzleBrowserProps {
  /** Available puzzle entries to display. */
  readonly entries: readonly PuzzleEntry[];
  /** Called when the player selects a puzzle, with its stable entryId. */
  readonly onSelectPuzzle: (entryId: string) => void;
  /** Called when the player deletes a custom puzzle. */
  readonly onDeletePuzzle?: (entryId: string) => void;
}

/** Determine progress status for a puzzle entry. Safe against corrupt saves. */
function getEntryStatus(entry: PuzzleEntry): PuzzleStatus {
  try {
    if (!hasSave(entry.entryId)) return 'new';
    const save = loadGame(entry.entryId);
    if (!save) return 'new';
    const state = restoreGameState(save, entry.puzzle.rows, entry.puzzle.cols);
    if (!state) return 'new';
    return isSolved(state, entry.puzzle) ? 'solved' : 'in-progress';
  } catch {
    return 'new';
  }
}

/** Renders a single puzzle card's content (shared between builtin and custom). */
function CardContent({
  entry,
  status,
}: {
  readonly entry: PuzzleEntry;
  readonly status: PuzzleStatus;
}): React.JSX.Element {
  const { puzzle } = entry;
  return (
    <>
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
    </>
  );
}

/**
 * A puzzle selection screen that displays puzzle cards in a responsive grid.
 *
 * Shows puzzle name, dimensions, type (B&W / Color), and progress status
 * (New, In Progress, Solved) for each available puzzle. Custom puzzles are
 * shown in a separate "My Puzzles" section with delete support.
 */
export function PuzzleBrowser({
  entries,
  onSelectPuzzle,
  onDeletePuzzle,
}: PuzzleBrowserProps): React.JSX.Element {
  const builtinEntries = useMemo(() => entries.filter((e) => e.source === 'builtin'), [entries]);
  const customEntries = useMemo(() => entries.filter((e) => e.source === 'custom'), [entries]);

  const statusMap = useMemo(() => {
    const map = new Map<string, PuzzleStatus>();
    for (const entry of entries) {
      map.set(entry.entryId, getEntryStatus(entry));
    }
    return map;
  }, [entries]);

  function cardClass(status: PuzzleStatus): string {
    return [
      'pap-browser__card',
      status === 'in-progress' && 'pap-browser__card--in-progress',
      status === 'solved' && 'pap-browser__card--solved',
    ]
      .filter(Boolean)
      .join(' ');
  }

  return (
    <div className="pap-browser">
      <h2 className="pap-browser__section-header">Puzzles</h2>
      <ul className="pap-browser__grid">
        {builtinEntries.map((entry) => {
          const status = statusMap.get(entry.entryId) ?? 'new';
          return (
            <li key={entry.entryId} className={cardClass(status)}>
              <button
                type="button"
                className="pap-browser__card-select"
                onClick={() => onSelectPuzzle(entry.entryId)}
              >
                <CardContent entry={entry} status={status} />
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className="pap-browser__section-header">My Puzzles</h2>
      {customEntries.length === 0 ? (
        <p className="pap-browser__empty">No custom puzzles yet</p>
      ) : (
        <ul className="pap-browser__grid">
          {customEntries.map((entry) => {
            const status = statusMap.get(entry.entryId) ?? 'new';
            return (
              <li key={entry.entryId} className={cardClass(status)}>
                <button
                  type="button"
                  className="pap-browser__card-select"
                  onClick={() => onSelectPuzzle(entry.entryId)}
                >
                  <CardContent entry={entry} status={status} />
                </button>
                {onDeletePuzzle && (
                  <button
                    type="button"
                    className="pap-browser__card-delete"
                    aria-label={`Delete ${entry.puzzle.name}`}
                    onClick={() => onDeletePuzzle(entry.entryId)}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
