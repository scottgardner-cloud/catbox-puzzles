import type {
  GameState,
  SavedGameState,
  ValidatedPuzzle,
  PlayerCellState,
  GameAction,
  CellChange,
  ColorId,
  TimerStatus,
} from '../types';
import { computeLineValidation } from '../engine';

const STORAGE_PREFIX = 'catbox-nonogram-save-';

// ── Helpers ─────────────────────────────────────────────────────────

/** Type-guard for a valid PlayerCellState shape. */
function isValidCellState(cell: unknown): cell is PlayerCellState {
  if (typeof cell !== 'object' || cell === null) return false;
  const obj = cell as Record<string, unknown>;
  switch (obj.kind) {
    case 'unknown':
    case 'empty':
      return true;
    case 'filled':
      return typeof obj.colorId === 'string';
    default:
      return false;
  }
}

/** Type-guard for a valid CellChange shape (structural only). */
function isValidCellChange(change: unknown): change is CellChange {
  if (typeof change !== 'object' || change === null) return false;
  const obj = change as Record<string, unknown>;
  return (
    typeof obj.row === 'number' &&
    typeof obj.col === 'number' &&
    isValidCellState(obj.prev) &&
    isValidCellState(obj.next)
  );
}

/** Type-guard for a valid GameAction shape (structural only). */
function isValidAction(action: unknown): action is GameAction {
  if (typeof action !== 'object' || action === null) return false;
  const obj = action as Record<string, unknown>;
  switch (obj.type) {
    case 'set-cell':
      return isValidCellChange(obj.change);
    case 'set-cells':
      return Array.isArray(obj.changes) && obj.changes.every(isValidCellChange);
    case 'reset':
      return (
        Array.isArray(obj.previousBoard) &&
        obj.previousBoard.every((row: unknown) => Array.isArray(row) && row.every(isValidCellState))
      );
    default:
      return false;
  }
}

/** Check that a board contains only valid cells structurally. */
function isValidBoard(board: unknown): board is PlayerCellState[][] {
  return (
    Array.isArray(board) &&
    board.every((row: unknown) => Array.isArray(row) && row.every(isValidCellState))
  );
}

/** Valid timer status values. */
const VALID_TIMER_STATUSES: ReadonlySet<string> = new Set(['idle', 'running', 'stopped']);

/**
 * Saves the current game state to localStorage.
 * Strips ephemeral validation state and adds a timestamp.
 *
 * @param state - Current game state.
 * @param entryId - Namespaced entry key (e.g. 'builtin:sample-cross-5x5').
 *                  Falls back to `state.puzzleId` for backward compatibility.
 * @param timerOverride - Flushed timer values from the live timer. If provided,
 *                        these take precedence over `state.elapsedMs`/`state.timerStatus`.
 */
export function saveGame(
  state: GameState,
  entryId?: string,
  timerOverride?: { elapsedMs: number; timerStatus: TimerStatus },
): void {
  const save: SavedGameState = {
    version: 1,
    puzzleId: state.puzzleId,
    board: state.board,
    selectedColorId: state.selectedColorId,
    undoStack: state.undoStack,
    redoStack: state.redoStack,
    savedAt: new Date().toISOString(),
    elapsedMs: timerOverride?.elapsedMs ?? state.elapsedMs,
    timerStatus: timerOverride?.timerStatus ?? state.timerStatus,
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

/** Parse and validate raw save JSON. Normalizes missing timer fields for legacy saves. */
function parseSave(raw: string): SavedGameState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSave(parsed)) return null;
    // Normalize legacy saves missing timer fields
    return {
      ...parsed,
      elapsedMs: typeof parsed.elapsedMs === 'number' ? parsed.elapsedMs : 0,
      timerStatus: VALID_TIMER_STATUSES.has(parsed.timerStatus as string)
        ? (parsed.timerStatus as TimerStatus)
        : 'idle',
    };
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

// ── Semantic helpers ────────────────────────────────────────────────

/** Check that all filled-cell colorIds in a board exist in the palette. */
function boardColorsValid(
  board: readonly (readonly PlayerCellState[])[],
  paletteIds: ReadonlySet<ColorId>,
): boolean {
  return board.every((row) =>
    row.every((cell) => cell.kind !== 'filled' || paletteIds.has(cell.colorId)),
  );
}

/** Check that all cell changes in an action reference valid coords and palette colors. */
function actionSemanticsValid(
  action: GameAction,
  rows: number,
  cols: number,
  paletteIds: ReadonlySet<ColorId>,
): boolean {
  const changeValid = (c: CellChange): boolean =>
    Number.isInteger(c.row) &&
    Number.isInteger(c.col) &&
    c.row >= 0 &&
    c.row < rows &&
    c.col >= 0 &&
    c.col < cols &&
    (c.prev.kind !== 'filled' || paletteIds.has(c.prev.colorId)) &&
    (c.next.kind !== 'filled' || paletteIds.has(c.next.colorId));

  switch (action.type) {
    case 'set-cell':
      return changeValid(action.change);
    case 'set-cells':
      return action.changes.every(changeValid);
    case 'reset':
      return (
        action.previousBoard.length === rows &&
        action.previousBoard.every((row) => row.length === cols) &&
        boardColorsValid(action.previousBoard, paletteIds)
      );
  }
}

/**
 * Restores a GameState from a SavedGameState.
 * Validates the save against the puzzle: dimensions, cell colors, history
 * coordinates, and history cell colors. Returns null if incompatible.
 * Re-initializes ephemeral fields (validation inactive, line validation derived).
 */
export function restoreGameState(save: SavedGameState, puzzle: ValidatedPuzzle): GameState | null {
  const { rows, cols } = puzzle;

  // Puzzle ID must match
  if (save.puzzleId !== puzzle.id) return null;

  // Validate board dimensions
  if (
    !Array.isArray(save.board) ||
    save.board.length !== rows ||
    save.board.some((row) => !Array.isArray(row) || row.length !== cols)
  ) {
    return null;
  }

  const paletteIds = new Set<ColorId>(puzzle.palette.map((c) => c.id));

  // Validate board cell colors against palette
  if (!boardColorsValid(save.board, paletteIds)) return null;

  // Validate history actions semantically
  const allActions = [...save.undoStack, ...save.redoStack];
  if (!allActions.every((a) => actionSemanticsValid(a, rows, cols, paletteIds))) {
    return null;
  }

  // Validate or fall back selectedColorId
  const selectedColorId = paletteIds.has(save.selectedColorId)
    ? save.selectedColorId
    : puzzle.palette[0].id;

  const derived = computeLineValidation(save.board, puzzle);

  // Timer fields default to idle/0 for legacy saves
  const elapsedMs = typeof save.elapsedMs === 'number' ? save.elapsedMs : 0;
  const timerStatus: TimerStatus =
    typeof save.timerStatus === 'string' && VALID_TIMER_STATUSES.has(save.timerStatus)
      ? save.timerStatus
      : 'idle';

  return {
    puzzleId: save.puzzleId,
    board: save.board,
    isValidationActive: false,
    cellValidation: derived.cellValidation,
    rowValidation: derived.rowValidation,
    colValidation: derived.colValidation,
    selectedColorId,
    undoStack: save.undoStack,
    redoStack: save.redoStack,
    elapsedMs,
    timerStatus,
  };
}

/** Structural shape check for loaded save data. */
function isValidSave(data: unknown): data is SavedGameState {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  // Timer fields are optional for backward compatibility with legacy saves
  if (obj.elapsedMs !== undefined && typeof obj.elapsedMs !== 'number') return false;
  if (obj.timerStatus !== undefined && !VALID_TIMER_STATUSES.has(obj.timerStatus as string))
    return false;

  return (
    obj.version === 1 &&
    typeof obj.puzzleId === 'string' &&
    isValidBoard(obj.board) &&
    typeof obj.selectedColorId === 'string' &&
    Array.isArray(obj.undoStack) &&
    obj.undoStack.every(isValidAction) &&
    Array.isArray(obj.redoStack) &&
    obj.redoStack.every(isValidAction) &&
    typeof obj.savedAt === 'string'
  );
}
