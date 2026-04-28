import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PuzzleBrowser } from './PuzzleBrowser';
import { getAllEntries } from '../puzzles/registry';
import type { PuzzleEntry } from '../puzzles/types';

vi.mock('../state/persistence', () => ({
  hasSave: vi.fn(() => false),
  loadGame: vi.fn(() => null),
  restoreGameState: vi.fn(() => null),
  deleteSave: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function getEntries(): PuzzleEntry[] {
  return getAllEntries();
}

describe('PuzzleBrowser', () => {
  it('renders builtin puzzles section', () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Puzzles' })).toBeInTheDocument();
  });

  it('shows My Puzzles section', () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'My Puzzles' })).toBeInTheDocument();
  });

  it('displays puzzle names as buttons', () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    const firstBuiltin = entries.find((e) => e.source === 'builtin');
    if (firstBuiltin) {
      expect(screen.getByText(firstBuiltin.puzzle.name)).toBeInTheDocument();
    }
  });

  it('calls onSelectPuzzle when a puzzle card is clicked', async () => {
    const entries = getEntries();
    const onSelect = vi.fn();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={onSelect} />);
    const firstBuiltin = entries.find((e) => e.source === 'builtin')!;
    const card = screen.getByText(firstBuiltin.puzzle.name).closest('button');
    await userEvent.click(card!);
    expect(onSelect).toHaveBeenCalledWith(firstBuiltin.entryId);
  });

  it('shows puzzle dimensions', () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    const firstBuiltin = entries.find((e) => e.source === 'builtin')!;
    // Look for dimension badge containing rows and cols
    const dimRegex = new RegExp(`${firstBuiltin.puzzle.rows}.*${firstBuiltin.puzzle.cols}`);
    const badges = screen.getAllByText(dimRegex);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows "New" status for puzzles without saves', () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    const newBadges = screen.getAllByText('New');
    expect(newBadges.length).toBeGreaterThan(0);
  });

  it('shows delete button for custom puzzles', () => {
    const entries = getEntries();
    // Add a mock custom entry
    const customEntries: PuzzleEntry[] = [
      ...entries,
      {
        puzzle: entries[0].puzzle,
        source: 'custom',
        entryId: 'custom:test-id',
        createdAt: new Date().toISOString(),
      },
    ];
    const onDelete = vi.fn();
    render(
      <PuzzleBrowser entries={customEntries} onSelectPuzzle={vi.fn()} onDeletePuzzle={onDelete} />,
    );
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    expect(deleteBtn).toBeInTheDocument();
  });
});
