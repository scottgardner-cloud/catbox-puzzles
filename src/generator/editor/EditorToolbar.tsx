import { useCallback } from 'react';
import type { EditorAction, EditorState, EditorTool } from './types';
import { GRID_SIZE_PRESETS } from './types';

interface EditorToolbarProps {
  readonly state: EditorState;
  readonly dispatch: React.Dispatch<EditorAction>;
  readonly onCheckSolvability: () => Promise<void>;
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

  const handleToolChange = useCallback(
    (tool: EditorTool) => {
      dispatch({ type: 'SET_TOOL', tool });
    },
    [dispatch],
  );

  const canExport = state.validationStatus === 'valid' && state.name.trim().length > 0;

  return (
    <div className="pap-editor-toolbar">
      {/* Puzzle name */}
      <div className="pap-editor-toolbar__field">
        <label htmlFor="pap-editor-name">Puzzle name</label>
        <input
          id="pap-editor-name"
          type="text"
          value={state.name}
          onChange={handleNameChange}
          placeholder="My Puzzle"
          maxLength={60}
        />
      </div>

      {/* Grid dimensions */}
      <div className="pap-editor-toolbar__row">
        <div className="pap-editor-toolbar__field">
          <label htmlFor="pap-editor-rows">Rows</label>
          <select id="pap-editor-rows" value={state.rows} onChange={handleRowsChange}>
            {GRID_SIZE_PRESETS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <span className="pap-editor-toolbar__separator">×</span>
        <div className="pap-editor-toolbar__field">
          <label htmlFor="pap-editor-cols">Cols</label>
          <select id="pap-editor-cols" value={state.cols} onChange={handleColsChange}>
            {GRID_SIZE_PRESETS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tool selection */}
      <fieldset className="pap-editor-toolbar__tools">
        <legend>Tool</legend>
        <div className="pap-editor-toolbar__tool-btns">
          <button
            type="button"
            className={`pap-btn${state.tool === 'paint' ? ' pap-btn--active' : ''}`}
            onClick={() => handleToolChange('paint')}
            aria-pressed={state.tool === 'paint'}
          >
            🖌 Paint
          </button>
          <button
            type="button"
            className={`pap-btn${state.tool === 'erase' ? ' pap-btn--active' : ''}`}
            onClick={() => handleToolChange('erase')}
            aria-pressed={state.tool === 'erase'}
          >
            ⌫ Erase
          </button>
        </div>
      </fieldset>

      {/* Grid actions */}
      <div className="pap-editor-toolbar__actions">
        <button
          type="button"
          className="pap-btn"
          onClick={() => dispatch({ type: 'CLEAR_GRID' })}
        >
          Clear All
        </button>
        <button
          type="button"
          className="pap-btn"
          onClick={() => dispatch({ type: 'FILL_GRID' })}
        >
          Fill All
        </button>
      </div>

      {/* Validation + Export */}
      <div className="pap-editor-toolbar__actions">
        <button
          type="button"
          className="pap-btn pap-btn--primary"
          onClick={onCheckSolvability}
          disabled={isChecking}
        >
          {isChecking ? '⏳ Checking…' : '✓ Check Solvability'}
        </button>
        <button
          type="button"
          className="pap-btn pap-btn--primary"
          onClick={onExport}
          disabled={!canExport}
          title={!canExport ? 'Check solvability and add a name before exporting' : undefined}
        >
          💾 Save to Library
        </button>
      </div>

      {/* Validation status */}
      {state.validationStatus === 'valid' && (
        <div className="pap-editor-toolbar__status pap-editor-toolbar__status--ok" role="status">
          ✓ Uniquely solvable
        </div>
      )}
      {state.validationStatus === 'invalid' && (
        <div className="pap-editor-toolbar__status pap-editor-toolbar__status--error" role="alert">
          <p>✗ Validation failed:</p>
          <ul>
            {state.validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
