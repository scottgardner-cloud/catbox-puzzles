import type { PlayerCellState, CellValidation } from '../types';

/** Props for the {@link Cell} component. */
export interface CellProps {
  /** Current cell state as set by the player. */
  readonly state: PlayerCellState;
  /** Current validation result for this cell. */
  readonly validation: CellValidation;
  /** CSS color string for filled cells (resolved from palette). */
  readonly fillColor?: string;
  /** Called when the cell is clicked. */
  readonly onClick: () => void;
  /** Called when a drag enters this cell. */
  readonly onDragEnter: () => void;
  /** Cell size in pixels (for responsive sizing). */
  readonly size: number;
  /** 1-based row index for ARIA. */
  readonly ariaRowIndex?: number;
  /** 1-based column index for ARIA. */
  readonly ariaColIndex?: number;
  /** Whether this cell has keyboard focus. */
  readonly isFocused?: boolean;
  /** Whether this cell is highlighted as a hint. */
  readonly isHinted?: boolean;
}

/**
 * Renders a single nonogram grid cell.
 *
 * - Unknown cells show a neutral background.
 * - Filled cells use the resolved palette color as background.
 * - Empty cells display an × mark.
 * - Validation overlays are applied via CSS classes.
 */
export function Cell({
  state,
  validation,
  fillColor,
  onClick,
  onDragEnter,
  size,
  ariaRowIndex,
  ariaColIndex,
  isFocused,
  isHinted,
}: CellProps): React.JSX.Element {
  const classNames = ['cb-cell'];

  // State class
  classNames.push(`cb-cell--${state.kind}`);

  // Validation class (skip unchecked to avoid noise)
  if (validation !== 'unchecked') {
    classNames.push(`cb-cell--${validation}`);
  }

  // Keyboard focus indicator
  if (isFocused) {
    classNames.push('cb-cell--focused');
  }

  // Hint highlight
  if (isHinted) {
    classNames.push('cb-cell--hinted');
  }

  const style: React.CSSProperties = {
    width: size,
    height: size,
  };

  if (state.kind === 'filled' && fillColor) {
    style.backgroundColor = fillColor;
  }

  return (
    <div
      className={classNames.join(' ')}
      style={style}
      onClick={onClick}
      onMouseEnter={onDragEnter}
      role="gridcell"
      aria-label={cellAriaLabel(state, validation)}
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      aria-selected={isFocused || undefined}
    >
      {state.kind === 'empty' && <span className="cb-cell__mark">×</span>}
    </div>
  );
}

/** Build an accessible label describing the cell's current state. */
function cellAriaLabel(state: PlayerCellState, validation: CellValidation): string {
  const stateLabel =
    state.kind === 'filled' ? 'filled' : state.kind === 'empty' ? 'marked empty' : 'unknown';

  if (validation === 'unchecked') return stateLabel;
  return `${stateLabel} (${validation})`;
}
