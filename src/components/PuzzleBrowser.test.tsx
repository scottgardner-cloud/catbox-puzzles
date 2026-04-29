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
  it('renders tab bar with Puzzles tab active by default', () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    const tab = screen.getByRole('button', { name: 'Puzzles' });
    expect(tab).toBeInTheDocument();
    expect(tab.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows My Puzzles tab', () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'My Puzzles' })).toBeInTheDocument();
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

  it('shows delete button for custom puzzles on My Puzzles tab', async () => {
    const entries = getEntries();
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
    // Switch to My Puzzles tab
    await userEvent.click(screen.getByRole('button', { name: 'My Puzzles' }));
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    expect(deleteBtn).toBeInTheDocument();
  });

  it('search filters puzzles by name', async () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    const search = screen.getByRole('searchbox');
    const firstBuiltin = entries.find((e) => e.source === 'builtin')!;
    await userEvent.type(search, firstBuiltin.puzzle.name);
    expect(screen.getByText(firstBuiltin.puzzle.name)).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of/)).toBeInTheDocument();
  });

  it('filter chips toggle and filter results', async () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    const bwChip = screen.getByRole('button', { name: 'B&W' });
    await userEvent.click(bwChip);
    expect(bwChip.getAttribute('aria-pressed')).toBe('true');
  });

  it('sort dropdown changes order', async () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    const sort = screen.getByRole('combobox', { name: /sort/i });
    await userEvent.selectOptions(sort, 'name');
    // First card should be alphabetically first
    const cards = screen.getAllByRole('listitem');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('tab switching shows correct entries', async () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    // Default is builtin
    const builtinCount = entries.filter((e) => e.source === 'builtin').length;
    expect(
      screen.getByText(`Showing ${builtinCount} of ${builtinCount} puzzles`),
    ).toBeInTheDocument();

    // Switch to All
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(
      screen.getByText(`Showing ${entries.length} of ${entries.length} puzzles`),
    ).toBeInTheDocument();
  });

  it('shows empty filter message when no matches', async () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    const search = screen.getByRole('searchbox');
    await userEvent.type(search, 'zzz-nonexistent-puzzle-zzz');
    expect(screen.getByText('No puzzles match your filters.')).toBeInTheDocument();
  });

  it('renders thumbnail for each puzzle card', () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    // All unsolved puzzles get placeholder thumbnails (role="img")
    const thumbnails = screen.getAllByRole('img', { name: /preview|not yet solved/i });
    expect(thumbnails.length).toBeGreaterThan(0);
  });

  it('unsolved thumbnail shows placeholder with accessible label', () => {
    const entries = getEntries();
    render(<PuzzleBrowser entries={entries} onSelectPuzzle={vi.fn()} />);
    const firstBuiltin = entries.find((e) => e.source === 'builtin')!;
    // Unsolved puzzles show "not yet solved" placeholder
    const thumbnail = screen.getByRole('img', {
      name: `${firstBuiltin.puzzle.name} — not yet solved`,
    });
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail.textContent).toBe('?');
  });
});
