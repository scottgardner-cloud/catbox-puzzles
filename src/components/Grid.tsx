import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  PlayerCellState,
  CellValidation,
  LineValidation,
  LineClue,
  PaletteColor,
  ColorId,
} from '../types';
import { Cell } from './Cell';
import './Grid.css';

/**
 * Count consecutive cells of the same state around a position in a line.
 * Returns the total run length containing the cell at `pos`.
 */
function countRunAt(line: readonly PlayerCellState[], pos: number): number {
  const state = line[pos].kind;
  let start = pos;
  while (start > 0 && line[start - 1].kind === state) start--;
  let end = pos;
  while (end < line.length - 1 && line[end + 1].kind === state) end++;
  return end - start + 1;
}

/** Build inline style for a run indicator based on the hovered cell's state. */
function runIndicatorStyle(
  cell: PlayerCellState,
  resolveColor: (id: ColorId) => string,
): React.CSSProperties {
  switch (cell.kind) {
    case 'filled':
      return {
        backgroundColor: resolveColor(cell.colorId),
        color: '#fff',
        borderRadius: 4,
      };
    case 'empty':
      return {
        backgroundColor: '#e0e0e0',
        color: '#616161',
        borderRadius: 4,
      };
    default:
      return {};
  }
}

/** Props for the {@link Grid} component. */
export interface GridProps {
  /** The player's current board state, indexed as board[row][col]. */
  readonly board: readonly (readonly PlayerCellState[])[];
  /** Per-cell validation results, same shape as board. */
  readonly cellValidation: readonly (readonly CellValidation[])[];
  /** Per-row validation status. */
  readonly rowValidation: readonly LineValidation[];
  /** Per-column validation status. */
  readonly colValidation: readonly LineValidation[];
  /** Clue data for each row. */
  readonly rowClues: readonly LineClue[];
  /** Clue data for each column. */
  readonly colClues: readonly LineClue[];
  /** Color palette for resolving ColorIds to CSS colors. */
  readonly palette: readonly PaletteColor[];
  /** Whether validation indicators should be visible. */
  readonly isValidationActive: boolean;
  /** Called when a cell is clicked. */
  readonly onCellClick: (row: number, col: number) => void;
  /** Called when a drag enters a cell. */
  readonly onCellDragEnter: (row: number, col: number) => void;
  /** Called when a drag starts on a cell. */
  readonly onDragStart: (row: number, col: number) => void;
  /** Called when a drag gesture ends. */
  readonly onDragEnd: () => void;
  /** Callback to announce a message to screen readers via live region. */
  readonly onAnnounce?: (message: string) => void;
}

/** Default cell size in pixels. */
const DEFAULT_CELL_SIZE = 30;

/**
 * Renders the full Pix-a-Pix puzzle grid including clues, validation
 * indicators, and the interactive cell grid.
 *
 * Layout (validation indicators are OUTSIDE the clues):
 * ```
 *                          [col validation]
 *                          [col clues]
 * [row validation] [row clues] [grid of cells]
 * ```
 */
export function Grid({
  board,
  cellValidation,
  rowValidation,
  colValidation,
  rowClues,
  colClues,
  palette,
  isValidationActive,
  onCellClick,
  onCellDragEnter,
  onDragStart,
  onDragEnd,
  onAnnounce,
}: GridProps): React.JSX.Element {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  // Hover tracking for row/column highlighting
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  // Keyboard focus tracking (-1 means grid is not keyboard-focused)
  const [focusRow, setFocusRow] = useState(-1);
  const [focusCol, setFocusCol] = useState(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  const colorMap = useMemo(() => {
    const map = new Map<ColorId, string>();
    for (const c of palette) {
      map.set(c.id, c.value);
    }
    return map;
  }, [palette]);

  const resolveColor = useCallback((id: ColorId): string => colorMap.get(id) ?? '#000', [colorMap]);

  const isColorPuzzle = palette.length > 1;
  const maxRowClueLen = Math.max(1, ...rowClues.map((c) => c.length));

  const handleMouseDown = useCallback(
    (row: number, col: number) => {
      onDragStart(row, col);
      onCellClick(row, col);
    },
    [onDragStart, onCellClick],
  );

  const handleMouseUp = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  const handleCellHover = useCallback((row: number, col: number) => {
    setHoverRow(row);
    setHoverCol(col);
  }, []);

  const handleGridLeave = useCallback(() => {
    setHoverRow(null);
    setHoverCol(null);
    onDragEnd();
  }, [onDragEnd]);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (rows === 0 || cols === 0) return;

      // Clamp current focus to valid bounds (handles puzzle switches)
      const curRow = Math.min(Math.max(focusRow, 0), rows - 1);
      const curCol = Math.min(Math.max(focusCol, 0), cols - 1);
      let nextRow = curRow;
      let nextCol = curCol;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          nextRow = Math.max(0, curRow - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextRow = Math.min(rows - 1, curRow + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextCol = Math.max(0, curCol - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextCol = Math.min(cols - 1, curCol + 1);
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (curRow >= 0 && curCol >= 0) {
            onCellClick(curRow, curCol);
            const current = board[curRow][curCol];
            let nextState: string;
            switch (current.kind) {
              case 'unknown':
                nextState = 'filled';
                break;
              case 'filled':
                nextState = 'marked empty';
                break;
              case 'empty':
                nextState = 'unknown';
                break;
            }
            onAnnounce?.(`Row ${curRow + 1}, column ${curCol + 1}: ${nextState}`);
          }
          return;
        case 'Home':
          e.preventDefault();
          nextCol = 0;
          if (e.ctrlKey) nextRow = 0;
          break;
        case 'End':
          e.preventDefault();
          nextCol = cols - 1;
          if (e.ctrlKey) nextRow = rows - 1;
          break;
        default:
          return;
      }

      setFocusRow(nextRow);
      setFocusCol(nextCol);
    },
    [focusRow, focusCol, rows, cols, board, onCellClick, onAnnounce],
  );

  /** When the grid wrapper receives focus (via Tab), activate keyboard focus on first cell. */
  const handleGridFocus = useCallback(() => {
    if (focusRow < 0 || focusCol < 0) {
      setFocusRow(0);
      setFocusCol(0);
    }
  }, [focusRow, focusCol]);

  /** When focus leaves the grid, deactivate keyboard focus. */
  const handleGridBlur = useCallback((e: React.FocusEvent) => {
    // Only reset if focus is truly leaving the grid (not moving within it)
    if (!gridRef.current?.contains(e.relatedTarget)) {
      setFocusRow(-1);
      setFocusCol(-1);
    }
  }, []);

  return (
    <div
      ref={gridRef}
      className="pap-grid-wrapper"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleGridLeave}
      onKeyDown={handleGridKeyDown}
      onFocus={handleGridFocus}
      onBlur={handleGridBlur}
      role="grid"
      aria-label="Puzzle grid"
      tabIndex={0}
    >
      {/* ── Column validation indicators (OUTSIDE, above clues) ── */}
      <div className="pap-col-header-row">
        <div className="pap-col-header-spacer" style={{ minWidth: maxRowClueLen * 24 + 44 }} />
        <div
          className="pap-col-validation"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${DEFAULT_CELL_SIZE}px)`,
          }}
        >
          {colValidation.map((v, ci) => (
            <div key={ci} className={`pap-line-indicator pap-line-indicator--${v}`}>
              {v === 'correct' ? '✓' : v === 'incorrect' ? '✗' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* ── Column clues (closer to grid) ── */}
      <div className="pap-col-header-row">
        <div className="pap-col-header-spacer" style={{ minWidth: maxRowClueLen * 24 + 44 }} />
        <div
          className="pap-col-clues"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${DEFAULT_CELL_SIZE}px)`,
          }}
        >
          {colClues.map((clue, ci) => (
            <div
              key={ci}
              className={`pap-col-clue${hoverCol === ci ? ' pap-col-clue--highlight' : ''}`}
            >
              {clue.length === 0 ? (
                <span className="pap-clue-num">0</span>
              ) : (
                clue.map((run, ri) => (
                  <span
                    key={ri}
                    className="pap-clue-num"
                    style={isColorPuzzle ? { color: resolveColor(run.colorId) } : undefined}
                  >
                    {run.length}
                  </span>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Row area (validation + clues + cells) ── */}
      <div className="pap-rows">
        {board.map((row, ri) => (
          <div key={ri} className={`pap-row${hoverRow === ri ? ' pap-row--highlight' : ''}`}>
            {/* Row validation indicator (OUTSIDE, left of clues) */}
            <div className={`pap-line-indicator pap-line-indicator--${rowValidation[ri]}`}>
              {rowValidation[ri] === 'correct' ? '✓' : rowValidation[ri] === 'incorrect' ? '✗' : ''}
            </div>

            {/* Row clues (closer to grid) */}
            <div
              className={`pap-row-clue${hoverRow === ri ? ' pap-row-clue--highlight' : ''}`}
              style={{ minWidth: maxRowClueLen * 24 }}
            >
              {rowClues[ri].length === 0 ? (
                <span className="pap-clue-num">0</span>
              ) : (
                rowClues[ri].map((run, ci) => (
                  <span
                    key={ci}
                    className="pap-clue-num"
                    style={isColorPuzzle ? { color: resolveColor(run.colorId) } : undefined}
                  >
                    {run.length}
                  </span>
                ))
              )}
            </div>

            {/* Cells */}
            <div
              className="pap-cells-row"
              style={{
                gridTemplateColumns: `repeat(${cols}, ${DEFAULT_CELL_SIZE}px)`,
              }}
            >
              {row.map((cellState, ci) => {
                const fillColor =
                  cellState.kind === 'filled' ? resolveColor(cellState.colorId) : undefined;

                const dividerClasses: string[] = [];
                if ((ci + 1) % 5 === 0 && ci + 1 < cols)
                  dividerClasses.push('pap-cell--border-right');
                if ((ri + 1) % 5 === 0 && ri + 1 < rows)
                  dividerClasses.push('pap-cell--border-bottom');

                // Highlight cells in the hovered row or column
                if (hoverRow === ri || hoverCol === ci) dividerClasses.push('pap-cell--crosshair');

                const cellIsFocused = focusRow === ri && focusCol === ci;

                return (
                  <div
                    key={ci}
                    className={dividerClasses.join(' ') || undefined}
                    onMouseDown={() => handleMouseDown(ri, ci)}
                    onMouseEnter={() => handleCellHover(ri, ci)}
                  >
                    <Cell
                      state={cellState}
                      validation={isValidationActive ? cellValidation[ri][ci] : 'unchecked'}
                      fillColor={fillColor}
                      onClick={() => {
                        /* click handled by mouseDown on wrapper */
                      }}
                      onDragEnter={() => onCellDragEnter(ri, ci)}
                      size={DEFAULT_CELL_SIZE}
                      ariaRowIndex={ri + 1}
                      ariaColIndex={ci + 1}
                      isFocused={cellIsFocused}
                    />
                  </div>
                );
              })}
            </div>

            {/* Row run-length indicator (right edge) */}
            <div
              className={`pap-run-indicator${hoverRow === ri && hoverCol !== null ? '' : ' pap-run-indicator--hidden'}`}
              style={
                hoverRow === ri && hoverCol !== null
                  ? runIndicatorStyle(row[hoverCol], resolveColor)
                  : undefined
              }
            >
              {hoverRow === ri && hoverCol !== null ? countRunAt(row, hoverCol) : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Column run-length indicators (bottom edge) */}
      <div className="pap-col-header-row">
        <div className="pap-col-header-spacer" style={{ minWidth: maxRowClueLen * 24 + 44 }} />
        <div
          className="pap-col-run-indicators"
          style={{ gridTemplateColumns: `repeat(${cols}, ${DEFAULT_CELL_SIZE}px)` }}
        >
          {Array.from({ length: cols }, (_, ci) => {
            const colCells = board.map((r) => r[ci]);
            const show = hoverCol === ci && hoverRow !== null;
            return (
              <div
                key={ci}
                className={`pap-run-indicator${show ? '' : ' pap-run-indicator--hidden'}`}
                style={
                  show && hoverRow !== null
                    ? runIndicatorStyle(colCells[hoverRow], resolveColor)
                    : undefined
                }
              >
                {show && hoverRow !== null ? countRunAt(colCells, hoverRow) : ''}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
