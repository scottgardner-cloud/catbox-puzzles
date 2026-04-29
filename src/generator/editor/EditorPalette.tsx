import { useCallback, useRef, useState } from 'react';
import type { ColorId } from '../../types';
import type { EditorAction, EditorState } from './types';
import { PRESET_COLORS } from './types';

interface EditorPaletteProps {
  readonly state: EditorState;
  readonly dispatch: React.Dispatch<EditorAction>;
}

/** Calculate relative luminance (0–1) from a hex color string. */
function hexLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  // sRGB linearization
  const lr = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
  const lg = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
  const lb = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/**
 * Palette panel for color mode. Shows active colors, allows selection,
 * and provides add/remove functionality from preset colors or custom hex picker.
 */
export function EditorPalette({ state, dispatch }: EditorPaletteProps): React.JSX.Element | null {
  const [customHex, setCustomHex] = useState('#888888');
  const [customName, setCustomName] = useState('');
  const [luminanceWarning, setLuminanceWarning] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  const handleCustomColorChange = useCallback((hex: string) => {
    setCustomHex(hex);
    setLuminanceWarning(hexLuminance(hex) > 0.85);
  }, []);

  const handleAddCustomColor = useCallback(() => {
    const hex = customHex.toLowerCase();
    const id = hex.replace('#', '') as ColorId;
    if (state.palette.some((p) => p.id === id)) return;
    const name = customName.trim() || hex;
    dispatch({ type: 'ADD_PALETTE_COLOR', color: { id, name, value: hex } });
    setCustomName('');
  }, [customHex, customName, state.palette, dispatch]);

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

      {/* Custom color picker */}
      <div className="pap-editor-palette__custom">
        <p className="pap-editor-palette__add-label">Custom color:</p>
        <div className="pap-editor-palette__custom-row">
          <input
            ref={pickerRef}
            type="color"
            value={customHex}
            onChange={(e) => handleCustomColorChange(e.target.value)}
            className="pap-editor-palette__color-input"
            aria-label="Pick a custom color"
          />
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Name (optional)"
            maxLength={20}
            className="pap-editor-palette__name-input"
          />
          <button type="button" className="pap-btn" onClick={handleAddCustomColor}>
            Add
          </button>
        </div>
        {luminanceWarning && (
          <p className="pap-editor-palette__warning">
            ⚠ Very light color — may be hard to see on the grid.
          </p>
        )}
      </div>

      {/* Preset colors */}
      {availableToAdd.length > 0 && (
        <div className="pap-editor-palette__add">
          <p className="pap-editor-palette__add-label">Presets:</p>
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
