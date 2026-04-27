import type { GameState, SavedGameState } from '../types';

const STORAGE_PREFIX = 'pap-save-';

/**
 * Saves the current game state to localStorage.
 * Strips ephemeral validation state and adds a timestamp.
 */
export function saveGame(state: GameState): void {
  const save: SavedGameState = {
    version: 1,
    puzzleId: state.puzzleId,
    board: state.board,
    selectedColorId: state.selectedColorId,
    undoStack: state.undoStack,
    redoStack: state.redoStack,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_PREFIX + state.puzzleId, JSON.stringify(save));
}

/**
 * Loads a saved game state from localStorage for the given puzzle.
 * Returns null if no save exists or the save is invalid/incompatible.
 */
export function loadGame(puzzleId: string): SavedGameState | null {
  const raw = localStorage.getItem(STORAGE_PREFIX + puzzleId);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSave(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Deletes a saved game for the given puzzle.
 */
export function deleteSave(puzzleId: string): void {
  localStorage.removeItem(STORAGE_PREFIX + puzzleId);
}

/**
 * Checks if a save exists for the given puzzle.
 */
export function hasSave(puzzleId: string): boolean {
  return localStorage.getItem(STORAGE_PREFIX + puzzleId) !== null;
}

/**
 * Restores a GameState from a SavedGameState.
 * Re-initializes ephemeral fields (validation inactive, etc.).
 */
export function restoreGameState(save: SavedGameState, rows: number, cols: number): GameState {
  return {
    puzzleId: save.puzzleId,
    board: save.board,
    isValidationActive: false,
    cellValidation: makeUncheckedGrid(rows, cols),
    rowValidation: Array.from({ length: rows }, () => 'incomplete' as const),
    colValidation: Array.from({ length: cols }, () => 'incomplete' as const),
    selectedColorId: save.selectedColorId,
    undoStack: save.undoStack,
    redoStack: save.redoStack,
  };
}

function makeUncheckedGrid(rows: number, cols: number) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'unchecked' as const),
  );
}

/** Basic shape check for loaded save data. */
function isValidSave(data: unknown): data is SavedGameState {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.version === 1 &&
    typeof obj.puzzleId === 'string' &&
    Array.isArray(obj.board) &&
    typeof obj.selectedColorId === 'string' &&
    Array.isArray(obj.undoStack) &&
    Array.isArray(obj.redoStack) &&
    typeof obj.savedAt === 'string'
  );
}
