import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { GameRoute } from './GamePage';
import { getAllEntries } from '../puzzles/registry';
import type { PuzzleEntry } from '../puzzles/types';

// ── Mocks ───────────────────────────────────────────────────────────

const mockSaveGame = vi.fn();
const mockLoadGame = vi.fn((_entryId?: string) => null);

vi.mock('../state/persistence', () => ({
  saveGame: (...args: unknown[]) => mockSaveGame(...args),
  loadGame: (entryId: string) => mockLoadGame(entryId),
  restoreGameState: vi.fn(() => null),
  hasSave: vi.fn(() => false),
  deleteSave: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────────────────

function getSmallBuiltinEntry(): PuzzleEntry {
  const entries = getAllEntries();
  const small = entries.find((e) => e.source === 'builtin' && e.puzzle.rows <= 5);
  if (!small) throw new Error('No small builtin puzzle found');
  return small;
}

function renderGame(entry: PuzzleEntry) {
  return render(
    <MemoryRouter initialEntries={[`/play/${encodeURIComponent(entry.entryId)}`]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/play/:entryId" element={<GameRoute />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// ── Tests ───────────────────────────────────────────────────────────

describe('GamePage', () => {
  it('renders the puzzle grid with correct dimensions', () => {
    const entry = getSmallBuiltinEntry();
    renderGame(entry);
    const grid = screen.getByRole('grid', { name: /puzzle grid/i });
    expect(grid).toBeInTheDocument();
  });

  it('renders control buttons', () => {
    const entry = getSmallBuiltinEntry();
    renderGame(entry);
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('undo is disabled on fresh puzzle', () => {
    const entry = getSmallBuiltinEntry();
    renderGame(entry);
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
  });

  it('redo is disabled on fresh puzzle', () => {
    const entry = getSmallBuiltinEntry();
    renderGame(entry);
    expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled();
  });

  it('clicking a cell enables undo', async () => {
    const user = userEvent.setup();
    const entry = getSmallBuiltinEntry();
    renderGame(entry);

    // Find the first cell in the grid and click it
    const cells = screen.getAllByRole('gridcell');
    expect(cells.length).toBeGreaterThan(0);
    await user.click(cells[0]);

    expect(screen.getByRole('button', { name: /undo/i })).not.toBeDisabled();
  });

  it('undo after clicking a cell re-disables undo', async () => {
    const user = userEvent.setup();
    const entry = getSmallBuiltinEntry();
    renderGame(entry);

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]);
    expect(screen.getByRole('button', { name: /undo/i })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: /undo/i }));
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /redo/i })).not.toBeDisabled();
  });

  it('redo re-applies undone action', async () => {
    const user = userEvent.setup();
    const entry = getSmallBuiltinEntry();
    renderGame(entry);

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]);
    await user.click(screen.getByRole('button', { name: /undo/i }));
    await user.click(screen.getByRole('button', { name: /redo/i }));

    expect(screen.getByRole('button', { name: /undo/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled();
  });

  it('check button activates validation', async () => {
    const user = userEvent.setup();
    const entry = getSmallBuiltinEntry();
    renderGame(entry);

    await user.click(screen.getByRole('button', { name: /check/i }));
    // Validation should be announced via live region
    const liveRegion = screen.getByRole('status');
    // Wait for the announcement timeout
    await vi.waitFor(() => {
      expect(liveRegion.textContent).toMatch(/validation/i);
    });
  });

  it('save button calls saveGame', async () => {
    const user = userEvent.setup();
    const entry = getSmallBuiltinEntry();
    renderGame(entry);

    // Make a change first (so there's something to save)
    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]);

    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(mockSaveGame).toHaveBeenCalled();
  });

  it('does not auto-save on fresh puzzle unmount', () => {
    const entry = getSmallBuiltinEntry();
    const { unmount } = renderGame(entry);
    unmount();
    // saveGame should NOT be called — puzzle wasn't modified
    expect(mockSaveGame).not.toHaveBeenCalled();
  });

  it('auto-saves on modified puzzle unmount', async () => {
    const user = userEvent.setup();
    const entry = getSmallBuiltinEntry();
    const { unmount } = renderGame(entry);

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]);

    mockSaveGame.mockClear();
    unmount();
    expect(mockSaveGame).toHaveBeenCalled();
  });
});
