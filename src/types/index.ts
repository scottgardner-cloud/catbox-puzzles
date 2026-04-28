/**
 * Branded color identifier. Each puzzle defines its own palette of colors.
 * For B&W puzzles, the palette contains a single color (typically 'black').
 */
export type ColorId = string & { readonly __brand: 'ColorId' };

/** Helper to create a ColorId from a plain string. */
export function colorId(id: string): ColorId {
  return id as ColorId;
}

/** A color entry in a puzzle's palette. */
export interface PaletteColor {
  /** Unique identifier for this color within the puzzle. */
  readonly id: ColorId;
  /** Display name (e.g., "Red", "Blue"). */
  readonly name: string;
  /** CSS-compatible color value (e.g., "#ff0000", "rgb(255,0,0)"). */
  readonly value: string;
}

/**
 * A single clue run — one number in a row/column's clue sequence.
 *
 * Invariants:
 * - `length` must be a positive integer (>= 1).
 * - `colorId` must reference a color in the puzzle's palette.
 */
export interface ClueRun {
  /** Number of consecutive filled cells. Must be >= 1. */
  readonly length: number;
  /** Which color this run uses. Must exist in the puzzle's palette. */
  readonly colorId: ColorId;
}

/**
 * Clue data for a single row or column.
 *
 * Invariants:
 * - An empty array means the line has no filled cells (entirely empty).
 * - No ClueRun should have length <= 0.
 * - The total length of all runs plus required separators must not exceed the line length.
 *   - B&W: separators required between all adjacent runs.
 *   - Color: separators required only between adjacent same-color runs.
 */
export type LineClue = readonly ClueRun[];

/**
 * The immutable definition of a puzzle.
 * This is what the player is trying to solve — it never changes during gameplay.
 *
 * Invariants:
 * - `rowClues.length === rows`
 * - `colClues.length === cols`
 * - `solution.length === rows`, each row has `cols` entries
 * - All ColorId values in clues and solution reference colors in `palette`
 * - Clues must be derivable from the solution (they describe the same picture)
 * - B&W puzzles (`kind === 'bw'`) have exactly one color in the palette
 *
 * Use `validatePuzzleDefinition()` from the engine to verify these invariants.
 */
export interface PuzzleDefinition {
  /** Unique identifier for this puzzle. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** Whether this is a black-and-white or color puzzle. */
  readonly kind: 'bw' | 'color';
  /** Number of rows. */
  readonly rows: number;
  /** Number of columns. */
  readonly cols: number;
  /** Color palette for this puzzle. B&W puzzles have exactly one color. */
  readonly palette: readonly PaletteColor[];
  /** Clues for each row, indexed by row number. */
  readonly rowClues: readonly LineClue[];
  /** Clues for each column, indexed by column number. */
  readonly colClues: readonly LineClue[];
  /**
   * The solution grid. Each cell contains the ColorId if filled, or null if empty.
   * Indexed as solution[row][col].
   */
  readonly solution: readonly (readonly (ColorId | null)[])[];
}

/**
 * A validated puzzle definition. This branded type can only be created via
 * `validatePuzzleDefinition()`, which checks all invariants.
 *
 * The game engine and state management should accept `ValidatedPuzzle` rather than
 * raw `PuzzleDefinition` to ensure only valid puzzles enter the system.
 */
export type ValidatedPuzzle = PuzzleDefinition & {
  readonly __validated: true;
};

/**
 * The visual/interaction state of a single cell as set by the player.
 * The player cycles: unknown → filled → empty → unknown.
 */
export type PlayerCellState =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'filled'; readonly colorId: ColorId }
  | { readonly kind: 'empty' };

/**
 * Validation result for a single cell, determined when the player
 * triggers error checking.
 */
export type CellValidation =
  | 'correct'
  | 'wrong-filled' // Cell is filled but should be empty
  | 'wrong-empty' // Cell is empty but should be filled
  | 'wrong-color' // Cell is filled with the wrong color
  | 'unchecked'; // Not yet validated (unknown cells, or check not triggered)

/**
 * Validation status for a completed row or column.
 * A line is "complete" when it has no unknown cells.
 * Validation is against the solution grid.
 */
export type LineValidation =
  | 'incomplete' // Still has unknown cells
  | 'correct' // All cells match the solution
  | 'incorrect'; // Some cells don't match the solution

/** A single cell state change, used in undo/redo actions. */
export interface CellChange {
  readonly row: number;
  readonly col: number;
  readonly prev: PlayerCellState;
  readonly next: PlayerCellState;
}

/**
 * A player action that can be undone/redone.
 *
 * Note: Color selection is UI-only and NOT part of the undo/redo history.
 * Note: Validation state is ephemeral — cleared on undo, redo, and reset.
 *       It is NOT modeled as an action.
 */
export type GameAction =
  | { readonly type: 'set-cell'; readonly change: CellChange }
  | { readonly type: 'set-cells'; readonly changes: readonly CellChange[] }
  | {
      readonly type: 'reset';
      /** Snapshot of the board before reset, enabling undo. */
      readonly previousBoard: readonly (readonly PlayerCellState[])[];
    };

/**
 * Timer lifecycle status.
 * - `'idle'` — timer not yet started (no cell interaction yet)
 * - `'running'` — actively counting solve time
 * - `'stopped'` — puzzle solved, timer frozen
 */
export type TimerStatus = 'idle' | 'running' | 'stopped';

/**
 * The game session state — the player's progress on a puzzle.
 *
 * Note: `isSolved` is NOT stored here. It is derived from `board` + puzzle solution
 * by the engine. This prevents it from drifting out of sync.
 *
 * Note: `selectedColorId` is UI-only state and is NOT part of undo/redo history.
 *
 * Note: Validation state (`isValidationActive`, `cellValidation`, `rowValidation`,
 * `colValidation`) is ephemeral. It is cleared on undo, redo, and reset, and is
 * NOT modeled as an action in the history.
 *
 * The `puzzleId` must reference a `ValidatedPuzzle` — the engine will not
 * create a GameState for an unvalidated puzzle.
 */
export interface GameState {
  /** The puzzle being solved. */
  readonly puzzleId: string;
  /** The player's current cell states, indexed as board[row][col]. */
  readonly board: readonly (readonly PlayerCellState[])[];
  /**
   * Whether error checking is currently active.
   * Set to true when the player triggers a check; cleared when any cell is modified.
   */
  readonly isValidationActive: boolean;
  /** Validation results per cell. Only meaningful when isValidationActive is true. */
  readonly cellValidation: readonly (readonly CellValidation[])[];
  /** Validation status for each row. Updated whenever the board changes. */
  readonly rowValidation: readonly LineValidation[];
  /** Validation status for each column. Updated whenever the board changes. */
  readonly colValidation: readonly LineValidation[];
  /** Currently selected color (for color puzzles). UI-only, not part of undo/redo. */
  readonly selectedColorId: ColorId;
  /** Undo history stack. */
  readonly undoStack: readonly GameAction[];
  /** Redo history stack. Cleared when a new action is performed. */
  readonly redoStack: readonly GameAction[];
  /** Accumulated solve time in milliseconds (excludes paused/away time). */
  readonly elapsedMs: number;
  /** Timer lifecycle status. */
  readonly timerStatus: TimerStatus;
}

/**
 * Serializable save data for a game in progress.
 * Used for localStorage persistence. Strips ephemeral state (validation)
 * and non-serializable concerns.
 *
 * Saved on explicit user action (save button). Loaded automatically when
 * the player returns to a puzzle that has saved progress.
 */
export interface SavedGameState {
  /** Schema version for future migration support. */
  readonly version: 1;
  /** The puzzle this save belongs to. */
  readonly puzzleId: string;
  /** The player's cell states at time of save. */
  readonly board: readonly (readonly PlayerCellState[])[];
  /** Selected color at time of save. */
  readonly selectedColorId: ColorId;
  /** Undo history at time of save. */
  readonly undoStack: readonly GameAction[];
  /** Redo history at time of save. */
  readonly redoStack: readonly GameAction[];
  /** ISO 8601 timestamp of when the save was created. */
  readonly savedAt: string;
  /** Accumulated solve time in milliseconds. */
  readonly elapsedMs: number;
  /** Timer lifecycle status at time of save. */
  readonly timerStatus: TimerStatus;
}
