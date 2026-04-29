import { useCallback, useRef } from 'react';
import type { ColorId } from '../../types';
import type { EditorAction, EditorState, CellCoord } from './types';
import type { LineClue } from '../../types';
import './EditorGrid.css';

interface EditorGridProps {
  readonly state: EditorState;
  readonly dispatch: React.Dispatch<EditorAction>;
  readonly rowClues: readonly LineClue[];
  readonly colClues: readonly LineClue[];
}

/** Adaptive cell size based on grid dimensions. */
function getCellSize(rows: number, cols: number): number {
  const maxDim = Math.max(rows, cols);
  if (maxDim <= 10) return 30;
  if (maxDim <= 20) return 24;
  if (maxDim <= 30) return 20;
  return 16;
}

/**
 * DOM-based paint grid for the puzzle editor.
 * Supports click-to-paint, drag-paint, keyboard navigation, and erase.
 */
export function EditorGrid({
  state,
  dispatch,
  rowClues,
  colClues,
}: EditorGridProps): React.JSX.Element {
  const isDragging = useRef(false);
  const dragAction = useRef<'paint' | 'erase'>('paint');

  const cellSize = getCellSize(state.rows, state.cols);

  const handleCellAction = useCallback(
    (row: number, col: number, action: 'paint' | 'erase') => {
      if (action === 'paint') {
        dispatch({ type: 'PAINT_CELL', row, col });
      } else {
        dispatch({ type: 'ERASE_CELL', row, col });
      }
    },
    [dispatch],
  );

  const handlePointerDown = useCallback(
    (row: number, col: number, e: React.PointerEvent) => {
      e.preventDefault();
      isDragging.current = true;
      // Toggle: if cell is filled, erase; if empty, paint. Right-click always erases.
      const cellValue = state.grid[row]?.[col];
      const action = e.button === 2 ? 'erase' : cellValue !== null ? 'erase' : 'paint';
      dragAction.current = action;
      handleCellAction(row, col, action);
      dispatch({ type: 'SET_FOCUSED_CELL', cell: { row, col } });
    },
    [state.grid, handleCellAction, dispatch],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!(target instanceof HTMLElement)) return;
      const rowStr = target.dataset.row;
      const colStr = target.dataset.col;
      if (rowStr == null || colStr == null) return;
      handleCellAction(Number(rowStr), Number(colStr), dragAction.current);
    },
    [handleCellAction],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const fc = state.focusedCell;
      if (!fc) return;

      let newCell: CellCoord | null = null;
      switch (e.key) {
        case 'ArrowUp':
          if (fc.row > 0) newCell = { row: fc.row - 1, col: fc.col };
          break;
        case 'ArrowDown':
          if (fc.row < state.rows - 1) newCell = { row: fc.row + 1, col: fc.col };
          break;
        case 'ArrowLeft':
          if (fc.col > 0) newCell = { row: fc.row, col: fc.col - 1 };
          break;
        case 'ArrowRight':
          if (fc.col < state.cols - 1) newCell = { row: fc.row, col: fc.col + 1 };
          break;
        case ' ':
        case 'Enter': {
          e.preventDefault();
          const cellVal = state.grid[fc.row]?.[fc.col];
          handleCellAction(fc.row, fc.col, cellVal !== null ? 'erase' : 'paint');
          return;
        }
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          handleCellAction(fc.row, fc.col, 'erase');
          return;
        case 'Home':
          newCell = { row: fc.row, col: 0 };
          break;
        case 'End':
          newCell = { row: fc.row, col: state.cols - 1 };
          break;
        default:
          return;
      }

      if (newCell) {
        e.preventDefault();
        dispatch({ type: 'SET_FOCUSED_CELL', cell: newCell });
      }
    },
    [state.focusedCell, state.rows, state.cols, state.grid, handleCellAction, dispatch],
  );

  const handleGridFocus = useCallback(() => {
    if (!state.focusedCell) {
      dispatch({ type: 'SET_FOCUSED_CELL', cell: { row: 0, col: 0 } });
    }
  }, [state.focusedCell, dispatch]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Find the color value for a cell
  const getCellColor = (cell: ColorId | null): string | null => {
    if (cell === null) return null;
    return state.palette.find((c) => c.id === cell)?.value ?? null;
  };

  const gridWidth = state.cols * cellSize;
  const gridHeight = state.rows * cellSize;

  return (
    <div
      className="pap-editor-grid-wrapper"
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
      style={
        {
          '--cell-size': `${cellSize}px`,
          '--grid-cols': state.cols,
          '--grid-rows': state.rows,
          '--grid-width': `${gridWidth}px`,
          '--grid-height': `${gridHeight}px`,
          '--clue-col-height': `${Math.ceil(state.rows / 2) * 16}px`,
          '--clue-row-width': `${Math.ceil(state.cols / 2) * 16}px`,
        } as React.CSSProperties
      }
    >
      {/* CSS Grid layout: [col-clues] above [row-clues | pixel-grid] */}
      <div className="pap-editor-grid-layout">
        {/* Top-left spacer */}
        <div className="pap-editor-grid__spacer" />

        {/* Column clues — aligned to bottom, grow upward */}
        <div className="pap-editor-grid__col-clues">
          {Array.from({ length: state.cols }, (_, col) => {
            const clue = colClues[col] ?? [];
            return (
              <div key={col} className="pap-editor-grid__col-clue-stack">
                {clue.map((run, i) => (
                  <span
                    key={i}
                    className="pap-editor-grid__clue-num"
                    style={
                      state.kind === 'color'
                        ? { color: getCellColor(run.colorId) ?? undefined }
                        : undefined
                    }
                  >
                    {run.length}
                  </span>
                ))}
                {clue.length === 0 && (
                  <span className="pap-editor-grid__clue-num pap-editor-grid__clue-num--empty">
                    0
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Row clues — aligned to right, grow leftward */}
        <div className="pap-editor-grid__row-clues">
          {Array.from({ length: state.rows }, (_, row) => {
            const clue = rowClues[row] ?? [];
            return (
              <div key={row} className="pap-editor-grid__row-clue-stack">
                {clue.map((run, i) => (
                  <span
                    key={i}
                    className="pap-editor-grid__clue-num"
                    style={
                      state.kind === 'color'
                        ? { color: getCellColor(run.colorId) ?? undefined }
                        : undefined
                    }
                  >
                    {run.length}
                  </span>
                ))}
                {clue.length === 0 && (
                  <span className="pap-editor-grid__clue-num pap-editor-grid__clue-num--empty">
                    0
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Pixel grid — fixed size, never moves */}
        <div
          className="pap-editor-grid__cells"
          role="grid"
          aria-label="Puzzle editor grid"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={handleGridFocus}
          onPointerMove={handlePointerMove}
        >
          {state.grid.map((row, r) =>
            row.map((cell, c) => {
              const isFocused = state.focusedCell?.row === r && state.focusedCell?.col === c;
              const colorValue = getCellColor(cell);
              const showDividerRight = (c + 1) % 5 === 0 && c < state.cols - 1;
              const showDividerBottom = (r + 1) % 5 === 0 && r < state.rows - 1;
              return (
                <div
                  key={`${r}-${c}`}
                  role="gridcell"
                  aria-label={`Row ${r + 1}, Column ${c + 1}${cell ? `, filled ${state.palette.find((p) => p.id === cell)?.name ?? ''}` : ', empty'}`}
                  className={[
                    'pap-editor-grid__cell',
                    cell ? 'pap-editor-grid__cell--filled' : '',
                    isFocused ? 'pap-editor-grid__cell--focused' : '',
                    showDividerRight ? 'pap-editor-grid__cell--divider-right' : '',
                    showDividerBottom ? 'pap-editor-grid__cell--divider-bottom' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={colorValue ? { backgroundColor: colorValue } : undefined}
                  onPointerDown={(e) => handlePointerDown(r, c, e)}
                  data-row={r}
                  data-col={c}
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
