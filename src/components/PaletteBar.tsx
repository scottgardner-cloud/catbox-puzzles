import type { PaletteColor, ColorId } from '../types';

/** Props for the {@link PaletteBar} component. */
export interface PaletteBarProps {
  /** Available colors in this puzzle. */
  readonly palette: readonly PaletteColor[];
  /** Currently selected color. */
  readonly selectedColorId: ColorId;
  /** Called when the user selects a different color. */
  readonly onSelectColor: (colorId: ColorId) => void;
}

/**
 * Renders a horizontal palette bar for color puzzle mode.
 * Each color is a clickable swatch; the selected color has a highlight ring.
 * Hidden when the palette has only one color (B&W mode).
 */
export function PaletteBar({
  palette,
  selectedColorId,
  onSelectColor,
}: PaletteBarProps): React.JSX.Element | null {
  // Don't show palette for B&W puzzles
  if (palette.length <= 1) return null;

  return (
    <div className="pap-palette-bar" role="toolbar" aria-label="Color palette">
      {palette.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`pap-palette-swatch${color.id === selectedColorId ? ' pap-palette-swatch--selected' : ''}`}
          style={{ backgroundColor: color.value }}
          onClick={() => onSelectColor(color.id)}
          aria-label={`Select ${color.name}`}
          aria-pressed={color.id === selectedColorId}
          title={color.name}
        />
      ))}
    </div>
  );
}
