import { useCallback, useMemo } from 'react';
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
 * Layout:
 * ```
 *              [col clues]  [col validation]
 * [row clues] [row valid.]  [grid of cells]
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

  // Build a lookup map: ColorId → CSS color string
  const colorMap = useMemo(() => {
    const map = new Map<ColorId, string>();
    for (const c of palette) {
      map.set(c.id, c.value);
    }
    return map;
  }, [palette]);

  const resolveColor = useCallback((id: ColorId): string => colorMap.get(id) ?? '#000', [colorMap]);

  // Determine whether this is a color puzzle (more than one palette entry)
  const isColorPuzzle = palette.length > 1;

  // Max clue length for sizing the clue areas
  const maxRowClueLen = Math.max(1, ...rowClues.map((c) => c.length));
  const maxColClueLen = Math.max(1, ...colClues.map((c) => c.length));

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

  return (
    <div
      className="pap-grid-wrapper"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      role="grid"
    >
      {/* ── Column clues ── */}
      <div
        className="pap-col-clues"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${DEFAULT_CELL_SIZE}px)`,
        }}
      >
        {colClues.map((clue, ci) => (
          <div key={ci} className="pap-col-clue">
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

      {/* ── Column validation indicators (always rendered for stable layout) ── */}
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

      {/* ── Row area (clues + validation + cells) ── */}
      <div className="pap-rows">
        {board.map((row, ri) => (
          <div key={ri} className="pap-row">
            {/* Row clues */}
            <div className="pap-row-clue" style={{ minWidth: maxRowClueLen * 24 }}>
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

            {/* Row validation indicator (always rendered for stable layout) */}
            <div
              className={`pap-line-indicator pap-line-indicator--${rowValidation[ri]}${isValidationActive ? '' : ' pap-line-indicator--hidden'}`}
            >
              {rowValidation[ri] === 'correct' ? '✓' : rowValidation[ri] === 'incorrect' ? '✗' : ''}
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

                // Extra class for 5-cell grid dividers
                const borderClasses: string[] = [];
                if ((ci + 1) % 5 === 0 && ci + 1 < cols)
                  borderClasses.push('pap-cell--border-right');
                if ((ri + 1) % 5 === 0 && ri + 1 < rows)
                  borderClasses.push('pap-cell--border-bottom');

                return (
                  <div
                    key={ci}
                    className={borderClasses.join(' ') || undefined}
                    onMouseDown={() => handleMouseDown(ri, ci)}
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

      {/* Hidden spacer to reserve room for clue columns */}
      <div className="pap-clue-spacer" style={{ width: maxRowClueLen * 24 + 24 }} />
      <div className="pap-clue-spacer-col" style={{ height: maxColClueLen * 20 + 20 }} />
    </div>
  );
}
