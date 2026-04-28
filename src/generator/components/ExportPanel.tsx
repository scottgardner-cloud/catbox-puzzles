import { useCallback } from 'react';
import type { ValidatedPuzzle } from '../../types';
import type { GeneratorError } from '../hooks/usePuzzleGenerator';

export interface ExportPanelProps {
  readonly puzzle: ValidatedPuzzle | null;
  readonly errors: readonly { message: string }[] | null;
  readonly error: GeneratorError | null;
  readonly isSaving: boolean;
  readonly onSaveToLibrary: () => void;
  readonly onReset: () => void;
}

/**
 * Export panel for saving, downloading, or copying the generated puzzle.
 * Shows validation errors if generation produced an invalid puzzle.
 */
export function ExportPanel({
  puzzle,
  errors,
  error,
  isSaving,
  onSaveToLibrary,
  onReset,
}: ExportPanelProps): React.JSX.Element {
  const handleDownload = useCallback(() => {
    if (!puzzle) return;
    const json = JSON.stringify(puzzle, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${puzzle.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [puzzle]);

  const handleCopy = useCallback(async () => {
    if (!puzzle) return;
    const json = JSON.stringify(puzzle, null, 2);
    await navigator.clipboard.writeText(json);
  }, [puzzle]);

  return (
    <section className="pap-gen-export" aria-label="Export options">
      {/* Generation/system errors */}
      {error && (
        <div className="pap-gen-export__error" role="alert">
          <p><strong>Error:</strong> {error.message}</p>
          {error.recoveryHint && <p className="pap-gen-export__hint">{error.recoveryHint}</p>}
        </div>
      )}

      {/* Validation errors from pipeline */}
      {errors && errors.length > 0 && (
        <div className="pap-gen-export__errors" role="alert">
          <p><strong>Puzzle validation failed:</strong></p>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success actions */}
      {puzzle && (
        <div className="pap-gen-export__actions">
          <button
            type="button"
            className="pap-btn pap-btn--primary"
            onClick={onSaveToLibrary}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? 'Saving…' : '💾 Save to Library'}
          </button>
          <button
            type="button"
            className="pap-btn"
            onClick={handleDownload}
          >
            ⬇ Download JSON
          </button>
          <button
            type="button"
            className="pap-btn"
            onClick={handleCopy}
          >
            📋 Copy JSON
          </button>
        </div>
      )}

      {/* Always show start over */}
      <div className="pap-gen-export__secondary">
        <button type="button" className="pap-btn" onClick={onReset}>
          ↩ Start Over
        </button>
      </div>
    </section>
  );
}
