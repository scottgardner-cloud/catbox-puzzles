import type { PuzzleDefinition } from '../types';
import { validatePuzzleDefinition } from '../engine/validation';
import { deleteSave } from '../state/persistence';
import { getSamplePuzzles } from './samples';
import type { PuzzleEntry, StoredCustomPuzzle } from './types';

const CUSTOM_PREFIX = 'catbox-nonogram-custom-';
const MANIFEST_KEY = 'catbox-nonogram-custom-manifest';

/** Wraps built-in sample puzzles as PuzzleEntry objects. */
export function getBuiltinEntries(): PuzzleEntry[] {
  return getSamplePuzzles().map((puzzle) => ({
    puzzle,
    source: 'builtin' as const,
    entryId: `builtin:${puzzle.id}`,
  }));
}

/** Loads custom puzzles from localStorage, re-validates each, skips invalid entries. */
export function loadCustomEntries(): PuzzleEntry[] {
  const manifest = loadManifest();
  const entries: PuzzleEntry[] = [];

  for (const id of manifest) {
    const raw = localStorage.getItem(CUSTOM_PREFIX + id);
    if (!raw) continue;

    try {
      const stored: unknown = JSON.parse(raw);
      if (!isValidStoredPuzzle(stored)) continue;

      const result = validatePuzzleDefinition(stored.puzzle);
      if (Array.isArray(result)) continue; // validation failed

      entries.push({
        puzzle: result,
        source: 'custom',
        entryId: `custom:${stored.internalId}`,
        createdAt: stored.createdAt,
      });
    } catch {
      // Silently skip corrupt entries
    }
  }

  return entries;
}

/** Returns all puzzle entries: builtins first, then custom sorted by createdAt. */
export function getAllEntries(): PuzzleEntry[] {
  const builtins = getBuiltinEntries();
  const custom = loadCustomEntries().sort((a, b) => {
    const ta = a.createdAt ?? '';
    const tb = b.createdAt ?? '';
    return ta.localeCompare(tb);
  });
  return [...builtins, ...custom];
}

/** Finds a puzzle entry by its namespaced entryId. */
export function getEntryById(entryId: string): PuzzleEntry | undefined {
  return getAllEntries().find((e) => e.entryId === entryId);
}

/**
 * Validates and saves a custom puzzle definition.
 * Assigns a UUID, stores it in localStorage, and returns the new PuzzleEntry.
 * Returns null if the puzzle fails validation.
 */
export function saveCustomPuzzle(puzzle: PuzzleDefinition): PuzzleEntry | null {
  const result = validatePuzzleDefinition(puzzle);
  if (Array.isArray(result)) return null;

  const internalId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const stored: StoredCustomPuzzle = {
    version: 1,
    puzzle,
    internalId,
    createdAt,
  };

  localStorage.setItem(CUSTOM_PREFIX + internalId, JSON.stringify(stored));

  const manifest = loadManifest();
  manifest.push(internalId);
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));

  return {
    puzzle: result,
    source: 'custom',
    entryId: `custom:${internalId}`,
    createdAt,
  };
}

/**
 * Updates an existing custom puzzle in-place.
 * Preserves the same internalId and manifest entry. Deletes any stale saved game
 * since the puzzle definition has changed.
 * Returns null if validation fails or entryId is not a custom puzzle.
 */
export function updateCustomPuzzle(entryId: string, puzzle: PuzzleDefinition): PuzzleEntry | null {
  if (!entryId.startsWith('custom:')) return null;
  const internalId = entryId.slice('custom:'.length);

  // Verify the entry exists
  const existing = localStorage.getItem(CUSTOM_PREFIX + internalId);
  if (!existing) return null;

  const result = validatePuzzleDefinition(puzzle);
  if (Array.isArray(result)) return null;

  let createdAt: string;
  try {
    const stored: unknown = JSON.parse(existing);
    createdAt = isValidStoredPuzzle(stored) ? stored.createdAt : new Date().toISOString();
  } catch {
    createdAt = new Date().toISOString();
  }

  const updated: StoredCustomPuzzle = {
    version: 1,
    puzzle,
    internalId,
    createdAt,
  };

  localStorage.setItem(CUSTOM_PREFIX + internalId, JSON.stringify(updated));

  // Delete stale saved game — puzzle has changed, old progress is invalid
  deleteSave(entryId);

  return {
    puzzle: result,
    source: 'custom',
    entryId,
    createdAt,
  };
}

/** Removes a custom puzzle and its associated game save from localStorage. */
export function deleteCustomPuzzle(entryId: string): void {
  if (!entryId.startsWith('custom:')) return;
  const internalId = entryId.slice('custom:'.length);

  localStorage.removeItem(CUSTOM_PREFIX + internalId);
  deleteSave(entryId);

  const manifest = loadManifest().filter((id) => id !== internalId);
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function loadManifest(): string[] {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

/** Basic shape check for stored custom puzzle data. */
function isValidStoredPuzzle(data: unknown): data is StoredCustomPuzzle {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.version === 1 &&
    typeof obj.puzzle === 'object' &&
    obj.puzzle !== null &&
    typeof obj.internalId === 'string' &&
    typeof obj.createdAt === 'string'
  );
}
