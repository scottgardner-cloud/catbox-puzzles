import type { ColorId } from '../../types';
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
          <label htmlFor="pap-editor-add-color" className="pap-editor-palette__add-label">
            Add color:
          </label>
          <select
            id="pap-editor-add-color"
            className="pap-editor-palette__add-select"
            value=""
            onChange={(e) => {
              const colorId = e.target.value as ColorId;
              const color = PRESET_COLORS.find((c) => c.id === colorId);
              if (color) dispatch({ type: 'ADD_PALETTE_COLOR', color });
            }}
          >
            <option value="" disabled>
              Choose…
            </option>
            {availableToAdd.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
