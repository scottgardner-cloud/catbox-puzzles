import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '../pages/AppLayout';
import { GameRoute } from '../pages/GamePage';
import { getAllEntries } from '../puzzles/registry';
import type { PuzzleEntry } from '../puzzles/types';

// ── Mocks ───────────────────────────────────────────────────────────

const mockSaveGame = vi.fn();
const mockLoadGame = vi.fn((): null => null);

vi.mock('../state/persistence', () => ({
  saveGame: (...args: unknown[]) => mockSaveGame(...args),
  loadGame: () => mockLoadGame(),
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

// ── Timer tests (extracted from GamePage.test.tsx) ──────────────────

describe('useTimer (via GamePage integration)', () => {
  it('renders timer display', () => {
    const entry = getSmallBuiltinEntry();
    renderGame(entry);
    const timer = screen.getByLabelText(/solve timer/i);
    expect(timer).toBeInTheDocument();
    expect(timer.textContent).toContain('00:00');
  });

  it('timer is dimmed (idle) on fresh puzzle', () => {
    const entry = getSmallBuiltinEntry();
    renderGame(entry);
    const timer = screen.getByLabelText(/solve timer/i);
    expect(timer.className).toContain('pap-timer--idle');
  });

  it('timer starts on first cell click', async () => {
    const user = userEvent.setup();
    const entry = getSmallBuiltinEntry();
    renderGame(entry);

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]);

    const timer = screen.getByLabelText(/solve timer/i);
    expect(timer.className).not.toContain('pap-timer--idle');
  });

  it('save includes timer override after cell interaction', async () => {
    const user = userEvent.setup();
    const entry = getSmallBuiltinEntry();
    renderGame(entry);

    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]);
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockSaveGame).toHaveBeenCalled();
    const lastCall = mockSaveGame.mock.calls[mockSaveGame.mock.calls.length - 1];
    // Third argument is the timerOverride
    expect(lastCall[2]).toBeDefined();
    expect(typeof lastCall[2].elapsedMs).toBe('number');
    expect(lastCall[2].timerStatus).toBe('running');
  });

  it('reset clears timer back to idle', async () => {
    const user = userEvent.setup();
    const entry = getSmallBuiltinEntry();
    renderGame(entry);

    // Start timer
    const cells = screen.getAllByRole('gridcell');
    await user.click(cells[0]);
    const timer = screen.getByLabelText(/solve timer/i);
    expect(timer.className).not.toContain('pap-timer--idle');

    // Reset
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(timer.className).toContain('pap-timer--idle');
    expect(timer.textContent).toContain('00:00');
  });
});
