import type { ColorId, PaletteColor } from '../../types';

/** Tools available in the editor. */
export type EditorTool = 'paint' | 'erase';

/** Grid cell coordinate. */
export interface CellCoord {
  readonly row: number;
  readonly col: number;
}

/** Current validation status. Reset to 'unchecked' on any grid/palette/dimension change. */
export type ValidationStatus = 'unchecked' | 'checking' | 'valid' | 'invalid';

/** Full editor state managed by useReducer. */
export interface EditorState {
  /** Whether this is a new puzzle or editing an existing one. */
  readonly mode: 'new' | 'edit';
  /** Entry ID of the puzzle being edited (null for new puzzles). */
  readonly sourceEntryId: string | null;
  /** Puzzle display name. */
  readonly name: string;
  /** B&W or color puzzle. Immutable after creation. */
  readonly kind: 'bw' | 'color';
  /** Grid dimensions. */
  readonly rows: number;
  readonly cols: number;
  /** Color palette. B&W puzzles have exactly one entry. */
  readonly palette: PaletteColor[];
  /** The pixel art grid. null = empty cell. Indexed as grid[row][col]. */
  readonly grid: (ColorId | null)[][];
  /** Currently selected color for painting. */
  readonly selectedColor: ColorId;
  /** Active tool. */
  readonly tool: EditorTool;
  /** Keyboard cursor position (null if grid not focused). */
  readonly focusedCell: CellCoord | null;
  /** Whether the grid has unsaved changes. */
  readonly isDirty: boolean;
  /** Current validation status. */
  readonly validationStatus: ValidationStatus;
  /** Validation error messages (populated when status is 'invalid'). */
  readonly validationErrors: readonly string[];
  /** Proposed repair changes awaiting user confirmation (null if none). */
  readonly proposedRepair: readonly RepairChange[] | null;
}

/** A single cell change proposed by the repair algorithm. */
export interface RepairChange {
  readonly row: number;
  readonly col: number;
  readonly from: ColorId | null;
  readonly to: ColorId | null;
}

// ── Actions ──────────────────────────────────────────────────────────

export type EditorAction =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'SELECT_COLOR'; colorId: ColorId }
  | { type: 'PAINT_CELL'; row: number; col: number }
  | { type: 'ERASE_CELL'; row: number; col: number }
  | { type: 'CLEAR_GRID' }
  | { type: 'FILL_GRID' }
  | { type: 'RESIZE_GRID'; rows: number; cols: number }
  | { type: 'SET_KIND'; kind: 'bw' | 'color' }
  | { type: 'ADD_PALETTE_COLOR'; color: PaletteColor }
  | { type: 'REMOVE_PALETTE_COLOR'; colorId: ColorId }
  | { type: 'SET_FOCUSED_CELL'; cell: CellCoord | null }
  | { type: 'VALIDATION_START' }
  | { type: 'VALIDATION_SUCCESS' }
  | { type: 'VALIDATION_FAILURE'; errors: string[] }
  | { type: 'PROPOSE_REPAIR'; changes: RepairChange[] }
  | { type: 'ACCEPT_REPAIR' }
  | { type: 'REJECT_REPAIR' }
  | { type: 'LOAD_PUZZLE'; state: EditorState }
  | { type: 'MARK_SAVED' };

// ── Preset palette colors for color mode ─────────────────────────────

export const PRESET_COLORS: readonly PaletteColor[] = [
  { id: 'black' as ColorId, name: 'Black', value: '#000000' },
  { id: 'gray' as ColorId, name: 'Gray', value: '#757575' },
  { id: 'brown' as ColorId, name: 'Brown', value: '#795548' },
  { id: 'tan' as ColorId, name: 'Tan', value: '#d4a574' },
  { id: 'red' as ColorId, name: 'Red', value: '#d32f2f' },
  { id: 'coral' as ColorId, name: 'Coral', value: '#ff7043' },
  { id: 'orange' as ColorId, name: 'Orange', value: '#e64a19' },
  { id: 'yellow' as ColorId, name: 'Yellow', value: '#fbc02d' },
  { id: 'lime' as ColorId, name: 'Lime', value: '#7cb342' },
  { id: 'green' as ColorId, name: 'Green', value: '#388e3c' },
  { id: 'teal' as ColorId, name: 'Teal', value: '#00897b' },
  { id: 'light-blue' as ColorId, name: 'Light Blue', value: '#42a5f5' },
  { id: 'blue' as ColorId, name: 'Blue', value: '#1976d2' },
  { id: 'indigo' as ColorId, name: 'Indigo', value: '#3949ab' },
  { id: 'purple' as ColorId, name: 'Purple', value: '#7b1fa2' },
  { id: 'pink' as ColorId, name: 'Pink', value: '#e91e63' },
];

/** Default B&W palette (single black color). */
export const BW_PALETTE: readonly PaletteColor[] = [
  { id: 'black' as ColorId, name: 'Black', value: '#000000' },
];

/** Grid size presets available in the editor. */
export const GRID_SIZE_PRESETS = [5, 10, 15, 20, 25, 30, 35] as const;
