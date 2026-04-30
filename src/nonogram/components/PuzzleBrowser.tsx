import { useMemo, useState } from 'react';
import { loadGame, restoreGameState } from '../state/persistence';
import { isSolved } from '../engine';
import type { PuzzleEntry } from '../puzzles/types';
import type { PlayerCellState } from '../types';
import { PuzzleThumbnail } from './PuzzleThumbnail';
import './PuzzleBrowser.css';

/** Progress status for a puzzle. */
type PuzzleStatus = 'new' | 'in-progress' | 'solved';

/** Cached status info including player board for in-progress puzzles. */
interface StatusInfo {
  readonly status: PuzzleStatus;
  readonly board?: readonly (readonly PlayerCellState[])[];
}

type ViewTab = 'builtin' | 'custom' | 'all';
type SortBy = 'name' | 'size' | 'status';

/** Props for the {@link PuzzleBrowser} component. */
export interface PuzzleBrowserProps {
  /** Available puzzle entries to display. */
  readonly entries: readonly PuzzleEntry[];
  /** Called when the player selects a puzzle, with its stable entryId. */
  readonly onSelectPuzzle: (entryId: string) => void;
  /** Called when the player deletes a custom puzzle. */
  readonly onDeletePuzzle?: (entryId: string) => void;
  /** Called when the player wants to edit a custom puzzle. */
  readonly onEditPuzzle?: (entryId: string) => void;
  /** Called when the player wants to import a puzzle. */
  readonly onImportPuzzle?: () => void;
}

// ---------------------------------------------------------------------------
// Status computation
// ---------------------------------------------------------------------------

/** Determine progress status for a puzzle entry. Safe against corrupt saves. */
function getEntryStatusInfo(entry: PuzzleEntry): StatusInfo {
  try {
    const save = loadGame(entry.entryId);
    if (!save) return { status: 'new' };
    const state = restoreGameState(save, entry.puzzle);
    if (!state) return { status: 'new' };
    if (isSolved(state, entry.puzzle)) return { status: 'solved' };
    return { status: 'in-progress', board: state.board };
  } catch {
    return { status: 'new' };
  }
}

// ---------------------------------------------------------------------------
// Filter / sort logic (pure functions)
// ---------------------------------------------------------------------------

function filterEntries(
  entries: readonly PuzzleEntry[],
  query: string,
  activeTypes: ReadonlySet<string>,
  activeStatuses: ReadonlySet<string>,
  activeSizes: ReadonlySet<string>,
  statusMap: ReadonlyMap<string, StatusInfo>,
): PuzzleEntry[] {
  const q = query.toLowerCase().trim();
  return entries.filter((e) => {
    if (q && !e.puzzle.name.toLowerCase().includes(q)) return false;
    if (activeTypes.size > 0 && !activeTypes.has(e.puzzle.kind)) return false;
    if (activeSizes.size > 0 && !activeSizes.has(`${e.puzzle.rows}×${e.puzzle.cols}`)) return false;
    if (activeStatuses.size > 0) {
      const status = (statusMap.get(e.entryId) ?? { status: 'new' }).status;
      if (!activeStatuses.has(status)) return false;
    }
    return true;
  });
}

const STATUS_RANK: Record<PuzzleStatus, number> = { new: 0, 'in-progress': 1, solved: 2 };

function sortEntries(
  entries: PuzzleEntry[],
  sortBy: SortBy,
  statusMap: ReadonlyMap<string, StatusInfo>,
): PuzzleEntry[] {
  return [...entries].sort((a, b) => {
    switch (sortBy) {
      case 'name': {
        const cmp = a.puzzle.name.localeCompare(b.puzzle.name);
        return cmp !== 0 ? cmp : a.entryId.localeCompare(b.entryId);
      }
      case 'size': {
        const areaA = a.puzzle.rows * a.puzzle.cols;
        const areaB = b.puzzle.rows * b.puzzle.cols;
        if (areaA !== areaB) return areaA - areaB;
        if (a.puzzle.rows !== b.puzzle.rows) return a.puzzle.rows - b.puzzle.rows;
        const nameCmp = a.puzzle.name.localeCompare(b.puzzle.name);
        return nameCmp !== 0 ? nameCmp : a.entryId.localeCompare(b.entryId);
      }
      case 'status': {
        const sa = STATUS_RANK[(statusMap.get(a.entryId) ?? { status: 'new' }).status];
        const sb = STATUS_RANK[(statusMap.get(b.entryId) ?? { status: 'new' }).status];
        if (sa !== sb) return sa - sb;
        const nameCmp = a.puzzle.name.localeCompare(b.puzzle.name);
        return nameCmp !== 0 ? nameCmp : a.entryId.localeCompare(b.entryId);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Renders a single puzzle card's content. */
function CardContent({
  entry,
  status,
  playerBoard,
  showSource,
}: {
  readonly entry: PuzzleEntry;
  readonly status: PuzzleStatus;
  readonly playerBoard?: readonly (readonly PlayerCellState[])[];
  readonly showSource?: boolean;
}): React.JSX.Element {
  const { puzzle } = entry;
  return (
    <>
      <PuzzleThumbnail puzzle={puzzle} status={status} playerBoard={playerBoard} />
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
        {showSource && (
          <span className="cb-browser__badge cb-browser__badge--source">
            {entry.source === 'builtin' ? 'Built-in' : 'Custom'}
          </span>
        )}
      </div>
      <span className={`cb-browser__status cb-browser__status--${status}`}>
        {status === 'new' && 'New'}
        {status === 'in-progress' && 'In Progress'}
        {status === 'solved' && 'Solved ✓'}
      </span>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * A puzzle selection screen with search, filter, sort, and tabbed views.
 *
 * Shows puzzle name, dimensions, type (B&W / Color), and progress status
 * (New, In Progress, Solved) for each available puzzle.
 */
export function PuzzleBrowser({
  entries,
  onSelectPuzzle,
  onDeletePuzzle,
  onEditPuzzle,
  onImportPuzzle,
}: PuzzleBrowserProps): React.JSX.Element {
  // ── Browser state ────────────────────────────────────────────────
  const [viewTab, setViewTab] = useState<ViewTab>('builtin');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<ReadonlySet<string>>(new Set());
  const [activeStatuses, setActiveStatuses] = useState<ReadonlySet<string>>(new Set());
  const [activeSizes, setActiveSizes] = useState<ReadonlySet<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>('size');

  // ── Available sizes (auto-generated, sorted by area) ─────────────
  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    for (const e of entries) {
      sizeSet.add(`${e.puzzle.rows}×${e.puzzle.cols}`);
    }
    return [...sizeSet].sort((a, b) => {
      const [ar, ac] = a.split('×').map(Number);
      const [br, bc] = b.split('×').map(Number);
      return ar * ac - br * bc;
    });
  }, [entries]);

  // ── Precompute status for all entries ────────────────────────────
  const statusMap = useMemo(() => {
    const map = new Map<string, StatusInfo>();
    for (const entry of entries) {
      map.set(entry.entryId, getEntryStatusInfo(entry));
    }
    return map;
  }, [entries]);

  // ── Tab filtering ────────────────────────────────────────────────
  const tabEntries = useMemo(() => {
    switch (viewTab) {
      case 'builtin':
        return entries.filter((e) => e.source === 'builtin');
      case 'custom':
        return entries.filter((e) => e.source === 'custom');
      case 'all':
        return [...entries];
    }
  }, [entries, viewTab]);

  const customCount = useMemo(() => entries.filter((e) => e.source === 'custom').length, [entries]);

  // ── Filter + sort ────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      filterEntries(tabEntries, searchQuery, activeTypes, activeStatuses, activeSizes, statusMap),
    [tabEntries, searchQuery, activeTypes, activeStatuses, activeSizes, statusMap],
  );

  const sorted = useMemo(
    () => sortEntries(filtered, sortBy, statusMap),
    [filtered, sortBy, statusMap],
  );

  // ── Chip toggle helper ───────────────────────────────────────────
  function toggleSetItem<T>(set: ReadonlySet<T>, item: T): ReadonlySet<T> {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  }

  function cardClass(status: PuzzleStatus): string {
    return [
      'cb-browser__card',
      status === 'in-progress' && 'cb-browser__card--in-progress',
      status === 'solved' && 'cb-browser__card--solved',
    ]
      .filter(Boolean)
      .join(' ');
  }

  // ── Empty state logic ────────────────────────────────────────────
  const isCustomTabEmpty = viewTab === 'custom' && customCount === 0;
  const isFilteredEmpty = !isCustomTabEmpty && sorted.length === 0;

  return (
    <div className="cb-browser">
      {/* Tab bar */}
      <div className="cb-browser__tabs" role="group" aria-label="Puzzle collection">
        {(['builtin', 'custom', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`cb-browser__tab${viewTab === tab ? ' cb-browser__tab--active' : ''}`}
            onClick={() => setViewTab(tab)}
            aria-pressed={viewTab === tab}
          >
            {tab === 'builtin' && 'Puzzles'}
            {tab === 'custom' && 'My Puzzles'}
            {tab === 'all' && 'All'}
          </button>
        ))}
      </div>

      {/* Toolbar: search + sort */}
      <div className="cb-browser__toolbar">
        <input
          type="search"
          className="cb-browser__search"
          placeholder="Search puzzles…"
          aria-label="Search puzzles by name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="cb-browser__sort"
          aria-label="Sort puzzles"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
        >
          <option value="size">Size ↑</option>
          <option value="name">Name A–Z</option>
          <option value="status">Status</option>
        </select>
      </div>

      {/* Filter chips */}
      <div className="cb-browser__chips">
        {(['bw', 'color'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            className={`cb-browser__chip${activeTypes.has(kind) ? ' cb-browser__chip--active' : ''}`}
            aria-pressed={activeTypes.has(kind)}
            onClick={() => setActiveTypes(toggleSetItem(activeTypes, kind))}
          >
            {kind === 'bw' ? 'B&W' : 'Color'}
          </button>
        ))}
        <span className="cb-browser__chip-sep" aria-hidden="true" />
        {availableSizes.map((size) => (
          <button
            key={size}
            type="button"
            className={`cb-browser__chip${activeSizes.has(size) ? ' cb-browser__chip--active' : ''}`}
            aria-pressed={activeSizes.has(size)}
            onClick={() => setActiveSizes(toggleSetItem(activeSizes, size))}
          >
            {size}
          </button>
        ))}
        <span className="cb-browser__chip-sep" aria-hidden="true" />
        {(['new', 'in-progress', 'solved'] as const).map((status) => (
          <button
            key={status}
            type="button"
            className={`cb-browser__chip${activeStatuses.has(status) ? ' cb-browser__chip--active' : ''}`}
            aria-pressed={activeStatuses.has(status)}
            onClick={() => setActiveStatuses(toggleSetItem(activeStatuses, status))}
          >
            {status === 'new' && 'New'}
            {status === 'in-progress' && 'In Progress'}
            {status === 'solved' && 'Solved'}
          </button>
        ))}
      </div>

      {/* Result count */}
      <p className="cb-browser__count">
        Showing {sorted.length} of {tabEntries.length} puzzles
      </p>

      {/* Import button (custom tab or all tab) */}
      {onImportPuzzle && (viewTab === 'custom' || viewTab === 'all') && (
        <button type="button" className="cb-btn cb-browser__import-btn" onClick={onImportPuzzle}>
          + Import
        </button>
      )}

      {/* Empty states */}
      {isCustomTabEmpty && (
        <p className="cb-browser__empty">No custom puzzles yet. Import or create one!</p>
      )}
      {isFilteredEmpty && <p className="cb-browser__empty">No puzzles match your filters.</p>}

      {/* Puzzle grid */}
      {sorted.length > 0 && (
        <ul className="cb-browser__grid">
          {sorted.map((entry) => {
            const info = statusMap.get(entry.entryId) ?? { status: 'new' as const };
            return (
              <li key={entry.entryId} className={cardClass(info.status)}>
                <button
                  type="button"
                  className="cb-browser__card-select"
                  onClick={() => onSelectPuzzle(entry.entryId)}
                >
                  <CardContent
                    entry={entry}
                    status={info.status}
                    playerBoard={info.board}
                    showSource={viewTab === 'all'}
                  />
                </button>
                {entry.source === 'custom' && onEditPuzzle && (
                  <button
                    type="button"
                    className="cb-browser__card-edit"
                    aria-label={`Edit ${entry.puzzle.name}`}
                    onClick={() => onEditPuzzle(entry.entryId)}
                  >
                    ✏️
                  </button>
                )}
                {entry.source === 'custom' &&
                  onDeletePuzzle &&
                  (confirmDeleteId === entry.entryId ? (
                    <button
                      type="button"
                      className="cb-browser__card-delete cb-browser__card-delete--confirm"
                      aria-label={`Confirm delete ${entry.puzzle.name}`}
                      onClick={() => {
                        onDeletePuzzle(entry.entryId);
                        setConfirmDeleteId(null);
                      }}
                      onBlur={() => setConfirmDeleteId(null)}
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="cb-browser__card-delete"
                      aria-label={`Delete ${entry.puzzle.name}`}
                      onClick={() => setConfirmDeleteId(entry.entryId)}
                    >
                      ×
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
