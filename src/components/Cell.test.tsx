import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cell } from './Cell';
import type { PlayerCellState, CellValidation } from '../types';
import { colorId } from '../types';

const noop = () => {};
const B = colorId('black');

function renderCell(
  state: PlayerCellState = { kind: 'unknown' },
  validation: CellValidation = 'unchecked',
  extra: Partial<React.ComponentProps<typeof Cell>> = {},
) {
  return render(
    <Cell
      state={state}
      validation={validation}
      onClick={noop}
      onDragEnter={noop}
      size={30}
      {...extra}
    />,
  );
}

describe('Cell', () => {
  it('renders unknown state with neutral background', () => {
    renderCell({ kind: 'unknown' });
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('pap-cell--unknown');
  });

  it('renders filled state with background color', () => {
    renderCell({ kind: 'filled', colorId: B }, 'unchecked', { fillColor: '#000000' });
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('pap-cell--filled');
    expect(cell.style.backgroundColor).toBe('rgb(0, 0, 0)');
  });

  it('renders empty state with × mark', () => {
    renderCell({ kind: 'empty' });
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('pap-cell--empty');
    expect(cell.textContent).toBe('×');
  });

  it('fires onClick when clicked', async () => {
    const onClick = vi.fn();
    render(
      <Cell
        state={{ kind: 'unknown' }}
        validation="unchecked"
        onClick={onClick}
        onDragEnter={noop}
        size={30}
      />,
    );
    await userEvent.click(screen.getByRole('gridcell'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies validation class for wrong-filled', () => {
    renderCell({ kind: 'filled', colorId: B }, 'wrong-filled');
    const cell = screen.getByRole('gridcell');
    expect(cell.className).toContain('pap-cell--wrong-filled');
  });

  it('applies validation class for correct', () => {
    renderCell({ kind: 'filled', colorId: B }, 'correct');
    expect(screen.getByRole('gridcell').className).toContain('pap-cell--correct');
  });

  it('does not apply validation class for unchecked', () => {
    renderCell({ kind: 'unknown' }, 'unchecked');
    const cell = screen.getByRole('gridcell');
    expect(cell.className).not.toContain('pap-cell--unchecked');
  });

  it('applies focused class when isFocused', () => {
    renderCell({ kind: 'unknown' }, 'unchecked', { isFocused: true });
    expect(screen.getByRole('gridcell').className).toContain('pap-cell--focused');
  });

  it('applies hinted class when isHinted', () => {
    renderCell({ kind: 'unknown' }, 'unchecked', { isHinted: true });
    expect(screen.getByRole('gridcell').className).toContain('pap-cell--hinted');
  });

  it('has accessible label for unknown unchecked', () => {
    renderCell({ kind: 'unknown' });
    expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'unknown');
  });

  it('has accessible label for filled with validation', () => {
    renderCell({ kind: 'filled', colorId: B }, 'correct');
    expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'filled (correct)');
  });
});
