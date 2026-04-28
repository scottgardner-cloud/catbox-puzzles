import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllEntries,
  getBuiltinEntries,
  loadCustomEntries,
  saveCustomPuzzle,
  deleteCustomPuzzle,
  getEntryById,
} from './registry';
import { crossDefinition } from './samples';

beforeEach(() => {
  localStorage.clear();
});

describe('registry', () => {
  describe('getBuiltinEntries', () => {
    it('returns builtin puzzles', () => {
      const entries = getBuiltinEntries();
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every((e) => e.source === 'builtin')).toBe(true);
    });

    it('all builtins have valid entryId format', () => {
      const entries = getBuiltinEntries();
      for (const e of entries) {
        expect(e.entryId).toMatch(/^builtin:/);
      }
    });
  });

  describe('saveCustomPuzzle', () => {
    it('saves a valid puzzle and returns an entry', () => {
      const entry = saveCustomPuzzle(crossDefinition);
      expect(entry).not.toBeNull();
      expect(entry!.source).toBe('custom');
      expect(entry!.entryId).toMatch(/^custom:/);
      expect(entry!.puzzle.name).toBe(crossDefinition.name);
    });

    it('rejects an invalid puzzle', () => {
      const bad = { ...crossDefinition, rows: -1 };
      const entry = saveCustomPuzzle(bad);
      expect(entry).toBeNull();
    });

    it('saved puzzle appears in loadCustomEntries', () => {
      saveCustomPuzzle(crossDefinition);
      const custom = loadCustomEntries();
      expect(custom.length).toBe(1);
      expect(custom[0].puzzle.name).toBe(crossDefinition.name);
    });

    it('saved puzzle appears in getAllEntries', () => {
      const entry = saveCustomPuzzle(crossDefinition)!;
      const all = getAllEntries();
      expect(all.find((e) => e.entryId === entry.entryId)).toBeDefined();
    });
  });

  describe('deleteCustomPuzzle', () => {
    it('removes a saved custom puzzle', () => {
      const entry = saveCustomPuzzle(crossDefinition)!;
      expect(loadCustomEntries().length).toBe(1);

      deleteCustomPuzzle(entry.entryId);
      expect(loadCustomEntries().length).toBe(0);
    });

    it('does nothing for builtin entryId', () => {
      const builtins = getBuiltinEntries();
      const countBefore = getAllEntries().length;
      deleteCustomPuzzle(builtins[0].entryId);
      expect(getAllEntries().length).toBe(countBefore);
    });

    it('also removes associated saved game data', () => {
      const entry = saveCustomPuzzle(crossDefinition)!;
      // Simulate a save existing for this entry
      localStorage.setItem(`pap-save-${entry.entryId}`, '{"fake":"save"}');
      expect(localStorage.getItem(`pap-save-${entry.entryId}`)).not.toBeNull();

      deleteCustomPuzzle(entry.entryId);
      expect(localStorage.getItem(`pap-save-${entry.entryId}`)).toBeNull();
    });
  });

  describe('getEntryById', () => {
    it('finds a builtin entry', () => {
      const builtins = getBuiltinEntries();
      const found = getEntryById(builtins[0].entryId);
      expect(found).toBeDefined();
      expect(found!.entryId).toBe(builtins[0].entryId);
    });

    it('finds a custom entry', () => {
      const entry = saveCustomPuzzle(crossDefinition)!;
      const found = getEntryById(entry.entryId);
      expect(found).toBeDefined();
      expect(found!.puzzle.name).toBe(crossDefinition.name);
    });

    it('returns undefined for unknown entryId', () => {
      expect(getEntryById('nonexistent')).toBeUndefined();
    });
  });

  describe('loadCustomEntries', () => {
    it('skips corrupt localStorage entries', () => {
      // Write corrupt data
      localStorage.setItem('pap-custom-manifest', JSON.stringify(['bad-id']));
      localStorage.setItem('pap-custom-bad-id', 'not valid json{{{');
      expect(loadCustomEntries().length).toBe(0);
    });

    it('skips entries with invalid puzzle data', () => {
      localStorage.setItem('pap-custom-manifest', JSON.stringify(['bad-id']));
      localStorage.setItem(
        'pap-custom-bad-id',
        JSON.stringify({
          version: 1,
          puzzle: { id: 'x', name: 'Bad', kind: 'bw', rows: -1, cols: 5, palette: [], rowClues: [], colClues: [], solution: [] },
          internalId: 'bad-id',
          createdAt: new Date().toISOString(),
        }),
      );
      expect(loadCustomEntries().length).toBe(0);
    });
  });
});
