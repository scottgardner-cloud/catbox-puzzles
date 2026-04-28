import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, restoreGameState, deleteSave } from './persistence';
import { createInitialGameState, cycleCell, undo } from '../engine';
import { crossPuzzle } from '../puzzles/samples';
import { colorId } from '../types';
import type { SavedGameState, PlayerCellState, GameAction, CellChange } from '../types';

const B = colorId('black');
const entryId = 'builtin:sample-cross-5x5';

/** Build a minimal valid SavedGameState for the cross puzzle. */
function makeValidSave(overrides?: Partial<SavedGameState>): SavedGameState {
  const state = createInitialGameState(crossPuzzle);
  return {
    version: 1,
    puzzleId: crossPuzzle.id,
    board: state.board as PlayerCellState[][],
    selectedColorId: state.selectedColorId,
    undoStack: [],
    redoStack: [],
    savedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('saveGame / loadGame round-trip', () => {
  it('saves and loads a game state', () => {
    const state = createInitialGameState(crossPuzzle);
    saveGame(state, entryId);
    const loaded = loadGame(entryId);
    expect(loaded).not.toBeNull();
    expect(loaded!.puzzleId).toBe(crossPuzzle.id);
    expect(loaded!.board).toEqual(state.board);
  });

  it('returns null for non-existent save', () => {
    expect(loadGame('builtin:no-such-puzzle')).toBeNull();
  });

  it('rejects malformed JSON', () => {
    localStorage.setItem('pap-save-' + entryId, 'not valid json{{{');
    expect(loadGame(entryId)).toBeNull();
  });
});

describe('isValidSave (structural validation via loadGame)', () => {
  it('rejects save with invalid board cell shapes', () => {
    const bad = makeValidSave();
    (bad as Record<string, unknown>).board = [[{ kind: 'bogus' }]];
    localStorage.setItem('pap-save-' + entryId, JSON.stringify(bad));
    expect(loadGame(entryId)).toBeNull();
  });

  it('rejects save with non-object board cells', () => {
    const bad = makeValidSave();
    (bad as Record<string, unknown>).board = [[42, 'string', null]];
    localStorage.setItem('pap-save-' + entryId, JSON.stringify(bad));
    expect(loadGame(entryId)).toBeNull();
  });

  it('rejects save missing required fields', () => {
    localStorage.setItem('pap-save-' + entryId, JSON.stringify({ version: 1 }));
    expect(loadGame(entryId)).toBeNull();
  });

  it('rejects save with wrong version', () => {
    const bad = makeValidSave();
    (bad as Record<string, unknown>).version = 99;
    localStorage.setItem('pap-save-' + entryId, JSON.stringify(bad));
    expect(loadGame(entryId)).toBeNull();
  });

  it('rejects save with invalid undo action shape', () => {
    const bad = makeValidSave({
      undoStack: [{ type: 'unknown-action' } as unknown as GameAction],
    });
    localStorage.setItem('pap-save-' + entryId, JSON.stringify(bad));
    expect(loadGame(entryId)).toBeNull();
  });

  it('rejects save with invalid set-cell change', () => {
    const bad = makeValidSave({
      undoStack: [
        {
          type: 'set-cell',
          change: {
            row: 'not-a-number',
            col: 0,
            prev: { kind: 'unknown' },
            next: { kind: 'empty' },
          },
        } as unknown as GameAction,
      ],
    });
    localStorage.setItem('pap-save-' + entryId, JSON.stringify(bad));
    expect(loadGame(entryId)).toBeNull();
  });

  it('accepts save with valid set-cells action', () => {
    const changes: CellChange[] = [
      { row: 0, col: 0, prev: { kind: 'unknown' }, next: { kind: 'filled', colorId: B } },
    ];
    const save = makeValidSave({
      undoStack: [{ type: 'set-cells', changes }],
    });
    localStorage.setItem('pap-save-' + entryId, JSON.stringify(save));
    expect(loadGame(entryId)).not.toBeNull();
  });

  it('accepts save with valid reset action', () => {
    const save = makeValidSave({
      undoStack: [
        {
          type: 'reset',
          previousBoard: Array.from({ length: 5 }, () =>
            Array.from({ length: 5 }, () => ({ kind: 'unknown' as const })),
          ),
        },
      ],
    });
    localStorage.setItem('pap-save-' + entryId, JSON.stringify(save));
    expect(loadGame(entryId)).not.toBeNull();
  });
});

describe('restoreGameState (semantic validation)', () => {
  it('restores a valid save to a GameState', () => {
    const save = makeValidSave();
    const state = restoreGameState(save, crossPuzzle);
    expect(state).not.toBeNull();
    expect(state!.puzzleId).toBe(crossPuzzle.id);
    expect(state!.isValidationActive).toBe(false);
  });

  it('rejects save with wrong board dimensions', () => {
    const save = makeValidSave({
      board: [[{ kind: 'unknown' }]], // 1×1, puzzle is 5×5
    });
    expect(restoreGameState(save, crossPuzzle)).toBeNull();
  });

  it('rejects save with puzzleId mismatch', () => {
    const save = makeValidSave({ puzzleId: 'wrong-puzzle-id' });
    expect(restoreGameState(save, crossPuzzle)).toBeNull();
  });

  it('rejects save with board cells referencing unknown colors', () => {
    const board: PlayerCellState[][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => ({ kind: 'unknown' as const })),
    );
    board[0][0] = { kind: 'filled', colorId: colorId('purple') };
    const save = makeValidSave({ board });
    expect(restoreGameState(save, crossPuzzle)).toBeNull();
  });

  it('falls back selectedColorId when not in palette', () => {
    const save = makeValidSave({
      selectedColorId: colorId('nonexistent'),
    });
    const state = restoreGameState(save, crossPuzzle);
    expect(state).not.toBeNull();
    expect(state!.selectedColorId).toBe(crossPuzzle.palette[0].id);
  });

  it('rejects history with out-of-bounds coordinates', () => {
    const save = makeValidSave({
      undoStack: [
        {
          type: 'set-cell',
          change: {
            row: 99,
            col: 0,
            prev: { kind: 'unknown' },
            next: { kind: 'filled', colorId: B },
          },
        },
      ],
    });
    expect(restoreGameState(save, crossPuzzle)).toBeNull();
  });

  it('rejects history with negative coordinates', () => {
    const save = makeValidSave({
      undoStack: [
        {
          type: 'set-cell',
          change: {
            row: -1,
            col: 0,
            prev: { kind: 'unknown' },
            next: { kind: 'empty' },
          },
        },
      ],
    });
    expect(restoreGameState(save, crossPuzzle)).toBeNull();
  });

  it('rejects history with unknown colorIds in action payloads', () => {
    const save = makeValidSave({
      undoStack: [
        {
          type: 'set-cell',
          change: {
            row: 0,
            col: 0,
            prev: { kind: 'unknown' },
            next: { kind: 'filled', colorId: colorId('magenta') },
          },
        },
      ],
    });
    expect(restoreGameState(save, crossPuzzle)).toBeNull();
  });

  it('rejects reset action with wrong previousBoard dimensions', () => {
    const save = makeValidSave({
      undoStack: [
        {
          type: 'reset',
          previousBoard: [[{ kind: 'unknown' }]], // 1×1 vs 5×5
        },
      ],
    });
    expect(restoreGameState(save, crossPuzzle)).toBeNull();
  });

  it('rejects redo stack with invalid actions', () => {
    const save = makeValidSave({
      redoStack: [
        {
          type: 'set-cells',
          changes: [
            {
              row: 0,
              col: 0,
              prev: { kind: 'unknown' },
              next: { kind: 'filled', colorId: colorId('nope') },
            },
          ],
        },
      ],
    });
    expect(restoreGameState(save, crossPuzzle)).toBeNull();
  });

  it('valid restored save supports undo without errors', () => {
    let state = createInitialGameState(crossPuzzle);
    state = cycleCell(state, 0, 0, crossPuzzle);
    state = cycleCell(state, 1, 1, crossPuzzle);

    saveGame(state, entryId);
    const save = loadGame(entryId)!;
    const restored = restoreGameState(save, crossPuzzle)!;

    expect(restored).not.toBeNull();
    const afterUndo = undo(restored, crossPuzzle);
    expect(afterUndo.undoStack.length).toBe(restored.undoStack.length - 1);
  });
});

describe('deleteSave', () => {
  it('removes saved game data', () => {
    const state = createInitialGameState(crossPuzzle);
    saveGame(state, entryId);
    expect(loadGame(entryId)).not.toBeNull();
    deleteSave(entryId);
    expect(loadGame(entryId)).toBeNull();
  });
});
