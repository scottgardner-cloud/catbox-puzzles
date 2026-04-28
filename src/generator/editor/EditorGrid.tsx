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
  return 20;
}

/**
 * DOM-based paint grid for the puzzle editor.
 * Supports click-to-paint, drag-paint, keyboard navigation, and erase.
 */
export function EditorGrid({ state, dispatch, rowClues, colClues }: EditorGridProps): React.JSX.Element {
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
      // Right-click always erases; left-click uses current tool
      const action = e.button === 2 ? 'erase' : state.tool;
      dragAction.current = action;
      handleCellAction(row, col, action);
      dispatch({ type: 'SET_FOCUSED_CELL', cell: { row, col } });
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [state.tool, handleCellAction, dispatch],
  );

  const handlePointerEnter = useCallback(
    (row: number, col: number) => {
      if (!isDragging.current) return;
      handleCellAction(row, col, dragAction.current);
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
        case 'Enter':
          e.preventDefault();
          handleCellAction(fc.row, fc.col, state.tool);
          return;
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
    [state.focusedCell, state.rows, state.cols, state.tool, handleCellAction, dispatch],
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

  // Max clue length for sizing the clue headers
  const maxRowClueLen = Math.max(1, ...rowClues.map((c) => c.length));
  const maxColClueLen = Math.max(1, ...colClues.map((c) => c.length));

  return (
    <div
      className="pap-editor-grid-wrapper"
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      <table
        className="pap-editor-grid"
        role="grid"
        aria-label="Puzzle editor grid"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={handleGridFocus}
        style={{ '--cell-size': `${cellSize}px` } as React.CSSProperties}
      >
        {/* Column clues header */}
        <thead>
          {Array.from({ length: maxColClueLen }, (_, clueRow) => (
            <tr key={`cclue-${clueRow}`} className="pap-editor-grid__clue-row">
              {/* Spacer for row clue columns */}
              <td
                className="pap-editor-grid__spacer"
                colSpan={maxRowClueLen}
              />
              {colClues.map((clue, col) => {
                const offset = maxColClueLen - clue.length;
                const idx = clueRow - offset;
                const run = idx >= 0 ? clue[idx] : null;
                return (
                  <td
                    key={col}
                    className="pap-editor-grid__clue-cell pap-editor-grid__clue-cell--col"
                    style={run ? { color: state.kind === 'color' ? getCellColor(run.colorId) ?? undefined : undefined } : undefined}
                  >
                    {run ? run.length : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {state.grid.map((row, r) => (
            <tr key={r} role="row">
              {/* Row clues */}
              {Array.from({ length: maxRowClueLen }, (_, clueIdx) => {
                const clue = rowClues[r];
                const offset = maxRowClueLen - clue.length;
                const idx = clueIdx - offset;
                const run = idx >= 0 ? clue[idx] : null;
                return (
                  <td
                    key={`rclue-${clueIdx}`}
                    className="pap-editor-grid__clue-cell pap-editor-grid__clue-cell--row"
                    style={run ? { color: state.kind === 'color' ? getCellColor(run.colorId) ?? undefined : undefined } : undefined}
                  >
                    {run ? run.length : ''}
                  </td>
                );
              })}
              {/* Grid cells */}
              {row.map((cell, c) => {
                const isFocused =
                  state.focusedCell?.row === r && state.focusedCell?.col === c;
                const colorValue = getCellColor(cell);
                const showDividerRight = (c + 1) % 5 === 0 && c < state.cols - 1;
                const showDividerBottom = (r + 1) % 5 === 0 && r < state.rows - 1;
                return (
                  <td
                    key={c}
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
                    onPointerEnter={() => handlePointerEnter(r, c)}
                    data-row={r}
                    data-col={c}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
