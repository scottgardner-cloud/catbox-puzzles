import { useMemo, useState } from 'react';
import { loadGame, restoreGameState } from '../state/persistence';
import { isSolved } from '../engine';
import type { PuzzleEntry } from '../puzzles/types';
import './PuzzleBrowser.css';

/** Progress status for a puzzle. */
type PuzzleStatus = 'new' | 'in-progress' | 'solved';

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
  /** Called when the player wants to import a puzzle. */
  readonly onImportPuzzle?: () => void;
}

// ---------------------------------------------------------------------------
// Status computation
// ---------------------------------------------------------------------------

/** Determine progress status for a puzzle entry. Safe against corrupt saves. */
function getEntryStatus(entry: PuzzleEntry): PuzzleStatus {
  try {
    const save = loadGame(entry.entryId);
    if (!save) return 'new';
    const state = restoreGameState(save, entry.puzzle);
    if (!state) return 'new';
    return isSolved(state, entry.puzzle) ? 'solved' : 'in-progress';
  } catch {
    return 'new';
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
  statusMap: ReadonlyMap<string, PuzzleStatus>,
): PuzzleEntry[] {
  const q = query.toLowerCase().trim();
  return entries.filter((e) => {
    if (q && !e.puzzle.name.toLowerCase().includes(q)) return false;
    if (activeTypes.size > 0 && !activeTypes.has(e.puzzle.kind)) return false;
    if (activeSizes.size > 0 && !activeSizes.has(`${e.puzzle.rows}×${e.puzzle.cols}`)) return false;
    if (activeStatuses.size > 0) {
      const status = statusMap.get(e.entryId) ?? 'new';
      if (!activeStatuses.has(status)) return false;
    }
    return true;
  });
}

const STATUS_RANK: Record<PuzzleStatus, number> = { new: 0, 'in-progress': 1, solved: 2 };

function sortEntries(
  entries: PuzzleEntry[],
  sortBy: SortBy,
  statusMap: ReadonlyMap<string, PuzzleStatus>,
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
        const sa = STATUS_RANK[statusMap.get(a.entryId) ?? 'new'];
        const sb = STATUS_RANK[statusMap.get(b.entryId) ?? 'new'];
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
  showSource,
}: {
  readonly entry: PuzzleEntry;
  readonly status: PuzzleStatus;
  readonly showSource?: boolean;
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
        {showSource && (
          <span className="pap-browser__badge pap-browser__badge--source">
            {entry.source === 'builtin' ? 'Built-in' : 'Custom'}
          </span>
        )}
      </div>
      <span className={`pap-browser__status pap-browser__status--${status}`}>
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
  onImportPuzzle,
}: PuzzleBrowserProps): React.JSX.Element {
  // ── Browser state ────────────────────────────────────────────────
  const [viewTab, setViewTab] = useState<ViewTab>('builtin');
  const [searchQuery, setSearchQuery] = useState('');
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
    const map = new Map<string, PuzzleStatus>();
    for (const entry of entries) {
      map.set(entry.entryId, getEntryStatus(entry));
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
      'pap-browser__card',
      status === 'in-progress' && 'pap-browser__card--in-progress',
      status === 'solved' && 'pap-browser__card--solved',
    ]
      .filter(Boolean)
      .join(' ');
  }

  // ── Empty state logic ────────────────────────────────────────────
  const isCustomTabEmpty = viewTab === 'custom' && customCount === 0;
  const isFilteredEmpty = !isCustomTabEmpty && sorted.length === 0;

  return (
    <div className="pap-browser">
      {/* Tab bar */}
      <div className="pap-browser__tabs" role="group" aria-label="Puzzle collection">
        {(['builtin', 'custom', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`pap-browser__tab${viewTab === tab ? ' pap-browser__tab--active' : ''}`}
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
      <div className="pap-browser__toolbar">
        <input
          type="search"
          className="pap-browser__search"
          placeholder="Search puzzles…"
          aria-label="Search puzzles by name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="pap-browser__sort"
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
      <div className="pap-browser__chips">
        {(['bw', 'color'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            className={`pap-browser__chip${activeTypes.has(kind) ? ' pap-browser__chip--active' : ''}`}
            aria-pressed={activeTypes.has(kind)}
            onClick={() => setActiveTypes(toggleSetItem(activeTypes, kind))}
          >
            {kind === 'bw' ? 'B&W' : 'Color'}
          </button>
        ))}
        <span className="pap-browser__chip-sep" aria-hidden="true" />
        {availableSizes.map((size) => (
          <button
            key={size}
            type="button"
            className={`pap-browser__chip${activeSizes.has(size) ? ' pap-browser__chip--active' : ''}`}
            aria-pressed={activeSizes.has(size)}
            onClick={() => setActiveSizes(toggleSetItem(activeSizes, size))}
          >
            {size}
          </button>
        ))}
        <span className="pap-browser__chip-sep" aria-hidden="true" />
        {(['new', 'in-progress', 'solved'] as const).map((status) => (
          <button
            key={status}
            type="button"
            className={`pap-browser__chip${activeStatuses.has(status) ? ' pap-browser__chip--active' : ''}`}
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
      <p className="pap-browser__count">
        Showing {sorted.length} of {tabEntries.length} puzzles
      </p>

      {/* Import button (custom tab or all tab) */}
      {onImportPuzzle && (viewTab === 'custom' || viewTab === 'all') && (
        <button type="button" className="pap-btn pap-browser__import-btn" onClick={onImportPuzzle}>
          + Import
        </button>
      )}

      {/* Empty states */}
      {isCustomTabEmpty && (
        <p className="pap-browser__empty">No custom puzzles yet. Import or create one!</p>
      )}
      {isFilteredEmpty && <p className="pap-browser__empty">No puzzles match your filters.</p>}

      {/* Puzzle grid */}
      {sorted.length > 0 && (
        <ul className="pap-browser__grid">
          {sorted.map((entry) => {
            const status = statusMap.get(entry.entryId) ?? 'new';
            return (
              <li key={entry.entryId} className={cardClass(status)}>
                <button
                  type="button"
                  className="pap-browser__card-select"
                  onClick={() => onSelectPuzzle(entry.entryId)}
                >
                  <CardContent entry={entry} status={status} showSource={viewTab === 'all'} />
                </button>
                {entry.source === 'custom' && onDeletePuzzle && (
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
