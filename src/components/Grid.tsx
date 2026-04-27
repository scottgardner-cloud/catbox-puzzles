import { useCallback, useMemo, useState } from 'react';
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
}: GridProps): React.JSX.Element {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  // Hover tracking for row/column highlighting
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

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

  return (
    <div
      className="pap-grid-wrapper"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleGridLeave}
      role="grid"
    >
      {/* ── Column validation indicators (OUTSIDE, above clues) ── */}
      <div
        className={`pap-col-validation${isValidationActive ? '' : ' pap-col-validation--hidden'}`}
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

      {/* ── Column clues (closer to grid) ── */}
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

      {/* ── Row area (validation + clues + cells) ── */}
      <div className="pap-rows">
        {board.map((row, ri) => (
          <div key={ri} className={`pap-row${hoverRow === ri ? ' pap-row--highlight' : ''}`}>
            {/* Row validation indicator (OUTSIDE, left of clues) */}
            <div
              className={`pap-line-indicator pap-line-indicator--${rowValidation[ri]}${isValidationActive ? '' : ' pap-line-indicator--hidden'}`}
            >
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
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
