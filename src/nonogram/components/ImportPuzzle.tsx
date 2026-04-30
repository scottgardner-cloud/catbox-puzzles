import { useCallback, useEffect, useRef, useState } from 'react';
import { saveCustomPuzzle } from '../puzzles/registry';
import type { PuzzleDefinition } from '../types';
import type { PuzzleEntry } from '../puzzles/types';
import './ImportPuzzle.css';

/** Props for the {@link ImportPuzzle} component. */
export interface ImportPuzzleProps {
  /** Called after a puzzle is successfully imported. */
  readonly onImport: (entry: PuzzleEntry) => void;
  /** Called when the modal is closed. */
  readonly onClose: () => void;
}

/**
 * Extract a PuzzleDefinition from parsed JSON.
 * Accepts either a raw PuzzleDefinition or an ExportedPuzzle wrapper.
 */
function extractPuzzleDefinition(data: unknown): PuzzleDefinition | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;

  // ExportedPuzzle wrapper: { version, puzzle, ... }
  if (obj.version === 1 && typeof obj.puzzle === 'object' && obj.puzzle !== null) {
    return obj.puzzle as PuzzleDefinition;
  }

  // Raw PuzzleDefinition: has id, rows, cols, palette, etc.
  if (typeof obj.id === 'string' && typeof obj.rows === 'number' && typeof obj.cols === 'number') {
    return data as PuzzleDefinition;
  }

  return null;
}

/**
 * Modal for importing a puzzle from JSON (paste or file upload).
 * Supports both raw PuzzleDefinition and ExportedPuzzle formats.
 */
export function ImportPuzzle({ onImport, onClose }: ImportPuzzleProps): React.JSX.Element {
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus textarea on open
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const tryImport = useCallback(
    (text: string) => {
      setError(null);

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setError('Invalid JSON. Please check the format and try again.');
        return;
      }

      const definition = extractPuzzleDefinition(parsed);
      if (!definition) {
        setError('Unrecognized format. Expected a PuzzleDefinition or ExportedPuzzle JSON object.');
        return;
      }

      let entry;
      try {
        entry = saveCustomPuzzle(definition);
      } catch {
        setError('Puzzle validation failed. The puzzle data may be incomplete or malformed.');
        return;
      }
      if (!entry) {
        setError(
          'Puzzle validation failed. Ensure the puzzle has valid dimensions, clues, solution, and palette.',
        );
        return;
      }

      onImport(entry);
    },
    [onImport],
  );

  const handleSubmit = useCallback(() => {
    tryImport(json);
  }, [json, tryImport]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        setJson(text);
        tryImport(text);
      };
      reader.onerror = () => setError('Failed to read file.');
      reader.readAsText(file);
    },
    [tryImport],
  );

  return (
    <div className="cb-import__backdrop" onClick={onClose} role="presentation">
      <div
        className="cb-import__modal"
        role="dialog"
        aria-modal="true"
        aria-label="Import puzzle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cb-import__header">
          <h3>Import Puzzle</h3>
          <button type="button" className="cb-import__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="cb-import__description">
          Paste a puzzle JSON below, or upload a <code>.json</code> file.
        </p>

        <textarea
          ref={textareaRef}
          className="cb-import__textarea"
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setError(null);
          }}
          placeholder='{"id": "my-puzzle", "name": "My Puzzle", "kind": "bw", ...}'
          rows={10}
          spellCheck={false}
        />

        {error && (
          <p className="cb-import__error" role="alert">
            {error}
          </p>
        )}

        <div className="cb-import__actions">
          <button
            type="button"
            className="cb-btn cb-import__submit"
            onClick={handleSubmit}
            disabled={json.trim().length === 0}
          >
            Import
          </button>
          <label className="cb-btn cb-import__upload">
            Upload File
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              hidden
            />
          </label>
          <button type="button" className="cb-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
