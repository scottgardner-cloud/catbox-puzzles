import { useCallback } from 'react';
import type { EditorAction, EditorState } from './types';
import { GRID_SIZE_PRESETS } from './types';

interface EditorToolbarProps {
  readonly state: EditorState;
  readonly dispatch: React.Dispatch<EditorAction>;
  readonly onCheckSolvability: () => Promise<boolean>;
  readonly onAttemptRepair: () => Promise<void>;
  readonly onExport: () => void;
  readonly isChecking: boolean;
}

/**
 * Editor toolbar: puzzle name, grid size, tool selection, clear/fill,
 * validation check, and export.
 */
export function EditorToolbar({
  state,
  dispatch,
  onCheckSolvability,
  onAttemptRepair,
  onExport,
  isChecking,
}: EditorToolbarProps): React.JSX.Element {
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: 'SET_NAME', name: e.target.value });
    },
    [dispatch],
  );

  const handleRowsChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const rows = Number(e.target.value);
      dispatch({ type: 'RESIZE_GRID', rows, cols: state.cols });
    },
    [dispatch, state.cols],
  );

  const handleColsChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const cols = Number(e.target.value);
      dispatch({ type: 'RESIZE_GRID', rows: state.rows, cols });
    },
    [dispatch, state.rows],
  );

  const canExport = state.name.trim().length > 0 && !isChecking;

  return (
    <div className="cb-editor-toolbar">
      {/* Puzzle name */}
      <div className="cb-editor-toolbar__field">
        <label htmlFor="cb-editor-name">Puzzle name</label>
        <input
          id="cb-editor-name"
          type="text"
          value={state.name}
          onChange={handleNameChange}
          placeholder="My Puzzle"
          maxLength={60}
        />
      </div>

      {/* Puzzle kind (B&W / Color) — disabled in edit mode */}
      <fieldset className="cb-editor-toolbar__tools">
        <legend>Type</legend>
        <div className="cb-editor-toolbar__tool-btns">
          <button
            type="button"
            className={`cb-btn${state.kind === 'bw' ? ' cb-btn--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_KIND', kind: 'bw' })}
            disabled={state.mode === 'edit'}
            aria-pressed={state.kind === 'bw'}
          >
            B&W
          </button>
          <button
            type="button"
            className={`cb-btn${state.kind === 'color' ? ' cb-btn--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_KIND', kind: 'color' })}
            disabled={state.mode === 'edit'}
            aria-pressed={state.kind === 'color'}
          >
            Color
          </button>
        </div>
      </fieldset>

      {/* Grid dimensions */}
      <div className="cb-editor-toolbar__row">
        <div className="cb-editor-toolbar__field">
          <label htmlFor="cb-editor-rows">Rows</label>
          <select id="cb-editor-rows" value={state.rows} onChange={handleRowsChange}>
            {GRID_SIZE_PRESETS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <span className="cb-editor-toolbar__separator">×</span>
        <div className="cb-editor-toolbar__field">
          <label htmlFor="cb-editor-cols">Cols</label>
          <select id="cb-editor-cols" value={state.cols} onChange={handleColsChange}>
            {GRID_SIZE_PRESETS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid actions */}
      <div className="cb-editor-toolbar__actions">
        <button type="button" className="cb-btn" onClick={() => dispatch({ type: 'CLEAR_GRID' })}>
          Clear All
        </button>
        <button type="button" className="cb-btn" onClick={() => dispatch({ type: 'FILL_GRID' })}>
          Fill All
        </button>
      </div>

      {/* Validation + Export */}
      <div className="cb-editor-toolbar__actions">
        <button
          type="button"
          className="cb-btn cb-btn--primary"
          onClick={onCheckSolvability}
          disabled={isChecking}
        >
          {isChecking ? '⏳ Checking…' : '✓ Check Solvability'}
        </button>
        <button
          type="button"
          className="cb-btn cb-btn--primary"
          onClick={onExport}
          disabled={!canExport}
        >
          💾 Save to Library
        </button>
      </div>

      {/* Save requirements hint */}
      {state.name.trim().length === 0 && (
        <p className="cb-editor-toolbar__hint">Enter a puzzle name to save.</p>
      )}

      {/* Validation status */}
      {state.validationStatus === 'valid' && (
        <div className="cb-editor-toolbar__status cb-editor-toolbar__status--ok" role="status">
          ✓ Uniquely solvable
        </div>
      )}
      {state.validationStatus === 'invalid' && (
        <div className="cb-editor-toolbar__status cb-editor-toolbar__status--error" role="alert">
          <p>✗ Validation failed:</p>
          <ul>
            {state.validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          <button
            type="button"
            className="cb-btn cb-btn--primary"
            onClick={onAttemptRepair}
            disabled={isChecking}
            style={{ marginTop: 8 }}
          >
            🔧 Fix Solvability
          </button>
        </div>
      )}

      {/* Proposed repair confirmation */}
      {state.proposedRepair && (
        <div className="cb-editor-toolbar__status cb-editor-toolbar__status--repair" role="status">
          <p>
            🔧 Repair found: {state.proposedRepair.length} cell
            {state.proposedRepair.length !== 1 ? 's' : ''} would change.
          </p>
          <p className="cb-editor-toolbar__repair-hint">
            Changed cells are highlighted on the grid.
          </p>
          <div className="cb-editor-toolbar__actions">
            <button
              type="button"
              className="cb-btn cb-btn--primary"
              onClick={() => dispatch({ type: 'ACCEPT_REPAIR' })}
            >
              ✓ Apply Changes
            </button>
            <button
              type="button"
              className="cb-btn"
              onClick={() => dispatch({ type: 'REJECT_REPAIR' })}
            >
              ✗ Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
