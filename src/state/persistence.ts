import type { GameState, SavedGameState } from '../types';

const STORAGE_PREFIX = 'pap-save-';

/**
 * Saves the current game state to localStorage.
 * Strips ephemeral validation state and adds a timestamp.
 *
 * @param entryId - Namespaced entry key (e.g. 'builtin:sample-cross-5x5').
 *                  Falls back to `state.puzzleId` for backward compatibility.
 */
export function saveGame(state: GameState, entryId?: string): void {
  const save: SavedGameState = {
    version: 1,
    puzzleId: state.puzzleId,
    board: state.board,
    selectedColorId: state.selectedColorId,
    undoStack: state.undoStack,
    redoStack: state.redoStack,
    savedAt: new Date().toISOString(),
  };
  const key = entryId ?? state.puzzleId;
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(save));
}

/**
 * Extracts the legacy (pre-entryId) save key from a namespaced entryId.
 * e.g., 'builtin:sample-cross-5x5' → 'sample-cross-5x5'
 * Returns null if the entryId is not namespaced.
 */
function legacyKeyFromEntryId(entryId: string): string | null {
  const sep = entryId.indexOf(':');
  if (sep < 0) return null;
  return entryId.slice(sep + 1);
}

/**
 * Loads a saved game state from localStorage.
 * Checks the namespaced entryId key first, then falls back to legacy
 * (pre-namespaced) key for migration. If a legacy save is found, it is
 * migrated to the new key and the old key is removed.
 */
export function loadGame(entryId: string): SavedGameState | null {
  // Try new namespaced key first
  const raw = localStorage.getItem(STORAGE_PREFIX + entryId);
  if (raw) return parseSave(raw);

  // Fall back to legacy key
  const legacyKey = legacyKeyFromEntryId(entryId);
  if (!legacyKey) return null;

  const legacyRaw = localStorage.getItem(STORAGE_PREFIX + legacyKey);
  if (!legacyRaw) return null;

  const save = parseSave(legacyRaw);
  if (save) {
    // Migrate: write under new key, remove old key
    localStorage.setItem(STORAGE_PREFIX + entryId, legacyRaw);
    localStorage.removeItem(STORAGE_PREFIX + legacyKey);
  }
  return save;
}

/** Parse and validate raw save JSON. */
function parseSave(raw: string): SavedGameState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSave(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Deletes a saved game (both namespaced and legacy keys).
 */
export function deleteSave(entryId: string): void {
  localStorage.removeItem(STORAGE_PREFIX + entryId);
  const legacyKey = legacyKeyFromEntryId(entryId);
  if (legacyKey) {
    localStorage.removeItem(STORAGE_PREFIX + legacyKey);
  }
}

/**
 * Checks if a save exists (under namespaced or legacy key).
 */
export function hasSave(entryId: string): boolean {
  if (localStorage.getItem(STORAGE_PREFIX + entryId) !== null) return true;
  const legacyKey = legacyKeyFromEntryId(entryId);
  if (!legacyKey) return false;
  return localStorage.getItem(STORAGE_PREFIX + legacyKey) !== null;
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
