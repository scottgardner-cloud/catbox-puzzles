import type {
  ValidatedPuzzle,
  GameState,
  PlayerCellState,
  CellChange,
  GameAction,
  CellValidation,
  LineValidation,
  ColorId,
} from '../types';

/**
 * Creates the initial game state for a validated puzzle.
 * All cells are unknown, validation is inactive, undo/redo stacks are empty,
 * and the selected color is the first palette color.
 */
export function createInitialGameState(puzzle: ValidatedPuzzle): GameState {
  const unknownCell: PlayerCellState = { kind: 'unknown' };
  const board: PlayerCellState[][] = [];
  for (let r = 0; r < puzzle.rows; r++) {
    const row: PlayerCellState[] = [];
    for (let c = 0; c < puzzle.cols; c++) {
      row.push(unknownCell);
    }
    board.push(row);
  }

  const uncheckedCell: CellValidation = 'unchecked';
  const cellValidation: CellValidation[][] = [];
  for (let r = 0; r < puzzle.rows; r++) {
    const row: CellValidation[] = [];
    for (let c = 0; c < puzzle.cols; c++) {
      row.push(uncheckedCell);
    }
    cellValidation.push(row);
  }

  return {
    puzzleId: puzzle.id,
    board,
    isValidationActive: false,
    cellValidation,
    rowValidation: Array.from<LineValidation>({ length: puzzle.rows }).fill('incomplete'),
    colValidation: Array.from<LineValidation>({ length: puzzle.cols }).fill('incomplete'),
    selectedColorId: puzzle.palette[0].id,
    undoStack: [],
    redoStack: [],
  };
}

/**
 * Compute per-line validation from the current board.
 * Cell validation is left unchecked (only populated by explicit error check).
 */
export function computeLineValidation(
  board: readonly (readonly PlayerCellState[])[],
  puzzle: ValidatedPuzzle,
): {
  cellValidation: CellValidation[][];
  rowValidation: LineValidation[];
  colValidation: LineValidation[];
} {
  const rows = puzzle.rows;
  const cols = puzzle.cols;
  const cellValidation: CellValidation[][] = [];
  for (let r = 0; r < rows; r++) {
    cellValidation.push(Array.from<CellValidation>({ length: cols }).fill('unchecked'));
  }

  const rowValidation: LineValidation[] = [];
  for (let r = 0; r < rows; r++) {
    rowValidation.push(validateLine(board[r], puzzle.solution[r]));
  }

  const colValidation: LineValidation[] = [];
  for (let c = 0; c < cols; c++) {
    const playerCol: PlayerCellState[] = [];
    const solutionCol: (ColorId | null)[] = [];
    for (let r = 0; r < rows; r++) {
      playerCol.push(board[r][c]);
      solutionCol.push(puzzle.solution[r][c]);
    }
    colValidation.push(validateLine(playerCol, solutionCol));
  }

  return { cellValidation, rowValidation, colValidation };
}

/** Shallow-clone a 2D board and apply cell changes. */
function applyChangesToBoard(
  board: readonly (readonly PlayerCellState[])[],
  changes: readonly CellChange[],
  direction: 'forward' | 'reverse',
): PlayerCellState[][] {
  const newBoard = board.map((row) => [...row]);
  for (const change of changes) {
    newBoard[change.row][change.col] = direction === 'forward' ? change.next : change.prev;
  }
  return newBoard;
}

/**
 * Cycles a cell through unknown → filled → empty → unknown.
 * The filled state uses the currently selected color.
 * Pushes an undo action and clears the redo stack.
 */
export function cycleCell(
  state: GameState,
  row: number,
  col: number,
  puzzle: ValidatedPuzzle,
): GameState {
  const current = state.board[row][col];
  let next: PlayerCellState;

  switch (current.kind) {
    case 'unknown':
      next = { kind: 'filled', colorId: state.selectedColorId };
      break;
    case 'filled':
      next = { kind: 'empty' };
      break;
    case 'empty':
      next = { kind: 'unknown' };
      break;
  }

  const change: CellChange = { row, col, prev: current, next };
  const action: GameAction = { type: 'set-cell', change };
  const newBoard = applyChangesToBoard(state.board, [change], 'forward');

  return {
    ...state,
    board: newBoard,
    isValidationActive: false,
    ...computeLineValidation(newBoard, puzzle),
    undoStack: [...state.undoStack, action],
    redoStack: [],
  };
}

/**
 * Applies multiple cell changes at once (e.g. drag operations).
 * Recorded as a single undo action for the entire batch.
 */
export function setCells(
  state: GameState,
  changes: CellChange[],
  puzzle: ValidatedPuzzle,
): GameState {
  if (changes.length === 0) return state;

  const action: GameAction = { type: 'set-cells', changes };
  const newBoard = applyChangesToBoard(state.board, changes, 'forward');

  return {
    ...state,
    board: newBoard,
    isValidationActive: false,
    ...computeLineValidation(newBoard, puzzle),
    undoStack: [...state.undoStack, action],
    redoStack: [],
  };
}

/** Reverse an action to recover the previous board state. */
function reverseAction(
  board: readonly (readonly PlayerCellState[])[],
  action: GameAction,
): PlayerCellState[][] {
  switch (action.type) {
    case 'set-cell':
      return applyChangesToBoard(board, [action.change], 'reverse');
    case 'set-cells':
      return applyChangesToBoard(board, action.changes, 'reverse');
    case 'reset':
      return action.previousBoard.map((row) => [...row]);
  }
}

/** Apply an action forward to the board. */
function applyAction(
  board: readonly (readonly PlayerCellState[])[],
  action: GameAction,
  rows: number,
  cols: number,
): PlayerCellState[][] {
  switch (action.type) {
    case 'set-cell':
      return applyChangesToBoard(board, [action.change], 'forward');
    case 'set-cells':
      return applyChangesToBoard(board, action.changes, 'forward');
    case 'reset': {
      const newBoard: PlayerCellState[][] = [];
      const unknownCell: PlayerCellState = { kind: 'unknown' };
      for (let r = 0; r < rows; r++) {
        newBoard.push(Array.from<PlayerCellState>({ length: cols }).fill(unknownCell));
      }
      return newBoard;
    }
  }
}

/**
 * Undoes the most recent action, moving it to the redo stack.
 * Clears validation state. Returns unchanged state if nothing to undo.
 */
export function undo(state: GameState, puzzle: ValidatedPuzzle): GameState {
  if (state.undoStack.length === 0) return state;

  const action = state.undoStack[state.undoStack.length - 1];
  const newBoard = reverseAction(state.board, action);

  return {
    ...state,
    board: newBoard,
    isValidationActive: false,
    ...computeLineValidation(newBoard, puzzle),
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, action],
  };
}

/**
 * Redoes the most recently undone action, moving it back to the undo stack.
 * Clears validation state. Returns unchanged state if nothing to redo.
 */
export function redo(state: GameState, puzzle: ValidatedPuzzle): GameState {
  if (state.redoStack.length === 0) return state;

  const action = state.redoStack[state.redoStack.length - 1];
  const rows = puzzle.rows;
  const cols = puzzle.cols;
  const newBoard = applyAction(state.board, action, rows, cols);

  return {
    ...state,
    board: newBoard,
    isValidationActive: false,
    ...computeLineValidation(newBoard, puzzle),
    undoStack: [...state.undoStack, action],
    redoStack: state.redoStack.slice(0, -1),
  };
}

/**
 * Resets all cells to unknown. Saves a snapshot of the current board
 * as a reset action for undo support. Clears validation state.
 */
export function resetBoard(state: GameState, puzzle: ValidatedPuzzle): GameState {
  const rows = puzzle.rows;
  const cols = puzzle.cols;
  const unknownCell: PlayerCellState = { kind: 'unknown' };

  const newBoard: PlayerCellState[][] = [];
  for (let r = 0; r < rows; r++) {
    newBoard.push(Array.from<PlayerCellState>({ length: cols }).fill(unknownCell));
  }

  const action: GameAction = {
    type: 'reset',
    previousBoard: state.board,
  };

  return {
    ...state,
    board: newBoard,
    isValidationActive: false,
    ...computeLineValidation(newBoard, puzzle),
    undoStack: [...state.undoStack, action],
    redoStack: [],
  };
}

/**
 * Checks a single line (row or column) of player cells against the solution.
 *
 * @returns `'incomplete'` if the line contains unknown cells,
 *          `'correct'` if every cell matches the solution,
 *          `'incorrect'` otherwise.
 */
export function validateLine(
  playerCells: readonly PlayerCellState[],
  solutionCells: readonly (ColorId | null)[],
): LineValidation {
  for (const cell of playerCells) {
    if (cell.kind === 'unknown') return 'incomplete';
  }
  for (let i = 0; i < playerCells.length; i++) {
    const player = playerCells[i];
    const solution = solutionCells[i];
    if (solution === null) {
      if (player.kind !== 'empty') return 'incorrect';
    } else {
      if (player.kind !== 'filled' || player.colorId !== solution) return 'incorrect';
    }
  }
  return 'correct';
}

/**
 * Activates error checking. Compares each non-unknown cell against the
 * solution and computes per-cell, per-row, and per-column validation.
 */
export function checkErrors(state: GameState, puzzle: ValidatedPuzzle): GameState {
  const rows = puzzle.rows;
  const cols = puzzle.cols;

  // Per-cell validation
  const cellValidation: CellValidation[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: CellValidation[] = [];
    for (let c = 0; c < cols; c++) {
      const player = state.board[r][c];
      const solution = puzzle.solution[r][c];

      if (player.kind === 'unknown') {
        row.push('unchecked');
      } else if (player.kind === 'filled') {
        if (solution === null) {
          row.push('wrong-filled');
        } else if (player.colorId !== solution) {
          row.push('wrong-color');
        } else {
          row.push('correct');
        }
      } else {
        // empty
        if (solution !== null) {
          row.push('wrong-empty');
        } else {
          row.push('correct');
        }
      }
    }
    cellValidation.push(row);
  }

  // Per-row validation
  const rowValidation: LineValidation[] = [];
  for (let r = 0; r < rows; r++) {
    rowValidation.push(validateLine(state.board[r], puzzle.solution[r]));
  }

  // Per-col validation
  const colValidation: LineValidation[] = [];
  for (let c = 0; c < cols; c++) {
    const playerCol: PlayerCellState[] = [];
    const solutionCol: (ColorId | null)[] = [];
    for (let r = 0; r < rows; r++) {
      playerCol.push(state.board[r][c]);
      solutionCol.push(puzzle.solution[r][c]);
    }
    colValidation.push(validateLine(playerCol, solutionCol));
  }

  return {
    ...state,
    isValidationActive: true,
    cellValidation,
    rowValidation,
    colValidation,
  };
}

/**
 * Determines whether the puzzle is solved.
 * Every cell must match the solution — filled cells must have the correct color,
 * and empty cells must correspond to null solution cells.
 * Any unknown cells mean the puzzle is NOT solved.
 */
export function isSolved(state: GameState, puzzle: ValidatedPuzzle): boolean {
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const player = state.board[r][c];
      const solution = puzzle.solution[r][c];

      if (player.kind === 'unknown') return false;

      if (solution === null) {
        if (player.kind !== 'empty') return false;
      } else {
        if (player.kind !== 'filled' || player.colorId !== solution) return false;
      }
    }
  }
  return true;
}
