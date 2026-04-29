import type { EditorAction, EditorState } from './types';
import { PRESET_COLORS } from './types';

interface EditorPaletteProps {
  readonly state: EditorState;
  readonly dispatch: React.Dispatch<EditorAction>;
}

/**
 * Palette panel for color mode. Shows active colors, allows selection,
 * and provides add/remove functionality from preset colors.
 */
export function EditorPalette({ state, dispatch }: EditorPaletteProps): React.JSX.Element | null {
  if (state.kind === 'bw') return null;

  const availableToAdd = PRESET_COLORS.filter((pc) => !state.palette.some((p) => p.id === pc.id));

  return (
    <div className="pap-editor-palette">
      <h3 className="pap-editor-palette__title">Palette</h3>
      <div className="pap-editor-palette__colors" role="radiogroup" aria-label="Color palette">
        {state.palette.map((color) => (
          <div key={color.id} className="pap-editor-palette__entry">
            <button
              type="button"
              className={`pap-editor-palette__swatch${state.selectedColor === color.id ? ' pap-editor-palette__swatch--selected' : ''}`}
              style={{ backgroundColor: color.value }}
              onClick={() => dispatch({ type: 'SELECT_COLOR', colorId: color.id })}
              role="radio"
              aria-checked={state.selectedColor === color.id}
              aria-label={color.name}
              title={color.name}
            />
            {state.palette.length > 1 && (
              <button
                type="button"
                className="pap-editor-palette__remove"
                onClick={() => dispatch({ type: 'REMOVE_PALETTE_COLOR', colorId: color.id })}
                aria-label={`Remove ${color.name}`}
                title={`Remove ${color.name}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {availableToAdd.length > 0 && (
        <div className="pap-editor-palette__add">
          <p className="pap-editor-palette__add-label">Add color:</p>
          <div className="pap-editor-palette__add-grid">
            {availableToAdd.map((c) => (
              <button
                key={c.id}
                type="button"
                className="pap-editor-palette__add-btn"
                onClick={() => dispatch({ type: 'ADD_PALETTE_COLOR', color: c })}
                aria-label={`Add ${c.name}`}
                title={`Add ${c.name}`}
              >
                <span
                  className="pap-editor-palette__add-swatch"
                  style={{ backgroundColor: c.value }}
                />
                <span className="pap-editor-palette__add-name">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
