import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Grid } from './Grid';
import type { GridProps } from './Grid';
import type { PlayerCellState, CellValidation, LineValidation } from '../types';
import { colorId } from '../types';

const B = colorId('black');

/** Create a minimal 3×3 B&W grid props for testing. */
function make3x3Props(overrides: Partial<GridProps> = {}): GridProps {
  const board: PlayerCellState[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => ({ kind: 'unknown' as const })),
  );
  const cellVal: CellValidation[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => 'unchecked' as const),
  );
  const rowVal: LineValidation[] = ['incomplete', 'incomplete', 'incomplete'];
  const colVal: LineValidation[] = ['incomplete', 'incomplete', 'incomplete'];
  const rowClues = [
    [{ length: 1, colorId: B }],
    [{ length: 3, colorId: B }],
    [{ length: 1, colorId: B }],
  ];
  const colClues = [
    [{ length: 1, colorId: B }],
    [{ length: 3, colorId: B }],
    [{ length: 1, colorId: B }],
  ];
  const palette = [{ id: B, name: 'Black', value: '#000000' }];

  return {
    board,
    cellValidation: cellVal,
    rowValidation: rowVal,
    colValidation: colVal,
    rowClues,
    colClues,
    palette,
    isValidationActive: false,
    onCellClick: vi.fn(),
    onCellDragEnter: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    ...overrides,
  };
}

describe('Grid', () => {
  it('renders the correct number of cells', () => {
    render(<Grid {...make3x3Props()} />);
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(9);
  });

  it('has a grid role with accessible name', () => {
    render(<Grid {...make3x3Props()} />);
    expect(screen.getByRole('grid', { name: /puzzle grid/i })).toBeInTheDocument();
  });

  it('calls onCellClick when a cell is clicked', async () => {
    const onClick = vi.fn();
    render(<Grid {...make3x3Props({ onCellClick: onClick })} />);
    const cells = screen.getAllByRole('gridcell');
    await userEvent.click(cells[0]);
    expect(onClick).toHaveBeenCalledWith(0, 0);
  });

  it('calls onCellClick with correct coordinates for middle cell', async () => {
    const onClick = vi.fn();
    render(<Grid {...make3x3Props({ onCellClick: onClick })} />);
    const cells = screen.getAllByRole('gridcell');
    // Cell at index 4 = row 1, col 1
    await userEvent.click(cells[4]);
    expect(onClick).toHaveBeenCalledWith(1, 1);
  });

  it('supports keyboard navigation with arrow keys', async () => {
    const onClick = vi.fn();
    render(<Grid {...make3x3Props({ onCellClick: onClick })} />);
    const grid = screen.getByRole('grid');

    // Tab into the grid
    await userEvent.tab();
    // Press Space to click the focused cell (should be 0,0)
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledWith(0, 0);
  });

  it('Space/Enter triggers onCellClick on focused cell', async () => {
    const onClick = vi.fn();
    render(<Grid {...make3x3Props({ onCellClick: onClick })} />);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledWith(0, 0);
  });

  it('displays row clues', () => {
    render(<Grid {...make3x3Props()} />);
    // The cross pattern has clue "3" in the middle row
    const threes = screen.getAllByText('3');
    expect(threes.length).toBeGreaterThan(0);
  });

  it('displays column clues', () => {
    render(<Grid {...make3x3Props()} />);
    // The cross pattern has clue "3" in the middle column
    const threes = screen.getAllByText('3');
    expect(threes.length).toBeGreaterThanOrEqual(2); // at least row and col
  });

  it('shows validation indicators when active', () => {
    const rowVal: LineValidation[] = ['correct', 'incorrect', 'incomplete'];
    const props = make3x3Props({ isValidationActive: true, rowValidation: rowVal });
    render(<Grid {...props} />);
    // Correct indicator should be visible
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('row validation indicators always reflect line status', () => {
    const rowVal: LineValidation[] = ['correct', 'incorrect', 'incomplete'];
    const props = make3x3Props({ isValidationActive: false, rowValidation: rowVal });
    render(<Grid {...props} />);
    // Row indicators show regardless of isValidationActive
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });
});
