import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  cycleCell,
  setCells,
  undo,
  redo,
  resetBoard,
  checkErrors,
  isSolved,
  validateLine,
} from './game-logic';
import type { PlayerCellState, CellChange, GameState, ValidatedPuzzle } from '../types';
import { colorId } from '../types';
import { crossPuzzle } from '../puzzles/samples';

const B = colorId('black');

/** Build a state where every cell matches the solution. */
function solvedState(puzzle: ValidatedPuzzle): GameState {
  const state = createInitialGameState(puzzle);
  const board: PlayerCellState[][] = puzzle.solution.map((row) =>
    row.map((cell) =>
      cell === null ? { kind: 'empty' as const } : { kind: 'filled' as const, colorId: cell },
    ),
  );
  return { ...state, board };
}

describe('createInitialGameState', () => {
  it('creates a board with all unknown cells of correct dimensions', () => {
    const state = createInitialGameState(crossPuzzle);
    expect(state.board.length).toBe(crossPuzzle.rows);
    for (const row of state.board) {
      expect(row.length).toBe(crossPuzzle.cols);
      for (const cell of row) {
        expect(cell.kind).toBe('unknown');
      }
    }
  });

  it('sets puzzleId from the puzzle', () => {
    const state = createInitialGameState(crossPuzzle);
    expect(state.puzzleId).toBe(crossPuzzle.id);
  });

  it('has empty undo and redo stacks', () => {
    const state = createInitialGameState(crossPuzzle);
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(0);
  });

  it('sets selectedColorId to the first palette color', () => {
    const state = createInitialGameState(crossPuzzle);
    expect(state.selectedColorId).toBe(crossPuzzle.palette[0].id);
  });

  it('starts with validation inactive', () => {
    const state = createInitialGameState(crossPuzzle);
    expect(state.isValidationActive).toBe(false);
  });
});

describe('cycleCell', () => {
  it('cycles unknown → filled', () => {
    const state = createInitialGameState(crossPuzzle);
    const next = cycleCell(state, 0, 0, crossPuzzle);
    expect(next.board[0][0]).toEqual({ kind: 'filled', colorId: B });
  });

  it('cycles filled → empty', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle); // unknown → filled
    const next = cycleCell(state, 0, 0, crossPuzzle);
    expect(next.board[0][0]).toEqual({ kind: 'empty' });
  });

  it('cycles empty → unknown', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle); // unknown → filled
    state = cycleCell(state, 0, 0, crossPuzzle); // filled → empty
    const next = cycleCell(state, 0, 0, crossPuzzle);
    expect(next.board[0][0]).toEqual({ kind: 'unknown' });
  });

  it('pushes an action onto the undo stack', () => {
    const state = createInitialGameState(crossPuzzle);
    const next = cycleCell(state, 0, 0, crossPuzzle);
    expect(next.undoStack).toHaveLength(1);
    expect(next.undoStack[0].type).toBe('set-cell');
  });

  it('clears the redo stack', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle);
    state = undo(state, crossPuzzle); // action moves to redo
    expect(state.redoStack).toHaveLength(1);
    state = cycleCell(state, 1, 1, crossPuzzle);
    expect(state.redoStack).toHaveLength(0);
  });
});

describe('setCells', () => {
  it('applies batch changes', () => {
    const state = createInitialGameState(crossPuzzle);
    const changes: CellChange[] = [
      { row: 0, col: 0, prev: { kind: 'unknown' }, next: { kind: 'filled', colorId: B } },
      { row: 0, col: 1, prev: { kind: 'unknown' }, next: { kind: 'empty' } },
    ];
    const next = setCells(state, changes, crossPuzzle);
    expect(next.board[0][0]).toEqual({ kind: 'filled', colorId: B });
    expect(next.board[0][1]).toEqual({ kind: 'empty' });
  });

  it('records a single undo action for the batch', () => {
    const state = createInitialGameState(crossPuzzle);
    const changes: CellChange[] = [
      { row: 0, col: 0, prev: { kind: 'unknown' }, next: { kind: 'filled', colorId: B } },
      { row: 1, col: 0, prev: { kind: 'unknown' }, next: { kind: 'filled', colorId: B } },
    ];
    const next = setCells(state, changes, crossPuzzle);
    expect(next.undoStack).toHaveLength(1);
    expect(next.undoStack[0].type).toBe('set-cells');
  });

  it('returns same state for empty changes', () => {
    const state = createInitialGameState(crossPuzzle);
    const next = setCells(state, [], crossPuzzle);
    expect(next).toBe(state);
  });
});

describe('undo', () => {
  it('reverses the last action', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle); // unknown → filled
    state = undo(state, crossPuzzle);
    expect(state.board[0][0]).toEqual({ kind: 'unknown' });
  });

  it('moves action to the redo stack', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle);
    state = undo(state, crossPuzzle);
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(1);
  });

  it('returns same state when undo stack is empty', () => {
    const state = createInitialGameState(crossPuzzle);
    const next = undo(state, crossPuzzle);
    expect(next).toBe(state);
  });
});

describe('redo', () => {
  it('re-applies the undone action', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle);
    state = undo(state, crossPuzzle);
    state = redo(state, crossPuzzle);
    expect(state.board[0][0]).toEqual({ kind: 'filled', colorId: B });
  });

  it('moves action back to undo stack', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle);
    state = undo(state, crossPuzzle);
    state = redo(state, crossPuzzle);
    expect(state.undoStack).toHaveLength(1);
    expect(state.redoStack).toHaveLength(0);
  });

  it('returns same state when redo stack is empty', () => {
    const state = createInitialGameState(crossPuzzle);
    const next = redo(state, crossPuzzle);
    expect(next).toBe(state);
  });
});

describe('resetBoard', () => {
  it('sets all cells to unknown', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle);
    state = cycleCell(state, 1, 1, crossPuzzle);
    state = resetBoard(state, crossPuzzle);
    for (const row of state.board) {
      for (const cell of row) {
        expect(cell.kind).toBe('unknown');
      }
    }
  });

  it('pushes a reset action with board snapshot', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle);
    const boardBefore = state.board;
    state = resetBoard(state, crossPuzzle);
    const action = state.undoStack[state.undoStack.length - 1];
    expect(action.type).toBe('reset');
    if (action.type === 'reset') {
      expect(action.previousBoard).toBe(boardBefore);
    }
  });

  it('can be undone to restore previous board', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle);
    const filledCell = state.board[0][0];
    state = resetBoard(state, crossPuzzle);
    expect(state.board[0][0].kind).toBe('unknown');
    state = undo(state, crossPuzzle);
    expect(state.board[0][0]).toEqual(filledCell);
  });
});

describe('checkErrors', () => {
  it('marks correct cells as correct', () => {
    const state = solvedState(crossPuzzle);
    const checked = checkErrors(state, crossPuzzle);
    expect(checked.isValidationActive).toBe(true);
    for (let r = 0; r < crossPuzzle.rows; r++) {
      for (let c = 0; c < crossPuzzle.cols; c++) {
        expect(checked.cellValidation[r][c]).toBe('correct');
      }
    }
  });

  it('marks wrong-filled cells', () => {
    const state = createInitialGameState(crossPuzzle);
    // cell (0,0) should be null in cross puzzle — fill it
    const changes: CellChange[] = [
      { row: 0, col: 0, prev: { kind: 'unknown' }, next: { kind: 'filled', colorId: B } },
    ];
    const modified = setCells(state, changes, crossPuzzle);
    const checked = checkErrors(modified, crossPuzzle);
    expect(checked.cellValidation[0][0]).toBe('wrong-filled');
  });

  it('marks wrong-empty cells', () => {
    const state = createInitialGameState(crossPuzzle);
    // cell (0,1) should be filled in cross puzzle — mark it empty
    const changes: CellChange[] = [
      { row: 0, col: 1, prev: { kind: 'unknown' }, next: { kind: 'empty' } },
    ];
    const modified = setCells(state, changes, crossPuzzle);
    const checked = checkErrors(modified, crossPuzzle);
    expect(checked.cellValidation[0][1]).toBe('wrong-empty');
  });

  it('marks unknown cells as unchecked', () => {
    const state = createInitialGameState(crossPuzzle);
    const checked = checkErrors(state, crossPuzzle);
    expect(checked.cellValidation[0][0]).toBe('unchecked');
  });

  it('detects wrong-color in color puzzles', () => {
    const red = colorId('red');
    const blue = colorId('blue');
    const puzzle = {
      id: 'color-1x1',
      name: 'C',
      kind: 'color' as const,
      rows: 1,
      cols: 1,
      palette: [
        { id: red, name: 'Red', value: '#f00' },
        { id: blue, name: 'Blue', value: '#00f' },
      ],
      solution: [[red]],
      rowClues: [[{ length: 1, colorId: red }]],
      colClues: [[{ length: 1, colorId: red }]],
      __validated: true as const,
    } as ValidatedPuzzle;

    const state = createInitialGameState(puzzle);
    const board: PlayerCellState[][] = [[{ kind: 'filled', colorId: blue }]];
    const modified: GameState = { ...state, board };
    const checked = checkErrors(modified, puzzle);
    expect(checked.cellValidation[0][0]).toBe('wrong-color');
  });
});

describe('isSolved', () => {
  it('returns true when all cells match the solution', () => {
    const state = solvedState(crossPuzzle);
    expect(isSolved(state, crossPuzzle)).toBe(true);
  });

  it('returns false when any cell is wrong', () => {
    const state = solvedState(crossPuzzle);
    // Flip one cell
    const board = state.board.map((r) => [...r]);
    board[0][0] = { kind: 'filled', colorId: B }; // should be null/empty
    expect(isSolved({ ...state, board }, crossPuzzle)).toBe(false);
  });

  it('returns false when any cell is unknown', () => {
    const state = createInitialGameState(crossPuzzle);
    expect(isSolved(state, crossPuzzle)).toBe(false);
  });
});

describe('validateLine', () => {
  const solution = crossPuzzle.solution[0]; // [null, B, null, B, null]

  it('returns incomplete when line has unknown cells', () => {
    const player: PlayerCellState[] = [
      { kind: 'unknown' },
      { kind: 'filled', colorId: B },
      { kind: 'unknown' },
      { kind: 'filled', colorId: B },
      { kind: 'unknown' },
    ];
    expect(validateLine(player, solution)).toBe('incomplete');
  });

  it('returns correct when all cells match', () => {
    const player: PlayerCellState[] = [
      { kind: 'empty' },
      { kind: 'filled', colorId: B },
      { kind: 'empty' },
      { kind: 'filled', colorId: B },
      { kind: 'empty' },
    ];
    expect(validateLine(player, solution)).toBe('correct');
  });

  it('returns incorrect when cells mismatch', () => {
    const player: PlayerCellState[] = [
      { kind: 'filled', colorId: B },
      { kind: 'empty' },
      { kind: 'empty' },
      { kind: 'empty' },
      { kind: 'empty' },
    ];
    expect(validateLine(player, solution)).toBe('incorrect');
  });
});
