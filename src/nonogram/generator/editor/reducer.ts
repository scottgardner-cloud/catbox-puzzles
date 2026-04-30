import type { ColorId, PaletteColor } from '../../types';
import { colorId } from '../../types';
import type { EditorAction, EditorState } from './types';
import { BW_PALETTE, PRESET_COLORS } from './types';

// ── Helpers ──────────────────────────────────────────────────────────

/** Create an empty grid of the given dimensions. */
export function createEmptyGrid(rows: number, cols: number): (ColorId | null)[][] {
  return Array.from({ length: rows }, () =>
    Array.from<ColorId | null>({ length: cols }).fill(null),
  );
}

/** Create initial editor state for a new puzzle. */
export function createInitialState(kind: 'bw' | 'color', rows: number, cols: number): EditorState {
  const palette = kind === 'bw' ? [...BW_PALETTE] : [PRESET_COLORS[0]];
  return {
    mode: 'new',
    sourceEntryId: null,
    name: '',
    kind,
    rows,
    cols,
    palette,
    grid: createEmptyGrid(rows, cols),
    selectedColor: palette[0].id,
    tool: 'paint',
    focusedCell: null,
    isDirty: false,
    validationStatus: 'unchecked',
    validationErrors: [],
    proposedRepair: null,
  };
}

// ── Reducer ──────────────────────────────────────────────────────────

/** Invalidate validation state — called on any content-changing action. */
function invalidateValidation(state: EditorState): EditorState {
  if (state.validationStatus === 'unchecked' && state.proposedRepair === null) return state;
  return { ...state, validationStatus: 'unchecked', validationErrors: [], proposedRepair: null };
}

/** Mark state as dirty and invalidate validation. */
function markDirty(state: EditorState): EditorState {
  return invalidateValidation({ ...state, isDirty: true });
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.name, isDirty: true };

    case 'SET_TOOL':
      return { ...state, tool: action.tool };

    case 'SELECT_COLOR':
      return { ...state, selectedColor: action.colorId };

    case 'PAINT_CELL': {
      const { row, col } = action;
      if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) return state;
      if (state.grid[row][col] === state.selectedColor) return state;
      const newGrid = state.grid.map((r) => [...r]);
      newGrid[row][col] = state.selectedColor;
      return markDirty({ ...state, grid: newGrid });
    }

    case 'ERASE_CELL': {
      const { row, col } = action;
      if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) return state;
      if (state.grid[row][col] === null) return state;
      const newGrid = state.grid.map((r) => [...r]);
      newGrid[row][col] = null;
      return markDirty({ ...state, grid: newGrid });
    }

    case 'CLEAR_GRID':
      return markDirty({ ...state, grid: createEmptyGrid(state.rows, state.cols) });

    case 'FILL_GRID': {
      const newGrid = state.grid.map((r) => r.map(() => state.selectedColor));
      return markDirty({ ...state, grid: newGrid });
    }

    case 'RESIZE_GRID': {
      const { rows, cols } = action;
      if (rows === state.rows && cols === state.cols) return state;
      // Preserve overlap: copy existing cells, fill new cells with null
      const newGrid = createEmptyGrid(rows, cols);
      const copyRows = Math.min(rows, state.rows);
      const copyCols = Math.min(cols, state.cols);
      for (let r = 0; r < copyRows; r++) {
        for (let c = 0; c < copyCols; c++) {
          newGrid[r][c] = state.grid[r][c];
        }
      }
      // Clamp focused cell to new bounds
      let focusedCell = state.focusedCell;
      if (focusedCell) {
        const fr = Math.min(focusedCell.row, rows - 1);
        const fc = Math.min(focusedCell.col, cols - 1);
        focusedCell = { row: fr, col: fc };
      }
      return markDirty({ ...state, rows, cols, grid: newGrid, focusedCell });
    }

    case 'SET_KIND': {
      if (action.kind === state.kind) return state;
      const palette = action.kind === 'bw' ? [...BW_PALETTE] : [PRESET_COLORS[0]];
      // Clear grid when switching kind — colors are incompatible
      return markDirty({
        ...state,
        kind: action.kind,
        palette,
        grid: createEmptyGrid(state.rows, state.cols),
        selectedColor: palette[0].id,
      });
    }

    case 'ADD_PALETTE_COLOR': {
      if (state.kind === 'bw') return state;
      if (state.palette.some((c) => c.id === action.color.id)) return state;
      return markDirty({ ...state, palette: [...state.palette, action.color] });
    }

    case 'REMOVE_PALETTE_COLOR': {
      if (state.kind === 'bw') return state;
      if (state.palette.length <= 1) return state;
      const newPalette = state.palette.filter((c) => c.id !== action.colorId);
      // Remap grid cells referencing the removed color to null
      const newGrid = state.grid.map((r) =>
        r.map((cell) => (cell === action.colorId ? null : cell)),
      );
      // If selected color was removed, select first remaining color
      const selectedColor = newPalette.some((c) => c.id === state.selectedColor)
        ? state.selectedColor
        : newPalette[0].id;
      return markDirty({ ...state, palette: newPalette, grid: newGrid, selectedColor });
    }

    case 'SET_FOCUSED_CELL':
      return { ...state, focusedCell: action.cell };

    case 'VALIDATION_START':
      return { ...state, validationStatus: 'checking', validationErrors: [] };

    case 'VALIDATION_SUCCESS':
      return { ...state, validationStatus: 'valid', validationErrors: [] };

    case 'VALIDATION_FAILURE':
      return { ...state, validationStatus: 'invalid', validationErrors: action.errors };

    case 'PROPOSE_REPAIR':
      return { ...state, proposedRepair: action.changes };

    case 'ACCEPT_REPAIR': {
      if (!state.proposedRepair) return state;
      const newGrid = state.grid.map((r) => [...r]);
      for (const change of state.proposedRepair) {
        newGrid[change.row][change.col] = change.to;
      }
      return markDirty({
        ...state,
        grid: newGrid,
        proposedRepair: null,
        validationStatus: 'valid',
        validationErrors: [],
      });
    }

    case 'REJECT_REPAIR':
      return { ...state, proposedRepair: null };

    case 'LOAD_PUZZLE':
      return action.state;

    case 'MARK_SAVED':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

// ── Build PuzzleDefinition from editor state ─────────────────────────

/**
 * Convert the current editor grid into the fields needed for a PuzzleDefinition.
 * Does NOT include clues — those are derived separately via `deriveClues()`.
 */
export function buildPuzzleFields(state: EditorState): {
  id: string;
  name: string;
  kind: 'bw' | 'color';
  rows: number;
  cols: number;
  palette: PaletteColor[];
  solution: (ColorId | null)[][];
} {
  // Use existing puzzle ID in edit mode, or generate a new one
  const id =
    state.mode === 'edit' && state.sourceEntryId
      ? state.sourceEntryId.replace(/^custom:/, '')
      : crypto.randomUUID();

  return {
    id,
    name: state.name || 'Untitled',
    kind: state.kind,
    rows: state.rows,
    cols: state.cols,
    palette: [...state.palette],
    solution: state.grid.map((r) => [...r]),
  };
}

/**
 * Create an EditorState from an existing custom puzzle (for edit mode).
 * Deep-clones the solution grid to avoid mutating the original.
 */
export function stateFromPuzzle(
  entryId: string,
  puzzle: {
    id: string;
    name: string;
    kind: 'bw' | 'color';
    rows: number;
    cols: number;
    palette: readonly PaletteColor[];
    solution: readonly (readonly (ColorId | null)[])[];
  },
): EditorState {
  return {
    mode: 'edit',
    sourceEntryId: entryId,
    name: puzzle.name,
    kind: puzzle.kind,
    rows: puzzle.rows,
    cols: puzzle.cols,
    palette: puzzle.palette.map((c) => ({ ...c })),
    grid: puzzle.solution.map((r) => [...r]),
    selectedColor: puzzle.palette[0]?.id ?? colorId('black'),
    tool: 'paint',
    focusedCell: null,
    isDirty: false,
    validationStatus: 'unchecked',
    validationErrors: [],
    proposedRepair: null,
  };
}
